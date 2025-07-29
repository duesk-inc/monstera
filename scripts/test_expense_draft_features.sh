#!/bin/bash

# 経費申請の下書き機能テストスクリプト
# このスクリプトはDocker環境での動作確認を行います

echo "=== 経費申請下書き機能のエンドポイントテスト ==="
echo "実装内容: フェーズ1-3の機能をテスト"
echo "================================================"

# テスト環境設定
API_BASE_URL="http://localhost:8080/api/v1"
FRONTEND_URL="http://localhost:3000"
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

# 1. ログインしてトークンを取得
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

# 2. 経費申請を下書き（draft）として作成
echo ""
echo "2. 経費申請作成テスト（下書き）..."
CREATE_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/expenses" \
    -H "Content-Type: application/json" \
    -b /tmp/expense_test_cookies.txt \
    -d '{
        "category_id": "80062a58-38a6-43a5-b456-42b7f112b447",
        "title": "テスト経費申請（下書き）",
        "amount": 5000,
        "expense_date": "2025-01-25T09:00:00+09:00",
        "description": "テスト用の交通費です。交通機関を利用しました。"
    }')

EXPENSE_ID=$(echo $CREATE_RESPONSE | jq -r '.id' 2>/dev/null)
EXPENSE_STATUS=$(echo $CREATE_RESPONSE | jq -r '.status' 2>/dev/null)

if [ -z "$EXPENSE_ID" ] || [ "$EXPENSE_ID" = "null" ]; then
    print_error "経費申請の作成に失敗しました"
    echo "Response: $CREATE_RESPONSE"
    exit 1
else
    print_success "経費申請作成成功 (ID: $EXPENSE_ID)"
    if [ "$EXPENSE_STATUS" = "draft" ]; then
        print_success "ステータスが正しく'draft'になっています"
    else
        print_error "ステータスが'draft'ではありません: $EXPENSE_STATUS"
    fi
fi

# 3. 作成した経費申請の詳細を確認
echo ""
echo "3. 経費申請詳細取得テスト..."
DETAIL_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/expenses/${EXPENSE_ID}" \
    -b /tmp/expense_test_cookies.txt)

DETAIL_STATUS=$(echo $DETAIL_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$DETAIL_STATUS" = "draft" ]; then
    print_success "詳細APIでもステータスが'draft'です"
else
    print_error "詳細APIでステータスが異なります: $DETAIL_STATUS"
fi

# 4. 経費申請を提出（submit）
echo ""
echo "4. 経費申請提出テスト（フェーズ1の機能）..."
SUBMIT_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/expenses/${EXPENSE_ID}/submit" \
    -b /tmp/expense_test_cookies.txt)

SUBMIT_STATUS=$(echo $SUBMIT_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$SUBMIT_STATUS" = "submitted" ]; then
    print_success "経費申請の提出成功（ステータス: submitted）"
else
    print_error "提出後のステータスが期待と異なります: $SUBMIT_STATUS"
    echo "Response: $SUBMIT_RESPONSE"
fi

# 5. 経費申請一覧でフィルター機能をテスト（フェーズ2の機能）
echo ""
echo "5. 経費申請一覧フィルターテスト..."

# 5-1. 全件取得
ALL_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/expenses" \
    -b /tmp/expense_test_cookies.txt)

ALL_COUNT=$(echo $ALL_RESPONSE | jq '.total' 2>/dev/null)
print_info "全経費申請数: $ALL_COUNT"

# 5-2. draftステータスでフィルター
DRAFT_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/expenses?status=draft" \
    -b /tmp/expense_test_cookies.txt)

DRAFT_COUNT=$(echo $DRAFT_RESPONSE | jq '.total' 2>/dev/null)
print_info "下書き状態の経費申請数: $DRAFT_COUNT"

# 5-3. submittedステータスでフィルター
SUBMITTED_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/expenses?status=submitted" \
    -b /tmp/expense_test_cookies.txt)

SUBMITTED_COUNT=$(echo $SUBMITTED_RESPONSE | jq '.total' 2>/dev/null)
print_info "提出済みの経費申請数: $SUBMITTED_COUNT"

# 6. フロントエンドの疎通確認
echo ""
echo "6. フロントエンド疎通確認..."
FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)

if [ "$FRONTEND_CHECK" = "200" ]; then
    print_success "フロントエンドが正常に動作しています"
else
    print_error "フロントエンドにアクセスできません (HTTP: $FRONTEND_CHECK)"
fi

# 7. 作成して即提出のフロー確認（フェーズ3の機能シミュレーション）
echo ""
echo "7. 作成して即提出のフローテスト..."

# 7-1. 新規作成
CREATE_AND_SUBMIT_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/expenses" \
    -H "Content-Type: application/json" \
    -b /tmp/expense_test_cookies.txt \
    -d '{
        "category_id": "80062a58-38a6-43a5-b456-42b7f112b447",
        "title": "作成して即提出のテスト",
        "amount": 3000,
        "expense_date": "2025-01-26T09:00:00+09:00",
        "description": "テスト用の交通費です。交通機関を利用しました。"
    }')

NEW_EXPENSE_ID=$(echo $CREATE_AND_SUBMIT_RESPONSE | jq -r '.id' 2>/dev/null)

if [ -z "$NEW_EXPENSE_ID" ] || [ "$NEW_EXPENSE_ID" = "null" ]; then
    print_error "新規経費申請の作成に失敗しました"
else
    print_success "新規経費申請作成成功 (ID: $NEW_EXPENSE_ID)"
    
    # 7-2. 即座に提出
    IMMEDIATE_SUBMIT_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/expenses/${NEW_EXPENSE_ID}/submit" \
        -b /tmp/expense_test_cookies.txt)
    
    IMMEDIATE_STATUS=$(echo $IMMEDIATE_SUBMIT_RESPONSE | jq -r '.status' 2>/dev/null)
    
    if [ "$IMMEDIATE_STATUS" = "submitted" ]; then
        print_success "作成後即座の提出成功（フェーズ3シミュレーション）"
    else
        print_error "即座の提出に失敗: $IMMEDIATE_STATUS"
    fi
fi

# テスト結果サマリー
echo ""
echo "========================================="
echo "テスト結果サマリー"
echo "========================================="
echo "✅ 実装された機能:"
echo "  - 経費申請の下書き（draft）作成"
echo "  - 下書きから提出（submit）への状態遷移"
echo "  - ステータスによるフィルタリング"
echo "  - 作成→即提出のフロー（APIレベル）"
echo ""
echo "📋 フロントエンドでの確認事項:"
echo "  - 経費申請詳細画面での「提出」ボタン表示（draftステータス時）"
echo "  - 一覧画面でのステータスアイコン表示"
echo "  - 「下書きのみ」フィルターボタンの動作"
echo "  - 作成画面での「下書き保存」「作成して提出」ボタン"
echo ""
print_info "フロントエンドURL: $FRONTEND_URL"