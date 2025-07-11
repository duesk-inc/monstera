-- ストリーミングレプリケーション監視設定
-- レプリケーションの状態監視とアラート機能

-- レプリケーション設定テーブル
CREATE TABLE IF NOT EXISTS replication_configuration (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_name VARCHAR(100) NOT NULL UNIQUE,
    node_role VARCHAR(20) NOT NULL DEFAULT 'standby' CHECK (node_role IN ('primary', 'standby', 'cascade')),
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 5432,
    replication_user VARCHAR(100) NOT NULL DEFAULT 'replicator',
    application_name VARCHAR(100),
    slot_name VARCHAR(100),
    synchronous_mode VARCHAR(20) DEFAULT 'async' CHECK (synchronous_mode IN ('async', 'sync', 'remote_write', 'remote_apply')),
    priority INTEGER NOT NULL DEFAULT 0, -- 同期レプリケーション優先度
    max_lag_bytes BIGINT DEFAULT 104857600, -- 100MB
    max_lag_seconds INTEGER DEFAULT 300, -- 5分
    cascade_from VARCHAR(100), -- カスケード元ノード名
    connection_string TEXT,
    ssl_mode VARCHAR(20) DEFAULT 'prefer' CHECK (ssl_mode IN ('disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full')),
    monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- レプリケーション状態履歴テーブル
CREATE TABLE IF NOT EXISTS replication_status_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_name VARCHAR(100) NOT NULL,
    check_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_primary BOOLEAN NOT NULL,
    is_in_recovery BOOLEAN NOT NULL,
    -- プライマリ側の情報
    connected_standbys INTEGER DEFAULT 0,
    sync_standbys INTEGER DEFAULT 0,
    async_standbys INTEGER DEFAULT 0,
    total_lag_bytes BIGINT,
    max_lag_bytes BIGINT,
    min_lag_bytes BIGINT,
    avg_lag_bytes BIGINT,
    -- スタンバイ側の情報
    receive_lsn TEXT,
    replay_lsn TEXT,
    lag_bytes BIGINT,
    lag_seconds NUMERIC(10,2),
    last_msg_receive_time TIMESTAMP WITH TIME ZONE,
    last_msg_send_time TIMESTAMP WITH TIME ZONE,
    latest_end_lsn TEXT,
    latest_end_time TIMESTAMP WITH TIME ZONE,
    -- 共通情報
    wal_lsn TEXT,
    wal_insert_lsn TEXT,
    wal_flush_lsn TEXT,
    timeline_id INTEGER,
    -- パフォーマンス指標
    sent_bytes BIGINT,
    write_lag_ms INTEGER,
    flush_lag_ms INTEGER,
    replay_lag_ms INTEGER,
    state TEXT,
    sync_state TEXT,
    -- システム情報
    backend_start TIMESTAMP WITH TIME ZONE,
    backend_xmin TEXT,
    slot_name TEXT,
    conninfo TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- レプリケーションイベントテーブル
CREATE TABLE IF NOT EXISTS replication_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'CONNECTION_ESTABLISHED', 'CONNECTION_LOST', 'LAG_WARNING', 'LAG_CRITICAL',
        'PROMOTION', 'DEMOTION', 'SLOT_CREATED', 'SLOT_DROPPED',
        'SYNC_STATE_CHANGED', 'CASCADING_STARTED', 'CASCADING_STOPPED',
        'FAILOVER_INITIATED', 'FAILOVER_COMPLETED', 'SWITCHOVER_INITIATED', 'SWITCHOVER_COMPLETED'
    )),
    node_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    event_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    details JSONB,
    related_node VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    lag_bytes BIGINT,
    lag_seconds NUMERIC(10,2),
    action_taken TEXT,
    action_by VARCHAR(100),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_time TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- レプリケーションアラートテーブル
CREATE TABLE IF NOT EXISTS replication_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'CONNECTION_FAILURE', 'HIGH_LAG', 'CRITICAL_LAG', 'SLOT_INACTIVE',
        'DISK_FULL', 'WAL_MISSING', 'TIMELINE_DIVERGENCE', 'CONFIG_MISMATCH',
        'NETWORK_ISSUE', 'AUTHENTICATION_FAILURE'
    )),
    node_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('WARNING', 'CRITICAL', 'EMERGENCY')),
    message TEXT NOT NULL,
    details JSONB,
    threshold_value TEXT,
    actual_value TEXT,
    alert_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    auto_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_time TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    notification_channels TEXT[],
    suppressed BOOLEAN NOT NULL DEFAULT false,
    suppression_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- スタンバイ詳細情報テーブル
