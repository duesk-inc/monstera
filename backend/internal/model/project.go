package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ProjectStatus プロジェクトステータス
type ProjectStatus string

const (
	// ProjectStatusProposal 提案中
	ProjectStatusProposal ProjectStatus = "proposal"
	// ProjectStatusNegotiation 交渉中
	ProjectStatusNegotiation ProjectStatus = "negotiation"
	// ProjectStatusActive 進行中
	ProjectStatusActive ProjectStatus = "active"
	// ProjectStatusClosed 終了
	ProjectStatusClosed ProjectStatus = "closed"
	// ProjectStatusLost 失注
	ProjectStatusLost ProjectStatus = "lost"
)

// ContractType 契約形態
type ContractType string

const (
	// ContractTypeSES SES契約
	ContractTypeSES ContractType = "ses"
	// ContractTypeContract 請負契約
	ContractTypeContract ContractType = "contract"
	// ContractTypeDispatch 派遣契約
	ContractTypeDispatch ContractType = "dispatch"
)

// BillingType 請求タイプ
type BillingType string

const (
	// BillingTypeMonthly 月額請求
	BillingTypeMonthly BillingType = "monthly"
	// BillingTypeHourly 時間単価請求
	BillingTypeHourly BillingType = "hourly"
	// BillingTypeFixed 固定請求
	BillingTypeFixed BillingType = "fixed"
)

// Project 案件管理モデル
type Project struct {
	ID              string         `gorm:"type:varchar(255);primary_key" json:"id"`
	ClientID        string         `gorm:"type:varchar(255);not null" json:"client_id"`
	ProjectName     string         `gorm:"size:200;not null" json:"project_name"`
	ProjectCode     string         `gorm:"size:50" json:"project_code"`
	Status          ProjectStatus  `gorm:"size:50;default:'proposal'" json:"status"`
	StartDate       *time.Time     `json:"start_date"`
	EndDate         *time.Time     `json:"end_date"`
	MonthlyRate     float64        `gorm:"type:decimal(10,2)" json:"monthly_rate"`
	WorkingHoursMin int            `gorm:"default:140" json:"working_hours_min"`
	WorkingHoursMax int            `gorm:"default:180" json:"working_hours_max"`
	ContractType    ContractType   `gorm:"size:50;default:'ses'" json:"contract_type"`
	WorkLocation    string         `gorm:"size:255" json:"work_location"`
	Description     string         `gorm:"type:text" json:"description"`
	Requirements    string         `gorm:"type:text" json:"requirements"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーション
	Client      Client              `gorm:"foreignKey:ClientID" json:"client,omitempty"`
	Assignments []ProjectAssignment `gorm:"foreignKey:ProjectID" json:"assignments,omitempty"`
}

// Client 取引先管理モデル
type Client struct {
	ID              string      `gorm:"type:varchar(255);primary_key" json:"id"`
	CompanyName     string      `gorm:"size:200;not null" json:"company_name"`
	CompanyNameKana string      `gorm:"size:200;not null" json:"company_name_kana"`
	BillingType     BillingType `gorm:"size:50;default:'monthly'" json:"billing_type"`
	PaymentTerms    int         `gorm:"default:30" json:"payment_terms"`
	ContactPerson   string      `gorm:"size:100" json:"contact_person"`
	ContactEmail    string      `gorm:"size:100" json:"contact_email"`
	ContactPhone    string      `gorm:"size:20" json:"contact_phone"`
	Address         string      `gorm:"size:255" json:"address"`
	Notes           string      `gorm:"type:text" json:"notes"`

	// 営業管理フィールド（テストエラー対応）
	Name           string  `gorm:"size:200" json:"name"`             // CompanyNameのエイリアス
	IsActive       bool    `gorm:"default:true" json:"is_active"`    // アクティブ状態
	FreeePartnerID *string `gorm:"size:100" json:"freee_partner_id"` // freee提携ID

	// 経理機能拡張フィールド
	BillingClosingDay *int           `gorm:"default:null" json:"billing_closing_day"`
	FreeeClientID     *int           `json:"freee_client_id"`
	FreeSyncStatus    FreeSyncStatus `gorm:"type:enum('not_synced','synced','failed','pending');default:'not_synced'" json:"freee_sync_status"`
	FreeSyncedAt      *time.Time     `json:"freee_synced_at"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーション
	Projects      []Project      `gorm:"foreignKey:ClientID" json:"projects,omitempty"`
	Invoices      []Invoice      `gorm:"foreignKey:ClientID" json:"invoices,omitempty"`
	ProjectGroups []ProjectGroup `gorm:"foreignKey:ClientID" json:"project_groups,omitempty"`
}

