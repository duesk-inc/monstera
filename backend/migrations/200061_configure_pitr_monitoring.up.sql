-- Point-in-Time Recovery (PITR) 監視設定
-- PostgreSQL PITR システムの状態監視とアラート機能

-- ベースバックアップ履歴テーブル
CREATE TABLE IF NOT EXISTS base_backup_history (
    backup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name VARCHAR(255) NOT NULL,
    backup_path TEXT NOT NULL,
    backup_size_bytes BIGINT NOT NULL DEFAULT 0,
    backup_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    backup_end_time TIMESTAMP WITH TIME ZONE,
    backup_duration_seconds INTEGER,
    backup_status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (backup_status IN ('running', 'completed', 'failed', 'cancelled')),
    backup_type VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (backup_type IN ('full', 'incremental', 'differential')),
    compression_type VARCHAR(20) DEFAULT 'gzip',
    encryption_enabled BOOLEAN NOT NULL DEFAULT false,
    lsn_start TEXT,
    lsn_end TEXT,
    wal_files_count INTEGER DEFAULT 0,
    error_message TEXT,
    backup_method VARCHAR(50) DEFAULT 'pg_basebackup',
    backup_host VARCHAR(255),
    backup_user VARCHAR(100),
    retention_until TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_time TIMESTAMP WITH TIME ZONE,
    verification_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- WALアーカイブ履歴テーブル
CREATE TABLE IF NOT EXISTS wal_archive_history (
    archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wal_filename VARCHAR(255) NOT NULL UNIQUE,
    wal_filepath TEXT NOT NULL,
    wal_size_bytes BIGINT NOT NULL DEFAULT 0,
    archive_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    archive_end_time TIMESTAMP WITH TIME ZONE,
    archive_duration_seconds INTEGER,
    archive_status VARCHAR(20) NOT NULL DEFAULT 'archiving' CHECK (archive_status IN ('archiving', 'completed', 'failed', 'missing')),
    compression_type VARCHAR(20) DEFAULT 'gzip',
    encryption_enabled BOOLEAN NOT NULL DEFAULT false,
    lsn_start TEXT,
    lsn_end TEXT,
    timeline_id INTEGER,
    checksum_md5 TEXT,
    checksum_sha256 TEXT,
    error_message TEXT,
    archive_location VARCHAR(500),
    is_accessible BOOLEAN NOT NULL DEFAULT true,
    last_verified TIMESTAMP WITH TIME ZONE,
    verification_result TEXT,
    retention_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PITR復旧履歴テーブル
CREATE TABLE IF NOT EXISTS pitr_recovery_history (
    recovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_name VARCHAR(255) NOT NULL,
    recovery_target_time TIMESTAMP WITH TIME ZONE,
    recovery_target_lsn TEXT,
    recovery_target_name VARCHAR(255),
    recovery_target_xid BIGINT,
    base_backup_id UUID REFERENCES base_backup_history(backup_id),
    recovery_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    recovery_end_time TIMESTAMP WITH TIME ZONE,
    recovery_duration_seconds INTEGER,
    recovery_status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (recovery_status IN ('running', 'completed', 'failed', 'cancelled')),
    recovery_type VARCHAR(30) NOT NULL DEFAULT 'pitr' CHECK (recovery_type IN ('pitr', 'full', 'archive_recovery')),
    target_database_name VARCHAR(100),
    target_data_directory TEXT,
    wal_files_applied INTEGER DEFAULT 0,
    last_applied_lsn TEXT,
    last_applied_timeline INTEGER,
    recovery_conf_used TEXT,
    error_message TEXT,
    rpo_minutes INTEGER, -- Recovery Point Objective達成度
    rto_minutes INTEGER, -- Recovery Time Objective達成度
    data_loss_detected BOOLEAN NOT NULL DEFAULT false,
    consistency_check_passed BOOLEAN,
    recovery_initiated_by VARCHAR(100),
    recovery_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PITRアラートテーブル
CREATE TABLE IF NOT EXISTS pitr_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'BACKUP_FAILED', 'BACKUP_OVERDUE', 'WAL_ARCHIVE_FAILED', 'WAL_MISSING',
        'STORAGE_FULL', 'RETENTION_VIOLATION', 'VERIFICATION_FAILED',
        'RPO_EXCEEDED', 'RTO_EXCEEDED', 'CONSISTENCY_ERROR'
    )),
    severity VARCHAR(20) NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')),
    message TEXT NOT NULL,
    details JSONB,
    source_table VARCHAR(100),
    source_id UUID,
    alert_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_time TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    notification_channels TEXT[], -- email, slack, sms等
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PITR設定テーブル
CREATE TABLE IF NOT EXISTS pitr_configuration (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_name VARCHAR(100) NOT NULL UNIQUE,
    environment VARCHAR(50) NOT NULL DEFAULT 'development',
    backup_schedule_cron VARCHAR(100) NOT NULL DEFAULT '0 2 * * *', -- 毎日午前2時
    backup_retention_days INTEGER NOT NULL DEFAULT 30,
    wal_retention_days INTEGER NOT NULL DEFAULT 7,
    backup_base_directory TEXT NOT NULL,
    wal_archive_directory TEXT NOT NULL,
    compression_enabled BOOLEAN NOT NULL DEFAULT true,
    compression_type VARCHAR(20) DEFAULT 'gzip',
    encryption_enabled BOOLEAN NOT NULL DEFAULT false,
    encryption_key_file TEXT,
    backup_parallel_jobs INTEGER NOT NULL DEFAULT 2,
    backup_rate_limit_mbps INTEGER, -- 帯域制限
    rpo_target_minutes INTEGER NOT NULL DEFAULT 15, -- 目標RPO
    rto_target_minutes INTEGER NOT NULL DEFAULT 240, -- 目標RTO
    alert_email_addresses TEXT[],
    alert_slack_webhook TEXT,
    health_check_interval_minutes INTEGER NOT NULL DEFAULT 5,
    auto_verify_backups BOOLEAN NOT NULL DEFAULT true,
    auto_cleanup_enabled BOOLEAN NOT NULL DEFAULT true,
    monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_base_backup_history_status ON base_backup_history(backup_status);
CREATE INDEX IF NOT EXISTS idx_base_backup_history_start_time ON base_backup_history(backup_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_base_backup_history_retention ON base_backup_history(retention_until);

CREATE INDEX IF NOT EXISTS idx_wal_archive_history_filename ON wal_archive_history(wal_filename);
CREATE INDEX IF NOT EXISTS idx_wal_archive_history_status ON wal_archive_history(archive_status);
CREATE INDEX IF NOT EXISTS idx_wal_archive_history_start_time ON wal_archive_history(archive_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_wal_archive_history_retention ON wal_archive_history(retention_until);

CREATE INDEX IF NOT EXISTS idx_pitr_recovery_history_status ON pitr_recovery_history(recovery_status);
CREATE INDEX IF NOT EXISTS idx_pitr_recovery_history_start_time ON pitr_recovery_history(recovery_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_pitr_recovery_history_target_time ON pitr_recovery_history(recovery_target_time);

CREATE INDEX IF NOT EXISTS idx_pitr_alerts_type ON pitr_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_pitr_alerts_severity ON pitr_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_pitr_alerts_time ON pitr_alerts(alert_time DESC);
CREATE INDEX IF NOT EXISTS idx_pitr_alerts_resolved ON pitr_alerts(is_resolved);

-- PITRステータス監視ビュー
CREATE OR REPLACE VIEW v_pitr_status_summary AS
SELECT 
    -- バックアップ統計
    (SELECT COUNT(*) FROM base_backup_history WHERE backup_status = 'completed' AND backup_start_time > CURRENT_TIMESTAMP - INTERVAL '7 days') as successful_backups_7d,
    (SELECT COUNT(*) FROM base_backup_history WHERE backup_status = 'failed' AND backup_start_time > CURRENT_TIMESTAMP - INTERVAL '7 days') as failed_backups_7d,
    (SELECT backup_start_time FROM base_backup_history WHERE backup_status = 'completed' ORDER BY backup_start_time DESC LIMIT 1) as last_successful_backup,
    (SELECT SUM(backup_size_bytes) FROM base_backup_history WHERE backup_status = 'completed' AND backup_start_time > CURRENT_TIMESTAMP - INTERVAL '30 days') as total_backup_size_30d,
    
    -- WALアーカイブ統計
    (SELECT COUNT(*) FROM wal_archive_history WHERE archive_status = 'completed' AND archive_start_time > CURRENT_TIMESTAMP - INTERVAL '24 hours') as wal_archived_24h,
    (SELECT COUNT(*) FROM wal_archive_history WHERE archive_status = 'failed' AND archive_start_time > CURRENT_TIMESTAMP - INTERVAL '24 hours') as wal_failed_24h,
    (SELECT archive_start_time FROM wal_archive_history WHERE archive_status = 'completed' ORDER BY archive_start_time DESC LIMIT 1) as last_wal_archive,
    (SELECT SUM(wal_size_bytes) FROM wal_archive_history WHERE archive_status = 'completed' AND archive_start_time > CURRENT_TIMESTAMP - INTERVAL '7 days') as total_wal_size_7d,
    
    -- 復旧統計
    (SELECT COUNT(*) FROM pitr_recovery_history WHERE recovery_start_time > CURRENT_TIMESTAMP - INTERVAL '30 days') as recovery_attempts_30d,
    (SELECT COUNT(*) FROM pitr_recovery_history WHERE recovery_status = 'completed' AND recovery_start_time > CURRENT_TIMESTAMP - INTERVAL '30 days') as successful_recoveries_30d,
    (SELECT AVG(recovery_duration_seconds) FROM pitr_recovery_history WHERE recovery_status = 'completed' AND recovery_start_time > CURRENT_TIMESTAMP - INTERVAL '30 days') as avg_recovery_time_seconds,
    
    -- アラート統計
    (SELECT COUNT(*) FROM pitr_alerts WHERE is_resolved = false) as active_alerts,
    (SELECT COUNT(*) FROM pitr_alerts WHERE severity IN ('CRITICAL', 'EMERGENCY') AND is_resolved = false) as critical_alerts,
    (SELECT COUNT(*) FROM pitr_alerts WHERE alert_time > CURRENT_TIMESTAMP - INTERVAL '24 hours') as alerts_24h,
    
    -- RPO/RTO達成度
    (SELECT config.rpo_target_minutes FROM pitr_configuration config WHERE config.is_active = true LIMIT 1) as rpo_target_minutes,
    (SELECT config.rto_target_minutes FROM pitr_configuration config WHERE config.is_active = true LIMIT 1) as rto_target_minutes,
    CASE 
        WHEN (SELECT archive_start_time FROM wal_archive_history WHERE archive_status = 'completed' ORDER BY archive_start_time DESC LIMIT 1) > 
             CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN true
        ELSE false
    END as rpo_within_target,
    
    -- ストレージ使用量
    (SELECT backup_base_directory FROM pitr_configuration WHERE is_active = true LIMIT 1) as backup_directory,
    (SELECT wal_archive_directory FROM pitr_configuration WHERE is_active = true LIMIT 1) as wal_directory,
    
    CURRENT_TIMESTAMP as summary_time;

-- バックアップ品質レポートビュー
CREATE OR REPLACE VIEW v_backup_quality_report AS
SELECT 
    DATE_TRUNC('day', backup_start_time) as backup_date,
    COUNT(*) as total_backups,
    COUNT(*) FILTER (WHERE backup_status = 'completed') as successful_backups,
    COUNT(*) FILTER (WHERE backup_status = 'failed') as failed_backups,
    ROUND(100.0 * COUNT(*) FILTER (WHERE backup_status = 'completed') / COUNT(*), 2) as success_rate_percent,
    AVG(backup_duration_seconds) FILTER (WHERE backup_status = 'completed') as avg_duration_seconds,
    SUM(backup_size_bytes) FILTER (WHERE backup_status = 'completed') as total_size_bytes,
    COUNT(*) FILTER (WHERE is_verified = true AND backup_status = 'completed') as verified_backups,
    ROUND(100.0 * COUNT(*) FILTER (WHERE is_verified = true AND backup_status = 'completed') / COUNT(*) FILTER (WHERE backup_status = 'completed'), 2) as verification_rate_percent
FROM base_backup_history 
WHERE backup_start_time > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', backup_start_time)
ORDER BY backup_date DESC;

-- WAL連続性チェックビュー
CREATE OR REPLACE VIEW v_wal_continuity_check AS
WITH wal_sequence AS (
    SELECT 
        wal_filename,
        archive_start_time,
        archive_status,
        LAG(wal_filename) OVER (ORDER BY archive_start_time) as prev_wal_filename,
        LEAD(wal_filename) OVER (ORDER BY archive_start_time) as next_wal_filename
    FROM wal_archive_history 
    WHERE archive_start_time > CURRENT_TIMESTAMP - INTERVAL '7 days'
    ORDER BY archive_start_time
)
SELECT 
    wal_filename,
    archive_start_time,
    archive_status,
    prev_wal_filename,
    next_wal_filename,
    CASE 
        WHEN archive_status != 'completed' THEN 'ARCHIVE_FAILED'
        WHEN prev_wal_filename IS NULL THEN 'FIRST_WAL'
        WHEN next_wal_filename IS NULL THEN 'LATEST_WAL'
        ELSE 'NORMAL'
    END as continuity_status,
    CASE 
        WHEN archive_status != 'completed' THEN 'WALアーカイブが失敗しています'
        WHEN prev_wal_filename IS NULL THEN '期間内の最初のWALファイルです'
        WHEN next_wal_filename IS NULL THEN '最新のWALファイルです'
        ELSE 'WAL連続性は正常です'
    END as continuity_message
FROM wal_sequence
ORDER BY archive_start_time DESC;

-- アクティブアラートビュー
CREATE OR REPLACE VIEW v_active_pitr_alerts AS
SELECT 
    alert_id,
    alert_type,
    severity,
    message,
    details,
    alert_time,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - alert_time))/60 as minutes_since_alert,
    CASE 
        WHEN severity = 'EMERGENCY' THEN 1
        WHEN severity = 'CRITICAL' THEN 2
        WHEN severity = 'WARNING' THEN 3
        ELSE 4
    END as severity_order,
    source_table,
    source_id
FROM pitr_alerts 
WHERE is_resolved = false
ORDER BY severity_order, alert_time DESC;

-- PITRヘルスチェック関数
CREATE OR REPLACE FUNCTION check_pitr_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    message TEXT,
    recommendation TEXT
) AS $$
DECLARE
    config_rec RECORD;
    last_backup_time TIMESTAMP WITH TIME ZONE;
    last_wal_time TIMESTAMP WITH TIME ZONE;
    backup_age_hours INTEGER;
    wal_age_minutes INTEGER;
BEGIN
    -- アクティブな設定を取得
    SELECT * INTO config_rec FROM pitr_configuration WHERE is_active = true LIMIT 1;
    
    IF config_rec IS NULL THEN
        RETURN QUERY SELECT 'Configuration'::TEXT, 'ERROR'::TEXT, 'PITR設定が見つかりません'::TEXT, 'pitr_configurationテーブルに設定を追加してください'::TEXT;
        RETURN;
    END IF;
    
    -- 最新バックアップチェック
    SELECT backup_start_time INTO last_backup_time 
    FROM base_backup_history 
    WHERE backup_status = 'completed' 
    ORDER BY backup_start_time DESC 
    LIMIT 1;
    
    IF last_backup_time IS NULL THEN
        RETURN QUERY SELECT 'Latest Backup'::TEXT, 'ERROR'::TEXT, '完了したバックアップが見つかりません'::TEXT, 'ベースバックアップを実行してください'::TEXT;
    ELSE
        backup_age_hours := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_backup_time))/3600;
        IF backup_age_hours > 48 THEN
            RETURN QUERY SELECT 'Latest Backup'::TEXT, 'WARNING'::TEXT, 
                format('最新バックアップが%s時間前です', backup_age_hours), 
                '新しいベースバックアップの実行を検討してください'::TEXT;
        ELSE
            RETURN QUERY SELECT 'Latest Backup'::TEXT, 'OK'::TEXT, 
                format('最新バックアップは%s時間前です', backup_age_hours), 
                ''::TEXT;
        END IF;
    END IF;
    
    -- WALアーカイブチェック
    SELECT archive_start_time INTO last_wal_time 
    FROM wal_archive_history 
    WHERE archive_status = 'completed' 
    ORDER BY archive_start_time DESC 
    LIMIT 1;
    
    IF last_wal_time IS NULL THEN
        RETURN QUERY SELECT 'WAL Archive'::TEXT, 'ERROR'::TEXT, 'WALアーカイブが見つかりません'::TEXT, 'WALアーカイブ設定を確認してください'::TEXT;
    ELSE
        wal_age_minutes := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_wal_time))/60;
        IF wal_age_minutes > config_rec.rpo_target_minutes * 2 THEN
            RETURN QUERY SELECT 'WAL Archive'::TEXT, 'CRITICAL'::TEXT, 
                format('最新WALアーカイブが%s分前です (RPO目標: %s分)', wal_age_minutes, config_rec.rpo_target_minutes), 
                'WALアーカイブプロセスを確認してください'::TEXT;
        ELSIF wal_age_minutes > config_rec.rpo_target_minutes THEN
            RETURN QUERY SELECT 'WAL Archive'::TEXT, 'WARNING'::TEXT, 
                format('最新WALアーカイブが%s分前です (RPO目標: %s分)', wal_age_minutes, config_rec.rpo_target_minutes), 
                'WALアーカイブの頻度を確認してください'::TEXT;
        ELSE
            RETURN QUERY SELECT 'WAL Archive'::TEXT, 'OK'::TEXT, 
                format('最新WALアーカイブは%s分前です', wal_age_minutes), 
                ''::TEXT;
        END IF;
    END IF;
    
    -- アクティブアラートチェック
    IF EXISTS (SELECT 1 FROM pitr_alerts WHERE is_resolved = false AND severity IN ('CRITICAL', 'EMERGENCY')) THEN
        RETURN QUERY SELECT 'Active Alerts'::TEXT, 'CRITICAL'::TEXT, '重要なアラートが発生しています'::TEXT, 'v_active_pitr_alertsビューでアラートを確認してください'::TEXT;
    ELSIF EXISTS (SELECT 1 FROM pitr_alerts WHERE is_resolved = false) THEN
        RETURN QUERY SELECT 'Active Alerts'::TEXT, 'WARNING'::TEXT, '未解決のアラートがあります'::TEXT, 'アラートの内容を確認してください'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Active Alerts'::TEXT, 'OK'::TEXT, 'アクティブなアラートはありません'::TEXT, ''::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- バックアップ実行記録関数
