package model

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EngineerProjectHistory エンジニアプロジェクト履歴
type EngineerProjectHistory struct {
	ID        uuid.UUID  `gorm:"type:varchar(255);primaryKey" json:"id"`
	UserID string  `gorm:"type:varchar(255);not null" json:"user_id"`
	ProjectID uuid.UUID  `gorm:"type:varchar(255);not null" json:"project_id"`
	Role      string     `gorm:"type:enum('manager','leader','member');not null" json:"role"`
	StartDate time.Time  `gorm:"type:date;not null" json:"start_date"`
	EndDate   *time.Time `gorm:"type:date" json:"end_date"`
	IsCurrent bool       `gorm:"type:boolean;default:false" json:"is_current"`
	CreatedAt time.Time  `gorm:"type:datetime(3);not null;default:CURRENT_TIMESTAMP(3)" json:"created_at"`
	UpdatedAt time.Time  `gorm:"type:datetime(3);default:CURRENT_TIMESTAMP(3)" json:"updated_at"`

	// Relations
	User    *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Project *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

// TableName テーブル名を指定
func (EngineerProjectHistory) TableName() string {
	return "engineer_project_history"
}

// BeforeCreate UUID自動生成
func (e *EngineerProjectHistory) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

// BeforeSave 保存前の処理
func (e *EngineerProjectHistory) BeforeSave(tx *gorm.DB) error {
	// 現在参画中フラグの整合性チェック
	if e.IsCurrent && e.EndDate != nil {
		return gorm.ErrInvalidData
	}
	return nil
}

// プロジェクトロールの定数
const (
	ProjectRoleManager = "manager" // マネージャー
	ProjectRoleLeader  = "leader"  // リーダー
	ProjectRoleMember  = "member"  // メンバー
)

// IsValidProjectRole プロジェクトロールの妥当性チェック
func IsValidProjectRole(role string) bool {
	switch role {
	case ProjectRoleManager, ProjectRoleLeader, ProjectRoleMember:
		return true
	default:
		return false
	}
}

// GetProjectRoleLabel プロジェクトロールの表示名を取得
func GetProjectRoleLabel(role string) string {
	switch role {
	case ProjectRoleManager:
		return "マネージャー"
	case ProjectRoleLeader:
		return "リーダー"
	case ProjectRoleMember:
		return "メンバー"
	default:
		return "不明"
	}
}

// IsActive プロジェクトがアクティブかどうかを判定
func (e *EngineerProjectHistory) IsActive() bool {
	return e.IsCurrent && e.EndDate == nil
}

// GetDuration プロジェクト参画期間を取得
func (e *EngineerProjectHistory) GetDuration() string {
	endDate := time.Now()
	if e.EndDate != nil {
		endDate = *e.EndDate
	}

	duration := endDate.Sub(e.StartDate)
	days := int(duration.Hours() / 24)

	if days < 30 {
		return fmt.Sprintf("%d日", days)
	} else if days < 365 {
		months := days / 30
		return fmt.Sprintf("%dヶ月", months)
	} else {
		years := days / 365
		months := (days % 365) / 30
		if months > 0 {
			return fmt.Sprintf("%d年%dヶ月", years, months)
		}
		return fmt.Sprintf("%d年", years)
	}
}
