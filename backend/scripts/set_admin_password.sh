#!/bin/bash

# admin@duesk.co.jpのパスワードを設定するスクリプト

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

USERNAME="admin@duesk.co.jp"
NEW_PASSWORD="AdminPass123!"

echo "Setting password for user: $USERNAME"
echo "User Pool ID: $COGNITO_USER_POOL_ID"
echo "Region: $COGNITO_REGION"

# パスワードを永続的に設定（管理者権限で強制設定）
aws cognito-idp admin-set-user-password \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --username "$USERNAME" \
    --password "$NEW_PASSWORD" \
    --permanent \
    --region "$COGNITO_REGION" \
    --profile monstera-dev

if [ $? -eq 0 ]; then
    echo "✓ Password set successfully!"
    echo "Password: $NEW_PASSWORD"
    echo ""
    echo "You can now login with:"
    echo "  Email: $USERNAME"
    echo "  Password: $NEW_PASSWORD"
else
    echo "✗ Error setting password"
    echo ""
    echo "Trying alternative username formats..."
    
    # Cognito Subで試す
    COGNITO_SUB="c754ea38-50c1-7073-43f0-680d98538caa"
    echo "Trying with Cognito Sub: $COGNITO_SUB"
    
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$COGNITO_USER_POOL_ID" \
        --username "$COGNITO_SUB" \
        --password "$NEW_PASSWORD" \
        --permanent \
        --region "$COGNITO_REGION"
    
    if [ $? -eq 0 ]; then
        echo "✓ Password set successfully using Cognito Sub!"
        echo "Password: $NEW_PASSWORD"
    else
        # ユーザー名のバリエーションを試す
        ALTERNATIVE_USERNAMES=("admin-duesk" "admin")
        
        for ALT_USERNAME in "${ALTERNATIVE_USERNAMES[@]}"; do
            echo "Trying with username: $ALT_USERNAME"
            
            aws cognito-idp admin-set-user-password \
                --user-pool-id "$COGNITO_USER_POOL_ID" \
                --username "$ALT_USERNAME" \
                --password "$NEW_PASSWORD" \
                --permanent \
                --region "$COGNITO_REGION" \
                --profile monstera-dev 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo "✓ Password set successfully with username: $ALT_USERNAME"
                echo "Password: $NEW_PASSWORD"
                break
            fi
        done
    fi
fi