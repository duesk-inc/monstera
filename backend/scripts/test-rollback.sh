#!/bin/bash
# マイグレーションロールバックテストスクリプト
# 作成日: 2025-07-03
# 目的: マイグレーションのロールバック動作確認

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 環境変数の確認
check_env() {
    log_info "環境変数を確認中..."
    
    # Docker環境の場合はmysqlコンテナを参照
    if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
        if [ -z "$DB_HOST" ]; then
            export DB_HOST="mysql"
            log_debug "DB_HOST をDocker環境用に mysql に設定しました"
        fi
    else
        if [ -z "$DB_HOST" ]; then
            export DB_HOST="localhost"
            log_warn "DB_HOST が未設定のため、localhost を使用します"
        fi
    fi
    
    if [ -z "$DB_PORT" ]; then
        export DB_PORT="3306"
        log_warn "DB_PORT が未設定のため、3306 を使用します"
    fi
    
    if [ -z "$DB_USER" ]; then
        export DB_USER="monstera"
        log_warn "DB_USER が未設定のため、monstera を使用します"
    fi
    
    if [ -z "$DB_PASSWORD" ]; then
        export DB_PASSWORD="password"
        log_warn "DB_PASSWORD が未設定のため、password を使用します"
    fi
    
    if [ -z "$DB_NAME" ]; then
        export DB_NAME="monstera"
        log_warn "DB_NAME が未設定のため、monstera を使用します"
    fi
    
    log_debug "環境変数設定: HOST=$DB_HOST, PORT=$DB_PORT, USER=$DB_USER, DB=$DB_NAME"
}

# MySQLの接続確認
check_mysql_connection() {
    log_info "MySQL接続を確認中..."
    
    # Docker環境の判定
    if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
        # Docker内からmysqlコンテナへの接続
        if mysqladmin ping -h ${DB_HOST} -u ${DB_USER} -p${DB_PASSWORD} &>/dev/null; then
            log_info "MySQL接続: OK"
            return 0
        else
            log_error "MySQL接続に失敗しました"
            return 1
        fi
    else
        # ローカル環境からDockerコンテナへの接続
        if docker-compose exec -T mysql mysqladmin ping -h localhost -u ${DB_USER} -p${DB_PASSWORD} &>/dev/null; then
            log_info "MySQL接続: OK"
            return 0
        else
            log_error "MySQL接続に失敗しました"
            return 1
        fi
    fi
}

# 現在のマイグレーション状態を確認
get_current_version() {
    local version
    
    # Docker環境の判定
    if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
        # Docker内からmysqlコンテナへの接続
        version=$(mysql -h ${DB_HOST} -u${DB_USER} -p${DB_PASSWORD} -N -e "
            USE ${DB_NAME};
            SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;
        " 2>/dev/null || echo "0")
    else
        # ローカル環境からDockerコンテナへの接続
        version=$(docker-compose exec -T mysql mysql -u${DB_USER} -p${DB_PASSWORD} -N -e "
            USE ${DB_NAME};
            SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;
        " 2>/dev/null || echo "0")
    fi
    
    # 改行を除去
    echo "$version" | tr -d '\r\n'
}

# マイグレーション状態の詳細表示
show_migration_status() {
    log_info "現在のマイグレーション状態:"
    
    # Docker環境の判定
    if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
        # Docker内からmysqlコンテナへの接続
        mysql -h ${DB_HOST} -u${DB_USER} -p${DB_PASSWORD} -e "
            USE ${DB_NAME};
            SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 5;
        " 2>/dev/null || {
            log_warn "schema_migrations テーブルが存在しません"
            return 0
        }
    else
        # ローカル環境からDockerコンテナへの接続
        docker-compose exec -T mysql mysql -u${DB_USER} -p${DB_PASSWORD} -e "
            USE ${DB_NAME};
            SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 5;
        " 2>/dev/null || {
            log_warn "schema_migrations テーブルが存在しません"
            return 0
        }
    fi
}

