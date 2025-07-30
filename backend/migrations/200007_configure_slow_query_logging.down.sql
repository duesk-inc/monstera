-- スロークエリログ設定の削除

-- トリガーの削除
DROP TRIGGER IF EXISTS trg_slow_query_alerts_updated_at ON slow_query_alerts;
DROP TRIGGER IF EXISTS trg_slow_query_history_updated_at ON slow_query_history;

-- 関数の削除
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS reset_query_stats();
DROP FUNCTION IF EXISTS check_slow_query_alerts();
DROP FUNCTION IF EXISTS record_slow_query_stats();

-- ビューの削除
DROP VIEW IF EXISTS v_most_frequent_queries;
DROP VIEW IF EXISTS v_top_slow_queries;
DROP VIEW IF EXISTS v_slow_query_stats;

-- テーブルの削除
DROP TABLE IF EXISTS slow_query_alert_history;
DROP TABLE IF EXISTS slow_query_alerts;
DROP TABLE IF EXISTS slow_query_history;

-- 拡張機能の削除（注意: 他でも使用している可能性があるため、通常は削除しない）
-- DROP EXTENSION IF EXISTS pg_stat_statements;