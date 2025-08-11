package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ExpenseApproverSetting 経費申請承認者設定モデル
type ExpenseApproverSetting struct {
	ID           string       `gorm:"type:varchar(255);primary_key" json:"id"`
	ApprovalType ApprovalType `gorm:"type:enum('manager','executive');not null" json:"approval_type"`
	ApproverID   string       `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"approver_id"`
	Approver     User         `gorm:"foreignKey:ApproverID;references:ID" json:"approver"`
	IsActive     bool         `gorm:"default:true" json:"is_active"`
	Priority     int          `gorm:"default:1" json:"priority"`
	CreatedBy    string       `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"created_by"`
	Creator      User         `gorm:"foreignKey:CreatedBy;references:ID" json:"creator"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

// TableName テーブル名を指定
func (ExpenseApproverSetting) TableName() string {
	return "expense_approver_settings"
}

// BeforeCreate 作成前の処理
func (s *ExpenseApproverSetting) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// ExpenseApproverSettingHistory 承認者設定履歴モデル
type ExpenseApproverSettingHistory struct {
	ID           string                 `gorm:"type:varchar(255);primary_key" json:"id"`
	SettingID    string                 `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"setting_id"`
	ApprovalType ApprovalType           `gorm:"type:enum('manager','executive');not null" json:"approval_type"`
	ApproverID   string                 `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"approver_id"`
	Action       string                 `gorm:"type:enum('create','update','delete');not null" json:"action"`
	ChangedBy    string                 `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"changed_by"`
	Changer      User                   `gorm:"foreignKey:ChangedBy;references:ID" json:"changer"`
	ChangedAt    time.Time              `json:"changed_at"`
	OldValue     map[string]interface{} `gorm:"type:json" json:"old_value"`
	NewValue     map[string]interface{} `gorm:"type:json" json:"new_value"`
}

// TableName テーブル名を指定
func (ExpenseApproverSettingHistory) TableName() string {
	return "expense_approver_setting_histories"
}

// BeforeCreate 作成前の処理
func (h *ExpenseApproverSettingHistory) BeforeCreate(tx *gorm.DB) error {
	if h.ID == "" {
		h.ID = uuid.New().String()
	}
	return nil
}
