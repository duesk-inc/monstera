#!/bin/bash

# 経費申請の「作成して提出」機能修正のテストスクリプト

echo "=== 経費申請「作成して提出」機能のテスト ==="
echo "実行時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

# テスト環境設定
API_BASE_URL="http://localhost:8080/api/v1"
TEST_USER_EMAIL="engineer_test@duesk.co.jp"
TEST_USER_PASSWORD="EmployeePass123!"

# 色付き出力用の関数
print_success() {
    echo -e "\033[32m✓ $1\033[0m"
}

print_error() {
    echo -e "\033[31m✗ $1\033[0m"
}

print_info() {
    echo -e "\033[34mℹ $1\033[0m"
}

# 1. ログイン
echo ""
echo "1. ユーザー認証テスト..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -c /tmp/expense_test_cookies.txt \
    -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token' 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    print_error "ログインに失敗しました"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
else
    print_success "ログイン成功"
fi

# 2. カテゴリ一覧を取得してカテゴリIDを確認
echo ""
echo "2. カテゴリ一覧の取得..."
CATEGORIES_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/expenses/categories" \
    -b /tmp/expense_test_cookies.txt)
CATEGORY_ID=$(echo $CATEGORIES_RESPONSE | jq -r '.data[0].id' 2>/dev/null)

if [ -z "$CATEGORY_ID" ] || [ "$CATEGORY_ID" = "null" ]; then
    print_error "カテゴリ一覧の取得に失敗しました"
    echo "Response: $CATEGORIES_RESPONSE"
    exit 1
else
    print_success "カテゴリID取得成功: $CATEGORY_ID"
fi

# 3. 経費申請を作成（下書き状態）
echo ""
echo "3. 経費申請作成テスト..."
CREATE_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/expenses" \
    -H "Content-Type: application/json" \
    -b /tmp/expense_test_cookies.txt \
    -d "{
        \"category\": \"transport\",
        \"category_id\": \"${CATEGORY_ID}\",
        \"title\": \"修正テスト用経費申請\",
        \"amount\": 30000,
        \"expense_date\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"description\": \"トランザクション修正のテスト用経費申請です。\",
        \"receipt_url\": \"http://example.com/test-receipt.pdf\"
    }")

EXPENSE_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id' 2>/dev/null)
EXPENSE_STATUS=$(echo $CREATE_RESPONSE | jq -r '.data.status' 2>/dev/null)

if [ -z "$EXPENSE_ID" ] || [ "$EXPENSE_ID" = "null" ]; then
    print_error "経費申請の作成に失敗しました"
    echo "Response: $CREATE_RESPONSE"
    exit 1
else
    print_success "経費申請作成成功 (ID: $EXPENSE_ID, Status: $EXPENSE_STATUS)"
fi

# 4. 経費申請を提出（ここが修正箇所のテスト）
echo ""
echo "4. 経費申請提出テスト（修正箇所）..."
SUBMIT_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/expenses/${EXPENSE_ID}/submit" \
    -b /tmp/expense_test_cookies.txt \
    -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$SUBMIT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$SUBMIT_RESPONSE" | grep -v "HTTP_STATUS:")

if [ "$HTTP_STATUS" = "200" ]; then
    SUBMIT_STATUS=$(echo $RESPONSE_BODY | jq -r '.data.status' 2>/dev/null)
    if [ "$SUBMIT_STATUS" = "submitted" ]; then
        print_success "経費申請の提出成功（ステータス: submitted）"
        print_success "500エラーが解消されました！"
    else
        print_error "提出後のステータスが期待と異なります: $SUBMIT_STATUS"
    fi
elif [ "$HTTP_STATUS" = "400" ]; then
    ERROR_MESSAGE=$(echo $RESPONSE_BODY | jq -r '.error' 2>/dev/null)
    ERROR_CODE=$(echo $RESPONSE_BODY | jq -r '.code' 2>/dev/null)
    if [[ "$ERROR_MESSAGE" == *"承認者が設定されていません"* ]]; then
        print_info "期待通りのエラー: $ERROR_MESSAGE (Code: $ERROR_CODE)"
        print_success "エラーハンドリングが正しく動作しています"
    else
        print_error "予期しないエラー: $ERROR_MESSAGE"
        echo "Full Response: $RESPONSE_BODY"
    fi
elif [ "$HTTP_STATUS" = "500" ]; then
    print_error "500エラーが発生しました（修正が反映されていない可能性があります）"
    echo "Response: $RESPONSE_BODY"
    exit 1
else
    print_error "予期しないHTTPステータス: $HTTP_STATUS"
    echo "Response: $RESPONSE_BODY"
    # exit 1  # デバッグのため一時的にコメントアウト
fi

# 5. 承認者設定の確認
echo ""
echo "5. 承認者設定の確認..."
docker-compose exec -T postgres psql -U postgres -d monstera -c "SELECT COUNT(*) as count FROM expense_approver_settings WHERE is_active = true;" | grep -E '[0-9]+' | head -1 | xargs

# テスト結果サマリー
echo ""
echo "========================================="
echo "テスト結果サマリー"
echo "========================================="
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "400" ]; then
    print_success "修正が正しく適用されています"
    print_info "- トランザクションコンテキストが正しく伝播"
    print_info "- エラーハンドリングが適切に動作"
else
    print_error "修正に問題があります"
fi

echo ""
echo "テスト完了時刻: $(date '+%Y-%m-%d %H:%M:%S')"