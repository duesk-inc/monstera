#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="${ROOT_DIR}/results"
REPORTS_DIR="${ROOT_DIR}/reports"

# レポートディレクトリの作成
mkdir -p "$REPORTS_DIR"

# 利用可能な結果ファイルのチェック
if [ ! -d "$RESULTS_DIR" ] || [ -z "$(ls -A $RESULTS_DIR/*.bin 2>/dev/null)" ]; then
    echo "No test results found in $RESULTS_DIR"
    exit 1
fi

# HTMLレポートのヘッダー
generate_html_header() {
    cat <<EOF
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monstera Performance Test Report - $(date '+%Y-%m-%d %H:%M:%S')</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #333;
        }
        .summary {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background-color: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .pass {
            color: #28a745;
        }
        .fail {
            color: #dc3545;
        }
        .warning {
            color: #ffc107;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .chart {
            margin: 20px 0;
            height: 300px;
            background-color: #f8f9fa;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Monstera Performance Test Report</h1>
        <p>Generated on: $(date '+%Y-%m-%d %H:%M:%S')</p>
        
        <div class="summary">
            <h2>Test Configuration</h2>
            <ul>
                <li><strong>Target Users:</strong> 500</li>
                <li><strong>Target Throughput:</strong> 100 req/s</li>
                <li><strong>Target P95 Latency:</strong> < 2 seconds</li>
                <li><strong>Target Error Rate:</strong> < 0.1%</li>
            </ul>
        </div>
EOF
}

# HTMLレポートのフッター
generate_html_footer() {
    cat <<EOF
    </div>
</body>
</html>
EOF
}

# テスト結果の解析と表示
analyze_test_results() {
    local test_name=$1
    local result_file=$2
    
    # Vegetaレポートの生成
    local json_report=$(vegeta report -type=json "$result_file")
    local text_report=$(vegeta report -type=text "$result_file")
    
    # メトリクスの抽出
    local requests=$(echo "$json_report" | jq -r '.requests')
    local rate=$(echo "$json_report" | jq -r '.rate')
    local throughput=$(echo "$json_report" | jq -r '.throughput')
    local success_ratio=$(echo "$json_report" | jq -r '.success')
    local p50_ms=$(echo "$json_report" | jq -r '.latencies.p50 / 1000000')
    local p95_ms=$(echo "$json_report" | jq -r '.latencies.p95 / 1000000')
    local p99_ms=$(echo "$json_report" | jq -r '.latencies.p99 / 1000000')
    local max_ms=$(echo "$json_report" | jq -r '.latencies.max / 1000000')
    local errors=$(echo "$json_report" | jq -r '.errors | length // 0')
    local error_rate=$(echo "scale=4; $errors / $requests * 100" | bc)
    
    # パス/フェイルの判定
    local p95_status="fail"
    if (( $(echo "$p95_ms < 2000" | bc -l) )); then
        p95_status="pass"
    fi
    
    local throughput_status="fail"
    if (( $(echo "$rate > 100" | bc -l) )); then
        throughput_status="pass"
    fi
    
    local error_status="fail"
    if (( $(echo "$error_rate < 0.1" | bc -l) )); then
        error_status="pass"
    fi
    
    cat <<EOF
        <h2>Test: ${test_name}</h2>
        
        <div class="metrics">
            <div class="metric-card">
                <h3>Total Requests</h3>
                <div class="metric-value">${requests}</div>
            </div>
            
            <div class="metric-card">
                <h3>Throughput</h3>
                <div class="metric-value ${throughput_status}">${rate} req/s</div>
                <small>Target: >100 req/s</small>
            </div>
            
            <div class="metric-card">
                <h3>P95 Latency</h3>
                <div class="metric-value ${p95_status}">${p95_ms} ms</div>
                <small>Target: <2000 ms</small>
            </div>
            
            <div class="metric-card">
                <h3>Error Rate</h3>
                <div class="metric-value ${error_status}">${error_rate}%</div>
                <small>Target: <0.1%</small>
            </div>
        </div>
        
        <h3>Latency Distribution</h3>
        <table>
            <tr>
                <th>Percentile</th>
                <th>Latency (ms)</th>
            </tr>
            <tr>
                <td>P50 (Median)</td>
                <td>${p50_ms}</td>
            </tr>
            <tr>
                <td>P95</td>
                <td>${p95_ms}</td>
            </tr>
            <tr>
                <td>P99</td>
                <td>${p99_ms}</td>
            </tr>
            <tr>
                <td>Max</td>
                <td>${max_ms}</td>
            </tr>
        </table>
        
        <h3>Raw Output</h3>
        <pre>${text_report}</pre>
        
        <hr style="margin: 40px 0;">
EOF
}

# メインレポートの生成
generate_main_report() {
    local report_file="${REPORTS_DIR}/performance_report_$(date +%Y%m%d_%H%M%S).html"
    
    # ヘッダーの出力
    generate_html_header > "$report_file"
    
    # 各テスト結果の処理
    for result_file in "$RESULTS_DIR"/*.bin; do
        if [ -f "$result_file" ]; then
            # ファイル名からテスト名を抽出
            filename=$(basename "$result_file")
            test_name="${filename%%-*}"
            
            echo "Processing results for: $test_name"
            analyze_test_results "$test_name" "$result_file" >> "$report_file"
        fi
    done
    
    # フッターの出力
    generate_html_footer >> "$report_file"
    
    echo "Performance report generated: $report_file"
}

# サマリーレポートの生成
generate_summary_report() {
    local summary_file="${REPORTS_DIR}/performance_summary_$(date +%Y%m%d_%H%M%S).json"
    local all_pass=true
    
    echo "{" > "$summary_file"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$summary_file"
    echo "  \"test_results\": {" >> "$summary_file"
    
    local first=true
    for result_file in "$RESULTS_DIR"/*.bin; do
        if [ -f "$result_file" ]; then
            filename=$(basename "$result_file")
            test_name="${filename%%-*}"
            
            if [ "$first" = false ]; then
                echo "," >> "$summary_file"
            fi
            first=false
            
            json_report=$(vegeta report -type=json "$result_file")
            
            # パフォーマンスチェック
            p95_ms=$(echo "$json_report" | jq -r '.latencies.p95 / 1000000')
            rate=$(echo "$json_report" | jq -r '.rate')
            errors=$(echo "$json_report" | jq -r '.errors | length // 0')
            requests=$(echo "$json_report" | jq -r '.requests')
            error_rate=$(echo "scale=4; $errors / $requests * 100" | bc)
            
            pass=true
            if (( $(echo "$p95_ms > 2000" | bc -l) )); then
                pass=false
                all_pass=false
            fi
            if (( $(echo "$rate < 100" | bc -l) )); then
                pass=false
                all_pass=false
            fi
            if (( $(echo "$error_rate > 0.1" | bc -l) )); then
                pass=false
                all_pass=false
            fi
            
            echo -n "    \"$test_name\": {
      \"pass\": $pass,
      \"p95_latency_ms\": $p95_ms,
      \"throughput_rps\": $rate,
      \"error_rate_percent\": $error_rate
    }" >> "$summary_file"
        fi
    done
    
    echo "" >> "$summary_file"
    echo "  }," >> "$summary_file"
    echo "  \"overall_pass\": $all_pass" >> "$summary_file"
    echo "}" >> "$summary_file"
    
    echo "Summary report generated: $summary_file"
}

# メイン処理
echo "Generating performance test reports..."
generate_main_report
generate_summary_report
echo "Report generation completed!"