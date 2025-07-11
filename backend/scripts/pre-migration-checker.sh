#!/bin/bash

# pre-migration-checker.sh
# PostgreSQL移行前自動チェックスクリプト
# 技術的チェック項目の自動実行

set -euo pipefail

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 設定
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-monstera}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-monstera}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

# グローバル変数
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0
CRITICAL_FAILED=0

# ログファイル設定
LOG_DIR="./migration-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
CHECK_LOG="$LOG_DIR/pre_migration_check_${TIMESTAMP}.log"
CHECK_REPORT="$LOG_DIR/pre_migration_report_${TIMESTAMP}.md"

echo "================================================"
echo -e "${BOLD}${BLUE}PostgreSQL移行前最終チェック実行${NC}"
echo "================================================"
echo "実行時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "チェックログ: $CHECK_LOG"
echo "レポート: $CHECK_REPORT"
echo ""

# ログ初期化
cat > "$CHECK_LOG" << EOF
PostgreSQL移行前最終チェック実行ログ
実行時刻: $(date '+%Y-%m-%d %H:%M:%S')
=====================================

EOF

# レポート初期化
cat > "$CHECK_REPORT" << EOF
# PostgreSQL移行前最終チェックレポート

**実行時刻**: $(date '+%Y-%m-%d %H:%M:%S')
**実行者**: $(whoami)
**システム**: $(uname -a)

## チェック結果サマリー

EOF

# チェック関数
check_item() {
    local category="$1"
    local description="$2"
    local command="$3"
    local critical="${4:-false}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "[$TOTAL_CHECKS] $category: $description ... "
    echo "[$TOTAL_CHECKS] $category: $description" >> "$CHECK_LOG"
    
    if eval "$command" >> "$CHECK_LOG" 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        echo "  結果: PASS" >> "$CHECK_LOG"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        echo "- ✅ **$category**: $description" >> "$CHECK_REPORT"
    else
        if [ "$critical" = "true" ]; then
            echo -e "${RED}❌ CRITICAL FAIL${NC}"
            echo "  結果: CRITICAL FAIL" >> "$CHECK_LOG"
            CRITICAL_FAILED=$((CRITICAL_FAILED + 1))
            echo "- ❌ **$category** (CRITICAL): $description" >> "$CHECK_REPORT"
        else
            echo -e "${YELLOW}⚠️  FAIL${NC}"
            echo "  結果: FAIL" >> "$CHECK_LOG"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            echo "- ⚠️ **$category**: $description" >> "$CHECK_REPORT"
        fi
    fi
    echo "" >> "$CHECK_LOG"
}

# 警告チェック関数
check_warning() {
    local category="$1"
    local description="$2"
    local command="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "[$TOTAL_CHECKS] $category: $description ... "
    echo "[$TOTAL_CHECKS] $category: $description" >> "$CHECK_LOG"
    
    if eval "$command" >> "$CHECK_LOG" 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        echo "  結果: OK" >> "$CHECK_LOG"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        echo "- ✅ **$category**: $description" >> "$CHECK_REPORT"
    else
        echo -e "${YELLOW}⚠️  WARNING${NC}"
        echo "  結果: WARNING" >> "$CHECK_LOG"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
        echo "- ⚠️ **$category** (WARNING): $description" >> "$CHECK_REPORT"
    fi
    echo "" >> "$CHECK_LOG"
}

# 1. 基本環境チェック
echo -e "${BLUE}1. 基本環境チェック${NC}"
echo "==================" | tee -a "$CHECK_LOG"

check_item "環境" "Bashバージョン確認" "[ \$(echo \$BASH_VERSION | cut -d. -f1) -ge 4 ]" true
check_item "環境" "Goバージョン確認" "go version | grep -q 'go1\\.1[89]\\|go1\\.[2-9][0-9]'" true
check_item "環境" "Dockerインストール確認" "command -v docker" true
check_item "環境" "Docker Composeインストール確認" "command -v docker-compose" true

# 2. データベース接続確認
echo ""
echo -e "${BLUE}2. データベース接続確認${NC}"
echo "======================" | tee -a "$CHECK_LOG"

