#!/bin/bash

# PostgreSQL ストリーミングレプリケーションセットアップスクリプト
# プライマリとスタンバイサーバーの設定を自動化

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# デフォルト設定
DEFAULT_REPL_USER="replicator"
DEFAULT_REPL_PASSWORD="replicator_password"
DEFAULT_PORT="5432"
DEFAULT_DATA_DIR="/var/lib/postgresql/14/main"
DEFAULT_CONFIG_DIR="/etc/postgresql/14/main"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 使用方法表示
show_usage() {
    echo "PostgreSQL Streaming Replication Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup-primary     - Configure primary server"
    echo "  setup-standby     - Configure standby server"
    echo "  create-slot       - Create replication slot"
    echo "  check-status      - Check replication status"
    echo "  promote           - Promote standby to primary"
    echo "  help              - Show this help message"
    echo ""
    echo "Options:"
    echo "  --host            - Database host"
    echo "  --port            - Database port (default: 5432)"
    echo "  --data-dir        - PostgreSQL data directory"
    echo "  --config-dir      - PostgreSQL config directory"
    echo "  --repl-user       - Replication user (default: replicator)"
    echo "  --repl-password   - Replication password"
    echo "  --primary-host    - Primary server host (for standby setup)"
    echo "  --slot-name       - Replication slot name"
    echo "  --sync-mode       - Synchronous mode (async/sync/remote_write/remote_apply)"
    echo ""
    echo "Examples:"
    echo "  $0 setup-primary --repl-password=secure_password"
    echo "  $0 setup-standby --primary-host=192.168.1.10 --repl-password=secure_password"
    echo "  $0 create-slot --slot-name=standby1_slot"
    echo "  $0 check-status"
}

# パラメータ解析
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --host=*)
                DB_HOST="${1#*=}"
                shift
                ;;
            --port=*)
                DB_PORT="${1#*=}"
                shift
                ;;
            --data-dir=*)
                DATA_DIR="${1#*=}"
                shift
                ;;
            --config-dir=*)
                CONFIG_DIR="${1#*=}"
                shift
                ;;
            --repl-user=*)
                REPL_USER="${1#*=}"
                shift
                ;;
            --repl-password=*)
                REPL_PASSWORD="${1#*=}"
                shift
                ;;
            --primary-host=*)
                PRIMARY_HOST="${1#*=}"
                shift
                ;;
            --slot-name=*)
                SLOT_NAME="${1#*=}"
                shift
                ;;
            --sync-mode=*)
                SYNC_MODE="${1#*=}"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # デフォルト値設定
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-$DEFAULT_PORT}"
    DATA_DIR="${DATA_DIR:-$DEFAULT_DATA_DIR}"
    CONFIG_DIR="${CONFIG_DIR:-$DEFAULT_CONFIG_DIR}"
    REPL_USER="${REPL_USER:-$DEFAULT_REPL_USER}"
    REPL_PASSWORD="${REPL_PASSWORD:-$DEFAULT_REPL_PASSWORD}"
    SYNC_MODE="${SYNC_MODE:-async}"
}

# PostgreSQL設定ファイルバックアップ
backup_config() {
    local config_file="$1"
    local backup_file="${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$config_file" ]; then
        cp "$config_file" "$backup_file"
        info "Configuration backed up to: $backup_file"
    fi
}

