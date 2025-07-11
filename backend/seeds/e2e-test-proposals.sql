-- E2E Test Proposals Data
-- Create proposals linking projects to the engineer test user

-- Clean up existing test proposals
DELETE FROM proposal_questions WHERE proposal_id IN (
    SELECT id FROM proposals WHERE id LIKE 'e2e00005%'
);
DELETE FROM proposals WHERE id LIKE 'e2e00005%';

-- Create 5 proposals for the engineer test user
-- Note: We have 3 projects, so we'll create multiple proposals including some additional projects

-- First, create 2 more test projects to have 5 total for proposals
INSERT INTO projects (
    id, client_id, project_name, description, status,
    contract_type, monthly_rate, working_hours_min, working_hours_max,
    start_date, end_date, created_at, updated_at
) VALUES
(
    'e2e00004-0000-0000-0000-000000000004',
    'e2e00002-0000-0000-0000-000000000001',  -- E2Eテスト株式会社
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
    'e2e00002-0000-0000-0000-000000000002',  -- テストシステムズ株式会社
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

-- Create 5 proposals for the engineer user
INSERT INTO proposals (
    id, project_id, user_id, status, responded_at,
    created_at, updated_at
) VALUES
-- Proposal 1: Web application project (new proposal)
(
    'e2e00005-0000-0000-0000-000000000001',
    'e2e00004-0000-0000-0000-000000000001',  -- Webアプリケーション開発案件
    'e2e00001-0000-0000-0000-000000000001',  -- engineer_test@duesk.co.jp
    'proposed',
    NULL,
    NOW(),
    NOW()
),
-- Proposal 2: Cloud infrastructure project (considering)
(
    'e2e00005-0000-0000-0000-000000000002',
    'e2e00004-0000-0000-0000-000000000002',  -- クラウドインフラ構築案件
    'e2e00001-0000-0000-0000-000000000001',
    'proposed',
    NULL,
    DATE_SUB(NOW(), INTERVAL 2 DAY),
    DATE_SUB(NOW(), INTERVAL 2 DAY)
),
-- Proposal 3: Data analysis project (accepted)
(
    'e2e00005-0000-0000-0000-000000000003',
    'e2e00004-0000-0000-0000-000000000003',  -- データ分析基盤構築案件
    'e2e00001-0000-0000-0000-000000000001',
    'proceed',
    DATE_SUB(NOW(), INTERVAL 5 DAY),
    DATE_SUB(NOW(), INTERVAL 7 DAY),
    DATE_SUB(NOW(), INTERVAL 5 DAY)
),
-- Proposal 4: Mobile app project (new)
(
    'e2e00005-0000-0000-0000-000000000004',
    'e2e00004-0000-0000-0000-000000000004',  -- モバイルアプリ開発案件
    'e2e00001-0000-0000-0000-000000000001',
    'proposed',
    NULL,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
),
-- Proposal 5: Security project (declined)
(
    'e2e00005-0000-0000-0000-000000000005',
    'e2e00004-0000-0000-0000-000000000005',  -- セキュリティ診断・改善案件
    'e2e00001-0000-0000-0000-000000000001',
    'declined',
    DATE_SUB(NOW(), INTERVAL 3 DAY),
    DATE_SUB(NOW(), INTERVAL 4 DAY),
    DATE_SUB(NOW(), INTERVAL 3 DAY)
);

-- Verify the proposals were created
SELECT 'Proposals created:' as info;
SELECT 
    p.id,
    proj.project_name,
    u.email as engineer_email,
    p.status,
    p.responded_at,
    p.created_at
FROM proposals p
JOIN projects proj ON p.project_id = proj.id
JOIN users u ON p.user_id = u.id
WHERE p.id LIKE 'e2e00005%'
ORDER BY p.created_at DESC;

-- Summary
SELECT 'Proposal Status Summary:' as info;
SELECT 
    status,
    COUNT(*) as count
FROM proposals
WHERE id LIKE 'e2e00005%'
GROUP BY status;