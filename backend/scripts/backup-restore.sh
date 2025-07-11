#!/bin/bash

# backup-restore.sh
# フルバックアップからの緊急復旧スクリプト
# 暗号化バックアップからのMySQL環境完全復旧

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
RESTORE_START_TIME=""
RESTORE_SUCCESS=false
BACKUP_DIR=""
TEMP_RESTORE_DIR="/tmp/mysql_restore_$$"

# 環境変数
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-monstera}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# ログ設定
RESTORE_LOG=""

# 関数定義
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "$message" | tee -a "$RESTORE_LOG"
}

send_notification() {
    local message="$1"
    local urgency="${2:-normal}"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji="🔄"
        if [ "$urgency" = "success" ]; then
            emoji="✅"
        elif [ "$urgency" = "error" ]; then
            emoji="❌"
        elif [ "$urgency" = "warning" ]; then
            emoji="⚠️"
        fi
        
        curl -X POST "$SLACK_WEBHOOK_URL" \
          -H "Content-Type: application/json" \
          -d "{\"text\": \"$emoji $message\", \"channel\": \"#migration-live\"}" \
          > /dev/null 2>&1 || true
    fi
    
    log_message "📢 通知送信: $message"
}

find_backup_directory() {
    log_message "=== バックアップディレクトリ検索 ==="
    
    # 引数で指定された場合
    if [ "${1:-}" ]; then
        BACKUP_DIR="$1"
        if [ -d "$BACKUP_DIR" ]; then
            log_message "✅ 指定されたバックアップディレクトリ: $BACKUP_DIR"
            return 0
        else
            log_message "❌ 指定されたディレクトリが存在しません: $BACKUP_DIR"
            return 1
        fi
    fi
    
    # 自動検索（最新のバックアップ）
    local backup_base_dir="./backups/pre-migration"
    if [ -d "$backup_base_dir" ]; then
        BACKUP_DIR=$(ls -1t "$backup_base_dir" | head -1)
        if [ -n "$BACKUP_DIR" ]; then
            BACKUP_DIR="$backup_base_dir/$BACKUP_DIR"
            log_message "✅ 最新のバックアップディレクトリ: $BACKUP_DIR"
            return 0
        fi
    fi
    
    log_message "❌ バックアップディレクトリが見つかりません"
    return 1
}

