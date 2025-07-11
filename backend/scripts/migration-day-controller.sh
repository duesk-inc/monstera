#!/bin/bash

# migration-day-controller.sh
# PostgreSQL移行当日の統制・制御スクリプト
# 移行手順の自動実行とタイムライン管理

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
MIGRATION_START_TIME=""
CURRENT_PHASE=""
PHASE_START_TIME=""
TEAM_PRESENT=false
MIGRATION_SUCCESS=false

# ログ設定
LOG_DIR="./migration-logs/$(date +%Y%m%d)"
mkdir -p "$LOG_DIR"
CONTROLLER_LOG="$LOG_DIR/migration_controller_$(date +%H%M%S).log"
TIMELINE_LOG="$LOG_DIR/migration_timeline_$(date +%H%M%S).log"

# 環境変数確認
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

# Slack/通知設定
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

# プロセスID管理
MONITOR_PID=""
PROGRESS_MONITOR_PID=""
MIGRATION_PID=""

# 関数定義
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "$message" | tee -a "$CONTROLLER_LOG"
    echo "[$timestamp] $message" >> "$TIMELINE_LOG"
}

phase_header() {
    local phase_name="$1"
    local phase_time="$2"
    
    CURRENT_PHASE="$phase_name"
    PHASE_START_TIME=$(date +%s)
    
    echo ""
    echo "=================================================" | tee -a "$CONTROLLER_LOG"
    echo -e "${BOLD}${BLUE}$phase_name ($phase_time)${NC}" | tee -a "$CONTROLLER_LOG"
    echo "=================================================" | tee -a "$CONTROLLER_LOG"
    echo ""
}

check_prerequisites() {
    log_message "=== 事前条件確認 ==="
    
    # 必要なファイル存在確認
    local required_files=(
        "./scripts/bulk-migration-executor.sh"
        "./scripts/migration-performance-monitor.sh"
        "./scripts/validate-migration-data.sh"
        "./scripts/pre-migration-checker.sh"
        "./docs/pre-migration-final-checklist.md"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_message "✅ $file 存在確認"
        else
            log_message "❌ $file が見つかりません"
            return 1
        fi
    done
    
    # 環境変数確認
    if [ -z "$MYSQL_PASSWORD" ] || [ -z "$POSTGRES_PASSWORD" ]; then
        log_message "❌ データベースパスワードが設定されていません"
        return 1
    fi
    
    # 最終チェックスクリプト実行
    log_message "最終技術チェック実行中..."
    if ./scripts/pre-migration-checker.sh > "$LOG_DIR/final_technical_check.log" 2>&1; then
        log_message "✅ 技術的準備完了"
        return 0
    else
        log_message "❌ 技術的準備未完了"
        return 1
    fi
}

team_attendance_check() {
    log_message "=== チーム出席確認 ==="
    
    echo -e "${YELLOW}移行チーム出席確認を行います${NC}"
    echo ""
    
    local team_roles=("リーダー" "DBA" "インフラ" "アプリ" "QA" "監視")
    local all_present=true
    
    for role in "${team_roles[@]}"; do
        while true; do
            echo -n "${role}担当者は出席していますか? [y/n]: "
            read -r response
            
            case $response in
                [Yy]|[Yy][Ee][Ss])
                    log_message "✅ ${role}担当者: 出席"
                    break
                    ;;
                [Nn]|[Nn][Oo])
                    log_message "❌ ${role}担当者: 欠席"
                    all_present=false
                    break
                    ;;
                *)
                    echo "y または n を入力してください"
                    ;;
            esac
        done
    done
    
    if [ "$all_present" = true ]; then
        TEAM_PRESENT=true
        log_message "✅ 全チームメンバー出席確認完了"
        return 0
    else
        log_message "❌ チームメンバー欠席あり"
        return 1
    fi
}

