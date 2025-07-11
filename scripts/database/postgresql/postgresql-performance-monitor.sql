-- =============================================================================
-- PostgreSQL パフォーマンス監視・分析クエリ集
-- =============================================================================

-- テーブル別統計情報
-- 使用例: \i postgresql-performance-monitor.sql
-- または: psql -f postgresql-performance-monitor.sql

\echo '=== PostgreSQL パフォーマンス監視レポート ==='
\echo ''

-- 1. データベース基本情報
\echo '1. データベース基本情報'
\echo '========================'
SELECT 
    current_database() as database_name,
    version() as postgresql_version,
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    current_timestamp as report_time;

\echo ''

-- 2. テーブル統計情報
\echo '2. テーブル統計情報'
\echo '=================='
SELECT 
    schemaname,
    tablename,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

\echo ''

-- 3. インデックス使用統計
\echo '3. インデックス使用統計'
\echo '===================='
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

\echo ''

-- 4. 未使用インデックスの検出
\echo '4. 未使用インデックス'
\echo '=================='
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'  -- 主キーは除外
ORDER BY pg_relation_size(indexrelname::regclass) DESC;

\echo ''

-- 5. テーブルサイズ順位
\echo '5. テーブルサイズ順位'
\echo '=================='
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''

-- 6. 現在の接続状況
\echo '6. 現在の接続状況'
\echo '================'
SELECT 
    state,
    COUNT(*) as connection_count,
    MAX(EXTRACT(EPOCH FROM (now() - state_change))) as max_duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;

\echo ''

-- 7. 長時間実行中のクエリ
\echo '7. 長時間実行中のクエリ'
\echo '====================='
SELECT 
    pid,
    usename,
    state,
    EXTRACT(EPOCH FROM (now() - query_start)) as duration_seconds,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity
WHERE datname = current_database()
    AND state = 'active'
    AND query_start < now() - INTERVAL '30 seconds'
ORDER BY duration_seconds DESC;

\echo ''

-- 8. バッファキャッシュヒット率
\echo '8. バッファキャッシュヒット率'
\echo '=========================='
SELECT 
    schemaname,
    tablename,
    heap_blks_read + heap_blks_hit as total_reads,
    CASE 
        WHEN heap_blks_read + heap_blks_hit = 0 THEN 0
        ELSE ROUND(100.0 * heap_blks_hit / (heap_blks_read + heap_blks_hit), 2)
    END as cache_hit_ratio
FROM pg_statio_user_tables
WHERE heap_blks_read + heap_blks_hit > 0
ORDER BY cache_hit_ratio ASC;

\echo ''

-- 9. 頻繁に更新されるテーブル
\echo '9. 頻繁に更新されるテーブル'
\echo '========================'
SELECT 
    schemaname,
    tablename,
    n_tup_upd + n_tup_del as modification_count,
    n_dead_tup as dead_tuples,
    CASE 
        WHEN n_live_tup = 0 THEN 0
        ELSE ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
    END as dead_tuple_ratio
FROM pg_stat_user_tables
WHERE n_tup_upd + n_tup_del > 0
ORDER BY modification_count DESC;

\echo ''

-- 10. データベース全体の統計
\echo '10. データベース全体の統計'
\echo '========================'
SELECT 
    'Total Connections' as metric,
    COUNT(*)::text as value
FROM pg_stat_activity
WHERE datname = current_database()

UNION ALL

SELECT 
    'Active Queries' as metric,
    COUNT(*)::text as value
FROM pg_stat_activity
WHERE datname = current_database() AND state = 'active'

UNION ALL

SELECT 
    'Total Tables' as metric,
    COUNT(*)::text as value
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Total Indexes' as metric,
    COUNT(*)::text as value
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Database Size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as value

UNION ALL

SELECT 
    'Shared Buffers Hit Ratio' as metric,
    ROUND(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)::text || '%' as value
FROM pg_statio_user_tables
WHERE heap_blks_read + heap_blks_hit > 0;

\echo ''

-- =============================================================================
-- 個別テーブル詳細分析クエリ
-- =============================================================================

-- 主要テーブルの詳細分析
\echo '=== 主要テーブル詳細分析 ==='
\echo ''

-- weekly_reports テーブル分析
\echo 'weekly_reports テーブル分析'
\echo '=========================='

