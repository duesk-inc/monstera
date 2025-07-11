-- E2E Test Seed Data for Monstera
-- This file contains test data for E2E testing
-- All IDs are deterministic UUIDs for reproducibility

-- Clean up existing test data
DELETE FROM users WHERE email IN (
    'engineer_test@duesk.co.jp',
    'sales_test@duesk.co.jp',
    'manager_test@duesk.co.jp'
);

-- Create test users
-- Password for all test users: Test1234! (bcrypt hashed with cost 10)
-- $2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy

-- Engineer user
INSERT INTO users (
    id, email, password, first_name, last_name, first_name_kana, last_name_kana,
    role, active, created_at, updated_at
) VALUES (
    'e2e00001-0000-0000-0000-000000000001',
    'engineer_test@duesk.co.jp',
    '$2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', 'エンジニア', 'テスト', 'エンジニア',
    4, -- employee role
    1, -- active
    NOW(),
    NOW()
);

-- Sales rep user
INSERT INTO users (
    id, email, password, first_name, last_name, first_name_kana, last_name_kana,
    role, active, created_at, updated_at
) VALUES (
    'e2e00001-0000-0000-0000-000000000002',
    'sales_test@duesk.co.jp',
    '$2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', '営業', 'テスト', 'エイギョウ',
    6, -- sales_rep role
    1, -- active
    NOW(),
    NOW()
);

-- Manager user
INSERT INTO users (
    id, email, password, first_name, last_name, first_name_kana, last_name_kana,
    role, active, created_at, updated_at
) VALUES (
    'e2e00001-0000-0000-0000-000000000003',
    'manager_test@duesk.co.jp',
    '$2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', 'マネージャー', 'テスト', 'マネージャー',
    3, -- manager role
    1, -- active
    NOW(),
    NOW()
);

-- Create test clients (if table exists)
INSERT IGNORE INTO clients (
    id, company_name, company_name_kana, address, contact_phone, billing_type,
    created_at, updated_at
) 
SELECT 
    'e2e00002-0000-0000-0000-000000000001',
    'E2Eテスト株式会社',
    'イーツーイーテストカブシキガイシャ',
    '東京都渋谷区テスト1-2-3',
    '03-1234-5678',
    'monthly',
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'clients');

INSERT IGNORE INTO clients (
    id, company_name, company_name_kana, address, contact_phone, billing_type,
    created_at, updated_at
)
SELECT
    'e2e00002-0000-0000-0000-000000000002',
    'テストシステムズ株式会社',
    'テストシステムズカブシキガイシャ',
    '東京都港区テスト4-5-6',
    '03-2345-6789',
    'hourly',
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'clients');

INSERT IGNORE INTO clients (
    id, company_name, company_name_kana, address, contact_phone, billing_type,
    created_at, updated_at
)
SELECT
    'e2e00002-0000-0000-0000-000000000003',
    'テストソリューション株式会社',
    'テストソリューションカブシキガイシャ',
    '東京都千代田区テスト7-8-9',
    '03-3456-7890',
    'fixed',
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'clients');

-- Create test projects (if table exists)
INSERT IGNORE INTO projects (
    id, client_id, project_name, description, status,
    contract_type, monthly_rate, working_hours_min, working_hours_max,
    start_date, end_date, created_at, updated_at
)
SELECT
    'e2e00004-0000-0000-0000-000000000001',
    'e2e00002-0000-0000-0000-000000000001',
    'Webアプリケーション開発案件',
    'ReactとNode.jsを使用したWebアプリケーション開発プロジェクト。フロントエンドとバックエンドの両方の開発を担当。',
    'proposal',
    'ses',
    650000,
    140,
    180,
    DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH),
    DATE_ADD(CURRENT_DATE, INTERVAL 7 MONTH),
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'projects');

INSERT IGNORE INTO projects (
    id, client_id, project_name, description, status,
    contract_type, monthly_rate, working_hours_min, working_hours_max,
    start_date, end_date, created_at, updated_at
)
SELECT
    'e2e00004-0000-0000-0000-000000000002',
    'e2e00002-0000-0000-0000-000000000002',
    'クラウドインフラ構築案件',
    'AWSを使用したクラウドインフラの設計・構築・運用保守。Infrastructure as Codeの実装を含む。',
    'negotiation',
    'contract',
    700000,
    150,
    190,
    DATE_ADD(CURRENT_DATE, INTERVAL 2 MONTH),
    DATE_ADD(CURRENT_DATE, INTERVAL 8 MONTH),
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'projects');

