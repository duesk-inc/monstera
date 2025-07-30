-- PostgreSQL Index Optimization Rollback Script
-- ========================================

-- 18. パフォーマンス統計の自動更新設定を元に戻す
ALTER TABLE change_histories RESET (autovacuum_analyze_scale_factor);
ALTER TABLE audit_logs RESET (autovacuum_analyze_scale_factor);
ALTER TABLE daily_records RESET (autovacuum_analyze_scale_factor);
ALTER TABLE weekly_reports RESET (autovacuum_analyze_scale_factor);
ALTER TABLE users RESET (autovacuum_analyze_scale_factor);

-- 17. 会計連携のインデックス削除
DROP INDEX IF EXISTS idx_expense_claims_accounting;
DROP INDEX IF EXISTS idx_invoices_accounting_sync;

-- 16. 提案システムのインデックス削除
DROP INDEX IF EXISTS idx_engineer_proposal_questions_deleted;
DROP INDEX IF EXISTS idx_engineer_proposal_questions_proposal_category;
DROP INDEX IF EXISTS idx_engineer_proposals_responded_at;
DROP INDEX IF EXISTS idx_engineer_proposals_status_created;
DROP INDEX IF EXISTS idx_engineer_proposals_project_deleted;
DROP INDEX IF EXISTS idx_engineer_proposals_user_status_created;

-- 15. 変更履歴のインデックス削除
DROP INDEX IF EXISTS idx_change_histories_target_created;
DROP INDEX IF EXISTS idx_change_histories_user_created;
DROP INDEX IF EXISTS idx_change_histories_created_at_brin;

-- 14. 監査ログのインデックス削除
DROP INDEX IF EXISTS idx_audit_logs_target_created;
DROP INDEX IF EXISTS idx_audit_logs_user_created;
DROP INDEX IF EXISTS idx_audit_logs_created_at_brin;

-- 13. エンジニアプロジェクト履歴のインデックス削除
DROP INDEX IF EXISTS idx_engineer_project_history_period;
DROP INDEX IF EXISTS idx_engineer_project_history_project;
DROP INDEX IF EXISTS idx_engineer_project_history_user_date;

-- 12. エンジニアステータス履歴のインデックス削除
DROP INDEX IF EXISTS idx_engineer_status_history_status;
DROP INDEX IF EXISTS idx_engineer_status_history_user_changed;

-- 11. 請求管理のインデックス削除
DROP INDEX IF EXISTS idx_invoice_details_invoice_id;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_invoices_billing_month;
DROP INDEX IF EXISTS idx_invoices_client_id;

-- 10. プロジェクト管理のインデックス削除
DROP INDEX IF EXISTS idx_project_assignments_end_date;
DROP INDEX IF EXISTS idx_project_assignments_user_id;
DROP INDEX IF EXISTS idx_project_assignments_project_id;
DROP INDEX IF EXISTS idx_projects_end_date;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_project_code;
DROP INDEX IF EXISTS idx_clients_company_name;

-- 9. 通知関連のインデックス削除
-- DROP INDEX IF EXISTS idx_notifications_metadata_gin;
DROP INDEX IF EXISTS idx_user_read_status;
DROP INDEX IF EXISTS idx_user_notification;
DROP INDEX IF EXISTS idx_user_notification_type;

-- 8. 勤怠管理のインデックス削除
DROP INDEX IF EXISTS idx_attendances_status;
DROP INDEX IF EXISTS idx_attendances_user_date;

-- 7. セッション管理のインデックス削除
DROP INDEX IF EXISTS idx_sessions_refresh_token;
DROP INDEX IF EXISTS idx_sessions_deleted_at;
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_sessions_user_id;

-- 6. 休暇管理関連のインデックス削除
DROP INDEX IF EXISTS idx_substitute_leave_grants_expire_date;
DROP INDEX IF EXISTS idx_substitute_leave_grants_user_id;
DROP INDEX IF EXISTS idx_user_leave_balances_leave_type_id;
DROP INDEX IF EXISTS idx_user_leave_balances_user_id;

-- 5. スキル関連テーブルのインデックス削除
DROP INDEX IF EXISTS idx_engineer_skills_level;
DROP INDEX IF EXISTS idx_engineer_skills_category;
DROP INDEX IF EXISTS idx_engineer_skills_user_category;
DROP INDEX IF EXISTS idx_business_experiences_deleted_at;
DROP INDEX IF EXISTS idx_framework_skills_deleted_at;
DROP INDEX IF EXISTS idx_language_skills_deleted_at;

-- 4. work_history_technologies テーブルのインデックス削除
DROP INDEX IF EXISTS idx_work_history_technologies_technology_name;
DROP INDEX IF EXISTS idx_work_history_technologies_category_id;
DROP INDEX IF EXISTS idx_work_history_technologies_work_history_id;

-- 3. daily_records テーブルのインデックス削除
DROP INDEX IF EXISTS idx_daily_records_monthly_aggregate;
DROP INDEX IF EXISTS idx_daily_records_covering;
DROP INDEX IF EXISTS idx_daily_records_client_work;
DROP INDEX IF EXISTS idx_daily_records_holiday_work;
DROP INDEX IF EXISTS idx_daily_records_work_hours;
DROP INDEX IF EXISTS idx_daily_records_date;
DROP INDEX IF EXISTS idx_daily_records_weekly_report;

-- 2. weekly_reports テーブルのインデックス削除
DROP INDEX IF EXISTS idx_weekly_reports_monthly;
DROP INDEX IF EXISTS idx_weekly_reports_remarks_gin;
DROP INDEX IF EXISTS idx_weekly_reports_covering;
DROP INDEX IF EXISTS idx_weekly_reports_unsubmitted;
DROP INDEX IF EXISTS idx_weekly_reports_deleted_status;
DROP INDEX IF EXISTS idx_weekly_reports_submitted_at;
DROP INDEX IF EXISTS idx_weekly_reports_date_range;
DROP INDEX IF EXISTS idx_weekly_reports_status_created;
DROP INDEX IF EXISTS idx_weekly_reports_user_date;
DROP INDEX IF EXISTS idx_weekly_reports_commented_at;

-- 1. users テーブルのインデックス削除
DROP INDEX IF EXISTS idx_users_search;
DROP INDEX IF EXISTS idx_users_department_status;
DROP INDEX IF EXISTS idx_users_employee_number;
DROP INDEX IF EXISTS idx_users_email_active;
DROP INDEX IF EXISTS idx_users_role_status;
DROP INDEX IF EXISTS idx_users_last_follow_up_date;
DROP INDEX IF EXISTS idx_users_follow_up_required;
DROP INDEX IF EXISTS idx_users_default_role;
DROP INDEX IF EXISTS idx_users_role;

-- 注意: pg_trgm拡張は他の機能でも使用される可能性があるため、削除しません
-- DROP EXTENSION IF EXISTS pg_trgm;