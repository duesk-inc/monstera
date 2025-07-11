-- 週報テーブルのリファクタリング
-- P1-T2: 既存週報テーブルのリファクタリング

-- 1. 新しいカラムの追加
ALTER TABLE weekly_reports 
ADD COLUMN department_id VARCHAR(36) COMMENT '所属部署ID（提出時点）' AFTER user_id,
ADD COLUMN department_name VARCHAR(100) COMMENT '所属部署名（提出時点）' AFTER department_id,
ADD COLUMN manager_id VARCHAR(36) COMMENT '直属上司ID（提出時点）' AFTER department_name,
ADD COLUMN submission_deadline DATE COMMENT '提出期限' AFTER end_date,
ADD COLUMN is_late_submission BOOLEAN NOT NULL DEFAULT FALSE COMMENT '遅延提出フラグ' AFTER submission_deadline,
ADD COLUMN revision_count INT NOT NULL DEFAULT 0 COMMENT '修正回数' AFTER manager_comment,
ADD COLUMN last_accessed_at TIMESTAMP NULL COMMENT '最終アクセス日時' AFTER commented_at,
ADD COLUMN metadata JSON COMMENT 'メタデータ（拡張用）' AFTER last_accessed_at;

-- 2. インデックスの追加（パフォーマンス最適化）
ALTER TABLE weekly_reports 
ADD INDEX idx_weekly_reports_department (department_id),
ADD INDEX idx_weekly_reports_manager (manager_id),
ADD INDEX idx_weekly_reports_deadline (submission_deadline),
ADD INDEX idx_weekly_reports_late_submission (is_late_submission, submission_deadline),
ADD INDEX idx_weekly_reports_last_accessed (last_accessed_at);

-- 3. 外部キー制約の追加（データ整合性確保）
ALTER TABLE weekly_reports 
ADD CONSTRAINT fk_weekly_reports_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_weekly_reports_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. チェック制約の追加（データ品質確保）
ALTER TABLE weekly_reports 
ADD CONSTRAINT chk_weekly_reports_dates CHECK (end_date >= start_date),
ADD CONSTRAINT chk_weekly_reports_work_hours CHECK (total_work_hours >= 0),
ADD CONSTRAINT chk_weekly_reports_client_hours CHECK (client_total_work_hours >= 0),
ADD CONSTRAINT chk_weekly_reports_mood CHECK (mood BETWEEN 1 AND 5),
ADD CONSTRAINT chk_weekly_reports_revision_count CHECK (revision_count >= 0);

-- 5. 提出時のデータ自動設定用のトリガー作成
DELIMITER //
CREATE TRIGGER tr_weekly_reports_submission 
    BEFORE UPDATE ON weekly_reports
    FOR EACH ROW
BEGIN
    -- ステータスが submitted に変更された場合
    IF OLD.status != 'submitted' AND NEW.status = 'submitted' THEN
        -- 提出日時の設定
        IF NEW.submitted_at IS NULL THEN
            SET NEW.submitted_at = NOW();
        END IF;
        
        -- 遅延提出チェック
        IF NEW.submission_deadline IS NOT NULL AND DATE(NEW.submitted_at) > NEW.submission_deadline THEN
            SET NEW.is_late_submission = TRUE;
        END IF;
        
        -- 所属部署情報を提出時点の情報で固定
        IF NEW.department_id IS NULL THEN
            SET NEW.department_id = (SELECT u.department_id FROM users u WHERE u.id = NEW.user_id);
            SET NEW.department_name = (SELECT d.name FROM users u JOIN departments d ON u.department_id = d.id WHERE u.id = NEW.user_id);
            SET NEW.manager_id = (SELECT u.manager_id FROM users u WHERE u.id = NEW.user_id);
        END IF;
    END IF;
    
    -- 最終アクセス日時の更新
    SET NEW.last_accessed_at = NOW();
END//
DELIMITER ;

-- 6. 提出期限の自動計算関数
DELIMITER //
CREATE FUNCTION fn_calculate_submission_deadline(week_end_date DATE) 
RETURNS DATE
READS SQL DATA
DETERMINISTIC
BEGIN
    -- 週の終了日（日曜日）の翌日（月曜日）の正午を期限とする
    RETURN DATE_ADD(week_end_date, INTERVAL 1 DAY);
END//
DELIMITER ;

-- 7. 既存データの提出期限設定
UPDATE weekly_reports 
SET submission_deadline = fn_calculate_submission_deadline(end_date)
WHERE submission_deadline IS NULL;