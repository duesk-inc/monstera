-- PostgreSQLコネクション監視設定のマイグレーション
-- 接続数監視テーブル、ビュー、関数の作成

-- コネクション監視履歴テーブル
CREATE TABLE IF NOT EXISTS connection_monitoring_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_connections INTEGER NOT NULL DEFAULT 0,
    max_connections INTEGER NOT NULL DEFAULT 0,
    connection_usage_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    active_connections INTEGER NOT NULL DEFAULT 0,
    idle_connections INTEGER NOT NULL DEFAULT 0,
    idle_in_transaction_connections INTEGER NOT NULL DEFAULT 0,
    waiting_connections INTEGER NOT NULL DEFAULT 0,
    
    -- アプリケーション別統計
    backend_connections INTEGER NOT NULL DEFAULT 0,
    batch_connections INTEGER NOT NULL DEFAULT 0,
    admin_connections INTEGER NOT NULL DEFAULT 0,
    other_connections INTEGER NOT NULL DEFAULT 0,
    
    -- 性能指標
    avg_connection_duration_seconds NUMERIC(10,2) DEFAULT 0,
    max_connection_duration_seconds NUMERIC(10,2) DEFAULT 0,
    long_running_queries_count INTEGER NOT NULL DEFAULT 0,
    
    -- システムリソース
    estimated_memory_usage_mb NUMERIC(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_connection_monitoring_history_snapshot_time ON connection_monitoring_history(snapshot_time DESC);
CREATE INDEX idx_connection_monitoring_history_usage_percent ON connection_monitoring_history(connection_usage_percent DESC);

-- コネクションアラート履歴テーブル
CREATE TABLE IF NOT EXISTS connection_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('WARNING', 'CRITICAL', 'EMERGENCY')),
    alert_reason TEXT NOT NULL,
    connection_count INTEGER NOT NULL,
    max_connections INTEGER NOT NULL,
    usage_percent NUMERIC(5,2) NOT NULL,
    
    -- 詳細情報
    active_connections INTEGER DEFAULT 0,
    idle_connections INTEGER DEFAULT 0,
    idle_in_transaction_connections INTEGER DEFAULT 0,
    long_running_queries_count INTEGER DEFAULT 0,
    
    -- アラート管理
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by TEXT,
    resolution_action TEXT,
    resolution_notes TEXT,
    
    -- メタデータ
    alert_data JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_connection_alerts_alert_type ON connection_alerts(alert_type);
CREATE INDEX idx_connection_alerts_created_at ON connection_alerts(created_at DESC);
CREATE INDEX idx_connection_alerts_resolved ON connection_alerts(resolved);
CREATE INDEX idx_connection_alerts_usage_percent ON connection_alerts(usage_percent DESC);

-- 接続プール設定テーブル
CREATE TABLE IF NOT EXISTS connection_pool_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_name TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'development',
    
    -- プール設定
    max_open_connections INTEGER NOT NULL DEFAULT 20,
    max_idle_connections INTEGER NOT NULL DEFAULT 5,
    connection_max_lifetime_seconds INTEGER NOT NULL DEFAULT 300,
    connection_max_idle_time_seconds INTEGER NOT NULL DEFAULT 60,
    
    -- 監視閾値
    warning_threshold_percent INTEGER NOT NULL DEFAULT 60,
    critical_threshold_percent INTEGER NOT NULL DEFAULT 80,
    emergency_threshold_percent INTEGER NOT NULL DEFAULT 90,
    
    -- 時間帯別設定
    business_hours_config JSONB,
    off_hours_config JSONB,
    weekend_config JSONB,
    
    -- 設定メタデータ
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(application_name, environment)
);

-- インデックス
CREATE INDEX idx_connection_pool_settings_app_env ON connection_pool_settings(application_name, environment);
CREATE INDEX idx_connection_pool_settings_active ON connection_pool_settings(is_active);

