#!/bin/bash

# Alert Detection Batch Script
# 異常値検知バッチの実行スクリプト

set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ログディレクトリの設定
LOG_DIR="$PROJECT_ROOT/logs/batch"
mkdir -p "$LOG_DIR"

# 実行日時
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="$LOG_DIR/alert_detection_$TIMESTAMP.log"

# 環境変数の読み込み
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# バッチファイルのパス
BATCH_BINARY="$PROJECT_ROOT/tmp/alert_detection"

# ヘルパー関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# バイナリのビルド
build_batch() {
    log "Building alert detection batch..."
    cd "$PROJECT_ROOT"
    
    if ! go build -o "$BATCH_BINARY" ./cmd/batch/alert_detection.go; then
        error_exit "Failed to build alert detection batch"
    fi
    
    log "Build completed successfully"
}

# 基本的なアラート検知実行
run_alert_detection() {
    local mode="${1:-auto}"
    local additional_args="${2:-}"
    
    log "Starting alert detection batch (mode: $mode)"
    
    # バイナリが存在しない場合はビルド
    if [ ! -f "$BATCH_BINARY" ]; then
        build_batch
    fi
    
    # バッチ実行
    if eval "$BATCH_BINARY -mode=$mode $additional_args" >> "$LOG_FILE" 2>&1; then
        log "Alert detection batch completed successfully"
        return 0
    else
        error_exit "Alert detection batch failed"
    fi
}

# 週次サマリー表示
show_weekly_summary() {
    local week_offset="${1:-0}"
    
    log "Showing weekly alert summary (week offset: $week_offset)"
    
    if [ ! -f "$BATCH_BINARY" ]; then
        build_batch
    fi
    
    "$BATCH_BINARY" -mode=auto -summary -week-offset="$week_offset"
}

# ドライラン実行
run_dry_run() {
    local week_offset="${1:-0}"
    
    log "Running alert detection dry run (week offset: $week_offset)"
    
    if [ ! -f "$BATCH_BINARY" ]; then
        build_batch
    fi
    
    "$BATCH_BINARY" -mode=auto -dry-run -week-offset="$week_offset" >> "$LOG_FILE" 2>&1
    log "Dry run completed"
}

# 手動実行（特定日付）
run_manual_detection() {
    local target_date="$1"
    local dry_run="${2:-false}"
    
    if [ -z "$target_date" ]; then
        error_exit "Target date is required for manual detection"
    fi
    
    log "Running manual alert detection for date: $target_date (dry-run: $dry_run)"
    
    if [ ! -f "$BATCH_BINARY" ]; then
        build_batch
    fi
    
    local dry_run_flag=""
    if [ "$dry_run" = "true" ]; then
        dry_run_flag="-dry-run"
    fi
    
    if "$BATCH_BINARY" -mode=manual -date="$target_date" $dry_run_flag >> "$LOG_FILE" 2>&1; then
        log "Manual alert detection completed successfully"
    else
        error_exit "Manual alert detection failed"
    fi
}

# ヘルスチェック
health_check() {
    log "Performing health check..."
    
    # データベース接続確認
    if ! timeout 10 mysqladmin ping -h"${DB_HOST:-localhost}" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" >/dev/null 2>&1; then
        error_exit "Database connection failed"
    fi
    
    # バッチバイナリの確認
    if [ ! -f "$BATCH_BINARY" ]; then
        log "Batch binary not found, building..."
        build_batch
    fi
    
    log "Health check passed"
}

# クリーンアップ
cleanup() {
    log "Performing cleanup..."
    
    # 古いログファイルを削除（30日以上前）
    find "$LOG_DIR" -name "alert_detection_*.log" -mtime +30 -delete 2>/dev/null || true
    
    # 古いバイナリを削除
    if [ -f "$BATCH_BINARY" ]; then
        rm -f "$BATCH_BINARY"
    fi
    
    log "Cleanup completed"
}

# メイン処理
main() {
    local command="${1:-auto}"
    
    case "$command" in
        "auto"|"")
            # 標準的な自動実行（cronから呼ばれる）
            run_alert_detection "auto"
            ;;
        "build")
            # バイナリビルドのみ
            build_batch
            ;;
        "summary")
            # 週次サマリー表示
            local week_offset="${2:-0}"
            show_weekly_summary "$week_offset"
            ;;
        "dry-run")
            # ドライラン実行
            local week_offset="${2:-0}"
            run_dry_run "$week_offset"
            ;;
        "manual")
            # 手動実行
            local target_date="$2"
            local dry_run="${3:-false}"
            run_manual_detection "$target_date" "$dry_run"
            ;;
        "health")
            # ヘルスチェック
            health_check
            ;;
        "cleanup")
            # クリーンアップ
            cleanup
            ;;
        "help"|"-h"|"--help")
            cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    auto                    自動アラート検知実行 (default)
    build                   バッチバイナリのビルドのみ
    summary [WEEK_OFFSET]   週次サマリー表示 (0=今週, -1=先週, 1=来週)
    dry-run [WEEK_OFFSET]   ドライラン実行
    manual DATE [DRY_RUN]   手動実行 (DATE: YYYY-MM-DD, DRY_RUN: true/false)
    health                  ヘルスチェック
    cleanup                 クリーンアップ
    help                    このヘルプを表示

Examples:
    $0 auto                 # 自動検知実行
    $0 summary              # 今週のサマリー表示
    $0 summary -1           # 先週のサマリー表示
    $0 dry-run              # 今週のドライラン
    $0 manual 2024-01-15    # 2024-01-15の週を手動検知
    $0 manual 2024-01-15 true  # ドライランで手動検知

Environment Variables:
    DB_HOST                 データベースホスト (default: localhost)
    DB_PORT                 データベースポート (default: 3306)
    DB_USER                 データベースユーザー
    DB_PASSWORD             データベースパスワード
    DB_NAME                 データベース名

Log File: $LOG_FILE
EOF
            ;;
        *)
            error_exit "Unknown command: $command. Use '$0 help' for usage information."
            ;;
    esac
}

# スクリプト実行
main "$@"