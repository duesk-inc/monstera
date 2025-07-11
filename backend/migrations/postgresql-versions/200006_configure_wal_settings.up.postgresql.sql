-- WAL（Write-Ahead Logging）設定の最適化
-- このマイグレーションはPostgreSQL専用のWAL設定を適用します
-- 注意: これらの設定の多くはpostgresql.confまたはALTER SYSTEMで設定する必要があります

-- WALアーカイブ用ディレクトリの作成（Docker環境では事前に作成が必要）
-- CREATE DIRECTORY は PostgreSQL には存在しないため、OSレベルで作成

-- WALアーカイブ状態を管理するテーブル
CREATE TABLE IF NOT EXISTS wal_archive_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    wal_file_name VARCHAR(255) NOT NULL,
    archive_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    checksum VARCHAR(64),
    status VARCHAR(20) NOT NULL DEFAULT 'archived' CHECK (status IN ('archived', 'verified', 'failed', 'deleted')),
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_wal_archive_status_archived_at ON wal_archive_status(archived_at);
CREATE INDEX idx_wal_archive_status_wal_file ON wal_archive_status(wal_file_name);
CREATE INDEX idx_wal_archive_status_status ON wal_archive_status(status);

-- WAL統計情報を記録するテーブル
CREATE TABLE IF NOT EXISTS wal_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    wal_bytes_written BIGINT NOT NULL,
    wal_bytes_per_second FLOAT,
    checkpoint_count_timed INTEGER,
    checkpoint_count_requested INTEGER,
    checkpoint_write_time_ms FLOAT,
    checkpoint_sync_time_ms FLOAT,
    buffers_checkpoint BIGINT,
    buffers_clean BIGINT,
    buffers_backend BIGINT,
    max_wal_size_mb INTEGER,
    current_wal_size_mb INTEGER,
    wal_compression_saved_bytes BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_wal_statistics_recorded_at ON wal_statistics(recorded_at);

-- WAL監視用のビュー
CREATE OR REPLACE VIEW v_wal_monitoring AS
SELECT 
    -- 現在のWAL位置
    pg_current_wal_lsn() as current_wal_lsn,
    pg_walfile_name(pg_current_wal_lsn()) as current_wal_file,
    
    -- WAL生成統計
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0'::pg_lsn)) as total_wal_generated,
    
    -- チェックポイント統計
    (SELECT checkpoints_timed FROM pg_stat_bgwriter) as checkpoints_timed,
    (SELECT checkpoints_req FROM pg_stat_bgwriter) as checkpoints_requested,
    
    -- バッファ統計
    (SELECT buffers_checkpoint FROM pg_stat_bgwriter) as buffers_checkpoint,
    (SELECT buffers_clean FROM pg_stat_bgwriter) as buffers_clean,
    (SELECT buffers_backend FROM pg_stat_bgwriter) as buffers_backend,
    
    -- 設定値
    current_setting('max_wal_size') as max_wal_size,
    current_setting('min_wal_size') as min_wal_size,
    current_setting('wal_level') as wal_level,
    current_setting('archive_mode') as archive_mode,
    current_setting('wal_compression') as wal_compression;

-- レプリケーション監視用のビュー
CREATE OR REPLACE VIEW v_replication_status AS
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) as replication_lag_bytes,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) as replication_lag_size,
    sync_priority,
    sync_state
FROM pg_stat_replication
ORDER BY application_name;

-- WAL統計を定期的に記録する関数
CREATE OR REPLACE FUNCTION record_wal_statistics()
RETURNS void AS $$
DECLARE
    v_checkpoint_timed INTEGER;
    v_checkpoint_req INTEGER;
    v_checkpoint_write_time FLOAT;
    v_checkpoint_sync_time FLOAT;
    v_buffers_checkpoint BIGINT;
    v_buffers_clean BIGINT;
    v_buffers_backend BIGINT;
    v_current_wal_lsn pg_lsn;
    v_last_wal_lsn pg_lsn;
    v_wal_bytes BIGINT;
    v_interval_seconds FLOAT;
    v_bytes_per_second FLOAT;
