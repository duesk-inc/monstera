-- パフォーマンス向上のためのインデックス追加（PostgreSQL版）

-- users テーブルのインデックス
CREATE INDEX idx_users_role_status ON users(role, engineer_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_employee_number ON users(employee_number) WHERE employee_number IS NOT NULL;
CREATE INDEX idx_users_department_status ON users(department, engineer_status) WHERE deleted_at IS NULL;

-- PostgreSQLでは複数カラムの全文検索インデックスは別アプローチが必要
-- GINインデックスを使用した全文検索（オプション）
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX idx_users_search ON users USING gin ((sei || ' ' || mei || ' ' || COALESCE(email, '') || ' ' || COALESCE(employee_number, '')) gin_trgm_ops) WHERE deleted_at IS NULL;

-- 通常の複合インデックス
CREATE INDEX idx_users_search_composite ON users(sei, mei) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_search_email ON users(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX idx_users_search_emp_num ON users(employee_number) WHERE deleted_at IS NULL AND employee_number IS NOT NULL;

-- engineer_status_history テーブルのインデックス
CREATE INDEX idx_engineer_status_history_user_changed ON engineer_status_history(user_id, changed_at DESC);
CREATE INDEX idx_engineer_status_history_status ON engineer_status_history(new_status);

-- engineer_skills テーブルのインデックス
CREATE INDEX idx_engineer_skills_user_category ON engineer_skills(user_id, skill_category_id);
CREATE INDEX idx_engineer_skills_category ON engineer_skills(skill_category_id);
CREATE INDEX idx_engineer_skills_level ON engineer_skills(skill_level);

-- engineer_project_history テーブルのインデックス
CREATE INDEX idx_engineer_project_history_user_date ON engineer_project_history(user_id, start_date DESC);
CREATE INDEX idx_engineer_project_history_project ON engineer_project_history(project_name);
CREATE INDEX idx_engineer_project_history_period ON engineer_project_history(start_date, end_date);

-- PostgreSQLでは範囲検索に特化したインデックスも利用可能
CREATE INDEX idx_engineer_project_history_period_gist ON engineer_project_history USING gist (tsrange(start_date, end_date));

-- audit_logs テーブルのインデックス（既存のものに追加）
-- 注意: PostgreSQLではtarget_type/target_idの代わりにresource_type/resource_idを使用
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource_created ON audit_logs(resource_type, resource_id, created_at DESC) WHERE resource_id IS NOT NULL;

-- change_histories テーブルのインデックス（存在する場合）
-- CREATE INDEX idx_change_histories_user_created ON change_histories(user_id, created_at DESC);
-- CREATE INDEX idx_change_histories_target_created ON change_histories(target_type, target_id, created_at DESC);

-- PostgreSQL特有の最適化

-- 部分インデックスで頻繁にアクセスされるデータに最適化
CREATE INDEX idx_audit_logs_recent ON audit_logs(created_at DESC) 
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- JSONBカラムへの特定キーのインデックス（頻繁に検索される場合）
-- CREATE INDEX idx_audit_logs_request_user_id ON audit_logs ((request_body->>'user_id')) 
-- WHERE request_body IS NOT NULL;

-- 統計情報の更新（インデックス作成後に実行することを推奨）
-- ANALYZE users;
-- ANALYZE engineer_status_history;
-- ANALYZE engineer_skills;
-- ANALYZE engineer_project_history;
-- ANALYZE audit_logs;