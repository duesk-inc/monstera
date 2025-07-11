-- バックアップ検証管理テーブルのロールバック

-- トリガー削除
DROP TRIGGER IF EXISTS trigger_backup_verification_config_updated_at ON backup_verification_config;

-- 関数削除
DROP FUNCTION IF EXISTS update_verification_updated_at();
DROP FUNCTION IF EXISTS record_verification_result(UUID, VARCHAR(20), JSONB);
DROP FUNCTION IF EXISTS execute_backup_verification(UUID, UUID, VARCHAR(50));

-- ビュー削除
DROP VIEW IF EXISTS v_verification_success_trend;
DROP VIEW IF EXISTS v_active_verification_alerts;
DROP VIEW IF EXISTS v_verification_status_summary;

-- インデックス削除
DROP INDEX IF EXISTS idx_metrics_summary_date;

DROP INDEX IF EXISTS idx_verification_alerts_severity;
DROP INDEX IF EXISTS idx_verification_alerts_unack;

DROP INDEX IF EXISTS idx_data_integrity_mismatch;
DROP INDEX IF EXISTS idx_data_integrity_table;
DROP INDEX IF EXISTS idx_data_integrity_verification;

DROP INDEX IF EXISTS idx_wal_verification_gap;
DROP INDEX IF EXISTS idx_wal_verification_timeline;
DROP INDEX IF EXISTS idx_wal_verification_verification;

DROP INDEX IF EXISTS idx_verification_history_time;
DROP INDEX IF EXISTS idx_verification_history_status;
DROP INDEX IF EXISTS idx_verification_history_backup;
DROP INDEX IF EXISTS idx_verification_history_config;

-- テーブル削除
DROP TABLE IF EXISTS verification_metrics_summary;
DROP TABLE IF EXISTS verification_alerts;
DROP TABLE IF EXISTS data_integrity_details;
DROP TABLE IF EXISTS wal_verification_details;
DROP TABLE IF EXISTS backup_verification_history;
DROP TABLE IF EXISTS backup_verification_config;