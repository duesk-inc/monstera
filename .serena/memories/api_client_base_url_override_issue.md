# APIクライアントのbaseURL上書き問題

## 問題パターン
createPresetApiClient使用時にbaseURLを明示的に設定すると、自動的な`/api/v1`付与が無効化される。

## 誤った実装例
```typescript
// ❌ 間違い - baseURLを上書きしている
const client = createPresetApiClient('auth', {
  baseURL: API_BASE_URL,  // これが問題！
});
```

## 正しい実装例
```typescript
// ✅ 正しい - プリセットの設定をそのまま使う
const client = createPresetApiClient('auth');
// /api/v1は自動付与される
```

## 注意点
- createPresetApiClientを使用する場合、baseURLは設定しない
- APIパスは`/api/v1`を含めずに記述する（例: `/auth/login`）
- プリセットごとに適切なベースパスが自動設定される

## 関連ファイル
- frontend/src/lib/api/auth/index.ts
- frontend/src/lib/api/factory/index.ts
- frontend/CLAUDE.md