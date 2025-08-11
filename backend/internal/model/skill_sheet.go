package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SkillSheet スキルシートモデル
type SkillSheet struct {
	ID                 string         `gorm:"type:varchar(255);primary_key" json:"id"`
	UserID             string         `gorm:"type:varchar(255);not null;unique" json:"user_id"`
	User               User           `gorm:"foreignKey:UserID" json:"user"`
	ITExperienceYears  int            `gorm:"not null;default:0" json:"it_experience_years"`
	ITExperienceMonths int            `gorm:"not null;default:0" json:"it_experience_months"`
	Specialties        string         `gorm:"type:text" json:"specialties"`
	SelfPR             string         `gorm:"type:text" json:"self_pr"`
	IsTempSaved        bool           `gorm:"default:false" json:"is_temp_saved"`
	TempSavedAt        *time.Time     `json:"temp_saved_at"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate UUIDを生成
func (s *SkillSheet) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}