-- 現在のコネクション状況を取得するビュー
CREATE OR REPLACE VIEW v_current_connections AS
SELECT 
    -- 基本統計
    (SELECT count(*) FROM pg_stat_activity) as total_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
    round(100.0 * (SELECT count(*) FROM pg_stat_activity) / 
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) as usage_percent,
    
    -- 状態別接続数
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') as idle_in_transaction,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction (aborted)') as idle_in_transaction_aborted,
    (SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL) as waiting_connections,
    
    -- アプリケーション別（推定）
    (SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%backend%' OR application_name LIKE '%api%') as backend_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%batch%' OR application_name LIKE '%worker%') as batch_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%admin%' OR application_name LIKE '%pgadmin%') as admin_connections,
    
    -- 接続時間統計
    round(avg(extract(epoch from now() - backend_start))) as avg_connection_duration_seconds,
    round(max(extract(epoch from now() - backend_start))) as max_connection_duration_seconds,
    
    -- 長時間実行クエリ
    (SELECT count(*) FROM pg_stat_activity 
     WHERE state = 'active' 
       AND query_start IS NOT NULL 
       AND extract(epoch from now() - query_start) > 300) as long_running_queries_5min,
    (SELECT count(*) FROM pg_stat_activity 
     WHERE state = 'active' 
       AND query_start IS NOT NULL 
       AND extract(epoch from now() - query_start) > 60) as long_running_queries_1min,
    
    -- メモリ使用量推定（接続あたり約10MB）
    round((SELECT count(*) FROM pg_stat_activity) * 10.0 / 1024, 2) as estimated_memory_gb,
    
    current_timestamp as snapshot_time
FROM pg_stat_activity
LIMIT 1;

-- アプリケーション別接続統計ビュー
CREATE OR REPLACE VIEW v_connections_by_application AS
SELECT 
    COALESCE(application_name, 'unknown') as application_name,
    count(*) as connection_count,
    round(100.0 * count(*) / (SELECT count(*) FROM pg_stat_activity), 2) as percentage,
    
    -- 状態別集計
    count(CASE WHEN state = 'active' THEN 1 END) as active_count,
    count(CASE WHEN state = 'idle' THEN 1 END) as idle_count,
    count(CASE WHEN state = 'idle in transaction' THEN 1 END) as idle_in_transaction_count,
    
    -- 時間統計
    round(avg(extract(epoch from now() - backend_start))) as avg_duration_seconds,
    round(max(extract(epoch from now() - backend_start))) as max_duration_seconds,
    min(backend_start) as oldest_connection,
    max(backend_start) as newest_connection,
    
    -- データベース別
    array_agg(DISTINCT datname) as databases,
    count(DISTINCT usename) as unique_users
    
FROM pg_stat_activity 
WHERE pid != pg_backend_pid()
GROUP BY application_name
ORDER BY connection_count DESC;

-- 問題のある接続を特定するビュー
CREATE OR REPLACE VIEW v_problematic_connections AS
SELECT 
    pid,
    datname,
    usename,
    application_name,
    client_addr,
    state,
    
    -- 時間情報
    backend_start,
    query_start,
    state_change,
    round(extract(epoch from now() - backend_start)) as connection_age_seconds,
    round(extract(epoch from now() - query_start)) as query_age_seconds,
    round(extract(epoch from now() - state_change)) as state_age_seconds,
    
    -- 待機情報
    wait_event_type,
    wait_event,
    
    -- クエリ情報
    substring(query, 1, 200) as query_preview,
    
    -- 問題分類
    CASE 
        WHEN state = 'idle in transaction' AND 
             extract(epoch from now() - state_change) > 300 
        THEN 'LONG_IDLE_TRANSACTION'
        WHEN state = 'active' AND 
             query_start IS NOT NULL AND 
             extract(epoch from now() - query_start) > 600 
        THEN 'LONG_RUNNING_QUERY'
        WHEN state = 'idle' AND 
             extract(epoch from now() - state_change) > 1800 
        THEN 'LONG_IDLE_CONNECTION'
        WHEN wait_event IS NOT NULL AND 
             extract(epoch from now() - state_change) > 60 
        THEN 'LONG_WAITING'
        ELSE 'OTHER'
    END as problem_type,
    
    -- 推奨アクション
    CASE 
        WHEN state = 'idle in transaction' AND 
             extract(epoch from now() - state_change) > 300 
        THEN 'ROLLBACK_TRANSACTION'
        WHEN state = 'active' AND 
             query_start IS NOT NULL AND 
             extract(epoch from now() - query_start) > 600 
        THEN 'CANCEL_QUERY'
        WHEN state = 'idle' AND 
             extract(epoch from now() - state_change) > 1800 
        THEN 'TERMINATE_CONNECTION'
        ELSE 'MONITOR'
    END as recommended_action

