-- work_historiesテーブルの拡張
-- duration_monthsカラムを追加（通常のカラムとして追加し、トリガーで自動計算）
ALTER TABLE work_histories ADD COLUMN duration_months INT;

-- 既存データのduration_monthsを計算して更新
UPDATE work_histories SET duration_months = 
    CASE
        WHEN end_date IS NULL THEN NULL  -- 進行中のプロジェクトはNULL
        ELSE
            EXTRACT(YEAR FROM age(end_date, start_date)) * 12 + 
            EXTRACT(MONTH FROM age(end_date, start_date))
    END;

-- duration_monthsを自動計算するトリガー関数
CREATE OR REPLACE FUNCTION calculate_duration_months()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_date IS NOT NULL THEN
        NEW.duration_months := EXTRACT(YEAR FROM age(NEW.end_date, NEW.start_date)) * 12 + 
                               EXTRACT(MONTH FROM age(NEW.end_date, NEW.start_date));
    ELSE
        NEW.duration_months := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER trigger_calculate_duration_months
    BEFORE INSERT OR UPDATE OF start_date, end_date ON work_histories
    FOR EACH ROW
    EXECUTE FUNCTION calculate_duration_months();

-- PostgreSQL用のコメント設定
COMMENT ON COLUMN work_histories.duration_months IS '期間（月数）';

-- インデックスを追加
-- start_dateのインデックス
CREATE INDEX idx_work_histories_start_date ON work_histories(start_date);

-- duration_monthsのインデックス
CREATE INDEX idx_work_histories_duration_months ON work_histories(duration_months);

-- 複合インデックス（期間でのソートや検索用）
CREATE INDEX idx_work_histories_start_duration ON work_histories(start_date, duration_months);

-- user_idとstart_dateの複合インデックス（ユーザーごとの職歴を時系列で取得）
CREATE INDEX idx_work_histories_user_start ON work_histories(user_id, start_date DESC);
