#!/bin/bash

# MinIO統合テストスクリプト（認証付き）

echo "=== MinIO統合テスト（認証付き）開始 ==="

# テスト用ユーザー情報
TEST_EMAIL="engineer_test@duesk.co.jp"
TEST_PASSWORD="EmployeePass123!"

# 1. ユーザー登録（既存ユーザーなのでスキップ）
echo ""
echo "1. ユーザー登録（既存ユーザーなのでスキップ）"

# 2. ログイン
echo ""
echo "2. ログイン"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "Login Response: $LOGIN_RESPONSE"

# 3. Pre-signed URL生成テスト
echo ""
echo "3. Pre-signed URL生成テスト"
echo "POST /api/v1/expenses/upload-url"

RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/expenses/upload-url \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
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

# URLをDocker外部からアクセス可能なものに変換
UPLOAD_URL_EXTERNAL=$(echo $UPLOAD_URL | sed 's|http://minio:9000|http://localhost:9000|g')
echo "External Upload URL: $UPLOAD_URL_EXTERNAL"

# 4. ファイルアップロードテスト
echo ""
echo "4. ファイルアップロードテスト"
echo "Creating test file..."

# テストファイルを作成
echo "%PDF-1.4
Test PDF Content for MinIO Upload Test" > /tmp/test-receipt.pdf

# Pre-signed URLにファイルをアップロード
echo "Uploading file to MinIO..."
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$UPLOAD_URL_EXTERNAL" \
  -H "Content-Type: application/pdf" \
  --data-binary @/tmp/test-receipt.pdf)

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
echo "Upload HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: Upload failed with status $HTTP_CODE"
  echo "Response: $UPLOAD_RESPONSE"
  exit 1
fi

# 5. アップロード完了通知テスト
echo ""
echo "5. アップロード完了通知テスト"
echo "POST /api/v1/expenses/upload-complete"

COMPLETE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/expenses/upload-complete \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
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

# 6. MinIO内のファイル確認
echo ""
echo "6. MinIO内のファイル確認"
docker exec monstera-minio mc ls local/monstera-files/

# 7. クリーンアップ
rm -f /tmp/cookies.txt /tmp/test-receipt.pdf

echo ""
echo "=== MinIO統合テスト完了 ==="