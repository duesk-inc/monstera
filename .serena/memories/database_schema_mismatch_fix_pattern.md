# データベーススキーマ不整合修正パターン

## パターン概要
モデル定義とデータベーススキーマの不整合を修正する標準的なアプローチ

## 問題の特徴
- GORMモデルにフィールドが定義されている
- データベーステーブルに対応するカラムが存在しない
- SQL実行時にエラー（SQLSTATE 42703など）が発生

## 修正手順

### 1. 問題の確認
```bash
# スキーマ確認
docker-compose exec postgres psql -U postgres -d monstera -c "\d テーブル名"

# エラーログ確認
docker-compose logs backend | grep "column.*does not exist"
```

### 2. マイグレーションファイル作成
```sql
-- up.sql
ALTER TABLE テーブル名 
ADD COLUMN IF NOT EXISTS カラム名 データ型 NULL;

CREATE INDEX IF NOT EXISTS idx_テーブル名_カラム名 
ON テーブル名(カラム名);

-- 必要に応じて外部キー制約
ALTER TABLE テーブル名
ADD CONSTRAINT fk_テーブル名_参照先 
FOREIGN KEY (カラム名) 
REFERENCES 参照テーブル(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- down.sql
ALTER TABLE テーブル名 
DROP CONSTRAINT IF EXISTS fk_テーブル名_参照先;

DROP INDEX IF EXISTS idx_テーブル名_カラム名;

ALTER TABLE テーブル名 
DROP COLUMN IF EXISTS カラム名;
```

### 3. マイグレーション適用
```bash
docker-compose exec backend migrate \
  -path migrations \
  -database "postgres://postgres:postgres@postgres:5432/monstera?sslmode=disable" \
  up
```

### 4. 検証
- 機能テスト実施
- エラーログ確認
- パフォーマンス確認

## 注意事項
- NULLABLEカラムとして追加（既存データへの影響最小化）
- IF NOT EXISTSを使用（冪等性確保）
- downマイグレーションも必ず作成
- 本番適用前にステージング環境で検証

## 予防策
- モデル変更時は必ずマイグレーションも作成
- CI/CDでスキーマとモデルの整合性チェック
- 定期的なスキーマ監査

## 関連事例
- 2025-01-19: notificationsテーブルrecipient_id追加
  - 調査: bug-investigate_20250119_2053.md
  - 計画: bug-plan_20250119_2100.md