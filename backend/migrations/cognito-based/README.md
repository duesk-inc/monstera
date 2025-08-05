# Cognito-Based Migration

## 概要
このディレクトリは、AWS Cognito Subを主キーとした新しいデータベース設計のマイグレーションファイルを含みます。

## 主な変更点

### 1. 主キー設計
- **変更前**: `id VARCHAR(36)` (UUID) + `cognito_sub VARCHAR(255)`
- **変更後**: `id VARCHAR(255)` (Cognito Sub直接使用)

### 2. パスワード管理
- **変更前**: `password VARCHAR(255)` カラムあり
- **変更後**: パスワードカラム削除（Cognito認証のみ）

### 3. 外部キー
- **変更前**: `VARCHAR(36)` (UUID形式)
- **変更後**: `VARCHAR(255)` (Cognito Sub形式)

## マイグレーションファイル一覧

| ファイル | 説明 | 状態 |
|---------|------|------|
| 000000_initial_setup | 初期設定（ENUM、関数定義） | ✅ 完了 |
| 000001_create_users_table | ユーザーマスタテーブル | ✅ 完了 |
| 000002_create_profiles_table | プロフィール関連テーブル | ✅ 完了 |
| 000003_create_departments_table | 部署テーブル | 🔄 作成予定 |
| 000004_create_sessions_table | セッション管理 | 🔄 作成予定 |
| 000005_create_expenses_table | 経費申請 | 🔄 作成予定 |
| 000006_create_leave_requests_table | 休暇申請 | 🔄 作成予定 |
| 000007_create_weekly_reports_table | 週報 | 🔄 作成予定 |
| 000008_create_notifications_table | 通知 | 🔄 作成予定 |

## 実行方法

### 開発環境での実行
```bash
# 新規マイグレーションの実行
migrate -path migrations/cognito-based -database "postgres://user:pass@localhost/db?sslmode=disable" up

# ロールバック
migrate -path migrations/cognito-based -database "postgres://user:pass@localhost/db?sslmode=disable" down
```

### Docker Composeでの実行
```bash
# .envファイルでマイグレーションパスを変更
MIGRATION_PATH=./migrations/cognito-based

# 実行
docker-compose run --rm migrate up
```

## 注意事項

1. **既存データの移行**
   - 初期開発フェーズのため、既存データの移行は不要
   - 本番環境への適用前に、データ移行計画の策定が必要

2. **アプリケーションコードの修正**
   - User構造体の修正が必要
   - リポジトリ層のUUID→string変更が必要
   - 認証ミドルウェアの修正が必要

3. **テストデータ**
   - Cognito Sub形式のモックデータが必要
   - 例: `us-east-1:12345678-1234-1234-1234-123456789012`

## 移行チェックリスト

- [ ] マイグレーションファイルの作成完了
- [ ] User構造体の修正
- [ ] リポジトリインターフェースの修正
- [ ] サービス層の修正
- [ ] 認証ミドルウェアの修正
- [ ] テストコードの修正
- [ ] モックデータの更新
- [ ] 統合テストの実施
- [ ] ドキュメントの更新