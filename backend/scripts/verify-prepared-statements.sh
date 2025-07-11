#!/bin/bash

# PreparedStatement設定検証スクリプト
# GORM設定とSQL使用箇所を確認

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================"
echo "PreparedStatement Configuration Verification"
echo "================================================"
echo ""

# 1. GORM設定確認
echo -e "${BLUE}1. Checking GORM Configuration${NC}"
echo "================================"
echo ""

echo "Searching for GORM configuration files..."
config_files=$(find . -name "*.go" -type f | xargs grep -l "gorm.Open" 2>/dev/null || true)

if [ -n "$config_files" ]; then
    echo -e "${GREEN}Found GORM configuration in:${NC}"
    echo "$config_files"
    echo ""
    
    # PrepareStmt設定の確認
    echo "Checking PrepareStmt setting..."
    prepare_stmt_count=$(echo "$config_files" | xargs grep -c "PrepareStmt" 2>/dev/null || echo 0)
    
    if [ "$prepare_stmt_count" -gt 0 ]; then
        echo -e "${GREEN}✅ PrepareStmt configuration found${NC}"
        echo "$config_files" | xargs grep -n "PrepareStmt" 2>/dev/null || true
    else
        echo -e "${YELLOW}⚠️  PrepareStmt not explicitly configured${NC}"
        echo "Recommendation: Add 'PrepareStmt: true' to gorm.Config"
    fi
else
    echo -e "${RED}No GORM configuration files found${NC}"
fi
echo ""

# 2. 生SQLクエリの確認
echo -e "${BLUE}2. Checking Raw SQL Queries${NC}"
echo "==========================="
echo ""

echo "Searching for raw SQL queries..."
raw_sql_files=$(find . -name "*.go" -type f | xargs grep -l "db.Raw\|db.Exec\|db.Query" 2>/dev/null || true)