FROM pg_stat_activity 
WHERE pid != pg_backend_pid()
  AND (
    (state = 'idle in transaction' AND extract(epoch from now() - state_change) > 300) OR
    (state = 'active' AND query_start IS NOT NULL AND extract(epoch from now() - query_start) > 300) OR
    (state = 'idle' AND extract(epoch from now() - state_change) > 1800) OR
    (wait_event IS NOT NULL AND extract(epoch from now() - state_change) > 60)
  )
ORDER BY 
    CASE 
        WHEN state = 'idle in transaction' THEN 1
        WHEN state = 'active' AND query_start IS NOT NULL THEN 2
        ELSE 3
    END,
    connection_age_seconds DESC;

-- 接続監視サマリービュー
CREATE OR REPLACE VIEW v_connection_monitoring_summary AS
SELECT 
    current_timestamp as report_time,
    
    -- 基本統計
    (SELECT total_connections FROM v_current_connections) as current_connections,
    (SELECT max_connections FROM v_current_connections) as max_connections,
    (SELECT usage_percent FROM v_current_connections) as usage_percent,
    
    -- 状態別統計
    (SELECT active_connections FROM v_current_connections) as active_connections,
    (SELECT idle_connections FROM v_current_connections) as idle_connections,
    (SELECT idle_in_transaction FROM v_current_connections) as idle_in_transaction,
    (SELECT waiting_connections FROM v_current_connections) as waiting_connections,
    
    -- 問題統計
    (SELECT count(*) FROM v_problematic_connections WHERE problem_type = 'LONG_IDLE_TRANSACTION') as long_idle_transactions,
    (SELECT count(*) FROM v_problematic_connections WHERE problem_type = 'LONG_RUNNING_QUERY') as long_running_queries,
    (SELECT count(*) FROM v_problematic_connections WHERE problem_type = 'LONG_IDLE_CONNECTION') as long_idle_connections,
    (SELECT count(*) FROM v_problematic_connections WHERE problem_type = 'LONG_WAITING') as long_waiting_connections,
    
    -- アラートレベル判定
    CASE 
        WHEN (SELECT usage_percent FROM v_current_connections) >= 90 THEN 'EMERGENCY'
        WHEN (SELECT usage_percent FROM v_current_connections) >= 80 THEN 'CRITICAL'
        WHEN (SELECT usage_percent FROM v_current_connections) >= 60 THEN 'WARNING'
        ELSE 'OK'
    END as alert_level,
    
    -- 推奨アクション
    CASE 
        WHEN (SELECT usage_percent FROM v_current_connections) >= 90 
        THEN 'Immediate action required - terminate idle connections'
        WHEN (SELECT usage_percent FROM v_current_connections) >= 80 
        THEN 'Critical - review and cleanup connections'
        WHEN (SELECT usage_percent FROM v_current_connections) >= 60 
        THEN 'Warning - monitor closely'
        ELSE 'Normal operation'
    END as recommendation,
    
    -- リソース使用量
    (SELECT estimated_memory_gb FROM v_current_connections) as estimated_memory_gb;

-- 接続監視統計記録関数
CREATE OR REPLACE FUNCTION record_connection_stats()
RETURNS void AS $$
DECLARE
    current_stats RECORD;