CREATE TABLE IF NOT EXISTS standby_details (
    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_name VARCHAR(100) NOT NULL,
    check_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_addr INET,
    client_hostname VARCHAR(255),
    client_port INTEGER,
    backend_start TIMESTAMP WITH TIME ZONE,
    backend_xmin TEXT,
    state VARCHAR(50),
    sent_lsn TEXT,
    write_lsn TEXT,
    flush_lsn TEXT,
    replay_lsn TEXT,
    write_lag INTERVAL,
    flush_lag INTERVAL,
    replay_lag INTERVAL,
    sync_priority INTEGER,
    sync_state VARCHAR(20),
    reply_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(node_name, check_time)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_replication_status_history_node_time ON replication_status_history(node_name, check_time DESC);
CREATE INDEX IF NOT EXISTS idx_replication_status_history_lag ON replication_status_history(lag_bytes) WHERE lag_bytes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_replication_events_node_time ON replication_events(node_name, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_replication_events_type ON replication_events(event_type);
CREATE INDEX IF NOT EXISTS idx_replication_events_unresolved ON replication_events(resolved) WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_replication_alerts_node ON replication_alerts(node_name);
CREATE INDEX IF NOT EXISTS idx_replication_alerts_unresolved ON replication_alerts(auto_resolved) WHERE auto_resolved = false;
CREATE INDEX IF NOT EXISTS idx_replication_alerts_time ON replication_alerts(alert_time DESC);

CREATE INDEX IF NOT EXISTS idx_standby_details_node_time ON standby_details(node_name, check_time DESC);

-- レプリケーション状態サマリービュー
CREATE OR REPLACE VIEW v_replication_status_summary AS
WITH latest_status AS (
    SELECT DISTINCT ON (node_name) 
        node_name,
        check_time,
        is_primary,
        is_in_recovery,
        connected_standbys,
        lag_bytes,
        lag_seconds,
        state,
        sync_state
    FROM replication_status_history
    ORDER BY node_name, check_time DESC
)
SELECT 
    c.node_name,
    c.node_role,
    c.host,
    c.port,
    s.is_primary,
    s.is_in_recovery,
    s.connected_standbys,
    s.lag_bytes,
    pg_size_pretty(s.lag_bytes) as lag_size,
    s.lag_seconds,
    s.state,
    s.sync_state,
    c.synchronous_mode,
    s.check_time as last_check,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.check_time)) as seconds_since_check,
    CASE 
        WHEN s.lag_bytes > c.max_lag_bytes THEN 'CRITICAL'
        WHEN s.lag_bytes > c.max_lag_bytes * 0.8 THEN 'WARNING'
        ELSE 'OK'
    END as lag_status,
    c.monitoring_enabled,
    c.is_active
FROM replication_configuration c
LEFT JOIN latest_status s ON c.node_name = s.node_name
ORDER BY c.priority DESC, c.node_name;

-- アクティブアラートビュー
CREATE OR REPLACE VIEW v_active_replication_alerts AS
SELECT 
    a.alert_id,
    a.alert_type,
    a.node_name,
    c.host,
    c.node_role,
    a.severity,
    a.message,
    a.details,
    a.threshold_value,
    a.actual_value,
    a.alert_time,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.alert_time))/60 as minutes_since_alert,
    a.notification_sent,
    CASE 
        WHEN a.severity = 'EMERGENCY' THEN 1
        WHEN a.severity = 'CRITICAL' THEN 2
        ELSE 3
    END as severity_order
FROM replication_alerts a
JOIN replication_configuration c ON a.node_name = c.node_name
WHERE a.auto_resolved = false 
AND a.suppressed = false
ORDER BY severity_order, a.alert_time DESC;