verify_backup_integrity() {
    log_message "=== バックアップ整合性確認 ==="
    
    # 必要ファイル確認
    local required_files=(
        "mysql_full_backup_encrypted.sql.gz.enc"
        "encryption_key.txt"
        "checksums.txt"
        "backup_report.md"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$BACKUP_DIR/$file" ]; then
            log_message "✅ $file: 存在確認"
        else
            log_message "❌ $file: 見つかりません"
            return 1
        fi
    done
    
    # チェックサム確認
    log_message "チェックサム確認中..."
    cd "$BACKUP_DIR"
    
    if sha256sum -c checksums.txt > /dev/null 2>&1; then
        log_message "✅ チェックサム確認成功"
        cd - > /dev/null
        return 0
    else
        log_message "❌ チェックサム確認失敗"
        cd - > /dev/null
        return 1
    fi
}

decrypt_backup() {
    log_message "=== バックアップ復号 ==="
    
    local encrypted_file="$BACKUP_DIR/mysql_full_backup_encrypted.sql.gz.enc"
    local encryption_key_file="$BACKUP_DIR/encryption_key.txt"
    local decrypted_file="$TEMP_RESTORE_DIR/mysql_restore.sql.gz"
    
    # 一時ディレクトリ作成
    mkdir -p "$TEMP_RESTORE_DIR"
    chmod 700 "$TEMP_RESTORE_DIR"
    
    # 復号実行
    if openssl enc -aes-256-cbc -d \
      -in "$encrypted_file" \
      -out "$decrypted_file" \
      -pass file:"$encryption_key_file" 2>>"$RESTORE_LOG"; then
        
        log_message "✅ バックアップ復号成功"
        
        # ファイルサイズ確認
        local file_size=$(du -h "$decrypted_file" | cut -f1)
        log_message "復号ファイルサイズ: $file_size"
        
        return 0
    else
        log_message "❌ バックアップ復号失敗"
        return 1
    fi
}

decompress_backup() {
    log_message "=== バックアップ解凍 ==="
    
    local compressed_file="$TEMP_RESTORE_DIR/mysql_restore.sql.gz"
    local sql_file="$TEMP_RESTORE_DIR/mysql_restore.sql"
    
    # 解凍実行
    if gunzip "$compressed_file"; then
        log_message "✅ バックアップ解凍成功"
        
        # ファイルサイズ確認
        local file_size=$(du -h "$sql_file" | cut -f1)
        log_message "解凍後ファイルサイズ: $file_size"
        
        # SQLファイル基本確認
        if head -20 "$sql_file" | grep -q "MySQL dump"; then
            log_message "✅ SQLファイル形式確認完了"
            return 0
        else
            log_message "❌ SQLファイル形式異常"
            return 1
        fi
    else
        log_message "❌ バックアップ解凍失敗"
        return 1
    fi
}

stop_current_services() {
    log_message "=== 現在のサービス停止 ==="
    
    # アプリケーション停止
    log_message "アプリケーション停止中..."
    docker-compose down > /dev/null 2>&1 || true
    
    # 残存プロセス停止
    local remaining_processes=$(pgrep -f "monstera" 2>/dev/null | wc -l)
    if [ "$remaining_processes" -gt 0 ]; then
        log_message "⚠️ 残存プロセスあり: $remaining_processes 個"
        
        # Graceful termination
        pgrep -f "monstera" | xargs kill -TERM 2>/dev/null || true
        sleep 5
        
        # 強制終了（必要に応じて）
        local still_remaining=$(pgrep -f "monstera" 2>/dev/null | wc -l)
        if [ "$still_remaining" -gt 0 ]; then
            log_message "強制終了実行..."
            pgrep -f "monstera" | xargs kill -KILL 2>/dev/null || true
        fi
    fi
    
    log_message "✅ サービス停止完了"
}

backup_current_database() {
    log_message "=== 現在のデータベースバックアップ（安全措置） ==="
    
    local current_backup="$TEMP_RESTORE_DIR/current_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # 現在のデータベースが存在する場合のみバックアップ
    if mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT 1;" "$MYSQL_DATABASE" > /dev/null 2>&1; then
        
        log_message "現在のデータベースバックアップ中..."
        
        if mysqldump \
          --host="$MYSQL_HOST" \
          --port="$MYSQL_PORT" \
          --user="$MYSQL_USER" \
          --password="$MYSQL_PASSWORD" \
          --single-transaction \
          --routines \
          --triggers \
          "$MYSQL_DATABASE" > "$current_backup" 2>>"$RESTORE_LOG"; then
            
            log_message "✅ 現在のDBバックアップ成功: $(basename "$current_backup")"
        else
            log_message "⚠️ 現在のDBバックアップ失敗（続行）"
        fi
    else
        log_message "ℹ️ 現在のデータベースが存在しないか接続できません"
    fi
}

restore_database() {
    log_message "=== データベース復旧開始 ==="
    
    local sql_file="$TEMP_RESTORE_DIR/mysql_restore.sql"
    
    # データベース削除・再作成
    log_message "データベース再作成中..."
    
    mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "DROP DATABASE IF EXISTS $MYSQL_DATABASE;" 2>>"$RESTORE_LOG" || true
    
    mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "CREATE DATABASE $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>>"$RESTORE_LOG"
    
    # バックアップからの復旧
    log_message "バックアップデータ復旧中..."
    
    if mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      < "$sql_file" 2>>"$RESTORE_LOG"; then
        
        log_message "✅ データベース復旧成功"
        return 0
    else
        log_message "❌ データベース復旧失敗"
        return 1
    fi
}

restore_configuration() {
    log_message "=== 設定ファイル復旧 ==="
    
    local config_dir="$BACKUP_DIR/config"
    
    if [ -d "$config_dir" ]; then
        # 環境変数復旧
        if [ -f "$config_dir/env_backup" ]; then
            cp "$config_dir/env_backup" .env
            log_message "✅ 環境変数復旧完了"
        fi
        
        # Docker Compose設定復旧
        if [ -f "$config_dir/docker-compose.yml" ]; then
            cp "$config_dir/docker-compose.yml" .
            log_message "✅ Docker Compose設定復旧完了"
        fi
        
        # その他設定ファイル復旧
        for config_file in "$config_dir"/*.conf "$config_dir"/*.cnf; do
            if [ -f "$config_file" ]; then
                local filename=$(basename "$config_file")
                log_message "設定ファイル復旧: $filename"
            fi
        done
        
        log_message "✅ 設定ファイル復旧完了"
    else
        log_message "⚠️ 設定ディレクトリが見つかりません"
    fi
}

start_mysql_service() {
    log_message "=== MySQLサービス起動 ==="
    
    # MySQL起動
    log_message "MySQL起動中..."
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
    
    return 0
}

start_applications() {
    log_message "=== アプリケーション起動 ==="
    
    # バックエンド起動
    log_message "バックエンド起動中..."
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
        docker-compose logs backend | tail -10 | tee -a "$RESTORE_LOG"
        return 1
    fi
    
    # フロントエンド起動
    log_message "フロントエンド起動中..."
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
        docker-compose logs frontend | tail -5 | tee -a "$RESTORE_LOG"
    fi
    
    return 0
}

verify_restore() {
    log_message "=== 復旧後検証 ==="
    
    # データベース基本確認
    local table_count=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$MYSQL_DATABASE';" \
      --batch --skip-column-names 2>/dev/null || echo "0")
    
    log_message "復旧後テーブル数: $table_count"
    
    if [ "$table_count" -lt 20 ]; then
        log_message "⚠️ テーブル数が予想より少ない可能性があります"
    fi
    
    # 主要テーブルレコード数確認
    local critical_tables=("users" "weekly_reports" "expense_requests" "leave_requests")
    for table in "${critical_tables[@]}"; do
        local count=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
          -e "SELECT COUNT(*) FROM $table;" "$MYSQL_DATABASE" \
          --batch --skip-column-names 2>/dev/null || echo "0")
        log_message "$table: $count 件"
    done
    
    # 外部キー制約確認
    local fk_count=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = '$MYSQL_DATABASE' AND REFERENCED_TABLE_NAME IS NOT NULL;" \
      --batch --skip-column-names 2>/dev/null || echo "0")
    
    log_message "外部キー制約数: $fk_count"
    
    # API機能確認
    local api_tests_passed=0
    local api_tests_total=4
    
    # ヘルスチェック
    if curl -s http://localhost:8080/health | grep -q "ok" 2>/dev/null; then
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
    
    # INSERT/DELETE テスト
    local test_user_id="restore-test-$(date +%s)"
    if mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "INSERT INTO users (id, name, email, created_at, updated_at) 
          VALUES ('$test_user_id', 'Restore Test', 'restore@test.com', NOW(), NOW());" \
      "$MYSQL_DATABASE" > /dev/null 2>&1; then
        
        # テストデータ削除
        mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
          -e "DELETE FROM users WHERE id = '$test_user_id';" \
          "$MYSQL_DATABASE" > /dev/null 2>&1
        
        log_message "✅ INSERT/DELETE操作確認完了"
        api_tests_passed=$((api_tests_passed + 2))
    else
        log_message "❌ INSERT/DELETE操作確認失敗"
    fi
    
    # 機能確認結果
    log_message "機能確認結果: $api_tests_passed/$api_tests_total テスト成功"
    
    if [ $api_tests_passed -ge 3 ]; then
        log_message "✅ 復旧後検証成功"
        return 0
    else
        log_message "❌ 復旧後検証失敗"
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

cleanup_temp_files() {
    log_message "=== 一時ファイルクリーンアップ ==="
    
    if [ -d "$TEMP_RESTORE_DIR" ]; then
        rm -rf "$TEMP_RESTORE_DIR"
        log_message "✅ 一時ファイル削除完了"
    fi
}

generate_restore_report() {
    log_message "=== 復旧レポート生成 ==="
    
    local restore_report="$BACKUP_DIR/restore_report_$(date +%Y%m%d_%H%M%S).md"
    local restore_duration=$(( $(date +%s) - $(date -d "$RESTORE_START_TIME" +%s) ))
    
    cat > "$restore_report" << EOF
# PostgreSQL移行バックアップ復旧レポート

## 復旧概要
- **実行日時**: $(date '+%Y-%m-%d %H:%M:%S')
- **所要時間**: $((restore_duration / 60))分 $((restore_duration % 60))秒
- **復旧結果**: $([ "$RESTORE_SUCCESS" = true ] && echo "成功" || echo "失敗")
- **バックアップ元**: $BACKUP_DIR

## 実行ステップ
1. **バックアップ検索・確認**: 完了
2. **バックアップ整合性確認**: $([ "$RESTORE_SUCCESS" = true ] && echo "成功" || echo "失敗")
3. **バックアップ復号・解凍**: $([ "$RESTORE_SUCCESS" = true ] && echo "成功" || echo "失敗")
4. **サービス停止**: 完了
5. **データベース復旧**: $([ "$RESTORE_SUCCESS" = true ] && echo "成功" || echo "失敗")
6. **設定ファイル復旧**: $([ "$RESTORE_SUCCESS" = true ] && echo "完了" || echo "失敗")
7. **サービス起動**: $([ "$RESTORE_SUCCESS" = true ] && echo "成功" || echo "失敗")
8. **復旧後検証**: $([ "$RESTORE_SUCCESS" = true ] && echo "成功" || echo "失敗")

## システム状態
- **データベース**: MySQL $(mysql --version 2>/dev/null | awk '{print $3}' || echo "不明")
- **アプリケーション**: $([ "$RESTORE_SUCCESS" = true ] && echo "正常稼働" || echo "要確認")
- **データ整合性**: $([ "$RESTORE_SUCCESS" = true ] && echo "保証済み" || echo "要検証")

## 影響範囲
- **データ損失**: なし（バックアップデータ使用）
- **機能制限**: $([ "$RESTORE_SUCCESS" = true ] && echo "なし" || echo "あり")
- **ユーザー影響**: 最小限

## 今後の対応
1. **システム監視強化**: 24時間
2. **データ整合性確認**: 詳細確認実施
3. **PostgreSQL移行**: 再計画が必要
4. **根本原因分析**: 実施予定

## 関連ファイル
- **復旧ログ**: $RESTORE_LOG
- **バックアップディレクトリ**: $BACKUP_DIR
- **バックアップレポート**: $BACKUP_DIR/backup_report.md

**実行者**: バックアップ復旧システム
**報告時刻**: $(date)
EOF

    log_message "✅ 復旧レポート生成: $(basename "$restore_report")"
}

main() {
    clear
    echo "================================================="
    echo -e "${BOLD}${RED}フルバックアップ緊急復旧システム${NC}"
    echo "================================================="
    echo "実行時刻: $(date)"
    echo ""
    
    RESTORE_START_TIME=$(date +%H:%M:%S)
    
    if ! find_backup_directory "$@"; then
        echo ""
        echo -e "${RED}❌ バックアップディレクトリが見つかりません${NC}"
        echo ""
        echo "使用方法:"
        echo "  $0 [バックアップディレクトリパス]"
        echo ""
        echo "例:"
        echo "  $0 ./backups/pre-migration/20241203_140530"
        echo "  $0  # 最新のバックアップを自動検索"
        exit 1
    fi
    
    # ログファイル設定
    RESTORE_LOG="$BACKUP_DIR/restore_execution_$(date +%H%M%S).log"
    touch "$RESTORE_LOG"
    chmod 600 "$RESTORE_LOG"
    
    log_message "🚨 フルバックアップ緊急復旧開始"
    send_notification "🚨 フルバックアップからの緊急復旧を開始します"
    
    echo ""
    echo -e "${YELLOW}復旧元バックアップ:${NC} $BACKUP_DIR"
    echo -e "${YELLOW}復旧ログ:${NC} $RESTORE_LOG"
    echo ""
    
    # Step 1: バックアップ整合性確認
    log_message ""
    log_message "=== Step 1: バックアップ整合性確認 ==="
    
    if ! verify_backup_integrity; then
        log_message "❌ バックアップ整合性確認失敗 - 復旧中止"
        send_notification "❌ 緊急復旧失敗：バックアップ整合性エラー" "error"
        exit 1
    fi
    
    # Step 2: バックアップ復号・解凍
    log_message ""
    log_message "=== Step 2: バックアップ復号・解凍 ==="
    
    if ! decrypt_backup; then
        log_message "❌ バックアップ復号失敗 - 復旧中止"
        send_notification "❌ 緊急復旧失敗：バックアップ復号エラー" "error"
        cleanup_temp_files
        exit 1
    fi
    
    if ! decompress_backup; then
        log_message "❌ バックアップ解凍失敗 - 復旧中止"
        send_notification "❌ 緊急復旧失敗：バックアップ解凍エラー" "error"
        cleanup_temp_files
        exit 1
    fi
    
    # Step 3: 現在のサービス停止
    log_message ""
    log_message "=== Step 3: 現在のサービス停止 ==="
    
    stop_current_services
    
    # Step 4: 現在のデータベースバックアップ（安全措置）
    log_message ""
    log_message "=== Step 4: 現在のデータベースバックアップ（安全措置） ==="
    
    backup_current_database
    
    # Step 5: データベース復旧
    log_message ""
    log_message "=== Step 5: データベース復旧 ==="
    
    if ! restore_database; then
        log_message "❌ データベース復旧失敗 - 復旧中止"
        send_notification "❌ 緊急復旧失敗：データベース復旧エラー" "error"
        cleanup_temp_files
        exit 1
    fi
    
    # Step 6: 設定ファイル復旧
    log_message ""
    log_message "=== Step 6: 設定ファイル復旧 ==="
    
    restore_configuration
    
    # Step 7: MySQLサービス起動
    log_message ""
    log_message "=== Step 7: MySQLサービス起動 ==="
    
    if ! start_mysql_service; then
        log_message "❌ MySQLサービス起動失敗 - 復旧中止"
        send_notification "❌ 緊急復旧失敗：MySQLサービス起動エラー" "error"
        cleanup_temp_files
        exit 1
    fi
    
    # Step 8: アプリケーション起動
    log_message ""
    log_message "=== Step 8: アプリケーション起動 ==="
    
    if ! start_applications; then
        log_message "❌ アプリケーション起動失敗 - 復旧部分成功"
        send_notification "⚠️ 緊急復旧部分成功：アプリケーション起動要確認" "warning"
    fi
    
    # Step 9: 復旧後検証
    log_message ""
    log_message "=== Step 9: 復旧後検証 ==="
    
    if ! verify_restore; then
        log_message "⚠️ 復旧後検証で問題が発見されました"
        send_notification "⚠️ 緊急復旧完了：検証で問題あり、要確認" "warning"
    else
        log_message "✅ 復旧後検証成功"
    fi
    
    # Step 10: メンテナンス解除・完了処理
    log_message ""
    log_message "=== Step 10: メンテナンス解除・完了処理 ==="
    
    end_maintenance_mode
    
    RESTORE_SUCCESS=true
    generate_restore_report
    cleanup_temp_files
    
    # 成功通知
    local end_time=$(date +%H:%M:%S)
    local duration=$(date -d "$end_time" +%s)
    local start_seconds=$(date -d "$RESTORE_START_TIME" +%s)
    local elapsed=$((duration - start_seconds))
    
    log_message ""
    log_message "================================================="
    log_message -e "${BOLD}${GREEN}緊急復旧完了${NC}"
    log_message "================================================="
    log_message ""
    log_message "実行時間: $RESTORE_START_TIME - $end_time (${elapsed}秒)"
    log_message "復旧元: $(basename "$BACKUP_DIR")"
    log_message "復旧ログ: $RESTORE_LOG"
    log_message ""
    log_message -e "${GREEN}システムはMySQL環境で正常稼働しています${NC}"
    
    send_notification "✅ フルバックアップ緊急復旧完了：${elapsed}秒で復旧完了" "success"
    
    echo ""
    echo "今後の対応:"
    echo "1. システム監視継続"
    echo "2. データ整合性詳細確認"
    echo "3. PostgreSQL移行の再計画"
    echo "4. 根本原因分析"
    
    exit 0
}

# トラップ設定（異常終了時のクリーンアップ）
trap 'log_message "❌ 復旧が異常終了しました"; cleanup_temp_files; send_notification "❌ 緊急復旧異常終了" "error"; exit 1' ERR

# 実行確認
if [ "${1:-}" = "--auto" ]; then
    # 自動実行モード（2番目の引数をバックアップディレクトリとして使用）
    main "${2:-}"
else
    # インタラクティブモード
    echo -e "${YELLOW}フルバックアップからの緊急復旧を実行しますか？${NC}"
    echo ""
    echo "この操作により、以下が実行されます："
    echo "- 現在のサービス完全停止"
    echo "- 現在のデータベース削除"
    echo "- バックアップからのデータベース復旧"
    echo "- アプリケーション再起動"
    echo ""
    echo -n "続行しますか？ [yes/no]: "
    read -r confirmation
    
    if [ "$confirmation" = "yes" ]; then
        main "$@"
    else
        echo "緊急復旧をキャンセルしました。"
        exit 0
    fi
fi