BEGIN
    -- 現在の統計を取得
    SELECT * INTO current_stats FROM v_current_connections;
    
    -- 履歴テーブルに記録
    INSERT INTO connection_monitoring_history (
        snapshot_time,
        total_connections,
        max_connections,
        connection_usage_percent,
        active_connections,
        idle_connections,
        idle_in_transaction_connections,
        waiting_connections,
        backend_connections,
        batch_connections,
        admin_connections,
        other_connections,
        avg_connection_duration_seconds,
        max_connection_duration_seconds,
        long_running_queries_count,
        estimated_memory_usage_mb
    ) VALUES (
        CURRENT_TIMESTAMP,
        current_stats.total_connections,
        current_stats.max_connections,
        current_stats.usage_percent,
        current_stats.active_connections,
        current_stats.idle_connections,
        current_stats.idle_in_transaction,
        current_stats.waiting_connections,
        current_stats.backend_connections,
        current_stats.batch_connections,
        current_stats.admin_connections,
        current_stats.total_connections - 
        (current_stats.backend_connections + current_stats.batch_connections + current_stats.admin_connections),
        current_stats.avg_connection_duration_seconds,
        current_stats.max_connection_duration_seconds,
        current_stats.long_running_queries_5min,
        current_stats.estimated_memory_gb * 1024
    );
    
    -- 古い履歴データの削除（30日以上前）
    DELETE FROM connection_monitoring_history
    WHERE snapshot_time < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 接続アラート生成関数
CREATE OR REPLACE FUNCTION check_connection_alerts()
RETURNS TABLE (
    alert_type text,
    message text,
    connection_count integer,
    usage_percent numeric,
    recommended_action text
) AS $$
DECLARE
    current_stats RECORD;
    alert_count integer := 0;
    existing_alert_id UUID;
BEGIN
    -- 現在の統計を取得
    SELECT * INTO current_stats FROM v_current_connections;
    
    -- アラートレベル判定
    IF current_stats.usage_percent >= 90 THEN
        -- 緊急レベルアラート
        SELECT id INTO existing_alert_id
        FROM connection_alerts
        WHERE alert_type = 'EMERGENCY'
          AND resolved = false
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF existing_alert_id IS NULL THEN
            INSERT INTO connection_alerts (
                alert_type,
                alert_reason,
                connection_count,
                max_connections,
                usage_percent,
                active_connections,
                idle_connections,
                idle_in_transaction_connections,
                long_running_queries_count
            ) VALUES (
                'EMERGENCY',
                'Connection usage exceeds 90% - immediate action required',
                current_stats.total_connections,
                current_stats.max_connections,
                current_stats.usage_percent,
                current_stats.active_connections,
                current_stats.idle_connections,
                current_stats.idle_in_transaction,
                current_stats.long_running_queries_5min
            );
            alert_count := alert_count + 1;
        END IF;
        
        RETURN QUERY SELECT 
            'EMERGENCY'::text,
            'Connection usage at ' || current_stats.usage_percent || '% - terminate idle connections immediately',
            current_stats.total_connections,
            current_stats.usage_percent,
            'Execute emergency connection cleanup script'::text;
            
    ELSIF current_stats.usage_percent >= 80 THEN
        -- 重要レベルアラート
        SELECT id INTO existing_alert_id
        FROM connection_alerts
        WHERE alert_type = 'CRITICAL'
          AND resolved = false
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF existing_alert_id IS NULL THEN
            INSERT INTO connection_alerts (
                alert_type,
                alert_reason,
                connection_count,
                max_connections,
                usage_percent,
                active_connections,
                idle_connections,
                idle_in_transaction_connections,
                long_running_queries_count
            ) VALUES (
                'CRITICAL',
                'Connection usage exceeds 80% - critical level',
                current_stats.total_connections,
                current_stats.max_connections,
                current_stats.usage_percent,
                current_stats.active_connections,
                current_stats.idle_connections,
                current_stats.idle_in_transaction,
                current_stats.long_running_queries_5min
            );
            alert_count := alert_count + 1;
        END IF;
        
        RETURN QUERY SELECT 
            'CRITICAL'::text,
            'Connection usage at ' || current_stats.usage_percent || '% - review connection pool settings',
            current_stats.total_connections,
            current_stats.usage_percent,
            'Review and cleanup idle connections, check application connection pools'::text;
            
    ELSIF current_stats.usage_percent >= 60 THEN
        -- 警告レベルアラート
        SELECT id INTO existing_alert_id
        FROM connection_alerts
        WHERE alert_type = 'WARNING'
          AND resolved = false
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF existing_alert_id IS NULL THEN
            INSERT INTO connection_alerts (
                alert_type,
                alert_reason,
                connection_count,
                max_connections,
                usage_percent,
                active_connections,
                idle_connections,
                idle_in_transaction_connections,
                long_running_queries_count
            ) VALUES (
                'WARNING',
                'Connection usage exceeds 60% - monitor closely',
                current_stats.total_connections,
                current_stats.max_connections,
                current_stats.usage_percent,
                current_stats.active_connections,
                current_stats.idle_connections,
                current_stats.idle_in_transaction,
                current_stats.long_running_queries_5min
            );
            alert_count := alert_count + 1;
        END IF;
        
        RETURN QUERY SELECT 
            'WARNING'::text,
            'Connection usage at ' || current_stats.usage_percent || '% - monitor connection trends',
            current_stats.total_connections,
            current_stats.usage_percent,
            'Monitor connection trends and review application behavior'::text;
    END IF;
    
    -- 問題のある接続に対するアラート
    IF current_stats.idle_in_transaction > 5 THEN
        RETURN QUERY SELECT 
            'WARNING'::text,
            'Multiple idle in transaction connections detected: ' || current_stats.idle_in_transaction,
            current_stats.idle_in_transaction,
            current_stats.usage_percent,
            'Review application transaction management'::text;
    END IF;
    
    IF current_stats.long_running_queries_5min > 3 THEN
        RETURN QUERY SELECT 
            'WARNING'::text,
            'Multiple long-running queries detected: ' || current_stats.long_running_queries_5min,
            current_stats.long_running_queries_5min,
            current_stats.usage_percent,
            'Review slow query performance and consider optimization'::text;
    END IF;
    
    -- 正常な状態の場合、未解決アラートを解決
    IF current_stats.usage_percent < 60 THEN
        UPDATE connection_alerts 
        SET 
            resolved = true,
            resolved_at = CURRENT_TIMESTAMP,
            resolved_by = 'auto_system',
            resolution_notes = 'Connection usage returned to normal levels'
        WHERE resolved = false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 緊急時接続クリーンアップ関数
