#!/bin/bash

# PostgreSQLスロークエリ分析スクリプト
# pg_stat_statementsを使用してスロークエリを分析

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

# 分析期間
DAYS="${1:-7}"
OUTPUT_FORMAT="${2:-table}"  # table, json, csv

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# PostgreSQL接続テスト
test_connection() {
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${RED}Error: Cannot connect to PostgreSQL${NC}"
        echo "Please check your connection settings:"
        echo "  DB_HOST: $DB_HOST"
        echo "  DB_PORT: $DB_PORT"
        echo "  DB_NAME: $DB_NAME"
        echo "  DB_USER: $DB_USER"
        exit 1
    fi
}

# pg_stat_statementsの有効性確認
check_pg_stat_statements() {
    local enabled=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements';
    " | tr -d ' ')
    
    if [ "$enabled" -eq 0 ]; then
        echo -e "${RED}Error: pg_stat_statements extension is not enabled${NC}"
        echo "Please run: CREATE EXTENSION pg_stat_statements;"
        exit 1
    fi
}

# TOP 10 スロークエリの表示
show_top_slow_queries() {
    log "Top 10 Slow Queries (by mean execution time)"
    echo -e "${BLUE}================================================${NC}"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

SELECT 
    rank() OVER (ORDER BY mean_exec_time DESC) as "Rank",
    round(mean_exec_time::numeric, 2) as "Mean Time (ms)",
    round(max_exec_time::numeric, 2) as "Max Time (ms)",
    calls as "Calls",
    round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) as "Cache Hit %",
    substring(regexp_replace(query, '[\\r\\n\\s]+', ' ', 'g'), 1, 80) || '...' as "Query"
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
EOF
    echo
}

# 実行回数の多いクエリ
show_most_frequent_queries() {
    log "Most Frequently Executed Queries"
    echo -e "${BLUE}================================================${NC}"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

SELECT 
    rank() OVER (ORDER BY calls DESC) as "Rank",
    calls as "Calls",
    round(mean_exec_time::numeric, 2) as "Mean Time (ms)",
    round(total_exec_time::numeric, 2) as "Total Time (ms)",
    round(100.0 * total_exec_time / sum(total_exec_time) OVER (), 2) as "% of Total",
    substring(regexp_replace(query, '[\\r\\n\\s]+', ' ', 'g'), 1, 80) || '...' as "Query"
FROM pg_stat_statements
WHERE calls > 100
ORDER BY calls DESC
LIMIT 10;
EOF
    echo
}

# 一時ファイルを使用するクエリ
show_temp_file_queries() {
    log "Queries Using Temporary Files"
    echo -e "${BLUE}================================================${NC}"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

SELECT 
    round(mean_exec_time::numeric, 2) as "Mean Time (ms)",
    calls as "Calls",
    temp_blks_read as "Temp Blocks Read",
    temp_blks_written as "Temp Blocks Written",
    pg_size_pretty(temp_blks_written * 8192) as "Temp Size",
    substring(regexp_replace(query, '[\\r\\n\\s]+', ' ', 'g'), 1, 60) || '...' as "Query"
FROM pg_stat_statements
WHERE temp_blks_read > 0 OR temp_blks_written > 0
ORDER BY temp_blks_written DESC
LIMIT 10;
EOF
    echo
}

# キャッシュヒット率の低いクエリ
show_low_cache_hit_queries() {
    log "Queries with Low Cache Hit Ratio"
    echo -e "${BLUE}================================================${NC}"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

SELECT 
    round(mean_exec_time::numeric, 2) as "Mean Time (ms)",
    calls as "Calls",
    round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) as "Cache Hit %",
    shared_blks_read as "Blocks Read",
    shared_blks_hit as "Blocks Hit",
    substring(regexp_replace(query, '[\\r\\n\\s]+', ' ', 'g'), 1, 60) || '...' as "Query"
FROM pg_stat_statements
WHERE shared_blks_hit + shared_blks_read > 0
  AND 100.0 * shared_blks_hit / (shared_blks_hit + shared_blks_read) < 90
ORDER BY (100.0 * shared_blks_hit / (shared_blks_hit + shared_blks_read)) ASC
LIMIT 10;
EOF
    echo
}

