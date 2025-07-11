package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// NotificationType は通知タイプを表す列挙型
type NotificationType string

// NotificationPriority は通知の優先度を表す列挙型
type NotificationPriority string

// 通知タイプの定数
const (
	NotificationTypeLeave   NotificationType = "leave"
	NotificationTypeExpense NotificationType = "expense"
	NotificationTypeWeekly  NotificationType = "weekly"
	NotificationTypeProject NotificationType = "project"
	NotificationTypeSystem  NotificationType = "system"
	// 週報管理用の新しい通知タイプ
	NotificationTypeWeeklyReportReminder   NotificationType = "weekly_report_reminder"   // 週報提出リマインド
	NotificationTypeWeeklyReportSubmitted  NotificationType = "weekly_report_submitted"  // 週報提出完了
	NotificationTypeWeeklyReportOverdue    NotificationType = "weekly_report_overdue"    // 週報提出期限切れ
	NotificationTypeWeeklyReportEscalation NotificationType = "weekly_report_escalation" // 週報未提出エスカレーション
	NotificationTypeExportComplete         NotificationType = "export_complete"          // エクスポート完了
	NotificationTypeExportFailed           NotificationType = "export_failed"            // エクスポート失敗
	NotificationTypeAlertTriggered         NotificationType = "alert_triggered"          // アラート発生
	NotificationTypeSystemMaintenance      NotificationType = "system_maintenance"       // システムメンテナンス
	NotificationTypeBulkReminderComplete   NotificationType = "bulk_reminder_complete"   // 一括リマインド完了
	NotificationTypeBulkReminderFailed     NotificationType = "bulk_reminder_failed"     // 一括リマインド失敗
)

// 通知優先度の定数
const (
	NotificationPriorityLow    NotificationPriority = "low"
	NotificationPriorityMedium NotificationPriority = "medium" // 既存互換性
	NotificationPriorityNormal NotificationPriority = "normal" // 新規
	NotificationPriorityHigh   NotificationPriority = "high"
	NotificationPriorityUrgent NotificationPriority = "urgent" // 新規
)

// NotificationStatus 通知の状態
type NotificationStatus string

const (
	NotificationStatusUnread NotificationStatus = "unread" // 未読
	NotificationStatusRead   NotificationStatus = "read"   // 既読
	NotificationStatusHidden NotificationStatus = "hidden" // 非表示
)

// NotificationMetadata 通知のメタデータ（JSON形式）
type NotificationMetadata struct {
	WeeklyReportID    *uuid.UUID             `json:"weekly_report_id,omitempty"`     // 週報ID
	UserID            *uuid.UUID             `json:"user_id,omitempty"`              // 対象ユーザーID
	DepartmentID      *uuid.UUID             `json:"department_id,omitempty"`        // 対象部署ID
	ExportJobID       *uuid.UUID             `json:"export_job_id,omitempty"`        // エクスポートジョブID
	AlertID           *uuid.UUID             `json:"alert_id,omitempty"`             // アラートID
	BulkReminderJobID *uuid.UUID             `json:"bulk_reminder_job_id,omitempty"` // 一括リマインドジョブID
	StartDate         *time.Time             `json:"start_date,omitempty"`           // 開始日（週報の週など）
	EndDate           *time.Time             `json:"end_date,omitempty"`             // 終了日
	TargetUserCount   *int                   `json:"target_user_count,omitempty"`    // 対象ユーザー数
	SuccessCount      *int                   `json:"success_count,omitempty"`        // 成功数
	FailureCount      *int                   `json:"failure_count,omitempty"`        // 失敗数
	ExportFormat      *string                `json:"export_format,omitempty"`        // エクスポート形式
	ExportFilePath    *string                `json:"export_file_path,omitempty"`     // エクスポートファイルパス
	MaintenanceWindow *string                `json:"maintenance_window,omitempty"`   // メンテナンス時間
	ErrorMessage      *string                `json:"error_message,omitempty"`        // エラーメッセージ
	AdditionalData    map[string]interface{} `json:"additional_data,omitempty"`      // 追加データ
}

// Scan Scannerインターフェースの実装
func (nm *NotificationMetadata) Scan(value interface{}) error {
	if value == nil {
		*nm = NotificationMetadata{}
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, nm)
	case string:
		return json.Unmarshal([]byte(v), nm)
	default:
		return fmt.Errorf("cannot scan %T into NotificationMetadata", value)
	}
}

// Value Valuerインターフェースの実装
func (nm NotificationMetadata) Value() (driver.Value, error) {
	return json.Marshal(nm)
}

