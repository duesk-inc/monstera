#!/bin/bash

# PostgreSQL レプリケーション監視スクリプト
# 定期的な監視と自動アラート生成

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# デフォルト設定
DEFAULT_INTERVAL=60  # 監視間隔（秒）
DEFAULT_LAG_WARNING=52428800  # 50MB
DEFAULT_LAG_CRITICAL=104857600  # 100MB
DEFAULT_LAG_SECONDS_WARNING=60  # 1分
DEFAULT_LAG_SECONDS_CRITICAL=300  # 5分

# 監視データベース
MONITOR_DB="${MONITOR_DB:-monstera}"

# ログファイル
LOG_DIR="/var/log/postgresql/replication"
LOG_FILE="$LOG_DIR/replication-monitor.log"

# アラート履歴
ALERT_HISTORY="$LOG_DIR/alerts.log"

# メトリクス出力
METRICS_FILE="$LOG_DIR/metrics.json"

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
    echo "PostgreSQL Replication Monitor"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  monitor           - Start continuous monitoring"
    echo "  check-once        - Run single health check"
    echo "  metrics           - Export metrics"
    echo "  report            - Generate status report"
    echo "  alert-test        - Test alert notification"
    echo "  help              - Show this help message"
    echo ""
    echo "Options:"
    echo "  --interval        - Monitoring interval in seconds (default: 60)"
    echo "  --lag-warning     - Warning threshold for lag in bytes"
    echo "  --lag-critical    - Critical threshold for lag in bytes"
    echo "  --webhook         - Webhook URL for alerts"
    echo "  --email           - Email address for alerts"
    echo "  --daemon          - Run as daemon"
    echo ""
    echo "Examples:"
    echo "  $0 monitor --interval=30"
    echo "  $0 check-once --lag-warning=10485760"
    echo "  $0 metrics --format=prometheus"
}

# パラメータ解析
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --interval=*)
                MONITOR_INTERVAL="${1#*=}"
                shift
                ;;
            --lag-warning=*)
                LAG_WARNING="${1#*=}"
                shift
                ;;
            --lag-critical=*)
                LAG_CRITICAL="${1#*=}"
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
            --format=*)
                METRICS_FORMAT="${1#*=}"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # デフォルト値設定
    MONITOR_INTERVAL="${MONITOR_INTERVAL:-$DEFAULT_INTERVAL}"
    LAG_WARNING="${LAG_WARNING:-$DEFAULT_LAG_WARNING}"
    LAG_CRITICAL="${LAG_CRITICAL:-$DEFAULT_LAG_CRITICAL}"
    LAG_SECONDS_WARNING="${LAG_SECONDS_WARNING:-$DEFAULT_LAG_SECONDS_WARNING}"
    LAG_SECONDS_CRITICAL="${LAG_SECONDS_CRITICAL:-$DEFAULT_LAG_SECONDS_CRITICAL}"
    METRICS_FORMAT="${METRICS_FORMAT:-json}"
}

# ディレクトリ準備
prepare_directories() {
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        chmod 755 "$LOG_DIR"
    fi
}

