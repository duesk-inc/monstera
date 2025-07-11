#!/bin/bash

# full-backup-executor.sh
# PostgreSQL移行直前のフルバックアップ自動実行スクリプト
# 完全自動化されたバックアップシステム

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
BACKUP_START_TIME=""
BACKUP_SUCCESS=false
BACKUP_SIZE=""
ENCRYPTED_FILE=""

# 環境変数
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-monstera}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# バックアップ設定
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_BASE_DIR="./backups/pre-migration"
BACKUP_DIR="$BACKUP_BASE_DIR/$BACKUP_DATE"
PERFORM_RECOVERY_TEST="${PERFORM_RECOVERY_TEST:-false}"

# ログ設定
LOG_FILE="$BACKUP_DIR/backup_execution.log"

# 関数定義
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "$message" | tee -a "$LOG_FILE"
}

send_notification() {
    local message="$1"
    local urgency="${2:-normal}"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji="💾"
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

check_prerequisites() {
    log_message "=== 事前環境確認 ==="
    
    # 必要ツール確認
    local tools=("mysql" "mysqldump" "gzip" "tar" "openssl")
    for tool in "${tools[@]}"; do
        if command -v "$tool" > /dev/null; then
            log_message "✅ $tool: 利用可能"
        else
            log_message "❌ $tool: 未インストール"
            return 1
        fi
    done
    
    # 環境変数確認
    if [ -z "$MYSQL_PASSWORD" ]; then
        log_message "❌ MYSQL_PASSWORD が設定されていません"
        return 1
    fi
    
    # MySQL接続確認
    if mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT 'MySQL接続成功' as status;" "$MYSQL_DATABASE" > /dev/null 2>&1; then
        log_message "✅ MySQL接続確認完了"
    else
        log_message "❌ MySQL接続失敗"
        return 1
    fi
    
    return 0
}

prepare_backup_directory() {
    log_message "=== バックアップディレクトリ準備 ==="
    
    # ディレクトリ作成
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$BACKUP_BASE_DIR"
    
    # ログファイル初期化
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chmod 600 "$LOG_FILE"
    
    log_message "✅ バックアップディレクトリ準備完了: $BACKUP_DIR"
}

check_disk_space() {
    log_message "=== 必要容量確認 ==="
    
    # 現在のMySQLデータサイズ確認
    local current_db_size=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) as size_mb 
          FROM information_schema.tables 
          WHERE table_schema = '$MYSQL_DATABASE';" \
      --batch --skip-column-names 2>/dev/null || echo "0")
    
    log_message "現在のDBサイズ: ${current_db_size}MB"
    
    # 必要容量計算（データ + 圧縮 + バッファ = 約3倍）
    local required_space=$(echo "$current_db_size * 3" | bc -l 2>/dev/null || echo "$((${current_db_size%.*} * 3))")
    log_message "必要容量: ${required_space}MB"
    
    # 利用可能容量確認
    local available_space
    if [[ "$OSTYPE" == "darwin"* ]]; then
        available_space=$(df -m "$BACKUP_BASE_DIR" | awk 'NR==2 {print $4}')
    else
        available_space=$(df -m "$BACKUP_BASE_DIR" | awk 'NR==2 {print $4}')
    fi
    
    log_message "利用可能容量: ${available_space}MB"
    
    # 容量チェック
    if [ "$(echo "$available_space < $required_space" | bc -l 2>/dev/null || [ "$available_space" -lt "${required_space%.*}" ])" ]; then
        log_message "❌ 容量不足です。空き容量を確保してください。"
        return 1
    fi
    
    log_message "✅ 容量確認完了"
    return 0
}

stop_applications() {
    log_message "=== アプリケーション停止開始 ==="
    
    # メンテナンスモード開始
    if [ -n "$API_BASE_URL" ] && [ -n "$ADMIN_TOKEN" ]; then
        curl -X POST "$API_BASE_URL/admin/maintenance" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"enabled": true, "message": "バックアップ実行中"}' \
          > /dev/null 2>&1 || log_message "⚠️ メンテナンスモード設定失敗"
    fi
    
    # アプリケーション停止
    log_message "アプリケーション停止中..."
    docker-compose down backend frontend > /dev/null 2>&1 || true
    
    # 残存プロセス確認
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
    
    log_message "✅ アプリケーション停止完了"
}

