-- パフォーマンス向上のためのインデックス削除

-- audit_logs テーブルのインデックス削除
DROP INDEX IF EXISTS idx_audit_logs_recent;
DROP INDEX IF EXISTS idx_audit_logs_resource_created;
DROP INDEX IF EXISTS idx_audit_logs_user_created;

-- engineer_project_history テーブルのインデックス削除
DROP INDEX IF EXISTS idx_engineer_project_history_period_gist;
DROP INDEX IF EXISTS idx_engineer_project_history_period;
DROP INDEX IF EXISTS idx_engineer_project_history_project;
DROP INDEX IF EXISTS idx_engineer_project_history_user_date;

-- engineer_skills テーブルのインデックス削除
DROP INDEX IF EXISTS idx_engineer_skills_level;
DROP INDEX IF EXISTS idx_engineer_skills_category;
DROP INDEX IF EXISTS idx_engineer_skills_user_category;

-- engineer_status_history テーブルのインデックス削除
DROP INDEX IF EXISTS idx_engineer_status_history_status;
DROP INDEX IF EXISTS idx_engineer_status_history_user_changed;

-- users テーブルのインデックス削除
DROP INDEX IF EXISTS idx_users_search_emp_num;
DROP INDEX IF EXISTS idx_users_search_email;
DROP INDEX IF EXISTS idx_users_search_composite;
DROP INDEX IF EXISTS idx_users_department_status;
DROP INDEX IF EXISTS idx_users_employee_number;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role_status;