go_nogo_decision() {
    log_message "=== Go/No-Go最終判定 ==="
    
    echo -e "${YELLOW}Go/No-Go最終判定を行います${NC}"
    echo ""
    echo "判定基準:"
    echo "✅ 事前条件チェック: 完了"
    echo "✅ チーム出席: 完了"
    echo "✅ 技術的準備: 完了"
    echo ""
    
    while true; do
        echo -n "移行を実行しますか? [GO/NOGO]: "
        read -r decision
        
        case $decision in
            [Gg][Oo])
                log_message "🚀 Go判定: 移行実行を開始します"
                return 0
                ;;
            [Nn][Oo][Gg][Oo])
                log_message "🛑 No-Go判定: 移行を中止します"
                return 1
                ;;
            *)
                echo "GO または NOGO を入力してください"
                ;;
        esac
    done
}

send_notification() {
    local message="$1"
    local channel="${2:-#migration-live}"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
          -H "Content-Type: application/json" \
          -d "{\"text\": \"$message\", \"channel\": \"$channel\"}" \
          > /dev/null 2>&1 || true
    fi
    
    log_message "📢 通知送信: $message"
}

start_maintenance_mode() {
    log_message "=== メンテナンスモード開始 ==="
    
    # システム内メンテナンス通知
    if [ -n "$API_BASE_URL" ] && [ -n "$ADMIN_TOKEN" ]; then
        curl -X POST "$API_BASE_URL/admin/maintenance" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{
            "enabled": true,
            "message": "システムメンテナンス中です。3:00頃に復旧予定です。",
            "estimated_completion": "'$(date -d '+1 hour' +%Y-%m-%dT%H:%M:%S)'"
          }' > /dev/null 2>&1 || true
    fi
    
    # 外部通知
    send_notification "🔧 Monsteraシステム移行開始：PostgreSQL移行作業を開始します。3:00頃復旧予定。"
    
    log_message "✅ メンテナンスモード開始完了"
}

stop_applications() {
    log_message "=== アプリケーション停止 ==="
    
    # Graceful shutdown
    log_message "アプリケーション停止中..."
    
    # Docker Compose停止
    if [ -f "docker-compose.yml" ]; then
        docker-compose down frontend backend > /dev/null 2>&1 || true
        log_message "✅ Docker Compose停止完了"
    fi
    
    # プロセス確認
    sleep 5
    if ! pgrep -f "monstera" > /dev/null 2>&1; then
        log_message "✅ アプリケーション停止確認完了"
    else
        log_message "⚠️ 一部プロセスが残存している可能性があります"
        pgrep -f "monstera" | head -5 | tee -a "$CONTROLLER_LOG"
    fi
}

create_final_backup() {
    log_message "=== MySQL最終バックアップ取得 ==="
    
    local backup_dir="./backups/final"
    mkdir -p "$backup_dir"
    
    local backup_file="mysql_final_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    log_message "バックアップ開始: $backup_file"
    
    # 完全バックアップ実行
    if mysqldump \
      --host="$MYSQL_HOST" \
      --port="$MYSQL_PORT" \
      --user="$MYSQL_USER" \
      --password="$MYSQL_PASSWORD" \
      --single-transaction \
      --routines \
      --triggers \
      --events \
      --hex-blob \
      --complete-insert \
      --extended-insert \
      --lock-tables=false \
      --set-gtid-purged=OFF \
      "$MYSQL_DATABASE" > "$backup_dir/$backup_file" 2>/dev/null; then
        
        # バックアップ検証
        local backup_size=$(du -h "$backup_dir/$backup_file" | cut -f1)
        local checksum=$(sha256sum "$backup_dir/$backup_file" | cut -d' ' -f1)
        
        log_message "✅ バックアップ取得成功"
        log_message "   ファイル: $backup_file"
        log_message "   サイズ: $backup_size"
        log_message "   SHA256: $checksum"
        
        # チェックサム保存
        echo "$checksum" > "$backup_dir/$backup_file.sha256"
        
        return 0
    else
        log_message "❌ バックアップ取得失敗"
        return 1
    fi
}

