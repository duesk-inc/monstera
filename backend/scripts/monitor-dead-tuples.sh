#!/bin/bash

# PostgreSQLデッドタプル監視スクリプト
# デッドタプルの状況を監視し、アラートを生成

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

# デフォルト閾値
WARNING_RATIO="${WARNING_RATIO:-20}"
CRITICAL_RATIO="${CRITICAL_RATIO:-40}"
WARNING_COUNT="${WARNING_COUNT:-500000}"
CRITICAL_COUNT="${CRITICAL_COUNT:-1000000}"

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
    for table in "dead_tuple_alerts" "dead_tuple_history"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = '$table'
            );" | grep -q "t"; then
            missing_objects="$missing_objects $table"
        fi
    done
    
    # 関数存在確認
    for func in "check_dead_tuples" "record_dead_tuple_stats" "generate_dead_tuple_alerts"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.routines 
                WHERE routine_name = '$func'
            );" | grep -q "t"; then
            missing_objects="$missing_objects $func"
        fi
    done
    
    if [ -n "$missing_objects" ]; then
        error "Missing required objects:$missing_objects"
        echo "Please run the migration first:"
        echo "  migrate -path migrations -database 'postgresql://...' up"
        exit 1
    fi
}

# 全体サマリーの表示
show_summary() {
    log "Dead Tuple Summary"
    echo -e "${BLUE}==================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    'Total Tables' as "Metric",
    total_tables::text as "Value"
FROM v_dead_tuple_summary
UNION ALL
SELECT 
    'Tables with Dead Tuples',
    (total_tables - tables_no_dead_tuples)::text
FROM v_dead_tuple_summary
UNION ALL
SELECT 
    'Overall Dead Tuple Ratio',
    overall_dead_ratio::text || '%'
FROM v_dead_tuple_summary
UNION ALL
SELECT 
    'Tables - OK Status',
    tables_ok::text
FROM v_dead_tuple_summary
UNION ALL
SELECT 
    'Tables - Warning Status',
    tables_warning::text
FROM v_dead_tuple_summary
UNION ALL
SELECT 
    'Tables - Critical Status',
    tables_critical::text
FROM v_dead_tuple_summary
UNION ALL
SELECT 
    'Tables - Vacuum Overdue',
    tables_vacuum_overdue::text
FROM v_dead_tuple_summary
UNION ALL
SELECT 
    'Total Database Size',
    total_size
FROM v_dead_tuple_summary;
EOF
    echo ""
}

# デッドタプル問題のあるテーブル一覧
show_problem_tables() {
    log "Tables with Dead Tuple Issues"
    echo -e "${BLUE}==============================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

SELECT 
    table_name as "Table",
    alert_level as "Level",
    dead_tuples as "Dead Tuples",
    live_tuples as "Live Tuples",
    dead_ratio || '%' as "Dead %",
    table_size as "Size",
    COALESCE(hours_since_vacuum::text || 'h', 'Never') as "Since Vacuum",
    CASE 
        WHEN alert_level = 'CRITICAL' THEN '🔴'
        WHEN alert_level = 'WARNING' THEN '🟡'
        ELSE '🟢'
    END as "Status"
FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
WHERE alert_level IN ('WARNING', 'CRITICAL')
ORDER BY 
    CASE alert_level 
        WHEN 'CRITICAL' THEN 1
        WHEN 'WARNING' THEN 2
        ELSE 3
    END,
    dead_tuples DESC;
EOF
    echo ""
}

# TOP 10 デッドタプル率の高いテーブル
show_top_dead_ratio_tables() {
    log "Top 10 Tables by Dead Tuple Ratio"
    echo -e "${BLUE}===================================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    rank() OVER (ORDER BY dead_tuple_ratio DESC) as "Rank",
    (schemaname || '.' || tablename) as "Table",
    dead_tuple_ratio || '%' as "Dead Ratio",
    dead_tuples as "Dead Tuples",
    live_tuples as "Live Tuples",
    table_size_pretty as "Size",
    CASE 
        WHEN hours_since_last_vacuum IS NOT NULL 
        THEN hours_since_last_vacuum::text || 'h'
        ELSE 'Never'
    END as "Since Vacuum",
    vacuum_priority as "Priority"
FROM v_dead_tuple_monitoring
WHERE dead_tuples > 0
ORDER BY dead_tuple_ratio DESC
LIMIT 10;
EOF
    echo ""
}

