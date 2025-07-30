-- PostgreSQL用: 論理削除を含むUNIQUE制約を部分インデックスに変換
-- MySQLとPostgreSQLでの複合UNIQUE制約におけるNULL値の扱いの違いに対応

-- =====================================
-- project_assignments テーブル
-- =====================================

-- project_assignmentsテーブルが存在する場合のみ処理
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_assignments') THEN
        -- 既存のUNIQUE制約を削除
        DROP INDEX IF EXISTS idx_project_assignments_active;

        -- 部分インデックスとして再作成
        -- deleted_atがNULLの場合のみ、project_idとuser_idの組み合わせを一意にする
        CREATE UNIQUE INDEX idx_project_assignments_active 
        ON project_assignments (project_id, user_id) 
        WHERE deleted_at IS NULL;

        -- コメント追加
        COMMENT ON INDEX idx_project_assignments_active IS 
        'アクティブなアサインメント（論理削除されていない）に対する一意性制約';
    END IF;
END $$;

-- =====================================
-- proposals テーブル
-- =====================================

-- proposalsテーブルが存在する場合のみ処理
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals') THEN
        -- 既存のUNIQUE制約を削除
        DROP INDEX IF EXISTS idx_proposal_user_project;

        -- 部分インデックスとして再作成
        -- deleted_atがNULLの場合のみ、project_idとuser_idの組み合わせを一意にする
        CREATE UNIQUE INDEX idx_proposal_user_project 
        ON proposals (project_id, user_id) 
        WHERE deleted_at IS NULL;

        -- コメント追加
        COMMENT ON INDEX idx_proposal_user_project IS 
        'アクティブな提案（論理削除されていない）に対する一意性制約';
    END IF;
END $$;

-- =====================================
-- 使用例と説明
-- =====================================

-- 部分インデックスの利点：
-- 1. MySQLと同じ動作を実現（deleted_at = NULLの組み合わせは一意）
-- 2. 論理削除されたレコードは制約から除外される
-- 3. パフォーマンスの最適化（アクティブなレコードのみインデックス化）

-- テスト例：
-- INSERT INTO project_assignments (id, project_id, user_id, ...) VALUES ('1', 'proj1', 'user1', ...);
-- INSERT INTO project_assignments (id, project_id, user_id, ...) VALUES ('2', 'proj1', 'user1', ...);
-- → エラー: 重複キー違反

-- UPDATE project_assignments SET deleted_at = NOW() WHERE id = '1';
-- INSERT INTO project_assignments (id, project_id, user_id, ...) VALUES ('3', 'proj1', 'user1', ...);
-- → 成功: 論理削除されたレコードは制約対象外