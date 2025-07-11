#!/bin/bash

# ロールバックスクリプト
# PostgreSQLからMySQLへの緊急ロールバック

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

NGINX_CONFIG="/etc/nginx/nginx.conf"
LOG_DIR="/var/log/bluegreen-switch"
LOG_FILE="$LOG_DIR/rollback-$(date +%Y%m%d-%H%M%S).log"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ステップ1: 緊急アラート
send_emergency_alert() {
    log "========================================="
    log "EMERGENCY ROLLBACK INITIATED"
    log "========================================="
    
    # 関係者に通知
    ./scripts/send-notification.sh \
        "🚨 EMERGENCY: Database rollback initiated" \
        "critical" \
        "Reverting from PostgreSQL to MySQL due to critical issues"
    
    # メンテナンスモードを有効化
    curl -X POST http://localhost:8080/admin/maintenance-mode \
        -H "Content-Type: application/json" \
        -d '{"enabled": true, "message": "Emergency maintenance - Please stand by"}'
}

# ステップ2: トラフィックをMySQLに戻す
restore_mysql_traffic() {
    log "========================================="
    log "Step 1: Restoring traffic to MySQL (Blue)"
    log "========================================="
    
    # バックアップからNginx設定を復元
    if [ -f "$LOG_DIR/nginx.conf.bak" ]; then
        cp "$LOG_DIR/nginx.conf.bak" "$NGINX_CONFIG"
        log "✓ Restored Nginx configuration from backup"
    else
        # バックアップがない場合は手動で設定
        cat > "$NGINX_CONFIG" << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend-blue:8080 weight=100;   # 100% to Blue (MySQL)
        server backend-green:8080 down;        # Green is down
    }
    
    server {
        listen 80;
        
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Environment "blue";
        }
        
        location /health {
            access_log off;
            return 200 "healthy\n";
        }
    }
}
EOF
        log "✓ Created emergency Nginx configuration"
    fi
    
    # Nginx設定を適用
    nginx -t
    if [ $? -ne 0 ]; then
        log "ERROR: Nginx configuration test failed"
        exit 1
    fi
    
    nginx -s reload
    log "✓ Traffic restored to MySQL environment"
}

# ステップ3: MySQLの書き込みを再開
restore_mysql_write() {
    log "========================================="
    log "Step 2: Restoring MySQL write access"
    log "========================================="
    
    # 読み取り専用モードを解除
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" << EOF
SET GLOBAL read_only = OFF;
SET GLOBAL super_read_only = OFF;
UNLOCK TABLES;
EOF
    
    if [ $? -eq 0 ]; then
        log "✓ MySQL write access restored"
    else
        log "ERROR: Failed to restore MySQL write access"
        exit 1
    fi
    
    # MySQLの状態を確認
    READONLY_STATUS=$(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT @@read_only;" -s -N)
    if [ "$READONLY_STATUS" = "0" ]; then
        log "✓ MySQL is accepting writes"
    else
        log "ERROR: MySQL is still in read-only mode"
        exit 1
    fi
}

# ステップ4: Blue環境の健全性確認
verify_blue_health() {
    log "========================================="
    log "Step 3: Verifying Blue environment health"
    log "========================================="
    
    # Blue環境のヘルスチェック
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health)
        if [ "$HTTP_STATUS" = "200" ]; then
            log "✓ Blue environment is healthy"
            break
        fi
        
        log "Waiting for Blue environment to be healthy... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log "ERROR: Blue environment failed to become healthy"
        exit 1
    fi
    
    # 基本的な機能テスト
    log "Running basic functionality tests..."
    
    # ログインテスト
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email": "test@duesk.co.jp", "password": "test"}' \
        -w "\n%{http_code}")
    
    HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
        log "✓ Authentication endpoint is responding"
    else
        log "WARNING: Authentication endpoint returned unexpected status: $HTTP_CODE"
    fi
}

# ステップ5: データ差分の記録
record_data_diff() {
    log "========================================="
    log "Step 4: Recording data differences"
    log "========================================="
    
    # PostgreSQLで行われた変更を記録
    DIFF_FILE="$LOG_DIR/rollback-data-diff-$(date +%Y%m%d-%H%M%S).json"
    
    psql -h localhost -p 5433 -U postgres -d monstera_green -t << EOF > "$DIFF_FILE"
SELECT json_agg(row_to_json(t))
FROM (
    SELECT 
        'audit_logs' as table_name,
        action,
        entity_type,
        entity_id,
        created_at,
        user_id
    FROM audit_logs
    WHERE created_at > (SELECT MAX(switch_time) FROM deployment_history WHERE status = 'started')
    ORDER BY created_at DESC
) t;
EOF
    
    log "✓ Data differences recorded in $DIFF_FILE"
    
    # 重要: この差分データは後で手動で適用する必要がある
    log "WARNING: Some data changes in PostgreSQL may not be reflected in MySQL"
    log "WARNING: Review $DIFF_FILE for manual reconciliation"
}

