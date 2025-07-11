#!/bin/bash

# PostgreSQL WAL監視スクリプト
# WALの生成状況、アーカイブ状態、レプリケーション遅延を監視

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

# 監視モード（single: 1回実行, continuous: 継続監視）
MODE="${1:-single}"
INTERVAL="${2:-10}"  # 継続監視の間隔（秒）

# WAL基本情報を表示
show_wal_info() {
    echo -e "${BLUE}WAL Basic Information${NC}"
    echo "===================="
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -x << EOF
SELECT 
    current_setting('wal_level') as wal_level,
    current_setting('archive_mode') as archive_mode,
    current_setting('max_wal_size') as max_wal_size,
    current_setting('min_wal_size') as min_wal_size,
    pg_current_wal_lsn() as current_wal_lsn,
    pg_walfile_name(pg_current_wal_lsn()) as current_wal_file,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0'::pg_lsn)) as total_wal_generated;
EOF
    echo ""
}

# WAL生成速度を計算
calculate_wal_rate() {
    echo -e "${BLUE}WAL Generation Rate${NC}"
    echo "=================="
    
    # 最初のサンプル
    FIRST_LSN=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT pg_current_wal_lsn();")
    FIRST_TIME=$(date +%s)
    
    # 5秒待機
    sleep 5
    
    # 2番目のサンプル
    SECOND_LSN=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT pg_current_wal_lsn();")
    SECOND_TIME=$(date +%s)
    
    # 速度計算
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    pg_size_pretty(
        pg_wal_lsn_diff('$SECOND_LSN'::pg_lsn, '$FIRST_LSN'::pg_lsn) / 
        ($SECOND_TIME - $FIRST_TIME)
    ) || '/sec' as wal_generation_rate,
    pg_size_pretty(
        pg_wal_lsn_diff('$SECOND_LSN'::pg_lsn, '$FIRST_LSN'::pg_lsn) / 
        ($SECOND_TIME - $FIRST_TIME) * 3600
    ) || '/hour' as projected_hourly_rate,
    pg_size_pretty(
        pg_wal_lsn_diff('$SECOND_LSN'::pg_lsn, '$FIRST_LSN'::pg_lsn) / 
        ($SECOND_TIME - $FIRST_TIME) * 86400
    ) || '/day' as projected_daily_rate;
EOF
    echo ""
}

# チェックポイント統計
show_checkpoint_stats() {
    echo -e "${BLUE}Checkpoint Statistics${NC}"
    echo "===================="
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    checkpoints_timed,
    checkpoints_req,
    CASE 
        WHEN checkpoints_timed + checkpoints_req = 0 THEN 0
        ELSE round(100.0 * checkpoints_req / (checkpoints_timed + checkpoints_req), 2)
    END as forced_checkpoint_percentage,
    checkpoint_write_time,
    checkpoint_sync_time,
    buffers_checkpoint,
    buffers_clean,
    buffers_backend,
    stats_reset
FROM pg_stat_bgwriter;
EOF
    echo ""
}

# アーカイブ状態
show_archive_status() {
    echo -e "${BLUE}Archive Status${NC}"
    echo "=============="
    
    # archive_modeを確認
    ARCHIVE_MODE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SHOW archive_mode;")
    
    if [ "$ARCHIVE_MODE" = "on" ] || [ "$ARCHIVE_MODE" = "always" ]; then
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    archived_count,
    last_archived_wal,
    last_archived_time,
    failed_count,
    last_failed_wal,
    last_failed_time,
    stats_reset
FROM pg_stat_archiver;
EOF
        
        # アーカイブディレクトリのサイズ（可能な場合）
        if [ -d "/var/lib/postgresql/archive" ]; then
            ARCHIVE_SIZE=$(du -sh /var/lib/postgresql/archive 2>/dev/null | cut -f1)
            echo "Archive Directory Size: $ARCHIVE_SIZE"
        fi
    else
        echo "Archive mode is disabled"
    fi
    echo ""
}

# レプリケーション状態
show_replication_status() {
    echo -e "${BLUE}Replication Status${NC}"
    echo "=================="
    
    # レプリケーションスロットの確認
    SLOT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT COUNT(*) FROM pg_replication_slots;")
    
    if [ "$SLOT_COUNT" -gt 0 ]; then
        echo "Replication Slots:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    slot_name,
    slot_type,
    active,
    restart_lsn,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as retained_wal_size
FROM pg_replication_slots
ORDER BY slot_name;
EOF
        echo ""
    fi
    
    # アクティブなレプリケーション接続
    REP_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT COUNT(*) FROM pg_stat_replication;")
    
    if [ "$REP_COUNT" -gt 0 ]; then
        echo "Active Replication Connections:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    application_name,
    client_addr,
    state,
    sync_state,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) as lag_size,
    CASE 
        WHEN pg_is_in_recovery() THEN NULL
        ELSE age(now(), backend_start)
    END as connection_age
