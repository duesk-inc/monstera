-- 延長確認管理テーブル
CREATE TABLE contract_extensions (
    id VARCHAR(36) PRIMARY KEY,
    engineer_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36), -- 現在参画中の案件
    
    -- 契約情報
    current_contract_end_date DATE NOT NULL,
    extension_check_date DATE NOT NULL, -- 確認実施日
    
    -- 確認状況
    status ENUM(
        'pending',    -- 未確認
        'requested',  -- 継続依頼
        'approved',   -- 承諾済
        'leaving'     -- 退場
    ) NOT NULL DEFAULT 'pending',
    
    -- 確認内容
    extension_request_date DATE,
    client_response_date DATE,
    extension_period_months INT,
    new_contract_end_date DATE,
    
    -- 備考
    notes TEXT,
    
    -- 共通カラム
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    
    -- 外部キー制約
    CONSTRAINT fk_contract_extensions_engineer FOREIGN KEY (engineer_id) 
        REFERENCES users(id) ON DELETE RESTRICT,
    
    -- インデックス
    INDEX idx_extensions_engineer (engineer_id),
    INDEX idx_extensions_status (status),
    INDEX idx_extensions_check_date (extension_check_date),
    INDEX idx_extensions_contract_end (current_contract_end_date),
    INDEX idx_extensions_deleted (deleted_at),
    
    -- 複合インデックス（効率的な抽出用）
    INDEX idx_extensions_check_composite (current_contract_end_date, status)
        WHERE deleted_at IS NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 契約延長設定テーブル（グローバル設定）
CREATE TABLE contract_extension_settings (
    id VARCHAR(36) PRIMARY KEY,
    check_before_days INT NOT NULL DEFAULT 30, -- 契約終了何日前から確認対象とするか
    reminder_enabled BOOLEAN DEFAULT TRUE,
    reminder_days JSON, -- リマインダー送信日数の配列 [7, 3, 1]
    auto_notification BOOLEAN DEFAULT TRUE,
    notification_channels JSON, -- 通知チャンネル ['email', 'slack']
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- デフォルト設定の挿入
INSERT INTO contract_extension_settings (
    id,
    check_before_days,
    reminder_enabled,
    reminder_days,
    auto_notification,
    notification_channels
) VALUES (
    UUID(),
    30,
    TRUE,
    '[7, 3, 1]',
    TRUE,
    '["email", "slack"]'
);