// Notification は通知マスタテーブルのモデル
type Notification struct {
	ID               uuid.UUID             `gorm:"type:char(36);primary_key;default:(UUID())" json:"id"`
	RecipientID      *uuid.UUID            `gorm:"type:char(36);index:idx_notifications_recipient" json:"recipient_id"` // 特定のユーザー宛て（nullの場合は全体通知）
	Title            string                `gorm:"type:varchar(255);not null" json:"title"`
	Message          string                `gorm:"type:text;not null" json:"message"`
	NotificationType NotificationType      `gorm:"type:varchar(50);not null;index:idx_notifications_type" json:"notification_type"`
	Priority         NotificationPriority  `gorm:"type:varchar(20);not null;default:'medium'" json:"priority"`
	Status           NotificationStatus    `gorm:"type:varchar(20);not null;default:'unread';index:idx_notifications_status" json:"status"`
	Metadata         *NotificationMetadata `gorm:"type:json" json:"metadata,omitempty"` // メタデータ
	ReadAt           *time.Time            `gorm:"type:datetime" json:"read_at,omitempty"`
	CreatedAt        time.Time             `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP;index:idx_notifications_created" json:"created_at"`
	ExpiresAt        *time.Time            `gorm:"type:datetime;index:idx_notifications_expires" json:"expires_at"`
	ReferenceID      *uuid.UUID            `gorm:"type:char(36)" json:"reference_id"`      // 互換性
	ReferenceType    *string               `gorm:"type:varchar(50)" json:"reference_type"` // 互換性
	UpdatedAt        time.Time             `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt        *time.Time            `gorm:"type:datetime" json:"deleted_at"`

	// リレーションシップ
	Recipient         *User              `gorm:"foreignKey:RecipientID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"recipient,omitempty"`
	UserNotifications []UserNotification `gorm:"foreignKey:NotificationID" json:"-"`
}

// UserNotification はユーザー通知関連テーブルのモデル
type UserNotification struct {
	ID             uuid.UUID  `gorm:"type:varchar(36);primary_key" json:"id"`
	UserID         uuid.UUID  `gorm:"type:varchar(36);not null" json:"user_id"`
	NotificationID uuid.UUID  `gorm:"type:varchar(36);not null" json:"notification_id"`
	IsRead         bool       `gorm:"type:boolean;not null;default:false" json:"is_read"`
	ReadAt         *time.Time `gorm:"type:datetime(3)" json:"read_at"`
	CreatedAt      time.Time  `gorm:"type:datetime(3);not null;default:CURRENT_TIMESTAMP(3)" json:"created_at"`
	UpdatedAt      time.Time  `gorm:"type:datetime(3);not null;default:CURRENT_TIMESTAMP(3);ON UPDATE CURRENT_TIMESTAMP(3)" json:"updated_at"`
	DeletedAt      *time.Time `gorm:"type:datetime(3)" json:"deleted_at"`

	// リレーションシップ
	User         User         `gorm:"foreignKey:UserID" json:"-"`
	Notification Notification `gorm:"foreignKey:NotificationID" json:"notification"`
}

// NotificationSetting は通知設定テーブルのモデル
type NotificationSetting struct {
	ID               uuid.UUID        `gorm:"type:varchar(36);primary_key" json:"id"`
	UserID           uuid.UUID        `gorm:"type:varchar(36);not null" json:"user_id"`
	NotificationType NotificationType `gorm:"type:enum('leave','expense','weekly','project','system');not null" json:"notification_type"`
	IsEnabled        bool             `gorm:"type:boolean;not null;default:true" json:"is_enabled"`
	EmailEnabled     bool             `gorm:"type:boolean;not null;default:false" json:"email_enabled"`
	CreatedAt        time.Time        `gorm:"type:datetime(3);not null;default:CURRENT_TIMESTAMP(3)" json:"created_at"`
	UpdatedAt        time.Time        `gorm:"type:datetime(3);not null;default:CURRENT_TIMESTAMP(3);ON UPDATE CURRENT_TIMESTAMP(3)" json:"updated_at"`
	DeletedAt        *time.Time       `gorm:"type:datetime(3)" json:"deleted_at"`

	// リレーションシップ
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName はテーブル名を指定するメソッド
func (Notification) TableName() string {
	return "notifications"
}

func (UserNotification) TableName() string {
	return "user_notifications"
}

func (NotificationSetting) TableName() string {
	return "notification_settings"
}

// BeforeCreate 作成前処理
func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

// IsExpired 通知が期限切れかチェック
func (n *Notification) IsExpired() bool {
	if n.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*n.ExpiresAt)
}

