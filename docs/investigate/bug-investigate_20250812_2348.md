# バグ調査レポート: 週報画面からの強制リダイレクト問題

## 調査日時
2025-08-12 23:48

## 問題の概要
エンジニア画面の週報画面（/weekly-report）にアクセスした際に、ログイン画面を経由して管理者側のダッシュボード画面（/dashboard）に強制的にリダイレクトされる。

## 症状
1. ユーザーが `/weekly-report` にアクセス
2. `/login` へリダイレクト
3. 認証済みのため `/dashboard` へ再リダイレクト
4. 週報画面が表示されない

## 調査プロセス

### 1. Docker-compose ログの確認
```
[Middleware] Request path: /weekly-report
[Middleware] Public path? true  ← ❌ 問題: 認証が必要なページがpublicと判定されている
[Middleware] Has force parameter? false
[Middleware] CognitoCookieトークン検証: {
  hasToken: true,
  tokenLength: 1106,
  tokenPrefix: 'eyJraWQiOi...',
  isValidFormat: true
}
[Middleware] Cognito認証状態： { hasToken: true, isValidToken: true }
GET /weekly-report 200 in 421ms
```

### 2. ミドルウェアの調査
ファイル: `frontend/src/middleware.ts`

問題のコード（79-82行目）:
```typescript
const isPublicPath = publicPaths.some(path => 
  pathname.startsWith(path)
);
```

### 3. PUBLIC_PATHSの確認
ファイル: `frontend/src/constants/routes.ts`

```typescript
export const PUBLIC_PATHS = [
  '/',        // ← ❌ 問題の原因
  '/login',
] as const;
```

## 根本原因

### 直接的な原因
`PUBLIC_PATHS` に `/` が含まれているため、`startsWith('/')` の判定により、すべてのパスがpublicPathと判定されてしまう。

### 処理フロー
1. `/weekly-report` にアクセス
2. `pathname.startsWith('/')` → true （すべてのパスは `/` で始まるため）
3. `isPublicPath` → true
4. 認証済みだが、publicページと誤判定される
5. その結果、適切な権限チェックが行われない

## 影響範囲

### 影響を受けるパス
- すべての認証が必要なページ
  - `/weekly-report`
  - `/profile`
  - `/admin/*`
  - その他すべての保護されたルート

### セキュリティへの影響
- 現状では認証自体は機能しているが、すべてのページがpublicと判定されるため、きめ細かなアクセス制御が機能していない

## 修正案

### 案1: PUBLIC_PATHSから `/` を削除
```typescript
export const PUBLIC_PATHS = [
  '/login',
  // ルートパスが必要な場合は、厳密な一致判定を別途実装
] as const;
```

### 案2: 判定ロジックの改善
```typescript
const isPublicPath = publicPaths.some(path => {
  // 完全一致または特定のパスプレフィックスのみ許可
  if (path === '/') {
    return pathname === '/';  // ルートパスは完全一致のみ
  }
  return pathname.startsWith(path);
});
```

### 案3: PUBLIC_PATHSの詳細化
```typescript
export const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  // 必要な公開パスのみを明示的に列挙
] as const;

// ルートパスは別途処理
export const ROOT_PATH = '/';
```

## 推奨される修正

**案2**を推奨。理由：
1. ルートパス（`/`）へのアクセスは許可したい場合がある
2. 他のパスへの影響を最小限に抑えられる
3. 判定ロジックが明確で保守しやすい

## テスト項目

修正後に確認すべき項目：
1. `/weekly-report` へ直接アクセスできること
2. 未認証時は `/login` へリダイレクトされること
3. `/` へのアクセスが適切に処理されること
4. `/login` へのアクセスが認証済みの場合 `/dashboard` へリダイレクトされること

## 緊急度
**高** - すべての保護されたページへのアクセス制御が機能していない

## 関連ファイル
- `frontend/src/middleware.ts` - ミドルウェアロジック
- `frontend/src/constants/routes.ts` - ルート定義
- `frontend/src/app/(authenticated)/(engineer)/weekly-report/page.tsx` - 週報画面コンポーネント