verify_postgresql_ready() {
    log_message "=== PostgreSQL環境最終確認 ==="
    
    # 接続テスト
    if PGPASSWORD="$POSTGRES_PASSWORD" psql \
      -h"$POSTGRES_HOST" \
      -p"$POSTGRES_PORT" \
      -U"$POSTGRES_USER" \
      -d"$POSTGRES_DATABASE" \
      -c "SELECT version();" > /dev/null 2>&1; then
        
        log_message "✅ PostgreSQL接続確認完了"
        
        # テーブル数確認
        local pg_tables=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
          -h"$POSTGRES_HOST" \
          -p"$POSTGRES_PORT" \
          -U"$POSTGRES_USER" \
          -d"$POSTGRES_DATABASE" \
          -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        
        log_message "   PostgreSQLテーブル数: $pg_tables"
        return 0
    else
        log_message "❌ PostgreSQL接続失敗"
        return 1
    fi
}

start_performance_monitoring() {
    log_message "=== 性能監視開始 ==="
    
    # 性能監視スクリプト起動
    ./scripts/migration-performance-monitor.sh 3600 30 > "$LOG_DIR/performance_monitor_$(date +%H%M%S).csv" 2>&1 &
    MONITOR_PID=$!
    
    log_message "✅ 性能監視開始 (PID: $MONITOR_PID)"
    log_message "   監視データ: $LOG_DIR/performance_monitor_$(date +%H%M%S).csv"
}

execute_migration() {
    log_message "=== 一括データ移行実行 ==="
    
    # 移行前状態確認
    local mysql_tables=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$MYSQL_DATABASE';" \
      --batch --skip-column-names 2>/dev/null)
    
    log_message "移行前MySQL テーブル数: $mysql_tables"
    
    # 移行実行
    log_message "データ移行開始: $(date)"
    
    ./scripts/bulk-migration-executor.sh > "$LOG_DIR/migration_execution_$(date +%H%M%S).log" 2>&1 &
    MIGRATION_PID=$!
    
    log_message "✅ 移行プロセス開始 (PID: $MIGRATION_PID)"
    
    # プロセス確認
    sleep 5
    if ps -p $MIGRATION_PID > /dev/null; then
        log_message "✅ 移行プロセス正常実行中"
        return 0
    else
        log_message "❌ 移行プロセス開始失敗"
        return 1
    fi
}

monitor_migration_progress() {
    log_message "=== 移行進捗監視 ==="
    
    local monitoring=true
    local last_check=$(date +%s)
    
    while $monitoring && ps -p $MIGRATION_PID > /dev/null; do
        local current_time=$(date +%s)
        
        # 2分間隔で進捗確認
        if [ $((current_time - last_check)) -ge 120 ]; then
            log_message "=== $(date +%H:%M:%S) 進捗確認 ==="
            
            # システムリソース確認
            if [[ "$OSTYPE" == "darwin"* ]]; then
                local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' || echo "0")
                local mem_usage=$(vm_stat | perl -ne '/Pages active:\s+(\d+)/ and $a=$1; /Pages free:\s+(\d+)/ and $f=$1; /Pages wired down:\s+(\d+)/ and $w=$1; END { printf "%.1f", 100*($a+$w)/($a+$f+$w) }' || echo "0")
            else
                local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' || echo "0")
                local mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}' || echo "0")
            fi
            
            # PostgreSQL接続数
            local pg_connections=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
              -h"$POSTGRES_HOST" \
              -p"$POSTGRES_PORT" \
              -U"$POSTGRES_USER" \
              -d"$POSTGRES_DATABASE" \
              -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs || echo "0")
            
            log_message "   CPU: ${cpu_usage}%, メモリ: ${mem_usage}%, PG接続: ${pg_connections}"
            
            # アラート判定
            if (( $(echo "$cpu_usage > 80" | bc -l 2>/dev/null || echo 0) )); then
                log_message "🚨 CPU使用率高騰: ${cpu_usage}%"
                send_notification "🚨 移行中CPU使用率高騰: ${cpu_usage}%"
            fi
            
            if (( $(echo "$mem_usage > 85" | bc -l 2>/dev/null || echo 0) )); then
                log_message "🚨 メモリ使用率高騰: ${mem_usage}%"
                send_notification "🚨 移行中メモリ使用率高騰: ${mem_usage}%"
            fi
            
            last_check=$current_time
        fi
        
        sleep 30
    done
    
    # 移行完了確認
    wait $MIGRATION_PID
    local migration_exit_code=$?
    
    if [ $migration_exit_code -eq 0 ]; then
        log_message "✅ データ移行成功"
        return 0
    else
        log_message "❌ データ移行失敗 (終了コード: $migration_exit_code)"
        return 1
    fi
}

