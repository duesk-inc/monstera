#!/bin/bash

# PostgreSQL Point-in-Time Recovery バックアップスクリプト
# ベースバックアップの作成、WALアーカイブ、監視機能を提供

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# PostgreSQL接続情報
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-password}"

# バックアップ設定
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/backup/postgresql}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/backup/wal_archives}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
WAL_RETENTION_DAYS="${WAL_RETENTION_DAYS:-7}"
COMPRESSION_TYPE="${COMPRESSION_TYPE:-gzip}"
BACKUP_PARALLEL_JOBS="${BACKUP_PARALLEL_JOBS:-2}"
BACKUP_RATE_LIMIT="${BACKUP_RATE_LIMIT:-100M}"

# 通知設定
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# PostgreSQL接続テスト
test_connection() {
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to PostgreSQL"
        echo "Connection settings:"
        echo "  DB_HOST: $DB_HOST"
        echo "  DB_PORT: $DB_PORT"
        echo "  DB_NAME: $DB_NAME"
        echo "  DB_USER: $DB_USER"
        exit 1
    fi
}

# ディレクトリ作成
create_directories() {
    local base_dir="$1"
    local wal_dir="$2"
    
    mkdir -p "$base_dir"/{base,logs}
    mkdir -p "$wal_dir"/{current,archive}
    
    # 権限設定
    chmod 750 "$base_dir" "$wal_dir"
    
    info "Backup directories created:"
    info "  Base backup: $base_dir"
    info "  WAL archive: $wal_dir"
}

# バックアップサイズ計算
calculate_backup_size() {
    local backup_path="$1"
    
    if [ -f "$backup_path" ]; then
        stat -f%z "$backup_path" 2>/dev/null || stat -c%s "$backup_path" 2>/dev/null || echo 0
    else
        echo 0
    fi
}

# データベース情報取得
get_database_info() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << 'EOF'
SELECT 
    current_setting('server_version') as version,
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    current_setting('data_directory') as data_directory,
    CASE 
        WHEN current_setting('archive_mode') = 'on' THEN 'enabled'
        ELSE 'disabled'
    END as archive_mode,
    current_setting('wal_level') as wal_level;
EOF
}

# ベースバックアップ実行
create_base_backup() {
    local backup_name="$1"
    local backup_dir="$2"
    local backup_format="${3:-tar}"
    
    info "Starting base backup: $backup_name"
    
    # バックアップ開始をデータベースに記録
    local backup_id
    backup_id=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT record_backup_start('$backup_name', '$backup_dir', 'full', 'pg_basebackup');
    " | tr -d ' ')
    
    if [ -z "$backup_id" ]; then
        error "Failed to record backup start"
        return 1
    fi
    
    info "Backup ID: $backup_id"
    
    # pg_basebackupオプション構築
    local pg_basebackup_opts=(
        --host="$DB_HOST"
        --port="$DB_PORT"
        --username="$DB_USER"
        --pgdata="$backup_dir"
        --format="$backup_format"
        --progress
        --verbose
        --checkpoint=fast
        --wal-method=stream
        --max-rate="$BACKUP_RATE_LIMIT"
    )
    
    # 並列処理設定
    if [ "$BACKUP_PARALLEL_JOBS" -gt 1 ] && [ "$backup_format" = "tar" ]; then
        pg_basebackup_opts+=(--jobs="$BACKUP_PARALLEL_JOBS")
    fi
    
    # 圧縮設定
    if [ "$COMPRESSION_TYPE" = "gzip" ] && [ "$backup_format" = "tar" ]; then
        pg_basebackup_opts+=(--compress=9)
    fi
    
    # バックアップ実行
    local start_time
    start_time=$(date +%s)
    
    local backup_success=false
    local error_message=""
    local lsn_start=""
    local lsn_end=""
    
    if pg_basebackup "${pg_basebackup_opts[@]}" 2>&1 | tee "${backup_dir}/backup.log"; then
        backup_success=true
        success "Base backup completed successfully"
        
        # LSN情報取得
        if [ -f "${backup_dir}/backup_label" ]; then
            lsn_start=$(grep "CHECKPOINT LOCATION" "${backup_dir}/backup_label" | cut -d' ' -f3 || echo "")
        fi
        
        lsn_end=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_current_wal_lsn();" | tr -d ' ')
    else
        error_message="pg_basebackup failed"
        error "$error_message"
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # バックアップサイズ計算
    local backup_size
    if [ "$backup_format" = "tar" ]; then
        backup_size=$(find "$backup_dir" -name "*.tar*" -exec stat -f%z {} + 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo 0)
    else
        backup_size=$(du -sb "$backup_dir" 2>/dev/null | cut -f1 || echo 0)
    fi
    
    # 結果をデータベースに記録
    local status
    if [ "$backup_success" = true ]; then
        status="completed"
    else
        status="failed"
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT record_backup_completion(
            '$backup_id'::UUID,
            '$status',
            $backup_size,
            '$lsn_start',
            '$lsn_end',
            '$error_message'
        );
    " > /dev/null
    
    # 結果出力
    echo ""
    info "Backup Summary:"
    info "  Backup ID: $backup_id"
    info "  Status: $status"
    info "  Duration: ${duration}s"
    info "  Size: $(numfmt --to=iec-i --suffix=B $backup_size)"
    info "  LSN Start: $lsn_start"
    info "  LSN End: $lsn_end"
    
    if [ "$backup_success" = true ]; then
        # 最新バックアップへのシンボリックリンク更新
        local latest_link="${BACKUP_BASE_DIR}/latest"
        rm -f "$latest_link"
        ln -sf "$backup_dir" "$latest_link"
        
        # 通知送信
        send_notification "success" "Base backup completed" "Backup $backup_name completed successfully in ${duration}s ($(numfmt --to=iec-i --suffix=B $backup_size))"
        
        return 0
    else
        send_notification "error" "Base backup failed" "Backup $backup_name failed: $error_message"
        return 1
    fi
}

