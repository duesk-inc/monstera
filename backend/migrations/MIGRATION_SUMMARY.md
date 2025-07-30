# マイグレーション整理サマリー

## 完了した作業

### 1. 整理方針の策定
- ALTER文を使用しない方針で統一
- 既存テーブルへのカラム追加は、CREATE TABLEに統合
- PostgreSQL専用のマイグレーション構成

### 2. 統合版マイグレーションの作成

#### usersテーブル（000001）
既に以下が統合済み：
- 200004_add_department_to_users
- 200012_extend_users_for_engineers  
- 200060_add_name_column_to_users

#### expensesテーブル（000010）
新規作成した統合版：
- 200047_add_expense_deadline_fields
- 200071_add_version_to_expenses

#### clientsテーブル（000017）
新規作成した統合版：
- 200028_add_sales_columns_to_clients
- 200033_extend_clients_for_accounting

### 3. 作成したファイル
- `MIGRATION_CLEANUP_PLAN.md` - 整理計画書
- `000010_create_expenses_table_v2.up/down.postgresql.sql` - expenses統合版
- `000017_create_clients_table_v2.up/down.postgresql.sql` - clients統合版
- `cleanup_migrations.sh` - 整理実行スクリプト

## 推奨される次のステップ

1. **整理スクリプトの実行**
   ```bash
   cd /Users/daichirouesaka/Documents/90_duesk/monstera/backend/migrations
   ./cleanup_migrations.sh
   ```

2. **マイグレーションのリセット**
   ```bash
   # 現在の状態を確認
   docker-compose exec backend migrate -path migrations/postgresql-versions -database "postgres://..." version
   
   # リセット（注意：データが消える）
   docker-compose exec backend migrate -path migrations/postgresql-versions -database "postgres://..." force 0
   docker-compose exec backend migrate -path migrations/postgresql-versions -database "postgres://..." up
   ```

3. **他のALTER文の処理**
   残りのALTER文を含むテーブル：
   - invoices（200034）
   - project_assignments（200035）
   - weekly_reports（200010）
   - その他

## 注意事項
- 本番環境では必ずデータベースのバックアップを実施
- schema_migrationsテーブルの状態に注意
- 依存関係の順序を考慮した実行が必要