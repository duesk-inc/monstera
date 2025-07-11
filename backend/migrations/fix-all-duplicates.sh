#!/bin/bash

# 残りの重複を解決
echo "残りの重複ファイルを修正します..."

# 200006の重複
if ls 200006_*.sql | grep -c . > /dev/null 2>&1; then
    count=$(ls 200006_*.sql | wc -l)
    if [ $count -gt 2 ]; then
        echo "200006の重複を修正..."
        mv 200006_create_notification_settings_table.up.sql 200054_create_notification_settings_table.up.sql 2>/dev/null
        mv 200006_create_notification_settings_table.down.sql 200054_create_notification_settings_table.down.sql 2>/dev/null
    fi
fi

# 200010の重複
if ls 200010_*.sql | grep -c . > /dev/null 2>&1; then
    count=$(ls 200010_*.sql | wc -l)
    if [ $count -gt 2 ]; then
        echo "200010の重複を修正..."
        files=($(ls 200010_*.sql | grep -v "refactor_weekly_reports"))
        if [ ${#files[@]} -ge 2 ]; then
            base=$(basename "${files[0]}" .up.sql | sed 's/200010_//')
            base=$(basename "$base" .down.sql)
            mv "200010_${base}.up.sql" "200055_${base}.up.sql" 2>/dev/null
            mv "200010_${base}.down.sql" "200055_${base}.down.sql" 2>/dev/null
        fi
    fi
fi

# その他の番号の重複も同様に処理
next_num=200056

for num in $(ls *.sql | cut -d'_' -f1 | sort | uniq -c | grep -v " 1 " | grep -v " 2 " | awk '{print $2}'); do
    echo "番号 $num の重複を確認..."
    files=($(ls ${num}_*.sql))
    
    # 3つ以上のファイルがある場合、2つを残して他を移動
    if [ ${#files[@]} -gt 2 ]; then
        # up/downのペアを保持し、余分なファイルを移動
        moved=0
        for file in "${files[@]}"; do
            if [ $moved -lt $((${#files[@]} - 2)) ]; then
                base=$(basename "$file" .up.sql | sed "s/^${num}_//")
                base=$(basename "$base" .down.sql)
                
                if [[ -f "${num}_${base}.up.sql" && -f "${num}_${base}.down.sql" && $moved -eq 0 ]]; then
                    # 最初のペアは保持
                    moved=$((moved + 2))
                else
                    # 残りは新しい番号に移動
                    if [[ "$file" =~ \.up\.sql$ ]]; then
                        mv "$file" "${next_num}_${base}.up.sql" 2>/dev/null && echo "  $file -> ${next_num}_${base}.up.sql"
                    else
                        mv "$file" "${next_num}_${base}.down.sql" 2>/dev/null && echo "  $file -> ${next_num}_${base}.down.sql"
                    fi
                fi
            fi
        done
        next_num=$((next_num + 1))
    fi
done

echo "重複の修正が完了しました"

# 最終確認
echo ""
echo "=== 最終確認 ==="
echo "残っている重複:"
ls *.sql | cut -d'_' -f1 | sort | uniq -c | grep -v " 1 " | grep -v " 2 " || echo "重複なし"