// ProjectBillingType プロジェクト請求タイプ
type ProjectBillingType string

const (
	// ProjectBillingTypeFixed 固定請求
	ProjectBillingTypeFixed ProjectBillingType = "fixed"
	// ProjectBillingTypeVariableUpperLower 上下割請求
	ProjectBillingTypeVariableUpperLower ProjectBillingType = "variable_upper_lower"
	// ProjectBillingTypeVariableMiddle 中間値請求
	ProjectBillingTypeVariableMiddle ProjectBillingType = "variable_middle"
)

// ProjectAssignment エンジニア案件アサインモデル
type ProjectAssignment struct {
	ID              string     `gorm:"type:varchar(255);primary_key" json:"id"`
	ProjectID       string     `gorm:"type:varchar(255);not null" json:"project_id"`
	UserID string  `gorm:"type:varchar(255);not null" json:"user_id"`
	Role            string     `gorm:"size:100" json:"role"`
	StartDate       time.Time  `gorm:"not null" json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	UtilizationRate int        `gorm:"default:100" json:"utilization_rate"`
	BillingRate     float64    `gorm:"type:decimal(10,2)" json:"billing_rate"`
	Notes           string     `gorm:"type:text" json:"notes"`

	// 請求機能拡張フィールド
	BillingType *ProjectBillingType `gorm:"type:enum('fixed','variable_upper_lower','variable_middle')" json:"billing_type"`
	MinHours    *float64            `gorm:"type:decimal(5,2)" json:"min_hours"`
	MaxHours    *float64            `gorm:"type:decimal(5,2)" json:"max_hours"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーション
	Project Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	User    User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// BeforeCreate UUID生成
func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

// GetBillingType 請求タイプを取得（設定されていない場合は固定）
func (pa *ProjectAssignment) GetBillingType() ProjectBillingType {
	if pa.BillingType == nil {
		return ProjectBillingTypeFixed
	}
	return *pa.BillingType
}

// HasHourLimits 時間制限が設定されているかチェック
func (pa *ProjectAssignment) HasHourLimits() bool {
	return pa.MinHours != nil || pa.MaxHours != nil
}

// GetMinHours 最小時間を取得
func (pa *ProjectAssignment) GetMinHours() float64 {
	if pa.MinHours == nil {
		return 0
	}
	return *pa.MinHours
}

// GetMaxHours 最大時間を取得
func (pa *ProjectAssignment) GetMaxHours() float64 {
	if pa.MaxHours == nil {
		return 160 // デフォルト最大時間
	}
	return *pa.MaxHours
}

// IsActive アサインがアクティブかチェック
func (pa *ProjectAssignment) IsActive() bool {
	return pa.DeletedAt.Time.IsZero() && (pa.EndDate == nil || pa.EndDate.After(time.Now()))
}

// IsInBillingPeriod 指定された請求期間に含まれるかチェック
func (pa *ProjectAssignment) IsInBillingPeriod(billingYear int, billingMonth int) bool {
	billingStart := time.Date(billingYear, time.Month(billingMonth), 1, 0, 0, 0, 0, time.UTC)
	billingEnd := billingStart.AddDate(0, 1, 0).Add(-time.Nanosecond)

	// アサイン期間が請求期間と重複するかチェック
	assignStart := pa.StartDate
	assignEnd := time.Now()
	if pa.EndDate != nil {
		assignEnd = *pa.EndDate
	}

	return assignStart.Before(billingEnd) && assignEnd.After(billingStart)
}
