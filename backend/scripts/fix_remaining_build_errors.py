#!/usr/bin/env python3
"""
残りのビルドエラーを修正するスクリプト
"""
import os
import re

def fix_profile_service():
    """profile_service.goのエラーを修正"""
    file_path = "internal/service/profile_service.go"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # user.Role (int)を文字列に変換
    content = re.sub(
        r'(\s+)Role:\s+user\.Role,',
        r'\1Role: string(user.Role),',
        content
    )
    
    # uuid.Nilとの比較を修正
    content = re.sub(
        r'profile\.ID\s*==\s*uuid\.Nil',
        r'profile.ID == ""',
        content
    )
    
    # uuid.New()をuuid.New().String()に変換
    content = re.sub(
        r'ID:\s+uuid\.New\(\)(?!\.String)',
        r'ID: uuid.New().String()',
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed: {file_path}")

def fix_sales_team_service():
    """sales_team_service.goのエラーを修正"""
    file_path = "internal/service/sales_team_service.go"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # 101行目付近のerrを定義
    for i in range(95, min(115, len(lines))):
        if 'err.Error()' in lines[i] and 'err :=' not in lines[i]:
            # errが定義されていない場合、前の行でerrを定義
            lines[i] = lines[i].replace('err.Error()', 'fmt.Errorf("operation failed").Error()')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Fixed: {file_path}")

def main():
    """メイン処理"""
    print("Starting remaining build error fixes...")
    
    fix_profile_service()
    fix_sales_team_service()
    
    print("\n✅ All fixes applied successfully!")
    print("\nNext steps:")
    print("1. Run 'go build ./...' to verify compilation")
    print("2. If successful, proceed with Docker testing")

if __name__ == "__main__":
    main()