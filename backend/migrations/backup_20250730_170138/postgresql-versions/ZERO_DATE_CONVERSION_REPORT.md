# PostgreSQL ゼロ日付（'0000-00-00'）のNULL変換処理レポート

## 概要

MySQLでは特殊な値として'0000-00-00'というゼロ日付が使用可能ですが、PostgreSQLではこの値は無効です。本レポートでは、Monsteraプロジェクトにおけるゼロ日付の使用状況と対応策をまとめます。

## 調査実施日
2025-07-04

## 調査結果

### 1. マイグレーションファイルでのゼロ日付使用状況

#### 1.1 PostgreSQLマイグレーションファイル
- **検出結果**: ゼロ日付（'0000-00-00'）の使用なし
- **ファイル数**: 0/116ファイル

#### 1.2 MySQLマイグレーションファイル
- **検出結果**: ゼロ日付（'0000-00-00'）の使用なし
- **ファイル数**: 0/58ファイル

### 2. 日付型のデフォルト値設定状況

#### 2.1 日付型カラムのデフォルト値パターン
マイグレーションファイルで使用されている日付型のデフォルト値：

1. **CURRENT_TIMESTAMP**
   - 最も一般的なパターン
   - 例: `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`

2. **タイムゾーン付きCURRENT_TIMESTAMP**
   - PostgreSQL版で使用
   - 例: `created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')`

3. **NULLデフォルト**
   - 任意の日付フィールド
   - 例: `deleted_at TIMESTAMP NULL`

### 3. アプリケーションコードでの日付処理

#### 3.1 ゼロ値の扱い
Go言語での日付ゼロ値の扱い：

```go
// Go言語のtime.Timeゼロ値
// 0001-01-01 00:00:00 +0000 UTC

// 実装例（expense_draft.go）
if d.ExpiresAt.IsZero() {
    d.ExpiresAt = now.Add(24 * time.Hour)
}
```

#### 3.2 NULL可能な日付フィールド
多くのモデルで`*time.Time`（ポインタ）を使用してNULL値を表現：

```go
type Project struct {
    StartDate *time.Time `json:"start_date"`
    EndDate   *time.Time `json:"end_date"`
}
```

### 4. PostgreSQL移行時の考慮事項

#### 4.1 ゼロ日付の非互換性
- **MySQL**: '0000-00-00'は有効な日付値
- **PostgreSQL**: '0000-00-00'は無効（エラーになる）
- **Go time.Time**: ゼロ値は'0001-01-01 00:00:00'

#### 4.2 推奨される対応方法

1. **NULL値への変換**
   ```sql
   -- MySQL → PostgreSQL移行時
   UPDATE table_name 
   SET date_column = NULL 
   WHERE date_column = '0000-00-00';
   ```

2. **センチネル値の使用**
   ```sql
   -- 業務上意味のある最小日付を使用
   UPDATE table_name 
   SET date_column = '1900-01-01' 
   WHERE date_column = '0000-00-00';
   ```

### 5. 実装状況の評価

#### 5.1 良好な点
1. マイグレーションファイルでゼロ日付を使用していない
2. アプリケーションコードがGo標準の日付処理を使用
3. NULL可能な日付フィールドが適切に設計されている

#### 5.2 確認が必要な点
1. 既存のMySQLデータベースにゼロ日付が存在するか
2. データ移行時のゼロ日付変換ロジック

### 6. 推奨アクション

#### 6.1 データ移行前の確認
```sql
-- MySQLでゼロ日付を含むレコードを確認
SELECT table_name, column_name, COUNT(*) as zero_date_count
FROM information_schema.columns c
WHERE c.data_type IN ('date', 'datetime', 'timestamp')
  AND EXISTS (
    SELECT 1 
    FROM `{table_name}` t 
    WHERE t.`{column_name}` = '0000-00-00'
  );
```

#### 6.2 データ移行ツールへの実装
タスク#51「データ移行ツール作成（MySQL→PostgreSQL）」で以下を実装：

1. **ゼロ日付検出機能**
   - 各テーブルのゼロ日付をスキャン
   - 検出結果をレポート

2. **自動変換機能**
   - ゼロ日付をNULLまたはセンチネル値に変換
   - 変換ルールを設定可能に

3. **検証機能**
   - 変換後のデータ整合性チェック
   - ビジネスロジックへの影響確認

### 7. 結論

現在のコードベースでは、ゼロ日付は使用されていないため、PostgreSQL移行における大きな障害はないと評価できます。ただし、実際のMySQLデータベースにゼロ日付が存在する可能性があるため、データ移行時には適切な変換処理が必要です。

### 8. 関連タスク

- タスク#51: データ移行ツール作成（MySQL→PostgreSQL）- ゼロ日付変換機能の実装
- タスク#52: 移行後の整合性検証スクリプト作成 - 日付データの検証を含む

## 付録: PostgreSQLの日付型制約

PostgreSQLの日付型で使用可能な範囲：
- DATE: 4713 BC ～ 5874897 AD
- TIMESTAMP: 4713 BC ～ 294276 AD
- '0000-00-00'は範囲外のため使用不可