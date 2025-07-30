-- バックアップ検証管理テーブル
-- バックアップの検証結果と履歴を追跡

-- バックアップ検証設定テーブル
CREATE TABLE IF NOT EXISTS backup_verification_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_name VARCHAR(100) NOT NULL UNIQUE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN (
        'CHECKSUM', 'RESTORE_TEST', 'WAL_CONTINUITY', 
        'DATA_INTEGRITY', 'PERFORMANCE_TEST', 'FULL_VALIDATION'
    )),
    schedule_cron VARCHAR(100), -- Cron expression for scheduling
    enabled BOOLEAN NOT NULL DEFAULT true,
    target_backup_type VARCHAR(50) CHECK (target_backup_type IN ('BASE', 'WAL', 'LOGICAL', 'ALL')),
    retention_days INTEGER NOT NULL DEFAULT 30,
    timeout_minutes INTEGER NOT NULL DEFAULT 180,
    -- 検証パラメータ
    sample_size_percent INTEGER DEFAULT 10, -- サンプリング検証の割合
    parallel_jobs INTEGER DEFAULT 2,
    restore_target_path TEXT,
    performance_threshold_minutes INTEGER, -- パフォーマンステストの閾値
    -- アラート設定
    alert_on_failure BOOLEAN NOT NULL DEFAULT true,
    alert_channels TEXT[], -- Email, Slack, Webhook等
    alert_threshold_consecutive_failures INTEGER DEFAULT 1,
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- バックアップ検証実行履歴
CREATE TABLE IF NOT EXISTS backup_verification_history (
    verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES backup_verification_config(config_id),
    backup_id UUID REFERENCES base_backup_history(backup_id),
    verification_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING' CHECK (status IN (
        'RUNNING', 'SUCCESS', 'FAILED', 'WARNING', 'TIMEOUT', 'SKIPPED'
    )),
    -- 検証結果
    files_checked INTEGER DEFAULT 0,
    files_failed INTEGER DEFAULT 0,
    total_size_bytes BIGINT,
    checksum_matches INTEGER DEFAULT 0,
    checksum_failures INTEGER DEFAULT 0,
    -- リストアテスト結果
    restore_success BOOLEAN,
    restore_duration_seconds INTEGER,
    data_validation_passed BOOLEAN,
    row_count_source BIGINT,
    row_count_restored BIGINT,
    -- パフォーマンスメトリクス
    cpu_usage_percent NUMERIC(5,2),
    memory_usage_mb INTEGER,
    disk_io_mb_per_sec NUMERIC(10,2),
    network_mb_per_sec NUMERIC(10,2),
    -- エラー情報
    error_message TEXT,
    error_details JSONB,
    warnings TEXT[],
    -- 実行環境
    hostname VARCHAR(255),
    pg_version VARCHAR(50),
    os_version VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- WAL検証詳細テーブル
