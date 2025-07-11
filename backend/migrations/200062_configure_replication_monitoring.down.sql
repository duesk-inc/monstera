-- ストリーミングレプリケーション監視設定のロールバック

-- トリガー削除
DROP TRIGGER IF EXISTS trigger_replication_configuration_updated_at ON replication_configuration;
DROP TRIGGER IF EXISTS trigger_replication_alerts_updated_at ON replication_alerts;

-- 関数削除
DROP FUNCTION IF EXISTS record_replication_event(VARCHAR(50), VARCHAR(100), TEXT, JSONB, VARCHAR(20));
DROP FUNCTION IF EXISTS record_replication_status(VARCHAR(100), BOOLEAN, JSONB);
DROP FUNCTION IF EXISTS check_replication_health();

-- ビュー削除
DROP VIEW IF EXISTS v_replication_lag_trend;
DROP VIEW IF EXISTS v_replication_topology;
DROP VIEW IF EXISTS v_active_replication_alerts;
DROP VIEW IF EXISTS v_replication_status_summary;

-- インデックス削除
DROP INDEX IF EXISTS idx_standby_details_node_time;

DROP INDEX IF EXISTS idx_replication_alerts_time;
DROP INDEX IF EXISTS idx_replication_alerts_unresolved;
DROP INDEX IF EXISTS idx_replication_alerts_node;

DROP INDEX IF EXISTS idx_replication_events_unresolved;
DROP INDEX IF EXISTS idx_replication_events_type;
DROP INDEX IF EXISTS idx_replication_events_node_time;

DROP INDEX IF EXISTS idx_replication_status_history_lag;
DROP INDEX IF EXISTS idx_replication_status_history_node_time;

-- テーブル削除
DROP TABLE IF EXISTS standby_details;
DROP TABLE IF EXISTS replication_alerts;
DROP TABLE IF EXISTS replication_events;
DROP TABLE IF EXISTS replication_status_history;
DROP TABLE IF EXISTS replication_configuration;