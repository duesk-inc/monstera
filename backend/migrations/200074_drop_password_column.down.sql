-- Rollback: Add password column back to users table
-- Note: This is for rollback purposes only. New passwords will not be recoverable.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT 'COGNITO_MANAGED';

-- Update comment
COMMENT ON TABLE users IS 'ユーザーマスタテーブル';
COMMENT ON COLUMN users.password IS '（廃止予定）パスワードハッシュ - Cognito移行のため使用されません';