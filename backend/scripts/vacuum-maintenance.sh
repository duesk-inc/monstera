#!/bin/bash

# VACUUM定期メンテナンススクリプト
# cronで定期実行することを想定

set -e

# カラー定義（ログ出力用）
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

# ログディレクトリ
LOG_DIR="${LOG_DIR:-/var/log/monstera}"
LOG_FILE="$LOG_DIR/vacuum-maintenance-$(date +%Y%m%d-%H%M%S).log"

# 環境変数からパスワードを取得
export PGPASSWORD="${DB_PASSWORD:-password}"

# メンテナンスタイプ（daily, weekly, monthly）
MAINTENANCE_TYPE="${1:-daily}"

# ログディレクトリ作成
mkdir -p "$LOG_DIR"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR][$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS][$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# VACUUMの実行と結果記録
run_vacuum() {
    local table=$1
    local options=$2
    local start_time=$(date +%s)
    
    log "Starting VACUUM $options on $table..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
           -c "VACUUM $options $table;" >> "$LOG_FILE" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "VACUUM $options on $table completed in ${duration}s"
        return 0
    else
        log_error "VACUUM $options on $table failed"
        return 1
    fi
}

# ANALYZEの実行
run_analyze() {
    local table=$1
    local start_time=$(date +%s)
    
    log "Starting ANALYZE on $table..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
           -c "ANALYZE $table;" >> "$LOG_FILE" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "ANALYZE on $table completed in ${duration}s"
        return 0
    else
        log_error "ANALYZE on $table failed"
        return 1
    fi
}

# メイン処理開始
log "======================================"
log "VACUUM Maintenance Started"
log "Type: $MAINTENANCE_TYPE"
log "Database: $DB_NAME"
log "======================================"

# デッドタプル統計を記録
log "Recording dead tuple statistics before maintenance..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >> "$LOG_FILE" 2>&1 << EOF
SELECT 
    tablename,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;
EOF

case "$MAINTENANCE_TYPE" in
    "daily")
        log "Performing daily maintenance..."
        
        # 高頻度更新テーブルのVACUUM
        HIGH_UPDATE_TABLES=(
            "audit_logs"
            "sessions"
            "daily_records"
            "attendances"
            "notifications"
        )
        
        for table in "${HIGH_UPDATE_TABLES[@]}"; do
            # テーブル存在確認
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                   -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='$table'" | grep -q 1; then
                run_vacuum "$table" "(VERBOSE, ANALYZE)"
            fi
        done
        ;;
        
    "weekly")
        log "Performing weekly maintenance..."
        
        # 中頻度更新テーブルのVACUUM
        MEDIUM_UPDATE_TABLES=(
            "weekly_reports"
            "expenses"
            "expense_approvals"
            "leave_requests"
            "proposals"
            "project_assignments"
        )
        
        for table in "${MEDIUM_UPDATE_TABLES[@]}"; do
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                   -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='$table'" | grep -q 1; then
                run_vacuum "$table" "(VERBOSE, ANALYZE)"
            fi
        done
        
        # インデックスの再構築が必要なテーブル
        log "Checking index bloat..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >> "$LOG_FILE" 2>&1 << EOF
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;
EOF
        ;;
        
    "monthly")
        log "Performing monthly maintenance..."
        
        # VACUUM FULL for heavily bloated tables
        FULL_VACUUM_TABLES=(
            "audit_logs"
            "sessions"
            "notification_history"
        )
        
        for table in "${FULL_VACUUM_TABLES[@]}"; do
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                   -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='$table'" | grep -q 1; then
                
                # テーブルサイズとデッドタプル率をチェック
                DEAD_PCT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
                    "SELECT ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) 
                     FROM pg_stat_user_tables WHERE tablename='$table'")
                
                if (( $(echo "$DEAD_PCT > 30" | bc -l) )); then
                    log "Table $table has ${DEAD_PCT}% dead tuples, performing VACUUM FULL..."
                    run_vacuum "$table" "(FULL, VERBOSE, ANALYZE)"
                else
                    log "Table $table has ${DEAD_PCT}% dead tuples, regular VACUUM sufficient"
                    run_vacuum "$table" "(VERBOSE, ANALYZE)"
                fi
            fi
        done
        
        # データベース全体のREINDEX（メンテナンスウィンドウで実行）
        log "Reindexing database..."
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
               -c "REINDEX DATABASE $DB_NAME;" >> "$LOG_FILE" 2>&1; then
            log_success "Database reindex completed"
        else
            log_error "Database reindex failed"
        fi
        ;;
        
    *)
        log_error "Unknown maintenance type: $MAINTENANCE_TYPE"
        exit 1
        ;;
esac

# アーカイブテーブルの処理（月次のみ）
if [ "$MAINTENANCE_TYPE" = "monthly" ]; then
    log "Processing archive tables..."
    
    ARCHIVE_TABLES=(
        "archived_weekly_reports"
        "archived_daily_records"
    )
    
    for table in "${ARCHIVE_TABLES[@]}"; do
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
               -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='$table'" | grep -q 1; then
            run_analyze "$table"
        fi
    done
fi

# 統計情報の更新
log "Updating database statistics..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     -c "ANALYZE;" >> "$LOG_FILE" 2>&1

# デッドタプル統計を記録（メンテナンス後）
log "Recording dead tuple statistics after maintenance..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >> "$LOG_FILE" 2>&1 << EOF
SELECT 
    tablename,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 100
ORDER BY n_dead_tup DESC
LIMIT 20;
EOF

# データベースサイズの記録
log "Recording database size..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >> "$LOG_FILE" 2>&1 << EOF
SELECT 
    pg_database_size('$DB_NAME') AS db_size_bytes,
    pg_size_pretty(pg_database_size('$DB_NAME')) AS db_size_pretty;
EOF

log "======================================"
log "VACUUM Maintenance Completed"
log "Log file: $LOG_FILE"
log "======================================"

# ログファイルの古いものを削除（30日以上前）
find "$LOG_DIR" -name "vacuum-maintenance-*.log" -mtime +30 -delete

exit 0