// MarkAsRead 通知を既読にする
func (n *Notification) MarkAsRead() {
	now := time.Now()
	n.Status = NotificationStatusRead
	n.ReadAt = &now
}

// MarkAsUnread 通知を未読にする
func (n *Notification) MarkAsUnread() {
	n.Status = NotificationStatusUnread
	n.ReadAt = nil
}

// Hide 通知を非表示にする
func (n *Notification) Hide() {
	n.Status = NotificationStatusHidden
}

// GetPriorityLevel 優先度の数値レベルを取得（高いほど重要）
func (n *Notification) GetPriorityLevel() int {
	switch n.Priority {
	case NotificationPriorityUrgent:
		return 5
	case NotificationPriorityHigh:
		return 4
	case NotificationPriorityMedium, NotificationPriorityNormal:
		return 3
	case NotificationPriorityLow:
		return 2
	default:
		return 3 // デフォルトは通常
	}
}

// GetDisplayColor 通知の表示色を取得（フロントエンド用）
func (n *Notification) GetDisplayColor() string {
	switch n.Priority {
	case NotificationPriorityUrgent:
		return "#d32f2f" // 赤
	case NotificationPriorityHigh:
		return "#f57c00" // オレンジ
	case NotificationPriorityMedium, NotificationPriorityNormal:
		return "#1976d2" // 青
	case NotificationPriorityLow:
		return "#388e3c" // 緑
	default:
		return "#1976d2"
	}
}

// GetTypeIcon 通知タイプのアイコンを取得（フロントエンド用）
func (n *Notification) GetTypeIcon() string {
	switch n.NotificationType {
	case NotificationTypeWeeklyReportReminder:
		return "schedule"
	case NotificationTypeWeeklyReportSubmitted:
		return "check_circle"
	case NotificationTypeWeeklyReportOverdue:
		return "warning"
	case NotificationTypeExportComplete:
		return "file_download"
	case NotificationTypeExportFailed:
		return "error"
	case NotificationTypeAlertTriggered:
		return "notification_important"
	case NotificationTypeSystemMaintenance:
		return "build"
	case NotificationTypeBulkReminderComplete:
		return "email"
	case NotificationTypeBulkReminderFailed:
		return "email_disabled"
	case NotificationTypeWeekly:
		return "assignment"
	case NotificationTypeLeave:
		return "event_available"
	case NotificationTypeExpense:
		return "receipt"
	case NotificationTypeProject:
		return "work"
	case NotificationTypeSystem:
		return "settings"
	default:
		return "notifications"
	}
}

// NotificationHistory 通知履歴モデル（削除された通知の履歴保持用）
type NotificationHistory struct {
	ID          uuid.UUID             `gorm:"type:char(36);primary_key;default:(UUID())" json:"id"`
	OriginalID  uuid.UUID             `gorm:"type:char(36);not null;index:idx_notification_histories_original" json:"original_id"` // 元の通知ID
	RecipientID *uuid.UUID            `gorm:"type:char(36);index:idx_notification_histories_recipient" json:"recipient_id"`
	Type        NotificationType      `gorm:"type:varchar(50);not null" json:"type"`
	Priority    NotificationPriority  `gorm:"type:varchar(20);not null" json:"priority"`
	Status      NotificationStatus    `gorm:"type:varchar(20);not null" json:"status"`
	Title       string                `gorm:"type:varchar(255);not null" json:"title"`
	Message     string                `gorm:"type:text;not null" json:"message"`
	Metadata    *NotificationMetadata `gorm:"type:json" json:"metadata,omitempty"`
	ReadAt      *time.Time            `gorm:"type:datetime" json:"read_at,omitempty"`
	ExpiresAt   *time.Time            `gorm:"type:datetime" json:"expires_at,omitempty"`
	DeletedAt   time.Time             `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP;index:idx_notification_histories_deleted" json:"deleted_at"` // 削除日時
	CreatedAt   time.Time             `gorm:"type:datetime;not null" json:"created_at"`
	UpdatedAt   time.Time             `gorm:"type:datetime;not null" json:"updated_at"`
}

// TableName テーブル名を指定
func (NotificationHistory) TableName() string {
	return "notification_histories"
}

// BeforeCreate 作成前処理
func (nh *NotificationHistory) BeforeCreate(tx *gorm.DB) error {
	if nh.ID == uuid.Nil {
		nh.ID = uuid.New()
	}
	return nil
}

