package model

import (
	"time"
)

// WorkHistoryTechnology 職務経歴技術項目
type WorkHistoryTechnology struct {
	ID             string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	WorkHistoryID  string    `gorm:"type:varchar(36);not null;index:idx_work_history_technologies_work_history_id" json:"work_history_id"`
	CategoryID     string    `gorm:"type:varchar(36);not null;index:idx_work_history_technologies_category_id" json:"category_id"`
	TechnologyName string    `gorm:"type:varchar(255);not null;index:idx_work_history_technologies_technology_name" json:"technology_name"`
	CreatedAt      time.Time `gorm:"type:timestamp;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt      time.Time `gorm:"type:timestamp;not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" json:"updated_at"`

	// アソシエーション
	WorkHistory      *WorkHistory        `gorm:"foreignKey:WorkHistoryID;constraint:OnDelete:CASCADE" json:"work_history,omitempty"`
	Category         *TechnologyCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}
