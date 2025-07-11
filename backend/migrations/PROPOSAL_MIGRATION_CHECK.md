# 提案情報確認機能 マイグレーション確認ガイド

## 概要
このドキュメントは、提案情報確認機能のデータベースマイグレーションが正常に実行されることを確認するためのガイドです。

## マイグレーションファイル

### 1. 200040_create_proposals_table.up.sql
- **テーブル名**: `proposals`
- **説明**: エンジニアに対して個別提案された案件情報を管理するテーブル
- **主なカラム**:
  - `id` (VARCHAR(36)): 主キー、UUID
  - `project_id` (VARCHAR(36)): monstera_poc.projects.id参照
  - `user_id` (VARCHAR(36)): エンジニアID
  - `status` (ENUM): 提案ステータス ('proposed', 'proceed', 'declined')
  - `responded_at` (DATETIME): 回答日時
  - `created_at`, `updated_at`, `deleted_at`: タイムスタンプ
- **インデックス**:
  - ユーザーID、プロジェクトID、ステータス、日時でインデックス作成
  - ユニーク制約: (project_id, user_id, deleted_at)

### 2. 200041_create_proposal_questions_table.up.sql
- **テーブル名**: `proposal_questions`
- **説明**: エンジニアが提案に対して行う質問と、営業担当者からの回答を管理するテーブル
- **主なカラム**:
  - `id` (VARCHAR(36)): 主キー、UUID
  - `proposal_id` (VARCHAR(36)): 提案ID
  - `question_text` (TEXT): 質問内容
  - `response_text` (TEXT): 回答内容
  - `sales_user_id` (VARCHAR(36)): 営業担当者ID
  - `is_responded` (BOOLEAN): 回答済みフラグ
  - `responded_at` (DATETIME): 回答日時
  - `created_at`, `updated_at`, `deleted_at`: タイムスタンプ
- **外部キー制約**:
  - `proposal_id` → `proposals.id` (CASCADE DELETE)
  - `sales_user_id` → `users.id` (SET NULL ON DELETE)

## マイグレーション実行手順

### 1. Docker環境での実行
```bash
# Dockerコンテナにアクセス
docker-compose exec backend bash

# マイグレーション状態確認
migrate -path migrations -database "mysql://root:password@tcp(mysql:3306)/monstera" version

# マイグレーション実行（未適用の場合）
migrate -path migrations -database "mysql://root:password@tcp(mysql:3306)/monstera" up
```

### 2. ローカル環境での実行
```bash
# バックエンドディレクトリに移動
cd backend

# マイグレーション実行
migrate -path migrations -database "mysql://root:password@tcp(localhost:3306)/monstera" up
```

## 確認項目

### 1. テーブルの存在確認
```sql
-- proposalsテーブルの確認
SHOW CREATE TABLE proposals;

-- proposal_questionsテーブルの確認
SHOW CREATE TABLE proposal_questions;
```

### 2. カラムとデータ型の確認
```sql
-- proposalsテーブルのカラム確認
DESCRIBE proposals;

-- proposal_questionsテーブルのカラム確認
DESCRIBE proposal_questions;
```

### 3. インデックスの確認
```sql
-- proposalsテーブルのインデックス確認
SHOW INDEX FROM proposals;

-- proposal_questionsテーブルのインデックス確認
SHOW INDEX FROM proposal_questions;
```

### 4. 外部キー制約の確認
```sql
-- 外部キー制約の確認
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE 
    TABLE_SCHEMA = 'monstera'
    AND TABLE_NAME IN ('proposals', 'proposal_questions')
    AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### 5. monstera_poc.projectsテーブルとの連携確認
```sql
-- プロジェクトテーブルの存在確認（monstera_pocデータベース）
SELECT 
    SCHEMA_NAME,
    TABLE_NAME 
FROM 
    INFORMATION_SCHEMA.TABLES 
WHERE 
    SCHEMA_NAME = 'monstera_poc' 
    AND TABLE_NAME = 'projects';
```

## トラブルシューティング

### エラー: "Table already exists"
既にテーブルが存在する場合は、現在のマイグレーションバージョンを確認してください。

### エラー: "Foreign key constraint fails"
monstera_poc.projectsテーブルが存在しない、またはusersテーブルに問題がある可能性があります。

### ロールバック手順
問題が発生した場合は、以下のコマンドでロールバックできます：
```bash
# 1つ前のバージョンに戻す
migrate -path migrations -database "mysql://root:password@tcp(mysql:3306)/monstera" down 1
```

## 動作確認用SQLサンプル

### テストデータの挿入
```sql
-- テスト用エンジニアユーザーの確認
SELECT id, first_name, last_name FROM users WHERE role = 1 LIMIT 1;

-- テスト用提案データの挿入（user_idは実際のIDに置き換えてください）
INSERT INTO proposals (id, project_id, user_id, status, created_at) 
VALUES (UUID(), 'test-project-001', 'YOUR-USER-ID', 'proposed', NOW());

-- 挿入したデータの確認
SELECT * FROM proposals WHERE project_id = 'test-project-001';
```

## 確認完了チェックリスト

- [ ] マイグレーションファイルが存在することを確認
- [ ] マイグレーションが正常に実行されることを確認
- [ ] proposalsテーブルが作成されていることを確認
- [ ] proposal_questionsテーブルが作成されていることを確認
- [ ] 全てのカラムが正しいデータ型で作成されていることを確認
- [ ] インデックスが正しく作成されていることを確認
- [ ] 外部キー制約が正しく設定されていることを確認
- [ ] テストデータの挿入・取得が正常に動作することを確認

## 注意事項

1. **monstera_pocデータベースとの連携**
   - proposals.project_idはmonstera_poc.projects.idを参照しますが、外部キー制約は設定されていません
   - アプリケーション層で整合性を保つ必要があります

2. **論理削除の実装**
   - deleted_atカラムによる論理削除が実装されています
   - 削除時はdeleted_atに日時を設定してください

3. **ユニーク制約**
   - 同一プロジェクトに対して同一エンジニアへの提案は1つまでです（論理削除されたものを除く）