package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ProjectGroup プロジェクトグループモデル
type ProjectGroup struct {
	ID          uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	GroupName   string         `gorm:"size:255;not null" json:"group_name"`
	ClientID    uuid.UUID      `gorm:"type:varchar(36);not null" json:"client_id"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedBy   uuid.UUID      `gorm:"type:varchar(36);not null" json:"created_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーション
	Client   Client                `gorm:"foreignKey:ClientID" json:"client,omitempty"`
	Creator  User                  `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Mappings []ProjectGroupMapping `gorm:"foreignKey:ProjectGroupID" json:"mappings,omitempty"`
	Projects []Project             `gorm:"many2many:project_group_mappings;" json:"projects,omitempty"`
	Invoices []Invoice             `gorm:"foreignKey:ProjectGroupID" json:"invoices,omitempty"`
}

// BeforeCreate UUIDを生成
func (pg *ProjectGroup) BeforeCreate(tx *gorm.DB) error {
	if pg.ID == uuid.Nil {
		pg.ID = uuid.New()
	}
	return nil
}

// ProjectGroupMapping プロジェクトグループマッピングモデル
type ProjectGroupMapping struct {
	ID             uuid.UUID `gorm:"type:varchar(36);primary_key" json:"id"`
	ProjectGroupID uuid.UUID `gorm:"type:varchar(36);not null" json:"project_group_id"`
	ProjectID      uuid.UUID `gorm:"type:varchar(36);not null" json:"project_id"`
	CreatedAt      time.Time `json:"created_at"`

	// リレーション
	ProjectGroup ProjectGroup `gorm:"foreignKey:ProjectGroupID" json:"project_group,omitempty"`
	Project      Project      `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

// BeforeCreate UUIDを生成
func (pgm *ProjectGroupMapping) BeforeCreate(tx *gorm.DB) error {
	if pgm.ID == uuid.Nil {
		pgm.ID = uuid.New()
	}
	return nil
}

// ProjectGroupWithProjects プロジェクト詳細付きのプロジェクトグループ
type ProjectGroupWithProjects struct {
	ProjectGroup
	ProjectCount    int        `json:"project_count"`
	TotalRevenue    float64    `json:"total_revenue"`
	LastInvoiceDate *time.Time `json:"last_invoice_date"`
}

// ProjectGroupSummary プロジェクトグループサマリー
type ProjectGroupSummary struct {
	ID              uuid.UUID  `json:"id"`
	GroupName       string     `json:"group_name"`
	ClientName      string     `json:"client_name"`
	ProjectCount    int        `json:"project_count"`
	ActiveProjects  int        `json:"active_projects"`
	TotalRevenue    float64    `json:"total_revenue"`
	LastInvoiceDate *time.Time `json:"last_invoice_date"`
	CreatedAt       time.Time  `json:"created_at"`
}

// ProjectGroupStats プロジェクトグループ統計
type ProjectGroupStats struct {
	TotalGroups    int     `json:"total_groups"`
	ActiveGroups   int     `json:"active_groups"`
	TotalProjects  int     `json:"total_projects"`
	TotalRevenue   float64 `json:"total_revenue"`
	AverageRevenue float64 `json:"average_revenue"`
}

// TableName テーブル名を明示的に指定
func (ProjectGroup) TableName() string {
	return "project_groups"
}

// TableName テーブル名を明示的に指定
func (ProjectGroupMapping) TableName() string {
	return "project_group_mappings"
}

// IsActive プロジェクトグループがアクティブかチェック
func (pg *ProjectGroup) IsActive() bool {
	return pg.DeletedAt.Time.IsZero()
}

// HasProjects プロジェクトが関連付けられているかチェック
func (pg *ProjectGroup) HasProjects() bool {
	return len(pg.Projects) > 0 || len(pg.Mappings) > 0
}

// GetActiveProjectCount アクティブなプロジェクト数を取得
func (pg *ProjectGroup) GetActiveProjectCount() int {
	count := 0
	for _, project := range pg.Projects {
		if project.DeletedAt.Time.IsZero() {
			count++
		}
	}
	return count
}
