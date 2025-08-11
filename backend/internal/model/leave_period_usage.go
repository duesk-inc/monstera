package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LeavePeriodUsage 推奨休暇期間の利用記録
type LeavePeriodUsage struct {
	ID                       string                  `gorm:"type:varchar(255);primary_key" json:"id"`
	RecommendedLeavePeriodID string                  `gorm:"type:varchar(255);not null;index" json:"recommended_leave_period_id"`
	RecommendedLeavePeriod   *RecommendedLeavePeriod `gorm:"foreignKey:RecommendedLeavePeriodID" json:"recommended_leave_period,omitempty"`
	LeaveRequestID           string                  `gorm:"type:varchar(255);not null;index" json:"leave_request_id"`
	LeaveRequest             *LeaveRequest           `gorm:"foreignKey:LeaveRequestID" json:"leave_request,omitempty"`
	UserID                   string                  `gorm:"type:varchar(255);not null;index" json:"user_id"`
	User                     *User                   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	UsedDays                 int                     `gorm:"not null" json:"used_days"`
	CreatedAt                time.Time               `json:"created_at"`
	UpdatedAt                time.Time               `json:"updated_at"`
}

// TableName テーブル名を指定
func (LeavePeriodUsage) TableName() string {
	return "leave_period_usages"
}

// BeforeCreate UUIDを生成
func (l *LeavePeriodUsage) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	return nil
}
