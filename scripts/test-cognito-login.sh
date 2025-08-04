#!/bin/bash

# Cognitoログインテストスクリプト

API_URL="http://localhost:8080"
EMAIL="engineer_test@duesk.co.jp"
PASSWORD="EmployeePass123!"

echo "Testing Cognito login..."
echo "URL: $API_URL/api/v1/auth/login"
echo "Email: $EMAIL"
echo ""

# ログインリクエストを送信
RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

# レスポンスを整形して表示
echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# 成功判定
if echo "$RESPONSE" | grep -q "access_token"; then
    echo ""
    echo "✅ Login successful!"
    
    # トークンを抽出
    ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token' 2>/dev/null)
    if [ ! -z "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
        echo "Access token obtained successfully"
        
        # トークンを使用してプロファイルを取得
        echo ""
        echo "Testing authenticated request..."
        PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/users/profile" \
          -H "Authorization: Bearer $ACCESS_TOKEN")
        
        echo "Profile response:"
        echo "$PROFILE_RESPONSE" | jq . 2>/dev/null || echo "$PROFILE_RESPONSE"
    fi
else
    echo ""
    echo "❌ Login failed"
    
    # エラーの詳細を確認
    if echo "$RESPONSE" | grep -q "error"; then
        ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null || echo "Unknown error")
        echo "Error: $ERROR"
    fi
fi