# autovacuum活動状況
show_autovacuum_activity() {
    log "Autovacuum Activity Status"
    echo -e "${BLUE}===========================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    (schemaname || '.' || tablename) as "Table",
    vacuum_status as "Status",
    CASE 
        WHEN hours_since_last_vacuum IS NOT NULL 
        THEN hours_since_last_vacuum::text || 'h'
        ELSE 'Never'
    END as "Since Vacuum",
    autovacuum_count as "Auto Count",
    current_dead_tuples as "Dead Tuples",
    COALESCE(current_dead_ratio::text || '%', '0%') as "Dead %",
    next_vacuum_threshold as "Next Threshold",
    table_size as "Size"
FROM v_autovacuum_activity
WHERE vacuum_status IN ('CRITICAL', 'WARNING', 'NOTICE', 'NEVER_VACUUMED')
ORDER BY 
    CASE vacuum_status 
        WHEN 'CRITICAL' THEN 1
        WHEN 'WARNING' THEN 2
        WHEN 'NOTICE' THEN 3
        WHEN 'NEVER_VACUUMED' THEN 4
        ELSE 5
    END,
    hours_since_last_vacuum DESC NULLS LAST;
EOF
    echo ""
}

# 最新のアラート状況
show_recent_alerts() {
    log "Recent Dead Tuple Alerts"
    echo -e "${BLUE}=========================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    (schema_name || '.' || table_name) as "Table",
    alert_level as "Level",
    dead_tuples as "Dead Tuples",
    dead_ratio || '%' as "Dead %",
    table_size_pretty as "Size",
    CASE 
        WHEN resolved THEN '✅ Resolved'
        ELSE '⚠️ Active'
    END as "Status",
    to_char(created_at, 'MM-DD HH24:MI') as "Created",
    CASE 
        WHEN resolved THEN to_char(resolved_at, 'MM-DD HH24:MI')
        ELSE '-'
    END as "Resolved"
FROM dead_tuple_alerts
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 15;
EOF
    echo ""
}

# 推奨アクション
show_recommendations() {
    log "Recommendations"
    echo -e "${BLUE}===============${NC}"
    echo ""
    
    # 緊急対応が必要なテーブル
    local critical_tables=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) 
        FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
        WHERE alert_level = 'CRITICAL';
    " | tr -d ' ')
    
    if [ "$critical_tables" -gt 0 ]; then
        echo -e "${RED}🚨 CRITICAL ACTIONS NEEDED:${NC}"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT '  • VACUUM ' || table_name || ' -- ' || message
            FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
            WHERE alert_level = 'CRITICAL'
            ORDER BY dead_tuples DESC;
        "
        echo ""
    fi
    
    # 警告レベルのテーブル
    local warning_tables=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) 
        FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
        WHERE alert_level = 'WARNING';
    " | tr -d ' ')
    
    if [ "$warning_tables" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  WARNING LEVEL TABLES:${NC}"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT '  • Monitor ' || table_name || ' -- ' || recommendation
            FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
            WHERE alert_level = 'WARNING'
            ORDER BY dead_tuples DESC;
        "
        echo ""
    fi
    
    # 一般的な推奨事項
    echo -e "${GREEN}📋 GENERAL RECOMMENDATIONS:${NC}"
    echo "  • Run this script daily to monitor dead tuple accumulation"
    echo "  • Consider adjusting autovacuum settings for high-activity tables"
    echo "  • Monitor autovacuum worker activity during peak hours"
    echo "  • Review and optimize UPDATE/DELETE operations"
    echo ""
}

# 詳細な統計情報を記録
record_statistics() {
    log "Recording dead tuple statistics..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT record_dead_tuple_stats();
    " > /dev/null
    
    success "Statistics recorded successfully"
}

# アラートの生成・更新
generate_alerts() {
    log "Generating/updating alerts..."
    
    local alert_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT generate_dead_tuple_alerts();
    " | tr -d ' ')
    
    if [ "$alert_count" -gt 0 ]; then
        warning "Generated $alert_count new alerts"
    else
        info "No new alerts generated"
    fi
}