# 全体的な統計情報
show_overall_stats() {
    log "Overall Query Statistics"
    echo -e "${BLUE}================================================${NC}"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

SELECT 
    'Total Queries' as "Metric",
    count(*) as "Value"
FROM pg_stat_statements
UNION ALL
SELECT 
    'Slow Queries (>1s)',
    count(*)
FROM pg_stat_statements
WHERE mean_exec_time > 1000
UNION ALL
SELECT 
    'Very Slow Queries (>5s)',
    count(*)
FROM pg_stat_statements
WHERE mean_exec_time > 5000
UNION ALL
SELECT 
    'Queries Using Temp Files',
    count(*)
FROM pg_stat_statements
WHERE temp_blks_read > 0 OR temp_blks_written > 0
UNION ALL
SELECT 
    'Total Execution Time',
    pg_size_pretty(sum(total_exec_time)::bigint) || ' ms'
FROM pg_stat_statements;
EOF
    echo
}

# JSON形式での出力
output_json() {
    log "Generating JSON report..."
    
    local output_file="slow_query_report_$(date +%Y%m%d_%H%M%S).json"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF > "$output_file"
SELECT json_build_object(
    'report_date', now(),
    'analysis_period_days', $DAYS,
    'top_slow_queries', (
        SELECT json_agg(
            json_build_object(
                'rank', rank() OVER (ORDER BY mean_exec_time DESC),
                'mean_exec_time_ms', round(mean_exec_time::numeric, 2),
                'max_exec_time_ms', round(max_exec_time::numeric, 2),
                'calls', calls,
                'cache_hit_ratio', round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2),
                'query', substring(regexp_replace(query, '[\\r\\n\\s]+', ' ', 'g'), 1, 200)
            )
        )
        FROM (
            SELECT * FROM pg_stat_statements
            WHERE mean_exec_time > 1000
            ORDER BY mean_exec_time DESC
            LIMIT 10
        ) t
    ),
    'most_frequent_queries', (
        SELECT json_agg(
            json_build_object(
                'rank', rank() OVER (ORDER BY calls DESC),
                'calls', calls,
                'mean_exec_time_ms', round(mean_exec_time::numeric, 2),
                'total_exec_time_ms', round(total_exec_time::numeric, 2),
                'query', substring(regexp_replace(query, '[\\r\\n\\s]+', ' ', 'g'), 1, 200)
            )
        )
        FROM (
            SELECT * FROM pg_stat_statements
            WHERE calls > 100
            ORDER BY calls DESC
            LIMIT 10
        ) t
    ),
    'overall_stats', (
        SELECT json_build_object(
            'total_queries', (SELECT count(*) FROM pg_stat_statements),
            'slow_queries_1s', (SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 1000),
            'slow_queries_5s', (SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 5000),
            'temp_file_queries', (SELECT count(*) FROM pg_stat_statements WHERE temp_blks_read > 0 OR temp_blks_written > 0),
            'total_exec_time_ms', (SELECT sum(total_exec_time) FROM pg_stat_statements)
        )
    )
);
EOF
    
    echo -e "${GREEN}JSON report saved to: $output_file${NC}"
}

# CSV形式での出力
output_csv() {
    log "Generating CSV report..."
    
    local output_file="slow_query_report_$(date +%Y%m%d_%H%M%S).csv"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF > "$output_file"
\\copy (
    SELECT 
        rank() OVER (ORDER BY mean_exec_time DESC) as rank,
        round(mean_exec_time::numeric, 2) as mean_exec_time_ms,
        round(max_exec_time::numeric, 2) as max_exec_time_ms,
        calls,
        round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) as cache_hit_ratio,
        temp_blks_read,
        temp_blks_written,
        regexp_replace(query, '[\\r\\n\\s]+', ' ', 'g') as query
    FROM pg_stat_statements
    WHERE mean_exec_time > 1000
    ORDER BY mean_exec_time DESC
) TO STDOUT WITH CSV HEADER;
EOF
    
    echo -e "${GREEN}CSV report saved to: $output_file${NC}"
}

