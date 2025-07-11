package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ScheduledJobType スケジュールジョブタイプ
type ScheduledJobType string

const (
	// ScheduledJobTypeBilling 請求処理ジョブ
	ScheduledJobTypeBilling ScheduledJobType = "billing"
	// ScheduledJobTypeFreeeSync freee同期ジョブ
	ScheduledJobTypeFreeeSync ScheduledJobType = "freee_sync"
	// ScheduledJobTypeInvoiceReminder 請求書リマインダージョブ
	ScheduledJobTypeInvoiceReminder ScheduledJobType = "invoice_reminder"
	// ScheduledJobTypePaymentSync 入金同期ジョブ
	ScheduledJobTypePaymentSync ScheduledJobType = "payment_sync"
)

// ScheduledJobStatus スケジュールジョブステータス
type ScheduledJobStatus string

const (
	// ScheduledJobStatusActive アクティブ
	ScheduledJobStatusActive ScheduledJobStatus = "active"
	// ScheduledJobStatusInactive 非アクティブ
	ScheduledJobStatusInactive ScheduledJobStatus = "inactive"
	// ScheduledJobStatusRunning 実行中
	ScheduledJobStatusRunning ScheduledJobStatus = "running"
	// ScheduledJobStatusCompleted 完了
	ScheduledJobStatusCompleted ScheduledJobStatus = "completed"
	// ScheduledJobStatusFailed 失敗
	ScheduledJobStatusFailed ScheduledJobStatus = "failed"
)

// JobParameters ジョブパラメータ構造体
type JobParameters map[string]interface{}

// ExecutionHistory 実行履歴構造体
type ExecutionHistory struct {
	ExecutedAt    time.Time `json:"executed_at"`
	Status        string    `json:"status"`
	Duration      int64     `json:"duration_ms"`
	ErrorMessage  *string   `json:"error_message,omitempty"`
	ResultSummary *string   `json:"result_summary,omitempty"`
}

// JobExecutionLog 実行ログ構造体
type JobExecutionLog struct {
	TotalExecutions  int                `json:"total_executions"`
	SuccessfulRuns   int                `json:"successful_runs"`
	FailedRuns       int                `json:"failed_runs"`
	LastExecution    *time.Time         `json:"last_execution"`
	LastSuccess      *time.Time         `json:"last_success"`
	LastFailure      *time.Time         `json:"last_failure"`
	AverageDuration  float64            `json:"average_duration_ms"`
	RecentExecutions []ExecutionHistory `json:"recent_executions"`
}

// ScheduledJob スケジュールジョブモデル
type ScheduledJob struct {
	ID             uuid.UUID          `gorm:"type:varchar(36);primary_key" json:"id"`
	JobName        string             `gorm:"size:255;not null" json:"job_name"`
	JobType        ScheduledJobType   `gorm:"type:enum('billing','freee_sync','invoice_reminder','payment_sync');not null" json:"job_type"`
	Description    string             `gorm:"type:text" json:"description"`
	CronExpression string             `gorm:"size:100;not null" json:"cron_expression"`
	Status         ScheduledJobStatus `gorm:"type:enum('active','inactive','running','completed','failed');not null;default:'inactive'" json:"status"`
	NextRunAt      *time.Time         `json:"next_run_at"`
	LastRunAt      *time.Time         `json:"last_run_at"`
	Parameters     *JobParameters     `gorm:"type:json" json:"parameters"`
	ExecutionLog   *JobExecutionLog   `gorm:"type:json" json:"execution_log"`
	CreatedBy      uuid.UUID          `gorm:"type:varchar(36);not null" json:"created_by"`
	CreatedAt      time.Time          `json:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at"`
	DeletedAt      gorm.DeletedAt     `gorm:"index" json:"-"`

	// リレーション
	Creator User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

// BeforeCreate UUIDを生成
func (sj *ScheduledJob) BeforeCreate(tx *gorm.DB) error {
	if sj.ID == uuid.Nil {
		sj.ID = uuid.New()
	}
	if sj.ExecutionLog == nil {
		sj.ExecutionLog = &JobExecutionLog{
			TotalExecutions:  0,
			SuccessfulRuns:   0,
			FailedRuns:       0,
			AverageDuration:  0,
			RecentExecutions: []ExecutionHistory{},
		}
	}
	return nil
}

// TableName テーブル名を明示的に指定
func (ScheduledJob) TableName() string {
	return "scheduled_jobs"
}

// Scan JobParametersのスキャン実装
func (jp *JobParameters) Scan(value interface{}) error {
	if value == nil {
		*jp = make(JobParameters)
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, jp)
	case string:
		return json.Unmarshal([]byte(v), jp)
	default:
		return fmt.Errorf("cannot scan %T into JobParameters", value)
	}
}

