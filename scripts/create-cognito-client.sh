#!/bin/bash

# Cognito App Client作成スクリプト
# 使用方法: ./create-cognito-client.sh

# 設定値
USER_POOL_ID="ap-northeast-1_B38FHxujm"
CLIENT_NAME="monstera-backend-client"
REGION="ap-northeast-1"

echo "Creating Cognito App Client..."

# App Clientを作成
RESULT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-name $CLIENT_NAME \
  --region $REGION \
  --generate-secret \
  --explicit-auth-flows "ALLOW_USER_PASSWORD_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" \
  --supported-identity-providers "COGNITO" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "profile" \
  --callback-urls "http://localhost:3000/callback" \
  --logout-urls "http://localhost:3000/logout" \
  --allowed-o-auth-flows-user-pool-client \
  --prevent-user-existence-errors "ENABLED" \
  --enable-token-revocation \
  --auth-session-validity 3)

if [ $? -eq 0 ]; then
  # 結果からClient IDとSecretを抽出
  CLIENT_ID=$(echo $RESULT | jq -r '.UserPoolClient.ClientId')
  CLIENT_SECRET=$(echo $RESULT | jq -r '.UserPoolClient.ClientSecret')
  
  echo "✅ App Client created successfully!"
  echo ""
  echo "======================================"
  echo "COGNITO_CLIENT_ID=$CLIENT_ID"
  echo "COGNITO_CLIENT_SECRET=$CLIENT_SECRET"
  echo "======================================"
  echo ""
  echo "Please update your .env.cognito file with these values."
else
  echo "❌ Failed to create App Client"
  exit 1
fi