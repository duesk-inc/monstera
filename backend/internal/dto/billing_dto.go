package dto

import (
	"fmt"
	"time"
)

// BillingPreviewRequest 請求プレビューリクエスト
type BillingPreviewRequest struct {
	ClientIDs    []string `json:"client_ids" binding:"required,min=1"`
	BillingYear  int      `json:"billing_year" binding:"required,min=2020,max=2050"`
	BillingMonth int      `json:"billing_month" binding:"required,min=1,max=12"`
	IsPreview    bool     `json:"is_preview"` // true: プレビューのみ, false: 実際の請求書作成
}

// BillingPreviewResponse 請求プレビューレスポンス
type BillingPreviewResponse struct {
	BillingYear  int                    `json:"billing_year"`
	BillingMonth int                    `json:"billing_month"`
	Clients      []ClientBillingPreview `json:"clients"`
	TotalAmount  float64                `json:"total_amount"`
	TotalClients int                    `json:"total_clients"`
	CreatedAt    time.Time              `json:"created_at"`
	Summary      BillingSummaryDTO      `json:"summary"`
	ClientBills  []ClientBillingDTO     `json:"client_bills"`
	Warnings     []BillingWarningDTO    `json:"warnings,omitempty"`
	Errors       []BillingErrorDTO      `json:"errors,omitempty"`
	GeneratedAt  time.Time              `json:"generated_at"`
	PreviewOnly  bool                   `json:"preview_only"`
}

// BillingSummaryDTO 請求サマリーDTO
type BillingSummaryDTO struct {
	TotalClients       int     `json:"total_clients"`
	TotalAmount        float64 `json:"total_amount"`
	TotalTaxAmount     float64 `json:"total_tax_amount"`
	TotalGrossAmount   float64 `json:"total_gross_amount"`
	BillableClients    int     `json:"billable_clients"`
	NonBillableClients int     `json:"non_billable_clients"`
	GroupedInvoices    int     `json:"grouped_invoices"`
	IndividualInvoices int     `json:"individual_invoices"`
	AverageAmount      float64 `json:"average_amount"`
	BillingPeriod      string  `json:"billing_period"` // "2024-01"
}

// ClientBillingDTO 取引先別請求DTO
type ClientBillingDTO struct {
	ClientID           string                   `json:"client_id"`
	ClientName         string                   `json:"client_name"`
	BillingClosingDay  int                      `json:"billing_closing_day"`
	IsBillable         bool                     `json:"is_billable"`
	InvoiceType        string                   `json:"invoice_type"` // "individual", "grouped"
	ProjectGroups      []ProjectGroupBillingDTO `json:"project_groups,omitempty"`
	IndividualProjects []ProjectBillingDTO      `json:"individual_projects,omitempty"`
	TotalAmount        float64                  `json:"total_amount"`
	TotalTaxAmount     float64                  `json:"total_tax_amount"`
	TotalGrossAmount   float64                  `json:"total_gross_amount"`
	TaxRate            float64                  `json:"tax_rate"`
	InvoiceDate        time.Time                `json:"invoice_date"`
	DueDate            time.Time                `json:"due_date"`
	BillingPeriod      string                   `json:"billing_period"`
	Issues             []string                 `json:"issues,omitempty"`
}

// ProjectGroupBillingDTO プロジェクトグループ請求DTO
type ProjectGroupBillingDTO struct {
	GroupID     string              `json:"group_id"`
	GroupName   string              `json:"group_name"`
	Projects    []ProjectBillingDTO `json:"projects"`
	GroupTotal  float64             `json:"group_total"`
	Description string              `json:"description,omitempty"`
}

// ProjectBillingDTO プロジェクト請求DTO
type ProjectBillingDTO struct {
	ProjectID    string                 `json:"project_id"`
	ProjectName  string                 `json:"project_name"`
	ProjectCode  string                 `json:"project_code"`
	Assignments  []AssignmentBillingDTO `json:"assignments"`
	ProjectTotal float64                `json:"project_total"`
	BillingType  string                 `json:"billing_type"`
	Period       BillingPeriodDTO       `json:"period"`
}

