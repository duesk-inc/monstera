#!/bin/bash

# Cognitoテストユーザー作成スクリプト

# 設定
USER_POOL_ID="ap-northeast-1_B38FHxujm"
USERNAME="engineer_test@duesk.co.jp"
TEMP_PASSWORD="TempPass123!"
REGION="ap-northeast-1"

echo "Creating test user in Cognito..."

# ユーザーを作成
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username $USERNAME \
  --user-attributes \
    Name=email,Value=$USERNAME \
    Name=email_verified,Value=true \
  --temporary-password "$TEMP_PASSWORD" \
  --message-action SUPPRESS \
  --region $REGION

if [ $? -eq 0 ]; then
  echo "✅ User created successfully!"
  echo ""
  echo "User: $USERNAME"
  echo "Temporary Password: $TEMP_PASSWORD"
  echo ""
  echo "Note: The user will need to change password on first login"
  
  # パスワードを永続化（開発環境用）
  echo ""
  echo "Setting permanent password for development..."
  aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME \
    --password "EmployeePass123!" \
    --permanent \
    --region $REGION
    
  if [ $? -eq 0 ]; then
    echo "✅ Password set to: EmployeePass123!"
  else
    echo "⚠️  Failed to set permanent password"
  fi
else
  echo "❌ Failed to create user"
  echo "User might already exist. Checking..."
  
  # ユーザーの存在確認
  aws cognito-idp admin-get-user \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME \
    --region $REGION > /dev/null 2>&1
    
  if [ $? -eq 0 ]; then
    echo "ℹ️  User already exists"
    echo "Resetting password..."
    
    aws cognito-idp admin-set-user-password \
      --user-pool-id $USER_POOL_ID \
      --username $USERNAME \
      --password "EmployeePass123!" \
      --permanent \
      --region $REGION
      
    if [ $? -eq 0 ]; then
      echo "✅ Password reset to: EmployeePass123!"
    fi
  fi
fi