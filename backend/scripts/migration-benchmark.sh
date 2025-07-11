#!/bin/bash

# migration-benchmark.sh
# 移行性能ベンチマークテスト

set -euo pipefail

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# 設定
TARGET_DB_HOST="${POSTGRES_HOST:-localhost}"
TARGET_DB_PORT="${POSTGRES_PORT:-5432}"
TARGET_DB_NAME="${POSTGRES_DATABASE:-monstera}"
TARGET_DB_USER="${POSTGRES_USER:-postgres}"
TARGET_DB_PASS="${POSTGRES_PASSWORD}"

echo "================================================"
echo -e "${BLUE}PostgreSQL移行性能ベンチマーク${NC}"
echo "================================================"
echo "対象: ${TARGET_DB_HOST}:${TARGET_DB_PORT}/${TARGET_DB_NAME}"
echo ""

# ログディレクトリ作成
LOG_DIR="./migration-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BENCHMARK_LOG="$LOG_DIR/benchmark_${TIMESTAMP}.log"

echo "ベンチマークログ: $BENCHMARK_LOG"
echo ""

# 接続確認
echo "接続確認中..." | tee -a "$BENCHMARK_LOG"
if ! PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
   -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL接続失敗${NC}" | tee -a "$BENCHMARK_LOG"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL接続成功${NC}" | tee -a "$BENCHMARK_LOG"
echo ""

# 1. データベース基本性能テスト
echo -e "${BLUE}1. データベース基本性能テスト${NC}" | tee -a "$BENCHMARK_LOG"
echo "==============================" | tee -a "$BENCHMARK_LOG"

# CPU集約的クエリ
echo "CPU集約的クエリテスト..." | tee -a "$BENCHMARK_LOG"
CPU_START=$(date +%s.%N)
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "SELECT COUNT(*) FROM generate_series(1, 1000000);" >/dev/null 2>&1
CPU_END=$(date +%s.%N)
CPU_TIME=$(echo "$CPU_END - $CPU_START" | bc -l)
echo "  CPU集約処理時間: ${CPU_TIME}秒" | tee -a "$BENCHMARK_LOG"

# メモリ集約的クエリ
echo "メモリ集約的クエリテスト..." | tee -a "$BENCHMARK_LOG"
MEM_START=$(date +%s.%N)
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "WITH RECURSIVE series AS (
        SELECT 1 as n
        UNION ALL
        SELECT n + 1 FROM series WHERE n < 100000
    ) SELECT COUNT(*) FROM series;" >/dev/null 2>&1
MEM_END=$(date +%s.%N)
MEM_TIME=$(echo "$MEM_END - $MEM_START" | bc -l)
echo "  メモリ集約処理時間: ${MEM_TIME}秒" | tee -a "$BENCHMARK_LOG"

echo ""

# 2. インデックス性能テスト
echo -e "${BLUE}2. インデックス性能テスト${NC}" | tee -a "$BENCHMARK_LOG"
echo "========================" | tee -a "$BENCHMARK_LOG"

# テスト用テーブル作成
echo "テスト用テーブル作成中..." | tee -a "$BENCHMARK_LOG"
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" << 'EOF' >/dev/null 2>&1
DROP TABLE IF EXISTS benchmark_test;
CREATE TABLE benchmark_test (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    random_number INTEGER
);

-- データ挿入
INSERT INTO benchmark_test (name, email, random_number)
SELECT 
    'User ' || generate_series,
    'user' || generate_series || '@duesk.co.jp',
    (RANDOM() * 1000000)::INTEGER
FROM generate_series(1, 100000);
EOF

echo "テストデータ100,000件作成完了" | tee -a "$BENCHMARK_LOG"

