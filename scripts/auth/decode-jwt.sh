#!/bin/bash

# =============================================================================
# Decode JWT Token to verify claims
# =============================================================================

# Get ID token from last login test
echo "Testing admin user token..."
RESPONSE=$(AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local aws --endpoint http://localhost:9229 cognito-idp admin-initiate-auth \
  --user-pool-id local_7221v1tw \
  --client-id 62h69i1tpbn9rmh83xmtjyj4b \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=admin@duesk.co.jp,PASSWORD=AdminPass123!,SECRET_HASH=$(echo -n "admin@duesk.co.jp62h69i1tpbn9rmh83xmtjyj4b" | openssl dgst -sha256 -hmac "47c44j2dkj2y4tkf777zqgpiw" -binary | base64) \
  --region us-east-1 2>/dev/null)

ID_TOKEN=$(echo "$RESPONSE" | jq -r '.AuthenticationResult.IdToken')

# Decode JWT (header and payload)
echo "JWT Header:"
echo "$ID_TOKEN" | cut -d. -f1 | base64 -d 2>/dev/null | jq . || echo "Base64 decode failed"

echo -e "\nJWT Payload:"
echo "$ID_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq . || echo "Base64 decode failed"