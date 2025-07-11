#!/bin/bash

# 環境変数検証スクリプト
# freee関連の環境変数が正しく設定されているかチェックします

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 freee環境変数検証を開始します..."
echo ""

# .envファイルの存在確認
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .envファイルが見つかりません${NC}"
    exit 1
fi

# .envファイルを読み込み
source .env

# 検証結果を格納する配列
ERRORS=()
WARNINGS=()
SUCCESS=()

# 必須環境変数の検証
check_required_var() {
    local var_name=$1
    local var_value=$2
    local default_pattern=$3

    if [ -z "$var_value" ]; then
        ERRORS+=("$var_name が設定されていません")
    elif [ "$var_value" = "$default_pattern" ]; then
        WARNINGS+=("$var_name にデフォルト値が設定されています（本番環境では変更してください）")
    else
        SUCCESS+=("$var_name が設定されています")
    fi
}

# URL形式の検証
check_url_format() {
    local var_name=$1
    local var_value=$2
    
    if [[ $var_value =~ ^https?:// ]]; then
        SUCCESS+=("$var_name のURL形式が正しいです")
    else
        ERRORS+=("$var_name のURL形式が正しくありません: $var_value")
    fi
}

# 数値の検証
check_numeric() {
    local var_name=$1
    local var_value=$2
    local min_value=$3
    local max_value=$4
    
    if [[ $var_value =~ ^[0-9]+$ ]]; then
        if [ "$var_value" -ge "$min_value" ] && [ "$var_value" -le "$max_value" ]; then
            SUCCESS+=("$var_name の値が適切です ($var_value)")
        else
            WARNINGS+=("$var_name の値が推奨範囲外です: $var_value (推奨: $min_value-$max_value)")
        fi
    else
        ERRORS+=("$var_name が数値ではありません: $var_value")
    fi
}

echo "📋 必須環境変数の検証..."

# freee API認証情報
check_required_var "FREEE_CLIENT_ID" "$FREEE_CLIENT_ID" "your-freee-client-id"
check_required_var "FREEE_CLIENT_SECRET" "$FREEE_CLIENT_SECRET" "your-freee-client-secret"
check_required_var "FREEE_REDIRECT_URI" "$FREEE_REDIRECT_URI" ""

# freee API接続設定
check_required_var "FREEE_API_BASE_URL" "$FREEE_API_BASE_URL" ""
check_required_var "FREEE_OAUTH_BASE_URL" "$FREEE_OAUTH_BASE_URL" ""
check_required_var "FREEE_API_VERSION" "$FREEE_API_VERSION" ""
check_required_var "FREEE_SCOPE" "$FREEE_SCOPE" ""

# トークン暗号化設定
check_required_var "TOKEN_ENCRYPTION_KEY" "$TOKEN_ENCRYPTION_KEY" "change-this-32-character-key-for-production"
check_required_var "TOKEN_ENCRYPTION_ALGORITHM" "$TOKEN_ENCRYPTION_ALGORITHM" ""

echo ""
echo "🌐 URL形式の検証..."

# URL形式の検証
check_url_format "FREEE_API_BASE_URL" "$FREEE_API_BASE_URL"
check_url_format "FREEE_OAUTH_BASE_URL" "$FREEE_OAUTH_BASE_URL"
check_url_format "FREEE_REDIRECT_URI" "$FREEE_REDIRECT_URI"

echo ""
echo "🔢 数値設定の検証..."

# 数値設定の検証
check_numeric "FREEE_API_VERSION" "$FREEE_API_VERSION" 1 2
check_numeric "FREEE_RATE_LIMIT_REQUESTS" "$FREEE_RATE_LIMIT_REQUESTS" 100 1000
check_numeric "FREEE_RATE_LIMIT_WINDOW" "$FREEE_RATE_LIMIT_WINDOW" 3600 86400
check_numeric "FREEE_TIMEOUT_SECONDS" "$FREEE_TIMEOUT_SECONDS" 10 120
check_numeric "FREEE_MAX_RETRIES" "$FREEE_MAX_RETRIES" 1 10
check_numeric "FREEE_RETRY_DELAY_SECONDS" "$FREEE_RETRY_DELAY_SECONDS" 1 60

echo ""
echo "🔐 セキュリティ設定の検証..."

# トークン暗号化キーの長さチェック
if [ ${#TOKEN_ENCRYPTION_KEY} -ge 32 ]; then
    SUCCESS+=("TOKEN_ENCRYPTION_KEY の長さが適切です (${#TOKEN_ENCRYPTION_KEY}文字)")
else
    ERRORS+=("TOKEN_ENCRYPTION_KEY が短すぎます (${#TOKEN_ENCRYPTION_KEY}文字、32文字以上推奨)")
fi

# スコープの検証
if [[ "$FREEE_SCOPE" == *"read"* ]] && [[ "$FREEE_SCOPE" == *"write"* ]]; then
    SUCCESS+=("FREEE_SCOPE に read と write が含まれています")
elif [[ "$FREEE_SCOPE" == *"read"* ]]; then
    WARNINGS+=("FREEE_SCOPE に write が含まれていません（読み取り専用）")
else
    ERRORS+=("FREEE_SCOPE が正しく設定されていません: $FREEE_SCOPE")
fi

# HTTPS使用の推奨（本番環境）
if [ "$GO_ENV" = "production" ]; then
    if [[ "$FREEE_REDIRECT_URI" == https://* ]]; then
        SUCCESS+=("本番環境でHTTPSを使用しています")
    else
        ERRORS+=("本番環境ではHTTPSを使用してください: $FREEE_REDIRECT_URI")
    fi
fi

echo ""
echo "📊 検証結果:"
echo ""

# 成功メッセージ
if [ ${#SUCCESS[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ 成功 (${#SUCCESS[@]}件):${NC}"
    for success in "${SUCCESS[@]}"; do
        echo -e "   ${GREEN}✓${NC} $success"
    done
    echo ""
fi

# 警告メッセージ
if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  警告 (${#WARNINGS[@]}件):${NC}"
    for warning in "${WARNINGS[@]}"; do
        echo -e "   ${YELLOW}!${NC} $warning"
    done
    echo ""
fi

# エラーメッセージ
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo -e "${RED}❌ エラー (${#ERRORS[@]}件):${NC}"
    for error in "${ERRORS[@]}"; do
        echo -e "   ${RED}✗${NC} $error"
    done
    echo ""
    echo -e "${RED}環境変数設定を修正してください${NC}"
    exit 1
fi

if [ ${#WARNINGS[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 すべての検証が完了しました！${NC}"
else
    echo -e "${YELLOW}⚠️  警告がありますが、動作には問題ありません${NC}"
fi

echo ""
echo "📖 詳細情報: docs/freee-environment-variables.md を参照してください"