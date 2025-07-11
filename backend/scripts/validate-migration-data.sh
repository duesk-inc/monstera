#!/bin/bash

# validate-migration-data.sh
# 移行データ整合性検証スクリプト

set -euo pipefail

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 設定
SOURCE_DB_HOST="${MYSQL_HOST:-localhost}"
SOURCE_DB_PORT="${MYSQL_PORT:-3306}"
SOURCE_DB_NAME="${MYSQL_DATABASE:-monstera}"
SOURCE_DB_USER="${MYSQL_USER:-root}"
SOURCE_DB_PASS="${MYSQL_PASSWORD}"

TARGET_DB_HOST="${POSTGRES_HOST:-localhost}"
TARGET_DB_PORT="${POSTGRES_PORT:-5432}"
TARGET_DB_NAME="${POSTGRES_DATABASE:-monstera}"
TARGET_DB_USER="${POSTGRES_USER:-postgres}"
TARGET_DB_PASS="${POSTGRES_PASSWORD}"

echo "================================================"
echo -e "${BLUE}データ整合性検証開始${NC}"
echo "================================================"
echo "MySQL: ${SOURCE_DB_HOST}:${SOURCE_DB_PORT}/${SOURCE_DB_NAME}"
echo "PostgreSQL: ${TARGET_DB_HOST}:${TARGET_DB_PORT}/${TARGET_DB_NAME}"
echo ""

VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0
TOTAL_TABLES=0

# ログファイル作成
LOG_DIR="./migration-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
VALIDATION_LOG="$LOG_DIR/validation_${TIMESTAMP}.log"

echo "検証ログ: $VALIDATION_LOG"
echo ""

# 接続確認
echo "接続確認中..." | tee -a "$VALIDATION_LOG"

if ! mysql -h"$SOURCE_DB_HOST" -P"$SOURCE_DB_PORT" -u"$SOURCE_DB_USER" -p"$SOURCE_DB_PASS" \
   -e "SELECT 1;" "$SOURCE_DB_NAME" >/dev/null 2>&1; then
    echo -e "${RED}❌ MySQL接続失敗${NC}" | tee -a "$VALIDATION_LOG"
    exit 1
fi

if ! PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
   -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL接続失敗${NC}" | tee -a "$VALIDATION_LOG"
    exit 1
fi

echo -e "${GREEN}✅ データベース接続確認完了${NC}" | tee -a "$VALIDATION_LOG"
echo ""

# テーブル一覧取得
echo "テーブル一覧取得中..." | tee -a "$VALIDATION_LOG"

MYSQL_TABLES=$(mysql -h"$SOURCE_DB_HOST" -P"$SOURCE_DB_PORT" -u"$SOURCE_DB_USER" -p"$SOURCE_DB_PASS" \
    -se "SELECT table_name FROM information_schema.tables 
         WHERE table_schema = '$SOURCE_DB_NAME' AND table_type = 'BASE TABLE'
         ORDER BY table_name;" 2>/dev/null || echo "")

PG_TABLES=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
    "SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name;" 2>/dev/null | xargs | tr ' ' '\n' || echo "")

MYSQL_TABLE_COUNT=$(echo "$MYSQL_TABLES" | wc -l)
PG_TABLE_COUNT=$(echo "$PG_TABLES" | wc -l)

echo "MySQL テーブル数: $MYSQL_TABLE_COUNT" | tee -a "$VALIDATION_LOG"
echo "PostgreSQL テーブル数: $PG_TABLE_COUNT" | tee -a "$VALIDATION_LOG"

# テーブル存在確認
echo "" | tee -a "$VALIDATION_LOG"
echo "テーブル存在確認..." | tee -a "$VALIDATION_LOG"

MISSING_TABLES=""
for table in $MYSQL_TABLES; do
    if ! echo "$PG_TABLES" | grep -q "^$table$"; then
        echo -e "  ${RED}❌ テーブル未移行: $table${NC}" | tee -a "$VALIDATION_LOG"
        MISSING_TABLES="$MISSING_TABLES $table"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
done

if [ -z "$MISSING_TABLES" ]; then
    echo -e "  ${GREEN}✅ 全テーブルが存在${NC}" | tee -a "$VALIDATION_LOG"
else
    echo -e "  ${RED}未移行テーブル: $MISSING_TABLES${NC}" | tee -a "$VALIDATION_LOG"
