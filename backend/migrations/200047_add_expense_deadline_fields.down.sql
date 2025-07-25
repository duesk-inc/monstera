-- 期限管理設定テーブルを削除
DROP TABLE IF EXISTS expense_deadline_settings;

-- ステータスENUMから期限切れステータスを削除
ALTER TABLE expenses 
MODIFY COLUMN status ENUM('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled') 
DEFAULT 'draft' NOT NULL COMMENT '申請ステータス';

-- 期限関連フィールドを削除
ALTER TABLE expenses
DROP COLUMN deadline_at,
DROP COLUMN expired_at,
DROP COLUMN auto_expire_enabled,
DROP COLUMN expiry_notification_sent,
DROP COLUMN reminder_sent_at;