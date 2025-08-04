#!/bin/bash

# バッチユーザー作成スクリプト
# CSVファイルから複数ユーザーを一括作成

USER_POOL_ID="ap-northeast-1_B38FHxujm"
REGION="ap-northeast-1"

# 使い方を表示
if [ $# -eq 0 ]; then
    echo "使い方: $0 <users.csv>"
    echo ""
    echo "CSVファイル形式:"
    echo "email,password,first_name,last_name,phone_number"
    echo ""
    echo "例:"
    echo "user1@duesk.co.jp,Password123!,太郎,山田,090-1111-1111"
    echo "user2@duesk.co.jp,Password123!,花子,田中,090-2222-2222"
    exit 1
fi

CSV_FILE=$1

# CSVファイルの存在確認
if [ ! -f "$CSV_FILE" ]; then
    echo "エラー: ファイル '$CSV_FILE' が見つかりません"
    exit 1
fi

# 環境変数を読み込む
if [ -f .env.cognito ]; then
    export $(cat .env.cognito | grep -v '^#' | grep -v '^$' | xargs)
fi

echo "ユーザー一括作成を開始します..."
echo ""

# CSVファイルを読み込んで処理
while IFS=',' read -r email password first_name last_name phone_number; do
    # ヘッダー行をスキップ
    if [ "$email" = "email" ]; then
        continue
    fi
    
    echo "処理中: $email"
    
    # Cognitoにユーザーを作成
    aws cognito-idp admin-create-user \
        --user-pool-id $USER_POOL_ID \
        --username $email \
        --user-attributes \
            Name=email,Value=$email \
            Name=email_verified,Value=true \
            Name=name,Value="$first_name $last_name" \
            Name=phone_number,Value=$phone_number \
        --temporary-password "$password" \
        --message-action SUPPRESS \
        --region $REGION > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        # パスワードを永続化
        aws cognito-idp admin-set-user-password \
            --user-pool-id $USER_POOL_ID \
            --username $email \
            --password "$password" \
            --permanent \
            --region $REGION > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✅ $email: 作成成功"
        else
            echo "⚠️  $email: パスワード設定失敗"
        fi
    else
        echo "❌ $email: ユーザー作成失敗（既に存在する可能性があります）"
    fi
    
    echo ""
done < "$CSV_FILE"

echo "処理完了"
echo ""
echo "注意: データベースへの登録は、各ユーザーが初回ログイン時に自動的に行われます。"