#!/bin/bash

# PostgreSQLパフォーマンス監視スクリプト
# リアルタイムでパフォーマンスメトリクスを監視

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PostgreSQL接続情報
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera}"
DB_USER="${DB_USER:-postgres}"

# 環境変数からパスワードを取得
export PGPASSWORD="${DB_PASSWORD:-password}"

# 監視間隔（秒）
INTERVAL="${1:-5}"

clear
echo "================================================"
echo "PostgreSQL Performance Monitor"
echo "================================================"
echo "Refresh interval: ${INTERVAL}s"
echo "Press Ctrl+C to exit"
echo ""

# 監視ループ
while true; do
    # 画面クリア（ヘッダー以降）
    tput cup 5 0
    tput ed
    
    # 現在時刻
    echo -e "${BLUE}Last Update: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    
    # 1. 接続統計
    echo -e "${BLUE}1. Connection Statistics${NC}"
    echo "========================"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    COUNT(*) FILTER (WHERE state = 'active') AS active,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_tx,
    COUNT(*) FILTER (WHERE wait_event IS NOT NULL) AS waiting,
    COUNT(*) AS total
FROM pg_stat_activity
WHERE datname = current_database();
EOF
    
    # 2. メモリ使用状況
    echo -e "${BLUE}2. Memory Usage${NC}"
    echo "==============="
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
WITH cache_ratio AS (
    SELECT 
        sum(heap_blks_hit)::float / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) AS ratio
    FROM pg_statio_user_tables
),
buffer_cache AS (
    SELECT 
        count(*) * 8192 AS total_bytes,
        count(*) FILTER (WHERE isdirty) * 8192 AS dirty_bytes
    FROM pg_buffercache
)
SELECT 
    current_setting('shared_buffers') AS shared_buffers,
    pg_size_pretty(total_bytes) AS buffer_cache_used,
    pg_size_pretty(dirty_bytes) AS dirty_buffers,
    round(ratio * 100, 2) || '%' AS cache_hit_ratio
FROM cache_ratio, buffer_cache;
EOF
    
    # 3. クエリパフォーマンス
    echo ""
    echo -e "${BLUE}3. Query Performance (Top 5)${NC}"
    echo "============================"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    substring(query, 1, 50) AS query_start,
    calls,
    round(mean_exec_time::numeric, 2) AS avg_ms,
    round(max_exec_time::numeric, 2) AS max_ms,
    round(total_exec_time::numeric / 1000, 2) AS total_s
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 5;
EOF
    
    # 4. 現在実行中のクエリ
    echo ""
    echo -e "${BLUE}4. Active Queries${NC}"
    echo "================="
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    pid,
    now() - query_start AS duration,
    wait_event,
    substring(query, 1, 60) AS query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat%'
  AND now() - query_start > interval '1 second'
ORDER BY duration DESC
LIMIT 5;
EOF
    
    # 5. テーブル統計
    echo ""
    echo -e "${BLUE}5. Table Activity (Top 5)${NC}"
    echo "========================="
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    schemaname || '.' || tablename AS table,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_rows,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
LIMIT 5;
EOF
    
    # 6. ロック待機
    echo ""
    echo -e "${BLUE}6. Lock Waits${NC}"
    echo "============="
    
    LOCK_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
        SELECT COUNT(*)
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
    ")
    
    if [ "$LOCK_COUNT" -gt 0 ]; then
        echo -e "${RED}⚠️  $LOCK_COUNT lock waits detected${NC}"
        
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    blocked.pid AS blocked_pid,
    blocked.usename AS blocked_user,
    blocking.pid AS blocking_pid,
    blocking.usename AS blocking_user,
    blocked.query AS blocked_query
FROM pg_stat_activity AS blocked
JOIN pg_stat_activity AS blocking 
    ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.wait_event_type = 'Lock'
LIMIT 5;
EOF
    else
        echo -e "${GREEN}No lock waits detected${NC}"
    fi
    
    # 7. チェックポイント統計
    echo ""
    echo -e "${BLUE}7. Checkpoint Activity${NC}"
    echo "====================="
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    checkpoints_timed AS timed,
    checkpoints_req AS requested,
    checkpoint_write_time AS write_ms,
    checkpoint_sync_time AS sync_ms,
    round(buffers_checkpoint::numeric / NULLIF(checkpoints_timed + checkpoints_req, 0), 2) AS avg_buffers
FROM pg_stat_bgwriter;
EOF
    
    # 8. システム負荷
    echo ""
    echo -e "${BLUE}8. System Load${NC}"
    echo "=============="
    
    # CPU使用率（簡易版）
    if [[ "$OSTYPE" == "linux"* ]]; then
        CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
        echo "CPU Usage: ${CPU_USAGE}%"
    fi
    
    # メモリ使用率
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        MEM_USAGE=$(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages active:\s+(\d+)./ and printf("Active: %.2f GB\n", $1*$size/1073741824);')
        echo "$MEM_USAGE"
    else
        # Linux
        MEM_USAGE=$(free -m | awk 'NR==2{printf "Memory Usage: %.2f%%\n", $3*100/$2 }')
        echo "$MEM_USAGE"
    fi
    
    # 警告チェック
    echo ""
    echo -e "${BLUE}9. Warnings${NC}"
    echo "==========="
    
    # 長時間実行クエリ
    LONG_QUERIES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
        SELECT COUNT(*)
        FROM pg_stat_activity
        WHERE state = 'active'
          AND now() - query_start > interval '5 minutes'
    ")
    
    if [ "$LONG_QUERIES" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $LONG_QUERIES queries running > 5 minutes${NC}"
    fi
    
    # 高いデッドタプル率
    HIGH_DEAD=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
        SELECT COUNT(*)
        FROM pg_stat_user_tables
        WHERE n_live_tup > 1000
          AND (100.0 * n_dead_tup / NULLIF(n_live_tup, 0)) > 20
    ")
    
    if [ "$HIGH_DEAD" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $HIGH_DEAD tables with >20% dead tuples${NC}"
    fi
    
    # キャッシュヒット率低下
    CACHE_HIT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
        SELECT round(sum(heap_blks_hit)::float / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100, 2)
        FROM pg_statio_user_tables
    ")
    
    if (( $(echo "$CACHE_HIT < 90" | bc -l) )); then
        echo -e "${YELLOW}⚠️  Cache hit ratio low: ${CACHE_HIT}%${NC}"
    fi
    
    if [ "$LONG_QUERIES" -eq 0 ] && [ "$HIGH_DEAD" -eq 0 ] && (( $(echo "$CACHE_HIT >= 90" | bc -l) )); then
        echo -e "${GREEN}✅ No warnings${NC}"
    fi
    
    # 次の更新まで待機
    sleep "$INTERVAL"
done