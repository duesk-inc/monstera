#!/usr/bin/env python3
"""
最後の.String()エラーを一括修正するスクリプト
"""
import os
import re

def fix_string_method_calls(file_path):
    """String()メソッドの呼び出しを削除"""
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # ID.String()の呼び出しを削除
    original = content
    content = re.sub(r'\.ID\.String\(\)', '.ID', content)
    content = re.sub(r'(\w+)\.String\(\)(?!\s*{)', r'\1', content)
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {file_path}")
        return True
    return False

def fix_pointer_assignments(file_path):
    """ポインタの代入エラーを修正"""
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    # ApproverIDなどのポインタ代入を修正
    content = re.sub(
        r'(\w+)\s*:=\s*r\.ApproverID\b',
        r'\1 := *r.ApproverID',
        content
    )
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed pointer assignments: {file_path}")
        return True
    return False

def main():
    """メイン処理"""
    print("Starting final String() error fixes...")
    
    files_to_fix = [
        "internal/service/profile_service.go",
        "internal/service/leave_service.go",
    ]
    
    for file_path in files_to_fix:
        fix_string_method_calls(file_path)
        fix_pointer_assignments(file_path)
    
    print("\n✅ All fixes applied successfully!")
    print("\nNext steps:")
    print("1. Run 'go build ./...' to verify compilation")
    print("2. If successful, run Docker tests")

if __name__ == "__main__":
    main()