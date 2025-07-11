#!/bin/bash

# Blue-Green切り替えスクリプト
# MySQLからPostgreSQLへの本番切り替えを実行

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"
MYSQL_DATABASE="${MYSQL_DATABASE:-monstera}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5433}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-monstera_green}"

NGINX_CONFIG="/etc/nginx/nginx.conf"
ROLLBACK_ENABLED=true

# ログディレクトリ
LOG_DIR="/var/log/bluegreen-switch"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/switch-$(date +%Y%m%d-%H%M%S).log"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# エラーハンドラー
handle_error() {
    log "ERROR: $1"
    if [ "$ROLLBACK_ENABLED" = true ]; then
        log "Starting automatic rollback..."
        ./scripts/rollback.sh
    fi
    exit 1
}

# プロンプト関数
confirm_action() {
    echo -e "${YELLOW}$1${NC}"
    read -p "Continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Operation cancelled by user"
        exit 1
    fi
}

# ステップ1: 事前チェック
pre_switch_checks() {
    log "========================================="
    log "Step 1: Pre-switch checks"
    log "========================================="
    
    # データ同期状態の確認
    log "Checking data sync status..."
    SYNC_LAG=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -t -c "
        SELECT EXTRACT(EPOCH FROM (NOW() - MAX(synced_at)))::INT 
        FROM sync_status 
        WHERE source = 'mysql';
    " 2>/dev/null || echo "999999")
    
    if [ "$SYNC_LAG" -gt 60 ]; then
        handle_error "Data sync lag is too high: ${SYNC_LAG} seconds"
    fi
    log "✓ Data sync lag: ${SYNC_LAG} seconds"
    
    # Green環境のヘルスチェック
    log "Checking Green environment health..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/health)
    if [ "$HTTP_STATUS" != "200" ]; then
        handle_error "Green environment health check failed: HTTP $HTTP_STATUS"
    fi
    log "✓ Green environment is healthy"
    
    # データ整合性チェック
    log "Running data consistency check..."
    ./scripts/validate-data-consistency.sh
    if [ $? -ne 0 ]; then
        handle_error "Data consistency check failed"
    fi
    log "✓ Data consistency verified"
    
    echo -e "${GREEN}All pre-switch checks passed${NC}"
}

# ステップ2: MySQLを読み取り専用に設定
set_mysql_readonly() {
    log "========================================="
    log "Step 2: Setting MySQL to read-only mode"
    log "========================================="
    
    confirm_action "This will stop all writes to MySQL. Are you sure?"
    
    # 現在の設定を保存
    CURRENT_READONLY=$(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT @@read_only;" -s -N)
    echo "$CURRENT_READONLY" > "$LOG_DIR/mysql_readonly_state.bak"
    
    # 読み取り専用に設定
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" << EOF
SET GLOBAL read_only = ON;
SET GLOBAL super_read_only = ON;
FLUSH TABLES WITH READ LOCK;
EOF
    
    log "✓ MySQL is now in read-only mode"
    
    # アプリケーションに通知
    curl -X POST http://localhost:8080/admin/maintenance-mode \
        -H "Content-Type: application/json" \
        -d '{"enabled": true, "message": "Database migration in progress"}'
}

# ステップ3: 最終データ同期
final_data_sync() {
    log "========================================="
    log "Step 3: Final data synchronization"
    log "========================================="
    
    # 最終同期を実行
    log "Running final sync..."
    ./scripts/run-final-sync.sh
    
    # 同期完了を待機
    log "Waiting for sync to complete..."
    MAX_WAIT=300  # 5分
    WAITED=0
    
    while [ "$WAITED" -lt "$MAX_WAIT" ]; do
        PENDING=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -t -c "
            SELECT COUNT(*) FROM sync_queue WHERE status = 'pending';
        " 2>/dev/null || echo "999999")
        
        if [ "$PENDING" -eq 0 ]; then
            log "✓ Final sync completed"
            break
        fi
        
        echo -ne "\rPending sync operations: $PENDING (${WAITED}s/${MAX_WAIT}s)"
        sleep 5
        WAITED=$((WAITED + 5))
    done
    
    if [ "$PENDING" -gt 0 ]; then
        handle_error "Final sync timed out with $PENDING operations pending"
    fi
}

# ステップ4: トラフィック切り替え
switch_traffic() {
    log "========================================="
    log "Step 4: Switching traffic to Green"
    log "========================================="
    
    confirm_action "This will redirect all traffic to PostgreSQL. Are you sure?"
    
    # Nginxの設定をバックアップ
    cp "$NGINX_CONFIG" "$LOG_DIR/nginx.conf.bak"
    
    # Nginx設定を更新（100% Green環境へ）
    cat > /tmp/nginx-green.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend-green:8080 weight=100;  # 100% to Green
        server backend-blue:8080 down;         # Blue is down
    }
    
    server {
        listen 80;
        
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Environment "green";
        }
        
        location /health {
            access_log off;
            return 200 "healthy\n";
        }
    }
}
EOF
    
    # 設定を適用
    cp /tmp/nginx-green.conf "$NGINX_CONFIG"
    nginx -t || handle_error "Nginx configuration test failed"
    nginx -s reload
    
    log "✓ Traffic switched to Green environment"
}

