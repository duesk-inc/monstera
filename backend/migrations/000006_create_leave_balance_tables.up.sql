-- ユーザー別休暇付与テーブル作成
CREATE TABLE IF NOT EXISTS user_leave_balances (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    leave_type_id VARCHAR(36) NOT NULL,
    fiscal_year INT NOT NULL,
    total_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    used_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    remaining_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    expire_date DATE,
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    CONSTRAINT user_leave_balances_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_leave_balances_ibfk_2 FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_leave_balances_user_id ON user_leave_balances(user_id);
CREATE INDEX idx_user_leave_balances_leave_type_id ON user_leave_balances(leave_type_id);
-- 振替特別休暇の付与履歴管理テーブルの作成
CREATE TABLE IF NOT EXISTS substitute_leave_grants (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    grant_date DATE NOT NULL,
    granted_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    used_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    remaining_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    work_date DATE NOT NULL, -- 出勤した休日の日付
    reason VARCHAR(255) NOT NULL, -- 付与理由（例：GW出勤、年末年始出勤）
    expire_date DATE NOT NULL, -- 有効期限
    is_expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    CONSTRAINT substitute_leave_grants_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_substitute_leave_grants_user_id ON substitute_leave_grants(user_id);
CREATE INDEX idx_substitute_leave_grants_expire_date ON substitute_leave_grants(expire_date);

-- PostgreSQL用のコメント設定
COMMENT ON COLUMN substitute_leave_grants.work_date IS '出勤した休日の日付';
COMMENT ON COLUMN substitute_leave_grants.reason IS '付与理由（例：GW出勤、年末年始出勤）';
COMMENT ON COLUMN substitute_leave_grants.expire_date IS '有効期限';


-- Triggers for automatic timestamp updates

-- Trigger for user_leave_balances table
CREATE OR REPLACE TRIGGER update_user_leave_balances_updated_at
    BEFORE UPDATE ON user_leave_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for substitute_leave_grants table
CREATE OR REPLACE TRIGGER update_substitute_leave_grants_updated_at
    BEFORE UPDATE ON substitute_leave_grants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
