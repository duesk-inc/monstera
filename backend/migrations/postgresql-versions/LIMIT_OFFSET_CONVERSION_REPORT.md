# PostgreSQL LIMIT句のオフセット構文変換レポート

## 概要

MySQLとPostgreSQLではLIMIT句のオフセット構文が異なります。本レポートでは、Monsteraプロジェクトにおける LIMIT句の使用状況と変換対応状況をまとめます。

## 調査実施日
2025-07-04

## 1. MySQLとPostgreSQLのLIMIT句の違い

### MySQL構文
```sql
-- LIMIT offset, count
SELECT * FROM users LIMIT 10, 20;  -- 10件スキップして20件取得
```

### PostgreSQL構文
```sql
-- LIMIT count OFFSET offset  
SELECT * FROM users LIMIT 20 OFFSET 10;  -- 10件スキップして20件取得
```

## 2. 調査結果

### 2.1 マイグレーションファイル

#### PostgreSQLマイグレーションファイル（116ファイル）
- **MySQL形式のLIMIT句**: 0件
- **PostgreSQL形式のLIMIT句**: 19件
- すべて単純な`LIMIT n`形式で、オフセットを含むものなし

例：
```sql
-- 000026_create_user_it_experience_view.up.postgresql.sql
SELECT wh2.project_name FROM work_histories wh2 
WHERE wh2.user_id = u.id AND wh2.deleted_at IS NULL 
ORDER BY COALESCE(wh2.end_date, CURRENT_DATE()) DESC 
LIMIT 1
```

#### MySQLマイグレーションファイル
- MySQL形式の`LIMIT x,y`構文の使用なし

### 2.2 アプリケーションコード（Goファイル）

#### GORM使用箇所（24ファイル）
大部分のページネーション処理はGORMの`.Limit()`と`.Offset()`メソッドを使用：

```go
// 典型的なパターン
query = query.Limit(filter.Limit)
query = query.Offset(filter.Offset)
```

使用ファイル例：
- `leave_request_admin_repository.go`
- `engineer_proposal_repository.go`  
- `weekly_report_repository.go`
- `user_repository.go`
他多数

#### 生SQL使用箇所
生SQLでLIMIT句を使用している箇所は1件のみ：

```go
// weekly_report_repository.go:85
Raw("SELECT status FROM weekly_reports WHERE id = ? LIMIT 1", reports[0].ID)
```
→ PostgreSQL互換構文を使用

### 2.3 既存の変換機能

#### PostgreSQLSQLAdapter（実装済み）
`postgresql_sql_adapter.go`に変換処理が実装済み：

```go
// Line 189-191
// LIMIT clause conversion: LIMIT offset, count → LIMIT count OFFSET offset
limitPattern := regexp.MustCompile(`LIMIT\s+(\d+)\s*,\s*(\d+)`)
converted = limitPattern.ReplaceAllString(converted, `LIMIT $2 OFFSET $1`)
```

#### SQLPostgreSQLConverter（実装済み）
`sql_postgresql_converter.go`にも変換機能あり：

```go
// Line 154-157  
func (c *SQLPostgreSQLConverter) convertLimitOffset(sql string) string {
    // LIMIT offset, count → LIMIT count OFFSET offset
    return c.patterns["LIMIT_OFFSET"].ReplaceAllString(sql, "LIMIT $2 OFFSET $1")
}
```

## 3. 評価結果

### 3.1 現状の評価

1. **マイグレーションファイル**: すべてPostgreSQL互換構文を使用
2. **アプリケーションコード**: 
   - GORMが大部分を占め、データベース非依存
   - 生SQLも PostgreSQL互換構文を使用
3. **変換機能**: 2つの独立した変換実装が存在

### 3.2 リスク評価

- **低リスク**: 現在のコードベースにMySQL形式のLIMIT句は存在しない
- **予防的対策**: 変換アダプターが実装済みで、将来的なMySQL形式の混入にも対応可能

## 4. 推奨事項

### 4.1 現状維持
現在のコードベースは既にPostgreSQL互換であり、追加の修正は不要です。

### 4.2 開発ガイドライン
新規開発時の推奨事項：
1. **GORMの使用を優先**: `.Limit()`と`.Offset()`メソッドを使用
2. **生SQLを使用する場合**: PostgreSQL構文（`LIMIT n OFFSET m`）を使用
3. **レビュー時の確認**: MySQL形式の`LIMIT x,y`が混入していないか確認

### 4.3 変換アダプターの活用
既存の変換アダプターを確実に使用：
```go
// 生SQLを実行する際は必ずアダプター経由で
adapter := NewPostgreSQLSQLAdapter(db)
result, err := adapter.ExecuteRawSQL(query, args...)
```

## 5. テスト推奨事項

### 5.1 ページネーションテスト
```go
// 正しいオフセット計算の確認
func TestPagination(t *testing.T) {
    // ページ2、1ページ20件の場合
    offset := (2 - 1) * 20  // = 20
    limit := 20
    
    // GORMクエリ
    db.Model(&User{}).Offset(offset).Limit(limit).Find(&users)
    
    // 生SQL（PostgreSQL構文）
    db.Raw("SELECT * FROM users LIMIT ? OFFSET ?", limit, offset).Scan(&users)
}
```

### 5.2 境界値テスト
- オフセット0の場合
- 最終ページの場合
- データ件数を超えるオフセットの場合

## 6. まとめ

Monsteraプロジェクトにおいて、LIMIT句のオフセット構文は既に完全にPostgreSQL対応済みです：

1. **現在のコードベースにMySQL形式は存在しない**
2. **GORMによる抽象化が効果的に機能**
3. **変換アダプターが予防的に実装済み**
4. **追加の修正作業は不要**

PostgreSQL移行において、LIMIT句に関する問題は発生しないと評価できます。