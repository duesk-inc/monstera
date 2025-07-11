#!/bin/bash

# 高度な負荷テストシナリオ

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# 環境変数の読み込み
source "${SCRIPT_DIR}/setup_env.sh"

# スパイクテスト: 急激な負荷増加をシミュレート
spike_test() {
    echo "=== Running Spike Test ==="
    echo "Simulating sudden load increase from 10 to 500 req/s"
    
    local target_file="${ROOT_DIR}/targets/weekly-reports.txt"
    local result_file="${ROOT_DIR}/results/spike-test-$(date +%Y%m%d-%H%M%S).bin"
    
    # 段階的な負荷増加
    echo "Phase 1: Warm-up (10 req/s for 30s)"
    vegeta attack -targets="$target_file" -rate=10 -duration=30s | \
        vegeta encode > "${result_file}.phase1"
    
    echo "Phase 2: Spike (500 req/s for 60s)"
    vegeta attack -targets="$target_file" -rate=500 -duration=60s | \
        vegeta encode > "${result_file}.phase2"
    
    echo "Phase 3: Recovery (50 req/s for 30s)"
    vegeta attack -targets="$target_file" -rate=50 -duration=30s | \
        vegeta encode > "${result_file}.phase3"
    
    # 結果の結合と分析
    cat "${result_file}".phase* > "$result_file"
    echo "Spike test completed. Analyzing results..."
    vegeta report -type=text "$result_file"
}

# ストレステスト: システムの限界を探る
stress_test() {
    echo "=== Running Stress Test ==="
    echo "Finding system breaking point"
    
    local target_file="${ROOT_DIR}/targets/weekly-reports.txt"
    local max_rate=1000
    local step=100
    local duration=30
    
    for rate in $(seq 100 $step $max_rate); do
        echo "Testing at ${rate} req/s..."
        local result_file="${ROOT_DIR}/results/stress-test-${rate}rps-$(date +%Y%m%d-%H%M%S).bin"
        
        vegeta attack \
            -targets="$target_file" \
            -rate=$rate \
            -duration="${duration}s" \
            -timeout=30s | \
            vegeta encode > "$result_file"
        
        # エラー率をチェック
        local error_rate=$(vegeta report -type=json "$result_file" | \
            jq -r '.errors | length / .requests * 100')
        
        echo "Rate: ${rate} req/s, Error rate: ${error_rate}%"
        
        # エラー率が5%を超えたら停止
        if (( $(echo "$error_rate > 5" | bc -l) )); then
            echo "System breaking point found at ${rate} req/s"
            break
        fi
        
        # CPUクールダウン
        sleep 10
    done
}

# ソークテスト: 長時間の安定性テスト
soak_test() {
    echo "=== Running Soak Test ==="
    echo "Testing system stability over extended period"
    
    local target_file="${ROOT_DIR}/targets/mixed-load.txt"
    local result_file="${ROOT_DIR}/results/soak-test-$(date +%Y%m%d-%H%M%S).bin"
    
    # 混合負荷のターゲットファイル作成
    create_mixed_load_targets
    
    # 1時間の負荷テスト（デモ用に短縮可能）
    local duration="${SOAK_DURATION:-3600s}"
    echo "Running soak test for $duration at 100 req/s..."
    
    vegeta attack \
        -targets="$target_file" \
        -rate=100 \
        -duration="$duration" \
        -timeout=30s \
        -output="$result_file"
    
    echo "Soak test completed. Analyzing results..."
    vegeta report -type=text "$result_file"
    
    # メモリリークチェック用のメトリクス収集
    check_memory_usage
}

