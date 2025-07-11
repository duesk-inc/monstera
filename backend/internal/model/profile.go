package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Profile ユーザープロフィールモデル
type Profile struct {
	ID              uuid.UUID            `gorm:"type:varchar(36);primary_key" json:"id"`
	UserID          uuid.UUID            `gorm:"type:varchar(36);not null;unique" json:"user_id"`
	User            User                 `gorm:"foreignKey:UserID" json:"user"`
	Education       string               `gorm:"size:255" json:"education"`
	NearestStation  string               `gorm:"size:255" json:"nearest_station"`
	CanTravel       int32                `gorm:"type:int;not null;default:3" json:"can_travel"`
	AppealPoints    string               `gorm:"type:text" json:"appeal_points"`
	IsTempSaved     bool                 `gorm:"default:false" json:"is_temp_saved"`
	TempSavedAt     *time.Time           `json:"temp_saved_at"`
	CurrentVersion  int                  `gorm:"default:1" json:"current_version"`
	Skills          []Skill              `gorm:"many2many:profile_skills;" json:"skills"`
	Certifications  []Certification      `gorm:"many2many:profile_certifications;" json:"certifications"`
	LanguageSkills  []LanguageSkill      `gorm:"foreignKey:ProfileID" json:"language_skills"`
	FrameworkSkills []FrameworkSkill     `gorm:"foreignKey:ProfileID" json:"framework_skills"`
	BusinessExps    []BusinessExperience `gorm:"foreignKey:ProfileID" json:"business_experiences"`
	WorkHistories   []WorkHistory        `gorm:"foreignKey:ProfileID" json:"work_histories"`
	CreatedAt       time.Time            `json:"created_at"`
	UpdatedAt       time.Time            `json:"updated_at"`
	DeletedAt       gorm.DeletedAt       `gorm:"index" json:"-"`
}

// ProfileHistory プロフィールの履歴モデル
type ProfileHistory struct {
	ID             uuid.UUID            `gorm:"type:varchar(36);primary_key" json:"id"`
	ProfileID      uuid.UUID            `gorm:"type:varchar(36);not null" json:"profile_id"`
	Profile        Profile              `gorm:"foreignKey:ProfileID" json:"-"`
	UserID         uuid.UUID            `gorm:"type:varchar(36);not null" json:"user_id"`
	User           User                 `gorm:"foreignKey:UserID" json:"-"`
	Education      string               `gorm:"size:255" json:"education"`
	NearestStation string               `gorm:"size:255" json:"nearest_station"`
	CanTravel      int                  `gorm:"type:int;not null;default:3" json:"can_travel"`
	AppealPoints   string               `gorm:"type:text" json:"appeal_points"`
	Version        int                  `gorm:"not null;default:1" json:"version"`
	WorkHistories  []WorkHistoryHistory `gorm:"foreignKey:ProfileHistoryID" json:"work_histories"`
	CreatedAt      time.Time            `json:"created_at"`
}

// WorkHistoryHistory 職務経歴の履歴モデル
type WorkHistoryHistory struct {
	ID               uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	HistoryID        uuid.UUID      `gorm:"type:varchar(36);not null" json:"history_id"`
	ProfileHistoryID uuid.UUID      `gorm:"type:varchar(36);not null" json:"profile_history_id"`
	ProfileHistory   ProfileHistory `gorm:"foreignKey:ProfileHistoryID" json:"-"`
	UserID           uuid.UUID      `gorm:"type:varchar(36);not null" json:"user_id"`
	User             User           `gorm:"foreignKey:UserID" json:"-"`
	ProjectName      string         `gorm:"size:255;not null" json:"project_name"`
	StartDate        time.Time      `gorm:"not null" json:"start_date"`
	EndDate          *time.Time     `json:"end_date"`
	Industry         string         `gorm:"size:255;not null" json:"industry"`
	ProjectOverview  string         `gorm:"type:text;not null" json:"project_overview"`
	Role             string         `gorm:"size:255;not null" json:"role"`
	TeamSize         int            `gorm:"not null" json:"team_size"`
	ProjectProcesses string         `gorm:"type:text" json:"project_processes"`
	CreatedAt        time.Time      `json:"created_at"`
}