-- レプリケーショントポロジービュー
CREATE OR REPLACE VIEW v_replication_topology AS
WITH RECURSIVE topology AS (
    -- プライマリノード
    SELECT 
        node_name,
        node_role,
        host,
        port,
        NULL::VARCHAR AS upstream_node,
        0 AS level,
        node_name::TEXT AS path
    FROM replication_configuration
    WHERE node_role = 'primary'
    
    UNION ALL
    
    -- スタンバイとカスケードノード
    SELECT 
        c.node_name,
        c.node_role,
        c.host,
        c.port,
        COALESCE(c.cascade_from, t.node_name) AS upstream_node,
        t.level + 1,
        t.path || ' -> ' || c.node_name
    FROM replication_configuration c
    JOIN topology t ON (
        (c.node_role = 'standby' AND c.cascade_from IS NULL AND t.node_role = 'primary') OR
        (c.cascade_from = t.node_name)
    )
    WHERE c.is_active = true
)
SELECT 
    node_name,
    node_role,
    host,
    port,
    upstream_node,
    level,
    path,
    REPEAT('  ', level) || node_name AS display_name
FROM topology
ORDER BY path;

-- レプリケーション遅延トレンドビュー
CREATE OR REPLACE VIEW v_replication_lag_trend AS
SELECT 
    node_name,
    DATE_TRUNC('hour', check_time) as hour,
    COUNT(*) as check_count,
    AVG(lag_bytes) as avg_lag_bytes,
    MAX(lag_bytes) as max_lag_bytes,
    MIN(lag_bytes) as min_lag_bytes,
    AVG(lag_seconds) as avg_lag_seconds,
    MAX(lag_seconds) as max_lag_seconds,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lag_bytes) as p95_lag_bytes,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY lag_bytes) as p99_lag_bytes
FROM replication_status_history
WHERE check_time > CURRENT_TIMESTAMP - INTERVAL '7 days'
AND lag_bytes IS NOT NULL
GROUP BY node_name, DATE_TRUNC('hour', check_time)
ORDER BY node_name, hour DESC;

-- レプリケーション健全性チェック関数
CREATE OR REPLACE FUNCTION check_replication_health()
RETURNS TABLE (
    check_name TEXT,
    node_name TEXT,
    status TEXT,
    message TEXT,
    details JSONB
) AS $$
DECLARE
    config_rec RECORD;
    status_rec RECORD;
    primary_count INTEGER;
    standby_count INTEGER;
