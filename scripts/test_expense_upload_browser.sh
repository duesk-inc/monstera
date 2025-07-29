#!/bin/bash

# ブラウザ経由での経費申請ファイルアップロードテスト

echo "=== 経費申請ファイルアップロードのブラウザテスト ==="

# フロントエンドが起動しているか確認
echo ""
echo "1. フロントエンド起動確認"
curl -s -I http://localhost:3000 | head -n 1

# ログインページにアクセス可能か確認
echo ""
echo "2. ログインページ確認"
curl -s http://localhost:3000/login | grep -o "<title>.*</title>" | head -1

# 実際のアップロードテストの手順を表示
echo ""
echo "=== ブラウザでの手動テスト手順 ==="
echo "1. ブラウザで http://localhost:3000 を開く"
echo "2. 以下の認証情報でログイン:"
echo "   Email: engineer_test@duesk.co.jp"
echo "   Password: EmployeePass123!"
echo "3. 左側のメニューから '経費申請' をクリック"
echo "4. '新規作成' ボタンをクリック"
echo "5. フォームに以下を入力:"
echo "   - 日付: 今日の日付"
echo "   - カテゴリ: 交通費"
echo "   - 金額: 1000"
echo "   - 詳細: テストアップロード"
echo "6. 領収書アップロード欄でファイルを選択"
echo "7. ブラウザの開発者ツール（F12）でネットワークタブを開き、エラー詳細を確認"

echo ""
echo "=== 現在のMinIO状態 ==="
docker exec monstera-minio mc ls local/

echo ""
echo "=== バックエンドログ監視 ==="
echo "別のターミナルで以下のコマンドを実行してログを監視してください:"
echo "docker-compose logs -f backend | grep -E 'expense|upload|422|error'"