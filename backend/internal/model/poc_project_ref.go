package model

import (
	"fmt"
	"time"
)

// PocProjectRef monstera-pocスキーマのprojectsテーブル参照用モデル
// 実際のmonstera_poc.projectsテーブルを読み取り専用で参照するためのモデル
type PocProjectRef struct {
	ID             string     `gorm:"type:varchar(36);primary_key" json:"id"`
	ProjectName    string     `gorm:"column:project_name;size:255;not null" json:"project_name"`
	MinPrice       *int       `gorm:"column:min_price" json:"min_price"`
	MaxPrice       *int       `gorm:"column:max_price" json:"max_price"`
	WorkLocation   *string    `gorm:"column:work_location;size:255" json:"work_location"`
	RemoteWorkType *string    `gorm:"column:remote_work_type;size:50" json:"remote_work_type"`
	WorkingTime    *string    `gorm:"column:working_time;size:255" json:"working_time"`
	ContractPeriod *string    `gorm:"column:contract_period;size:255" json:"contract_period"`
	StartDate      *time.Time `gorm:"column:start_date" json:"start_date"`
	StartDateText  *string    `gorm:"column:start_date_text;size:255" json:"start_date_text"`
	Description    *string    `gorm:"column:description;type:text" json:"description"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `gorm:"index" json:"deleted_at,omitempty"`

	// リレーション（読み取り専用）
	RequiredSkills []PocProjectRequiredSkillRef `gorm:"foreignKey:ProjectID" json:"required_skills,omitempty"`
}

// TableName monstera_poc.projectsテーブルを参照
func (PocProjectRef) TableName() string {
	return "monstera_poc.projects"
}

// PocProjectRequiredSkillRef monstera-pocスキーマのproject_required_skillsテーブル参照用モデル
type PocProjectRequiredSkillRef struct {
	ID        string    `gorm:"type:varchar(36);primary_key" json:"id"`
	ProjectID string    `gorm:"column:project_id;type:varchar(36);not null" json:"project_id"`
	SkillID   string    `gorm:"column:skill_id;type:varchar(36);not null" json:"skill_id"`
	Level     *int      `gorm:"column:level" json:"level"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// リレーション（読み取り専用）
	Skill PocSkillRef `gorm:"foreignKey:SkillID" json:"skill,omitempty"`
}

// TableName monstera_poc.project_required_skillsテーブルを参照
func (PocProjectRequiredSkillRef) TableName() string {
	return "monstera_poc.project_required_skills"
}

// PocSkillRef monstera-pocスキーマのskillsテーブル参照用モデル
type PocSkillRef struct {
	ID          string     `gorm:"type:varchar(36);primary_key" json:"id"`
	Name        string     `gorm:"column:name;size:100;not null" json:"name"`
	Category    *string    `gorm:"column:category;size:50" json:"category"`
	Description *string    `gorm:"column:description;type:text" json:"description"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName monstera_poc.skillsテーブルを参照
func (PocSkillRef) TableName() string {
	return "monstera_poc.skills"
}

// GetPriceRange 価格帯を文字列で取得
func (p *PocProjectRef) GetPriceRange() string {
	if p.MinPrice == nil && p.MaxPrice == nil {
		return "未設定"
	}
	if p.MinPrice != nil && p.MaxPrice != nil {
		return formatPrice(*p.MinPrice) + " 〜 " + formatPrice(*p.MaxPrice)
	}
	if p.MinPrice != nil {
		return formatPrice(*p.MinPrice) + " 〜"
	}
	if p.MaxPrice != nil {
		return "〜 " + formatPrice(*p.MaxPrice)
	}
	return "未設定"
}

// GetWorkLocationDisplay 勤務地の表示文字列を取得
func (p *PocProjectRef) GetWorkLocationDisplay() string {
	if p.WorkLocation == nil || *p.WorkLocation == "" {
		return "未設定"
	}
	return *p.WorkLocation
}

// GetRemoteWorkTypeDisplay リモートワーク形態の表示文字列を取得
func (p *PocProjectRef) GetRemoteWorkTypeDisplay() string {
	if p.RemoteWorkType == nil || *p.RemoteWorkType == "" {
		return "未設定"
	}
	return *p.RemoteWorkType
}

// GetWorkingTimeDisplay 勤務時間の表示文字列を取得
func (p *PocProjectRef) GetWorkingTimeDisplay() string {
	if p.WorkingTime == nil || *p.WorkingTime == "" {
		return "未設定"
	}
	return *p.WorkingTime
}

// GetContractPeriodDisplay 契約期間の表示文字列を取得
func (p *PocProjectRef) GetContractPeriodDisplay() string {
	if p.ContractPeriod == nil || *p.ContractPeriod == "" {
		return "未設定"
	}
	return *p.ContractPeriod
}

// GetStartDateDisplay 開始日の表示文字列を取得
func (p *PocProjectRef) GetStartDateDisplay() string {
	// StartDateTextが優先
	if p.StartDateText != nil && *p.StartDateText != "" {
		return *p.StartDateText
	}
	// StartDateがある場合はフォーマット
	if p.StartDate != nil {
		return p.StartDate.Format("2006年1月2日")
	}
	return "未定"
}

// GetSkillNames スキル名のスライスを取得
func (p *PocProjectRef) GetSkillNames() []string {
	skillNames := make([]string, 0, len(p.RequiredSkills))
	for _, rs := range p.RequiredSkills {
		if rs.Skill.Name != "" {
			skillNames = append(skillNames, rs.Skill.Name)
		}
	}
	return skillNames
}

// HasRequiredSkills 必須スキルがあるかチェック
func (p *PocProjectRef) HasRequiredSkills() bool {
	return len(p.RequiredSkills) > 0
}

// formatPrice 価格を日本円形式でフォーマット
func formatPrice(price int) string {
	// 万円単位で表示
	if price >= 10000 {
		man := price / 10000
		sen := (price % 10000) / 1000
		if sen > 0 {
			return fmt.Sprintf("%d.%d万円", man, sen)
		}
		return fmt.Sprintf("%d万円", man)
	}
	return fmt.Sprintf("%d円", price)
}
