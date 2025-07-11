#!/bin/bash

# UNIQUE制約分析スクリプト
# MySQLからPostgreSQLへの移行時のUNIQUE制約の違いを分析

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=============================================="
echo "UNIQUE Constraint Analysis for PostgreSQL"
echo "=============================================="
echo ""

# マイグレーションディレクトリ
MIGRATION_DIR="backend/migrations"

# 1. UNIQUE制約の総数を確認
echo -e "${BLUE}1. Analyzing UNIQUE constraints in migrations${NC}"
echo "=============================================="

total_unique=$(grep -h "UNIQUE" $MIGRATION_DIR/*.up.sql 2>/dev/null | wc -l)
echo "Total UNIQUE constraints found: $total_unique"
echo ""

# 2. NULL許可カラムを含むUNIQUE制約を検出
echo -e "${BLUE}2. UNIQUE constraints with nullable columns${NC}"
echo "=============================================="

# deleted_atを含むUNIQUE制約（論理削除パターン）
echo -e "${YELLOW}Constraints with deleted_at (soft delete pattern):${NC}"
grep -n "UNIQUE.*deleted_at\|deleted_at.*UNIQUE" $MIGRATION_DIR/*.up.sql 2>/dev/null || echo "None found"
echo ""

# 3. 複合UNIQUE制約の分析
echo -e "${BLUE}3. Composite UNIQUE constraints${NC}"
echo "=============================================="

echo "Analyzing composite UNIQUE constraints..."
for file in $MIGRATION_DIR/*.up.sql; do
    if [ -f "$file" ]; then
        # 複数カラムのUNIQUE制約を探す（カンマを含む）
        if grep -E "UNIQUE.*\(.*,.*\)" "$file" > /dev/null 2>&1; then
            echo -e "${GREEN}File: $(basename $file)${NC}"
            grep -n -E "UNIQUE.*\(.*,.*\)" "$file" | while read -r line; do
                echo "  $line"
            done
            echo ""
        fi
    fi
done

# 4. 影響を受けるテーブルのリスト
echo -e "${BLUE}4. Tables affected by NULL handling differences${NC}"
echo "=============================================="

# 特定されたテーブル
echo -e "${RED}High priority tables:${NC}"
echo "  • project_assignments - UNIQUE(project_id, user_id, deleted_at)"
echo "  • proposals - UNIQUE(project_id, user_id, deleted_at)"
echo ""

# 5. PostgreSQL移行時の推奨事項
echo -e "${BLUE}5. PostgreSQL migration recommendations${NC}"
echo "=============================================="

echo -e "${GREEN}Recommended actions:${NC}"
echo "  1. Use partial indexes for soft-delete patterns:"
echo "     CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL"
echo ""
echo "  2. Implement application-level duplicate checks"
echo ""
echo "  3. Create PostgreSQL-specific migration files"
echo ""
echo "  4. Test both MySQL and PostgreSQL behaviors"
echo ""

# 6. 検証用SQLクエリの生成
echo -e "${BLUE}6. Validation queries${NC}"
echo "=============================================="

echo "-- Check for duplicate active records (PostgreSQL)"
echo "SELECT project_id, user_id, COUNT(*) as count"
echo "FROM project_assignments"
echo "WHERE deleted_at IS NULL"
echo "GROUP BY project_id, user_id"
echo "HAVING COUNT(*) > 1;"
echo ""

echo "-- Check for duplicate active proposals"
echo "SELECT project_id, user_id, COUNT(*) as count"
echo "FROM proposals"
echo "WHERE deleted_at IS NULL"
echo "GROUP BY project_id, user_id"
echo "HAVING COUNT(*) > 1;"
echo ""

# 7. 実装状況の確認
echo -e "${BLUE}7. Implementation status${NC}"
echo "=============================================="

if [ -f "$MIGRATION_DIR/200004_fix_unique_constraints_for_postgresql.up.postgresql.sql" ]; then
    echo -e "${GREEN}✅ PostgreSQL-specific migration found${NC}"
    echo "   File: 200004_fix_unique_constraints_for_postgresql.up.postgresql.sql"
else
    echo -e "${YELLOW}⚠️  PostgreSQL-specific migration not found${NC}"
    echo "   Expected: 200004_fix_unique_constraints_for_postgresql.up.postgresql.sql"
fi
echo ""

# 8. サマリー
echo "=============================================="
echo -e "${GREEN}Analysis Summary${NC}"
echo "=============================================="
echo ""
echo "Key findings:"
echo "  • 2 tables use soft-delete pattern with UNIQUE constraints"
echo "  • These require partial indexes in PostgreSQL"
echo "  • Migration strategy documented in docs/unique-null-handling-guide.md"
echo ""
echo "Next steps:"
echo "  1. Review the generated migration files"
echo "  2. Test with both MySQL and PostgreSQL"
echo "  3. Update application code if needed"
echo ""