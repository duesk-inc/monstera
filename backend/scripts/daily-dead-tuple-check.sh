#!/bin/bash

# デッドタプル日次監視スクリプト
# cron等で定期実行するためのスクリプト

set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ログファイルの設定
LOG_DIR="${LOG_DIR:-/tmp}"
LOG_FILE="$LOG_DIR/dead_tuple_check_$(date +%Y%m%d).log"
ALERT_LOG_FILE="$LOG_DIR/dead_tuple_alerts_$(date +%Y%m%d).log"

# PostgreSQL接続情報
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera}"
DB_USER="${DB_USER:-postgres}"

# 環境変数からパスワードを取得
export PGPASSWORD="${DB_PASSWORD:-password}"

# アラート設定
WARNING_RATIO="${WARNING_RATIO:-20}"
CRITICAL_RATIO="${CRITICAL_RATIO:-40}"
WARNING_COUNT="${WARNING_COUNT:-500000}"
CRITICAL_COUNT="${CRITICAL_COUNT:-1000000}"

# 通知設定
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_RECIPIENT="${EMAIL_RECIPIENT:-}"
ENABLE_NOTIFICATIONS="${ENABLE_NOTIFICATIONS:-false}"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" | tee -a "$LOG_FILE" >&2
}

# PostgreSQL接続テスト
test_connection() {
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to PostgreSQL database"
        exit 1
    fi
}

# 統計の記録
record_statistics() {
    log "Recording dead tuple statistics..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT record_dead_tuple_stats();" >> "$LOG_FILE" 2>&1; then
        log "Statistics recorded successfully"
    else
        error "Failed to record statistics"
        return 1
    fi
}

# アラートの生成
generate_alerts() {
    log "Generating/updating alerts..."
    
    local alert_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT generate_dead_tuple_alerts();
    " 2>> "$LOG_FILE" | tr -d ' ')
    
    if [ -n "$alert_count" ] && [ "$alert_count" -gt 0 ]; then
        log "Generated $alert_count new alerts"
        return 0
    else
        log "No new alerts generated"
        return 1
    fi
}

# 重要な問題をチェック
check_critical_issues() {
    log "Checking for critical dead tuple issues..."
    
    # 重要レベルの問題を取得
    local critical_issues=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) 
        FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
        WHERE alert_level = 'CRITICAL';
    " 2>> "$LOG_FILE" | tr -d ' ')
    
    # 警告レベルの問題を取得
    local warning_issues=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) 
        FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
        WHERE alert_level = 'WARNING';
    " 2>> "$LOG_FILE" | tr -d ' ')
    
    if [ -n "$critical_issues" ] && [ "$critical_issues" -gt 0 ]; then
        log "CRITICAL: Found $critical_issues tables with critical dead tuple issues"
        
        # 詳細をアラートログに記録
        {
            echo "=== CRITICAL DEAD TUPLE ISSUES - $(date) ==="
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                SELECT 
                    table_name,
                    dead_tuples,
                    dead_ratio || '%' as dead_ratio,
                    table_size,
                    message,
                    recommendation
                FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
                WHERE alert_level = 'CRITICAL'
                ORDER BY dead_tuples DESC;
            "
            echo ""
        } >> "$ALERT_LOG_FILE"
        
        send_notification "CRITICAL" "$critical_issues" "$warning_issues"
        return 2  # Critical
    elif [ -n "$warning_issues" ] && [ "$warning_issues" -gt 0 ]; then
        log "WARNING: Found $warning_issues tables with warning-level dead tuple issues"
        
        # 詳細をアラートログに記録
        {
            echo "=== WARNING DEAD TUPLE ISSUES - $(date) ==="
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                SELECT 
                    table_name,
                    dead_tuples,
                    dead_ratio || '%' as dead_ratio,
                    table_size,
                    message
                FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
                WHERE alert_level = 'WARNING'
                ORDER BY dead_tuples DESC;
            "
            echo ""
        } >> "$ALERT_LOG_FILE"
        
        send_notification "WARNING" "$critical_issues" "$warning_issues"
        return 1  # Warning
    else
        log "OK: No critical dead tuple issues found"
        return 0  # OK
    fi
}

