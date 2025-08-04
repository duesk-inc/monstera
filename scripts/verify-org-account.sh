#!/bin/bash

# 組織アカウントの認証情報確認スクリプト

echo "現在のAWS認証情報を確認中..."

# 環境変数を読み込む
if [ -f .env.cognito ]; then
    export $(cat .env.cognito | grep -v '^#' | grep -v '^$' | xargs)
fi

# アカウント情報を取得
ACCOUNT_INFO=$(aws sts get-caller-identity --output json 2>&1)

if [ $? -eq 0 ]; then
    ACCOUNT_ID=$(echo $ACCOUNT_INFO | jq -r '.Account')
    USER_ARN=$(echo $ACCOUNT_INFO | jq -r '.Arn')
    
    echo "✅ AWS認証情報が有効です"
    echo "アカウントID: $ACCOUNT_ID"
    echo "認証情報: $USER_ARN"
    
    if [ "$ACCOUNT_ID" == "307031016432" ]; then
        echo "✅ 組織アカウントの認証情報を使用しています"
        
        # Cognito User Poolの確認
        echo ""
        echo "Cognito User Poolを確認中..."
        POOL_INFO=$(aws cognito-idp describe-user-pool \
            --user-pool-id ap-northeast-1_B38FHxujm \
            --region ap-northeast-1 \
            --output json 2>&1)
            
        if [ $? -eq 0 ]; then
            POOL_NAME=$(echo $POOL_INFO | jq -r '.UserPool.Name')
            echo "✅ Cognito User Pool: $POOL_NAME"
        else
            echo "❌ Cognito User Poolにアクセスできません"
            echo "$POOL_INFO"
        fi
    else
        echo "⚠️  組織アカウント（307031016432）ではありません"
        echo "   現在のアカウント: $ACCOUNT_ID"
        echo "   組織アカウントの認証情報を取得してください"
    fi
else
    echo "❌ AWS認証情報が無効です"
    echo "$ACCOUNT_INFO"
    echo ""
    echo "IAM Identity Centerから新しい認証情報を取得してください："
    echo "1. https://d-90679dd0a1.awsapps.com/start にアクセス"
    echo "2. 組織アカウント（307031016432）を選択"
    echo "3. 'Command line or programmatic access' をクリック"
    echo "4. Option 2の認証情報をコピーして.env.cognitoを更新"
fi