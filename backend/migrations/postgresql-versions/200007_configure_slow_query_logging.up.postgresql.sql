-- スロークエリログ設定のためのPostgreSQL専用マイグレーション
-- pg_stat_statementsの有効化とスロークエリ監視テーブルの作成

-- pg_stat_statements拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- スロークエリ履歴テーブル
CREATE TABLE IF NOT EXISTS slow_query_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_hash CHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    calls BIGINT NOT NULL DEFAULT 0,
    total_exec_time NUMERIC(15,3) NOT NULL DEFAULT 0,
    mean_exec_time NUMERIC(15,3) NOT NULL DEFAULT 0,
    min_exec_time NUMERIC(15,3) NOT NULL DEFAULT 0,
    max_exec_time NUMERIC(15,3) NOT NULL DEFAULT 0,
    rows_returned BIGINT NOT NULL DEFAULT 0,
    shared_blks_hit BIGINT NOT NULL DEFAULT 0,
    shared_blks_read BIGINT NOT NULL DEFAULT 0,
    local_blks_hit BIGINT NOT NULL DEFAULT 0,
    local_blks_read BIGINT NOT NULL DEFAULT 0,
    temp_blks_read BIGINT NOT NULL DEFAULT 0,
    temp_blks_written BIGINT NOT NULL DEFAULT 0,
    first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_slow_query_history_query_hash ON slow_query_history(query_hash);
CREATE INDEX idx_slow_query_history_mean_exec_time ON slow_query_history(mean_exec_time DESC);
CREATE INDEX idx_slow_query_history_calls ON slow_query_history(calls DESC);
CREATE INDEX idx_slow_query_history_last_seen ON slow_query_history(last_seen DESC);

-- スロークエリアラート設定テーブル
CREATE TABLE IF NOT EXISTS slow_query_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_pattern TEXT NOT NULL,
    threshold_ms INTEGER NOT NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('email', 'slack', 'webhook')),
    alert_config JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- スロークエリアラート履歴テーブル
CREATE TABLE IF NOT EXISTS slow_query_alert_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_hash CHAR(64) NOT NULL,
    alert_id UUID REFERENCES slow_query_alerts(id),
    query_text TEXT NOT NULL,
    execution_time NUMERIC(15,3) NOT NULL,
    threshold_ms INTEGER NOT NULL,
    alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
    alert_sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_slow_query_alert_history_query_hash ON slow_query_alert_history(query_hash);
CREATE INDEX idx_slow_query_alert_history_created_at ON slow_query_alert_history(created_at DESC);

-- スロークエリ統計を収集するビュー
CREATE OR REPLACE VIEW v_slow_query_stats AS
SELECT 
    md5(query) as query_hash,
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    min_exec_time,
    max_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read,
    local_blks_hit,
    local_blks_read,
    temp_blks_read,
    temp_blks_written,
    -- ヒット率計算
    CASE 
        WHEN shared_blks_hit + shared_blks_read = 0 THEN 0
        ELSE round((100.0 * shared_blks_hit / (shared_blks_hit + shared_blks_read))::numeric, 2)
    END as cache_hit_ratio,
    -- 1回あたりの平均読み取りブロック数
    CASE 
        WHEN calls = 0 THEN 0
        ELSE round(((shared_blks_hit + shared_blks_read)::numeric / calls)::numeric, 2)
    END as avg_blocks_per_call,
    -- 一時ファイル使用の判定
    CASE 
        WHEN temp_blks_read > 0 OR temp_blks_written > 0 THEN true
        ELSE false
    END as uses_temp_files
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- 1秒以上のクエリのみ
ORDER BY mean_exec_time DESC;

