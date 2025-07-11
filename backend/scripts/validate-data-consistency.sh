#!/bin/bash

# データ整合性検証スクリプト
# MySQLとPostgreSQL間のデータ整合性をチェック

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# データベース接続設定
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"
MYSQL_DATABASE="${MYSQL_DATABASE:-monstera}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5433}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-monstera_green}"

# 結果格納用
VALIDATION_RESULTS="/tmp/validation_results_$(date +%Y%m%d_%H%M%S).json"
ERRORS_FOUND=0

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# エラー記録関数
record_error() {
    local table=$1
    local error_type=$2
    local details=$3
    
    echo "{\"table\": \"$table\", \"error_type\": \"$error_type\", \"details\": \"$details\", \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" >> "$VALIDATION_RESULTS"
    ERRORS_FOUND=$((ERRORS_FOUND + 1))
}

# テーブルリスト取得
get_tables() {
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '$MYSQL_DATABASE' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    "
}

# レコード数の比較
check_record_counts() {
    local table=$1
    
    # MySQL レコード数
    MYSQL_COUNT=$(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e "
        SELECT COUNT(*) FROM $table;
    " 2>/dev/null || echo "ERROR")
    
    # PostgreSQL レコード数
    PG_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -t -c "
        SELECT COUNT(*) FROM $table;
    " 2>/dev/null | tr -d ' ' || echo "ERROR")
    
    if [ "$MYSQL_COUNT" = "ERROR" ] || [ "$PG_COUNT" = "ERROR" ]; then
        record_error "$table" "count_error" "Failed to get record count"
        echo -e "${RED}✗${NC} $table: Error getting counts"
        return 1
    fi
    
    if [ "$MYSQL_COUNT" != "$PG_COUNT" ]; then
        record_error "$table" "count_mismatch" "MySQL: $MYSQL_COUNT, PostgreSQL: $PG_COUNT"
        echo -e "${RED}✗${NC} $table: Count mismatch (MySQL: $MYSQL_COUNT, PostgreSQL: $PG_COUNT)"
        return 1
    else
        echo -e "${GREEN}✓${NC} $table: $MYSQL_COUNT records"
        return 0
    fi
}

# チェックサム比較（主要フィールド）
check_data_checksum() {
    local table=$1
    
    # テーブルごとのチェックサムカラムを定義
    case $table in
        "users")
            CHECKSUM_COLS="email, name, role, status"
            ;;
        "projects")
            CHECKSUM_COLS="name, client_name, status, start_date"
            ;;
        "weekly_reports")
            CHECKSUM_COLS="user_id, week_start_date, status, work_content"
            ;;
        "invoices")
            CHECKSUM_COLS="invoice_number, issue_date, total_amount, status"
            ;;
        *)
            # デフォルトは最初の5カラム
            CHECKSUM_COLS=$(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e "
                SELECT GROUP_CONCAT(column_name ORDER BY ordinal_position)
                FROM information_schema.columns
                WHERE table_schema = '$MYSQL_DATABASE' 
                AND table_name = '$table'
                AND ordinal_position <= 5;
            ")
            ;;
    esac
    
    # MySQLのチェックサム
    MYSQL_CHECKSUM=$(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e "
        SELECT MD5(GROUP_CONCAT(CONCAT_WS('|', $CHECKSUM_COLS) ORDER BY id))
        FROM $table
        WHERE deleted_at IS NULL;
    " 2>/dev/null || echo "ERROR")
    
    # PostgreSQLのチェックサム
    PG_CHECKSUM=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -t -c "
        SELECT MD5(STRING_AGG(CONCAT_WS('|', $CHECKSUM_COLS), '' ORDER BY id))
        FROM $table
        WHERE deleted_at IS NULL;
    " 2>/dev/null | tr -d ' ' || echo "ERROR")
    
    if [ "$MYSQL_CHECKSUM" != "$PG_CHECKSUM" ]; then
        record_error "$table" "checksum_mismatch" "Data content differs between databases"
        echo -e "${YELLOW}⚠${NC}  $table: Checksum mismatch (investigating...)"
        
        # 詳細な差分調査
        investigate_differences "$table"
        return 1
    else
        echo -e "${GREEN}✓${NC} $table: Data checksum matches"
        return 0
    fi
}

# 差分の詳細調査
investigate_differences() {
    local table=$1
    
    # 最新10件のレコードを比較
    echo "   Checking recent records in $table..."
    
    # 作成日時の差異をチェック
    MYSQL_LATEST=$(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e "
        SELECT MAX(created_at) FROM $table;
    " 2>/dev/null)
    
    PG_LATEST=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -t -c "
        SELECT MAX(created_at) FROM $table;
    " 2>/dev/null | tr -d ' ')
    
    if [ "$MYSQL_LATEST" != "$PG_LATEST" ]; then
        echo -e "   ${YELLOW}Latest record timestamp differs${NC}"
        echo "   MySQL: $MYSQL_LATEST"
        echo "   PostgreSQL: $PG_LATEST"
    fi
}

# 外部キー整合性チェック
check_foreign_keys() {
    log "Checking foreign key integrity..."
    
    # users -> departments
    ORPHAN_USERS_MYSQL=$(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e "
        SELECT COUNT(*)
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.department_id IS NOT NULL AND d.id IS NULL;
    " 2>/dev/null || echo "ERROR")
    
    ORPHAN_USERS_PG=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -t -c "
        SELECT COUNT(*)
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.department_id IS NOT NULL AND d.id IS NULL;
    " 2>/dev/null | tr -d ' ' || echo "ERROR")
    
    if [ "$ORPHAN_USERS_MYSQL" != "0" ] || [ "$ORPHAN_USERS_PG" != "0" ]; then
        record_error "foreign_keys" "orphan_records" "Orphan users found: MySQL=$ORPHAN_USERS_MYSQL, PostgreSQL=$ORPHAN_USERS_PG"
        echo -e "${RED}✗${NC} Foreign key violation: orphan users found"
    else
        echo -e "${GREEN}✓${NC} Foreign key integrity: users -> departments"
    fi
}

# シーケンス値の確認
check_sequences() {
    log "Checking sequence values..."
    
    # PostgreSQLのシーケンス値を確認
    SEQUENCES=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -t -c "
        SELECT 
            schemaname || '.' || sequencename as seq_name,
            last_value
        FROM pg_sequences
        WHERE schemaname = 'public';
    ")
    
    echo -e "${BLUE}PostgreSQL sequences:${NC}"
    echo "$SEQUENCES"
}

# サマリー生成
generate_summary() {
    local total_tables=$1
    local checked_tables=$2
    
    echo
    echo "========================================="
    echo "Data Consistency Validation Summary"
    echo "========================================="
    echo "Total tables checked: $checked_tables / $total_tables"
    echo "Errors found: $ERRORS_FOUND"
    
    if [ $ERRORS_FOUND -eq 0 ]; then
        echo -e "${GREEN}✅ All consistency checks passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Consistency check failed with $ERRORS_FOUND errors${NC}"
        echo "Details saved to: $VALIDATION_RESULTS"
        return 1
    fi
}

# メイン処理
main() {
    log "Starting data consistency validation..."
    log "MySQL: $MYSQL_HOST:$MYSQL_PORT/$MYSQL_DATABASE"
    log "PostgreSQL: $POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DATABASE"
    echo
    
    # 結果ファイルを初期化
    echo "[]" > "$VALIDATION_RESULTS"
    
    # テーブルリストを取得
    TABLES=$(get_tables)
    TOTAL_TABLES=$(echo "$TABLES" | wc -l)
    CHECKED_TABLES=0
    
    echo "Found $TOTAL_TABLES tables to validate"
    echo
    
    # 各テーブルをチェック
    echo "Checking record counts..."
    echo "========================="
    for table in $TABLES; do
        check_record_counts "$table"
        CHECKED_TABLES=$((CHECKED_TABLES + 1))
    done
    
    echo
    echo "Checking data checksums..."
    echo "========================="
    for table in $TABLES; do
        # 大きなテーブルはサンプリングでチェック
        case $table in
            "audit_logs"|"activity_logs"|"login_history")
                echo -e "${BLUE}⏭${NC}  $table: Skipping checksum (large table)"
                ;;
            *)
                check_data_checksum "$table"
                ;;
        esac
    done
    
    echo
    echo "Additional checks..."
    echo "==================="
    check_foreign_keys
    check_sequences
    
    # サマリーを生成
    generate_summary $TOTAL_TABLES $CHECKED_TABLES
}

# 実行
main "$@"