// AssignmentBillingDTO アサイン請求DTO
type AssignmentBillingDTO struct {
	AssignmentID     string                `json:"assignment_id"`
	UserID           string                `json:"user_id"`
	UserName         string                `json:"user_name"`
	Role             string                `json:"role"`
	BillingType      string                `json:"billing_type"` // "fixed", "variable_upper_lower", "variable_middle"
	BillingRate      float64               `json:"billing_rate"`
	WorkedHours      float64               `json:"worked_hours"`
	BillableHours    float64               `json:"billable_hours"`
	MinHours         *float64              `json:"min_hours,omitempty"`
	MaxHours         *float64              `json:"max_hours,omitempty"`
	CalculatedAmount float64               `json:"calculated_amount"`
	UtilizationRate  int                   `json:"utilization_rate"`
	Calculation      BillingCalculationDTO `json:"calculation"`
}

// ClientBillingPreview 取引先請求プレビュー
type ClientBillingPreview struct {
	ClientID     string                  `json:"client_id"`
	ClientName   string                  `json:"client_name"`
	Amount       float64                 `json:"amount"`
	TotalAmount  float64                 `json:"total_amount"`
	ProjectCount int                     `json:"project_count"`
	Status       string                  `json:"status"`
	Error        string                  `json:"error,omitempty"`
	Projects     []*ProjectBillingDetail `json:"projects,omitempty"`
	Warnings     []string                `json:"warnings,omitempty"`
}

// BillingCalculationDTO 請求計算詳細DTO
type BillingCalculationDTO struct {
	BaseAmount     float64 `json:"base_amount"`
	HourAdjustment float64 `json:"hour_adjustment"`
	RateAdjustment float64 `json:"rate_adjustment"`
	FinalAmount    float64 `json:"final_amount"`
	Method         string  `json:"method"` // "fixed", "upper_lower", "middle"
	Formula        string  `json:"formula,omitempty"`
	Details        string  `json:"details,omitempty"`
}

// BillingPeriodDTO 請求期間DTO
type BillingPeriodDTO struct {
	Year      int       `json:"year"`
	Month     int       `json:"month"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	WorkDays  int       `json:"work_days"`
	Display   string    `json:"display"` // "2024年1月"
}

// BillingWarningDTO 請求警告DTO
type BillingWarningDTO struct {
	Type        string  `json:"type"` // "missing_hours", "low_utilization", "rate_mismatch"
	ClientID    string  `json:"client_id"`
	ClientName  string  `json:"client_name"`
	ProjectID   *string `json:"project_id,omitempty"`
	ProjectName *string `json:"project_name,omitempty"`
	UserID      *string `json:"user_id,omitempty"`
	UserName    *string `json:"user_name,omitempty"`
	Message     string  `json:"message"`
	Severity    string  `json:"severity"` // "low", "medium", "high"
	Suggestion  string  `json:"suggestion,omitempty"`
}

// BillingErrorDTO 請求エラーDTO
type BillingErrorDTO struct {
	Type        string  `json:"type"` // "no_assignments", "invalid_rate", "missing_client"
	ClientID    string  `json:"client_id"`
	ClientName  string  `json:"client_name"`
	ProjectID   *string `json:"project_id,omitempty"`
	ProjectName *string `json:"project_name,omitempty"`
	Message     string  `json:"message"`
	Code        string  `json:"code"`
	Resolution  string  `json:"resolution,omitempty"`
}

// BillingExecutionRequest 請求実行リクエスト
type BillingExecutionRequest struct {
	ClientIDs         []string `json:"client_ids" binding:"required,min=1"`
	BillingYear       int      `json:"billing_year" binding:"required,min=2020,max=2050"`
	BillingMonth      int      `json:"billing_month" binding:"required,min=1,max=12"`
	CreateInvoices    bool     `json:"create_invoices"`    // 請求書を作成するか
	SyncToFreee       bool     `json:"sync_to_freee"`      // freeeに同期するか
	SendNotifications bool     `json:"send_notifications"` // 通知を送信するか
	ExecuteScheduled  bool     `json:"execute_scheduled"`  // スケジュール実行かどうか
	BatchSize         int      `json:"batch_size"`         // バッチサイズ（デフォルト: 10）
}

// BillingExecutionResponse 請求実行レスポンス
type BillingExecutionResponse struct {
	ExecutionID   string                     `json:"execution_id"`
	Summary       BillingExecutionSummaryDTO `json:"summary"`
	Results       []ClientBillingResultDTO   `json:"results"`
	FreeeSync     *FreeSyncResultDTO         `json:"freee_sync,omitempty"`
	Notifications *NotificationResultDTO     `json:"notifications,omitempty"`
	ExecutedAt    time.Time                  `json:"executed_at"`
	ExecutionTime int64                      `json:"execution_time_ms"`
	IsScheduled   bool                       `json:"is_scheduled"`
}

// ExecuteBillingResponse 旧版互換
type ExecuteBillingResponse struct {
	BillingYear      int                      `json:"billing_year"`
	BillingMonth     int                      `json:"billing_month"`
	ProcessedClients []*ProcessedClientResult `json:"processed_clients"`
	SuccessCount     int                      `json:"success_count"`
	FailureCount     int                      `json:"failure_count"`
	TotalAmount      float64                  `json:"total_amount"`
	ProcessedAt      time.Time                `json:"processed_at"`
}

// ProcessedClientResult 処理済みクライアント結果
type ProcessedClientResult struct {
	ClientID      string   `json:"client_id"`
	ClientName    string   `json:"client_name"`
	Status        string   `json:"status"`
	InvoiceID     *string  `json:"invoice_id,omitempty"`
	InvoiceNumber *string  `json:"invoice_number,omitempty"`
	TotalAmount   *float64 `json:"total_amount,omitempty"`
	Errors        []string `json:"errors,omitempty"`
}

// BillingExecutionSummaryDTO 請求実行サマリーDTO
type BillingExecutionSummaryDTO struct {
	TotalClients      int     `json:"total_clients"`
	SuccessfulClients int     `json:"successful_clients"`
	FailedClients     int     `json:"failed_clients"`
	TotalInvoices     int     `json:"total_invoices"`
	TotalAmount       float64 `json:"total_amount"`
	ProcessingTime    int64   `json:"processing_time_ms"`
	Status            string  `json:"status"` // "completed", "partial", "failed"
}

// ClientBillingResultDTO 取引先別請求結果DTO
type ClientBillingResultDTO struct {
	ClientID       string                  `json:"client_id"`
	ClientName     string                  `json:"client_name"`
	Status         string                  `json:"status"` // "success", "failed", "skipped"
	InvoiceID      *string                 `json:"invoice_id,omitempty"`
	InvoiceNumber  *string                 `json:"invoice_number,omitempty"`
	Amount         float64                 `json:"amount"`
	ProcessingTime int64                   `json:"processing_time_ms"`
	Errors         []BillingErrorDTO       `json:"errors,omitempty"`
	Warnings       []BillingWarningDTO     `json:"warnings,omitempty"`
	Details        *ClientBillingDetailDTO `json:"details,omitempty"`
}

// ClientBillingDetailDTO 取引先請求詳細DTO
type ClientBillingDetailDTO struct {
	ProjectCount    int                       `json:"project_count"`
	AssignmentCount int                       `json:"assignment_count"`
	WorkHours       float64                   `json:"work_hours"`
	BillableHours   float64                   `json:"billable_hours"`
	Projects        []ProjectBillingResultDTO `json:"projects,omitempty"`
}

// ProjectBillingDetail プロジェクト請求詳細
type ProjectBillingDetail struct {
	ProjectID     string   `json:"project_id"`
	ProjectName   string   `json:"project_name"`
	AssignmentID  string   `json:"assignment_id"`
	UserID        string   `json:"user_id"`
	UserName      string   `json:"user_name"`
	BillingType   string   `json:"billing_type"`
	MonthlyRate   float64  `json:"monthly_rate"`
	ActualHours   *float64 `json:"actual_hours,omitempty"`
	BillingAmount float64  `json:"billing_amount"`
	Notes         string   `json:"notes,omitempty"`
}

// GroupBillingPreview グループ請求プレビュー
type GroupBillingPreview struct {
	GroupID      string                  `json:"group_id"`
	GroupName    string                  `json:"group_name"`
	Projects     []*ProjectBillingDetail `json:"projects"`
	TotalAmount  float64                 `json:"total_amount"`
	ProjectCount int                     `json:"project_count"`
}

// ProjectBillingResultDTO プロジェクト請求結果DTO
type ProjectBillingResultDTO struct {
	ProjectID     string  `json:"project_id"`
	ProjectName   string  `json:"project_name"`
	Amount        float64 `json:"amount"`
	Assignments   int     `json:"assignments"`
	WorkHours     float64 `json:"work_hours"`
	BillableHours float64 `json:"billable_hours"`
}

// FreeSyncResultDTO freee同期結果DTO
type FreeSyncResultDTO struct {
	TotalSyncs      int                 `json:"total_syncs"`
	SuccessfulSyncs int                 `json:"successful_syncs"`
	FailedSyncs     int                 `json:"failed_syncs"`
	SyncDetails     []FreeSyncDetailDTO `json:"sync_details,omitempty"`
	SyncTime        int64               `json:"sync_time_ms"`
}

// FreeSyncDetailDTO freee同期詳細DTO
type FreeSyncDetailDTO struct {
	InvoiceID      string    `json:"invoice_id"`
	ClientName     string    `json:"client_name"`
	Status         string    `json:"status"` // "success", "failed"
	FreeeInvoiceID *int      `json:"freee_invoice_id,omitempty"`
	Error          *string   `json:"error,omitempty"`
	SyncedAt       time.Time `json:"synced_at"`
}

// NotificationResultDTO 通知結果DTO
type NotificationResultDTO struct {
	TotalNotifications  int                     `json:"total_notifications"`
	SentNotifications   int                     `json:"sent_notifications"`
	FailedNotifications int                     `json:"failed_notifications"`
	NotificationDetails []NotificationDetailDTO `json:"notification_details,omitempty"`
}

// NotificationDetailDTO 通知詳細DTO
type NotificationDetailDTO struct {
	Type      string    `json:"type"` // "email", "slack", "webhook"
	Recipient string    `json:"recipient"`
	Status    string    `json:"status"` // "sent", "failed"
	Error     *string   `json:"error,omitempty"`
	SentAt    time.Time `json:"sent_at"`
}

// BillingScheduleRequest 請求スケジュールリクエスト
type BillingScheduleRequest struct {
	JobName            string   `json:"job_name" binding:"required,max=255"`
	Description        string   `json:"description" binding:"max=1000"`
	CronExpression     string   `json:"cron_expression" binding:"required"`
	ClientIDs          []string `json:"client_ids" binding:"required,min=1"`
	AutoCreateInvoices bool     `json:"auto_create_invoices"`
	AutoSyncToFreee    bool     `json:"auto_sync_to_freee"`
	SendNotifications  bool     `json:"send_notifications"`
	IsActive           bool     `json:"is_active"`
}

// BillingScheduleResponse 請求スケジュールレスポンス
type BillingScheduleResponse struct {
	JobID          string     `json:"job_id"`
	JobName        string     `json:"job_name"`
	CronExpression string     `json:"cron_expression"`
	NextRunAt      *time.Time `json:"next_run_at"`
	CreatedAt      time.Time  `json:"created_at"`
	Status         string     `json:"status"`
}

// BillingHistoryRequest 請求履歴リクエスト
type BillingHistoryRequest struct {
	ClientID      *string    `form:"client_id"`
	StartDate     *time.Time `form:"start_date"`
	EndDate       *time.Time `form:"end_date"`
	Status        *string    `form:"status"`         // "success", "failed", "scheduled"
	ExecutionType *string    `form:"execution_type"` // "manual", "scheduled"
	Page          int        `form:"page" binding:"min=1"`
	Limit         int        `form:"limit" binding:"min=1,max=100"`
}

// BillingHistoryResponse 請求履歴レスポンス
type BillingHistoryResponse struct {
	Items []BillingHistoryItemDTO `json:"items"`
	Total int                     `json:"total"`
	Page  int                     `json:"page"`
	Limit int                     `json:"limit"`
}

// BillingHistoryItemDTO 請求履歴項目DTO
type BillingHistoryItemDTO struct {
	ExecutionID   string                      `json:"execution_id"`
	BillingPeriod string                      `json:"billing_period"`
	ClientCount   int                         `json:"client_count"`
	InvoiceCount  int                         `json:"invoice_count"`
	TotalAmount   float64                     `json:"total_amount"`
	Status        string                      `json:"status"`
	ExecutionType string                      `json:"execution_type"`
	ExecutedBy    *string                     `json:"executed_by,omitempty"`
	ExecutedAt    time.Time                   `json:"executed_at"`
	ExecutionTime int64                       `json:"execution_time_ms"`
	Summary       *BillingExecutionSummaryDTO `json:"summary,omitempty"`
}

// BillingStatsRequest 請求統計リクエスト
type BillingStatsRequest struct {
	Period    string     `form:"period" binding:"oneof=month quarter year"` // "month", "quarter", "year"
	StartDate *time.Time `form:"start_date"`
	EndDate   *time.Time `form:"end_date"`
	ClientID  *string    `form:"client_id"`
}

// BillingStatsResponse 請求統計レスポンス
type BillingStatsResponse struct {
	Period          string            `json:"period"`
	TotalInvoices   int               `json:"total_invoices"`
	TotalAmount     float64           `json:"total_amount"`
	AverageAmount   float64           `json:"average_amount"`
	UniqueClients   int               `json:"unique_clients"`
	SuccessRate     float64           `json:"success_rate"`
	MonthlyTrends   []MonthlyTrendDTO `json:"monthly_trends,omitempty"`
	ClientBreakdown []ClientStatsDTO  `json:"client_breakdown,omitempty"`
	TopProjects     []ProjectStatsDTO `json:"top_projects,omitempty"`
}

// MonthlyTrendDTO 月次トレンドDTO
type MonthlyTrendDTO struct {
	Year         int     `json:"year"`
	Month        int     `json:"month"`
	InvoiceCount int     `json:"invoice_count"`
	TotalAmount  float64 `json:"total_amount"`
	ClientCount  int     `json:"client_count"`
	Display      string  `json:"display"` // "2024年1月"
}

// ClientStatsDTO 取引先統計DTO
type ClientStatsDTO struct {
	ClientID      string     `json:"client_id"`
	ClientName    string     `json:"client_name"`
	InvoiceCount  int        `json:"invoice_count"`
	TotalAmount   float64    `json:"total_amount"`
	AverageAmount float64    `json:"average_amount"`
	LastBilling   *time.Time `json:"last_billing"`
}

// ProjectStatsDTO プロジェクト統計DTO
type ProjectStatsDTO struct {
	ProjectID    string     `json:"project_id"`
	ProjectName  string     `json:"project_name"`
	ClientName   string     `json:"client_name"`
	TotalAmount  float64    `json:"total_amount"`
	BillingCount int        `json:"billing_count"`
	LastBilling  *time.Time `json:"last_billing"`
}

// Validate BillingPreviewRequestのバリデーション
func (r *BillingPreviewRequest) Validate() error {
	if len(r.ClientIDs) == 0 {
		return fmt.Errorf("少なくとも1つのクライアントIDが必要です")
	}
	if len(r.ClientIDs) > 100 {
		return fmt.Errorf("クライアント数は100個までです")
	}
	if r.BillingYear < 2020 || r.BillingYear > 2050 {
		return fmt.Errorf("請求年は2020年から2050年の間で入力してください")
	}
	if r.BillingMonth < 1 || r.BillingMonth > 12 {
		return fmt.Errorf("請求月は1から12の間で入力してください")
	}
	return nil
}

// Validate BillingExecutionRequestのバリデーション
func (r *BillingExecutionRequest) Validate() error {
	if err := (&BillingPreviewRequest{
		ClientIDs:    r.ClientIDs,
		BillingYear:  r.BillingYear,
		BillingMonth: r.BillingMonth,
	}).Validate(); err != nil {
		return err
	}

	if r.BatchSize <= 0 {
		r.BatchSize = 10 // デフォルト値
	}
	if r.BatchSize > 50 {
		return fmt.Errorf("バッチサイズは50以下で入力してください")
	}

	return nil
}

// SetDefaults BillingHistoryRequestのデフォルト値設定
func (r *BillingHistoryRequest) SetDefaults() {
	if r.Page <= 0 {
		r.Page = 1
	}
	if r.Limit <= 0 {
		r.Limit = 20
	}
}

// Additional missing DTOs
type MonthlyInvoiceGenerationResult struct {
	Year         int       `json:"year"`
	Month        int       `json:"month"`
	GeneratedAt  time.Time `json:"generated_at"`
	InvoiceCount int       `json:"invoice_count"`
	TotalAmount  float64   `json:"total_amount"`
	SuccessCount int       `json:"success_count"`
	FailureCount int       `json:"failure_count"`
	Errors       []string  `json:"errors,omitempty"`
}

type RetryBillingResult struct {
	BillingMonth string    `json:"billing_month"`
	RetryCount   int       `json:"retry_count"`
	SuccessCount int       `json:"success_count"`
	FailureCount int       `json:"failure_count"`
	ProcessedAt  time.Time `json:"processed_at"`
	Errors       []string  `json:"errors,omitempty"`
}

// Type aliases for missing types referenced in service interface
type BillingHistoryItem = BillingHistoryItemDTO
type ExecuteBillingRequest = BillingExecutionRequest
type InvoiceResponse = InvoiceDTO
type BatchBillingRequest = BillingExecutionRequest
type BatchBillingResponse = BillingExecutionResponse