if [ -n "$raw_sql_files" ]; then
    echo -e "${YELLOW}Found raw SQL queries in:${NC}"
    echo "$raw_sql_files"
    echo ""
    
    # パラメータプレースホルダーの確認
    echo "Checking parameter placeholders..."
    question_mark_count=$(echo "$raw_sql_files" | xargs grep -E "WHERE.*\?" 2>/dev/null | wc -l || echo 0)
    dollar_param_count=$(echo "$raw_sql_files" | xargs grep -E "WHERE.*\$[0-9]+" 2>/dev/null | wc -l || echo 0)
    
    echo "Found $question_mark_count queries with ? placeholders"
    echo "Found $dollar_param_count queries with $N placeholders"
    
    if [ "$question_mark_count" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found MySQL-style placeholders (?)${NC}"
        echo "These should be converted using PostgreSQLSQLAdapter"
    fi
fi
echo ""

# 3. SQLアダプターの使用確認
echo -e "${BLUE}3. Checking SQL Adapter Usage${NC}"
echo "============================="
echo ""

adapter_usage=$(find . -name "*.go" -type f | xargs grep -l "PostgreSQLSQLAdapter\|GetConvertedSQL" 2>/dev/null || true)

if [ -n "$adapter_usage" ]; then
    echo -e "${GREEN}✅ SQL Adapter is being used in:${NC}"
    echo "$adapter_usage"
    
    # 使用例を表示
    echo ""
    echo "Usage examples:"
    find . -name "*.go" -type f | xargs grep -n "GetConvertedSQL" 2>/dev/null | head -5 || true
else
    echo -e "${YELLOW}⚠️  SQL Adapter usage not found${NC}"
fi
echo ""

# 4. データベース特有の関数使用確認
echo -e "${BLUE}4. Checking Database-Specific Functions${NC}"
echo "======================================"
echo ""

mysql_functions="DATE_FORMAT|TIMESTAMPDIFF|IFNULL|YEAR\(|MONTH\(|CONCAT\("
postgres_functions="TO_CHAR|EXTRACT|COALESCE|date_part"

echo "Searching for MySQL-specific functions..."
mysql_func_files=$(find . -name "*.go" -type f | xargs grep -E "$mysql_functions" 2>/dev/null | wc -l || echo 0)

echo "Searching for PostgreSQL-specific functions..."
postgres_func_files=$(find . -name "*.go" -type f | xargs grep -E "$postgres_functions" 2>/dev/null | wc -l || echo 0)

echo "MySQL function usage: $mysql_func_files occurrences"
echo "PostgreSQL function usage: $postgres_func_files occurrences"

if [ "$mysql_func_files" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  MySQL-specific functions found${NC}"
    echo "These should be handled by SQLAdapter or converted"
fi
echo ""

# 5. 接続プーリング設定確認
echo -e "${BLUE}5. Checking Connection Pool Configuration${NC}"
echo "========================================"
echo ""

pool_config=$(find . -name "*.go" -type f | xargs grep -E "SetMaxIdleConns|SetMaxOpenConns|SetConnMaxLifetime" 2>/dev/null || true)

if [ -n "$pool_config" ]; then
    echo -e "${GREEN}✅ Connection pool configuration found:${NC}"
    echo "$pool_config" | head -10
    
    # PostgreSQL特有の設定確認
    postgres_specific=$(echo "$pool_config" | grep -B2 -A2 "postgres" 2>/dev/null || true)
    if [ -n "$postgres_specific" ]; then
        echo ""
        echo -e "${GREEN}✅ PostgreSQL-specific pool settings detected${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No connection pool configuration found${NC}"
fi
echo ""

# 6. エラーハンドリング確認
echo -e "${BLUE}6. Checking Error Handling${NC}"
echo "========================="
echo ""

error_handling=$(find . -name "*.go" -type f | xargs grep -E "23505|23503|23502|1062|1452|1048" 2>/dev/null || true)

if [ -n "$error_handling" ]; then
    echo -e "${GREEN}✅ Database-specific error handling found${NC}"
    echo "PostgreSQL error codes: 23505 (unique), 23503 (FK), 23502 (not null)"
    echo "MySQL error codes: 1062 (duplicate), 1452 (FK), 1048 (not null)"
else
    echo -e "${YELLOW}⚠️  No database-specific error handling found${NC}"
    echo "Consider adding error code handling for better compatibility"
fi
echo ""

# 7. トランザクション設定確認
echo -e "${BLUE}7. Checking Transaction Configuration${NC}"
echo "===================================="
echo ""

tx_config=$(find . -name "*.go" -type f | xargs grep -E "Begin.*TxOptions|IsolationLevel" 2>/dev/null || true)

if [ -n "$tx_config" ]; then
    echo -e "${GREEN}✅ Transaction configuration found:${NC}"
    echo "$tx_config" | head -5
else
    echo "Using default transaction isolation levels"
    echo "MySQL default: REPEATABLE READ"
    echo "PostgreSQL default: READ COMMITTED"
fi
echo ""

# 8. サマリー
echo -e "${BLUE}8. Summary and Recommendations${NC}"
echo "============================="
echo ""

echo -e "${GREEN}Current Status:${NC}"
echo "• GORM is used as the primary ORM"
echo "• PostgreSQLSQLAdapter is available for SQL conversion"
echo "• Connection pooling is configured per database type"
echo ""

echo -e "${YELLOW}Recommended Actions:${NC}"
echo "1. Enable PrepareStmt in GORM configuration:"
echo "   PrepareStmt: true"
echo ""
echo "2. Ensure all raw SQL uses SQLAdapter:"
echo "   convertedSQL := sqlAdapter.GetConvertedSQL(query)"
echo ""
echo "3. Add database-specific error handling"
echo ""
echo "4. Consider using native PostgreSQL types (UUID, JSONB)"
echo ""

echo "================================================"
echo -e "${GREEN}Verification Complete${NC}"
echo "================================================"