# WALアーカイブスクリプト生成
generate_wal_archive_script() {
    local script_path="/usr/local/bin/archive_wal.sh"
    
    cat > "$script_path" << 'EOF'
#!/bin/bash
# WALアーカイブスクリプト
# PostgreSQLのarchive_commandから呼び出される

set -e

WAL_PATH="$1"
WAL_FILENAME="$2"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/backup/wal_archives}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-password}"

# ログ関数
log_archive() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WAL Archive: $1" >> "${WAL_ARCHIVE_DIR}/archive.log"
}

# アーカイブディレクトリ作成
ARCHIVE_DATE_DIR="${WAL_ARCHIVE_DIR}/$(date +%Y/%m/%d)"
mkdir -p "$ARCHIVE_DATE_DIR"

# WALファイルコピー
ARCHIVE_PATH="${ARCHIVE_DATE_DIR}/${WAL_FILENAME}"

if cp "$WAL_PATH" "$ARCHIVE_PATH"; then
    # 圧縮
    if [ "${COMPRESSION_TYPE:-gzip}" = "gzip" ]; then
        gzip "$ARCHIVE_PATH"
        ARCHIVE_PATH="${ARCHIVE_PATH}.gz"
    fi
    
    # サイズ取得
    WAL_SIZE=$(stat -f%z "$ARCHIVE_PATH" 2>/dev/null || stat -c%s "$ARCHIVE_PATH" 2>/dev/null || echo 0)
    
    # データベースに記録
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT record_wal_archive('$WAL_FILENAME', '$ARCHIVE_PATH', 'completed', $WAL_SIZE, NULL);
    " > /dev/null 2>&1 || true
    
    log_archive "Successfully archived $WAL_FILENAME to $ARCHIVE_PATH"
    exit 0
else
    # 失敗をデータベースに記録
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT record_wal_archive('$WAL_FILENAME', '$ARCHIVE_PATH', 'failed', 0, 'Copy failed');
    " > /dev/null 2>&1 || true
    
    log_archive "Failed to archive $WAL_FILENAME"
    exit 1
fi
EOF
    
    chmod +x "$script_path"
    info "WAL archive script created: $script_path"
}

# 古いバックアップ削除
cleanup_old_backups() {
    local base_dir="$1"
    local retention_days="$2"
    
    info "Cleaning up backups older than $retention_days days"
    
    # ディレクトリベースのバックアップ削除
    find "$base_dir/base" -maxdepth 1 -type d -name "20*" -mtime +$retention_days -exec rm -rf {} \; 2>/dev/null || true
    
    # データベースの保持期限更新
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        UPDATE base_backup_history 
        SET retention_until = backup_start_time + INTERVAL '$retention_days days'
        WHERE retention_until IS NULL;
        
        -- 期限切れバックアップの無効化
        UPDATE base_backup_history 
        SET backup_status = 'expired'
        WHERE retention_until < CURRENT_TIMESTAMP 
        AND backup_status = 'completed';
    " > /dev/null
    
    success "Old backup cleanup completed"
}

