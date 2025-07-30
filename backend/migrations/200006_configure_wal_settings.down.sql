-- WAL設定関連オブジェクトの削除

-- トリガーの削除
DROP TRIGGER IF EXISTS trg_update_wal_archive_status_updated_at ON wal_archive_status;

-- 関数の削除
DROP FUNCTION IF EXISTS update_wal_archive_status_updated_at();
DROP FUNCTION IF EXISTS cleanup_old_wal_archives(INTEGER);
DROP FUNCTION IF EXISTS verify_wal_archives(INTEGER);
DROP FUNCTION IF EXISTS record_wal_statistics();

-- ビューの削除
DROP VIEW IF EXISTS v_replication_status;
DROP VIEW IF EXISTS v_wal_monitoring;

-- テーブルの削除
DROP TABLE IF EXISTS wal_statistics;
DROP TABLE IF EXISTS wal_archive_status;