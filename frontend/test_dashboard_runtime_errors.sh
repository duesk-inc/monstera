#!/bin/bash

echo "=== ダッシュボードランタイムエラー修正テスト ==="
echo "開始時刻: $(date)"
echo ""

# 1. フロントエンドサービスのヘルスチェック
echo "1. フロントエンドサービスのヘルスチェック"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$response" = "200" ]; then
    echo "✓ フロントエンドサービスが正常に起動しています"
else
    echo "✗ フロントエンドサービスにアクセスできません (HTTP: $response)"
    exit 1
fi
echo ""

# 2. バックエンドAPIのヘルスチェック
echo "2. バックエンドAPIのヘルスチェック"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
if [ "$response" = "200" ]; then
    echo "✓ バックエンドAPIが正常に起動しています"
else
    echo "✗ バックエンドAPIにアクセスできません (HTTP: $response)"
    exit 1
fi
echo ""

# 3. ログイン画面の確認
echo "3. ログイン画面の確認"
login_html=$(curl -s http://localhost:3000/login)
if echo "$login_html" | grep -q "ログイン"; then
    echo "✓ ログイン画面が表示されています"
else
    echo "✗ ログイン画面が正しく表示されていません"
    exit 1
fi
echo ""

# 4. ブラウザコンソールエラーの確認（スクリプトによる擬似チェック）
echo "4. JavaScriptエラーチェック（ビルドエラーの確認）"
# Next.jsのビルドエラーチェック
if docker-compose logs frontend | grep -E "TypeError.*DebugLogger\.error is not a function" > /dev/null 2>&1; then
    echo "✗ DebugLogger.errorのTypeErrorが検出されました"
    exit 1
else
    echo "✓ DebugLogger.errorのエラーは検出されませんでした"
fi

if docker-compose logs frontend | grep -E "Warning.*MUI.*Grid.*deprecated" > /dev/null 2>&1; then
    echo "⚠ MUI Grid非推奨警告が検出されました（警告のみ）"
else
    echo "✓ MUI Grid警告は検出されませんでした"
fi
echo ""

# 5. Cognitoテストユーザーでのログイン
echo "5. Cognitoテストユーザーでのログイン"
# テスト用のCognitoユーザー情報を使用
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Test1234!"

# ログインAPIエンドポイントのテスト
login_response=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$login_response" | grep -q "token"; then
    echo "✓ ログインAPIが正常に動作しています"
    # トークンを抽出
    token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo "✗ ログインAPIでエラーが発生しました"
    echo "レスポンス: $login_response"
    exit 1
fi
echo ""

# 6. ダッシュボードAPIの確認（通知データ）
echo "6. ダッシュボードAPIの確認"
if [ ! -z "$token" ]; then
    notifications_response=$(curl -s -X GET http://localhost:8080/api/v1/notifications \
      -H "Authorization: Bearer $token")
    
    if echo "$notifications_response" | grep -q "notifications"; then
        echo "✓ 通知APIが正常に動作しています"
    else
        echo "✗ 通知APIでエラーが発生しました"
        echo "レスポンス: $notifications_response"
    fi
fi
echo ""

# 7. 経費申請集計APIの確認
echo "7. 経費申請集計APIの確認"
if [ ! -z "$token" ]; then
    expense_summary_response=$(curl -s -X GET http://localhost:8080/api/v1/expenses/summary \
      -H "Authorization: Bearer $token")
    
    if echo "$expense_summary_response" | grep -q -E "monthly|yearly"; then
        echo "✓ 経費申請集計APIが正常に動作しています"
    else
        echo "✗ 経費申請集計APIでエラーが発生しました"
        echo "レスポンス: $expense_summary_response"
    fi
fi
echo ""

echo "=== テスト結果サマリー ==="
echo "テスト完了時刻: $(date)"
echo ""

# フロントエンドのコンテナログから最新のエラーを確認
echo "=== フロントエンドコンテナの最新ログ（エラーチェック） ==="
docker-compose logs --tail=50 frontend | grep -E "error|Error|ERROR" | tail -10 || echo "エラーログなし"
echo ""

echo "=== テスト完了 ==="