# 古いWALアーカイブ削除
cleanup_old_wal_archives() {
    local wal_dir="$1"
    local retention_days="$2"
    
    info "Cleaning up WAL archives older than $retention_days days"
    
    # WALアーカイブファイル削除
    find "$wal_dir" -type f -name "*.gz" -mtime +$retention_days -delete 2>/dev/null || true
    find "$wal_dir" -type f -name "0*" -mtime +$retention_days -delete 2>/dev/null || true
    
    # 空のディレクトリ削除
    find "$wal_dir" -type d -empty -delete 2>/dev/null || true
    
    # データベースレコード更新
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        UPDATE wal_archive_history 
        SET retention_until = archive_start_time + INTERVAL '$retention_days days'
        WHERE retention_until IS NULL;
        
        UPDATE wal_archive_history 
        SET archive_status = 'expired'
        WHERE retention_until < CURRENT_TIMESTAMP 
        AND archive_status = 'completed';
    " > /dev/null
    
    success "Old WAL archive cleanup completed"
}

# バックアップ検証
verify_backup() {
    local backup_dir="$1"
    local backup_id="$2"
    
    info "Verifying backup: $backup_dir"
    
    local verification_success=false
    local verification_message=""
    
    # pg_verifybackupが利用可能かチェック
    if command -v pg_verifybackup >/dev/null 2>&1; then
        if pg_verifybackup "$backup_dir" > "${backup_dir}/verification.log" 2>&1; then
            verification_success=true
            verification_message="Backup verification passed"
            success "$verification_message"
        else
            verification_message="Backup verification failed"
            error "$verification_message"
        fi
    else
        # 基本的な整合性チェック
        if [ -f "${backup_dir}/backup_label" ] && [ -f "${backup_dir}/PG_VERSION" ]; then
            verification_success=true
            verification_message="Basic integrity check passed"
            info "$verification_message"
        else
            verification_message="Basic integrity check failed - missing required files"
            error "$verification_message"
        fi
    fi
    
    # 検証結果をデータベースに記録
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        UPDATE base_backup_history 
        SET 
            is_verified = $verification_success,
            verification_time = CURRENT_TIMESTAMP,
            verification_result = '$verification_message'
        WHERE backup_id = '$backup_id'::UUID;
    " > /dev/null
    
    return $([ "$verification_success" = true ] && echo 0 || echo 1)
}

# ヘルスチェック実行
run_health_check() {
    info "Running PITR health check"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            check_name,
            status,
            message,
            recommendation
        FROM check_pitr_health();
    "
}

# 通知送信
send_notification() {
    local type="$1"    # success, warning, error
    local title="$2"
    local message="$3"
    
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # メール通知
    if [ -n "$ALERT_EMAIL" ]; then
        local subject="[PITR] $title"
        local body="Time: $timestamp\nHost: $(hostname)\nDatabase: $DB_NAME\n\n$message"
        
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    # Slack通知
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color
        case "$type" in
            success) color="good" ;;
            warning) color="warning" ;;
            error) color="danger" ;;
            *) color="#36a64f" ;;
        esac
        
        local payload
        payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "$title",
            "text": "$message",
            "fields": [
                {
                    "title": "Host",
                    "value": "$(hostname)",
                    "short": true
                },
                {
                    "title": "Database",
                    "value": "$DB_NAME",
                    "short": true
                },
                {
                    "title": "Time",
                    "value": "$timestamp",
                    "short": true
                }
            ]
        }
    ]
}
EOF
        )
        
        curl -X POST -H "Content-type: application/json" --data "$payload" "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# ステータス表示
