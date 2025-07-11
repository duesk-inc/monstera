#!/bin/bash

# PostgreSQLコネクション監視スクリプト
# データベース接続の状況を監視し、アラートを生成

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

# 環境変数からパスワードを取得
export PGPASSWORD="${DB_PASSWORD:-password}"

# 監視閾値（環境変数で上書き可能）
WARNING_THRESHOLD="${WARNING_THRESHOLD:-60}"
CRITICAL_THRESHOLD="${CRITICAL_THRESHOLD:-80}"
EMERGENCY_THRESHOLD="${EMERGENCY_THRESHOLD:-90}"

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
        echo "Please check your connection settings:"
        echo "  DB_HOST: $DB_HOST"
        echo "  DB_PORT: $DB_PORT"
        echo "  DB_NAME: $DB_NAME"
        echo "  DB_USER: $DB_USER"
        exit 1
    fi
}

# 必要なテーブル・関数の存在確認
check_prerequisites() {
    local missing_objects=""
    
    # テーブル存在確認
    for table in "connection_monitoring_history" "connection_alerts" "connection_pool_settings"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = '$table'
            );" | grep -q "t"; then
            missing_objects="$missing_objects $table"
        fi
    done
    
    # ビュー存在確認
    for view in "v_current_connections" "v_connection_monitoring_summary"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.views 
                WHERE table_name = '$view'
            );" | grep -q "t"; then
            missing_objects="$missing_objects $view"
        fi
    done
    
    if [ -n "$missing_objects" ]; then
        error "Missing required objects:$missing_objects"
        echo "Please run the migration first:"
        echo "  migrate -path migrations -database 'postgresql://...' up"
        exit 1
    fi
}

# 現在の接続状況サマリー
show_connection_summary() {
    log "Connection Status Summary"
    echo -e "${BLUE}=========================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    'Current Connections' as "Metric",
    current_connections::text as "Value",
    CASE 
        WHEN usage_percent >= 90 THEN '🔴 EMERGENCY'
        WHEN usage_percent >= 80 THEN '🟠 CRITICAL'
        WHEN usage_percent >= 60 THEN '🟡 WARNING'
        ELSE '🟢 OK'
    END as "Status"
FROM v_connection_monitoring_summary
UNION ALL
SELECT 
    'Max Connections',
    max_connections::text,
    ''
FROM v_connection_monitoring_summary
UNION ALL
SELECT 
    'Usage Percentage',
    usage_percent::text || '%',
    ''
FROM v_connection_monitoring_summary
UNION ALL
SELECT 
    'Active Connections',
    active_connections::text,
    ''
FROM v_connection_monitoring_summary
UNION ALL
SELECT 
    'Idle Connections',
    idle_connections::text,
    ''
FROM v_connection_monitoring_summary
UNION ALL
SELECT 
    'Idle in Transaction',
    idle_in_transaction::text,
    CASE 
        WHEN idle_in_transaction > 5 THEN '⚠️ HIGH'
        WHEN idle_in_transaction > 2 THEN '⚠️ MODERATE'
        ELSE ''
    END
FROM v_connection_monitoring_summary
UNION ALL
SELECT 
    'Waiting Connections',
    waiting_connections::text,
    CASE WHEN waiting_connections > 0 THEN '⚠️' ELSE '' END
FROM v_connection_monitoring_summary
UNION ALL
SELECT 
    'Long Running Queries',
    long_running_queries::text,
    CASE WHEN long_running_queries > 3 THEN '⚠️ HIGH' ELSE '' END
FROM v_connection_monitoring_summary
UNION ALL
SELECT 
    'Estimated Memory',
    estimated_memory_gb::text || ' GB',
    ''
FROM v_connection_monitoring_summary;
EOF
    echo ""
}

# アプリケーション別接続状況
show_connections_by_application() {
    log "Connections by Application"
    echo -e "${BLUE}==========================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    application_name as "Application",
    connection_count as "Connections",
    percentage || '%' as "Percentage",
    active_count as "Active",
    idle_count as "Idle",
    idle_in_transaction_count as "Idle in Tx",
    round(avg_duration_seconds) || 's' as "Avg Duration",
    unique_users as "Users",
    array_to_string(databases, ', ') as "Databases"
FROM v_connections_by_application
ORDER BY connection_count DESC;
EOF
    echo ""
}