CREATE TABLE IF NOT EXISTS wal_verification_details (
    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID REFERENCES backup_verification_history(verification_id) ON DELETE CASCADE,
    timeline_id INTEGER NOT NULL,
    start_lsn TEXT NOT NULL,
    end_lsn TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    file_count INTEGER NOT NULL DEFAULT 0,
    total_size_bytes BIGINT NOT NULL DEFAULT 0,
    missing_segments TEXT[],
    corrupted_segments TEXT[],
    gap_detected BOOLEAN NOT NULL DEFAULT false,
    gap_start_lsn TEXT,
    gap_end_lsn TEXT,
    continuity_check_passed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- データ整合性検証詳細
CREATE TABLE IF NOT EXISTS data_integrity_details (
    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID REFERENCES backup_verification_history(verification_id) ON DELETE CASCADE,
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    check_type VARCHAR(50) NOT NULL CHECK (check_type IN (
        'ROW_COUNT', 'CHECKSUM', 'SAMPLE_DATA', 'FOREIGN_KEY', 'UNIQUE_CONSTRAINT'
    )),
    source_value TEXT,
    restored_value TEXT,
    match_status BOOLEAN NOT NULL,
    mismatch_details JSONB,
    check_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 検証アラート履歴
CREATE TABLE IF NOT EXISTS verification_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID REFERENCES backup_verification_history(verification_id),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'VERIFICATION_FAILED', 'CHECKSUM_MISMATCH', 'RESTORE_FAILED',
        'DATA_CORRUPTION', 'PERFORMANCE_DEGRADATION', 'WAL_GAP_DETECTED',
        'CONSECUTIVE_FAILURES', 'STORAGE_ISSUE'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')),
    alert_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL,
    details JSONB,
    affected_backups TEXT[],
    recommended_action TEXT,
    alert_sent BOOLEAN NOT NULL DEFAULT false,
    sent_channels TEXT[],
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 検証メトリクスサマリー
CREATE TABLE IF NOT EXISTS verification_metrics_summary (
    summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_date DATE NOT NULL,
    verification_type VARCHAR(50) NOT NULL,
    total_verifications INTEGER NOT NULL DEFAULT 0,
    successful_verifications INTEGER NOT NULL DEFAULT 0,
    failed_verifications INTEGER NOT NULL DEFAULT 0,
    warning_verifications INTEGER NOT NULL DEFAULT 0,
    average_duration_seconds INTEGER,
    min_duration_seconds INTEGER,
    max_duration_seconds INTEGER,
    total_data_verified_gb NUMERIC(10,2),
    checksum_success_rate NUMERIC(5,2),
    restore_success_rate NUMERIC(5,2),
    average_restore_time_minutes INTEGER,
    alerts_generated INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(summary_date, verification_type)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_verification_history_config ON backup_verification_history(config_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_backup ON backup_verification_history(backup_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_status ON backup_verification_history(status);
CREATE INDEX IF NOT EXISTS idx_verification_history_time ON backup_verification_history(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_wal_verification_verification ON wal_verification_details(verification_id);
CREATE INDEX IF NOT EXISTS idx_wal_verification_timeline ON wal_verification_details(timeline_id);
CREATE INDEX IF NOT EXISTS idx_wal_verification_gap ON wal_verification_details(gap_detected) WHERE gap_detected = true;

CREATE INDEX IF NOT EXISTS idx_data_integrity_verification ON data_integrity_details(verification_id);
CREATE INDEX IF NOT EXISTS idx_data_integrity_table ON data_integrity_details(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_data_integrity_mismatch ON data_integrity_details(match_status) WHERE match_status = false;

CREATE INDEX IF NOT EXISTS idx_verification_alerts_unack ON verification_alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_verification_alerts_severity ON verification_alerts(severity, alert_time DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_summary_date ON verification_metrics_summary(summary_date DESC);

-- 検証状態サマリービュー
CREATE OR REPLACE VIEW v_verification_status_summary AS
WITH latest_verifications AS (
    SELECT DISTINCT ON (vc.config_id, bh.backup_type)
        vc.verification_name,
        vc.verification_type,
        bh.backup_type,
        vh.verification_id,
        vh.start_time,
        vh.end_time,
        vh.status,
        vh.duration_seconds,
        vh.files_checked,
        vh.files_failed,
        vh.checksum_failures,
        vh.restore_success,
        vh.data_validation_passed,
        vh.error_message
    FROM backup_verification_config vc
    LEFT JOIN backup_verification_history vh ON vc.config_id = vh.config_id
    LEFT JOIN base_backup_history bh ON vh.backup_id = bh.backup_id
    WHERE vc.enabled = true
    ORDER BY vc.config_id, bh.backup_type, vh.start_time DESC
)
SELECT 
    verification_name,
    verification_type,
    backup_type,
    status,
    start_time,
    CASE 
        WHEN status = 'SUCCESS' THEN 'Passed'
        WHEN status = 'WARNING' THEN 'Passed with warnings'
        WHEN status = 'FAILED' THEN 'Failed'
        WHEN status = 'TIMEOUT' THEN 'Timed out'
        ELSE 'Not run'
    END as verification_result,
    duration_seconds,
    CASE 
        WHEN files_failed > 0 OR checksum_failures > 0 THEN 
            format('%s files failed, %s checksum mismatches', files_failed, checksum_failures)
        WHEN restore_success = false THEN 'Restore test failed'
        WHEN data_validation_passed = false THEN 'Data validation failed'
        ELSE 'All checks passed'
    END as summary,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))/3600 as hours_since_last_check,
    error_message
FROM latest_verifications
ORDER BY 
    CASE status
        WHEN 'FAILED' THEN 1
        WHEN 'TIMEOUT' THEN 2
        WHEN 'WARNING' THEN 3
        WHEN 'RUNNING' THEN 4
        WHEN 'SUCCESS' THEN 5
        ELSE 6
    END,
    start_time DESC;

-- アクティブアラートビュー
CREATE OR REPLACE VIEW v_active_verification_alerts AS
SELECT 
    va.alert_id,
    va.alert_type,
    va.severity,
    va.alert_time,
    va.message,
    va.details,
    vh.verification_type,
    bh.backup_name,
    bh.backup_type,
    va.recommended_action,
    va.alert_sent,
    va.sent_channels,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - va.alert_time))/3600 as hours_since_alert
FROM verification_alerts va
JOIN backup_verification_history vh ON va.verification_id = vh.verification_id
LEFT JOIN base_backup_history bh ON vh.backup_id = bh.backup_id
WHERE va.acknowledged = false
ORDER BY 
    CASE va.severity
        WHEN 'EMERGENCY' THEN 1
        WHEN 'CRITICAL' THEN 2
        WHEN 'WARNING' THEN 3
        ELSE 4
    END,
    va.alert_time DESC;

-- 検証成功率トレンドビュー
CREATE OR REPLACE VIEW v_verification_success_trend AS
SELECT 
    DATE_TRUNC('day', start_time) as verification_date,
    verification_type,
    COUNT(*) as total_verifications,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
    COUNT(*) FILTER (WHERE status = 'WARNING') as warnings,
    ROUND(COUNT(*) FILTER (WHERE status = 'SUCCESS')::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as success_rate,
    AVG(duration_seconds) as avg_duration_seconds,
    MAX(duration_seconds) as max_duration_seconds
FROM backup_verification_history
WHERE start_time > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', start_time), verification_type
ORDER BY verification_date DESC, verification_type;

-- バックアップ検証実行関数
CREATE OR REPLACE FUNCTION execute_backup_verification(
    p_config_id UUID,
    p_backup_id UUID,
    p_verification_type VARCHAR(50)
)
RETURNS UUID AS $$
DECLARE
    v_verification_id UUID;
BEGIN
    -- 新しい検証実行を開始
    INSERT INTO backup_verification_history (
        config_id,
        backup_id,
        verification_type,
        status,
        hostname,
        pg_version,
        os_version
    ) VALUES (
        p_config_id,
        p_backup_id,
        p_verification_type,
        'RUNNING',
        SPLIT_PART(current_setting('archive_command'), ' ', 1),
        version(),
        current_setting('server_version')
    ) RETURNING verification_id INTO v_verification_id;
    
    -- 検証タイプに基づいてイベント記録
    INSERT INTO pitr_recovery_history (
        recovery_type,
        recovery_status,
        source_backup_id,
        recovery_target_time,
        recovery_notes
    ) VALUES (
        'VERIFICATION',
        'IN_PROGRESS',
        p_backup_id,
        CURRENT_TIMESTAMP,
        format('Backup verification started: %s', p_verification_type)
    );
    
    RETURN v_verification_id;
END;
$$ LANGUAGE plpgsql;

-- 検証結果記録関数
CREATE OR REPLACE FUNCTION record_verification_result(
    p_verification_id UUID,
    p_status VARCHAR(20),
    p_results JSONB
)
RETURNS VOID AS $$
DECLARE
    v_config_id UUID;
    v_alert_required BOOLEAN := false;
    v_alert_message TEXT;
BEGIN
    -- 検証結果を更新
    UPDATE backup_verification_history SET
        end_time = CURRENT_TIMESTAMP,
        duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)),
        status = p_status,
        files_checked = (p_results->>'files_checked')::INTEGER,
        files_failed = (p_results->>'files_failed')::INTEGER,
        total_size_bytes = (p_results->>'total_size_bytes')::BIGINT,
        checksum_matches = (p_results->>'checksum_matches')::INTEGER,
        checksum_failures = (p_results->>'checksum_failures')::INTEGER,
        restore_success = (p_results->>'restore_success')::BOOLEAN,
        restore_duration_seconds = (p_results->>'restore_duration_seconds')::INTEGER,
        data_validation_passed = (p_results->>'data_validation_passed')::BOOLEAN,
        row_count_source = (p_results->>'row_count_source')::BIGINT,
        row_count_restored = (p_results->>'row_count_restored')::BIGINT,
        error_message = p_results->>'error_message',
        error_details = p_results->'error_details',
        warnings = ARRAY(SELECT jsonb_array_elements_text(p_results->'warnings'))
    WHERE verification_id = p_verification_id
    RETURNING config_id INTO v_config_id;
    
    -- アラートチェック
    IF p_status = 'FAILED' THEN
        v_alert_required := true;
        v_alert_message := format('Backup verification failed: %s', p_results->>'error_message');
    ELSIF p_status = 'WARNING' AND (p_results->>'files_failed')::INTEGER > 0 THEN
        v_alert_required := true;
        v_alert_message := format('Backup verification completed with %s file failures', p_results->>'files_failed');
    END IF;
    
    -- アラート生成
    IF v_alert_required THEN
        INSERT INTO verification_alerts (
            verification_id,
            alert_type,
            severity,
            message,
            details,
            recommended_action
        ) VALUES (
            p_verification_id,
            CASE 
                WHEN p_status = 'FAILED' THEN 'VERIFICATION_FAILED'
                ELSE 'CHECKSUM_MISMATCH'
            END,
            CASE 
                WHEN p_status = 'FAILED' THEN 'CRITICAL'
                ELSE 'WARNING'
            END,
            v_alert_message,
            p_results,
            'Review backup process and retry verification'
        );
    END IF;
    
    -- メトリクスサマリー更新
    INSERT INTO verification_metrics_summary (
        summary_date,
        verification_type,
        total_verifications,
        successful_verifications,
        failed_verifications,
        warning_verifications
    ) VALUES (
        CURRENT_DATE,
        (SELECT verification_type FROM backup_verification_history WHERE verification_id = p_verification_id),
        1,
        CASE WHEN p_status = 'SUCCESS' THEN 1 ELSE 0 END,
        CASE WHEN p_status = 'FAILED' THEN 1 ELSE 0 END,
        CASE WHEN p_status = 'WARNING' THEN 1 ELSE 0 END
    ) ON CONFLICT (summary_date, verification_type) DO UPDATE SET
        total_verifications = verification_metrics_summary.total_verifications + 1,
        successful_verifications = verification_metrics_summary.successful_verifications + 
            CASE WHEN p_status = 'SUCCESS' THEN 1 ELSE 0 END,
        failed_verifications = verification_metrics_summary.failed_verifications + 
            CASE WHEN p_status = 'FAILED' THEN 1 ELSE 0 END,
        warning_verifications = verification_metrics_summary.warning_verifications + 
            CASE WHEN p_status = 'WARNING' THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- デフォルト検証設定の挿入
INSERT INTO backup_verification_config (
    verification_name,
    verification_type,
    schedule_cron,
    enabled,
    target_backup_type,
    retention_days,
    timeout_minutes,
    sample_size_percent,
    parallel_jobs,
    performance_threshold_minutes,
    alert_on_failure,
    alert_channels
) VALUES
-- 日次チェックサム検証
(
    'daily_checksum_verification',
    'CHECKSUM',
    '0 3 * * *', -- 毎日午前3時
    true,
    'ALL',
    30,
    60,
    100,
    4,
    NULL,
    true,
    ARRAY['email', 'slack']
),
-- 週次リストアテスト
(
    'weekly_restore_test',
    'RESTORE_TEST',
    '0 2 * * 0', -- 毎週日曜午前2時
    true,
    'BASE',
    90,
    240,
    10,
    2,
    180,
    true,
    ARRAY['email', 'slack', 'pagerduty']
),
-- WAL連続性チェック
(
    'wal_continuity_check',
    'WAL_CONTINUITY',
    '*/30 * * * *', -- 30分ごと
    true,
    'WAL',
    7,
    30,
    100,
    1,
    NULL,
    true,
    ARRAY['email']
),
-- 月次完全検証
(
    'monthly_full_validation',
    'FULL_VALIDATION',
    '0 1 1 * *', -- 毎月1日午前1時
    true,
    'ALL',
    365,
    480,
    100,
    4,
    360,
    true,
    ARRAY['email', 'slack', 'webhook']
);

-- トリガー関数作成
CREATE OR REPLACE FUNCTION update_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_backup_verification_config_updated_at
    BEFORE UPDATE ON backup_verification_config
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_updated_at();