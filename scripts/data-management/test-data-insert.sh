#!/bin/bash

# =============================================================================
# Monstera PostgreSQL テストデータ投入スクリプト
# =============================================================================

set -euo pipefail

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONTAINER_NAME="monstera-postgres-test"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera_test}"
DB_USER="${DB_USER:-monstera}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# PostgreSQL接続テスト
test_connection() {
    log_info "PostgreSQL接続テスト..."
    
    if docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        log_success "PostgreSQL接続成功"
        return 0
    else
        log_error "PostgreSQL接続失敗"
        return 1
    fi
}

# マイグレーション実行
run_migrations() {
    log_info "PostgreSQLマイグレーション実行..."
    
    # golang-migrateが利用可能か確認
    if ! command -v migrate &> /dev/null; then
        log_warning "golang-migrateがインストールされていません。Dockerコンテナ内で実行します。"
        
        # PostgreSQL接続文字列
        DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
        
        # Dockerコンテナ内でマイグレーション実行
        docker exec "${CONTAINER_NAME}" sh -c "
            if command -v migrate &> /dev/null; then
                migrate -path /migrations -database '${DB_URL}' up
            else
                echo 'migrate command not found in container'
                exit 1
            fi
        "
    else
        # ローカルでマイグレーション実行
        DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
        migrate -path "${PROJECT_ROOT}/backend/migrations" -database "${DB_URL}" up
    fi
    
    if [ $? -eq 0 ]; then
        log_success "マイグレーション実行完了"
    else
        log_error "マイグレーション実行失敗"
        return 1
    fi
}

# テストデータ投入
insert_test_data() {
    log_info "テストデータ投入開始..."
    
    # テストデータディレクトリ
    TEST_DATA_DIR="${PROJECT_ROOT}/test-data"
    
    # テストデータディレクトリが存在しない場合は作成
    if [ ! -d "${TEST_DATA_DIR}" ]; then
        mkdir -p "${TEST_DATA_DIR}"
        log_info "テストデータディレクトリを作成: ${TEST_DATA_DIR}"
    fi
    
    # 基本テストデータファイルリスト（実行順序重要）
    local test_files=(
        "01_test_users.sql"
        "02_test_roles.sql"
        "03_test_departments.sql"
        "04_test_projects.sql"
        "05_test_proposals.sql"
        "06_test_weekly_reports.sql"
        "07_test_expenses.sql"
        "08_test_notifications.sql"
    )
    
    # 各テストデータファイルを実行
    for file in "${test_files[@]}"; do
        local file_path="${TEST_DATA_DIR}/${file}"
        
        if [ -f "${file_path}" ]; then
            log_info "テストデータ投入: ${file}"
            
            # SQLファイルをコンテナ内で実行
            if docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${file_path}"; then
                log_success "${file} 投入完了"
            else
                log_error "${file} 投入失敗"
                return 1
            fi
        else
            log_warning "テストデータファイルが見つかりません: ${file_path}"
            # 基本的なテストデータを生成
            generate_basic_test_data "${file}" "${file_path}"
        fi
    done
    
    log_success "全テストデータ投入完了"
}

# 基本テストデータ生成
generate_basic_test_data() {
    local filename="$1"
    local filepath="$2"
    
    log_info "基本テストデータ生成: ${filename}"
    
    case "${filename}" in
        "01_test_users.sql")
            cat > "${filepath}" << 'EOF'
-- テストユーザーデータ
INSERT INTO users (id, cognito_user_id, email, name, role, department_id, is_active, created_at, updated_at) VALUES
(gen_random_uuid(), 'test-engineer-001', 'engineer@test.com', 'テストエンジニア', 'engineer', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'test-manager-001', 'manager@test.com', 'テストマネージャー', 'manager', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'test-admin-001', 'admin@test.com', 'テスト管理者', 'admin', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'test-sales-001', 'sales@test.com', 'テスト営業', 'sales', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (cognito_user_id) DO NOTHING;
EOF
            ;;
        "02_test_roles.sql")
            cat > "${filepath}" << 'EOF'
