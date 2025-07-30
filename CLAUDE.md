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

## 📝 コマンドリファレンス

### 初期セットアップ
```bash
make setup                    # 初回環境構築
cp .env.example .env         # 環境変数設定
make dev                     # 開発環境起動
```

### 開発コマンド
```bash
# サービス管理
make dev                     # 全サービス起動
make down                    # 全サービス停止
make dev-logs                # ログ表示

# ビルド
make build                   # 本番ビルド
cd frontend && npm run build # フロントエンドのみ
cd backend && go build -o bin/server cmd/server/main.go

# テスト実行
make test                    # 全テスト
make test-backend            # バックエンドテスト
make test-frontend           # フロントエンドテスト
cd frontend && npm run test:coverage  # カバレッジ付き

# 品質管理
make lint                    # 全リント
make lint-fix               # 自動修正
make format                 # コード整形
```

### データベース操作
```bash
# PostgreSQLマイグレーション
make migrate-up                              # マイグレーション実行
make migrate-down                            # 最新のマイグレーションをロールバック
make migrate-status                          # マイグレーション状態確認

# マイグレーション作成
make migrate-create NAME=add_column_to_users # 新規マイグレーション作成

# DB直接操作
make db-psql                                 # psqlクライアント接続
docker-compose exec postgres psql -U postgres -d monstera  # 直接接続

# データベース管理
make db-dump                                 # データベースバックアップ
make db-restore DUMP_FILE=backup.sql         # データベースリストア
make db-reset                                # データベース初期化（開発環境のみ）

# データベース確認
docker-compose exec postgres psql -U postgres -d monstera -c "\dt"  # テーブル一覧
docker-compose exec postgres psql -U postgres -d monstera -c "\d users"  # テーブル定義
```

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

## コーディング規約

詳細は[コーディング規約](docs/06_standards/coding-standards.md)を参照してください。

## エラーハンドリング実装規則

詳細は[エラーハンドリング実装規則](docs/06_standards/error-handling.md)を参照してください。

## セキュリティ実装規則

詳細は[セキュリティ実装規則](docs/06_standards/security-implementation.md)を参照してください。

## 並行処理・排他制御

詳細は[並行処理・排他制御](docs/06_standards/concurrency-control.md)を参照してください。

## データベース設計・整合性

詳細は[データベース設計・整合性](docs/03_database/database-design.md)を参照してください。

## 監査・セキュリティログ

詳細は[監査・セキュリティログ](docs/06_standards/audit-logging.md)を参照してください。

## パフォーマンス最適化規則

詳細は[パフォーマンス最適化規則](docs/06_standards/performance-optimization.md)を参照してください。

## バッチ・非同期処理

詳細は[バッチ・非同期処理](docs/batch/batch-processing.md)を参照してください。

## テスト実装規則

詳細は[テスト実装規則](docs/01_backend/testing/testing-implementation-guide.md)を参照してください。


## 🏗️ アーキテクチャ詳細

詳細は[アーキテクチャ詳細](docs/00_project_overview/architecture.md)を参照してください。


## 🌐 API設計規則

詳細は[API設計規則](docs/06_standards/api-design.md)を参照してください。

## 🚀 デプロイメント・環境管理

詳細は[デプロイメント・環境管理](.cursor/rules/deployment-environment.md)を参照してください。

## 🔍 トラブルシューティング

詳細は[トラブルシューティングガイド](docs/04_development/troubleshooting.md)を参照してください。


## 📋 プロジェクト固有の実装ガイド

詳細は[プロジェクト固有の実装ガイド](.cursor/rules/project-specific.md)を参照してください。

## 🔄 段階的改善計画

詳細は[段階的改善計画](.cursor/rules/scaling-plan.md)を参照してください。

---
## 📚 ドキュメント自動更新システム

このプロジェクトでは、開発中に得られた知識を体系的に管理し、既存ドキュメントに反映させるシステムを採用しています。

### 参照すべきドキュメント

作業開始時に必ず関連ファイル・ログ・ドキュメントを収集し、体系的に分析して下さい。

**プロジェクト概要・規約**
- `README.md` - プロジェクト概要とセットアップ手順
- `docs/00_project_overview/README.md` - プロジェクト全体の概要
- `docs/06_standards/coding-standards.md` - コーディング規約（命名規則を含む）
- `docs/06_standards/error-code-standards.md` - エラーコード標準

**バックエンド実装**
- `docs/01_backend/specification.md` - バックエンド仕様書
- `docs/01_backend/implementation/handler-implementation.md` - ハンドラー実装ガイド
- `docs/01_backend/implementation/service-implementation.md` - サービス実装ガイド
- `docs/01_backend/implementation/repository-implementation.md` - リポジトリ実装ガイド
- `docs/01_backend/testing/testing-guide.md` - テストガイド

**フロントエンド実装**
- `docs/02_frontend/specification.md` - フロントエンド仕様書
- `docs/02_frontend/component-consolidation-analysis.md` - コンポーネント統合分析
- `docs/UI_Design_Guidelines.md` - UI設計ガイドライン

