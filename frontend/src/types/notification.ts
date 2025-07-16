/**
 * 通知タイプの定義
 */
export type NotificationType = 'leave' | 'expense' | 'weekly' | 'project' | 'system' | 
  'weekly_report_reminder' | 'weekly_report_submitted' | 'weekly_report_overdue' | 
  'weekly_report_escalation' | 'export_complete' | 'export_failed' | 'alert_triggered' | 
  'system_maintenance' | 'bulk_reminder_complete' | 'bulk_reminder_failed';

/**
 * 通知優先度の定義
 */
export type NotificationPriority = 'low' | 'medium' | 'high';

/**
 * 通知オブジェクトの型定義（バックエンドレスポンス用）
 */
export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  priority: NotificationPriority;
  created_at: string;
  expires_at?: string;
  reference_id?: string;
  reference_type?: string;
}

/**
 * 通知オブジェクトの型定義（フロントエンド用 - convertSnakeToCamel変換後）
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  notificationType: NotificationType;
  priority: NotificationPriority;
  createdAt: string;
  expiresAt?: string;
  referenceId?: string;
  referenceType?: string;
}

/**
 * ユーザー通知オブジェクトの型定義（バックエンドレスポンス用）
 */
export interface UserNotificationResponse {
  id: string;
  notification: NotificationResponse;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

/**
 * ユーザー通知オブジェクトの型定義（フロントエンド用 - convertSnakeToCamel変換後）
 */
export interface UserNotification {
  id: string;
  notification: Notification;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

/**
 * ユーザー通知一覧レスポンスの型定義（バックエンドレスポンス用）
 */
export interface UserNotificationListResponse {
  notifications: UserNotificationResponse[];
  unread_count: number;
  total_count: number;
}

/**
 * ユーザー通知一覧レスポンスの型定義（フロントエンド用 - convertSnakeToCamel変換後）
 */
export interface UserNotificationList {
  notifications: UserNotification[];
  unreadCount: number;
  totalCount: number;
}

/**
 * 通知設定オブジェクトの型定義（バックエンドレスポンス用）
 */
export interface NotificationSettingResponse {
  id: string;
  notification_type: NotificationType;
  is_enabled: boolean;
  email_enabled: boolean;
  slack_enabled?: boolean;
  slack_channel?: string;
  conditions?: NotificationConditionResponse[];
  created_at: string;
  updated_at: string;
}

/**
 * 通知設定オブジェクトの型定義（フロントエンド用 - convertSnakeToCamel変換後）
 */
export interface NotificationSetting {
  id: string;
  notificationType: NotificationType;
  isEnabled: boolean;
  emailEnabled: boolean;
  slackEnabled?: boolean;
  slackChannel?: string;
  conditions?: NotificationCondition[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 通知設定一覧レスポンスの型定義（バックエンドレスポンス用）
 */
export interface NotificationSettingsListResponse {
  settings: NotificationSettingResponse[];
}

/**
 * 通知設定一覧レスポンスの型定義（フロントエンド用 - convertSnakeToCamel変換後）
 */
export interface NotificationSettingsList {
  settings: NotificationSetting[];
}

/**
 * 既読化リクエストの型定義
 */
export interface MarkAsReadRequest {
  notification_ids: string[];
}

/**
 * 通知設定更新リクエストの型定義
 */
export interface UpdateNotificationSettingRequest {
  notification_type: NotificationType;
  is_enabled: boolean;
  email_enabled: boolean;
  slack_enabled?: boolean;
  slack_channel?: string;
  conditions?: NotificationConditionRequest[];
}

/**
 * 通知条件の型定義（バックエンドレスポンス用）
 */
export interface NotificationConditionResponse {
  id: string;
  condition_type: NotificationConditionType;
  operator: NotificationOperator;
  value: string;
  is_enabled: boolean;
}

/**
 * 通知条件の型定義（フロントエンド用）
 */
export interface NotificationCondition {
  id: string;
  conditionType: NotificationConditionType;
  operator: NotificationOperator;
  value: string;
  isEnabled: boolean;
}

/**
 * 通知条件作成/更新リクエストの型定義
 */
export interface NotificationConditionRequest {
  condition_type: NotificationConditionType;
  operator: NotificationOperator;
  value: string;
  is_enabled: boolean;
}

/**
 * 通知条件タイプの定義
 */
export type NotificationConditionType = 
  | 'time_of_day'        // 時刻条件
  | 'day_of_week'        // 曜日条件
  | 'urgency_level'      // 緊急度レベル
  | 'user_role'          // ユーザーロール
  | 'department'         // 部署
  | 'working_hours'      // 稼働時間
  | 'consecutive_days';  // 連続日数

/**
 * 通知条件演算子の定義
 */
export type NotificationOperator = 
  | 'equals'             // 等しい
  | 'not_equals'         // 等しくない
  | 'greater_than'       // より大きい
  | 'less_than'          // より小さい
  | 'greater_equal'      // 以上
  | 'less_equal'         // 以下
  | 'contains'           // 含む
  | 'not_contains'       // 含まない
  | 'in'                 // いずれかに含まれる
  | 'not_in';            // いずれにも含まれない

/**
 * Slack設定の型定義
 */
export interface SlackSettings {
  webhookUrl?: string;
  defaultChannel?: string;
  enabled: boolean;
}

/**
 * 通知テンプレートの型定義
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  emailBody: string;
  slackMessage: string;
  variables: string[];
} 