// Value JobParametersの値取得実装
func (jp JobParameters) Value() (driver.Value, error) {
	if jp == nil {
		return nil, nil
	}
	return json.Marshal(jp)
}

// Scan JobExecutionLogのスキャン実装
func (jel *JobExecutionLog) Scan(value interface{}) error {
	if value == nil {
		*jel = JobExecutionLog{
			TotalExecutions:  0,
			SuccessfulRuns:   0,
			FailedRuns:       0,
			AverageDuration:  0,
			RecentExecutions: []ExecutionHistory{},
		}
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, jel)
	case string:
		return json.Unmarshal([]byte(v), jel)
	default:
		return fmt.Errorf("cannot scan %T into JobExecutionLog", value)
	}
}

// Value JobExecutionLogの値取得実装
func (jel JobExecutionLog) Value() (driver.Value, error) {
	return json.Marshal(jel)
}

// ScheduledJobSummary スケジュールジョブサマリー
type ScheduledJobSummary struct {
	JobType         ScheduledJobType `json:"job_type"`
	TotalJobs       int              `json:"total_jobs"`
	ActiveJobs      int              `json:"active_jobs"`
	RunningJobs     int              `json:"running_jobs"`
	TotalExecutions int              `json:"total_executions"`
	SuccessfulRuns  int              `json:"successful_runs"`
	FailedRuns      int              `json:"failed_runs"`
	LastExecution   *time.Time       `json:"last_execution"`
	NextExecution   *time.Time       `json:"next_execution"`
}

// ScheduledJobStats スケジュールジョブ統計
type ScheduledJobStats struct {
	TotalJobs       int     `json:"total_jobs"`
	ActiveJobs      int     `json:"active_jobs"`
	RunningJobs     int     `json:"running_jobs"`
	SuccessRate     float64 `json:"success_rate"`
	TodaysRuns      int     `json:"todays_runs"`
	UpcomingRuns    int     `json:"upcoming_runs"`
	AverageDuration float64 `json:"average_duration_ms"`
}

// IsActive ジョブがアクティブかチェック
func (sj *ScheduledJob) IsActive() bool {
	return sj.Status == ScheduledJobStatusActive
}

// IsRunning ジョブが実行中かチェック
func (sj *ScheduledJob) IsRunning() bool {
	return sj.Status == ScheduledJobStatusRunning
}

// CanRun ジョブが実行可能かチェック
func (sj *ScheduledJob) CanRun() bool {
	return sj.IsActive() && !sj.IsRunning() && sj.DeletedAt.Time.IsZero()
}

// HasNextRun 次回実行時刻が設定されているかチェック
func (sj *ScheduledJob) HasNextRun() bool {
	return sj.NextRunAt != nil && !sj.NextRunAt.IsZero()
}

// IsOverdue 実行予定時刻を過ぎているかチェック
func (sj *ScheduledJob) IsOverdue() bool {
	if !sj.HasNextRun() {
		return false
	}
	return time.Now().After(*sj.NextRunAt)
}

// GetParameter パラメータを安全に取得
func (sj *ScheduledJob) GetParameter(key string) (interface{}, bool) {
	if sj.Parameters == nil {
		return nil, false
	}
	value, exists := (*sj.Parameters)[key]
	return value, exists
}

// SetParameter パラメータを設定
func (sj *ScheduledJob) SetParameter(key string, value interface{}) {
	if sj.Parameters == nil {
		params := make(JobParameters)
		sj.Parameters = &params
	}
	(*sj.Parameters)[key] = value
}

// GetParameterAsString パラメータを文字列として取得
func (sj *ScheduledJob) GetParameterAsString(key string) string {
	value, exists := sj.GetParameter(key)
	if !exists {
		return ""
	}
	if str, ok := value.(string); ok {
		return str
	}
	return ""
}

// GetParameterAsInt パラメータを整数として取得
func (sj *ScheduledJob) GetParameterAsInt(key string) int {
	value, exists := sj.GetParameter(key)
	if !exists {
		return 0
	}
	switch v := value.(type) {
	case int:
		return v
	case float64:
		return int(v)
	default:
		return 0
	}
}

// AddExecutionHistory 実行履歴を追加
func (sj *ScheduledJob) AddExecutionHistory(status string, duration int64, errorMessage *string, resultSummary *string) {
	if sj.ExecutionLog == nil {
		sj.ExecutionLog = &JobExecutionLog{
			TotalExecutions:  0,
			SuccessfulRuns:   0,
			FailedRuns:       0,
			AverageDuration:  0,
			RecentExecutions: []ExecutionHistory{},
		}
	}

	now := time.Now()
	execution := ExecutionHistory{
		ExecutedAt:    now,
		Status:        status,
		Duration:      duration,
		ErrorMessage:  errorMessage,
		ResultSummary: resultSummary,
	}

	// 統計更新
	sj.ExecutionLog.TotalExecutions++
	if status == "success" {
		sj.ExecutionLog.SuccessfulRuns++
		sj.ExecutionLog.LastSuccess = &now
	} else if status == "failed" {
		sj.ExecutionLog.FailedRuns++
		sj.ExecutionLog.LastFailure = &now
	}
	sj.ExecutionLog.LastExecution = &now

	// 平均実行時間更新
	if sj.ExecutionLog.TotalExecutions > 0 {
		totalDuration := sj.ExecutionLog.AverageDuration*float64(sj.ExecutionLog.TotalExecutions-1) + float64(duration)
		sj.ExecutionLog.AverageDuration = totalDuration / float64(sj.ExecutionLog.TotalExecutions)
	}

	// 最新10件の実行履歴を保持
	sj.ExecutionLog.RecentExecutions = append([]ExecutionHistory{execution}, sj.ExecutionLog.RecentExecutions...)
	if len(sj.ExecutionLog.RecentExecutions) > 10 {
		sj.ExecutionLog.RecentExecutions = sj.ExecutionLog.RecentExecutions[:10]
	}
}

// GetSuccessRate 成功率を取得
func (sj *ScheduledJob) GetSuccessRate() float64 {
	if sj.ExecutionLog == nil || sj.ExecutionLog.TotalExecutions == 0 {
		return 0
	}
	return float64(sj.ExecutionLog.SuccessfulRuns) / float64(sj.ExecutionLog.TotalExecutions) * 100
}

// GetParametersAsString パラメータを文字列として取得
func (sj *ScheduledJob) GetParametersAsString() string {
	if sj.Parameters == nil {
		return ""
	}
	data, err := json.MarshalIndent(*sj.Parameters, "", "  ")
	if err != nil {
		return ""
	}
	return string(data)
}

// GetExecutionLogAsString 実行ログを文字列として取得
func (sj *ScheduledJob) GetExecutionLogAsString() string {
	if sj.ExecutionLog == nil {
		return ""
	}
	data, err := json.MarshalIndent(*sj.ExecutionLog, "", "  ")
	if err != nil {
		return ""
	}
	return string(data)
}
