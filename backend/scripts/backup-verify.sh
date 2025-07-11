#!/bin/bash

# PostgreSQL バックアップ検証スクリプト
# バックアップの整合性とリストア可能性を自動検証

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# デフォルト設定
DEFAULT_BACKUP_DIR="/backup/postgresql"
DEFAULT_VERIFY_DIR="/tmp/backup_verify"
DEFAULT_LOG_DIR="/var/log/postgresql/backup"
DEFAULT_DB_NAME="monstera"
DEFAULT_PARALLEL_JOBS=2

# バックアップディレクトリ
BACKUP_BASE_DIR="${BACKUP_DIR:-$DEFAULT_BACKUP_DIR}"
VERIFY_WORK_DIR="${VERIFY_DIR:-$DEFAULT_VERIFY_DIR}"
LOG_DIR="${LOG_DIR:-$DEFAULT_LOG_DIR}"
DB_NAME="${DB_NAME:-$DEFAULT_DB_NAME}"

# ログファイル
LOG_FILE="$LOG_DIR/backup-verify-$(date +%Y%m%d-%H%M%S).log"

# 検証結果
VERIFICATION_ID=""
VERIFICATION_STATUS="SUCCESS"
VERIFICATION_RESULTS="{}"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
    VERIFICATION_STATUS="FAILED"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
    if [ "$VERIFICATION_STATUS" = "SUCCESS" ]; then
        VERIFICATION_STATUS="WARNING"
    fi
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# 使用方法表示
show_usage() {
    echo "PostgreSQL Backup Verification Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  verify-latest     - Verify the latest backup"
    echo "  verify-backup     - Verify a specific backup"
    echo "  verify-all        - Verify all recent backups"
    echo "  checksum          - Verify checksums only"
    echo "  restore-test      - Perform restore test"
    echo "  wal-continuity    - Check WAL continuity"
    echo "  report            - Generate verification report"
    echo "  help              - Show this help message"
    echo ""
    echo "Options:"
    echo "  --backup-id       - Specific backup ID to verify"
    echo "  --backup-dir      - Backup directory path"
    echo "  --type            - Backup type (base/wal/logical)"
    echo "  --skip-restore    - Skip restore test"
    echo "  --sample-percent  - Sample size for data verification (default: 10)"
    echo "  --parallel        - Number of parallel jobs (default: 2)"
    echo ""
    echo "Examples:"
    echo "  $0 verify-latest"
    echo "  $0 verify-backup --backup-id=20240115_020000"
    echo "  $0 restore-test --sample-percent=20"
}

# パラメータ解析
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backup-id=*)
                BACKUP_ID="${1#*=}"
                shift
                ;;
            --backup-dir=*)
                BACKUP_DIR="${1#*=}"
                shift
                ;;
            --type=*)
                BACKUP_TYPE="${1#*=}"
                shift
                ;;
            --skip-restore)
                SKIP_RESTORE=true
                shift
                ;;
            --sample-percent=*)
                SAMPLE_PERCENT="${1#*=}"
                shift
                ;;
            --parallel=*)
                PARALLEL_JOBS="${1#*=}"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # デフォルト値設定
    BACKUP_TYPE="${BACKUP_TYPE:-base}"
    SAMPLE_PERCENT="${SAMPLE_PERCENT:-10}"
    PARALLEL_JOBS="${PARALLEL_JOBS:-$DEFAULT_PARALLEL_JOBS}"
}

# ディレクトリ準備
prepare_directories() {
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # 検証作業ディレクトリ作成
    if [ -d "$VERIFY_WORK_DIR" ]; then
        rm -rf "$VERIFY_WORK_DIR"
    fi
    mkdir -p "$VERIFY_WORK_DIR"
    
    info "Work directory prepared: $VERIFY_WORK_DIR"
}