validate_migration_data() {
    log_message "=== データ整合性検証 ==="
    
    # データ検証スクリプト実行
    if ./scripts/validate-migration-data.sh > "$LOG_DIR/data_validation_$(date +%H%M%S).log" 2>&1; then
        log_message "✅ データ整合性検証成功"
        
        # 重要データサンプル確認
        log_message "重要データサンプル確認中..."
        
        # ユーザーデータ確認
        local user_count=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
          -h"$POSTGRES_HOST" \
          -p"$POSTGRES_PORT" \
          -U"$POSTGRES_USER" \
          -d"$POSTGRES_DATABASE" \
          -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
        
        # 週報データ確認
        local report_count=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
          -h"$POSTGRES_HOST" \
          -p"$POSTGRES_PORT" \
          -U"$POSTGRES_USER" \
          -d"$POSTGRES_DATABASE" \
          -t -c "SELECT COUNT(*) FROM weekly_reports;" 2>/dev/null | xargs || echo "0")
        
        log_message "   ユーザー数: $user_count"
        log_message "   週報数: $report_count"
        
        return 0
    else
        log_message "❌ データ整合性検証失敗"
        
        # 検証失敗詳細
        local validation_errors=$(grep -c "MISMATCH\|ERROR\|FAIL" "$LOG_DIR/data_validation_$(date +%H%M%S).log" 2>/dev/null || echo "unknown")
        log_message "   検証エラー数: $validation_errors"
        
        return 1
    fi
}

switch_to_postgresql() {
    log_message "=== PostgreSQL環境への切替 ==="
    
    # 環境変数バックアップ
    cp .env ".env.backup_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    
    # PostgreSQL用設定に更新
    log_message "環境変数更新中..."
    sed -i.bak \
      -e "s/DB_DRIVER=mysql/DB_DRIVER=postgres/g" \
      -e "s/DB_HOST=$MYSQL_HOST/DB_HOST=$POSTGRES_HOST/g" \
      -e "s/DB_PORT=$MYSQL_PORT/DB_PORT=$POSTGRES_PORT/g" \
      -e "s/DB_DATABASE=$MYSQL_DATABASE/DB_DATABASE=$POSTGRES_DATABASE/g" \
      -e "s/DB_USER=$MYSQL_USER/DB_USER=$POSTGRES_USER/g" \
      .env 2>/dev/null || true
    
    # Docker設定切替
    if [ -f "docker-compose.postgresql.yml" ]; then
        cp docker-compose.yml docker-compose.mysql.yml.backup 2>/dev/null || true
        cp docker-compose.postgresql.yml docker-compose.yml
        log_message "✅ Docker Compose設定切替完了"
    fi
    
    log_message "✅ PostgreSQL環境設定切替完了"
}

start_applications_postgresql() {
    log_message "=== PostgreSQL環境でのアプリケーション起動 ==="
    
    # PostgreSQL接続最終確認
    if ! PGPASSWORD="$POSTGRES_PASSWORD" psql \
      -h"$POSTGRES_HOST" \
      -p"$POSTGRES_PORT" \
      -U"$POSTGRES_USER" \
      -d"$POSTGRES_DATABASE" \
      -c "SELECT 'PostgreSQL接続成功' as status;" > /dev/null 2>&1; then
        log_message "❌ PostgreSQL接続失敗"
        return 1
    fi
    
    # バックエンド起動
    log_message "バックエンド起動中..."
    docker-compose up -d backend > /dev/null 2>&1
    
    # 起動確認
    sleep 10
    local health_check_attempts=0
    while [ $health_check_attempts -lt 6 ]; do
        if curl -f http://localhost:8080/health > /dev/null 2>&1; then
            log_message "✅ バックエンド起動成功"
            break
        fi
        
        health_check_attempts=$((health_check_attempts + 1))
        sleep 5
    done
    
    if [ $health_check_attempts -ge 6 ]; then
        log_message "❌ バックエンド起動失敗"
        docker-compose logs backend | tail -10 | tee -a "$CONTROLLER_LOG"
        return 1
    fi
    
    # フロントエンド起動
    log_message "フロントエンド起動中..."
    docker-compose up -d frontend > /dev/null 2>&1
    
    # 起動確認
    sleep 15
    local frontend_check_attempts=0
    while [ $frontend_check_attempts -lt 6 ]; do
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            log_message "✅ フロントエンド起動成功"
            return 0
        fi
        
        frontend_check_attempts=$((frontend_check_attempts + 1))
        sleep 5
    done
    
    if [ $frontend_check_attempts -ge 6 ]; then
        log_message "⚠️ フロントエンド起動確認失敗 - 手動確認が必要"
        docker-compose logs frontend | tail -10 | tee -a "$CONTROLLER_LOG"
    fi
    
    return 0
}

