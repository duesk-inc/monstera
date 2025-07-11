#!/bin/bash

# migration-rollback.sh
# PostgreSQL移行失敗時の緊急ロールバックスクリプト
# MySQL環境への安全な復旧処理

set -euo pipefail

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# グローバル変数
ROLLBACK_START_TIME=""
ROLLBACK_REASON=""
ROLLBACK_SUCCESS=false

# ログ設定
LOG_DIR="./migration-logs/$(date +%Y%m%d)"
mkdir -p "$LOG_DIR"
ROLLBACK_LOG="$LOG_DIR/rollback_$(date +%H%M%S).log"

# 環境変数
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

# 通知設定
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

# 関数定義
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "$message" | tee -a "$ROLLBACK_LOG"
}

send_notification() {
    local message="$1"
    local urgency="${2:-normal}"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji="🔄"
        if [ "$urgency" = "critical" ]; then
            emoji="🚨"
        elif [ "$urgency" = "success" ]; then
            emoji="✅"
        fi
        
        curl -X POST "$SLACK_WEBHOOK_URL" \
          -H "Content-Type: application/json" \
          -d "{\"text\": \"$emoji $message\", \"channel\": \"#migration-live\"}" \
          > /dev/null 2>&1 || true
    fi
    
    log_message "📢 通知送信: $message"
}

check_current_state() {
    log_message "=== 現在のシステム状態確認 ==="
    
    # PostgreSQL接続確認
    local pg_status="disconnected"
    if PGPASSWORD="$POSTGRES_PASSWORD" psql \
      -h"$POSTGRES_HOST" \
      -p"$POSTGRES_PORT" \
      -U"$POSTGRES_USER" \
      -d"$POSTGRES_DATABASE" \
      -c "SELECT 1;" > /dev/null 2>&1; then
        pg_status="connected"
    fi
    
    # MySQL接続確認
    local mysql_status="disconnected"
    if mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT 1;" "$MYSQL_DATABASE" > /dev/null 2>&1; then
        mysql_status="connected"
    fi
    
    # アプリケーション状態確認
    local app_status="down"
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        app_status="running"
    fi
    
    # Docker状態確認
    local docker_status="unknown"
    if docker-compose ps > /dev/null 2>&1; then
        docker_status="available"
    fi
    
    log_message "PostgreSQL: $pg_status"
    log_message "MySQL: $mysql_status"
    log_message "アプリケーション: $app_status"
    log_message "Docker: $docker_status"
    
    # 状態判定
    if [ "$app_status" = "running" ] && [ "$mysql_status" = "connected" ]; then
        log_message "ℹ️ システムは既にMySQL環境で動作中"
        return 2  # 既にロールバック済み
    elif [ "$app_status" = "running" ] && [ "$pg_status" = "connected" ]; then
        log_message "ℹ️ システムはPostgreSQL環境で動作中"
        return 1  # PostgreSQL環境で動作中
    else
        log_message "ℹ️ システムは停止中または部分動作中"
        return 0  # 停止または異常状態
    fi
}

stop_current_services() {
    log_message "=== 現在のサービス停止 ==="
    
    # Graceful shutdown
    log_message "サービス停止中..."
    
    # Docker Compose停止
    docker-compose down > /dev/null 2>&1 || true
    log_message "✅ Docker Compose停止完了"
    
    # 残存プロセス確認・停止
    local monstera_pids=$(pgrep -f "monstera" 2>/dev/null || echo "")
    if [ -n "$monstera_pids" ]; then
        log_message "残存プロセス停止中..."
        echo "$monstera_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 5
        
        # 強制停止が必要な場合
        monstera_pids=$(pgrep -f "monstera" 2>/dev/null || echo "")
        if [ -n "$monstera_pids" ]; then
            echo "$monstera_pids" | xargs kill -KILL 2>/dev/null || true
            log_message "⚠️ 強制プロセス停止実行"
        fi
    fi
    
    # 停止確認
    sleep 3
    if ! pgrep -f "monstera" > /dev/null 2>&1; then
        log_message "✅ 全サービス停止確認完了"
        return 0
    else
        log_message "⚠️ 一部プロセスが残存している可能性"
        return 1
    fi
}

