#!/bin/bash

# PostgreSQL バックアップ監視スクリプト
# 継続的なバックアップ品質監視とアラート生成

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# デフォルト設定
DEFAULT_CHECK_INTERVAL=3600  # 1時間
DEFAULT_RETENTION_DAYS=30
DEFAULT_DB_NAME="monstera"
DEFAULT_BACKUP_DIR="/backup/postgresql"

# 設定
CHECK_INTERVAL="${CHECK_INTERVAL:-$DEFAULT_CHECK_INTERVAL}"
RETENTION_DAYS="${RETENTION_DAYS:-$DEFAULT_RETENTION_DAYS}"
DB_NAME="${DB_NAME:-$DEFAULT_DB_NAME}"
BACKUP_DIR="${BACKUP_DIR:-$DEFAULT_BACKUP_DIR}"

# ログ設定
LOG_DIR="/var/log/postgresql/backup"
LOG_FILE="$LOG_DIR/backup-monitor.log"
ALERT_LOG="$LOG_DIR/backup-alerts.log"

# メトリクスファイル
METRICS_FILE="$LOG_DIR/backup-metrics.json"

# 監視状態
MONITOR_PID_FILE="/var/run/backup-monitor.pid"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# 使用方法表示
show_usage() {
    echo "PostgreSQL Backup Monitor"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start             - Start monitoring daemon"
    echo "  stop              - Stop monitoring daemon"
    echo "  status            - Show monitoring status"
    echo "  check-once        - Run single check"
    echo "  metrics           - Export metrics"
    echo "  alerts            - Show recent alerts"
    echo "  report            - Generate status report"
    echo "  help              - Show this help message"
    echo ""
    echo "Options:"
    echo "  --interval        - Check interval in seconds (default: 3600)"
    echo "  --retention       - Alert retention days (default: 30)"
    echo "  --webhook         - Webhook URL for alerts"
    echo "  --email           - Email for alerts"
    echo "  --daemon          - Run as daemon"
    echo ""
    echo "Examples:"
    echo "  $0 start --interval=1800 --daemon"
    echo "  $0 check-once --webhook=https://hooks.slack.com/..."
}

# パラメータ解析
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --interval=*)
                CHECK_INTERVAL="${1#*=}"
                shift
                ;;
            --retention=*)
                RETENTION_DAYS="${1#*=}"
                shift
                ;;
            --webhook=*)
                WEBHOOK_URL="${1#*=}"
                shift
                ;;
            --email=*)
                ALERT_EMAIL="${1#*=}"
                shift
                ;;
            --daemon)
                RUN_AS_DAEMON=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
}

# ディレクトリ準備
prepare_directories() {
    mkdir -p "$LOG_DIR"
    touch "$LOG_FILE" "$ALERT_LOG" "$METRICS_FILE"
}

# PIDファイル管理
write_pid() {
    echo $$ > "$MONITOR_PID_FILE"
}

remove_pid() {
    rm -f "$MONITOR_PID_FILE"
}

