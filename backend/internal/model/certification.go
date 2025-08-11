package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Certification 資格マスターモデル
type Certification struct {
	ID           string         `gorm:"type:varchar(36);primaryKey" json:"id"`
	Name         string         `gorm:"type:varchar(255);not null;unique" json:"name"`
	Issuer       *string        `gorm:"type:varchar(255)" json:"issuer"`
	Description  *string        `gorm:"type:text" json:"description"`
	IsCommon     bool           `gorm:"default:false" json:"is_common"`   // よく使われる資格
	DisplayOrder int            `gorm:"default:999" json:"display_order"` // 表示順
	Category     *string        `gorm:"type:varchar(50)" json:"category"` // 資格カテゴリ
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate UUIDを生成
func (c *Certification) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