# JSON形式でのレポート生成
generate_json_report() {
    local output_file="dead_tuple_report_$(date +%Y%m%d_%H%M%S).json"
    
    log "Generating JSON report: $output_file"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF > "$output_file"
SELECT json_build_object(
    'report_timestamp', now(),
    'database_info', json_build_object(
        'host', '$DB_HOST',
        'database', '$DB_NAME',
        'port', $DB_PORT
    ),
    'summary', (
        SELECT row_to_json(s) 
        FROM v_dead_tuple_summary s
    ),
    'problem_tables', (
        SELECT json_agg(
            json_build_object(
                'table_name', table_name,
                'schema_name', schema_name,
                'alert_level', alert_level,
                'dead_tuples', dead_tuples,
                'live_tuples', live_tuples,
                'dead_ratio', dead_ratio,
                'table_size', table_size,
                'hours_since_vacuum', hours_since_vacuum,
                'message', message,
                'recommendation', recommendation
            )
        )
        FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
        WHERE alert_level IN ('WARNING', 'CRITICAL')
    ),
    'top_dead_ratio_tables', (
        SELECT json_agg(
            json_build_object(
                'table_name', schemaname || '.' || tablename,
                'dead_ratio', dead_tuple_ratio,
                'dead_tuples', dead_tuples,
                'live_tuples', live_tuples,
                'table_size', table_size_pretty,
                'vacuum_priority', vacuum_priority,
                'hours_since_vacuum', hours_since_last_vacuum
            )
        )
        FROM (
            SELECT * FROM v_dead_tuple_monitoring
            WHERE dead_tuples > 0
            ORDER BY dead_tuple_ratio DESC
            LIMIT 10
        ) t
    ),
    'autovacuum_issues', (
        SELECT json_agg(
            json_build_object(
                'table_name', schemaname || '.' || tablename,
                'vacuum_status', vacuum_status,
                'hours_since_vacuum', hours_since_last_vacuum,
                'autovacuum_count', autovacuum_count,
                'current_dead_tuples', current_dead_tuples,
                'dead_ratio', current_dead_ratio
            )
        )
        FROM v_autovacuum_activity
        WHERE vacuum_status IN ('CRITICAL', 'WARNING', 'NOTICE', 'NEVER_VACUUMED')
    )
);
EOF
    
    success "JSON report saved to: $output_file"
}

# CSV形式でのレポート生成
generate_csv_report() {
    local output_file="dead_tuple_report_$(date +%Y%m%d_%H%M%S).csv"
    
    log "Generating CSV report: $output_file"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF > "$output_file"
\\copy (
    SELECT 
        table_name,
        schema_name,
        alert_level,
        dead_tuples,
        live_tuples,
        dead_ratio,
        table_size,
        hours_since_vacuum,
        message,
        recommendation
    FROM check_dead_tuples($WARNING_RATIO, $CRITICAL_RATIO, $WARNING_COUNT, $CRITICAL_COUNT)
    ORDER BY 
        CASE alert_level 
            WHEN 'CRITICAL' THEN 1
            WHEN 'WARNING' THEN 2
            ELSE 3
        END,
        dead_tuples DESC
) TO STDOUT WITH CSV HEADER;
EOF
    
    success "CSV report saved to: $output_file"
}

# 特定テーブルの詳細分析
analyze_table() {
    local table_name="$1"
    
    if [ -z "$table_name" ]; then
        error "Table name is required"
        echo "Usage: $0 analyze <table_name>"
        return 1
    fi
    
    log "Analyzing table: $table_name"
    echo -e "${BLUE}========================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

-- 基本統計
SELECT 
    'Table Name' as "Attribute",
    '$table_name' as "Value"
UNION ALL
SELECT 
    'Live Tuples',
    n_live_tup::text
FROM pg_stat_user_tables
WHERE tablename = '$table_name'
UNION ALL
SELECT 
    'Dead Tuples',
    n_dead_tup::text
FROM pg_stat_user_tables
WHERE tablename = '$table_name'
UNION ALL
SELECT 
    'Dead Ratio',
    CASE 
        WHEN n_live_tup + n_dead_tup = 0 THEN '0%'
        ELSE round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)::text || '%'
    END
FROM pg_stat_user_tables
WHERE tablename = '$table_name'
UNION ALL
SELECT 
    'Table Size',
    pg_size_pretty(pg_total_relation_size('$table_name'))
FROM pg_stat_user_tables
WHERE tablename = '$table_name'
UNION ALL
SELECT 
    'Last Vacuum',
    COALESCE(last_vacuum::text, 'Never')
FROM pg_stat_user_tables
WHERE tablename = '$table_name'
UNION ALL
SELECT 
    'Last Autovacuum',
    COALESCE(last_autovacuum::text, 'Never')
FROM pg_stat_user_tables
WHERE tablename = '$table_name'
UNION ALL
SELECT 
    'Vacuum Count',
    vacuum_count::text
FROM pg_stat_user_tables
WHERE tablename = '$table_name'
UNION ALL
SELECT 
    'Autovacuum Count',
    autovacuum_count::text
FROM pg_stat_user_tables
WHERE tablename = '$table_name';

\\echo
\\echo '--- Historical Trend (Last 7 Days) ---'

SELECT 
    to_char(snapshot_time, 'MM-DD HH24:MI') as "Time",
    live_tuples as "Live",
    dead_tuples as "Dead",
    dead_ratio || '%' as "Dead %",
    pg_size_pretty(table_size_bytes) as "Size"
FROM dead_tuple_history
WHERE table_name = '$table_name'
  AND snapshot_time > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY snapshot_time DESC
