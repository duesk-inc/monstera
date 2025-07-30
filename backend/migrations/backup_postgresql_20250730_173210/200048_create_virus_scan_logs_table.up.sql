-- ウイルススキャンログテーブル
CREATE TABLE IF NOT EXISTS virus_scan_logs (
    id CHAR(36) NOT NULL DEFAULT (UUID()) COMMENT 'スキャンログID',
    file_id CHAR(36) NOT NULL COMMENT 'スキャン対象ファイルID',
    file_name VARCHAR(255) NOT NULL COMMENT 'ファイル名',
    file_size BIGINT NOT NULL COMMENT 'ファイルサイズ（バイト）',
    file_path VARCHAR(500) DEFAULT NULL COMMENT 'ファイルパス',
    scan_status ENUM('clean', 'infected', 'error', 'quarantined') NOT NULL COMMENT 'スキャンステータス',
    virus_name VARCHAR(255) DEFAULT NULL COMMENT '検出されたウイルス名',
    scan_engine VARCHAR(50) NOT NULL COMMENT '使用したスキャンエンジン',
    engine_version VARCHAR(50) DEFAULT NULL COMMENT 'エンジンバージョン',
    scan_duration BIGINT NOT NULL COMMENT 'スキャン時間（ミリ秒）',
    error_message TEXT DEFAULT NULL COMMENT 'エラーメッセージ',
    quarantined_at DATETIME(3) DEFAULT NULL COMMENT '隔離日時',
    user_id CHAR(36) DEFAULT NULL COMMENT 'アップロードユーザーID',
    resource_type VARCHAR(50) DEFAULT NULL COMMENT 'リソースタイプ（expense_receipt等）',
    resource_id CHAR(36) DEFAULT NULL COMMENT 'リソースID',
    deleted_at DATETIME(3) DEFAULT NULL COMMENT '削除日時',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
    PRIMARY KEY (id),
    INDEX idx_file_id (file_id),
    INDEX idx_scan_status (scan_status),
    INDEX idx_virus_name (virus_name),
    INDEX idx_user_id (user_id),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_quarantined_at (quarantined_at),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ウイルススキャンログ';

-- ウイルススキャン設定テーブル
CREATE TABLE IF NOT EXISTS virus_scan_settings (
    id CHAR(36) NOT NULL DEFAULT (UUID()) COMMENT '設定ID',
    scan_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'スキャン有効化フラグ',
    auto_quarantine BOOLEAN NOT NULL DEFAULT TRUE COMMENT '自動隔離有効化フラグ',
    max_file_size BIGINT NOT NULL DEFAULT 104857600 COMMENT '最大スキャンファイルサイズ（バイト）',
    scan_timeout INT NOT NULL DEFAULT 60 COMMENT 'スキャンタイムアウト（秒）',
    quarantine_days INT NOT NULL DEFAULT 30 COMMENT '隔離ファイル保持日数',
    allowed_file_types JSON DEFAULT NULL COMMENT '許可ファイルタイプリスト',
    blocked_file_types JSON DEFAULT NULL COMMENT 'ブロックファイルタイプリスト',
    notification_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '通知有効化フラグ',
    notification_recipients JSON DEFAULT NULL COMMENT '通知先リスト',
    created_by CHAR(36) NOT NULL COMMENT '作成者ID',
    updated_by CHAR(36) DEFAULT NULL COMMENT '更新者ID',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ウイルススキャン設定';

-- 初期設定データの挿入
INSERT INTO virus_scan_settings (
    scan_enabled,
    auto_quarantine,
    max_file_size,
    scan_timeout,
    quarantine_days,
    allowed_file_types,
    blocked_file_types,
    notification_enabled,
    created_by
) VALUES (
    TRUE,
    TRUE,
    104857600, -- 100MB
    60,
    30,
    JSON_ARRAY('jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'),
    JSON_ARRAY('exe', 'bat', 'cmd', 'scr', 'vbs', 'js'),
    TRUE,
    '00000000-0000-0000-0000-000000000000'
);