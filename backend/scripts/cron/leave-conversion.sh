#!/bin/bash

# 環境変数の読み込み
if [ -f /app/.env ]; then
    export $(cat /app/.env | grep -v '^#' | xargs)
fi

# ログディレクトリの作成
LOG_DIR="/app/logs/batch"
mkdir -p $LOG_DIR

# 現在日時
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/leave_conversion_$TIMESTAMP.log"

echo "[$(date)] Starting leave conversion batch job" >> $LOG_FILE

# バッチジョブの実行
cd /app && ./leave_conversion_batch >> $LOG_FILE 2>&1

# 実行結果の確認
if [ $? -eq 0 ]; then
    echo "[$(date)] Leave conversion batch job completed successfully" >> $LOG_FILE
else
    echo "[$(date)] Leave conversion batch job failed with exit code $?" >> $LOG_FILE
fi

# 古いログファイルの削除（30日以上前のログを削除）
find $LOG_DIR -name "leave_conversion_*.log" -mtime +30 -exec rm {} \;

echo "[$(date)] Log cleanup completed" >> $LOG_FILE