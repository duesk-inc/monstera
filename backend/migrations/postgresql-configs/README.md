# PostgreSQL設定ファイル

このディレクトリにはPostgreSQLデータベースの設定に関するSQLファイルが含まれています。

## ファイル一覧

### postgresql_database_config.sql
PostgreSQLデータベースの基本設定を行うSQLスクリプトです。

**主な設定内容:**
- 文字エンコーディング: UTF8
- 照合順序: ja_JP.utf8
- タイムゾーン: Asia/Tokyo
- 共有バッファ、ワークメモリなどのパフォーマンス設定
- ログ設定（スロークエリ、デッドロック検出など）
- 自動バキューム設定

**使用方法:**
```bash
# PostgreSQLスーパーユーザーで実行
psql -U postgres -d monstera -f postgresql_database_config.sql
```

### postgresql_timezone_config.sql
タイムゾーン関連の設定を行うSQLスクリプトです。

**主な設定内容:**
- データベースのデフォルトタイムゾーンをAsia/Tokyoに設定
- セッションタイムゾーンの設定
- タイムゾーン変換関数の定義

**使用方法:**
```bash
# データベースに接続して実行
psql -U monstera_user -d monstera -f postgresql_timezone_config.sql
```

## 設定の適用タイミング

1. **初期セットアップ時**
   - データベース作成直後に`postgresql_database_config.sql`を実行
   - アプリケーション起動前に`postgresql_timezone_config.sql`を実行

2. **本番環境への適用**
   - メンテナンスウィンドウ中に実行を推奨
   - 一部の設定はPostgreSQLの再起動が必要な場合があります

3. **開発環境での使用**
   - Docker環境では初期化スクリプトとして自動実行されます
   - 手動セットアップの場合は上記コマンドで実行してください

## 注意事項

- これらの設定はPostgreSQL 14以降を対象としています
- 本番環境では、サーバーのリソースに応じてパフォーマンス設定の調整が必要です
- `shared_buffers`や`work_mem`などの値は環境に応じて最適化してください

## 関連ドキュメント

- [PostgreSQL移行ガイド](../../../docs/03_database/postgresql-migration/README.md)
- [接続プール設定](../../internal/config/postgresql_connection_pool_config.go)
- [トランザクション管理](../../internal/db/postgresql_transaction_manager.go)