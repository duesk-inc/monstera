# Configuration Examples

このディレクトリには、PostgreSQL移行に関連する設定ファイルの例が含まれます。

## 目的

開発者がPostgreSQL環境やMySQL環境の設定を容易に行えるよう、設定ファイルのテンプレートを提供します。

## 含まれるファイル

### PostgreSQL関連設定
- `postgresql_connection_pool_env.example` - PostgreSQL接続プール用の環境変数例
- `postgresql_dsn_methods.go.example` - PostgreSQL DSN生成メソッドの実装例

### 使用方法

#### 1. 環境変数設定
```bash
# postgresql_connection_pool_env.exampleをコピーして使用
cp backend/configs/examples/postgresql_connection_pool_env.example .env.postgresql

# 必要に応じて値を編集
vi .env.postgresql
```

#### 2. Go実装への統合
```bash
# postgresql_dsn_methods.go.exampleの内容を
# backend/internal/config/config.goに統合
```

## 設定項目の説明

### PostgreSQL接続プール設定
- `POSTGRES_MAX_OPEN_CONNS` - 最大オープン接続数
- `POSTGRES_MAX_IDLE_CONNS` - 最大アイドル接続数  
- `POSTGRES_CONN_MAX_LIFETIME` - 接続の最大生存時間
- `POSTGRES_CONN_MAX_IDLE_TIME` - 接続の最大アイドル時間

### DSN設定
- PostgreSQL用のDSN文字列生成
- SSL有効/無効の切り替え
- タイムゾーン設定

## 注意事項

- .exampleファイルは直接編集せず、コピーして使用してください
- 本番環境では適切なセキュリティ設定を行ってください
- パスワードやシークレットはソースコードに含めないでください
- 環境変数やシークレット管理ツールを使用してください
EOF < /dev/null