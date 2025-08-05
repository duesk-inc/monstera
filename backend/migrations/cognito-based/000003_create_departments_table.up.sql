-- 部署テーブルの作成

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  parent_id VARCHAR(36),
  manager_id VARCHAR(255), -- Cognito Sub
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL,
  
  -- 外部キー制約
  CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- コメント
COMMENT ON TABLE departments IS '部署マスタテーブル';
COMMENT ON COLUMN departments.code IS '部署コード';
COMMENT ON COLUMN departments.parent_id IS '親部署ID（階層構造用）';
COMMENT ON COLUMN departments.manager_id IS '部署責任者のユーザーID（Cognito Sub）';
COMMENT ON COLUMN departments.sort_order IS '表示順';
COMMENT ON COLUMN departments.is_active IS '有効フラグ';

-- インデックス
CREATE INDEX idx_departments_code ON departments(code);
CREATE INDEX idx_departments_parent_id ON departments(parent_id);
CREATE INDEX idx_departments_manager_id ON departments(manager_id);
CREATE INDEX idx_departments_is_active ON departments(is_active);
CREATE INDEX idx_departments_deleted_at ON departments(deleted_at);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();