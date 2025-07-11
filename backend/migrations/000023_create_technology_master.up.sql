-- 技術マスタテーブル
CREATE TABLE IF NOT EXISTS technology_master (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    category ENUM('programming_languages', 'servers_databases', 'tools') NOT NULL COMMENT '技術カテゴリ',
    name VARCHAR(100) NOT NULL COMMENT '技術名',
    display_name VARCHAR(100) COMMENT '表示名（正式名称）',
    aliases TEXT COMMENT 'エイリアス（カンマ区切り）',
    description TEXT COMMENT '技術の説明',
    usage_count INT DEFAULT 0 COMMENT '使用回数',
    is_active BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
    sort_order INT DEFAULT 0 COMMENT '表示順序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_category (category),
    INDEX idx_name (name),
    INDEX idx_usage_count (usage_count DESC),
    INDEX idx_sort_order (sort_order),
    INDEX idx_is_active (is_active),
    UNIQUE KEY uk_category_name (category, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技術マスタ';