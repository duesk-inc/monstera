#!/bin/bash

# バッチ処理タイムアウト設定検証スクリプト
# PostgreSQL移行対応の設定確認

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================"
echo "Batch Processing Timeout Configuration Verification"
echo "================================================"
echo ""

# 1. バッチ設定ファイル確認
echo -e "${BLUE}1. Checking Batch Configuration Files${NC}"
echo "====================================="
echo ""

batch_config_files=$(find . -name "*batch*config*.go" -type f 2>/dev/null || true)
if [ -n "$batch_config_files" ]; then
    echo -e "${GREEN}✅ Found batch configuration files:${NC}"
    echo "$batch_config_files"
else
    echo -e "${YELLOW}⚠️  No batch configuration files found${NC}"
fi
echo ""

# 2. 現在のバッチスケジューラー確認
echo -e "${BLUE}2. Checking Batch Scheduler Implementation${NC}"
echo "=========================================="
echo ""

scheduler_files=$(find . -name "*scheduler*.go" -type f 2>/dev/null || true)
if [ -n "$scheduler_files" ]; then
    echo -e "${GREEN}Found scheduler files:${NC}"
    echo "$scheduler_files"
    echo ""
    
    # タイムアウト設定の確認
    echo "Checking timeout configurations in scheduler..."
    timeout_configs=$(echo "$scheduler_files" | xargs grep -n "time.Minute\|time.Second\|time.Hour" 2>/dev/null || true)
    if [ -n "$timeout_configs" ]; then
        echo -e "${GREEN}Current timeout configurations:${NC}"
        echo "$timeout_configs" | head -10
    else
        echo -e "${YELLOW}⚠️  No timeout configurations found in scheduler${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No scheduler files found${NC}"
fi
echo ""

# 3. バッチプロセッサーサービス確認
echo -e "${BLUE}3. Checking Batch Processor Service${NC}"
echo "=================================="
echo ""

processor_files=$(find . -name "*batch*processor*.go" -type f 2>/dev/null || true)
if [ -n "$processor_files" ]; then
    echo -e "${GREEN}Found batch processor files:${NC}"
    echo "$processor_files"
    echo ""
    
    # コンテキストタイムアウトの確認
    context_usage=$(echo "$processor_files" | xargs grep -n "context.WithTimeout\|context.WithDeadline" 2>/dev/null || true)
    if [ -n "$context_usage" ]; then
        echo -e "${GREEN}Context timeout usage:${NC}"
        echo "$context_usage" | head -5
    fi
else
    echo -e "${YELLOW}⚠️  No batch processor files found${NC}"
fi
echo ""

# 4. データベース設定確認
echo -e "${BLUE}4. Checking Database Configuration${NC}"
echo "================================="
echo ""

db_config_files=$(find . -name "*config*.go" -path "*/config/*" -type f 2>/dev/null || true)
if [ -n "$db_config_files" ]; then
    echo -e "${GREEN}Found database configuration files:${NC}"
    echo "$db_config_files"
    echo ""
    
    # PostgreSQL固有の設定確認
    postgres_configs=$(echo "$db_config_files" | xargs grep -n "postgres\|PostgreSQL\|statement_timeout\|lock_timeout" 2>/dev/null || true)
    if [ -n "$postgres_configs" ]; then
        echo -e "${GREEN}PostgreSQL-specific configurations:${NC}"
        echo "$postgres_configs" | head -10
    else
        echo -e "${YELLOW}⚠️  No PostgreSQL-specific configurations found${NC}"
    fi
else
    echo -e "${RED}❌ No database configuration files found${NC}"
fi
echo ""

# 5. 環境変数設定確認
echo -e "${BLUE}5. Checking Environment Variable Settings${NC}"
echo "========================================="
echo ""

env_files=$(find . -name ".env*" -type f 2>/dev/null || true)
if [ -n "$env_files" ]; then
    echo -e "${GREEN}Found environment files:${NC}"
    echo "$env_files"
    echo ""
    
    # バッチ関連の環境変数確認
    batch_env_vars=$(echo "$env_files" | xargs grep -n "BATCH\|TIMEOUT\|DB_.*TIMEOUT" 2>/dev/null || true)
    if [ -n "$batch_env_vars" ]; then
        echo -e "${GREEN}Batch-related environment variables:${NC}"
        echo "$batch_env_vars"
    else
        echo -e "${YELLOW}⚠️  No batch-related environment variables found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No environment files found${NC}"
