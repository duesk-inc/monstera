-- 部分インデックスを元のUNIQUE制約に戻す
-- 注意: これにより、PostgreSQLでの動作がMySQLと異なるようになります

-- =====================================
-- project_assignments テーブル
-- =====================================

-- 部分インデックスを削除
DROP INDEX IF EXISTS idx_project_assignments_active;

-- 元のUNIQUE制約を再作成（複合インデックス）
CREATE UNIQUE INDEX idx_project_assignments_active 
ON project_assignments (project_id, user_id, deleted_at);

-- =====================================
-- proposals テーブル
-- =====================================

-- 部分インデックスを削除
DROP INDEX IF EXISTS idx_proposal_user_project;

-- 元のUNIQUE制約を再作成（複合インデックス）
CREATE UNIQUE INDEX idx_proposal_user_project 
ON proposals (project_id, user_id, deleted_at);

-- 注意事項：
-- このDOWNマイグレーションを実行すると、PostgreSQLでは
-- (project_id, user_id, NULL) の組み合わせが複数存在可能になります。
-- これはMySQLの動作とは異なります。