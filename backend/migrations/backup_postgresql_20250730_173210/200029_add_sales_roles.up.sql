-- 営業関連ロールの追加
-- 既存: 1:super_admin, 2:admin, 3:manager, 4:employee
-- 追加: 5:sales_manager, 6:sales_rep

-- usersテーブルのroleカラムのコメントを更新
ALTER TABLE users 
MODIFY COLUMN role TINYINT NOT NULL DEFAULT 4 
COMMENT '1:super_admin, 2:admin, 3:manager, 4:employee, 5:sales_manager, 6:sales_rep';

-- default_roleカラムのコメントも更新
ALTER TABLE users 
MODIFY COLUMN default_role TINYINT NULL 
COMMENT 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:employee, 5:sales_manager, 6:sales_rep）';

-- 営業ロール権限定義テーブル
CREATE TABLE IF NOT EXISTS sales_role_permissions (
    id VARCHAR(36) PRIMARY KEY,
    role_type ENUM('sales_manager', 'sales_rep') NOT NULL,
    resource VARCHAR(100) NOT NULL COMMENT 'リソース名（proposals, interviews等）',
    action VARCHAR(50) NOT NULL COMMENT 'アクション（create, read, update, delete等）',
    scope ENUM('all', 'owned', 'team') DEFAULT 'owned' COMMENT 'アクセス範囲',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_role_resource_action (role_type, resource, action),
    INDEX idx_role_permissions_role (role_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- sales_manager の権限設定
INSERT INTO sales_role_permissions (id, role_type, resource, action, scope) VALUES
-- 提案管理（全て）
(UUID(), 'sales_manager', 'proposals', 'create', 'all'),
(UUID(), 'sales_manager', 'proposals', 'read', 'all'),
(UUID(), 'sales_manager', 'proposals', 'update', 'all'),
(UUID(), 'sales_manager', 'proposals', 'delete', 'all'),
-- 面談管理（全て）
(UUID(), 'sales_manager', 'interviews', 'create', 'all'),
(UUID(), 'sales_manager', 'interviews', 'read', 'all'),
(UUID(), 'sales_manager', 'interviews', 'update', 'all'),
(UUID(), 'sales_manager', 'interviews', 'delete', 'all'),
-- 延長確認（全て）
(UUID(), 'sales_manager', 'contract_extensions', 'create', 'all'),
(UUID(), 'sales_manager', 'contract_extensions', 'read', 'all'),
(UUID(), 'sales_manager', 'contract_extensions', 'update', 'all'),
(UUID(), 'sales_manager', 'contract_extensions', 'delete', 'all'),
-- 営業対象者（全て）
(UUID(), 'sales_manager', 'sales_targets', 'read', 'all'),
-- メール送信（承認・実行）
(UUID(), 'sales_manager', 'email_campaigns', 'create', 'all'),
(UUID(), 'sales_manager', 'email_campaigns', 'read', 'all'),
(UUID(), 'sales_manager', 'email_campaigns', 'update', 'all'),
(UUID(), 'sales_manager', 'email_campaigns', 'delete', 'all'),
(UUID(), 'sales_manager', 'email_campaigns', 'send', 'all'),
-- 設定変更
(UUID(), 'sales_manager', 'sales_settings', 'read', 'all'),
(UUID(), 'sales_manager', 'sales_settings', 'update', 'all');

-- sales_rep の権限設定
INSERT INTO sales_role_permissions (id, role_type, resource, action, scope) VALUES
-- 提案管理（自分の担当分のみ）
(UUID(), 'sales_rep', 'proposals', 'create', 'owned'),
(UUID(), 'sales_rep', 'proposals', 'read', 'all'), -- 他の人の提案も参照可能
(UUID(), 'sales_rep', 'proposals', 'update', 'owned'),
(UUID(), 'sales_rep', 'proposals', 'delete', 'owned'),
-- 面談管理（自分の担当分のみ）
(UUID(), 'sales_rep', 'interviews', 'create', 'owned'),
(UUID(), 'sales_rep', 'interviews', 'read', 'all'),
(UUID(), 'sales_rep', 'interviews', 'update', 'owned'),
(UUID(), 'sales_rep', 'interviews', 'delete', 'owned'),
-- 延長確認（閲覧のみ）
(UUID(), 'sales_rep', 'contract_extensions', 'read', 'all'),
-- 営業対象者（閲覧のみ）
(UUID(), 'sales_rep', 'sales_targets', 'read', 'all'),
-- メール送信（申請のみ）
(UUID(), 'sales_rep', 'email_campaigns', 'create', 'owned'),
(UUID(), 'sales_rep', 'email_campaigns', 'read', 'owned'),
(UUID(), 'sales_rep', 'email_campaigns', 'update', 'owned'),
(UUID(), 'sales_rep', 'email_campaigns', 'delete', 'owned');

-- 営業チーム管理テーブル（将来の拡張用）
CREATE TABLE IF NOT EXISTS sales_teams (
    id VARCHAR(36) PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    manager_id VARCHAR(36) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    CONSTRAINT fk_sales_teams_manager FOREIGN KEY (manager_id) 
        REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_sales_teams_manager (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 営業チームメンバーテーブル
CREATE TABLE IF NOT EXISTS sales_team_members (
    team_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (team_id, user_id),
    
    CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) 
        REFERENCES sales_teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_team_members_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;