check_mysql_connections() {
    log_message "=== MySQL接続セッション確認 ==="
    
    # アクティブ接続確認
    local active_connections=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SHOW PROCESSLIST;" 2>/dev/null | grep -v "Sleep" | wc -l)
    
    log_message "アクティブ接続数: $active_connections"
    
    if [ "$active_connections" -gt 5 ]; then
        log_message "⚠️ 多数の接続が残存しています"
        
        # 詳細表示（最大10件）
        mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
          -e "SHOW PROCESSLIST;" 2>/dev/null | grep -v "Sleep" | head -10 | tee -a "$LOG_FILE"
        
        log_message "残存接続の終了を待機中..."
        sleep 10
    fi
    
    log_message "✅ 接続セッション確認完了"
}

execute_mysql_backup() {
    log_message "=== MySQL完全バックアップ開始 ==="
    
    # バックアップファイル名定義
    local db_backup_file="$BACKUP_DIR/mysql_full_backup.sql"
    local db_backup_compressed="$BACKUP_DIR/mysql_full_backup.sql.gz"
    
    log_message "バックアップ開始時刻: $(date)"
    
    # 完全バックアップ実行
    if mysqldump \
      --host="$MYSQL_HOST" \
      --port="$MYSQL_PORT" \
      --user="$MYSQL_USER" \
      --password="$MYSQL_PASSWORD" \
      --single-transaction \
      --lock-tables=false \
      --routines \
      --triggers \
      --events \
      --hex-blob \
      --complete-insert \
      --extended-insert \
      --add-drop-table \
      --add-drop-database \
      --create-options \
      --disable-keys \
      --flush-logs \
      --flush-privileges \
      --set-gtid-purged=OFF \
      --default-character-set=utf8mb4 \
      --databases "$MYSQL_DATABASE" \
      > "$db_backup_file" 2>>"$LOG_FILE"; then
        
        log_message "バックアップ完了時刻: $(date)"
        log_message "✅ MySQL バックアップ成功"
        
        # ファイルサイズ確認
        local backup_size=$(du -h "$db_backup_file" | cut -f1)
        log_message "バックアップサイズ: $backup_size"
        
        # 圧縮
        log_message "圧縮実行中..."
        gzip "$db_backup_file"
        
        local compressed_size=$(du -h "$db_backup_compressed" | cut -f1)
        log_message "圧縮後サイズ: $compressed_size"
        BACKUP_SIZE="$compressed_size"
        
        return 0
    else
        log_message "❌ MySQL バックアップ失敗"
        return 1
    fi
}

backup_system_config() {
    log_message "=== システム設定バックアップ ==="
    
    local config_backup_dir="$BACKUP_DIR/config"
    mkdir -p "$config_backup_dir"
    
    # MySQL設定ファイル
    local mysql_configs=("/etc/mysql/mysql.conf.d/mysqld.cnf" "/etc/my.cnf" "/usr/local/etc/my.cnf")
    for config in "${mysql_configs[@]}"; do
        if [ -f "$config" ]; then
            cp "$config" "$config_backup_dir/$(basename "$config")" 2>/dev/null || true
            log_message "✅ MySQL設定バックアップ: $(basename "$config")"
        fi
    done
    
    # アプリケーション設定
    local app_configs=(".env" "docker-compose.yml" "docker-compose.yaml")
    for config in "${app_configs[@]}"; do
        if [ -f "$config" ]; then
            cp "$config" "$config_backup_dir/" 2>/dev/null || true
            log_message "✅ アプリ設定バックアップ: $config"
        fi
    done
    
    # 重要な設定ファイル検索
    find . -maxdepth 2 -name "*.conf" -o -name "*.config" -o -name "*.yml" -o -name "*.yaml" | \
      head -20 | \
      xargs -I {} cp {} "$config_backup_dir/" 2>/dev/null || true
    
    log_message "✅ システム設定バックアップ完了"
}

