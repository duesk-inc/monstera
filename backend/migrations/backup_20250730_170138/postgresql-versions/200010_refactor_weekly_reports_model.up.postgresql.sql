-- 週報テーブルのリファクタリング
-- P1-T2: 既存週報テーブルのリファクタリング

-- 1. 新しいカラムの追加
ALTER TABLE weekly_reports
    ADD COLUMN IF NOT EXISTS department_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS department_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS manager_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS submission_deadline DATE,
    ADD COLUMN IF NOT EXISTS is_late_submission BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS revision_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- コメントの追加
COMMENT ON COLUMN weekly_reports.department_id IS '所属部署ID（提出時点）';
COMMENT ON COLUMN weekly_reports.department_name IS '所属部署名（提出時点）';
COMMENT ON COLUMN weekly_reports.manager_id IS '直属上司ID（提出時点）';
COMMENT ON COLUMN weekly_reports.submission_deadline IS '提出期限';
COMMENT ON COLUMN weekly_reports.is_late_submission IS '遅延提出フラグ';
COMMENT ON COLUMN weekly_reports.revision_count IS '修正回数';
COMMENT ON COLUMN weekly_reports.last_accessed_at IS '最終アクセス日時';
COMMENT ON COLUMN weekly_reports.metadata IS 'メタデータ（拡張用）';

-- 2. インデックスの追加（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_weekly_reports_department ON weekly_reports(department_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_manager ON weekly_reports(manager_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_deadline ON weekly_reports(submission_deadline);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_late_submission ON weekly_reports(is_late_submission, submission_deadline);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_last_accessed ON weekly_reports(last_accessed_at);

-- 3. 外部キー制約の追加（データ整合性確保）
-- departments テーブルが存在する場合のみ追加
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        ALTER TABLE weekly_reports
            ADD CONSTRAINT fk_weekly_reports_department 
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE weekly_reports
    ADD CONSTRAINT fk_weekly_reports_manager 
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. チェック制約の追加（データ品質確保）
ALTER TABLE weekly_reports
    ADD CONSTRAINT chk_weekly_reports_dates CHECK (end_date >= start_date),
    ADD CONSTRAINT chk_weekly_reports_work_hours CHECK (total_work_hours >= 0),
    ADD CONSTRAINT chk_weekly_reports_client_hours CHECK (client_total_work_hours >= 0),
    ADD CONSTRAINT chk_weekly_reports_mood CHECK (mood BETWEEN 1 AND 5),
    ADD CONSTRAINT chk_weekly_reports_revision_count CHECK (revision_count >= 0);

-- 5. 提出時のデータ自動設定用のトリガー関数作成
CREATE OR REPLACE FUNCTION update_weekly_reports_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- ステータスが submitted に変更された場合
    IF OLD.status != 'submitted' AND NEW.status = 'submitted' THEN
        -- 提出日時の設定
        IF NEW.submitted_at IS NULL THEN
            NEW.submitted_at := CURRENT_TIMESTAMP;
        END IF;

        -- 遅延提出チェック
        IF NEW.submission_deadline IS NOT NULL AND DATE(NEW.submitted_at) > NEW.submission_deadline THEN
            NEW.is_late_submission := TRUE;
        END IF;

        -- 所属部署情報を提出時点の情報で固定
        IF NEW.department_id IS NULL THEN
            -- departments テーブルが存在する場合のみ実行
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
                SELECT u.department_id, d.name, u.manager_id
                INTO NEW.department_id, NEW.department_name, NEW.manager_id
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.id = NEW.user_id;
            ELSE
                -- departments テーブルがない場合は manager_id のみ設定
                SELECT manager_id INTO NEW.manager_id
                FROM users
                WHERE id = NEW.user_id;
            END IF;
        END IF;
    END IF;

    -- 最終アクセス日時の更新
    NEW.last_accessed_at := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS tr_weekly_reports_submission ON weekly_reports;
CREATE TRIGGER tr_weekly_reports_submission
    BEFORE UPDATE ON weekly_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_weekly_reports_submission();

-- 6. 提出期限の自動計算関数
CREATE OR REPLACE FUNCTION fn_calculate_submission_deadline(week_end_date DATE)
RETURNS DATE AS $$
BEGIN
    -- 週の終了日（日曜日）の翌日（月曜日）を期限とする
    RETURN week_end_date + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. 既存データの提出期限設定
UPDATE weekly_reports
SET submission_deadline = fn_calculate_submission_deadline(end_date)
WHERE submission_deadline IS NULL;