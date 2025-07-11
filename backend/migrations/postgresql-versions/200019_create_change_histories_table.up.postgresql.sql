-- change_historiesテーブルの作成（PostgreSQL版）

-- 変更タイプのENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'change_type_enum') THEN
        CREATE TYPE change_type_enum AS ENUM ('create', 'update', 'delete');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS change_histories (
    id CHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    user_id CHAR(36) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id CHAR(36) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type change_type_enum NOT NULL DEFAULT 'update',
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_change_histories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX idx_change_histories_user_id ON change_histories(user_id);
CREATE INDEX idx_change_histories_target ON change_histories(target_type, target_id);
CREATE INDEX idx_change_histories_field_name ON change_histories(field_name);
CREATE INDEX idx_change_histories_change_type ON change_histories(change_type);
CREATE INDEX idx_change_histories_created_at ON change_histories(created_at);

-- コメントの追加
COMMENT ON TABLE change_histories IS '変更履歴テーブル';
COMMENT ON COLUMN change_histories.user_id IS '変更を行ったユーザーID';
COMMENT ON COLUMN change_histories.target_type IS '変更対象の種類(user, engineer, project等)';
COMMENT ON COLUMN change_histories.target_id IS '変更対象のID';
COMMENT ON COLUMN change_histories.field_name IS '変更されたフィールド名';
COMMENT ON COLUMN change_histories.field_label IS 'フィールドの日本語名';
COMMENT ON COLUMN change_histories.old_value IS '変更前の値';
COMMENT ON COLUMN change_histories.new_value IS '変更後の値';
COMMENT ON COLUMN change_histories.change_type IS '変更タイプ';
COMMENT ON COLUMN change_histories.reason IS '変更理由';
COMMENT ON COLUMN change_histories.ip_address IS 'IPアドレス';
COMMENT ON COLUMN change_histories.user_agent IS 'ユーザーエージェント';
COMMENT ON COLUMN change_histories.created_at IS '作成日時';