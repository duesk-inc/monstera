#!/bin/bash

# ======================================================================
# Branch Protection Rules 適用スクリプト
# 
# 使用方法:
#   1. GitHub Personal Access Token (PAT) を取得
#      - Settings > Developer settings > Personal access tokens
#      - repo スコープを有効化
#   2. 環境変数を設定
#      export GITHUB_TOKEN="your_personal_access_token"
#      export GITHUB_OWNER="repository_owner"
#      export GITHUB_REPO="repository_name"
#   3. スクリプトを実行
#      ./apply-branch-protection.sh
#
# 注意事項:
#   - このスクリプトはGitHub APIを使用してブランチ保護ルールを設定します
#   - 既存の設定は上書きされます
# ======================================================================

set -euo pipefail

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 環境変数チェック
check_environment() {
    log_info "環境変数をチェックしています..."
    
    if [ -z "${GITHUB_TOKEN:-}" ]; then
        log_error "GITHUB_TOKEN が設定されていません"
        echo "export GITHUB_TOKEN='your_personal_access_token' を実行してください"
        exit 1
    fi
    
    if [ -z "${GITHUB_OWNER:-}" ]; then
        log_error "GITHUB_OWNER が設定されていません"
        echo "export GITHUB_OWNER='repository_owner' を実行してください"
        exit 1
    fi
    
    if [ -z "${GITHUB_REPO:-}" ]; then
        log_error "GITHUB_REPO が設定されていません"
        echo "export GITHUB_REPO='repository_name' を実行してください"
        exit 1
    fi
    
    log_success "環境変数チェック完了"
}

# ブランチ保護ルールを適用
apply_branch_protection() {
    local branch=$1
    local rules=$2
    
    log_info "ブランチ '$branch' に保護ルールを適用しています..."
    
    # GitHub API エンドポイント
    local api_url="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/branches/${branch}/protection"
    
    # APIリクエストを送信
    local response=$(curl -s -X PUT \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer ${GITHUB_TOKEN}" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "${api_url}" \
        -d "${rules}")
    
    # レスポンスをチェック
    if echo "${response}" | grep -q '"url"'; then
        log_success "ブランチ '$branch' の保護ルールを適用しました"
    else
        log_error "ブランチ '$branch' の保護ルール適用に失敗しました"
        echo "Response: ${response}"
        return 1
    fi
}

# mainブランチの保護ルールを設定
protect_main_branch() {
    local rules='{
        "required_status_checks": {
            "strict": true,
            "contexts": [
                "Backend Check",
                "Frontend Check",
                "Docker Build Check",
                "Integration Test",
                "Go Security Check",
                "NPM Security Check",
                "Secret Scanning",
                "Docker Image Security Scan (backend)",
                "Docker Image Security Scan (frontend)",
                "Migration Validation",
                "Migration Test",
                "Migration Performance"
            ]
        },
        "enforce_admins": true,
        "required_pull_request_reviews": {
            "dismissal_restrictions": {},
            "dismiss_stale_reviews": true,
            "require_code_owner_reviews": true,
            "required_approving_review_count": 2,
            "require_last_push_approval": true
        },
        "restrictions": null,
        "allow_force_pushes": false,
        "allow_deletions": false,
        "block_creations": false,
        "required_conversation_resolution": true,
        "lock_branch": false,
        "allow_fork_syncing": false
    }'
    
    apply_branch_protection "main" "${rules}"
}

# developブランチの保護ルールを設定
protect_develop_branch() {
    local rules='{
        "required_status_checks": {
            "strict": true,
            "contexts": [
                "Backend Check",
                "Frontend Check",
                "Docker Build Check",
                "Integration Test",
                "Go Security Check",
                "NPM Security Check",
                "Migration Validation",
                "Migration Test"
            ]
        },
        "enforce_admins": false,
        "required_pull_request_reviews": {
            "dismissal_restrictions": {},
            "dismiss_stale_reviews": true,
            "require_code_owner_reviews": false,
            "required_approving_review_count": 1,
            "require_last_push_approval": true
        },
        "restrictions": null,
        "allow_force_pushes": false,
        "allow_deletions": false,
        "block_creations": false,
        "required_conversation_resolution": true,
        "lock_branch": false,
        "allow_fork_syncing": false
    }'
    
    apply_branch_protection "develop" "${rules}"
}

# リポジトリ設定を更新
update_repository_settings() {
    log_info "リポジトリ設定を更新しています..."
    
    local api_url="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}"
    
    local settings='{
        "has_issues": true,
        "has_projects": true,
        "has_wiki": false,
        "allow_squash_merge": true,
        "allow_merge_commit": true,
        "allow_rebase_merge": true,
        "allow_auto_merge": true,
        "delete_branch_on_merge": true,
        "allow_update_branch": true,
        "use_squash_pr_title_as_default": false,
        "squash_merge_commit_title": "PR_TITLE",
        "squash_merge_commit_message": "COMMIT_MESSAGES",
        "merge_commit_title": "MERGE_MESSAGE",
        "merge_commit_message": "PR_TITLE"
    }'
    
    local response=$(curl -s -X PATCH \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer ${GITHUB_TOKEN}" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "${api_url}" \
        -d "${settings}")
    
    if echo "${response}" | grep -q '"full_name"'; then
        log_success "リポジトリ設定を更新しました"
    else
        log_warning "リポジトリ設定の更新に失敗した可能性があります"
        echo "Response: ${response}"
    fi
}

# 現在の保護ルールを表示
show_current_protection() {
    local branch=$1
    
    log_info "ブランチ '$branch' の現在の保護ルールを取得しています..."
    
    local api_url="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/branches/${branch}/protection"
    
    local response=$(curl -s -X GET \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer ${GITHUB_TOKEN}" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "${api_url}")
    
    echo "${response}" | jq '.' 2>/dev/null || echo "${response}"
}

# メイン処理
main() {
    echo "======================================"
    echo "Branch Protection Rules 適用スクリプト"
    echo "======================================"
    echo ""
    
    # 環境変数チェック
    check_environment
    
    echo ""
    echo "対象リポジトリ: ${GITHUB_OWNER}/${GITHUB_REPO}"
    echo ""
    
    # 確認プロンプト
    read -p "ブランチ保護ルールを適用しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "処理をキャンセルしました"
        exit 0
    fi
    
    echo ""
    
    # jqコマンドの存在確認
    if ! command -v jq &> /dev/null; then
        log_warning "jq コマンドが見つかりません。JSON整形ができません。"
    fi
    
    # mainブランチの保護
    if protect_main_branch; then
        log_success "mainブランチの保護設定完了"
    else
        log_error "mainブランチの保護設定失敗"
    fi
    
    echo ""
    
    # developブランチの保護
    if protect_develop_branch; then
        log_success "developブランチの保護設定完了"
    else
        log_error "developブランチの保護設定失敗"
    fi
    
    echo ""
    
    # リポジトリ設定の更新
    update_repository_settings
    
    echo ""
    log_success "すべての設定が完了しました"
    
    # 設定確認の提案
    echo ""
    echo "現在の保護ルールを確認するには、以下のコマンドを実行してください："
    echo "  ./apply-branch-protection.sh --show main"
    echo "  ./apply-branch-protection.sh --show develop"
}

# コマンドライン引数処理
if [ $# -eq 2 ] && [ "$1" = "--show" ]; then
    check_environment
    show_current_protection "$2"
else
    main
fi