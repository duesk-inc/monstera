#!/bin/bash

# ログインAPIテスト
echo "=== ログインAPIテスト開始 ==="

# テスト用ユーザーでログイン
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }')

echo "レスポンス: $response"

# ステータスコード確認
status_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }')

echo "ステータスコード: $status_code"

if [ "$status_code" -eq 200 ]; then
  echo "✅ ログインAPIテスト成功"
else
  echo "❌ ログインAPIテスト失敗"
fi