# プライマリサーバー設定
setup_primary() {
    echo -e "${PURPLE}Setting up Primary Server${NC}"
    echo "=========================="
    echo ""
    
    # PostgreSQL設定確認
    if [ ! -d "$CONFIG_DIR" ]; then
        error "PostgreSQL config directory not found: $CONFIG_DIR"
        exit 1
    fi
    
    # 設定ファイルバックアップ
    backup_config "$CONFIG_DIR/postgresql.conf"
    backup_config "$CONFIG_DIR/pg_hba.conf"
    
    # レプリケーションユーザー作成
    info "Creating replication user..."
    sudo -u postgres psql << EOF
-- レプリケーションユーザー作成
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$REPL_USER') THEN
        CREATE ROLE $REPL_USER WITH REPLICATION LOGIN ENCRYPTED PASSWORD '$REPL_PASSWORD';
        GRANT pg_monitor TO $REPL_USER;
    ELSE
        ALTER ROLE $REPL_USER WITH REPLICATION LOGIN ENCRYPTED PASSWORD '$REPL_PASSWORD';
    END IF;
END
\$\$;
EOF
    
    if [ $? -eq 0 ]; then
        success "Replication user created/updated"
    else
        error "Failed to create replication user"
        exit 1
    fi
    
    # postgresql.conf設定
    info "Configuring postgresql.conf..."
    
    cat >> "$CONFIG_DIR/postgresql.conf" << EOF

# Streaming Replication Configuration (Primary)
# Generated by replication-setup.sh on $(date)

# Basic replication settings
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB
max_replication_slots = 10

# Archive settings (for PITR integration)
archive_mode = on
archive_command = '/usr/local/bin/archive_wal.sh %p %f'
archive_timeout = 3600

# Performance settings
wal_compression = on
wal_log_hints = on
wal_buffers = 16MB
checkpoint_timeout = 15min
checkpoint_completion_target = 0.7
max_wal_size = 2GB
min_wal_size = 80MB

# Monitoring
log_replication_commands = on
track_commit_timestamp = on

# Network settings
listen_addresses = '*'

EOF
    
    # 同期レプリケーション設定（オプション）
    if [ "$SYNC_MODE" != "async" ]; then
        cat >> "$CONFIG_DIR/postgresql.conf" << EOF
# Synchronous replication
synchronous_commit = $SYNC_MODE
# synchronous_standby_names will be set after standby registration
EOF
    fi
    
    # pg_hba.conf設定
    info "Configuring pg_hba.conf..."
    
    # レプリケーション接続許可追加
    cat >> "$CONFIG_DIR/pg_hba.conf" << EOF

# Replication connections
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    replication     $REPL_USER      0.0.0.0/0              md5
host    replication     $REPL_USER      ::0/0                  md5

# Allow monitoring connections
host    postgres        $REPL_USER      0.0.0.0/0              md5
host    postgres        $REPL_USER      ::0/0                  md5

EOF
    
    # PostgreSQL再起動
    info "Restarting PostgreSQL..."
    sudo systemctl restart postgresql
    
    if [ $? -eq 0 ]; then
        success "PostgreSQL restarted successfully"
    else
        error "Failed to restart PostgreSQL"
        exit 1
    fi
    
    # 設定確認
    info "Verifying configuration..."
    sudo -u postgres psql -c "SHOW wal_level;"
    sudo -u postgres psql -c "SHOW max_wal_senders;"
    
    success "Primary server setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Create replication slots if needed: $0 create-slot --slot-name=standby1_slot"
    echo "2. Setup standby servers"
    echo "3. Configure firewall to allow connections from standby servers"
}

