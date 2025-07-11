#!/bin/bash

# PostgreSQL Point-in-Time Recovery 復旧スクリプト
# ベースバックアップとWALアーカイブを使用した時点復旧

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

# 復旧設定
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/backup/postgresql}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/backup/wal_archives}"
RECOVERY_TARGET_DIR="${RECOVERY_TARGET_DIR:-/var/lib/postgresql/data_recovery}"
COMPRESSION_TYPE="${COMPRESSION_TYPE:-gzip}"

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

# 利用可能なバックアップ一覧表示
list_available_backups() {
    info "Available base backups:"
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    backup_id,
    backup_name,
    backup_start_time,
    backup_end_time,
    pg_size_pretty(backup_size_bytes) as backup_size,
    backup_status,
    is_verified,
    lsn_start,
    lsn_end
FROM base_backup_history 
WHERE backup_status = 'completed'
AND (retention_until IS NULL OR retention_until > CURRENT_TIMESTAMP)
ORDER BY backup_start_time DESC
LIMIT 20;
EOF
}

# 復旧時点の検証
validate_recovery_target() {
    local target_time="$1"
    local base_backup_id="$2"
    
    # ベースバックアップ情報取得
    local backup_info
    backup_info=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    backup_path,
    backup_start_time,
    backup_end_time,
    lsn_start,
    lsn_end
FROM base_backup_history 
WHERE backup_id = '$base_backup_id'::UUID
AND backup_status = 'completed';
EOF
    )
    
    if [ -z "$backup_info" ]; then
        error "Backup ID $base_backup_id not found or not completed"
        return 1
    fi
    
    # ターゲット時刻がバックアップ時刻より後かチェック
    local backup_end_time
    backup_end_time=$(echo "$backup_info" | awk -F'|' '{print $3}' | tr -d ' ')
    
    if [ -n "$target_time" ]; then
        local target_epoch
        target_epoch=$(date -d "$target_time" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$target_time" +%s 2>/dev/null)
        
        local backup_epoch
        backup_epoch=$(date -d "$backup_end_time" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$backup_end_time" +%s 2>/dev/null)
        
        if [ "$target_epoch" -lt "$backup_epoch" ]; then
            error "Recovery target time ($target_time) is before backup end time ($backup_end_time)"
            return 1
        fi
    fi
    
    # 必要なWALファイルの存在確認
    info "Checking WAL archive continuity..."
    
    local wal_check
    wal_check=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
WITH wal_range AS (
    SELECT 
        MIN(archive_start_time) as first_wal_time,
        MAX(archive_start_time) as last_wal_time,
        COUNT(*) as wal_count,
        COUNT(*) FILTER (WHERE archive_status = 'completed') as completed_count
    FROM wal_archive_history 
    WHERE archive_start_time >= '$backup_end_time'::TIMESTAMP
    AND (
        '$target_time' IS NULL 
        OR archive_start_time <= '$target_time'::TIMESTAMP + INTERVAL '1 hour'
    )
)
SELECT 
    wal_count > 0 as has_wals,
    wal_count = completed_count as all_completed,
    first_wal_time,
    last_wal_time,
    wal_count
FROM wal_range;
EOF
    )
    
    local has_wals
    has_wals=$(echo "$wal_check" | awk -F'|' '{print $1}' | tr -d ' ')
    
    if [ "$has_wals" != "t" ]; then
        warning "No WAL archives found for the recovery period"
        read -p "Continue without WAL recovery? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    success "Recovery target validated"
    return 0
}