LIMIT 20;
EOF
}

# VACUUM実行の推奨
recommend_vacuum() {
    log "VACUUM Recommendations"
    echo -e "${BLUE}=====================${NC}"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

SELECT 
    (schemaname || '.' || tablename) as "Table",
    vacuum_priority as "Priority",
    dead_tuple_ratio || '%' as "Dead %",
    dead_tuples as "Dead Count",
    table_size_pretty as "Size",
    CASE vacuum_priority
        WHEN 'HIGH_PRIORITY' THEN 'VACUUM ANALYZE ' || tablename || ';'
        WHEN 'MEDIUM_PRIORITY' THEN 'VACUUM (VERBOSE) ' || tablename || ';'
        WHEN 'LOW_PRIORITY' THEN 'Monitor and schedule VACUUM'
        ELSE 'No action needed'
    END as "Recommended Action"
FROM v_dead_tuple_monitoring
WHERE vacuum_priority IN ('HIGH_PRIORITY', 'MEDIUM_PRIORITY', 'LOW_PRIORITY')
ORDER BY 
    CASE vacuum_priority
        WHEN 'HIGH_PRIORITY' THEN 1
        WHEN 'MEDIUM_PRIORITY' THEN 2
        WHEN 'LOW_PRIORITY' THEN 3
        ELSE 4
    END,
    dead_tuples DESC;
EOF
    echo ""
    
    echo -e "${YELLOW}💡 VACUUM Tips:${NC}"
    echo "  • Run VACUUM during low-traffic periods"
    echo "  • Use VACUUM (VERBOSE) to monitor progress"
    echo "  • Consider VACUUM FULL only for severely bloated tables"
    echo "  • Monitor autovacuum settings for automatic maintenance"
}

# ヘルプ表示
show_help() {
    echo "PostgreSQL Dead Tuple Monitoring Script"
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  monitor           - Show comprehensive monitoring dashboard (default)"
    echo "  summary           - Show dead tuple summary only"
    echo "  problems          - Show only tables with issues"
    echo "  autovacuum        - Show autovacuum activity status"
    echo "  alerts            - Show recent alerts"
    echo "  analyze <table>   - Analyze specific table in detail"
    echo "  record            - Record current statistics to history"
    echo "  recommend         - Show VACUUM recommendations"
    echo "  json              - Generate JSON report"
    echo "  csv               - Generate CSV report"
    echo "  help              - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST           - PostgreSQL host (default: localhost)"
    echo "  DB_PORT           - PostgreSQL port (default: 5432)"
    echo "  DB_NAME           - Database name (default: monstera)"
    echo "  DB_USER           - Database user (default: postgres)"
    echo "  DB_PASSWORD       - Database password"
    echo "  WARNING_RATIO     - Dead tuple ratio warning threshold (default: 20)"
    echo "  CRITICAL_RATIO    - Dead tuple ratio critical threshold (default: 40)"
    echo "  WARNING_COUNT     - Dead tuple count warning threshold (default: 500000)"
    echo "  CRITICAL_COUNT    - Dead tuple count critical threshold (default: 1000000)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Full monitoring dashboard"
    echo "  $0 problems                  # Show only problem tables"
    echo "  $0 analyze users             # Analyze 'users' table"
    echo "  WARNING_RATIO=15 $0 problems # Custom warning threshold"
    echo "  $0 json                      # Generate JSON report"
}

# メイン処理
main() {
    local command="${1:-monitor}"
    
    case "$command" in
        monitor)
            echo -e "${PURPLE}PostgreSQL Dead Tuple Monitoring Dashboard${NC}"
            echo -e "${PURPLE}===========================================${NC}"
            echo ""
            test_connection
            check_prerequisites
            show_summary
            show_problem_tables
            show_top_dead_ratio_tables
            show_autovacuum_activity
            show_recent_alerts
            show_recommendations
            ;;
        summary)
            test_connection
            check_prerequisites
            show_summary
            ;;
        problems)
            test_connection
            check_prerequisites
            show_problem_tables
            ;;
        autovacuum)
            test_connection
            check_prerequisites
            show_autovacuum_activity
            ;;
        alerts)
            test_connection
            check_prerequisites
            show_recent_alerts
            ;;
        analyze)
            test_connection
            check_prerequisites
            analyze_table "$2"
            ;;
        record)
            test_connection
            check_prerequisites
            record_statistics
            generate_alerts
            ;;
        recommend)
            test_connection
            check_prerequisites
            recommend_vacuum
            ;;
        json)
            test_connection
            check_prerequisites
            generate_json_report
            ;;
        csv)
            test_connection
            check_prerequisites
            generate_csv_report
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