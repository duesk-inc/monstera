-- E2E Test Data Seed File
-- This file contains test data for E2E testing

-- Insert test users (password: Test1234\!)
INSERT INTO users (
    id, email, password, first_name, last_name, first_name_kana, last_name_kana,
    role, active, created_at, updated_at
) VALUES 
(
    'e2e00001-0000-0000-0000-000000000001',
    'engineer_test@duesk.co.jp',
    '$2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', 'エンジニア', 'テスト', 'エンジニア',
    4, -- employee role
    1, -- active
    NOW(),
    NOW()
),
(
    'e2e00001-0000-0000-0000-000000000002',
    'sales_test@duesk.co.jp',
    '$2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', '営業', 'テスト', 'エイギョウ',
    4, -- employee role (sales roleが受け入れられないため)
    1, -- active
    NOW(),
    NOW()
),
(
    'e2e00001-0000-0000-0000-000000000003',
    'admin_test@duesk.co.jp',
    '$2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', '管理者', 'テスト', 'カンリシャ',
    2, -- admin role
    1, -- active
    NOW(),
    NOW()
);

-- Insert user_roles
INSERT INTO user_roles (user_id, role_id, created_at, updated_at) VALUES
('e2e00001-0000-0000-0000-000000000001', 4, NOW(), NOW()),
('e2e00001-0000-0000-0000-000000000002', 4, NOW(), NOW()),
('e2e00001-0000-0000-0000-000000000002', 5, NOW(), NOW()), -- sales_rep role
('e2e00001-0000-0000-0000-000000000003', 2, NOW(), NOW());

-- Insert test clients
INSERT INTO clients (
    id, name, description, status, created_at, updated_at
) VALUES 
(
    'e2e00002-0000-0000-0000-000000000001',
    'テスト株式会社A',
    'E2Eテスト用のクライアント企業A',
    'active',
    NOW(),
    NOW()
),
(
    'e2e00002-0000-0000-0000-000000000002',
    'テスト株式会社B',
    'E2Eテスト用のクライアント企業B',
    'active',
    NOW(),
    NOW()
),
(
    'e2e00002-0000-0000-0000-000000000003',
    'テスト株式会社C',
    'E2Eテスト用のクライアント企業C',
    'active',
    NOW(),
    NOW()
);

-- Insert test projects
INSERT INTO projects (
    id, client_id, name, description, start_date, end_date,
    status, created_at, updated_at
) VALUES 
(
    'e2e00003-0000-0000-0000-000000000001',
    'e2e00002-0000-0000-0000-000000000001',
    'Webシステム開発プロジェクト',
    'E2Eテスト用のWebシステム開発案件',
    DATE_SUB(CURDATE(), INTERVAL 30 DAY),
    DATE_ADD(CURDATE(), INTERVAL 60 DAY),
    'in_progress',
    NOW(),
    NOW()
),
(
    'e2e00003-0000-0000-0000-000000000002',
    'e2e00002-0000-0000-0000-000000000002',
    'モバイルアプリ開発プロジェクト',
    'E2Eテスト用のモバイルアプリ開発案件',
    DATE_SUB(CURDATE(), INTERVAL 60 DAY),
    DATE_ADD(CURDATE(), INTERVAL 30 DAY),
    'in_progress',
    NOW(),
    NOW()
),
(
    'e2e00003-0000-0000-0000-000000000003',
    'e2e00002-0000-0000-0000-000000000003',
    'AIシステム開発プロジェクト',
    'E2Eテスト用のAIシステム開発案件',
    DATE_SUB(CURDATE(), INTERVAL 10 DAY),
    DATE_ADD(CURDATE(), INTERVAL 90 DAY),
    'pending',
    NOW(),
    NOW()
);

-- Insert test proposals (engineer proposals)
INSERT INTO proposals (
    id, project_id, engineer_id, sales_rep_id, title, description,
    start_date, end_date, status, created_at, updated_at
) VALUES 
(
    'e2e00004-0000-0000-0000-000000000001',
    'e2e00003-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000002',
    'フロントエンド開発提案',
    'ReactとTypeScriptを使用したモダンなフロントエンド開発の提案です。',
    DATE_ADD(CURDATE(), INTERVAL 7 DAY),
    DATE_ADD(CURDATE(), INTERVAL 67 DAY),
    'pending',
    NOW(),
    NOW()
),
(
    'e2e00004-0000-0000-0000-000000000002',
    'e2e00003-0000-0000-0000-000000000002',
    'e2e00001-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000002',
    'React Native開発提案',
    'クロスプラットフォーム対応のモバイルアプリ開発提案です。',
    DATE_ADD(CURDATE(), INTERVAL 14 DAY),
    DATE_ADD(CURDATE(), INTERVAL 44 DAY),
    'approved',
    NOW(),
    NOW()
),
(
    'e2e00004-0000-0000-0000-000000000003',
    'e2e00003-0000-0000-0000-000000000003',
    'e2e00001-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000002',
    '機械学習エンジニア提案',
    'Python/TensorFlowを使用した機械学習システムの開発提案です。',
    DATE_ADD(CURDATE(), INTERVAL 21 DAY),
    DATE_ADD(CURDATE(), INTERVAL 111 DAY),
    'pending',
    NOW(),
    NOW()
),
(
    'e2e00004-0000-0000-0000-000000000004',
    'e2e00003-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000002',
    'バックエンド開発提案',
    'Go言語を使用した高性能なAPIサーバー開発の提案です。',
    DATE_ADD(CURDATE(), INTERVAL 10 DAY),
    DATE_ADD(CURDATE(), INTERVAL 70 DAY),
    'rejected',
    NOW(),
    NOW()
),
(
    'e2e00004-0000-0000-0000-000000000005',
    'e2e00003-0000-0000-0000-000000000002',
    'e2e00001-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000002',
    'UI/UXデザイン提案',
    'Figmaを使用したユーザー中心のデザイン提案です。',
    DATE_ADD(CURDATE(), INTERVAL 5 DAY),
    DATE_ADD(CURDATE(), INTERVAL 35 DAY),
    'pending',
    NOW(),
    NOW()
);

-- Insert test proposal questions
INSERT INTO proposal_questions (
    id, proposal_id, user_id, question, answer, 
    status, created_at, updated_at
) VALUES 
-- Questions for proposal 1
(
    'e2e00005-0000-0000-0000-000000000001',
    'e2e00004-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000002',
    'TypeScriptの実務経験はどの程度ありますか？',
    '3年以上の実務経験があります。大規模プロジェクトでの導入経験もあります。',
    'answered',
    NOW(),
    NOW()
),
(
    'e2e00005-0000-0000-0000-000000000002',
    'e2e00004-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000002',
    'レスポンシブデザインの対応は可能ですか？',
    NULL,
    'pending',
    NOW(),
    NOW()
);
EOF < /dev/null