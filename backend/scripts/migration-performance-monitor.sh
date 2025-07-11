#!/bin/bash

# migration-performance-monitor.sh
# 移行性能リアルタイム監視

set -euo pipefail

MONITOR_DURATION=${1:-3600}  # デフォルト1時間監視
INTERVAL=${2:-30}            # 30秒間隔

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# 設定
TARGET_DB_HOST="${POSTGRES_HOST:-localhost}"
TARGET_DB_PORT="${POSTGRES_PORT:-5432}"
TARGET_DB_NAME="${POSTGRES_DATABASE:-monstera}"
TARGET_DB_USER="${POSTGRES_USER:-postgres}"
TARGET_DB_PASS="${POSTGRES_PASSWORD}"

echo "================================================"
echo -e "${BLUE}PostgreSQL移行性能監視開始${NC}"
echo "================================================"
echo "監視時間: ${MONITOR_DURATION}秒, 間隔: ${INTERVAL}秒"
echo "対象: ${TARGET_DB_HOST}:${TARGET_DB_PORT}/${TARGET_DB_NAME}"
echo "================================================"

START_TIME=$(date +%s)
END_TIME=$((START_TIME + MONITOR_DURATION))

# ログファイル作成
LOG_DIR="./migration-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
PERFORMANCE_LOG="$LOG_DIR/performance_${TIMESTAMP}.log"
CSV_LOG="$LOG_DIR/performance_${TIMESTAMP}.csv"

# CSVヘッダー作成
echo "timestamp,active_connections,db_size_mb,active_queries,checkpoints,cpu_percent,memory_mb,disk_usage_percent,locks_count,temp_files,cache_hit_ratio" > "$CSV_LOG"

echo "性能ログ: $PERFORMANCE_LOG"
echo "CSV ログ: $CSV_LOG"
echo ""

# 初期状態記録
echo "初期状態チェック..." | tee -a "$PERFORMANCE_LOG"

INITIAL_DB_SIZE=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
    "SELECT round(pg_database_size('$TARGET_DB_NAME')/1024/1024, 2);" 2>/dev/null | xargs || echo "0")

echo "初期データベースサイズ: ${INITIAL_DB_SIZE} MB" | tee -a "$PERFORMANCE_LOG"
echo ""