# 同時実行テスト: 複数APIの同時負荷
concurrent_test() {
    echo "=== Running Concurrent API Test ==="
    echo "Testing multiple APIs simultaneously"
    
    # 各APIテストをバックグラウンドで実行
    echo "Starting concurrent tests..."
    
    # 未提出者API
    (vegeta attack \
        -targets="${ROOT_DIR}/targets/unsubmitted-reports.txt" \
        -rate=30 \
        -duration=60s \
        -output="${ROOT_DIR}/results/concurrent-unsubmitted-$(date +%Y%m%d-%H%M%S).bin") &
    
    # 週報API
    (vegeta attack \
        -targets="${ROOT_DIR}/targets/weekly-reports.txt" \
        -rate=40 \
        -duration=60s \
        -output="${ROOT_DIR}/results/concurrent-weekly-$(date +%Y%m%d-%H%M%S).bin") &
    
    # 月次サマリーAPI
    (vegeta attack \
        -targets="${ROOT_DIR}/targets/monthly-summary.txt" \
        -rate=20 \
        -duration=60s \
        -output="${ROOT_DIR}/results/concurrent-monthly-$(date +%Y%m%d-%H%M%S).bin") &
    
    # リマインダーAPI
    (vegeta attack \
        -targets="${ROOT_DIR}/targets/reminders.txt" \
        -rate=10 \
        -duration=60s \
        -output="${ROOT_DIR}/results/concurrent-reminders-$(date +%Y%m%d-%H%M%S).bin") &
    
    # 全てのテストが完了するまで待機
    wait
    
    echo "All concurrent tests completed!"
    
    # 結果の集計
    aggregate_concurrent_results
}

# 混合負荷用のターゲットファイル作成
create_mixed_load_targets() {
    cat > "${ROOT_DIR}/targets/mixed-load.txt" <<EOF
# 30% - 週報一覧
GET ${API_BASE}/admin/weekly-reports?page=1&limit=50
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/admin/weekly-reports?page=1&limit=50
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/admin/weekly-reports?page=1&limit=50
Cookie: access_token=${AUTH_TOKEN}

# 30% - 未提出者確認
GET ${API_BASE}/unsubmitted-reports
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/unsubmitted-reports
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/unsubmitted-reports
Cookie: access_token=${AUTH_TOKEN}

# 20% - 統計情報
GET ${API_BASE}/admin/weekly-reports/statistics
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/admin/weekly-reports/statistics
Cookie: access_token=${AUTH_TOKEN}

# 10% - 部署別統計
GET ${API_BASE}/unsubmitted-reports/stats/department
Cookie: access_token=${AUTH_TOKEN}

# 10% - リマインダー設定確認
GET ${API_BASE}/reminders/settings
Cookie: access_token=${AUTH_TOKEN}
EOF
}

# メモリ使用状況のチェック
check_memory_usage() {
    echo "Checking system memory usage..."
    
    # Dockerコンテナのメモリ使用状況
    if command -v docker >/dev/null 2>&1; then
        echo "Docker container memory usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"
    fi
    
    # システムメモリ
    if command -v free >/dev/null 2>&1; then
        echo "System memory:"
        free -h
    fi
}

# 同時実行テストの結果集計
aggregate_concurrent_results() {
    echo "=== Concurrent Test Results Summary ==="
    
    for result_file in "${ROOT_DIR}"/results/concurrent-*.bin; do
        if [ -f "$result_file" ]; then
            api_name=$(basename "$result_file" | cut -d'-' -f2)
            echo ""
            echo "API: $api_name"
            vegeta report -type=text "$result_file" | grep -E "Latencies|Success|Requests"
        fi
    done
}

# メニュー表示
show_menu() {
    echo "Advanced Performance Test Menu:"
    echo "1. Spike Test - Sudden load increase"
    echo "2. Stress Test - Find breaking point"
    echo "3. Soak Test - Long-term stability"
    echo "4. Concurrent Test - Multiple APIs"
    echo "5. Run All Tests"
    echo "0. Exit"
}

# メイン処理
if [ $# -eq 0 ]; then
    show_menu
    read -p "Select test type: " choice
else
    choice=$1
fi

# 認証トークンの取得
get_admin_token
source .env.test

case $choice in
    1|spike)
        spike_test
        ;;
    2|stress)
        stress_test
        ;;
    3|soak)
        soak_test
        ;;
    4|concurrent)
        concurrent_test
        ;;
    5|all)
        spike_test
        sleep 30
        stress_test
        sleep 30
        concurrent_test
        ;;
    0|exit)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# クリーンアップ
rm -f cookie.txt .env.test