# アラート送信
send_alert() {
    local severity="$1"
    local node="$2"
    local message="$3"
    local details="$4"
    
    # アラート履歴記録
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$severity] $node: $message" >> "$ALERT_HISTORY"
    
    # Webhook送信
    if [ -n "$WEBHOOK_URL" ]; then
        local payload=$(cat <<EOF
{
    "severity": "$severity",
    "node": "$node",
    "message": "$message",
    "details": $details,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
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
        echo -e "Subject: [Replication Alert] $severity on $node\n\n$message\n\nDetails:\n$details" | \
            sendmail "$ALERT_EMAIL" 2>/dev/null || warning "Failed to send email alert"
    fi
    
    # データベース記録
    sudo -u postgres psql -d "$MONITOR_DB" -c "
        INSERT INTO replication_alerts (
            alert_type, node_name, severity, message, details
        ) VALUES (
            'MONITORING', '$node', '$severity', '$message', '$details'::JSONB
        );
    " >/dev/null 2>&1 || warning "Failed to record alert in database"
}

# レプリケーション状態チェック
check_replication_status() {
    local is_primary=$(sudo -u postgres psql -t -c "SELECT NOT pg_is_in_recovery();" | tr -d ' ')
    local node_name=$(hostname -s)
    local status_data="{}"
    local has_issues=false
    
    if [ "$is_primary" = "t" ]; then
        # プライマリサーバーチェック
        info "Checking primary server: $node_name"
        
        # 接続されているスタンバイの情報
        local standby_info=$(sudo -u postgres psql -t -A -c "
            SELECT jsonb_agg(jsonb_build_object(
                'application_name', application_name,
                'client_addr', client_addr::TEXT,
                'state', state,
                'lag_bytes', pg_wal_lsn_diff(sent_lsn, replay_lsn),
                'sync_state', sync_state,
                'write_lag_ms', EXTRACT(MILLISECONDS FROM write_lag),
                'flush_lag_ms', EXTRACT(MILLISECONDS FROM flush_lag),
                'replay_lag_ms', EXTRACT(MILLISECONDS FROM replay_lag)
            ))
            FROM pg_stat_replication;
        ")
        
        if [ "$standby_info" = "" ] || [ "$standby_info" = "null" ]; then
            warning "No standby servers connected to primary"
            send_alert "WARNING" "$node_name" "No standby servers connected" '{"type": "no_standbys"}'
            has_issues=true
        else
            # 各スタンバイのチェック
            echo "$standby_info" | jq -r '.[] | @json' | while read -r standby; do
                local app_name=$(echo "$standby" | jq -r '.application_name')
                local lag_bytes=$(echo "$standby" | jq -r '.lag_bytes // 0')
                local state=$(echo "$standby" | jq -r '.state')
                
                if [ "$lag_bytes" -gt "$LAG_CRITICAL" ]; then
                    error "Critical replication lag on $app_name: $(numfmt --to=iec-i --suffix=B $lag_bytes)"
                    send_alert "CRITICAL" "$app_name" "Critical replication lag detected" "$standby"
                    has_issues=true
                elif [ "$lag_bytes" -gt "$LAG_WARNING" ]; then
                    warning "High replication lag on $app_name: $(numfmt --to=iec-i --suffix=B $lag_bytes)"
                    send_alert "WARNING" "$app_name" "High replication lag detected" "$standby"
                    has_issues=true
                fi
                
                if [ "$state" != "streaming" ]; then
                    warning "Standby $app_name is not streaming (state: $state)"
                    has_issues=true
                fi
            done
        fi
        
        # レプリケーションスロットチェック
        local inactive_slots=$(sudo -u postgres psql -t -A -c "
            SELECT COUNT(*)
            FROM pg_replication_slots
            WHERE NOT active;
        ")
        
        if [ "$inactive_slots" -gt 0 ]; then
            warning "Found $inactive_slots inactive replication slots"
            local slot_details=$(sudo -u postgres psql -t -A -c "
                SELECT jsonb_agg(jsonb_build_object(
                    'slot_name', slot_name,
                    'retained_bytes', pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
                ))
                FROM pg_replication_slots
                WHERE NOT active;
            ")
            send_alert "WARNING" "$node_name" "Inactive replication slots detected" "$slot_details"
            has_issues=true
        fi
        
    else
        # スタンバイサーバーチェック
        info "Checking standby server: $node_name"
        
        # WALレシーバー状態
        local receiver_info=$(sudo -u postgres psql -t -A -c "
            SELECT jsonb_build_object(
                'status', status,
                'receive_lsn', receive_start_lsn::TEXT,
                'latest_end_lsn', latest_end_lsn::TEXT,
                'sender_host', sender_host,
                'sender_port', sender_port,
                'slot_name', slot_name
            )
            FROM pg_stat_wal_receiver
            LIMIT 1;
        ")
        
        if [ "$receiver_info" = "" ] || [ "$receiver_info" = "null" ]; then
            error "WAL receiver is not running"
            send_alert "CRITICAL" "$node_name" "WAL receiver not running" '{"type": "receiver_down"}'
            has_issues=true
        else
            local status=$(echo "$receiver_info" | jq -r '.status')
            if [ "$status" != "streaming" ]; then
                warning "WAL receiver status: $status"
                send_alert "WARNING" "$node_name" "WAL receiver not streaming" "$receiver_info"
                has_issues=true
            fi
        fi
        
        # レプリケーション遅延チェック
        local lag_info=$(sudo -u postgres psql -t -A -c "
            SELECT jsonb_build_object(
                'lag_bytes', pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()),
                'lag_seconds', EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())),
                'last_replay_time', pg_last_xact_replay_timestamp()
            );
        ")
        
        local lag_bytes=$(echo "$lag_info" | jq -r '.lag_bytes // 0')
        local lag_seconds=$(echo "$lag_info" | jq -r '.lag_seconds // 0' | awk '{print int($1)}')
        
        if [ "$lag_bytes" -gt "$LAG_CRITICAL" ] || [ "$lag_seconds" -gt "$LAG_SECONDS_CRITICAL" ]; then
            error "Critical replication lag: $(numfmt --to=iec-i --suffix=B $lag_bytes), ${lag_seconds}s"
            send_alert "CRITICAL" "$node_name" "Critical replication lag" "$lag_info"
            has_issues=true
        elif [ "$lag_bytes" -gt "$LAG_WARNING" ] || [ "$lag_seconds" -gt "$LAG_SECONDS_WARNING" ]; then
            warning "High replication lag: $(numfmt --to=iec-i --suffix=B $lag_bytes), ${lag_seconds}s"
            send_alert "WARNING" "$node_name" "High replication lag" "$lag_info"
            has_issues=true
        fi
    fi
    
    # 監視データ記録
    ./replication-setup.sh record-status >/dev/null 2>&1 || warning "Failed to record monitoring data"
    
    if [ "$has_issues" = false ]; then
        success "Replication status: OK"
    fi
    
    return $([ "$has_issues" = true ] && echo 1 || echo 0)
}

# メトリクス出力
export_metrics() {
    local metrics={}
    local is_primary=$(sudo -u postgres psql -t -c "SELECT NOT pg_is_in_recovery();" | tr -d ' ')
    
    if [ "$METRICS_FORMAT" = "prometheus" ]; then
        # Prometheus形式
        echo "# HELP postgresql_replication_lag_bytes Replication lag in bytes"
        echo "# TYPE postgresql_replication_lag_bytes gauge"
        
        if [ "$is_primary" = "t" ]; then
            sudo -u postgres psql -t -A -c "
                SELECT format('postgresql_replication_lag_bytes{application_name=\"%s\",sync_state=\"%s\"} %s',
                    application_name, sync_state, pg_wal_lsn_diff(sent_lsn, replay_lsn))
                FROM pg_stat_replication;
            "
        else
            local lag_bytes=$(sudo -u postgres psql -t -c "
                SELECT pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn());
            " | tr -d ' ')
            echo "postgresql_replication_lag_bytes{node=\"$(hostname -s)\"} ${lag_bytes:-0}"
        fi
        
        echo "# HELP postgresql_replication_connected_standbys Number of connected standbys"
        echo "# TYPE postgresql_replication_connected_standbys gauge"
        if [ "$is_primary" = "t" ]; then
            local count=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM pg_stat_replication;" | tr -d ' ')
            echo "postgresql_replication_connected_standbys ${count:-0}"
        fi
    else
        # JSON形式
        if [ "$is_primary" = "t" ]; then
            metrics=$(sudo -u postgres psql -t -A -c "
                SELECT jsonb_build_object(
                    'node_type', 'primary',
                    'node_name', '$(hostname -s)',
                    'timestamp', CURRENT_TIMESTAMP,
                    'connected_standbys', COUNT(*),
                    'standbys', jsonb_agg(jsonb_build_object(
                        'application_name', application_name,
                        'lag_bytes', pg_wal_lsn_diff(sent_lsn, replay_lsn),
                        'state', state,
                        'sync_state', sync_state
                    ))
                )
                FROM pg_stat_replication;
            ")
        else
            metrics=$(sudo -u postgres psql -t -A -c "
                SELECT jsonb_build_object(
                    'node_type', 'standby',
                    'node_name', '$(hostname -s)',
                    'timestamp', CURRENT_TIMESTAMP,
                    'lag_bytes', pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()),
                    'lag_seconds', EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())),
                    'receiver_status', (SELECT status FROM pg_stat_wal_receiver LIMIT 1)
                );
            ")
        fi
        
        echo "$metrics" > "$METRICS_FILE"
        echo "$metrics" | jq .
    fi
}

# ステータスレポート生成
generate_report() {
    echo "================================================"
    echo "Replication Status Report"
    echo "Generated: $(date)"
    echo "================================================"
    echo ""
    
    # 健全性チェック実行
    info "Running comprehensive health check..."
    
    local health_results=$(sudo -u postgres psql -d "$MONITOR_DB" -t -A -c "
        SELECT jsonb_agg(row_to_json(t))
        FROM check_replication_health() t;
    ")
    
    if [ -n "$health_results" ] && [ "$health_results" != "null" ]; then
        echo "$health_results" | jq -r '.[] | "[\(.status)] \(.check_name) - \(.node_name): \(.message)"'
    fi
    
    echo ""
    echo "Current Topology:"
    echo "-----------------"
    sudo -u postgres psql -d "$MONITOR_DB" -c "
        SELECT * FROM v_replication_topology;
    "
    
    echo ""
    echo "Replication Lag Trend (Last 24 hours):"
    echo "--------------------------------------"
    sudo -u postgres psql -d "$MONITOR_DB" -c "
        SELECT 
            node_name,
            hour,
            pg_size_pretty(avg_lag_bytes::BIGINT) as avg_lag,
            pg_size_pretty(max_lag_bytes::BIGINT) as max_lag,
            ROUND(avg_lag_seconds::NUMERIC, 2) as avg_seconds
        FROM v_replication_lag_trend
        WHERE hour > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ORDER BY node_name, hour DESC
        LIMIT 10;
    "
    
    echo ""
    echo "Active Alerts:"
    echo "--------------"
    sudo -u postgres psql -d "$MONITOR_DB" -c "
        SELECT 
            alert_type,
            node_name,
            severity,
            message,
            alert_time
        FROM v_active_replication_alerts
        ORDER BY severity_order, alert_time DESC;
    "
}

# 継続的監視
continuous_monitor() {
    info "Starting continuous replication monitoring..."
    info "Interval: ${MONITOR_INTERVAL}s"
    info "Lag Warning: $(numfmt --to=iec-i --suffix=B $LAG_WARNING)"
    info "Lag Critical: $(numfmt --to=iec-i --suffix=B $LAG_CRITICAL)"
    
    if [ "$RUN_AS_DAEMON" = true ]; then
        # デーモンとして実行
        exec > "$LOG_FILE" 2>&1
        
        # PIDファイル作成
        echo $$ > "$LOG_DIR/monitor.pid"
        
        # シグナルハンドラー
        trap 'info "Monitoring stopped"; rm -f "$LOG_DIR/monitor.pid"; exit 0' TERM INT
    fi
    
    while true; do
        log "Running replication check..."
        
        if check_replication_status; then
            # メトリクス出力
            export_metrics >/dev/null 2>&1
        else
            warning "Issues detected during replication check"
        fi
        
        sleep "$MONITOR_INTERVAL"
    done
}

# アラートテスト
test_alert() {
    info "Testing alert notifications..."
    
    send_alert "TEST" "$(hostname -s)" "This is a test alert" '{
        "test": true,
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
        "message": "Alert notification test"
    }'
    
    success "Test alert sent"
}

# メイン処理
main() {
    local command="${1:-help}"
    shift || true
    
    parse_args "$@"
    prepare_directories
    
    case "$command" in
        monitor)
            continuous_monitor
            ;;
        check-once)
            check_replication_status
            ;;
        metrics)
            export_metrics
            ;;
        report)
            generate_report
            ;;
        alert-test)
            test_alert
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