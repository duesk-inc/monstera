-- 通知関連テーブルの作成

-- 1. 通知テンプレートテーブル
CREATE TABLE IF NOT EXISTS notification_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  variables JSONB, -- 利用可能な変数のリスト
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')
);

-- コメント
COMMENT ON TABLE notification_templates IS '通知テンプレートテーブル';
COMMENT ON COLUMN notification_templates.name IS 'テンプレート名（一意）';
COMMENT ON COLUMN notification_templates.title IS '通知タイトル';
COMMENT ON COLUMN notification_templates.body IS '通知本文';
COMMENT ON COLUMN notification_templates.type IS '通知タイプ';
COMMENT ON COLUMN notification_templates.variables IS '利用可能な変数（JSON形式）';
COMMENT ON COLUMN notification_templates.is_active IS '有効フラグ';

-- インデックス
CREATE INDEX idx_notification_templates_name ON notification_templates(name);
CREATE INDEX idx_notification_templates_is_active ON notification_templates(is_active);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. ユーザー通知テーブル
CREATE TABLE IF NOT EXISTS user_notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL, -- Cognito Sub
  notification_template_id VARCHAR(36),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  priority INTEGER DEFAULT 0,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  action_url VARCHAR(500),
  metadata JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_notifications_template FOREIGN KEY (notification_template_id) REFERENCES notification_templates(id) ON DELETE SET NULL
);

-- コメント
COMMENT ON TABLE user_notifications IS 'ユーザー通知テーブル';
COMMENT ON COLUMN user_notifications.user_id IS '受信者ID（Cognito Sub）';
COMMENT ON COLUMN user_notifications.notification_template_id IS '通知テンプレートID';
COMMENT ON COLUMN user_notifications.type IS '通知タイプ';
COMMENT ON COLUMN user_notifications.priority IS '優先度（0:低、1:中、2:高）';
COMMENT ON COLUMN user_notifications.is_read IS '既読フラグ';
COMMENT ON COLUMN user_notifications.read_at IS '既読日時';
COMMENT ON COLUMN user_notifications.action_url IS 'アクションURL';
COMMENT ON COLUMN user_notifications.metadata IS 'メタデータ（JSON形式）';
COMMENT ON COLUMN user_notifications.expires_at IS '有効期限';

-- インデックス
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX idx_user_notifications_type ON user_notifications(type);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_expires_at ON user_notifications(expires_at);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_user_notifications_updated_at
    BEFORE UPDATE ON user_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. 通知設定テーブル
CREATE TABLE IF NOT EXISTS notification_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL, -- Cognito Sub
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  CONSTRAINT fk_notification_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE(user_id, notification_type)
);

-- コメント
COMMENT ON TABLE notification_settings IS '通知設定テーブル';
COMMENT ON COLUMN notification_settings.user_id IS 'ユーザーID（Cognito Sub）';
COMMENT ON COLUMN notification_settings.notification_type IS '通知タイプ';
COMMENT ON COLUMN notification_settings.email_enabled IS 'メール通知有効フラグ';
COMMENT ON COLUMN notification_settings.push_enabled IS 'プッシュ通知有効フラグ';
COMMENT ON COLUMN notification_settings.in_app_enabled IS 'アプリ内通知有効フラグ';

-- インデックス
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 通知履歴テーブル
CREATE TABLE IF NOT EXISTS notification_histories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  notification_id VARCHAR(36),
  recipient_id VARCHAR(255) NOT NULL, -- Cognito Sub
  sender_id VARCHAR(255), -- Cognito Sub
  channel VARCHAR(20) NOT NULL, -- email, push, in_app
  status VARCHAR(20) NOT NULL, -- pending, sent, failed
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  CONSTRAINT fk_notification_histories_notification FOREIGN KEY (notification_id) REFERENCES user_notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_histories_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_histories_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- コメント
COMMENT ON TABLE notification_histories IS '通知履歴テーブル';
COMMENT ON COLUMN notification_histories.notification_id IS '通知ID';
COMMENT ON COLUMN notification_histories.recipient_id IS '受信者ID（Cognito Sub）';
COMMENT ON COLUMN notification_histories.sender_id IS '送信者ID（Cognito Sub）';
COMMENT ON COLUMN notification_histories.channel IS '通知チャネル';
COMMENT ON COLUMN notification_histories.status IS 'ステータス';
COMMENT ON COLUMN notification_histories.sent_at IS '送信日時';
COMMENT ON COLUMN notification_histories.failed_at IS '失敗日時';
COMMENT ON COLUMN notification_histories.error_message IS 'エラーメッセージ';

-- インデックス
CREATE INDEX idx_notification_histories_notification_id ON notification_histories(notification_id);
CREATE INDEX idx_notification_histories_recipient_id ON notification_histories(recipient_id);
CREATE INDEX idx_notification_histories_status ON notification_histories(status);
CREATE INDEX idx_notification_histories_created_at ON notification_histories(created_at DESC);

-- 5. リマインダー設定テーブル
CREATE TABLE IF NOT EXISTS reminder_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  reminder_type VARCHAR(50) NOT NULL,
  schedule_pattern VARCHAR(100) NOT NULL, -- cron形式
  target_query TEXT, -- 対象ユーザーを特定するSQL
  notification_template_id VARCHAR(36) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_executed_at TIMESTAMP,
  next_execution_at TIMESTAMP,
  updated_by VARCHAR(255), -- Cognito Sub
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  CONSTRAINT fk_reminder_settings_template FOREIGN KEY (notification_template_id) REFERENCES notification_templates(id),
  CONSTRAINT fk_reminder_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- コメント
COMMENT ON TABLE reminder_settings IS 'リマインダー設定テーブル';
COMMENT ON COLUMN reminder_settings.reminder_type IS 'リマインダータイプ（週報、経費等）';
COMMENT ON COLUMN reminder_settings.schedule_pattern IS 'スケジュールパターン（cron形式）';
COMMENT ON COLUMN reminder_settings.target_query IS '対象ユーザー特定クエリ';
COMMENT ON COLUMN reminder_settings.updated_by IS '更新者ID（Cognito Sub）';

-- インデックス
CREATE INDEX idx_reminder_settings_is_active ON reminder_settings(is_active);
CREATE INDEX idx_reminder_settings_next_execution_at ON reminder_settings(next_execution_at);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_reminder_settings_updated_at
    BEFORE UPDATE ON reminder_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();