-- パフォーマンステスト用のテストデータ生成スクリプト
-- 100件の職務経歴データとユーザーデータを作成

SET @start_time = NOW(6);

-- テスト用ユーザーの作成（20人）
INSERT INTO users (id, email, password_hash, first_name, last_name, employee_id, department, position, hire_date, is_active, created_at, updated_at) VALUES
-- ユーザー 1-5
(UUID(), 'test01@duesk.co.jp', '$2a$12$dummy.hash.for.test', '太郎', '田中', 'EMP001', 'システム開発部', 'SE', '2020-04-01', true, NOW(), NOW()),
(UUID(), 'test02@duesk.co.jp', '$2a$12$dummy.hash.for.test', '花子', '佐藤', 'EMP002', 'システム開発部', 'PG', '2021-04-01', true, NOW(), NOW()),
(UUID(), 'test03@duesk.co.jp', '$2a$12$dummy.hash.for.test', '次郎', '鈴木', 'EMP003', 'システム開発部', 'SE', '2019-04-01', true, NOW(), NOW()),
(UUID(), 'test04@duesk.co.jp', '$2a$12$dummy.hash.for.test', '三郎', '高橋', 'EMP004', 'システム開発部', 'PL', '2018-04-01', true, NOW(), NOW()),
(UUID(), 'test05@duesk.co.jp', '$2a$12$dummy.hash.for.test', '美香', '田村', 'EMP005', 'システム開発部', 'SE', '2020-10-01', true, NOW(), NOW()),
-- ユーザー 6-10
(UUID(), 'test06@duesk.co.jp', '$2a$12$dummy.hash.for.test', '健太', '中村', 'EMP006', 'システム開発部', 'PG', '2022-04-01', true, NOW(), NOW()),
(UUID(), 'test07@duesk.co.jp', '$2a$12$dummy.hash.for.test', '愛子', '小林', 'EMP007', 'システム開発部', 'SE', '2019-10-01', true, NOW(), NOW()),
(UUID(), 'test08@duesk.co.jp', '$2a$12$dummy.hash.for.test', '雄一', '加藤', 'EMP008', 'システム開発部', 'PL', '2017-04-01', true, NOW(), NOW()),
(UUID(), 'test09@duesk.co.jp', '$2a$12$dummy.hash.for.test', '純子', '山田', 'EMP009', 'システム開発部', 'SE', '2021-10-01', true, NOW(), NOW()),
(UUID(), 'test10@duesk.co.jp', '$2a$12$dummy.hash.for.test', '昭夫', '森田', 'EMP010', 'システム開発部', 'PG', '2023-04-01', true, NOW(), NOW()),
-- ユーザー 11-15
(UUID(), 'test11@duesk.co.jp', '$2a$12$dummy.hash.for.test', '理恵', '石井', 'EMP011', 'システム開発部', 'SE', '2020-07-01', true, NOW(), NOW()),
(UUID(), 'test12@duesk.co.jp', '$2a$12$dummy.hash.for.test', '和夫', '斎藤', 'EMP012', 'システム開発部', 'PL', '2016-04-01', true, NOW(), NOW()),
(UUID(), 'test13@duesk.co.jp', '$2a$12$dummy.hash.for.test', '麻衣', '松本', 'EMP013', 'システム開発部', 'SE', '2019-07-01', true, NOW(), NOW()),
(UUID(), 'test14@duesk.co.jp', '$2a$12$dummy.hash.for.test', '浩二', '井上', 'EMP014', 'システム開発部', 'PG', '2022-10-01', true, NOW(), NOW()),
(UUID(), 'test15@duesk.co.jp', '$2a$12$dummy.hash.for.test', '恵美', '木村', 'EMP015', 'システム開発部', 'SE', '2018-10-01', true, NOW(), NOW()),
-- ユーザー 16-20
(UUID(), 'test16@duesk.co.jp', '$2a$12$dummy.hash.for.test', '孝志', '林', 'EMP016', 'システム開発部', 'PL', '2015-04-01', true, NOW(), NOW()),
(UUID(), 'test17@duesk.co.jp', '$2a$12$dummy.hash.for.test', '由美', '清水', 'EMP017', 'システム開発部', 'SE', '2021-07-01', true, NOW(), NOW()),
(UUID(), 'test18@duesk.co.jp', '$2a$12$dummy.hash.for.test', '正男', '山本', 'EMP018', 'システム開発部', 'PG', '2023-10-01', true, NOW(), NOW()),
(UUID(), 'test19@duesk.co.jp', '$2a$12$dummy.hash.for.test', '智子', '中島', 'EMP019', 'システム開発部', 'SE', '2020-01-01', true, NOW(), NOW()),
(UUID(), 'test20@duesk.co.jp', '$2a$12$dummy.hash.for.test', '博', '福田', 'EMP020', 'システム開発部', 'PL', '2017-10-01', true, NOW(), NOW());

