-- セッション管理テーブルの作成

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL, -- Cognito Sub
  token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  last_activity TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- コメント
COMMENT ON TABLE sessions IS 'ユーザーセッション管理テーブル';
COMMENT ON COLUMN sessions.user_id IS 'ユーザーID（Cognito Sub）';
COMMENT ON COLUMN sessions.token IS 'セッショントークン';
COMMENT ON COLUMN sessions.refresh_token IS 'リフレッシュトークン';
COMMENT ON COLUMN sessions.expires_at IS 'セッション有効期限';
COMMENT ON COLUMN sessions.user_agent IS 'ユーザーエージェント情報';
COMMENT ON COLUMN sessions.ip_address IS 'IPアドレス';
COMMENT ON COLUMN sessions.last_activity IS '最終アクティビティ日時';

-- インデックス
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();