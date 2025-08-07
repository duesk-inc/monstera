-- 業種マスタテーブル作成
CREATE TABLE IF NOT EXISTS industries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- 業種名
    display_order INT NOT NULL, -- 表示順序
    is_active BOOLEAN NOT NULL DEFAULT true, -- 有効フラグ
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo') -- 更新日時
);
COMMENT ON TABLE industries IS '業種マスタ';
COMMENT ON COLUMN industries.name IS '業種名';
COMMENT ON COLUMN industries.display_order IS '表示順序';
COMMENT ON COLUMN industries.is_active IS '有効フラグ';
COMMENT ON COLUMN industries.created_at IS '作成日時';
COMMENT ON COLUMN industries.updated_at IS '更新日時';

-- 担当工程マスタテーブル作成
CREATE TABLE IF NOT EXISTS processes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- 工程名
    display_order INT NOT NULL, -- 表示順序
    is_active BOOLEAN NOT NULL DEFAULT true, -- 有効フラグ
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo') -- 更新日時
);
COMMENT ON TABLE processes IS '担当工程マスタ';
COMMENT ON COLUMN processes.name IS '工程名';
COMMENT ON COLUMN processes.display_order IS '表示順序';
COMMENT ON COLUMN processes.is_active IS '有効フラグ';
COMMENT ON COLUMN processes.created_at IS '作成日時';
COMMENT ON COLUMN processes.updated_at IS '更新日時';

-- 業種マスタデータ挿入
INSERT INTO industries (id, name, display_order) VALUES 
    (1, 'IT・通信', 1),
    (2, '金融・保険', 2),
    (3, '医療・福祉', 3),
    (4, '製造', 4),
    (5, '小売・流通', 5),
    (6, '公共・官公庁', 6),
    (7, 'その他', 7)
ON CONFLICT (id) DO NOTHING;

-- 担当工程マスタデータ挿入
INSERT INTO processes (id, name, display_order) VALUES
    (1, '要件定義', 1),
    (2, '基本設計', 2),
    (3, '詳細設計', 3),
    (4, '製造・実装', 4),
    (5, 'テスト', 5),
    (6, '保守・運用', 6)
ON CONFLICT (id) DO NOTHING;

-- Profiles テーブル作成
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    education TEXT,
    nearest_station VARCHAR(100),
    can_travel INT NOT NULL DEFAULT 3, -- 出張可否: 1=可能, 2=不可, 3=要相談
    appeal_points TEXT,
    is_temp_saved BOOLEAN NOT NULL DEFAULT false,
    temp_saved_at TIMESTAMP NULL,
    current_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
COMMENT ON COLUMN profiles.can_travel IS '出張可否: 1=可能, 2=不可, 3=要相談';

-- WorkHistories テーブル作成
CREATE TABLE IF NOT EXISTS work_histories (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    industry INT NOT NULL, -- 業種ID
    project_overview TEXT NOT NULL,
    responsibilities TEXT NOT NULL,
    achievements TEXT,
    notes TEXT,
    processes TEXT, -- 担当工程ID（カンマ区切り）
    technologies TEXT NOT NULL,
    team_size INT NOT NULL,
    role VARCHAR(255) NOT NULL,
    duration_months INT,
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (industry) REFERENCES industries(id)
);
COMMENT ON COLUMN work_histories.industry IS '業種ID';
COMMENT ON COLUMN work_histories.processes IS '担当工程ID（カンマ区切り）';

-- 技術カテゴリマスタテーブル作成
CREATE TABLE IF NOT EXISTS technology_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- カテゴリ内部名
    display_name VARCHAR(100) NOT NULL, -- カテゴリ表示名
    sort_order INT NOT NULL, -- 表示順序
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo') -- 更新日時
);
COMMENT ON TABLE technology_categories IS '技術カテゴリマスタ';
COMMENT ON COLUMN technology_categories.name IS 'カテゴリ内部名';
COMMENT ON COLUMN technology_categories.display_name IS 'カテゴリ表示名';
COMMENT ON COLUMN technology_categories.sort_order IS '表示順序';
COMMENT ON COLUMN technology_categories.created_at IS '作成日時';
COMMENT ON COLUMN technology_categories.updated_at IS '更新日時';

