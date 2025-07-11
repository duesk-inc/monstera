# 🔄 Dependabot運用ガイド

このガイドでは、Monsteraプロジェクトにおける依存関係の自動更新（Dependabot）の運用方法について説明します。

## 📋 概要

Dependabotは、プロジェクトの依存関係を自動的に最新に保つGitHubの機能です。セキュリティ脆弱性の修正や新機能の取り込みを効率的に行えます。

## 🎯 運用方針

### 基本原則

1. **セキュリティファースト**: セキュリティアップデートは最優先で対応
2. **段階的更新**: パッチ → マイナー → メジャーの順で慎重に更新
3. **自動化と手動レビューのバランス**: 影響の小さい更新は自動化、大きい更新は手動確認
4. **定期的なメンテナンス**: 週次でPRをレビュー

## 📅 更新スケジュール

| エコシステム | 更新日時 | 担当チーム |
|-------------|---------|-----------|
| Go modules | 月曜 3:00 JST | Backend Team |
| npm | 月曜 3:00 JST | Frontend Team |
| Docker | 火曜 3:00 JST | DevOps Team |
| GitHub Actions | 水曜 3:00 JST | DevOps Team |

## 🚀 対応フロー

### 1. Dependabot PRの確認

```bash
# Dependabot PRの一覧を確認
gh pr list --author "app/dependabot" --state open

# ラベルでフィルタ
gh pr list --label "dependencies" --state open
```

### 2. PRの優先順位判断

#### 🔴 最優先（即日対応）
- セキュリティアップデート
- 重大なバグ修正
- ゼロデイ脆弱性対応

#### 🟡 高優先（3営業日以内）
- パッチバージョンアップデート
- 開発依存関係の更新
- パフォーマンス改善

#### 🟢 通常優先（1週間以内）
- マイナーバージョンアップデート
- 新機能追加
- ドキュメント更新

#### ⚪ 低優先（月次対応）
- メジャーバージョンアップデート
- 実験的機能
- 非推奨APIの移行

### 3. レビューチェックリスト

```markdown
## Dependabot PR レビューチェックリスト

- [ ] 更新内容の確認（CHANGELOG、リリースノート）
- [ ] 破壊的変更の有無
- [ ] CIチェックの成功
- [ ] 依存関係の競合確認
- [ ] ローカルでの動作確認（必要に応じて）
- [ ] 本番環境への影響評価
```

### 4. テスト手順

#### バックエンド（Go）
```bash
# ローカルでPRをチェックアウト
gh pr checkout <PR番号>

# 依存関係の更新
cd backend
go mod download
go mod verify

# テスト実行
make test
make test-integration

# ビルド確認
make build
```

#### フロントエンド（npm）
```bash
# ローカルでPRをチェックアウト
gh pr checkout <PR番号>

# 依存関係の更新
cd frontend
npm ci

# テスト実行
npm run test
npm run test:e2e

# ビルド確認
npm run build
```

## 🔧 自動マージの設定

### 有効化手順

1. リポジトリ設定で "Allow auto-merge" を有効化
2. ブランチ保護ルールで必須チェックを設定
3. 以下のラベルを付けたPRは自動マージ対象：
   - `dependencies`
   - `patch-update`
   - `auto-merge`

### 自動マージ対象

- ✅ パッチバージョンの更新
- ✅ 開発依存関係の更新
- ✅ GitHub Actionsの更新
- ✅ セキュリティアップデート（影響範囲が限定的な場合）

### 自動マージ対象外

- ❌ メジャーバージョンの更新
- ❌ データベースドライバの更新
- ❌ フレームワークのアップデート
- ❌ 破壊的変更を含む更新

## 📊 依存関係の管理

### バージョン固定が必要なパッケージ

```yaml
# .github/dependabot.yml で ignore 設定済み
- postgres: 15.x （データベース互換性）
- redis: 7.x （キャッシュ戦略）
- next: 13.x （SSR/SSG設定）
- react: 18.x （Concurrent Features）
```

### グループ化された更新

1. **開発依存関係**: まとめて更新可能
2. **TypeScript関連**: 型定義の整合性を保つため同時更新
3. **テストツール**: 互換性を保つため同時更新

## 🚨 トラブルシューティング

### よくある問題と対処法

#### 1. 依存関係の競合
```bash
# Go modules
go mod tidy
go mod verify

# npm
npm audit fix
npm dedupe
```

#### 2. ビルドエラー
```bash
# キャッシュクリア
go clean -modcache
npm cache clean --force

# 再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 3. テスト失敗
- 更新によるAPIの変更を確認
- モックデータの更新が必要か確認
- 環境変数の追加・変更を確認

## 📈 メトリクス監視

### 月次レポート項目

1. **更新統計**
   - 作成されたPR数
   - マージされたPR数
   - 却下されたPR数

2. **セキュリティ指標**
   - 修正された脆弱性数
   - 未対応の脆弱性数
   - 平均対応時間

3. **パフォーマンス指標**
   - ビルド時間の変化
   - バンドルサイズの変化
   - テスト実行時間の変化

## 🔐 セキュリティ考慮事項

1. **サプライチェーン攻撃対策**
   - 新しい依存関係は慎重にレビュー
   - メンテナー変更の確認
   - ダウンロード数の急激な変化を監視

2. **ライセンス確認**
   - 新規依存関係のライセンス互換性
   - コピーレフトライセンスの確認

3. **監査ログ**
   - すべての更新を記録
   - 承認者と理由を明記

## 📚 参考資料

- [GitHub Docs: Dependabot](https://docs.github.com/en/code-security/dependabot)
- [Dependabot配置オプション](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [セマンティックバージョニング](https://semver.org/)

## 🆘 サポート

依存関係の更新で問題が発生した場合：

1. `#dev-dependencies` Slackチャンネルで相談
2. 週次のエンジニアリングミーティングで議論
3. 必要に応じて外部専門家に相談

---

最終更新日: 2024-01-11