-- =============================================================================
-- PostgreSQL クエリベンチマークテスト
-- 実際のアプリケーションクエリのパフォーマンステスト用SQLファイル
-- =============================================================================

-- 実行前にタイミング機能を有効化
\timing on

-- バッファクリア（テスト環境のみ）
-- SELECT pg_stat_reset();

\echo '=== PostgreSQL クエリベンチマークテスト開始 ==='
\echo ''

-- =============================================================================
-- 1. 基本的な単一テーブルクエリ
-- =============================================================================

\echo '=== 1. 基本的な単一テーブルクエリ ==='
\echo ''

-- 1-1. 主キー検索
\echo '1-1. 主キー検索 (UUID)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users WHERE id = (SELECT id FROM users LIMIT 1);

\echo ''

-- 1-2. インデックス利用検索
\echo '1-2. インデックス利用検索 (email)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users WHERE email LIKE '%test%';

\echo ''

-- 1-3. 範囲検索
\echo '1-3. 範囲検索 (created_at)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

\echo ''

-- 1-4. 条件検索
\echo '1-4. 条件検索 (role + is_active)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users WHERE role = 'engineer' AND is_active = true;

\echo ''

-- =============================================================================
-- 2. JOIN クエリ
-- =============================================================================

\echo '=== 2. JOIN クエリ ==='
\echo ''

-- 2-1. 内部結合
\echo '2-1. 内部結合 (users + weekly_reports)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, wr.start_date, wr.status, wr.total_work_hours
FROM users u
JOIN weekly_reports wr ON u.id = wr.user_id
WHERE wr.start_date >= CURRENT_DATE - INTERVAL '30 days'
LIMIT 20;

\echo ''

-- 2-2. 左外部結合
\echo '2-2. 左外部結合 (users + weekly_reports)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(wr.id) as report_count
FROM users u
LEFT JOIN weekly_reports wr ON u.id = wr.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name
ORDER BY report_count DESC
LIMIT 10;

\echo ''

-- 2-3. 複数テーブル結合
\echo '2-3. 複数テーブル結合 (proposals + users + projects)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ep.id, ep.status, u.name as user_name, p.name as project_name
FROM engineer_proposals ep
JOIN users u ON ep.user_id = u.id
LEFT JOIN projects p ON ep.project_id = p.id
WHERE ep.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ep.created_at DESC
LIMIT 50;

\echo ''

-- =============================================================================
-- 3. 集計クエリ
-- =============================================================================

\echo '=== 3. 集計クエリ ==='
\echo ''

-- 3-1. COUNT集計
\echo '3-1. COUNT集計 (status別)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT status, COUNT(*) as count
FROM weekly_reports
GROUP BY status;

\echo ''

-- 3-2. SUM集計
\echo '3-2. SUM集計 (total_work_hours)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT DATE_TRUNC('month', start_date) as month, 
       SUM(total_work_hours) as total_hours,
       AVG(total_work_hours) as avg_hours
FROM weekly_reports
WHERE start_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', start_date)
ORDER BY month;

\echo ''

-- 3-3. 複雑な集計
\echo '3-3. 複雑な集計 (CASE文使用)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name,
       COUNT(CASE WHEN wr.status = 'approved' THEN 1 END) as approved_count,
       COUNT(CASE WHEN wr.status = 'submitted' THEN 1 END) as submitted_count,
       COUNT(CASE WHEN wr.status = 'draft' THEN 1 END) as draft_count,
       SUM(wr.total_work_hours) as total_hours
FROM users u
LEFT JOIN weekly_reports wr ON u.id = wr.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name
HAVING COUNT(wr.id) > 0;

\echo ''

-- =============================================================================
-- 4. サブクエリ
-- =============================================================================

\echo '=== 4. サブクエリ ==='
\echo ''

-- 4-1. IN句サブクエリ
\echo '4-1. IN句サブクエリ'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM engineer_proposals
WHERE user_id IN (
    SELECT id FROM users 
    WHERE role = 'engineer' AND is_active = true
)
AND created_at >= CURRENT_DATE - INTERVAL '60 days';

\echo ''

-- 4-2. EXISTS句サブクエリ
\echo '4-2. EXISTS句サブクエリ'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.*
FROM users u
WHERE EXISTS (
    SELECT 1 FROM weekly_reports wr 
    WHERE wr.user_id = u.id 
    AND wr.status = 'approved' 
    AND wr.start_date >= CURRENT_DATE - INTERVAL '30 days'
);

