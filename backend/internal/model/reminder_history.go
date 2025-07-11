package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ReminderType リマインドタイプ
type ReminderType string

const (
	ReminderTypeWeeklyReportSubmission ReminderType = "weekly_report_submission"
	ReminderTypeWeeklyReportOverdue    ReminderType = "weekly_report_overdue"
	ReminderTypeGeneralReminder        ReminderType = "general_reminder"
)

// ReminderStatus リマインド送信ステータス
type ReminderStatus string

const (
	ReminderStatusPending    ReminderStatus = "pending"
	ReminderStatusProcessing ReminderStatus = "processing"
	ReminderStatusCompleted  ReminderStatus = "completed"
	ReminderStatusFailed     ReminderStatus = "failed"
	ReminderStatusCancelled  ReminderStatus = "cancelled"
)

// SendStatus 個別送信ステータス
type SendStatus string

const (
	SendStatusPending SendStatus = "pending"
	SendStatusSending SendStatus = "sending"
	SendStatusSent    SendStatus = "sent"
	SendStatusFailed  SendStatus = "failed"
	SendStatusSkipped SendStatus = "skipped"
)

// DeliveryStatus 配信ステータス
type DeliveryStatus string

const (
	DeliveryStatusDelivered DeliveryStatus = "delivered"
	DeliveryStatusBounced   DeliveryStatus = "bounced"
	DeliveryStatusRejected  DeliveryStatus = "rejected"
	DeliveryStatusDeferred  DeliveryStatus = "deferred"
	DeliveryStatusSpam      DeliveryStatus = "spam"
)

// ReminderErrorDetails リマインド送信エラーの詳細情報
type ReminderErrorDetails struct {
	ErrorCode    string    `json:"error_code,omitempty"`
	ErrorMessage string    `json:"error_message,omitempty"`
	FailedUsers  []string  `json:"failed_users,omitempty"`
	OccurredAt   time.Time `json:"occurred_at,omitempty"`
	RetryCount   int       `json:"retry_count,omitempty"`
}

// Value JSON型のValue実装
func (r ReminderErrorDetails) Value() (driver.Value, error) {
	return json.Marshal(r)
}

// Scan JSON型のScan実装
func (r *ReminderErrorDetails) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into ReminderErrorDetails", value)
	}

	return json.Unmarshal(bytes, r)
}