# 最新バックアップ取得
get_latest_backup() {
    local backup_type="${1:-base}"
    local backup_dir="$BACKUP_BASE_DIR/$backup_type"
    
    if [ ! -d "$backup_dir" ]; then
        error "Backup directory not found: $backup_dir"
        return 1
    fi
    
    # 最新のバックアップディレクトリを取得
    local latest_backup=$(ls -1t "$backup_dir" | grep -E '^[0-9]{8}_[0-9]{6}$' | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No backup found in $backup_dir"
        return 1
    fi
    
    echo "$backup_dir/$latest_backup"
}

# チェックサム検証
verify_checksum() {
    local backup_path="$1"
    local checksum_file="$backup_path/checksums.md5"
    
    echo -e "${PURPLE}Verifying Checksums${NC}"
    echo "==================="
    echo ""
    
    if [ ! -f "$checksum_file" ]; then
        warning "Checksum file not found: $checksum_file"
        return 1
    fi
    
    info "Checksum file found: $checksum_file"
    
    # チェックサム検証実行
    local total_files=0
    local failed_files=0
    local verified_files=0
    
    cd "$backup_path"
    
    while IFS= read -r line; do
        if [ -z "$line" ]; then
            continue
        fi
        
        ((total_files++))
        
        # md5sumコマンドで検証
        if echo "$line" | md5sum -c --quiet 2>/dev/null; then
            ((verified_files++))
        else
            ((failed_files++))
            local failed_file=$(echo "$line" | awk '{print $2}')
            warning "Checksum mismatch: $failed_file"
        fi
        
        # 進捗表示
        if [ $((total_files % 100)) -eq 0 ]; then
            echo -n "."
        fi
    done < "$checksum_file"
    
    echo ""
    
    # 結果サマリー
    info "Checksum verification completed:"
    info "  Total files: $total_files"
    info "  Verified: $verified_files"
    info "  Failed: $failed_files"
    
    # 結果をJSONに追加
    VERIFICATION_RESULTS=$(echo "$VERIFICATION_RESULTS" | jq \
        --arg tf "$total_files" \
        --arg vf "$verified_files" \
        --arg ff "$failed_files" \
        '. + {
            "files_checked": ($tf | tonumber),
            "checksum_matches": ($vf | tonumber),
            "checksum_failures": ($ff | tonumber)
        }')
    
    if [ "$failed_files" -gt 0 ]; then
        error "$failed_files files failed checksum verification"
        return 1
    fi
    
    success "All checksums verified successfully"
    return 0
}

# バックアップマニフェスト検証（PostgreSQL 13+）
verify_manifest() {
    local backup_path="$1"
    local manifest_file="$backup_path/backup_manifest"
    
    if [ ! -f "$manifest_file" ]; then
        info "Backup manifest not found (pre-PG13 backup?)"
        return 0
    fi
    
    info "Verifying backup manifest..."
    
    # pg_verifybackupコマンドが利用可能か確認
    if command -v pg_verifybackup &> /dev/null; then
        if pg_verifybackup "$backup_path" 2>&1 | tee -a "$LOG_FILE"; then
            success "Backup manifest verified successfully"
        else
            error "Backup manifest verification failed"
            return 1
        fi
    else
        warning "pg_verifybackup not available, skipping manifest verification"
    fi
    
    return 0
}

# WAL連続性チェック
check_wal_continuity() {
    local wal_dir="$BACKUP_BASE_DIR/wal_archives"
    
    echo -e "${PURPLE}Checking WAL Continuity${NC}"
    echo "======================="
    echo ""
    
    if [ ! -d "$wal_dir" ]; then
        error "WAL archive directory not found: $wal_dir"
        return 1
    fi
    
    # タイムライン取得
    local current_timeline=$(find "$wal_dir" -name "*.history" | sed 's/.*\([0-9]\+\)\.history/\1/' | sort -n | tail -1)
    current_timeline=${current_timeline:-1}
    
    info "Checking timeline: $current_timeline"
    
    # WALファイルリスト取得
    local wal_files=$(find "$wal_dir" -name "????????????????????????????????" | sort)
    local prev_segment=""
    local gaps_found=0
    local missing_segments=()
    
    for wal_file in $wal_files; do
        local segment=$(basename "$wal_file")
        
        if [ -n "$prev_segment" ]; then
            # 連続性チェック（簡易版）
            local prev_num=$(echo "$prev_segment" | sed 's/^0*//')
            local curr_num=$(echo "$segment" | sed 's/^0*//')
            
            # セグメント番号の差が1でない場合はギャップ
            if [ $((curr_num - prev_num)) -gt 1 ]; then
                ((gaps_found++))
                warning "WAL gap detected between $prev_segment and $segment"
                missing_segments+=("$prev_segment-$segment")
            fi
        fi
        
        prev_segment="$segment"
    done
    
    # 結果記録
    VERIFICATION_RESULTS=$(echo "$VERIFICATION_RESULTS" | jq \
        --arg gaps "$gaps_found" \
        --argjson missing "$(printf '%s\n' "${missing_segments[@]}" | jq -R . | jq -s .)" \
        '. + {
            "wal_gaps_found": ($gaps | tonumber),
            "missing_segments": $missing
        }')
    
    if [ "$gaps_found" -gt 0 ]; then
        error "$gaps_found WAL gaps detected"
        return 1
    fi
    
    success "WAL continuity verified - no gaps found"
    return 0
}

# リストアテスト実行
perform_restore_test() {
    local backup_path="$1"
    local restore_dir="$VERIFY_WORK_DIR/restore_test"
    
    echo -e "${PURPLE}Performing Restore Test${NC}"
    echo "======================="
    echo ""
    
    info "Backup path: $backup_path"
    info "Restore target: $restore_dir"
    
    # リストアディレクトリ準備
    mkdir -p "$restore_dir"
    
    # リストア開始時刻
    local start_time=$(date +%s)
    
    # ベースバックアップのリストア
    info "Restoring base backup..."
    if ! cp -a "$backup_path"/* "$restore_dir/" 2>&1 | tee -a "$LOG_FILE"; then
        error "Failed to restore base backup"
        return 1
    fi
    
    # postgresql.conf調整（テスト環境用）
    if [ -f "$restore_dir/postgresql.conf" ]; then
        # ポート変更
        echo "port = 5433" >> "$restore_dir/postgresql.conf"
        # アーカイブモード無効化
        echo "archive_mode = off" >> "$restore_dir/postgresql.conf"
        # 最小設定
        echo "shared_buffers = 128MB" >> "$restore_dir/postgresql.conf"
        echo "max_connections = 20" >> "$restore_dir/postgresql.conf"
    fi
    
    # 一時的なPostgreSQLインスタンス起動
    info "Starting temporary PostgreSQL instance..."
    local pg_version=$(pg_config --version | awk '{print $2}' | cut -d. -f1)
    
    # PostgreSQLサーバー起動
    if command -v pg_ctl &> /dev/null; then
        if ! sudo -u postgres pg_ctl -D "$restore_dir" -o "-p 5433" -l "$VERIFY_WORK_DIR/postgres.log" start; then
            error "Failed to start PostgreSQL instance"
            cat "$VERIFY_WORK_DIR/postgres.log" | tail -20
            return 1
        fi
        
        # 起動待機
        sleep 5
        
        # 接続テスト
        if sudo -u postgres psql -p 5433 -c "SELECT version();" postgres &> /dev/null; then
            success "PostgreSQL instance started successfully"
        else
            error "Cannot connect to restored PostgreSQL instance"
            sudo -u postgres pg_ctl -D "$restore_dir" stop
            return 1
        fi
        
        # データ検証（サンプル）
        perform_data_validation "5433"
        
        # インスタンス停止
        info "Stopping temporary PostgreSQL instance..."
        sudo -u postgres pg_ctl -D "$restore_dir" stop
    else
        warning "pg_ctl not available, skipping instance start test"
    fi
    
    # リストア時間計測
    local end_time=$(date +%s)
    local restore_duration=$((end_time - start_time))
    
    # 結果記録
    VERIFICATION_RESULTS=$(echo "$VERIFICATION_RESULTS" | jq \
        --arg duration "$restore_duration" \
        '. + {
            "restore_success": true,
            "restore_duration_seconds": ($duration | tonumber)
        }')
    
    success "Restore test completed in $restore_duration seconds"
    return 0
}

# データ検証
perform_data_validation() {
    local port="${1:-5432}"
    
    info "Performing data validation..."
    
    # 基本的なデータ検証
    local validation_passed=true
    local source_count=0
    local restored_count=0
    
    # テーブル数確認
    restored_count=$(sudo -u postgres psql -p "$port" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE';
    " "$DB_NAME" 2>/dev/null || echo "0")
    
    if [ "$restored_count" -eq 0 ]; then
        warning "No tables found in restored database"
        validation_passed=false
    else
        info "Found $restored_count tables in restored database"
    fi
    
    # サンプルデータ検証（主要テーブルの行数確認）
    local sample_tables=("users" "weekly_reports" "projects" "employees")
    
    for table in "${sample_tables[@]}"; do
        local row_count=$(sudo -u postgres psql -p "$port" -t -c "
            SELECT COUNT(*) FROM $table;
        " "$DB_NAME" 2>/dev/null || echo "0")
        
        if [ "$row_count" -gt 0 ]; then
            info "Table $table: $row_count rows"
        else
            warning "Table $table: no data or table not found"
        fi
    done
    
    # 結果記録
    VERIFICATION_RESULTS=$(echo "$VERIFICATION_RESULTS" | jq \
        --argjson valid "$validation_passed" \
        --arg restored "$restored_count" \
        '. + {
            "data_validation_passed": $valid,
            "row_count_restored": ($restored | tonumber)
        }')
    
    if [ "$validation_passed" = true ]; then
        success "Data validation passed"
    else
        warning "Data validation completed with warnings"
    fi
}

# 検証レポート生成
generate_verification_report() {
    echo ""
    echo "================================================"
    echo "Backup Verification Report"
    echo "================================================"
    echo "Date: $(date)"
    echo "Backup ID: ${BACKUP_ID:-Latest}"
    echo "Backup Type: $BACKUP_TYPE"
    echo "Status: $VERIFICATION_STATUS"
    echo ""
    
    # 検証結果サマリー
    echo "Verification Results:"
    echo "$VERIFICATION_RESULTS" | jq '.' 2>/dev/null || echo "$VERIFICATION_RESULTS"
    echo ""
    
    # データベースに結果記録
    if [ -n "$VERIFICATION_ID" ]; then
        info "Recording verification results to database..."
        
        sudo -u postgres psql -d "$DB_NAME" << EOF
SELECT record_verification_result(
    '$VERIFICATION_ID'::UUID,
    '$VERIFICATION_STATUS',
    '$VERIFICATION_RESULTS'::JSONB
);
EOF
    fi
    
    # ログファイル情報
    echo "Detailed log: $LOG_FILE"
    echo "================================================"
}

# 検証開始記録
start_verification() {
    local verification_type="$1"
    local backup_id="$2"
    
    # データベースに検証開始を記録
    VERIFICATION_ID=$(sudo -u postgres psql -t -d "$DB_NAME" -c "
        SELECT execute_backup_verification(
            (SELECT config_id FROM backup_verification_config 
             WHERE verification_type = '$verification_type' 
             AND enabled = true LIMIT 1),
            (SELECT backup_id FROM base_backup_history 
             WHERE backup_name = '$backup_id' LIMIT 1),
            '$verification_type'
        );
    " | tr -d ' ')
    
    if [ -n "$VERIFICATION_ID" ]; then
        info "Verification started with ID: $VERIFICATION_ID"
    fi
}

# 最新バックアップ検証
verify_latest() {
    prepare_directories
    
    # 最新バックアップ取得
    local latest_backup=$(get_latest_backup "base")
    if [ -z "$latest_backup" ]; then
        error "No backup found to verify"
        exit 1
    fi
    
    local backup_id=$(basename "$latest_backup")
    info "Verifying latest backup: $backup_id"
    
    # 検証開始記録
    start_verification "FULL_VALIDATION" "$backup_id"
    
    # チェックサム検証
    verify_checksum "$latest_backup"
    
    # マニフェスト検証
    verify_manifest "$latest_backup"
    
    # WAL連続性チェック
    check_wal_continuity
    
    # リストアテスト
    if [ "$SKIP_RESTORE" != true ]; then
        perform_restore_test "$latest_backup"
    fi
    
    # レポート生成
    generate_verification_report
}

# 特定バックアップ検証
verify_specific_backup() {
    if [ -z "$BACKUP_ID" ]; then
        error "Backup ID not specified"
        exit 1
    fi
    
    prepare_directories
    
    local backup_path="$BACKUP_BASE_DIR/base/$BACKUP_ID"
    if [ ! -d "$backup_path" ]; then
        error "Backup not found: $backup_path"
        exit 1
    fi
    
    info "Verifying backup: $BACKUP_ID"
    
    # 検証開始記録
    start_verification "FULL_VALIDATION" "$BACKUP_ID"
    
    # 各種検証実行
    verify_checksum "$backup_path"
    verify_manifest "$backup_path"
    
    if [ "$SKIP_RESTORE" != true ]; then
        perform_restore_test "$backup_path"
    fi
    
    generate_verification_report
}

# チェックサムのみ検証
checksum_only() {
    prepare_directories
    
    local latest_backup=$(get_latest_backup "base")
    if [ -z "$latest_backup" ]; then
        error "No backup found to verify"
        exit 1
    fi
    
    local backup_id=$(basename "$latest_backup")
    start_verification "CHECKSUM" "$backup_id"
    
    verify_checksum "$latest_backup"
    generate_verification_report
}

# クリーンアップ
cleanup() {
    if [ -d "$VERIFY_WORK_DIR" ]; then
        info "Cleaning up work directory..."
        rm -rf "$VERIFY_WORK_DIR"
    fi
}

# トラップ設定
trap cleanup EXIT

# メイン処理
main() {
    local command="${1:-help}"
    shift || true
    
    parse_args "$@"
    
    case "$command" in
        verify-latest)
            verify_latest
            ;;
        verify-backup)
            verify_specific_backup
            ;;
        verify-all)
            # TODO: 全バックアップ検証実装
            warning "verify-all command not yet implemented"
            ;;
        checksum)
            checksum_only
            ;;
        restore-test)
            prepare_directories
            local latest_backup=$(get_latest_backup "base")
            start_verification "RESTORE_TEST" "$(basename "$latest_backup")"
            perform_restore_test "$latest_backup"
            generate_verification_report
            ;;
        wal-continuity)
            prepare_directories
            start_verification "WAL_CONTINUITY" "current"
            check_wal_continuity
            generate_verification_report
            ;;
        report)
            # 最新の検証結果を表示
            sudo -u postgres psql -d "$DB_NAME" -c "
                SELECT * FROM v_verification_status_summary;
            "
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