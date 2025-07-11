#!/bin/bash

# CI/CD パイプライン用パフォーマンステストスクリプト

set -e

# 環境変数
export TEST_DURATION="${CI_PERF_TEST_DURATION:-30s}"
export TEST_RATE="${CI_PERF_TEST_RATE:-100}"
export FAIL_ON_ERROR="${CI_FAIL_ON_ERROR:-true}"

# 結果ファイル
RESULTS_DIR="./results"
REPORTS_DIR="./reports"
SUMMARY_FILE="${REPORTS_DIR}/ci_summary_$(date +%Y%m%d_%H%M%S).json"

# テスト実行
run_ci_tests() {
    echo "=== Running CI Performance Tests ==="
    
    # 基本的な負荷テスト
    make test
    
    # 結果の集計
    generate_ci_summary
    
    # パフォーマンス基準のチェック
    check_performance_criteria
}

# CI用サマリーの生成
generate_ci_summary() {
    echo "Generating CI summary..."
    
    local all_pass=true
    local failed_tests=()
    
    # 各テスト結果をチェック
    for result_file in "$RESULTS_DIR"/*.bin; do
        if [ -f "$result_file" ]; then
            local test_name=$(basename "$result_file" | cut -d'-' -f1)
            local report=$(vegeta report -type=json "$result_file")
            
            # メトリクスの抽出
            local p95_ms=$(echo "$report" | jq -r '.latencies.p95 / 1000000')
            local rate=$(echo "$report" | jq -r '.rate')
            local errors=$(echo "$report" | jq -r '.errors | length // 0')
            local requests=$(echo "$report" | jq -r '.requests')
            local error_rate=$(echo "scale=4; $errors / $requests * 100" | bc)
            
            # 基準チェック
            local test_pass=true
            if (( $(echo "$p95_ms > 2000" | bc -l) )); then
                test_pass=false
                all_pass=false
                failed_tests+=("$test_name: P95 latency ${p95_ms}ms > 2000ms")
            fi
            if (( $(echo "$rate < 100" | bc -l) )); then
                test_pass=false
                all_pass=false
                failed_tests+=("$test_name: Throughput ${rate} req/s < 100 req/s")
            fi
            if (( $(echo "$error_rate > 0.1" | bc -l) )); then
                test_pass=false
                all_pass=false
                failed_tests+=("$test_name: Error rate ${error_rate}% > 0.1%")
            fi
        fi
    done
    
    # CI用サマリーJSONの生成
    cat > "$SUMMARY_FILE" <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_pass": $all_pass,
    "failed_tests": $(printf '%s\n' "${failed_tests[@]}" | jq -R . | jq -s .),
    "test_count": $(ls -1 "$RESULTS_DIR"/*.bin 2>/dev/null | wc -l)
}
EOF
}

# パフォーマンス基準のチェック
check_performance_criteria() {
    local overall_pass=$(jq -r '.overall_pass' "$SUMMARY_FILE")
    
    if [ "$overall_pass" = "true" ]; then
        echo "✅ All performance tests passed!"
        exit 0
    else
        echo "❌ Performance tests failed!"
        echo "Failed tests:"
        jq -r '.failed_tests[]' "$SUMMARY_FILE"
        
        if [ "$FAIL_ON_ERROR" = "true" ]; then
            exit 1
        fi
    fi
}

# GitHub Actions用の出力
github_actions_output() {
    if [ -n "$GITHUB_ACTIONS" ]; then
        echo "::group::Performance Test Results"
        cat "$SUMMARY_FILE" | jq .
        echo "::endgroup::"
        
        # ステータスバッジ用の出力
        local overall_pass=$(jq -r '.overall_pass' "$SUMMARY_FILE")
        if [ "$overall_pass" = "true" ]; then
            echo "::notice::Performance tests passed ✅"
        else
            echo "::error::Performance tests failed ❌"
        fi
    fi
}

# GitLab CI用の出力
gitlab_ci_output() {
    if [ -n "$GITLAB_CI" ]; then
        # アーティファクトとして保存
        mkdir -p public
        cp -r "$REPORTS_DIR"/* public/
        
        # JUnit形式のレポート生成
        generate_junit_report
    fi
}

# JUnit形式のレポート生成
generate_junit_report() {
    local junit_file="${REPORTS_DIR}/performance_junit.xml"
    
    cat > "$junit_file" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Performance Tests" time="$(date +%s)">
  <testsuite name="API Performance" tests="4">
EOF
    
    for result_file in "$RESULTS_DIR"/*.bin; do
        if [ -f "$result_file" ]; then
            local test_name=$(basename "$result_file" | cut -d'-' -f1)
            local report=$(vegeta report -type=json "$result_file")
            local p95_ms=$(echo "$report" | jq -r '.latencies.p95 / 1000000')
            
            echo "    <testcase name=\"$test_name\" time=\"$p95_ms\">" >> "$junit_file"
            
            # 失敗判定
            if (( $(echo "$p95_ms > 2000" | bc -l) )); then
                echo "      <failure message=\"P95 latency ${p95_ms}ms exceeds 2000ms threshold\"/>" >> "$junit_file"
            fi
            
            echo "    </testcase>" >> "$junit_file"
        fi
    done
    
    echo "  </testsuite>" >> "$junit_file"
    echo "</testsuites>" >> "$junit_file"
}

# メイン処理
mkdir -p "$RESULTS_DIR" "$REPORTS_DIR"

# テストの実行
run_ci_tests

# CI環境に応じた出力
github_actions_output
gitlab_ci_output

echo "CI performance tests completed!"