# ステップ6: Green環境の停止
stop_green_environment() {
    log "========================================="
    log "Step 5: Stopping Green environment"
    log "========================================="
    
    # PostgreSQL接続を切断
    docker-compose -f docker-compose.green.yml exec postgres-green \
        psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'monstera_green' AND pid <> pg_backend_pid();"
    
    # Green環境のコンテナを停止
    docker-compose -f docker-compose.green.yml stop backend-green postgres-green
    
    log "✓ Green environment stopped"
}

# ステップ7: クリーンアップと通知
cleanup_and_notify() {
    log "========================================="
    log "Step 6: Cleanup and notifications"
    log "========================================="
    
    # メンテナンスモードを解除
    curl -X POST http://localhost:8080/admin/maintenance-mode \
        -H "Content-Type: application/json" \
        -d '{"enabled": false}'
    
    # ロールバック情報を記録
    cat > "$LOG_DIR/rollback-summary.json" << EOF
{
    "rollback_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "reason": "$ROLLBACK_REASON",
    "mysql_status": "active",
    "postgresql_status": "stopped",
    "data_diff_file": "$DIFF_FILE",
    "action_required": [
        "Review data differences in $DIFF_FILE",
        "Investigate root cause of failure",
        "Plan corrective actions before retry"
    ]
}
EOF
    
    # 最終通知
    ./scripts/send-notification.sh \
        "Rollback completed - System reverted to MySQL" \
        "warning" \
        "Please review rollback summary at $LOG_DIR/rollback-summary.json"
    
    log "✓ Rollback completed"
}

# メトリクスの記録
record_metrics() {
    log "Recording rollback metrics..."
    
    # Prometheusにメトリクスを送信
    cat << EOF | curl -X POST http://localhost:9091/metrics/job/rollback/instance/monstera --data-binary @-
# TYPE rollback_total counter
rollback_total{environment="production",from="postgresql",to="mysql"} 1
# TYPE rollback_duration_seconds gauge
rollback_duration_seconds $DURATION
# TYPE rollback_timestamp gauge
rollback_timestamp $(date +%s)
EOF
}

# メイン処理
main() {
    echo -e "${RED}================================================${NC}"
    echo -e "${RED}EMERGENCY ROLLBACK PROCEDURE${NC}"
    echo -e "${RED}PostgreSQL → MySQL${NC}"
    echo -e "${RED}================================================${NC}"
    echo
    
    # ロールバック理由を記録
    ROLLBACK_REASON="${1:-Unknown reason}"
    log "Rollback reason: $ROLLBACK_REASON"
    
    # 開始時刻を記録
    START_TIME=$(date +%s)
    
    # 各ステップを実行
    send_emergency_alert
    restore_mysql_traffic
    restore_mysql_write
    verify_blue_health
    record_data_diff
    stop_green_environment
    cleanup_and_notify
    
    # 所要時間を計算
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # メトリクスを記録
    record_metrics
    
    echo
    echo -e "${YELLOW}================================================${NC}"
    echo -e "${YELLOW}⚠️  Rollback completed${NC}"
    echo -e "${YELLOW}Duration: $((DURATION / 60))m $((DURATION % 60))s${NC}"
    echo -e "${YELLOW}System is now running on MySQL (Blue)${NC}"
    echo -e "${YELLOW}================================================${NC}"
    
    log "Rollback completed in ${DURATION} seconds"
    
    # 後処理タスクのリマインダー
    echo
    echo -e "${RED}IMPORTANT POST-ROLLBACK TASKS:${NC}"
    echo "1. Review data differences: $DIFF_FILE"
    echo "2. Investigate root cause of the failure"
    echo "3. Update incident report"
    echo "4. Schedule post-mortem meeting"
    echo "5. Plan corrective actions before next attempt"
}

# エラーハンドラー（ロールバック中のエラーは致命的）
handle_critical_error() {
    log "CRITICAL ERROR during rollback: $1"
    ./scripts/send-notification.sh \
        "🚨 CRITICAL: Rollback failed!" \
        "critical" \
        "Manual intervention required immediately"
    exit 1
}

# トラップ設定
trap 'handle_critical_error "Unexpected error during rollback"' ERR

# 実行
main "$@"