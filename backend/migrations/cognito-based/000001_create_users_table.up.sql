-- Cognito Sub を主キーとしたUsersテーブル作成

CREATE TABLE IF NOT EXISTS users (
  -- 主キー: Cognito Sub（例: us-east-1:12345678-1234-1234-1234-123456789012）
  id VARCHAR(255) PRIMARY KEY,
  
  -- 基本情報
  email VARCHAR(255) UNIQUE NOT NULL,
  -- passwordカラムは削除（Cognito認証のみ）
  
  -- 氏名情報
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  first_name_kana VARCHAR(100),
  last_name_kana VARCHAR(100),
  name VARCHAR(255), -- Cognito連携用フルネーム
  
  -- 日本語氏名（レガシー互換）
  sei VARCHAR(50),
  mei VARCHAR(50),
  sei_kana VARCHAR(50),
  mei_kana VARCHAR(50),
  
  -- 従業員情報
  employee_number VARCHAR(6) UNIQUE,
  department VARCHAR(100),
  position VARCHAR(100),
  hire_date DATE,
  education VARCHAR(200),
  engineer_status engineer_status DEFAULT 'active',
  
  -- 組織情報
  department_id VARCHAR(255), -- 部署ID（将来的に部署テーブルもCognito Sub対応）
  manager_id VARCHAR(255), -- 上司のユーザーID（Cognito Sub）
  
  -- 個人情報
  gender VARCHAR(10),
  birthdate DATE,
  address TEXT,
  phone_number VARCHAR(20),
  
  -- 権限・ロール情報
  role user_role NOT NULL DEFAULT 'employee',
  default_role user_role,
  
  -- フォローアップ情報
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_reason TEXT,
  last_follow_up_date DATE,
  
  -- ステータス情報
  status VARCHAR(20) DEFAULT 'active',
  active BOOLEAN DEFAULT true,
  
  -- タイムスタンプ
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL
);

-- コメント設定
COMMENT ON TABLE users IS 'Cognito認証ベースのユーザーマスタテーブル';
COMMENT ON COLUMN users.id IS 'Cognito Sub（主キー）';
COMMENT ON COLUMN users.email IS 'メールアドレス（Cognitoと同期）';
COMMENT ON COLUMN users.name IS '氏名（Cognito連携用）';
COMMENT ON COLUMN users.role IS 'ユーザーロール';
COMMENT ON COLUMN users.default_role IS 'デフォルトロール';
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
COMMENT ON COLUMN users.manager_id IS '上司のユーザーID（Cognito Sub）';
COMMENT ON COLUMN users.status IS 'ユーザーステータス';

-- インデックスの作成
CREATE INDEX idx_users_email ON users (email);
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
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();