test_critical_functions() {
    log_message "=== 重要機能動作確認 ==="
    
    # API動作確認
    log_message "API動作確認中..."
    
    # ヘルスチェック
    if curl -s http://localhost:8080/health | jq '.status' | grep -q "ok"; then
        log_message "✅ ヘルスチェックAPI正常"
    else
        log_message "⚠️ ヘルスチェックAPI異常"
    fi
    
    # データベース動作確認
    log_message "データベース動作確認中..."
    
    # 基本SELECT操作
    local test_query_result=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
      -h"$POSTGRES_HOST" \
      -p"$POSTGRES_PORT" \
      -U"$POSTGRES_USER" \
      -d"$POSTGRES_DATABASE" \
      -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "error")
    
    if [ "$test_query_result" != "error" ] && [ "$test_query_result" -gt 0 ]; then
        log_message "✅ データベース基本操作確認完了"
    else
        log_message "❌ データベース基本操作失敗"
        return 1
    fi
    
    # INSERT/DELETE テスト
    local test_user_id=$(uuidgen 2>/dev/null || echo "test-$(date +%s)")
    if PGPASSWORD="$POSTGRES_PASSWORD" psql \
      -h"$POSTGRES_HOST" \
      -p"$POSTGRES_PORT" \
      -U"$POSTGRES_USER" \
      -d"$POSTGRES_DATABASE" \
      -c "INSERT INTO users (id, name, email, created_at, updated_at) 
          VALUES ('$test_user_id', 'Migration Test', 'test@migration.com', NOW(), NOW());" > /dev/null 2>&1; then
        
        # テストデータ削除
        PGPASSWORD="$POSTGRES_PASSWORD" psql \
          -h"$POSTGRES_HOST" \
          -p"$POSTGRES_PORT" \
          -U"$POSTGRES_USER" \
          -d"$POSTGRES_DATABASE" \
          -c "DELETE FROM users WHERE id = '$test_user_id';" > /dev/null 2>&1
        
        log_message "✅ データベースCRUD操作確認完了"
    else
        log_message "⚠️ データベースCRUD操作確認失敗"
    fi
    
    return 0
}

end_maintenance_mode() {
    log_message "=== メンテナンスモード解除 ==="
    
    # メンテナンスモード解除
    if [ -n "$API_BASE_URL" ] && [ -n "$ADMIN_TOKEN" ]; then
        curl -X POST "$API_BASE_URL/admin/maintenance" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"enabled": false}' > /dev/null 2>&1 || true
    fi
    
    # 復旧通知
    send_notification "✅ Monsteraシステム復旧完了：PostgreSQL移行が正常に完了しました。ご利用いただけます。"
    
    log_message "✅ メンテナンスモード解除・復旧通知完了"
}

