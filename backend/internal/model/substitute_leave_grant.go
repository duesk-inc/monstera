package model

import (
	"time"

	"github.com/google/uuid"
)

// SubstituteLeaveGrant は振替特別休暇の付与履歴を表すモデルです
type SubstituteLeaveGrant struct {
	ID            uuid.UUID `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID        uuid.UUID `gorm:"type:varchar(36)" json:"user_id"`
	GrantDate     time.Time `json:"grant_date"`
	GrantedDays   float64   `gorm:"type:decimal(5,1)" json:"granted_days"`
	UsedDays      float64   `gorm:"type:decimal(5,1);default:0" json:"used_days"`
	RemainingDays float64   `gorm:"type:decimal(5,1)" json:"remaining_days"`
	WorkDate      time.Time `json:"work_date"`
	Reason        string    `gorm:"type:varchar(255)" json:"reason"`
	ExpireDate    time.Time `json:"expire_date"`
	IsExpired     bool      `gorm:"default:false" json:"is_expired"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// リレーション
	User User `gorm:"foreignKey:UserID" json:"user"`
}

// TableName はテーブル名を指定します
func (SubstituteLeaveGrant) TableName() string {
	return "substitute_leave_grants"
}