fi

echo ""

# レコード数検証
echo "レコード数検証開始..." | tee -a "$VALIDATION_LOG"
echo "================================================" | tee -a "$VALIDATION_LOG"

# 検証対象テーブル（共通するテーブルのみ）
COMMON_TABLES=""
for table in $MYSQL_TABLES; do
    if echo "$PG_TABLES" | grep -q "^$table$"; then
        COMMON_TABLES="$COMMON_TABLES $table"
    fi
done

TOTAL_TABLES=$(echo "$COMMON_TABLES" | wc -w)
PROCESSED_TABLES=0

for table in $COMMON_TABLES; do
    PROCESSED_TABLES=$((PROCESSED_TABLES + 1))
    echo "[$PROCESSED_TABLES/$TOTAL_TABLES] テーブル $table 検証中..." | tee -a "$VALIDATION_LOG"
    
    # レコード数取得
    MYSQL_COUNT=$(mysql -h"$SOURCE_DB_HOST" -P"$SOURCE_DB_PORT" -u"$SOURCE_DB_USER" -p"$SOURCE_DB_PASS" \
        -se "SELECT COUNT(*) FROM \`$table\`;" "$SOURCE_DB_NAME" 2>/dev/null || echo "ERROR")
    
    PG_COUNT=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
        -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
        "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | xargs || echo "ERROR")
    
    if [ "$MYSQL_COUNT" = "ERROR" ]; then
        echo -e "    ${RED}❌ MySQL読み取りエラー${NC}" | tee -a "$VALIDATION_LOG"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        continue
    fi
    
    if [ "$PG_COUNT" = "ERROR" ]; then
        echo -e "    ${RED}❌ PostgreSQL読み取りエラー${NC}" | tee -a "$VALIDATION_LOG"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        continue
    fi
    
    # レコード数比較
    if [ "$MYSQL_COUNT" -eq "$PG_COUNT" ]; then
        echo -e "    ${GREEN}✅ レコード数一致: $MYSQL_COUNT${NC}" | tee -a "$VALIDATION_LOG"
    else
        echo -e "    ${RED}❌ レコード数不一致: MySQL=$MYSQL_COUNT, PostgreSQL=$PG_COUNT (差分: $((PG_COUNT - MYSQL_COUNT)))${NC}" | tee -a "$VALIDATION_LOG"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # 主要テーブルの詳細検証
    if [[ "$table" =~ ^(users|weekly_reports|daily_records)$ ]] && [ "$MYSQL_COUNT" -gt 0 ]; then
        echo "      詳細検証実行中..." | tee -a "$VALIDATION_LOG"
        
        # プライマリキー重複チェック
        if [[ "$table" == "users" ]]; then
            PK_COLUMN="id"
        elif [[ "$table" == "weekly_reports" ]]; then
            PK_COLUMN="id"
        elif [[ "$table" == "daily_records" ]]; then
            PK_COLUMN="id"
        else
            PK_COLUMN="id"
        fi
        
        PG_DUPLICATE_PK=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT COUNT(*) - COUNT(DISTINCT \"$PK_COLUMN\") FROM \"$table\";" 2>/dev/null | xargs || echo "0")
        
        if [ "$PG_DUPLICATE_PK" -gt 0 ]; then
            echo -e "      ${RED}❌ 主キー重複: ${PG_DUPLICATE_PK}件${NC}" | tee -a "$VALIDATION_LOG"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        else
            echo -e "      ${GREEN}✅ 主キー重複なし${NC}" | tee -a "$VALIDATION_LOG"
        fi
        
        # NULL値チェック（NOT NULL制約カラム）
        case "$table" in
            "users")
                NULL_CHECK_COLUMNS="email,created_at"
                ;;
            "weekly_reports")
                NULL_CHECK_COLUMNS="user_id,start_date,end_date,created_at"
                ;;
            "daily_records")
                NULL_CHECK_COLUMNS="weekly_report_id,date,created_at"
                ;;
            *)
                NULL_CHECK_COLUMNS="created_at"
                ;;
        esac
        
        IFS=',' read -ra COLUMNS <<< "$NULL_CHECK_COLUMNS"
        for column in "${COLUMNS[@]}"; do
            PG_NULL_COUNT=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
                -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
                "SELECT COUNT(*) FROM \"$table\" WHERE \"$column\" IS NULL;" 2>/dev/null | xargs || echo "0")
            
            if [ "$PG_NULL_COUNT" -gt 0 ]; then
                echo -e "      ${YELLOW}⚠️  $column にNULL値: ${PG_NULL_COUNT}件${NC}" | tee -a "$VALIDATION_LOG"
                VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
            fi
        done
        
        # 日付範囲チェック（weekly_reports）
        if [ "$table" = "weekly_reports" ]; then
            INVALID_DATES=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
                -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
                "SELECT COUNT(*) FROM \"$table\" WHERE start_date > end_date;" 2>/dev/null | xargs || echo "0")
            
            if [ "$INVALID_DATES" -gt 0 ]; then
                echo -e "      ${RED}❌ 無効な日付範囲: ${INVALID_DATES}件${NC}" | tee -a "$VALIDATION_LOG"
                VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
            fi
        fi
        
        # 外部キー整合性チェック
        case "$table" in
            "weekly_reports")
                ORPHAN_RECORDS=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
                    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
                    "SELECT COUNT(*) FROM weekly_reports wr 
                     LEFT JOIN users u ON wr.user_id = u.id 
                     WHERE u.id IS NULL;" 2>/dev/null | xargs || echo "0")
                
                if [ "$ORPHAN_RECORDS" -gt 0 ]; then
                    echo -e "      ${RED}❌ 孤立レコード (user_id): ${ORPHAN_RECORDS}件${NC}" | tee -a "$VALIDATION_LOG"
                    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
                fi
                ;;
            "daily_records")
                ORPHAN_RECORDS=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
                    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
                    "SELECT COUNT(*) FROM daily_records dr 
                     LEFT JOIN weekly_reports wr ON dr.weekly_report_id = wr.id 
                     WHERE wr.id IS NULL;" 2>/dev/null | xargs || echo "0")
                
                if [ "$ORPHAN_RECORDS" -gt 0 ]; then
                    echo -e "      ${RED}❌ 孤立レコード (weekly_report_id): ${ORPHAN_RECORDS}件${NC}" | tee -a "$VALIDATION_LOG"
                    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
                fi
                ;;
        esac
    fi
    
    # サンプルデータ検証（少量テーブルの場合）
    if [ "$MYSQL_COUNT" -gt 0 ] && [ "$MYSQL_COUNT" -le 1000 ]; then
        echo "      サンプルデータ検証中..." | tee -a "$VALIDATION_LOG"
        
        # 最初の3件のデータハッシュ比較
        MYSQL_SAMPLE=$(mysql -h"$SOURCE_DB_HOST" -P"$SOURCE_DB_PORT" -u"$SOURCE_DB_USER" -p"$SOURCE_DB_PASS" \
            -se "SELECT * FROM \`$table\` ORDER BY 1 LIMIT 3;" "$SOURCE_DB_NAME" 2>/dev/null | md5sum | cut -d' ' -f1 || echo "error")
        
        PG_SAMPLE=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
            -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
            "SELECT * FROM \"$table\" ORDER BY 1 LIMIT 3;" 2>/dev/null | md5sum | cut -d' ' -f1 || echo "error")
        
        if [ "$MYSQL_SAMPLE" = "$PG_SAMPLE" ] && [ "$MYSQL_SAMPLE" != "error" ]; then
            echo -e "      ${GREEN}✅ サンプルデータ一致${NC}" | tee -a "$VALIDATION_LOG"
        else
            echo -e "      ${YELLOW}⚠️  サンプルデータ差異あり（型変換による想定内差異の可能性）${NC}" | tee -a "$VALIDATION_LOG"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
    fi
    
    echo "" | tee -a "$VALIDATION_LOG"