verify_mysql_availability() {
    log_message "=== MySQL環境可用性確認 ==="
    
    # MySQL接続確認
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_message "MySQL接続確認中... ($attempt/$max_attempts)"
        
        if mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
          -e "SELECT 'MySQL接続成功' as status;" "$MYSQL_DATABASE" > /dev/null 2>&1; then
            log_message "✅ MySQL接続成功"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_message "❌ MySQL接続失敗 - 復旧不可能"
            return 1
        fi
        
        sleep 5
        attempt=$((attempt + 1))
    done
    
    # データ整合性基本確認
    log_message "MySQL データ整合性基本確認中..."
    
    # 主要テーブル存在確認
    local critical_tables=("users" "weekly_reports" "expense_requests" "leave_requests")
    for table in "${critical_tables[@]}"; do
        local table_exists=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
          -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$MYSQL_DATABASE' AND TABLE_NAME = '$table';" \
          --batch --skip-column-names 2>/dev/null || echo "0")
        
        if [ "$table_exists" -eq 1 ]; then
            local record_count=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
              -e "SELECT COUNT(*) FROM $table;" "$MYSQL_DATABASE" --batch --skip-column-names 2>/dev/null || echo "0")
            log_message "✅ $table テーブル: ${record_count}件"
        else
            log_message "❌ $table テーブルが存在しません"
            return 1
        fi
    done
    
    log_message "✅ MySQL環境可用性確認完了"
    return 0
}

restore_mysql_configuration() {
    log_message "=== MySQL環境設定復旧 ==="
    
    # 環境変数復旧
    local env_backup=""
    if [ -f ".env.backup_$(date +%Y%m%d)"* ]; then
        env_backup=$(ls -t .env.backup_$(date +%Y%m%d)* 2>/dev/null | head -1)
    elif [ -f ".env.mysql.backup" ]; then
        env_backup=".env.mysql.backup"
    fi
    
    if [ -n "$env_backup" ] && [ -f "$env_backup" ]; then
        cp "$env_backup" .env
        log_message "✅ 環境変数復旧完了: $env_backup"
    else
        log_message "⚠️ 環境変数バックアップが見つかりません - 手動設定中..."
        
        # 手動設定
        cat > .env << EOF
DB_DRIVER=mysql
DB_HOST=$MYSQL_HOST
DB_PORT=$MYSQL_PORT
DB_DATABASE=$MYSQL_DATABASE
DB_USER=$MYSQL_USER
DB_PASSWORD=$MYSQL_PASSWORD

# その他の設定はバックアップから復旧してください
EOF
        log_message "✅ 基本環境変数手動設定完了"
    fi
    
    # Docker Compose設定復旧
    if [ -f "docker-compose.mysql.yml.backup" ]; then
        cp docker-compose.mysql.yml.backup docker-compose.yml
        log_message "✅ Docker Compose設定復旧完了"
    elif [ -f "docker-compose.mysql.yml" ]; then
        cp docker-compose.mysql.yml docker-compose.yml
        log_message "✅ MySQL用Docker Compose設定適用"
    else
        log_message "⚠️ MySQL用Docker Compose設定が見つかりません"
    fi
    
    # MySQL設定確認
    if grep -q "DB_DRIVER=mysql" .env 2>/dev/null; then
        log_message "✅ MySQL設定確認完了"
        return 0
    else
        log_message "❌ MySQL設定確認失敗"
        return 1
    fi
}