INSERT IGNORE INTO projects (
    id, client_id, project_name, description, status,
    contract_type, monthly_rate, working_hours_min, working_hours_max,
    start_date, end_date, created_at, updated_at
)
SELECT
    'e2e00004-0000-0000-0000-000000000003',
    'e2e00002-0000-0000-0000-000000000003',
    'データ分析基盤構築案件',
    'BigQueryとPythonを使用したデータ分析基盤の構築。ETLパイプラインの設計・実装を含む。',
    'active',
    'dispatch',
    600000,
    160,
    180,
    CURRENT_DATE,
    DATE_ADD(CURRENT_DATE, INTERVAL 6 MONTH),
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'projects');

-- Create proposals table if not exists
CREATE TABLE IF NOT EXISTS proposals (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    project_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    status ENUM('proposed', 'proceed', 'declined') NOT NULL DEFAULT 'proposed',
    responded_at DATETIME(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    CONSTRAINT fk_proposals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_proposals_user_id (user_id),
    INDEX idx_proposals_project_id (project_id),
    INDEX idx_proposals_status (status),
    UNIQUE KEY idx_proposal_user_project (project_id, user_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Clean up existing test proposals
DELETE FROM proposals WHERE id LIKE 'e2e00005%';

-- Create additional projects for proposals
INSERT IGNORE INTO projects (
    id, client_id, project_name, description, status,
    contract_type, monthly_rate, working_hours_min, working_hours_max,
    start_date, end_date, created_at, updated_at
) VALUES
(
    'e2e00004-0000-0000-0000-000000000004',
    'e2e00002-0000-0000-0000-000000000001',
    'モバイルアプリ開発案件',
    'React NativeによるiOS/Androidアプリの開発。APIとの連携実装も含む。',
    'proposal',
    'ses',
    680000,
    140,
    180,
    DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH),
    DATE_ADD(CURRENT_DATE, INTERVAL 5 MONTH),
    NOW(),
    NOW()
),
(
    'e2e00004-0000-0000-0000-000000000005',
    'e2e00002-0000-0000-0000-000000000002',
    'セキュリティ診断・改善案件',
    'Webアプリケーションのセキュリティ診断と改善提案。ペネトレーションテストの実施。',
    'proposal',
    'contract',
    750000,
    160,
    200,
    DATE_ADD(CURRENT_DATE, INTERVAL 2 WEEK),
    DATE_ADD(CURRENT_DATE, INTERVAL 4 MONTH),
    NOW(),
    NOW()
);

-- Create proposals for engineer test user
INSERT IGNORE INTO proposals (
    id, project_id, user_id, status, responded_at,
    created_at, updated_at
)
SELECT * FROM (
    SELECT 'e2e00005-0000-0000-0000-000000000001', 'e2e00004-0000-0000-0000-000000000001', 'e2e00001-0000-0000-0000-000000000001', 'proposed', NULL, NOW(), NOW()
    UNION ALL
    SELECT 'e2e00005-0000-0000-0000-000000000002', 'e2e00004-0000-0000-0000-000000000002', 'e2e00001-0000-0000-0000-000000000001', 'proposed', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)
    UNION ALL
    SELECT 'e2e00005-0000-0000-0000-000000000003', 'e2e00004-0000-0000-0000-000000000003', 'e2e00001-0000-0000-0000-000000000001', 'proceed', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)
    UNION ALL
    SELECT 'e2e00005-0000-0000-0000-000000000004', 'e2e00004-0000-0000-0000-000000000004', 'e2e00001-0000-0000-0000-000000000001', 'proposed', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)
    UNION ALL
    SELECT 'e2e00005-0000-0000-0000-000000000005', 'e2e00004-0000-0000-0000-000000000005', 'e2e00001-0000-0000-0000-000000000001', 'declined', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)
) AS proposals_data
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'proposals');

-- Display summary
SELECT 'E2E test data created successfully!' as message;
SELECT id, email, role, active FROM users WHERE email LIKE '%_test@duesk.co.jp' ORDER BY email;

-- Show created clients if table exists
SELECT 'Clients created:' as message WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'clients');
SELECT id, company_name FROM clients WHERE id LIKE 'e2e%' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'clients');