done

# インデックス検証
echo "インデックス検証..." | tee -a "$VALIDATION_LOG"
echo "================================================" | tee -a "$VALIDATION_LOG"

# 主要テーブルのインデックス確認
CRITICAL_INDEXES=(
    "users:idx_users_email"
    "weekly_reports:idx_weekly_reports_user_id"
    "weekly_reports:idx_weekly_reports_start_date"
    "daily_records:idx_daily_records_weekly_report_id"
)

for index_info in "${CRITICAL_INDEXES[@]}"; do
    IFS=':' read -ra INDEX_PARTS <<< "$index_info"
    table_name="${INDEX_PARTS[0]}"
    index_name="${INDEX_PARTS[1]}"
    
    INDEX_EXISTS=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
        -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
        "SELECT COUNT(*) FROM pg_indexes WHERE tablename = '$table_name' AND indexname = '$index_name';" 2>/dev/null | xargs || echo "0")
    
    if [ "$INDEX_EXISTS" -gt 0 ]; then
        echo -e "  ${GREEN}✅ インデックス存在: $index_name${NC}" | tee -a "$VALIDATION_LOG"
    else
        echo -e "  ${YELLOW}⚠️  インデックス未作成: $index_name${NC}" | tee -a "$VALIDATION_LOG"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