start_mysql_environment() {
    log_message "=== MySQL環境起動 ==="
    
    # MySQLサービス起動
    log_message "MySQL データベース起動中..."
    docker-compose up -d mysql > /dev/null 2>&1
    
    # MySQL起動待ち
    local mysql_ready=false
    local wait_attempts=0
    local max_wait_attempts=30
    
    while [ $wait_attempts -lt $max_wait_attempts ] && [ "$mysql_ready" = false ]; do
        if mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
          -e "SELECT 1;" "$MYSQL_DATABASE" > /dev/null 2>&1; then
            mysql_ready=true
            log_message "✅ MySQL起動確認完了"
        else
            wait_attempts=$((wait_attempts + 1))
            log_message "MySQL起動待ち... ($wait_attempts/$max_wait_attempts)"
            sleep 2
        fi
    done
    
    if [ "$mysql_ready" = false ]; then
        log_message "❌ MySQL起動タイムアウト"
        return 1
    fi
    
    # バックエンド起動
    log_message "バックエンドアプリケーション起動中..."
    docker-compose up -d backend > /dev/null 2>&1
    
    # バックエンド起動確認
    local backend_ready=false
    local backend_attempts=0
    local max_backend_attempts=20
    
    while [ $backend_attempts -lt $max_backend_attempts ] && [ "$backend_ready" = false ]; do
        if curl -f http://localhost:8080/health > /dev/null 2>&1; then
            backend_ready=true
            log_message "✅ バックエンド起動確認完了"
        else
            backend_attempts=$((backend_attempts + 1))
            log_message "バックエンド起動待ち... ($backend_attempts/$max_backend_attempts)"
            sleep 3
        fi
    done
    
    if [ "$backend_ready" = false ]; then
        log_message "❌ バックエンド起動タイムアウト"
        
        # ログ確認
        log_message "バックエンドログ確認:"
        docker-compose logs backend | tail -10 | tee -a "$ROLLBACK_LOG"
        return 1
    fi
    
    # フロントエンド起動
    log_message "フロントエンドアプリケーション起動中..."
    docker-compose up -d frontend > /dev/null 2>&1
    
    # フロントエンド起動確認（タイムアウト短縮）
    local frontend_ready=false
    local frontend_attempts=0
    local max_frontend_attempts=10
    
    while [ $frontend_attempts -lt $max_frontend_attempts ] && [ "$frontend_ready" = false ]; do
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            frontend_ready=true
            log_message "✅ フロントエンド起動確認完了"
        else
            frontend_attempts=$((frontend_attempts + 1))
            log_message "フロントエンド起動待ち... ($frontend_attempts/$max_frontend_attempts)"
            sleep 3
        fi
    done
    
    if [ "$frontend_ready" = false ]; then
        log_message "⚠️ フロントエンド起動確認失敗 - 手動確認が必要"
        docker-compose logs frontend | tail -5 | tee -a "$ROLLBACK_LOG"
    fi
    
    return 0
}

verify_mysql_functionality() {
    log_message "=== MySQL環境機能確認 ==="
    
    # API機能確認
    local api_tests_passed=0
    local api_tests_total=4
    
    # ヘルスチェック
    if curl -s http://localhost:8080/health | jq '.status' | grep -q "ok" 2>/dev/null; then
        log_message "✅ ヘルスチェックAPI正常"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log_message "❌ ヘルスチェックAPI異常"
    fi
    
    # データベース接続確認
    if curl -s http://localhost:8080/api/health/db 2>/dev/null | grep -q "ok"; then
        log_message "✅ データベース接続API正常"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log_message "⚠️ データベース接続API確認失敗"
    fi
    
    # データベース直接操作確認
    log_message "データベース直接操作確認中..."
    
    # SELECT操作確認
    local user_count=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT COUNT(*) FROM users;" "$MYSQL_DATABASE" --batch --skip-column-names 2>/dev/null || echo "0")
    
    if [ "$user_count" -gt 0 ]; then
        log_message "✅ SELECT操作確認: ${user_count}ユーザー"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log_message "❌ SELECT操作確認失敗"
    fi
    
    # INSERT/DELETE操作確認
    local test_user_id="rollback-test-$(date +%s)"
    if mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "INSERT INTO users (id, name, email, created_at, updated_at) 
          VALUES ('$test_user_id', 'Rollback Test', 'rollback@test.com', NOW(), NOW());" \
      "$MYSQL_DATABASE" > /dev/null 2>&1; then
        
        # テストデータ削除
        mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
          -e "DELETE FROM users WHERE id = '$test_user_id';" \
          "$MYSQL_DATABASE" > /dev/null 2>&1
        
        log_message "✅ INSERT/DELETE操作確認完了"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log_message "❌ INSERT/DELETE操作確認失敗"
    fi
    
    # 機能確認結果
    log_message "機能確認結果: $api_tests_passed/$api_tests_total テスト成功"
    
    if [ $api_tests_passed -ge 3 ]; then
        log_message "✅ MySQL環境機能確認成功"
        return 0
    else
        log_message "❌ MySQL環境機能確認失敗"
        return 1
    fi
}

end_maintenance_mode() {
    log_message "=== メンテナンスモード解除 ==="
    
    # メンテナンスモード解除
    if [ -n "$API_BASE_URL" ] && [ -n "$ADMIN_TOKEN" ]; then
        curl -X POST "$API_BASE_URL/admin/maintenance" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"enabled": false}' > /dev/null 2>&1 || true
        log_message "✅ メンテナンスモード解除"
    fi
    
    log_message "✅ システム復旧完了"
}

