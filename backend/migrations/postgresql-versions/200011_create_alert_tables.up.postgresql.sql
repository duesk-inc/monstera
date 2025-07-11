-- アラート設定テーブルの作成
CREATE TABLE IF NOT EXISTS alert_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    weekly_hours_limit INT NOT NULL DEFAULT 60, -- 週間労働時間上限（デフォルト60時間）
    weekly_hours_change_limit INT NOT NULL DEFAULT 20, -- 週間労働時間の前週比変化許容幅（デフォルト20時間）
    consecutive_holiday_work_limit INT NOT NULL DEFAULT 3, -- 連続休日出勤許容回数（デフォルト3週）
    monthly_overtime_limit INT NOT NULL DEFAULT 80, -- 月間残業時間上限（デフォルト80時間）
    updated_by CHAR(36) NOT NULL, -- 最終更新者ID
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    -- 外部キー制約
    CONSTRAINT fk_alert_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE alert_settings IS 'アラート設定テーブル（システム全体で1レコード）';
COMMENT ON COLUMN alert_settings.weekly_hours_limit IS '週間労働時間上限（デフォルト60時間）';
COMMENT ON COLUMN alert_settings.weekly_hours_change_limit IS '週間労働時間の前週比変化許容幅（デフォルト20時間）';
COMMENT ON COLUMN alert_settings.consecutive_holiday_work_limit IS '連続休日出勤許容回数（デフォルト3週）';
COMMENT ON COLUMN alert_settings.monthly_overtime_limit IS '月間残業時間上限（デフォルト80時間）';
COMMENT ON COLUMN alert_settings.updated_by IS '最終更新者ID';

-- アラート履歴テーブルの作成
CREATE TABLE IF NOT EXISTS alert_histories (
    id CHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    user_id CHAR(36) NOT NULL, -- 対象ユーザーID
    weekly_report_id CHAR(36), -- 関連する週報ID（任意）
    alert_type VARCHAR(50) NOT NULL CHECK (
        alert_type IN (
            'overwork', -- 長時間労働
            'sudden_change', -- 前週比急激な変化
            'holiday_work', -- 連続休日出勤
            'monthly_overtime', -- 月間残業時間超過
            'unsubmitted' -- 週報未提出
        )
    ), -- アラートタイプ
    severity VARCHAR(20) NOT NULL CHECK (
        severity IN ('high', 'medium', 'low')
    ), -- 深刻度（high, medium, low）
    detected_value JSON NOT NULL, -- 検出された値（JSON形式）
    threshold_value JSON NOT NULL, -- 閾値（JSON形式）
    status VARCHAR(20) NOT NULL DEFAULT 'unhandled' CHECK (
        status IN ('unhandled', 'handling', 'resolved')
    ), -- ステータス（unhandled, handling, resolved）
    resolved_at TIMESTAMP NULL, -- 解決日時
    resolved_by CHAR(36), -- 解決者ID
    resolution_comment TEXT, -- 解決時のコメント
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    -- 外部キー制約
    CONSTRAINT fk_alert_histories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_histories_weekly_report FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE SET NULL,
    CONSTRAINT fk_alert_histories_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- パフォーマンス最適化のためのインデックス
CREATE INDEX idx_alert_histories_user_status ON alert_histories(user_id, status);
CREATE INDEX idx_alert_histories_created_at ON alert_histories(created_at);
CREATE INDEX idx_alert_histories_type_severity ON alert_histories(alert_type, severity);
CREATE INDEX idx_alert_histories_status_created ON alert_histories(status, created_at DESC);
CREATE INDEX idx_alert_histories_weekly_report ON alert_histories(weekly_report_id);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE alert_histories IS 'アラート履歴テーブル';
COMMENT ON COLUMN alert_histories.user_id IS '対象ユーザーID';
COMMENT ON COLUMN alert_histories.weekly_report_id IS '関連する週報ID（任意）';
COMMENT ON COLUMN alert_histories.alert_type IS 'アラートタイプ';
COMMENT ON COLUMN alert_histories.severity IS '深刻度（high, medium, low）';
COMMENT ON COLUMN alert_histories.detected_value IS '検出された値（JSON形式）';
COMMENT ON COLUMN alert_histories.threshold_value IS '閾値（JSON形式）';
COMMENT ON COLUMN alert_histories.status IS 'ステータス（unhandled, handling, resolved）';
COMMENT ON COLUMN alert_histories.resolved_at IS '解決日時';
COMMENT ON COLUMN alert_histories.resolved_by IS '解決者ID';
COMMENT ON COLUMN alert_histories.resolution_comment IS '解決時のコメント';

-- 初期データの投入（アラート設定）
-- システム管理者のIDを取得して設定
INSERT INTO alert_settings (
    weekly_hours_limit,
    weekly_hours_change_limit,
    consecutive_holiday_work_limit,
    monthly_overtime_limit,
    updated_by
)
SELECT 
    60, -- 週60時間
    20, -- 前週比20時間
    3, -- 3週連続
    80, -- 月80時間
    id
FROM users 
WHERE email = 'admin@duesk.co.jp' 
LIMIT 1;


-- Triggers for automatic timestamp updates

-- Trigger for alert_settings table
CREATE OR REPLACE TRIGGER update_alert_settings_updated_at
    BEFORE UPDATE ON alert_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for alert_histories table
CREATE OR REPLACE TRIGGER update_alert_histories_updated_at
    BEFORE UPDATE ON alert_histories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();