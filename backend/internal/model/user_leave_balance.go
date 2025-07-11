package model

import (
	"time"

	"github.com/google/uuid"
)

// UserLeaveBalance はユーザーの休暇残日数を表すモデルです
type UserLeaveBalance struct {
	ID            uuid.UUID  `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID        uuid.UUID  `gorm:"type:varchar(36)" json:"user_id"`
	LeaveTypeID   uuid.UUID  `gorm:"type:varchar(36)" json:"leave_type_id"`
	FiscalYear    int        `json:"fiscal_year"`
	TotalDays     float64    `gorm:"type:decimal(5,1)" json:"total_days"`
	UsedDays      float64    `gorm:"type:decimal(5,1);default:0" json:"used_days"`
	RemainingDays float64    `gorm:"type:decimal(5,1)" json:"remaining_days"`
	ExpireDate    time.Time  `json:"expire_date"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `gorm:"index" json:"deleted_at"`

	// リレーション
	LeaveType LeaveType `gorm:"foreignKey:LeaveTypeID" json:"leave_type"`
	User      User      `gorm:"foreignKey:UserID" json:"user"`
}

// TableName はテーブル名を指定します
func (UserLeaveBalance) TableName() string {
	return "user_leave_balances"
}
