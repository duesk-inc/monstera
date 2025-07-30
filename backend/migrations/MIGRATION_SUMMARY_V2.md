# マイグレーション整理サマリー V2

## 完了した作業

### 統合版マイグレーションの作成完了

1. **usersテーブル（000001）**
   - 200004_add_department_to_users
   - 200012_extend_users_for_engineers  
   - 200060_add_name_column_to_users

2. **expensesテーブル（000010）**
   - 200047_add_expense_deadline_fields
   - 200071_add_version_to_expenses

3. **clientsテーブル（000017）**
   - 200028_add_sales_columns_to_clients
   - 200033_extend_clients_for_accounting

4. **invoicesテーブル（000020）**
   - 200034_extend_invoices_for_accounting

5. **project_assignmentsテーブル（000019）**
   - 200035_extend_project_assignments_for_billing

6. **weekly_reportsテーブル（000003）**
   - 200010_refactor_weekly_reports_model

### 実行手順

1. データベースバックアップ（必須）
2. マイグレーションのリセット
   ```bash
   docker-compose exec backend migrate -path migrations/postgresql-versions -database "postgres://..." force 0
   ```
3. 新しいマイグレーションの実行
   ```bash
   docker-compose exec backend migrate -path migrations/postgresql-versions -database "postgres://..." up
   ```

## 注意事項
- 全てのALTER文ベースのマイグレーションが統合されました
- 本番環境での実行前に必ずバックアップを取得してください
- schema_migrationsテーブルのリセットが必要です
