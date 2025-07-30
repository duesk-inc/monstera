-- 提案テーブルのパフォーマンス最適化インデックス

-- engineer_proposalsテーブルのインデックス
-- ユーザーID + ステータス + 作成日時の複合インデックス（頻繁な検索パターン）
CREATE INDEX IF NOT EXISTS idx_engineer_proposals_user_status_created 
ON engineer_proposals(user_id, status, created_at DESC);

-- プロジェクトID + 削除フラグのインデックス（プロジェクト別提案検索用）
CREATE INDEX IF NOT EXISTS idx_engineer_proposals_project_deleted 
ON engineer_proposals(project_id, deleted_at);

-- ステータス + 作成日時のインデックス（管理者向け検索用）
CREATE INDEX IF NOT EXISTS idx_engineer_proposals_status_created 
ON engineer_proposals(status, created_at DESC);

-- 回答日時のインデックス（統計クエリ用）
CREATE INDEX IF NOT EXISTS idx_engineer_proposals_responded_at 
ON engineer_proposals(responded_at) 
WHERE responded_at IS NOT NULL;

-- engineer_proposal_questionsテーブルのインデックス
-- 提案ID + 削除フラグのインデックス（質問一覧取得用）
CREATE INDEX IF NOT EXISTS idx_proposal_questions_proposal_deleted 
ON engineer_proposal_questions(proposal_id, deleted_at);

-- 営業担当者ID + 回答フラグのインデックス（未回答質問検索用）
CREATE INDEX IF NOT EXISTS idx_proposal_questions_sales_responded 
ON engineer_proposal_questions(sales_user_id, is_responded) 
WHERE sales_user_id IS NOT NULL;

-- ユーザーID + 作成日時のインデックス（ユーザー別質問検索用）
CREATE INDEX IF NOT EXISTS idx_proposal_questions_user_created 
ON engineer_proposal_questions(user_id, created_at DESC);

-- 回答フラグ + 作成日時のインデックス（未回答質問一覧用）
CREATE INDEX IF NOT EXISTS idx_proposal_questions_responded_created 
ON engineer_proposal_questions(is_responded, created_at DESC) 
WHERE is_responded = false;

-- 統計情報を更新（PostgreSQLの場合）
-- ANALYZE engineer_proposals;
-- ANALYZE engineer_proposal_questions;