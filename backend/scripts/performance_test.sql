-- パフォーマンステスト実行スクリプト
-- ビューのクエリ実行時間を測定（<100ms目標）

-- テスト開始
SELECT 'パフォーマンステスト開始' as status, NOW() as start_time;

-- 1. user_skill_summaryビューのパフォーマンステスト
SET @test_start = NOW(6);

-- 全データ取得
SELECT COUNT(*) as skill_summary_count FROM user_skill_summary;

SET @test_end = NOW(6);
SELECT 
    'user_skill_summary 全件取得' as test_name,
    TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 as execution_time_ms,
    CASE 
        WHEN TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 < 100 THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- 2. 特定ユーザーのスキル取得テスト
SET @test_start = NOW(6);

SELECT * FROM user_skill_summary 
WHERE user_id = (SELECT id FROM users WHERE email LIKE 'test01@duesk.co.jp' LIMIT 1)
ORDER BY total_experience_months DESC;

SET @test_end = NOW(6);
SELECT 
    'user_skill_summary ユーザー別取得' as test_name,
    TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 as execution_time_ms,
    CASE 
        WHEN TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 < 100 THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- 3. カテゴリ別スキル取得テスト
SET @test_start = NOW(6);

SELECT * FROM user_skill_summary 
WHERE category_name = 'programming_languages'
ORDER BY total_experience_months DESC
LIMIT 50;

SET @test_end = NOW(6);
SELECT 
    'user_skill_summary カテゴリ別取得' as test_name,
    TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 as execution_time_ms,
    CASE 
        WHEN TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 < 100 THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- 4. 技術名検索テスト
SET @test_start = NOW(6);

SELECT * FROM user_skill_summary 
WHERE technology_name LIKE '%Java%'
ORDER BY total_experience_months DESC;

SET @test_end = NOW(6);
SELECT 
    'user_skill_summary 技術名検索' as test_name,
    TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 as execution_time_ms,
    CASE 
        WHEN TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 < 100 THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- 5. user_it_experienceビューのパフォーマンステスト
SET @test_start = NOW(6);

SELECT COUNT(*) as it_experience_count FROM user_it_experience;

SET @test_end = NOW(6);
SELECT 
    'user_it_experience 全件取得' as test_name,
    TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 as execution_time_ms,
    CASE 
        WHEN TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 < 100 THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- 6. 特定ユーザーのIT経験取得テスト
SET @test_start = NOW(6);

SELECT * FROM user_it_experience 
WHERE user_id = (SELECT id FROM users WHERE email LIKE 'test01@duesk.co.jp' LIMIT 1);

SET @test_end = NOW(6);
SELECT 
    'user_it_experience ユーザー別取得' as test_name,
    TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 as execution_time_ms,
    CASE 
        WHEN TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 < 100 THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- 7. 経験レベル別取得テスト
SET @test_start = NOW(6);

SELECT * FROM user_it_experience 
WHERE total_it_experience_months >= 24 AND total_it_experience_months < 60
ORDER BY total_it_experience_months DESC;

SET @test_end = NOW(6);
SELECT 
    'user_it_experience 経験レベル別取得' as test_name,
    TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 as execution_time_ms,
    CASE 
        WHEN TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 < 100 THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- 8. アクティブユーザー取得テスト
SET @test_start = NOW(6);

SELECT * FROM user_it_experience 
WHERE active_project_count > 0
ORDER BY active_project_count DESC, total_it_experience_months DESC;

SET @test_end = NOW(6);
SELECT 
    'user_it_experience アクティブユーザー取得' as test_name,
    TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 as execution_time_ms,
    CASE 
        WHEN TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 < 100 THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- 9. 複合クエリテスト（JOINを含む）
SET @test_start = NOW(6);

SELECT 
    ie.user_name,
    ie.total_it_experience_months,
    COUNT(DISTINCT ss.technology_name) as skill_count,
    GROUP_CONCAT(DISTINCT ss.technology_name ORDER BY ss.total_experience_months DESC LIMIT 5) as top_skills
FROM user_it_experience ie
LEFT JOIN user_skill_summary ss ON ie.user_id = ss.user_id
WHERE ie.total_it_experience_months > 0
GROUP BY ie.user_id, ie.user_name, ie.total_it_experience_months
ORDER BY ie.total_it_experience_months DESC
LIMIT 20;

SET @test_end = NOW(6);
SELECT 
    '複合クエリ（IT経験＋スキル集計）' as test_name,
    TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 as execution_time_ms,
    CASE 
        WHEN TIMESTAMPDIFF(MICROSECOND, @test_start, @test_end) / 1000 < 200 THEN 'PASS'  -- 複合クエリは200ms許容
        ELSE 'FAIL'
    END as result;

-- 10. インデックス効果確認
SHOW INDEX FROM work_histories;
SHOW INDEX FROM work_history_technologies;
SHOW INDEX FROM technology_master;

-- テスト完了
SELECT 'パフォーマンステスト完了' as status, NOW() as end_time;

-- サマリー統計
SELECT 
    'テストデータサマリー' as title,
    (SELECT COUNT(*) FROM users WHERE email LIKE 'test%@duesk.co.jp') as test_users,
    (SELECT COUNT(*) FROM work_histories WHERE project_name LIKE 'プロジェクト%') as test_projects,
    (SELECT COUNT(*) FROM work_history_technologies wht 
     JOIN work_histories wh ON wht.work_history_id = wh.id 
     WHERE wh.project_name LIKE 'プロジェクト%') as test_technologies,
    (SELECT COUNT(*) FROM user_skill_summary) as skill_summaries,
    (SELECT COUNT(*) FROM user_it_experience) as it_experiences;