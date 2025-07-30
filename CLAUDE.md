# 🎯 Monstera プロジェクト実装ガイド

## 📋 プロジェクト概要

**概要**: SES企業向け社内業務管理システム
**規模**: 初期10-50名 → 中長期500名
**技術**: Next.js + Go + PostgreSQL

## 🚨 実装の絶対原則

### 1. 品質優先順位
```
1. 保守性・可読性（最優先）
2. セキュリティ・堅牢性
3. 実行速度・パフォーマンス
```

### 2. 開発の基本ルール
- **報告不要**: 修正内容の報告用mdファイルは作成しない
- **直接実装**: 修正は直接実行し、必要最小限の説明のみ
- **TDD実践**: テストファースト開発を厳守
- **既存優先**: 新規作成前に必ず既存コンポーネント/関数を確認

### 3. セキュリティ原則
- **ホワイトリスト方式**: デフォルトで全APIエンドポイント認証必須
- **両層検証**: フロントエンド・バックエンド両方で入力検証
- **最小権限**: RBAC（一般/管理者/スーパー管理者）を厳格適用

## 🚨 作業開始時の必須確認
**すべての作業開始前に必ず実行:**
1. `cat .claude/commands/INDEX.md | grep -A5 "使用条件"`
2. 該当するコマンドがある場合は必ず使用
3. ない場合のみ手動実行（理由を明記）

## 📝 基本コマンド

詳細なコマンドは各作業フェーズのコマンドファイル内に記載されています。

基本的な操作：
- `make setup` - 初回環境構築
- `make dev` - 開発環境起動
- `make test` - テスト実行
- `make lint` - コード品質チェック

詳細は[Makefile](Makefile)を参照してください。

## Claude Code活用ガイド

詳細は[Claude Code 活用](.cursor/rules/claude-code-guide.md)を参照してください。

## 🤖 Claude Code コマンド自動選択システム

### 概要
ユーザーの要求を分析し、最適なコマンドを自動的に選択・実行するシステムです。

### 動作原則
1. **コマンド優先**: `.claude/commands/`内に適切なコマンドがある場合は必ず使用
2. **自動判定**: ユーザーの要求からコマンドを自動選択
3. **確認不要**: コマンド名の指定は不要（自然言語で要求するだけ）
4. **連携実行**: 必要に応じて複数コマンドを順次実行

### コマンド選択プロセス
```
1. ユーザー要求の分析
   ↓
2. キーワードとコンテキストの抽出
   ↓
3. INDEX.mdを参照してコマンド候補を特定
   ↓
4. 最適なコマンドを選択
   ↓
5. 必要に応じて確認後、実行
```

### 実行例
- 「経費申請のバグを修正したい」 → `/bug-investigate` → `/bug-fix`
- 「docsフォルダを整理して」 → `/docs-organize`
- 「新機能を実装したい」 → `/new-feature-investigate` → `/new-feature-plan` → `/new-feature-implement`

### コマンドインデックス
詳細は[コマンドインデックス](.claude/commands/INDEX.md)を参照してください。

### 注意事項
- コマンドが存在する作業は必ずコマンドを使用すること
- 手動実行よりもコマンド実行を優先すること
- 不明な場合はINDEX.mdを確認すること

## 📋 開発規約

プロジェクトの各種規約は以下を参照してください：
- [コーディング規約](docs/06_standards/coding-standards.md)
- [エラーハンドリング](docs/06_standards/error-handling.md)
- [セキュリティ実装](docs/06_standards/security-implementation.md)
- [その他の規約](docs/06_standards/)


## 📚 詳細ドキュメント

- [アーキテクチャ詳細](docs/00_project_overview/architecture.md)
- [API設計規則](docs/06_standards/api-design.md)
- [デプロイメント・環境管理](.cursor/rules/deployment-environment.md)
- [トラブルシューティング](docs/04_development/troubleshooting.md)
- [プロジェクト固有の実装ガイド](.cursor/rules/project-specific.md)
- [段階的改善計画](.cursor/rules/scaling-plan.md)

## 📚 ドキュメント管理

ドキュメントの管理は専用コマンドを使用してください：
- `/docs-audit` - ドキュメント監査
- `/docs-update` - ドキュメント更新  
- `/docs-organize` - ドキュメント整理
- `/docs-consolidate` - ドキュメント統合
- `/docs-cleanup` - 不要ドキュメント削除

詳細は[ドキュメント更新システム](.cursor/rules/update-system.md)を参照。