fi
echo ""

# 6. リトライ設定確認
echo -e "${BLUE}6. Checking Retry Configuration${NC}"
echo "==============================="
echo ""

retry_files=$(find . -name "*retry*.go" -o -name "*deadlock*.go" -type f 2>/dev/null || true)
if [ -n "$retry_files" ]; then
    echo -e "${GREEN}Found retry configuration files:${NC}"
    echo "$retry_files"
    echo ""
    
    # リトライ設定の確認
    retry_configs=$(echo "$retry_files" | xargs grep -n "MaxRetries\|BaseDelay\|Multiplier" 2>/dev/null || true)
    if [ -n "$retry_configs" ]; then
        echo -e "${GREEN}Retry configurations:${NC}"
        echo "$retry_configs" | head -5
    fi
else
    echo -e "${YELLOW}⚠️  No retry configuration files found${NC}"
fi
echo ""

# 7. バルクインサート設定確認
echo -e "${BLUE}7. Checking Bulk Insert Configuration${NC}"
echo "===================================="
echo ""

bulk_files=$(find . -name "*bulk*.go" -type f 2>/dev/null || true)
if [ -n "$bulk_files" ]; then
    echo -e "${GREEN}Found bulk operation files:${NC}"
    echo "$bulk_files"
    echo ""
    
    # チャンクサイズ設定の確認
    chunk_configs=$(echo "$bulk_files" | xargs grep -n "ChunkSize\|BatchSize\|chunk.*size" 2>/dev/null || true)
    if [ -n "$chunk_configs" ]; then
        echo -e "${GREEN}Chunk size configurations:${NC}"
        echo "$chunk_configs" | head -5
    fi
else
    echo -e "${YELLOW}⚠️  No bulk operation files found${NC}"
fi
echo ""

# 8. 接続プール設定確認
echo -e "${BLUE}8. Checking Connection Pool Configuration${NC}"
echo "========================================"
echo ""

pool_files=$(find . -name "*pool*.go" -o -name "*connection*.go" -type f 2>/dev/null || true)
if [ -n "$pool_files" ]; then
    echo -e "${GREEN}Found connection pool files:${NC}"
    echo "$pool_files"
    echo ""
    
    # 接続プール設定の確認
    pool_configs=$(echo "$pool_files" | xargs grep -n "MaxIdleConns\|MaxOpenConns\|ConnMaxLifetime" 2>/dev/null || true)
    if [ -n "$pool_configs" ]; then
        echo -e "${GREEN}Connection pool configurations:${NC}"
        echo "$pool_configs" | head -10
    fi
else
    echo -e "${YELLOW}⚠️  No connection pool files found${NC}"
fi
echo ""

# 9. コンテキスト使用パターン確認
echo -e "${BLUE}9. Checking Context Usage Patterns${NC}"
echo "=================================="
echo ""

context_files=$(find . -name "*.go" -type f | xargs grep -l "context.WithTimeout\|context.WithDeadline" 2>/dev/null || true)
if [ -n "$context_files" ]; then
    context_count=$(echo "$context_files" | wc -l)
    echo -e "${GREEN}Found $context_count files using context timeouts${NC}"
    
    # 具体的な使用例を表示
    echo ""
    echo "Context timeout usage examples:"
    echo "$context_files" | head -3 | xargs grep -n "context.WithTimeout\|context.WithDeadline" 2>/dev/null | head -5 || true
else
    echo -e "${YELLOW}⚠️  No context timeout usage found${NC}"
fi
echo ""

# 10. PostgreSQL固有のエラーハンドリング確認
echo -e "${BLUE}10. Checking PostgreSQL Error Handling${NC}"
echo "======================================"
echo ""

