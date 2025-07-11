#!/bin/bash

# PostgreSQLパラメータチューニングスクリプト
# システムリソースに基づいて最適なパラメータを計算・設定

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

# チューニングプロファイル
PROFILE="${1:-auto}"  # auto, development, production-small, production-medium, production-large

echo "================================================"
echo "PostgreSQL Parameter Tuning Script"
echo "================================================"
echo ""

# システム情報を取得
echo -e "${BLUE}1. System Information${NC}"
echo "====================="

# メモリ情報（MB単位）
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    TOTAL_MEMORY_KB=$(sysctl -n hw.memsize | awk '{print $1/1024}')
    TOTAL_MEMORY_MB=$((TOTAL_MEMORY_KB / 1024))
else
    # Linux
    TOTAL_MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_MEMORY_MB=$((TOTAL_MEMORY_KB / 1024))
fi

# CPU情報
if [[ "$OSTYPE" == "darwin"* ]]; then
    CPU_COUNT=$(sysctl -n hw.ncpu)
else
    CPU_COUNT=$(nproc)
fi

# ディスク情報（SSDかHDDか推定）
DISK_TYPE="SSD"  # デフォルトはSSD
if [[ "$OSTYPE" == "linux"* ]]; then
    # Linuxでの簡易判定
    if lsblk -d -o name,rota | grep -E "0$" > /dev/null 2>&1; then
        DISK_TYPE="SSD"
    else
        DISK_TYPE="HDD"
    fi
fi

echo "Total Memory: ${TOTAL_MEMORY_MB} MB"
echo "CPU Cores: ${CPU_COUNT}"
echo "Disk Type: ${DISK_TYPE} (estimated)"
echo ""

# プロファイルに基づいてパラメータを計算
calculate_parameters() {
    local profile=$1
    
    case "$profile" in
        "development")
            SHARED_BUFFERS="256MB"
            EFFECTIVE_CACHE_SIZE="768MB"
            WORK_MEM="8MB"
            MAINTENANCE_WORK_MEM="64MB"
            MAX_CONNECTIONS="50"
            MAX_PARALLEL_WORKERS="0"
            ;;
            
        "production-small")
            SHARED_BUFFERS="1GB"
            EFFECTIVE_CACHE_SIZE="3GB"
            WORK_MEM="16MB"
            MAINTENANCE_WORK_MEM="256MB"
            MAX_CONNECTIONS="200"
            MAX_PARALLEL_WORKERS="2"
            ;;
            
        "production-medium")
            SHARED_BUFFERS="2GB"
            EFFECTIVE_CACHE_SIZE="6GB"
            WORK_MEM="32MB"
            MAINTENANCE_WORK_MEM="512MB"
            MAX_CONNECTIONS="300"
            MAX_PARALLEL_WORKERS="4"
            ;;
            
        "production-large")
            SHARED_BUFFERS="4GB"
            EFFECTIVE_CACHE_SIZE="12GB"
            WORK_MEM="64MB"
            MAINTENANCE_WORK_MEM="1GB"
            MAX_CONNECTIONS="500"
            MAX_PARALLEL_WORKERS="8"
            ;;
            
        "auto"|*)
            # 自動計算
            # shared_buffers = 25% of total memory (max 8GB)
            SHARED_BUFFERS_MB=$((TOTAL_MEMORY_MB / 4))
            if [ $SHARED_BUFFERS_MB -gt 8192 ]; then
                SHARED_BUFFERS_MB=8192
            fi
            SHARED_BUFFERS="${SHARED_BUFFERS_MB}MB"
            
            # effective_cache_size = 50-75% of total memory
            EFFECTIVE_CACHE_SIZE_MB=$((TOTAL_MEMORY_MB * 3 / 4))
            EFFECTIVE_CACHE_SIZE="${EFFECTIVE_CACHE_SIZE_MB}MB"
            
            # work_mem = RAM / (max_connections * 3)
            MAX_CONNECTIONS="200"
            WORK_MEM_MB=$((TOTAL_MEMORY_MB / (200 * 3)))
            if [ $WORK_MEM_MB -lt 4 ]; then
                WORK_MEM_MB=4
            fi
            WORK_MEM="${WORK_MEM_MB}MB"
            
            # maintenance_work_mem = RAM / 16 (max 2GB)
            MAINTENANCE_WORK_MEM_MB=$((TOTAL_MEMORY_MB / 16))
            if [ $MAINTENANCE_WORK_MEM_MB -gt 2048 ]; then
                MAINTENANCE_WORK_MEM_MB=2048
            fi
            MAINTENANCE_WORK_MEM="${MAINTENANCE_WORK_MEM_MB}MB"
            
            # max_parallel_workers based on CPU cores
            MAX_PARALLEL_WORKERS=$((CPU_COUNT / 2))
            if [ $MAX_PARALLEL_WORKERS -lt 0 ]; then
                MAX_PARALLEL_WORKERS=0
            fi
            ;;
    esac
    
    # ディスクタイプに基づく設定
    if [ "$DISK_TYPE" = "SSD" ]; then
        RANDOM_PAGE_COST="1.1"
        EFFECTIVE_IO_CONCURRENCY="200"
    else
        RANDOM_PAGE_COST="4.0"
        EFFECTIVE_IO_CONCURRENCY="2"
    fi
    
    # その他の固定パラメータ
    WAL_BUFFERS="16MB"
    CHECKPOINT_COMPLETION_TARGET="0.9"
    MAX_WAL_SIZE="2GB"
    MIN_WAL_SIZE="512MB"
}