# クエリ詳細の表示
show_query_detail() {
    local query_hash="$1"
    
    if [ -z "$query_hash" ]; then
        echo -e "${RED}Error: Query hash is required${NC}"
        echo "Usage: $0 detail <query_hash>"
        return 1
    fi
    
    log "Query Details for hash: $query_hash"
    echo -e "${BLUE}================================================${NC}"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\\pset border 2
\\pset format aligned

SELECT 
    'Query Hash' as "Attribute", 
    '$query_hash' as "Value"
UNION ALL
SELECT 
    'Calls',
    calls::text
FROM pg_stat_statements
WHERE md5(query) = '$query_hash'
UNION ALL
SELECT 
    'Mean Execution Time (ms)',
    round(mean_exec_time::numeric, 2)::text
FROM pg_stat_statements
WHERE md5(query) = '$query_hash'
UNION ALL
SELECT 
    'Total Execution Time (ms)',
    round(total_exec_time::numeric, 2)::text
FROM pg_stat_statements
WHERE md5(query) = '$query_hash'
UNION ALL
SELECT 
    'Cache Hit Ratio (%)',
    round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2)::text
FROM pg_stat_statements
WHERE md5(query) = '$query_hash';

\\echo '\\n--- Query Text ---'
SELECT query
FROM pg_stat_statements
WHERE md5(query) = '$query_hash';
EOF
}

# クエリリセット
reset_stats() {
    log "Resetting pg_stat_statements..."
    
    # 現在の統計を履歴に保存
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT record_slow_query_stats();
    "
    
    # 統計をリセット
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT pg_stat_statements_reset();
    "
    
    echo -e "${GREEN}Statistics reset completed${NC}"
}

# ヘルプ表示
show_help() {
    echo "PostgreSQL Slow Query Analyzer"
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  analyze [days]    - Analyze slow queries (default: 7 days)"
    echo "  detail <hash>     - Show detailed information for a specific query"
    echo "  reset            - Reset pg_stat_statements and save to history"
    echo "  help             - Show this help message"
    echo ""
    echo "Options:"
    echo "  --format FORMAT  - Output format: table, json, csv (default: table)"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST          - PostgreSQL host (default: localhost)"
    echo "  DB_PORT          - PostgreSQL port (default: 5432)"
    echo "  DB_NAME          - Database name (default: monstera)"
    echo "  DB_USER          - Database user (default: postgres)"
    echo "  DB_PASSWORD      - Database password"
    echo ""
    echo "Examples:"
    echo "  $0 analyze 3                    # Analyze last 3 days"
    echo "  $0 --format json analyze        # Generate JSON report"
    echo "  $0 detail a1b2c3d4e5f6          # Show query details"
    echo "  $0 reset                        # Reset statistics"
}

# メイン処理
main() {
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --format)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            analyze)
                COMMAND="analyze"
                if [[ -n "$2" && "$2" =~ ^[0-9]+$ ]]; then
                    DAYS="$2"
                    shift
                fi
                shift
                ;;
            detail)
                COMMAND="detail"
                QUERY_HASH="$2"
                shift 2
                ;;
            reset)
                COMMAND="reset"
                shift
                ;;
            help|--help|-h)
                show_help
                exit 0
                ;;
            *)
                DAYS="$1"
                COMMAND="analyze"
                shift
                ;;
        esac
    done
    
    # デフォルトコマンド
    COMMAND="${COMMAND:-analyze}"
    
    echo -e "${BLUE}PostgreSQL Slow Query Analyzer${NC}"
    echo -e "${BLUE}===============================${NC}"
    echo
    
    # 接続テスト
    test_connection
    
    # pg_stat_statements確認
    check_pg_stat_statements
    
    # コマンド実行
    case "$COMMAND" in
        analyze)
            case "$OUTPUT_FORMAT" in
                json)
                    output_json
                    ;;
                csv)
                    output_csv
                    ;;
                table|*)
                    show_overall_stats
                    show_top_slow_queries
                    show_most_frequent_queries
                    show_temp_file_queries
                    show_low_cache_hit_queries
                    ;;
            esac
            ;;
        detail)
            show_query_detail "$QUERY_HASH"
            ;;
        reset)
            reset_stats
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# 実行
main "$@"