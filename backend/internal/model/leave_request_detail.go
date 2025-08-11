package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LeaveRequestDetail は休暇申請詳細を表すモデルです
type LeaveRequestDetail struct {
	ID             string     `gorm:"primaryKey;type:varchar(255)" json:"id"`
	LeaveRequestID string     `gorm:"type:varchar(255)" json:"leave_request_id"`
	LeaveDate      time.Time  `json:"leave_date"`
	StartTime      string     `gorm:"type:varchar(10)" json:"start_time"`
	EndTime        string     `gorm:"type:varchar(10)" json:"end_time"`
	DayValue       float64    `gorm:"type:decimal(3,1)" json:"day_value"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `gorm:"index" json:"deleted_at"`

	// リレーション
	LeaveRequest LeaveRequest `gorm:"foreignKey:LeaveRequestID" json:"leave_request"`
}

// TableName はテーブル名を指定します
func (LeaveRequestDetail) TableName() string {
	return "leave_request_details"
}

// BeforeCreate UUIDを生成
func (lrd *LeaveRequestDetail) BeforeCreate(tx *gorm.DB) error {
	if lrd.ID == "" {
		lrd.ID = uuid.New().String()
	}
	return nil
}