-- テストロールデータ
INSERT INTO user_roles (id, user_id, role, granted_at, granted_by, created_at, updated_at) 
SELECT 
    gen_random_uuid(),
    u.id,
    u.role,
    CURRENT_TIMESTAMP,
    'system',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = u.role
);
EOF
            ;;
        "03_test_departments.sql")
            cat > "${filepath}" << 'EOF'
-- テスト部署データ
INSERT INTO departments (id, name, description, is_active, created_at, updated_at) VALUES
(gen_random_uuid(), '開発部', 'システム開発部門', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), '営業部', '営業・販売部門', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), '管理部', '総務・管理部門', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
EOF
            ;;
        "04_test_projects.sql")
            cat > "${filepath}" << 'EOF'
-- テストプロジェクトデータ
INSERT INTO projects (id, name, description, start_date, end_date, status, created_at, updated_at) VALUES
(gen_random_uuid(), 'テストプロジェクトA', 'Webアプリケーション開発', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'テストプロジェクトB', 'システム保守', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE + INTERVAL '30 days', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
EOF
            ;;
        "05_test_proposals.sql")
            cat > "${filepath}" << 'EOF'
-- テスト提案データ
WITH test_users AS (
    SELECT id, cognito_user_id FROM users WHERE cognito_user_id LIKE 'test-%' LIMIT 2
),
test_projects AS (
    SELECT id, name FROM projects WHERE name LIKE 'テストプロジェクト%' LIMIT 2
)
INSERT INTO engineer_proposals (id, user_id, project_id, status, content, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    tu.id,
    tp.id,
    'proposed',
    'テスト提案内容: ' || tp.name,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM test_users tu
CROSS JOIN test_projects tp;
EOF
            ;;
        "06_test_weekly_reports.sql")
            cat > "${filepath}" << 'EOF'
-- テスト週報データ
WITH test_users AS (
    SELECT id FROM users WHERE cognito_user_id LIKE 'test-engineer%' LIMIT 1
)
INSERT INTO weekly_reports (id, user_id, start_date, end_date, status, weekly_remarks, total_work_hours, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    tu.id,
    DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 days'),
    DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 days') + INTERVAL '6 days',
    'submitted',
    'テスト週報',
    40.0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM test_users tu;
EOF
            ;;
        "07_test_expenses.sql")
            cat > "${filepath}" << 'EOF'
-- テスト経費データ
WITH test_users AS (
    SELECT id FROM users WHERE cognito_user_id LIKE 'test-engineer%' LIMIT 1
)
INSERT INTO expenses (id, user_id, title, amount, expense_date, status, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    tu.id,
    'テスト交通費',
    1500,
    CURRENT_DATE - INTERVAL '5 days',
    'submitted',
    'テスト用の交通費',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM test_users tu;
EOF
            ;;
        "08_test_notifications.sql")
            cat > "${filepath}" << 'EOF'
-- テスト通知データ
WITH test_users AS (
    SELECT id FROM users WHERE cognito_user_id LIKE 'test-%' LIMIT 1
)
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    tu.id,
    'テスト通知',
    'これはテスト用の通知です',
    'info',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM test_users tu;
EOF
            ;;
    esac
    
    log_success "基本テストデータ生成完了: ${filename}"
}

# データ検証
verify_test_data() {
    log_info "テストデータ検証開始..."
    
    # 各テーブルのレコード数確認
    local tables=(
        "users"
        "user_roles"
        "departments"
        "projects"
        "engineer_proposals"
        "weekly_reports"
        "expenses"
        "notifications"
    )
    
    for table in "${tables[@]}"; do
        local count=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM ${table};" | tr -d ' ')
        
        if [ "${count}" -gt 0 ]; then
            log_success "${table}: ${count} レコード"
        else
            log_warning "${table}: レコードなし"
        fi
    done
}