# 通知の送信
send_notification() {
    local severity="$1"
    local critical_count="$2"
    local warning_count="$3"
    
    if [ "$ENABLE_NOTIFICATIONS" != "true" ]; then
        log "Notifications are disabled"
        return
    fi
    
    local message=""
    local color=""
    local emoji=""
    
    case "$severity" in
        "CRITICAL")
            color="danger"
            emoji="🔴"
            message="CRITICAL: Dead tuple issues detected in database $DB_NAME"
            ;;
        "WARNING")
            color="warning"
            emoji="🟡"
            message="WARNING: Dead tuple issues detected in database $DB_NAME"
            ;;
        *)
            color="good"
            emoji="🟢"
            message="OK: No critical dead tuple issues in database $DB_NAME"
            ;;
    esac
    
    # Slack通知
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        send_slack_notification "$message" "$color" "$emoji" "$critical_count" "$warning_count"
    fi
    
    # Email通知
    if [ -n "$EMAIL_RECIPIENT" ]; then
        send_email_notification "$message" "$severity" "$critical_count" "$warning_count"
    fi
}

# Slack通知の送信
send_slack_notification() {
    local message="$1"
    local color="$2"
    local emoji="$3"
    local critical_count="$4"
    local warning_count="$5"
    
    local payload=$(cat << EOF
{
    "text": "$emoji $message",
    "attachments": [
        {
            "color": "$color",
            "fields": [
                {
                    "title": "Database",
                    "value": "$DB_NAME@$DB_HOST",
                    "short": true
                },
                {
                    "title": "Critical Tables",
                    "value": "$critical_count",
                    "short": true
                },
                {
                    "title": "Warning Tables",
                    "value": "$warning_count",
                    "short": true
                },
                {
                    "title": "Check Time",
                    "value": "$(date '+%Y-%m-%d %H:%M:%S')",
                    "short": true
                }
            ],
            "footer": "Dead Tuple Monitor",
            "ts": $(date +%s)
        }
    ]
}
EOF
)
    
    if curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" >> "$LOG_FILE" 2>&1; then
        log "Slack notification sent successfully"
    else
        error "Failed to send Slack notification"
    fi
}

# Email通知の送信
send_email_notification() {
    local message="$1"
    local severity="$2"
    local critical_count="$3"
    local warning_count="$4"
    
    local subject="[$severity] Dead Tuple Alert - $DB_NAME"
    
    local email_body=$(cat << EOF
Dead Tuple Monitoring Alert

Database: $DB_NAME@$DB_HOST:$DB_PORT
Severity: $severity
Check Time: $(date '+%Y-%m-%d %H:%M:%S')

Summary:
- Critical Tables: $critical_count
- Warning Tables: $warning_count

Details:
$(cat "$ALERT_LOG_FILE" 2>/dev/null || echo "No detailed alert log available")

Logs:
$(tail -20 "$LOG_FILE")

--
PostgreSQL Dead Tuple Monitor
EOF
)
    
    if echo "$email_body" | mail -s "$subject" "$EMAIL_RECIPIENT" >> "$LOG_FILE" 2>&1; then
        log "Email notification sent to $EMAIL_RECIPIENT"
    else
        error "Failed to send email notification"
    fi
}