error_files=$(find . -name "*.go" -type f | xargs grep -l "40001\|40P01\|55P03\|23505\|23503" 2>/dev/null || true)
if [ -n "$error_files" ]; then
    echo -e "${GREEN}Found files with PostgreSQL error codes:${NC}"
    echo "$error_files"
    echo ""
    
    # 具体的なエラーコード確認
    error_codes=$(echo "$error_files" | xargs grep -n "40001\|40P01\|55P03" 2>/dev/null || true)
    if [ -n "$error_codes" ]; then
        echo -e "${GREEN}PostgreSQL-specific error codes:${NC}"
        echo "$error_codes" | head -5
    fi
else
    echo -e "${YELLOW}⚠️  No PostgreSQL-specific error handling found${NC}"
fi
echo ""

# 11. メトリクス収集確認
echo -e "${BLUE}11. Checking Metrics Collection${NC}"
echo "==============================="
echo ""

metrics_files=$(find . -name "*.go" -type f | xargs grep -l "prometheus\|metrics\|histogram\|counter" 2>/dev/null || true)
if [ -n "$metrics_files" ]; then
    metrics_count=$(echo "$metrics_files" | wc -l)
    echo -e "${GREEN}Found $metrics_count files with metrics collection${NC}"
    
    # バッチ関連メトリクス確認
    batch_metrics=$(echo "$metrics_files" | xargs grep -n "batch.*metric\|timeout.*metric\|duration.*metric" 2>/dev/null || true)
    if [ -n "$batch_metrics" ]; then
        echo -e "${GREEN}Batch-related metrics:${NC}"
        echo "$batch_metrics" | head -3
    fi
else
    echo -e "${YELLOW}⚠️  No metrics collection found${NC}"
fi
echo ""

# 12. 推奨設定チェック
echo -e "${BLUE}12. Recommendations${NC}"
echo "=================="
echo ""

echo -e "${GREEN}Recommended PostgreSQL Batch Settings:${NC}"
echo ""
echo "Environment Variables:"
echo "  DB_STATEMENT_TIMEOUT=300000        # 5 minutes"
echo "  DB_LOCK_TIMEOUT=60000             # 1 minute"
echo "  DB_IDLE_IN_TRANSACTION_TIMEOUT=300000  # 5 minutes"
echo "  BATCH_QUERY_TIMEOUT=1800          # 30 minutes"
echo "  BATCH_CHUNK_SIZE=1000             # Chunk size"
echo "  BATCH_MAX_RETRIES=3               # Max retries"
echo ""

echo -e "${GREEN}Job Timeout Adjustments (PostgreSQL):${NC}"
echo "  alert_detection: 45 minutes (from 30)"
echo "  weekly_reminder: 30 minutes (from 20)"
echo "  unsubmitted_escalation: 25 minutes (from 15)"
echo "  notification_cleanup: 20 minutes (from 10)"
echo "  monthly_archive: 120 minutes (from 60)"
echo ""

echo -e "${YELLOW}Action Items:${NC}"
echo "1. Add PostgreSQL-specific timeout configurations"
echo "2. Implement retry logic with exponential backoff"
echo "3. Add context timeout management for batch operations"
echo "4. Configure connection pool for PostgreSQL characteristics"
echo "5. Add metrics collection for timeout monitoring"
echo "6. Implement health checks for long-running operations"
echo ""

# 13. 設定サマリー
echo -e "${BLUE}13. Configuration Summary${NC}"
echo "========================"
echo ""

# 設定ファイル数カウント
total_config_files=$(find . -name "*config*.go" -type f 2>/dev/null | wc -l)
batch_related_files=$(find . -name "*batch*.go" -type f 2>/dev/null | wc -l)
timeout_usage=$(find . -name "*.go" -type f | xargs grep -l "timeout\|Timeout" 2>/dev/null | wc -l)

echo "Configuration files found: $total_config_files"
echo "Batch-related files: $batch_related_files"
echo "Files using timeouts: $timeout_usage"
echo ""

if [ "$total_config_files" -gt 0 ] && [ "$batch_related_files" -gt 0 ]; then
    echo -e "${GREEN}✅ Basic batch infrastructure is present${NC}"
else
    echo -e "${YELLOW}⚠️  Batch infrastructure may need enhancement${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}Batch Timeout Verification Complete${NC}"
echo "================================================"