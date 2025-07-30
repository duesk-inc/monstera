-- 楽観的ロック用のversionカラムを追加
ALTER TABLE expenses 
    ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL;

-- コメントの追加
COMMENT ON COLUMN expenses.version IS '楽観的ロック用バージョン番号';

-- 既存のレコードのversionを1に設定（念のため）
UPDATE expenses SET version = 1 WHERE version IS NULL;