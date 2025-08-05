package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EngineerSkillCategory エンジニアスキルカテゴリ
type EngineerSkillCategory struct {
	ID        uuid.UUID  `gorm:"type:varchar(255);primaryKey" json:"id"`
	Name      string     `gorm:"type:varchar(100);not null" json:"name"`
	ParentID  *uuid.UUID `gorm:"type:varchar(255)" json:"parent_id"`
	SortOrder int        `gorm:"type:int;default:0" json:"sort_order"`
	CreatedAt time.Time  `gorm:"type:datetime(3);not null;default:CURRENT_TIMESTAMP(3)" json:"created_at"`
	UpdatedAt time.Time  `gorm:"type:datetime(3);default:CURRENT_TIMESTAMP(3)" json:"updated_at"`

	// Relations
	Parent   *EngineerSkillCategory  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []EngineerSkillCategory `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Skills   []EngineerSkill         `gorm:"foreignKey:SkillCategoryID" json:"skills,omitempty"`
}

// TableName テーブル名を指定
func (EngineerSkillCategory) TableName() string {
	return "engineer_skill_categories"
}

// BeforeCreate UUID自動生成
func (e *EngineerSkillCategory) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

// EngineerSkill エンジニアスキル
type EngineerSkill struct {
	ID              uuid.UUID `gorm:"type:varchar(255);primaryKey" json:"id"`
	UserID string `gorm:"type:varchar(255);not null" json:"user_id"`
	SkillCategoryID uuid.UUID `gorm:"type:varchar(255);not null" json:"skill_category_id"`
	SkillName       string    `gorm:"type:varchar(100);not null" json:"skill_name"`
	SkillLevel      int       `gorm:"type:int;check:(skill_level >= 1 AND skill_level <= 5)" json:"skill_level"`
	CreatedAt       time.Time `gorm:"type:datetime(3);not null;default:CURRENT_TIMESTAMP(3)" json:"created_at"`
	UpdatedAt       time.Time `gorm:"type:datetime(3);default:CURRENT_TIMESTAMP(3)" json:"updated_at"`

	// Relations
	User          *User                  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	SkillCategory *EngineerSkillCategory `gorm:"foreignKey:SkillCategoryID" json:"skill_category,omitempty"`
}

// TableName テーブル名を指定
func (EngineerSkill) TableName() string {
	return "engineer_skills"
}

// BeforeCreate UUID自動生成
func (e *EngineerSkill) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

// スキルレベルの定数
const (
	SkillLevelBeginner     = 1 // 初級
	SkillLevelElementary   = 2 // 初中級
	SkillLevelIntermediate = 3 // 中級
	SkillLevelAdvanced     = 4 // 上級
	SkillLevelExpert       = 5 // エキスパート
)

// GetSkillLevelLabel スキルレベルの表示名を取得
func GetSkillLevelLabel(level int) string {
	switch level {
	case SkillLevelBeginner:
		return "初級"
	case SkillLevelElementary:
		return "初中級"
	case SkillLevelIntermediate:
		return "中級"
	case SkillLevelAdvanced:
		return "上級"
	case SkillLevelExpert:
		return "エキスパート"
	default:
		return "不明"
	}
}

// IsValidSkillLevel スキルレベルの妥当性チェック
func IsValidSkillLevel(level int) bool {
	return level >= SkillLevelBeginner && level <= SkillLevelExpert
}

// 主要なスキルカテゴリID（初期データ用）
var (
	SkillCategoryFrontendID = uuid.MustParse("01234567-89ab-cdef-0123-456789abcde1")
	SkillCategoryBackendID  = uuid.MustParse("01234567-89ab-cdef-0123-456789abcde2")
	SkillCategoryInfraID    = uuid.MustParse("01234567-89ab-cdef-0123-456789abcde3")
	SkillCategoryDatabaseID = uuid.MustParse("01234567-89ab-cdef-0123-456789abcde4")
	SkillCategoryMobileID   = uuid.MustParse("01234567-89ab-cdef-0123-456789abcde5")
	SkillCategoryDevOpsID   = uuid.MustParse("01234567-89ab-cdef-0123-456789abcde6")
	SkillCategoryOtherID    = uuid.MustParse("01234567-89ab-cdef-0123-456789abcde7")
)
