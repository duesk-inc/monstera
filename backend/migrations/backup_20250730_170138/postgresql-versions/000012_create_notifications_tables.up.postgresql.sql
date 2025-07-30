CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('leave', 'expense', 'weekly', 'project', 'system')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  expires_at TIMESTAMP(3),
  reference_id VARCHAR(36),
  reference_type VARCHAR(50),
  updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP(3) NULL
);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE notifications IS '通知マスタテーブル';
COMMENT ON COLUMN notifications.title IS '通知タイトル';
COMMENT ON COLUMN notifications.message IS '通知メッセージ';
COMMENT ON COLUMN notifications.notification_type IS '通知タイプ';
COMMENT ON COLUMN notifications.priority IS '優先度';
COMMENT ON COLUMN notifications.created_at IS '作成日時';
COMMENT ON COLUMN notifications.expires_at IS '有効期限';
COMMENT ON COLUMN notifications.reference_id IS '関連リソースID';
COMMENT ON COLUMN notifications.reference_type IS '関連リソースタイプ';
COMMENT ON COLUMN notifications.updated_at IS '更新日時';
COMMENT ON COLUMN notifications.deleted_at IS '削除日時';
CREATE TABLE IF NOT EXISTS user_notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  notification_id VARCHAR(36) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_notifications_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE user_notifications IS 'ユーザー通知関連テーブル';
COMMENT ON COLUMN user_notifications.user_id IS 'ユーザーID';
COMMENT ON COLUMN user_notifications.notification_id IS '通知ID';
COMMENT ON COLUMN user_notifications.is_read IS '既読フラグ';
COMMENT ON COLUMN user_notifications.read_at IS '既読日時';
COMMENT ON COLUMN user_notifications.created_at IS '作成日時';
COMMENT ON COLUMN user_notifications.updated_at IS '更新日時';
COMMENT ON COLUMN user_notifications.deleted_at IS '削除日時';

-- インデックスの作成
CREATE INDEX idx_user_notification ON user_notifications (user_id, notification_id);
CREATE INDEX idx_user_read_status ON user_notifications (user_id, is_read);
CREATE TABLE IF NOT EXISTS notification_settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('leave', 'expense', 'weekly', 'project', 'system')),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_notification_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT idx_user_notification_type UNIQUE (user_id, notification_type)
);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE notification_settings IS '通知設定テーブル';
COMMENT ON COLUMN notification_settings.user_id IS 'ユーザーID';
COMMENT ON COLUMN notification_settings.notification_type IS '通知タイプ';
COMMENT ON COLUMN notification_settings.is_enabled IS '有効フラグ';
COMMENT ON COLUMN notification_settings.email_enabled IS 'メール通知フラグ';
COMMENT ON COLUMN notification_settings.created_at IS '作成日時';
COMMENT ON COLUMN notification_settings.updated_at IS '更新日時';
COMMENT ON COLUMN notification_settings.deleted_at IS '削除日時';


-- Triggers for automatic timestamp updates

-- Trigger for notifications table
CREATE OR REPLACE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_notifications table
CREATE OR REPLACE TRIGGER update_user_notifications_updated_at
    BEFORE UPDATE ON user_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for notification_settings table
CREATE OR REPLACE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
