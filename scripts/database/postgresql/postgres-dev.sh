#!/bin/bash

# PostgreSQL開発環境管理スクリプト

set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# カラー出力用
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ヘルプメッセージ
show_help() {
    echo "PostgreSQL開発環境管理スクリプト"
    echo ""
    echo "使用方法: $0 [コマンド]"
    echo ""
    echo "コマンド:"
    echo "  start       PostgreSQL環境を起動"
    echo "  stop        PostgreSQL環境を停止"
    echo "  restart     PostgreSQL環境を再起動"
    echo "  status      コンテナの状態を確認"
    echo "  logs        PostgreSQLのログを表示"
    echo "  psql        PostgreSQLクライアントに接続"
    echo "  pgadmin     pgAdminのURLを表示"
    echo "  clean       PostgreSQLデータを削除（注意：全データが削除されます）"
    echo "  help        このヘルプを表示"
}

# PostgreSQL環境起動
start_postgres() {
    echo -e "${GREEN}PostgreSQL開発環境を起動します...${NC}"
    cd "$PROJECT_ROOT"
    
    # .envファイルが存在しない場合は作成
    if [ ! -f .env ]; then
        echo -e "${YELLOW}.envファイルが見つかりません。.env.postgres.exampleからコピーします...${NC}"
        cp .env.postgres.example .env
    fi
    
    # PostgreSQL環境を起動
    docker-compose -f docker-compose.yml -f docker-compose.postgres.yml up -d postgres pgadmin redis
    
    echo -e "${GREEN}PostgreSQLの起動を待っています...${NC}"
    sleep 5
    
    # ヘルスチェック
    echo -e "${GREEN}ヘルスチェック中...${NC}"
    docker-compose exec postgres pg_isready -U postgres || true
    
    echo -e "${GREEN}PostgreSQL環境が起動しました！${NC}"
    echo ""
    echo "PostgreSQL: localhost:5432"
    echo "pgAdmin: http://localhost:5050"
    echo "  Email: admin@duesk.co.jp"
    echo "  Password: admin"
}

# PostgreSQL環境停止
stop_postgres() {
    echo -e "${YELLOW}PostgreSQL環境を停止します...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.yml -f docker-compose.postgres.yml down
    echo -e "${GREEN}PostgreSQL環境を停止しました${NC}"
}

# PostgreSQL環境再起動
restart_postgres() {
    stop_postgres
    sleep 2
    start_postgres
}

# コンテナ状態確認
show_status() {
    echo -e "${GREEN}コンテナの状態:${NC}"
    cd "$PROJECT_ROOT"
    docker-compose ps | grep -E "(postgres|pgadmin|redis|backend|batch)" || true
}

# PostgreSQLログ表示
show_logs() {
    echo -e "${GREEN}PostgreSQLのログを表示します（Ctrl+Cで終了）:${NC}"
    cd "$PROJECT_ROOT"
    docker-compose logs -f postgres
}

# PostgreSQLクライアント接続
connect_psql() {
    echo -e "${GREEN}PostgreSQLクライアントに接続します...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose exec postgres psql -U postgres -d monstera
}

# pgAdmin情報表示
show_pgadmin() {
    echo -e "${GREEN}pgAdmin情報:${NC}"
    echo "URL: http://localhost:5050"
    echo "Email: admin@duesk.co.jp"
    echo "Password: admin"
    echo ""
    echo "PostgreSQL接続情報:"
    echo "  Host: postgres"
    echo "  Port: 5432"
    echo "  Database: monstera"
    echo "  Username: postgres"
    echo "  Password: postgres"
}

# PostgreSQLデータクリーン
clean_postgres() {
    echo -e "${RED}警告: この操作はPostgreSQLの全データを削除します！${NC}"
    read -p "本当に続行しますか？ (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo -e "${YELLOW}PostgreSQLデータを削除します...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.yml -f docker-compose.postgres.yml down -v
        docker volume rm monstera_postgres_data monstera_pgadmin_data 2>/dev/null || true
        echo -e "${GREEN}PostgreSQLデータを削除しました${NC}"
    else
        echo "操作をキャンセルしました"
    fi
}

# メイン処理
case "$1" in
    start)
        start_postgres
        ;;
    stop)
        stop_postgres
        ;;
    restart)
        restart_postgres
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    psql)
        connect_psql
        ;;
    pgadmin)
        show_pgadmin
        ;;
    clean)
        clean_postgres
        ;;
    help|"")
        show_help
        ;;
    *)
        echo -e "${RED}不明なコマンド: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac