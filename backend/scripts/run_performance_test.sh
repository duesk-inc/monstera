#!/bin/bash

# パフォーマンステスト実行スクリプト
# 使用方法: ./run_performance_test.sh

set -e

echo "======================================"
echo "職務経歴機能 パフォーマンステスト開始"
echo "======================================"

# Docker環境確認
if ! docker-compose ps | grep -q "mysql.*Up"; then
    echo "エラー: MySQLコンテナが起動していません"
    echo "docker-compose up -d を実行してください"
    exit 1
fi

# データベース接続設定
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="monstera"
DB_USER="root"
DB_PASS="password"

# MySQL接続テスト
echo "データベース接続テスト..."
if ! mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS -e "SELECT 1" > /dev/null 2>&1; then
    echo "エラー: データベースに接続できません"
    exit 1
fi
echo "✓ データベース接続成功"

# 1. テストデータ生成
echo ""
echo "1. テストデータ生成中..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < ./scripts/generate_test_data.sql
echo "✓ テストデータ生成完了"

# 2. パフォーマンステスト実行
echo ""
echo "2. パフォーマンステスト実行中..."
echo "----------------------------------------"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < ./scripts/performance_test.sql
echo "----------------------------------------"
echo "✓ パフォーマンステスト完了"

# 3. テストデータクリーンアップ
echo ""
echo "3. テストデータクリーンアップ中..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < ./scripts/cleanup_test_data.sql
echo "✓ クリーンアップ完了"

echo ""
echo "======================================"
echo "パフォーマンステスト完了"
echo "目標: 各クエリ 100ms以下"
echo "複合クエリ: 200ms以下"
echo "======================================"