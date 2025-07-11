-- テストデータクリーンアップスクリプト
-- パフォーマンステスト用に作成したデータを削除

SET @start_time = NOW(6);

-- 削除前のデータ確認
SELECT 'クリーンアップ前のデータ数' as status;
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

-- 外部キー制約に従って順番に削除

-- 1. work_history_technologiesから削除
DELETE wht 
FROM work_history_technologies wht
JOIN work_histories wh ON wht.work_history_id = wh.id
WHERE wh.project_name LIKE 'プロジェクト%';

-- 2. work_historiesから削除
DELETE FROM work_histories 
WHERE project_name LIKE 'プロジェクト%';

-- 3. テストユーザーを削除
DELETE FROM users 
WHERE email LIKE 'test%@duesk.co.jp';

-- 削除後のデータ確認
SELECT 'クリーンアップ後のデータ数' as status;
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

-- クリーンアップ完了時間の記録
SET @end_time = NOW(6);
SELECT 
    CONCAT('テストデータクリーンアップ完了: ', 
           TIMESTAMPDIFF(MICROSECOND, @start_time, @end_time) / 1000, 'ms') as result;