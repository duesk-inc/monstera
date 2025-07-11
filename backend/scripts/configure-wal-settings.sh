#!/bin/bash

# PostgreSQL WAL設定の構成スクリプト
# 環境に応じたWAL設定を適用

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PostgreSQL接続情報
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera}"
DB_USER="${DB_USER:-postgres}"

# 環境変数からパスワードを取得
export PGPASSWORD="${DB_PASSWORD:-password}"

# 環境プロファイル
PROFILE="${1:-development}"  # development, production-small, production-large

echo "================================================"
echo "PostgreSQL WAL Configuration Script"
echo "================================================"
echo "Profile: $PROFILE"
echo ""

# WAL設定を適用する関数
apply_wal_settings() {
    local profile=$1
    
    echo -e "${BLUE}Applying WAL settings for $profile environment${NC}"
    echo ""
    
    case "$profile" in
        "development")
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- 開発環境向けWAL設定
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET wal_writer_delay = '200ms';
ALTER SYSTEM SET wal_writer_flush_after = '1MB';

-- チェックポイント設定
ALTER SYSTEM SET checkpoint_timeout = '15min';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET min_wal_size = '512MB';

-- パフォーマンス設定
ALTER SYSTEM SET synchronous_commit = 'on';
ALTER SYSTEM SET wal_compression = 'off';
ALTER SYSTEM SET full_page_writes = 'on';

-- アーカイブ無効（開発環境）
ALTER SYSTEM SET archive_mode = 'off';
EOF
            ;;
            
        "production-small")
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- 本番環境（小規模）向けWAL設定
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET wal_buffers = '32MB';
ALTER SYSTEM SET wal_writer_delay = '200ms';
ALTER SYSTEM SET wal_writer_flush_after = '1MB';

-- チェックポイント設定
ALTER SYSTEM SET checkpoint_timeout = '15min';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET max_wal_size = '4GB';
ALTER SYSTEM SET min_wal_size = '1GB';

-- 信頼性設定
ALTER SYSTEM SET synchronous_commit = 'on';
ALTER SYSTEM SET wal_compression = 'on';
ALTER SYSTEM SET full_page_writes = 'on';
ALTER SYSTEM SET wal_sync_method = 'fdatasync';

-- アーカイブ設定
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f';
ALTER SYSTEM SET archive_timeout = '300';
EOF
            ;;
            
        "production-large")
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- 本番環境（大規模）向けWAL設定
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET wal_buffers = '64MB';
ALTER SYSTEM SET wal_writer_delay = '200ms';
ALTER SYSTEM SET wal_writer_flush_after = '1MB';

-- チェックポイント設定
ALTER SYSTEM SET checkpoint_timeout = '30min';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET max_wal_size = '8GB';
ALTER SYSTEM SET min_wal_size = '2GB';

-- 信頼性・レプリケーション設定
ALTER SYSTEM SET synchronous_commit = 'remote_write';
ALTER SYSTEM SET wal_compression = 'on';
ALTER SYSTEM SET full_page_writes = 'on';
ALTER SYSTEM SET wal_sync_method = 'fdatasync';

-- アーカイブ設定
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = '/usr/local/bin/archive_wal.sh %p %f';
ALTER SYSTEM SET archive_timeout = '60';

-- レプリケーション設定
ALTER SYSTEM SET max_wal_senders = 5;
ALTER SYSTEM SET wal_keep_size = '4GB';
ALTER SYSTEM SET max_replication_slots = 5;
EOF
            ;;
            
        *)
            echo -e "${RED}Unknown profile: $profile${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ WAL settings applied${NC}"
    echo ""
}

# 現在の設定を表示
show_current_settings() {
    echo -e "${BLUE}Current WAL Settings${NC}"
    echo "===================="
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    name,
    setting,
    unit
FROM pg_settings
WHERE name IN (
    'wal_level',
    'wal_buffers',
    'max_wal_size',
    'min_wal_size',
    'checkpoint_timeout',
    'checkpoint_completion_target',
    'synchronous_commit',
    'wal_compression',
    'archive_mode',
    'archive_command',
    'max_wal_senders',
    'wal_keep_size'
)
ORDER BY name;
EOF
    echo ""
}

# WAL統計を表示
show_wal_stats() {
    echo -e "${BLUE}WAL Statistics${NC}"
    echo "=============="
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    'Current WAL LSN' as metric,
    pg_current_wal_lsn()::text as value
UNION ALL
SELECT 
    'WAL File',
    pg_walfile_name(pg_current_wal_lsn())
UNION ALL
SELECT 
    'Total WAL Generated',
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0'::pg_lsn))
UNION ALL
SELECT 
    'Checkpoints (Timed)',
    checkpoints_timed::text
FROM pg_stat_bgwriter
UNION ALL
SELECT 
    'Checkpoints (Requested)',
    checkpoints_req::text
FROM pg_stat_bgwriter;
EOF
    echo ""
}

# アーカイブディレクトリの作成
create_archive_directory() {
    echo -e "${BLUE}Creating archive directory${NC}"
    
    if [ "$PROFILE" != "development" ]; then
        # Dockerコンテナ内で実行する場合
        if [ -n "$DOCKER_CONTAINER" ]; then
            docker exec "$DOCKER_CONTAINER" mkdir -p /var/lib/postgresql/archive
            docker exec "$DOCKER_CONTAINER" chown postgres:postgres /var/lib/postgresql/archive
        else
            # ローカル実行の場合
            sudo mkdir -p /var/lib/postgresql/archive
            sudo chown postgres:postgres /var/lib/postgresql/archive
        fi
        echo -e "${GREEN}✓ Archive directory created${NC}"
    else
        echo "Archive directory not needed for development environment"
    fi
    echo ""
}

# メイン処理
echo -e "${BLUE}1. Current Settings${NC}"
echo "==================="
show_current_settings

echo -e "${BLUE}2. Applying New Settings${NC}"
echo "========================"
apply_wal_settings "$PROFILE"

echo -e "${BLUE}3. Reloading Configuration${NC}"
echo "=========================="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT pg_reload_conf();"
echo -e "${GREEN}✓ Configuration reloaded${NC}"
echo ""

# アーカイブディレクトリの作成（本番環境のみ）
if [ "$PROFILE" != "development" ]; then
    create_archive_directory
fi

echo -e "${BLUE}4. Verification${NC}"
echo "==============="
show_current_settings

echo -e "${BLUE}5. WAL Statistics${NC}"
echo "================="
show_wal_stats

# 警告とアドバイス
echo -e "${YELLOW}Important Notes:${NC}"
echo "================"

case "$PROFILE" in
    "development")
        echo "• Archive mode is disabled for development"
        echo "• Consider enabling for backup testing"
        ;;
    "production-small")
        echo "• Archive mode enabled - ensure archive directory exists"
        echo "• Monitor archive directory disk space"
        echo "• Consider setting up archive cleanup cron job"
        ;;
    "production-large")
        echo "• Logical replication enabled - higher WAL generation"
        echo "• Ensure sufficient disk space for WAL and archives"
        echo "• Monitor replication lag regularly"
        echo "• Implement archive_wal.sh script for S3/cloud storage"
        ;;
esac

echo ""
echo "================================================"
echo -e "${GREEN}WAL Configuration Complete${NC}"
echo "================================================"