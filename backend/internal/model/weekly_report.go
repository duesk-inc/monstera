package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WeeklyReport 週報モデル
type WeeklyReport struct {
	ID                       uuid.UUID              `gorm:"type:varchar(36);primary_key" json:"id"`
	UserID                   uuid.UUID              `gorm:"type:varchar(36);not null" json:"user_id"`
	User                     User                   `gorm:"foreignKey:UserID" json:"user"`
	StartDate                time.Time              `gorm:"not null" json:"start_date"` // 週の開始日（月曜日）
	EndDate                  time.Time              `gorm:"not null" json:"end_date"`   // 週の終了日（日曜日）
	Status                   WeeklyReportStatusEnum `gorm:"type:enum('draft','submitted','approved','rejected');default:'draft';not null" json:"status"`
	WeeklyRemarks            string                 `gorm:"type:text" json:"weekly_remarks"`
	WorkplaceName            string                 `gorm:"size:100" json:"workplace_name"`
	WorkplaceHours           string                 `gorm:"size:100" json:"workplace_hours"`
	WorkplaceChangeRequested bool                   `gorm:"default:false" json:"workplace_change_requested"`
	TotalWorkHours           float64                `json:"total_work_hours"`
	ClientTotalWorkHours     float64                `json:"client_total_work_hours"`
	ClientWorkHours          float64                `json:"client_work_hours"` // 管理者画面用に追加
	SubmittedAt              *time.Time             `json:"submitted_at"`
	SubmissionDeadline       *time.Time             `json:"submission_deadline"`
	ManagerComment           *string                `gorm:"type:text" json:"manager_comment"`
	CommentedBy              *uuid.UUID             `gorm:"type:varchar(36)" json:"commented_by"`
	CommentedAt              *time.Time             `json:"commented_at"`
	DailyRecords             []*DailyRecord         `gorm:"foreignKey:WeeklyReportID" json:"daily_records,omitempty"`
	CreatedAt                time.Time              `json:"created_at"`
	UpdatedAt                time.Time              `json:"updated_at"`
	DeletedAt                gorm.DeletedAt         `gorm:"index" json:"-"`
}

// WeeklyReportStatus 週報ステータス定義
const (
	WeeklyReportStatusDraft     WeeklyReportStatusEnum = "draft"     // 下書き
	WeeklyReportStatusSubmitted WeeklyReportStatusEnum = "submitted" // 提出済み
	WeeklyReportStatusApproved  WeeklyReportStatusEnum = "approved"  // 承認済み
	WeeklyReportStatusRejected  WeeklyReportStatusEnum = "rejected"  // 却下
)

// 既存のINT型との互換性を保つための変換マップ（移行期間中のみ使用）
var LegacyReportStatusMap = map[int]WeeklyReportStatusEnum{
	0: WeeklyReportStatusDraft,     // NotSubmitted → draft
	1: WeeklyReportStatusDraft,     // Draft → draft
	2: WeeklyReportStatusSubmitted, // Submitted → submitted
	3: WeeklyReportStatusApproved,  // 互換性のため
	4: WeeklyReportStatusRejected,  // 互換性のため
}

// ConvertLegacyReportStatus INT型ステータスを文字列に変換（移行期間中のみ）
func ConvertLegacyReportStatus(intStatus int) WeeklyReportStatusEnum {
	if status, ok := LegacyReportStatusMap[intStatus]; ok {
		return status
	}
	return WeeklyReportStatusDraft
}

// BeforeCreate UUIDを生成
func (r *WeeklyReport) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// AfterFind is not needed anymore since we're using a custom scanner
