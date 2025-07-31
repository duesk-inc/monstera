# マイグレーション関連エラーパターン

## パターン: データ不在によるエラー

### 症状
- 「〜が設定されていません」「〜が見つかりません」などのエラー
- トランザクション内で `count = 0` や空の結果セット

### 確認手順
1. `docker-compose exec postgres psql -U postgres -d monstera -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"`
2. 最新のマイグレーションファイルと比較
3. 未実行のマイグレーションがないか確認

### 解決方法
```bash
make migrate-up  # 未実行のマイグレーションを適用
```

## パターン: スキーマ不整合エラー

### 症状
- `column "xxx" of relation "yyy" does not exist (SQLSTATE 42703)`
- トランザクションのロールバック

### 確認手順
1. エラーメッセージから不足カラムを特定
2. `\d テーブル名` でテーブル構造確認
3. モデル定義との差分確認

### 解決方法
1. 不足カラムを追加するマイグレーション作成
2. `make migrate-up` で適用

## 重要な注意点
- `docker-compose down -v` 実行後は必ずマイグレーション状態を確認
- シードデータを含むマイグレーションは初期セットアップで重要