#!/bin/sh
set -e

# POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB はコンテナの環境変数から取得される想定
# docker-compose.ymlのpostgresサービス -> environmentで定義されている変数名を使用

# psqlコマンドの存在確認
if ! command -v psql > /dev/null; then
  echo "psql command not found" >&2
  exit 1
fi

# pg_isreadyコマンドの存在確認
if ! command -v pg_isready > /dev/null; then
  echo "pg_isready command not found" >&2
  exit 1
fi

# 接続テスト (pg_isreadyを使用)
if pg_isready -h localhost -p 5432 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
  # さらに実際にSQLを実行してデータベースが正常に動作していることを確認
  if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h localhost -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "SELECT 1;" > /dev/null 2>&1; then
    exit 0 # 成功
  else
    echo "Healthcheck failed: Could not execute query on PostgreSQL database '${POSTGRES_DB}'" >&2
    exit 1 # 失敗
  fi
else
  echo "Healthcheck failed: PostgreSQL is not ready (database '${POSTGRES_DB}' with user '${POSTGRES_USER}')" >&2
  exit 1 # 失敗
fi