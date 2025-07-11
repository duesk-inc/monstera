# Monstera Backend

Monstera プロジェクトのバックエンド API サーバー

## エントリーポイント

統合されたエントリーポイントスクリプト `entrypoint.sh` を使用して、様々なモードで起動できます：

### 使用方法

```bash
./entrypoint.sh [mode]
```

### 利用可能なモード

- **start** (デフォルト): 通常起動（DB待機→マイグレーション→アプリ起動）
- **direct**: 直接起動（マイグレーションをスキップ）
- **migrate**: マイグレーションのみ実行
- **health**: ヘルスチェック実行
- **test**: テスト実行
- **shell**: シェルモード

### Docker Compose での使用例

```yaml
# 通常起動
command: ["./entrypoint.sh", "start"]

# 直接起動（マイグレーションスキップ）
command: ["./entrypoint.sh", "direct"]

# マイグレーションのみ実行
command: ["./entrypoint.sh", "migrate"]
```

### 環境変数

主要な環境変数とデフォルト値：

- `DB_HOST`: postgres
- `DB_PORT`: 5432
- `DB_NAME`: monstera
- `DB_USER`: postgres
- `DB_PASSWORD`: postgres
- `PORT`: 8080
- `GO_ENV`: development
- `GIN_MODE`: debug

## 削除されたスクリプト

以下のスクリプトは統合により削除されました：

- `entrypoint-skip-migration.sh` - MySQL用で不要
- `entrypoint-direct.sh` - directモードに統合
- `entrypoint-test.sh` - testモードに統合
- `wait-for-mysql.sh` - PostgreSQL移行により不要

`wait-for-postgres.sh` は互換性のため維持されています。