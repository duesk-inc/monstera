#!/bin/bash

# 提案情報確認機能のマイグレーション実行スクリプト

set -e

echo "=========================================="
echo "提案情報確認機能 マイグレーション実行"
echo "=========================================="

# 環境変数の設定（必要に応じて変更してください）
DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_NAME="${DB_NAME:-monstera}"

# Dockerコンテナ内かローカルかを判定
if [ -f /.dockerenv ]; then
    echo "📦 Docker環境で実行中..."
    CONNECTION="mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}"
else
    echo "💻 ローカル環境で実行中..."
    CONNECTION="mysql://${DB_USER}:${DB_PASSWORD}@tcp(localhost:${DB_PORT})/${DB_NAME}"
fi

echo ""
echo "接続情報:"
echo "  Host: ${DB_HOST}"
echo "  Port: ${DB_PORT}"
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo ""

# migrate コマンドの存在確認
if ! command -v migrate &> /dev/null; then
    echo "❌ Error: 'migrate' コマンドが見つかりません"
    echo "インストール方法:"
    echo "  brew install golang-migrate"
    echo "  または"
    echo "  go install -tags 'mysql' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
    exit 1
fi

# 現在のマイグレーションバージョンを確認
echo "📍 現在のマイグレーションバージョンを確認中..."
CURRENT_VERSION=$(migrate -path migrations -database "${CONNECTION}" version 2>&1 || echo "0")
echo "現在のバージョン: ${CURRENT_VERSION}"

# 提案関連のマイグレーションが適用されているか確認
if [[ "$CURRENT_VERSION" =~ "200041" ]] || [[ "$CURRENT_VERSION" -gt 200041 ]]; then
    echo "✅ 提案情報関連のマイグレーションは既に適用されています"
else
    echo ""
    echo "📝 以下のマイグレーションを適用します:"
    echo "  - 200040_create_proposals_table"
    echo "  - 200041_create_proposal_questions_table"
    echo ""
    
    read -p "マイグレーションを実行しますか？ (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🚀 マイグレーション実行中..."
        
        if migrate -path migrations -database "${CONNECTION}" up; then
            echo "✅ マイグレーションが正常に完了しました"
        else
            echo "❌ マイグレーションの実行中にエラーが発生しました"
            exit 1
        fi
    else
        echo "⏹️  マイグレーションをキャンセルしました"
        exit 0
    fi
fi

# テーブルの存在確認
echo ""
echo "🔍 テーブルの存在を確認中..."

# MySQLコマンドでテーブルを確認
mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "
SELECT 
    TABLE_NAME,
    TABLE_COMMENT
FROM 
    INFORMATION_SCHEMA.TABLES
WHERE 
    TABLE_SCHEMA = '${DB_NAME}'
    AND TABLE_NAME IN ('proposals', 'proposal_questions')
ORDER BY 
    TABLE_NAME;
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ テーブルの確認が完了しました"
else
    echo "⚠️  テーブルの確認中にエラーが発生しました"
fi

# データ件数の確認
echo ""
echo "📊 データ件数を確認中..."

mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "
SELECT 
    'proposals' AS table_name,
    COUNT(*) AS total_count
FROM 
    proposals
UNION ALL
SELECT 
    'proposal_questions' AS table_name,
    COUNT(*) AS total_count
FROM 
    proposal_questions;
" 2>/dev/null

echo ""
echo "=========================================="
echo "✅ マイグレーション確認が完了しました"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. バックエンドサーバーを再起動してください"
echo "2. APIエンドポイントの動作を確認してください"
echo "3. フロントエンドから提案機能にアクセスしてテストしてください"