show_status() {
    echo -e "${PURPLE}PostgreSQL PITR Backup Status${NC}"
    echo -e "${PURPLE}==============================${NC}"
    echo ""
    
    # データベース情報
    info "Database Information:"
    get_database_info | while read -r line; do
        echo "  $line"
    done
    echo ""
    
    # PITR統計
    info "PITR Statistics:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    'Last Successful Backup' as "Metric",
    COALESCE(last_successful_backup::TEXT, 'None') as "Value"
FROM v_pitr_status_summary
UNION ALL
SELECT 
    'Successful Backups (7d)',
    successful_backups_7d::TEXT
FROM v_pitr_status_summary
UNION ALL
SELECT 
    'Failed Backups (7d)',
    failed_backups_7d::TEXT
FROM v_pitr_status_summary
UNION ALL
SELECT 
    'WAL Archived (24h)',
    wal_archived_24h::TEXT
FROM v_pitr_status_summary
UNION ALL
SELECT 
    'WAL Failed (24h)',
    wal_failed_24h::TEXT
FROM v_pitr_status_summary
UNION ALL
SELECT 
    'Active Alerts',
    active_alerts::TEXT
FROM v_pitr_status_summary
UNION ALL
SELECT 
    'RPO Within Target',
    CASE WHEN rpo_within_target THEN 'Yes' ELSE 'No' END
FROM v_pitr_status_summary;
EOF
    echo ""
    
    # ヘルスチェック
    run_health_check
}

# ヘルプ表示
show_help() {
    echo "PostgreSQL PITR Backup Script"
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  backup [name]         - Create base backup (default name: timestamp)"
    echo "  status                - Show PITR status and health"
    echo "  verify [backup_dir]   - Verify specific backup"
    echo "  cleanup               - Clean up old backups and WAL archives"
    echo "  setup                 - Initial PITR setup (directories, scripts)"
    echo "  health                - Run health check only"
    echo "  help                  - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST               - PostgreSQL host (default: localhost)"
    echo "  DB_PORT               - PostgreSQL port (default: 5432)"
    echo "  DB_NAME               - Database name (default: monstera)"
    echo "  DB_USER               - Database user (default: postgres)"
    echo "  DB_PASSWORD           - Database password"
    echo "  BACKUP_BASE_DIR       - Base backup directory (default: /backup/postgresql)"
    echo "  WAL_ARCHIVE_DIR       - WAL archive directory (default: /backup/wal_archives)"
    echo "  BACKUP_RETENTION_DAYS - Backup retention days (default: 30)"
    echo "  WAL_RETENTION_DAYS    - WAL retention days (default: 7)"
    echo "  COMPRESSION_TYPE      - Compression type (default: gzip)"
    echo "  BACKUP_PARALLEL_JOBS  - Parallel backup jobs (default: 2)"
    echo "  BACKUP_RATE_LIMIT     - Backup rate limit (default: 100M)"
    echo "  ALERT_EMAIL           - Alert email address"
    echo "  SLACK_WEBHOOK_URL     - Slack webhook URL"
    echo ""
    echo "Examples:"
    echo "  $0 backup daily_backup_001"
    echo "  $0 status"
    echo "  $0 cleanup"
    echo "  $0 verify /backup/postgresql/base/2024-01-15_000001"
    echo "  BACKUP_RETENTION_DAYS=60 $0 cleanup"
}

# メイン処理
main() {
    local command="${1:-backup}"
    
    case "$command" in
        backup)
            test_connection
            
            local backup_name="${2:-backup_$(date +%Y%m%d_%H%M%S)}"
            local backup_dir="${BACKUP_BASE_DIR}/base/${backup_name}"
            
            create_directories "$BACKUP_BASE_DIR" "$WAL_ARCHIVE_DIR"
            
            if create_base_backup "$backup_name" "$backup_dir" "tar"; then
                verify_backup "$backup_dir" ""
                cleanup_old_backups "$BACKUP_BASE_DIR" "$BACKUP_RETENTION_DAYS"
                cleanup_old_wal_archives "$WAL_ARCHIVE_DIR" "$WAL_RETENTION_DAYS"
            fi
            ;;
        status)
            test_connection
            show_status
            ;;
        verify)
            test_connection
            local backup_dir="$2"
            if [ -z "$backup_dir" ]; then
                error "Backup directory path required"
                exit 1
            fi
            verify_backup "$backup_dir" ""
            ;;
        cleanup)
            test_connection
            cleanup_old_backups "$BACKUP_BASE_DIR" "$BACKUP_RETENTION_DAYS"
            cleanup_old_wal_archives "$WAL_ARCHIVE_DIR" "$WAL_RETENTION_DAYS"
            ;;
        setup)
            test_connection
            create_directories "$BACKUP_BASE_DIR" "$WAL_ARCHIVE_DIR"
            generate_wal_archive_script
            success "PITR setup completed"
            ;;
        health)
            test_connection
            run_health_check
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# 実行
main "$@"