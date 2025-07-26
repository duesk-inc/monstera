#\!/bin/bash

# MinIO直接アップロードテスト

echo "=== MinIO直接アップロードテスト ==="

# テストファイルを作成
echo "Creating test file..."
echo "%PDF-1.4
Test PDF Content for MinIO Direct Upload Test" > /tmp/test-direct.pdf

# MinIOに直接アップロード（mc CLIを使用）
echo ""
echo "Uploading file directly to MinIO..."
docker exec monstera-minio sh -c "echo '%PDF-1.4
Test PDF Content' > /tmp/test.pdf && mc cp /tmp/test.pdf local/monstera-files/test/direct-upload.pdf"

# アップロードしたファイルを確認
echo ""
echo "Checking uploaded file..."
docker exec monstera-minio mc ls local/monstera-files/test/

# HTTPでアクセス可能か確認
echo ""
echo "Testing HTTP access..."
curl -I http://localhost:9000/monstera-files/test/direct-upload.pdf

echo ""
echo "=== テスト完了 ==="