-- TOP 10スロークエリを取得するビュー
CREATE OR REPLACE VIEW v_top_slow_queries AS
SELECT 
    rank() OVER (ORDER BY mean_exec_time DESC) as rank,
    md5(query) as query_hash,
    substring(regexp_replace(query, '\s+', ' ', 'g'), 1, 100) || '...' as query_preview,
    calls,
    round(total_exec_time::numeric, 2) as total_time_ms,
    round(mean_exec_time::numeric, 2) as mean_time_ms,
    round(max_exec_time::numeric, 2) as max_time_ms,
    CASE 
        WHEN shared_blks_hit + shared_blks_read = 0 THEN 0
        ELSE round((100.0 * shared_blks_hit / (shared_blks_hit + shared_blks_read))::numeric, 2)
    END as cache_hit_ratio
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 実行頻度の高いクエリを取得するビュー
CREATE OR REPLACE VIEW v_most_frequent_queries AS
SELECT 
    rank() OVER (ORDER BY calls DESC) as rank,
    md5(query) as query_hash,
    substring(regexp_replace(query, '\s+', ' ', 'g'), 1, 100) || '...' as query_preview,
    calls,
    round(mean_exec_time::numeric, 2) as mean_time_ms,
    round(total_exec_time::numeric, 2) as total_time_ms,
    round((100.0 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) as time_percentage
FROM pg_stat_statements
WHERE calls > 100
ORDER BY calls DESC
LIMIT 10;

-- スロークエリ統計を定期的に記録する関数
CREATE OR REPLACE FUNCTION record_slow_query_stats()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    -- pg_stat_statementsから現在の統計を取得
    FOR r IN 
        SELECT 
            md5(query) as query_hash,
            query,
            calls,
            total_exec_time,
            mean_exec_time,
            min_exec_time,
            max_exec_time,
            rows,
            shared_blks_hit,
            shared_blks_read,
            local_blks_hit,
            local_blks_read,
            temp_blks_read,
            temp_blks_written
        FROM pg_stat_statements
        WHERE mean_exec_time > 1000  -- 1秒以上のクエリのみ
    LOOP
        -- UPSERTで統計を更新
        INSERT INTO slow_query_history (
            query_hash,
            query_text,
            calls,
            total_exec_time,
            mean_exec_time,
            min_exec_time,
            max_exec_time,
            rows_returned,
            shared_blks_hit,
            shared_blks_read,
            local_blks_hit,
            local_blks_read,
            temp_blks_read,
            temp_blks_written,
            last_seen
        ) VALUES (
            r.query_hash,
            r.query,
            r.calls,
            r.total_exec_time,
            r.mean_exec_time,
            r.min_exec_time,
            r.max_exec_time,
            r.rows,
            r.shared_blks_hit,
            r.shared_blks_read,
            r.local_blks_hit,
            r.local_blks_read,
            r.temp_blks_read,
            r.temp_blks_written,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (query_hash) DO UPDATE SET
            calls = EXCLUDED.calls,
            total_exec_time = EXCLUDED.total_exec_time,
            mean_exec_time = EXCLUDED.mean_exec_time,
            min_exec_time = EXCLUDED.min_exec_time,
            max_exec_time = EXCLUDED.max_exec_time,
            rows_returned = EXCLUDED.rows_returned,
            shared_blks_hit = EXCLUDED.shared_blks_hit,
            shared_blks_read = EXCLUDED.shared_blks_read,
            local_blks_hit = EXCLUDED.local_blks_hit,
            local_blks_read = EXCLUDED.local_blks_read,
            temp_blks_read = EXCLUDED.temp_blks_read,
            temp_blks_written = EXCLUDED.temp_blks_written,
            last_seen = EXCLUDED.last_seen,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
    
    -- 古い履歴データを削除（30日以上前）
    DELETE FROM slow_query_history
    WHERE last_seen < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- アラート履歴も削除（7日以上前）
    DELETE FROM slow_query_alert_history
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- スロークエリアラートをチェックする関数
CREATE OR REPLACE FUNCTION check_slow_query_alerts()
RETURNS void AS $$
DECLARE
    alert_record RECORD;
    query_record RECORD;
BEGIN
    -- 有効なアラート設定を取得
    FOR alert_record IN 
        SELECT * FROM slow_query_alerts WHERE enabled = true
    LOOP
        -- アラート条件に該当するクエリをチェック
        FOR query_record IN
            SELECT 
                md5(query) as query_hash,
                query,
                mean_exec_time
            FROM pg_stat_statements
            WHERE mean_exec_time > alert_record.threshold_ms
              AND query ILIKE alert_record.query_pattern
        LOOP
            -- アラート履歴に記録
            INSERT INTO slow_query_alert_history (
                query_hash,
                alert_id,
                query_text,
                execution_time,
                threshold_ms
            ) VALUES (
                query_record.query_hash,
                alert_record.id,
                query_record.query,
                query_record.mean_exec_time,
                alert_record.threshold_ms
            );
            
            -- ここで実際のアラート送信処理を呼び出す
            -- （実装は別途アプリケーション側で行う）
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- pg_stat_statementsのリセット関数
CREATE OR REPLACE FUNCTION reset_query_stats()
RETURNS void AS $$
BEGIN
    -- 現在の統計を履歴に保存してからリセット
    PERFORM record_slow_query_stats();
    
    -- pg_stat_statementsをリセット
    PERFORM pg_stat_statements_reset();
END;
$$ LANGUAGE plpgsql;

-- 更新日時の自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 更新日時の自動更新トリガー
CREATE TRIGGER trg_slow_query_history_updated_at
    BEFORE UPDATE ON slow_query_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_slow_query_alerts_updated_at
    BEFORE UPDATE ON slow_query_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 初期のアラート設定例
INSERT INTO slow_query_alerts (query_pattern, threshold_ms, alert_type, alert_config)
VALUES 
    ('%SELECT%users%', 5000, 'email', '{"to": "admin@duesk.co.jp", "subject": "Slow Query Alert"}'),
    ('%UPDATE%', 10000, 'slack', '{"webhook": "https://hooks.slack.com/...", "channel": "#alerts"}'),
    ('%INSERT%', 15000, 'webhook', '{"url": "http://localhost:3000/api/alerts", "method": "POST"}');

-- コメント
COMMENT ON TABLE slow_query_history IS 'スロークエリの履歴を保存するテーブル';
COMMENT ON TABLE slow_query_alerts IS 'スロークエリアラートの設定を管理するテーブル';
COMMENT ON TABLE slow_query_alert_history IS 'スロークエリアラートの履歴を保存するテーブル';
COMMENT ON VIEW v_slow_query_stats IS 'スロークエリの統計情報を提供するビュー';
COMMENT ON VIEW v_top_slow_queries IS 'TOP 10のスロークエリを表示するビュー';
COMMENT ON VIEW v_most_frequent_queries IS '実行頻度の高いクエリを表示するビュー';
COMMENT ON FUNCTION record_slow_query_stats() IS 'pg_stat_statementsから統計を取得してslow_query_historyに記録する関数';
COMMENT ON FUNCTION check_slow_query_alerts() IS 'スロークエリアラートの条件をチェックして通知する関数';
COMMENT ON FUNCTION reset_query_stats() IS 'クエリ統計をリセットする関数';

-- デフォルトの権限設定
GRANT SELECT ON slow_query_history TO PUBLIC;
GRANT SELECT ON slow_query_alerts TO PUBLIC;
GRANT SELECT ON slow_query_alert_history TO PUBLIC;
GRANT SELECT ON v_slow_query_stats TO PUBLIC;
GRANT SELECT ON v_top_slow_queries TO PUBLIC;
GRANT SELECT ON v_most_frequent_queries TO PUBLIC;