backup_database_metadata() {
    log_message "=== データベースメタデータバックアップ ==="
    
    local metadata_dir="$BACKUP_DIR/metadata"
    mkdir -p "$metadata_dir"
    
    # テーブル構造情報
    mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, CREATE_TIME, UPDATE_TIME 
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = '$MYSQL_DATABASE' 
          ORDER BY TABLE_NAME;" \
      > "$metadata_dir/table_info.txt" 2>/dev/null || true
    
    # インデックス情報
    mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX 
          FROM information_schema.STATISTICS 
          WHERE TABLE_SCHEMA = '$MYSQL_DATABASE' 
          ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;" \
      > "$metadata_dir/index_info.txt" 2>/dev/null || true
    
    # 外部キー制約情報
    mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = '$MYSQL_DATABASE' AND REFERENCED_TABLE_NAME IS NOT NULL 
          ORDER BY TABLE_NAME, CONSTRAINT_NAME;" \
      > "$metadata_dir/foreign_keys.txt" 2>/dev/null || true
    
    # プロシージャ・関数一覧
    mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT ROUTINE_NAME, ROUTINE_TYPE, CREATED, LAST_ALTERED 
          FROM information_schema.ROUTINES 
          WHERE ROUTINE_SCHEMA = '$MYSQL_DATABASE' 
          ORDER BY ROUTINE_NAME;" \
      > "$metadata_dir/routines.txt" 2>/dev/null || true
    
    # ユーザー・権限情報（安全に実行）
    mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "SELECT User, Host, Select_priv, Insert_priv, Update_priv, Delete_priv, Create_priv, Drop_priv 
          FROM mysql.user 
          WHERE User NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema', 'root');" \
      > "$metadata_dir/users.txt" 2>/dev/null || true
    
    log_message "✅ データベースメタデータバックアップ完了"
}

backup_application_state() {
    log_message "=== アプリケーション状態バックアップ ==="
    
    local app_state_dir="$BACKUP_DIR/app_state"
    mkdir -p "$app_state_dir"
    
    # Docker状態
    docker ps -a > "$app_state_dir/docker_containers.txt" 2>/dev/null || true
    docker images > "$app_state_dir/docker_images.txt" 2>/dev/null || true
    docker-compose ps > "$app_state_dir/docker_compose_status.txt" 2>/dev/null || true
    
    # システム状態
    ps aux | grep -i monstera > "$app_state_dir/processes.txt" 2>/dev/null || true
    netstat -tlnp 2>/dev/null | grep -E ":3000|:8080|:3306" > "$app_state_dir/ports.txt" 2>/dev/null || \
    ss -tlnp 2>/dev/null | grep -E ":3000|:8080|:3306" > "$app_state_dir/ports.txt" 2>/dev/null || true
    
    # ログファイル（直近1日分）
    local log_dir="$app_state_dir/logs"
    mkdir -p "$log_dir"
    
    # アプリケーションログ
    if [ -d "./logs" ]; then
        find ./logs -name "*.log" -mtime -1 -exec cp {} "$log_dir/" \; 2>/dev/null || true
    fi
    
    # Dockerログ（直近100行）
    docker-compose logs --tail=100 backend > "$log_dir/backend.log" 2>/dev/null || true
    docker-compose logs --tail=100 frontend > "$log_dir/frontend.log" 2>/dev/null || true
    docker-compose logs --tail=100 mysql > "$log_dir/mysql.log" 2>/dev/null || true
    
    log_message "✅ アプリケーション状態バックアップ完了"
}

