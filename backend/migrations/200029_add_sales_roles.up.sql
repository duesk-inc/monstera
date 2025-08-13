-- 営業関連ロールの追加（PostgreSQL版）
-- 既存: 1:super_admin, 2:admin, 3:manager, 4:engineer 
-- 追加: 5:sales_manager, 6:sales_rep

-- usersテーブルのroleカラムのコメントを更新
COMMENT ON COLUMN users.role IS '1:super_admin, 2:admin, 3:manager, 4:engineer, 5:sales_manager, 6:sales_rep';

-- default_roleカラムのコメントも更新
COMMENT ON COLUMN users.default_role IS 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:engineer, 5:sales_manager, 6:sales_rep）';

-- 営業ロールタイプのENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_role_type_enum') THEN
        CREATE TYPE sales_role_type_enum AS ENUM ('sales_manager', 'sales_rep');
    END IF;
END $$;

-- アクセススコープのENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_scope_enum') THEN
        CREATE TYPE access_scope_enum AS ENUM ('all', 'owned', 'team');
    END IF;
END $$;

-- 営業ロール権限定義テーブル
CREATE TABLE IF NOT EXISTS sales_role_permissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    role_type sales_role_type_enum NOT NULL,
    resource VARCHAR(100) NOT NULL, -- リソース名（proposals, interviews等）
    action VARCHAR(50) NOT NULL, -- アクション（create, read, update, delete等）
    scope access_scope_enum DEFAULT 'owned', -- アクセス範囲
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    
    CONSTRAINT uk_role_resource_action UNIQUE (role_type, resource, action)
);

-- インデックス
CREATE INDEX idx_role_permissions_role ON sales_role_permissions(role_type);

-- コメント
COMMENT ON TABLE sales_role_permissions IS '営業ロール権限定義テーブル';
COMMENT ON COLUMN sales_role_permissions.resource IS 'リソース名（proposals, interviews等）';
COMMENT ON COLUMN sales_role_permissions.action IS 'アクション（create, read, update, delete等）';
COMMENT ON COLUMN sales_role_permissions.scope IS 'アクセス範囲';

-- sales_manager の権限設定
INSERT INTO sales_role_permissions (role_type, resource, action, scope) VALUES
-- 提案管理（全て）
('sales_manager', 'proposals', 'create', 'all'),
('sales_manager', 'proposals', 'read', 'all'),
('sales_manager', 'proposals', 'update', 'all'),
('sales_manager', 'proposals', 'delete', 'all'),
-- 面談管理（全て）
('sales_manager', 'interviews', 'create', 'all'),
('sales_manager', 'interviews', 'read', 'all'),
('sales_manager', 'interviews', 'update', 'all'),
('sales_manager', 'interviews', 'delete', 'all'),
-- 延長確認（全て）
('sales_manager', 'contract_extensions', 'create', 'all'),
('sales_manager', 'contract_extensions', 'read', 'all'),
('sales_manager', 'contract_extensions', 'update', 'all'),
('sales_manager', 'contract_extensions', 'delete', 'all'),
-- 営業対象者（全て）
('sales_manager', 'sales_targets', 'read', 'all'),
-- メール送信（承認・実行）
('sales_manager', 'email_campaigns', 'create', 'all'),
('sales_manager', 'email_campaigns', 'read', 'all'),
('sales_manager', 'email_campaigns', 'update', 'all'),
('sales_manager', 'email_campaigns', 'delete', 'all'),
('sales_manager', 'email_campaigns', 'send', 'all'),
-- 設定変更
('sales_manager', 'sales_settings', 'read', 'all'),
('sales_manager', 'sales_settings', 'update', 'all');

-- sales_rep の権限設定
INSERT INTO sales_role_permissions (role_type, resource, action, scope) VALUES
-- 提案管理（自分の担当分のみ）
('sales_rep', 'proposals', 'create', 'owned'),
('sales_rep', 'proposals', 'read', 'all'), -- 他の人の提案も参照可能
('sales_rep', 'proposals', 'update', 'owned'),
('sales_rep', 'proposals', 'delete', 'owned'),
-- 面談管理（自分の担当分のみ）
('sales_rep', 'interviews', 'create', 'owned'),
('sales_rep', 'interviews', 'read', 'all'),
('sales_rep', 'interviews', 'update', 'owned'),
('sales_rep', 'interviews', 'delete', 'owned'),
-- 延長確認（閲覧のみ）
('sales_rep', 'contract_extensions', 'read', 'all'),
-- 営業対象者（閲覧のみ）
('sales_rep', 'sales_targets', 'read', 'all'),
-- メール送信（申請のみ）
('sales_rep', 'email_campaigns', 'create', 'owned'),
('sales_rep', 'email_campaigns', 'read', 'owned'),
('sales_rep', 'email_campaigns', 'update', 'owned'),
('sales_rep', 'email_campaigns', 'delete', 'owned');

-- 営業チーム管理テーブル（将来の拡張用）
CREATE TABLE IF NOT EXISTS sales_teams (
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    team_name VARCHAR(100) NOT NULL,
    manager_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP NULL,
    
    CONSTRAINT fk_sales_teams_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- インデックス
CREATE INDEX idx_sales_teams_manager ON sales_teams(manager_id);

-- 営業チームメンバーテーブル
CREATE TABLE IF NOT EXISTS sales_team_members (
    team_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    PRIMARY KEY (team_id, user_id),
    
    CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES sales_teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_team_members_user ON sales_team_members(user_id);

-- トリガー関数が存在しない場合は作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates

-- Trigger for sales_role_permissions table
CREATE TRIGGER update_sales_role_permissions_updated_at
    BEFORE UPDATE ON sales_role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sales_teams table
CREATE TRIGGER update_sales_teams_updated_at
    BEFORE UPDATE ON sales_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();