# 監視ループ
COUNTER=0
while [ $(date +%s) -lt $END_TIME ]; do
    CURRENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    CURRENT_TIMESTAMP=$(date +%s)
    ELAPSED_TIME=$((CURRENT_TIMESTAMP - START_TIME))
    
    echo "[$CURRENT_TIME] 性能監視レポート ($((ELAPSED_TIME / 60))分経過)" | tee -a "$PERFORMANCE_LOG"
    echo "============================================" | tee -a "$PERFORMANCE_LOG"
    
    # PostgreSQL統計情報取得
    if PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
       -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        
        # 1. 接続数
        CONNECTIONS=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs || echo "0")
        
        # 2. データベースサイズ
        DB_SIZE_MB=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT round(pg_database_size('$TARGET_DB_NAME')/1024/1024, 2);" 2>/dev/null | xargs || echo "0")
        
        # 3. 実行中クエリ
        ACTIVE_QUERIES=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%';" 2>/dev/null | xargs || echo "0")
        
        # 4. チェックポイント統計
        CHECKPOINTS=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT checkpoints_timed + checkpoints_req FROM pg_stat_bgwriter;" 2>/dev/null | xargs || echo "0")
        
        # 5. ロック数
        LOCKS_COUNT=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT count(*) FROM pg_locks;" 2>/dev/null | xargs || echo "0")
        
        # 6. 一時ファイル
        TEMP_FILES=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT coalesce(sum(temp_files), 0) FROM pg_stat_database WHERE datname = '$TARGET_DB_NAME';" 2>/dev/null | xargs || echo "0")
        
        # 7. キャッシュヒット率
        CACHE_HIT_RATIO=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT round(100.0 * blks_hit / (blks_hit + blks_read), 2) 
             FROM pg_stat_database WHERE datname = '$TARGET_DB_NAME';" 2>/dev/null | xargs || echo "0")
        
        # PostgreSQL統計表示
        echo "  PostgreSQL統計:" | tee -a "$PERFORMANCE_LOG"
        echo "    アクティブ接続数: $CONNECTIONS" | tee -a "$PERFORMANCE_LOG"
        echo "    データベースサイズ: ${DB_SIZE_MB} MB (増加: +$((${DB_SIZE_MB%.*} - ${INITIAL_DB_SIZE%.*})) MB)" | tee -a "$PERFORMANCE_LOG"
        echo "    実行中クエリ数: $ACTIVE_QUERIES" | tee -a "$PERFORMANCE_LOG"
        echo "    チェックポイント総数: $CHECKPOINTS" | tee -a "$PERFORMANCE_LOG"
        echo "    ロック数: $LOCKS_COUNT" | tee -a "$PERFORMANCE_LOG"
        echo "    一時ファイル数: $TEMP_FILES" | tee -a "$PERFORMANCE_LOG"
        echo "    キャッシュヒット率: ${CACHE_HIT_RATIO}%" | tee -a "$PERFORMANCE_LOG"
        
        # 閾値チェック
        if [ "$CONNECTIONS" -gt 150 ]; then
            echo -e "    ${RED}⚠️  接続数が高い: $CONNECTIONS${NC}" | tee -a "$PERFORMANCE_LOG"
        fi
        
        if [ "$ACTIVE_QUERIES" -gt 20 ]; then
            echo -e "    ${RED}⚠️  実行中クエリが多い: $ACTIVE_QUERIES${NC}" | tee -a "$PERFORMANCE_LOG"
        fi
        
        if [ "$LOCKS_COUNT" -gt 100 ]; then
            echo -e "    ${YELLOW}⚠️  ロック数が多い: $LOCKS_COUNT${NC}" | tee -a "$PERFORMANCE_LOG"
        fi
        
        # キャッシュヒット率チェック
        if [ "${CACHE_HIT_RATIO%.*}" -lt 95 ]; then
            echo -e "    ${YELLOW}⚠️  キャッシュヒット率が低い: ${CACHE_HIT_RATIO}%${NC}" | tee -a "$PERFORMANCE_LOG"
        fi
        
    else
        echo -e "  ${RED}❌ PostgreSQL接続エラー${NC}" | tee -a "$PERFORMANCE_LOG"
        CONNECTIONS="N/A"
        DB_SIZE_MB="N/A"
        ACTIVE_QUERIES="N/A"
        CHECKPOINTS="N/A"
        LOCKS_COUNT="N/A"
        TEMP_FILES="N/A"
        CACHE_HIT_RATIO="N/A"
    fi
    
    # システムリソース監視
    echo "" | tee -a "$PERFORMANCE_LOG"
    echo "  システムリソース:" | tee -a "$PERFORMANCE_LOG"
    
    # CPU使用率（OS別対応）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        CPU_USAGE=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' || echo "0")
        MEMORY_USAGE=$(vm_stat | grep "Pages active" | awk '{print int($3 * 4096 / 1024 / 1024)}' || echo "0")
        DISK_USAGE=$(df -h /usr/local/var/postgresql 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")
    else
        # Linux
        CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' || echo "0")
        MEMORY_USAGE=$(free -m | awk '/^Mem:/ {print $3}' || echo "0")
        DISK_USAGE=$(df -h /var/lib/postgresql 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")
    fi
    
    echo "    CPU使用率: ${CPU_USAGE}%" | tee -a "$PERFORMANCE_LOG"
    echo "    メモリ使用量: ${MEMORY_USAGE} MB" | tee -a "$PERFORMANCE_LOG"
    echo "    ディスク使用率: ${DISK_USAGE}%" | tee -a "$PERFORMANCE_LOG"
    
    # アラート処理
    if [ "${CPU_USAGE%.*}" -gt 80 ]; then
        echo -e "    ${RED}🚨 CPU使用率が高い: ${CPU_USAGE}%${NC}" | tee -a "$PERFORMANCE_LOG"
    fi
    
    if [ "${MEMORY_USAGE%.*}" -gt 8000 ]; then
        echo -e "    ${RED}🚨 メモリ使用量が高い: ${MEMORY_USAGE} MB${NC}" | tee -a "$PERFORMANCE_LOG"
    fi
    
    if [ "${DISK_USAGE%.*}" -gt 90 ]; then
        echo -e "    ${RED}🚨 ディスク使用率が高い: ${DISK_USAGE}%${NC}" | tee -a "$PERFORMANCE_LOG"
    fi
    
    # CSV記録
    echo "${CURRENT_TIMESTAMP},${CONNECTIONS},${DB_SIZE_MB},${ACTIVE_QUERIES},${CHECKPOINTS},${CPU_USAGE},${MEMORY_USAGE},${DISK_USAGE},${LOCKS_COUNT},${TEMP_FILES},${CACHE_HIT_RATIO}" >> "$CSV_LOG"
    
    # 長時間実行中クエリチェック（5分間隔）
    COUNTER=$((COUNTER + 1))
    if [ $((COUNTER % 10)) -eq 0 ]; then
        echo "" | tee -a "$PERFORMANCE_LOG"
        echo "  長時間実行クエリチェック:" | tee -a "$PERFORMANCE_LOG"
        
        LONG_QUERIES=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT count(*) FROM pg_stat_activity 
             WHERE state = 'active' AND now() - query_start > interval '5 minutes';" 2>/dev/null | xargs || echo "0")
        
        if [ "$LONG_QUERIES" -gt 0 ]; then
            echo -e "    ${YELLOW}⚠️  5分以上実行中のクエリ: ${LONG_QUERIES}件${NC}" | tee -a "$PERFORMANCE_LOG"
            
            # 詳細表示
            PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
                -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c \
                "SELECT pid, now() - query_start as duration, left(query, 50) as query_preview 
                 FROM pg_stat_activity 
                 WHERE state = 'active' AND now() - query_start > interval '5 minutes'
                 ORDER BY query_start;" 2>/dev/null | tee -a "$PERFORMANCE_LOG" || true
        else
            echo "    ✅ 長時間実行クエリなし" | tee -a "$PERFORMANCE_LOG"
        fi
    fi
    
    echo "" | tee -a "$PERFORMANCE_LOG"
    
    # 進捗表示
    REMAINING_TIME=$((END_TIME - CURRENT_TIMESTAMP))
    echo -e "${CYAN}監視残り時間: $((REMAINING_TIME / 60))分$((REMAINING_TIME % 60))秒${NC}"
    
    sleep $INTERVAL
done

# 最終サマリー
FINAL_TIME=$(date '+%Y-%m-%d %H:%M:%S')
TOTAL_ELAPSED=$(($(date +%s) - START_TIME))

echo ""
echo "================================================" | tee -a "$PERFORMANCE_LOG"
echo -e "${GREEN}性能監視完了サマリー${NC}" | tee -a "$PERFORMANCE_LOG"
echo "================================================" | tee -a "$PERFORMANCE_LOG"
echo "監視期間: $((TOTAL_ELAPSED / 60))分$((TOTAL_ELAPSED % 60))秒" | tee -a "$PERFORMANCE_LOG"
echo "開始時刻: $(date -r $START_TIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'N/A')" | tee -a "$PERFORMANCE_LOG"
echo "終了時刻: $FINAL_TIME" | tee -a "$PERFORMANCE_LOG"

# 最終データベースサイズ
FINAL_DB_SIZE=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
    "SELECT round(pg_database_size('$TARGET_DB_NAME')/1024/1024, 2);" 2>/dev/null | xargs || echo "0")

echo "データベースサイズ変化: ${INITIAL_DB_SIZE} MB → ${FINAL_DB_SIZE} MB (増加: +$((${FINAL_DB_SIZE%.*} - ${INITIAL_DB_SIZE%.*})) MB)" | tee -a "$PERFORMANCE_LOG"

# CSV要約統計
echo "" | tee -a "$PERFORMANCE_LOG"
echo "統計サマリー:" | tee -a "$PERFORMANCE_LOG"

if command -v awk >/dev/null 2>&1; then
    # 接続数統計
    AVG_CONNECTIONS=$(awk -F',' 'NR>1 && $2 != "N/A" {sum+=$2; count++} END {if(count>0) print int(sum/count); else print 0}' "$CSV_LOG")
    MAX_CONNECTIONS=$(awk -F',' 'NR>1 && $2 != "N/A" {if($2>max) max=$2} END {print max+0}' "$CSV_LOG")
    
    # CPU統計
    AVG_CPU=$(awk -F',' 'NR>1 && $6 != "N/A" {sum+=$6; count++} END {if(count>0) printf "%.1f", sum/count; else print 0}' "$CSV_LOG")
    MAX_CPU=$(awk -F',' 'NR>1 && $6 != "N/A" {if($6>max) max=$6} END {printf "%.1f", max+0}' "$CSV_LOG")
    
    echo "  接続数: 平均 $AVG_CONNECTIONS, 最大 $MAX_CONNECTIONS" | tee -a "$PERFORMANCE_LOG"
    echo "  CPU使用率: 平均 ${AVG_CPU}%, 最大 ${MAX_CPU}%" | tee -a "$PERFORMANCE_LOG"
fi

echo "" | tee -a "$PERFORMANCE_LOG"
echo "ログファイル:" | tee -a "$PERFORMANCE_LOG"
echo "  詳細ログ: $PERFORMANCE_LOG"
echo "  CSV データ: $CSV_LOG"
echo ""

echo -e "${GREEN}性能監視が正常に完了しました${NC}"

# CSVファイルの簡易グラフ表示（利用可能な場合）
if command -v gnuplot >/dev/null 2>&1; then
    echo "グラフ生成中..."
    
    gnuplot << EOF
set terminal png size 1200,800
set output './migration-logs/performance_${TIMESTAMP}.png'
set title 'PostgreSQL Performance Monitoring'
set xlabel 'Time'
set ylabel 'Connections / CPU %'
set datafile separator ','
set xdata time
set timefmt '%s'
set format x '%H:%M'
set grid
plot '$CSV_LOG' using 1:2 with lines title 'Connections', \
     '$CSV_LOG' using 1:6 with lines title 'CPU %'
EOF
    
    echo "グラフ生成完了: ./migration-logs/performance_${TIMESTAMP}.png"
fi

exit 0