verify_backup() {
    log_message "=== バックアップ検証開始 ==="
    
    local db_backup_compressed="$BACKUP_DIR/mysql_full_backup.sql.gz"
    
    # 圧縮ファイル整合性確認
    if gzip -t "$db_backup_compressed"; then
        log_message "✅ 圧縮ファイル整合性確認完了"
    else
        log_message "❌ 圧縮ファイル破損"
        return 1
    fi
    
    # SQLファイル基本確認（一時解凍）
    local tmp_sql="/tmp/backup_verify_$$.sql"
    gunzip -c "$db_backup_compressed" > "$tmp_sql"
    
    # SQLファイル形式確認
    if head -20 "$tmp_sql" | grep -q "MySQL dump"; then
        log_message "✅ SQLファイル形式確認完了"
    else
        log_message "❌ SQLファイル形式異常"
        rm -f "$tmp_sql"
        return 1
    fi
    
    # テーブル構造確認
    local table_count=$(grep -c "CREATE TABLE" "$tmp_sql" 2>/dev/null || echo 0)
    log_message "テーブル数: $table_count"
    
    if [ "$table_count" -lt 20 ]; then
        log_message "⚠️ テーブル数が予想より少ない可能性があります"
    fi
    
    # INSERT文確認
    local insert_count=$(grep -c "INSERT INTO" "$tmp_sql" 2>/dev/null || echo 0)
    log_message "INSERT文数: $insert_count"
    
    # 一時ファイル削除
    rm -f "$tmp_sql"
    
    log_message "✅ SQLファイル内容確認完了"
    return 0
}

generate_checksums() {
    log_message "=== チェックサム生成 ==="
    
    local checksum_file="$BACKUP_DIR/checksums.txt"
    
    cd "$BACKUP_DIR"
    
    # チェックサムファイル初期化
    cat > checksums.txt << EOF
# バックアップファイルチェックサム
# 生成日時: $(date)

EOF
    
    # SHA256チェックサム生成
    find . -type f -name "*.sql.gz" -o -name "*.txt" -o -name "*.cnf" -o -name "*.yml" -o -name "*.yaml" | \
      sort | \
      xargs sha256sum >> checksums.txt 2>/dev/null || true
    
    # MD5チェックサム生成（互換性のため）
    find . -type f -name "*.sql.gz" | xargs md5sum > checksums.md5 2>/dev/null || true
    
    cd - > /dev/null
    
    log_message "✅ チェックサム生成完了"
}

encrypt_backup() {
    log_message "=== バックアップ暗号化 ==="
    
    local db_backup_compressed="$BACKUP_DIR/mysql_full_backup.sql.gz"
    ENCRYPTED_FILE="$BACKUP_DIR/mysql_full_backup_encrypted.sql.gz.enc"
    local encryption_key_file="$BACKUP_DIR/encryption_key.txt"
    
    # 暗号化キー生成（ランダム32バイト）
    openssl rand -base64 32 > "$encryption_key_file"
    chmod 600 "$encryption_key_file"
    
    # AES-256-CBC暗号化
    if openssl enc -aes-256-cbc -salt -in "$db_backup_compressed" -out "$ENCRYPTED_FILE" -pass file:"$encryption_key_file" 2>>"$LOG_FILE"; then
        log_message "✅ バックアップ暗号化完了"
        
        # 元の圧縮ファイルを削除（暗号化版のみ保持）
        rm -f "$db_backup_compressed"
        
        log_message "暗号化ファイル: $(basename "$ENCRYPTED_FILE")"
        log_message "暗号化キー: $(basename "$encryption_key_file")"
        
        return 0
    else
        log_message "❌ バックアップ暗号化失敗"
        return 1
    fi
}

