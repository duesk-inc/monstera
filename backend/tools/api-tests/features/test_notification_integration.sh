#!/bin/bash

# 通知機能統合テストスクリプト
# 提案ステータス更新・質問投稿時の通知機能をテスト

set -e

echo "=== 通知機能統合テスト開始 ==="

# API基本設定
API_BASE="http://localhost:8080/api/v1"
ENGINEER_TOKEN=""
SALES_TOKEN=""

# 色付きログ出力関数
log_info() { echo -e "\033[32m[INFO]\033[0m $1"; }
log_warn() { echo -e "\033[33m[WARN]\033[0m $1"; }
log_error() { echo -e "\033[31m[ERROR]\033[0m $1"; }

# JSONパース用関数
extract_json_value() {
    echo "$1" | grep -o "\"$2\":[^,}]*" | cut -d: -f2 | tr -d '"' | tr -d ' '
}

# 認証トークン取得
get_auth_token() {
    local email="$1"
    local password="$2"
    
    log_info "認証トークン取得: $email"
    
    local response=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\", \"password\":\"$password\"}")
    
    if [[ $response == *"token"* ]]; then
        local token=$(extract_json_value "$response" "token")
        echo "$token"
    else
        log_error "認証に失敗: $response"
        return 1
    fi
}

# エンジニア認証
test_engineer_auth() {
    log_info "=== エンジニア認証テスト ==="
    
    # テストユーザーのメールアドレス（実際の環境に合わせて変更）
    local engineer_email="engineer_test@duesk.co.jp"
    local engineer_password="password123"
    
    ENGINEER_TOKEN=$(get_auth_token "$engineer_email" "$engineer_password")
    
    if [[ -n "$ENGINEER_TOKEN" ]]; then
        log_info "エンジニア認証成功"
        return 0
    else
        log_error "エンジニア認証失敗"
        return 1
    fi
}

# 営業担当者認証
test_sales_auth() {
    log_info "=== 営業担当者認証テスト ==="
    
    local sales_email="sales@duesk.co.jp"
    local sales_password="password123"
    
    SALES_TOKEN=$(get_auth_token "$sales_email" "$sales_password")
    
    if [[ -n "$SALES_TOKEN" ]]; then
        log_info "営業担当者認証成功"
        return 0
    else
        log_error "営業担当者認証失敗"
        return 1
    fi
}