\echo ''

-- 4-3. 相関サブクエリ
\echo '4-3. 相関サブクエリ'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name,
       (SELECT COUNT(*) FROM weekly_reports wr 
        WHERE wr.user_id = u.id AND wr.status = 'approved') as approved_reports,
       (SELECT AVG(total_work_hours) FROM weekly_reports wr 
        WHERE wr.user_id = u.id) as avg_work_hours
FROM users u
WHERE u.is_active = true;

\echo ''

-- =============================================================================
-- 5. ウィンドウ関数
-- =============================================================================

\echo '=== 5. ウィンドウ関数 ==='
\echo ''

-- 5-1. ROW_NUMBER
\echo '5-1. ROW_NUMBER (月別勤務時間ランキング)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, 
       wr.total_work_hours,
       DATE_TRUNC('month', wr.start_date) as month,
       ROW_NUMBER() OVER (
           PARTITION BY DATE_TRUNC('month', wr.start_date) 
           ORDER BY wr.total_work_hours DESC
       ) as rank
FROM weekly_reports wr
JOIN users u ON wr.user_id = u.id
WHERE wr.start_date >= CURRENT_DATE - INTERVAL '3 months';

\echo ''

-- 5-2. LAG/LEAD
\echo '5-2. LAG/LEAD (前月比較)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name,
       DATE_TRUNC('month', wr.start_date) as month,
       SUM(wr.total_work_hours) as current_month_hours,
       LAG(SUM(wr.total_work_hours)) OVER (
           PARTITION BY u.id 
           ORDER BY DATE_TRUNC('month', wr.start_date)
       ) as previous_month_hours
FROM weekly_reports wr
JOIN users u ON wr.user_id = u.id
WHERE wr.start_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY u.id, u.name, DATE_TRUNC('month', wr.start_date)
ORDER BY u.name, month;

\echo ''

-- =============================================================================
-- 6. 複雑な検索クエリ
-- =============================================================================

\echo '=== 6. 複雑な検索クエリ ==='
\echo ''

-- 6-1. 複数条件とソート
\echo '6-1. 複数条件とソート'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM weekly_reports
WHERE status IN ('submitted', 'approved')
  AND start_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE
  AND total_work_hours > 35.0
ORDER BY start_date DESC, total_work_hours DESC
LIMIT 100;

\echo ''

-- 6-2. LIKE検索
\echo '6-2. LIKE検索 (weekly_remarks)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT wr.*, u.name
FROM weekly_reports wr
JOIN users u ON wr.user_id = u.id
WHERE wr.weekly_remarks LIKE '%開発%'
   OR wr.weekly_remarks LIKE '%テスト%'
ORDER BY wr.created_at DESC
LIMIT 20;

\echo ''

-- 6-3. 正規表現検索
\echo '6-3. 正規表現検索'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users
WHERE email ~ '^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.(com|jp)$'
  AND is_active = true;

\echo ''

-- =============================================================================
-- 7. 最適化が必要そうなクエリ
-- =============================================================================

\echo '=== 7. 最適化が必要そうなクエリ ==='
\echo ''

-- 7-1. フルテーブルスキャンクエリ
\echo '7-1. フルテーブルスキャンクエリ'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) FROM weekly_reports
WHERE weekly_remarks LIKE '%プロジェクト%';

\echo ''

-- 7-2. 複雑な JOIN と GROUP BY
\echo '7-2. 複雑な JOIN と GROUP BY'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name,
       u.role,
       COUNT(DISTINCT wr.id) as weekly_report_count,
       COUNT(DISTINCT ep.id) as proposal_count,
       AVG(wr.total_work_hours) as avg_work_hours,
       MIN(wr.start_date) as first_report,
       MAX(wr.start_date) as last_report
FROM users u
LEFT JOIN weekly_reports wr ON u.id = wr.user_id
LEFT JOIN engineer_proposals ep ON u.id = ep.user_id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY u.id, u.name, u.role
HAVING COUNT(DISTINCT wr.id) > 0
ORDER BY weekly_report_count DESC, proposal_count DESC;

\echo ''

