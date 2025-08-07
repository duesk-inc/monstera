#!/bin/bash

# Cognitoユーザープールにadmin@duesk.co.jpを作成するスクリプト

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

EMAIL="admin@duesk.co.jp"
TEMP_PASSWORD="TempPass123!"
USERNAME="admin-duesk"

echo "Creating Cognito user: $EMAIL"
echo "User Pool ID: $COGNITO_USER_POOL_ID"
echo "Region: $COGNITO_REGION"

# Cognitoユーザーの作成
aws cognito-idp admin-create-user \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --username "$USERNAME" \
    --user-attributes \
        Name=email,Value="$EMAIL" \
        Name=email_verified,Value=true \
        Name=name,Value="Admin User" \
        Name=given_name,Value="Admin" \
        Name=family_name,Value="User" \
    --temporary-password "$TEMP_PASSWORD" \
    --message-action SUPPRESS \
    --region "$COGNITO_REGION"

if [ $? -eq 0 ]; then
    echo "User created successfully!"
    echo "Temporary password: $TEMP_PASSWORD"
    
    # ユーザー情報を取得してCognito Subを確認
    echo -e "\nGetting user information..."
    USER_INFO=$(aws cognito-idp admin-get-user \
        --user-pool-id "$COGNITO_USER_POOL_ID" \
        --username "$USERNAME" \
        --region "$COGNITO_REGION")
    
    COGNITO_SUB=$(echo "$USER_INFO" | grep -A1 '"Name": "sub"' | grep '"Value"' | cut -d'"' -f4)
    
    if [ ! -z "$COGNITO_SUB" ]; then
        echo "Cognito Sub: $COGNITO_SUB"
        echo -e "\nDatabase update SQL:"
        echo "UPDATE users SET cognito_sub = '$COGNITO_SUB' WHERE email = '$EMAIL';"
        
        # データベースを更新するかを確認
        read -p "Do you want to update the database now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose exec postgres psql -U postgres -d monstera -c "UPDATE users SET cognito_sub = '$COGNITO_SUB' WHERE email = '$EMAIL';"
            echo "Database updated!"
        fi
    fi
else
    echo "Error creating user. Please check your AWS credentials and permissions."
    
    # エラーの詳細を確認
    echo -e "\nChecking if user already exists..."
    aws cognito-idp admin-get-user \
        --user-pool-id "$COGNITO_USER_POOL_ID" \
        --username "$USERNAME" \
        --region "$COGNITO_REGION" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "User already exists in Cognito!"
        echo "Getting existing user's Cognito Sub..."
        
        USER_INFO=$(aws cognito-idp admin-get-user \
            --user-pool-id "$COGNITO_USER_POOL_ID" \
            --username "$USERNAME" \
            --region "$COGNITO_REGION")
        
        COGNITO_SUB=$(echo "$USER_INFO" | grep -A1 '"Name": "sub"' | grep '"Value"' | cut -d'"' -f4)
        
        if [ ! -z "$COGNITO_SUB" ]; then
            echo "Existing Cognito Sub: $COGNITO_SUB"
            echo -e "\nDatabase update SQL:"
            echo "UPDATE users SET cognito_sub = '$COGNITO_SUB' WHERE email = '$EMAIL';"
        fi
    fi
fi