# ベースバックアップの展開
restore_base_backup() {
    local backup_id="$1"
    local target_dir="$2"
    
    info "Restoring base backup to $target_dir"
    
    # バックアップパス取得
    local backup_path
    backup_path=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT backup_path 
        FROM base_backup_history 
        WHERE backup_id = '$backup_id'::UUID;
    " | tr -d ' ')
    
    if [ ! -d "$backup_path" ]; then
        error "Backup directory not found: $backup_path"
        return 1
    fi
    
    # ターゲットディレクトリ準備
    if [ -d "$target_dir" ]; then
        warning "Target directory already exists: $target_dir"
        read -p "Remove existing directory? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$target_dir"
        else
            return 1
        fi
    fi
    
    mkdir -p "$target_dir"
    
    # バックアップ展開
    info "Extracting backup files..."
    
    local tar_files
    tar_files=$(find "$backup_path" -name "*.tar*" -type f | sort)
    
    if [ -z "$tar_files" ]; then
        error "No tar files found in backup directory"
        return 1
    fi
    
    # base.tarを最初に展開
    if echo "$tar_files" | grep -q "base.tar"; then
        local base_tar
        base_tar=$(echo "$tar_files" | grep "base.tar" | head -1)
        
        info "Extracting base.tar..."
        if [ "$COMPRESSION_TYPE" = "gzip" ] && [[ "$base_tar" =~ \.gz$ ]]; then
            tar -xzf "$base_tar" -C "$target_dir"
        else
            tar -xf "$base_tar" -C "$target_dir"
        fi
    fi
    
    # その他のtarファイルを展開
    echo "$tar_files" | grep -v "base.tar" | while read -r tar_file; do
        if [ -n "$tar_file" ]; then
            info "Extracting $(basename "$tar_file")..."
            if [ "$COMPRESSION_TYPE" = "gzip" ] && [[ "$tar_file" =~ \.gz$ ]]; then
                tar -xzf "$tar_file" -C "$target_dir"
            else
                tar -xf "$tar_file" -C "$target_dir"
            fi
        fi
    done
    
    # 権限設定
    chown -R postgres:postgres "$target_dir"
    chmod 750 "$target_dir"
    
    success "Base backup restored successfully"
    return 0
}

# WALアーカイブの準備
prepare_wal_archives() {
    local backup_end_time="$1"
    local target_time="$2"
    local wal_dir="$3"
    
    info "Preparing WAL archives for recovery"
    
    # WALリストアディレクトリ作成
    local restore_wal_dir="${wal_dir}/pg_wal"
    mkdir -p "$restore_wal_dir"
    
    # 必要なWALファイルをコピー
    local wal_count=0
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF | while read -r wal_file; do
SELECT wal_filepath
FROM wal_archive_history 
WHERE archive_status = 'completed'
AND archive_start_time >= '$backup_end_time'::TIMESTAMP
AND (
    '$target_time' IS NULL 
    OR archive_start_time <= '$target_time'::TIMESTAMP + INTERVAL '1 hour'
)
ORDER BY archive_start_time;
EOF
        if [ -n "$wal_file" ] && [ -f "$wal_file" ]; then
            local wal_basename
            wal_basename=$(basename "$wal_file" .gz)
            
            if [[ "$wal_file" =~ \.gz$ ]]; then
                info "Decompressing WAL: $wal_basename"
                gunzip -c "$wal_file" > "$restore_wal_dir/$wal_basename"
            else
                info "Copying WAL: $wal_basename"
                cp "$wal_file" "$restore_wal_dir/$wal_basename"
            fi
            
            ((wal_count++))
        fi
    done
    
    info "Prepared $wal_count WAL files for recovery"
    
    # restore_commandスクリプト作成
    cat > "${wal_dir}/restore_wal.sh" << 'EOF'
#!/bin/bash
# WALリストアスクリプト

WAL_NAME="$1"
WAL_PATH="$2"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/backup/wal_archives}"

# アーカイブディレクトリから検索
WAL_FILE=$(find "$WAL_ARCHIVE_DIR" -name "${WAL_NAME}*" -type f | head -1)

if [ -n "$WAL_FILE" ] && [ -f "$WAL_FILE" ]; then
    if [[ "$WAL_FILE" =~ \.gz$ ]]; then
        gunzip -c "$WAL_FILE" > "$WAL_PATH"
    else
        cp "$WAL_FILE" "$WAL_PATH"
    fi
    exit 0
else
    exit 1
fi
EOF
    
    chmod +x "${wal_dir}/restore_wal.sh"
    
    return 0
}

