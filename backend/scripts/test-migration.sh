#!/bin/bash
# マイグレーション実行テストスクリプト
# 作成日: 2025-07-03
# 目的: マイグレーションの実行と200057番の追加確認

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE:-\033[0;34m}[DEBUG]${NC} $1"
}

# 環境変数の確認
check_env() {
    log_info "環境変数を確認中..."
    
    if [ -z "$DB_HOST" ]; then
        export DB_HOST="localhost"
        log_warn "DB_HOST が未設定のため、localhost を使用します"
    fi
    
    if [ -z "$DB_PORT" ]; then
        export DB_PORT="3306"
        log_warn "DB_PORT が未設定のため、3306 を使用します"
    fi
    
    if [ -z "$DB_USER" ]; then
        export DB_USER="root"
        log_warn "DB_USER が未設定のため、root を使用します"
    fi
    
    if [ -z "$DB_PASSWORD" ]; then
        export DB_PASSWORD="password"
        log_warn "DB_PASSWORD が未設定のため、password を使用します"
    fi
    
    if [ -z "$DB_NAME" ]; then
        export DB_NAME="monstera"
        log_warn "DB_NAME が未設定のため、monstera を使用します"
    fi
}

# MySQLの接続確認
check_mysql_connection() {
    log_info "MySQL接続を確認中..."
    
    if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p${DB_PASSWORD} &>/dev/null; then
        log_info "MySQL接続: OK"
        return 0
    else
        log_error "MySQL接続に失敗しました"
        return 1
    fi
}

# 現在のマイグレーション状態を確認
check_current_migration_status() {
    log_info "現在のマイグレーション状態を確認中..."
    
    docker-compose exec -T mysql mysql -u${DB_USER} -p${DB_PASSWORD} -e "
        USE ${DB_NAME};
        SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 10;
    " 2>/dev/null || {
        log_warn "schema_migrations テーブルが存在しません"
        return 0
    }
}

# 200057マイグレーションの存在確認
check_200057_migration() {
    log_info "200057 マイグレーションファイルの存在を確認中..."
    
    if ls migrations/200057_add_recommended_leave_periods.*.sql >/dev/null 2>&1; then
        log_info "200057 マイグレーションファイル: 存在確認OK"
        ls -la migrations/200057_add_recommended_leave_periods.*.sql
        return 0
    else
        log_error "200057 マイグレーションファイルが見つかりません"
        return 1
    fi
}

# マイグレーション実行（Docker環境）
run_migration_docker() {
    log_info "Docker環境でマイグレーションを実行中..."
    
    # Docker内から直接migrateコマンドを実行
    log_debug "migrate コマンドを実行中..."
    if migrate -path ./migrations -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}?multiStatements=true" up; then
        log_info "マイグレーション実行: 完了"
    else
        log_error "マイグレーション実行に失敗しました"
        return 1
    fi
}

# マイグレーション実行（ローカル環境）
run_migration_local() {
    log_info "ローカル環境でマイグレーションを実行中..."
    
    if ! command -v migrate &> /dev/null; then
        log_error "migrate コマンドが見つかりません。golang-migrate をインストールしてください"
        return 1
    fi
    
    migrate -path ./migrations \
        -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}?multiStatements=true" \
        up || {
        log_error "マイグレーション実行に失敗しました"
        return 1
    }
    
    log_info "マイグレーション実行: 完了"
}

# 200057マイグレーションの適用確認
verify_200057_applied() {
    log_info "200057 マイグレーションの適用を確認中..."
    
    # schema_migrationsテーブルで確認
    RESULT=$(docker-compose exec -T mysql mysql -u${DB_USER} -p${DB_PASSWORD} -N -e "
        USE ${DB_NAME};
        SELECT COUNT(*) FROM schema_migrations WHERE version = 200057;
    " 2>/dev/null)
    
    if [ "$RESULT" = "1" ]; then
        log_info "200057 マイグレーション: 適用済み確認OK"
    else
        log_error "200057 マイグレーションが適用されていません"
        return 1
    fi
    
    # テーブルの存在確認
    docker-compose exec -T mysql mysql -u${DB_USER} -p${DB_PASSWORD} -e "
        USE ${DB_NAME};
        SHOW TABLES LIKE 'recommended_leave_periods';
        SHOW TABLES LIKE 'leave_period_usages';
    " || {
        log_error "テーブルが作成されていません"
        return 1
    }
    
    log_info "テーブル作成: 確認OK"
}

# テーブル構造の確認
check_table_structure() {
    log_info "テーブル構造を確認中..."
    
    echo "--- recommended_leave_periods テーブル ---"
    docker-compose exec -T mysql mysql -u${DB_USER} -p${DB_PASSWORD} -e "
        USE ${DB_NAME};
        DESCRIBE recommended_leave_periods;
    "
    
    echo -e "\n--- leave_period_usages テーブル ---"
    docker-compose exec -T mysql mysql -u${DB_USER} -p${DB_PASSWORD} -e "
        USE ${DB_NAME};
        DESCRIBE leave_period_usages;
    "
}

# ヘルプ表示
show_help() {
    cat << EOF
使用方法: $0 [オプション]

マイグレーションの実行と検証を行うテストスクリプト

オプション:
    -h, --help      このヘルプを表示
    -v, --verbose   詳細モード（テーブル構造も表示）

環境変数:
    DB_HOST         データベースホスト (デフォルト: localhost)
    DB_PORT         データベースポート (デフォルト: 3306)
    DB_USER         データベースユーザー (デフォルト: root)
    DB_PASSWORD     データベースパスワード (デフォルト: password)
    DB_NAME         データベース名 (デフォルト: monstera)

使用例:
    $0              # 基本的な実行
    $0 --verbose    # 詳細モード
EOF
}

# メイン処理
main() {
    # ヘルプオプションの確認
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    log_info "マイグレーションテストを開始します"
    
    # 実行環境の判定
    if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
        ENV_TYPE="docker"
        log_info "実行環境: Docker コンテナ内"
    else
        ENV_TYPE="local"
        log_info "実行環境: ローカル"
    fi
    
    # 環境変数チェック
    check_env
    
    # MySQL接続確認
    if [ "$ENV_TYPE" = "local" ]; then
        check_mysql_connection || exit 1
    fi
    
    # 現在の状態確認
    check_current_migration_status
    
    # 200057の存在確認
    check_200057_migration || exit 1
    
    # マイグレーション実行
    if [ "$ENV_TYPE" = "docker" ]; then
        run_migration_docker || exit 1
    else
        run_migration_local || exit 1
    fi
    
    # 適用確認
    verify_200057_applied || exit 1
    
    # テーブル構造確認（オプション）
    if [ "$1" = "--verbose" ] || [ "$1" = "-v" ]; then
        check_table_structure
    fi
    
    # 最終状態確認
    log_info "最終的なマイグレーション状態:"
    check_current_migration_status
    
    log_info "マイグレーションテスト: すべて正常に完了しました ✅"
}

# スクリプト実行
main "$@"