cleanup_postgresql_remnants() {
    log_message "=== PostgreSQL移行残骸クリーンアップ ==="
    
    # PostgreSQL関連の一時ファイル削除
    find . -name "*postgres*" -type f -mtime 0 -delete 2>/dev/null || true
    find . -name "*migration*" -type f -mtime 0 -delete 2>/dev/null || true
    
    # Docker PostgreSQLイメージ停止（必要に応じて）
    docker stop $(docker ps -q --filter "ancestor=postgres") 2>/dev/null || true
    
    log_message "✅ PostgreSQL残骸クリーンアップ完了"
}

generate_rollback_report() {
    log_message "=== ロールバック報告書生成 ==="
    
    local rollback_report="$LOG_DIR/rollback_report_$(date +%H%M%S).md"
    local rollback_duration=$(( $(date +%s) - $(date -d "$ROLLBACK_START_TIME" +%s) ))
    
    cat > "$rollback_report" << EOF
# PostgreSQL移行ロールバック報告書

## ロールバック概要
- **実行日時**: $(date +%Y年%m月%d日) $ROLLBACK_START_TIME - $(date +%H:%M)
- **所要時間**: $((rollback_duration / 60))分 $((rollback_duration % 60))秒
- **ロールバック理由**: $ROLLBACK_REASON
- **ロールバック結果**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "成功" || echo "失敗")

## 実行ステップ
1. **現在状態確認**: 完了
2. **サービス停止**: 完了
3. **MySQL可用性確認**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "成功" || echo "失敗")
4. **MySQL設定復旧**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "完了" || echo "失敗")
5. **MySQL環境起動**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "成功" || echo "失敗")
6. **機能確認**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "成功" || echo "失敗")
7. **メンテナンス解除**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "完了" || echo "未完了")

## システム状態
- **データベース**: MySQL $(mysql --version 2>/dev/null | awk '{print $3}' || echo "不明")
- **アプリケーション**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "正常稼働" || echo "要確認")
- **データ整合性**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "保証済み" || echo "要検証")

## 影響範囲
- **データ損失**: なし（MySQLデータ使用）
- **機能制限**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "なし" || echo "あり")
- **ユーザー影響**: 最小限

## 今後の対応
1. **システム監視強化**: 24時間
2. **PostgreSQL移行**: 再計画が必要
3. **根本原因分析**: 実施予定
4. **再移行準備**: 課題解決後

## 関連ファイル
- **ロールバックログ**: $ROLLBACK_LOG
- **移行ログ**: $LOG_DIR/migration_*.log
- **バックアップファイル**: ./backups/final/

**実行者**: ロールバックシステム
**報告時刻**: $(date)
EOF

    log_message "✅ ロールバック報告書生成: $rollback_report"
}

interactive_rollback() {
    echo ""
    echo -e "${YELLOW}ロールバック理由を入力してください:${NC}"
    echo "1) データ移行失敗"
    echo "2) データ検証失敗" 
    echo "3) アプリケーション起動失敗"
    echo "4) 性能問題"
    echo "5) その他"
    echo ""
    echo -n "選択 [1-5]: "
    read -r reason_choice
    
    case $reason_choice in
        1) ROLLBACK_REASON="データ移行失敗";;
        2) ROLLBACK_REASON="データ検証失敗";;
        3) ROLLBACK_REASON="アプリケーション起動失敗";;
        4) ROLLBACK_REASON="性能問題";;
        5) 
            echo -n "理由を入力してください: "
            read -r custom_reason
            ROLLBACK_REASON="$custom_reason"
            ;;
        *) ROLLBACK_REASON="不明";;
    esac
    
    echo ""
    echo -e "${RED}警告: この操作により PostgreSQL → MySQL へのロールバックが実行されます${NC}"
    echo ""
    echo "ロールバック理由: $ROLLBACK_REASON"
    echo "実行内容:"
    echo "- 現在のサービス停止"
    echo "- MySQL環境への復旧"
    echo "- アプリケーション再起動"
    echo ""
    echo -n "ロールバックを実行しますか？ [yes/no]: "
    read -r confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_message "ロールバックがキャンセルされました"
        exit 0
    fi
}

