#!/bin/bash

# VACUUM/ANALYZE監視スクリプト
# PostgreSQLのautovacuum実行状況とテーブルの健全性を監視

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

echo "=============================================="
echo "PostgreSQL VACUUM/ANALYZE Monitor"
echo "=============================================="
echo ""

# 1. Autovacuum実行状況
echo -e "${BLUE}1. Recent Autovacuum Activity${NC}"
echo "================================"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    autovacuum_count,
    autoanalyze_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY COALESCE(last_autovacuum, '1900-01-01'::timestamp) DESC
LIMIT 10;
EOF

echo ""

# 2. デッドタプル率の高いテーブル
echo -e "${BLUE}2. Tables with High Dead Tuple Ratio${NC}"
echo "===================================="

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    tablename,
    n_live_tup AS live,
    n_dead_tup AS dead,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 100
  AND n_dead_tup > 0
ORDER BY dead_pct DESC
LIMIT 10;
EOF

echo ""

# 3. テーブルサイズと肥大化
echo -e "${BLUE}3. Table Sizes and Bloat${NC}"
echo "========================"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
WITH table_sizes AS (
    SELECT
        tablename,
        pg_total_relation_size(schemaname||'.'||tablename) AS total_size,
        pg_relation_size(schemaname||'.'||tablename) AS table_size,
        n_live_tup,
        n_dead_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
)
SELECT
    tablename,
    pg_size_pretty(total_size) AS total,
    pg_size_pretty(table_size) AS table_only,
    n_live_tup AS live,
    n_dead_tup AS dead
FROM table_sizes
WHERE total_size > 1024 * 1024  -- 1MB以上
ORDER BY total_size DESC
LIMIT 15;
EOF

echo ""

# 4. Autovacuumプロセスの確認
echo -e "${BLUE}4. Current Autovacuum Processes${NC}"
echo "==============================="

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    pid,
    now() - xact_start AS duration,
    query
FROM pg_stat_activity
WHERE query LIKE 'autovacuum:%'
ORDER BY xact_start;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}No autovacuum processes currently running${NC}"
fi
echo ""

# 5. カスタムautovacuum設定を持つテーブル
echo -e "${BLUE}5. Tables with Custom Autovacuum Settings${NC}"
echo "========================================"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    c.relname AS table_name,
    c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.reloptions IS NOT NULL
ORDER BY c.relname;
EOF

echo ""

# 6. 推奨アクション
echo -e "${BLUE}6. Recommendations${NC}"
echo "=================="

# デッドタプル率が高いテーブルをチェック
HIGH_DEAD_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A << EOF
SELECT tablename
FROM pg_stat_user_tables
WHERE n_live_tup > 1000
  AND (100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0)) > 20
LIMIT 5;
EOF
)

if [ -n "$HIGH_DEAD_TABLES" ]; then
    echo -e "${YELLOW}⚠️  High dead tuple ratio detected in:${NC}"
    echo "$HIGH_DEAD_TABLES" | while read -r table; do
        echo "   - $table"
    done
    echo ""
    echo "   Consider running:"
    echo "   VACUUM (VERBOSE, ANALYZE) <table_name>;"
else
    echo -e "${GREEN}✅ All tables have acceptable dead tuple ratios${NC}"
fi

echo ""

# 7. 最後のVACUUMから長時間経過したテーブル
echo -e "${BLUE}7. Tables Not Vacuumed Recently${NC}"
echo "==============================="

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    tablename,
    COALESCE(last_vacuum, last_autovacuum) AS last_vacuum_time,
    now() - COALESCE(last_vacuum, last_autovacuum) AS time_since_vacuum
FROM pg_stat_user_tables
WHERE COALESCE(last_vacuum, last_autovacuum) < now() - interval '7 days'
  AND n_live_tup > 1000
ORDER BY time_since_vacuum DESC
LIMIT 10;
EOF

echo ""

# 8. システム全体の統計
echo -e "${BLUE}8. System-wide Statistics${NC}"
echo "========================"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t << EOF
SELECT 
    'Total Tables' AS metric,
    COUNT(*) AS value
FROM pg_stat_user_tables
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Tables > 10% Dead Tuples',
    COUNT(*)
FROM pg_stat_user_tables
WHERE n_live_tup > 100
  AND (100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0)) > 10
UNION ALL
SELECT 
    'Total Dead Tuples',
    SUM(n_dead_tup)
FROM pg_stat_user_tables
WHERE schemaname = 'public';
EOF

echo ""
echo "=============================================="
echo -e "${GREEN}Monitoring Complete${NC}"
echo "==============================================