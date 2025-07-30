#!/bin/bash

# Test file upload API

echo "=== Testing File Upload API ==="

# 1. Login and get JWT token
echo -e "\n1. Logging in as engineer_test@duesk.co.jp..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "engineer_test@duesk.co.jp",
    "password": "EmployeePass123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token' 2>/dev/null)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Failed to get token. Response:"
  echo $LOGIN_RESPONSE | jq .
  exit 1
fi

echo "Successfully obtained JWT token"

# 2. Test upload start
echo -e "\n2. Testing upload start endpoint..."
UPLOAD_START_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/expenses/upload-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "test-receipt.pdf",
    "file_size": 102400,
    "content_type": "application/pdf"
  }')

echo "Upload start response:"
echo $UPLOAD_START_RESPONSE | jq .

# Extract presigned URL and S3 key
PRESIGNED_URL=$(echo $UPLOAD_START_RESPONSE | jq -r '.data.upload_url' 2>/dev/null)
S3_KEY=$(echo $UPLOAD_START_RESPONSE | jq -r '.data.s3_key' 2>/dev/null)

if [ "$PRESIGNED_URL" == "null" ] || [ -z "$PRESIGNED_URL" ]; then
  echo "Failed to get presigned URL"
  exit 1
fi

echo -e "\nPresigned URL obtained"
echo "S3 Key: $S3_KEY"

# 3. Create a test file
echo -e "\n3. Creating test PDF file..."
echo "%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources <<
   /Font << /F1 <<
      /Type /Font /Subtype /Type1 /BaseFont /Times-Roman
   >> >>
>> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Receipt) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000330 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
420
%%EOF" > /tmp/test-receipt.pdf

# 4. Upload file to presigned URL (using mock S3)
echo -e "\n4. Uploading file to S3..."
# Since we're using mock S3, we'll use the mock upload endpoint
UPLOAD_RESPONSE=$(curl -s -X PUT "http://localhost:8080/api/v1/mock-upload/${S3_KEY}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/pdf" \
  --data-binary @/tmp/test-receipt.pdf)

echo "Upload response: $UPLOAD_RESPONSE"

# 5. Complete upload
echo -e "\n5. Completing upload..."
COMPLETE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/expenses/upload-complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"s3_key\": \"$S3_KEY\",
    \"file_size\": 102400
  }")

echo "Complete upload response:"
echo $COMPLETE_RESPONSE | jq .

# Clean up
rm -f /tmp/test-receipt.pdf

echo -e "\n=== Test completed ==="