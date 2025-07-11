# リモートリポジトリ連携

このドキュメントはMonsteraプロジェクトのGit操作、ブランチ戦略、PR/MRテンプレート等を記録します。

## 更新履歴
- 2025-01-09: 初版作成

## ブランチ戦略

### ブランチ構成
```
main (production)
├── develop (開発環境)
│   ├── feature/xxx (機能開発)
│   ├── bugfix/xxx (バグ修正)
│   └── hotfix/xxx (緊急修正)
└── release/x.x.x (リリース準備)
```

### ブランチ命名規則
```bash
# 機能開発
feature/weekly-report-filter
feature/expense-approval-flow

# バグ修正
bugfix/login-error-handling
bugfix/pagination-issue

# 緊急修正
hotfix/security-vulnerability
hotfix/production-crash

# リファクタリング
refactor/repository-structure
refactor/component-optimization
```

### ブランチ運用ルール
1. **feature/bugfix ブランチ**
   - developブランチから作成
   - 作業完了後、developへマージ
   - マージ後は削除

2. **hotfix ブランチ**
   - mainブランチから作成
   - main と develop の両方にマージ
   - 緊急度の高い修正のみ

3. **release ブランチ**
   - developから作成
   - バグ修正のみ許可
   - mainへマージ後、タグ付け

## Git操作ベストプラクティス

### コミット前の確認
```bash
# 差分確認
git diff
git diff --staged

# リントとテスト実行
make lint
make test

# コミット
git add .
git commit -m "feat(frontend): 週報一覧のフィルター機能を追加"
```

### リベースによる履歴整理
```bash
# developブランチの最新を取り込む
git checkout develop
git pull origin develop
git checkout feature/your-feature
git rebase develop

# コンフリクト解決後
git add .
git rebase --continue
```

### スタッシュの活用
```bash
# 作業中の変更を一時保存
git stash save "WIP: 週報フォームの実装"

# スタッシュ一覧
git stash list

# スタッシュを適用
git stash pop  # 適用して削除
git stash apply  # 適用のみ
```

## プルリクエストテンプレート

### .github/pull_request_template.md
```markdown
## 概要
<!-- 変更の概要を簡潔に記載 -->

## 変更内容
<!-- 具体的な変更内容を箇条書きで記載 -->
- [ ] 
- [ ] 
- [ ] 

## 関連Issue
<!-- 関連するIssue番号を記載 -->
- Closes #

## スクリーンショット
<!-- UI変更がある場合は、変更前後のスクリーンショットを添付 -->

## テスト
<!-- 実施したテストについて記載 -->
- [ ] ユニットテスト追加/更新
- [ ] 統合テスト実施
- [ ] 手動テスト実施

## チェックリスト
- [ ] コードがプロジェクトのコーディング規約に従っている
- [ ] 必要なドキュメントを更新した
- [ ] パフォーマンスへの影響を考慮した
- [ ] セキュリティへの影響を考慮した
- [ ] エラーハンドリングが適切に実装されている

## レビュー観点
<!-- レビュアーに特に見てほしい点を記載 -->

## デプロイ時の注意事項
<!-- 環境変数の追加、マイグレーション実行など -->
```

## Issue テンプレート

### .github/ISSUE_TEMPLATE/bug_report.md
```markdown
---
name: バグ報告
about: バグの報告はこちら
title: '[BUG] '
labels: bug
assignees: ''
---

## バグの概要
<!-- バグの内容を簡潔に記載 -->

## 再現手順
1. 
2. 
3. 

## 期待される動作
<!-- 本来どのように動作するべきか -->

## 実際の動作
<!-- 現在どのように動作しているか -->

## スクリーンショット
<!-- エラー画面などがあれば添付 -->

## 環境
- OS: 
- ブラウザ: 
- バージョン: 

## 追加情報
<!-- その他、調査に役立つ情報があれば記載 -->
```

### .github/ISSUE_TEMPLATE/feature_request.md
```markdown
---
name: 機能要望
about: 新機能の提案はこちら
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## 機能の概要
<!-- 提案する機能の概要を記載 -->

## 背景・課題
<!-- なぜこの機能が必要なのか -->

## 提案する解決策
<!-- どのように実装するか -->

## 代替案
<!-- 他に検討した方法があれば -->

## 追加情報
<!-- 参考資料、関連Issue等 -->
```

## CI/CD設定

### GitHub Actions ワークフロー例
```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [ develop, main ]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run tests
        run: |
          cd backend
          go test -v ./...
      
      - name: Run lint
        uses: golangci/golangci-lint-action@v3
        with:
          working-directory: backend

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run tests
        run: |
          cd frontend
          npm test
      
      - name: Run lint
        run: |
          cd frontend
          npm run lint
```

## リリース手順

### 1. リリースブランチ作成
```bash
git checkout develop
git pull origin develop
git checkout -b release/1.2.0
```

### 2. バージョン更新
```bash
# package.json, go.mod などのバージョン更新
# CHANGELOG.md の更新
git add .
git commit -m "chore: bump version to 1.2.0"
```

### 3. リリースPR作成
```bash
git push origin release/1.2.0
# GitHub上でPR作成（develop → main）
```

### 4. マージとタグ付け
```bash
# PR承認後
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
```

### 5. developへのマージ
```bash
git checkout develop
git merge main
git push origin develop
```

## トラブルシューティング

### マージコンフリクト解決
```bash
# コンフリクトファイルを確認
git status

# ファイルを編集してコンフリクト解決
# <<<<<<<, =======, >>>>>>> のマーカーを削除

# 解決完了
git add .
git commit -m "resolve: マージコンフリクトを解決"
```

### 誤ったコミットの修正
```bash
# 直前のコミットメッセージ修正
git commit --amend -m "新しいコミットメッセージ"

# 直前のコミットに変更を追加
git add forgotten-file.txt
git commit --amend --no-edit

# 特定のコミットを取り消し（履歴は残す）
git revert <commit-hash>
```

### リモートブランチの削除
```bash
# ローカルで削除
git branch -d feature/old-feature

# リモートから削除
git push origin --delete feature/old-feature

# 削除されたリモートブランチの参照を削除
git fetch --prune
```

## セキュリティ考慮事項

### 機密情報の取り扱い
```bash
# .gitignoreに追加すべきファイル
.env
.env.local
*.pem
*.key
credentials.json

# 誤ってコミットした場合
git rm --cached .env
git commit -m "remove: 機密ファイルを削除"

# 履歴からも完全に削除（要注意）
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all
```

### 署名付きコミット
```bash
# GPGキーの設定
git config --global user.signingkey <GPG-KEY-ID>
git config --global commit.gpgsign true

# 署名付きコミット
git commit -S -m "feat: 新機能追加"
```

---

*このドキュメントはGit運用に関する新しい知見が得られた際に更新してください。*