BEGIN
    -- 最新のチェックポイント統計を取得
    SELECT 
        checkpoints_timed,
        checkpoints_req,
        checkpoint_write_time,
        checkpoint_sync_time,
        buffers_checkpoint,
        buffers_clean,
        buffers_backend
    INTO
        v_checkpoint_timed,
        v_checkpoint_req,
        v_checkpoint_write_time,
        v_checkpoint_sync_time,
        v_buffers_checkpoint,
        v_buffers_clean,
        v_buffers_backend
    FROM pg_stat_bgwriter;
    
    -- 現在のWAL位置を取得
    v_current_wal_lsn := pg_current_wal_lsn();
    
    -- 前回の記録から経過したWALバイト数を計算
    SELECT 
        recorded_at,
        wal_bytes_written
    INTO
        v_interval_seconds,
        v_last_wal_lsn
    FROM wal_statistics
    ORDER BY recorded_at DESC
    LIMIT 1;
    
    IF v_last_wal_lsn IS NOT NULL THEN
        v_wal_bytes := pg_wal_lsn_diff(v_current_wal_lsn, '0/0'::pg_lsn);
        v_bytes_per_second := v_wal_bytes / NULLIF(EXTRACT(EPOCH FROM (NOW() - v_interval_seconds::timestamp)), 0);
    ELSE
        v_wal_bytes := pg_wal_lsn_diff(v_current_wal_lsn, '0/0'::pg_lsn);
        v_bytes_per_second := NULL;
    END IF;
    
    -- 統計を記録
    INSERT INTO wal_statistics (
        wal_bytes_written,
        wal_bytes_per_second,
        checkpoint_count_timed,
        checkpoint_count_requested,
        checkpoint_write_time_ms,
        checkpoint_sync_time_ms,
        buffers_checkpoint,
        buffers_clean,
        buffers_backend,
        max_wal_size_mb,
        current_wal_size_mb
    ) VALUES (
        v_wal_bytes,
        v_bytes_per_second,
        v_checkpoint_timed,
        v_checkpoint_req,
        v_checkpoint_write_time,
        v_checkpoint_sync_time,
        v_buffers_checkpoint,
        v_buffers_clean,
        v_buffers_backend,
        pg_size_bytes(current_setting('max_wal_size')) / 1024 / 1024,
        pg_size_bytes(pg_current_wal_lsn()::text) / 1024 / 1024
    );
    
    -- 古い統計データを削除（30日以上）
    DELETE FROM wal_statistics
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    
END;
$$ LANGUAGE plpgsql;

-- WALアーカイブの検証関数
CREATE OR REPLACE FUNCTION verify_wal_archives(days_to_check INTEGER DEFAULT 7)
RETURNS TABLE (
    status VARCHAR(20),
    count BIGINT,
    oldest_file TIMESTAMP,
    newest_file TIMESTAMP,
    total_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        was.status,
        COUNT(*) as count,
        MIN(was.archived_at) as oldest_file,
        MAX(was.archived_at) as newest_file,
        ROUND(SUM(was.file_size) / 1024.0 / 1024.0, 2) as total_size_mb
    FROM wal_archive_status was
    WHERE was.archived_at >= NOW() - (days_to_check || ' days')::INTERVAL
    GROUP BY was.status
    ORDER BY was.status;
END;
$$ LANGUAGE plpgsql;

-- WALアーカイブのクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_old_wal_archives(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- 古いアーカイブレコードを削除済みとしてマーク
    UPDATE wal_archive_status
    SET 
        status = 'deleted',
        updated_at = NOW()
    WHERE 
        archived_at < NOW() - (retention_days || ' days')::INTERVAL
        AND status != 'deleted';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- 90日以上前の削除済みレコードを物理削除
    DELETE FROM wal_archive_status
    WHERE 
        status = 'deleted'
        AND updated_at < NOW() - INTERVAL '90 days';
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_wal_archive_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wal_archive_status_updated_at
    BEFORE UPDATE ON wal_archive_status
    FOR EACH ROW
    EXECUTE FUNCTION update_wal_archive_status_updated_at();

-- コメント
COMMENT ON TABLE wal_archive_status IS 'WALアーカイブの状態を管理するテーブル';
COMMENT ON TABLE wal_statistics IS 'WAL統計情報を定期的に記録するテーブル';
COMMENT ON VIEW v_wal_monitoring IS 'WAL関連の監視情報を提供するビュー';
COMMENT ON VIEW v_replication_status IS 'レプリケーション状態を監視するビュー';
COMMENT ON FUNCTION record_wal_statistics() IS 'WAL統計を定期的に記録する関数';
COMMENT ON FUNCTION verify_wal_archives(INTEGER) IS 'WALアーカイブの整合性を検証する関数';
COMMENT ON FUNCTION cleanup_old_wal_archives(INTEGER) IS '古いWALアーカイブレコードをクリーンアップする関数';