FROM pg_stat_replication
ORDER BY application_name;
EOF
    else
        echo "No active replication connections"
    fi
    echo ""
}

# WALファイルシステム使用状況
show_wal_filesystem() {
    echo -e "${BLUE}WAL Filesystem Usage${NC}"
    echo "==================="
    
    # pg_wal ディレクトリのサイズ
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    count(*) as wal_file_count,
    pg_size_pretty(sum(size)) as total_wal_size,
    pg_size_pretty(avg(size)) as avg_file_size,
    min(modification) as oldest_wal_time,
    max(modification) as newest_wal_time
FROM pg_ls_waldir();
EOF
    echo ""
}

# 警告チェック
check_warnings() {
    echo -e "${BLUE}Health Checks${NC}"
    echo "============="
    
    # チェックポイント頻度
    CHECKPOINT_WARNING=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
        SELECT CASE 
            WHEN checkpoints_req > checkpoints_timed THEN 'WARNING'
            ELSE 'OK'
        END
        FROM pg_stat_bgwriter;
    ")
    
    if [ "$CHECKPOINT_WARNING" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  High number of requested checkpoints (consider increasing max_wal_size)${NC}"
    else
        echo -e "${GREEN}✅ Checkpoint frequency is normal${NC}"
    fi
    
    # アーカイブ失敗
    if [ "$ARCHIVE_MODE" = "on" ] || [ "$ARCHIVE_MODE" = "always" ]; then
        ARCHIVE_FAILURES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
            SELECT failed_count FROM pg_stat_archiver;
        ")
        
        if [ "$ARCHIVE_FAILURES" -gt 0 ]; then
            echo -e "${RED}❌ Archive failures detected: $ARCHIVE_FAILURES${NC}"
        else
            echo -e "${GREEN}✅ No archive failures${NC}"
        fi
    fi
    
    # レプリケーション遅延
    MAX_LAG=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
        SELECT COALESCE(
            MAX(pg_wal_lsn_diff(sent_lsn, replay_lsn)), 
            0
        )
        FROM pg_stat_replication;
    " 2>/dev/null || echo "0")
    
    if [ "$MAX_LAG" != "0" ] && [ "$MAX_LAG" -gt 104857600 ]; then  # 100MB
        echo -e "${YELLOW}⚠️  High replication lag detected (>100MB)${NC}"
    elif [ "$REP_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Replication lag is acceptable${NC}"
    fi
    
    echo ""
}

# 推奨事項
show_recommendations() {
    echo -e "${BLUE}Recommendations${NC}"
    echo "==============="
    
    # 現在の設定を取得
    MAX_WAL_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SHOW max_wal_size;")
    WAL_COMPRESSION=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SHOW wal_compression;")
    
    # 推奨事項の生成
    if [ "$CHECKPOINT_WARNING" = "WARNING" ]; then
        echo "• Consider increasing max_wal_size (current: $MAX_WAL_SIZE)"
    fi
    
    if [ "$WAL_COMPRESSION" = "off" ] && [ "$MAX_LAG" -gt 52428800 ]; then  # 50MB
        echo "• Consider enabling wal_compression to reduce replication lag"
    fi
    
    if [ "$ARCHIVE_MODE" = "off" ]; then
        echo "• Consider enabling archive_mode for backup purposes"
    fi
    
    echo ""
}

# メイン監視関数
monitor_wal() {
    clear
    echo "================================================"
    echo "PostgreSQL WAL Monitor - $(date)"
    echo "================================================"
    echo ""
    
    show_wal_info
    show_checkpoint_stats
    show_archive_status
    show_replication_status
    show_wal_filesystem
    check_warnings
    
    if [ "$MODE" = "single" ]; then
        calculate_wal_rate
        show_recommendations
    fi
}

# 継続監視モード
continuous_monitor() {
    echo "Starting continuous monitoring (Press Ctrl+C to exit)"
    echo "Refresh interval: ${INTERVAL}s"
    sleep 2
    
    while true; do
        monitor_wal
        echo -e "${BLUE}Next refresh in ${INTERVAL} seconds...${NC}"
        sleep "$INTERVAL"
    done
}

# メイン処理
case "$MODE" in
    "single")
        monitor_wal
        ;;
    "continuous")
        continuous_monitor
        ;;
    *)
        echo "Usage: $0 [single|continuous] [interval_seconds]"
        echo "  single: Run once and exit (default)"
        echo "  continuous: Run continuously with specified interval"
        echo "  interval_seconds: Refresh interval for continuous mode (default: 10)"
        exit 1
        ;;
esac