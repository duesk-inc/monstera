package model

import (
	"time"

	"github.com/google/uuid"
)

// LeaveRequest は休暇申請を表すモデルです
type LeaveRequest struct {
	ID              uuid.UUID  `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID string  `gorm:"type:varchar(255)" json:"user_id"`
	LeaveTypeID     uuid.UUID  `gorm:"type:varchar(255)" json:"leave_type_id"`
	RequestDate     time.Time  `json:"request_date"`
	IsHourlyBased   bool       `json:"is_hourly_based"`
	Reason          string     `gorm:"type:text" json:"reason"`
	TotalDays       float64    `gorm:"type:decimal(5,1)" json:"total_days"`
	Status          string     `gorm:"type:enum('pending','approved','rejected','cancelled');default:'pending';not null" json:"status"`
	ApproverID      *uuid.UUID `gorm:"type:varchar(255)" json:"approver_id"`
	ProcessedAt     *time.Time `json:"processed_at"`
	RejectionReason string     `gorm:"type:text" json:"rejection_reason"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	DeletedAt       *time.Time `gorm:"index" json:"deleted_at"`

	// リレーション
	LeaveType LeaveType            `gorm:"foreignKey:LeaveTypeID" json:"leave_type"`
	User      User                 `gorm:"foreignKey:UserID" json:"user"`
	Approver  User                 `gorm:"foreignKey:ApproverID;references:ID" json:"approver"`
	Details   []LeaveRequestDetail `gorm:"foreignKey:LeaveRequestID" json:"details"`
}

// TableName はテーブル名を指定します
func (LeaveRequest) TableName() string {
	return "leave_requests"
}

// LeaveRequestStatus 休暇申請ステータス定義
const (
	LeaveRequestStatusPending   = "pending"   // 申請中
	LeaveRequestStatusApproved  = "approved"  // 承認済み
	LeaveRequestStatusRejected  = "rejected"  // 却下
	LeaveRequestStatusCancelled = "cancelled" // 取消
)

// 既存のVARCHAR型との互換性を保つための変換関数（移行期間中のみ使用）
func NormalizeLeaveRequestStatus(status string) string {
	switch status {
	case "pending":
		return LeaveRequestStatusPending
	case "approved":
		return LeaveRequestStatusApproved
	case "rejected":
		return LeaveRequestStatusRejected
	case "cancelled":
		return LeaveRequestStatusCancelled
	default:
		return LeaveRequestStatusPending
	}
}