-- 職務経歴技術項目テーブル作成
CREATE TABLE IF NOT EXISTS work_history_technologies (
    id VARCHAR(36) PRIMARY KEY,
    work_history_id VARCHAR(36) NOT NULL, -- 職務経歴ID
    category_id VARCHAR(36) NOT NULL, -- 技術カテゴリID
    technology_name VARCHAR(255) NOT NULL, -- 技術名
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    FOREIGN KEY (work_history_id) REFERENCES work_histories(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES technology_categories(id)
);
COMMENT ON TABLE work_history_technologies IS '職務経歴技術項目';
COMMENT ON COLUMN work_history_technologies.work_history_id IS '職務経歴ID';
COMMENT ON COLUMN work_history_technologies.category_id IS '技術カテゴリID';
COMMENT ON COLUMN work_history_technologies.technology_name IS '技術名';
COMMENT ON COLUMN work_history_technologies.created_at IS '作成日時';
COMMENT ON COLUMN work_history_technologies.updated_at IS '更新日時';

-- インデックス作成
CREATE INDEX idx_work_history_technologies_work_history_id ON work_history_technologies(work_history_id);
CREATE INDEX idx_work_history_technologies_category_id ON work_history_technologies(category_id);
CREATE INDEX idx_work_history_technologies_technology_name ON work_history_technologies(technology_name);

-- LanguageSkills テーブル作成
CREATE TABLE IF NOT EXISTS language_skills (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    level INT NOT NULL,
    years_of_experience INT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
COMMENT ON COLUMN language_skills.created_at IS '作成日時';
COMMENT ON COLUMN language_skills.updated_at IS '更新日時';
COMMENT ON COLUMN language_skills.deleted_at IS '削除日時';

-- インデックス作成
CREATE INDEX idx_language_skills_deleted_at ON language_skills(deleted_at);

-- FrameworkSkills テーブル作成
CREATE TABLE IF NOT EXISTS framework_skills (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    level INT NOT NULL,
    years_of_experience INT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
COMMENT ON COLUMN framework_skills.created_at IS '作成日時';
COMMENT ON COLUMN framework_skills.updated_at IS '更新日時';
COMMENT ON COLUMN framework_skills.deleted_at IS '削除日時';

-- インデックス作成
CREATE INDEX idx_framework_skills_deleted_at ON framework_skills(deleted_at);

-- BusinessExperiences テーブル作成
CREATE TABLE IF NOT EXISTS business_experiences (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    experience_detail TEXT NOT NULL,
    years_of_experience INT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
COMMENT ON COLUMN business_experiences.created_at IS '作成日時';
COMMENT ON COLUMN business_experiences.updated_at IS '更新日時';
COMMENT ON COLUMN business_experiences.deleted_at IS '削除日時';

-- インデックス作成
CREATE INDEX idx_business_experiences_deleted_at ON business_experiences(deleted_at);

-- ProfileHistories テーブル作成
CREATE TABLE IF NOT EXISTS profile_histories (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    education TEXT,
    nearest_station VARCHAR(100),
    can_travel INT NOT NULL DEFAULT 3,
    appeal_points TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    FOREIGN KEY (profile_id) REFERENCES profiles(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- WorkHistoryHistories テーブル作成
CREATE TABLE IF NOT EXISTS work_history_histories (
    id VARCHAR(36) PRIMARY KEY,
    history_id VARCHAR(36) NOT NULL,
    profile_history_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    industry VARCHAR(255) NOT NULL,
    project_overview TEXT,
    role VARCHAR(255),
    team_size INT,
    project_processes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    FOREIGN KEY (profile_history_id) REFERENCES profile_histories(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Triggers for automatic timestamp updates

-- Trigger for industries table
CREATE OR REPLACE TRIGGER update_industries_updated_at
    BEFORE UPDATE ON industries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for processes table
CREATE OR REPLACE TRIGGER update_processes_updated_at
    BEFORE UPDATE ON processes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profiles table
CREATE OR REPLACE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for work_histories table
CREATE OR REPLACE TRIGGER update_work_histories_updated_at
    BEFORE UPDATE ON work_histories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for technology_categories table
CREATE OR REPLACE TRIGGER update_technology_categories_updated_at
    BEFORE UPDATE ON technology_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for work_history_technologies table
CREATE OR REPLACE TRIGGER update_work_history_technologies_updated_at
    BEFORE UPDATE ON work_history_technologies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for language_skills table
CREATE OR REPLACE TRIGGER update_language_skills_updated_at
    BEFORE UPDATE ON language_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for framework_skills table
CREATE OR REPLACE TRIGGER update_framework_skills_updated_at
    BEFORE UPDATE ON framework_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for business_experiences table
CREATE OR REPLACE TRIGGER update_business_experiences_updated_at
    BEFORE UPDATE ON business_experiences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profile_histories table
CREATE OR REPLACE TRIGGER update_profile_histories_updated_at
    BEFORE UPDATE ON profile_histories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for work_history_histories table
CREATE OR REPLACE TRIGGER update_work_history_histories_updated_at
    BEFORE UPDATE ON work_history_histories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();