# インデックスなしクエリ
echo "インデックスなし検索テスト..." | tee -a "$BENCHMARK_LOG"
NO_INDEX_START=$(date +%s.%N)
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "SELECT COUNT(*) FROM benchmark_test WHERE random_number > 500000;" >/dev/null 2>&1
NO_INDEX_END=$(date +%s.%N)
NO_INDEX_TIME=$(echo "$NO_INDEX_END - $NO_INDEX_START" | bc -l)
echo "  インデックスなし: ${NO_INDEX_TIME}秒" | tee -a "$BENCHMARK_LOG"

# インデックス作成
echo "インデックス作成中..." | tee -a "$BENCHMARK_LOG"
INDEX_CREATE_START=$(date +%s.%N)
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "CREATE INDEX idx_benchmark_random ON benchmark_test(random_number);" >/dev/null 2>&1
INDEX_CREATE_END=$(date +%s.%N)
INDEX_CREATE_TIME=$(echo "$INDEX_CREATE_END - $INDEX_CREATE_START" | bc -l)
echo "  インデックス作成時間: ${INDEX_CREATE_TIME}秒" | tee -a "$BENCHMARK_LOG"

# インデックスありクエリ
echo "インデックスあり検索テスト..." | tee -a "$BENCHMARK_LOG"
WITH_INDEX_START=$(date +%s.%N)
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "SELECT COUNT(*) FROM benchmark_test WHERE random_number > 500000;" >/dev/null 2>&1
WITH_INDEX_END=$(date +%s.%N)
WITH_INDEX_TIME=$(echo "$WITH_INDEX_END - $WITH_INDEX_START" | bc -l)
echo "  インデックスあり: ${WITH_INDEX_TIME}秒" | tee -a "$BENCHMARK_LOG"

SPEEDUP=$(echo "scale=2; $NO_INDEX_TIME / $WITH_INDEX_TIME" | bc -l)
echo "  高速化倍率: ${SPEEDUP}倍" | tee -a "$BENCHMARK_LOG"

echo ""

# 3. バッチインサート性能テスト
echo -e "${BLUE}3. バッチインサート性能テスト${NC}" | tee -a "$BENCHMARK_LOG"
echo "============================" | tee -a "$BENCHMARK_LOG"

# テストテーブル初期化
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "DROP TABLE IF EXISTS batch_insert_test;" >/dev/null 2>&1

PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "CREATE TABLE batch_insert_test (id SERIAL PRIMARY KEY, data TEXT);" >/dev/null 2>&1

# 単一インサートテスト
echo "単一インサートテスト (1,000件)..." | tee -a "$BENCHMARK_LOG"
SINGLE_INSERT_START=$(date +%s.%N)
for i in {1..1000}; do
    PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
        -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
        "INSERT INTO batch_insert_test (data) VALUES ('test data $i');" >/dev/null 2>&1
done
SINGLE_INSERT_END=$(date +%s.%N)
SINGLE_INSERT_TIME=$(echo "$SINGLE_INSERT_END - $SINGLE_INSERT_START" | bc -l)
echo "  単一インサート: ${SINGLE_INSERT_TIME}秒" | tee -a "$BENCHMARK_LOG"

# テーブルクリア
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "TRUNCATE batch_insert_test;" >/dev/null 2>&1

# バッチインサートテスト
echo "バッチインサートテスト (1,000件)..." | tee -a "$BENCHMARK_LOG"
BATCH_INSERT_START=$(date +%s.%N)

# バッチINSERT文生成
BATCH_SQL="INSERT INTO batch_insert_test (data) VALUES "
for i in {1..1000}; do
    if [ $i -eq 1 ]; then
        BATCH_SQL="${BATCH_SQL}('test data $i')"
    else
        BATCH_SQL="${BATCH_SQL}, ('test data $i')"
    fi
done
BATCH_SQL="${BATCH_SQL};"

PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c "$BATCH_SQL" >/dev/null 2>&1