**データベース**
- `docs/03_database/ddl-specification.md` - DDL仕様書
- `docs/postgresql-migration/` - PostgreSQL移行ガイド

**開発環境・ツール**
- `docs/04_development/dev-environment-guide.md` - 開発環境ガイド
- `docs/04_development/debug-logging.md` - デバッグとロギング
- `docs/04_development/redis-cache.md` - Redisキャッシュ設定

**機能別設計書**
- `docs/05_design/weekly-report-basic-design.md` - 週報基本設計
- `docs/05_features/expense-application-basic-design.md` - 経費申請基本設計
- `docs/05_features/leave_management/basic_design.md` - 休暇管理基本設計
- `docs/07_engineer_management/basic_design.md` - エンジニア管理基本設計

### 更新ルール

#### 提案タイミング
以下の状況で、ドキュメント更新を提案してください：

1. **エラーや問題を解決した時**
2. **効率的な実装パターンを発見した時**
3. **新しいAPI/ライブラリの使用方法を確立した時**
4. **既存ドキュメントの情報が古い/不正確だと判明した時**
5. **頻繁に参照される情報を発見した時**
6. **コードレビューの修正を終わらせた時**

#### 提案フォーマット
💡 ドキュメント更新の提案： [状況の説明]
【更新内容】 [具体的な追加/修正内容]
【更新候補】
[ファイルパス1] - [理由]
[ファイルパス2] - [理由]
新規ファイル作成 - [理由]
どこに追加しますか？（番号を選択 or skip）

#### 承認プロセス
1. ユーザーが更新先を選択
2. 実際の更新内容をプレビュー表示
3. ユーザーが最終承認（yes/edit/no）
4. 承認後、ファイルを更新

### 既存ドキュメントとの連携

- 既存の記載形式やスタイルを踏襲すること
- 関連する既存内容がある場合は参照を明記すること
- 日付（YYYY-MM-DD形式）を含めて更新履歴を残すこと

### 重要な制約

1. **ユーザーの承認なしにファイルを更新しない**
2. **既存の内容を削除・変更せず、追加のみ行う**
3. **機密情報（APIキー、パスワード等）は記録しない**
4. **プロジェクトの慣習やスタイルガイドに従う**

### ドキュメントの分割管理

CLAUDE.mdが肥大化することを防ぐため、以下の基準で適切にファイルを分割してください：

- **100行を超えた場合**: 関連する内容を別ファイルに分離することを提案
- **推奨される分割方法**:
  - `.cursor/rules/update-system.md` - 更新システムのルール
  - `.cursor/rules/project-specific.md` - プロジェクト固有の設定
  - `.cursor/rules/references.md` - 参照すべきドキュメントのリスト
- **CLAUDE.mdには概要とリンクのみ残す**: 詳細は個別ファイルへ
3. 推奨ドキュメント構造の提案
既存のドキュメント構造を分析した上で、不足している可能性のあるドキュメントを提案してください：
📁 ドキュメント構造の提案：
現在のプロジェクトに以下のドキュメントを追加することを推奨します：

[探索結果に基づいて、不足しているドキュメントを提案]
例：
1. `.cursor/rules/patterns.md` - 実装パターンとベストプラクティス
   → 効率的なコードパターンを蓄積

2. `.cursor/rules/troubleshooting.md` - トラブルシューティングガイド
   → エラーと解決策を体系化

3. `.cursor/rules/dependencies.md` - 依存関係とAPI使用例
   → 外部ライブラリの使用方法を記録

4. `.cursor/rules/remote-integration.md` - リモートリポジトリ連携
   → Git操作のベストプラクティス、ブランチ戦略、PR/MRテンプレート、CI/CD設定等を記録

これらのファイルを作成しますか？（作成する番号を選択: "1,2" or "all" or "skip"）
選択されたファイルに対して、初期テンプレートを作成してください。
4. 動作確認
設定完了後、以下のメッセージを表示してください：
✅ ドキュメント自動更新システムの設定が完了しました！

【設定内容】
- CLAUDE.mdに運用ルールを追記
- [作成したドキュメントのリスト]

【今後の動作】
1. 作業中に新しい発見があった際、更新提案を行います
2. あなたの承認を得てから、ドキュメントを更新します
3. 既存のドキュメント形式を踏襲し、知識を体系的に蓄積します

動作テストをしますか？（テスト用のエラーを発生させて、提案フローを確認できます）
5. 初期設定の記録
最後に、.cursor/rules/（または適切な場所）にsetup-log.mdを作成し、実行した初期設定を記録してください：
# ドキュメント自動更新システム 設定ログ

## 設定日時
[YYYY-MM-DD HH:MM]

## 実行内容
1. 既存ドキュメントの探索
   - [見つかったファイルのリスト]

2. CLAUDE.md への追記
   - ドキュメント参照リスト
   - 更新ルール
   - 承認プロセス

3. 新規作成したドキュメント
   - [作成したファイルのリスト]

## 備考
[特記事項があれば記載]

以上の手順を実行し、各ステップでユーザーの確認を取りながら進めてください。