package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Department 部署モデル
type Department struct {
	ID        string  `gorm:"type:varchar(255);primary_key" json:"id"`
	Name      string  `gorm:"type:varchar(100);not null" json:"name" validate:"required,max=100"`
	ParentID  *string `gorm:"type:varchar(255)" json:"parent_id"`
	ManagerID *string `gorm:"type:varchar(255)" json:"manager_id"` // Cognito Sub
	SortOrder int     `gorm:"default:0" json:"sort_order"`
	IsActive  bool    `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"deleted_at,omitempty"`

	// リレーション
	Parent   *Department  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []Department `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Manager  *User        `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
	Users    []User       `gorm:"foreignKey:DepartmentID" json:"users,omitempty"`
}

// BeforeCreate IDの自動生成
func (d *Department) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.New().String()
	}
	return nil
}

// TableName テーブル名を指定
func (Department) TableName() string {
	return "departments"
}

// IsRoot 親部署が存在するかチェック
func (d *Department) IsRoot() bool {
	return d.ParentID == nil
}

// HasChildren 子部署が存在するかチェック
func (d *Department) HasChildren() bool {
	return len(d.Children) > 0
}

// GetPath 部署のパス（親 > 子）を取得
func (d *Department) GetPath() string {
	if d.Parent == nil {
		return d.Name
	}
	return d.Parent.GetPath() + " > " + d.Name
}

// DepartmentTree 部署の階層構造を表現する構造体
type DepartmentTree struct {
	Department
	Level    int              `json:"level"`
	Children []DepartmentTree `json:"children"`
}

// DepartmentSummary 部署サマリー（統計情報含む）
type DepartmentSummary struct {
	Department
	UserCount        int     `json:"user_count"`
	ActiveUserCount  int     `json:"active_user_count"`
	WeeklyReportRate float64 `json:"weekly_report_rate"`
	AverageWorkHours float64 `json:"average_work_hours"`
	AlertCount       int     `json:"alert_count"`
}
