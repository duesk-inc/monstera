-- アラート設定テーブルの作成
CREATE TABLE IF NOT EXISTS alert_settings (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY DEFAULT (UUID()),
    weekly_hours_limit INT NOT NULL DEFAULT 60 COMMENT '週間労働時間上限（デフォルト60時間）',
    weekly_hours_change_limit INT NOT NULL DEFAULT 20 COMMENT '週間労働時間の前週比変化許容幅（デフォルト20時間）',
    consecutive_holiday_work_limit INT NOT NULL DEFAULT 3 COMMENT '連続休日出勤許容回数（デフォルト3週）',
    monthly_overtime_limit INT NOT NULL DEFAULT 80 COMMENT '月間残業時間上限（デフォルト80時間）',
    updated_by CHAR(36) NOT NULL COMMENT '最終更新者ID',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_alert_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='アラート設定テーブル（システム全体で1レコード）';

-- アラート履歴テーブルの作成
CREATE TABLE IF NOT EXISTS alert_histories (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL COMMENT '対象ユーザーID',
    weekly_report_id CHAR(36) COMMENT '関連する週報ID（任意）',
    alert_type VARCHAR(50) NOT NULL COMMENT 'アラートタイプ',
    severity VARCHAR(20) NOT NULL COMMENT '深刻度（high, medium, low）',
    detected_value JSON NOT NULL COMMENT '検出された値（JSON形式）',
    threshold_value JSON NOT NULL COMMENT '閾値（JSON形式）',
    status VARCHAR(20) NOT NULL DEFAULT 'unhandled' COMMENT 'ステータス（unhandled, handling, resolved）',
    resolved_at TIMESTAMP NULL COMMENT '解決日時',
    resolved_by CHAR(36) COMMENT '解決者ID',
    resolution_comment TEXT COMMENT '解決時のコメント',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- パフォーマンス最適化のためのインデックス
    INDEX idx_alert_histories_user_status (user_id, status),
    INDEX idx_alert_histories_created_at (created_at),
    INDEX idx_alert_histories_type_severity (alert_type, severity),
    INDEX idx_alert_histories_status_created (status, created_at DESC),
    INDEX idx_alert_histories_weekly_report (weekly_report_id),
    
    -- 外部キー制約
    CONSTRAINT fk_alert_histories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_histories_weekly_report FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE SET NULL,
    CONSTRAINT fk_alert_histories_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='アラート履歴テーブル';

-- アラートタイプのチェック制約
ALTER TABLE alert_histories 
ADD CONSTRAINT chk_alert_type CHECK (
    alert_type IN (
        'overwork',           -- 長時間労働
        'sudden_change',      -- 前週比急激な変化
        'holiday_work',       -- 連続休日出勤
        'monthly_overtime',   -- 月間残業時間超過
        'unsubmitted'        -- 週報未提出
    )
);

-- 深刻度のチェック制約
ALTER TABLE alert_histories 
ADD CONSTRAINT chk_severity CHECK (
    severity IN ('high', 'medium', 'low')
);

-- ステータスのチェック制約
ALTER TABLE alert_histories 
ADD CONSTRAINT chk_alert_status CHECK (
    status IN ('unhandled', 'handling', 'resolved')
);

-- 初期データの投入（アラート設定）
-- システム管理者のIDを取得して設定
INSERT INTO alert_settings (
    weekly_hours_limit,
    weekly_hours_change_limit,
    consecutive_holiday_work_limit,
    monthly_overtime_limit,
    updated_by
) SELECT 
    60,  -- 週60時間
    20,  -- 前週比20時間
    3,   -- 3週連続
    80,  -- 月80時間
    id
FROM users 
WHERE email = 'admin@duesk.co.jp' 
LIMIT 1;