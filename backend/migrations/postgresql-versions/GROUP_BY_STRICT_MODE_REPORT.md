# PostgreSQL GROUP BY句の厳格化対応レポート

## 概要

PostgreSQLでは、MySQLよりもGROUP BY句に対する制約が厳格です。SELECT句に指定した非集約カラムは、すべてGROUP BY句に含める必要があります。

## 調査結果

### 1. GROUP BY句を含むファイル一覧

1. `check_proposal_tables.postgresql.sql`
2. `200006_configure_wal_settings.up.postgresql.sql`
3. `200052_create_archive_procedures.up.postgresql.sql`
4. `000025_create_user_skill_summary_view.up.postgresql.sql`
5. `000026_create_user_it_experience_view.up.postgresql.sql`

### 2. 各ファイルの分析結果

#### 2.1 check_proposal_tables.postgresql.sql
- **行番号**: 25
- **問題**: なし
- **現在のクエリ**:
  ```sql
  SELECT status, COUNT(*) AS count 
  FROM proposals 
  WHERE deleted_at IS NULL 
  GROUP BY status;
  ```
- **分析**: SELECT句のstatusはGROUP BYに含まれており、COUNT(*)は集約関数なので問題なし

#### 2.2 200006_configure_wal_settings.up.postgresql.sql
- **行番号**: 205
- **問題**: なし
- **現在のクエリ**:
  ```sql
  SELECT 
      was.status,
      COUNT(*) as count,
      MIN(was.archived_at) as oldest_file,
      MAX(was.archived_at) as newest_file,
      ROUND(SUM(was.file_size) / 1024.0 / 1024.0, 2) as total_size_mb
  FROM wal_archive_status was
  WHERE was.archived_at >= NOW() - (days_to_check || ' days')::INTERVAL
  GROUP BY was.status
  ORDER BY was.status;
  ```
- **分析**: SELECT句のstatusはGROUP BYに含まれており、その他は全て集約関数なので問題なし

#### 2.3 200052_create_archive_procedures.up.postgresql.sql
- **行番号**: 67-71（複数のGROUP BY）
- **問題**: このファイルはMySQL構文のままでPostgreSQL化されていない
- **必要な対応**:
  1. プロシージャ全体をPL/pgSQL関数に変換
  2. DELIMITER文の削除
  3. MySQL固有の関数をPostgreSQL互換に変換

#### 2.4 000025_create_user_skill_summary_view.up.postgresql.sql
- **行番号**: 1（CREATE VIEW内のGROUP BY）
- **問題**: GROUP BY句に全ての非集約カラムが含まれていない
- **現在のGROUP BY**:
  ```sql
  GROUP BY 
      wh.user_id, 
      wht.technology_name, 
      tc.name, 
      tc.display_name, 
      tm.display_name, 
      tm.usage_count, 
      tm.sort_order, 
      u.email, 
      u.last_name, 
      u.first_name
  ```
- **必要な修正**: tc.sort_orderが不足している可能性

#### 2.5 000026_create_user_it_experience_view.up.postgresql.sql
- **行番号**: 1（CREATE VIEW内のGROUP BY）
- **問題**: なし
- **現在のGROUP BY**:
  ```sql
  GROUP BY u.id, u.email, u.last_name, u.first_name
  ```
- **分析**: SELECT句の非集約カラムは全てGROUP BYに含まれている

### 3. 修正が必要なファイル

1. **200052_create_archive_procedures.up.postgresql.sql**
   - MySQL構文のままなので、PL/pgSQL関数への変換が必要
   - タスク#15-19で対応予定

2. **000025_create_user_skill_summary_view.up.postgresql.sql**
   - tc.sort_orderをORDER BY句で使用しているが、GROUP BYに含まれていない可能性を確認

### 4. 追加確認事項

#### 4.1 バックエンドコードでのGROUP BY使用状況
repository層やservice層でのGROUP BY句を含むクエリも確認が必要：
- GORMのGroup()メソッド使用箇所
- 生SQLでのGROUP BY使用箇所

### 5. 推奨事項

1. **ビューの修正優先度を高く設定**
   - ビューは頻繁に使用されるため、GROUP BY句の問題は実行時エラーにつながる

2. **テストケースの追加**
   - GROUP BY句を含むビューやクエリに対する統合テストを追加
   - PostgreSQL環境での実行確認

3. **開発ガイドラインの更新**
   - GROUP BY句を使用する際の注意事項を文書化
   - PostgreSQLの厳格なGROUP BY要件について周知

## 6. バックエンドコードの調査結果

### 6.1 GROUP BY使用状況

リポジトリ層で以下のファイルがGROUP BY句を使用：
1. `engineer_proposal_repository.go` - 生SQLで複数のGROUP BY
2. `virus_scan_log_repository.go` - GORM `.Group()`と生SQL
3. `work_history_enhanced_repository.go` - 生SQL
4. `technology_master_enhanced_repository.go` - 生SQL（GROUP_CONCAT使用）
5. `engineer_proposal_question_repository.go` - 生SQL
6. `audit_log_repository.go` - 生SQL
7. `archive_repository.go` - GORM `.Group()`
8. `project_group_repository.go` - GORM `.Group()`

### 6.2 PostgreSQL互換性の問題

#### 重要な発見：PostgreSQLSQLAdapterの存在
バックエンドには既に`PostgreSQLSQLAdapter`が実装されており、以下の自動変換を行っている：
- `DATE_FORMAT()` → `TO_CHAR()`
- `TIMESTAMPDIFF()` → PostgreSQL日付演算
- `DATE_SUB()/DATE_ADD()` → PostgreSQLインターバル演算
- `CONCAT()` → `||`演算子
- プレースホルダー（`?` → `$1, $2, ...`）

#### 修正が必要な箇所
1. **GROUP_CONCAT関数** (`technology_master_enhanced_repository.go`)
   ```sql
   -- MySQL:
   GROUP_CONCAT(id) as technology_ids
   -- PostgreSQL:
   STRING_AGG(id::text, ',') as technology_ids
   ```

2. **WEEKDAY関数**
   - MySQL: `WEEKDAY(date)`
   - PostgreSQL: `EXTRACT(DOW FROM date)`

### 6.3 GORM使用箇所
GORM の `.Group()` メソッドを使用している箇所は、GORMが方言の違いを吸収するため、基本的に修正不要。

## 7. 完了した修正

1. **000025_create_user_skill_summary_view.up.postgresql.sql**
   - `tc.sort_order`をGROUP BY句に追加
   - ORDER BY句で使用されるすべてのカラムがGROUP BYに含まれるように修正

## まとめ

調査の結果：

### 既に対応済み
1. マイグレーションファイルのGROUP BY句は概ねPostgreSQL互換
2. バックエンドコードには`PostgreSQLSQLAdapter`が実装済みで、多くの変換を自動化
3. GORMを使用している箇所は方言の違いを自動で吸収

### 要対応項目
1. **200052_create_archive_procedures.up.postgresql.sql** - PL/pgSQL関数への変換（タスク#15-19）
2. **GROUP_CONCAT関数** - STRING_AGGへの変換が必要
3. **WEEKDAY関数** - EXTRACT(DOW FROM ...)への変換が必要

### 推奨アクション
1. `PostgreSQLSQLAdapter`にGROUP_CONCATとWEEKDAYの変換を追加
2. すべての生SQLクエリが`ExecuteRawSQL()`メソッドを使用していることを確認
3. PostgreSQL環境での統合テスト実施

全体的に、GROUP BY句の厳格化対応は既存のアダプターにより大部分が自動化されており、残りの課題も限定的です。