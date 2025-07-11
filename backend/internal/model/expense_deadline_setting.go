package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ExpenseDeadlineSetting 経費申請期限設定モデル
type ExpenseDeadlineSetting struct {
	ID                  uuid.UUID  `gorm:"type:varchar(36);primary_key" json:"id"`
	Scope               string     `gorm:"size:50;not null;default:'global'" json:"scope"`   // global, department, user
	ScopeID             *uuid.UUID `gorm:"type:varchar(36)" json:"scope_id"`                 // 部門IDまたはユーザーID
	DefaultDeadlineDays int        `gorm:"not null;default:30" json:"default_deadline_days"` // デフォルト期限日数
	ReminderDaysBefore  int        `gorm:"not null;default:3" json:"reminder_days_before"`   // リマインダー送信日数（期限の何日前）
	AutoExpireEnabled   bool       `gorm:"default:true" json:"auto_expire_enabled"`          // 自動期限切れ有効化
	CreatedBy           uuid.UUID  `gorm:"type:varchar(36);not null" json:"created_by"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// BeforeCreate UUIDを生成
func (e *ExpenseDeadlineSetting) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

// IsGlobal グローバル設定かどうか
func (e *ExpenseDeadlineSetting) IsGlobal() bool {
	return e.Scope == "global"
}

// IsDepartment 部門設定かどうか
func (e *ExpenseDeadlineSetting) IsDepartment() bool {
	return e.Scope == "department"
}

// IsUser ユーザー設定かどうか
func (e *ExpenseDeadlineSetting) IsUser() bool {
	return e.Scope == "user"
}

// CalculateDeadline 期限日時を計算
func (e *ExpenseDeadlineSetting) CalculateDeadline(baseTime time.Time) time.Time {
	return baseTime.AddDate(0, 0, e.DefaultDeadlineDays)
}

// CalculateReminderDate リマインダー送信日時を計算
func (e *ExpenseDeadlineSetting) CalculateReminderDate(deadline time.Time) time.Time {
	return deadline.AddDate(0, 0, -e.ReminderDaysBefore)
}

// ShouldSendReminder リマインダーを送信すべきかどうか
func (e *ExpenseDeadlineSetting) ShouldSendReminder(deadline time.Time, now time.Time) bool {
	reminderDate := e.CalculateReminderDate(deadline)
	return now.After(reminderDate) || now.Equal(reminderDate)
}

// IsDeadlineExpired 期限が切れているかどうか
func (e *ExpenseDeadlineSetting) IsDeadlineExpired(deadline time.Time, now time.Time) bool {
	return now.After(deadline)
}
