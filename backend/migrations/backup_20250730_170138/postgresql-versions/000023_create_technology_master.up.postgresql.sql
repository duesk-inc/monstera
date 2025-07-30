-- Create technology_category enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'technology_category') THEN
        CREATE TYPE technology_category AS ENUM ('programming_languages', 'servers_databases', 'tools');
    END IF;
END $$;

-- 技術マスタテーブル
CREATE TABLE IF NOT EXISTS technology_master (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    category technology_category NOT NULL, -- 技術カテゴリ
    name VARCHAR(100) NOT NULL, -- 技術名
    display_name VARCHAR(100), -- 表示名（正式名称）
    aliases TEXT, -- エイリアス（カンマ区切り）
    description TEXT, -- 技術の説明
    usage_count INT DEFAULT 0, -- 使用回数
    is_active BOOLEAN DEFAULT TRUE, -- 有効フラグ
    sort_order INT DEFAULT 0, -- 表示順序
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    CONSTRAINT uk_category_name UNIQUE (category, name)
);

-- インデックス
CREATE INDEX idx_category ON technology_master(category);
CREATE INDEX idx_name ON technology_master(name);
CREATE INDEX idx_usage_count ON technology_master(usage_count DESC);
CREATE INDEX idx_sort_order ON technology_master(sort_order);
CREATE INDEX idx_is_active ON technology_master(is_active);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE technology_master IS '技術マスタ';
COMMENT ON COLUMN technology_master.category IS '技術カテゴリ';
COMMENT ON COLUMN technology_master.name IS '技術名';
COMMENT ON COLUMN technology_master.display_name IS '表示名（正式名称）';
COMMENT ON COLUMN technology_master.aliases IS 'エイリアス（カンマ区切り）';
COMMENT ON COLUMN technology_master.description IS '技術の説明';
COMMENT ON COLUMN technology_master.usage_count IS '使用回数';
COMMENT ON COLUMN technology_master.is_active IS '有効フラグ';
COMMENT ON COLUMN technology_master.sort_order IS '表示順序';


-- Triggers for automatic timestamp updates

-- Trigger for technology_master table
CREATE OR REPLACE TRIGGER update_technology_master_updated_at
    BEFORE UPDATE ON technology_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
