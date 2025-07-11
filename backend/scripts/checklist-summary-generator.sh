#!/bin/bash

# checklist-summary-generator.sh
# PostgreSQL移行前チェックリスト要約レポート生成

set -euo pipefail

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ログディレクトリ
LOG_DIR="./migration-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
SUMMARY_REPORT="$LOG_DIR/migration_readiness_summary_${TIMESTAMP}.md"

echo "================================================"
echo -e "${BOLD}${BLUE}PostgreSQL移行準備状況サマリー生成${NC}"
echo "================================================"
echo ""

# 環境情報収集
collect_environment_info() {
    echo -e "${BLUE}環境情報収集中...${NC}"
    
    # システム情報
    OS_INFO=$(uname -a)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        CPU_CORES=$(sysctl -n hw.ncpu)
        TOTAL_MEM_GB=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
    else
        CPU_CORES=$(nproc)
        TOTAL_MEM_GB=$(free -g | awk '/^Mem:/ {print $2}')
    fi
    
    # Go バージョン
    GO_VERSION=$(go version 2>/dev/null | awk '{print $3}' || echo "未インストール")
    
    # Docker バージョン
    DOCKER_VERSION=$(docker --version 2>/dev/null | awk '{print $3}' | sed 's/,//' || echo "未インストール")
    
    # データベース接続確認
    MYSQL_STATUS="❌ 接続失敗"
    if mysql -h"${MYSQL_HOST:-localhost}" -P"${MYSQL_PORT:-3306}" -u"${MYSQL_USER:-root}" -p"${MYSQL_PASSWORD}" \
       -e "SELECT 1;" "${MYSQL_DATABASE:-monstera}" >/dev/null 2>&1; then
        MYSQL_STATUS="✅ 接続成功"
        MYSQL_VERSION=$(mysql -h"${MYSQL_HOST:-localhost}" -P"${MYSQL_PORT:-3306}" -u"${MYSQL_USER:-root}" -p"${MYSQL_PASSWORD}" \
            -se "SELECT VERSION();" 2>/dev/null | head -1)
        MYSQL_DATA_SIZE=$(mysql -h"${MYSQL_HOST:-localhost}" -P"${MYSQL_PORT:-3306}" -u"${MYSQL_USER:-root}" -p"${MYSQL_PASSWORD}" \
            -se "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) 
                FROM information_schema.tables 
                WHERE table_schema = '${MYSQL_DATABASE:-monstera}';" 2>/dev/null)
        MYSQL_TABLE_COUNT=$(mysql -h"${MYSQL_HOST:-localhost}" -P"${MYSQL_PORT:-3306}" -u"${MYSQL_USER:-root}" -p"${MYSQL_PASSWORD}" \
            -se "SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = '${MYSQL_DATABASE:-monstera}';" 2>/dev/null)
    else
        MYSQL_VERSION="接続不可"
        MYSQL_DATA_SIZE="不明"
        MYSQL_TABLE_COUNT="不明"
    fi
    
    POSTGRES_STATUS="❌ 接続失敗"
    if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h"${POSTGRES_HOST:-localhost}" -p"${POSTGRES_PORT:-5432}" \
       -U"${POSTGRES_USER:-postgres}" -d"${POSTGRES_DATABASE:-monstera}" -c "SELECT 1;" >/dev/null 2>&1; then
        POSTGRES_STATUS="✅ 接続成功"
        POSTGRES_VERSION=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h"${POSTGRES_HOST:-localhost}" -p"${POSTGRES_PORT:-5432}" \
            -U"${POSTGRES_USER:-postgres}" -d"${POSTGRES_DATABASE:-monstera}" -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
        PG_TABLE_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h"${POSTGRES_HOST:-localhost}" -p"${POSTGRES_PORT:-5432}" \
            -U"${POSTGRES_USER:-postgres}" -d"${POSTGRES_DATABASE:-monstera}" -t -c \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    else
        POSTGRES_VERSION="接続不可"
        PG_TABLE_COUNT="不明"
    fi
}

# ファイル・スクリプト存在確認
check_files_and_scripts() {
    echo -e "${BLUE}ファイル・スクリプト確認中...${NC}"
    
    # 重要ドキュメント
    CHECKLIST_DOC="❌"
    [ -f "docs/pre-migration-final-checklist.md" ] && CHECKLIST_DOC="✅"
    
    MIGRATION_PLAN="❌"
    [ -f "docs/migration-downtime-plan.md" ] && MIGRATION_PLAN="✅"
    
    BULK_OPTIMIZATION="❌"
    [ -f "docs/bulk-data-migration-optimization.md" ] && BULK_OPTIMIZATION="✅"
    
    # 移行スクリプト
    BULK_CONTROLLER="❌"
    [ -f "scripts/bulk-migration-controller.go" ] && BULK_CONTROLLER="✅"
    
    BULK_EXECUTOR="❌"
    [ -f "scripts/bulk-migration-executor.sh" ] && [ -x "scripts/bulk-migration-executor.sh" ] && BULK_EXECUTOR="✅"
    
    PERFORMANCE_MONITOR="❌"
    [ -f "scripts/migration-performance-monitor.sh" ] && [ -x "scripts/migration-performance-monitor.sh" ] && PERFORMANCE_MONITOR="✅"
    
    DATA_VALIDATOR="❌"
    [ -f "scripts/validate-migration-data.sh" ] && [ -x "scripts/validate-migration-data.sh" ] && DATA_VALIDATOR="✅"
    
    BENCHMARK_SCRIPT="❌"
    [ -f "scripts/migration-benchmark.sh" ] && [ -x "scripts/migration-benchmark.sh" ] && BENCHMARK_SCRIPT="✅"
    
    PRE_CHECKER="❌"
    [ -f "scripts/pre-migration-checker.sh" ] && [ -x "scripts/pre-migration-checker.sh" ] && PRE_CHECKER="✅"
    
    INTERACTIVE_CHECKLIST="❌"
    [ -f "scripts/interactive-checklist.sh" ] && [ -x "scripts/interactive-checklist.sh" ] && INTERACTIVE_CHECKLIST="✅"
    
    # 設定ファイル
    PG_MIGRATION_CONF="❌"
    [ -f "config/postgresql-migration.conf" ] && PG_MIGRATION_CONF="✅"
    
    PG_PRODUCTION_CONF="❌"
    [ -f "config/postgresql-production.conf" ] && PG_PRODUCTION_CONF="✅"
    
    # マイグレーションファイル
    MIGRATION_FILES=$(find migrations/ -name "*.sql" -type f | wc -l 2>/dev/null || echo "0")
    MIGRATION_STATUS="❌"
    [ "$MIGRATION_FILES" -gt 300 ] && MIGRATION_STATUS="✅"
    
    POSTGRESQL_MIGRATIONS="❌"
    [ -d "migrations/postgresql-versions/" ] && POSTGRESQL_MIGRATIONS="✅"
}

# Go依存関係確認
check_go_dependencies() {
    echo -e "${BLUE}Go依存関係確認中...${NC}"
    
    GO_BUILD_STATUS="❌"
    if cd scripts 2>/dev/null; then
        if [ ! -f go.mod ]; then
            go mod init temp-check >/dev/null 2>&1 || true
        fi
        
        if go get github.com/go-sql-driver/mysql >/dev/null 2>&1 && \
           go get github.com/lib/pq >/dev/null 2>&1 && \
           go build -o /tmp/temp-migration-test bulk-migration-controller.go >/dev/null 2>&1; then
            GO_BUILD_STATUS="✅"
            rm -f /tmp/temp-migration-test
        fi
        
        # クリーンアップ
        if grep -q "temp-check" go.mod 2>/dev/null; then
            rm -f go.mod go.sum 2>/dev/null || true
        fi
        
        cd .. >/dev/null 2>&1 || true
    fi
}

# 最新チェック結果確認
check_recent_results() {
    echo -e "${BLUE}最新チェック結果確認中...${NC}"
    
    # 自動チェック結果
    LATEST_AUTO_CHECK=""
    LATEST_AUTO_STATUS="未実行"
    if [ -d "$LOG_DIR" ]; then
        LATEST_AUTO_LOG=$(ls -1t "$LOG_DIR"/pre_migration_check_*.log 2>/dev/null | head -1 || echo "")
        if [ -n "$LATEST_AUTO_LOG" ]; then
            LATEST_AUTO_CHECK=$(basename "$LATEST_AUTO_LOG" .log | sed 's/pre_migration_check_//')
            if grep -q "READY - 移行実行可能" "$LATEST_AUTO_LOG" 2>/dev/null; then
                LATEST_AUTO_STATUS="✅ 実行可能"
            elif grep -q "CRITICAL FAILURE" "$LATEST_AUTO_LOG" 2>/dev/null; then
                LATEST_AUTO_STATUS="❌ 重要失敗"
            elif grep -q "WARNING" "$LATEST_AUTO_LOG" 2>/dev/null; then
                LATEST_AUTO_STATUS="⚠️ 要注意"
            else
                LATEST_AUTO_STATUS="⚠️ 不明"
            fi
        fi
    fi
    
    # インタラクティブチェック結果
    LATEST_INTERACTIVE_CHECK=""
    LATEST_INTERACTIVE_STATUS="未実行"
    if [ -d "$LOG_DIR" ]; then
        LATEST_INTERACTIVE_LOG=$(ls -1t "$LOG_DIR"/interactive_checklist_*.log 2>/dev/null | head -1 || echo "")
        if [ -n "$LATEST_INTERACTIVE_LOG" ]; then
            LATEST_INTERACTIVE_CHECK=$(basename "$LATEST_INTERACTIVE_LOG" .log | sed 's/interactive_checklist_//')
            LATEST_INTERACTIVE_REPORT=$(ls -1t "$LOG_DIR"/checklist_completion_*.md 2>/dev/null | head -1 || echo "")
            if [ -n "$LATEST_INTERACTIVE_REPORT" ]; then
                if grep -q "移行実行可能" "$LATEST_INTERACTIVE_REPORT" 2>/dev/null; then
                    LATEST_INTERACTIVE_STATUS="✅ 実行可能"
                elif grep -q "条件付き移行可能" "$LATEST_INTERACTIVE_REPORT" 2>/dev/null; then
                    LATEST_INTERACTIVE_STATUS="⚠️ 条件付き可能"
                elif grep -q "移行実行不可" "$LATEST_INTERACTIVE_REPORT" 2>/dev/null; then
                    LATEST_INTERACTIVE_STATUS="❌ 実行不可"
                else
                    LATEST_INTERACTIVE_STATUS="⚠️ 不明"
                fi
            fi
        fi
    fi
}

# 情報収集実行
collect_environment_info
check_files_and_scripts
check_go_dependencies
check_recent_results

# レポート生成
echo -e "${BLUE}サマリーレポート生成中...${NC}"

cat > "$SUMMARY_REPORT" << EOF
# PostgreSQL移行準備状況サマリーレポート

**生成日時**: $(date '+%Y-%m-%d %H:%M:%S')
**生成者**: $(whoami)
**システム**: $OS_INFO

## 🎯 移行準備ステータス

### 総合評価

EOF

# 総合評価判定
CRITICAL_ISSUES=0
WARNINGS=0

# クリティカル判定
[ "$MYSQL_STATUS" = "❌ 接続失敗" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
[ "$POSTGRES_STATUS" = "❌ 接続失敗" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
[ "$BULK_CONTROLLER" = "❌" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
[ "$BULK_EXECUTOR" = "❌" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
[ "$GO_BUILD_STATUS" = "❌" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
[ "$MIGRATION_STATUS" = "❌" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))

# 警告判定
[ "$CHECKLIST_DOC" = "❌" ] && WARNINGS=$((WARNINGS + 1))
[ "$MIGRATION_PLAN" = "❌" ] && WARNINGS=$((WARNINGS + 1))
[ "$PERFORMANCE_MONITOR" = "❌" ] && WARNINGS=$((WARNINGS + 1))
[ "$DATA_VALIDATOR" = "❌" ] && WARNINGS=$((WARNINGS + 1))
[ "$PG_MIGRATION_CONF" = "❌" ] && WARNINGS=$((WARNINGS + 1))

# 総合判定
if [ $CRITICAL_ISSUES -eq 0 ] && [ $WARNINGS -le 2 ]; then
    OVERALL_STATUS="🟢 **READY** - 移行実行準備完了"
    OVERALL_COLOR="green"
elif [ $CRITICAL_ISSUES -eq 0 ]; then
    OVERALL_STATUS="🟡 **CAUTION** - 注意事項あり"
    OVERALL_COLOR="yellow"
elif [ $CRITICAL_ISSUES -le 2 ]; then
    OVERALL_STATUS="🟠 **WARNING** - 重要課題あり"
    OVERALL_COLOR="orange"
else
    OVERALL_STATUS="🔴 **CRITICAL** - 移行実行不可"
    OVERALL_COLOR="red"
fi

cat >> "$SUMMARY_REPORT" << EOF
$OVERALL_STATUS

**重要課題数**: $CRITICAL_ISSUES
**警告事項数**: $WARNINGS

## 📊 環境確認状況

### システム環境

| 項目 | 状況 | 詳細 |
|------|------|------|
| OS | ✅ | $OS_INFO |
| CPU コア数 | ✅ | $CPU_CORES cores |
| メモリ | ✅ | ${TOTAL_MEM_GB}GB |
| Go バージョン | ✅ | $GO_VERSION |
| Docker | ✅ | $DOCKER_VERSION |

### データベース接続

| データベース | 接続状況 | バージョン | 詳細情報 |
|--------------|----------|------------|----------|
| MySQL | $MYSQL_STATUS | $MYSQL_VERSION | データ: ${MYSQL_DATA_SIZE}MB, テーブル: ${MYSQL_TABLE_COUNT}個 |
| PostgreSQL | $POSTGRES_STATUS | $POSTGRES_VERSION | テーブル: ${PG_TABLE_COUNT}個 |

## 📁 ファイル・スクリプト準備状況

### 重要ドキュメント

| ドキュメント | 状況 |
|--------------|------|
| 移行前最終チェックリスト | $CHECKLIST_DOC |
| 移行ダウンタイム計画書 | $MIGRATION_PLAN |
| 一括移行最適化仕様書 | $BULK_OPTIMIZATION |

### 移行スクリプト

| スクリプト | 状況 | 説明 |
|------------|------|------|
| 一括移行コントローラー | $BULK_CONTROLLER | Go製高性能移行ツール |
| 一括移行実行スクリプト | $BULK_EXECUTOR | 移行自動化スクリプト |
| 性能監視スクリプト | $PERFORMANCE_MONITOR | リアルタイム監視 |
| データ検証スクリプト | $DATA_VALIDATOR | 整合性検証 |
| ベンチマークスクリプト | $BENCHMARK_SCRIPT | 性能測定 |
| 移行前チェッカー | $PRE_CHECKER | 自動事前確認 |
| インタラクティブチェックリスト | $INTERACTIVE_CHECKLIST | 手動確認支援 |

### 設定ファイル

| 設定ファイル | 状況 | 用途 |
|--------------|------|------|
| PostgreSQL移行設定 | $PG_MIGRATION_CONF | 移行時最適化設定 |
| PostgreSQL本番設定 | $PG_PRODUCTION_CONF | 本番運用設定 |

### マイグレーションファイル

| 項目 | 状況 | 詳細 |
|------|------|------|
| マイグレーションファイル数 | $MIGRATION_STATUS | ${MIGRATION_FILES}個のファイル |
| PostgreSQL版マイグレーション | $POSTGRESQL_MIGRATIONS | 専用ディレクトリ |

## 🛠️ 技術準備状況

### Go開発環境

| 項目 | 状況 | 説明 |
|------|------|------|
| Go依存関係・ビルド | $GO_BUILD_STATUS | MySQL・PostgreSQLドライバー |

## 📈 最新チェック結果

### 自動チェック (pre-migration-checker.sh)

EOF

if [ -n "$LATEST_AUTO_CHECK" ]; then
    cat >> "$SUMMARY_REPORT" << EOF
**最終実行**: $LATEST_AUTO_CHECK
**結果**: $LATEST_AUTO_STATUS

EOF
else
    cat >> "$SUMMARY_REPORT" << EOF
**実行状況**: 未実行
**推奨**: \`./scripts/pre-migration-checker.sh\` を実行してください

EOF
fi

cat >> "$SUMMARY_REPORT" << EOF
### インタラクティブチェック (interactive-checklist.sh)

EOF

if [ -n "$LATEST_INTERACTIVE_CHECK" ]; then
    cat >> "$SUMMARY_REPORT" << EOF
**最終実行**: $LATEST_INTERACTIVE_CHECK
**結果**: $LATEST_INTERACTIVE_STATUS

EOF
else
    cat >> "$SUMMARY_REPORT" << EOF
**実行状況**: 未実行
**推奨**: \`./scripts/interactive-checklist.sh\` を実行してください

EOF
fi

# 推奨アクション
cat >> "$SUMMARY_REPORT" << EOF
## 🎯 推奨アクション

### 即座に対応が必要（CRITICAL）

EOF

if [ $CRITICAL_ISSUES -gt 0 ]; then
    [ "$MYSQL_STATUS" = "❌ 接続失敗" ] && echo "- ❌ **MySQL接続修正**: 接続情報・権限を確認してください" >> "$SUMMARY_REPORT"
    [ "$POSTGRES_STATUS" = "❌ 接続失敗" ] && echo "- ❌ **PostgreSQL接続修正**: 接続情報・権限を確認してください" >> "$SUMMARY_REPORT"
    [ "$BULK_CONTROLLER" = "❌" ] && echo "- ❌ **移行コントローラー作成**: \`scripts/bulk-migration-controller.go\` を作成してください" >> "$SUMMARY_REPORT"
    [ "$BULK_EXECUTOR" = "❌" ] && echo "- ❌ **移行実行スクリプト作成**: \`scripts/bulk-migration-executor.sh\` を作成してください" >> "$SUMMARY_REPORT"
    [ "$GO_BUILD_STATUS" = "❌" ] && echo "- ❌ **Go環境修正**: 依存関係のインストールとビルド確認を行ってください" >> "$SUMMARY_REPORT"
    [ "$MIGRATION_STATUS" = "❌" ] && echo "- ❌ **マイグレーションファイル確認**: 300個以上のマイグレーションファイルを確認してください" >> "$SUMMARY_REPORT"
else
    echo "✅ 重要課題はありません" >> "$SUMMARY_REPORT"
fi

cat >> "$SUMMARY_REPORT" << EOF

### 推奨事項（WARNING）

EOF

if [ $WARNINGS -gt 0 ]; then
    [ "$CHECKLIST_DOC" = "❌" ] && echo "- ⚠️ **チェックリスト作成**: \`docs/pre-migration-final-checklist.md\` を作成してください" >> "$SUMMARY_REPORT"
    [ "$MIGRATION_PLAN" = "❌" ] && echo "- ⚠️ **移行計画書作成**: \`docs/migration-downtime-plan.md\` を作成してください" >> "$SUMMARY_REPORT"
    [ "$PERFORMANCE_MONITOR" = "❌" ] && echo "- ⚠️ **監視スクリプト作成**: \`scripts/migration-performance-monitor.sh\` を作成してください" >> "$SUMMARY_REPORT"
    [ "$DATA_VALIDATOR" = "❌" ] && echo "- ⚠️ **検証スクリプト作成**: \`scripts/validate-migration-data.sh\` を作成してください" >> "$SUMMARY_REPORT"
    [ "$PG_MIGRATION_CONF" = "❌" ] && echo "- ⚠️ **PostgreSQL設定作成**: \`config/postgresql-migration.conf\` を作成してください" >> "$SUMMARY_REPORT"
else
    echo "✅ 重要な警告事項はありません" >> "$SUMMARY_REPORT"
fi

cat >> "$SUMMARY_REPORT" << EOF

### 次のステップ

EOF

if [ $CRITICAL_ISSUES -eq 0 ] && [ $WARNINGS -le 2 ]; then
    cat >> "$SUMMARY_REPORT" << EOF
1. ✅ **自動チェック実行**: \`./scripts/pre-migration-checker.sh\`
2. 📋 **手動チェック実行**: \`./scripts/interactive-checklist.sh\`
3. 👥 **チーム最終確認会議**
4. 📅 **移行実行日時確定**
5. 🚀 **移行実行開始**
EOF
elif [ $CRITICAL_ISSUES -eq 0 ]; then
    cat >> "$SUMMARY_REPORT" << EOF
1. ⚠️ **警告事項の修正**: 上記推奨事項の対応
2. 🔄 **再チェック実行**: 修正後に本スクリプト再実行
3. ✅ **自動チェック実行**: \`./scripts/pre-migration-checker.sh\`
4. 📋 **手動チェック実行**: \`./scripts/interactive-checklist.sh\`
EOF
else
    cat >> "$SUMMARY_REPORT" << EOF
1. ❌ **重要課題の修正**: 上記CRITICAL項目の対応（必須）
2. 🔄 **再チェック実行**: 修正後に本スクリプト再実行
3. 📋 **課題解決確認**: 全CRITICAL項目の解決確認
EOF
fi

cat >> "$SUMMARY_REPORT" << EOF

## 📞 サポート情報

### チェックスクリプト実行方法

\`\`\`bash
# 自動技術チェック
./scripts/pre-migration-checker.sh

# 手動項目チェック
./scripts/interactive-checklist.sh

# 準備状況サマリー
./scripts/checklist-summary-generator.sh
\`\`\`

### ログファイル場所

- **自動チェックログ**: \`migration-logs/pre_migration_check_*.log\`
- **手動チェックログ**: \`migration-logs/interactive_checklist_*.log\`
- **サマリーレポート**: \`migration-logs/migration_readiness_summary_*.md\`

### 移行実行コマンド

\`\`\`bash
# 移行実行（準備完了後）
./scripts/bulk-migration-executor.sh

# 性能監視（別ターミナル）
./scripts/migration-performance-monitor.sh 3600 30
\`\`\`

---

**このレポートは移行準備状況の概要です。詳細な確認は個別のチェックスクリプトを実行してください。**

**生成日時**: $(date '+%Y-%m-%d %H:%M:%S')
EOF

# 結果表示
echo ""
echo "================================================"
echo -e "${BOLD}${BLUE}サマリーレポート生成完了${NC}"
echo "================================================"
echo ""
echo -e "${BOLD}総合評価:${NC} $OVERALL_STATUS"
echo -e "重要課題: ${RED}$CRITICAL_ISSUES件${NC}"
echo -e "警告事項: ${YELLOW}$WARNINGS件${NC}"
echo ""
echo "レポートファイル: $SUMMARY_REPORT"
echo ""

if [ $CRITICAL_ISSUES -eq 0 ] && [ $WARNINGS -le 2 ]; then
    echo -e "${GREEN}🎉 移行準備が整っています！${NC}"
    echo -e "${GREEN}次は自動チェックと手動チェックを実行してください。${NC}"
elif [ $CRITICAL_ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  いくつかの推奨事項があります。${NC}"
    echo -e "${YELLOW}可能な限り対応してから移行を実行してください。${NC}"
else
    echo -e "${RED}❌ 重要な課題があります。${NC}"
    echo -e "${RED}移行実行前に必ず修正してください。${NC}"
fi

echo ""
echo -e "${CYAN}推奨次ステップ:${NC}"
if [ $CRITICAL_ISSUES -eq 0 ]; then
    echo "1. ./scripts/pre-migration-checker.sh"
    echo "2. ./scripts/interactive-checklist.sh"
else
    echo "1. 重要課題の修正"
    echo "2. ./scripts/checklist-summary-generator.sh（再実行）"
fi

exit 0