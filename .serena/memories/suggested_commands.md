# Monstera 開発コマンド集

## 環境管理
```bash
make setup          # 初回環境構築
make dev            # 開発環境起動
make down           # 開発環境停止
make dev-logs       # ログ表示
```

## ビルド・テスト・品質管理
```bash
# ビルド
make build          # 本番ビルド

# テスト
make test           # 全テスト実行
make test-backend   # バックエンドテスト
make test-frontend  # フロントエンドテスト

# 品質管理
make lint           # リント実行
make lint-fix       # リント自動修正
make format         # コード整形
```

## データベース操作
```bash
# マイグレーション
make migrate-up     # マイグレーション実行
make migrate-down   # ロールバック
make migrate-status # 状態確認
make migrate-create NAME=xxx # 新規作成

# 直接操作
make db-psql        # psql接続
make db-reset       # DB初期化（開発環境）
```

## 個別コマンド
```bash
# Frontend
cd frontend && npm run dev        # 開発サーバー
cd frontend && npm run build      # ビルド
cd frontend && npm run test       # テスト
cd frontend && npm run lint       # リント

# Backend
cd backend && go test ./...       # テスト
cd backend && go fmt ./...        # フォーマット
cd backend && go vet ./...        # 静的解析
```

## Git操作（Darwin系特有）
```bash
git status          # 状態確認
git diff            # 差分確認
git add .           # ステージング
git commit -m ""    # コミット
git push            # プッシュ
```

## ユーティリティ（macOS）
```bash
find . -name "*.go" # ファイル検索
grep -r "pattern"   # テキスト検索
ls -la             # ファイル一覧
afplay /System/Library/Sounds/Sosumi.aiff # 通知音