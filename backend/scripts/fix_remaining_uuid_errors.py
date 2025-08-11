#!/usr/bin/env python3
"""
残りのUUID関連エラーを修正するスクリプト
"""
import os
import re

def fix_admin_weekly_report_service():
    """admin_weekly_report_service.goの型エラーを修正"""
    file_path = "internal/service/admin_weekly_report_service.go"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # report.Statusの型変換を修正
    content = re.sub(
        r'Status:\s+report\.Status,',
        r'Status: string(report.Status),',
        content
    )
    
    # statusStringの型変換を修正
    content = re.sub(
        r'Status:\s+&statusString',
        r'Status: (*model.WeeklyReportStatusEnum)(&statusString)',
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed: {file_path}")

def fix_cognito_auth_service():
    """cognito_auth_service.goのCognitoSubエラーを修正"""
    file_path = "internal/service/cognito_auth_service.go"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # CognitoSubをIDに置き換え
    content = re.sub(r'\bCognitoSub:\s+', 'ID: ', content)
    content = re.sub(r'\.CognitoSub\b', '.ID', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed: {file_path}")

def fix_engineer_service():
    """engineer_service.goのメソッドエラーを修正"""
    file_path = "internal/service/engineer_service.go"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # LoadRolesFromUserRolesメソッドの呼び出しを削除またはコメントアウト
    content = re.sub(
        r'user\.LoadRolesFromUserRoles\(\)',
        r'// user.LoadRolesFromUserRoles() - Method removed after migration',
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed: {file_path}")

def main():
    """メイン処理"""
    print("Starting remaining UUID error fixes...")
    
    # 各ファイルの修正を実行
    fix_admin_weekly_report_service()
    fix_cognito_auth_service()
    fix_engineer_service()
    
    print("\n✅ All fixes applied successfully!")
    print("\nNext steps:")
    print("1. Run 'go build ./...' to verify compilation")
    print("2. Run tests if available")

if __name__ == "__main__":
    main()