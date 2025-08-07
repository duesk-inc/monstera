# コミット・プルリクエスト ガイドライン

## 概要
このドキュメントは、AIが実装フェーズでコミットとプルリクエストを作成する際の標準ルールを定義します。

## コミット規則

### コミットメッセージフォーマット
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type（必須）
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマット等）
- `refactor`: バグ修正や機能追加を伴わないコード変更
- `perf`: パフォーマンス改善
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

### Scope（必須）
- `frontend`: フロントエンド変更
- `backend`: バックエンド変更
- `db`: データベース変更
- `infra`: インフラ・設定変更
- `deps`: 依存関係の更新

### Subject（必須）
- 50文字以内
- 現在形・命令形で記述
- 文末にピリオドを付けない
- 変更内容を簡潔に説明

### 例
```bash
feat(frontend): 週報一覧のフィルター機能を追加
fix(backend): ログイン時のセッションタイムアウトエラーを修正
refactor(backend): リポジトリ層のエラーハンドリングを統一
test(frontend): 週報フォームのユニットテストを追加
docs(backend): API仕様書を更新
```

## ブランチ運用

### ブランチ命名規則
```bash
feature/[issue番号]-[簡潔な説明]
bugfix/[issue番号]-[簡潔な説明]
hotfix/[issue番号]-[簡潔な説明]
refactor/[issue番号]-[簡潔な説明]
```

### 例
```bash
feature/123-weekly-report-filter
bugfix/456-login-session-error
hotfix/789-security-vulnerability
refactor/101-repository-structure
```

## プルリクエスト作成

### Draft PR作成タイミング
- 実装開始時に即座にDraft PRを作成
- タイトルに `[WIP]` プレフィックスを付ける
- 実装の進捗に応じて継続的に更新

### PR作成コマンド
```bash
# Draft PRの作成
gh pr create \
  --draft \
  --title "[WIP] feat(frontend): 週報一覧のフィルター機能を追加 #123" \
  --body "$(cat pr_body.md)" \
  --base develop \
  --assignee "@me"

# 既存PRの更新
gh pr edit <pr-number> --body "$(cat updated_pr_body.md)"
```

### PRタイトルフォーマット
```
[WIP] <type>(<scope>): <description> #<issue-number>
```

### PR本文テンプレート
```markdown
## 概要
[1-2文で変更の概要を記載]

## 変更内容
- [ ] [具体的な変更内容1]
- [ ] [具体的な変更内容2]
- [ ] [具体的な変更内容3]

## 関連Issue
- Closes #[issue番号]

## 実装状況
- [x] 基本実装
- [ ] テスト追加
- [ ] ドキュメント更新
- [ ] レビュー対応

## テスト
- [ ] ユニットテスト: [カバレッジ]%
- [ ] 統合テスト実施
- [ ] 手動テスト実施

## スクリーンショット
[UI変更がある場合は添付]

## 確認事項
- [ ] コーディング規約に準拠
- [ ] エラーハンドリング実装
- [ ] パフォーマンスへの影響を考慮
- [ ] セキュリティへの影響を考慮

## レビュー依頼事項
[レビュアーに特に確認してほしい点]

## デプロイ時の注意
[環境変数、マイグレーション等]
```

## コミット手順

### 1. 変更確認
```bash
git status
git diff
git diff --staged
```

### 2. テスト・リント実行
```bash
make lint
make test
```

### 3. ステージング
```bash
# 個別ファイル
git add path/to/file

# 全ファイル（慎重に）
git add .

# インタラクティブ
git add -p
```

### 4. コミット
```bash
git commit -m "feat(frontend): 週報一覧のフィルター機能を追加"
```

### 5. プッシュ
```bash
# 初回
git push -u origin feature/123-weekly-report-filter

# 2回目以降
git push
```

## 小粒コミットの原則

### やるべきこと
- 1つのコミット = 1つの論理的変更
- 各コミットでビルドが通る状態を保つ
- レビューしやすい単位で分割

### 避けるべきこと
- 複数の機能を1つのコミットに含める
- "WIP"や"途中"といったコミットメッセージ
- ビルドが通らない状態でのコミット

### コミット分割の例
```bash
# 悪い例
git commit -m "週報機能を実装"

# 良い例
git commit -m "feat(backend): 週報一覧取得APIエンドポイントを追加"
git commit -m "feat(backend): 週報フィルタリングロジックを実装"
git commit -m "feat(frontend): 週報一覧コンポーネントを作成"
git commit -m "feat(frontend): 週報フィルター機能を実装"
git commit -m "test(backend): 週報APIのユニットテストを追加"
git commit -m "test(frontend): 週報一覧のE2Eテストを追加"
git commit -m "docs(api): 週報APIの仕様書を更新"
```

## PR更新時の作業

### 1. developブランチの取り込み
```bash
git checkout develop
git pull origin develop
git checkout feature/your-branch
git rebase develop
```

### 2. コンフリクト解決
```bash
# コンフリクトファイルを修正
git add .
git rebase --continue
```

### 3. Force Push（リベース後）
```bash
git push --force-with-lease origin feature/your-branch
```

### 4. PR本文の更新
```bash
gh pr edit <pr-number> --body "$(cat updated_pr_body.md)"
```

## Ready for Reviewへの移行

### チェックリスト
- [ ] 全ての実装タスクが完了
- [ ] テストが全て通過
- [ ] ドキュメントを更新
- [ ] PR本文が最新
- [ ] コンフリクトが解決済み

### コマンド
```bash
# Draft -> Ready for Review
gh pr ready <pr-number>

# タイトルから[WIP]を削除
gh pr edit <pr-number> --title "feat(frontend): 週報一覧のフィルター機能を追加 #123"
```

## トラブルシューティング

### コミットの修正
```bash
# 直前のコミットメッセージ修正
git commit --amend -m "新しいメッセージ"

# 直前のコミットに変更を追加
git add forgotten-file
git commit --amend --no-edit
```

### プッシュ済みコミットの修正
```bash
# 注意: force pushが必要
git commit --amend
git push --force-with-lease
```

### コミットの取り消し
```bash
# ローカルのみ（履歴から削除）
git reset --soft HEAD~1  # 変更は残す
git reset --hard HEAD~1  # 変更も削除

# リモートにプッシュ済み（履歴は残す）
git revert <commit-hash>
```

## 重要な注意事項

1. **機密情報**: 絶対にコミットしない（APIキー、パスワード等）
2. **大容量ファイル**: バイナリファイルは極力避ける
3. **履歴の書き換え**: プッシュ済みのコミットは原則書き換えない
4. **レビュー前**: 必ずセルフレビューを実施
5. **CI/CD**: 全てのチェックが通過することを確認
6. **AI生成に関する記述の不記載**: AIないしはClaude Codeに関する記述は絶対に含めない