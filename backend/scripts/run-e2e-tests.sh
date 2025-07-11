#!/bin/bash

# エンドツーエンドテスト実行スクリプト
# 経理システムの包括的なE2Eテストを実行します

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# スクリプト設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_OUTPUT_DIR="$PROJECT_ROOT/test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ログファイル設定
LOG_FILE="$TEST_OUTPUT_DIR/e2e_test_$TIMESTAMP.log"
SUMMARY_FILE="$TEST_OUTPUT_DIR/e2e_summary_$TIMESTAMP.md"

# テスト設定
TEST_TIMEOUT=600  # 10分
VERBOSE=${VERBOSE:-false}
SKIP_SETUP=${SKIP_SETUP:-false}
RUN_PERFORMANCE=${RUN_PERFORMANCE:-true}

echo -e "${BLUE}🧪 Monstera経理システム E2Eテストスイート${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# ヘルプ表示
show_help() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  -h, --help              このヘルプを表示"
    echo "  -v, --verbose           詳細ログを表示"
    echo "  -s, --skip-setup        環境セットアップをスキップ"
    echo "  -f, --fast              高速モード（パフォーマンステストをスキップ）"
    echo "  -t, --timeout SECONDS   テストタイムアウト（デフォルト: 600秒）"
    echo "  --smoke-only            スモークテストのみ実行"
    echo "  --integration-only      統合テストのみ実行"
    echo "  --performance-only      パフォーマンステストのみ実行"
    echo ""
    echo "例:"
    echo "  $0 -v                   # 詳細ログ付きで全テスト実行"
    echo "  $0 -f                   # 高速モードで実行"
    echo "  $0 --smoke-only         # スモークテストのみ実行"
    echo ""
}

# コマンドライン引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -s|--skip-setup)
            SKIP_SETUP=true
            shift
            ;;
        -f|--fast)
            RUN_PERFORMANCE=false
            shift
            ;;
        -t|--timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --smoke-only)
            TEST_MODE="smoke"
            shift
            ;;
        --integration-only)
            TEST_MODE="integration"
            shift
            ;;
        --performance-only)
            TEST_MODE="performance"
            shift
            ;;
        *)
            echo -e "${RED}❌ 不明なオプション: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# ログディレクトリの作成
mkdir -p "$TEST_OUTPUT_DIR"

# ログ関数
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "$1" | tee -a "$LOG_FILE"
    else
        echo -e "$1" >> "$LOG_FILE"
    fi
}

# エラーハンドリング
handle_error() {
    local exit_code=$?
    log "${RED}❌ エラーが発生しました (終了コード: $exit_code)${NC}"
    log "${YELLOW}詳細なログは $LOG_FILE を参照してください${NC}"
    exit $exit_code
}

trap 'handle_error' ERR

# 開始時刻記録
START_TIME=$(date +%s)
log "${GREEN}🚀 E2Eテスト開始: $(date)${NC}"
log "📁 作業ディレクトリ: $PROJECT_ROOT"
log "📝 ログファイル: $LOG_FILE"
log ""

# 環境セットアップ
setup_environment() {
    if [ "$SKIP_SETUP" = true ]; then
        log "${YELLOW}⏭️  環境セットアップをスキップしました${NC}"
        return 0
    fi

    log "${BLUE}🛠️  環境セットアップ中...${NC}"
    
    # Go環境確認
    if ! command -v go &> /dev/null; then
        log "${RED}❌ Goがインストールされていません${NC}"
        exit 1
    fi
    
    GO_VERSION=$(go version | cut -d' ' -f3)
    log_verbose "   Go バージョン: $GO_VERSION"
    
    # 依存関係の確認
    log_verbose "   依存関係の確認中..."
    cd "$PROJECT_ROOT"
    go mod tidy &>> "$LOG_FILE"
    go mod download &>> "$LOG_FILE"
    
    # テスト用環境変数の設定
    export GO_ENV=test
    export DB_DRIVER=mysql
    export DB_HOST=localhost
    export DB_PORT=3306
    export DB_USER=root
    export DB_PASSWORD=password
    export DB_NAME=monstera_test
    
    log "${GREEN}✅ 環境セットアップ完了${NC}"
}

# データベースセットアップ
setup_database() {
    log "${BLUE}🗄️  データベースセットアップ中...${NC}"
    
    # Docker Composeでデータベース起動確認
    if command -v docker-compose &> /dev/null; then
        if docker-compose ps mysql | grep -q "Up"; then
            log_verbose "   MySQLコンテナが稼働中"
        else
            log "${YELLOW}⚠️  MySQLコンテナが停止中です。docker-compose up -d で起動してください${NC}"
        fi
    fi
    
    # データベース接続確認
    log_verbose "   データベース接続テスト中..."
    if command -v mysql &> /dev/null; then
        if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &>> "$LOG_FILE"; then
            log_verbose "   データベース接続確認完了"
        else
            log "${YELLOW}⚠️  データベースに接続できません（テストは継続）${NC}"
        fi
    fi
    
    log "${GREEN}✅ データベースセットアップ完了${NC}"
}

# テスト実行関数
run_tests() {
    local test_pattern="$1"
    local test_name="$2"
    local additional_flags="$3"
    
    log "${BLUE}🧪 $test_name 実行中...${NC}"
    
    local start_time=$(date +%s)
    local test_cmd="go test ./test -run '$test_pattern' -v -timeout ${TEST_TIMEOUT}s $additional_flags"
    
    log_verbose "   実行コマンド: $test_cmd"
    
    if [ "$VERBOSE" = true ]; then
        eval "$test_cmd" 2>&1 | tee -a "$LOG_FILE"
    else
        eval "$test_cmd" &>> "$LOG_FILE"
    fi
    
    local exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $exit_code -eq 0 ]; then
        log "${GREEN}✅ $test_name 完了 (${duration}秒)${NC}"
        return 0
    else
        log "${RED}❌ $test_name 失敗 (終了コード: $exit_code, ${duration}秒)${NC}"
        return $exit_code
    fi
}

# メインテスト実行
run_main_tests() {
    cd "$PROJECT_ROOT"
    
    local total_tests=0
    local failed_tests=0
    
    # テストモード別実行
    case "${TEST_MODE:-all}" in
        smoke)
            log "${BLUE}💨 スモークテストのみ実行${NC}"
            run_tests "TestE2EContinuousIntegration" "スモークテスト" "-short" || ((failed_tests++))
            ((total_tests++))
            ;;
        integration)
            log "${BLUE}🔗 統合テストのみ実行${NC}"
            run_tests "TestAccountingSystemE2E" "システム統合テスト" "" || ((failed_tests++))
            run_tests "TestAPIIntegrationFullWorkflow" "API統合テスト" "" || ((failed_tests++))
            run_tests "TestDatabaseIntegrationFullWorkflow" "DB統合テスト" "" || ((failed_tests++))
            total_tests=3
            ;;
        performance)
            log "${BLUE}⚡ パフォーマンステストのみ実行${NC}"
            run_tests "TestAccountingSystemPerformance" "システムパフォーマンステスト" "" || ((failed_tests++))
            run_tests "TestDatabasePerformance" "DBパフォーマンステスト" "" || ((failed_tests++))
            total_tests=2
            ;;
        *)
            log "${BLUE}🎯 全テストスイート実行${NC}"
            
            # 1. スモークテスト
            run_tests "TestE2EContinuousIntegration" "スモークテスト" "-short" || ((failed_tests++))
            ((total_tests++))
            
            # 2. 権限テスト
            run_tests "TestAccountingPermissions" "権限テスト" "" || ((failed_tests++))
            ((total_tests++))
            
            # 3. システム統合テスト
            run_tests "TestAccountingSystemE2E" "システム統合テスト" "" || ((failed_tests++))
            ((total_tests++))
            
            # 4. API統合テスト
            run_tests "TestAPIIntegrationFullWorkflow" "API統合テスト" "" || ((failed_tests++))
            ((total_tests++))
            
            # 5. データベース統合テスト
            run_tests "TestDatabaseIntegrationFullWorkflow" "DB統合テスト" "" || ((failed_tests++))
            ((total_tests++))
            
            # 6. 包括的テストスイート
            run_tests "TestE2EComprehensiveSuite" "包括的テストスイート" "" || ((failed_tests++))
            ((total_tests++))
            
            # 7. パフォーマンステスト（オプション）
            if [ "$RUN_PERFORMANCE" = true ]; then
                run_tests "TestAccountingSystemPerformance" "システムパフォーマンステスト" "" || ((failed_tests++))
                run_tests "TestDatabasePerformance" "DBパフォーマンステスト" "" || ((failed_tests++))
                total_tests=$((total_tests + 2))
            fi
            
            # 8. エラーシナリオテスト
            run_tests "TestAccountingSystemErrorHandling" "エラーハンドリングテスト" "" || ((failed_tests++))
            run_tests "TestAPIErrorScenarios" "APIエラーシナリオテスト" "" || ((failed_tests++))
            total_tests=$((total_tests + 2))
            ;;
    esac
    
    return $failed_tests
}