# テーブル一覧の取得
get_table_list() {
    log_debug "現在のテーブル一覧:"
    
    # Docker環境の判定
    if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
        # Docker内からmysqlコンテナへの接続
        mysql -h ${DB_HOST} -u${DB_USER} -p${DB_PASSWORD} -e "
            USE ${DB_NAME};
            SHOW TABLES;
        " 2>/dev/null
    else
        # ローカル環境からDockerコンテナへの接続
        docker-compose exec -T mysql mysql -u${DB_USER} -p${DB_PASSWORD} -e "
            USE ${DB_NAME};
            SHOW TABLES;
        " 2>/dev/null
    fi
}

# ロールバック実行（Docker環境）
run_rollback_docker() {
    local target_version="$1"
    log_info "Docker環境でマイグレーションロールバックを実行中..."
    log_info "ターゲットバージョン: $target_version"
    
    # Docker内から直接migrateコマンドを実行
    log_debug "migrate コマンドでバージョン $target_version まで戻します"
    if migrate -path ./migrations -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}?multiStatements=true" goto $target_version; then
        log_info "ロールバック実行: 完了"
    else
        log_error "ロールバック実行に失敗しました"
        return 1
    fi
}

# ロールバック実行（ローカル環境）
run_rollback_local() {
    local target_version="$1"
    log_info "ローカル環境でマイグレーションロールバックを実行中..."
    log_info "ターゲットバージョン: $target_version"
    
    if ! command -v migrate &> /dev/null; then
        log_error "migrate コマンドが見つかりません。golang-migrate をインストールしてください"
        return 1
    fi
    
    log_debug "migrate コマンドでバージョン $target_version まで戻します"
    if migrate -path ./migrations \
        -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}?multiStatements=true" \
        goto $target_version; then
        log_info "ロールバック実行: 完了"
    else
        log_error "ロールバック実行に失敗しました"
        return 1
    fi
}

# 特定バージョンまでのロールバック
rollback_to_version() {
    local target_version="$1"
    local current_version
    
    if [ -z "$target_version" ]; then
        log_error "ターゲットバージョンが指定されていません"
        return 1
    fi
    
    current_version=$(get_current_version)
    log_info "現在のバージョン: $current_version"
    log_info "ターゲットバージョン: $target_version"
    
    if [ "$current_version" -le "$target_version" ]; then
        log_warn "現在のバージョンがターゲットバージョン以下です。ロールバックは不要です。"
        return 0
    fi
    
    # 実行環境の判定
    if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
        ENV_TYPE="docker"
        log_debug "実行環境: Docker コンテナ内"
    else
        ENV_TYPE="local"
        log_debug "実行環境: ローカル"
    fi
    
    # ロールバック実行
    if [ "$ENV_TYPE" = "docker" ]; then
        run_rollback_docker "$target_version" || return 1
    else
        run_rollback_local "$target_version" || return 1
    fi
    
    # 結果確認
    local new_version
    new_version=$(get_current_version)
    if [ "$new_version" = "$target_version" ]; then
        log_info "ロールバック成功: バージョン $new_version に変更されました"
        return 0
    else
        log_error "ロールバック失敗: 期待バージョン $target_version、実際 $new_version"
        return 1
    fi
}

# 1ステップのロールバック
rollback_one_step() {
    log_info "1ステップのロールバックを実行中..."
    
    # 実行環境の判定
    if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
        ENV_TYPE="docker"
        log_debug "実行環境: Docker コンテナ内"
    else
        ENV_TYPE="local"
        log_debug "実行環境: ローカル"
    fi
    
    # ロールバック実行
    if [ "$ENV_TYPE" = "docker" ]; then
        # Docker内から直接migrateコマンドを実行
        log_debug "migrate コマンドを実行中..."
        if migrate -path ./migrations -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}?multiStatements=true" down 1; then
            log_info "1ステップロールバック: 成功"
        else
            log_error "1ステップロールバック実行に失敗しました"
            return 1
        fi
    else
        if ! command -v migrate &> /dev/null; then
            log_error "migrate コマンドが見つかりません。golang-migrate をインストールしてください"
            return 1
        fi
        
        log_debug "migrate コマンドを実行中..."
        if migrate -path ./migrations \
            -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}?multiStatements=true" \
            down 1; then
            log_info "1ステップロールバック: 成功"
        else
            log_error "1ステップロールバック実行に失敗しました"
            return 1
        fi
    fi
}

