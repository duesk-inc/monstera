#!/bin/bash

# =============================================================================
# Local Cognito Setup Script
# =============================================================================
# このスクリプトは開発環境用のCognito User PoolとApp Clientを作成します
# =============================================================================

set -e  # エラーが発生したら即座に終了

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 環境変数
COGNITO_ENDPOINT=${COGNITO_ENDPOINT:-"http://localhost:9229"}
AWS_REGION=${AWS_REGION:-"us-east-1"}

# AWS CLI設定
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local

echo -e "${GREEN}=== Local Cognito Setup Start ===${NC}"

# 1. User Pool作成
echo -e "${YELLOW}Creating User Pool...${NC}"
USER_POOL_RESPONSE=$(aws --endpoint $COGNITO_ENDPOINT cognito-idp create-user-pool \
  --pool-name "monstera-local" \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}' \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration "OFF" \
  --region $AWS_REGION)

USER_POOL_ID=$(echo $USER_POOL_RESPONSE | jq -r '.UserPool.Id')
echo -e "${GREEN}✓ User Pool created: $USER_POOL_ID${NC}"

# 2. カスタム属性を追加
echo -e "${YELLOW}Adding custom attributes...${NC}"

# role属性（1-6の数値）
aws --endpoint $COGNITO_ENDPOINT cognito-idp add-custom-attributes \
  --user-pool-id $USER_POOL_ID \
  --custom-attributes \
    Name=role,AttributeDataType=Number,Mutable=true,Required=false,NumberAttributeConstraints={MinValue=1,MaxValue=6} \
  --region $AWS_REGION || echo "role attribute might already exist"

# department_id属性
aws --endpoint $COGNITO_ENDPOINT cognito-idp add-custom-attributes \
  --user-pool-id $USER_POOL_ID \
  --custom-attributes \
    Name=department_id,AttributeDataType=String,Mutable=true,Required=false,StringAttributeConstraints={MinLength=1,MaxLength=36} \
  --region $AWS_REGION || echo "department_id attribute might already exist"

# employee_id属性
aws --endpoint $COGNITO_ENDPOINT cognito-idp add-custom-attributes \
  --user-pool-id $USER_POOL_ID \
  --custom-attributes \
    Name=employee_id,AttributeDataType=String,Mutable=true,Required=false,StringAttributeConstraints={MinLength=1,MaxLength=36} \
  --region $AWS_REGION || echo "employee_id attribute might already exist"

echo -e "${GREEN}✓ Custom attributes added${NC}"

# 3. App Client作成
echo -e "${YELLOW}Creating App Client...${NC}"
CLIENT_RESPONSE=$(aws --endpoint $COGNITO_ENDPOINT cognito-idp create-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-name "monstera-app" \
  --explicit-auth-flows "ALLOW_USER_PASSWORD_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_ADMIN_USER_PASSWORD_AUTH" \
  --generate-secret \
  --read-attributes "email" "name" "custom:role" "custom:department_id" "custom:employee_id" \
  --write-attributes "email" "name" "custom:role" "custom:department_id" "custom:employee_id" \
  --region $AWS_REGION)

CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.UserPoolClient.ClientId')
CLIENT_SECRET=$(echo $CLIENT_RESPONSE | jq -r '.UserPoolClient.ClientSecret')
echo -e "${GREEN}✓ App Client created: $CLIENT_ID${NC}"

# 4. テストユーザー作成
echo -e "${YELLOW}Creating test users...${NC}"

# 管理者ユーザー（role=2）
ADMIN_RESPONSE=$(aws --endpoint $COGNITO_ENDPOINT cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username "admin@duesk.co.jp" \
  --user-attributes \
    Name=email,Value=admin@duesk.co.jp \
    Name=email_verified,Value=true \
    Name=name,Value="Admin User" \
    Name=custom:role,Value=2 \
    Name=custom:department_id,Value="dept-001" \
    Name=custom:employee_id,Value="emp-001" \
  --temporary-password "TempPass123!" \
  --message-action "SUPPRESS" \
  --region $AWS_REGION)

# パスワードを設定（一時パスワードから永続パスワードへ）
aws --endpoint $COGNITO_ENDPOINT cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username "admin@duesk.co.jp" \
  --password "AdminPass123!" \
  --permanent \
  --region $AWS_REGION

echo -e "${GREEN}✓ Admin user created: admin@duesk.co.jp${NC}"

# 一般ユーザー（role=4）
EMPLOYEE_RESPONSE=$(aws --endpoint $COGNITO_ENDPOINT cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username "engineer_test@duesk.co.jp" \
  --user-attributes \
    Name=email,Value=engineer_test@duesk.co.jp \
    Name=email_verified,Value=true \
    Name=name,Value="Employee User" \
    Name=custom:role,Value=4 \
    Name=custom:department_id,Value="dept-002" \
    Name=custom:employee_id,Value="emp-002" \
  --temporary-password "TempPass123!" \
  --message-action "SUPPRESS" \
  --region $AWS_REGION)

# パスワードを設定
aws --endpoint $COGNITO_ENDPOINT cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username "engineer_test@duesk.co.jp" \
  --password "EmployeePass123!" \
  --permanent \
  --region $AWS_REGION

echo -e "${GREEN}✓ Employee user created: engineer_test@duesk.co.jp${NC}"

# 5. 設定を環境変数ファイルに保存
echo -e "${YELLOW}Saving configuration...${NC}"

# Backend用設定を更新
BACKEND_ENV_FILE="../backend/.env.development"
if [ -f "$BACKEND_ENV_FILE" ]; then
    # 既存のCognito設定を削除してから追加
    sed -i.bak '/^COGNITO_/d' "$BACKEND_ENV_FILE"
    cat >> "$BACKEND_ENV_FILE" << EOF

# Cognito Configuration (Auto-generated)
COGNITO_ENABLED=true
COGNITO_REGION=$AWS_REGION
COGNITO_USER_POOL_ID=$USER_POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
COGNITO_CLIENT_SECRET=$CLIENT_SECRET
COGNITO_ENDPOINT=$COGNITO_ENDPOINT
EOF
    echo -e "${GREEN}✓ Backend environment updated${NC}"
fi

# Frontend用設定を更新
FRONTEND_ENV_FILE="../frontend/.env.local"
if [ -f "$FRONTEND_ENV_FILE" ]; then
    # 既存のCognito設定を削除してから追加
    sed -i.bak '/^NEXT_PUBLIC_COGNITO_/d' "$FRONTEND_ENV_FILE"
    cat >> "$FRONTEND_ENV_FILE" << EOF

# Cognito Configuration (Auto-generated)
NEXT_PUBLIC_COGNITO_ENABLED=true
NEXT_PUBLIC_COGNITO_REGION=$AWS_REGION
NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID
NEXT_PUBLIC_COGNITO_ENDPOINT=$COGNITO_ENDPOINT
EOF
    echo -e "${GREEN}✓ Frontend environment updated${NC}"
fi

# 6. 設定サマリーを表示
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo -e "User Pool ID: ${YELLOW}$USER_POOL_ID${NC}"
echo -e "Client ID: ${YELLOW}$CLIENT_ID${NC}"
echo -e "Client Secret: ${YELLOW}$CLIENT_SECRET${NC}"
echo -e ""
echo -e "${GREEN}Test Users:${NC}"
echo -e "  Admin: admin@duesk.co.jp / AdminPass123!"
echo -e "  Employee: engineer_test@duesk.co.jp / EmployeePass123!"
echo -e ""
echo -e "${YELLOW}Note: Environment files have been updated automatically.${NC}"