check_pid() {
    if [ -f "$MONITOR_PID_FILE" ]; then
        local pid=$(cat "$MONITOR_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# アラート送信
send_alert() {
    local severity="$1"
    local alert_type="$2"
    local message="$3"
    local details="$4"
    
    # アラートログ記録
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$severity] $alert_type: $message" >> "$ALERT_LOG"
    
    # データベース記録
    sudo -u postgres psql -d "$DB_NAME" -c "
        INSERT INTO verification_alerts (
            alert_type, severity, message, details, alert_sent
        ) VALUES (
            '$alert_type', '$severity', '$message', '$details'::JSONB, false
        );
    " &> /dev/null || warning "Failed to record alert in database"
    
    # Webhook送信
    if [ -n "$WEBHOOK_URL" ]; then
        local payload=$(cat <<EOF
{
    "text": "Backup Alert: $severity",
    "attachments": [{
        "color": "$([ "$severity" = "CRITICAL" ] && echo "danger" || echo "warning")",
        "title": "$alert_type",
        "text": "$message",
        "fields": [{
            "title": "Details",
            "value": "$details",
            "short": false
        }],
        "footer": "Backup Monitor",
        "ts": $(date +%s)
    }]
}
EOF
)
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            -s -o /dev/null || warning "Failed to send webhook alert"
    fi
    
    # Email送信
    if [ -n "$ALERT_EMAIL" ]; then
        echo -e "Subject: [Backup Alert] $severity - $alert_type\n\n$message\n\nDetails:\n$details" | \
            sendmail "$ALERT_EMAIL" 2>/dev/null || warning "Failed to send email alert"
    fi
}

# バックアップ状態チェック
check_backup_status() {
    info "Checking backup status..."
    
    local issues_found=false
    local check_results="{}"
    
    # 最新バックアップ確認
    check_latest_backup
    
    # バックアップサイズトレンド
    check_backup_size_trend
    
    # WAL アーカイブ状態
    check_wal_archive_status
    
    # ディスク容量
    check_disk_space
    
    # 検証スケジュール確認
    check_verification_schedule
    
    # メトリクス更新
    update_metrics "$check_results"
    
    if [ "$issues_found" = false ]; then
        success "All backup checks passed"
    fi
}

# 最新バックアップ確認
check_latest_backup() {
    local latest_backup=$(ls -1t "$BACKUP_DIR/base" 2>/dev/null | grep -E '^[0-9]{8}_[0-9]{6}$' | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No backup found"
        send_alert "CRITICAL" "NO_BACKUP_FOUND" "No backup files found in $BACKUP_DIR/base" "{}"
        issues_found=true
        return
    fi
    
    # バックアップ年齢確認
    local backup_timestamp=$(echo "$latest_backup" | sed 's/\([0-9]\{8\}\)_\([0-9]\{6\}\)/\1 \2/')
    local backup_epoch=$(date -d "$backup_timestamp" +%s 2>/dev/null || date +%s)
    local current_epoch=$(date +%s)
    local age_hours=$(( (current_epoch - backup_epoch) / 3600 ))
    
    info "Latest backup: $latest_backup (${age_hours}h old)"
    
    # 古すぎるバックアップの警告
    if [ "$age_hours" -gt 48 ]; then
        warning "Latest backup is more than 48 hours old"
        send_alert "WARNING" "OLD_BACKUP" "Latest backup is $age_hours hours old" \
            "{\"backup_id\": \"$latest_backup\", \"age_hours\": $age_hours}"
        issues_found=true
    elif [ "$age_hours" -gt 24 ]; then
        warning "Latest backup is more than 24 hours old"
    fi
    
    check_results=$(echo "$check_results" | jq \
        --arg id "$latest_backup" \
        --arg age "$age_hours" \
        '. + {
            "latest_backup_id": $id,
            "latest_backup_age_hours": ($age | tonumber)
        }')
}

# バックアップサイズトレンド確認
check_backup_size_trend() {
    info "Checking backup size trend..."
    
    local sizes=()
    local backup_count=0
    
    # 最新5つのバックアップサイズ取得
    for backup in $(ls -1t "$BACKUP_DIR/base" | grep -E '^[0-9]{8}_[0-9]{6}$' | head -5); do
        local size=$(du -s "$BACKUP_DIR/base/$backup" 2>/dev/null | awk '{print $1}')
        sizes+=("$size")
        ((backup_count++))
    done
    
    if [ "$backup_count" -ge 2 ]; then
        # サイズ増加率計算
        local latest_size=${sizes[0]}
        local prev_size=${sizes[1]}
        local growth_percent=0
        
        if [ "$prev_size" -gt 0 ]; then
            growth_percent=$(( (latest_size - prev_size) * 100 / prev_size ))
        fi
        
        info "Backup size growth: ${growth_percent}%"
        
        # 異常な増加の検出
        if [ "$growth_percent" -gt 50 ]; then
            warning "Backup size increased by more than 50%"
            send_alert "WARNING" "BACKUP_SIZE_SPIKE" \
                "Backup size increased by ${growth_percent}%" \
                "{\"latest_size_kb\": $latest_size, \"previous_size_kb\": $prev_size, \"growth_percent\": $growth_percent}"
            issues_found=true
        fi
        
        check_results=$(echo "$check_results" | jq \
            --arg latest "$latest_size" \
            --arg growth "$growth_percent" \
            '. + {
                "latest_backup_size_kb": ($latest | tonumber),
                "size_growth_percent": ($growth | tonumber)
            }')
    fi
}

# WALアーカイブ状態確認
check_wal_archive_status() {
    info "Checking WAL archive status..."
    
    # PostgreSQLからWALアーカイブ状態取得
    local archive_status=$(sudo -u postgres psql -t -c "
        SELECT archived_count, failed_count, last_archived_wal, last_archived_time,
               last_failed_wal, last_failed_time
        FROM pg_stat_archiver;
    " postgres 2>/dev/null || echo "")
    
    if [ -n "$archive_status" ]; then
        local failed_count=$(echo "$archive_status" | awk -F'|' '{print $2}' | tr -d ' ')
        
        if [ "$failed_count" -gt 0 ]; then
            warning "WAL archive failures detected: $failed_count"
            send_alert "WARNING" "WAL_ARCHIVE_FAILURE" \
                "$failed_count WAL archive failures detected" \
                "{\"failed_count\": $failed_count}"
            issues_found=true
        fi
    fi
    
    # WALディレクトリサイズ確認
    local wal_size=$(du -sh "$BACKUP_DIR/wal_archives" 2>/dev/null | awk '{print $1}')
    info "WAL archive size: $wal_size"
}

# ディスク容量確認
check_disk_space() {
    info "Checking disk space..."
    
    local disk_info=$(df -h "$BACKUP_DIR" | tail -1)
    local used_percent=$(echo "$disk_info" | awk '{print $5}' | tr -d '%')
    local available=$(echo "$disk_info" | awk '{print $4}')
    
    info "Backup disk usage: ${used_percent}% (${available} available)"
    
    check_results=$(echo "$check_results" | jq \
        --arg used "$used_percent" \
        --arg avail "$available" \
        '. + {
            "disk_used_percent": ($used | tonumber),
            "disk_available": $avail
        }')
    
    # ディスク容量警告
    if [ "$used_percent" -gt 90 ]; then
        error "Disk usage critical: ${used_percent}%"
        send_alert "CRITICAL" "DISK_SPACE_CRITICAL" \
            "Backup disk usage is ${used_percent}%" \
            "{\"used_percent\": $used_percent, \"available\": \"$available\"}"
        issues_found=true
    elif [ "$used_percent" -gt 80 ]; then
        warning "Disk usage high: ${used_percent}%"
        send_alert "WARNING" "DISK_SPACE_WARNING" \
            "Backup disk usage is ${used_percent}%" \
            "{\"used_percent\": $used_percent, \"available\": \"$available\"}"
        issues_found=true
    fi
}

# 検証スケジュール確認
check_verification_schedule() {
    info "Checking verification schedule..."
    
    # 最新の検証実行確認
    local last_verification=$(sudo -u postgres psql -t -c "
        SELECT verification_type, start_time, status,
               EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))/3600 as hours_ago
        FROM backup_verification_history
        ORDER BY start_time DESC
        LIMIT 1;
    " "$DB_NAME" 2>/dev/null || echo "")
    
    if [ -n "$last_verification" ]; then
        local hours_ago=$(echo "$last_verification" | awk -F'|' '{print $4}' | tr -d ' ')
        local status=$(echo "$last_verification" | awk -F'|' '{print $3}' | tr -d ' ')
        
        info "Last verification: ${hours_ago}h ago (status: $status)"
        
        # 長期間検証が実行されていない場合
        if (( $(echo "$hours_ago > 168" | bc -l) )); then
            warning "No verification run in the last week"
            send_alert "WARNING" "VERIFICATION_OVERDUE" \
                "Backup verification has not run for $hours_ago hours" \
                "{\"hours_since_last\": $hours_ago}"
            issues_found=true
        fi
    else
        warning "No verification history found"
    fi
}

# メトリクス更新
update_metrics() {
    local results="$1"
    
    # 既存のメトリクスを読み込み
    local existing_metrics="{}"
    if [ -f "$METRICS_FILE" ]; then
        existing_metrics=$(cat "$METRICS_FILE" 2>/dev/null || echo "{}")
    fi
    
    # 新しいメトリクスを追加
    local new_metrics=$(echo "$existing_metrics" | jq \
        --argjson results "$results" \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '. + {
            "last_check": $timestamp,
            "current_status": $results
        }')
    
    echo "$new_metrics" > "$METRICS_FILE"
}

# メトリクスエクスポート
export_metrics() {
    if [ ! -f "$METRICS_FILE" ]; then
        error "No metrics file found"
        return 1
    fi
    
    echo "Backup Monitoring Metrics"
    echo "========================"
    cat "$METRICS_FILE" | jq '.'
}

# ステータスレポート生成
generate_status_report() {
    echo "================================================"
    echo "Backup Monitoring Status Report"
    echo "================================================"
    echo "Generated: $(date)"
    echo ""
    
    # 現在の監視状態
    if check_pid; then
        success "Monitor is running (PID: $(cat $MONITOR_PID_FILE))"
    else
        warning "Monitor is not running"
    fi
    echo ""
    
    # 最新のメトリクス
    if [ -f "$METRICS_FILE" ]; then
        echo "Latest Metrics:"
        cat "$METRICS_FILE" | jq '.current_status' 2>/dev/null || cat "$METRICS_FILE"
    fi
    echo ""
    
    # 最近のアラート
    echo "Recent Alerts (last 24h):"
    if [ -f "$ALERT_LOG" ]; then
        tail -20 "$ALERT_LOG" | grep "$(date +%Y-%m-%d)" || echo "No alerts today"
    fi
    echo ""
    
    # バックアップ検証サマリー
    echo "Verification Summary:"
    sudo -u postgres psql -d "$DB_NAME" -c "
        SELECT * FROM v_verification_status_summary LIMIT 5;
    " 2>/dev/null || echo "No verification data available"
    
    echo "================================================"
}

# 監視デーモン開始
start_monitoring() {
    if check_pid; then
        error "Monitor is already running (PID: $(cat $MONITOR_PID_FILE))"
        exit 1
    fi
    
    prepare_directories
    
    if [ "$RUN_AS_DAEMON" = true ]; then
        # デーモンとして実行
        info "Starting backup monitor as daemon..."
        nohup "$0" monitor-loop > "$LOG_FILE" 2>&1 &
        local pid=$!
        echo $pid > "$MONITOR_PID_FILE"
        success "Backup monitor started (PID: $pid)"
    else
        # フォアグラウンドで実行
        write_pid
        trap 'remove_pid; exit 0' TERM INT
        monitor_loop
    fi
}

# 監視ループ
monitor_loop() {
    info "Starting backup monitoring loop (interval: ${CHECK_INTERVAL}s)"
    
    while true; do
        log "Running backup status check..."
        check_backup_status
        
        # 次回実行まで待機
        sleep "$CHECK_INTERVAL"
    done
}

# 監視停止
stop_monitoring() {
    if ! check_pid; then
        warning "Monitor is not running"
        return
    fi
    
    local pid=$(cat "$MONITOR_PID_FILE")
    info "Stopping backup monitor (PID: $pid)..."
    
    kill "$pid" 2>/dev/null || true
    sleep 2
    
    if ! ps -p "$pid" > /dev/null 2>&1; then
        remove_pid
        success "Backup monitor stopped"
    else
        error "Failed to stop monitor, trying force kill..."
        kill -9 "$pid" 2>/dev/null || true
        remove_pid
    fi
}

# 最近のアラート表示
show_recent_alerts() {
    echo "Recent Backup Alerts"
    echo "===================="
    echo ""
    
    # データベースから取得
    sudo -u postgres psql -d "$DB_NAME" -c "
        SELECT alert_time, severity, alert_type, message
        FROM verification_alerts
        WHERE alert_time > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ORDER BY alert_time DESC
        LIMIT 20;
    " 2>/dev/null || echo "No alerts in database"
    
    echo ""
    echo "Alert Log (last 50 lines):"
    if [ -f "$ALERT_LOG" ]; then
        tail -50 "$ALERT_LOG"
    else
        echo "No alert log file found"
    fi
}

# メイン処理
main() {
    local command="${1:-help}"
    shift || true
    
    parse_args "$@"
    
    case "$command" in
        start)
            start_monitoring
            ;;
        stop)
            stop_monitoring
            ;;
        status)
            generate_status_report
            ;;
        check-once)
            prepare_directories
            check_backup_status
            ;;
        monitor-loop)
            monitor_loop
            ;;
        metrics)
            export_metrics
            ;;
        alerts)
            show_recent_alerts
            ;;
        report)
            generate_status_report
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# 実行
main "$@"