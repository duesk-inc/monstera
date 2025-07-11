package model

import (
	"strconv"
	"time"

	"github.com/google/uuid"
)

// UserSkillSummary ユーザースキルサマリービュー
type UserSkillSummary struct {
	UserID                uuid.UUID `gorm:"type:varchar(36);primaryKey" json:"user_id"`
	TechnologyName        string    `gorm:"type:varchar(255);primaryKey" json:"technology_name"`
	CategoryName          string    `gorm:"type:varchar(100)" json:"category_name"`
	CategoryDisplayName   string    `gorm:"type:varchar(100)" json:"category_display_name"`
	TotalProjectMonths    int32     `gorm:"type:int" json:"total_project_months"`
	TotalExperienceMonths int32     `gorm:"type:int" json:"total_experience_months"`
	ExperienceYears       int32     `gorm:"type:int" json:"experience_years"`
	ExperienceMonths      int32     `gorm:"type:int" json:"experience_months"`
	ProjectCount          int32     `gorm:"type:int" json:"project_count"`
	FirstUsedDate         time.Time `gorm:"type:date" json:"first_used_date"`
	LastUsedDate          time.Time `gorm:"type:date" json:"last_used_date"`
	TechnologyDisplayName string    `gorm:"type:varchar(100)" json:"technology_display_name"`
	GlobalUsageCount      *int32    `gorm:"type:int" json:"global_usage_count"`
	TechnologySortOrder   int32     `gorm:"type:int" json:"technology_sort_order"`
	UserEmail             string    `gorm:"type:varchar(255)" json:"user_email"`
	UserName              string    `gorm:"type:varchar(255)" json:"user_name"`
}

// TableName ビュー名を指定
func (UserSkillSummary) TableName() string {
	return "user_skill_summary"
}

// GetExperienceText 経験年数を文字列で取得
func (u *UserSkillSummary) GetExperienceText() string {
	if u.ExperienceYears == 0 && u.ExperienceMonths == 0 {
		return "0ヶ月"
	}

	var result string
	if u.ExperienceYears > 0 {
		result = strconv.Itoa(int(u.ExperienceYears)) + "年"
	}
	if u.ExperienceMonths > 0 {
		if result != "" {
			result += " "
		}
		result += strconv.Itoa(int(u.ExperienceMonths)) + "ヶ月"
	}

	return result
}

// IsRecentlyUsed 最近使用したかどうか（1年以内）
func (u *UserSkillSummary) IsRecentlyUsed() bool {
	oneYearAgo := time.Now().AddDate(-1, 0, 0)
	return u.LastUsedDate.After(oneYearAgo)
}

// GetUsageLevel 使用レベルを取得（初級/中級/上級）
func (u *UserSkillSummary) GetUsageLevel() string {
	totalMonths := u.TotalExperienceMonths

	if totalMonths < 6 {
		return "初級"
	} else if totalMonths < 24 {
		return "中級"
	} else {
		return "上級"
	}
}
