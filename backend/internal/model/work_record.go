package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkRecord 勤務記録モデル
type WorkRecord struct {
	ID              uuid.UUID        `gorm:"type:varchar(255);primary_key" json:"id"`
	CreatedAt       time.Time        `gorm:"not null;default:current_timestamp" json:"created_at"`
	UpdatedAt       time.Time        `gorm:"not null;default:current_timestamp on update current_timestamp" json:"updated_at"`
	DeletedAt       gorm.DeletedAt   `gorm:"index" json:"deleted_at,omitempty"`
	UserID string        `gorm:"type:varchar(255);not null;index:idx_work_record_user_project_date" json:"user_id"`
	ProjectID       uuid.UUID        `gorm:"type:varchar(255);not null;index:idx_work_record_user_project_date" json:"project_id"`
	WorkDate        time.Time        `gorm:"type:date;not null;index:idx_work_record_user_project_date" json:"work_date"`
	StartTime       *time.Time       `gorm:"type:time" json:"start_time"`
	EndTime         *time.Time       `gorm:"type:time" json:"end_time"`
	BreakMinutes    int              `gorm:"default:0" json:"break_minutes"`
	ActualHours     float64          `gorm:"type:decimal(5,2)" json:"actual_hours"`
	OvertimeHours   float64          `gorm:"type:decimal(5,2);default:0" json:"overtime_hours"`
	Notes           string           `gorm:"type:text" json:"notes"`
	Status          WorkRecordStatus `gorm:"type:enum('draft','submitted','approved','rejected');default:'draft'" json:"status"`
	SubmittedAt     *time.Time       `json:"submitted_at"`
	ApprovedAt      *time.Time       `json:"approved_at"`
	ApprovedBy      *uuid.UUID       `gorm:"type:varchar(255)" json:"approved_by"`
	RejectionReason string           `gorm:"type:text" json:"rejection_reason"`

	// リレーション
	User     *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Project  *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Approver *User    `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
}

// WorkRecordStatus 勤務記録ステータス
type WorkRecordStatus string

const (
	WorkRecordStatusDraft     WorkRecordStatus = "draft"     // 下書き
	WorkRecordStatusSubmitted WorkRecordStatus = "submitted" // 提出済み
	WorkRecordStatusApproved  WorkRecordStatus = "approved"  // 承認済み
	WorkRecordStatusRejected  WorkRecordStatus = "rejected"  // 却下
)

// BeforeCreate 作成前のフック
func (w *WorkRecord) BeforeCreate(tx *gorm.DB) error {
	// IDが未設定の場合は新規生成
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}

	// 実働時間を計算
	w.calculateActualHours()

	return nil
}

// BeforeUpdate 更新前のフック
func (w *WorkRecord) BeforeUpdate(tx *gorm.DB) error {
	// 実働時間を再計算
	w.calculateActualHours()

	return nil
}

// calculateActualHours 実働時間を計算
func (w *WorkRecord) calculateActualHours() {
	if w.StartTime == nil || w.EndTime == nil {
		w.ActualHours = 0
		w.OvertimeHours = 0
		return
	}

	// 終了時刻から開始時刻を引いて稼働時間を計算
	duration := w.EndTime.Sub(*w.StartTime)
	hours := duration.Hours()

	// 休憩時間を減算
	if w.BreakMinutes > 0 {
		hours -= float64(w.BreakMinutes) / 60
	}

	// マイナスにならないように調整
	if hours < 0 {
		hours = 0
	}

	w.ActualHours = hours

	// 8時間を超える分を残業時間として計算
	if hours > 8 {
		w.OvertimeHours = hours - 8
	} else {
		w.OvertimeHours = 0
	}
}

// CanEdit 編集可能かチェック
func (w *WorkRecord) CanEdit() bool {
	return w.Status == WorkRecordStatusDraft || w.Status == WorkRecordStatusRejected
}

// CanSubmit 提出可能かチェック
func (w *WorkRecord) CanSubmit() bool {
	return w.Status == WorkRecordStatusDraft || w.Status == WorkRecordStatusRejected
}

// CanApprove 承認可能かチェック
func (w *WorkRecord) CanApprove() bool {
	return w.Status == WorkRecordStatusSubmitted
}

// Submit 提出する
func (w *WorkRecord) Submit() error {
	if !w.CanSubmit() {
		return gorm.ErrInvalidData
	}

	now := time.Now()
	w.Status = WorkRecordStatusSubmitted
	w.SubmittedAt = &now
	return nil
}

// Approve 承認する
func (w *WorkRecord) Approve(approverID uuid.UUID) error {
	if !w.CanApprove() {
		return gorm.ErrInvalidData
	}

	now := time.Now()
	w.Status = WorkRecordStatusApproved
	w.ApprovedAt = &now
	w.ApprovedBy = &approverID
	w.RejectionReason = ""
	return nil
}

// Reject 却下する
func (w *WorkRecord) Reject(approverID uuid.UUID, reason string) error {
	if !w.CanApprove() {
		return gorm.ErrInvalidData
	}

	now := time.Now()
	w.Status = WorkRecordStatusRejected
	w.ApprovedAt = &now
	w.ApprovedBy = &approverID
	w.RejectionReason = reason
	return nil
}
