package model

import (
	"time"

	"gorm.io/gorm"
)

// Process 担当工程マスタモデル
type Process struct {
	ID           int32          `gorm:"type:int;primary_key;auto_increment" json:"id"`
	Name         string         `gorm:"size:100;not null;unique" json:"name"`
	DisplayOrder int32          `gorm:"type:int;not null" json:"display_order"`
	IsActive     bool           `gorm:"not null;default:true" json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
