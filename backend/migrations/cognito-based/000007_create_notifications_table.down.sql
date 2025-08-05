-- 通知関連テーブルの削除

-- トリガーの削除
DROP TRIGGER IF EXISTS update_reminder_settings_updated_at ON reminder_settings;
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
DROP TRIGGER IF EXISTS update_user_notifications_updated_at ON user_notifications;
DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;

-- インデックスの削除
-- reminder_settings
DROP INDEX IF EXISTS idx_reminder_settings_next_execution_at;
DROP INDEX IF EXISTS idx_reminder_settings_is_active;

-- notification_histories
DROP INDEX IF EXISTS idx_notification_histories_created_at;
DROP INDEX IF EXISTS idx_notification_histories_status;
DROP INDEX IF EXISTS idx_notification_histories_recipient_id;
DROP INDEX IF EXISTS idx_notification_histories_notification_id;

-- notification_settings
DROP INDEX IF EXISTS idx_notification_settings_user_id;

-- user_notifications
DROP INDEX IF EXISTS idx_user_notifications_expires_at;
DROP INDEX IF EXISTS idx_user_notifications_created_at;
DROP INDEX IF EXISTS idx_user_notifications_type;
DROP INDEX IF EXISTS idx_user_notifications_is_read;
DROP INDEX IF EXISTS idx_user_notifications_user_id;

-- notification_templates
DROP INDEX IF EXISTS idx_notification_templates_is_active;
DROP INDEX IF EXISTS idx_notification_templates_name;

-- テーブルの削除（依存関係の順序で削除）
DROP TABLE IF EXISTS reminder_settings CASCADE;
DROP TABLE IF EXISTS notification_histories CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;