# ロールバック可能なマイグレーション一覧表示
show_rollback_candidates() {
    log_info "ロールバック可能なマイグレーション一覧:"
    
    local current_version
    current_version=$(get_current_version)
    
    if [ "$current_version" = "0" ]; then
        log_warn "適用されているマイグレーションがありません"
        return 0
    fi
    
    # 現在のバージョン以下のマイグレーションファイルを表示
    echo "現在のバージョン: $current_version"
    echo "ロールバック可能なマイグレーション:"
    
    find migrations -name "*.down.sql" | grep -E "^migrations/[0-9]{6}_" | \
        sed 's/migrations\///;s/\.down\.sql//' | \
        awk -F'_' '{if ($1 <= "'$current_version'") print $1 " - " substr($0, length($1)+2)}' | \
        sort -nr | head -10
}

# ヘルプ表示
show_help() {
    cat << EOF
使用方法: $0 [オプション] [ターゲットバージョン]

マイグレーションのロールバック動作確認を行うテストスクリプト

オプション:
    -h, --help      このヘルプを表示
    -s, --status    現在のマイグレーション状態を表示
    -l, --list      ロールバック可能なマイグレーション一覧を表示
    -1, --one-step  1ステップだけロールバック
    -t, --tables    現在のテーブル一覧を表示

引数:
    ターゲットバージョン  ロールバック先のマイグレーションバージョン番号

環境変数:
    DB_HOST         データベースホスト (デフォルト: localhost)
    DB_PORT         データベースポート (デフォルト: 3306)
    DB_USER         データベースユーザー (デフォルト: monstera)
    DB_PASSWORD     データベースパスワード (デフォルト: password)
    DB_NAME         データベース名 (デフォルト: monstera)

使用例:
    $0 --status             # 現在の状態確認
    $0 --list               # ロールバック可能なマイグレーション一覧
    $0 --one-step           # 1ステップロールバック
    $0 200003               # バージョン200003までロールバック
    $0 --tables             # テーブル一覧表示
EOF
}

# メイン処理
main() {
    # 引数の解析
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--status)
            check_env
            show_migration_status
            exit 0
            ;;
        -l|--list)
            check_env
            show_rollback_candidates
            exit 0
            ;;
        -1|--one-step)
            log_info "1ステップロールバックテストを開始します"
            check_env
            check_mysql_connection || exit 1
            
            log_info "ロールバック前の状態:"
            show_migration_status
            get_table_list
            
            rollback_one_step || exit 1
            
            log_info "ロールバック後の状態:"
            show_migration_status
            get_table_list
            
            log_info "1ステップロールバックテスト: 完了 ✅"
            exit 0
            ;;
        -t|--tables)
            check_env
            get_table_list
            exit 0
            ;;
        "")
            show_help
            exit 0
            ;;
        *)
            # 数値かどうかチェック
            if [[ "$1" =~ ^[0-9]+$ ]]; then
                TARGET_VERSION="$1"
                log_info "バージョン指定ロールバックテストを開始します"
                log_info "ターゲットバージョン: $TARGET_VERSION"
                
                check_env
                check_mysql_connection || exit 1
                
                log_info "ロールバック前の状態:"
                show_migration_status
                get_table_list
                
                rollback_to_version "$TARGET_VERSION" || exit 1
                
                log_info "ロールバック後の状態:"
                show_migration_status
                get_table_list
                
                log_info "バージョン指定ロールバックテスト: 完了 ✅"
                exit 0
            else
                log_error "無効な引数: $1"
                show_help
                exit 1
            fi
            ;;
    esac
}

# スクリプト実行
main "$@"