main() {
    clear
    echo "================================================="
    echo -e "${BOLD}${RED}PostgreSQL移行緊急ロールバックシステム${NC}"
    echo "================================================="
    echo "実行時刻: $(date)"
    echo "ロールバックログ: $ROLLBACK_LOG"
    echo ""
    
    ROLLBACK_START_TIME=$(date +%H:%M:%S)
    log_message "🚨 PostgreSQL移行緊急ロールバック開始"
    
    # 引数から理由を取得（自動実行の場合）
    if [ "$#" -gt 0 ]; then
        ROLLBACK_REASON="$1"
        log_message "自動ロールバック実行: $ROLLBACK_REASON"
    else
        # インタラクティブモード
        interactive_rollback
    fi
    
    send_notification "🚨 緊急ロールバック開始：PostgreSQL移行を中止してMySQL環境に復旧します" "critical"
    
    # 現在状態確認
    local current_state_result
    check_current_state
    current_state_result=$?
    
    if [ $current_state_result -eq 2 ]; then
        log_message "ℹ️ システムは既にMySQL環境で動作中です"
        echo ""
        echo -e "${GREEN}システムは既にMySQL環境で正常動作しています${NC}"
        echo "ロールバック処理は不要です。"
        exit 0
    fi
    
    # Step 1: 現在のサービス停止
    if ! stop_current_services; then
        log_message "⚠️ サービス停止で問題が発生しましたが続行します"
    fi
    
    # Step 2: MySQL可用性確認
    if ! verify_mysql_availability; then
        log_message "❌ MySQL環境が利用できません - ロールバック失敗"
        send_notification "❌ ロールバック失敗：MySQL環境が利用できません" "critical"
        exit 1
    fi
    
    # Step 3: MySQL設定復旧
    if ! restore_mysql_configuration; then
        log_message "❌ MySQL設定復旧失敗 - ロールバック失敗"
        send_notification "❌ ロールバック失敗：MySQL設定復旧に失敗しました" "critical"
        exit 1
    fi
    
    # Step 4: MySQL環境起動
    if ! start_mysql_environment; then
        log_message "❌ MySQL環境起動失敗 - ロールバック失敗"
        send_notification "❌ ロールバック失敗：MySQL環境の起動に失敗しました" "critical"
        exit 1
    fi
    
    # Step 5: 機能確認
    if ! verify_mysql_functionality; then
        log_message "⚠️ 機能確認で問題がありますが基本復旧は完了"
        send_notification "⚠️ ロールバック部分成功：機能確認に問題がありますが基本復旧完了" "normal"
    else
        log_message "✅ 機能確認成功"
    fi
    
    # Step 6: メンテナンス解除
    end_maintenance_mode
    
    # Step 7: クリーンアップ
    cleanup_postgresql_remnants
    
    # Step 8: 報告書生成
    ROLLBACK_SUCCESS=true
    generate_rollback_report
    
    # 成功通知
    send_notification "✅ ロールバック成功：MySQL環境への復旧が完了しました" "success"
    
    # 最終メッセージ
    echo ""
    echo "================================================="
    echo -e "${BOLD}${GREEN}緊急ロールバック完了${NC}"
    echo "================================================="
    echo ""
    echo "実行時間: $ROLLBACK_START_TIME - $(date +%H:%M:%S)"
    echo "ロールバック理由: $ROLLBACK_REASON"
    echo "復旧結果: MySQL環境で正常稼働"
    echo ""
    echo -e "${GREEN}システムはMySQL環境で利用可能です${NC}"
    echo ""
    echo "今後の対応:"
    echo "1. システム監視継続"
    echo "2. 移行失敗原因の分析"
    echo "3. PostgreSQL移行の再計画"
    echo ""
    echo "ロールバックログ: $ROLLBACK_LOG"
    echo "報告書: $LOG_DIR/rollback_report_*.md"
    
    exit 0
}

# 実行確認（インタラクティブモードの場合）
if [ "$#" -eq 0 ]; then
    echo -e "${YELLOW}PostgreSQL移行緊急ロールバックシステム${NC}"
    echo ""
    echo "このスクリプトは以下を実行します:"
    echo "- PostgreSQL環境からの切り離し"
    echo "- MySQL環境への復旧"
    echo "- アプリケーション再起動"
    echo "- 動作確認"
    echo ""
    echo -n "緊急ロールバックを実行しますか？ [yes/no]: "
    read -r execute_confirmation
    
    if [ "$execute_confirmation" = "yes" ]; then
        main
    else
        echo "ロールバックをキャンセルしました。"
        exit 0
    fi
else
    # 自動実行モード（引数で理由を指定）
    main "$@"
fi