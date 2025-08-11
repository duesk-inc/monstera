package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ReminderSettings 自動リマインド設定
type ReminderSettings struct {
	ID                 string         `gorm:"type:varchar(36);primary_key" json:"id"`
	Enabled            bool           `gorm:"default:true" json:"enabled"`
	FirstReminderDays  int            `gorm:"default:3" json:"first_reminder_days"`  // 初回リマインド（日数）
	SecondReminderDays int            `gorm:"default:7" json:"second_reminder_days"` // 2回目リマインド（日数）
	EscalationDays     int            `gorm:"default:14" json:"escalation_days"`     // エスカレーション（日数）
	ReminderTime       string         `gorm:"default:'09:00'" json:"reminder_time"`  // リマインド送信時刻（HH:MM）
	IncludeManager     bool           `gorm:"default:true" json:"include_manager"`   // マネージャーをCCに含める
	UpdatedBy          string         `gorm:"type:varchar(36)" json:"updated_by"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName テーブル名を指定
func (ReminderSettings) TableName() string {
	return "reminder_settings"
}

// BeforeCreate UUIDを生成
func (r *ReminderSettings) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}