# スタンバイサーバー設定
setup_standby() {
    echo -e "${PURPLE}Setting up Standby Server${NC}"
    echo "=========================="
    echo ""
    
    if [ -z "$PRIMARY_HOST" ]; then
        error "Primary host not specified. Use --primary-host=<host>"
        exit 1
    fi
    
    # 既存データディレクトリ確認
    if [ -d "$DATA_DIR" ] && [ "$(ls -A $DATA_DIR)" ]; then
        warning "Data directory is not empty: $DATA_DIR"
        read -p "Remove existing data? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            info "Stopping PostgreSQL..."
            sudo systemctl stop postgresql
            
            info "Removing existing data..."
            sudo rm -rf "$DATA_DIR"/*
        else
            error "Cannot proceed with existing data"
            exit 1
        fi
    fi
    
    # ベースバックアップ取得
    info "Taking base backup from primary..."
    
    export PGPASSWORD="$REPL_PASSWORD"
    
    # スロット指定がある場合
    SLOT_OPTION=""
    if [ -n "$SLOT_NAME" ]; then
        SLOT_OPTION="--slot=$SLOT_NAME"
    fi
    
    sudo -u postgres pg_basebackup \
        --host="$PRIMARY_HOST" \
        --port="$DB_PORT" \
        --username="$REPL_USER" \
        --pgdata="$DATA_DIR" \
        --format=plain \
        --write-recovery-conf \
        --checkpoint=fast \
        --progress \
        --verbose \
        $SLOT_OPTION
    
    if [ $? -eq 0 ]; then
        success "Base backup completed"
    else
        error "Base backup failed"
        exit 1
    fi
    
    # standby.signal作成（PostgreSQL 12以降）
    sudo -u postgres touch "$DATA_DIR/standby.signal"
    
    # postgresql.auto.conf設定
    info "Configuring standby settings..."
    
    # アプリケーション名生成
    APP_NAME="standby_$(hostname -s)"
    
    cat >> "$DATA_DIR/postgresql.auto.conf" << EOF

# Standby server configuration
# Generated by replication-setup.sh on $(date)

primary_conninfo = 'host=$PRIMARY_HOST port=$DB_PORT user=$REPL_USER password=$REPL_PASSWORD application_name=$APP_NAME'
restore_command = '/usr/local/bin/restore_wal.sh %f %p'

# Hot standby settings
hot_standby = on
max_standby_archive_delay = 30s
max_standby_streaming_delay = 30s
wal_receiver_status_interval = 10s
hot_standby_feedback = on

# Recovery settings
recovery_target_timeline = 'latest'

EOF
    
    # スロット設定
    if [ -n "$SLOT_NAME" ]; then
        echo "primary_slot_name = '$SLOT_NAME'" >> "$DATA_DIR/postgresql.auto.conf"
    fi
    
    # PostgreSQL起動
    info "Starting PostgreSQL..."
    sudo systemctl start postgresql
    
    if [ $? -eq 0 ]; then
        success "PostgreSQL started successfully"
    else
        error "Failed to start PostgreSQL"
        exit 1
    fi
    
    # レプリケーション状態確認
    sleep 5
    info "Checking replication status..."
    
    sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
    sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver \G;"
    
    success "Standby server setup completed!"
    echo ""
    echo "Monitor replication status with: $0 check-status"
}

# レプリケーションスロット作成
create_slot() {
    echo -e "${PURPLE}Creating Replication Slot${NC}"
    echo "========================="
    echo ""
    
    if [ -z "$SLOT_NAME" ]; then
        error "Slot name not specified. Use --slot-name=<name>"
        exit 1
    fi
    
    info "Creating replication slot: $SLOT_NAME"
    
    sudo -u postgres psql << EOF
SELECT pg_create_physical_replication_slot('$SLOT_NAME');
EOF
    
    if [ $? -eq 0 ]; then
        success "Replication slot created"
        
        # スロット確認
        info "Current replication slots:"
        sudo -u postgres psql -c "SELECT slot_name, slot_type, active FROM pg_replication_slots;"
    else
        error "Failed to create replication slot"
        exit 1
    fi
}

# レプリケーション状態確認
check_status() {
    echo -e "${PURPLE}Replication Status Check${NC}"
    echo "========================"
    echo ""
    
    # プライマリ/スタンバイ判定
    IS_PRIMARY=$(sudo -u postgres psql -t -c "SELECT NOT pg_is_in_recovery();" | tr -d ' ')
    
    if [ "$IS_PRIMARY" = "t" ]; then
        echo -e "${GREEN}This is a PRIMARY server${NC}"
        echo ""
        
        # 接続中のスタンバイ表示
        info "Connected standbys:"
        sudo -u postgres psql << 'EOF'
\x
SELECT 
    application_name,
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes,
    sync_state,
    sync_priority,
    reply_time
FROM pg_stat_replication
ORDER BY application_name;
\x
EOF
        
        # レプリケーションスロット状態
        echo ""
        info "Replication slots:"
        sudo -u postgres psql -c "SELECT slot_name, active, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;"
        
        # 現在のLSN
        echo ""
        info "Current LSN:"
        sudo -u postgres psql -c "SELECT pg_current_wal_lsn();"
        
    else
        echo -e "${BLUE}This is a STANDBY server${NC}"
        echo ""
        
        # レシーバー状態
        info "WAL receiver status:"
        sudo -u postgres psql << 'EOF'
\x
SELECT 
    status,
    receive_start_lsn,
    receive_start_tli,
    written_lsn,
    flushed_lsn,
    received_tli,
    last_msg_send_time,
    last_msg_receipt_time,
    latest_end_lsn,
    latest_end_time,
    slot_name,
    sender_host,
    sender_port,
    conninfo
FROM pg_stat_wal_receiver;
\x
EOF
        
        # レプリケーション遅延
        echo ""
        info "Replication lag:"
        sudo -u postgres psql << 'EOF'
SELECT 
    pg_last_wal_receive_lsn() AS receive_lsn,
    pg_last_wal_replay_lsn() AS replay_lsn,
    pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) AS lag_bytes,
    pg_last_xact_replay_timestamp() AS last_replay_time,
    EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;
EOF
    fi
    
    # システム情報
    echo ""
    info "System information:"
    sudo -u postgres psql -c "SELECT version();"
    sudo -u postgres psql -c "SELECT name, setting FROM pg_settings WHERE name IN ('wal_level', 'max_wal_senders', 'hot_standby', 'archive_mode');"
}

# スタンバイ昇格
promote_standby() {
    echo -e "${PURPLE}Promoting Standby to Primary${NC}"
    echo "=============================="
    echo ""
    
    # スタンバイ確認
    IS_STANDBY=$(sudo -u postgres psql -t -c "SELECT pg_is_in_recovery();" | tr -d ' ')
    
    if [ "$IS_STANDBY" != "t" ]; then
        error "This server is not a standby"
        exit 1
    fi
    
    warning "This will promote the standby to primary!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Promotion cancelled"
        exit 0
    fi
    
    # 昇格実行
    info "Promoting standby..."
    sudo -u postgres pg_ctl promote -D "$DATA_DIR"
    
    if [ $? -eq 0 ]; then
        success "Standby promoted to primary"
        
        # 新しい状態確認
        sleep 3
        info "New server state:"
        sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
        sudo -u postgres psql -c "SELECT pg_current_wal_lsn();"
    else
        error "Promotion failed"
        exit 1
    fi
    
    echo ""
    echo "Post-promotion tasks:"
    echo "1. Update application connection strings"
    echo "2. Reconfigure old primary as standby (if needed)"
    echo "3. Update monitoring configuration"
}

# 監視データ記録
record_monitoring_data() {
    # 監視データベースへの接続情報
    MONITOR_DB="${MONITOR_DB:-monstera}"
    
    # プライマリ/スタンバイ判定
    IS_PRIMARY=$(sudo -u postgres psql -t -c "SELECT NOT pg_is_in_recovery();" | tr -d ' ')
    NODE_NAME=$(hostname -s)
    
    if [ "$IS_PRIMARY" = "t" ]; then
        # プライマリの監視データ
        STATUS_DATA=$(sudo -u postgres psql -t -A -c "
            SELECT jsonb_build_object(
                'connected_standbys', COUNT(*),
                'sync_standbys', COUNT(*) FILTER (WHERE sync_state = 'sync'),
                'async_standbys', COUNT(*) FILTER (WHERE sync_state = 'async'),
                'max_lag_bytes', MAX(pg_wal_lsn_diff(sent_lsn, replay_lsn)),
                'min_lag_bytes', MIN(pg_wal_lsn_diff(sent_lsn, replay_lsn)),
                'avg_lag_bytes', AVG(pg_wal_lsn_diff(sent_lsn, replay_lsn))::BIGINT,
                'wal_lsn', pg_current_wal_lsn()::TEXT,
                'timeline_id', (SELECT timeline_id FROM pg_control_checkpoint())
            )
            FROM pg_stat_replication;
        ")
    else
        # スタンバイの監視データ
        STATUS_DATA=$(sudo -u postgres psql -t -A -c "
            SELECT jsonb_build_object(
                'is_in_recovery', true,
                'receive_lsn', pg_last_wal_receive_lsn()::TEXT,
                'replay_lsn', pg_last_wal_replay_lsn()::TEXT,
                'lag_bytes', pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()),
                'lag_seconds', EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())),
                'timeline_id', (SELECT timeline_id FROM pg_control_checkpoint()),
                'state', (SELECT state FROM pg_stat_wal_receiver LIMIT 1),
                'sync_state', (SELECT sync_state FROM pg_stat_wal_receiver LIMIT 1),
                'slot_name', (SELECT slot_name FROM pg_stat_wal_receiver LIMIT 1)
            );
        ")
    fi
    
    # 監視データベースに記録
    sudo -u postgres psql -d "$MONITOR_DB" -c "
        SELECT record_replication_status('$NODE_NAME', $IS_PRIMARY, '$STATUS_DATA'::JSONB);
    "
}

# メイン処理
main() {
    local command="${1:-help}"
    shift || true
    
    parse_args "$@"
    
    case "$command" in
        setup-primary)
            setup_primary
            ;;
        setup-standby)
            setup_standby
            ;;
        create-slot)
            create_slot
            ;;
        check-status)
            check_status
            ;;
        promote)
            promote_standby
            ;;
        record-status)
            record_monitoring_data
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# 実行
main "$@"