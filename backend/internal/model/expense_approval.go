package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ApprovalType 承認種別
type ApprovalType string

const (
	// ApprovalTypeManager 管理部承認
	ApprovalTypeManager ApprovalType = "manager"
	// ApprovalTypeExecutive 役員承認
	ApprovalTypeExecutive ApprovalType = "executive"
)

// ApprovalStatus 承認ステータス
type ApprovalStatus string

const (
	// ApprovalStatusPending 承認待ち
	ApprovalStatusPending ApprovalStatus = "pending"
	// ApprovalStatusApproved 承認済み
	ApprovalStatusApproved ApprovalStatus = "approved"
	// ApprovalStatusRejected 却下
	ApprovalStatusRejected ApprovalStatus = "rejected"
)

// ExpenseApproval 経費承認履歴モデル
type ExpenseApproval struct {
	ID            string         `gorm:"type:varchar(255);primary_key" json:"id"`
	ExpenseID     string         `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"expense_id"`
	Expense       Expense        `gorm:"foreignKey:ExpenseID" json:"expense"`
	ApproverID    string         `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"approver_id"`
	Approver      User           `gorm:"foreignKey:ApproverID" json:"approver"`
	ApprovalType  ApprovalType   `gorm:"type:enum('manager','executive');not null" json:"approval_type"`
	ApprovalOrder int            `gorm:"not null;default:1" json:"approval_order"` // 承認順序（1段階目、2段階目）
	Status        ApprovalStatus `gorm:"type:enum('pending','approved','rejected');default:'pending';not null" json:"status"`
	Comment       string         `gorm:"type:text" json:"comment"` // 承認・却下コメント
	ApprovedAt    *time.Time     `json:"approved_at"`              // 承認・却下日時
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// BeforeCreate UUIDを生成
func (ea *ExpenseApproval) BeforeCreate(tx *gorm.DB) error {
	if ea.ID == "" {
		ea.ID = uuid.New().String()
	}
	return nil
}

// IsApproved 承認済みかチェック
func (ea *ExpenseApproval) IsApproved() bool {
	return ea.Status == ApprovalStatusApproved
}

// IsRejected 却下されているかチェック
func (ea *ExpenseApproval) IsRejected() bool {
	return ea.Status == ApprovalStatusRejected
}

// IsPending 承認待ちかチェック
func (ea *ExpenseApproval) IsPending() bool {
	return ea.Status == ApprovalStatusPending
}

// Approve 承認処理
func (ea *ExpenseApproval) Approve(comment string) {
	ea.Status = ApprovalStatusApproved
	ea.Comment = comment
	now := time.Now()
	ea.ApprovedAt = &now
}

// Reject 却下処理
func (ea *ExpenseApproval) Reject(comment string) {
	ea.Status = ApprovalStatusRejected
	ea.Comment = comment
	now := time.Now()
	ea.ApprovedAt = &now
}
