package model

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// エクスポート関連のエラー定義
var (
	ErrInvalidParameter = errors.New("invalid parameter")
)

// ExportJobStatus エクスポートジョブのステータス
type ExportJobStatus string

const (
	ExportJobStatusPending    ExportJobStatus = "pending"    // 処理待ち
	ExportJobStatusProcessing ExportJobStatus = "processing" // 処理中
	ExportJobStatusCompleted  ExportJobStatus = "completed"  // 完了
	ExportJobStatusFailed     ExportJobStatus = "failed"     // 失敗
	ExportJobStatusCancelled  ExportJobStatus = "cancelled"  // キャンセル
)

// ExportJobType エクスポートジョブのタイプ
type ExportJobType string

const (
	ExportJobTypeWeeklyReport      ExportJobType = "weekly_report"      // 週報エクスポート
	ExportJobTypeMonthlyAttendance ExportJobType = "monthly_attendance" // 月次勤怠エクスポート
	ExportJobTypeMonthlySummary    ExportJobType = "monthly_summary"    // 月次サマリーエクスポート
)

// ExportJobFormat エクスポートフォーマット
type ExportJobFormat string

const (
    ExportJobFormatCSV ExportJobFormat = "csv"
)

// ExportJob エクスポートジョブモデル
type ExportJob struct {
	ID            string          `gorm:"type:varchar(255);primary_key" json:"id"`
	UserID        string          `gorm:"type:varchar(255);not null;index" json:"user_id"`
	JobType       ExportJobType   `gorm:"type:varchar(50);not null" json:"job_type"`
	Format        ExportJobFormat `gorm:"type:varchar(20);not null" json:"format"`
	Status        ExportJobStatus `gorm:"type:varchar(20);not null;default:'pending'" json:"status"`
	Parameters    json.RawMessage `gorm:"type:json" json:"parameters"`        // エクスポートパラメータ（フィルタ条件など）
	Progress      int             `gorm:"default:0" json:"progress"`          // 進捗率（0-100）
	TotalRecords  int             `gorm:"default:0" json:"total_records"`     // 総レコード数
	ProcessedRows int             `gorm:"default:0" json:"processed_rows"`    // 処理済みレコード数
	FileURL       *string         `gorm:"type:text" json:"file_url"`          // 生成されたファイルのURL
	FileName      *string         `gorm:"type:varchar(255)" json:"file_name"` // ファイル名
	FileSize      *int64          `gorm:"default:null" json:"file_size"`      // ファイルサイズ（バイト）
	ErrorMessage  *string         `gorm:"type:text" json:"error_message"`     // エラーメッセージ
	StartedAt     *time.Time      `gorm:"default:null" json:"started_at"`     // 処理開始時刻
	CompletedAt   *time.Time      `gorm:"default:null" json:"completed_at"`   // 処理完了時刻
	ExpiresAt     *time.Time      `gorm:"default:null" json:"expires_at"`     // ファイル有効期限
	CreatedAt     time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt     time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// リレーション
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName テーブル名を指定
func (ExportJob) TableName() string {
	return "export_jobs"
}

// BeforeCreate UUIDを生成
func (e *ExportJob) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// IsValid ステータスが有効かチェック
func (s ExportJobStatus) IsValid() bool {
	switch s {
	case ExportJobStatusPending, ExportJobStatusProcessing, ExportJobStatusCompleted,
		ExportJobStatusFailed, ExportJobStatusCancelled:
		return true
	}
	return false
}

// IsTerminal 終了状態かチェック
func (s ExportJobStatus) IsTerminal() bool {
	switch s {
	case ExportJobStatusCompleted, ExportJobStatusFailed, ExportJobStatusCancelled:
		return true
	}
	return false
}

// CanCancel キャンセル可能かチェック
func (s ExportJobStatus) CanCancel() bool {
	switch s {
	case ExportJobStatusPending, ExportJobStatusProcessing:
		return true
	}
	return false
}

// ExportJobParameters エクスポートパラメータの共通インターフェース
type ExportJobParameters interface {
	Validate() error
}

// WeeklyReportExportParams 週報エクスポートパラメータ
type WeeklyReportExportParams struct {
	StartDate    string   `json:"start_date"`
	EndDate      string   `json:"end_date"`
	Status       []string `json:"status,omitempty"`
	UserIDs      []string `json:"user_ids,omitempty"`
	DepartmentID *string  `json:"department_id,omitempty"`
}

// Validate パラメータのバリデーション
func (p WeeklyReportExportParams) Validate() error {
	if p.StartDate == "" || p.EndDate == "" {
		return ErrInvalidParameter
	}
	return nil
}

// MonthlyAttendanceExportParams 月次勤怠エクスポートパラメータ
type MonthlyAttendanceExportParams struct {
	Year         int      `json:"year"`
	Month        int      `json:"month"`
	UserIDs      []string `json:"user_ids,omitempty"`
	DepartmentID *string  `json:"department_id,omitempty"`
}

// Validate パラメータのバリデーション
func (p MonthlyAttendanceExportParams) Validate() error {
	if p.Year < 2020 || p.Year > 2100 {
		return ErrInvalidParameter
	}
	if p.Month < 1 || p.Month > 12 {
		return ErrInvalidParameter
	}
	return nil
}

// MonthlySummaryExportParams 月次サマリーエクスポートパラメータ
type MonthlySummaryExportParams struct {
	Year         int     `json:"year"`
	Month        int     `json:"month"`
	DepartmentID *string `json:"department_id,omitempty"`
}

// Validate パラメータのバリデーション
func (p MonthlySummaryExportParams) Validate() error {
	if p.Year < 2020 || p.Year > 2100 {
		return ErrInvalidParameter
	}
	if p.Month < 1 || p.Month > 12 {
		return ErrInvalidParameter
	}
	return nil
}
