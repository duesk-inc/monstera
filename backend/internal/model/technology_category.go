package model

import (
	"time"
)

// TechnologyCategory 技術カテゴリマスタ
type TechnologyCategory struct {
	ID          string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	DisplayName string    `gorm:"type:varchar(100);not null" json:"display_name"`
	SortOrder   int32     `gorm:"type:int;not null" json:"sort_order"`
	CreatedAt   time.Time `gorm:"type:timestamp;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt   time.Time `gorm:"type:timestamp;not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" json:"updated_at"`
}
