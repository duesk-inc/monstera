#!/bin/bash

echo "=== MinIO直接アクセステスト ==="

# 1. MinIOヘルスチェック
echo "1. MinIOヘルスチェック"
curl -s http://localhost:9000/minio/health/live
echo ""

# 2. バケット一覧
echo "2. バケット一覧"
docker exec monstera-minio mc ls local/

# 3. テストファイルアップロード
echo ""
echo "3. テストファイルアップロード"
echo "Test content" > /tmp/test.txt
docker cp /tmp/test.txt monstera-minio:/tmp/test.txt
docker exec monstera-minio mc cp /tmp/test.txt local/monstera-files/test.txt

# 4. アップロードしたファイルの確認
echo ""
echo "4. アップロードしたファイルの確認"
docker exec monstera-minio mc ls local/monstera-files/

# 5. ファイルの内容確認
echo ""
echo "5. ファイルの内容確認"
docker exec monstera-minio mc cat local/monstera-files/test.txt

echo ""
echo "=== テスト完了 ==="