-- Show created projects if table exists  
SELECT 'Projects created:' as message WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'projects');
SELECT id, project_name, status FROM projects WHERE id LIKE 'e2e%' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'projects');

-- Create proposal_questions table if not exists
CREATE TABLE IF NOT EXISTS proposal_questions (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    proposal_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    question_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    response_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
    sales_user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
    is_responded BOOLEAN NOT NULL DEFAULT FALSE,
    responded_at DATETIME(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    CONSTRAINT fk_proposal_questions_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_proposal_questions_sales_user FOREIGN KEY (sales_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_proposal_questions_proposal_id (proposal_id),
    INDEX idx_proposal_questions_sales_user_id (sales_user_id),
    INDEX idx_proposal_questions_is_responded (is_responded)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Clean up existing test questions
DELETE FROM proposal_questions WHERE id LIKE 'e2e00006%';

-- Create questions for proposals (simplified version)
INSERT IGNORE INTO proposal_questions (
    id, proposal_id, question_text, response_text, sales_user_id, is_responded, responded_at,
    created_at, updated_at
)
SELECT * FROM (
    -- Questions for Web app proposal
    SELECT 'e2e00006-0000-0000-0000-000000000001', 'e2e00005-0000-0000-0000-000000000001',
        'プロジェクトで使用する技術スタックの詳細を教えてください。',
        'フロントエンドはReact 18、TypeScript 5を使用します。バックエンドはNode.js 18、Express、PostgreSQLです。',
        'e2e00001-0000-0000-0000-000000000002', TRUE, DATE_SUB(NOW(), INTERVAL 6 HOUR),
        DATE_SUB(NOW(), INTERVAL 6 HOUR), DATE_SUB(NOW(), INTERVAL 5 HOUR)
    UNION ALL
    SELECT 'e2e00006-0000-0000-0000-000000000002', 'e2e00005-0000-0000-0000-000000000001',
        'リモートワークは可能でしょうか？',
        NULL, NULL, FALSE, NULL,
        DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR)
    -- Questions for Cloud infra proposal
    UNION ALL
    SELECT 'e2e00006-0000-0000-0000-000000000003', 'e2e00005-0000-0000-0000-000000000002',
        'AWS経験はどの程度必要でしょうか？',
        'AWSソリューションアーキテクト資格相当の知識と、実務経験2年以上を希望しています。',
        'e2e00001-0000-0000-0000-000000000002', TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY),
        DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 20 HOUR)
    -- Questions for Data analysis proposal (proceed)
    UNION ALL
    SELECT 'e2e00006-0000-0000-0000-000000000006', 'e2e00005-0000-0000-0000-000000000003',
        'BigQueryの使用経験はありますが、データ分析基盤の構築経験はありません。問題ないでしょうか？',
        'BigQueryの経験があれば問題ありません。基盤構築についてはチームでサポートします。',
        'e2e00001-0000-0000-0000-000000000002', TRUE, DATE_SUB(NOW(), INTERVAL 6 DAY),
        DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY)
    -- Questions for Security proposal (declined)
    UNION ALL
    SELECT 'e2e00006-0000-0000-0000-000000000012', 'e2e00005-0000-0000-0000-000000000005',
        'ペネトレーションテストの経験がありませんが大丈夫でしょうか？',
        '申し訳ございませんが、今回はペネトレーションテスト経験者を優先させていただきます。',
        'e2e00001-0000-0000-0000-000000000002', TRUE, DATE_SUB(NOW(), INTERVAL 3 DAY),
        DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)
) AS questions_data
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'proposal_questions');

-- Show created proposals if table exists
SELECT 'Proposals created:' as message WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'proposals');
SELECT p.id, proj.project_name, p.status FROM proposals p JOIN projects proj ON p.project_id = proj.id WHERE p.id LIKE 'e2e%' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'proposals');

-- Show created questions if table exists
SELECT 'Proposal questions created:' as message WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'proposal_questions');
SELECT 
    q.id, 
    LEFT(q.question_text, 30) as question, 
    CASE WHEN q.is_responded THEN 'Answered' ELSE 'Pending' END as status 
FROM proposal_questions q 
WHERE q.id LIKE 'e2e%' 
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'monstera' AND table_name = 'proposal_questions')
LIMIT 5;