CREATE OR REPLACE FUNCTION emergency_connection_cleanup(
    max_idle_minutes integer DEFAULT 30,
    max_idle_transaction_minutes integer DEFAULT 5
)
RETURNS TABLE (
    action_type text,
    pid integer,
    terminated_count integer,
    message text
) AS $$
DECLARE
    terminated_idle integer := 0;
    terminated_idle_transaction integer := 0;
    conn_record RECORD;
BEGIN
    -- 長時間アイドル状態の接続を終了
    FOR conn_record IN 
        SELECT pid, extract(epoch from now() - state_change) / 60 as idle_minutes
        FROM pg_stat_activity 
        WHERE state = 'idle' 
          AND extract(epoch from now() - state_change) / 60 > max_idle_minutes
          AND pid != pg_backend_pid()
          AND usename != 'postgres'  -- スーパーユーザー接続は保護
    LOOP
        PERFORM pg_terminate_backend(conn_record.pid);
        terminated_idle := terminated_idle + 1;
    END LOOP;
    
    -- 長時間idle in transactionの接続を終了
    FOR conn_record IN 
        SELECT pid, extract(epoch from now() - state_change) / 60 as idle_minutes
        FROM pg_stat_activity 
        WHERE state = 'idle in transaction' 
          AND extract(epoch from now() - state_change) / 60 > max_idle_transaction_minutes
          AND pid != pg_backend_pid()
          AND usename != 'postgres'
    LOOP
        PERFORM pg_terminate_backend(conn_record.pid);
        terminated_idle_transaction := terminated_idle_transaction + 1;
    END LOOP;
    
    -- 結果を返す
    IF terminated_idle > 0 THEN
        RETURN QUERY SELECT 
            'TERMINATE_IDLE'::text,
            0::integer,
            terminated_idle,
            'Terminated ' || terminated_idle || ' idle connections older than ' || max_idle_minutes || ' minutes';
    END IF;
    
    IF terminated_idle_transaction > 0 THEN
        RETURN QUERY SELECT 
            'TERMINATE_IDLE_TRANSACTION'::text,
            0::integer,
            terminated_idle_transaction,
            'Terminated ' || terminated_idle_transaction || ' idle transaction connections older than ' || max_idle_transaction_minutes || ' minutes';
    END IF;
    
    IF terminated_idle = 0 AND terminated_idle_transaction = 0 THEN
        RETURN QUERY SELECT 
            'NO_ACTION'::text,
            0::integer,
            0::integer,
            'No connections met the criteria for termination';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 更新日時の自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_connection_monitoring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 更新日時の自動更新トリガー
