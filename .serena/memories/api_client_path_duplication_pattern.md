# APIクライアントパス重複パターン

## 問題パターン
`createPresetApiClient`で作成したAPIクライアントに対して、`/api/v1`を含むパスを指定すると、パスが重複してしまう。

## 具体例
### 誤った使用方法 ❌
```typescript
const client = createPresetApiClient('auth');
const response = await client.get('/api/v1/auth/me');
// 実際のリクエスト: /api/v1/api/v1/auth/me → 404エラー
```

### 正しい使用方法 ✅
```typescript
const client = createPresetApiClient('auth');
const response = await client.get('/auth/me');
// 実際のリクエスト: /api/v1/auth/me → 正常動作
```

## 原因
`createPresetApiClient`は内部で以下のようにbaseURLを構築：
```typescript
baseURL = `${host}/api/${version}` // 例: http://localhost:8080/api/v1
```

## チェックポイント
- [ ] `createPresetApiClient`を使用している箇所を確認
- [ ] パス指定に`/api/v1`が含まれていないか確認
- [ ] エンドポイントのパスのみを指定しているか確認

## 影響
- 404エラーが発生
- API呼び出しが失敗
- 認証情報取得失敗によるユーザーメニュー表示異常

## 予防策
1. APIクライアント使用時のコーディング規約を明確化
2. ESLintルールでパスパターンをチェック
3. 開発環境でのログ出力で実際のURLを確認