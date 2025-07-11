-- 提案テーブルのパフォーマンス最適化インデックスを削除 -- engineer_proposalsテーブルのインデックス削除 DROP INDEX IF EXISTS idx_engineer_proposals_user_status_created;
DROP INDEX IF EXISTS idx_engineer_proposals_project_deleted;
DROP INDEX IF EXISTS idx_engineer_proposals_status_created;
DROP INDEX IF EXISTS idx_engineer_proposals_responded_at;
-- engineer_proposal_questionsテーブルのインデックス削除 DROP INDEX IF EXISTS idx_proposal_questions_proposal_deleted;
DROP INDEX IF EXISTS idx_proposal_questions_sales_responded;
DROP INDEX IF EXISTS idx_proposal_questions_user_created;
DROP INDEX IF EXISTS idx_proposal_questions_responded_created;
