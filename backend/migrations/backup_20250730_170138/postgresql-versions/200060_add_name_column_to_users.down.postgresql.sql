-- Drop indexes
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_users_cognito_sub;

-- Drop columns
ALTER TABLE users DROP COLUMN IF EXISTS status;
ALTER TABLE users DROP COLUMN IF EXISTS cognito_sub;
ALTER TABLE users DROP COLUMN IF EXISTS name;