CREATE TRIGGER trg_connection_alerts_updated_at
    BEFORE UPDATE ON connection_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_connection_monitoring_updated_at();

CREATE TRIGGER trg_connection_pool_settings_updated_at
    BEFORE UPDATE ON connection_pool_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_connection_monitoring_updated_at();

-- 初期設定データの挿入
INSERT INTO connection_pool_settings (
    application_name,
    environment,
    max_open_connections,
    max_idle_connections,
    connection_max_lifetime_seconds,
    connection_max_idle_time_seconds,
    warning_threshold_percent,
    critical_threshold_percent,
    emergency_threshold_percent,
    business_hours_config,
    off_hours_config,
    weekend_config,
    description
) VALUES 
(
    'monstera-backend',
    'development',
    20,
    5,
    300,
    60,
    60,
    80,
    90,
    '{"warning": 50, "critical": 70, "emergency": 80}',
    '{"warning": 40, "critical": 60, "emergency": 70}',
    '{"warning": 30, "critical": 50, "emergency": 60}',
    'Development environment backend API connections'
),
(
    'monstera-backend',
    'production',
    50,
    10,
    600,
    120,
    60,
    80,
    90,
    '{"warning": 60, "critical": 80, "emergency": 90}',
    '{"warning": 50, "critical": 70, "emergency": 80}',
    '{"warning": 40, "critical": 60, "emergency": 70}',
    'Production environment backend API connections'
),
(
    'monstera-batch',
    'production',
    10,
    2,
    900,
    300,
    70,
    85,
    95,
    '{"warning": 70, "critical": 85, "emergency": 95}',
    '{"warning": 70, "critical": 85, "emergency": 95}',
    '{"warning": 70, "critical": 85, "emergency": 95}',
    'Batch processing connections'
);

-- コメント
COMMENT ON TABLE connection_monitoring_history IS 'コネクション監視の履歴データを保存するテーブル';
COMMENT ON TABLE connection_alerts IS 'コネクション関連のアラート履歴を管理するテーブル';
COMMENT ON TABLE connection_pool_settings IS 'アプリケーション別の接続プール設定を管理するテーブル';

COMMENT ON VIEW v_current_connections IS '現在のコネクション状況をリアルタイムで表示するビュー';
COMMENT ON VIEW v_connections_by_application IS 'アプリケーション別のコネクション統計ビュー';
COMMENT ON VIEW v_problematic_connections IS '問題のあるコネクションを特定するビュー';
COMMENT ON VIEW v_connection_monitoring_summary IS 'コネクション監視の総合サマリービュー';

COMMENT ON FUNCTION record_connection_stats() IS 'コネクション統計を履歴テーブルに記録する関数';
COMMENT ON FUNCTION check_connection_alerts() IS 'コネクション使用率に基づいてアラートを生成する関数';
COMMENT ON FUNCTION emergency_connection_cleanup(integer, integer) IS '緊急時にアイドル接続を終了する関数';

-- 権限設定
GRANT SELECT ON connection_monitoring_history TO PUBLIC;
GRANT SELECT ON connection_alerts TO PUBLIC;
GRANT SELECT ON connection_pool_settings TO PUBLIC;
GRANT SELECT ON v_current_connections TO PUBLIC;
GRANT SELECT ON v_connections_by_application TO PUBLIC;
GRANT SELECT ON v_problematic_connections TO PUBLIC;
GRANT SELECT ON v_connection_monitoring_summary TO PUBLIC;