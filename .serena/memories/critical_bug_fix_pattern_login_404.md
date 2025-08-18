# Critical Bug修正パターン - ログイン404エラー

## バグ概要
- **ID**: LOGIN-404-001
- **影響度**: Critical（全ユーザーがログインできない）
- **修正時間**: 15分（緊急対応）

## 修正パターン

### 問題のパターン
```typescript
// ❌ 誤り - baseURLを明示的に設定
const client = createPresetApiClient('auth', {
  baseURL: API_BASE_URL,
});
```

### 正しいパターン
```typescript
// ✅ 正しい - プリセットのデフォルト設定を使用
const client = createPresetApiClient('auth');
```

## 修正手順
1. auth/index.tsの4箇所を修正
   - login()
   - refreshToken()
   - logout()
   - getCurrentUser()
2. baseURL設定を削除
3. テストで確認

## 予防措置
1. ESLintルールでbaseURL設定を禁止
2. CLAUDE.frontend.mdに警告を追加
3. 単体テストで検証

## 教訓
- createPresetApiClientは自動的に適切なbaseURLを設定する
- 明示的なbaseURL設定は避ける
- プリセットの設計意図を理解して使用する