# 問題のある接続
show_problematic_connections() {
    log "Problematic Connections"
    echo -e "${BLUE}=======================${NC}"
    echo ""
    
    local problem_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) FROM v_problematic_connections;
    " | tr -d ' ')
    
    if [ "$problem_count" -eq 0 ]; then
        echo -e "${GREEN}✅ No problematic connections detected${NC}"
        echo ""
        return
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    pid as "PID",
    usename as "User",
    application_name as "Application",
    datname as "Database",
    state as "State",
    problem_type as "Problem",
    connection_age_seconds || 's' as "Conn Age",
    CASE 
        WHEN query_age_seconds IS NOT NULL 
        THEN query_age_seconds || 's'
        ELSE 'N/A'
    END as "Query Age",
    recommended_action as "Recommended Action",
    substring(query_preview, 1, 50) || '...' as "Query Preview"
FROM v_problematic_connections
ORDER BY 
    CASE problem_type
        WHEN 'LONG_IDLE_TRANSACTION' THEN 1
        WHEN 'LONG_RUNNING_QUERY' THEN 2
        WHEN 'LONG_WAITING' THEN 3
        ELSE 4
    END,
    connection_age_seconds DESC;
EOF
    echo ""
}

# 接続の詳細統計
show_detailed_statistics() {
    log "Detailed Connection Statistics"
    echo -e "${BLUE}==============================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

-- 状態別接続数
SELECT 
    'Connection States' as "Category",
    state as "State",
    count(*) as "Count",
    round(100.0 * count(*) / sum(count(*)) OVER (), 2) || '%' as "Percentage"
FROM pg_stat_activity 
WHERE pid != pg_backend_pid()
GROUP BY state
ORDER BY count(*) DESC;

\echo
\echo '--- Database Distribution ---'

-- データベース別接続数
SELECT 
    'Database Distribution' as "Category",
    COALESCE(datname, 'N/A') as "Database",
    count(*) as "Count",
    round(100.0 * count(*) / sum(count(*)) OVER (), 2) || '%' as "Percentage"
FROM pg_stat_activity 
WHERE pid != pg_backend_pid()
GROUP BY datname
ORDER BY count(*) DESC;

\echo
\echo '--- Wait Events ---'

-- 待機イベント統計
SELECT 
    'Wait Events' as "Category",
    COALESCE(wait_event_type, 'Not Waiting') as "Wait Type",
    COALESCE(wait_event, 'N/A') as "Wait Event",
    count(*) as "Count"
FROM pg_stat_activity 
WHERE pid != pg_backend_pid()
GROUP BY wait_event_type, wait_event
HAVING count(*) > 0
ORDER BY count(*) DESC;
EOF
    echo ""
}

# アラートチェック
check_alerts() {
    log "Checking for connection alerts..."
    
    local alert_results=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT string_agg(
            alert_type || '|' || message || '|' || connection_count || '|' || usage_percent || '|' || recommended_action, 
            E'\n'
        )
        FROM check_connection_alerts();
    ")
    
    if [ -z "$alert_results" ] || [ "$alert_results" = " " ]; then
        success "No alerts generated - connection levels are normal"
        return 0
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  Connection Alerts Detected:${NC}"
    echo "================================="
    
    local alert_level=""
    echo "$alert_results" | while IFS='|' read -r alert_type message conn_count usage_pct action; do
        case "$alert_type" in
            "EMERGENCY")
                echo -e "${RED}🚨 EMERGENCY${NC}: $message"
                echo -e "   Connections: $conn_count (${usage_pct}%)"
                echo -e "   Action: $action"
                alert_level="EMERGENCY"
                ;;
            "CRITICAL")
                echo -e "${RED}🔴 CRITICAL${NC}: $message"
                echo -e "   Connections: $conn_count (${usage_pct}%)"
                echo -e "   Action: $action"
                [ "$alert_level" != "EMERGENCY" ] && alert_level="CRITICAL"
                ;;
            "WARNING")
                echo -e "${YELLOW}🟡 WARNING${NC}: $message"
                echo -e "   Connections: $conn_count (${usage_pct}%)"
                echo -e "   Action: $action"
                [ -z "$alert_level" ] && alert_level="WARNING"
                ;;
        esac
        echo ""
    done
    
    return 1
}

