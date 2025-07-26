#!/bin/bash

# MinIO統合テストスクリプト

echo "=== MinIO統合テスト開始 ==="

# 1. Pre-signed URL生成テスト
echo ""
echo "1. Pre-signed URL生成テスト"
echo "POST /api/v1/expenses/upload-url"

RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/expenses/upload-url \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{
    "file_name": "test-receipt.pdf",
    "file_size": 1024000,
    "content_type": "application/pdf"
  }')

echo "Response: $RESPONSE"

# レスポンスからupload_urlとs3_keyを抽出
UPLOAD_URL=$(echo $RESPONSE | jq -r '.data.upload_url // empty')
S3_KEY=$(echo $RESPONSE | jq -r '.data.s3_key // empty')

if [ -z "$UPLOAD_URL" ] || [ -z "$S3_KEY" ]; then
  echo "ERROR: Failed to get upload URL"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "Upload URL: $UPLOAD_URL"
echo "S3 Key: $S3_KEY"

# 2. ファイルアップロードテスト
echo ""
echo "2. ファイルアップロードテスト"
echo "Creating test file..."

# テストファイルを作成
echo "%PDF-1.4
Test PDF Content for MinIO Upload Test" > /tmp/test-receipt.pdf

# Pre-signed URLにファイルをアップロード
echo "Uploading file to MinIO..."
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @/tmp/test-receipt.pdf)

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
echo "Upload HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: Upload failed with status $HTTP_CODE"
  exit 1
fi

# 3. アップロード完了通知テスト
echo ""
echo "3. アップロード完了通知テスト"
echo "POST /api/v1/expenses/upload-complete"

COMPLETE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/expenses/upload-complete \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d "{
    \"s3_key\": \"$S3_KEY\",
    \"file_name\": \"test-receipt.pdf\",
    \"file_size\": 1024000,
    \"content_type\": \"application/pdf\"
  }")

echo "Response: $COMPLETE_RESPONSE"

RECEIPT_URL=$(echo $COMPLETE_RESPONSE | jq -r '.data.receipt_url // empty')

if [ -z "$RECEIPT_URL" ]; then
  echo "ERROR: Failed to complete upload"
  exit 1
fi

echo "Receipt URL: $RECEIPT_URL"

# 4. ファイルアクセステスト
echo ""
echo "4. ファイルアクセステスト"
echo "GET $RECEIPT_URL"

FILE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$RECEIPT_URL")
echo "File Access HTTP Status: $FILE_RESPONSE"

if [ "$FILE_RESPONSE" != "200" ]; then
  echo "WARNING: File not accessible via public URL (may require authentication)"
fi

# 5. MinIO内のファイル確認
echo ""
echo "5. MinIO内のファイル確認"
docker exec monstera-minio mc ls local/monstera-files/

echo ""
echo "=== MinIO統合テスト完了 ==="