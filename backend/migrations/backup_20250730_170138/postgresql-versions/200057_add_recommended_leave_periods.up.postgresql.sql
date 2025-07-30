-- 推奨休暇取得期間テーブルの作成
CREATE TABLE IF NOT EXISTS recommended_leave_periods (
    id CHAR(36) NOT NULL PRIMARY KEY,
    period_name VARCHAR(100) NOT NULL,
    fiscal_year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_leave_types JSON NOT NULL,
    required_days DECIMAL(3,1) NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36) NOT NULL,
    updated_by CHAR(36) NOT NULL
);

-- Comments on recommended_leave_periods columns
COMMENT ON TABLE recommended_leave_periods IS '推奨休暇取得期間マスタ';
COMMENT ON COLUMN recommended_leave_periods.period_name IS '期間名（例：GW、年末年始）';
COMMENT ON COLUMN recommended_leave_periods.fiscal_year IS '対象年度';
COMMENT ON COLUMN recommended_leave_periods.start_date IS '開始日';
COMMENT ON COLUMN recommended_leave_periods.end_date IS '終了日';
COMMENT ON COLUMN recommended_leave_periods.target_leave_types IS '対象休暇種別IDのリスト';
COMMENT ON COLUMN recommended_leave_periods.required_days IS '推奨取得日数';
COMMENT ON COLUMN recommended_leave_periods.description IS '説明';
COMMENT ON COLUMN recommended_leave_periods.is_active IS '有効フラグ';

-- Create indexes for recommended_leave_periods
CREATE INDEX IF NOT EXISTS idx_fiscal_year ON recommended_leave_periods (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_period_dates ON recommended_leave_periods (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_is_active ON recommended_leave_periods (is_active);

-- 推奨休暇取得期間と実際の取得状況を記録するテーブル
CREATE TABLE IF NOT EXISTS leave_period_usages (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    period_id CHAR(36) NOT NULL,
    used_days DECIMAL(3,1) NOT NULL DEFAULT 0,
    is_converted BOOLEAN NOT NULL DEFAULT FALSE,
    converted_days DECIMAL(3,1),
    converted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (period_id) REFERENCES recommended_leave_periods(id) ON DELETE CASCADE,
    CONSTRAINT uk_leave_user_period UNIQUE (user_id, period_id)
);

-- Comments on leave_period_usages columns
COMMENT ON TABLE leave_period_usages IS '推奨休暇取得期間の利用状況';
COMMENT ON COLUMN leave_period_usages.user_id IS 'ユーザーID';
COMMENT ON COLUMN leave_period_usages.period_id IS '推奨休暇取得期間ID';
COMMENT ON COLUMN leave_period_usages.used_days IS '取得済み日数';
COMMENT ON COLUMN leave_period_usages.is_converted IS '振替特別休暇への変換済みフラグ';
COMMENT ON COLUMN leave_period_usages.converted_days IS '振替特別休暇に変換された日数';
COMMENT ON COLUMN leave_period_usages.converted_at IS '変換日時';

-- Create index for leave_period_usages
CREATE INDEX IF NOT EXISTS idx_is_converted ON leave_period_usages (is_converted);

-- Triggers for automatic timestamp updates

-- Trigger for recommended_leave_periods table
DROP TRIGGER IF EXISTS update_recommended_leave_periods_updated_at ON recommended_leave_periods;
CREATE TRIGGER update_recommended_leave_periods_updated_at
    BEFORE UPDATE ON recommended_leave_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for leave_period_usages table
DROP TRIGGER IF EXISTS update_leave_period_usages_updated_at ON leave_period_usages;
CREATE TRIGGER update_leave_period_usages_updated_at
    BEFORE UPDATE ON leave_period_usages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();