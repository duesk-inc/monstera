#!/bin/bash

echo "=== 経費一覧表示テスト ==="
echo ""

# ログイン
echo "1. ログイン処理..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "engineer_test@duesk.co.jp",
    "password": "EmployeePass123!"
  }' \
  -c /tmp/cookies.txt)

if [ $? -ne 0 ]; then
  echo "❌ ログインに失敗しました"
  exit 1
fi

echo "✅ ログイン成功"
echo ""

# 経費一覧取得
echo "2. 経費一覧API呼び出し..."
EXPENSES_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/v1/expenses?page=1&limit=20" \
  -b /tmp/cookies.txt)

if [ $? -ne 0 ]; then
  echo "❌ 経費一覧API呼び出しに失敗しました"
  exit 1
fi

echo "✅ 経費一覧API呼び出し成功"
echo ""

# レスポンス解析
echo "3. 経費一覧レスポンス:"
echo "$EXPENSES_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$EXPENSES_RESPONSE"
echo ""

# 経費数の確認
EXPENSE_COUNT=$(echo "$EXPENSES_RESPONSE" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    if 'data' in data and 'items' in data['data']:
        print(len(data['data']['items']))
    else:
        print('0')
except:
    print('0')
" 2>/dev/null || echo "0")

echo "取得した経費数: $EXPENSE_COUNT"
echo ""

# カテゴリ表示の確認
echo "4. カテゴリコードの確認:"
echo "$EXPENSES_RESPONSE" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    if 'data' in data and 'items' in data['data']:
        for idx, expense in enumerate(data['data']['items'], 1):
            category = expense.get('category', 'N/A')
            title = expense.get('title', 'N/A')
            amount = expense.get('amount', 0)
            status = expense.get('status', 'N/A')
            print(f'  [{idx}] タイトル: {title}')
            print(f'      カテゴリ: {category}')
            print(f'      金額: ¥{amount:,}')
            print(f'      ステータス: {status}')
            print('')
except Exception as e:
    print(f'  エラー: {str(e)}')
" 2>/dev/null

# フロントエンドのカテゴリ表示確認
echo ""
echo "5. フロントエンドでの確認方法:"
echo "   1. ブラウザで http://localhost:3000/expenses にアクセス"
echo "   2. ログイン (engineer_test@duesk.co.jp / EmployeePass123!)"
echo "   3. 経費一覧でカテゴリ列を確認"
echo "   4. 以下を確認:"
echo "      - 'transport' → '旅費交通費'"
echo "      - 'entertainment' → '交際費'"
echo "      - 'supplies' → '備品'"
echo "      - 'books' → '書籍'"
echo "      - 'seminar' → 'セミナー'"
echo "      - 'other' → 'その他'"

# クリーンアップ
rm -f /tmp/cookies.txt

echo ""
echo "=== テスト完了 ==="