# recovery.conf生成（PostgreSQL 12以降はpostgresql.conf）
create_recovery_config() {
    local target_dir="$1"
    local recovery_target_time="$2"
    local recovery_target_lsn="$3"
    local recovery_target_name="$4"
    local recovery_target_xid="$5"
    
    info "Creating recovery configuration"
    
    local pg_version
    pg_version=$(cat "$target_dir/PG_VERSION" 2>/dev/null || echo "12")
    
    if [ "${pg_version%%.*}" -ge 12 ]; then
        # PostgreSQL 12以降
        local signal_file="$target_dir/recovery.signal"
        touch "$signal_file"
        
        # postgresql.auto.confに復旧設定を追加
        cat >> "$target_dir/postgresql.auto.conf" << EOF

# Point-in-Time Recovery settings
restore_command = '${WAL_ARCHIVE_DIR}/restore_wal.sh %f %p'
recovery_target_action = 'promote'
recovery_target_timeline = 'latest'
EOF
        
        if [ -n "$recovery_target_time" ]; then
            echo "recovery_target_time = '$recovery_target_time'" >> "$target_dir/postgresql.auto.conf"
        elif [ -n "$recovery_target_lsn" ]; then
            echo "recovery_target_lsn = '$recovery_target_lsn'" >> "$target_dir/postgresql.auto.conf"
        elif [ -n "$recovery_target_name" ]; then
            echo "recovery_target_name = '$recovery_target_name'" >> "$target_dir/postgresql.auto.conf"
        elif [ -n "$recovery_target_xid" ]; then
            echo "recovery_target_xid = '$recovery_target_xid'" >> "$target_dir/postgresql.auto.conf"
        fi
        
    else
        # PostgreSQL 11以前
        cat > "$target_dir/recovery.conf" << EOF
# Point-in-Time Recovery configuration
restore_command = '${WAL_ARCHIVE_DIR}/restore_wal.sh %f %p'
recovery_target_timeline = 'latest'
EOF
        
        if [ -n "$recovery_target_time" ]; then
            echo "recovery_target_time = '$recovery_target_time'" >> "$target_dir/recovery.conf"
        elif [ -n "$recovery_target_lsn" ]; then
            echo "recovery_target_lsn = '$recovery_target_lsn'" >> "$target_dir/recovery.conf"
        elif [ -n "$recovery_target_name" ]; then
            echo "recovery_target_name = '$recovery_target_name'" >> "$target_dir/recovery.conf"
        elif [ -n "$recovery_target_xid" ]; then
            echo "recovery_target_xid = '$recovery_target_xid'" >> "$target_dir/recovery.conf"
        fi
    fi
    
    # ポート変更（既存インスタンスとの競合回避）
    if [ -f "$target_dir/postgresql.conf" ]; then
        sed -i.bak "s/^#\?port = .*/port = 5433/" "$target_dir/postgresql.conf"
    fi
    
    success "Recovery configuration created"
    return 0
}

# 復旧実行
perform_recovery() {
    local recovery_name="$1"
    local backup_id="$2"
    local target_time="$3"
    local target_dir="$4"
    
    info "Starting Point-in-Time Recovery"
    
    # 復旧開始をデータベースに記録
    local recovery_id
    recovery_id=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        INSERT INTO pitr_recovery_history (
            recovery_name,
            recovery_target_time,
            base_backup_id,
            recovery_start_time,
            recovery_status,
            recovery_type,
            target_database_name,
            target_data_directory,
            recovery_initiated_by,
            recovery_reason
        ) VALUES (
            '$recovery_name',
            $([ -n "$target_time" ] && echo "'$target_time'::TIMESTAMP" || echo "NULL"),
            '$backup_id'::UUID,
            CURRENT_TIMESTAMP,
            'running',
            'pitr',
            '$DB_NAME',
            '$target_dir',
            '$(whoami)',
            'Manual recovery initiated'
        ) RETURNING recovery_id;
    " | tr -d ' ')
    
    info "Recovery ID: $recovery_id"
    
    # PostgreSQLサーバー起動
    info "Starting PostgreSQL in recovery mode..."
    
    local pg_ctl_cmd="pg_ctl -D $target_dir -l $target_dir/recovery.log"
    local recovery_success=false
    local error_message=""
    
    if $pg_ctl_cmd start; then
        info "PostgreSQL started, monitoring recovery progress..."
        
        # 復旧進行状況監視
        local max_wait=3600  # 最大1時間待機
        local waited=0
        
        while [ $waited -lt $max_wait ]; do
            if pg_isready -h localhost -p 5433 -q; then
                # 復旧状態確認
                local recovery_status
                recovery_status=$(psql -h localhost -p 5433 -U postgres -d postgres -t -c "SELECT pg_is_in_recovery();" 2>/dev/null | tr -d ' ')
                
                if [ "$recovery_status" = "f" ]; then
                    recovery_success=true
                    success "Recovery completed successfully"
                    break
                fi
            fi
            
            sleep 5
            ((waited+=5))
            
            if [ $((waited % 60)) -eq 0 ]; then
                info "Recovery in progress... ($((waited/60)) minutes elapsed)"
            fi
        done
        
        if [ "$recovery_success" = false ]; then
            error_message="Recovery timeout after $((waited/60)) minutes"
            error "$error_message"
        fi
    else
        error_message="Failed to start PostgreSQL"
        error "$error_message"
        
        # ログ確認
        if [ -f "$target_dir/recovery.log" ]; then
            tail -20 "$target_dir/recovery.log"
        fi
    fi
    
    # 復旧結果をデータベースに記録
    local final_status
    if [ "$recovery_success" = true ]; then
        final_status="completed"
        
        # 復旧統計取得
        local recovery_stats
        recovery_stats=$(psql -h localhost -p 5433 -U postgres -d postgres -t << 'EOF'
SELECT 
    pg_last_wal_replay_lsn() as last_lsn,
    pg_last_xact_replay_timestamp() as last_replay_time;
EOF
        )
        
        local last_lsn
        last_lsn=$(echo "$recovery_stats" | awk -F'|' '{print $1}' | tr -d ' ')
        
    else
        final_status="failed"
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        UPDATE pitr_recovery_history SET
            recovery_end_time = CURRENT_TIMESTAMP,
            recovery_duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - recovery_start_time)),
            recovery_status = '$final_status',
            last_applied_lsn = '$last_lsn',
            error_message = '$error_message',
            updated_at = CURRENT_TIMESTAMP
        WHERE recovery_id = '$recovery_id'::UUID;
    " > /dev/null
    
    if [ "$recovery_success" = true ]; then
        info "Recovery Summary:"
        info "  Recovery ID: $recovery_id"
        info "  Status: $final_status"
        info "  Target Directory: $target_dir"
        info "  Last Applied LSN: $last_lsn"
        info ""
        info "Recovered database is running on port 5433"
        info "To connect: psql -h localhost -p 5433 -U postgres -d $DB_NAME"
        
        return 0
    else
        return 1
    fi
}

