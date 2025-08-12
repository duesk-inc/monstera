-- エンジニアステータスのENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engineer_status_enum') THEN
        CREATE TYPE engineer_status_enum AS ENUM ('active', 'standby', 'resigned', 'long_leave');
    END IF;
END $$;

-- Users テーブル作成（全カラム統合版）
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  -- password削除: Cognito認証に完全移行
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  first_name_kana VARCHAR(100),
  last_name_kana VARCHAR(100),
  -- 統合: 200060から
  name VARCHAR(255),
  cognito_sub VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  -- 統合: 200012から
  sei VARCHAR(50),
  mei VARCHAR(50),
  sei_kana VARCHAR(50),
  mei_kana VARCHAR(50),
  employee_number VARCHAR(6) UNIQUE,
  department VARCHAR(100),
  position VARCHAR(100),
  hire_date DATE,
  education VARCHAR(200),
  engineer_status engineer_status_enum DEFAULT 'active',
  -- 統合: 200004から
  department_id VARCHAR(36),
  manager_id VARCHAR(36),
  -- 既存カラム
  gender VARCHAR(10),
  birthdate DATE,
  address TEXT,
  phone_number VARCHAR(20),
  role SMALLINT NOT NULL DEFAULT 4,
  default_role SMALLINT NULL,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_reason TEXT,
  last_follow_up_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL
);

-- PostgreSQL用のコメント設定
COMMENT ON COLUMN users.role IS '1:super_admin, 2:admin, 3:manager, 4:engineer';
COMMENT ON COLUMN users.default_role IS 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:engineer）';
COMMENT ON COLUMN users.follow_up_required IS 'フォローアップ必要フラグ';
COMMENT ON COLUMN users.follow_up_reason IS 'フォローアップ理由';
COMMENT ON COLUMN users.last_follow_up_date IS '最終フォローアップ日';
COMMENT ON COLUMN users.sei IS '姓';
COMMENT ON COLUMN users.mei IS '名';
COMMENT ON COLUMN users.sei_kana IS 'セイ';
COMMENT ON COLUMN users.mei_kana IS 'メイ';
COMMENT ON COLUMN users.employee_number IS '社員番号';
COMMENT ON COLUMN users.department IS '所属部署';
COMMENT ON COLUMN users.position IS '役職';
COMMENT ON COLUMN users.hire_date IS '入社日';
COMMENT ON COLUMN users.education IS '最終学歴';
COMMENT ON COLUMN users.phone_number IS '電話番号';
COMMENT ON COLUMN users.engineer_status IS 'エンジニアステータス';
COMMENT ON COLUMN users.department_id IS '所属部署ID';
COMMENT ON COLUMN users.manager_id IS '上司のユーザーID';
COMMENT ON COLUMN users.cognito_sub IS 'AWS Cognito サブジェクトID';
COMMENT ON COLUMN users.status IS 'ユーザーステータス';
COMMENT ON COLUMN users.name IS '氏名（Cognito連携用）';

-- インデックスの作成
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_default_role ON users (default_role);
CREATE INDEX idx_users_follow_up_required ON users (follow_up_required);
CREATE INDEX idx_users_last_follow_up_date ON users (last_follow_up_date);
CREATE INDEX idx_users_employee_number ON users(employee_number);
CREATE INDEX idx_users_engineer_status ON users(engineer_status);
CREATE INDEX idx_users_sei_mei ON users(sei, mei);
CREATE INDEX idx_users_sei_kana_mei_kana ON users(sei_kana, mei_kana);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_cognito_sub ON users(cognito_sub);
CREATE INDEX idx_users_status ON users(status);

-- Trigger for automatic timestamp updates
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();