// ReminderHistory リマインド送信履歴モデル
type ReminderHistory struct {
	ID              uuid.UUID             `gorm:"type:varchar(36);primary_key;default:(UUID())" json:"id"`
	SenderID        uuid.UUID             `gorm:"type:varchar(36);not null" json:"sender_id"`
	ReminderType    ReminderType          `gorm:"type:varchar(50);not null" json:"reminder_type"`
	TargetWeekStart time.Time             `gorm:"type:date;not null" json:"target_week_start"`
	TargetWeekEnd   time.Time             `gorm:"type:date;not null" json:"target_week_end"`
	RecipientCount  int                   `gorm:"default:0" json:"recipient_count"`
	SentCount       int                   `gorm:"default:0" json:"sent_count"`
	FailedCount     int                   `gorm:"default:0" json:"failed_count"`
	CustomMessage   *string               `gorm:"type:text" json:"custom_message,omitempty"`
	SentAt          time.Time             `gorm:"not null;default:CURRENT_TIMESTAMP" json:"sent_at"`
	Status          ReminderStatus        `gorm:"type:varchar(20);default:'pending'" json:"status"`
	ErrorDetails    *ReminderErrorDetails `gorm:"type:json" json:"error_details,omitempty"`
	CreatedAt       time.Time             `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt       time.Time             `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// リレーション
	Sender     *User               `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Recipients []ReminderRecipient `gorm:"foreignKey:ReminderHistoryID" json:"recipients,omitempty"`
}

// BeforeCreate IDの自動生成
func (r *ReminderHistory) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// TableName テーブル名を指定
func (ReminderHistory) TableName() string {
	return "reminder_histories"
}

// IsCompleted 送信完了かどうか
func (r *ReminderHistory) IsCompleted() bool {
	return r.Status == ReminderStatusCompleted
}

// IsFailed 送信失敗かどうか
func (r *ReminderHistory) IsFailed() bool {
	return r.Status == ReminderStatusFailed
}

// GetSuccessRate 送信成功率を取得
func (r *ReminderHistory) GetSuccessRate() float64 {
	if r.RecipientCount == 0 {
		return 0
	}
	return float64(r.SentCount) / float64(r.RecipientCount) * 100
}

// GetTargetWeek 対象週の文字列表現を取得
func (r *ReminderHistory) GetTargetWeek() string {
	return fmt.Sprintf("%s - %s",
		r.TargetWeekStart.Format("2006/01/02"),
		r.TargetWeekEnd.Format("2006/01/02"))
}

// ReminderRecipient リマインド受信者詳細モデル
type ReminderRecipient struct {
	ID                uuid.UUID       `gorm:"type:varchar(36);primary_key;default:(UUID())" json:"id"`
	ReminderHistoryID uuid.UUID       `gorm:"type:varchar(36);not null" json:"reminder_history_id"`
	RecipientID       uuid.UUID       `gorm:"type:varchar(36);not null" json:"recipient_id"`
	RecipientEmail    string          `gorm:"type:varchar(255);not null" json:"recipient_email"`
	RecipientName     string          `gorm:"type:varchar(200);not null" json:"recipient_name"`
	DepartmentName    *string         `gorm:"type:varchar(100)" json:"department_name,omitempty"`
	SendStatus        SendStatus      `gorm:"type:varchar(20);default:'pending'" json:"send_status"`
	SentAt            *time.Time      `json:"sent_at,omitempty"`
	DeliveryStatus    *DeliveryStatus `gorm:"type:varchar(20)" json:"delivery_status,omitempty"`
	ErrorMessage      *string         `gorm:"type:text" json:"error_message,omitempty"`
	CreatedAt         time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt         time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// リレーション
	ReminderHistory *ReminderHistory `gorm:"foreignKey:ReminderHistoryID" json:"reminder_history,omitempty"`
	Recipient       *User            `gorm:"foreignKey:RecipientID" json:"recipient,omitempty"`
}

// BeforeCreate IDの自動生成
func (r *ReminderRecipient) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// TableName テーブル名を指定
func (ReminderRecipient) TableName() string {
	return "reminder_recipients"
}

// MarkAsSent 送信完了としてマーク
func (r *ReminderRecipient) MarkAsSent() {
	r.SendStatus = SendStatusSent
	now := time.Now()
	r.SentAt = &now
}

// MarkAsFailed 送信失敗としてマーク
func (r *ReminderRecipient) MarkAsFailed(errorMsg string) {
	r.SendStatus = SendStatusFailed
	r.ErrorMessage = &errorMsg
}

// IsDelivered 配信確認済みかどうか
func (r *ReminderRecipient) IsDelivered() bool {
	return r.DeliveryStatus != nil && *r.DeliveryStatus == DeliveryStatusDelivered
}

// IsBounced バウンスしたかどうか
func (r *ReminderRecipient) IsBounced() bool {
	return r.DeliveryStatus != nil &&
		(*r.DeliveryStatus == DeliveryStatusBounced ||
			*r.DeliveryStatus == DeliveryStatusRejected)
}

// ReminderSummary リマインド送信サマリー
type ReminderSummary struct {
	TotalReminders  int64      `json:"total_reminders"`
	TotalRecipients int64      `json:"total_recipients"`
	SuccessfulSends int64      `json:"successful_sends"`
	FailedSends     int64      `json:"failed_sends"`
	SuccessRate     float64    `json:"success_rate"`
	LastReminderAt  *time.Time `json:"last_reminder_at,omitempty"`
}
