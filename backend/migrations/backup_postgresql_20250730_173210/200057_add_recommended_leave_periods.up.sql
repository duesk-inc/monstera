-- 推奨休暇取得期間テーブルの作成
CREATE TABLE IF NOT EXISTS recommended_leave_periods (
    id CHAR(36) NOT NULL PRIMARY KEY,
    period_name VARCHAR(100) NOT NULL COMMENT '期間名（例：GW、年末年始）',
    fiscal_year INT NOT NULL COMMENT '対象年度',
    start_date DATE NOT NULL COMMENT '開始日',
    end_date DATE NOT NULL COMMENT '終了日',
    target_leave_types JSON NOT NULL COMMENT '対象休暇種別IDのリスト',
    required_days DECIMAL(3,1) NOT NULL DEFAULT 0 COMMENT '推奨取得日数',
    description TEXT COMMENT '説明',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '有効フラグ',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36) NOT NULL,
    updated_by CHAR(36) NOT NULL,
    INDEX idx_fiscal_year (fiscal_year),
    INDEX idx_period_dates (start_date, end_date),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推奨休暇取得期間マスタ';

-- 推奨休暇取得期間と実際の取得状況を記録するテーブル
CREATE TABLE IF NOT EXISTS leave_period_usages (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL COMMENT 'ユーザーID',
    period_id CHAR(36) NOT NULL COMMENT '推奨休暇取得期間ID',
    used_days DECIMAL(3,1) NOT NULL DEFAULT 0 COMMENT '取得済み日数',
    is_converted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '振替特別休暇への変換済みフラグ',
    converted_days DECIMAL(3,1) COMMENT '振替特別休暇に変換された日数',
    converted_at TIMESTAMP NULL COMMENT '変換日時',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (period_id) REFERENCES recommended_leave_periods(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_period (user_id, period_id),
    INDEX idx_is_converted (is_converted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推奨休暇取得期間の利用状況';