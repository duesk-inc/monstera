#!/bin/bash

# 引数チェック
if [ $# -eq 0 ]; then
    echo "Usage: $0 <test-name>"
    echo "Available tests: unsubmitted-reports, weekly-reports, monthly-summary, reminders"
    exit 1
fi

TEST_NAME=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# 環境変数の読み込み
source "${SCRIPT_DIR}/setup_env.sh"

# 認証トークンの取得
echo "Getting authentication token..."
get_admin_token

# トークンの読み込み
if [ -f ".env.test" ]; then
    source .env.test
else
    echo "Failed to get authentication token"
    exit 1
fi

# テストターゲットファイルの作成
create_targets() {
    local test_type=$1
    local target_file="${ROOT_DIR}/targets/${test_type}.txt"
    
    case $test_type in
        "unsubmitted-reports")
            cat > "$target_file" <<EOF
GET ${API_BASE}/unsubmitted-reports
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/unsubmitted-reports/summary
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/unsubmitted-reports/stats/department
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/unsubmitted-reports/stats/manager
Cookie: access_token=${AUTH_TOKEN}
EOF
            ;;
            
        "weekly-reports")
            cat > "$target_file" <<EOF
GET ${API_BASE}/admin/weekly-reports?page=1&limit=50
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/admin/weekly-reports?page=2&limit=50
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/admin/weekly-reports?status=draft&page=1&limit=50
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/admin/weekly-reports?status=submitted&page=1&limit=50
Cookie: access_token=${AUTH_TOKEN}
EOF
            ;;
            
        "monthly-summary")
            # 現在の年月を取得
            current_year=$(date +%Y)
            current_month=$(date +%m)
            last_month=$((current_month - 1))
            if [ $last_month -eq 0 ]; then
                last_month=12
                current_year=$((current_year - 1))
            fi
            
            cat > "$target_file" <<EOF
GET ${API_BASE}/admin/weekly-reports/statistics?year=${current_year}&month=${current_month}
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/admin/weekly-reports/statistics?year=${current_year}&month=${last_month}
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/admin/unsubmitted-reports/stats/department?year=${current_year}&month=${current_month}
Cookie: access_token=${AUTH_TOKEN}
EOF
            ;;
            
        "reminders")
            cat > "$target_file" <<EOF
POST ${API_BASE}/unsubmitted-reports/reminders
Cookie: access_token=${AUTH_TOKEN}
Content-Type: application/json
@${ROOT_DIR}/payloads/reminder_batch.json

GET ${API_BASE}/reminders/today
Cookie: access_token=${AUTH_TOKEN}

GET ${API_BASE}/reminders/settings
Cookie: access_token=${AUTH_TOKEN}
EOF
            ;;
            
        *)
            echo "Unknown test type: $test_type"
            exit 1
            ;;
    esac
}

# ペイロードファイルの作成
create_payloads() {
    mkdir -p "${ROOT_DIR}/payloads"
    
    # リマインダー一括送信用ペイロード
    cat > "${ROOT_DIR}/payloads/reminder_batch.json" <<EOF
{
    "user_ids": [
        "$(uuidgen)",
        "$(uuidgen)",
        "$(uuidgen)",
        "$(uuidgen)",
        "$(uuidgen)"
    ],
    "message": "週報の提出期限が近づいています。本日18:00までに提出をお願いします。",
    "send_email": true,
    "send_slack": false
}
EOF
}

# 負荷テストの実行
run_vegeta_test() {
    local test_name=$1
    local target_file="${ROOT_DIR}/targets/${test_name}.txt"
    local result_file="${ROOT_DIR}/results/${test_name}-$(date +%Y%m%d-%H%M%S).bin"
    
    echo "Running performance test for: ${test_name}"
    echo "Target file: ${target_file}"
    echo "Duration: ${TEST_DURATION}"
    echo "Rate: ${TEST_RATE} req/s"
    
    # Vegetaの実行
    vegeta attack \
        -targets="${target_file}" \
        -rate="${TEST_RATE}" \
        -duration="${TEST_DURATION}" \
        -connections="${TEST_CONNECTIONS}" \
        -timeout="30s" \
        -output="${result_file}"
    
    if [ $? -eq 0 ]; then
        echo "Test completed successfully. Results saved to: ${result_file}"
        
        # 結果の表示
        echo ""
        echo "=== Test Results ==="
        vegeta report -type=text "${result_file}"
        
        # パフォーマンス目標のチェック
        check_performance_goals "${result_file}"
    else
        echo "Test failed!"
        exit 1
    fi
}

# パフォーマンス目標のチェック
check_performance_goals() {
    local result_file=$1
    local report=$(vegeta report -type=json "${result_file}")
    
    echo ""
    echo "=== Performance Goals Check ==="
    
    # 95パーセンタイルレイテンシのチェック
    p95_ns=$(echo "$report" | jq '.latencies.p95')
    p95_ms=$((p95_ns / 1000000))
    
    if [ $p95_ms -lt 2000 ]; then
        echo "✓ P95 Latency: ${p95_ms}ms < 2000ms (PASS)"
    else
        echo "✗ P95 Latency: ${p95_ms}ms > 2000ms (FAIL)"
    fi
    
    # スループットのチェック
    rate=$(echo "$report" | jq '.rate')
    if (( $(echo "$rate > 100" | bc -l) )); then
        echo "✓ Throughput: ${rate} req/s > 100 req/s (PASS)"
    else
        echo "✗ Throughput: ${rate} req/s < 100 req/s (FAIL)"
    fi
    
    # エラー率のチェック
    error_ratio=$(echo "$report" | jq '.errors | length / .requests * 100')
    if (( $(echo "$error_ratio < 0.1" | bc -l) )); then
        echo "✓ Error Rate: ${error_ratio}% < 0.1% (PASS)"
    else
        echo "✗ Error Rate: ${error_ratio}% > 0.1% (FAIL)"
    fi
}

# メイン処理
create_payloads
create_targets "$TEST_NAME"
run_vegeta_test "$TEST_NAME"

# クリーンアップ
rm -f cookie.txt .env.test