# 現在の設定を取得
echo -e "${BLUE}2. Current PostgreSQL Settings${NC}"
echo "=============================="

get_current_setting() {
    local param=$1
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
        "SHOW $param;" 2>/dev/null || echo "N/A"
}

echo "shared_buffers: $(get_current_setting shared_buffers)"
echo "effective_cache_size: $(get_current_setting effective_cache_size)"
echo "work_mem: $(get_current_setting work_mem)"
echo "maintenance_work_mem: $(get_current_setting maintenance_work_mem)"
echo "max_connections: $(get_current_setting max_connections)"
echo ""

# パラメータを計算
echo -e "${BLUE}3. Calculating Optimal Parameters${NC}"
echo "================================="
echo "Profile: $PROFILE"
echo ""

calculate_parameters "$PROFILE"

echo "Recommended settings:"
echo "  shared_buffers: $SHARED_BUFFERS"
echo "  effective_cache_size: $EFFECTIVE_CACHE_SIZE"
echo "  work_mem: $WORK_MEM"
echo "  maintenance_work_mem: $MAINTENANCE_WORK_MEM"
echo "  max_connections: $MAX_CONNECTIONS"
echo "  max_parallel_workers: $MAX_PARALLEL_WORKERS"
echo "  random_page_cost: $RANDOM_PAGE_COST"
echo "  effective_io_concurrency: $EFFECTIVE_IO_CONCURRENCY"
echo ""

# 設定を適用するかどうか確認
if [ "$2" != "--apply" ]; then
    echo -e "${YELLOW}To apply these settings, run: $0 $PROFILE --apply${NC}"
    echo ""
    echo "Or generate configuration:"
    echo "  $0 $PROFILE --generate > postgresql-tuned.conf"
    exit 0
fi

# 設定を生成
if [ "$2" = "--generate" ]; then
    echo -e "${BLUE}4. Generating Configuration${NC}"
    echo "==========================="
    
    cat << EOF
# PostgreSQL Tuned Configuration
# Generated: $(date)
# System: ${TOTAL_MEMORY_MB}MB RAM, ${CPU_COUNT} CPUs, ${DISK_TYPE}
# Profile: ${PROFILE}

# Memory Settings
shared_buffers = ${SHARED_BUFFERS}
effective_cache_size = ${EFFECTIVE_CACHE_SIZE}
work_mem = ${WORK_MEM}
maintenance_work_mem = ${MAINTENANCE_WORK_MEM}
wal_buffers = ${WAL_BUFFERS}

