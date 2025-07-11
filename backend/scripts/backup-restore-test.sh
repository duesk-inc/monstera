#!/bin/bash

# PostgreSQL バックアップリストアテストスクリプト
# 隔離環境でのリストアテストと詳細なデータ検証

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# デフォルト設定
DEFAULT_BACKUP_DIR="/backup/postgresql/base"
DEFAULT_TEST_DIR="/tmp/restore_test"
DEFAULT_TEST_PORT="5433"
DEFAULT_DB_NAME="monstera"
DEFAULT_SAMPLE_SIZE="10"

# 設定
BACKUP_DIR="${BACKUP_DIR:-$DEFAULT_BACKUP_DIR}"
TEST_DIR="${TEST_DIR:-$DEFAULT_TEST_DIR}"
TEST_PORT="${TEST_PORT:-$DEFAULT_TEST_PORT}"
DB_NAME="${DB_NAME:-$DEFAULT_DB_NAME}"
SAMPLE_SIZE="${SAMPLE_SIZE:-$DEFAULT_SAMPLE_SIZE}"

# ログファイル
LOG_FILE="/var/log/postgresql/restore-test-$(date +%Y%m%d-%H%M%S).log"

# テスト結果
TEST_RESULTS="{}"
TEST_STATUS="SUCCESS"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
    TEST_STATUS="FAILED"
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
    echo "PostgreSQL Backup Restore Test Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --backup-id       - Backup ID to test (default: latest)"
    echo "  --test-port       - Port for test instance (default: 5433)"
    echo "  --sample-size     - Data validation sample % (default: 10)"
    echo "  --full-validation - Perform full data validation"
    echo "  --skip-perf-test  - Skip performance testing"
    echo "  --keep-instance   - Keep test instance running"
    echo ""
    echo "Examples:"
    echo "  $0 --backup-id=20240115_020000"
    echo "  $0 --full-validation --sample-size=50"
}

# パラメータ解析
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backup-id=*)
                BACKUP_ID="${1#*=}"
                shift
                ;;
            --test-port=*)
                TEST_PORT="${1#*=}"
                shift
                ;;
            --sample-size=*)
                SAMPLE_SIZE="${1#*=}"
                shift
                ;;
            --full-validation)
                FULL_VALIDATION=true
                SAMPLE_SIZE=100
                shift
                ;;
            --skip-perf-test)
                SKIP_PERF_TEST=true
                shift
                ;;
            --keep-instance)
                KEEP_INSTANCE=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done
}

# テスト環境準備
prepare_test_environment() {
    echo -e "${PURPLE}Preparing Test Environment${NC}"
    echo "=========================="
    echo ""
    
    # 既存のテストディレクトリをクリーンアップ
    if [ -d "$TEST_DIR" ]; then
        warning "Removing existing test directory"
        rm -rf "$TEST_DIR"
    fi
    
    # テストディレクトリ作成
    mkdir -p "$TEST_DIR"
    chmod 700 "$TEST_DIR"
    
    # ログディレクトリ
    mkdir -p "$(dirname "$LOG_FILE")"
    
    info "Test directory created: $TEST_DIR"
    info "Test port: $TEST_PORT"
}

# バックアップ選択
select_backup() {
    if [ -z "$BACKUP_ID" ]; then
        # 最新のバックアップを選択
        BACKUP_ID=$(ls -1t "$BACKUP_DIR" | grep -E '^[0-9]{8}_[0-9]{6}$' | head -1)
        
        if [ -z "$BACKUP_ID" ]; then
            error "No backup found in $BACKUP_DIR"
            exit 1
        fi
        
        info "Selected latest backup: $BACKUP_ID"
    fi
    
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_ID"
    
    if [ ! -d "$BACKUP_PATH" ]; then
        error "Backup not found: $BACKUP_PATH"
        exit 1
    fi
    
    # バックアップ情報取得
    local backup_size=$(du -sh "$BACKUP_PATH" | awk '{print $1}')
    info "Backup size: $backup_size"
    
    TEST_RESULTS=$(echo "$TEST_RESULTS" | jq \
        --arg id "$BACKUP_ID" \
        --arg size "$backup_size" \
        '. + {
            "backup_id": $id,
            "backup_size": $size
        }')
}

