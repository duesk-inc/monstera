#!/bin/bash

# PostgreSQL WALアーカイブスクリプト
# WALファイルをローカルとS3（オプション）にアーカイブ

set -e

# パラメータ
WAL_PATH=$1
WAL_NAME=$2

# 設定
ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/lib/postgresql/archive}"
S3_BUCKET="${WAL_S3_BUCKET:-}"
S3_PREFIX="${WAL_S3_PREFIX:-wal-archive}"
COMPRESS="${WAL_COMPRESS:-true}"
RETENTION_DAYS="${WAL_RETENTION_DAYS:-30}"

# ログ設定
LOG_FILE="${WAL_ARCHIVE_LOG:-/var/log/postgresql/wal_archive.log}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

# データベース接続情報（統計記録用）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-password}"

# ログ関数
log() {
    local level=$1
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" >> "$LOG_FILE"
}

# エラーハンドリング
handle_error() {
    local error_msg=$1
    log "ERROR" "$error_msg"
    
    # データベースにエラーを記録
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO wal_archive_status (
            wal_file_name, 
            archive_path, 
            file_size, 
            status, 
            error_message
        ) VALUES (
            '$WAL_NAME', 
            'FAILED', 
            0, 
            'failed', 
            '$error_msg'
        );
    " 2>/dev/null || true
    
    exit 1
}

# 開始ログ
log "INFO" "Starting archive of $WAL_NAME"

# ファイルサイズ取得
FILE_SIZE=$(stat -c%s "$WAL_PATH" 2>/dev/null || stat -f%z "$WAL_PATH")

# ローカルアーカイブディレクトリの作成
mkdir -p "$ARCHIVE_DIR" || handle_error "Failed to create archive directory"

# アーカイブ先パス
if [ "$COMPRESS" = "true" ]; then
    ARCHIVE_FILE="$ARCHIVE_DIR/${WAL_NAME}.gz"
    LOCAL_CMD="gzip -c"
else
    ARCHIVE_FILE="$ARCHIVE_DIR/${WAL_NAME}"
    LOCAL_CMD="cat"
fi

# ローカルアーカイブ
log "INFO" "Archiving to $ARCHIVE_FILE"
if $LOCAL_CMD "$WAL_PATH" > "$ARCHIVE_FILE"; then
    log "INFO" "Local archive successful"
    
    # チェックサム計算
    CHECKSUM=$(md5sum "$ARCHIVE_FILE" | cut -d' ' -f1)
    
    # データベースに成功を記録
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO wal_archive_status (
            wal_file_name, 
            archive_path, 
            file_size, 
            checksum, 
            status
        ) VALUES (
            '$WAL_NAME', 
            '$ARCHIVE_FILE', 
            $FILE_SIZE, 
            '$CHECKSUM', 
            'archived'
        );
    " 2>/dev/null || log "WARN" "Failed to record archive status in database"
else
    handle_error "Failed to archive to local directory"
fi

# S3アーカイブ（設定されている場合）
if [ -n "$S3_BUCKET" ]; then
    log "INFO" "Uploading to S3: $S3_BUCKET/$S3_PREFIX/"
    
    if [ "$COMPRESS" = "true" ]; then
        S3_KEY="$S3_PREFIX/${WAL_NAME}.gz"
        # 既に圧縮済みのファイルをアップロード
        if aws s3 cp "$ARCHIVE_FILE" "s3://$S3_BUCKET/$S3_KEY" --quiet; then
            log "INFO" "S3 upload successful"
            
            # S3アップロード成功を記録
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                UPDATE wal_archive_status 
                SET 
                    archive_path = archive_path || ' | s3://$S3_BUCKET/$S3_KEY',
                    updated_at = NOW()
                WHERE wal_file_name = '$WAL_NAME';
            " 2>/dev/null || true
        else
            log "ERROR" "S3 upload failed"
        fi
    else
        S3_KEY="$S3_PREFIX/${WAL_NAME}"
        # 圧縮せずにアップロード
        if aws s3 cp "$WAL_PATH" "s3://$S3_BUCKET/$S3_KEY" --quiet; then
            log "INFO" "S3 upload successful"
        else
            log "ERROR" "S3 upload failed"
        fi
    fi
fi

# 古いWALファイルのクリーンアップ
if [ "$RETENTION_DAYS" -gt 0 ]; then
    log "INFO" "Cleaning up files older than $RETENTION_DAYS days"
    
    # ローカルファイルのクリーンアップ
    find "$ARCHIVE_DIR" -name "*.wal*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || \
        log "WARN" "Failed to cleanup old local files"
    
    # S3ファイルのクリーンアップ（設定されている場合）
    if [ -n "$S3_BUCKET" ]; then
        CUTOFF_DATE=$(date -u -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "$S3_PREFIX/" \
            --query "Contents[?LastModified<='$CUTOFF_DATE'].Key" \
            --output text | \
        xargs -n1 -I{} aws s3 rm "s3://$S3_BUCKET/{}" 2>/dev/null || \
            log "WARN" "Failed to cleanup old S3 files"
    fi
    
    # データベースレコードのクリーンアップ
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT cleanup_old_wal_archives($RETENTION_DAYS);
    " 2>/dev/null || true
fi

# ディスク使用量の確認
DISK_USAGE=$(df -h "$ARCHIVE_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log "WARN" "Archive directory disk usage is high: ${DISK_USAGE}%"
fi

log "INFO" "Archive complete for $WAL_NAME"
exit 0