CREATE OR REPLACE FUNCTION record_backup_start(
    p_backup_name VARCHAR(255),
    p_backup_path TEXT,
    p_backup_type VARCHAR(20) DEFAULT 'full',
    p_backup_method VARCHAR(50) DEFAULT 'pg_basebackup'
)
RETURNS UUID AS $$
DECLARE
    backup_uuid UUID;
BEGIN
    INSERT INTO base_backup_history (
        backup_name,
        backup_path,
        backup_start_time,
        backup_status,
        backup_type,
        backup_method,
        backup_host,
        backup_user
    ) VALUES (
        p_backup_name,
        p_backup_path,
        CURRENT_TIMESTAMP,
        'running',
        p_backup_type,
        p_backup_method,
        inet_server_addr(),
        current_user
    ) RETURNING backup_id INTO backup_uuid;
    
    RETURN backup_uuid;
END;
$$ LANGUAGE plpgsql;

-- バックアップ完了記録関数
CREATE OR REPLACE FUNCTION record_backup_completion(
    p_backup_id UUID,
    p_status VARCHAR(20),
    p_size_bytes BIGINT DEFAULT 0,
    p_lsn_start TEXT DEFAULT NULL,
    p_lsn_end TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 開始時刻を取得
    SELECT backup_start_time INTO start_time 
    FROM base_backup_history 
    WHERE backup_id = p_backup_id;
    
    IF start_time IS NULL THEN
        RETURN false;
    END IF;
    
    -- バックアップ記録を更新
    UPDATE base_backup_history SET
        backup_end_time = CURRENT_TIMESTAMP,
        backup_duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)),
        backup_status = p_status,
        backup_size_bytes = p_size_bytes,
        lsn_start = p_lsn_start,
        lsn_end = p_lsn_end,
        error_message = p_error_message,
        updated_at = CURRENT_TIMESTAMP
    WHERE backup_id = p_backup_id;
    
    -- アラート生成
    IF p_status = 'failed' THEN
        INSERT INTO pitr_alerts (alert_type, severity, message, details, source_table, source_id)
        VALUES (
            'BACKUP_FAILED',
            'CRITICAL',
            'ベースバックアップが失敗しました',
            jsonb_build_object(
                'backup_id', p_backup_id,
                'error_message', p_error_message,
                'duration_seconds', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))
            ),
            'base_backup_history',
            p_backup_id
        );
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- WALアーカイブ記録関数
CREATE OR REPLACE FUNCTION record_wal_archive(
    p_wal_filename VARCHAR(255),
    p_wal_filepath TEXT,
    p_status VARCHAR(20),
    p_size_bytes BIGINT DEFAULT 0,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    archive_uuid UUID;
BEGIN
    INSERT INTO wal_archive_history (
        wal_filename,
        wal_filepath,
        archive_start_time,
        archive_end_time,
        archive_duration_seconds,
        archive_status,
        wal_size_bytes,
        error_message
    ) VALUES (
        p_wal_filename,
        p_wal_filepath,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        0, -- 即座に完了と仮定
        p_status,
        p_size_bytes,
        p_error_message
    ) RETURNING archive_id INTO archive_uuid;
    
    -- アラート生成
    IF p_status = 'failed' THEN
        INSERT INTO pitr_alerts (alert_type, severity, message, details, source_table, source_id)
        VALUES (
            'WAL_ARCHIVE_FAILED',
            'WARNING',
            format('WALファイル %s のアーカイブが失敗しました', p_wal_filename),
            jsonb_build_object(
                'wal_filename', p_wal_filename,
                'error_message', p_error_message
            ),
            'wal_archive_history',
            archive_uuid
        );
    END IF;
    
    RETURN archive_uuid;
END;
$$ LANGUAGE plpgsql;

-- PITR設定データ挿入
INSERT INTO pitr_configuration (
    config_name,
    environment,
    backup_schedule_cron,
    backup_retention_days,
    wal_retention_days,
    backup_base_directory,
    wal_archive_directory,
    compression_enabled,
    compression_type,
    encryption_enabled,
    rpo_target_minutes,
    rto_target_minutes,
    health_check_interval_minutes,
    auto_verify_backups,
    auto_cleanup_enabled,
    monitoring_enabled,
    is_active
) VALUES
(
    'default_pitr_config',
    COALESCE(current_setting('app.environment', true), 'development'),
    '0 2 * * *', -- 毎日午前2時
    30, -- 30日間保持
    7,  -- WALは7日間保持
    '/backup/postgresql/base',
    '/backup/postgresql/wal_archives',
    true,
    'gzip',
    false, -- 暗号化は環境に応じて設定
    15,  -- RPO目標: 15分
    240, -- RTO目標: 4時間
    5,   -- 5分間隔でヘルスチェック
    true,
    true,
    true,
    true
) ON CONFLICT (config_name) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP;

-- 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_pitr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 自動更新トリガー作成
CREATE TRIGGER trigger_base_backup_history_updated_at
    BEFORE UPDATE ON base_backup_history
    FOR EACH ROW
    EXECUTE FUNCTION update_pitr_updated_at();

CREATE TRIGGER trigger_wal_archive_history_updated_at
    BEFORE UPDATE ON wal_archive_history
    FOR EACH ROW
    EXECUTE FUNCTION update_pitr_updated_at();

CREATE TRIGGER trigger_pitr_recovery_history_updated_at
    BEFORE UPDATE ON pitr_recovery_history
    FOR EACH ROW
    EXECUTE FUNCTION update_pitr_updated_at();

CREATE TRIGGER trigger_pitr_alerts_updated_at
    BEFORE UPDATE ON pitr_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_pitr_updated_at();

CREATE TRIGGER trigger_pitr_configuration_updated_at
    BEFORE UPDATE ON pitr_configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_pitr_updated_at();