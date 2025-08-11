package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LeaveType は休暇種別を表すモデルです
type LeaveType struct {
	ID                string     `gorm:"primaryKey;type:varchar(255)" json:"id"`
	Code              string     `gorm:"unique;type:varchar(20)" json:"code"`
	Name              string     `gorm:"type:varchar(50)" json:"name"`
	Description       string     `gorm:"type:text" json:"description"`
	DefaultDays       float64    `gorm:"type:decimal(5,1)" json:"default_days"`
	IsHourlyAvailable bool       `gorm:"default:true" json:"is_hourly_available"`
	ReasonRequired    bool       `gorm:"default:false" json:"reason_required"`
	GenderSpecific    string     `gorm:"type:varchar(20)" json:"gender_specific"`
	DisplayOrder      int        `json:"display_order"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	DeletedAt         *time.Time `gorm:"index" json:"deleted_at"`
}

// TableName はテーブル名を指定します
func (LeaveType) TableName() string {
	return "leave_types"
}

// BeforeCreate UUIDを生成
func (lt *LeaveType) BeforeCreate(tx *gorm.DB) error {
	if lt.ID == "" {
		lt.ID = uuid.New().String()
	}
	return nil
}
