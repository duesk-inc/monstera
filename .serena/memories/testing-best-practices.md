# テストのベストプラクティス

## エラーレスポンスの確認

### ❌ 不十分なテスト
```bash
curl http://localhost:8080/api/v1/admin/engineers
# 結果: 401
# 判断: 「認証が必要で正常」→ 終了
```

### ✅ 適切なテスト
```bash
# 1. 詳細なレスポンスを確認
curl -v http://localhost:8080/api/v1/admin/engineers | jq .
# 結果を見る:
# {
#   "error": "無効なトークンです",
#   "details": "unexpected signing method: RS256"  ← 重要！
# }

# 2. ログも確認
docker-compose logs backend | grep ERROR
# token is unverifiable: error while executing keyfunc

# 3. 認証を通してエンドツーエンドテスト
TOKEN=$(curl -X POST .../login | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" .../api/v1/admin/engineers
```

## テストチェックリスト

### 基本動作確認
- [ ] HTTPステータスコード
- [ ] レスポンスボディの内容
- [ ] エラーメッセージの詳細
- [ ] ログ出力の確認

### 認証関連テスト
- [ ] トークンなしでのアクセス（401確認）
- [ ] 有効なトークンでのアクセス（正常動作確認）
- [ ] 権限不足のトークンでのアクセス（403確認）
- [ ] 期限切れトークンでのアクセス（401確認）

### 環境別テスト
- [ ] 開発環境での動作
- [ ] Cognito有効/無効両方での動作
- [ ] 異なる認証方式での互換性

## エラー分析の手順

### 1. エラーメッセージの完全確認
```bash
# curlで詳細表示
curl -v -X GET http://... 2>&1 | tee response.log

# レスポンスボディを整形
cat response.log | jq .
```

### 2. バックエンドログの確認
```bash
# エラーログをフィルタ
docker-compose logs backend | grep -E "ERROR|WARN"

# 特定のリクエストIDで追跡
docker-compose logs backend | grep "request_id"
```

### 3. スタックトレースの活用
- エラーの発生箇所を特定
- 呼び出し階層を理解
- 根本原因を突き止める

## 統合テストの実施

### 必須フロー
1. **ログイン**
   - 正しい認証情報での成功
   - トークン取得の確認

2. **API呼び出し**
   - トークンを使用したアクセス
   - 期待される結果の確認

3. **エラーケース**
   - 各種エラーパターンの確認
   - エラーハンドリングの妥当性

### テストスクリプト例
```bash
#!/bin/bash
# 完全な統合テスト

echo "=== 1. ログインテスト ==="
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r .access_token)

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  exit 1
fi
echo "✅ ログイン成功"

echo "=== 2. API動作テスト ==="
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/admin/engineers)

if echo "$RESPONSE" | jq -e '.error' > /dev/null; then
  echo "❌ APIエラー:"
  echo "$RESPONSE" | jq .
  exit 1
fi
echo "✅ API正常動作"
```

## 重要な原則
1. **「動作しない」ことの確認だけでなく「正しく動作する」ことまで確認**
2. **エラーは詳細まで調査し、根本原因を理解**
3. **異なる条件・環境での動作を考慮**
4. **自動化可能なテストは自動化**