check_item "MySQL接続" "MySQL接続テスト" "mysql -h\"$MYSQL_HOST\" -P\"$MYSQL_PORT\" -u\"$MYSQL_USER\" -p\"$MYSQL_PASSWORD\" -e 'SELECT 1;' \"$MYSQL_DATABASE\"" true

check_item "PostgreSQL接続" "PostgreSQL接続テスト" "PGPASSWORD=\"$POSTGRES_PASSWORD\" psql -h\"$POSTGRES_HOST\" -p\"$POSTGRES_PORT\" -U\"$POSTGRES_USER\" -d\"$POSTGRES_DATABASE\" -c 'SELECT 1;'" true

# 3. ディスク容量確認
echo ""
echo -e "${BLUE}3. ディスク容量確認${NC}"
echo "================" | tee -a "$CHECK_LOG"

# MySQLデータサイズ取得
MYSQL_SIZE=$(mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
    -se "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) 
        FROM information_schema.tables 
        WHERE table_schema = '$MYSQL_DATABASE';" 2>/dev/null || echo "0")

# 利用可能ディスク容量確認
if [[ "$OSTYPE" == "darwin"* ]]; then
    AVAILABLE_SPACE=$(df -m /usr/local/var/postgresql 2>/dev/null | awk 'NR==2 {print int($4)}' || echo "999999")
else
    AVAILABLE_SPACE=$(df -m /var/lib/postgresql 2>/dev/null | awk 'NR==2 {print int($4)}' || echo "999999")
fi

REQUIRED_SPACE=$(echo "$MYSQL_SIZE * 3" | bc -l | cut -d. -f1)

check_item "容量" "十分なディスク容量確保" "[ $AVAILABLE_SPACE -gt $REQUIRED_SPACE ]" true

echo "  MySQL データサイズ: ${MYSQL_SIZE} MB" | tee -a "$CHECK_LOG"
echo "  利用可能容量: ${AVAILABLE_SPACE} MB" | tee -a "$CHECK_LOG"
echo "  必要容量（3倍）: ${REQUIRED_SPACE} MB" | tee -a "$CHECK_LOG"

# 4. PostgreSQL設定確認
echo ""
echo -e "${BLUE}4. PostgreSQL設定確認${NC}"
echo "=====================" | tee -a "$CHECK_LOG"

check_item "PG設定" "PostgreSQLバージョン確認" "PGPASSWORD=\"$POSTGRES_PASSWORD\" psql -h\"$POSTGRES_HOST\" -p\"$POSTGRES_PORT\" -U\"$POSTGRES_USER\" -d\"$POSTGRES_DATABASE\" -t -c 'SELECT version();' | grep -q 'PostgreSQL 1[4-9]'" true

check_item "PG設定" "shared_buffers設定確認" "PGPASSWORD=\"$POSTGRES_PASSWORD\" psql -h\"$POSTGRES_HOST\" -p\"$POSTGRES_PORT\" -U\"$POSTGRES_USER\" -d\"$POSTGRES_DATABASE\" -t -c 'SHOW shared_buffers;' | grep -qE '[0-9]+MB|[0-9]+GB'" false

check_item "PG設定" "max_connections設定確認" "PGPASSWORD=\"$POSTGRES_PASSWORD\" psql -h\"$POSTGRES_HOST\" -p\"$POSTGRES_PORT\" -U\"$POSTGRES_USER\" -d\"$POSTGRES_DATABASE\" -t -c 'SHOW max_connections;' | awk '{print \$1}' | xargs test 100 -le" false

check_item "PG設定" "タイムゾーン設定確認" "PGPASSWORD=\"$POSTGRES_PASSWORD\" psql -h\"$POSTGRES_HOST\" -p\"$POSTGRES_PORT\" -U\"$POSTGRES_USER\" -d\"$POSTGRES_DATABASE\" -t -c 'SHOW timezone;' | grep -q 'Asia/Tokyo'" false

# 5. マイグレーションファイル確認
echo ""
echo -e "${BLUE}5. マイグレーションファイル確認${NC}"
echo "===========================" | tee -a "$CHECK_LOG"

check_item "マイグレーション" "マイグレーションファイル存在確認" "[ \$(find migrations/ -name '*.sql' -type f | wc -l) -gt 300 ]" true

check_item "マイグレーション" "PostgreSQL版マイグレーション確認" "[ -d migrations/postgresql-versions/ ]" false

check_item "マイグレーション" "UUIDマイグレーション確認" "grep -q 'gen_random_uuid()' migrations/000001_create_users_table.up.sql 2>/dev/null || grep -q 'gen_random_uuid()' migrations/postgresql-versions/000001_create_users_table.up.postgresql.sql 2>/dev/null" false

# 6. 移行スクリプト確認
echo ""
echo -e "${BLUE}6. 移行スクリプト確認${NC}"
echo "=================" | tee -a "$CHECK_LOG"

check_item "スクリプト" "一括移行コントローラー存在確認" "[ -f scripts/bulk-migration-controller.go ]" true

check_item "スクリプト" "一括移行実行スクリプト存在確認" "[ -f scripts/bulk-migration-executor.sh ]" true

check_item "スクリプト" "性能監視スクリプト存在確認" "[ -f scripts/migration-performance-monitor.sh ]" true

check_item "スクリプト" "データ検証スクリプト存在確認" "[ -f scripts/validate-migration-data.sh ]" true

check_item "スクリプト" "スクリプト実行権限確認" "[ -x scripts/bulk-migration-executor.sh ] && [ -x scripts/migration-performance-monitor.sh ] && [ -x scripts/validate-migration-data.sh ]" true

# 7. Go依存関係確認
echo ""
echo -e "${BLUE}7. Go依存関係確認${NC}"
echo "================" | tee -a "$CHECK_LOG"

# 一時的にGo環境確認
if cd scripts && [ ! -f go.mod ]; then
    go mod init pre-migration-check >/dev/null 2>&1 || true
fi

check_item "Go依存" "MySQLドライバー確認" "cd scripts && go list -m github.com/go-sql-driver/mysql >/dev/null 2>&1 || (go get github.com/go-sql-driver/mysql >/dev/null 2>&1 && go list -m github.com/go-sql-driver/mysql >/dev/null 2>&1)" true

check_item "Go依存" "PostgreSQLドライバー確認" "cd scripts && go list -m github.com/lib/pq >/dev/null 2>&1 || (go get github.com/lib/pq >/dev/null 2>&1 && go list -m github.com/lib/pq >/dev/null 2>&1)" true

check_item "Go依存" "移行コントローラーコンパイル確認" "cd scripts && go build -o /tmp/migration-controller-test bulk-migration-controller.go && rm -f /tmp/migration-controller-test" true

# Go環境クリーンアップ
if cd scripts && [ -f go.mod ] && grep -q "pre-migration-check" go.mod; then
    rm -f go.mod go.sum >/dev/null 2>&1 || true
fi

# 8. 設定ファイル確認
echo ""
echo -e "${BLUE}8. 設定ファイル確認${NC}"
echo "================" | tee -a "$CHECK_LOG"

check_item "設定" "PostgreSQL移行用設定存在確認" "[ -f config/postgresql-migration.conf ]" false

check_item "設定" "PostgreSQL本番用設定存在確認" "[ -f config/postgresql-production.conf ]" false

check_warning "設定" "環境変数MYSQL_PASSWORD設定確認" "[ -n \"\$MYSQL_PASSWORD\" ]"

check_warning "設定" "環境変数POSTGRES_PASSWORD設定確認" "[ -n \"\$POSTGRES_PASSWORD\" ]"

# 9. ネットワーク・セキュリティ確認
echo ""
echo -e "${BLUE}9. ネットワーク・セキュリティ確認${NC}"
echo "===========================" | tee -a "$CHECK_LOG"

check_item "ネットワーク" "MySQLポート接続確認" "nc -z \"$MYSQL_HOST\" \"$MYSQL_PORT\" 2>/dev/null || timeout 5 bash -c \"</dev/tcp/$MYSQL_HOST/$MYSQL_PORT\"" true

check_item "ネットワーク" "PostgreSQLポート接続確認" "nc -z \"$POSTGRES_HOST\" \"$POSTGRES_PORT\" 2>/dev/null || timeout 5 bash -c \"</dev/tcp/$POSTGRES_HOST/$POSTGRES_PORT\"" true

check_warning "セキュリティ" "PostgreSQL SSL設定確認" "PGPASSWORD=\"$POSTGRES_PASSWORD\" psql -h\"$POSTGRES_HOST\" -p\"$POSTGRES_PORT\" -U\"$POSTGRES_USER\" -d\"$POSTGRES_DATABASE\" -t -c 'SHOW ssl;' | grep -q 'on'"

# 10. システムリソース確認
echo ""
echo -e "${BLUE}10. システムリソース確認${NC}"
echo "======================" | tee -a "$CHECK_LOG"

# CPU コア数確認
if [[ "$OSTYPE" == "darwin"* ]]; then
    CPU_CORES=$(sysctl -n hw.ncpu)
else
    CPU_CORES=$(nproc)
fi

check_item "リソース" "十分なCPUコア数確認" "[ $CPU_CORES -ge 4 ]" false

# メモリ確認
if [[ "$OSTYPE" == "darwin"* ]]; then
    TOTAL_MEM_GB=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
else
    TOTAL_MEM_GB=$(free -g | awk '/^Mem:/ {print $2}')
fi

check_item "リソース" "十分なメモリ確認" "[ $TOTAL_MEM_GB -ge 8 ]" false

echo "  CPU コア数: $CPU_CORES" | tee -a "$CHECK_LOG"
echo "  総メモリ: ${TOTAL_MEM_GB}GB" | tee -a "$CHECK_LOG"

# 11. データベース状態確認
echo ""
echo -e "${BLUE}11. データベース状態確認${NC}"
echo "======================" | tee -a "$CHECK_LOG"

# MySQLテーブル数確認
MYSQL_TABLES=$(mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
    -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$MYSQL_DATABASE';" 2>/dev/null || echo "0")

check_item "データ状態" "MySQLテーブル存在確認" "[ $MYSQL_TABLES -gt 20 ]" true

# PostgreSQLテーブル数確認（移行済みの場合）
PG_TABLES=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h"$POSTGRES_HOST" -p"$POSTGRES_PORT" \
    -U"$POSTGRES_USER" -d"$POSTGRES_DATABASE" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")

if [ "$PG_TABLES" -gt 0 ]; then
    check_warning "データ状態" "PostgreSQL既存テーブル確認" "[ $PG_TABLES -eq 0 ]"
fi

echo "  MySQL テーブル数: $MYSQL_TABLES" | tee -a "$CHECK_LOG"
echo "  PostgreSQL テーブル数: $PG_TABLES" | tee -a "$CHECK_LOG"

# 12. 最終準備確認
echo ""
echo -e "${BLUE}12. 最終準備確認${NC}"
echo "================" | tee -a "$CHECK_LOG"

check_item "準備" "ログディレクトリ存在確認" "[ -d migration-logs/ ]" true

check_item "準備" "ドキュメント存在確認" "[ -f docs/pre-migration-final-checklist.md ]" true

check_item "準備" "移行計画書存在確認" "[ -f docs/migration-downtime-plan.md ]" true

check_warning "準備" "バックアップディレクトリ準備" "[ -d backups/ ] || mkdir -p backups/"

# 結果サマリー
echo ""
echo "================================================"
echo -e "${BOLD}${BLUE}チェック結果サマリー${NC}"
echo "================================================"

PASS_RATE=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc -l)

echo "総チェック項目数: $TOTAL_CHECKS"
echo -e "成功: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "失敗: ${RED}$FAILED_CHECKS${NC}"
echo -e "警告: ${YELLOW}$WARNING_CHECKS${NC}"
echo -e "重要失敗: ${RED}$CRITICAL_FAILED${NC}"
echo -e "成功率: ${GREEN}${PASS_RATE}%${NC}"

# レポート完成
cat >> "$CHECK_REPORT" << EOF

## 詳細結果

**総チェック項目数**: $TOTAL_CHECKS
**成功**: $PASSED_CHECKS
**失敗**: $FAILED_CHECKS  
**警告**: $WARNING_CHECKS
**重要失敗**: $CRITICAL_FAILED
**成功率**: ${PASS_RATE}%

## システム情報

**MySQL データサイズ**: ${MYSQL_SIZE} MB
**利用可能ディスク容量**: ${AVAILABLE_SPACE} MB
**CPU コア数**: $CPU_CORES
**総メモリ**: ${TOTAL_MEM_GB}GB
**MySQL テーブル数**: $MYSQL_TABLES
**PostgreSQL テーブル数**: $PG_TABLES

## 推奨事項

EOF

# 判定と推奨事項
echo ""
echo -e "${BOLD}判定結果:${NC}"

if [ $CRITICAL_FAILED -gt 0 ]; then
    echo -e "${RED}🚨 CRITICAL FAILURE - 移行実行不可${NC}"
    echo -e "${RED}重要な前提条件が満たされていません。修正が必要です。${NC}"
    echo "- ❌ **判定**: 移行実行不可" >> "$CHECK_REPORT"
    echo "- 🚨 **理由**: 重要な前提条件未満たし" >> "$CHECK_REPORT"
    echo "- 🔧 **対応**: 重要失敗項目の修正が必須" >> "$CHECK_REPORT"
    exit 1
elif [ $FAILED_CHECKS -gt 5 ]; then
    echo -e "${YELLOW}⚠️  WARNING - 要注意${NC}"
    echo -e "${YELLOW}多数の問題があります。リスクを評価してください。${NC}"
    echo "- ⚠️ **判定**: 要注意 - リスク評価必要" >> "$CHECK_REPORT"
    echo "- 📊 **失敗項目**: ${FAILED_CHECKS}件" >> "$CHECK_REPORT"
    echo "- 🔍 **対応**: 失敗項目の優先度評価と修正検討" >> "$CHECK_REPORT"
elif [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  CAUTION - 注意${NC}"
    echo -e "${YELLOW}いくつかの問題があります。修正を推奨します。${NC}"
    echo "- ⚠️ **判定**: 注意 - 修正推奨" >> "$CHECK_REPORT"
    echo "- 📊 **失敗項目**: ${FAILED_CHECKS}件" >> "$CHECK_REPORT"
    echo "- 🔧 **対応**: 可能な限り修正してから移行実行" >> "$CHECK_REPORT"
else
    echo -e "${GREEN}✅ READY - 移行実行可能${NC}"
    echo -e "${GREEN}技術的準備が完了しています。移行を実行できます。${NC}"
    echo "- ✅ **判定**: 移行実行可能" >> "$CHECK_REPORT"
    echo "- 🎯 **成功率**: ${PASS_RATE}%" >> "$CHECK_REPORT"
    echo "- 🚀 **対応**: 移行実行準備完了" >> "$CHECK_REPORT"
fi

# 次のステップ
echo ""
echo -e "${BOLD}次のステップ:${NC}"
if [ $CRITICAL_FAILED -gt 0 ] || [ $FAILED_CHECKS -gt 5 ]; then
    echo "1. ❌ 重要失敗項目の修正"
    echo "2. 🔄 チェックスクリプト再実行"
    echo "3. 📋 修正確認後に移行判定"
else
    echo "1. 📋 手動チェックリスト項目確認"
    echo "2. 👥 チーム最終確認会議"
    echo "3. 📅 移行実行スケジュール確定"
    echo "4. 🚀 移行実行開始"
fi

cat >> "$CHECK_REPORT" << EOF

## 次のステップ

1. 詳細ログファイルの確認: \`$CHECK_LOG\`
2. 失敗項目の個別確認と修正
3. 手動チェックリスト項目の実行
4. チーム最終確認会議の実施

**生成日時**: $(date '+%Y-%m-%d %H:%M:%S')
**実行者**: $(whoami)

EOF

echo ""
echo "詳細ログ: $CHECK_LOG"
echo "レポート: $CHECK_REPORT"
echo ""
echo -e "${GREEN}自動チェック完了${NC}"

# 終了コード
if [ $CRITICAL_FAILED -gt 0 ]; then
    exit 1
elif [ $FAILED_CHECKS -gt 5 ]; then
    exit 2
elif [ $FAILED_CHECKS -gt 0 ]; then
    exit 3
else
    exit 0
fi