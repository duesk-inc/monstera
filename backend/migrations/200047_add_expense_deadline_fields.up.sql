-- 経費申請に期限関連フィールドを追加
ALTER TABLE expenses
ADD COLUMN deadline_at DATETIME(3) DEFAULT NULL COMMENT '申請期限',
ADD COLUMN expired_at DATETIME(3) DEFAULT NULL COMMENT '期限切れ日時',
ADD COLUMN auto_expire_enabled BOOLEAN DEFAULT TRUE COMMENT '自動期限切れ有効化フラグ',
ADD COLUMN expiry_notification_sent BOOLEAN DEFAULT FALSE COMMENT '期限切れ通知送信済みフラグ',
ADD COLUMN reminder_sent_at DATETIME(3) DEFAULT NULL COMMENT 'リマインダー送信日時',
ADD INDEX idx_expenses_deadline (deadline_at),
ADD INDEX idx_expenses_expired_at (expired_at);

-- ステータスENUMに期限切れステータスを追加
ALTER TABLE expenses 
MODIFY COLUMN status ENUM('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled', 'expired') 
DEFAULT 'draft' NOT NULL COMMENT '申請ステータス';

-- 既存の申請中データに期限を設定（申請日から30日後）
UPDATE expenses 
SET deadline_at = DATE_ADD(created_at, INTERVAL 30 DAY)
WHERE status = 'submitted' 
AND deadline_at IS NULL;

-- 期限管理設定テーブルを作成
CREATE TABLE IF NOT EXISTS expense_deadline_settings (
    id VARCHAR(36) NOT NULL,
    scope VARCHAR(50) NOT NULL DEFAULT 'global' COMMENT 'スコープ（global, department, user）',
    scope_id VARCHAR(36) DEFAULT NULL COMMENT '部門IDまたはユーザーID',
    default_deadline_days INT NOT NULL DEFAULT 30 COMMENT 'デフォルト期限日数',
    reminder_days_before INT NOT NULL DEFAULT 3 COMMENT 'リマインダー送信日数（期限の何日前）',
    auto_expire_enabled BOOLEAN DEFAULT TRUE COMMENT '自動期限切れ有効化',
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_expense_deadline_scope (scope, scope_id),
    INDEX idx_expense_deadline_scope (scope, scope_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='経費申請期限設定';

-- デフォルトの期限設定を追加
INSERT INTO expense_deadline_settings (
    id,
    scope,
    scope_id,
    default_deadline_days,
    reminder_days_before,
    auto_expire_enabled,
    created_by
) VALUES (
    UUID(),
    'global',
    NULL,
    30,
    3,
    TRUE,
    '00000000-0000-0000-0000-000000000000'
);