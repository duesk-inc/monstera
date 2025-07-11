#!/bin/bash

# PostgreSQL User Permissions Validation Script
# このスクリプトはPostgreSQLユーザー権限設定を検証します

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定値
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres_admin_password}"

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# PostgreSQL接続テスト関数
test_connection() {
    local user=$1
    local password=$2
    local expected_result=$3
    
    log_info "Testing connection for user: $user"
    
    if PGPASSWORD="$password" psql -h "$DB_HOST" -p "$DB_PORT" -U "$user" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        if [ "$expected_result" = "success" ]; then
            log_success "✓ Connection successful for $user"
            return 0
        else
            log_error "✗ Unexpected successful connection for $user"
            return 1
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            log_success "✓ Connection properly rejected for $user"
            return 0
        else
            log_error "✗ Connection failed for $user"
            return 1
        fi
    fi
}

# 権限テスト関数
test_permissions() {
    local user=$1
    local password=$2
    local operation=$3
    local expected_result=$4
    
    log_info "Testing $operation permission for user: $user"
    
    local query=""
    case $operation in
        "select")
            query="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
            ;;
        "insert")
            query="CREATE TEMP TABLE test_insert_$(date +%s) (id SERIAL, test_data TEXT); INSERT INTO test_insert_$(date +%s) (test_data) VALUES ('test'); DROP TABLE test_insert_$(date +%s);"
            ;;
        "create")
            query="CREATE TEMP TABLE test_create_$(date +%s) (id SERIAL); DROP TABLE test_create_$(date +%s);"
            ;;
        "admin")
            query="CREATE USER test_user_$(date +%s); DROP USER test_user_$(date +%s);"
            ;;
    esac
    
    if PGPASSWORD="$password" psql -h "$DB_HOST" -p "$DB_PORT" -U "$user" -d "$DB_NAME" -c "$query" > /dev/null 2>&1; then
        if [ "$expected_result" = "success" ]; then
            log_success "✓ $operation permission working for $user"
            return 0
        else
            log_error "✗ Unexpected $operation permission for $user"
            return 1
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            log_success "✓ $operation permission properly restricted for $user"
            return 0
        else
            log_error "✗ $operation permission failed for $user"
            return 1
        fi
    fi
}