-- 7-3. OR条件での非効率検索
\echo '7-3. OR条件での非効率検索'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users
WHERE email LIKE '%admin%'
   OR name LIKE '%管理%'
   OR role = 'manager'
   OR created_at > CURRENT_DATE - INTERVAL '7 days';

\echo ''

-- =============================================================================
-- 8. パフォーマンステスト用の負荷クエリ
-- =============================================================================

\echo '=== 8. パフォーマンステスト用の負荷クエリ ==='
\echo ''

-- 8-1. 大量データソート
\echo '8-1. 大量データソート'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT wr.*, u.name, u.email
FROM weekly_reports wr
JOIN users u ON wr.user_id = u.id
ORDER BY wr.total_work_hours DESC, wr.start_date DESC, u.name ASC;

\echo ''

-- 8-2. 複数テーブルの大量JOIN
\echo '8-2. 複数テーブルの大量JOIN'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT wr.id as weekly_report_id,
       wr.start_date,
       wr.status,
       u.name as user_name,
       u.email,
       dr.date as daily_date,
       dr.work_hours as daily_hours,
       ep.status as proposal_status
FROM weekly_reports wr
JOIN users u ON wr.user_id = u.id
LEFT JOIN daily_records dr ON wr.id = dr.weekly_report_id
LEFT JOIN engineer_proposals ep ON u.id = ep.user_id 
    AND ep.created_at BETWEEN wr.start_date AND wr.end_date
WHERE wr.start_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY wr.start_date DESC, u.name ASC;

\echo ''

-- =============================================================================
-- 9. インデックス効果確認クエリ
-- =============================================================================

\echo '=== 9. インデックス効果確認クエリ ==='
\echo ''

-- 9-1. B-treeインデックス効果
\echo '9-1. B-treeインデックス効果 (created_at範囲検索)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) FROM weekly_reports
WHERE created_at BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE;

\echo ''

-- 9-2. 複合インデックス効果
\echo '9-2. 複合インデックス効果 (user_id + start_date)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM weekly_reports
WHERE user_id = (SELECT id FROM users LIMIT 1)
  AND start_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY start_date DESC;

\echo ''

-- 9-3. 部分インデックス効果
\echo '9-3. 部分インデックス効果 (active users)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users
WHERE is_active = true
  AND role = 'engineer'
  AND created_at >= CURRENT_DATE - INTERVAL '1 year';

\echo ''

-- =============================================================================
-- 10. 統計情報とプランナー設定の確認
-- =============================================================================

\echo '=== 10. 統計情報とプランナー設定の確認 ==='
\echo ''

-- 10-1. テーブル統計情報
\echo '10-1. 主要テーブルの統計情報'
SELECT schemaname, tablename, n_live_tup, n_dead_tup, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename IN ('users', 'weekly_reports', 'engineer_proposals', 'daily_records')
ORDER BY n_live_tup DESC;

\echo ''

-- 10-2. インデックス使用統計
\echo '10-2. インデックス使用統計'
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('users', 'weekly_reports', 'engineer_proposals')
ORDER BY idx_scan DESC;

\echo ''

-- 10-3. プランナー設定確認
\echo '10-3. プランナー関連設定'
SELECT name, setting, unit, context
FROM pg_settings
WHERE name IN (
    'enable_seqscan',
    'enable_indexscan',
    'enable_bitmapscan',
    'enable_hashjoin',
    'enable_mergejoin',
    'enable_nestloop',
    'random_page_cost',
    'seq_page_cost',
    'cpu_tuple_cost',
    'cpu_index_tuple_cost',
    'cpu_operator_cost'
)
ORDER BY name;

\echo ''

-- =============================================================================
-- ベンチマークテスト完了
-- =============================================================================

\echo '=== PostgreSQL クエリベンチマークテスト完了 ==='
\echo ''
\echo '結果の分析方法:'
\echo '1. 実行時間が長いクエリを特定'
\echo '2. "Seq Scan" が多用されているクエリを確認'
\echo '3. "Buffers" の値でI/O負荷を確認'
\echo '4. "cost" の値でオプティマイザーの判断を確認'
\echo ''
\echo '最適化のポイント:'
\echo '- WHERE句で使用されるカラムにインデックス追加'
\echo '- 複合インデックスの活用'
\echo '- JOINの順序最適化'
\echo '- LIMIT句の活用'
\echo '- 統計情報の定期更新 (ANALYZE)'
\echo ''

-- タイミング機能を無効化
\timing off