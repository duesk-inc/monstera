package model

import (
	"strconv"
	"time"

	"github.com/google/uuid"
)

// UserITExperience ユーザーIT経験ビュー
type UserITExperience struct {
	UserID                  uuid.UUID  `gorm:"type:varchar(36);primaryKey" json:"user_id"`
	UserEmail               string     `gorm:"type:varchar(255)" json:"user_email"`
	UserName                string     `gorm:"type:varchar(255)" json:"user_name"`
	TotalITExperienceMonths int32      `gorm:"type:int" json:"total_it_experience_months"`
	ITExperienceYears       int32      `gorm:"type:int" json:"it_experience_years"`
	ITExperienceMonths      int32      `gorm:"type:int" json:"it_experience_months"`
	TotalProjectCount       int32      `gorm:"type:int" json:"total_project_count"`
	TotalProjectMonths      int32      `gorm:"type:int" json:"total_project_months"`
	FirstProjectDate        *time.Time `gorm:"type:date" json:"first_project_date"`
	LastProjectDate         *time.Time `gorm:"type:date" json:"last_project_date"`
	LatestProjectName       *string    `gorm:"type:varchar(255)" json:"latest_project_name"`
	LatestRole              *string    `gorm:"type:varchar(100)" json:"latest_role"`
	ActiveProjectCount      int32      `gorm:"type:int" json:"active_project_count"`
	CalculatedAt            time.Time  `gorm:"type:timestamp" json:"calculated_at"`
}

// TableName ビュー名を指定
func (UserITExperience) TableName() string {
	return "user_it_experience"
}

// GetITExperienceText IT経験年数を文字列で取得
func (u *UserITExperience) GetITExperienceText() string {
	if u.ITExperienceYears == 0 && u.ITExperienceMonths == 0 {
		return "0ヶ月"
	}

	var result string
	if u.ITExperienceYears > 0 {
		result = strconv.Itoa(int(u.ITExperienceYears)) + "年"
	}
	if u.ITExperienceMonths > 0 {
		if result != "" {
			result += " "
		}
		result += strconv.Itoa(int(u.ITExperienceMonths)) + "ヶ月"
	}

	return result
}

// HasITExperience IT経験があるかどうか
func (u *UserITExperience) HasITExperience() bool {
	return u.TotalITExperienceMonths > 0
}

// IsNewbie 新人かどうか（6ヶ月未満）
func (u *UserITExperience) IsNewbie() bool {
	return u.TotalITExperienceMonths < 6
}

// IsJunior ジュニアかどうか（6ヶ月以上2年未満）
func (u *UserITExperience) IsJunior() bool {
	return u.TotalITExperienceMonths >= 6 && u.TotalITExperienceMonths < 24
}

// IsMid ミドルかどうか（2年以上5年未満）
func (u *UserITExperience) IsMid() bool {
	return u.TotalITExperienceMonths >= 24 && u.TotalITExperienceMonths < 60
}

// IsSenior シニアかどうか（5年以上）
func (u *UserITExperience) IsSenior() bool {
	return u.TotalITExperienceMonths >= 60
}

// GetExperienceLevel 経験レベルを取得
func (u *UserITExperience) GetExperienceLevel() string {
	if u.IsNewbie() {
		return "新人"
	} else if u.IsJunior() {
		return "ジュニア"
	} else if u.IsMid() {
		return "ミドル"
	} else if u.IsSenior() {
		return "シニア"
	}
	return "未経験"
}

// IsActiveProject 現在進行中のプロジェクトがあるかどうか
func (u *UserITExperience) IsActiveProject() bool {
	return u.ActiveProjectCount > 0
}

// GetProjectCountText プロジェクト数を文字列で取得
func (u *UserITExperience) GetProjectCountText() string {
	return strconv.Itoa(int(u.TotalProjectCount)) + "件"
}
