# 🔒 Branch Protection Rules Guide

このガイドでは、Monsteraプロジェクトのブランチ保護ルールの設定方法を説明します。

## 📋 概要

ブランチ保護ルールは、重要なブランチ（`main`, `develop`）への変更を制御し、コード品質とセキュリティを維持するために使用されます。

## 🚀 クイックスタート

### 1. GitHub Personal Access Token (PAT) の取得

1. GitHubにログイン
2. Settings → Developer settings → Personal access tokens → Tokens (classic)
3. 「Generate new token」をクリック
4. 以下のスコープを選択:
   - `repo` (Full control of private repositories)
   - `admin:repo_hook` (必要に応じて)
5. トークンを生成し、安全に保管

### 2. 環境変数の設定

```bash
export GITHUB_TOKEN="your_personal_access_token"
export GITHUB_OWNER="your_github_username_or_org"
export GITHUB_REPO="monstera"
```

### 3. ブランチ保護ルールの適用

```bash
cd .github/scripts
./apply-branch-protection.sh
```

## 📐 保護ルールの詳細

### mainブランチ（本番環境）

| 設定項目 | 値 | 説明 |
|---------|-----|------|
| レビュー必須数 | 2 | 2名以上の承認が必要 |
| 古いレビューの却下 | 有効 | 新しいコミットで既存レビューを無効化 |
| コードオーナーレビュー | 必須 | CODEOWNERSファイルに基づく |
| 管理者も従う | 有効 | 管理者も保護ルールに従う |
| 必須ステータスチェック | 有効 | すべてのCIチェックが必須 |
| フォースプッシュ | 禁止 | 履歴の書き換えを防ぐ |
| ブランチ削除 | 禁止 | 誤削除を防ぐ |

### developブランチ（開発環境）

| 設定項目 | 値 | 説明 |
|---------|-----|------|
| レビュー必須数 | 1 | 1名以上の承認が必要 |
| 古いレビューの却下 | 有効 | 新しいコミットで既存レビューを無効化 |
| コードオーナーレビュー | 不要 | より柔軟な開発を許可 |
| 管理者も従う | 無効 | 緊急時の対応を可能に |
| 必須ステータスチェック | 有効 | 主要なCIチェックが必須 |

## 🔍 必須ステータスチェック

### mainブランチで必須のチェック
- Backend Check
- Frontend Check  
- Docker Build Check
- Integration Test
- Go Security Check
- NPM Security Check
- Secret Scanning
- Docker Image Security Scan (backend/frontend)
- Migration Validation/Test/Performance

### developブランチで必須のチェック
- Backend Check
- Frontend Check
- Docker Build Check
- Integration Test
- Go Security Check
- NPM Security Check
- Migration Validation/Test

## 🛠️ カスタマイズ

### ルールの変更

1. `.github/branch-protection-rules.yml` を編集
2. `.github/scripts/apply-branch-protection.sh` の該当箇所を更新
3. スクリプトを再実行

### 現在の設定確認

```bash
# mainブランチの設定を確認
./apply-branch-protection.sh --show main

# developブランチの設定を確認
./apply-branch-protection.sh --show develop
```

## 📝 ブランチ命名規則

推奨されるブランチ名のパターン：

- `feature/*` - 新機能開発
- `bugfix/*` - バグ修正
- `hotfix/*` - 緊急修正
- `release/*` - リリース準備
- `docs/*` - ドキュメント更新
- `test/*` - テスト追加・修正
- `refactor/*` - リファクタリング
- `chore/*` - その他の作業

## ⚠️ 注意事項

1. **既存設定の上書き**: スクリプト実行時、既存の保護ルールは上書きされます
2. **権限要件**: リポジトリの管理者権限が必要です
3. **API制限**: GitHub APIのレート制限に注意してください
4. **トークン管理**: Personal Access Tokenは安全に管理し、定期的に更新してください

## 🆘 トラブルシューティング

### よくある問題

1. **401 Unauthorized エラー**
   - トークンの有効期限を確認
   - 必要なスコープが付与されているか確認

2. **404 Not Found エラー**
   - リポジトリ名、オーナー名が正しいか確認
   - プライベートリポジトリへのアクセス権限を確認

3. **422 Unprocessable Entity エラー**
   - 指定したステータスチェック名が正しいか確認
   - ワークフロー名とジョブ名が一致しているか確認

## 📚 参考資料

- [GitHub Docs: Managing a branch protection rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/managing-a-branch-protection-rule)
- [GitHub API: Branch protection](https://docs.github.com/en/rest/branches/branch-protection)
- [GitHub Apps & OAuth Apps](https://docs.github.com/en/developers/apps)

## 🔄 定期的なメンテナンス

1. **月次レビュー**: 保護ルールの有効性を確認
2. **四半期更新**: CI/CDパイプラインの変更に合わせて更新
3. **年次監査**: セキュリティ要件の見直し

---

最終更新日: 2024-01-11