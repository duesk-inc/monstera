-- プロフィール関連テーブルの削除

-- トリガーの削除
DROP TRIGGER IF EXISTS update_education_histories_updated_at ON education_histories;
DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON emergency_contacts;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- インデックスの削除（テーブル削除時に自動的に削除されるが明示的に記載）
DROP INDEX IF EXISTS idx_education_histories_end_date;
DROP INDEX IF EXISTS idx_education_histories_user_id;
DROP INDEX IF EXISTS idx_bank_accounts_user_id;
DROP INDEX IF EXISTS idx_emergency_contacts_user_id;
DROP INDEX IF EXISTS idx_profiles_user_id;

-- テーブルの削除
DROP TABLE IF EXISTS education_histories CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS emergency_contacts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;