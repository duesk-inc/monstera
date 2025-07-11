#!/bin/bash

# pgAdmin自動セットアップスクリプト
# PostgreSQLサーバーへの接続を自動設定

set -e

PGADMIN_SETUP_EMAIL="${PGADMIN_DEFAULT_EMAIL:-admin@duesk.co.jp}"
PGADMIN_SETUP_PASSWORD="${PGADMIN_DEFAULT_PASSWORD:-admin}"

# pgAdmin設定ディレクトリ
PGADMIN_DIR="/var/lib/pgadmin"
STORAGE_DIR="${PGADMIN_DIR}/storage"
SERVER_DIR="${STORAGE_DIR}/${PGADMIN_SETUP_EMAIL//[@.]/_}"

# 設定ディレクトリ作成
mkdir -p "${SERVER_DIR}"

# pgpassファイル作成（パスワード自動入力用）
cat > "${SERVER_DIR}/pgpass" << EOF
postgres:5432:*:postgres:${POSTGRES_PASSWORD:-postgres}
EOF
chmod 600 "${SERVER_DIR}/pgpass"

# 接続テスト用スクリプト
cat > "${SERVER_DIR}/test_connection.sql" << 'EOF'
-- 接続テストクエリ
SELECT version();
SELECT current_database();
SELECT current_user;
SELECT inet_server_addr() AS server_address;
SELECT inet_server_port() AS server_port;
EOF

echo "pgAdmin auto-setup completed successfully!"
echo "Server configuration has been prepared."
echo "You can now access pgAdmin at http://localhost:5050"
echo "Login with: ${PGADMIN_SETUP_EMAIL} / ${PGADMIN_SETUP_PASSWORD}"