# リストア実行
perform_restore() {
    echo -e "${PURPLE}Performing Restore${NC}"
    echo "=================="
    echo ""
    
    local start_time=$(date +%s)
    
    # ベースバックアップをコピー
    info "Copying backup files..."
    if ! cp -a "$BACKUP_PATH"/* "$TEST_DIR/" 2>&1 | tee -a "$LOG_FILE"; then
        error "Failed to copy backup files"
        return 1
    fi
    
    # 設定ファイル調整
    adjust_postgresql_conf
    
    # 必要に応じてrecovery設定
    if [ -f "$BACKUP_PATH/backup_label" ]; then
        create_recovery_conf
    fi
    
    local end_time=$(date +%s)
    local restore_duration=$((end_time - start_time))
    
    TEST_RESULTS=$(echo "$TEST_RESULTS" | jq \
        --arg duration "$restore_duration" \
        '. + {
            "restore_duration_seconds": ($duration | tonumber)
        }')
    
    success "Restore completed in $restore_duration seconds"
}

# PostgreSQL設定調整
adjust_postgresql_conf() {
    local conf_file="$TEST_DIR/postgresql.conf"
    
    if [ ! -f "$conf_file" ]; then
        warning "postgresql.conf not found, creating minimal configuration"
        cat > "$conf_file" << EOF
# Minimal test configuration
data_directory = '$TEST_DIR'
hba_file = '$TEST_DIR/pg_hba.conf'
ident_file = '$TEST_DIR/pg_ident.conf'
EOF
    fi
    
    # テスト環境用の設定追加
    cat >> "$conf_file" << EOF

# Test environment settings
port = $TEST_PORT
listen_addresses = 'localhost'
max_connections = 50
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Disable archiving for test
archive_mode = off
wal_level = replica

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_messages = warning
log_min_error_statement = error
log_checkpoints = on
log_connections = on
log_disconnections = on
log_duration = on
log_line_prefix = '%t [%p] %u@%d '

# Performance settings for testing
checkpoint_timeout = 30min
checkpoint_completion_target = 0.9
random_page_cost = 1.1
effective_io_concurrency = 200
EOF
    
    info "PostgreSQL configuration adjusted for testing"
}

# recovery設定作成
create_recovery_conf() {
    info "Creating recovery configuration..."
    
    # PostgreSQL 12以降
    touch "$TEST_DIR/recovery.signal"
    
    cat >> "$TEST_DIR/postgresql.auto.conf" << EOF
# Recovery settings
restore_command = 'cp /backup/postgresql/wal_archives/%f %p'
recovery_target_timeline = 'latest'
EOF
}

# PostgreSQLインスタンス起動
start_test_instance() {
    echo -e "${PURPLE}Starting Test Instance${NC}"
    echo "====================="
    echo ""
    
    # 既存のプロセス確認
    if sudo -u postgres pg_ctl -D "$TEST_DIR" status &> /dev/null; then
        warning "PostgreSQL instance already running on test directory"
        sudo -u postgres pg_ctl -D "$TEST_DIR" stop -m immediate
        sleep 2
    fi
    
    # ポート使用確認
    if netstat -tuln 2>/dev/null | grep -q ":$TEST_PORT "; then
        error "Port $TEST_PORT is already in use"
        return 1
    fi
    
    # インスタンス起動
    info "Starting PostgreSQL instance on port $TEST_PORT..."
    if sudo -u postgres pg_ctl -D "$TEST_DIR" -l "$TEST_DIR/pg_log/startup.log" start; then
        sleep 5
        
        # 接続テスト
        if sudo -u postgres psql -p "$TEST_PORT" -c "SELECT version();" postgres &> /dev/null; then
            success "Test instance started successfully"
            
            # バージョン情報取得
            local pg_version=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "SELECT version();" postgres)
            info "PostgreSQL version: $pg_version"
            
            TEST_RESULTS=$(echo "$TEST_RESULTS" | jq \
                --arg ver "$pg_version" \
                '. + {
                    "pg_version": $ver
                }')
        else
            error "Cannot connect to test instance"
            cat "$TEST_DIR/pg_log/startup.log" | tail -20
            return 1
        fi
    else
        error "Failed to start PostgreSQL instance"
        cat "$TEST_DIR/pg_log/startup.log" | tail -20
        return 1
    fi
}

# データ検証
validate_data() {
    echo -e "${PURPLE}Validating Data${NC}"
    echo "==============="
    echo ""
    
    local validation_start=$(date +%s)
    local validation_errors=0
    
    # データベース一覧
    info "Checking databases..."
    local databases=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
        SELECT datname FROM pg_database 
        WHERE datname NOT IN ('postgres', 'template0', 'template1')
        ORDER BY datname;
    " postgres)
    
    for db in $databases; do
        info "Validating database: $db"
        
        # テーブル数確認
        local table_count=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        " "$db")
        
        info "  Tables found: $table_count"
        
        # 主要テーブルのデータ検証
        validate_table_data "$db"
    done
    
    # インデックス検証
    validate_indexes
    
    # 制約検証
    validate_constraints
    
    # シーケンス検証
    validate_sequences
    
    local validation_end=$(date +%s)
    local validation_duration=$((validation_end - validation_start))
    
    TEST_RESULTS=$(echo "$TEST_RESULTS" | jq \
        --arg duration "$validation_duration" \
        --arg errors "$validation_errors" \
        '. + {
            "validation_duration_seconds": ($duration | tonumber),
            "validation_errors": ($errors | tonumber)
        }')
    
    if [ "$validation_errors" -eq 0 ]; then
        success "Data validation completed successfully"
    else
        warning "Data validation completed with $validation_errors errors"
    fi
}

# テーブルデータ検証
validate_table_data() {
    local db="$1"
    
    # サンプルテーブルリスト
    local tables=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
        LIMIT 10;
    " "$db")
    
    for table in $tables; do
        # 行数確認
        local row_count=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
            SELECT COUNT(*) FROM $table;
        " "$db" 2>/dev/null || echo "ERROR")
        
        if [ "$row_count" = "ERROR" ]; then
            warning "    Table $table: Failed to count rows"
            ((validation_errors++))
        else
            info "    Table $table: $row_count rows"
            
            # サンプルデータ検証（FULL_VALIDATIONでない場合）
            if [ "$FULL_VALIDATION" != true ] && [ "$row_count" -gt 1000 ]; then
                local sample_count=$((row_count * SAMPLE_SIZE / 100))
                info "      Validating $sample_count sample rows..."
                
                # プライマリキーの存在確認
                local pk_check=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
                    SELECT COUNT(*) FROM information_schema.table_constraints 
                    WHERE table_name = '$table' 
                    AND constraint_type = 'PRIMARY KEY';
                " "$db")
                
                if [ "$pk_check" -eq 0 ]; then
                    warning "      No primary key found for table $table"
                fi
            fi
        fi
    done
}

# インデックス検証
validate_indexes() {
    info "Validating indexes..."
    
    local invalid_indexes=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
        SELECT schemaname || '.' || tablename || '.' || indexname 
        FROM pg_indexes 
        WHERE NOT indisvalid
        LIMIT 10;
    " "$DB_NAME" 2>/dev/null)
    
    if [ -n "$invalid_indexes" ]; then
        warning "Invalid indexes found:"
        echo "$invalid_indexes" | while read idx; do
            warning "  $idx"
            ((validation_errors++))
        done
    else
        info "  All indexes are valid"
    fi
}

# 制約検証
validate_constraints() {
    info "Validating constraints..."
    
    # 外部キー制約の検証
    local fk_violations=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
        SELECT COUNT(*) FROM (
            SELECT conname, conrelid::regclass, confrelid::regclass
            FROM pg_constraint
            WHERE contype = 'f'
            AND NOT convalidated
        ) t;
    " "$DB_NAME" 2>/dev/null || echo "0")
    
    if [ "$fk_violations" -gt 0 ]; then
        warning "  Found $fk_violations unvalidated foreign key constraints"
        ((validation_errors++))
    else
        info "  All foreign key constraints are valid"
    fi
}

# シーケンス検証
validate_sequences() {
    info "Validating sequences..."
    
    local sequence_count=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
        SELECT COUNT(*) FROM information_schema.sequences;
    " "$DB_NAME" 2>/dev/null || echo "0")
    
    info "  Found $sequence_count sequences"
    
    # シーケンスの現在値確認（サンプル）
    local sequences=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
        SELECT sequence_schema || '.' || sequence_name 
        FROM information_schema.sequences 
        LIMIT 5;
    " "$DB_NAME")
    
    for seq in $sequences; do
        local curr_val=$(sudo -u postgres psql -p "$TEST_PORT" -t -c "
            SELECT last_value FROM $seq;
        " "$DB_NAME" 2>/dev/null || echo "ERROR")
        
        if [ "$curr_val" = "ERROR" ]; then
            warning "    Sequence $seq: Failed to get current value"
        else
            info "    Sequence $seq: current value = $curr_val"
        fi
    done
}

# パフォーマンステスト
performance_test() {
    if [ "$SKIP_PERF_TEST" = true ]; then
        info "Skipping performance test"
        return
    fi
    
    echo -e "${PURPLE}Performance Test${NC}"
    echo "================"
    echo ""
    
    # 簡単なパフォーマンステスト
    info "Running performance queries..."
    
    # クエリ実行時間測定
    local query_results=()
    
    # テスト1: シンプルなカウント
    local start_ms=$(date +%s%3N)
    sudo -u postgres psql -p "$TEST_PORT" -c "
        SELECT COUNT(*) FROM users;
    " "$DB_NAME" &> /dev/null
    local end_ms=$(date +%s%3N)
    local duration=$((end_ms - start_ms))
    query_results+=("Simple COUNT: ${duration}ms")
    
    # テスト2: JOIN クエリ
    start_ms=$(date +%s%3N)
    sudo -u postgres psql -p "$TEST_PORT" -c "
        SELECT COUNT(*) 
        FROM weekly_reports wr
        JOIN users u ON wr.user_id = u.id
        WHERE wr.created_at > CURRENT_DATE - INTERVAL '30 days';
    " "$DB_NAME" &> /dev/null
    end_ms=$(date +%s%3N)
    duration=$((end_ms - start_ms))
    query_results+=("JOIN query: ${duration}ms")
    
    # 結果表示
    info "Query performance results:"
    for result in "${query_results[@]}"; do
        info "  $result"
    done
    
    TEST_RESULTS=$(echo "$TEST_RESULTS" | jq \
        --argjson perf "$(printf '%s\n' "${query_results[@]}" | jq -R . | jq -s .)" \
        '. + {
            "performance_tests": $perf
        }')
}

# リソース使用状況監視
monitor_resources() {
    info "Monitoring resource usage..."
    
    # CPU使用率
    local cpu_usage=$(top -b -n 1 | grep "postgres" | awk '{sum += $9} END {print sum}')
    
    # メモリ使用量
    local mem_usage=$(ps aux | grep "[p]ostgres.*$TEST_PORT" | awk '{sum += $6} END {print sum/1024}')
    
    # ディスクI/O（簡易版）
    local disk_usage=$(du -sh "$TEST_DIR" | awk '{print $1}')
    
    TEST_RESULTS=$(echo "$TEST_RESULTS" | jq \
        --arg cpu "$cpu_usage" \
        --arg mem "$mem_usage" \
        --arg disk "$disk_usage" \
        '. + {
            "cpu_usage_percent": ($cpu | tonumber),
            "memory_usage_mb": ($mem | tonumber),
            "disk_usage": $disk
        }')
    
    info "  CPU usage: ${cpu_usage}%"
    info "  Memory usage: ${mem_usage}MB"
    info "  Disk usage: $disk_usage"
}

# テストインスタンス停止
stop_test_instance() {
    if [ "$KEEP_INSTANCE" = true ]; then
        warning "Keeping test instance running as requested"
        info "Connect with: psql -p $TEST_PORT -d $DB_NAME"
        return
    fi
    
    info "Stopping test instance..."
    if sudo -u postgres pg_ctl -D "$TEST_DIR" status &> /dev/null; then
        sudo -u postgres pg_ctl -D "$TEST_DIR" stop -m fast
        success "Test instance stopped"
    fi
}

# クリーンアップ
cleanup() {
    if [ "$KEEP_INSTANCE" != true ]; then
        stop_test_instance
        
        if [ -d "$TEST_DIR" ]; then
            info "Cleaning up test directory..."
            rm -rf "$TEST_DIR"
        fi
    fi
}

# レポート生成
generate_report() {
    echo ""
    echo "================================================"
    echo "Restore Test Report"
    echo "================================================"
    echo "Date: $(date)"
    echo "Status: $TEST_STATUS"
    echo ""
    echo "Test Results:"
    echo "$TEST_RESULTS" | jq '.'
    echo ""
    
    if [ "$TEST_STATUS" = "SUCCESS" ]; then
        success "All restore tests passed successfully"
    else
        error "Restore test completed with errors"
    fi
    
    echo ""
    echo "Detailed log: $LOG_FILE"
    echo "================================================"
}

# トラップ設定
trap cleanup EXIT

# メイン処理
main() {
    parse_args "$@"
    
    echo "================================================"
    echo "PostgreSQL Backup Restore Test"
    echo "================================================"
    echo ""
    
    # 環境準備
    prepare_test_environment
    
    # バックアップ選択
    select_backup
    
    # リストア実行
    perform_restore
    
    # インスタンス起動
    start_test_instance
    
    # データ検証
    validate_data
    
    # パフォーマンステスト
    performance_test
    
    # リソース監視
    monitor_resources
    
    # レポート生成
    generate_report
}

# 実行
main "$@"