BEGIN
    -- プライマリノード数チェック
    SELECT COUNT(*) INTO primary_count 
    FROM replication_configuration 
    WHERE node_role = 'primary' AND is_active = true;
    
    IF primary_count = 0 THEN
        RETURN QUERY SELECT 
            'Primary Node'::TEXT, 
            'CLUSTER'::TEXT,
            'ERROR'::TEXT, 
            'プライマリノードが設定されていません'::TEXT,
            NULL::JSONB;
    ELSIF primary_count > 1 THEN
        RETURN QUERY SELECT 
            'Primary Node'::TEXT, 
            'CLUSTER'::TEXT,
            'ERROR'::TEXT, 
            format('複数のプライマリノードが設定されています: %s', primary_count),
            NULL::JSONB;
    ELSE
        RETURN QUERY SELECT 
            'Primary Node'::TEXT, 
            'CLUSTER'::TEXT,
            'OK'::TEXT, 
            'プライマリノードは正常です'::TEXT,
            NULL::JSONB;
    END IF;
    
    -- 各ノードの健全性チェック
    FOR config_rec IN 
        SELECT * FROM replication_configuration 
        WHERE is_active = true
        ORDER BY priority DESC, node_name
    LOOP
        -- 最新の状態を取得
        SELECT * INTO status_rec
        FROM replication_status_history
        WHERE node_name = config_rec.node_name
        ORDER BY check_time DESC
        LIMIT 1;
        
        IF status_rec IS NULL THEN
            RETURN QUERY SELECT 
                'Node Status'::TEXT,
                config_rec.node_name,
                'ERROR'::TEXT,
                '状態情報が取得できません'::TEXT,
                jsonb_build_object('host', config_rec.host, 'port', config_rec.port);
            CONTINUE;
        END IF;
        
        -- 最終チェックからの経過時間
        IF EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - status_rec.check_time)) > 300 THEN
            RETURN QUERY SELECT 
                'Node Status'::TEXT,
                config_rec.node_name,
                'WARNING'::TEXT,
                format('最終チェックから%s秒経過しています', 
                    ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - status_rec.check_time)))),
                jsonb_build_object('last_check', status_rec.check_time);
        END IF;
        
        -- レプリケーション遅延チェック
        IF config_rec.node_role != 'primary' AND status_rec.lag_bytes IS NOT NULL THEN
            IF status_rec.lag_bytes > config_rec.max_lag_bytes THEN
                RETURN QUERY SELECT 
                    'Replication Lag'::TEXT,
                    config_rec.node_name,
                    'CRITICAL'::TEXT,
                    format('レプリケーション遅延が閾値を超えています: %s (閾値: %s)', 
                        pg_size_pretty(status_rec.lag_bytes), 
                        pg_size_pretty(config_rec.max_lag_bytes)),
                    jsonb_build_object(
                        'lag_bytes', status_rec.lag_bytes,
                        'lag_seconds', status_rec.lag_seconds,
                        'threshold', config_rec.max_lag_bytes
                    );
            ELSIF status_rec.lag_bytes > config_rec.max_lag_bytes * 0.8 THEN
                RETURN QUERY SELECT 
                    'Replication Lag'::TEXT,
                    config_rec.node_name,
                    'WARNING'::TEXT,
                    format('レプリケーション遅延が増加しています: %s', 
                        pg_size_pretty(status_rec.lag_bytes)),
                    jsonb_build_object(
                        'lag_bytes', status_rec.lag_bytes,
                        'lag_seconds', status_rec.lag_seconds
                    );
            ELSE
                RETURN QUERY SELECT 
                    'Replication Lag'::TEXT,
                    config_rec.node_name,
                    'OK'::TEXT,
                    format('レプリケーション遅延は正常範囲内です: %s', 
                        pg_size_pretty(COALESCE(status_rec.lag_bytes, 0))),
                    NULL::JSONB;
            END IF;
        END IF;
        
        -- 接続状態チェック
        IF config_rec.node_role = 'primary' THEN
            SELECT COUNT(*) INTO standby_count
            FROM replication_configuration
            WHERE node_role IN ('standby', 'cascade') 
            AND is_active = true
            AND cascade_from IS NULL;
            
            IF standby_count > 0 AND COALESCE(status_rec.connected_standbys, 0) < standby_count THEN
                RETURN QUERY SELECT 
                    'Standby Connections'::TEXT,
                    config_rec.node_name,
                    'WARNING'::TEXT,
                    format('接続されているスタンバイが少ないです: %s/%s', 
                        COALESCE(status_rec.connected_standbys, 0), standby_count),
                    jsonb_build_object(
                        'connected', status_rec.connected_standbys,
                        'expected', standby_count
                    );
            END IF;
        END IF;
    END LOOP;
    
    -- アクティブアラートチェック
    IF EXISTS (SELECT 1 FROM replication_alerts WHERE auto_resolved = false AND severity = 'EMERGENCY') THEN
        RETURN QUERY SELECT 
            'Active Alerts'::TEXT,
            'CLUSTER'::TEXT,
            'CRITICAL'::TEXT,
            '緊急アラートが発生しています'::TEXT,
            (SELECT jsonb_agg(jsonb_build_object('node', node_name, 'type', alert_type, 'message', message))
             FROM replication_alerts 
             WHERE auto_resolved = false AND severity = 'EMERGENCY');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- レプリケーション状態記録関数
CREATE OR REPLACE FUNCTION record_replication_status(
    p_node_name VARCHAR(100),
    p_is_primary BOOLEAN,
    p_status_data JSONB
)
RETURNS UUID AS $$
DECLARE
    history_id UUID;
