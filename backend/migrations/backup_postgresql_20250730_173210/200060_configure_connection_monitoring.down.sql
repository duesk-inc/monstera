-- コネクション監視設定の削除

-- トリガーの削除
DROP TRIGGER IF EXISTS trg_connection_alerts_updated_at ON connection_alerts;
DROP TRIGGER IF EXISTS trg_connection_pool_settings_updated_at ON connection_pool_settings;

-- 関数の削除
DROP FUNCTION IF EXISTS update_connection_monitoring_updated_at();
DROP FUNCTION IF EXISTS emergency_connection_cleanup(integer, integer);
DROP FUNCTION IF EXISTS check_connection_alerts();
DROP FUNCTION IF EXISTS record_connection_stats();

-- ビューの削除
DROP VIEW IF EXISTS v_connection_monitoring_summary;
DROP VIEW IF EXISTS v_problematic_connections;
DROP VIEW IF EXISTS v_connections_by_application;
DROP VIEW IF EXISTS v_current_connections;

-- テーブルの削除
DROP TABLE IF EXISTS connection_pool_settings;
DROP TABLE IF EXISTS connection_alerts;
DROP TABLE IF EXISTS connection_monitoring_history;