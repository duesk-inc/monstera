package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RecommendedLeavePeriod 推奨休暇期間
type RecommendedLeavePeriod struct {
	ID               string      `gorm:"type:varchar(255);primary_key" json:"id"`
	PeriodName       string      `gorm:"type:varchar(100);not null" json:"period_name"`
	Name             string      `gorm:"size:100;not null" json:"name"` // 後方互換性のため保持
	FiscalYear       int         `gorm:"not null" json:"fiscal_year"`
	StartDate        time.Time   `gorm:"type:date;not null" json:"start_date"`
	EndDate          time.Time   `gorm:"type:date;not null" json:"end_date"`
	TargetLeaveTypes StringSlice `gorm:"type:json;not null" json:"target_leave_types"`
	RequiredDays     float64     `gorm:"type:decimal(3,1);not null;default:0" json:"required_days"`
	RecommendedDays  int         `gorm:"not null;default:3" json:"recommended_days"` // 後方互換性のため保持
	Description      string      `gorm:"type:text" json:"description"`
	IsActive         bool        `gorm:"not null;default:true" json:"is_active"`
	CreatedBy        string      `gorm:"type:varchar(255);not null" json:"created_by"`
	// Creator          *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"` // 依存関係のため一時的にコメントアウト
	UpdatedBy *string `gorm:"type:varchar(255)" json:"updated_by"`
	// Updater          *User      `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"` // 依存関係のため一時的にコメントアウト
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName テーブル名を指定
func (RecommendedLeavePeriod) TableName() string {
	return "recommended_leave_periods"
}

// BeforeCreate UUIDを生成
func (r *RecommendedLeavePeriod) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

// StringSlice is a slice of strings that can be stored as JSON
type StringSlice []string

// Value implements the driver.Valuer interface
func (ss StringSlice) Value() (driver.Value, error) {
	return json.Marshal(ss)
}

// Scan implements the sql.Scanner interface
func (ss *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*ss = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, ss)
	case string:
		return json.Unmarshal([]byte(v), ss)
	default:
		return json.Unmarshal([]byte(v.(string)), ss)
	}
}