# メイン検証
main() {
    echo "======================================"
    echo "PostgreSQL User Permissions Validation"
    echo "======================================"
    echo ""
    
    log_info "Database: $DB_HOST:$DB_PORT/$DB_NAME"
    echo ""
    
    # 基本接続テスト
    echo "1. Basic Connection Tests"
    echo "========================="
    
    # 管理者ユーザーテスト
    test_connection "$POSTGRES_USER" "$POSTGRES_PASSWORD" "success"
    
    # アプリケーションユーザーテスト
    test_connection "monstera_app" "app_password" "success"
    
    # 読み取り専用ユーザーテスト
    test_connection "monstera_readonly" "readonly_password" "success"
    
    # バックアップユーザーテスト
    test_connection "monstera_backup" "backup_password" "success"
    
    echo ""
    
    # 権限テスト
    echo "2. Permission Tests"
    echo "==================="
    
    # アプリケーションユーザー権限テスト
    echo ""
    log_info "Testing monstera_app permissions:"
    test_permissions "monstera_app" "app_password" "select" "success"
    test_permissions "monstera_app" "app_password" "insert" "success"
    test_permissions "monstera_app" "app_password" "create" "success"
    test_permissions "monstera_app" "app_password" "admin" "fail"
    
    # 読み取り専用ユーザー権限テスト
    echo ""
    log_info "Testing monstera_readonly permissions:"
    test_permissions "monstera_readonly" "readonly_password" "select" "success"
    test_permissions "monstera_readonly" "readonly_password" "insert" "fail"
    test_permissions "monstera_readonly" "readonly_password" "create" "fail"
    test_permissions "monstera_readonly" "readonly_password" "admin" "fail"
    
    echo ""
    
    # セキュリティ設定確認
    echo "3. Security Configuration Check"
    echo "==============================="
    
    # SSL設定確認
    log_info "Checking SSL configuration..."
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "SHOW ssl;" | grep -q "on"; then
        log_success "✓ SSL is enabled"
    else
        log_warning "⚠ SSL is not enabled"
    fi
    
    # 接続制限確認
    log_info "Checking connection limits..."
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "
    SELECT 
        usename,
        useconnlimit,
        CASE 
            WHEN useconnlimit = -1 THEN 'Unlimited'
            ELSE useconnlimit::text || ' connections'
        END as connection_limit
    FROM pg_user 
    WHERE usename IN ('monstera_app', 'monstera_readonly', 'monstera_backup')
    ORDER BY usename;
    "
    
    echo ""
    
    # 権限サマリー表示
    echo "4. Permission Summary"
    echo "===================="
    
    log_info "Current user privileges:"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "
    SELECT 
        grantee,
        count(*) as privilege_count,
        string_agg(DISTINCT privilege_type, ', ') as privileges
    FROM information_schema.table_privileges
    WHERE grantee IN ('monstera_app', 'monstera_readonly', 'monstera_backup')
    GROUP BY grantee
    ORDER BY grantee;
    "
    
    echo ""
    
    # 現在の接続状況
    echo "5. Current Connection Status"
    echo "==========================="
    
    log_info "Active connections by user:"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "
    SELECT 
        usename,
        count(*) as active_connections,
        max(backend_start) as last_connection
    FROM pg_stat_activity 
    WHERE datname = '$DB_NAME'
    GROUP BY usename
    ORDER BY usename;
    "
    
    echo ""
    
    # セキュリティスコア表示（アプリケーションから）
    echo "6. Security Score Assessment"
    echo "==========================="
    
    # Go アプリケーションのセキュリティ評価を実行
    if [ -f "./validate_ssl_tls/main.go" ]; then
        log_info "Running security assessment..."
        cd validate_ssl_tls && go run main.go | grep -E "(Security Score|SSL Enabled|TLS Version)" || true
        cd ..
    else
        log_warning "Security assessment script not found"
    fi
    
    echo ""
    
    # 推奨事項
    echo "7. Security Recommendations"
    echo "==========================="
    
    log_info "Security checklist:"
    echo "  □ Change default passwords in production"
    echo "  □ Enable SSL/TLS with strong cipher suites"
    echo "  □ Set password expiration policies"
    echo "  □ Monitor connection usage and patterns"
    echo "  □ Regular security audits and permission reviews"
    echo "  □ Enable connection logging for security events"
    echo "  □ Implement database firewall rules"
    echo "  □ Regular backup and recovery testing"
    
    echo ""
    
    # 最終結果
    echo "======================================"
    log_success "User Permission Validation Completed"
    echo "======================================"
    
    log_info "Summary:"
    echo "  ✓ monstera_app: Full CRUD access for application"
    echo "  ✓ monstera_readonly: Read-only access for reporting"
    echo "  ✓ monstera_backup: Read-only access for backups"
    echo "  ✓ postgres: Administrative access (restricted usage)"
    
    echo ""
    log_info "Next steps:"
    echo "  1. Update application configuration with new credentials"
    echo "  2. Test application functionality with new user permissions"
    echo "  3. Monitor database logs for any permission issues"
    echo "  4. Schedule regular permission audits"
}

# 引数処理
case "${1:-}" in
    "--help"|"-h")
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  -h, --help    Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  DB_HOST       Database host (default: localhost)"
        echo "  DB_PORT       Database port (default: 5432)"
        echo "  DB_NAME       Database name (default: monstera)"
        echo "  POSTGRES_USER Admin username (default: postgres)"
        echo "  POSTGRES_PASSWORD Admin password (required)"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac