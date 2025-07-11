#!/bin/bash

# =============================================================================
# CI/CD E2E Test Execution Script
# =============================================================================
# このスクリプトはCI/CD環境でE2Eテストを実行するための統合スクリプトです
# セットアップ、テスト実行、レポート生成、クリーンアップまでを一貫して実行します

set -e  # エラーが発生したら即座に終了

# カラー出力の定義（CI環境では無効化）
if [ -t 1 ] && [ -z "$CI" ]; then
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    PURPLE='\033[0;35m'
    NC='\033[0m' # No Color
else
    # CI環境またはパイプ出力時は色なし
    GREEN=''
    RED=''
    YELLOW=''
    BLUE=''
    PURPLE=''
    NC=''
fi

# タイムスタンプ付きログ出力
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

info() {
    echo -e "${PURPLE}ℹ️${NC} $1"
}

# スクリプトのルートディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# =============================================================================
# デフォルト設定
# =============================================================================
E2E_MODE="full"           # full, smoke, critical
BROWSER="chromium"        # chromium, firefox, webkit, all
WORKERS=4                 # 並列実行数
RETRIES=2                 # 失敗時の再試行回数
TIMEOUT=30000            # テストのタイムアウト（ミリ秒）
GENERATE_REPORT=true     # レポート生成フラグ
CLEANUP_AFTER=true       # テスト後のクリーンアップ
BAIL_ON_FAILURE=false    # 失敗時に即座に停止
HEADLESS=true           # ヘッドレスモード
VERBOSE=false           # 詳細ログ出力
TEST_PATTERN=""         # 特定のテストパターン
OUTPUT_DIR="test-results/ci-$(date +%Y%m%d-%H%M%S)"

# =============================================================================
# コマンドライン引数の処理
# =============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            E2E_MODE="$2"
            shift 2
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --workers)
            WORKERS="$2"
            shift 2
            ;;
        --retries)
            RETRIES="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --no-report)
            GENERATE_REPORT=false
            shift
            ;;
        --no-cleanup)
            CLEANUP_AFTER=false
            shift
            ;;
        --bail)
            BAIL_ON_FAILURE=true
            shift
            ;;
        --headed)
            HEADLESS=false
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --pattern|-p)
            TEST_PATTERN="$2"
            shift 2
            ;;
        --output|-o)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help|-h)
            cat << EOF
CI/CD E2E Test Execution Script

Usage: $0 [OPTIONS]

Options:
  --mode MODE          Test mode: full, smoke, critical (default: full)
  --browser BROWSER    Browser to test: chromium, firefox, webkit, all (default: chromium)
  --workers N          Number of parallel workers (default: 4)
  --retries N          Number of retries for failed tests (default: 2)
  --timeout MS         Test timeout in milliseconds (default: 30000)
  --no-report          Skip report generation
  --no-cleanup         Skip cleanup after tests
  --bail               Stop on first test failure
  --headed             Run tests in headed mode (show browser)
  --verbose, -v        Enable verbose output
  --pattern, -p        Test file pattern to run
  --output, -o DIR     Output directory for results
  --help, -h           Show this help message

Test Modes:
  full      - Run all E2E tests
  smoke     - Run essential tests only (quick validation)
  critical  - Run critical path tests only

Examples:
  $0                                    # Run all tests
  $0 --mode smoke                       # Run smoke tests only
  $0 --browser all --workers 1          # Test all browsers sequentially
  $0 --pattern "login*.spec.ts"         # Run specific test files
  $0 --mode critical --bail             # Run critical tests, stop on failure

Environment Variables:
  CI                Set to 'true' in CI environment (auto-detected)
  GITHUB_ACTIONS    GitHub Actions specific settings
  GITLAB_CI         GitLab CI specific settings
  JENKINS_HOME      Jenkins specific settings

EOF
            exit 0
            ;;
        *)
            warning "Unknown option: $1"
            shift
            ;;
    esac
done

# =============================================================================
# CI環境の検出と設定
# =============================================================================
detect_ci_environment() {
    if [ -n "$GITHUB_ACTIONS" ]; then
        CI_ENV="github"
        log "Detected GitHub Actions environment"
    elif [ -n "$GITLAB_CI" ]; then
        CI_ENV="gitlab"
        log "Detected GitLab CI environment"
    elif [ -n "$JENKINS_HOME" ]; then
        CI_ENV="jenkins"
        log "Detected Jenkins environment"
    elif [ -n "$CIRCLECI" ]; then
        CI_ENV="circleci"
        log "Detected CircleCI environment"
    elif [ -n "$CI" ]; then
        CI_ENV="generic"
        log "Detected generic CI environment"
    else
        CI_ENV="local"
        log "Running in local environment"
    fi
}

# =============================================================================
# 前提条件の確認
# =============================================================================
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Node.jsの確認
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed!"
        exit 1
    fi
    
    # npmの確認
    if ! command -v npm &> /dev/null; then
        error "npm is not installed!"
        exit 1
    fi
    
    # Docker/Docker Composeの確認
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed!"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed!"
        exit 1
    fi
    
    # Playwrightの確認
    if [ ! -d "frontend/node_modules/@playwright" ]; then
        warning "Playwright not found, installing..."
        cd frontend && npm install @playwright/test && cd ..
    fi
    
    success "All prerequisites met"
}

# =============================================================================
# テストスイートの定義
# =============================================================================
get_test_files() {
    local mode=$1
    local pattern=$2
    
    case $mode in
        smoke)
            # スモークテスト: 基本的な機能のみ
            echo "login-requirement-test.spec.ts proposal-list-simple-test.spec.ts"
            ;;
        critical)
            # クリティカルパステスト: 重要な機能
            echo "login-requirement-test.spec.ts proposal-flow.spec.ts role-switch-test.spec.ts"
            ;;
        full)
            # フルテスト: すべてのテスト
            if [ -n "$pattern" ]; then
                echo "$pattern"
            else
                echo ""  # 空の場合はPlaywrightがすべてのテストを実行
            fi
            ;;
        *)
            echo "$pattern"
            ;;
    esac
}

# =============================================================================
# 環境のセットアップ
# =============================================================================
setup_environment() {
    log "Setting up E2E test environment..."
    
    # 出力ディレクトリの作成
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR/screenshots"
    mkdir -p "$OUTPUT_DIR/videos"
    mkdir -p "$OUTPUT_DIR/traces"
    
    # 環境変数の設定
    export NODE_ENV=test
    export CI=true
    export E2E_MODE=true
    export PLAYWRIGHT_HEADLESS=$HEADLESS
    export PLAYWRIGHT_BROWSERS_PATH=0  # システムのブラウザを使用
    
    # CI環境固有の設定
    case $CI_ENV in
        github)
            export PLAYWRIGHT_JSON_OUTPUT_NAME="$OUTPUT_DIR/results.json"
            ;;
        gitlab)
            export PLAYWRIGHT_JUNIT_OUTPUT_NAME="$OUTPUT_DIR/results.xml"
            ;;
    esac
    
    # セットアップスクリプトの実行
    if [ -f "./setup-e2e-test.sh" ]; then
        log "Running setup script..."
        bash ./setup-e2e-test.sh || {
            error "Setup script failed!"
            exit 1
        }
    else
        warning "Setup script not found, proceeding with basic setup..."
        # 基本的なセットアップのみ実行
        docker-compose up -d mysql redis backend
        sleep 10  # サービスの起動を待機
    fi
    
    success "Environment setup completed"
}

# =============================================================================
# Playwrightの設定生成
# =============================================================================
generate_playwright_config() {
    log "Generating Playwright configuration..."
    
    # Save current directory
    local current_dir=$(pwd)
    
    # Check if frontend directory exists
    if [ ! -d "frontend" ]; then
        error "Frontend directory not found! Make sure you're in the project root."
        exit 1
    fi
    
    # Move to frontend directory to create the config
    cd frontend
    
    # Generate browser configuration
    local browser_configs=""
    if [ "$BROWSER" = "all" ] || [ "$BROWSER" = "firefox" ]; then
        browser_configs="$browser_configs    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },"
    fi
    
    if [ "$BROWSER" = "all" ] || [ "$BROWSER" = "webkit" ]; then
        browser_configs="$browser_configs    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },"
    fi
    
    # Generate bail configuration
    local bail_config=""
    if [ "$BAIL_ON_FAILURE" = true ]; then
        bail_config="  bail: true,"
    fi
    
    cat > playwright.ci.config.ts << EOF
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: '../$OUTPUT_DIR',
  fullyParallel: true,
  forbidOnly: true,
  retries: $RETRIES,
  workers: $WORKERS,
  reporter: [
    ['list'],
    ['json', { outputFile: '../$OUTPUT_DIR/results.json' }],
    ['html', { outputFolder: './test-results/html-report', open: 'never' }],
    ['junit', { outputFile: '../$OUTPUT_DIR/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: $HEADLESS,
    actionTimeout: 10000,
    navigationTimeout: $TIMEOUT,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
$browser_configs
  ],
$bail_config
});
EOF
    
    # Return to original directory
    cd "$current_dir"
    
    success "Playwright configuration generated"
}

# =============================================================================
# テストの実行
# =============================================================================
run_tests() {
    log "Starting E2E tests..."
    
    # テストファイルの取得
    local test_files=$(get_test_files "$E2E_MODE" "$TEST_PATTERN")
    
    # フロントエンドディレクトリに移動
    cd frontend
    
    # Playwright設定の生成
    generate_playwright_config
    
    # テスト実行コマンドの構築
    local test_command="npx playwright test"
    test_command="$test_command --config=playwright.ci.config.ts"
    
    if [ -n "$test_files" ]; then
        test_command="$test_command $test_files"
    fi
    
    if [ "$BROWSER" != "all" ]; then
        test_command="$test_command --project=$BROWSER"
    fi
    
    if [ "$VERBOSE" = true ]; then
        test_command="$test_command --debug"
    fi
    
    # テストの実行
    info "Executing: $test_command"
    
    local test_start_time=$(date +%s)
    local test_exit_code=0
    
    # テスト実行とリアルタイム出力
    if $test_command; then
        test_exit_code=0
        success "All tests passed!"
    else
        test_exit_code=$?
        error "Some tests failed (exit code: $test_exit_code)"
    fi
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    info "Test execution time: ${test_duration} seconds"
    
    # 元のディレクトリに戻る
    cd ..
    
    return $test_exit_code
}

# =============================================================================
# レポートの生成
# =============================================================================
generate_reports() {
    if [ "$GENERATE_REPORT" = false ]; then
        info "Skipping report generation (--no-report)"
        return 0
    fi
    
    log "Generating test reports..."
    
    # JSON結果ファイルが存在する場合
    if [ -f "$OUTPUT_DIR/results.json" ]; then
        # 標準の場所にコピー
        cp "$OUTPUT_DIR/results.json" "frontend/test-results/e2e-results.json"
        
        # カスタムレポートの生成
        cd frontend && npm run test:e2e:generate-report && cd ..
        
        # 生成されたレポートを出力ディレクトリにコピー
        if [ -f "frontend/test-results/e2e-test-report.md" ]; then
            cp "frontend/test-results/e2e-test-report.md" "$OUTPUT_DIR/"
            success "Test report generated: $OUTPUT_DIR/e2e-test-report.md"
        fi
    fi
    
    # HTMLレポートのパスを表示
    if [ -d "$OUTPUT_DIR/html-report" ]; then
        info "HTML report available at: $OUTPUT_DIR/html-report/index.html"
    fi
    
    # JUnitレポートの確認（CI環境用）
    if [ -f "$OUTPUT_DIR/junit.xml" ]; then
        info "JUnit report available at: $OUTPUT_DIR/junit.xml"
    fi
    
    # アーティファクトの圧縮（CI環境用）
    if [ "$CI_ENV" != "local" ]; then
        log "Creating test artifacts archive..."
        tar -czf "$OUTPUT_DIR.tar.gz" -C "$(dirname "$OUTPUT_DIR")" "$(basename "$OUTPUT_DIR")"
        success "Artifacts archived: $OUTPUT_DIR.tar.gz"
    fi
}

# =============================================================================
# クリーンアップ
# =============================================================================
cleanup() {
    if [ "$CLEANUP_AFTER" = false ]; then
        info "Skipping cleanup (--no-cleanup)"
        return 0
    fi
    
    log "Cleaning up test environment..."
    
    # クリーンアップスクリプトの実行
    if [ -f "./cleanup-e2e-test.sh" ]; then
        bash ./cleanup-e2e-test.sh --force --keep-logs || {
            warning "Cleanup script failed, continuing..."
        }
    fi
    
    # 一時的な設定ファイルの削除
    if [ -f "frontend/playwright.ci.config.ts" ]; then
        rm -f frontend/playwright.ci.config.ts
    fi
    
    success "Cleanup completed"
}

# =============================================================================
# エラーハンドラー
# =============================================================================
handle_error() {
    local exit_code=$1
    error "Test execution failed with exit code: $exit_code"
    
    # エラー時のデバッグ情報収集
    if [ "$VERBOSE" = true ] || [ "$CI_ENV" != "local" ]; then
        log "Collecting debug information..."
        
        # Dockerサービスの状態
        echo "=== Docker Services Status ===" >> "$OUTPUT_DIR/debug.log"
        docker-compose ps >> "$OUTPUT_DIR/debug.log" 2>&1
        
        # 最近のDockerログ
        echo -e "\n=== Backend Logs (last 50 lines) ===" >> "$OUTPUT_DIR/debug.log"
        docker-compose logs --tail=50 backend >> "$OUTPUT_DIR/debug.log" 2>&1
        
        # ディスク使用量
        echo -e "\n=== Disk Usage ===" >> "$OUTPUT_DIR/debug.log"
        df -h >> "$OUTPUT_DIR/debug.log" 2>&1
        
        info "Debug information saved to: $OUTPUT_DIR/debug.log"
    fi
    
    # クリーンアップを実行
    cleanup
    
    exit $exit_code
}

# =============================================================================
# メイン実行フロー
# =============================================================================
main() {
    local start_time=$(date +%s)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "CI/CD E2E Test Execution"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Mode:        $E2E_MODE"
    echo "Browser:     $BROWSER"
    echo "Workers:     $WORKERS"
    echo "Retries:     $RETRIES"
    echo "Output:      $OUTPUT_DIR"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # CI環境の検出
    detect_ci_environment
    
    # 前提条件の確認
    check_prerequisites
    
    # 環境のセットアップ
    setup_environment
    
    # テストの実行
    local test_exit_code=0
    run_tests || test_exit_code=$?
    
    # レポートの生成
    generate_reports
    
    # 実行時間の計算
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test Execution Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Total Duration: ${total_duration} seconds"
    echo "Exit Code:      $test_exit_code"
    echo "Results:        $OUTPUT_DIR/"
    
    if [ $test_exit_code -eq 0 ]; then
        echo "Status:         ${GREEN}✅ SUCCESS${NC}"
    else
        echo "Status:         ${RED}❌ FAILED${NC}"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # クリーンアップ
    cleanup
    
    # 終了コードを返す
    exit $test_exit_code
}

# トラップの設定（エラー時のクリーンアップ）
trap 'handle_error $?' ERR

# メイン関数の実行
main