-- 作成したユーザーIDを取得するための変数
SET @user_ids = (SELECT GROUP_CONCAT(id) FROM users WHERE email LIKE 'test%@duesk.co.jp' ORDER BY email);

-- work_historiesテーブルに100件のテストデータを挿入
-- 各ユーザーに対して5件のプロジェクト履歴を作成
INSERT INTO work_histories (id, user_id, project_name, start_date, end_date, industry, company_name, team_size, role, project_overview, responsibilities, achievements, remarks, processes, created_at, updated_at)
SELECT
    UUID() as id,
    u.id as user_id,
    CONCAT('プロジェクト', LPAD((@row_number := @row_number + 1), 3, '0')) as project_name,
    DATE_SUB(CURRENT_DATE(), INTERVAL FLOOR(RAND() * 2000 + 365) DAY) as start_date,
    CASE 
        WHEN RAND() > 0.7 THEN NULL  -- 30%の確率で現在進行中
        ELSE DATE_SUB(CURRENT_DATE(), INTERVAL FLOOR(RAND() * 365) DAY)
    END as end_date,
    ELT(FLOOR(RAND() * 10) + 1, '金融', '製造', '流通', '通信', '医療', '教育', '官公庁', 'IT・Web', '不動産', 'その他') as industry,
    CONCAT('株式会社', ELT(FLOOR(RAND() * 5) + 1, 'ABC', 'XYZ', 'テック', 'システムズ', 'ソリューション')) as company_name,
    FLOOR(RAND() * 15) + 3 as team_size,
    ELT(FLOOR(RAND() * 4) + 1, 'PG', 'SE', 'PL', 'PM') as role,
    CONCAT('システム開発プロジェクト', FLOOR(RAND() * 1000)) as project_overview,
    '要件定義、設計、開発、テスト' as responsibilities,
    'プロジェクト成功に貢献' as achievements,
    'テスト用データ' as remarks,
    '要件定義,基本設計,詳細設計,実装,単体テスト,結合テスト' as processes,
    NOW() as created_at,
    NOW() as updated_at
FROM 
    (SELECT id FROM users WHERE email LIKE 'test%@duesk.co.jp') u
    CROSS JOIN (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) numbers
    CROSS JOIN (SELECT @row_number := 0) r
ORDER BY u.id, numbers.1;

-- 技術カテゴリとwork_history_technologiesのテストデータ
-- 各プロジェクトに技術情報を追加（3-8個の技術を各プロジェクトに割り当て）

INSERT INTO work_history_technologies (id, work_history_id, category_id, technology_name, created_at, updated_at)
SELECT 
    UUID() as id,
    wh.id as work_history_id,
    tc.id as category_id,
    CASE tc.name
        WHEN 'programming_languages' THEN ELT(FLOOR(RAND() * 10) + 1, 'Java', 'JavaScript', 'Python', 'PHP', 'C#', 'Go', 'TypeScript', 'Ruby', 'Kotlin', 'Swift')
        WHEN 'servers_databases' THEN ELT(FLOOR(RAND() * 8) + 1, 'MySQL', 'PostgreSQL', 'Oracle', 'Redis', 'MongoDB', 'Apache', 'Nginx', 'Docker')
        WHEN 'tools' THEN ELT(FLOOR(RAND() * 10) + 1, 'Git', 'GitHub', 'Jenkins', 'JIRA', 'Confluence', 'Slack', 'Visual Studio Code', 'IntelliJ IDEA', 'Eclipse', 'Postman')
    END as technology_name,
    NOW() as created_at,
    NOW() as updated_at
FROM work_histories wh
CROSS JOIN technology_categories tc
CROSS JOIN (SELECT 1 UNION SELECT 2 UNION SELECT 3) tech_count
WHERE wh.project_name LIKE 'プロジェクト%'
  AND RAND() > 0.3  -- 70%の確率で技術を追加
ORDER BY wh.id, tc.id, tech_count.1;

-- データ作成完了時間の記録
SET @end_time = NOW(6);
SELECT 
    CONCAT('テストデータ作成完了: ', 
           TIMESTAMPDIFF(MICROSECOND, @start_time, @end_time) / 1000, 'ms') as result;

-- 作成されたデータの確認
SELECT 
    'ユーザー数' as item, 
    COUNT(*) as count 
FROM users 
WHERE email LIKE 'test%@duesk.co.jp'
UNION ALL
SELECT 
    '職務経歴数' as item, 
    COUNT(*) as count 
FROM work_histories 
WHERE project_name LIKE 'プロジェクト%'
UNION ALL
SELECT 
    '技術データ数' as item, 
    COUNT(*) as count 
FROM work_history_technologies wht
JOIN work_histories wh ON wht.work_history_id = wh.id
WHERE wh.project_name LIKE 'プロジェクト%';