# テストカバレッジ取得
generate_coverage() {
    log "${BLUE}📊 テストカバレッジ生成中...${NC}"
    
    local coverage_file="$TEST_OUTPUT_DIR/coverage_$TIMESTAMP.out"
    local coverage_html="$TEST_OUTPUT_DIR/coverage_$TIMESTAMP.html"
    
    go test ./test -coverprofile="$coverage_file" -covermode=atomic &>> "$LOG_FILE"
    
    if [ -f "$coverage_file" ]; then
        go tool cover -html="$coverage_file" -o "$coverage_html" &>> "$LOG_FILE"
        
        local coverage_percent=$(go tool cover -func="$coverage_file" | grep total: | awk '{print $3}')
        log "${GREEN}📈 テストカバレッジ: $coverage_percent${NC}"
        log_verbose "   カバレッジレポート: $coverage_html"
    else
        log "${YELLOW}⚠️  カバレッジファイルが生成されませんでした${NC}"
    fi
}

# サマリーレポート生成
generate_summary() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    local failed_tests="$1"
    local total_tests="$2"
    
    # Markdownサマリー生成
    cat > "$SUMMARY_FILE" << EOF
# E2Eテスト実行サマリー

## 実行情報
- **実行日時**: $(date)
- **実行時間**: ${total_duration}秒
- **テストモード**: ${TEST_MODE:-all}
- **パフォーマンステスト**: $([ "$RUN_PERFORMANCE" = true ] && echo "実行" || echo "スキップ")

## テスト結果
- **総テスト数**: $total_tests
- **成功**: $((total_tests - failed_tests))
- **失敗**: $failed_tests
- **成功率**: $(echo "scale=1; ($total_tests - $failed_tests) * 100 / $total_tests" | bc)%

## ファイル出力
- **詳細ログ**: $LOG_FILE
- **サマリー**: $SUMMARY_FILE

## 実行環境
- **Go バージョン**: $(go version | cut -d' ' -f3)
- **OS**: $(uname -s)
- **アーキテクチャ**: $(uname -m)

## テスト内容
EOF

    if [ "${TEST_MODE:-all}" = "all" ]; then
        cat >> "$SUMMARY_FILE" << EOF
- ✅ スモークテスト
- ✅ 権限テスト  
- ✅ システム統合テスト
- ✅ API統合テスト
- ✅ データベース統合テスト
- ✅ 包括的テストスイート
$([ "$RUN_PERFORMANCE" = true ] && echo "- ✅ パフォーマンステスト")
- ✅ エラーハンドリングテスト
EOF
    else
        echo "- ✅ ${TEST_MODE} テスト" >> "$SUMMARY_FILE"
    fi

    log ""
    log "${BLUE}📋 実行サマリー${NC}"
    log "   総実行時間: ${total_duration}秒"
    log "   成功/失敗: $((total_tests - failed_tests))/$failed_tests"
    log "   サマリーファイル: $SUMMARY_FILE"
}

# メイン実行フロー
main() {
    setup_environment
    setup_database
    
    # テスト実行
    failed_tests=0
    run_main_tests
    failed_tests=$?
    
    # カバレッジ生成（全テスト実行時のみ）
    if [ "${TEST_MODE:-all}" = "all" ]; then
        generate_coverage
    fi
    
    # サマリー生成
    local total_tests=8
    case "${TEST_MODE:-all}" in
        smoke) total_tests=1 ;;
        integration) total_tests=3 ;;
        performance) total_tests=2 ;;
    esac
    
    if [ "$RUN_PERFORMANCE" = false ] && [ "${TEST_MODE:-all}" = "all" ]; then
        total_tests=6
    fi
    
    generate_summary $failed_tests $total_tests
    
    # 終了処理
    if [ $failed_tests -eq 0 ]; then
        log ""
        log "${GREEN}🎉 全てのE2Eテストが正常に完了しました！${NC}"
        exit 0
    else
        log ""
        log "${RED}💥 $failed_tests 個のテストが失敗しました${NC}"
        log "${YELLOW}詳細は $LOG_FILE を確認してください${NC}"
        exit 1
    fi
}

# メイン実行
main "$@"