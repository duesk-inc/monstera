#!/usr/bin/env python3
"""
最終的な.String()エラーとUUID関連エラーを修正
"""
import os
import re

def fix_file(file_path):
    """指定されたファイルのエラーを修正"""
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # .String()の呼び出しを削除
    content = re.sub(r'\.String\(\)(?!\s*{)', '', content)
    
    # uuid.New()をuuid.New().String()に変換（ID:フィールドの場合）
    content = re.sub(
        r'(\s+ID:\s+)uuid\.New\(\)(?!\.String)',
        r'\1uuid.New().String()',
        content
    )
    
    # ポインタのマップインデックスエラーを修正
    content = re.sub(
        r'(\[)approverID(\])',
        r'\1*approverID\2',
        content
    )
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {file_path}")
        return True
    return False

def main():
    """メイン処理"""
    print("Starting final String() and UUID error fixes...")
    
    files_to_fix = [
        "internal/service/scheduler_service.go",
        "internal/service/skill_sheet_service.go",
    ]
    
    for file_path in files_to_fix:
        fix_file(file_path)
    
    print("\n✅ All fixes applied successfully!")
    print("\nNext steps:")
    print("1. Run 'go build ./...' to verify compilation")
    print("2. If successful, proceed with Docker testing")

if __name__ == "__main__":
    main()