-- work_historiesテーブルの拡張
-- duration_monthsカラムを追加（生成カラムとして期間を月単位で計算）

-- まず通常のカラムとして追加
ALTER TABLE work_histories 
ADD COLUMN duration_months INT GENERATED ALWAYS AS (
    CASE 
        WHEN end_date IS NULL THEN 
            TIMESTAMPDIFF(MONTH, start_date, CURRENT_DATE())
        ELSE 
            TIMESTAMPDIFF(MONTH, start_date, end_date)
    END
) STORED COMMENT '期間（月数）';

-- インデックスを追加
-- start_dateのインデックス
CREATE INDEX idx_work_histories_start_date ON work_histories(start_date);

-- duration_monthsのインデックス
CREATE INDEX idx_work_histories_duration_months ON work_histories(duration_months);

-- 複合インデックス（期間でのソートや検索用）
CREATE INDEX idx_work_histories_start_duration ON work_histories(start_date, duration_months);

-- user_idとstart_dateの複合インデックス（ユーザーごとの職歴を時系列で取得）
CREATE INDEX idx_work_histories_user_start ON work_histories(user_id, start_date DESC);