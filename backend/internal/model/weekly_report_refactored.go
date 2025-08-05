package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WeeklyReportMetadata 週報のメタデータ（拡張用）
type WeeklyReportMetadata struct {
	SubmissionSource   string                 `json:"submission_source,omitempty"`   // web, mobile, api
	DeviceInfo         string                 `json:"device_info,omitempty"`         // デバイス情報
	ClientIP           string                 `json:"client_ip,omitempty"`           // 送信元IP
	UserAgent          string                 `json:"user_agent,omitempty"`          // User-Agent
	SubmissionDuration int                    `json:"submission_duration,omitempty"` // 入力にかかった時間（秒）
	AutoSaveCount      int                    `json:"auto_save_count,omitempty"`     // 自動保存回数
	ValidationErrors   []string               `json:"validation_errors,omitempty"`   // バリデーションエラー履歴
	CustomFields       map[string]interface{} `json:"custom_fields,omitempty"`       // カスタムフィールド
}

// Value JSON型のValue実装
func (w WeeklyReportMetadata) Value() (driver.Value, error) {
	return json.Marshal(w)
}

// Scan JSON型のScan実装
func (w *WeeklyReportMetadata) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into WeeklyReportMetadata", value)
	}

	return json.Unmarshal(bytes, w)
}

// WeeklyReportRefactored リファクタリング後の週報モデル
// 既存のWeeklyReportモデルとの互換性を保ちながら拡張
type WeeklyReportRefactored struct {
	// 基本フィールド（既存との互換性）
	ID                       uuid.UUID              `gorm:"type:varchar(255);primary_key;default:(UUID())" json:"id"`
	UserID string              `gorm:"type:varchar(255);not null" json:"user_id"`
	StartDate                time.Time              `gorm:"not null" json:"start_date"`
	EndDate                  time.Time              `gorm:"not null" json:"end_date"`
	Status                   WeeklyReportStatusEnum `gorm:"type:enum('draft','submitted','approved','rejected');default:'draft';not null" json:"status"`
	WeeklyRemarks            string                 `gorm:"type:text" json:"weekly_remarks"`
	WorkplaceName            string                 `gorm:"size:100" json:"workplace_name"`
	WorkplaceHours           string                 `gorm:"size:100" json:"workplace_hours"`
	WorkplaceChangeRequested bool                   `gorm:"default:false" json:"workplace_change_requested"`
	TotalWorkHours           float64                `gorm:"type:decimal(5,2);default:0" json:"total_work_hours"`
	ClientTotalWorkHours     float64                `gorm:"type:decimal(5,2);default:0" json:"client_total_work_hours"`
	ClientWorkHours          float64                `gorm:"type:decimal(5,2);default:0" json:"client_work_hours"`
	SubmittedAt              *time.Time             `json:"submitted_at,omitempty"`
	ManagerComment           *string                `gorm:"type:text" json:"manager_comment,omitempty"`
	CommentedBy              *uuid.UUID             `gorm:"type:varchar(255)" json:"commented_by,omitempty"`
	CommentedAt              *time.Time             `json:"commented_at,omitempty"`

	// 新規フィールド（リファクタリングで追加）
	DepartmentID       *uuid.UUID            `gorm:"type:varchar(255)" json:"department_id,omitempty"`
	DepartmentName     *string               `gorm:"type:varchar(100)" json:"department_name,omitempty"`
	ManagerID          *uuid.UUID            `gorm:"type:varchar(255)" json:"manager_id,omitempty"`
	SubmissionDeadline *time.Time            `gorm:"type:date" json:"submission_deadline,omitempty"`
	IsLateSubmission   bool                  `gorm:"default:false" json:"is_late_submission"`
	RevisionCount      int                   `gorm:"default:0" json:"revision_count"`
	LastAccessedAt     *time.Time            `json:"last_accessed_at,omitempty"`
	Metadata           *WeeklyReportMetadata `gorm:"type:json" json:"metadata,omitempty"`

	// タイムスタンプ
	CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーション
	User          *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Department    *Department    `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	Manager       *User          `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
	CommentedUser *User          `gorm:"foreignKey:CommentedBy" json:"commented_user,omitempty"`
	DailyRecords  []*DailyRecord `gorm:"foreignKey:WeeklyReportID" json:"daily_records,omitempty"`
}

// BeforeCreate IDの自動生成とデフォルト値設定
func (w *WeeklyReportRefactored) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}

	// 提出期限の自動計算（設定されていない場合）
	if w.SubmissionDeadline == nil {
		deadline := w.CalculateSubmissionDeadline()
		w.SubmissionDeadline = &deadline
	}

	return nil
}

// BeforeUpdate 更新前の処理
func (w *WeeklyReportRefactored) BeforeUpdate(tx *gorm.DB) error {
	// 最終アクセス日時の更新
	now := time.Now()
	w.LastAccessedAt = &now

	return nil
}

// TableName テーブル名を指定（既存テーブル名と同じ）
func (WeeklyReportRefactored) TableName() string {
	return "weekly_reports"
}