# 履歴の記録
record_statistics() {
    log "Recording connection statistics..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT record_connection_stats();" > /dev/null 2>&1; then
        success "Statistics recorded successfully"
    else
        error "Failed to record statistics"
        return 1
    fi
}

# 緊急時のクリーンアップ
emergency_cleanup() {
    local max_idle_minutes="${1:-30}"
    local max_idle_transaction_minutes="${2:-5}"
    
    warning "Executing emergency connection cleanup..."
    echo "  Max idle time: ${max_idle_minutes} minutes"
    echo "  Max idle transaction time: ${max_idle_transaction_minutes} minutes"
    echo ""
    
    read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled"
        return 1
    fi
    
    local cleanup_results=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT string_agg(
            action_type || '|' || terminated_count || '|' || message,
            E'\n'
        )
        FROM emergency_connection_cleanup($max_idle_minutes, $max_idle_transaction_minutes);
    ")
    
    echo ""
    echo -e "${BLUE}Cleanup Results:${NC}"
    echo "================"
    
    if [ -z "$cleanup_results" ] || [ "$cleanup_results" = " " ]; then
        echo "No cleanup actions performed"
        return 0
    fi
    
    echo "$cleanup_results" | while IFS='|' read -r action_type count message; do
        case "$action_type" in
            "TERMINATE_IDLE")
                echo -e "${GREEN}✅ Idle connections${NC}: $message"
                ;;
            "TERMINATE_IDLE_TRANSACTION")
                echo -e "${GREEN}✅ Idle transactions${NC}: $message"
                ;;
            "NO_ACTION")
                echo -e "${BLUE}ℹ️  No action${NC}: $message"
                ;;
        esac
    done
    echo ""
}

# JSON形式でのレポート生成
generate_json_report() {
    log "Generating JSON report..."
    
    local output_file="connection_report_$(date +%Y%m%d_%H%M%S).json"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF > "$output_file"
SELECT json_build_object(
    'report_timestamp', now(),
    'database_info', json_build_object(
        'host', '$DB_HOST',
        'database', '$DB_NAME',
        'port', $DB_PORT
    ),
    'connection_summary', (
        SELECT row_to_json(s) 
        FROM v_connection_monitoring_summary s
    ),
    'connections_by_application', (
        SELECT json_agg(
            json_build_object(
                'application_name', application_name,
                'connection_count', connection_count,
                'percentage', percentage,
                'active_count', active_count,
                'idle_count', idle_count,
                'idle_in_transaction_count', idle_in_transaction_count,
                'avg_duration_seconds', avg_duration_seconds,
                'unique_users', unique_users,
                'databases', databases
            )
        )
        FROM v_connections_by_application
    ),
    'problematic_connections', (
        SELECT json_agg(
            json_build_object(
                'pid', pid,
                'user', usename,
                'application', application_name,
                'database', datname,
                'state', state,
                'problem_type', problem_type,
                'connection_age_seconds', connection_age_seconds,
                'query_age_seconds', query_age_seconds,
                'recommended_action', recommended_action,
                'query_preview', query_preview
            )
        )
        FROM v_problematic_connections
    ),
    'alerts', (
        SELECT json_agg(
            json_build_object(
                'alert_type', alert_type,
                'message', message,
                'connection_count', connection_count,
                'usage_percent', usage_percent,
                'recommended_action', recommended_action
            )
        )
        FROM check_connection_alerts()
    )
);
EOF
    
    success "JSON report saved to: $output_file"
}

