# PostgreSQL Configuration Files

このディレクトリには、PostgreSQL移行に関連する設定ファイルやスキーマ設定が含まれます。

## 目的

PostgreSQL環境固有の設定やデータベース設定ファイルを管理し、移行作業を効率化します。

## 含まれるファイル

### データベース設定
- `postgresql_database_config.sql` - PostgreSQL固有のデータベース設定
- `postgresql_timezone_config.sql` - タイムゾーン設定の変更

## 使用方法

### 1. データベース設定の適用

```bash
# PostgreSQL環境での設定適用
psql -U username -d database_name -f postgresql_database_config.sql
psql -U username -d database_name -f postgresql_timezone_config.sql
```

### 2. Docker環境での適用

```bash
# Docker PostgreSQLコンテナでの実行
docker-compose exec postgres psql -U monstera -d monstera -f /path/to/postgresql_database_config.sql
```

## 設定項目の説明

### PostgreSQL固有設定
- パフォーマンス調整パラメータ
- 接続プール設定
- ログ設定
- メモリ使用量設定

### タイムゾーン設定
- Asia/Tokyoタイムゾーンの設定
- 既存データの変換処理

## 注意事項

- 本番環境に適用する前に、必ずテスト環境で動作確認を行ってください
- 設定変更後はPostgreSQLサービスの再起動が必要な場合があります
- パフォーマンス設定は環境に応じて調整してください
- バックアップを取得してから設定変更を行ってください

## 移行時の手順

1. 現在のMySQLからのデータエクスポート
2. PostgreSQL環境の準備
3. 本ディレクトリの設定ファイルを適用
4. データインポート
5. 接続設定の変更
6. アプリケーションの動作確認
EOF < /dev/null