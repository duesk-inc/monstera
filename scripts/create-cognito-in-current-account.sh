#!/bin/bash

# 現在のアカウントにCognito User Poolを作成

POOL_NAME="monstera-dev-pool"
REGION="ap-northeast-1"

echo "Creating Cognito User Pool in current account..."

# 現在のアカウントを確認
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"

# User Poolを作成
POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name $POOL_NAME \
  --region $REGION \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --query 'UserPool.Id' \
  --output text)

if [ $? -eq 0 ]; then
  echo "✅ User Pool created: $POOL_ID"
  
  # App Clientを作成
  CLIENT_INFO=$(aws cognito-idp create-user-pool-client \
    --user-pool-id $POOL_ID \
    --client-name "monstera-backend-client" \
    --region $REGION \
    --generate-secret \
    --explicit-auth-flows "ALLOW_USER_PASSWORD_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" \
    --query '{ClientId: UserPoolClient.ClientId, ClientSecret: UserPoolClient.ClientSecret}' \
    --output json)
  
  CLIENT_ID=$(echo $CLIENT_INFO | jq -r '.ClientId')
  CLIENT_SECRET=$(echo $CLIENT_INFO | jq -r '.ClientSecret')
  
  echo ""
  echo "======================================"
  echo "新しいCognito設定情報:"
  echo "COGNITO_USER_POOL_ID=$POOL_ID"
  echo "COGNITO_CLIENT_ID=$CLIENT_ID"
  echo "COGNITO_CLIENT_SECRET=$CLIENT_SECRET"
  echo "======================================"
  echo ""
  echo ".env.cognitoファイルを更新してください"
else
  echo "❌ Failed to create User Pool"
fi