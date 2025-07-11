#!/bin/bash

# カナリアロールアウトスクリプト
# PostgreSQL環境への段階的なトラフィック移行を管理

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
ROLLOUT_STAGES=(0 5 10 25 50 75 90 100)  # ロールアウト段階（%）
STAGE_DURATION=300  # 各段階の継続時間（秒）
ERROR_THRESHOLD=0.01  # エラー率閾値（1%）
LATENCY_THRESHOLD=1.5  # レイテンシ増加率閾値（1.5倍）

PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
BACKEND_API_URL="${BACKEND_API_URL:-http://localhost:8080}"

# 現在のステージ
CURRENT_STAGE=0
ROLLBACK_TRIGGERED=false

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# メトリクス取得関数
get_metric() {
    local query=$1
    local result=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=${query}" | \
        jq -r '.data.result[0].value[1] // "0"')
    echo "$result"
}

# エラー率チェック
check_error_rate() {
    local env=$1
    local error_rate=$(get_metric "rate(http_requests_total{environment=\"${env}\",status=~\"5..\"}[5m])")
    local total_rate=$(get_metric "rate(http_requests_total{environment=\"${env}\"}[5m])")
    
    if [ "$total_rate" = "0" ]; then
        echo "0"
        return
    fi
    
    echo "scale=4; $error_rate / $total_rate" | bc
}

# レイテンシチェック
check_latency() {
    local env=$1
    local p95_latency=$(get_metric "histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{environment=\"${env}\"}[5m]))")
    echo "$p95_latency"
}

# ロールアウト率を更新
update_rollout_percentage() {
    local percentage=$1
    
    log "Updating rollout percentage to ${percentage}%"
    
    # バックエンドAPIに更新を通知
    curl -s -X POST "${BACKEND_API_URL}/admin/rollout" \
        -H "Content-Type: application/json" \
        -d "{\"percentage\": ${percentage}}" > /dev/null
    
    # Nginx設定を更新
    update_nginx_weights "$percentage"
}

# Nginx重み付けを更新
update_nginx_weights() {
    local green_percentage=$1
    local blue_percentage=$((100 - green_percentage))
    
    cat > /tmp/nginx-weights.conf << EOF
upstream backend_weighted {
    server backend:8080 weight=${blue_percentage};
    server backend-green:8080 weight=${green_percentage};
}
EOF
    
    # Nginx設定を更新（実際の環境では適切な方法で）
    # docker exec nginx-lb nginx -s reload
    
    log "Nginx weights updated: Blue=${blue_percentage}%, Green=${green_percentage}%"
}

# メトリクス監視
monitor_metrics() {
    local duration=$1
    local start_time=$(date +%s)
    local monitoring=true
    
    while $monitoring; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $duration ]; then
            monitoring=false
            continue
        fi
        
        # エラー率チェック
        local blue_error_rate=$(check_error_rate "blue")
        local green_error_rate=$(check_error_rate "green")
        
        # レイテンシチェック
        local blue_latency=$(check_latency "blue")
        local green_latency=$(check_latency "green")
        
        # 閾値チェック
        if (( $(echo "$green_error_rate > $ERROR_THRESHOLD" | bc -l) )); then
            log "❌ Error rate threshold exceeded: ${green_error_rate}"
            ROLLBACK_TRIGGERED=true
            return 1
        fi
        
        if [ "$blue_latency" != "0" ]; then
            local latency_ratio=$(echo "scale=2; $green_latency / $blue_latency" | bc)
            if (( $(echo "$latency_ratio > $LATENCY_THRESHOLD" | bc -l) )); then
                log "❌ Latency threshold exceeded: ${latency_ratio}x"
                ROLLBACK_TRIGGERED=true
                return 1
            fi
        fi
        
        # ステータス表示
        printf "\r⏱️  Stage progress: %d/%d seconds | Blue Error: %.2f%% | Green Error: %.2f%% | Green/Blue Latency: %.2fx" \
            "$elapsed" "$duration" \
            "$(echo "$blue_error_rate * 100" | bc)" \
            "$(echo "$green_error_rate * 100" | bc)" \
            "$(echo "scale=2; $green_latency / $blue_latency" | bc)"
        
        sleep 5
    done
    
    echo  # 改行
    return 0
}

# ロールバック実行
execute_rollback() {
    log "🔄 Executing rollback to 0%"
    update_rollout_percentage 0
    
    # アラート送信
    ./scripts/send-notification.sh \
        "Canary rollout failed and rolled back" \
        "warning" \
        "Rollback triggered at ${CURRENT_STAGE}% due to threshold violation"
}

# ステージ実行
execute_stage() {
    local percentage=$1
    
    echo
    echo -e "${BLUE}Stage: ${percentage}% traffic to PostgreSQL${NC}"
    echo "========================================="
    
    # ロールアウト率を更新
    update_rollout_percentage "$percentage"
    
    # 初期安定化待機
    log "Waiting for traffic to stabilize..."
    sleep 30
    
    # メトリクス監視
    log "Monitoring metrics for ${STAGE_DURATION} seconds..."
    if monitor_metrics "$STAGE_DURATION"; then
        log "✅ Stage ${percentage}% completed successfully"
        return 0
    else
        log "❌ Stage ${percentage}% failed"
        return 1
    fi
}

# ダッシュボード表示
show_dashboard() {
    clear
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}Canary Rollout Dashboard${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo
    echo "Current Stage: ${CURRENT_STAGE}%"
    echo "Next Stages: ${ROLLOUT_STAGES[@]:1}"
    echo
    echo "Thresholds:"
    echo "  • Error Rate: < ${ERROR_THRESHOLD} (1%)"
    echo "  • Latency Increase: < ${LATENCY_THRESHOLD}x"
    echo
    echo "URLs:"
    echo "  • Grafana: http://localhost:3001"
    echo "  • Prometheus: http://localhost:9090"
    echo
}

# メイン処理
main() {
    show_dashboard
    
    log "Starting canary rollout process"
    log "Stages: ${ROLLOUT_STAGES[@]}"
    
    # 各ステージを実行
    for stage in "${ROLLOUT_STAGES[@]}"; do
        CURRENT_STAGE=$stage
        
        if execute_stage "$stage"; then
            if [ "$stage" -eq 100 ]; then
                echo
                echo -e "${GREEN}🎉 Canary rollout completed successfully!${NC}"
                log "All traffic is now routed to PostgreSQL"
                
                # 完了通知
                ./scripts/send-notification.sh \
                    "Canary rollout completed successfully" \
                    "success" \
                    "100% traffic is now on PostgreSQL"
            fi
        else
            # ロールバック実行
            execute_rollback
            
            echo
            echo -e "${RED}❌ Canary rollout failed and rolled back${NC}"
            exit 1
        fi
        
        # 次のステージ前の確認（100%以外）
        if [ "$stage" -lt 100 ]; then
            echo
            read -p "Continue to next stage? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "Rollout paused by operator at ${stage}%"
                exit 0
            fi
        fi
    done
}

# 中断時の処理
cleanup() {
    if [ "$CURRENT_STAGE" -gt 0 ] && [ "$CURRENT_STAGE" -lt 100 ]; then
        echo
        log "Rollout interrupted at ${CURRENT_STAGE}%"
        read -p "Rollback to 0%? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            execute_rollback
        fi
    fi
}

# トラップ設定
trap cleanup EXIT INT TERM

# 実行
main "$@"