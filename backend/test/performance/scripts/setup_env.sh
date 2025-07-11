#!/bin/bash

# 環境変数の設定
export BASE_URL="${BASE_URL:-http://localhost:8080}"
export API_VERSION="${API_VERSION:-v1}"
export API_BASE="${BASE_URL}/api/${API_VERSION}"

# テスト用認証トークンの取得
get_auth_token() {
    local email="$1"
    local password="${2:-password123}"
    
    response=$(curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" \
        -c cookie.txt)
    
    if [ $? -eq 0 ]; then
        echo "Authentication successful for ${email}"
        # クッキーからトークンを抽出
        token=$(grep "access_token" cookie.txt | awk '{print $7}')
        echo "AUTH_TOKEN=${token}" > .env.test
    else
        echo "Authentication failed for ${email}"
        exit 1
    fi
}

# 管理者トークンの取得
get_admin_token() {
    get_auth_token "test@duesk.co.jp"
}

# マネージャートークンの取得
get_manager_token() {
    get_auth_token "testuser011@duesk.co.jp"
}

# エンジニアトークンの取得
get_engineer_token() {
    get_auth_token "testuser061@duesk.co.jp"
}

# パフォーマンスメトリクスの目標値
export TARGET_LATENCY_P95="2s"        # 95パーセンタイル: 2秒以内
export TARGET_THROUGHPUT="100"        # 100 req/s以上
export TARGET_ERROR_RATE="0.001"      # エラー率: 0.1%未満

# テスト設定
export TEST_DURATION="${TEST_DURATION:-30s}"     # テスト実行時間
export TEST_RATE="${TEST_RATE:-100}"             # リクエストレート（req/s）
export TEST_CONNECTIONS="${TEST_CONNECTIONS:-50}" # 同時接続数

echo "Performance test environment setup completed!"
echo "Base URL: ${API_BASE}"
echo "Test Duration: ${TEST_DURATION}"
echo "Request Rate: ${TEST_RATE} req/s"
echo "Connections: ${TEST_CONNECTIONS}"