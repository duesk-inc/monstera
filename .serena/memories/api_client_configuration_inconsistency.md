# APIクライアント設定の不整合パターン

## 問題パターン
### 症状
- APIコールが404エラーを返す
- 異なるAPIで挙動が異なる可能性

### 原因
1. 複数のAPIクライアント設定ファイルが存在
2. デフォルト値が統一されていない
3. 環境変数が間違っている場合、全てのファイルに影響

### 確認されたファイル
- `frontend/src/lib/api/config.ts` - デフォルト値: `http://localhost:8080/api/v1` ✅
- `frontend/src/constants/api.ts` - デフォルト値: `http://localhost:8080` ❌
- `frontend/src/lib/api/index.ts` - デフォルト値: `http://localhost:8080` ❌

### 正しい設定
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 改善策
1. APIクライアント設定を単一ファイルに統合
2. すべてのデフォルト値を統一
3. 環境変数のバリデーション追加
4. `.env.example`ファイルに正しい値を記載

### 調査方法
```bash
# APIクライアント設定ファイルを検索
grep -r "API_BASE_URL" frontend/src

# 環境変数の確認
cat frontend/.env.local | grep NEXT_PUBLIC_API_URL
```