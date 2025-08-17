# 環境変数 API URL 設定パターン

## 問題パターン
### 症状
- APIコールが404エラーを返す
- バックエンドログに`/api/v1`なしのパスが記録される

### 原因
`NEXT_PUBLIC_API_URL`環境変数にAPIバージョンプレフィックスが含まれていない

### 正しい設定
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1  # 正しい
# NEXT_PUBLIC_API_URL=http://localhost:8080       # 間違い
```

### 確認箇所
1. `frontend/.env.local` - 環境変数の設定
2. `frontend/src/lib/api/config.ts` - APIクライアントのbaseURL設定
3. バックエンドログ - リクエストパスの確認

### 予防策
- 環境変数テンプレートファイル（`.env.example`）に正しい値を記載
- APIクライアント初期化時にURLバリデーション追加
- 開発環境セットアップドキュメントの更新