BEGIN
    INSERT INTO replication_status_history (
        node_name,
        is_primary,
        is_in_recovery,
        connected_standbys,
        sync_standbys,
        async_standbys,
        total_lag_bytes,
        max_lag_bytes,
        min_lag_bytes,
        avg_lag_bytes,
        receive_lsn,
        replay_lsn,
        lag_bytes,
        lag_seconds,
        last_msg_receive_time,
        last_msg_send_time,
        latest_end_lsn,
        latest_end_time,
        wal_lsn,
        wal_insert_lsn,
        wal_flush_lsn,
        timeline_id,
        sent_bytes,
        write_lag_ms,
        flush_lag_ms,
        replay_lag_ms,
        state,
        sync_state,
        backend_start,
        backend_xmin,
        slot_name,
        conninfo
    ) VALUES (
        p_node_name,
        p_is_primary,
        COALESCE((p_status_data->>'is_in_recovery')::BOOLEAN, NOT p_is_primary),
        (p_status_data->>'connected_standbys')::INTEGER,
        (p_status_data->>'sync_standbys')::INTEGER,
        (p_status_data->>'async_standbys')::INTEGER,
        (p_status_data->>'total_lag_bytes')::BIGINT,
        (p_status_data->>'max_lag_bytes')::BIGINT,
        (p_status_data->>'min_lag_bytes')::BIGINT,
        (p_status_data->>'avg_lag_bytes')::BIGINT,
        p_status_data->>'receive_lsn',
        p_status_data->>'replay_lsn',
        (p_status_data->>'lag_bytes')::BIGINT,
        (p_status_data->>'lag_seconds')::NUMERIC,
        (p_status_data->>'last_msg_receive_time')::TIMESTAMP WITH TIME ZONE,
        (p_status_data->>'last_msg_send_time')::TIMESTAMP WITH TIME ZONE,
        p_status_data->>'latest_end_lsn',
        (p_status_data->>'latest_end_time')::TIMESTAMP WITH TIME ZONE,
        p_status_data->>'wal_lsn',
        p_status_data->>'wal_insert_lsn',
        p_status_data->>'wal_flush_lsn',
        (p_status_data->>'timeline_id')::INTEGER,
        (p_status_data->>'sent_bytes')::BIGINT,
        (p_status_data->>'write_lag_ms')::INTEGER,
        (p_status_data->>'flush_lag_ms')::INTEGER,
        (p_status_data->>'replay_lag_ms')::INTEGER,
        p_status_data->>'state',
        p_status_data->>'sync_state',
        (p_status_data->>'backend_start')::TIMESTAMP WITH TIME ZONE,
        p_status_data->>'backend_xmin',
        p_status_data->>'slot_name',
        p_status_data->>'conninfo'
    ) RETURNING history_id INTO history_id;
    
    -- 遅延アラートチェック
    IF NOT p_is_primary THEN
        DECLARE
            config_rec RECORD;
            lag_bytes BIGINT;
            lag_seconds NUMERIC;
        BEGIN
            SELECT * INTO config_rec 
            FROM replication_configuration 
            WHERE node_name = p_node_name;
            
            lag_bytes := (p_status_data->>'lag_bytes')::BIGINT;
            lag_seconds := (p_status_data->>'lag_seconds')::NUMERIC;
            
            IF lag_bytes IS NOT NULL AND lag_bytes > config_rec.max_lag_bytes THEN
                INSERT INTO replication_alerts (
                    alert_type, node_name, severity, message, details,
                    threshold_value, actual_value
                ) VALUES (
                    'CRITICAL_LAG', p_node_name, 'CRITICAL',
                    format('レプリケーション遅延が閾値を超えました: %s', pg_size_pretty(lag_bytes)),
                    jsonb_build_object(
                        'lag_bytes', lag_bytes,
                        'lag_seconds', lag_seconds,
                        'threshold_bytes', config_rec.max_lag_bytes,
                        'threshold_seconds', config_rec.max_lag_seconds
                    ),
                    pg_size_pretty(config_rec.max_lag_bytes),
                    pg_size_pretty(lag_bytes)
                );
            END IF;
        END;
    END IF;
    
    RETURN history_id;
END;
$$ LANGUAGE plpgsql;

-- イベント記録関数
CREATE OR REPLACE FUNCTION record_replication_event(
    p_event_type VARCHAR(50),
    p_node_name VARCHAR(100),
    p_description TEXT,
    p_details JSONB DEFAULT NULL,
    p_severity VARCHAR(20) DEFAULT 'INFO'
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO replication_events (
        event_type,
        node_name,
        severity,
        description,
        details
    ) VALUES (
        p_event_type,
        p_node_name,
        p_severity,
        p_description,
        p_details
    ) RETURNING replication_events.event_id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- デフォルト設定挿入
INSERT INTO replication_configuration (
    node_name,
    node_role,
    host,
    port,
    replication_user,
    application_name,
    synchronous_mode,
    priority,
    max_lag_bytes,
    max_lag_seconds,
    monitoring_enabled,
    is_active
) VALUES
(
    'primary',
    'primary',
    'localhost',
    5432,
    'replicator',
    'primary',
    'async',
    100,
    104857600, -- 100MB
    300, -- 5分
    true,
    true
) ON CONFLICT (node_name) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP;

-- 自動更新トリガー
CREATE TRIGGER trigger_replication_configuration_updated_at
    BEFORE UPDATE ON replication_configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_pitr_updated_at();

CREATE TRIGGER trigger_replication_alerts_updated_at
    BEFORE UPDATE ON replication_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_pitr_updated_at();