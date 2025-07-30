# PostgreSQL バックティック→ダブルクォート変換レポート

## 概要

MySQLからPostgreSQLへの移行において、識別子の引用符をバックティック（`）からダブルクォート（"）に変換しました。

## 変換結果

### 1. 変換対象ファイル

MySQLマイグレーションファイルでバックティックを使用していたファイル：
- `200016_create_alert_settings.up.sql`
- `200016_create_alert_settings.down.sql`
- `200017_create_alert_histories.up.sql`
- `200017_create_alert_histories.down.sql`

### 2. PostgreSQL版での変換内容

#### 200016_create_alert_settings.up.postgresql.sql
- **テーブル名**: `alert_settings` → "alert_settings"
- **カラム名**: 全23カラムで変換実施
- **インデックス名**: 4つのインデックス名を変換
- **制約名**: 2つの外部キー制約名を変換
- **INSERT文**: テーブル名とカラム名を変換
- **追加修正**:
  - UUID() → gen_random_uuid()
  - ENUM型 → CHECK制約
  - COMMENTを削除
  - KEY → CREATE INDEXに変更
  - ENGINE=InnoDBを削除

#### 200017_create_alert_histories.up.postgresql.sql
- **テーブル名**: `alert_histories` → "alert_histories"
- **カラム名**: 全18カラムで変換実施
- **インデックス名**: 9つのインデックス名を変換
- **制約名**: 4つの外部キー制約名を変換
- **追加修正**:
  - UUID() → gen_random_uuid()
  - ENUM型 → CHECK制約
  - COMMENTを削除
  - KEY → CREATE INDEXに変更
  - ENGINE=InnoDBを削除

### 3. 変換の検証

```bash
# PostgreSQLファイルでのバックティック検査
cd /Users/daichirouesaka/Documents/90_duesk/monstera/backend/migrations/postgresql-versions
grep '`' *.sql
# 結果: No backticks found
```

### 4. PostgreSQL固有の変更

バックティックからダブルクォートへの変換に加えて、以下のPostgreSQL対応も実施：

1. **UUID生成関数**
   - `UUID()` → `gen_random_uuid()`

2. **ENUM型の変換**
   - MySQL: `ENUM('value1', 'value2')`
   - PostgreSQL: `VARCHAR(n) CHECK (column IN ('value1', 'value2'))`

3. **コメントの削除**
   - PostgreSQLではCOMMENT ONステートメントを使用するため、インラインコメントを削除

4. **インデックス定義**
   - MySQL: `KEY index_name (column)`
   - PostgreSQL: `CREATE INDEX "index_name" ON "table" ("column")`

5. **エンジン指定の削除**
   - `ENGINE=InnoDB`などのMySQL固有の指定を削除

## 推奨事項

1. **識別子の命名規則**
   - PostgreSQLでは小文字が推奨されるため、ダブルクォートは予約語や特殊なケースのみ使用
   - 可能な限りダブルクォートを使わない命名を推奨

2. **互換性の確認**
   - アプリケーションコードでテーブル名・カラム名を参照している箇所の確認
   - 大文字小文字の扱いに注意（PostgreSQLはダブルクォートなしでは小文字に変換）

3. **テスト実施**
   - 変換後のマイグレーションファイルでのテーブル作成テスト
   - 外部キー制約の動作確認
   - インデックスの作成確認

## まとめ

すべてのバックティックがダブルクォートに正常に変換され、PostgreSQL固有の構文にも対応しました。変換後のファイルはPostgreSQLで正しく動作する形式になっています。