perform_final_validation() {
    log_message "=== 最終検証・成功判定 ==="
    
    local validation_passed=true
    
    # データ整合性確認
    if ./scripts/validate-migration-data.sh > "$LOG_DIR/final_validation_$(date +%H%M%S).log" 2>&1; then
        log_message "✅ 最終データ整合性検証成功"
    else
        log_message "❌ 最終データ整合性検証失敗"
        validation_passed=false
    fi
    
    # 機能動作確認
    if test_critical_functions; then
        log_message "✅ 重要機能動作確認成功"
    else
        log_message "❌ 重要機能動作確認失敗"
        validation_passed=false
    fi
    
    # エラー率確認
    local error_count=$(docker-compose logs backend --since="1h" | grep -i "error\|exception" | wc -l || echo "0")
    if [ "$error_count" -lt 10 ]; then
        log_message "✅ エラー率確認: ${error_count}件/時間 (許容範囲内)"
    else
        log_message "⚠️ エラー率高い: ${error_count}件/時間"
        validation_passed=false
    fi
    
    # 総合判定
    if [ "$validation_passed" = true ]; then
        MIGRATION_SUCCESS=true
        log_message "🎉 移行成功判定: SUCCESS"
        send_notification "🎉 PostgreSQL移行成功！全ての検証が完了しました。"
        return 0
    else
        MIGRATION_SUCCESS=false
        log_message "⚠️ 移行部分成功: 監視継続が必要"
        send_notification "⚠️ PostgreSQL移行部分成功：監視継続中"
        return 1
    fi
}

cleanup_processes() {
    log_message "=== プロセスクリーンアップ ==="
    
    # 監視プロセス停止
    if [ -n "$MONITOR_PID" ] && ps -p $MONITOR_PID > /dev/null 2>/dev/null; then
        kill $MONITOR_PID 2>/dev/null || true
        log_message "✅ 性能監視プロセス停止"
    fi
    
    if [ -n "$PROGRESS_MONITOR_PID" ] && ps -p $PROGRESS_MONITOR_PID > /dev/null 2>/dev/null; then
        kill $PROGRESS_MONITOR_PID 2>/dev/null || true
        log_message "✅ 進捗監視プロセス停止"
    fi
    
    # 一時ファイル整理
    find /tmp -name "*migration*" -mmin +60 -delete 2>/dev/null || true
    
    log_message "✅ クリーンアップ完了"
}

generate_completion_report() {
    log_message "=== 移行完了報告書生成 ==="
    
    local completion_report="$LOG_DIR/migration_completion_report_$(date +%H%M%S).md"
    local total_time=$(( $(date +%s) - $(date -d "$MIGRATION_START_TIME" +%s) ))
    
    cat > "$completion_report" << EOF
# PostgreSQL移行完了報告書

## 移行概要
- **実行日時**: $(date +%Y年%m月%d日) $MIGRATION_START_TIME - $(date +%H:%M)
- **総実行時間**: $((total_time / 60))分 $((total_time % 60))秒
- **移行結果**: $([ "$MIGRATION_SUCCESS" = true ] && echo "成功" || echo "部分成功")
- **移行方式**: Blue-Greenデプロイメント + 一括データ移行

## 実行フェーズ
1. **Phase 0**: 準備フェーズ
   - チーム出席確認: $([ "$TEAM_PRESENT" = true ] && echo "完了" || echo "未完了")
   - Go/No-Go判定: 実行決定

2. **Phase 1**: 移行前準備
   - メンテナンス開始: 完了
   - アプリケーション停止: 完了
   - MySQL最終バックアップ: 完了
   - PostgreSQL環境確認: 完了

3. **Phase 2**: データ移行実行
   - 一括データ移行: $([ "$MIGRATION_SUCCESS" = true ] && echo "成功" || echo "要確認")
   - リアルタイム監視: 実行

4. **Phase 3**: 検証・切替
   - データ整合性検証: $([ "$MIGRATION_SUCCESS" = true ] && echo "成功" || echo "要確認")
   - PostgreSQL環境切替: 完了
   - アプリケーション起動: 完了

5. **Phase 4**: 本格稼働
   - メンテナンス解除: 完了
   - 機能動作確認: $([ "$MIGRATION_SUCCESS" = true ] && echo "成功" || echo "要確認")
   - 最終検証: $([ "$MIGRATION_SUCCESS" = true ] && echo "成功" || echo "要確認")

## 関連ファイル
- **実行ログ**: $CONTROLLER_LOG
- **タイムライン**: $TIMELINE_LOG
- **性能監視データ**: $LOG_DIR/performance_monitor_*.csv
- **データ検証結果**: $LOG_DIR/data_validation_*.log

## 今後の対応
- **24時間監視**: 継続中
- **運用チーム引継ぎ**: 必要
- **MySQL環境廃止**: 1週間後予定

**移行チーム**: 全員
**報告者**: 移行統制システム
**報告時刻**: $(date)
EOF

    log_message "✅ 移行完了報告書生成: $completion_report"
}