BATCH_INSERT_END=$(date +%s.%N)
BATCH_INSERT_TIME=$(echo "$BATCH_INSERT_END - $BATCH_INSERT_START" | bc -l)
echo "  バッチインサート: ${BATCH_INSERT_TIME}秒" | tee -a "$BENCHMARK_LOG"

BATCH_SPEEDUP=$(echo "scale=2; $SINGLE_INSERT_TIME / $BATCH_INSERT_TIME" | bc -l)
echo "  バッチ高速化倍率: ${BATCH_SPEEDUP}倍" | tee -a "$BENCHMARK_LOG"

echo ""

# 4. JOIN性能テスト
echo -e "${BLUE}4. JOIN性能テスト${NC}" | tee -a "$BENCHMARK_LOG"
echo "================" | tee -a "$BENCHMARK_LOG"

# テーブル作成
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" << 'EOF' >/dev/null 2>&1
DROP TABLE IF EXISTS join_test_users;
DROP TABLE IF EXISTS join_test_orders;

CREATE TABLE join_test_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100)
);

CREATE TABLE join_test_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- データ挿入
INSERT INTO join_test_users (name, email)
SELECT 
    'User ' || generate_series,
    'user' || generate_series || '@duesk.co.jp'
FROM generate_series(1, 10000);

INSERT INTO join_test_orders (user_id, amount)
SELECT 
    (RANDOM() * 10000)::INTEGER + 1,
    (RANDOM() * 1000)::DECIMAL(10,2)
FROM generate_series(1, 50000);
EOF

echo "JOINテスト用データ作成完了 (Users: 10,000件, Orders: 50,000件)" | tee -a "$BENCHMARK_LOG"

# JOIN性能テスト
echo "JOIN性能テスト実行中..." | tee -a "$BENCHMARK_LOG"
JOIN_START=$(date +%s.%N)
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "SELECT u.name, COUNT(o.id) as order_count, SUM(o.amount) as total_amount
     FROM join_test_users u 
     LEFT JOIN join_test_orders o ON u.id = o.user_id
     GROUP BY u.id, u.name
     ORDER BY total_amount DESC
     LIMIT 100;" >/dev/null 2>&1
JOIN_END=$(date +%s.%N)
JOIN_TIME=$(echo "$JOIN_END - $JOIN_START" | bc -l)
echo "  JOIN処理時間: ${JOIN_TIME}秒" | tee -a "$BENCHMARK_LOG"

# インデックス作成後のJOINテスト
echo "JOIN用インデックス作成中..." | tee -a "$BENCHMARK_LOG"
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "CREATE INDEX idx_orders_user_id ON join_test_orders(user_id);" >/dev/null 2>&1

echo "インデックス後JOIN性能テスト..." | tee -a "$BENCHMARK_LOG"
JOIN_INDEXED_START=$(date +%s.%N)
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "SELECT u.name, COUNT(o.id) as order_count, SUM(o.amount) as total_amount
     FROM join_test_users u 
     LEFT JOIN join_test_orders o ON u.id = o.user_id
     GROUP BY u.id, u.name
     ORDER BY total_amount DESC
     LIMIT 100;" >/dev/null 2>&1
JOIN_INDEXED_END=$(date +%s.%N)
JOIN_INDEXED_TIME=$(echo "$JOIN_INDEXED_END - $JOIN_INDEXED_START" | bc -l)
echo "  JOIN処理時間(インデックス後): ${JOIN_INDEXED_TIME}秒" | tee -a "$BENCHMARK_LOG"

JOIN_SPEEDUP=$(echo "scale=2; $JOIN_TIME / $JOIN_INDEXED_TIME" | bc -l)
echo "  JOIN高速化倍率: ${JOIN_SPEEDUP}倍" | tee -a "$BENCHMARK_LOG"

echo ""

# 5. 並列処理性能テスト
echo -e "${BLUE}5. 並列処理性能テスト${NC}" | tee -a "$BENCHMARK_LOG"
echo "======================" | tee -a "$BENCHMARK_LOG"

