-- プロフィール関連テーブルの作成

-- 1. profilesテーブル
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  bio TEXT,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- コメント
COMMENT ON TABLE profiles IS 'ユーザープロフィール情報';
COMMENT ON COLUMN profiles.user_id IS 'ユーザーID（Cognito Sub）';

-- インデックス
CREATE UNIQUE INDEX idx_profiles_user_id ON profiles (user_id);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. emergency_contactsテーブル
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, is_primary) -- ユーザーごとに主要連絡先は1つのみ
);

-- コメント
COMMENT ON TABLE emergency_contacts IS '緊急連絡先情報';
COMMENT ON COLUMN emergency_contacts.user_id IS 'ユーザーID（Cognito Sub）';
COMMENT ON COLUMN emergency_contacts.is_primary IS '主要連絡先フラグ';

-- インデックス
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts (user_id);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. bank_accountsテーブル
CREATE TABLE IF NOT EXISTS bank_accounts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  branch_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_holder_name VARCHAR(100) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- コメント
COMMENT ON TABLE bank_accounts IS '銀行口座情報';
COMMENT ON COLUMN bank_accounts.user_id IS 'ユーザーID（Cognito Sub）';
COMMENT ON COLUMN bank_accounts.account_type IS '口座種別（普通、当座など）';
COMMENT ON COLUMN bank_accounts.is_primary IS '主要口座フラグ';

-- インデックス
CREATE INDEX idx_bank_accounts_user_id ON bank_accounts (user_id);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. education_historiesテーブル
CREATE TABLE IF NOT EXISTS education_histories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL,
  institution_name VARCHAR(200) NOT NULL,
  degree VARCHAR(100),
  field_of_study VARCHAR(100),
  start_date DATE,
  end_date DATE,
  is_graduated BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- コメント
COMMENT ON TABLE education_histories IS '学歴情報';
COMMENT ON COLUMN education_histories.user_id IS 'ユーザーID（Cognito Sub）';
COMMENT ON COLUMN education_histories.is_graduated IS '卒業フラグ';

-- インデックス
CREATE INDEX idx_education_histories_user_id ON education_histories (user_id);
CREATE INDEX idx_education_histories_end_date ON education_histories (end_date DESC);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_education_histories_updated_at
    BEFORE UPDATE ON education_histories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();