# 設定情報の表示
show_configuration() {
    log "Connection Pool Configuration"
    echo -e "${BLUE}=============================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    application_name as "Application",
    environment as "Environment",
    max_open_connections as "Max Open",
    max_idle_connections as "Max Idle",
    connection_max_lifetime_seconds || 's' as "Max Lifetime",
    connection_max_idle_time_seconds || 's' as "Max Idle Time",
    warning_threshold_percent || '%' as "Warning",
    critical_threshold_percent || '%' as "Critical",
    emergency_threshold_percent || '%' as "Emergency",
    is_active as "Active"
FROM connection_pool_settings
ORDER BY application_name, environment;
EOF
    echo ""
}

# 履歴トレンドの表示
show_history_trend() {
    local hours="${1:-24}"
    
    log "Connection History Trend (Last $hours hours)"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

SELECT 
    to_char(snapshot_time, 'MM-DD HH24:MI') as "Time",
    total_connections as "Total",
    connection_usage_percent || '%' as "Usage %",
    active_connections as "Active",
    idle_connections as "Idle",
    idle_in_transaction_connections as "Idle Tx",
    long_running_queries_count as "Long Queries",
    round(estimated_memory_usage_mb / 1024.0, 2) || ' GB' as "Memory"
FROM connection_monitoring_history
WHERE snapshot_time > CURRENT_TIMESTAMP - INTERVAL '$hours hours'
ORDER BY snapshot_time DESC
LIMIT 20;
EOF
    echo ""
}

# ヘルプ表示
show_help() {
    echo "PostgreSQL Connection Monitoring Script"
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  monitor           - Show comprehensive connection monitoring dashboard (default)"
    echo "  summary           - Show connection summary only"
    echo "  applications      - Show connections by application"
    echo "  problems          - Show problematic connections only"
    echo "  statistics        - Show detailed connection statistics"
    echo "  alerts            - Check for connection alerts"
    echo "  record            - Record current statistics to history"
    echo "  cleanup [idle_min] [tx_min] - Emergency connection cleanup"
    echo "  config            - Show connection pool configuration"
    echo "  history [hours]   - Show connection history trend"
    echo "  json              - Generate JSON report"
    echo "  help              - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST               - PostgreSQL host (default: localhost)"
    echo "  DB_PORT               - PostgreSQL port (default: 5432)"
    echo "  DB_NAME               - Database name (default: monstera)"
    echo "  DB_USER               - Database user (default: postgres)"
    echo "  DB_PASSWORD           - Database password"
    echo "  WARNING_THRESHOLD     - Warning threshold percentage (default: 60)"
    echo "  CRITICAL_THRESHOLD    - Critical threshold percentage (default: 80)"
    echo "  EMERGENCY_THRESHOLD   - Emergency threshold percentage (default: 90)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Full monitoring dashboard"
    echo "  $0 problems                  # Show only problematic connections"
    echo "  $0 cleanup 30 5              # Emergency cleanup (30min idle, 5min idle tx)"
    echo "  $0 history 12                # Show 12-hour history trend"
    echo "  WARNING_THRESHOLD=50 $0      # Custom warning threshold"
    echo "  $0 json                      # Generate JSON report"
}

# メイン処理
main() {
    local command="${1:-monitor}"
    
    echo -e "${PURPLE}PostgreSQL Connection Monitoring${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo ""
    
    case "$command" in
        monitor)
            test_connection
            check_prerequisites
            show_connection_summary
            show_connections_by_application
            show_problematic_connections
            check_alerts
            ;;
        summary)
            test_connection
            check_prerequisites
            show_connection_summary
            ;;
        applications)
            test_connection
            check_prerequisites
            show_connections_by_application
            ;;
        problems)
            test_connection
            check_prerequisites
            show_problematic_connections
            ;;
        statistics)
            test_connection
            check_prerequisites
            show_detailed_statistics
            ;;
        alerts)
            test_connection
            check_prerequisites
            check_alerts
            ;;
        record)
            test_connection
            check_prerequisites
            record_statistics
            ;;
        cleanup)
            test_connection
            check_prerequisites
            emergency_cleanup "$2" "$3"
            ;;
        config)
            test_connection
            check_prerequisites
            show_configuration
            ;;
        history)
            test_connection
            check_prerequisites
            show_history_trend "$2"
            ;;
        json)
            test_connection
            check_prerequisites
            generate_json_report
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