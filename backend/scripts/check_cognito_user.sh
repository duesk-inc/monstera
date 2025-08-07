#!/bin/bash

# 既存のCognitoユーザーを確認するスクリプト

# 環境変数の読み込み
if [ -f ../.env ]; then
    source ../.env
else
    echo "Error: .env file not found"
    exit 1
fi

# 必要な環境変数のチェック
if [ -z "$COGNITO_USER_POOL_ID" ] || [ -z "$COGNITO_REGION" ]; then
    echo "Error: COGNITO_USER_POOL_ID or COGNITO_REGION is not set"
    exit 1
fi

# 確認するユーザー名のリスト
USERNAMES=("admin-duesk" "admin@duesk.co.jp" "53b0f090-3c9c-4b60-b00b-242a911a40e1")

echo "Checking Cognito users in pool: $COGNITO_USER_POOL_ID"
echo "Region: $COGNITO_REGION"
echo "================================"

for USERNAME in "${USERNAMES[@]}"; do
    echo -e "\nChecking username: $USERNAME"
    
    aws cognito-idp admin-get-user \
        --user-pool-id "$COGNITO_USER_POOL_ID" \
        --username "$USERNAME" \
        --region "$COGNITO_REGION" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✓ User found!"
        
        # ユーザー情報を取得
        USER_INFO=$(aws cognito-idp admin-get-user \
            --user-pool-id "$COGNITO_USER_POOL_ID" \
            --username "$USERNAME" \
            --region "$COGNITO_REGION" 2>/dev/null)
        
        # 属性を抽出
        EMAIL=$(echo "$USER_INFO" | grep -A1 '"Name": "email"' | grep '"Value"' | cut -d'"' -f4)
        SUB=$(echo "$USER_INFO" | grep -A1 '"Name": "sub"' | grep '"Value"' | cut -d'"' -f4)
        STATUS=$(echo "$USER_INFO" | grep '"UserStatus"' | cut -d'"' -f4)
        
        echo "  Email: $EMAIL"
        echo "  Sub: $SUB"
        echo "  Status: $STATUS"
        
        # データベースの現在の値と比較
        if [ ! -z "$SUB" ]; then
            echo -e "\n  Checking database..."
            DB_RESULT=$(docker-compose exec -T postgres psql -U postgres -d monstera -t -c "SELECT email, cognito_sub FROM users WHERE cognito_sub = '$SUB' OR email = '$EMAIL';")
            
            if [ ! -z "$DB_RESULT" ]; then
                echo "  Database record found:"
                echo "$DB_RESULT"
            else
                echo "  No matching database record found"
                echo "  SQL to update: UPDATE users SET cognito_sub = '$SUB' WHERE email = '$EMAIL';"
            fi
        fi
    else
        echo "✗ User not found"
    fi
done

# 全ユーザーをリスト表示（権限がある場合）
echo -e "\n================================"
echo "Attempting to list all users (may fail due to permissions):"
aws cognito-idp list-users \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --region "$COGNITO_REGION" \
    --max-results 20 2>/dev/null || echo "Cannot list users due to insufficient permissions"