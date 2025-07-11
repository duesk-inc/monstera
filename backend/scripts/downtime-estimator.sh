#!/bin/bash

# PostgreSQL移行ダウンタイム見積もりスクリプト
# データベース規模とシステム構成から移行時間を自動計算

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# デフォルト値
DEFAULT_DATA_SIZE_GB=5
DEFAULT_RECORD_COUNT=100000
DEFAULT_TABLE_COUNT=50
DEFAULT_INDEX_COUNT=100
DEFAULT_CONCURRENT_USERS=100

echo "================================================"
echo "PostgreSQL Migration Downtime Estimator"
echo "================================================"
echo ""

# 1. システム情報収集
echo -e "${BLUE}1. Collecting System Information${NC}"
echo "================================"
echo ""

# データベース情報を収集
if command -v mysql >/dev/null 2>&1; then
    echo "Attempting to connect to MySQL for data collection..."
    
    # MySQL接続テスト
    if mysql -h"${DB_HOST:-localhost}" -u"${DB_USER:-root}" -p"${DB_PASSWORD}" -e "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ MySQL connection successful${NC}"
        
        # データサイズ取得
        DATA_SIZE_MB=$(mysql -h"${DB_HOST:-localhost}" -u"${DB_USER:-root}" -p"${DB_PASSWORD}" \
            -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS 'DB Size in MB' 
                FROM information_schema.tables 
                WHERE table_schema = '${DB_NAME:-monstera}';" 2>/dev/null | tail -n 1)
        
        # テーブル数取得
        TABLE_COUNT=$(mysql -h"${DB_HOST:-localhost}" -u"${DB_USER:-root}" -p"${DB_PASSWORD}" \
            -e "SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = '${DB_NAME:-monstera}';" 2>/dev/null | tail -n 1)
        
        # インデックス数取得
        INDEX_COUNT=$(mysql -h"${DB_HOST:-localhost}" -u"${DB_USER:-root}" -p"${DB_PASSWORD}" \
            -e "SELECT COUNT(*) FROM information_schema.statistics 
                WHERE table_schema = '${DB_NAME:-monstera}';" 2>/dev/null | tail -n 1)
                
        echo "  Database size: ${DATA_SIZE_MB} MB"
        echo "  Table count: ${TABLE_COUNT}"
        echo "  Index count: ${INDEX_COUNT}"
    else
        echo -e "${YELLOW}⚠️  MySQL connection failed, using default values${NC}"
        DATA_SIZE_MB=$((DEFAULT_DATA_SIZE_GB * 1024))
        TABLE_COUNT=$DEFAULT_TABLE_COUNT
        INDEX_COUNT=$DEFAULT_INDEX_COUNT
    fi
else
    echo -e "${YELLOW}⚠️  MySQL client not found, using default values${NC}"
    DATA_SIZE_MB=$((DEFAULT_DATA_SIZE_GB * 1024))
    TABLE_COUNT=$DEFAULT_TABLE_COUNT
    INDEX_COUNT=$DEFAULT_INDEX_COUNT
fi

# マイグレーションファイル数をカウント
MIGRATION_FILES=$(find . -name "*.sql" -path "*/migrations/*" 2>/dev/null | wc -l || echo 0)
echo "  Migration files: ${MIGRATION_FILES}"

echo ""

# 2. 移行パラメータ設定
echo -e "${BLUE}2. Migration Parameters${NC}"
echo "======================"
echo ""

# ユーザー入力またはデフォルト値
read -p "Enter data size in MB [${DATA_SIZE_MB}]: " INPUT_DATA_SIZE
DATA_SIZE_MB=${INPUT_DATA_SIZE:-$DATA_SIZE_MB}

read -p "Enter concurrent users during migration [${DEFAULT_CONCURRENT_USERS}]: " INPUT_USERS
CONCURRENT_USERS=${INPUT_USERS:-$DEFAULT_CONCURRENT_USERS}

read -p "Migration type (1: Traditional, 2: Blue-Green) [2]: " MIGRATION_TYPE
MIGRATION_TYPE=${MIGRATION_TYPE:-2}

echo ""
echo "Migration Configuration:"
echo "  Data size: ${DATA_SIZE_MB} MB"
echo "  Table count: ${TABLE_COUNT}"
echo "  Index count: ${INDEX_COUNT}"
echo "  Concurrent users: ${CONCURRENT_USERS}"
echo "  Migration type: $([ "$MIGRATION_TYPE" = "1" ] && echo "Traditional" || echo "Blue-Green")"
echo ""

# 3. パフォーマンス係数設定
echo -e "${BLUE}3. Performance Factors${NC}"
echo "====================="
echo ""

# システム性能係数（環境依存）
if [ "${GO_ENV:-development}" = "production" ]; then
    PERFORMANCE_MULTIPLIER=1.0
    echo "Environment: Production (optimized performance)"
elif [ "${GO_ENV}" = "staging" ]; then
    PERFORMANCE_MULTIPLIER=1.2
    echo "Environment: Staging (reduced performance)"
else
    PERFORMANCE_MULTIPLIER=1.5
    echo "Environment: Development (limited performance)"
fi

# ネットワーク係数
if [ "${NETWORK_TYPE:-local}" = "cloud" ]; then
    NETWORK_MULTIPLIER=1.3
    echo "Network: Cloud (additional latency)"
else
    NETWORK_MULTIPLIER=1.0
    echo "Network: Local (minimal latency)"
fi

# データベース規模係数
if [ "$DATA_SIZE_MB" -gt 10000 ]; then
    SIZE_MULTIPLIER=1.5
    echo "Data size: Large (>10GB) - additional processing time"
elif [ "$DATA_SIZE_MB" -gt 1000 ]; then
    SIZE_MULTIPLIER=1.2
    echo "Data size: Medium (1-10GB) - moderate processing time"
else
    SIZE_MULTIPLIER=1.0
    echo "Data size: Small (<1GB) - minimal processing time"
fi

echo ""

# 4. ダウンタイム計算
echo -e "${BLUE}4. Downtime Calculation${NC}"
echo "======================"
echo ""

if [ "$MIGRATION_TYPE" = "1" ]; then
    # 従来方式のダウンタイム計算
    echo "Traditional Migration Downtime Estimation:"
    echo "=========================================="
    
    # 各フェーズの基本時間（分）
    MAINTENANCE_SETUP=2
    MYSQL_READONLY=1
    DATA_EXPORT_BASE=5
    DATA_IMPORT_BASE=3
    INDEX_CREATION_BASE=3
    APP_RESTART=3
    VALIDATION=5
    MAINTENANCE_CLEANUP=1
    
    # データサイズ影響計算
    DATA_EXPORT_TIME=$(echo "scale=1; $DATA_EXPORT_BASE * ($DATA_SIZE_MB / 1000) * $PERFORMANCE_MULTIPLIER * $NETWORK_MULTIPLIER * $SIZE_MULTIPLIER" | bc -l)
    DATA_IMPORT_TIME=$(echo "scale=1; $DATA_IMPORT_BASE * ($DATA_SIZE_MB / 1000) * $PERFORMANCE_MULTIPLIER * $SIZE_MULTIPLIER" | bc -l)
    INDEX_TIME=$(echo "scale=1; $INDEX_CREATION_BASE * ($INDEX_COUNT / 50) * $PERFORMANCE_MULTIPLIER" | bc -l)
    
    # 総ダウンタイム計算
    TOTAL_DOWNTIME=$(echo "scale=1; $MAINTENANCE_SETUP + $MYSQL_READONLY + $DATA_EXPORT_TIME + $DATA_IMPORT_TIME + $INDEX_TIME + $APP_RESTART + $VALIDATION + $MAINTENANCE_CLEANUP" | bc -l)
    
    echo "  Phase breakdown:"
    echo "    Maintenance setup:     ${MAINTENANCE_SETUP} min"
    echo "    MySQL read-only:       ${MYSQL_READONLY} min"
    echo "    Data export:           ${DATA_EXPORT_TIME} min"
    echo "    Data import:           ${DATA_IMPORT_TIME} min"
    echo "    Index creation:        ${INDEX_TIME} min"
    echo "    Application restart:   ${APP_RESTART} min"
    echo "    Validation:            ${VALIDATION} min"
    echo "    Maintenance cleanup:   ${MAINTENANCE_CLEANUP} min"
    echo ""
    echo -e "  ${YELLOW}Total estimated downtime: ${TOTAL_DOWNTIME} minutes${NC}"
    
    # 時間帯別影響計算
    USER_IMPACT_HIGH=$((CONCURRENT_USERS * 80 / 100))  # 80% of users affected during peak
    USER_IMPACT_LOW=$((CONCURRENT_USERS * 20 / 100))   # 20% of users affected during off-peak
    
    echo ""
    echo "  User Impact Analysis:"
    echo "    Peak hours (9AM-6PM):     ${USER_IMPACT_HIGH} users affected"
    echo "    Off-peak hours (10PM-6AM): ${USER_IMPACT_LOW} users affected"
    
else
    # Blue-Green方式のダウンタイム計算
    echo "Blue-Green Migration Downtime Estimation:"
    echo "========================================="
    
    # Blue-Green方式では実質的なダウンタイムは最小
    SESSION_SWITCH_TIME=2
    CONNECTION_DRAIN_TIME=3
    HEALTH_CHECK_TIME=1
    
    TOTAL_DOWNTIME=$(echo "scale=1; $SESSION_SWITCH_TIME + $CONNECTION_DRAIN_TIME + $HEALTH_CHECK_TIME" | bc -l)
    
    # 段階的移行の時間計算
    PHASE1_DURATION=30  # 10% traffic
    PHASE2_DURATION=20  # 50% traffic
    PHASE3_DURATION=10  # 100% traffic
    TOTAL_MIGRATION_TIME=$((PHASE1_DURATION + PHASE2_DURATION + PHASE3_DURATION))
    
    echo "  Phase breakdown:"
    echo "    Phase 1 (10% traffic):   ${PHASE1_DURATION} min (0 min downtime)"
    echo "    Phase 2 (50% traffic):   ${PHASE2_DURATION} min (0 min downtime)"
    echo "    Phase 3 (100% traffic):  ${PHASE3_DURATION} min (${TOTAL_DOWNTIME} min downtime)"
    echo ""
    echo -e "  ${GREEN}Total estimated downtime: ${TOTAL_DOWNTIME} minutes${NC}"
    echo -e "  ${BLUE}Total migration duration: ${TOTAL_MIGRATION_TIME} minutes${NC}"
    
    # ユーザー影響は最小限
    USER_IMPACT_GRADUAL=$((CONCURRENT_USERS * 5 / 100))  # Only 5% experience brief interruption
    
    echo ""
    echo "  User Impact Analysis:"
    echo "    Gradual migration:       ${USER_IMPACT_GRADUAL} users briefly affected"
    echo "    Session preservation:    95% of sessions maintained"
fi

echo ""

# 5. リスク要因分析
echo -e "${BLUE}5. Risk Factor Analysis${NC}"
echo "======================"
echo ""

RISK_SCORE=0

echo "Risk Assessment:"

# データサイズリスク
if [ "$DATA_SIZE_MB" -gt 10000 ]; then
    echo "  ⚠️  Large dataset risk: HIGH (+3 points)"
    RISK_SCORE=$((RISK_SCORE + 3))
elif [ "$DATA_SIZE_MB" -gt 1000 ]; then
    echo "  ⚠️  Medium dataset risk: MEDIUM (+1 point)"
    RISK_SCORE=$((RISK_SCORE + 1))
else
    echo "  ✅ Small dataset risk: LOW (+0 points)"
fi

# 複雑性リスク
if [ "$TABLE_COUNT" -gt 100 ]; then
    echo "  ⚠️  High complexity risk: HIGH (+2 points)"
    RISK_SCORE=$((RISK_SCORE + 2))
elif [ "$TABLE_COUNT" -gt 50 ]; then
    echo "  ⚠️  Medium complexity risk: MEDIUM (+1 point)"
    RISK_SCORE=$((RISK_SCORE + 1))
else
    echo "  ✅ Low complexity risk: LOW (+0 points)"
fi

# ユーザー負荷リスク
if [ "$CONCURRENT_USERS" -gt 500 ]; then
    echo "  ⚠️  High user load risk: HIGH (+2 points)"
    RISK_SCORE=$((RISK_SCORE + 2))
elif [ "$CONCURRENT_USERS" -gt 100 ]; then
    echo "  ⚠️  Medium user load risk: MEDIUM (+1 point)"
    RISK_SCORE=$((RISK_SCORE + 1))
else
    echo "  ✅ Low user load risk: LOW (+0 points)"
fi

# Blue-Green使用でリスク軽減
if [ "$MIGRATION_TYPE" = "2" ]; then
    echo "  ✅ Blue-Green deployment: RISK REDUCTION (-2 points)"
    RISK_SCORE=$((RISK_SCORE - 2))
fi

# 総合リスクレベル
if [ "$RISK_SCORE" -le 0 ]; then
    RISK_LEVEL="LOW"
    RISK_COLOR="${GREEN}"
elif [ "$RISK_SCORE" -le 3 ]; then
    RISK_LEVEL="MEDIUM"
    RISK_COLOR="${YELLOW}"
else
    RISK_LEVEL="HIGH"
    RISK_COLOR="${RED}"
fi

echo ""
echo -e "  Overall Risk Level: ${RISK_COLOR}${RISK_LEVEL} (${RISK_SCORE} points)${NC}"

# 6. 推奨実行時間
echo ""
echo -e "${BLUE}6. Recommended Execution Time${NC}"
echo "============================="
echo ""

echo "Optimal migration windows:"

if [ "$MIGRATION_TYPE" = "1" ]; then
    echo "  Traditional Migration (${TOTAL_DOWNTIME} min downtime):"
    echo "    - Sunday 2:00-4:00 AM JST (low user activity)"
    echo "    - Saturday 11:00 PM - Sunday 1:00 AM JST"
    echo "    - Public holiday early morning"
else
    echo "  Blue-Green Migration (${TOTAL_DOWNTIME} min downtime):"
    echo "    - Any time with 1-hour advance notice"
    echo "    - Recommended: Sunday 2:00-5:00 AM JST for ${TOTAL_MIGRATION_TIME} min process"
    echo "    - Business hours possible due to minimal impact"
fi

echo ""
echo "Time zone considerations:"
echo "  - JST (UTC+9): Primary user base in Japan"
echo "  - Avoid: Monday 8:00-10:00 AM (week start high usage)"
echo "  - Avoid: Month-end/start (report submission periods)"

# 7. 準備チェックリスト
echo ""
echo -e "${BLUE}7. Pre-Migration Checklist${NC}"
echo "=========================="
echo ""

echo "Essential preparations:"
echo "  [ ] PostgreSQL environment tested and validated"
echo "  [ ] Data migration scripts tested with sample data"
echo "  [ ] Performance benchmarks completed"
echo "  [ ] Blue-Green infrastructure tested"
echo "  [ ] Rollback procedures verified"
echo "  [ ] Monitoring and alerting configured"
echo "  [ ] User communication sent (1 week advance)"
echo "  [ ] Emergency contact list prepared"
echo "  [ ] Backup verification completed"
echo "  [ ] Team availability confirmed"

# 8. 成功メトリクス
echo ""
echo -e "${BLUE}8. Success Metrics${NC}"
echo "=================="
echo ""

echo "Migration success criteria:"
echo "  - Actual downtime ≤ estimated downtime + 20%"
echo "  - Data integrity: 100% (zero data loss)"
echo "  - Error rate: <0.1% post-migration"
echo "  - Performance: ≤ 120% of pre-migration response times"
echo "  - User complaints: <5% of active users"
echo "  - Rollback not required"

# 9. サマリーレポート
echo ""
echo "================================================"
echo -e "${BLUE}Migration Estimation Summary${NC}"
echo "================================================"
echo ""

echo "System Profile:"
echo "  Data Size: ${DATA_SIZE_MB} MB"
echo "  Tables: ${TABLE_COUNT}"
echo "  Indexes: ${INDEX_COUNT}"
echo "  Users: ${CONCURRENT_USERS}"
echo "  Environment: ${GO_ENV:-development}"
echo ""

echo "Migration Plan:"
echo "  Type: $([ "$MIGRATION_TYPE" = "1" ] && echo "Traditional" || echo "Blue-Green")"
echo -e "  Estimated Downtime: ${YELLOW}${TOTAL_DOWNTIME} minutes${NC}"
if [ "$MIGRATION_TYPE" = "2" ]; then
    echo -e "  Total Duration: ${BLUE}${TOTAL_MIGRATION_TIME} minutes${NC}"
fi
echo -e "  Risk Level: ${RISK_COLOR}${RISK_LEVEL}${NC}"
echo ""

echo "Recommended Actions:"
if [ "$RISK_SCORE" -gt 3 ]; then
    echo "  - Consider Blue-Green deployment to reduce risk"
    echo "  - Perform additional testing with production-like data"
    echo "  - Plan for extended maintenance window"
elif [ "$RISK_SCORE" -le 0 ]; then
    echo "  - Low risk migration, proceed with confidence"
    echo "  - Blue-Green deployment recommended for zero downtime"
else
    echo "  - Standard precautions sufficient"
    echo "  - Follow established migration procedures"
fi

echo ""
echo "Next Steps:"
echo "  1. Review detailed migration plan: docs/migration-downtime-plan.md"
echo "  2. Execute pre-migration testing: ./scripts/pre-migration-test.sh"
echo "  3. Schedule migration window with stakeholders"
echo "  4. Prepare communication to users"
echo "  5. Execute migration: ./scripts/execute-migration.sh"

echo ""
echo "================================================"
echo -e "${GREEN}Estimation Complete${NC}"
echo "================================================"