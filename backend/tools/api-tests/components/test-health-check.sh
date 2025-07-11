#!/bin/bash

# ヘルスチェックエンドポイントのテストスクリプト

echo "=== PostgreSQL Health Check Test ==="
echo ""

# 色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PostgreSQLコンテナ起動確認
echo "1. PostgreSQL コンテナの状態確認..."
if docker-compose ps postgres | grep -q "healthy"; then
    echo -e "${GREEN}✓ PostgreSQL コンテナは正常に起動しています${NC}"
else
    echo -e "${RED}✗ PostgreSQL コンテナが起動していません${NC}"
    echo "docker-compose up -d postgres を実行してください"
    exit 1
fi

# バックエンドコンテナ起動確認
echo ""
echo "2. バックエンドコンテナの状態確認..."
if docker-compose ps backend | grep -q "Up"; then
    echo -e "${GREEN}✓ バックエンドコンテナは起動しています${NC}"
else
    echo -e "${YELLOW}! バックエンドコンテナが起動していません${NC}"
    echo "docker-compose up -d backend を実行中..."
    docker-compose up -d backend
    echo "10秒待機中..."
    sleep 10
fi

# ヘルスチェックエンドポイントのテスト
echo ""
echo "3. ヘルスチェックエンドポイント /health のテスト..."
HEALTH_RESPONSE=$(curl -s -X GET http://localhost:8080/health)
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓ ヘルスチェック成功${NC}"
    echo "レスポンス:"
    echo $HEALTH_RESPONSE | jq '.' 2>/dev/null || echo $HEALTH_RESPONSE
    
    # データベース接続状態の確認
    DB_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.checks.database.status' 2>/dev/null)
    if [ "$DB_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✓ PostgreSQL接続: 正常${NC}"
    else
        echo -e "${RED}✗ PostgreSQL接続: 異常${NC}"
        DB_ERROR=$(echo $HEALTH_RESPONSE | jq -r '.checks.database.error' 2>/dev/null)
        echo "エラー: $DB_ERROR"
    fi
else
    echo -e "${RED}✗ ヘルスチェック失敗${NC}"
    echo "レスポンス:"
    echo $HEALTH_RESPONSE | jq '.' 2>/dev/null || echo $HEALTH_RESPONSE
fi

# 準備状態チェックエンドポイントのテスト
echo ""
echo "4. 準備状態チェックエンドポイント /ready のテスト..."
READY_RESPONSE=$(curl -s -X GET http://localhost:8080/ready)
IS_READY=$(echo $READY_RESPONSE | jq -r '.ready' 2>/dev/null)

if [ "$IS_READY" = "true" ]; then
    echo -e "${GREEN}✓ アプリケーションは準備完了${NC}"
else
    echo -e "${RED}✗ アプリケーションは準備未完了${NC}"
fi
echo "レスポンス:"
echo $READY_RESPONSE | jq '.' 2>/dev/null || echo $READY_RESPONSE

# データベース直接接続テスト
echo ""
echo "5. PostgreSQL直接接続テスト..."
if docker exec monstera-postgres psql -U postgres -d monstera -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL直接接続: 成功${NC}"
    
    # テーブル数の確認
    TABLE_COUNT=$(docker exec monstera-postgres psql -U postgres -d monstera -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    echo "  - テーブル数: $TABLE_COUNT"
else
    echo -e "${RED}✗ PostgreSQL直接接続: 失敗${NC}"
fi

echo ""
echo "=== テスト完了 ==="