package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserDefaultWorkSettings はユーザーのデフォルト勤務時間設定モデル
type UserDefaultWorkSettings struct {
	ID               uuid.UUID `gorm:"type:varchar(36);primary_key" json:"id"`
	UserID           uuid.UUID `gorm:"type:varchar(36);not null" json:"user_id"`
	WeekdayStartTime string    `gorm:"type:varchar(10);not null;default:'09:00'" json:"weekday_start_time"`
	WeekdayEndTime   string    `gorm:"type:varchar(10);not null;default:'18:00'" json:"weekday_end_time"`
	WeekdayBreakTime float64   `gorm:"type:decimal(4,2);not null;default:1.00" json:"weekday_break_time"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// BeforeCreate UUIDを自動生成
func (s *UserDefaultWorkSettings) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