emergency_rollback() {
    log_message "🚨 緊急ロールバック開始 🚨"
    
    send_notification "🚨 緊急ロールバック実行中：MySQL環境に復旧します"
    
    # PostgreSQL接続停止
    docker-compose down backend frontend > /dev/null 2>&1 || true
    
    # MySQL環境復旧
    if [ -f ".env.backup_$(date +%Y%m%d)"* ]; then
        local latest_backup=$(ls -t .env.backup_$(date +%Y%m%d)* | head -1)
        cp "$latest_backup" .env
        log_message "✅ 環境変数ロールバック完了"
    fi
    
    if [ -f "docker-compose.mysql.yml.backup" ]; then
        cp docker-compose.mysql.yml.backup docker-compose.yml
        log_message "✅ Docker設定ロールバック完了"
    fi
    
    # MySQL環境起動
    docker-compose up -d mysql backend frontend > /dev/null 2>&1
    
    # 動作確認
    sleep 15
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log_message "✅ 緊急ロールバック成功"
        send_notification "✅ 緊急ロールバック完了：MySQL環境に復旧しました"
        return 0
    else
        log_message "❌ 緊急ロールバック失敗"
        send_notification "❌ 緊急ロールバック失敗：手動対応が必要です"
        return 1
    fi
}

main() {
    clear
    echo "================================================="
    echo -e "${BOLD}${BLUE}PostgreSQL移行当日統制システム${NC}"
    echo "================================================="
    echo "実行時刻: $(date)"
    echo "制御ログ: $CONTROLLER_LOG"
    echo "タイムライン: $TIMELINE_LOG"
    echo ""
    
    MIGRATION_START_TIME=$(date +%H:%M:%S)
    log_message "🚀 PostgreSQL移行統制システム開始"
    
    # Phase 0: 準備フェーズ (1:30-2:00)
    phase_header "Phase 0: 準備フェーズ" "1:30-2:00"
    
    if ! check_prerequisites; then
        log_message "❌ 事前条件未満たし - 移行中止"
        exit 1
    fi
    
    if ! team_attendance_check; then
        echo ""
        echo -e "${YELLOW}チームメンバー欠席がありますが、続行しますか？${NC}"
        echo -n "[y/n]: "
        read -r continue_response
        if [[ ! $continue_response =~ ^[Yy] ]]; then
            log_message "移行中止（チーム体制不備）"
            exit 1
        fi
    fi
    
    if ! go_nogo_decision; then
        log_message "移行中止（No-Go判定）"
        exit 1
    fi
    
    # Phase 1: 移行前準備 (2:00-2:30)
    phase_header "Phase 1: 移行前準備" "2:00-2:30"
    
    start_maintenance_mode
    stop_applications
    
    if ! create_final_backup; then
        log_message "❌ バックアップ取得失敗 - 移行中止"
        exit 1
    fi
    
    if ! verify_postgresql_ready; then
        log_message "❌ PostgreSQL環境準備未完了 - 移行中止"
        exit 1
    fi
    
    # Phase 2: データ移行実行 (2:30-3:30)
    phase_header "Phase 2: データ移行実行" "2:30-3:30"
    
    start_performance_monitoring
    
    if ! execute_migration; then
        log_message "❌ 移行実行開始失敗 - 緊急対応が必要"
        
        echo ""
        echo -e "${RED}移行実行に失敗しました。緊急ロールバックを実行しますか？${NC}"
        echo -n "[y/n]: "
        read -r rollback_response
        if [[ $rollback_response =~ ^[Yy] ]]; then
            emergency_rollback
        fi
        exit 1
    fi
    
    if ! monitor_migration_progress; then
        log_message "❌ データ移行失敗 - 緊急対応が必要"
        
        echo ""
        echo -e "${RED}データ移行に失敗しました。緊急ロールバックを実行しますか？${NC}"
        echo -n "[y/n]: "
        read -r rollback_response
        if [[ $rollback_response =~ ^[Yy] ]]; then
            emergency_rollback
        fi
        exit 1
    fi
    
    # Phase 3: 検証・切替 (3:30-4:00)
    phase_header "Phase 3: 検証・切替" "3:30-4:00"
    
    if ! validate_migration_data; then
        log_message "❌ データ検証失敗 - 緊急対応が必要"
        
        echo ""
        echo -e "${RED}データ検証に失敗しました。緊急ロールバックを実行しますか？${NC}"
        echo -n "[y/n]: "
        read -r rollback_response
        if [[ $rollback_response =~ ^[Yy] ]]; then
            emergency_rollback
        fi
        exit 1
    fi
    
    switch_to_postgresql
    
    if ! start_applications_postgresql; then
        log_message "❌ PostgreSQL環境でのアプリケーション起動失敗"
        
        echo ""
        echo -e "${RED}アプリケーション起動に失敗しました。緊急ロールバックを実行しますか？${NC}"
        echo -n "[y/n]: "
        read -r rollback_response
        if [[ $rollback_response =~ ^[Yy] ]]; then
            emergency_rollback
        fi
        exit 1
    fi
    
    # Phase 4: 本格稼働・監視 (4:00-5:00)
    phase_header "Phase 4: 本格稼働・監視" "4:00-5:00"
    
    end_maintenance_mode
    test_critical_functions
    
    # 15分間安定性監視
    log_message "15分間安定性監視開始..."
    local stability_start=$(date +%s)
    local stability_duration=900  # 15分
    
    while [ $(($(date +%s) - stability_start)) -lt $stability_duration ]; do
        if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
            log_message "❌ 安定性監視中にヘルスチェック失敗"
            break
        fi
        
        local remaining=$((stability_duration - ($(date +%s) - stability_start)))
        log_message "安定性監視中... 残り${remaining}秒"
        
        sleep 60
    done
    
    # Phase 5: 完了・判定 (5:00-6:00)
    phase_header "Phase 5: 完了・判定" "5:00-6:00"
    
    perform_final_validation
    cleanup_processes
    generate_completion_report
    
    # 最終メッセージ
    echo ""
    echo "================================================="
    echo -e "${BOLD}🎉 PostgreSQL移行統制完了 🎉${NC}"
    echo "================================================="
    echo ""
    echo "実行時間: $MIGRATION_START_TIME - $(date +%H:%M:%S)"
    echo "移行結果: $([ "$MIGRATION_SUCCESS" = true ] && echo -e "${GREEN}成功${NC}" || echo -e "${YELLOW}部分成功${NC}")"
    echo "制御ログ: $CONTROLLER_LOG"
    echo "完了報告: $LOG_DIR/migration_completion_report_*.md"
    echo ""
    
    if [ "$MIGRATION_SUCCESS" = true ]; then
        echo -e "${GREEN}移行チームの皆様、お疲れ様でした！${NC}"
        send_notification "🎉 PostgreSQL移行統制完了：移行が正常に完了しました！"
        exit 0
    else
        echo -e "${YELLOW}部分成功のため、継続監視が必要です。${NC}"
        send_notification "⚠️ PostgreSQL移行統制完了：部分成功のため継続監視中"
        exit 1
    fi
}

# スクリプト実行前確認
if [ "$#" -gt 0 ] && [ "$1" = "--dry-run" ]; then
    echo "DRY RUN MODE: 実際の移行は実行されません"
    echo "事前条件確認のみ実行します..."
    check_prerequisites
    exit 0
fi

# 実行確認
echo -e "${YELLOW}PostgreSQL移行統制システムを開始しますか？${NC}"
echo "この操作により、以下が実行されます："
echo "- メンテナンスモード開始"
echo "- アプリケーション停止"
echo "- データベース移行"
echo "- PostgreSQL環境への切替"
echo ""
echo -n "続行しますか？ [yes/no]: "
read -r confirmation

if [ "$confirmation" = "yes" ]; then
    main
else
    echo "移行統制をキャンセルしました。"
    exit 0
fi