// IsSubmitted 提出済みかどうか
func (w *WeeklyReportRefactored) IsSubmitted() bool {
	return w.Status == WeeklyReportStatusSubmitted ||
		w.Status == WeeklyReportStatusApproved ||
		w.Status == WeeklyReportStatusRejected
}

// IsEditable 編集可能かどうか
func (w *WeeklyReportRefactored) IsEditable() bool {
	return w.Status == WeeklyReportStatusDraft
}

// IsOverdue 期限切れかどうか
func (w *WeeklyReportRefactored) IsOverdue() bool {
	if w.SubmissionDeadline == nil {
		return false
	}

	now := time.Now()
	return !w.IsSubmitted() && now.After(*w.SubmissionDeadline)
}

// GetDaysUntilDeadline 締切までの日数を取得
func (w *WeeklyReportRefactored) GetDaysUntilDeadline() int {
	if w.SubmissionDeadline == nil {
		return 0
	}

	now := time.Now()
	diff := w.SubmissionDeadline.Sub(now)
	return int(diff.Hours() / 24)
}

// CalculateSubmissionDeadline 提出期限を計算
func (w *WeeklyReportRefactored) CalculateSubmissionDeadline() time.Time {
	// 週の終了日（日曜日）の翌日（月曜日）正午を期限とする
	return w.EndDate.AddDate(0, 0, 1).Add(12 * time.Hour)
}

// Submit 週報を提出済みにする
func (w *WeeklyReportRefactored) Submit() error {
	if w.IsSubmitted() {
		return fmt.Errorf("この週報は既に提出済みです")
	}

	w.Status = WeeklyReportStatusSubmitted
	now := time.Now()
	w.SubmittedAt = &now

	// 遅延提出チェック
	if w.SubmissionDeadline != nil && now.After(*w.SubmissionDeadline) {
		w.IsLateSubmission = true
	}

	return nil
}

// AddComment 管理者コメントを追加
func (w *WeeklyReportRefactored) AddComment(commentedBy uuid.UUID, comment string) {
	w.ManagerComment = &comment
	w.CommentedBy = &commentedBy
	now := time.Now()
	w.CommentedAt = &now
	w.RevisionCount++
}

// GetWeekRange 週の範囲を文字列で取得
func (w *WeeklyReportRefactored) GetWeekRange() string {
	return fmt.Sprintf("%s - %s",
		w.StartDate.Format("2006/01/02"),
		w.EndDate.Format("2006/01/02"))
}

// HasComments 管理者コメントがあるかどうか
func (w *WeeklyReportRefactored) HasComments() bool {
	return w.ManagerComment != nil && *w.ManagerComment != ""
}

// GetTotalWorkDays 勤務日数を取得
func (w *WeeklyReportRefactored) GetTotalWorkDays() int {
	workDays := 0
	for _, record := range w.DailyRecords {
		if record.WorkHours > 0 || record.ClientWorkHours > 0 {
			workDays++
		}
	}
	return workDays
}

// SetDepartmentInfo 部署情報を設定（提出時に実行）
func (w *WeeklyReportRefactored) SetDepartmentInfo(user *User) {
	if user.DepartmentID != nil {
		// string型のDepartmentIDをuuid.UUIDに変換
		if deptID, err := uuid.Parse(*user.DepartmentID); err == nil {
			w.DepartmentID = &deptID
		}
		// string型のManagerIDをuuid.UUIDに変換
		if user.ManagerID != nil {
			if mgrID, err := uuid.Parse(*user.ManagerID); err == nil {
				w.ManagerID = &mgrID
			}
		}

		// 部署名は別途取得が必要（Departmentリレーションが読み込まれている場合）
	}
}

// WeeklyReportSummary 週報サマリー（一覧表示用）
type WeeklyReportSummary struct {
	ID                   uuid.UUID  `json:"id"`
	UserID string  `json:"user_id"`
	UserName             string     `json:"user_name"`
	DepartmentName       *string    `json:"department_name,omitempty"`
	WeekRange            string     `json:"week_range"`
	Status               string     `json:"status"`
	TotalWorkHours       float64    `json:"total_work_hours"`
	ClientTotalWorkHours float64    `json:"client_total_work_hours"`
	SubmittedAt          *time.Time `json:"submitted_at,omitempty"`
	IsLateSubmission     bool       `json:"is_late_submission"`
	IsOverdue            bool       `json:"is_overdue"`
	HasComments          bool       `json:"has_comments"`
	LastAccessedAt       *time.Time `json:"last_accessed_at,omitempty"`
}

// WeeklyReportStats 週報統計情報
type WeeklyReportStats struct {
	TotalReports     int     `json:"total_reports"`
	SubmittedReports int     `json:"submitted_reports"`
	DraftReports     int     `json:"draft_reports"`
	OverdueReports   int     `json:"overdue_reports"`
	LateSubmissions  int     `json:"late_submissions"`
	SubmissionRate   float64 `json:"submission_rate"`
	AverageWorkHours float64 `json:"average_work_hours"`
}