# 復旧後の検証
verify_recovery() {
    local target_dir="$1"
    local expected_time="$2"
    
    info "Verifying recovered database"
    
    # データベース接続確認
    if ! pg_isready -h localhost -p 5433 -q; then
        error "Cannot connect to recovered database"
        return 1
    fi
    
    # 基本的な整合性チェック
    local checks_passed=true
    
    # テーブル数確認
    local table_count
    table_count=$(psql -h localhost -p 5433 -U postgres -d "$DB_NAME" -t -c "
        SELECT count(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE';
    " 2>/dev/null | tr -d ' ')
    
    if [ "$table_count" -gt 0 ]; then
        success "Found $table_count tables in recovered database"
    else
        error "No tables found in recovered database"
        checks_passed=false
    fi
    
    # 最終トランザクション時刻確認
    if [ -n "$expected_time" ]; then
        local last_xact_time
        last_xact_time=$(psql -h localhost -p 5433 -U postgres -d postgres -t -c "
            SELECT pg_last_xact_replay_timestamp();
        " 2>/dev/null | tr -d ' ')
        
        info "Last transaction timestamp: $last_xact_time"
        
        # 期待時刻との比較
        local expected_epoch
        expected_epoch=$(date -d "$expected_time" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$expected_time" +%s 2>/dev/null)
        
        local actual_epoch
        actual_epoch=$(date -d "$last_xact_time" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$last_xact_time" +%s 2>/dev/null)
        
        local time_diff=$((actual_epoch - expected_epoch))
        
        if [ $time_diff -lt 300 ] && [ $time_diff -gt -300 ]; then
            success "Recovery target time verified (within 5 minutes)"
        else
            warning "Recovery time differs from target by $((time_diff/60)) minutes"
        fi
    fi
    
    # データサンプリング
    info "Sampling recovered data..."
    
    psql -h localhost -p 5433 -U postgres -d "$DB_NAME" << 'EOF'
\echo 'Table row counts:'
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;
EOF
    
    if [ "$checks_passed" = true ]; then
        success "Recovery verification completed"
        return 0
    else
        error "Recovery verification failed"
        return 1
    fi
}

# 復旧履歴表示
show_recovery_history() {
    info "Recent recovery history:"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2
\pset format aligned

SELECT 
    recovery_id,
    recovery_name,
    recovery_start_time,
    recovery_end_time,
    recovery_duration_seconds || 's' as duration,
    recovery_status,
    recovery_target_time,
    target_database_name,
    recovery_initiated_by,
    rpo_minutes || ' min' as rpo,
    rto_minutes || ' min' as rto
FROM pitr_recovery_history 
ORDER BY recovery_start_time DESC
LIMIT 10;
EOF
}

# クリーンアップ
cleanup_recovery() {
    local target_dir="$1"
    
    warning "Cleaning up recovery instance"
    
    # PostgreSQL停止
    if pg_ctl -D "$target_dir" status > /dev/null 2>&1; then
        info "Stopping PostgreSQL..."
        pg_ctl -D "$target_dir" stop -m fast
    fi
    
    # ディレクトリ削除確認
    read -p "Remove recovery directory $target_dir? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$target_dir"
        success "Recovery directory removed"
    fi
}

# ヘルプ表示
show_help() {
    echo "PostgreSQL Point-in-Time Recovery Script"
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  list                  - List available backups"
    echo "  recover               - Interactive recovery wizard"
    echo "  recover-to-time       - Recover to specific time"
    echo "  recover-to-lsn        - Recover to specific LSN"
    echo "  verify [dir]          - Verify recovered database"
    echo "  cleanup [dir]         - Clean up recovery instance"
    echo "  history               - Show recovery history"
    echo "  help                  - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 recover"
    echo "  $0 recover-to-time 'BACKUP_ID' '2024-01-15 14:30:00'"
    echo "  $0 verify /var/lib/postgresql/data_recovery"
    echo "  $0 cleanup /var/lib/postgresql/data_recovery"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST               - PostgreSQL host (default: localhost)"
    echo "  DB_PORT               - PostgreSQL port (default: 5432)"
    echo "  DB_NAME               - Database name (default: monstera)"
    echo "  DB_USER               - Database user (default: postgres)"
    echo "  DB_PASSWORD           - Database password"
    echo "  BACKUP_BASE_DIR       - Base backup directory"
    echo "  WAL_ARCHIVE_DIR       - WAL archive directory"
    echo "  RECOVERY_TARGET_DIR   - Recovery target directory"
}

# インタラクティブ復旧ウィザード
interactive_recovery() {
    echo -e "${PURPLE}PostgreSQL Point-in-Time Recovery Wizard${NC}"
    echo -e "${PURPLE}========================================${NC}"
    echo ""
    
    # バックアップ選択
    list_available_backups
    echo ""
    
    read -p "Enter Backup ID: " backup_id
    if [ -z "$backup_id" ]; then
        error "Backup ID required"
        return 1
    fi
    
    # 復旧タイプ選択
    echo ""
    echo "Recovery target options:"
    echo "  1) Latest available point"
    echo "  2) Specific time"
    echo "  3) Specific LSN"
    echo "  4) Named restore point"
    echo ""
    
    read -p "Select recovery target [1-4]: " target_type
    
    local target_time=""
    local target_lsn=""
    local target_name=""
    
    case "$target_type" in
        2)
            read -p "Enter target time (YYYY-MM-DD HH:MM:SS): " target_time
            ;;
        3)
            read -p "Enter target LSN: " target_lsn
            ;;
        4)
            read -p "Enter restore point name: " target_name
            ;;
    esac
    
    # 復旧ディレクトリ
    local default_dir="/var/lib/postgresql/data_recovery_$(date +%Y%m%d_%H%M%S)"
    read -p "Recovery directory [$default_dir]: " recovery_dir
    recovery_dir="${recovery_dir:-$default_dir}"
    
    # 確認
    echo ""
    echo "Recovery Summary:"
    echo "  Backup ID: $backup_id"
    echo "  Target Time: ${target_time:-Latest}"
    echo "  Target LSN: ${target_lsn:-N/A}"
    echo "  Target Name: ${target_name:-N/A}"
    echo "  Recovery Directory: $recovery_dir"
    echo ""
    
    read -p "Proceed with recovery? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Recovery cancelled"
        return 1
    fi
    
    # 復旧実行
    local recovery_name="recovery_$(date +%Y%m%d_%H%M%S)"
    
    # バックアップ情報取得
    local backup_info
    backup_info=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT backup_end_time 
        FROM base_backup_history 
        WHERE backup_id = '$backup_id'::UUID;
    " | tr -d ' ')
    
    # 検証
    if validate_recovery_target "$target_time" "$backup_id"; then
        # ベースバックアップ復元
        if restore_base_backup "$backup_id" "$recovery_dir"; then
            # WAL準備
            prepare_wal_archives "$backup_info" "$target_time" "$recovery_dir"
            
            # 復旧設定作成
            create_recovery_config "$recovery_dir" "$target_time" "$target_lsn" "$target_name" ""
            
            # 復旧実行
            if perform_recovery "$recovery_name" "$backup_id" "$target_time" "$recovery_dir"; then
                # 検証
                verify_recovery "$recovery_dir" "$target_time"
                
                echo ""
                success "Recovery completed successfully!"
                echo ""
                echo "Next steps:"
                echo "  1. Verify the recovered data"
                echo "  2. Export required data if needed"
                echo "  3. Clean up when done: $0 cleanup $recovery_dir"
            fi
        fi
    fi
}

# メイン処理
main() {
    local command="${1:-help}"
    
    case "$command" in
        list)
            test_connection
            list_available_backups
            ;;
        recover)
            test_connection
            interactive_recovery
            ;;
        recover-to-time)
            test_connection
            local backup_id="$2"
            local target_time="$3"
            
            if [ -z "$backup_id" ] || [ -z "$target_time" ]; then
                error "Usage: $0 recover-to-time BACKUP_ID 'YYYY-MM-DD HH:MM:SS'"
                exit 1
            fi
            
            local recovery_dir="${RECOVERY_TARGET_DIR}_$(date +%Y%m%d_%H%M%S)"
            local recovery_name="recovery_to_${target_time// /_}"
            
            if validate_recovery_target "$target_time" "$backup_id"; then
                local backup_info
                backup_info=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
                    SELECT backup_end_time 
                    FROM base_backup_history 
                    WHERE backup_id = '$backup_id'::UUID;
                " | tr -d ' ')
                
                if restore_base_backup "$backup_id" "$recovery_dir"; then
                    prepare_wal_archives "$backup_info" "$target_time" "$recovery_dir"
                    create_recovery_config "$recovery_dir" "$target_time" "" "" ""
                    perform_recovery "$recovery_name" "$backup_id" "$target_time" "$recovery_dir"
                    verify_recovery "$recovery_dir" "$target_time"
                fi
            fi
            ;;
        recover-to-lsn)
            test_connection
            local backup_id="$2"
            local target_lsn="$3"
            
            if [ -z "$backup_id" ] || [ -z "$target_lsn" ]; then
                error "Usage: $0 recover-to-lsn BACKUP_ID TARGET_LSN"
                exit 1
            fi
            
            local recovery_dir="${RECOVERY_TARGET_DIR}_$(date +%Y%m%d_%H%M%S)"
            local recovery_name="recovery_to_lsn_${target_lsn}"
            
            if validate_recovery_target "" "$backup_id"; then
                local backup_info
                backup_info=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
                    SELECT backup_end_time 
                    FROM base_backup_history 
                    WHERE backup_id = '$backup_id'::UUID;
                " | tr -d ' ')
                
                if restore_base_backup "$backup_id" "$recovery_dir"; then
                    prepare_wal_archives "$backup_info" "" "$recovery_dir"
                    create_recovery_config "$recovery_dir" "" "$target_lsn" "" ""
                    perform_recovery "$recovery_name" "$backup_id" "" "$recovery_dir"
                    verify_recovery "$recovery_dir" ""
                fi
            fi
            ;;
        verify)
            local recovery_dir="$2"
            if [ -z "$recovery_dir" ]; then
                error "Recovery directory required"
                exit 1
            fi
            verify_recovery "$recovery_dir" ""
            ;;
        cleanup)
            local recovery_dir="$2"
            if [ -z "$recovery_dir" ]; then
                error "Recovery directory required"
                exit 1
            fi
            cleanup_recovery "$recovery_dir"
            ;;
        history)
            test_connection
            show_recovery_history
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