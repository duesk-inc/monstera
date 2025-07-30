-- パフォーマンス向上のためのインデックス追加

-- users テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, engineer_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_employee_number ON users(employee_number) WHERE employee_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_department_status ON users(department, engineer_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_search ON users(sei, mei, email, employee_number) WHERE deleted_at IS NULL;

-- engineer_status_history テーブルのインデックス（テーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engineer_status_history') THEN
        CREATE INDEX IF NOT EXISTS idx_engineer_status_history_user_changed ON engineer_status_history(user_id, changed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_engineer_status_history_status ON engineer_status_history(new_status);
    END IF;
END $$;

-- engineer_skills テーブルのインデックス（テーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engineer_skills') THEN
        CREATE INDEX IF NOT EXISTS idx_engineer_skills_user_category ON engineer_skills(user_id, skill_category_id);
        CREATE INDEX IF NOT EXISTS idx_engineer_skills_category ON engineer_skills(skill_category_id);
        CREATE INDEX IF NOT EXISTS idx_engineer_skills_level ON engineer_skills(skill_level);
    END IF;
END $$;

-- engineer_project_history テーブルのインデックス（テーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engineer_project_history') THEN
        CREATE INDEX IF NOT EXISTS idx_engineer_project_history_user_date ON engineer_project_history(user_id, start_date DESC);
        CREATE INDEX IF NOT EXISTS idx_engineer_project_history_project ON engineer_project_history(project_name);
        CREATE INDEX IF NOT EXISTS idx_engineer_project_history_period ON engineer_project_history(start_date, end_date);
    END IF;
END $$;

-- audit_logs テーブルのインデックス（既存のものに追加）
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created ON audit_logs(resource_type, resource_id, created_at DESC);

-- change_histories テーブルのインデックス（既存のものに追加）
CREATE INDEX IF NOT EXISTS idx_change_histories_user_created ON change_histories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_histories_target_created ON change_histories(target_type, target_id, created_at DESC);

-- コメント
COMMENT ON INDEX idx_users_role_status IS 'roleとengineer_statusでの検索用（削除されていないユーザーのみ）';
COMMENT ON INDEX idx_users_email IS 'emailでの検索用（削除されていないユーザーのみ）';
COMMENT ON INDEX idx_users_employee_number IS '社員番号での検索用（NULLでない値のみ）';
COMMENT ON INDEX idx_users_department_status IS '部署とステータスでの検索用（削除されていないユーザーのみ）';
COMMENT ON INDEX idx_users_search IS '複合検索用インデックス';