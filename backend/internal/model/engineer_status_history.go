package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EngineerStatusHistory エンジニアステータス履歴
type EngineerStatusHistory struct {
	ID             uuid.UUID `gorm:"type:varchar(255);primaryKey" json:"id"`
	UserID string `gorm:"type:varchar(255);not null" json:"user_id"`
	PreviousStatus *string   `gorm:"type:enum('active','standby','resigned','long_leave')" json:"previous_status"`
	NewStatus      string    `gorm:"type:enum('active','standby','resigned','long_leave');not null" json:"new_status"`
	ChangeReason   string    `gorm:"type:text" json:"change_reason"`
	ChangedBy string `gorm:"type:varchar(255);not null" json:"changed_by"`
	ChangedAt      time.Time `gorm:"type:datetime(3);not null;default:CURRENT_TIMESTAMP(3)" json:"changed_at"`
	CreatedAt      time.Time `gorm:"type:datetime(3);not null;default:CURRENT_TIMESTAMP(3)" json:"created_at"`

	// Relations
	User          *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ChangedByUser *User `gorm:"foreignKey:ChangedBy" json:"changed_by_user,omitempty"`
}

// TableName テーブル名を指定
func (EngineerStatusHistory) TableName() string {
	return "engineer_status_history"
}

// BeforeCreate UUID自動生成
func (e *EngineerStatusHistory) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	if e.ChangedAt.IsZero() {
		e.ChangedAt = time.Now()
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now()
	}
	return nil
}

// EngineerStatus エンジニアステータスの定数
const (
	EngineerStatusActive    = "active"     // 稼働中
	EngineerStatusStandby   = "standby"    // 待機中
	EngineerStatusResigned  = "resigned"   // 退職
	EngineerStatusLongLeave = "long_leave" // 長期休暇中
)

// IsValidEngineerStatus 有効なエンジニアステータスかチェック
func IsValidEngineerStatus(status string) bool {
	switch status {
	case EngineerStatusActive, EngineerStatusStandby, EngineerStatusResigned, EngineerStatusLongLeave:
		return true
	default:
		return false
	}
}

// GetEngineerStatusLabel ステータスの表示名を取得
func GetEngineerStatusLabel(status string) string {
	switch status {
	case EngineerStatusActive:
		return "稼働中"
	case EngineerStatusStandby:
		return "待機中"
	case EngineerStatusResigned:
		return "退職"
	case EngineerStatusLongLeave:
		return "長期休暇中"
	default:
		return "不明"
	}
}
