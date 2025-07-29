# タスク完了時のチェックリスト

## 実装完了後の必須確認事項

### 1. コード品質
- [ ] 既存の規約に準拠しているか
- [ ] 不要なコメントや console.log を削除したか
- [ ] 絵文字を使用していないか
- [ ] 既存コンポーネント・関数を再利用したか

### 2. テスト
```bash
# Backend
make test-backend
# または
cd backend && go test ./...

# Frontend
make test-frontend
# または
cd frontend && npm run test
```

### 3. リント・フォーマット
```bash
# 全体
make lint
make format

# Backend個別
cd backend && go fmt ./...
cd backend && go vet ./...

# Frontend個別
cd frontend && npm run lint
```

### 4. ビルド確認
```bash
# 全体ビルド
make build

# または個別
cd backend && go build -o bin/server cmd/server/main.go
cd frontend && npm run build
```

### 5. セキュリティチェック
- [ ] 新規APIエンドポイントに認証を実装したか
- [ ] 入力検証を両層で実装したか
- [ ] 権限チェック（RBAC）を実装したか
- [ ] 機密情報がコードに含まれていないか

### 6. ドキュメント更新
- [ ] APIドキュメントを更新したか（必要な場合）
- [ ] 重要な設計判断を記録したか
- [ ] 新規コンポーネントの使用方法を記載したか

### 7. Git操作
```bash
git status          # 変更確認
git diff            # 差分確認
git add .           # ステージング
git commit -m "feat: 機能説明"  # コミット
```

## 問題発生時の対処
1. テスト失敗 → エラー内容を確認し修正
2. リントエラー → `make lint-fix` で自動修正を試す
3. ビルドエラー → 依存関係と import を確認
4. 実行時エラー → ログを確認 `make dev-logs`

## 通知
実装完了時は以下で通知（macOS）:
```bash
afplay /System/Library/Sounds/Sosumi.aiff
```