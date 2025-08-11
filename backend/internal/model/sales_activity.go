package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SalesActivityType 営業活動タイプ
type SalesActivityType string

const (
	// SalesActivityTypeNewProposal 新規提案
	SalesActivityTypeNewProposal SalesActivityType = "new_proposal"
	// SalesActivityTypeExtension 延長提案
	SalesActivityTypeExtension SalesActivityType = "extension"
	// SalesActivityTypeUpsell アップセル
	SalesActivityTypeUpsell SalesActivityType = "upsell"
	// SalesActivityTypeReplacement 交代提案
	SalesActivityTypeReplacement SalesActivityType = "replacement"
	// SalesActivityTypeOther その他
	SalesActivityTypeOther SalesActivityType = "other"
)

// SalesActivityStatus 営業活動ステータス
type SalesActivityStatus string

const (
	// SalesActivityStatusPlanning 計画中
	SalesActivityStatusPlanning SalesActivityStatus = "planning"
	// SalesActivityStatusProposed 提案済み
	SalesActivityStatusProposed SalesActivityStatus = "proposed"
	// SalesActivityStatusNegotiating 交渉中
	SalesActivityStatusNegotiating SalesActivityStatus = "negotiating"
	// SalesActivityStatusWon 成約
	SalesActivityStatusWon SalesActivityStatus = "won"
	// SalesActivityStatusLost 失注
	SalesActivityStatusLost SalesActivityStatus = "lost"
	// SalesActivityStatusOnHold 保留
	SalesActivityStatusOnHold SalesActivityStatus = "on_hold"
)

// SalesActivity 営業活動管理モデル
type SalesActivity struct {
	ID                     string              `gorm:"type:varchar(255);primary_key" json:"id"`
	ClientID               string              `gorm:"type:varchar(255);not null" json:"client_id"`
	ProjectID              *string             `gorm:"type:varchar(255)" json:"project_id"`
	ActivityType           SalesActivityType   `gorm:"size:50;not null" json:"activity_type"`
	TargetUserID           *string             `gorm:"type:varchar(255)" json:"target_user_id"`
	SalesRepID             *string             `gorm:"type:varchar(255)" json:"sales_rep_id"`
	Status                 SalesActivityStatus `gorm:"size:50;default:'planning'" json:"status"`
	Probability            int                 `gorm:"default:0" json:"probability"`
	EstimatedMonthlyAmount float64             `gorm:"type:decimal(10,2)" json:"estimated_monthly_amount"`
	EstimatedStartDate     *time.Time          `json:"estimated_start_date"`
	NextAction             string              `gorm:"size:255" json:"next_action"`
	NextActionDate         *time.Time          `json:"next_action_date"`
	Notes                  string              `gorm:"type:text" json:"notes"`
	LostReason             string              `gorm:"size:255" json:"lost_reason"`
	CreatedAt              time.Time           `json:"created_at"`
	UpdatedAt              time.Time           `json:"updated_at"`
	DeletedAt              gorm.DeletedAt      `gorm:"index" json:"-"`

	// リレーション
	Client     Client   `gorm:"foreignKey:ClientID" json:"client,omitempty"`
	Project    *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	TargetUser *User    `gorm:"foreignKey:TargetUserID" json:"target_user,omitempty"`
	SalesRep   *User    `gorm:"foreignKey:SalesRepID" json:"sales_rep,omitempty"`
}

// BeforeCreate UUIDを生成
func (sa *SalesActivity) BeforeCreate(tx *gorm.DB) error {
	if sa.ID == "" {
		sa.ID = uuid.New().String()
	}
	return nil
}
