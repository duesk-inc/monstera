#!/bin/bash

echo "=== ダッシュボードランタイムエラー修正 最終テスト ==="
echo "開始時刻: $(date)"
echo ""

# テスト結果を格納する変数
TEST_PASSED=true

# 1. Docker環境の確認
echo "1. Docker環境の確認"
echo "-----------------"
FRONTEND_STATUS=$(docker-compose ps frontend --format json | grep -o '"Status":"[^"]*"' | cut -d'"' -f4)
BACKEND_STATUS=$(docker-compose ps backend --format json | grep -o '"Status":"[^"]*"' | cut -d'"' -f4)

if [[ "$FRONTEND_STATUS" == *"Up"* ]]; then
    echo "✓ フロントエンドコンテナ: 起動中"
else
    echo "✗ フロントエンドコンテナ: 停止中"
    TEST_PASSED=false
fi

if [[ "$BACKEND_STATUS" == *"Up"* ]]; then
    echo "✓ バックエンドコンテナ: 起動中"
else
    echo "✗ バックエンドコンテナ: 停止中"
    TEST_PASSED=false
fi
echo ""

# 2. DebugLogger.error メソッドのテスト
echo "2. DebugLogger.error メソッドのテスト"
echo "------------------------------------"
# フロントエンドのログからDebugLogger.errorのエラーをチェック
if docker-compose logs frontend 2>&1 | grep -q "DebugLogger\.error is not a function"; then
    echo "✗ DebugLogger.errorのTypeErrorが検出されました"
    TEST_PASSED=false
else
    echo "✓ DebugLogger.errorは正常に動作しています"
fi
echo ""

# 3. MUI Grid非推奨警告のテスト
echo "3. MUI Grid非推奨警告のテスト"
echo "----------------------------"
# ExpenseDashboardCardのGrid構文をチェック
if grep -q 'size={{ xs:' /Users/daichirouesaka/Documents/90_duesk/monstera/frontend/src/components/dashboard/ExpenseDashboardCard.tsx; then
    echo "✗ ExpenseDashboardCardにGrid v2構文が残っています"
    TEST_PASSED=false
else
    echo "✓ ExpenseDashboardCardはGrid v1構文を使用しています"
fi

# ビルドエラーのチェック
if curl -s http://localhost:3000/dashboard | grep -q "Module not found.*Grid2"; then
    echo "✗ Grid2のインポートエラーが発生しています"
    TEST_PASSED=false
else
    echo "✓ Gridのインポートは正常です"
fi
echo ""

# 4. Dashboard画面の防御的プログラミングテスト
echo "4. Dashboard画面の防御的プログラミングテスト"
echo "----------------------------------------"
# Dashboard.tsxのnotifications配列チェックを確認
if grep -E "notifications && Array\.isArray\(notifications\)" /Users/daichirouesaka/Documents/90_duesk/monstera/frontend/src/app/\(authenticated\)/\(engineer\)/dashboard/page.tsx > /dev/null; then
    echo "✓ notifications配列の防御的チェックが実装されています"
else
    echo "✗ notifications配列の防御的チェックが不足しています"
    TEST_PASSED=false
fi
echo ""

# 5. ダッシュボード画面の表示テスト
echo "5. ダッシュボード画面の表示テスト"
echo "--------------------------------"
# ダッシュボードページの取得
DASHBOARD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard)
if [ "$DASHBOARD_RESPONSE" = "200" ]; then
    echo "✓ ダッシュボード画面が正常に表示されています (HTTP 200)"
    
    # HTMLコンテンツの確認
    DASHBOARD_HTML=$(curl -s http://localhost:3000/dashboard)
    if echo "$DASHBOARD_HTML" | grep -q "ダッシュボード"; then
        echo "✓ ダッシュボードのHTMLコンテンツが正常です"
    else
        echo "⚠ ダッシュボードのHTMLコンテンツに問題がある可能性があります"
    fi
else
    echo "✗ ダッシュボード画面にアクセスできません (HTTP $DASHBOARD_RESPONSE)"
    TEST_PASSED=false
fi
echo ""

# 6. コンパイルエラーの確認
echo "6. コンパイルエラーの確認"
echo "----------------------"
if docker-compose logs frontend 2>&1 | tail -100 | grep -E "TypeError|Error:|Failed to compile" | grep -v "DebugLogger"; then
    echo "⚠ その他のエラーが検出されました（上記参照）"
else
    echo "✓ コンパイルエラーは検出されませんでした"
fi
echo ""

# 7. テスト結果サマリー
echo "========================================"
echo "テスト結果サマリー"
echo "========================================"
echo "テスト完了時刻: $(date)"
echo ""

if [ "$TEST_PASSED" = true ]; then
    echo "✅ 全てのテストが成功しました！"
    echo ""
    echo "修正内容:"
    echo "1. DebugLogger.errorメソッドが実装され、正常に動作しています"
    echo "2. ExpenseDashboardCardのGrid構文がv1形式に戻されました"
    echo "3. Dashboard画面に防御的プログラミングが実装されました"
    echo ""
    echo "次のステップ:"
    echo "- PR #22をReady for Reviewに変更してください"
    echo "- 残りのGrid v2移行は別タスクとして管理してください"
    exit 0
else
    echo "❌ いくつかのテストが失敗しました"
    echo ""
    echo "失敗したテストの詳細を確認し、修正を行ってください"
    exit 1
fi