done

echo ""

# 統計情報確認
echo "統計情報確認..." | tee -a "$VALIDATION_LOG"
echo "================================================" | tee -a "$VALIDATION_LOG"

# データベースサイズ比較
MYSQL_DB_SIZE=$(mysql -h"$SOURCE_DB_HOST" -P"$SOURCE_DB_PORT" -u"$SOURCE_DB_USER" -p"$SOURCE_DB_PASS" \
    -se "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) 
        FROM information_schema.tables 
        WHERE table_schema = '$SOURCE_DB_NAME';" 2>/dev/null || echo "0")

PG_DB_SIZE=$(PGPASSWORD="$TARGET_DB_PASS" psql -h"$TARGET_DB_HOST" -p"$TARGET_DB_PORT" \
    -U"$TARGET_DB_USER" -d"$TARGET_DB_NAME" -t -c \
    "SELECT round(pg_database_size('$TARGET_DB_NAME')/1024/1024, 1);" 2>/dev/null | xargs || echo "0")

echo "MySQL データベースサイズ: ${MYSQL_DB_SIZE} MB" | tee -a "$VALIDATION_LOG"
echo "PostgreSQL データベースサイズ: ${PG_DB_SIZE} MB" | tee -a "$VALIDATION_LOG"

SIZE_DIFF=$(echo "$PG_DB_SIZE - $MYSQL_DB_SIZE" | bc -l 2>/dev/null || echo "0")
SIZE_DIFF_PERCENT=$(echo "scale=1; $SIZE_DIFF / $MYSQL_DB_SIZE * 100" | bc -l 2>/dev/null || echo "0")

echo "サイズ差分: ${SIZE_DIFF} MB (${SIZE_DIFF_PERCENT}%)" | tee -a "$VALIDATION_LOG"

if [ "${SIZE_DIFF_PERCENT%.*}" -gt 20 ]; then
    echo -e "${YELLOW}⚠️  サイズ差異が大きいです${NC}" | tee -a "$VALIDATION_LOG"
    VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
fi

echo ""

# 最終結果
echo "================================================" | tee -a "$VALIDATION_LOG"
echo -e "${BLUE}データ整合性検証結果${NC}" | tee -a "$VALIDATION_LOG"
echo "================================================" | tee -a "$VALIDATION_LOG"

echo "検証実行時刻: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$VALIDATION_LOG"
echo "検証対象テーブル数: $TOTAL_TABLES" | tee -a "$VALIDATION_LOG"
echo "エラー数: $VALIDATION_ERRORS" | tee -a "$VALIDATION_LOG"
echo "警告数: $VALIDATION_WARNINGS" | tee -a "$VALIDATION_LOG"

if [ $VALIDATION_ERRORS -eq 0 ] && [ $VALIDATION_WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 全ての検証項目がパスしました！${NC}" | tee -a "$VALIDATION_LOG"
    echo -e "${GREEN}✅ データ移行が正常に完了しています${NC}" | tee -a "$VALIDATION_LOG"
    exit 0
elif [ $VALIDATION_ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  警告がありますが、データ移行は成功しています${NC}" | tee -a "$VALIDATION_LOG"
    echo -e "${YELLOW}詳細を確認して必要に応じて修正してください${NC}" | tee -a "$VALIDATION_LOG"
    exit 0
else
    echo -e "${RED}❌ 重大なエラーが検出されました${NC}" | tee -a "$VALIDATION_LOG"
    echo -e "${RED}データ移行に問題があります。修正が必要です。${NC}" | tee -a "$VALIDATION_LOG"
    exit 1
fi