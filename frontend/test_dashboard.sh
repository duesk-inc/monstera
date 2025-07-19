#!/bin/bash

echo "=== ダッシュボード表示テスト ==="

# まず開発者ツールのコンソールログを見るために、curlでダッシュボードアクセステスト
echo "1. ダッシュボードアクセス確認..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard)
echo "  ステータスコード: $response"

# フロントエンドのビルドログ確認
echo -e "\n2. フロントエンドコンテナのログ確認（エラーチェック）..."
docker logs monstera-frontend 2>&1 | grep -i "error" | tail -10

echo -e "\n3. バックエンドコンテナのログ確認（エラーチェック）..."
docker logs monstera-backend 2>&1 | grep -i "error" | tail -10

echo -e "\n=== テスト完了 ==="