generate_backup_report() {
    log_message "=== バックアップレポート生成 ==="
    
    local backup_report="$BACKUP_DIR/backup_report.md"
    local table_count=$(grep -c "CREATE TABLE" "$LOG_FILE" 2>/dev/null || echo "不明")
    local insert_count=$(grep -c "INSERT文数:" "$LOG_FILE" 2>/dev/null | head -1 || echo "不明")
    
    cat > "$backup_report" << EOF
# PostgreSQL移行直前フルバックアップレポート

## バックアップ概要
- **実行日時**: $(date '+%Y-%m-%d %H:%M:%S')
- **実行者**: $(whoami)
- **バックアップ形式**: MySQL完全バックアップ + システム設定
- **対象データベース**: $MYSQL_DATABASE
- **バックアップディレクトリ**: $BACKUP_DIR

## バックアップ内容

### 1. データベースバックアップ
- **ファイル**: $(basename "$ENCRYPTED_FILE")
- **圧縮後サイズ**: $BACKUP_SIZE
- **暗号化**: AES-256-CBC
- **テーブル数**: $table_count
- **バックアップ成功**: $([ "$BACKUP_SUCCESS" = "true" ] && echo "✅ 成功" || echo "❌ 失敗")

### 2. 設定ファイル
$(ls -la "$BACKUP_DIR/config" 2>/dev/null | tail -n +2 | awk '{print "- " $9 " (" $5 " bytes)"}' 2>/dev/null || echo "- 設定ファイルなし")

### 3. メタデータ
- テーブル情報: metadata/table_info.txt
- インデックス情報: metadata/index_info.txt  
- 外部キー情報: metadata/foreign_keys.txt
- プロシージャ情報: metadata/routines.txt
- ユーザー情報: metadata/users.txt

### 4. アプリケーション状態
- Docker状態: app_state/docker_*.txt
- プロセス状態: app_state/processes.txt
- ポート状態: app_state/ports.txt
- ログファイル: app_state/logs/

## バックアップ検証結果
- **圧縮ファイル整合性**: ✅ 正常
- **SQLファイル形式**: ✅ 正常
- **チェックサム**: ✅ 生成済み (checksums.txt)
- **暗号化**: ✅ 完了

## 復旧手順
本バックアップからの復旧は以下の手順で実行できます：

\`\`\`bash
# 1. 暗号化ファイル復号
openssl enc -aes-256-cbc -d -in $(basename "$ENCRYPTED_FILE") \\
  -out mysql_restore.sql.gz -pass file:encryption_key.txt

# 2. 解凍
gunzip mysql_restore.sql.gz

# 3. 復旧実行
mysql -h\$MYSQL_HOST -u\$MYSQL_USER -p\$MYSQL_PASSWORD < mysql_restore.sql
\`\`\`

## 重要事項
- **保存期間**: 移行成功後1ヶ月間
- **アクセス制限**: 管理者のみ (chmod 700)
- **暗号化キー**: 安全な場所に別途保管が必要

**このバックアップは $(date -d '+1 month' '+%Y-%m-%d' 2>/dev/null || date '+%Y-%m-%d') まで保持されます。**

---
**レポート生成時刻**: $(date)
**実行ログ**: backup_execution.log
EOF

    log_message "✅ バックアップレポート生成完了: $(basename "$backup_report")"
}

display_final_summary() {
    log_message "=== 最終バックアップ構成確認 ==="
    
    log_message "バックアップディレクトリ構成:"
    if command -v tree > /dev/null; then
        tree "$BACKUP_DIR" 2>/dev/null | tee -a "$LOG_FILE"
    else
        ls -la "$BACKUP_DIR" | tee -a "$LOG_FILE"
        for subdir in config metadata app_state; do
            if [ -d "$BACKUP_DIR/$subdir" ]; then
                echo "$subdir/:" | tee -a "$LOG_FILE"
                ls -la "$BACKUP_DIR/$subdir" | tee -a "$LOG_FILE"
            fi
        done
    fi
    
    log_message ""
    log_message "主要ファイルサイズ:"
    du -h "$BACKUP_DIR"/* 2>/dev/null | head -10 | tee -a "$LOG_FILE"
    
    log_message ""
    log_message "総バックアップサイズ:"
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    log_message "$total_size"
    
    # 権限確認
    log_message ""
    log_message "ディレクトリ権限:"
    ls -ld "$BACKUP_DIR" | tee -a "$LOG_FILE"
}

main() {
    clear
    echo "================================================="
    echo -e "${BOLD}${BLUE}PostgreSQL移行直前フルバックアップシステム${NC}"
    echo "================================================="
    echo "実行時刻: $(date)"
    echo ""
    
    BACKUP_START_TIME=$(date +%H:%M:%S)
    
    # ディレクトリ準備（ログファイル作成のため先に実行）
    prepare_backup_directory
    
    log_message "🗄️ PostgreSQL移行直前フルバックアップ開始"
    send_notification "🗄️ PostgreSQL移行直前フルバックアップを開始します"
    
    # Phase 1: 事前準備
    log_message ""
    log_message "=== Phase 1: 事前準備 ==="
    
    if ! check_prerequisites; then
        log_message "❌ 事前条件確認失敗 - バックアップ中止"
        send_notification "❌ フルバックアップ失敗：事前条件確認エラー" "error"
        exit 1
    fi
    
    if ! check_disk_space; then
        log_message "❌ 容量確認失敗 - バックアップ中止"
        send_notification "❌ フルバックアップ失敗：容量不足" "error"
        exit 1
    fi
    
    # Phase 2: アプリケーション停止
    log_message ""
    log_message "=== Phase 2: アプリケーション停止 ==="
    
    stop_applications
    check_mysql_connections
    
    # Phase 3: フルバックアップ実行
    log_message ""
    log_message "=== Phase 3: フルバックアップ実行 ==="
    
    if ! execute_mysql_backup; then
        log_message "❌ MySQLバックアップ失敗 - バックアップ中止"
        send_notification "❌ フルバックアップ失敗：MySQLバックアップエラー" "error"
        exit 1
    fi
    
    backup_system_config
    backup_database_metadata
    backup_application_state
    
    # Phase 4: バックアップ検証
    log_message ""
    log_message "=== Phase 4: バックアップ検証 ==="
    
    if ! verify_backup; then
        log_message "❌ バックアップ検証失敗"
        send_notification "❌ フルバックアップ失敗：検証エラー" "error"
        exit 1
    fi
    
    generate_checksums
    
    if ! encrypt_backup; then
        log_message "❌ バックアップ暗号化失敗"
        send_notification "❌ フルバックアップ失敗：暗号化エラー" "error"
        exit 1
    fi
    
    # Phase 5: 完了処理
    log_message ""
    log_message "=== Phase 5: 完了処理 ==="
    
    BACKUP_SUCCESS=true
    generate_backup_report
    display_final_summary
    
    # 成功通知
    local end_time=$(date +%H:%M:%S)
    local duration=$(date -d "$end_time" +%s)
    local start_seconds=$(date -d "$BACKUP_START_TIME" +%s)
    local elapsed=$((duration - start_seconds))
    
    log_message ""
    log_message "================================================="
    log_message -e "${BOLD}${GREEN}フルバックアップ完了${NC}"
    log_message "================================================="
    log_message ""
    log_message "実行時間: $BACKUP_START_TIME - $end_time (${elapsed}秒)"
    log_message "バックアップサイズ: $BACKUP_SIZE"
    log_message "バックアップディレクトリ: $BACKUP_DIR"
    log_message ""
    log_message -e "${GREEN}PostgreSQL移行の準備が完了しました${NC}"
    
    send_notification "✅ PostgreSQL移行直前フルバックアップ完了：${elapsed}秒、サイズ：$BACKUP_SIZE" "success"
    
    exit 0
}

# トラップ設定（異常終了時のクリーンアップ）
trap 'log_message "❌ バックアップが異常終了しました"; send_notification "❌ フルバックアップ異常終了" "error"; exit 1' ERR

# 実行確認
if [ "${1:-}" = "--auto" ]; then
    # 自動実行モード
    main
else
    # インタラクティブモード
    echo -e "${YELLOW}PostgreSQL移行直前フルバックアップを実行しますか？${NC}"
    echo ""
    echo "この操作により、以下が実行されます："
    echo "- アプリケーション停止"
    echo "- MySQL完全バックアップ"
    echo "- システム設定バックアップ"
    echo "- バックアップ検証・暗号化"
    echo ""
    echo -n "続行しますか？ [yes/no]: "
    read -r confirmation
    
    if [ "$confirmation" = "yes" ]; then
        main
    else
        echo "フルバックアップをキャンセルしました。"
        exit 0
    fi
fi