# 提案一覧取得
get_proposals() {
    local token="$1"
    
    log_info "提案一覧取得"
    
    local response=$(curl -s -X GET "$API_BASE/proposals" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    echo "$response"
}

# 通知一覧取得
get_notifications() {
    local token="$1"
    
    log_info "通知一覧取得"
    
    local response=$(curl -s -X GET "$API_BASE/notifications" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    echo "$response"
}

# 提案ステータス更新テスト
test_proposal_status_update() {
    log_info "=== 提案ステータス更新通知テスト ==="
    
    # 提案一覧取得
    local proposals=$(get_proposals "$ENGINEER_TOKEN")
    
    if [[ $proposals == *"items"* ]]; then
        # 最初の提案のIDを取得
        local proposal_id=$(echo "$proposals" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [[ -n "$proposal_id" ]]; then
            log_info "提案ID: $proposal_id でステータス更新テスト実行"
            
            # 更新前の通知数を取得
            local notifications_before=$(get_notifications "$SALES_TOKEN")
            local count_before=$(echo "$notifications_before" | grep -o '"total":[0-9]*' | cut -d: -f2)
            
            log_info "更新前通知数: $count_before"
            
            # 提案ステータスを「選考へ進む」に更新
            local update_response=$(curl -s -X PUT "$API_BASE/proposals/$proposal_id/status" \
                -H "Authorization: Bearer $ENGINEER_TOKEN" \
                -H "Content-Type: application/json" \
                -d '{"status":"proceed"}')
            
            if [[ $update_response == *"message"* ]] && [[ $update_response != *"error"* ]]; then
                log_info "ステータス更新成功"
                
                # 少し待機して通知が送信されるのを待つ
                sleep 2
                
                # 更新後の通知数を取得
                local notifications_after=$(get_notifications "$SALES_TOKEN")
                local count_after=$(echo "$notifications_after" | grep -o '"total":[0-9]*' | cut -d: -f2)
                
                log_info "更新後通知数: $count_after"
                
                if [[ $count_after -gt $count_before ]]; then
                    log_info "✅ 提案ステータス更新通知テスト成功 (通知数が増加)"
                    return 0
                else
                    log_warn "⚠️  通知数の増加を確認できませんでした"
                    echo "更新前: $count_before, 更新後: $count_after"
                    return 1
                fi
            else
                log_error "ステータス更新失敗: $update_response"
                return 1
            fi
        else
            log_error "提案IDを取得できませんでした"
            return 1
        fi
    else
        log_error "提案一覧の取得に失敗: $proposals"
        return 1
    fi
}

# 質問投稿通知テスト
test_question_posting() {
    log_info "=== 質問投稿通知テスト ==="
    
    # 提案一覧取得
    local proposals=$(get_proposals "$ENGINEER_TOKEN")
    
    if [[ $proposals == *"items"* ]]; then
        local proposal_id=$(echo "$proposals" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [[ -n "$proposal_id" ]]; then
            log_info "提案ID: $proposal_id で質問投稿テスト実行"
            
            # 更新前の通知数を取得
            local notifications_before=$(get_notifications "$SALES_TOKEN")
            local count_before=$(echo "$notifications_before" | grep -o '"total":[0-9]*' | cut -d: -f2)
            
            log_info "質問投稿前通知数: $count_before"
            
            # 質問投稿
            local question_text="これはテスト用の質問です。リモートワークの比率について詳しく教えてください。"
            local post_response=$(curl -s -X POST "$API_BASE/proposals/$proposal_id/questions" \
                -H "Authorization: Bearer $ENGINEER_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"questionText\":\"$question_text\"}")
            
            if [[ $post_response == *"id"* ]] && [[ $post_response != *"error"* ]]; then
                log_info "質問投稿成功"
                
                # 少し待機して通知が送信されるのを待つ
                sleep 2
                
                # 更新後の通知数を取得
                local notifications_after=$(get_notifications "$SALES_TOKEN")
                local count_after=$(echo "$notifications_after" | grep -o '"total":[0-9]*' | cut -d: -f2)
                
                log_info "質問投稿後通知数: $count_after"
                
                if [[ $count_after -gt $count_before ]]; then
                    log_info "✅ 質問投稿通知テスト成功 (通知数が増加)"
                    return 0
                else
                    log_warn "⚠️  通知数の増加を確認できませんでした"
                    echo "投稿前: $count_before, 投稿後: $count_after"
                    return 1
                fi
            else
                log_error "質問投稿失敗: $post_response"
                return 1
            fi
        else
            log_error "提案IDを取得できませんでした"
            return 1
        fi
    else
        log_error "提案一覧の取得に失敗: $proposals"
        return 1
    fi
}

# 通知内容詳細確認
test_notification_content() {
    log_info "=== 通知内容詳細確認 ==="
    
    local notifications=$(get_notifications "$SALES_TOKEN")
    
    if [[ $notifications == *"items"* ]]; then
        log_info "通知内容確認:"
        echo "$notifications" | grep -o '"title":"[^"]*"' | head -5
        echo "$notifications" | grep -o '"message":"[^"]*"' | head -5
        log_info "✅ 通知内容確認完了"
        return 0
    else
        log_error "通知一覧の取得に失敗: $notifications"
        return 1
    fi
}

# メイン実行
main() {
    log_info "通知機能統合テスト開始"
    
    # Docker環境の確認
    if ! curl -s "$API_BASE/health" > /dev/null 2>&1; then
        log_error "APIサーバーに接続できません。Docker環境が起動していることを確認してください。"
        log_info "docker-compose up -d を実行してから再試行してください。"
        exit 1
    fi
    
    local test_results=()
    
    # 認証テスト
    if test_engineer_auth; then
        test_results+=("engineer_auth:PASS")
    else
        test_results+=("engineer_auth:FAIL")
        log_error "エンジニア認証に失敗しました。"
        exit 1
    fi
    
    if test_sales_auth; then
        test_results+=("sales_auth:PASS")
    else
        test_results+=("sales_auth:FAIL")
        log_error "営業担当者認証に失敗しました。"
        exit 1
    fi
    
    # 通知機能テスト
    if test_proposal_status_update; then
        test_results+=("status_update_notification:PASS")
    else
        test_results+=("status_update_notification:FAIL")
    fi
    
    if test_question_posting; then
        test_results+=("question_posting_notification:PASS")
    else
        test_results+=("question_posting_notification:FAIL")
    fi
    
    if test_notification_content; then
        test_results+=("notification_content:PASS")
    else
        test_results+=("notification_content:FAIL")
    fi
    
    # 結果サマリー
    log_info "=== テスト結果サマリー ==="
    local pass_count=0
    local total_count=${#test_results[@]}
    
    for result in "${test_results[@]}"; do
        local test_name=$(echo "$result" | cut -d: -f1)
        local test_status=$(echo "$result" | cut -d: -f2)
        
        if [[ "$test_status" == "PASS" ]]; then
            log_info "✅ $test_name: PASS"
            ((pass_count++))
        else
            log_error "❌ $test_name: FAIL"
        fi
    done
    
    log_info "テスト結果: $pass_count/$total_count 成功"
    
    if [[ $pass_count -eq $total_count ]]; then
        log_info "🎉 全ての通知機能テストが成功しました！"
        return 0
    else
        log_warn "⚠️  一部のテストが失敗しました。"
        return 1
    fi
}

# 実行
main "$@"