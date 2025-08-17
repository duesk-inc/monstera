# APIハードコードパス削除パターン

## 概要
APIパスから`/api/v1`などのバージョン情報をハードコードせず、相対パスのみで記述することで、DRY原則に従った実装を実現するパターン

## 実装前（アンチパターン）
```typescript
// ハードコードされたパス
await apiClient.get('/api/v1/weekly-reports')
await apiClient.post('/api/v1/leave/apply')

// 定数でもハードコード
export const API_ENDPOINTS = {
  REPORTS: '/api/v1/reports',
  USERS: '/api/v1/users'
}
```

## 実装後（推奨パターン）
```typescript
// 相対パスのみ
await apiClient.get('/weekly-reports')
await apiClient.post('/leave/apply')

// 定数も相対パス
export const API_ENDPOINTS = {
  REPORTS: '/reports',
  USERS: '/users'
}
```

## 環境変数設定
```typescript
// APIクライアント設定でbaseURLを構築
const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
export const API_BASE_URL = `${API_HOST}/api/${API_VERSION}`;
```

## メリット
1. **DRY原則の遵守**: バージョン情報の重複を排除
2. **一元管理**: バージョン変更が環境変数1箇所で完結
3. **設定ミス防止**: 新規API追加時のパスミスを防止
4. **保守性向上**: バージョン移行が容易

## 適用実績
- 2025-01-16 Phase 3実装
- 23ファイル、51箇所のハードコードを削除
- 全てのAPIパスを相対パスに統一