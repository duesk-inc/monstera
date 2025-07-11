#!/bin/bash

# 提案機能統合テスト実行スクリプト

set -e

echo "========================================="
echo "提案情報確認機能 統合テスト"
echo "========================================="

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# プロジェクトルートディレクトリを取得
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# テスト結果を格納する変数
BACKEND_UNIT_RESULT=0
BACKEND_INTEGRATION_RESULT=0
FRONTEND_UNIT_RESULT=0
FRONTEND_E2E_RESULT=0

echo -e "\n${YELLOW}1. 環境準備${NC}"
echo "----------------------------------------"

# Docker環境が起動しているか確認
if ! docker-compose ps | grep -q "Up"; then
    echo "Docker環境を起動します..."
    docker-compose up -d
    sleep 10
fi

echo -e "${GREEN}✓ Docker環境が起動しています${NC}"

# データベースマイグレーション実行
echo -e "\n${YELLOW}2. データベースマイグレーション${NC}"
echo "----------------------------------------"
cd "$PROJECT_ROOT/backend"
docker-compose exec -T backend migrate -path migrations -database "mysql://root:password@tcp(mysql:3306)/monstera" up
echo -e "${GREEN}✓ マイグレーション完了${NC}"

# バックエンドテスト
echo -e "\n${YELLOW}3. バックエンドテスト${NC}"
echo "----------------------------------------"

# ユニットテスト
echo "ユニットテスト実行中..."
if go test ./internal/handler -v -run TestProposalHandler; then
    echo -e "${GREEN}✓ ハンドラーテスト成功${NC}"
else
    echo -e "${RED}✗ ハンドラーテスト失敗${NC}"
    BACKEND_UNIT_RESULT=1
fi

if go test ./internal/service -v -run TestProposalService; then
    echo -e "${GREEN}✓ サービステスト成功${NC}"
else
    echo -e "${RED}✗ サービステスト失敗${NC}"
    BACKEND_UNIT_RESULT=1
fi

if go test ./internal/repository -v -run TestEngineerProposal; then
    echo -e "${GREEN}✓ リポジトリテスト成功${NC}"
else
    echo -e "${RED}✗ リポジトリテスト失敗${NC}"
    BACKEND_UNIT_RESULT=1
fi

# 統合テスト
echo -e "\n統合テスト実行中..."
if go test ./test/integration -v -run TestProposalFlow; then
    echo -e "${GREEN}✓ 統合テスト成功${NC}"
else
    echo -e "${RED}✗ 統合テスト失敗${NC}"
    BACKEND_INTEGRATION_RESULT=1
fi

# フロントエンドテスト
echo -e "\n${YELLOW}4. フロントエンドテスト${NC}"
echo "----------------------------------------"
cd "$PROJECT_ROOT/frontend"

# 依存関係のインストール
echo "依存関係をインストール中..."
npm ci

# ユニットテスト
echo -e "\nユニットテスト実行中..."
if npm run test -- --testPathPattern="proposal" --passWithNoTests; then
    echo -e "${GREEN}✓ コンポーネントテスト成功${NC}"
else
    echo -e "${RED}✗ コンポーネントテスト失敗${NC}"
    FRONTEND_UNIT_RESULT=1
fi

# E2Eテスト準備
echo -e "\nE2Eテスト準備中..."
npx playwright install

# E2Eテスト実行
echo -e "\nE2Eテスト実行中..."
if npm run test:e2e -- proposal-flow.spec.ts --reporter=list; then
    echo -e "${GREEN}✓ E2Eテスト成功${NC}"
else
    echo -e "${RED}✗ E2Eテスト失敗${NC}"
    FRONTEND_E2E_RESULT=1
fi

# テスト結果サマリー
echo -e "\n${YELLOW}5. テスト結果サマリー${NC}"
echo "========================================="

if [ $BACKEND_UNIT_RESULT -eq 0 ]; then
    echo -e "バックエンドユニットテスト: ${GREEN}成功${NC}"
else
    echo -e "バックエンドユニットテスト: ${RED}失敗${NC}"
fi

if [ $BACKEND_INTEGRATION_RESULT -eq 0 ]; then
    echo -e "バックエンド統合テスト: ${GREEN}成功${NC}"
else
    echo -e "バックエンド統合テスト: ${RED}失敗${NC}"
fi

if [ $FRONTEND_UNIT_RESULT -eq 0 ]; then
    echo -e "フロントエンドユニットテスト: ${GREEN}成功${NC}"
else
    echo -e "フロントエンドユニットテスト: ${RED}失敗${NC}"
fi

if [ $FRONTEND_E2E_RESULT -eq 0 ]; then
    echo -e "フロントエンドE2Eテスト: ${GREEN}成功${NC}"
else
    echo -e "フロントエンドE2Eテスト: ${RED}失敗${NC}"
fi

# 全体の結果
TOTAL_RESULT=$((BACKEND_UNIT_RESULT + BACKEND_INTEGRATION_RESULT + FRONTEND_UNIT_RESULT + FRONTEND_E2E_RESULT))

echo "========================================="
if [ $TOTAL_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ 全てのテストが成功しました！${NC}"
    echo -e "\n提案情報確認機能は正常に動作しています。"
else
    echo -e "${RED}✗ 一部のテストが失敗しました${NC}"
    echo -e "\n失敗したテストを確認して修正してください。"
    exit 1
fi

# オプション: カバレッジレポート
echo -e "\n${YELLOW}6. カバレッジレポート（オプション）${NC}"
echo "----------------------------------------"
read -p "カバレッジレポートを生成しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$PROJECT_ROOT/backend"
    echo "バックエンドカバレッジ計測中..."
    go test ./... -coverprofile=coverage.out
    go tool cover -html=coverage.out -o coverage.html
    echo -e "${GREEN}✓ バックエンドカバレッジレポート: coverage.html${NC}"
    
    cd "$PROJECT_ROOT/frontend"
    echo "フロントエンドカバレッジ計測中..."
    npm run test -- --coverage --testPathPattern="proposal"
    echo -e "${GREEN}✓ フロントエンドカバレッジレポート: coverage/lcov-report/index.html${NC}"
fi

echo -e "\n${GREEN}テスト完了！${NC}"