# データクリーンアップ
cleanup_test_data() {
    log_info "テストデータクリーンアップ..."
    
    # テーブル内容をクリア（外部キー制約を考慮した順序）
    local cleanup_tables=(
        "daily_records"
        "weekly_reports"
        "engineer_proposals"
        "expenses"
        "notifications"
        "user_roles"
        "project_assignments"
        "projects"
        "users"
        "departments"
    )
    
    for table in "${cleanup_tables[@]}"; do
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            DELETE FROM ${table} WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day';
        " > /dev/null 2>&1 || true
    done
    
    log_success "テストデータクリーンアップ完了"
}

# パフォーマンステスト用データ生成
generate_performance_test_data() {
    log_info "パフォーマンステスト用データ生成..."
    
    # 大量データ生成スクリプト
    cat > "${PROJECT_ROOT}/test-data/performance_data.sql" << 'EOF'
-- パフォーマンステスト用大量データ生成
DO $$
DECLARE
    user_id UUID;
    project_id UUID;
    i INTEGER;
BEGIN
    -- テストユーザー作成
    FOR i IN 1..100 LOOP
        INSERT INTO users (id, cognito_user_id, email, name, role, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'perf-user-' || i,
            'perf-user-' || i || '@test.com',
            'パフォーマンステストユーザー' || i,
            CASE WHEN i % 4 = 0 THEN 'manager' ELSE 'engineer' END,
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END LOOP;
    
    -- テストプロジェクト作成
    FOR i IN 1..50 LOOP
        INSERT INTO projects (id, name, description, start_date, end_date, status, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'パフォーマンステストプロジェクト' || i,
            'パフォーマンステスト用プロジェクト' || i,
            CURRENT_DATE - INTERVAL '30 days',
            CURRENT_DATE + INTERVAL '90 days',
            'active',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END LOOP;
    
    -- 週報データ大量生成
    FOR user_id IN (SELECT id FROM users WHERE cognito_user_id LIKE 'perf-user-%') LOOP
        FOR i IN 1..20 LOOP
            INSERT INTO weekly_reports (id, user_id, start_date, end_date, status, weekly_remarks, total_work_hours, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                user_id,
                CURRENT_DATE - INTERVAL (i * 7) || ' days',
                CURRENT_DATE - INTERVAL (i * 7 - 6) || ' days',
                CASE WHEN i % 3 = 0 THEN 'approved' ELSE 'submitted' END,
                'パフォーマンステスト週報 ' || i,
                35.0 + (random() * 10),
                CURRENT_TIMESTAMP - INTERVAL (i * 7) || ' days',
                CURRENT_TIMESTAMP
            );
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'パフォーマンステスト用データ生成完了';
END
$$;
EOF
    
    # パフォーマンステストデータ投入
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${PROJECT_ROOT}/test-data/performance_data.sql"
    
    log_success "パフォーマンステスト用データ生成完了"
}

# メイン処理
main() {
    log_info "=== Monstera PostgreSQL テストデータ投入開始 ==="
    
    # 引数解析
    local action="${1:-insert}"
    
    case "${action}" in
        "insert")
            test_connection || exit 1
            run_migrations || exit 1
            insert_test_data || exit 1
            verify_test_data
            ;;
        "cleanup")
            test_connection || exit 1
            cleanup_test_data
            ;;
        "performance")
            test_connection || exit 1
            generate_performance_test_data
            ;;
        "verify")
            test_connection || exit 1
            verify_test_data
            ;;
        "help"|"--help"|"-h")
            echo "使用方法: $0 [action]"
            echo ""
            echo "Actions:"
            echo "  insert      テストデータ投入（デフォルト）"
            echo "  cleanup     テストデータクリーンアップ"
            echo "  performance パフォーマンステスト用データ生成"
            echo "  verify      データ検証"
            echo "  help        ヘルプ表示"
            exit 0
            ;;
        *)
            log_error "不正なアクション: ${action}"
            log_info "使用方法: $0 [insert|cleanup|performance|verify|help]"
            exit 1
            ;;
    esac
    
    log_success "=== 処理完了 ==="
}

# スクリプト実行
main "$@"