// Skill スキルモデル
type Skill struct {
	ID        uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	Name      string         `gorm:"size:255;not null;unique" json:"name"`
	Category  string         `gorm:"size:50;not null" json:"category"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Profiles  []Profile      `gorm:"many2many:profile_skills;" json:"-"`
}

// LanguageSkill 言語スキルモデル
type LanguageSkill struct {
	ID                uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	ProfileID         uuid.UUID      `gorm:"type:varchar(36);not null" json:"profile_id"`
	Name              string         `gorm:"size:255;not null" json:"name"`
	Level             int            `gorm:"not null" json:"level"` // 1-5
	YearsOfExperience int            `json:"years_of_experience"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// FrameworkSkill フレームワークスキルモデル
type FrameworkSkill struct {
	ID                uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	ProfileID         uuid.UUID      `gorm:"type:varchar(36);not null" json:"profile_id"`
	Name              string         `gorm:"size:255;not null" json:"name"`
	Level             int            `gorm:"not null" json:"level"` // 1-5
	YearsOfExperience int            `json:"years_of_experience"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// BusinessExperience 業務経験モデル
type BusinessExperience struct {
	ID                uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	ProfileID         uuid.UUID      `gorm:"type:varchar(36);not null" json:"profile_id"`
	Industry          string         `gorm:"size:255;not null" json:"industry"`
	ExperienceDetail  string         `gorm:"type:text" json:"experience_detail"`
	YearsOfExperience int            `gorm:"not null" json:"years_of_experience"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// ProfileSkill プロフィールスキル中間テーブル
type ProfileSkill struct {
	ProfileID         uuid.UUID `gorm:"type:varchar(36);primaryKey;not null" json:"profile_id"`
	SkillID           uuid.UUID `gorm:"type:varchar(36);primaryKey;not null" json:"skill_id"`
	Level             int       `gorm:"not null" json:"level"` // スキルレベル（1-5）
	YearsOfExperience int       `json:"years_of_experience"`   // 経験年数
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// ProfileCertification プロフィール資格中間テーブル
type ProfileCertification struct {
	ID              uuid.UUID  `gorm:"type:varchar(36);primaryKey" json:"id"`
	ProfileID       uuid.UUID  `gorm:"type:varchar(36);not null" json:"profile_id"`
	CertificationID *uuid.UUID `gorm:"type:varchar(36)" json:"certification_id"` // NULLの場合はカスタム入力
	CustomName      *string    `gorm:"type:varchar(255)" json:"custom_name"`     // マスタにない資格名
	IsCustom        bool       `gorm:"default:false" json:"is_custom"`           // カスタム入力フラグ
	AcquiredDate    time.Time  `gorm:"not null" json:"acquired_date"`            // 取得日
	ExpiryDate      *time.Time `json:"expiry_date"`                              // 有効期限
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Relations
	Profile       Profile        `gorm:"foreignKey:ProfileID"`
	Certification *Certification `gorm:"foreignKey:CertificationID"`
}

// BeforeCreate UUIDを生成
func (pc *ProfileCertification) BeforeCreate(tx *gorm.DB) error {
	if pc.ID == uuid.Nil {
		pc.ID = uuid.New()
	}
	return nil
}

// BeforeCreate UUIDを生成
func (p *Profile) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// BeforeCreate ProfileHistory用のUUID生成
func (ph *ProfileHistory) BeforeCreate(tx *gorm.DB) error {
	if ph.ID == uuid.Nil {
		ph.ID = uuid.New()
	}
	return nil
}

// BeforeCreate WorkHistoryHistory用のUUID生成
func (whh *WorkHistoryHistory) BeforeCreate(tx *gorm.DB) error {
	if whh.ID == uuid.Nil {
		whh.ID = uuid.New()
	}
	return nil
}

// BeforeCreate UUIDを生成
func (s *Skill) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// BeforeCreate UUIDを生成
func (ls *LanguageSkill) BeforeCreate(tx *gorm.DB) error {
	if ls.ID == uuid.Nil {
		ls.ID = uuid.New()
	}
	return nil
}

// BeforeCreate UUIDを生成
func (fs *FrameworkSkill) BeforeCreate(tx *gorm.DB) error {
	if fs.ID == uuid.Nil {
		fs.ID = uuid.New()
	}
	return nil
}

// BeforeCreate UUIDを生成
func (be *BusinessExperience) BeforeCreate(tx *gorm.DB) error {
	if be.ID == uuid.Nil {
		be.ID = uuid.New()
	}
	return nil
}