-- EXPLAIN ANALYZE用のサンプルクエリ
\echo 'EXPLAIN ANALYZE実行例:'
\echo 'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM weekly_reports WHERE start_date >= CURRENT_DATE - INTERVAL ''30 days'';'
\echo ''

-- users テーブル分析
\echo 'users テーブル分析'
\echo '================='

-- EXPLAIN ANALYZE用のサンプルクエリ
\echo 'EXPLAIN ANALYZE実行例:'
\echo 'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE is_active = true;'
\echo ''

-- engineer_proposals テーブル分析
\echo 'engineer_proposals テーブル分析'
\echo '============================'

-- EXPLAIN ANALYZE用のサンプルクエリ
\echo 'EXPLAIN ANALYZE実行例:'
\echo 'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM engineer_proposals WHERE status = ''proposed'';'
\echo ''

-- =============================================================================
-- パフォーマンス最適化推奨事項
-- =============================================================================

\echo '=== パフォーマンス最適化推奨事項 ==='
\echo ''

-- デッドタプルが多いテーブルの検出
\echo '1. VACUUM が必要なテーブル'
\echo '========================='
SELECT 
    schemaname,
    tablename,
    n_dead_tup as dead_tuples,
    CASE 
        WHEN n_live_tup = 0 THEN 0
        ELSE ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
    END as dead_tuple_ratio,
    'VACUUM ' || schemaname || '.' || tablename || ';' as recommended_command
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
    AND CASE 
        WHEN n_live_tup = 0 THEN 0
        ELSE 100.0 * n_dead_tup / (n_live_tup + n_dead_tup)
    END > 10
ORDER BY dead_tuple_ratio DESC;

\echo ''

-- 統計情報が古いテーブルの検出
\echo '2. ANALYZE が必要なテーブル'
\echo '========================='
SELECT 
    schemaname,
    tablename,
    last_analyze,
    last_autoanalyze,
    n_mod_since_analyze as modifications_since_analyze,
    'ANALYZE ' || schemaname || '.' || tablename || ';' as recommended_command
FROM pg_stat_user_tables
WHERE (last_analyze IS NULL OR last_analyze < now() - INTERVAL '7 days')
    AND (last_autoanalyze IS NULL OR last_autoanalyze < now() - INTERVAL '7 days')
    AND n_mod_since_analyze > 100
ORDER BY n_mod_since_analyze DESC;

\echo ''

-- 大きすぎるインデックスの検出
\echo '3. 見直しが必要な大きなインデックス'
\echo '==============================='
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) as index_size,
    idx_scan as scans,
    CASE 
        WHEN idx_scan = 0 THEN 'DROP INDEX ' || indexname || ';'
        ELSE '使用頻度確認推奨'
    END as recommendation
FROM pg_stat_user_indexes
WHERE pg_relation_size(indexrelname::regclass) > 10 * 1024 * 1024  -- 10MB以上
ORDER BY pg_relation_size(indexrelname::regclass) DESC;

\echo ''

-- =============================================================================
-- 定期実行推奨コマンド
-- =============================================================================

\echo '=== 定期実行推奨コマンド ==='
\echo ''
\echo '-- 毎日実行推奨 --'
\echo 'VACUUM (VERBOSE, ANALYZE);'
\echo ''
\echo '-- 週次実行推奨 --'
\echo 'REINDEX DATABASE ' || current_database() || ';'
\echo ''
\echo '-- 月次実行推奨 --'
\echo 'VACUUM (FULL, VERBOSE, ANALYZE);'
\echo ''

-- =============================================================================
-- 設定確認
-- =============================================================================

\echo '=== PostgreSQL設定確認 ==='
\echo ''

SELECT 
    name,
    setting,
    unit,
    context,
    short_desc
FROM pg_settings
WHERE name IN (
    'shared_buffers',
    'work_mem',
    'maintenance_work_mem',
    'effective_cache_size',
    'random_page_cost',
    'seq_page_cost',
    'cpu_tuple_cost',
    'cpu_index_tuple_cost',
    'cpu_operator_cost',
    'effective_io_concurrency',
    'max_connections',
    'log_min_duration_statement',
    'log_checkpoints',
    'log_lock_waits',
    'deadlock_timeout',
    'statement_timeout',
    'lock_timeout'
)
ORDER BY name;

\echo ''
\echo '=== レポート完了 ==='
\echo ''