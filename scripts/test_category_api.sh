#!/bin/bash

echo "=== カテゴリAPI動作確認 ==="
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

# カテゴリ一覧取得
echo "2. カテゴリ一覧API呼び出し..."
CATEGORIES_RESPONSE=$(curl -s -X GET http://localhost:8080/api/v1/expenses/categories \
  -b /tmp/cookies.txt)

if [ $? -ne 0 ]; then
  echo "❌ カテゴリAPI呼び出しに失敗しました"
  exit 1
fi

echo "✅ カテゴリAPI呼び出し成功"
echo ""

# レスポンス解析
echo "3. カテゴリ情報:"
echo "$CATEGORIES_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CATEGORIES_RESPONSE"
echo ""

# カテゴリ数の確認
CATEGORY_COUNT=$(echo "$CATEGORIES_RESPONSE" | python3 -c "import json, sys; data = json.load(sys.stdin); print(len(data['data']))" 2>/dev/null || echo "0")
echo "カテゴリ数: $CATEGORY_COUNT"

# 各カテゴリのcode/nameを表示
echo ""
echo "4. カテゴリ詳細:"
echo "$CATEGORIES_RESPONSE" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    if 'data' in data:
        for cat in data['data']:
            print(f\"  - Code: {cat.get('code', 'N/A')}, Name: {cat.get('name', 'N/A')}\")
except:
    print('  カテゴリ情報の解析に失敗しました')
" 2>/dev/null

# クリーンアップ
rm -f /tmp/cookies.txt

echo ""
echo "=== テスト完了 ==="