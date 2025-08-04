#!/bin/bash

# Monstera開発環境用Cognitoセットアップスクリプト

set -e

echo "=== Monstera Cognito開発環境セットアップ ==="

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 前提条件チェック
check_prerequisites() {
    echo "前提条件をチェックしています..."
    
    # AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLIがインストールされていません${NC}"
        echo "インストール: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # AWS認証情報
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}AWS認証情報が設定されていません${NC}"
        echo "実行: aws configure"
        exit 1
    fi
    
    # Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.jsがインストールされていません${NC}"
        exit 1
    fi
    
    # AWS CDK
    if ! command -v cdk &> /dev/null; then
        echo -e "${YELLOW}AWS CDKがインストールされていません。インストールします...${NC}"
        npm install -g aws-cdk
    fi
    
    echo -e "${GREEN}✓ 前提条件チェック完了${NC}"
}

# CDKのブートストラップ
bootstrap_cdk() {
    echo "CDKブートストラップを確認しています..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION=${AWS_REGION:-ap-northeast-1}
    
    if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION &> /dev/null; then
        echo "CDKブートストラップを実行します..."
        cdk bootstrap aws://$ACCOUNT_ID/$REGION
    else
        echo -e "${GREEN}✓ CDKブートストラップ済み${NC}"
    fi
}

# 依存関係のインストール
install_dependencies() {
    echo "依存関係をインストールしています..."
    npm install
    echo -e "${GREEN}✓ 依存関係インストール完了${NC}"
}

# スタックのデプロイ
deploy_stack() {
    echo "Cognitoスタックをデプロイしています..."
    
    # デプロイ実行
    cdk deploy --require-approval never --outputs-file outputs.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ デプロイ完了${NC}"
        
        # 出力値の表示
        echo ""
        echo "=== デプロイ結果 ==="
        cat outputs.json | jq -r '.MonsteraCognitoDev | to_entries | .[] | "\(.key): \(.value)"'
        
        # 環境変数の生成
        generate_env_vars
    else
        echo -e "${RED}デプロイに失敗しました${NC}"
        exit 1
    fi
}

# 環境変数の生成
generate_env_vars() {
    echo ""
    echo "=== 環境変数設定 ==="
    
    USER_POOL_ID=$(cat outputs.json | jq -r '.MonsteraCognitoDev.UserPoolId')
    CLIENT_ID=$(cat outputs.json | jq -r '.MonsteraCognitoDev.AppClientId')
    
    # クライアントシークレットの取得
    CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client \
        --user-pool-id $USER_POOL_ID \
        --client-id $CLIENT_ID \
        --query 'UserPoolClient.ClientSecret' \
        --output text)
    
    # .env.developmentファイルの生成
    cat > ../../.env.development <<EOF
# AWS Cognito設定（開発環境）
COGNITO_ENABLED=true
# COGNITO_ENDPOINTは削除（AWS Cognitoを直接使用）
COGNITO_REGION=${AWS_REGION:-ap-northeast-1}
COGNITO_USER_POOL_ID=$USER_POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
COGNITO_CLIENT_SECRET=$CLIENT_SECRET

# AWS認証設定（開発者個別に設定）
# AWS_REGION=${AWS_REGION:-ap-northeast-1}
# AWS_ACCESS_KEY_ID=your_access_key_here
# AWS_SECRET_ACCESS_KEY=your_secret_key_here

# セキュリティ設定
COGNITO_TOKEN_EXPIRATION=3600  # 1時間
COGNITO_JWK_CACHE_DURATION=3600  # 1時間
EOF
    
    echo -e "${GREEN}✓ .env.developmentファイルを生成しました${NC}"
    echo ""
    echo "AWS認証情報は開発者個別に設定してください："
    echo "- AWS_ACCESS_KEY_ID"
    echo "- AWS_SECRET_ACCESS_KEY"
}

# テストユーザーの作成
create_test_users() {
    echo ""
    read -p "テストユーザーを作成しますか？ (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        USER_POOL_ID=$(cat outputs.json | jq -r '.MonsteraCognitoDev.UserPoolId')
        
        # 管理者ユーザー
        echo "管理者ユーザーを作成しています..."
        aws cognito-idp admin-create-user \
            --user-pool-id $USER_POOL_ID \
            --username admin@duesk.co.jp \
            --user-attributes \
                Name=email,Value=admin@duesk.co.jp \
                Name=given_name,Value=Admin \
                Name=family_name,Value=User \
                Name=custom:role,Value=2 \
                Name=custom:department_id,Value=dept-001 \
                Name=custom:employee_id,Value=emp-001 \
            --temporary-password TempPass123! \
            --message-action SUPPRESS
        
        aws cognito-idp admin-set-user-password \
            --user-pool-id $USER_POOL_ID \
            --username admin@duesk.co.jp \
            --password AdminPass123! \
            --permanent
        
        aws cognito-idp admin-add-user-to-group \
            --user-pool-id $USER_POOL_ID \
            --username admin@duesk.co.jp \
            --group-name admins
        
        echo -e "${GREEN}✓ 管理者ユーザー作成完了${NC}"
        echo "  Email: admin@duesk.co.jp"
        echo "  Password: AdminPass123!"
        
        # 一般ユーザー
        echo ""
        echo "一般ユーザーを作成しています..."
        aws cognito-idp admin-create-user \
            --user-pool-id $USER_POOL_ID \
            --username engineer_test@duesk.co.jp \
            --user-attributes \
                Name=email,Value=engineer_test@duesk.co.jp \
                Name=given_name,Value=Employee \
                Name=family_name,Value=User \
                Name=custom:role,Value=0 \
                Name=custom:department_id,Value=dept-002 \
                Name=custom:employee_id,Value=emp-002 \
            --temporary-password TempPass123! \
            --message-action SUPPRESS
        
        aws cognito-idp admin-set-user-password \
            --user-pool-id $USER_POOL_ID \
            --username engineer_test@duesk.co.jp \
            --password TestPass123! \
            --permanent
        
        aws cognito-idp admin-add-user-to-group \
            --user-pool-id $USER_POOL_ID \
            --username engineer_test@duesk.co.jp \
            --group-name users
        
        echo -e "${GREEN}✓ 一般ユーザー作成完了${NC}"
        echo "  Email: engineer_test@duesk.co.jp"
        echo "  Password: TestPass123!"
    fi
}

# メイン処理
main() {
    cd "$(dirname "$0")/.."
    
    check_prerequisites
    bootstrap_cdk
    install_dependencies
    deploy_stack
    create_test_users
    
    echo ""
    echo -e "${GREEN}=== セットアップ完了 ===${NC}"
    echo ""
    echo "次のステップ:"
    echo "1. .env.developmentファイルをプロジェクトルートの.envにコピー"
    echo "2. AWS認証情報を設定"
    echo "3. docker-compose downとdocker-compose up -dでサービス再起動"
    echo "4. 認証スキップモードが有効になっていることを確認"
}

# スクリプト実行
main