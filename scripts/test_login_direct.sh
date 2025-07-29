#!/bin/bash

echo "=== Direct Login Test ==="

# Create a proper JSON file to avoid escaping issues
cat > /tmp/login_request.json <<EOF
{
  "email": "engineer_test@duesk.co.jp",
  "password": "EmployeePass123!"
}
EOF

echo "Login request:"
cat /tmp/login_request.json

echo ""
echo "Sending login request..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d @/tmp/login_request.json)

echo "Response:"
echo "$RESPONSE" | jq .

# Check if login was successful
if echo "$RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
  echo ""
  echo "✅ Login successful!"
  echo ""
  echo "Testing file upload URL generation..."
  
  # Test upload URL generation
  cat > /tmp/upload_request.json <<EOF
{
  "file_name": "test-receipt.pdf",
  "file_size": 1024000,
  "content_type": "application/pdf"
}
EOF

  UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/expenses/upload-url \
    -H "Content-Type: application/json" \
    -b /tmp/cookies.txt \
    -d @/tmp/upload_request.json)
  
  echo "Upload URL Response:"
  echo "$UPLOAD_RESPONSE" | jq .
else
  echo ""
  echo "❌ Login failed!"
fi

# Cleanup
rm -f /tmp/login_request.json /tmp/upload_request.json