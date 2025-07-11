#!/bin/bash

# 重複したマイグレーションファイルを修正するスクリプト

cd "$(dirname "$0")/../migrations" || exit 1

echo "=== マイグレーションファイルの重複確認と修正 ==="
echo ""

# 重複ファイルのリストを作成
declare -A duplicates
declare -A new_numbers

# 次に使用可能な番号を見つける関数
find_next_available() {
    local prefix=$1
    local start=$2
    local num=$start
    while ls ${prefix}${num}_*.sql 2>/dev/null | grep -q .; do
        num=$((num + 1))
    done
    echo $num
}

# 重複ファイルを検出
echo "重複ファイルを検出中..."
for file in *.sql; do
    num=$(echo "$file" | cut -d'_' -f1)
    base=$(echo "$file" | sed 's/\.up\.sql$//;s/\.down\.sql$//')
    
    if [[ -n "${duplicates[$num]}" ]]; then
        echo "重複発見: $num - $file と ${duplicates[$num]}"
        
        # 新しい番号を割り当て
        if [[ "$num" =~ ^0000 ]]; then
            # 0000xx系は200100番台に移動
            new_num=$(find_next_available "200100" 1)
            new_num="200100$new_num"
        elif [[ "$num" =~ ^10 ]]; then
            # 100xxx系は300000番台に移動
            new_num=$(find_next_available "300" 000)
        else
            # その他は400000番台に移動
            new_num=$(find_next_available "400" 000)
        fi
        
        # ファイル名の変更
        new_name=$(echo "$file" | sed "s/^$num/$new_num/")
        echo "  -> $file を $new_name に変更予定"
        new_numbers["$file"]="$new_name"
    else
        duplicates[$num]="$file"
    fi
done

echo ""
echo "=== 変更予定のファイル ==="
for old in "${!new_numbers[@]}"; do
    echo "$old -> ${new_numbers[$old]}"
done

echo ""
read -p "変更を実行しますか？ (y/N): " confirm

if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    echo ""
    echo "ファイル名を変更中..."
    for old in "${!new_numbers[@]}"; do
        new="${new_numbers[$old]}"
        mv "$old" "$new"
        echo "✓ $old -> $new"
        
        # ペアファイル（.up.sql と .down.sql）も同時に変更
        if [[ "$old" =~ \.up\.sql$ ]]; then
            old_down="${old%.up.sql}.down.sql"
            new_down="${new%.up.sql}.down.sql"
            if [[ -f "$old_down" ]]; then
                mv "$old_down" "$new_down"
                echo "✓ $old_down -> $new_down"
            fi
        elif [[ "$old" =~ \.down\.sql$ ]]; then
            old_up="${old%.down.sql}.up.sql"
            new_up="${new%.down.sql}.up.sql"
            if [[ -f "$old_up" && ! -f "$new_up" ]]; then
                mv "$old_up" "$new_up"
                echo "✓ $old_up -> $new_up"
            fi
        fi
    done
    echo ""
    echo "✅ ファイル名の変更が完了しました"
else
    echo "変更をキャンセルしました"
fi

echo ""
echo "=== 現在のマイグレーションファイル統計 ==="
echo "総ファイル数: $(ls *.sql 2>/dev/null | wc -l)"
echo "upファイル数: $(ls *.up.sql 2>/dev/null | wc -l)"
echo "downファイル数: $(ls *.down.sql 2>/dev/null | wc -l)"