# サマリーレポートの生成
generate_summary_report() {
    log "Generating daily summary report..."
    
    local report_file="$LOG_DIR/dead_tuple_summary_$(date +%Y%m%d).txt"
    
    {
        echo "=== Dead Tuple Daily Summary Report ==="
        echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "Database: $DB_NAME@$DB_HOST:$DB_PORT"
        echo ""
        
        echo "=== Overall Statistics ==="
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                'Total Tables: ' || total_tables::text ||
                ', Dead Tuple Ratio: ' || COALESCE(overall_dead_ratio::text || '%', '0%') ||
                ', Warning Tables: ' || tables_warning::text ||
                ', Critical Tables: ' || tables_critical::text ||
                ', Vacuum Overdue: ' || tables_vacuum_overdue::text as summary
            FROM v_dead_tuple_summary;
        " -t
        echo ""
        
        echo "=== Top 5 Tables by Dead Tuple Ratio ==="
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                (schemaname || '.' || tablename) as table_name,
                dead_tuple_ratio || '%' as dead_ratio,
                dead_tuples,
                table_size_pretty as size
            FROM v_dead_tuple_monitoring
            WHERE dead_tuples > 0
            ORDER BY dead_tuple_ratio DESC
            LIMIT 5;
        "
        echo ""
        
        echo "=== Current Issues ==="
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                table_name,
                alert_level,
                dead_tuples,
                dead_ratio || '%' as dead_ratio,
                recommendation
            FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
            WHERE alert_level IN ('WARNING', 'CRITICAL')
            ORDER BY 
                CASE alert_level 
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'WARNING' THEN 2
                    ELSE 3
                END,
                dead_tuples DESC;
        "
        
    } > "$report_file" 2>&1
    
    log "Summary report saved to: $report_file"
}

# ログのクリーンアップ
cleanup_old_logs() {
    local retention_days="${LOG_RETENTION_DAYS:-7}"
    
    log "Cleaning up logs older than $retention_days days..."
    
    # 古いログファイルを削除
    find "$LOG_DIR" -name "dead_tuple_*.log" -mtime +$retention_days -delete 2>/dev/null || true
    find "$LOG_DIR" -name "dead_tuple_*.txt" -mtime +$retention_days -delete 2>/dev/null || true
    
    log "Log cleanup completed"
}

# メイン処理
main() {
    log "Starting daily dead tuple check..."
    
    # 接続テスト
    test_connection
    
    # 統計の記録
    if ! record_statistics; then
        error "Failed to record statistics, aborting check"
        exit 1
    fi
    
    # アラートの生成
    generate_alerts
    
    # 重要な問題のチェック
    local check_result=0
    check_critical_issues
    check_result=$?
    
    # サマリーレポートの生成
    generate_summary_report
    
    # ログのクリーンアップ
    cleanup_old_logs
    
    case $check_result in
        0)
            log "Daily check completed successfully - No issues found"
            ;;
        1)
            log "Daily check completed with warnings"
            ;;
        2)
            log "Daily check completed with critical issues"
            ;;
    esac
    
    log "Dead tuple check finished"
    exit $check_result
}

# ヘルプ表示
show_help() {
    echo "Daily Dead Tuple Check Script"
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script is designed to run as a cron job for daily monitoring."
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST                 - PostgreSQL host (default: localhost)"
    echo "  DB_PORT                 - PostgreSQL port (default: 5432)"
    echo "  DB_NAME                 - Database name (default: monstera)"
    echo "  DB_USER                 - Database user (default: postgres)"
    echo "  DB_PASSWORD             - Database password"
    echo "  LOG_DIR                 - Log directory (default: /tmp)"
    echo "  LOG_RETENTION_DAYS      - Log retention period (default: 7)"
    echo "  WARNING_RATIO           - Warning threshold for dead ratio (default: 20)"
    echo "  CRITICAL_RATIO          - Critical threshold for dead ratio (default: 40)"
    echo "  WARNING_COUNT           - Warning threshold for dead count (default: 500000)"
    echo "  CRITICAL_COUNT          - Critical threshold for dead count (default: 1000000)"
    echo "  ENABLE_NOTIFICATIONS    - Enable notifications (default: false)"
    echo "  SLACK_WEBHOOK_URL       - Slack webhook URL for notifications"
    echo "  EMAIL_RECIPIENT         - Email address for notifications"
    echo ""
    echo "Example Cron Entry:"
    echo "  # Run daily at 6 AM"
    echo "  0 6 * * * /path/to/daily-dead-tuple-check.sh"
    echo ""
    echo "Exit Codes:"
    echo "  0 - Success, no issues"
    echo "  1 - Success, but warnings found"
    echo "  2 - Success, but critical issues found"
    echo "  >2 - Error occurred"
}

# 引数の処理
case "${1:-}" in
    -h|--help|help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac