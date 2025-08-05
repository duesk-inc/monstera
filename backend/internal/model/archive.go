package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ArchiveReason アーカイブ理由
type ArchiveReason string

const (
	ArchiveReasonRetentionPolicy ArchiveReason = "retention_policy" // 保存ポリシーによる自動アーカイブ
	ArchiveReasonManual          ArchiveReason = "manual"           // 手動アーカイブ
	ArchiveReasonDataMigration   ArchiveReason = "data_migration"   // データ移行
)

// ArchiveType アーカイブタイプ
type ArchiveType string

const (
	ArchiveTypeWeeklyReports ArchiveType = "weekly_reports"
	ArchiveTypeDailyRecords  ArchiveType = "daily_records"
	ArchiveTypeWorkHours     ArchiveType = "work_hours"
	ArchiveTypeBulkArchive   ArchiveType = "bulk_archive"
)

// ExecutionMethod 実行方法
type ExecutionMethod string

const (
	ExecutionMethodBatch  ExecutionMethod = "batch"
	ExecutionMethodManual ExecutionMethod = "manual"
	ExecutionMethodAPI    ExecutionMethod = "api"
)

// ArchiveStatus アーカイブ処理のステータス
type ArchiveStatus string

const (
	ArchiveStatusPending    ArchiveStatus = "pending"
	ArchiveStatusProcessing ArchiveStatus = "processing"
	ArchiveStatusCompleted  ArchiveStatus = "completed"
	ArchiveStatusFailed     ArchiveStatus = "failed"
	ArchiveStatusCancelled  ArchiveStatus = "cancelled"
)

// WeeklyReportArchive アーカイブされた週報モデル
type WeeklyReportArchive struct {
	ID                   uuid.UUID     `gorm:"type:varchar(255);primary_key" json:"id"`
	OriginalID           uuid.UUID     `gorm:"type:varchar(255);not null;index" json:"original_id"`
	UserID string     `gorm:"type:varchar(255);not null;index" json:"user_id"`
	UserName             string        `gorm:"type:varchar(255);not null" json:"user_name"`
	UserEmail            string        `gorm:"type:varchar(255);not null" json:"user_email"`
	DepartmentID         *uuid.UUID    `gorm:"type:varchar(255);index" json:"department_id"`
	DepartmentName       *string       `gorm:"type:varchar(255)" json:"department_name"`
	StartDate            time.Time     `gorm:"type:date;not null;index" json:"start_date"`
	EndDate              time.Time     `gorm:"type:date;not null;index" json:"end_date"`
	Status               string        `gorm:"type:enum('draft','submitted','approved','rejected');not null;default:'draft';index" json:"status"`
	Mood                 int           `gorm:"type:tinyint;not null;default:1;check:mood BETWEEN 1 AND 5" json:"mood"`
	TotalWorkHours       float64       `gorm:"type:decimal(5,2);not null;default:0.00" json:"total_work_hours"`
	ClientTotalWorkHours float64       `gorm:"type:decimal(5,2);not null;default:0.00" json:"client_total_work_hours"`
	OvertimeHours        float64       `gorm:"type:decimal(5,2);not null;default:0.00" json:"overtime_hours"`
	Comment              *string       `gorm:"type:text" json:"comment"`
	ManagerComment       *string       `gorm:"type:text" json:"manager_comment"`
	SubmittedAt          *time.Time    `gorm:"default:null" json:"submitted_at"`
	CommentedAt          *time.Time    `gorm:"default:null" json:"commented_at"`
	ArchivedAt           time.Time     `gorm:"not null;default:CURRENT_TIMESTAMP;index" json:"archived_at"`
	ArchivedBy string     `gorm:"type:varchar(255);not null" json:"archived_by"`
	ArchiveReason        ArchiveReason `gorm:"type:enum('retention_policy','manual','data_migration');not null;default:'retention_policy';index" json:"archive_reason"`
	FiscalYear           int           `gorm:"type:year;not null" json:"fiscal_year"`
	FiscalQuarter        int           `gorm:"type:tinyint;not null;check:fiscal_quarter BETWEEN 1 AND 4" json:"fiscal_quarter"`
	OriginalCreatedAt    time.Time     `gorm:"not null" json:"original_created_at"`
	OriginalUpdatedAt    time.Time     `gorm:"not null" json:"original_updated_at"`
	CreatedAt            time.Time     `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt            time.Time     `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// リレーション
	DailyRecords   []DailyRecordArchive `gorm:"foreignKey:WeeklyReportArchiveID" json:"daily_records,omitempty"`
	WorkHours      []WorkHourArchive    `gorm:"foreignKey:WeeklyReportArchiveID" json:"work_hours,omitempty"`
	ArchivedByUser User                 `gorm:"foreignKey:ArchivedBy" json:"archived_by_user,omitempty"`
}

// TableName テーブル名を指定
func (WeeklyReportArchive) TableName() string {
	return "weekly_reports_archive"
}

// BeforeCreate UUIDを生成
func (w *WeeklyReportArchive) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

// DailyRecordArchive アーカイブされた日次記録モデル
type DailyRecordArchive struct {
	ID                     uuid.UUID `gorm:"type:varchar(255);primary_key" json:"id"`
	OriginalID             uuid.UUID `gorm:"type:varchar(255);not null;index" json:"original_id"`
	WeeklyReportArchiveID  uuid.UUID `gorm:"type:varchar(255);not null;index" json:"weekly_report_archive_id"`
	OriginalWeeklyReportID uuid.UUID `gorm:"type:varchar(255);not null;index" json:"original_weekly_report_id"`
	RecordDate             time.Time `gorm:"type:date;not null;index" json:"record_date"`
	IsHoliday              bool      `gorm:"not null;default:false" json:"is_holiday"`
	IsHolidayWork          bool      `gorm:"not null;default:false" json:"is_holiday_work"`
	CompanyWorkHours       float64   `gorm:"type:decimal(4,2);not null;default:0.00" json:"company_work_hours"`
	ClientWorkHours        float64   `gorm:"type:decimal(4,2);not null;default:0.00" json:"client_work_hours"`
	TotalWorkHours         float64   `gorm:"type:decimal(4,2);not null;default:0.00" json:"total_work_hours"`
	BreakTime              float64   `gorm:"type:decimal(4,2);not null;default:0.00" json:"break_time"`
	OvertimeHours          float64   `gorm:"type:decimal(4,2);not null;default:0.00" json:"overtime_hours"`
	Remarks                *string   `gorm:"type:text" json:"remarks"`
	ArchivedAt             time.Time `gorm:"not null;default:CURRENT_TIMESTAMP;index" json:"archived_at"`
	OriginalCreatedAt      time.Time `gorm:"not null" json:"original_created_at"`
	OriginalUpdatedAt      time.Time `gorm:"not null" json:"original_updated_at"`
	CreatedAt              time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt              time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// リレーション
	WeeklyReportArchive WeeklyReportArchive `gorm:"foreignKey:WeeklyReportArchiveID" json:"weekly_report_archive,omitempty"`
}

// TableName テーブル名を指定
func (DailyRecordArchive) TableName() string {
	return "daily_records_archive"
}

// BeforeCreate UUIDを生成
func (d *DailyRecordArchive) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

// WorkHourArchive アーカイブされた勤怠時間モデル
type WorkHourArchive struct {
	ID                     uuid.UUID  `gorm:"type:varchar(255);primary_key" json:"id"`
	OriginalID             uuid.UUID  `gorm:"type:varchar(255);not null;index" json:"original_id"`
	WeeklyReportArchiveID  uuid.UUID  `gorm:"type:varchar(255);not null;index" json:"weekly_report_archive_id"`
	OriginalWeeklyReportID uuid.UUID  `gorm:"type:varchar(255);not null;index" json:"original_weekly_report_id"`
	Date                   time.Time  `gorm:"type:date;not null;index" json:"date"`
	StartTime              *time.Time `gorm:"type:time" json:"start_time"`
	EndTime                *time.Time `gorm:"type:time" json:"end_time"`
	BreakTime              float64    `gorm:"type:decimal(4,2);not null;default:0.00" json:"break_time"`
	OvertimeStartTime      *time.Time `gorm:"type:time" json:"overtime_start_time"`
	OvertimeEndTime        *time.Time `gorm:"type:time" json:"overtime_end_time"`
	Remarks                *string    `gorm:"type:text" json:"remarks"`
	ArchivedAt             time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP;index" json:"archived_at"`
	OriginalCreatedAt      time.Time  `gorm:"not null" json:"original_created_at"`
	OriginalUpdatedAt      time.Time  `gorm:"not null" json:"original_updated_at"`
	CreatedAt              time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt              time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// リレーション
	WeeklyReportArchive WeeklyReportArchive `gorm:"foreignKey:WeeklyReportArchiveID" json:"weekly_report_archive,omitempty"`
}

// TableName テーブル名を指定
func (WorkHourArchive) TableName() string {
	return "work_hours_archive"
}

// BeforeCreate UUIDを生成
func (w *WorkHourArchive) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

// ArchiveStatistics アーカイブ統計モデル
type ArchiveStatistics struct {
	ID              uuid.UUID       `gorm:"type:varchar(255);primary_key" json:"id"`
	ArchiveType     ArchiveType     `gorm:"type:enum('weekly_reports','daily_records','work_hours','bulk_archive');not null;index" json:"archive_type"`
	FiscalYear      int             `gorm:"type:year;not null" json:"fiscal_year"`
	FiscalQuarter   *int            `gorm:"type:tinyint;check:fiscal_quarter BETWEEN 1 AND 4" json:"fiscal_quarter"`
	StartDate       time.Time       `gorm:"type:date;not null" json:"start_date"`
	EndDate         time.Time       `gorm:"type:date;not null" json:"end_date"`
	TotalRecords    int             `gorm:"not null;default:0" json:"total_records"`
	ArchivedRecords int             `gorm:"not null;default:0" json:"archived_records"`
	FailedRecords   int             `gorm:"not null;default:0" json:"failed_records"`
	ArchiveReason   ArchiveReason   `gorm:"type:enum('retention_policy','manual','data_migration');not null;default:'retention_policy'" json:"archive_reason"`
	ExecutedBy      uuid.UUID       `gorm:"type:varchar(255);not null;index" json:"executed_by"`
	ExecutionMethod ExecutionMethod `gorm:"type:enum('batch','manual','api');not null;default:'batch'" json:"execution_method"`
	Status          ArchiveStatus   `gorm:"type:enum('pending','processing','completed','failed','cancelled');not null;default:'pending';index" json:"status"`
	ErrorMessage    *string         `gorm:"type:text" json:"error_message"`
	StartedAt       *time.Time      `gorm:"default:null;index" json:"started_at"`
	CompletedAt     *time.Time      `gorm:"default:null;index" json:"completed_at"`
	DurationSeconds *int            `gorm:"default:null" json:"duration_seconds"`
	CreatedAt       time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt       time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// リレーション
	ExecutedByUser User `gorm:"foreignKey:ExecutedBy" json:"executed_by_user,omitempty"`
}

// TableName テーブル名を指定
func (ArchiveStatistics) TableName() string {
	return "archive_statistics"
}

// BeforeCreate UUIDを生成
func (a *ArchiveStatistics) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// GetSuccessRate 成功率を計算
func (a *ArchiveStatistics) GetSuccessRate() float64 {
	if a.TotalRecords == 0 {
		return 0.0
	}
	return float64(a.ArchivedRecords) / float64(a.TotalRecords) * 100
}

// GetFailureRate 失敗率を計算
func (a *ArchiveStatistics) GetFailureRate() float64 {
	if a.TotalRecords == 0 {
		return 0.0
	}
	return float64(a.FailedRecords) / float64(a.TotalRecords) * 100
}

// GetDuration 処理時間を取得（秒）
func (a *ArchiveStatistics) GetDuration() *int {
	if a.StartedAt == nil || a.CompletedAt == nil {
		return nil
	}
	duration := int(a.CompletedAt.Sub(*a.StartedAt).Seconds())
	return &duration
}

// IsCompleted 完了状態かチェック
func (a *ArchiveStatistics) IsCompleted() bool {
	return a.Status == ArchiveStatusCompleted
}

// IsFailed 失敗状態かチェック
func (a *ArchiveStatistics) IsFailed() bool {
	return a.Status == ArchiveStatusFailed
}

// IsRunning 実行中かチェック
func (a *ArchiveStatistics) IsRunning() bool {
	return a.Status == ArchiveStatusProcessing
}

// ArchiveFilter アーカイブ検索フィルタ
type ArchiveFilter struct {
	UserID        *string
	DepartmentID  *uuid.UUID
	FiscalYear    *int
	FiscalQuarter *int
	StartDate     *time.Time
	EndDate       *time.Time
	Status        []string
	ArchiveReason *ArchiveReason
	Limit         int
	Offset        int
	OrderBy       string
	OrderDir      string
}

// ArchiveSummary アーカイブサマリー
type ArchiveSummary struct {
	TotalArchived            int64                   `json:"total_archived"`
	TotalSize                int64                   `json:"total_size"` // バイト単位
	ByFiscalYear             map[int]int64           `json:"by_fiscal_year"`
	ByArchiveReason          map[ArchiveReason]int64 `json:"by_archive_reason"`
	ByDepartment             map[string]int64        `json:"by_department"`
	AverageRecordsPerArchive float64                 `json:"average_records_per_archive"`
	OldestArchiveDate        *time.Time              `json:"oldest_archive_date"`
	LatestArchiveDate        *time.Time              `json:"latest_archive_date"`
}