# 並列集計クエリ
echo "並列集計クエリテスト..." | tee -a "$BENCHMARK_LOG"
PARALLEL_START=$(date +%s.%N)
PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
    "SET max_parallel_workers_per_gather = 4;
     SELECT COUNT(*), AVG(random_number), MIN(random_number), MAX(random_number)
     FROM benchmark_test;" >/dev/null 2>&1
PARALLEL_END=$(date +%s.%N)
PARALLEL_TIME=$(echo "$PARALLEL_END - $PARALLEL_START" | bc -l)
echo "  並列集計処理時間: ${PARALLEL_TIME}秒" | tee -a "$BENCHMARK_LOG"

echo ""

# 6. システムリソース確認
echo -e "${BLUE}6. システムリソース確認${NC}" | tee -a "$BENCHMARK_LOG"
echo "======================" | tee -a "$BENCHMARK_LOG"

# PostgreSQL統計情報
CONNECTIONS=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
    "SELECT count(*) FROM pg_stat_activity;" | xargs)

DB_SIZE=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
    "SELECT pg_size_pretty(pg_database_size('$TARGET_DB_NAME'));" | xargs)

CACHE_HIT_RATIO=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
    "SELECT round(100.0 * blks_hit / (blks_hit + blks_read), 2) 
     FROM pg_stat_database WHERE datname = '$TARGET_DB_NAME';" | xargs)

echo "PostgreSQL統計:" | tee -a "$BENCHMARK_LOG"
echo "  総接続数: $CONNECTIONS" | tee -a "$BENCHMARK_LOG"
echo "  データベースサイズ: $DB_SIZE" | tee -a "$BENCHMARK_LOG"
echo "  キャッシュヒット率: ${CACHE_HIT_RATIO}%" | tee -a "$BENCHMARK_LOG"

# システムリソース
if [[ "$OSTYPE" == "darwin"* ]]; then
    CPU_CORES=$(sysctl -n hw.ncpu)
    TOTAL_MEM=$(sysctl -n hw.memsize | awk '{printf "%.1f GB", $1/1024/1024/1024}')
else
    CPU_CORES=$(nproc)
    TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
fi

echo "システムリソース:" | tee -a "$BENCHMARK_LOG"
echo "  CPU コア数: $CPU_CORES" | tee -a "$BENCHMARK_LOG"
echo "  総メモリ: $TOTAL_MEM" | tee -a "$BENCHMARK_LOG"

echo ""

# 7. テストデータクリーンアップ
echo -e "${BLUE}7. テストデータクリーンアップ${NC}" | tee -a "$BENCHMARK_LOG"
echo "============================" | tee -a "$BENCHMARK_LOG"

PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" << 'EOF' >/dev/null 2>&1
DROP TABLE IF EXISTS benchmark_test;
DROP TABLE IF EXISTS batch_insert_test;
DROP TABLE IF EXISTS join_test_users;
DROP TABLE IF EXISTS join_test_orders;
EOF

echo -e "${GREEN}✅ テストデータクリーンアップ完了${NC}" | tee -a "$BENCHMARK_LOG"

echo ""

# 8. ベンチマーク結果サマリー
echo "================================================" | tee -a "$BENCHMARK_LOG"
echo -e "${GREEN}ベンチマーク結果サマリー${NC}" | tee -a "$BENCHMARK_LOG"
echo "================================================" | tee -a "$BENCHMARK_LOG"

echo "実行時刻: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$BENCHMARK_LOG"
echo "対象環境: ${TARGET_DB_HOST}:${TARGET_DB_PORT}/${TARGET_DB_NAME}" | tee -a "$BENCHMARK_LOG"
echo "" | tee -a "$BENCHMARK_LOG"

