package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkHour 作業時間モデル
type WorkHour struct {
	ID             uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	WeeklyReportID uuid.UUID      `gorm:"type:varchar(36);not null" json:"weekly_report_id"`
	WeeklyReport   WeeklyReport   `gorm:"foreignKey:WeeklyReportID" json:"-"`
	Date           time.Time      `gorm:"not null" json:"date"`
	Hours          float64        `gorm:"not null" json:"hours"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate UUIDを生成
func (wh *WorkHour) BeforeCreate(tx *gorm.DB) error {
	if wh.ID == uuid.Nil {
		wh.ID = uuid.New()
	}
	return nil
}
