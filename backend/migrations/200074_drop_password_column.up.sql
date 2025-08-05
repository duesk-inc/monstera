-- Drop password column from users table
-- This migration removes the password column as authentication is now handled entirely by AWS Cognito

ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Add comment to document the change
COMMENT ON TABLE users IS 'ユーザーマスタテーブル（Cognito認証のみ、パスワードは保存しない）';