echo "性能指標:" | tee -a "$BENCHMARK_LOG"
echo "  CPU集約処理: ${CPU_TIME}秒" | tee -a "$BENCHMARK_LOG"
echo "  メモリ集約処理: ${MEM_TIME}秒" | tee -a "$BENCHMARK_LOG"
echo "  インデックス作成: ${INDEX_CREATE_TIME}秒" | tee -a "$BENCHMARK_LOG"
echo "  インデックス高速化: ${SPEEDUP}倍" | tee -a "$BENCHMARK_LOG"
echo "  バッチインサート高速化: ${BATCH_SPEEDUP}倍" | tee -a "$BENCHMARK_LOG"
echo "  JOIN高速化: ${JOIN_SPEEDUP}倍" | tee -a "$BENCHMARK_LOG"
echo "  並列集計処理: ${PARALLEL_TIME}秒" | tee -a "$BENCHMARK_LOG"
echo "" | tee -a "$BENCHMARK_LOG"

echo "システム情報:" | tee -a "$BENCHMARK_LOG"
echo "  CPU コア数: $CPU_CORES" | tee -a "$BENCHMARK_LOG"
echo "  総メモリ: $TOTAL_MEM" | tee -a "$BENCHMARK_LOG"
echo "  データベースサイズ: $DB_SIZE" | tee -a "$BENCHMARK_LOG"
echo "  キャッシュヒット率: ${CACHE_HIT_RATIO}%" | tee -a "$BENCHMARK_LOG"
echo "" | tee -a "$BENCHMARK_LOG"

# 性能評価
echo "性能評価:" | tee -a "$BENCHMARK_LOG"

if (( $(echo "$SPEEDUP > 10" | bc -l) )); then
    echo -e "  ${GREEN}✅ インデックス性能: 優秀 (${SPEEDUP}倍)${NC}" | tee -a "$BENCHMARK_LOG"
elif (( $(echo "$SPEEDUP > 5" | bc -l) )); then
    echo -e "  ${YELLOW}⚠️  インデックス性能: 良好 (${SPEEDUP}倍)${NC}" | tee -a "$BENCHMARK_LOG"
else
    echo -e "  ${RED}❌ インデックス性能: 要改善 (${SPEEDUP}倍)${NC}" | tee -a "$BENCHMARK_LOG"
fi

if (( $(echo "$BATCH_SPEEDUP > 50" | bc -l) )); then
    echo -e "  ${GREEN}✅ バッチ処理性能: 優秀 (${BATCH_SPEEDUP}倍)${NC}" | tee -a "$BENCHMARK_LOG"
elif (( $(echo "$BATCH_SPEEDUP > 20" | bc -l) )); then
    echo -e "  ${YELLOW}⚠️  バッチ処理性能: 良好 (${BATCH_SPEEDUP}倍)${NC}" | tee -a "$BENCHMARK_LOG"
else
    echo -e "  ${RED}❌ バッチ処理性能: 要改善 (${BATCH_SPEEDUP}倍)${NC}" | tee -a "$BENCHMARK_LOG"
fi

if (( $(echo "${CACHE_HIT_RATIO%.*} > 95" | bc -l) )); then
    echo -e "  ${GREEN}✅ キャッシュ効率: 優秀 (${CACHE_HIT_RATIO}%)${NC}" | tee -a "$BENCHMARK_LOG"
elif (( $(echo "${CACHE_HIT_RATIO%.*} > 90" | bc -l) )); then
    echo -e "  ${YELLOW}⚠️  キャッシュ効率: 良好 (${CACHE_HIT_RATIO}%)${NC}" | tee -a "$BENCHMARK_LOG"
else
    echo -e "  ${RED}❌ キャッシュ効率: 要改善 (${CACHE_HIT_RATIO}%)${NC}" | tee -a "$BENCHMARK_LOG"
fi

echo ""
echo -e "${GREEN}ベンチマークが正常に完了しました${NC}"
echo "詳細ログ: $BENCHMARK_LOG"

exit 0