# ステップ5: 切り替え後の検証
post_switch_validation() {
    log "========================================="
    log "Step 5: Post-switch validation"
    log "========================================="
    
    # 5秒待機（トラフィックが安定するまで）
    sleep 5
    
    # Green環境のヘルスチェック
    log "Checking Green environment response..."
    for i in {1..10}; do
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health)
        if [ "$HTTP_STATUS" = "200" ]; then
            echo -n "✓"
        else
            echo -n "✗"
            handle_error "Green environment not responding correctly"
        fi
        sleep 1
    done
    echo
    log "✓ Green environment is responding correctly"
    
    # エラー率の確認
    log "Monitoring error rates..."
    ERROR_COUNT=$(curl -s http://localhost:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[1m])' | \
        jq -r '.data.result[0].value[1] // "0"')
    
    ERROR_THRESHOLD="0.01"  # 1%
    if (( $(echo "$ERROR_COUNT > $ERROR_THRESHOLD" | bc -l) )); then
        handle_error "Error rate too high: ${ERROR_COUNT}"
    fi
    log "✓ Error rate is acceptable: ${ERROR_COUNT}"
    
    # レスポンスタイムの確認
    log "Checking response times..."
    AVG_RESPONSE_TIME=$(curl -s http://localhost:9090/api/v1/query?query='histogram_quantile(0.95,http_request_duration_seconds_bucket)' | \
        jq -r '.data.result[0].value[1] // "0"')
    
    RESPONSE_TIME_THRESHOLD="1.0"  # 1秒
    if (( $(echo "$AVG_RESPONSE_TIME > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
        log "WARNING: Response time is high: ${AVG_RESPONSE_TIME}s"
    else
        log "✓ Response time is good: ${AVG_RESPONSE_TIME}s"
    fi
}

# ステップ6: クリーンアップ
cleanup() {
    log "========================================="
    log "Step 6: Cleanup"
    log "========================================="
    
    # メンテナンスモードを解除
    curl -X POST http://localhost:8080/admin/maintenance-mode \
        -H "Content-Type: application/json" \
        -d '{"enabled": false}'
    
    # Blue環境（MySQL）を停止
    if confirm_action "Stop Blue environment (MySQL)?"; then
        docker-compose stop mysql backend-blue
        log "✓ Blue environment stopped"
    fi
    
    # 成功通知
    ./scripts/send-notification.sh "Blue-Green switch completed successfully" "success"
    
    log "✓ Cleanup completed"
}

# メイン処理
main() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}Blue-Green Deployment Switch${NC}"
    echo -e "${BLUE}MySQL → PostgreSQL${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo
    
    # 開始時刻を記録
    START_TIME=$(date +%s)
    
    # 各ステップを実行
    pre_switch_checks
    set_mysql_readonly
    final_data_sync
    switch_traffic
    post_switch_validation
    cleanup
    
    # 所要時間を計算
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}✅ Blue-Green switch completed successfully!${NC}"
    echo -e "${GREEN}Duration: $((DURATION / 60))m $((DURATION % 60))s${NC}"
    echo -e "${GREEN}================================================${NC}"
    
    log "Blue-Green switch completed in ${DURATION} seconds"
}

# トラップ設定（エラー時の自動ロールバック）
trap 'handle_error "Unexpected error occurred"' ERR

# 実行
main "$@"