#!/bin/bash

# PostgreSQL環境変数検証スクリプト

set -e

# カラー出力用
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "================================================"
echo "PostgreSQL環境変数検証"
echo "================================================"

# 検証する環境変数ファイル
ENV_FILES=(
    ".env"
    ".env.postgres.example"
    "backend/.env"
    "backend/.env.postgres"
    "backend/.env.docker.postgres"
)

# 必須のPostgreSQL環境変数
REQUIRED_VARS=(
    "DB_DRIVER"
    "DB_HOST"
    "DB_PORT"
    "DB_USER"
    "DB_PASSWORD"
    "DB_NAME"
)

# PostgreSQL固有の環境変数
POSTGRES_SPECIFIC_VARS=(
    "DB_SSL_MODE"
    "DB_TIMEZONE"
    "DB_MAX_IDLE_CONNS"
    "DB_MAX_OPEN_CONNS"
    "DB_CONN_MAX_LIFETIME"
    "DB_CONN_MAX_IDLE_TIME"
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
)

# 環境変数ファイルのチェック
check_env_file() {
    local file=$1
    local full_path="$PROJECT_ROOT/$file"
    
    echo -e "\n${YELLOW}チェック中: $file${NC}"
    
    if [ ! -f "$full_path" ]; then
        echo -e "${RED}  ✗ ファイルが存在しません${NC}"
        return 1
    fi
    
    echo -e "${GREEN}  ✓ ファイルが存在します${NC}"
    
    # 必須変数のチェック
    echo "  必須変数:"
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" "$full_path"; then
            value=$(grep "^${var}=" "$full_path" | cut -d'=' -f2)
            echo -e "    ${GREEN}✓${NC} $var = $value"
        else
            echo -e "    ${RED}✗${NC} $var が定義されていません"
        fi
    done
    
    # DB_DRIVERがpostgresかチェック
    if grep -q "^DB_DRIVER=postgres" "$full_path"; then
        echo -e "  ${GREEN}✓ DB_DRIVER が postgres に設定されています${NC}"
    elif grep -q "^DB_DRIVER=" "$full_path"; then
        driver=$(grep "^DB_DRIVER=" "$full_path" | cut -d'=' -f2)
        echo -e "  ${YELLOW}⚠ DB_DRIVER が $driver に設定されています（postgres推奨）${NC}"
    fi
    
    # PostgreSQL固有の変数をチェック
    echo "  PostgreSQL固有変数:"
    postgres_count=0
    for var in "${POSTGRES_SPECIFIC_VARS[@]}"; do
        if grep -q "^${var}=" "$full_path"; then
            ((postgres_count++))
        fi
    done
    echo -e "    ${postgres_count}/${#POSTGRES_SPECIFIC_VARS[@]} 個の変数が定義されています"
}

# Docker Compose環境変数のチェック
check_docker_compose() {
    echo -e "\n${YELLOW}Docker Compose設定のチェック${NC}"
    
    local compose_file="$PROJECT_ROOT/docker-compose.yml"
    local postgres_compose="$PROJECT_ROOT/docker-compose.postgres.yml"
    
    if [ -f "$compose_file" ]; then
        echo -e "${GREEN}  ✓ docker-compose.yml が存在します${NC}"
        
        # PostgreSQLサービスの確認
        if grep -q "postgres:" "$compose_file"; then
            echo -e "${GREEN}  ✓ PostgreSQLサービスが定義されています${NC}"
        else
            echo -e "${RED}  ✗ PostgreSQLサービスが見つかりません${NC}"
        fi
        
        # pgAdminサービスの確認
        if grep -q "pgadmin:" "$compose_file"; then
            echo -e "${GREEN}  ✓ pgAdminサービスが定義されています${NC}"
        else
            echo -e "${YELLOW}  ⚠ pgAdminサービスが見つかりません${NC}"
        fi
    fi
    
    if [ -f "$postgres_compose" ]; then
        echo -e "${GREEN}  ✓ docker-compose.postgres.yml が存在します${NC}"
    else
        echo -e "${YELLOW}  ⚠ docker-compose.postgres.yml が見つかりません${NC}"
    fi
}

# 環境変数の比較
compare_env_files() {
    echo -e "\n${YELLOW}環境変数ファイルの比較${NC}"
    
    if [ -f "$PROJECT_ROOT/backend/.env" ] && [ -f "$PROJECT_ROOT/backend/.env.postgres" ]; then
        echo "backend/.env と backend/.env.postgres の差分:"
        
        # DB_DRIVER の比較
        env_driver=$(grep "^DB_DRIVER=" "$PROJECT_ROOT/backend/.env" 2>/dev/null | cut -d'=' -f2 || echo "未定義")
        postgres_driver=$(grep "^DB_DRIVER=" "$PROJECT_ROOT/backend/.env.postgres" 2>/dev/null | cut -d'=' -f2 || echo "未定義")
        
        if [ "$env_driver" != "$postgres_driver" ]; then
            echo -e "  ${YELLOW}DB_DRIVER: .env=$env_driver, .env.postgres=$postgres_driver${NC}"
        fi
        
        # DB_PORT の比較
        env_port=$(grep "^DB_PORT=" "$PROJECT_ROOT/backend/.env" 2>/dev/null | cut -d'=' -f2 || echo "未定義")
        postgres_port=$(grep "^DB_PORT=" "$PROJECT_ROOT/backend/.env.postgres" 2>/dev/null | cut -d'=' -f2 || echo "未定義")
        
        if [ "$env_port" != "$postgres_port" ]; then
            echo -e "  ${YELLOW}DB_PORT: .env=$env_port, .env.postgres=$postgres_port${NC}"
        fi
    fi
}

# 推奨事項の表示
show_recommendations() {
    echo -e "\n${YELLOW}推奨事項:${NC}"
    echo "1. 開発環境では backend/.env.postgres を backend/.env にコピーして使用"
    echo "   cp backend/.env.postgres backend/.env"
    echo ""
    echo "2. Docker環境では backend/.env.docker.postgres を使用"
    echo "   cp backend/.env.docker.postgres backend/.env"
    echo ""
    echo "3. PostgreSQL環境の起動:"
    echo "   ./scripts/postgres-dev.sh start"
    echo ""
    echo "4. 環境変数の優先順位:"
    echo "   - 環境変数 > .env ファイル > デフォルト値"
}

# メイン処理
echo "環境変数ファイルのチェックを開始します..."

# 各環境変数ファイルをチェック
for file in "${ENV_FILES[@]}"; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
        check_env_file "$file"
    fi
done

# Docker Compose設定のチェック
check_docker_compose

# 環境変数ファイルの比較
compare_env_files

# 推奨事項の表示
show_recommendations

echo -e "\n${GREEN}検証完了！${NC}"