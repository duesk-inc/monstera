-- Point-in-Time Recovery (PITR) 監視設定のロールバック

-- トリガー削除
DROP TRIGGER IF EXISTS trigger_base_backup_history_updated_at ON base_backup_history;
DROP TRIGGER IF EXISTS trigger_wal_archive_history_updated_at ON wal_archive_history;
DROP TRIGGER IF EXISTS trigger_pitr_recovery_history_updated_at ON pitr_recovery_history;
DROP TRIGGER IF EXISTS trigger_pitr_alerts_updated_at ON pitr_alerts;
DROP TRIGGER IF EXISTS trigger_pitr_configuration_updated_at ON pitr_configuration;

-- 関数削除
DROP FUNCTION IF EXISTS update_pitr_updated_at();
DROP FUNCTION IF EXISTS record_wal_archive(VARCHAR(255), TEXT, VARCHAR(20), BIGINT, TEXT);
DROP FUNCTION IF EXISTS record_backup_completion(UUID, VARCHAR(20), BIGINT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS record_backup_start(VARCHAR(255), TEXT, VARCHAR(20), VARCHAR(50));
DROP FUNCTION IF EXISTS check_pitr_health();

-- ビュー削除
DROP VIEW IF EXISTS v_active_pitr_alerts;
DROP VIEW IF EXISTS v_wal_continuity_check;
DROP VIEW IF EXISTS v_backup_quality_report;
DROP VIEW IF EXISTS v_pitr_status_summary;

-- インデックス削除
DROP INDEX IF EXISTS idx_pitr_alerts_resolved;
DROP INDEX IF EXISTS idx_pitr_alerts_time;
DROP INDEX IF EXISTS idx_pitr_alerts_severity;
DROP INDEX IF EXISTS idx_pitr_alerts_type;

DROP INDEX IF EXISTS idx_pitr_recovery_history_target_time;
DROP INDEX IF EXISTS idx_pitr_recovery_history_start_time;
DROP INDEX IF EXISTS idx_pitr_recovery_history_status;

DROP INDEX IF EXISTS idx_wal_archive_history_retention;
DROP INDEX IF EXISTS idx_wal_archive_history_start_time;
DROP INDEX IF EXISTS idx_wal_archive_history_status;
DROP INDEX IF EXISTS idx_wal_archive_history_filename;

DROP INDEX IF EXISTS idx_base_backup_history_retention;
DROP INDEX IF EXISTS idx_base_backup_history_start_time;
DROP INDEX IF EXISTS idx_base_backup_history_status;

-- テーブル削除
DROP TABLE IF EXISTS pitr_configuration;
DROP TABLE IF EXISTS pitr_alerts;
DROP TABLE IF EXISTS pitr_recovery_history;
DROP TABLE IF EXISTS wal_archive_history;
DROP TABLE IF EXISTS base_backup_history;