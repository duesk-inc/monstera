#!/bin/bash

# =============================================================================
# Test Cognito Login
# =============================================================================

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 環境変数
COGNITO_ENDPOINT=${COGNITO_ENDPOINT:-"http://localhost:9230"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
USER_POOL_ID="local_7221v1tw"
CLIENT_ID="62h69i1tpbn9rmh83xmtjyj4b"
CLIENT_SECRET="47c44j2dkj2y4tkf777zqgpiw"

# AWS CLI設定
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local

echo -e "${GREEN}=== Testing Cognito Login ===${NC}"

# SecretHashの計算（Bash内でHMAC-SHA256を計算）
calculate_secret_hash() {
    local username=$1
    local client_id=$2
    local client_secret=$3
    echo -n "${username}${client_id}" | openssl dgst -sha256 -hmac "${client_secret}" -binary | base64
}

# 管理者ユーザーでログインテスト
echo -e "${YELLOW}Testing admin login...${NC}"
USERNAME="admin@duesk.co.jp"
PASSWORD="AdminPass123!"
SECRET_HASH=$(calculate_secret_hash "$USERNAME" "$CLIENT_ID" "$CLIENT_SECRET")

RESPONSE=$(aws --endpoint $COGNITO_ENDPOINT cognito-idp admin-initiate-auth \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD,SECRET_HASH=$SECRET_HASH \
  --region $AWS_REGION 2>&1) || {
    echo -e "${RED}Login failed:${NC}"
    echo "$RESPONSE"
    exit 1
}

if echo "$RESPONSE" | grep -q "IdToken"; then
    echo -e "${GREEN}✓ Admin login successful${NC}"
    echo "$RESPONSE" | jq '{IdToken: .AuthenticationResult.IdToken[0:50], AccessToken: .AuthenticationResult.AccessToken[0:50], RefreshToken: .AuthenticationResult.RefreshToken[0:50]}'
else
    echo -e "${RED}Login failed${NC}"
    echo "$RESPONSE"
fi

# 一般ユーザーでログインテスト
echo -e "${YELLOW}Testing employee login...${NC}"
USERNAME="engineer_test@duesk.co.jp"
PASSWORD="EmployeePass123!"
SECRET_HASH=$(calculate_secret_hash "$USERNAME" "$CLIENT_ID" "$CLIENT_SECRET")

RESPONSE=$(aws --endpoint $COGNITO_ENDPOINT cognito-idp admin-initiate-auth \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD,SECRET_HASH=$SECRET_HASH \
  --region $AWS_REGION 2>&1) || {
    echo -e "${RED}Login failed:${NC}"
    echo "$RESPONSE"
    exit 1
}

if echo "$RESPONSE" | grep -q "IdToken"; then
    echo -e "${GREEN}✓ Employee login successful${NC}"
    echo "$RESPONSE" | jq '{IdToken: .AuthenticationResult.IdToken[0:50], AccessToken: .AuthenticationResult.AccessToken[0:50], RefreshToken: .AuthenticationResult.RefreshToken[0:50]}'
else
    echo -e "${RED}Login failed${NC}"
    echo "$RESPONSE"
fi

echo -e "${GREEN}=== Login Tests Complete ===${NC}"