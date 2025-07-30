# PostgreSQL 大文字小文字の扱い（テーブル名・カラム名）確認レポート

## 概要

MySQLとPostgreSQLでは識別子（テーブル名、カラム名など）の大文字小文字の扱いが異なります。本レポートでは、Monsteraプロジェクトにおける識別子の使用状況と推奨事項をまとめます。

## 調査実施日
2025-07-04

## 1. MySQLとPostgreSQLの識別子の違い

### MySQL
- **デフォルト動作**: OS依存（Windowsは大文字小文字を区別しない、Linux/Unixは区別する）
- **識別子引用符**: バックティック（`）
- **大文字小文字**: lower_case_table_names設定により制御

### PostgreSQL
- **デフォルト動作**: 引用符なしの識別子は自動的に小文字に変換
- **識別子引用符**: ダブルクォート（"）
- **大文字小文字**: 
  - 引用符なし：小文字に変換される
  - 引用符あり：大文字小文字を保持（ケースセンシティブ）

## 2. 現在の実装状況

### 2.1 マイグレーションファイルの調査結果

#### 識別子の引用符使用状況
```
総ファイル数: 116
ダブルクォート使用: 2ファイル
- 200016_create_alert_settings.up.postgresql.sql
- 200017_create_alert_histories.up.postgresql.sql

引用符なし: 114ファイル
```

#### 命名規則
- **テーブル名**: すべて小文字のsnake_case（例：weekly_reports, user_profiles）
- **カラム名**: すべて小文字のsnake_case（例：created_at, user_id）
- **インデックス名**: idx_プレフィックス付き小文字（例：idx_users_email）
- **制約名**: fk_プレフィックス付き小文字（例：fk_reports_user_id）

### 2.2 アプリケーションコードの調査結果

#### GORMモデルの定義
```go
type User struct {
    ID        uuid.UUID `gorm:"type:char(36);primary_key"`
    Email     string    `gorm:"type:varchar(255);not null;unique"`
    CreatedAt time.Time `gorm:"not null"`
}

// GORMは自動的にUsersテーブルにマップ（小文字複数形）
```

#### テーブル名の明示的指定
```go
func (User) TableName() string {
    return "users"  // 小文字で指定
}
```

### 2.3 問題点の特定

1. **一貫性の欠如**
   - 2つのファイルのみダブルクォートを使用
   - 他の114ファイルは引用符なし

2. **MySQL構文の残存**
   - 多くのファイルにMySQL固有の構文が残っている
   - ENGINE=InnoDB、ENUM型、TINYINT型など

3. **潜在的な問題**
   - ダブルクォート使用ファイルは大文字小文字を区別
   - アプリケーションコードは小文字前提
   - 混在により予期しない動作の可能性

## 3. 推奨事項

### 3.1 識別子の引用符ポリシー

**推奨：引用符なしの識別子を使用**

理由：
- PostgreSQLのデフォルト動作を活用
- 大文字小文字の問題を回避
- シンプルで一貫性のある実装

### 3.2 実装ガイドライン

1. **すべての識別子を小文字のsnake_caseで統一**
   ```sql
   -- 推奨
   CREATE TABLE user_profiles (
       user_id VARCHAR(36),
       created_at TIMESTAMP
   );
   
   -- 非推奨
   CREATE TABLE "UserProfiles" (
       "UserId" VARCHAR(36),
       "CreatedAt" TIMESTAMP
   );
   ```

2. **既存のダブルクォートを削除**
   ```sql
   -- 変更前
   CREATE TABLE "alert_settings" (
       "id" VARCHAR(36)
   );
   
   -- 変更後
   CREATE TABLE alert_settings (
       id VARCHAR(36)
   );
   ```

3. **予約語の回避**
   - PostgreSQLの予約語を識別子に使用しない
   - 必要な場合のみダブルクォートを使用

## 4. 移行時の注意事項

### 4.1 データ移行
- MySQLからPostgreSQLへのデータ移行時、テーブル名・カラム名の大文字小文字を統一
- 移行ツールで自動的に小文字に変換する機能を実装

### 4.2 アプリケーションコード
- GORMの設定でテーブル名の命名規則を確認
- 生SQLを使用している箇所の識別子を確認

### 4.3 検証ポイント
1. すべてのテーブルが正しく作成されるか
2. 外部キー制約が正しく機能するか
3. インデックスが正しく作成されるか
4. アプリケーションからの接続・操作が正常か

## 5. 修正実施内容

### 5.1 ダブルクォート削除実施
以下のファイルからダブルクォートを削除しました：
1. `200016_create_alert_settings.up.postgresql.sql` ✓
2. `200016_create_alert_settings.down.postgresql.sql` ✓
3. `200017_create_alert_histories.up.postgresql.sql` ✓
4. `200017_create_alert_histories.down.postgresql.sql` ✓

### 5.2 MySQL構文変換対象
- すべてのマイグレーションファイル（タスク#7-24で対応予定）

## 6. 実装手順

1. **ダブルクォートの削除**
   ```bash
   # 対象ファイルでダブルクォートを削除
   sed -i 's/"//g' 200016_create_alert_settings.up.postgresql.sql
   sed -i 's/"//g' 200017_create_alert_histories.up.postgresql.sql
   ```

2. **一貫性の確認**
   ```sql
   -- すべての識別子が小文字であることを確認
   SELECT table_name, column_name 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND (table_name != LOWER(table_name) OR column_name != LOWER(column_name));
   ```

3. **アプリケーションテスト**
   - 単体テストの実行
   - 統合テストの実行
   - E2Eテストの実行

## 7. まとめ

現在のコードベースは概ね適切な命名規則（小文字のsnake_case）を使用していますが、一部のファイルでダブルクォートが使用されています。PostgreSQL移行を成功させるため、以下を推奨します：

1. **識別子の引用符を削除**（2ファイル）
2. **小文字のsnake_case命名規則を維持**
3. **MySQL構文からPostgreSQL構文への完全な変換**（別タスクで対応）
4. **移行後の徹底的な検証**

これらの対応により、大文字小文字に関する問題を回避し、スムーズな移行を実現できます。