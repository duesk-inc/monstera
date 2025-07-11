package service

// ListParams リスト取得用の共通パラメータ
type ListParams struct {
	Page      int    `json:"page"`
	Limit     int    `json:"limit"`
	Status    string `json:"status,omitempty"`
	StartDate string `json:"start_date,omitempty"`
	EndDate   string `json:"end_date,omitempty"`
	Search    string `json:"search,omitempty"`
	SortBy    string `json:"sort_by,omitempty"`
	SortOrder string `json:"sort_order,omitempty"`
}

// AdminListParams 管理者用リスト取得パラメータ
type AdminListParams struct {
	ListParams
	UserID       string `json:"user_id,omitempty"`
	DepartmentID string `json:"department_id,omitempty"`
	Role         int    `json:"role,omitempty"`
}

// UnsubmittedListParams 未提出週報取得用パラメータ
type UnsubmittedListParams struct {
	ListParams
	WeekOffset int `json:"week_offset,omitempty"`
}

// PaginationInfo ページネーション情報
type PaginationInfo struct {
	CurrentPage int  `json:"current_page"`
	TotalPages  int  `json:"total_pages"`
	TotalItems  int  `json:"total_items"`
	ItemsCount  int  `json:"items_count"`
	HasNext     bool `json:"has_next"`
	HasPrev     bool `json:"has_prev"`
}

// ListResponse リスト取得レスポンスの基本構造
type ListResponse struct {
	Pagination PaginationInfo `json:"pagination"`
}

// WeeklyReportListResponse 週報リストレスポンス
type WeeklyReportListResponse struct {
	Reports    []interface{}  `json:"reports"`
	Pagination PaginationInfo `json:"pagination"`
}

// UserListResponse ユーザーリストレスポンス
type UserListResponse struct {
	Users      []interface{}  `json:"users"`
	Pagination PaginationInfo `json:"pagination"`
}

// StatisticsResponse 統計情報レスポンス
type StatisticsResponse struct {
	TotalReports     int                    `json:"total_reports"`
	SubmittedReports int                    `json:"submitted_reports"`
	DraftReports     int                    `json:"draft_reports"`
	OverdueReports   int                    `json:"overdue_reports"`
	UserStatistics   []UserStatistics       `json:"user_statistics,omitempty"`
	DepartmentStats  []DepartmentStatistics `json:"department_statistics,omitempty"`
}

// UserStatistics ユーザー別統計情報
type UserStatistics struct {
	UserID         string  `json:"user_id"`
	UserName       string  `json:"user_name"`
	TotalReports   int     `json:"total_reports"`
	SubmittedCount int     `json:"submitted_count"`
	DraftCount     int     `json:"draft_count"`
	OverdueCount   int     `json:"overdue_count"`
	SubmissionRate float64 `json:"submission_rate"`
}

// DepartmentStatistics 部署別統計情報
type DepartmentStatistics struct {
	DepartmentID   string  `json:"department_id"`
	DepartmentName string  `json:"department_name"`
	TotalUsers     int     `json:"total_users"`
	TotalReports   int     `json:"total_reports"`
	SubmittedCount int     `json:"submitted_count"`
	SubmissionRate float64 `json:"submission_rate"`
}

// BatchUpdateRequest バッチ更新リクエスト
type BatchUpdateRequest struct {
	IDs    []string               `json:"ids" binding:"required"`
	Update map[string]interface{} `json:"update" binding:"required"`
}

// BatchSubmitRequest バッチ提出リクエスト
type BatchSubmitRequest struct {
	ReportIDs []string `json:"report_ids" binding:"required"`
}

// BatchUpdateDeadlineRequest バッチ期限更新リクエスト
type BatchUpdateDeadlineRequest struct {
	ReportIDs   []string `json:"report_ids" binding:"required"`
	NewDeadline string   `json:"new_deadline" binding:"required"`
}