// CreateFromNotification 通知から履歴を作成
func (nh *NotificationHistory) CreateFromNotification(notification *Notification) {
	nh.OriginalID = notification.ID
	nh.RecipientID = notification.RecipientID
	nh.Type = notification.NotificationType
	nh.Priority = notification.Priority
	nh.Status = notification.Status
	nh.Title = notification.Title
	nh.Message = notification.Message
	nh.Metadata = notification.Metadata
	nh.ReadAt = notification.ReadAt
	nh.ExpiresAt = notification.ExpiresAt
	nh.CreatedAt = notification.CreatedAt
	nh.UpdatedAt = notification.UpdatedAt
	nh.DeletedAt = time.Now()
}

// NotificationTemplate 通知テンプレート（将来の拡張用）
type NotificationTemplate struct {
	ID        uuid.UUID            `gorm:"type:char(36);primary_key;default:(UUID())" json:"id"`
	Type      NotificationType     `gorm:"type:varchar(50);not null;unique" json:"type"`
	Title     string               `gorm:"type:varchar(255);not null" json:"title"` // テンプレートタイトル（変数使用可能）
	Message   string               `gorm:"type:text;not null" json:"message"`       // テンプレートメッセージ（変数使用可能）
	Priority  NotificationPriority `gorm:"type:varchar(20);not null;default:'medium'" json:"priority"`
	IsActive  bool                 `gorm:"type:boolean;not null;default:true" json:"is_active"`
	CreatedAt time.Time            `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time            `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName テーブル名を指定
func (NotificationTemplate) TableName() string {
	return "notification_templates"
}

// BeforeCreate 作成前処理
func (nt *NotificationTemplate) BeforeCreate(tx *gorm.DB) error {
	if nt.ID == uuid.Nil {
		nt.ID = uuid.New()
	}
	return nil
}

// ParseNotificationType 文字列からNotificationTypeを変換
func ParseNotificationType(s string) (NotificationType, error) {
	switch s {
	case string(NotificationTypeLeave):
		return NotificationTypeLeave, nil
	case string(NotificationTypeExpense):
		return NotificationTypeExpense, nil
	case string(NotificationTypeWeekly):
		return NotificationTypeWeekly, nil
	case string(NotificationTypeProject):
		return NotificationTypeProject, nil
	case string(NotificationTypeSystem):
		return NotificationTypeSystem, nil
	case string(NotificationTypeWeeklyReportReminder):
		return NotificationTypeWeeklyReportReminder, nil
	case string(NotificationTypeWeeklyReportSubmitted):
		return NotificationTypeWeeklyReportSubmitted, nil
	case string(NotificationTypeWeeklyReportOverdue):
		return NotificationTypeWeeklyReportOverdue, nil
	case string(NotificationTypeWeeklyReportEscalation):
		return NotificationTypeWeeklyReportEscalation, nil
	case string(NotificationTypeExportComplete):
		return NotificationTypeExportComplete, nil
	case string(NotificationTypeExportFailed):
		return NotificationTypeExportFailed, nil
	case string(NotificationTypeAlertTriggered):
		return NotificationTypeAlertTriggered, nil
	case string(NotificationTypeSystemMaintenance):
		return NotificationTypeSystemMaintenance, nil
	case string(NotificationTypeBulkReminderComplete):
		return NotificationTypeBulkReminderComplete, nil
	case string(NotificationTypeBulkReminderFailed):
		return NotificationTypeBulkReminderFailed, nil
	default:
		return "", fmt.Errorf("invalid notification type: %s", s)
	}
}

// ParseNotificationPriority 文字列からNotificationPriorityを変換
func ParseNotificationPriority(s string) (NotificationPriority, error) {
	switch s {
	case string(NotificationPriorityLow):
		return NotificationPriorityLow, nil
	case string(NotificationPriorityMedium):
		return NotificationPriorityMedium, nil
	case string(NotificationPriorityNormal):
		return NotificationPriorityNormal, nil
	case string(NotificationPriorityHigh):
		return NotificationPriorityHigh, nil
	case string(NotificationPriorityUrgent):
		return NotificationPriorityUrgent, nil
	default:
		return "", fmt.Errorf("invalid notification priority: %s", s)
	}
}

// ParseNotificationStatus 文字列からNotificationStatusを変換
func ParseNotificationStatus(s string) (NotificationStatus, error) {
	switch s {
	case string(NotificationStatusUnread):
		return NotificationStatusUnread, nil
	case string(NotificationStatusRead):
		return NotificationStatusRead, nil
	case string(NotificationStatusHidden):
		return NotificationStatusHidden, nil
	default:
		return "", fmt.Errorf("invalid notification status: %s", s)
	}
}
