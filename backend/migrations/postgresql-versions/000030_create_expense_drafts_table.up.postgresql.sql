-- 経費申請下書きテーブルの作成
CREATE TABLE IF NOT EXISTS expense_drafts (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    data JSON NOT NULL, -- 下書きデータ（JSON形式）
    saved_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 保存日時
    expires_at TIMESTAMP NOT NULL, -- 有効期限
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_expense_drafts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX idx_expense_drafts_user_id ON expense_drafts(user_id);
CREATE INDEX idx_expense_drafts_expires_at ON expense_drafts(expires_at);
CREATE INDEX idx_expense_drafts_deleted_at ON expense_drafts(deleted_at);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE expense_drafts IS '経費申請下書きテーブル';
COMMENT ON COLUMN expense_drafts.data IS '下書きデータ（JSON形式）';
COMMENT ON COLUMN expense_drafts.saved_at IS '保存日時';
COMMENT ON COLUMN expense_drafts.expires_at IS '有効期限';

-- 有効期限切れの下書きを自動削除する関数（オプション）
-- 本番環境では別途バッチ処理で実装することを推奨
CREATE OR REPLACE FUNCTION delete_expired_expense_drafts()
RETURNS void AS $$
BEGIN
    DELETE FROM expense_drafts 
    WHERE expires_at < NOW() 
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 定期的に実行する場合は、pg_cronなどの拡張機能を使用してスケジューリング


-- Triggers for automatic timestamp updates

-- Trigger for expense_drafts table
CREATE OR REPLACE TRIGGER update_expense_drafts_updated_at
    BEFORE UPDATE ON expense_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
