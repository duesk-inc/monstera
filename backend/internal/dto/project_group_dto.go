package dto

import (
	"fmt"
	"time"
)

// ProjectGroupDTO プロジェクトグループDTO
type ProjectGroupDTO struct {
	ID          string    `json:"id"`
	GroupName   string    `json:"group_name"`
	ClientID    string    `json:"client_id"`
	ClientName  string    `json:"client_name,omitempty"`
	Description string    `json:"description"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ProjectGroupDetailDTO プロジェクトグループ詳細DTO
type ProjectGroupDetailDTO struct {
	ProjectGroupDTO
	ProjectCount    int                     `json:"project_count"`
	ActiveProjects  int                     `json:"active_projects"`
	TotalRevenue    float64                 `json:"total_revenue"`
	LastInvoiceDate *time.Time              `json:"last_invoice_date"`
	Projects        []ProjectSummaryDTO     `json:"projects,omitempty"`
	RecentInvoices  []InvoiceListSummaryDTO `json:"recent_invoices,omitempty"`
	Creator         *UserSummaryDTO         `json:"creator,omitempty"`
}

// ProjectSummaryDTO プロジェクトサマリーDTO
type ProjectSummaryDTO struct {
	ID            string     `json:"id"`
	ProjectName   string     `json:"project_name"`
	ProjectCode   string     `json:"project_code"`
	Status        string     `json:"status"`
	StartDate     *time.Time `json:"start_date"`
	EndDate       *time.Time `json:"end_date"`
	MonthlyRate   float64    `json:"monthly_rate"`
	AssignedCount int        `json:"assigned_count"`
	IsActive      bool       `json:"is_active"`
}

// InvoiceListSummaryDTO 請求書リストサマリーDTO
type InvoiceListSummaryDTO struct {
	ID            string    `json:"id"`
	InvoiceNumber string    `json:"invoice_number"`
	BillingMonth  string    `json:"billing_month"`
	TotalAmount   float64   `json:"total_amount"`
	Status        string    `json:"status"`
	InvoiceDate   time.Time `json:"invoice_date"`
	DueDate       time.Time `json:"due_date"`
}

// UserSummaryDTO ユーザーサマリーDTO
type UserSummaryDTO struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
}

// CreateProjectGroupRequest プロジェクトグループ作成リクエスト
type CreateProjectGroupRequest struct {
	GroupName   string   `json:"group_name" binding:"required,max=255"`
	ClientID    string   `json:"client_id" binding:"required"`
	Description string   `json:"description" binding:"max=1000"`
	ProjectIDs  []string `json:"project_ids" binding:"required,min=1"`
}

// UpdateProjectGroupRequest プロジェクトグループ更新リクエスト
type UpdateProjectGroupRequest struct {
	GroupName   *string `json:"group_name" binding:"omitempty,max=255"`
	Description *string `json:"description" binding:"omitempty,max=1000"`
}

// AddProjectsToGroupRequest プロジェクトをグループに追加リクエスト
type AddProjectsToGroupRequest struct {
	ProjectIDs []string `json:"project_ids" binding:"required,min=1"`
}

// RemoveProjectsFromGroupRequest プロジェクトをグループから削除リクエスト
type RemoveProjectsFromGroupRequest struct {
	ProjectIDs []string `json:"project_ids" binding:"required,min=1"`
}

// ProjectGroupWithStatsResponse 統計情報付きプロジェクトグループレスポンス
type ProjectGroupWithStatsResponse struct {
	ProjectGroupResponse ProjectGroupDTO `json:"project_group"`
	ProjectCount         int             `json:"project_count"`
	TotalRevenue         float64         `json:"total_revenue"`
	LastInvoiceDate      *time.Time      `json:"last_invoice_date"`
	ClientName           string          `json:"client_name"`
}

// ProjectGroupListResponse プロジェクトグループ一覧レスポンス
type ProjectGroupListResponse struct {
	Items []*ProjectGroupWithStatsResponse `json:"items"`
	Total int                              `json:"total"`
	Page  int                              `json:"page"`
	Limit int                              `json:"limit"`
}

// ProjectGroupWithStatsDTO 統計情報付きプロジェクトグループDTO
type ProjectGroupWithStatsDTO struct {
	ProjectGroupDTO
	ProjectCount       int        `json:"project_count"`
	ActiveProjects     int        `json:"active_projects"`
	CompletedProjects  int        `json:"completed_projects"`
	TotalRevenue       float64    `json:"total_revenue"`
	MonthlyRevenue     float64    `json:"monthly_revenue"`
	LastInvoiceDate    *time.Time `json:"last_invoice_date"`
	NextBillingDate    *time.Time `json:"next_billing_date"`
	HasPendingInvoices bool       `json:"has_pending_invoices"`
	IsActive           bool       `json:"is_active"`
}

// ProjectGroupStatsDTO プロジェクトグループ統計DTO
type ProjectGroupStatsDTO struct {
	TotalGroups        int                       `json:"total_groups"`
	ActiveGroups       int                       `json:"active_groups"`
	TotalProjects      int                       `json:"total_projects"`
	TotalRevenue       float64                   `json:"total_revenue"`
	AverageRevenue     float64                   `json:"average_revenue"`
	MonthlyRevenue     float64                   `json:"monthly_revenue"`
	TopPerformingGroup *ProjectGroupWithStatsDTO `json:"top_performing_group,omitempty"`
}

// ProjectGroupFilterRequest プロジェクトグループフィルターリクエスト
type ProjectGroupFilterRequest struct {
	ClientID      *string    `form:"client_id"`
	Status        *string    `form:"status"` // active, inactive
	HasProjects   *bool      `form:"has_projects"`
	CreatedAfter  *time.Time `form:"created_after"`
	CreatedBefore *time.Time `form:"created_before"`
	Search        *string    `form:"search"` // グループ名で検索
	Page          int        `form:"page" binding:"min=1"`
	Limit         int        `form:"limit" binding:"min=1,max=100"`
	SortBy        *string    `form:"sort_by"`    // name, created_at, revenue, project_count
	SortOrder     *string    `form:"sort_order"` // asc, desc
}

// BulkProjectGroupOperationRequest 一括操作リクエスト
type BulkProjectGroupOperationRequest struct {
	GroupIDs  []string `json:"group_ids" binding:"required,min=1"`
	Operation string   `json:"operation" binding:"required,oneof=delete activate deactivate"`
}

// BulkProjectGroupOperationResponse 一括操作レスポンス
type BulkProjectGroupOperationResponse struct {
	SuccessCount int         `json:"success_count"`
	FailureCount int         `json:"failure_count"`
	Errors       []BulkError `json:"errors,omitempty"`
}

// BulkError 一括操作エラー詳細
type BulkError struct {
	GroupID string `json:"group_id"`
	Error   string `json:"error"`
}

// ProjectGroupValidationRequest プロジェクトグループ検証リクエスト
type ProjectGroupValidationRequest struct {
	ClientID   string   `json:"client_id" binding:"required"`
	ProjectIDs []string `json:"project_ids" binding:"required,min=1"`
}

// ProjectGroupValidationResponse プロジェクトグループ検証レスポンス
type ProjectGroupValidationResponse struct {
	IsValid          bool                           `json:"is_valid"`
	Warnings         []ValidationWarning            `json:"warnings,omitempty"`
	Errors           []ValidationError              `json:"errors,omitempty"`
	ProjectDetails   []ProjectValidationDetail      `json:"project_details"`
	RecommendedGroup *ProjectGroupRecommendationDTO `json:"recommended_group,omitempty"`
}

// ValidationWarning 検証警告
type ValidationWarning struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

// ValidationError 検証エラー
type ValidationError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

// ProjectValidationDetail プロジェクト検証詳細
type ProjectValidationDetail struct {
	ProjectID      string   `json:"project_id"`
	ProjectName    string   `json:"project_name"`
	IsCompatible   bool     `json:"is_compatible"`
	CurrentGroupID *string  `json:"current_group_id,omitempty"`
	Issues         []string `json:"issues,omitempty"`
}

// ProjectGroupRecommendationDTO プロジェクトグループ推奨DTO
type ProjectGroupRecommendationDTO struct {
	RecommendedName string  `json:"recommended_name"`
	Reason          string  `json:"reason"`
	Confidence      float64 `json:"confidence"` // 0.0-1.0
}

// ProjectGroupActivityDTO プロジェクトグループ活動DTO
type ProjectGroupActivityDTO struct {
	ID           string                 `json:"id"`
	GroupID      string                 `json:"group_id"`
	ActivityType string                 `json:"activity_type"` // created, updated, project_added, project_removed, billed
	Description  string                 `json:"description"`
	PerformedBy  string                 `json:"performed_by"`
	PerformedAt  time.Time              `json:"performed_at"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// Validate CreateProjectGroupRequestのバリデーション
func (r *CreateProjectGroupRequest) Validate() error {
	if len(r.ProjectIDs) == 0 {
		return fmt.Errorf("少なくとも1つのプロジェクトが必要です")
	}
	if len(r.ProjectIDs) > 50 {
		return fmt.Errorf("プロジェクト数は50個までです")
	}
	return nil
}

// Validate ProjectGroupFilterRequestのデフォルト値設定
func (r *ProjectGroupFilterRequest) SetDefaults() {
	if r.Page <= 0 {
		r.Page = 1
	}
	if r.Limit <= 0 {
		r.Limit = 20
	}
	if r.SortBy == nil {
		sortBy := "created_at"
		r.SortBy = &sortBy
	}
	if r.SortOrder == nil {
		sortOrder := "desc"
		r.SortOrder = &sortOrder
	}
}

// AddProjectsRequest プロジェクト追加リクエスト
type AddProjectsRequest struct {
	ProjectIDs []string `json:"project_ids" binding:"required"`
}

// RemoveProjectsRequest プロジェクト削除リクエスト
type RemoveProjectsRequest struct {
	ProjectIDs []string `json:"project_ids" binding:"required"`
}

// ValidateProjectGroupRequest プロジェクトグループ検証リクエスト
type ValidateProjectGroupRequest struct {
	Name          string                 `json:"name"`
	BillingType   string                 `json:"billing_type"`
	ProjectIDs    []string               `json:"project_ids"`
	BillingConfig map[string]interface{} `json:"billing_config,omitempty"`
}

// ValidationResult 検証結果
type ValidationResult struct {
	IsValid bool     `json:"is_valid"`
	Errors  []string `json:"errors"`
}

// ProjectGroupStatistics グループ統計情報
type ProjectGroupStatistics struct {
	ProjectCount          int        `json:"project_count"`
	ActiveProjects        int        `json:"active_projects"`
	TotalUsers            int        `json:"total_users"`
	TotalInvoices         int        `json:"total_invoices"`
	TotalRevenue          float64    `json:"total_revenue"`
	LastInvoiceDate       *time.Time `json:"last_invoice_date"`
	NextBillingDate       *time.Time `json:"next_billing_date"`
	AverageMonthlyRevenue float64    `json:"average_monthly_revenue"`
}
