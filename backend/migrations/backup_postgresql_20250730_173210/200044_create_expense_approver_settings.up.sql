-- 経費申請承認者設定テーブル
CREATE TABLE IF NOT EXISTS expense_approver_settings (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    approval_type ENUM('manager', 'executive') NOT NULL COMMENT '承認タイプ',
    approver_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '承認者のユーザーID',
    is_active BOOLEAN DEFAULT true COMMENT '有効フラグ',
    priority INT DEFAULT 1 COMMENT '優先順位（同じ承認タイプ内での順序）',
    created_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '作成者ID',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY uk_approver_type (approval_type, approver_id),
    INDEX idx_approval_type_active (approval_type, is_active, priority),
    INDEX idx_approver_id (approver_id),
    
    CONSTRAINT fk_approver_settings_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_approver_settings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='経費申請承認者設定';

-- 承認者設定履歴テーブル（監査用）
CREATE TABLE IF NOT EXISTS expense_approver_setting_histories (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    setting_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '設定ID',
    approval_type ENUM('manager', 'executive') NOT NULL COMMENT '承認タイプ',
    approver_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '承認者ID',
    action ENUM('create', 'update', 'delete') NOT NULL COMMENT '操作種別',
    changed_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '変更者ID',
    changed_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT '変更日時',
    old_value JSON COMMENT '変更前の値',
    new_value JSON COMMENT '変更後の値',
    
    INDEX idx_setting_histories_setting_id (setting_id),
    INDEX idx_setting_histories_changed_at (changed_at),
    
    CONSTRAINT fk_approver_histories_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='経費申請承認者設定履歴';