# Connection Settings
max_connections = ${MAX_CONNECTIONS}

# Checkpoint Settings
checkpoint_completion_target = ${CHECKPOINT_COMPLETION_TARGET}
max_wal_size = ${MAX_WAL_SIZE}
min_wal_size = ${MIN_WAL_SIZE}

# Planner Settings
random_page_cost = ${RANDOM_PAGE_COST}
effective_io_concurrency = ${EFFECTIVE_IO_CONCURRENCY}

# Parallel Query Settings
max_parallel_workers_per_gather = 2
max_parallel_workers = ${MAX_PARALLEL_WORKERS}

# Autovacuum Settings
autovacuum = on
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
EOF
    exit 0
fi

# 設定を適用
echo -e "${BLUE}4. Applying Settings${NC}"
echo "==================="

# 再起動が必要なパラメータ
RESTART_REQUIRED_PARAMS="shared_buffers max_connections max_parallel_workers"

# 再起動が必要かチェック
NEEDS_RESTART=false
for param in $RESTART_REQUIRED_PARAMS; do
    current_value=$(get_current_setting $param)
    new_value=""
    
    case $param in
        "shared_buffers") new_value=$SHARED_BUFFERS ;;
        "max_connections") new_value=$MAX_CONNECTIONS ;;
        "max_parallel_workers") new_value=$MAX_PARALLEL_WORKERS ;;
    esac
    
    if [ "$current_value" != "$new_value" ]; then
        NEEDS_RESTART=true
        echo -e "${YELLOW}⚠️  $param requires restart (current: $current_value, new: $new_value)${NC}"
    fi
done

# ALTER SYSTEM で設定を適用
echo ""
echo "Applying settings with ALTER SYSTEM..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Memory settings
ALTER SYSTEM SET shared_buffers = '${SHARED_BUFFERS}';
ALTER SYSTEM SET effective_cache_size = '${EFFECTIVE_CACHE_SIZE}';
ALTER SYSTEM SET work_mem = '${WORK_MEM}';
ALTER SYSTEM SET maintenance_work_mem = '${MAINTENANCE_WORK_MEM}';
ALTER SYSTEM SET wal_buffers = '${WAL_BUFFERS}';

-- Connection settings
ALTER SYSTEM SET max_connections = ${MAX_CONNECTIONS};

-- Checkpoint settings
ALTER SYSTEM SET checkpoint_completion_target = ${CHECKPOINT_COMPLETION_TARGET};
ALTER SYSTEM SET max_wal_size = '${MAX_WAL_SIZE}';
ALTER SYSTEM SET min_wal_size = '${MIN_WAL_SIZE}';

-- Planner settings
ALTER SYSTEM SET random_page_cost = ${RANDOM_PAGE_COST};
ALTER SYSTEM SET effective_io_concurrency = ${EFFECTIVE_IO_CONCURRENCY};

-- Parallel settings
ALTER SYSTEM SET max_parallel_workers = ${MAX_PARALLEL_WORKERS};
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
EOF

# 設定をリロード
echo ""
echo "Reloading configuration..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT pg_reload_conf();"

if [ "$NEEDS_RESTART" = "true" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some settings require a database restart to take effect.${NC}"
    echo "Run: pg_ctl restart"
else
    echo ""
    echo -e "${GREEN}✅ All settings applied successfully!${NC}"
fi

# 適用後の確認
echo ""
echo -e "${BLUE}5. Verification${NC}"
echo "=============="

echo "New settings:"
echo "  shared_buffers: $(get_current_setting shared_buffers)"
echo "  effective_cache_size: $(get_current_setting effective_cache_size)"
echo "  work_mem: $(get_current_setting work_mem)"
echo "  maintenance_work_mem: $(get_current_setting maintenance_work_mem)"

echo ""
echo "================================================"
echo -e "${GREEN}Tuning Complete${NC}"
echo "================================================"