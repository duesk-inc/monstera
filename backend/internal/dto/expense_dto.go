package dto

import (
	"fmt"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
)

// CreateExpenseRequest 経費申請作成リクエスト
type CreateExpenseRequest struct {
	Title         string    `json:"title" binding:"required,min=1,max=255"`                                                 // 件名
	Category      string    `json:"category" binding:"required,oneof=transport entertainment supplies books seminar other"` // カテゴリ
	CategoryID    uuid.UUID `json:"category_id" binding:"required"`                                                         // カテゴリID
	Amount        int       `json:"amount" binding:"required,min=1,max=10000000"`                                           // 金額（1円〜1000万円）
	ExpenseDate   time.Time `json:"expense_date" binding:"required"`                                                        // 使用日
	Description   string    `json:"description" binding:"required,min=10,max=1000"`                                         // 使用理由（10文字以上）
	ReceiptURL    string    `json:"receipt_url" binding:"required,url"`                                                     // 領収書URL
	ReceiptURLs   []string  `json:"receipt_urls" binding:"omitempty,dive,url"`                                              // 領収書URL（複数）
	OtherCategory string    `json:"other_category,omitempty" binding:"omitempty,max=100"`                                   // その他カテゴリの詳細
}

// UpdateExpenseRequest 経費申請更新リクエスト
type UpdateExpenseRequest struct {
	Title         *string    `json:"title,omitempty" binding:"omitempty,min=1,max=255"`
	Category      *string    `json:"category,omitempty" binding:"omitempty,oneof=transport entertainment supplies books seminar other"`
	CategoryID    *uuid.UUID `json:"category_id,omitempty" binding:"omitempty"`
	Amount        *int       `json:"amount,omitempty" binding:"omitempty,min=1,max=10000000"`
	ExpenseDate   *time.Time `json:"expense_date,omitempty" binding:"omitempty"`
	Description   *string    `json:"description,omitempty" binding:"omitempty,min=10,max=1000"`
	ReceiptURL    *string    `json:"receipt_url,omitempty" binding:"omitempty,url"`
	ReceiptURLs   []string   `json:"receipt_urls,omitempty" binding:"omitempty,dive,url"`
	OtherCategory *string    `json:"other_category,omitempty" binding:"omitempty,max=100"`
	Version       int        `json:"version" binding:"required,min=1"` // 楽観的ロック用
}

// SubmitExpenseRequest 経費申請提出リクエスト
type SubmitExpenseRequest struct {
	Comment string `json:"comment,omitempty" binding:"omitempty,max=500"` // 提出時のコメント（任意）
}

// CancelExpenseRequest 経費申請取消リクエスト
type CancelExpenseRequest struct {
	Reason string `json:"reason,omitempty" binding:"omitempty,max=500"` // 取消理由（任意）
}

// ExpenseResponse 経費申請レスポンス
type ExpenseResponse struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Title       string     `json:"title"`
	Category    string     `json:"category"`
	Amount      int        `json:"amount"`
	ExpenseDate time.Time  `json:"expense_date"`
	Status      string     `json:"status"`
	Description string     `json:"description"`
	ReceiptURL  string     `json:"receipt_url"`
	ApproverID  *uuid.UUID `json:"approver_id,omitempty"`
	ApprovedAt  *time.Time `json:"approved_at,omitempty"`
	PaidAt      *time.Time `json:"paid_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	// ユーザー情報
	User *UserSummary `json:"user,omitempty"`
	// 承認者情報
	Approver *UserSummary `json:"approver,omitempty"`
}

// ExpenseDetailResponse 経費申請詳細レスポンス
type ExpenseDetailResponse struct {
	ExpenseResponse
	// 承認履歴
	Approvals []ApprovalResponse `json:"approvals,omitempty"`
	// カテゴリマスタ情報
	CategoryMaster *CategoryMasterResponse `json:"category_master,omitempty"`
	// 月次集計情報
	MonthlySummary *ExpenseSummaryResponse `json:"monthly_summary,omitempty"`
	// 現在有効な制限
	CurrentLimits *LimitsResponse `json:"current_limits,omitempty"`
	// 操作可能性
	CanEdit   bool `json:"can_edit"`
	CanSubmit bool `json:"can_submit"`
	CanCancel bool `json:"can_cancel"`
}

// ApprovalResponse 承認情報レスポンス
type ApprovalResponse struct {
	ID            uuid.UUID  `json:"id"`
	ExpenseID     uuid.UUID  `json:"expense_id"`
	ApproverID    uuid.UUID  `json:"approver_id"`
	ApprovalType  string     `json:"approval_type"` // manager, executive
	ApprovalOrder int        `json:"approval_order"`
	Status        string     `json:"status"` // pending, approved, rejected
	Comment       string     `json:"comment"`
	ApprovedAt    *time.Time `json:"approved_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	// 承認者情報
	Approver *UserSummary `json:"approver,omitempty"`
}

// CategoryMasterResponse カテゴリマスタレスポンス
type CategoryMasterResponse struct {
	ID              uuid.UUID `json:"id"`
	Code            string    `json:"code"`
	Name            string    `json:"name"`
	RequiresDetails bool      `json:"requires_details"`
	IsActive        bool      `json:"is_active"`
	DisplayOrder    int       `json:"display_order"`
}

// SummaryResponse 集計レスポンス
type SummaryResponse struct {
	ID             uuid.UUID `json:"id"`
	UserID         uuid.UUID `json:"user_id"`
	Year           int       `json:"year"`
	Month          int       `json:"month"`
	TotalAmount    int       `json:"total_amount"`
	ApprovedAmount int       `json:"approved_amount"`
	PendingAmount  int       `json:"pending_amount"`
}

// LimitsResponse 制限レスポンス
type LimitsResponse struct {
	MonthlyLimit *LimitResponse `json:"monthly_limit,omitempty"`
	YearlyLimit  *LimitResponse `json:"yearly_limit,omitempty"`
}

// LimitResponse 制限情報レスポンス
type LimitResponse struct {
	ID            uuid.UUID `json:"id"`
	LimitType     string    `json:"limit_type"` // monthly, yearly
	Amount        int       `json:"amount"`
	EffectiveFrom time.Time `json:"effective_from"`
	CreatedBy     uuid.UUID `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
}

// UserSummary ユーザー概要情報
type UserSummary struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Name      string    `json:"name"`
}

// ExpenseListResponse 経費申請一覧レスポンス
type ExpenseListResponse struct {
	Items      []ExpenseResponse `json:"items"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalPages int               `json:"total_pages"`
}

// ExpenseFilterRequest 経費申請フィルターリクエスト
type ExpenseFilterRequest struct {
	Status     *string    `form:"status" binding:"omitempty,oneof=draft submitted approved rejected paid"`
	Category   *string    `form:"category" binding:"omitempty,oneof=transport entertainment supplies books seminar other"`
	StartDate  *time.Time `form:"start_date" binding:"omitempty"`
	EndDate    *time.Time `form:"end_date" binding:"omitempty"`
	MinAmount  *int       `form:"min_amount" binding:"omitempty,min=0"`
	MaxAmount  *int       `form:"max_amount" binding:"omitempty,min=0"`
	Year       *int       `form:"year" binding:"omitempty,min=2020,max=2050"`        // カレンダー年度（例：2024）
	FiscalYear *int       `form:"fiscal_year" binding:"omitempty,min=2020,max=2050"` // 会計年度（例：2024年度=2024/4/1-2025/3/31）
	Month      *int       `form:"month" binding:"omitempty,min=1,max=12"`            // 月（年と組み合わせて使用）
	Page       int        `form:"page" binding:"omitempty,min=1"`
	Limit      int        `form:"limit" binding:"omitempty,min=1,max=100"`
	SortBy     *string    `form:"sort_by" binding:"omitempty,oneof=expense_date amount created_at"`
	SortOrder  *string    `form:"sort_order" binding:"omitempty,oneof=asc desc"`
	UserID     *uuid.UUID `form:"user_id" binding:"omitempty"`     // 内部使用用
	CategoryID *uuid.UUID `form:"category_id" binding:"omitempty"` // 内部使用用
}

// DefaultValues フィルターのデフォルト値
func (f *ExpenseFilterRequest) SetDefaults() {
	if f.Page == 0 {
		f.Page = 1
	}
	if f.Limit == 0 {
		f.Limit = 20
	}
	if f.SortBy == nil {
		sortBy := "expense_date"
		f.SortBy = &sortBy
	}
	if f.SortOrder == nil {
		sortOrder := "desc"
		f.SortOrder = &sortOrder
	}
}

// GetDateRange 年度・会計年度・月指定から日付範囲を取得
func (f *ExpenseFilterRequest) GetDateRange() (*time.Time, *time.Time) {
	// 既に開始日・終了日が指定されている場合はそちらを優先
	if f.StartDate != nil || f.EndDate != nil {
		return f.StartDate, f.EndDate
	}

	now := time.Now()

	// 会計年度が指定されている場合（4月1日〜翌年3月31日）
	if f.FiscalYear != nil {
		fiscalYear := *f.FiscalYear
		start := time.Date(fiscalYear, time.April, 1, 0, 0, 0, 0, time.Local)
		end := time.Date(fiscalYear+1, time.March, 31, 23, 59, 59, 999999999, time.Local)

		// 月が指定されている場合は該当月のみ
		if f.Month != nil {
			month := *f.Month
			var monthStart, monthEnd time.Time

			if month >= 4 { // 4月〜12月（当年）
				monthStart = time.Date(fiscalYear, time.Month(month), 1, 0, 0, 0, 0, time.Local)
				monthEnd = monthStart.AddDate(0, 1, 0).Add(-time.Nanosecond)
			} else { // 1月〜3月（翌年）
				monthStart = time.Date(fiscalYear+1, time.Month(month), 1, 0, 0, 0, 0, time.Local)
				monthEnd = monthStart.AddDate(0, 1, 0).Add(-time.Nanosecond)
			}

			return &monthStart, &monthEnd
		}

		return &start, &end
	}

	// カレンダー年度が指定されている場合（1月1日〜12月31日）
	if f.Year != nil {
		year := *f.Year
		start := time.Date(year, time.January, 1, 0, 0, 0, 0, time.Local)
		end := time.Date(year, time.December, 31, 23, 59, 59, 999999999, time.Local)

		// 月が指定されている場合は該当月のみ
		if f.Month != nil {
			month := *f.Month
			monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
			monthEnd := monthStart.AddDate(0, 1, 0).Add(-time.Nanosecond)

			return &monthStart, &monthEnd
		}

		return &start, &end
	}

	// 月のみ指定されている場合は現在年度の該当月
	if f.Month != nil {
		month := *f.Month
		year := now.Year()
		monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
		monthEnd := monthStart.AddDate(0, 1, 0).Add(-time.Nanosecond)

		return &monthStart, &monthEnd
	}

	// 何も指定されていない場合はnilを返す
	return nil, nil
}

// GetCurrentFiscalYear 現在の会計年度を取得（4月1日〜翌年3月31日）
func GetCurrentFiscalYear() int {
	now := time.Now()
	if now.Month() >= 4 { // 4月以降
		return now.Year()
	}
	return now.Year() - 1 // 1月〜3月は前年度
}

// GetFiscalYearFromDate 指定された日付の会計年度を取得
func GetFiscalYearFromDate(date time.Time) int {
	if date.Month() >= 4 { // 4月以降
		return date.Year()
	}
	return date.Year() - 1 // 1月〜3月は前年度
}

// ToExpense CreateExpenseRequestからExpenseモデルに変換
func (r *CreateExpenseRequest) ToExpense(userID uuid.UUID) model.Expense {
	return model.Expense{
		UserID:      userID,
		Title:       r.Title,
		Category:    model.ExpenseCategory(r.Category),
		Amount:      r.Amount,
		ExpenseDate: r.ExpenseDate,
		Status:      model.ExpenseStatusDraft,
		Description: r.Description,
		ReceiptURL:  r.ReceiptURL,
	}
}

// ApplyToExpense UpdateExpenseRequestを既存のExpenseモデルに適用
func (r *UpdateExpenseRequest) ApplyToExpense(expense *model.Expense) {
	if r.Title != nil {
		expense.Title = *r.Title
	}
	if r.Category != nil {
		expense.Category = model.ExpenseCategory(*r.Category)
	}
	if r.Amount != nil {
		expense.Amount = *r.Amount
	}
	if r.ExpenseDate != nil {
		expense.ExpenseDate = *r.ExpenseDate
	}
	if r.Description != nil {
		expense.Description = *r.Description
	}
	if r.ReceiptURL != nil {
		expense.ReceiptURL = *r.ReceiptURL
	}
}

// FromExpense ExpenseモデルからExpenseResponseに変換
func (r *ExpenseResponse) FromExpense(expense model.Expense) {
	r.ID = expense.ID
	r.UserID = expense.UserID
	r.Title = expense.Title
	r.Category = string(expense.Category)
	r.Amount = expense.Amount
	r.ExpenseDate = expense.ExpenseDate
	r.Status = string(expense.Status)
	r.Description = expense.Description
	r.ReceiptURL = expense.ReceiptURL
	r.ApproverID = expense.ApproverID
	r.ApprovedAt = expense.ApprovedAt
	r.PaidAt = expense.PaidAt
	r.CreatedAt = expense.CreatedAt
	r.UpdatedAt = expense.UpdatedAt
}

// FromExpenseWithDetails ExpenseWithDetailsモデルからExpenseDetailResponseに変換
func (r *ExpenseDetailResponse) FromExpenseWithDetails(expenseWithDetails model.ExpenseWithDetails) {
	// ベース情報をコピー
	r.ExpenseResponse.FromExpense(expenseWithDetails.Expense)

	// 承認履歴を変換
	if len(expenseWithDetails.Approvals) > 0 {
		r.Approvals = make([]ApprovalResponse, len(expenseWithDetails.Approvals))
		for i, approval := range expenseWithDetails.Approvals {
			r.Approvals[i] = ApprovalResponse{
				ID:            approval.ID,
				ExpenseID:     approval.ExpenseID,
				ApproverID:    approval.ApproverID,
				ApprovalType:  string(approval.ApprovalType),
				ApprovalOrder: approval.ApprovalOrder,
				Status:        string(approval.Status),
				Comment:       approval.Comment,
				ApprovedAt:    approval.ApprovedAt,
				CreatedAt:     approval.CreatedAt,
			}
		}
	}

	// カテゴリマスタ情報を変換
	if expenseWithDetails.CategoryMaster != nil {
		r.CategoryMaster = &CategoryMasterResponse{
			ID:              expenseWithDetails.CategoryMaster.ID,
			Code:            expenseWithDetails.CategoryMaster.Code,
			Name:            expenseWithDetails.CategoryMaster.Name,
			RequiresDetails: expenseWithDetails.CategoryMaster.RequiresDetails,
			IsActive:        expenseWithDetails.CategoryMaster.IsActive,
			DisplayOrder:    expenseWithDetails.CategoryMaster.DisplayOrder,
		}
	}

	// 月次集計情報を変換
	if expenseWithDetails.MonthlySummary != nil {
		period := fmt.Sprintf("%d-%02d", expenseWithDetails.MonthlySummary.Year, expenseWithDetails.MonthlySummary.Month)
		remaining := 0   // TODO: 上限から計算
		usageRate := 0.0 // TODO: 使用率を計算

		r.MonthlySummary = &ExpenseSummaryResponse{
			Monthly: ExpensePeriodSummary{
				Period:         period,
				TotalAmount:    expenseWithDetails.MonthlySummary.TotalAmount,
				ApprovedAmount: expenseWithDetails.MonthlySummary.ApprovedAmount,
				PendingAmount:  expenseWithDetails.MonthlySummary.PendingAmount,
				RejectedAmount: 0, // TODO: 計算
				Limit:          0, // TODO: 上限値を設定
				Remaining:      remaining,
				UsageRate:      usageRate,
			},
		}
	}

	// 制限情報を変換
	if expenseWithDetails.CurrentLimits != nil {
		r.CurrentLimits = &LimitsResponse{}
		if expenseWithDetails.CurrentLimits.MonthlyLimit != nil {
			r.CurrentLimits.MonthlyLimit = &LimitResponse{
				ID:            expenseWithDetails.CurrentLimits.MonthlyLimit.ID,
				LimitType:     string(expenseWithDetails.CurrentLimits.MonthlyLimit.LimitType),
				Amount:        expenseWithDetails.CurrentLimits.MonthlyLimit.Amount,
				EffectiveFrom: expenseWithDetails.CurrentLimits.MonthlyLimit.EffectiveFrom,
				CreatedBy:     expenseWithDetails.CurrentLimits.MonthlyLimit.CreatedBy,
				CreatedAt:     expenseWithDetails.CurrentLimits.MonthlyLimit.CreatedAt,
			}
		}
		if expenseWithDetails.CurrentLimits.YearlyLimit != nil {
			r.CurrentLimits.YearlyLimit = &LimitResponse{
				ID:            expenseWithDetails.CurrentLimits.YearlyLimit.ID,
				LimitType:     string(expenseWithDetails.CurrentLimits.YearlyLimit.LimitType),
				Amount:        expenseWithDetails.CurrentLimits.YearlyLimit.Amount,
				EffectiveFrom: expenseWithDetails.CurrentLimits.YearlyLimit.EffectiveFrom,
				CreatedBy:     expenseWithDetails.CurrentLimits.YearlyLimit.CreatedBy,
				CreatedAt:     expenseWithDetails.CurrentLimits.YearlyLimit.CreatedAt,
			}
		}
	}

	// 操作可能性を設定
	r.CanEdit = expenseWithDetails.CanEdit()
	r.CanSubmit = expenseWithDetails.CanSubmit()
	r.CanCancel = expenseWithDetails.CanCancel()
}

// ExpenseSummaryResponse 月次・年次集計レスポンス
type ExpenseSummaryResponse struct {
	Monthly ExpensePeriodSummary `json:"monthly"`
	Yearly  ExpensePeriodSummary `json:"yearly"`
}

// ExpensePeriodSummary 期間別集計詳細
type ExpensePeriodSummary struct {
	Period         string  `json:"period"` // "2024-01" or "2024"
	TotalAmount    int     `json:"total_amount"`
	ApprovedAmount int     `json:"approved_amount"`
	PendingAmount  int     `json:"pending_amount"`
	RejectedAmount int     `json:"rejected_amount"`
	Limit          int     `json:"limit"`
	Remaining      int     `json:"remaining"`
	UsageRate      float64 `json:"usage_rate"` // 使用率（%）
}

// ExpenseCategoriesResponse カテゴリ一覧レスポンス
type ExpenseCategoriesResponse struct {
	Categories []CategoryMasterResponse `json:"categories"`
}

// ExpenseApprovalRequest 承認処理リクエスト
type ExpenseApprovalRequest struct {
	Action  string `json:"action" binding:"required,oneof=approve reject"`
	Comment string `json:"comment,omitempty" binding:"omitempty,max=500"`
}

// ExpenseApprovalActionResponse 承認処理レスポンス
type ExpenseApprovalActionResponse struct {
	ID         uuid.UUID    `json:"id"`
	ExpenseID  uuid.UUID    `json:"expense_id"`
	Status     string       `json:"status"`
	ApprovedAt time.Time    `json:"approved_at"`
	Comment    string       `json:"comment,omitempty"`
	Approver   *UserSummary `json:"approver,omitempty"`
}

// ExpenseErrorResponse 経費申請固有エラーレスポンス
type ExpenseErrorResponse struct {
	Error     string                 `json:"error"`
	ErrorCode string                 `json:"error_code"`
	Details   map[string]interface{} `json:"details,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// ExpenseStatsResponse 経費統計レスポンス
type ExpenseStatsResponse struct {
	TotalExpenses    int     `json:"total_expenses"`
	ApprovedExpenses int     `json:"approved_expenses"`
	PendingExpenses  int     `json:"pending_expenses"`
	RejectedExpenses int     `json:"rejected_expenses"`
	TotalAmount      int     `json:"total_amount"`
	ApprovedAmount   int     `json:"approved_amount"`
	PendingAmount    int     `json:"pending_amount"`
	AverageAmount    float64 `json:"average_amount"`
	MonthlyAverage   float64 `json:"monthly_average"`
}

// CreateExpensePeriodSummaryResponse 集計作成レスポンス用のヘルパー
func CreateExpensePeriodSummaryResponse(monthlySummaries []model.ExpenseSummary, monthlyLimit, yearlyLimit int, year int) ExpenseSummaryResponse {
	response := ExpenseSummaryResponse{}

	// 月次集計の計算
	var monthlyTotal, monthlyApproved, monthlyPending, monthlyRejected int
	for _, summary := range monthlySummaries {
		monthlyTotal += summary.TotalAmount
		monthlyApproved += summary.ApprovedAmount
		monthlyPending += summary.PendingAmount
		monthlyRejected += (summary.TotalAmount - summary.ApprovedAmount - summary.PendingAmount)
	}

	// 年次集計
	yearlyRemaining := yearlyLimit - monthlyTotal
	if yearlyRemaining < 0 {
		yearlyRemaining = 0
	}
	yearlyUsageRate := float64(monthlyTotal) / float64(yearlyLimit) * 100

	response.Yearly = ExpensePeriodSummary{
		Period:         fmt.Sprintf("%d", year),
		TotalAmount:    monthlyTotal,
		ApprovedAmount: monthlyApproved,
		PendingAmount:  monthlyPending,
		RejectedAmount: monthlyRejected,
		Limit:          yearlyLimit,
		Remaining:      yearlyRemaining,
		UsageRate:      yearlyUsageRate,
	}

	// 今月の集計（最新月）
	if len(monthlySummaries) > 0 {
		currentMonth := monthlySummaries[len(monthlySummaries)-1]
		monthlyRemaining := monthlyLimit - currentMonth.TotalAmount
		if monthlyRemaining < 0 {
			monthlyRemaining = 0
		}
		monthlyUsageRate := float64(currentMonth.TotalAmount) / float64(monthlyLimit) * 100

		response.Monthly = ExpensePeriodSummary{
			Period:         fmt.Sprintf("%d-%02d", currentMonth.Year, currentMonth.Month),
			TotalAmount:    currentMonth.TotalAmount,
			ApprovedAmount: currentMonth.ApprovedAmount,
			PendingAmount:  currentMonth.PendingAmount,
			RejectedAmount: currentMonth.TotalAmount - currentMonth.ApprovedAmount - currentMonth.PendingAmount,
			Limit:          monthlyLimit,
			Remaining:      monthlyRemaining,
			UsageRate:      monthlyUsageRate,
		}
	}

	return response
}

// FromCategoryMasters カテゴリマスタスライスからレスポンスに変換
func (r *ExpenseCategoriesResponse) FromCategoryMasters(categories []model.ExpenseCategoryMaster) {
	r.Categories = make([]CategoryMasterResponse, len(categories))
	for i, category := range categories {
		r.Categories[i] = CategoryMasterResponse{
			ID:              category.ID,
			Code:            category.Code,
			Name:            category.Name,
			RequiresDetails: category.RequiresDetails,
			IsActive:        category.IsActive,
			DisplayOrder:    category.DisplayOrder,
		}
	}
}

// 経費申請エラーコード定数（エラーコード規則に準拠）
const (
	// 経費申請基本操作（X001）
	ErrorCodeExpenseNotFound         = "X001E001" // 経費申請が見つからない
	ErrorCodeExpenseCreateFailed     = "X001E002" // 経費申請作成失敗
	ErrorCodeExpenseUpdateFailed     = "X001E003" // 経費申請更新失敗
	ErrorCodeExpenseDeleteFailed     = "X001E004" // 経費申請削除失敗
	ErrorCodeExpenseAlreadySubmitted = "X001B001" // 既に提出済み
	ErrorCodeExpenseNotDraft         = "X001B002" // 下書き状態ではない

	// バリデーションエラー（X001V）
	ErrorCodeExpenseAmountInvalid       = "X001V001" // 金額が無効
	ErrorCodeExpenseCategoryInvalid     = "X001V002" // カテゴリが無効
	ErrorCodeExpenseDescriptionTooShort = "X001V003" // 説明文が短すぎる
	ErrorCodeExpenseReceiptRequired     = "X001V004" // 領収書が必須
	ErrorCodeExpenseDateInvalid         = "X001V005" // 使用日が無効

	// 承認機能（X002）
	ErrorCodeExpenseApprovalNotFound = "X002E001" // 承認情報が見つからない
	ErrorCodeExpenseApprovalDenied   = "X002A001" // 承認権限なし
	ErrorCodeExpenseAlreadyApproved  = "X002B001" // 既に承認済み
	ErrorCodeExpenseAlreadyRejected  = "X002B002" // 既に却下済み
	ErrorCodeExpenseNotApprovable    = "X002B003" // 承認できない状態
	ErrorCodeExpenseNotRejectable    = "X002B004" // 却下できない状態
	ErrorCodeApprovalOrderViolation  = "X002B005" // 承認順序違反

	// 制限管理（X003）
	ErrorCodeExpenseMonthlyLimitExceeded = "X003L001" // 月次制限超過
	ErrorCodeExpenseYearlyLimitExceeded  = "X003L002" // 年次制限超過
	ErrorCodeExpenseLimitNotFound        = "X003E001" // 制限設定が見つからない

	// ファイル管理（X004）
	ErrorCodeExpenseFileUploadFailed = "X004E001" // ファイルアップロード失敗
	ErrorCodeExpenseFileInvalidType  = "X004V001" // ファイル形式無効
	ErrorCodeExpenseFileSizeExceeded = "X004V002" // ファイルサイズ超過
	ErrorCodeExpenseFileNotFound     = "X004E002" // ファイルが見つからない
)

// NewExpenseErrorResponse エラーレスポンス作成ヘルパー
func NewExpenseErrorResponse(errorCode, message string, details map[string]interface{}) ExpenseErrorResponse {
	return ExpenseErrorResponse{
		Error:     message,
		ErrorCode: errorCode,
		Details:   details,
		Timestamp: time.Now(),
	}
}

// NewExpenseValidationError バリデーションエラー作成ヘルパー
func NewExpenseValidationError(field, reason string) ExpenseErrorResponse {
	details := map[string]interface{}{
		"field":  field,
		"reason": reason,
	}
	return NewExpenseErrorResponse(ErrorCodeExpenseAmountInvalid, "入力内容に誤りがあります", details)
}

// NewExpenseLimitError 制限超過エラー作成ヘルパー
func NewExpenseLimitError(limitType string, current, limit int) ExpenseErrorResponse {
	details := map[string]interface{}{
		"limit_type":     limitType,
		"current_amount": current,
		"limit_amount":   limit,
	}

	var errorCode, message string
	if limitType == "monthly" {
		errorCode = ErrorCodeExpenseMonthlyLimitExceeded
		message = "月次制限を超過しています"
	} else {
		errorCode = ErrorCodeExpenseYearlyLimitExceeded
		message = "年次制限を超過しています"
	}

	return NewExpenseErrorResponse(errorCode, message, details)
}

// NewExpenseFileError ファイル関連エラー作成ヘルパー
func NewExpenseFileError(errorType, fileName string, fileSize int64) ExpenseErrorResponse {
	details := map[string]interface{}{
		"file_name": fileName,
		"file_size": fileSize,
	}

	var errorCode, message string
	switch errorType {
	case "invalid_type":
		errorCode = ErrorCodeExpenseFileInvalidType
		message = "サポートされていないファイル形式です"
	case "size_exceeded":
		errorCode = ErrorCodeExpenseFileSizeExceeded
		message = "ファイルサイズが制限を超えています（最大5MB）"
	default:
		errorCode = ErrorCodeExpenseFileUploadFailed
		message = "ファイルのアップロードに失敗しました"
	}

	return NewExpenseErrorResponse(errorCode, message, details)
}

// ========================
// ファイルアップロード関連DTO
// ========================

// GenerateUploadURLRequest Pre-signed URLアップロード生成リクエスト
type GenerateUploadURLRequest struct {
	FileName    string `json:"file_name" binding:"required,min=1,max=255"`                                           // ファイル名
	ContentType string `json:"content_type" binding:"required,oneof=image/jpeg image/jpg image/png application/pdf"` // MIME Type
	FileSize    int64  `json:"file_size" binding:"required,min=1,max=5242880"`                                       // ファイルサイズ（最大5MB）
}

// UploadURLResponse Pre-signed URLレスポンス
type UploadURLResponse struct {
	UploadURL string            `json:"upload_url"`       // S3 Pre-signed URL
	S3Key     string            `json:"s3_key"`           // S3オブジェクトキー
	ExpiresAt time.Time         `json:"expires_at"`       // URL有効期限
	Fields    map[string]string `json:"fields,omitempty"` // POSTフィールド（multipart用）
}

// CompleteUploadRequest アップロード完了通知リクエスト
type CompleteUploadRequest struct {
	S3Key      string     `json:"s3_key" binding:"required"`    // S3オブジェクトキー
	ETag       string     `json:"etag,omitempty"`               // アップロード結果のETag
	FileSize   int64      `json:"file_size" binding:"required"` // 実際のファイルサイズ
	UploadedAt *time.Time `json:"uploaded_at,omitempty"`        // アップロード日時
}

// CompleteUploadResponse アップロード完了レスポンス
type CompleteUploadResponse struct {
	ReceiptURL string    `json:"receipt_url"` // 公開URL
	S3Key      string    `json:"s3_key"`      // S3オブジェクトキー
	FileSize   int64     `json:"file_size"`   // ファイルサイズ
	CreatedAt  time.Time `json:"created_at"`  // 作成日時
}

// DeleteUploadRequest ファイル削除リクエスト
type DeleteUploadRequest struct {
	S3Key string `json:"s3_key" binding:"required"` // 削除対象のS3キー
}

// ========================
// 承認フロー関連DTO
// ========================

// ApproveExpenseRequest 経費承認リクエスト
type ApproveExpenseRequest struct {
	Comment string `json:"comment,omitempty" binding:"omitempty,max=500"` // 承認コメント
	Version int    `json:"version" binding:"required,min=1"`              // 楽観的ロック用
}

// RejectExpenseRequest 経費却下リクエスト
type RejectExpenseRequest struct {
	Comment string `json:"comment" binding:"required,min=1,max=500"` // 却下理由（必須）
	Version int    `json:"version" binding:"required,min=1"`         // 楽観的ロック用
}

// ApprovalFilterRequest 承認一覧フィルタリクエスト
type ApprovalFilterRequest struct {
	Status       *string    `json:"status,omitempty" binding:"omitempty,oneof=pending approved rejected"`
	ApprovalType *string    `json:"approval_type,omitempty" binding:"omitempty,oneof=manager executive"`
	UserID       *uuid.UUID `json:"user_id,omitempty"`                                                // 申請者ID
	DateFrom     *time.Time `json:"date_from,omitempty"`                                              // 申請日From
	DateTo       *time.Time `json:"date_to,omitempty"`                                                // 申請日To
	AmountMin    *int       `json:"amount_min,omitempty" binding:"omitempty,min=0"`                   // 金額下限
	AmountMax    *int       `json:"amount_max,omitempty" binding:"omitempty,min=0"`                   // 金額上限
	CategoryID   *uuid.UUID `json:"category_id,omitempty"`                                            // カテゴリID
	Keyword      *string    `json:"keyword,omitempty" binding:"omitempty,max=100"`                    // キーワード検索
	Page         int        `json:"page" binding:"required,min=1"`                                    // ページ番号
	Limit        int        `json:"limit" binding:"required,min=1,max=100"`                           // 1ページあたりの件数
	SortBy       string     `json:"sort_by" binding:"omitempty,oneof=created_at expense_date amount"` // ソート項目
	SortOrder    string     `json:"sort_order" binding:"omitempty,oneof=asc desc"`                    // ソート順
}

// ApprovalListResponse 承認一覧レスポンス
type ApprovalListResponse struct {
	Items      []ApprovalItemResponse `json:"items"`       // 承認待ち項目リスト
	Total      int64                  `json:"total"`       // 総件数
	Page       int                    `json:"page"`        // 現在のページ
	Limit      int                    `json:"limit"`       // 1ページあたりの件数
	TotalPages int                    `json:"total_pages"` // 総ページ数
}

// ApprovalItemResponse 承認待ち項目レスポンス
type ApprovalItemResponse struct {
	ApprovalID    uuid.UUID    `json:"approval_id"`    // 承認ID
	ExpenseID     uuid.UUID    `json:"expense_id"`     // 経費申請ID
	Title         string       `json:"title"`          // 件名
	Amount        int          `json:"amount"`         // 金額
	ExpenseDate   time.Time    `json:"expense_date"`   // 使用日
	Category      string       `json:"category"`       // カテゴリ
	ApprovalType  string       `json:"approval_type"`  // 承認種別（manager/executive）
	ApprovalOrder int          `json:"approval_order"` // 承認順序
	RequestedAt   time.Time    `json:"requested_at"`   // 申請日時
	User          *UserSummary `json:"user"`           // 申請者情報
	Description   string       `json:"description"`    // 使用理由
	ReceiptURLs   []string     `json:"receipt_urls"`   // 領収書URL
	// 前の承認情報（2段階承認の場合）
	PreviousApproval *PreviousApprovalInfo `json:"previous_approval,omitempty"`
}

// PreviousApprovalInfo 前の承認情報
type PreviousApprovalInfo struct {
	ApproverName string    `json:"approver_name"`
	ApprovedAt   time.Time `json:"approved_at"`
	Comment      string    `json:"comment,omitempty"`
}

// FileInfo ファイル情報
type FileInfo struct {
	S3Key       string     `json:"s3_key"`
	FileName    string     `json:"file_name"`
	ContentType string     `json:"content_type"`
	FileSize    int64      `json:"file_size"`
	UploadedAt  *time.Time `json:"uploaded_at,omitempty"`
}

// FileValidationError ファイルバリデーションエラー
type FileValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

// ========================
// ヘルパー関数
// ========================

// ValidateFileUpload ファイルアップロードバリデーション
func (r *GenerateUploadURLRequest) ValidateFileUpload() []FileValidationError {
	var errors []FileValidationError

	// ファイル形式チェック
	allowedTypes := map[string]bool{
		"image/jpeg":      true,
		"image/jpg":       true,
		"image/png":       true,
		"application/pdf": true,
	}

	if !allowedTypes[r.ContentType] {
		errors = append(errors, FileValidationError{
			Field:   "content_type",
			Message: "サポートされていないファイル形式です",
			Code:    ErrorCodeExpenseFileInvalidType,
		})
	}

	// ファイルサイズチェック（5MB = 5242880 bytes）
	if r.FileSize > 5242880 {
		errors = append(errors, FileValidationError{
			Field:   "file_size",
			Message: "ファイルサイズが制限を超えています（最大5MB）",
			Code:    ErrorCodeExpenseFileSizeExceeded,
		})
	}

	// ファイル名チェック
	if len(r.FileName) == 0 {
		errors = append(errors, FileValidationError{
			Field:   "file_name",
			Message: "ファイル名は必須です",
			Code:    ErrorCodeExpenseReceiptRequired,
		})
	}

	return errors
}

// GenerateS3Key S3オブジェクトキーを生成
func (r *GenerateUploadURLRequest) GenerateS3Key(userID uuid.UUID) string {
	// フォーマット: expenses/{user_id}/{year}/{month}/{timestamp}_{filename}
	now := time.Now()

	// ファイル拡張子を取得
	ext := ""
	switch r.ContentType {
	case "image/jpeg", "image/jpg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "application/pdf":
		ext = ".pdf"
	}

	// タイムスタンプ付きファイル名を生成
	timestamp := now.Unix()
	safeName := fmt.Sprintf("%d_%s%s", timestamp,
		sanitizeFileName(r.FileName), ext)

	return fmt.Sprintf("expenses/%s/%d/%02d/%s",
		userID.String(), now.Year(), now.Month(), safeName)
}

// sanitizeFileName ファイル名を安全な形式に変換
func sanitizeFileName(filename string) string {
	// 拡張子を除去
	if lastDot := strings.LastIndex(filename, "."); lastDot != -1 {
		filename = filename[:lastDot]
	}

	// 危険な文字を除去・置換
	unsafe := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|", " "}
	safe := filename
	for _, char := range unsafe {
		safe = strings.ReplaceAll(safe, char, "_")
	}

	// 長さ制限（50文字）
	if len(safe) > 50 {
		safe = safe[:50]
	}

	return safe
}

// IsExpired Pre-signed URLが期限切れかチェック
func (r *UploadURLResponse) IsExpired() bool {
	return time.Now().After(r.ExpiresAt)
}

// GetFileExtension ファイル拡張子を取得
func (r *CompleteUploadRequest) GetFileExtension() string {
	// S3キーから拡張子を抽出
	if lastDot := strings.LastIndex(r.S3Key, "."); lastDot != -1 {
		return r.S3Key[lastDot:]
	}
	return ""
}

// ToReceiptURL S3キーから公開URLを生成
func (r *CompleteUploadRequest) ToReceiptURL(baseURL string) string {
	return fmt.Sprintf("%s/%s", strings.TrimRight(baseURL, "/"), r.S3Key)
}

// ExpenseYearlySummaryResponse 年次集計レスポンス
type ExpenseYearlySummaryResponse struct {
	UserID           uuid.UUID          `json:"user_id"`
	Year             int                `json:"year"`
	IsFiscalYear     bool               `json:"is_fiscal_year"` // 会計年度かどうか（true=会計年度、false=カレンダー年度）
	TotalAmount      int                `json:"total_amount"`
	TotalCount       int                `json:"total_count"`
	MonthlyBreakdown []MonthlyBreakdown `json:"monthly_breakdown"`
}

// MonthlyBreakdown 月別内訳
type MonthlyBreakdown struct {
	Month  int `json:"month"`
	Amount int `json:"amount"`
	Count  int `json:"count"`
}

// ExpenseLimitResponse 経費上限レスポンス
type ExpenseLimitResponse struct {
	MonthlyLimit int `json:"monthly_limit"`
	YearlyLimit  int `json:"yearly_limit"`
}

// LimitCheckResult 上限チェック結果
type LimitCheckResult struct {
	WithinMonthlyLimit    bool `json:"within_monthly_limit"`
	WithinYearlyLimit     bool `json:"within_yearly_limit"`
	WithinFiscalYearLimit bool `json:"within_fiscal_year_limit"`
	MonthlyExceeded       bool `json:"monthly_exceeded"`
	YearlyExceeded        bool `json:"yearly_exceeded"`
	FiscalYearExceeded    bool `json:"fiscal_year_exceeded"`
	RemainingMonthly      int  `json:"remaining_monthly"`
	RemainingYearly       int  `json:"remaining_yearly"`
	RemainingFiscalYear   int  `json:"remaining_fiscal_year"`
}

// ExpenseError 経費申請エラー型
type ExpenseError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Error エラーインターフェースの実装
func (e *ExpenseError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// NewExpenseError 経費申請エラーを作成
func NewExpenseError(code string, message string) error {
	return &ExpenseError{
		Code:    code,
		Message: message,
	}
}

// ExpenseToResponse ExpenseモデルからExpenseResponseに変換
func ExpenseToResponse(expense *model.Expense) ExpenseResponse {
	response := ExpenseResponse{}
	response.FromExpense(*expense)
	return response
}

// ExpenseToDetailResponse ExpenseモデルからExpenseDetailResponseに変換
func ExpenseToDetailResponse(expense *model.Expense) ExpenseDetailResponse {
	// 基本情報を設定
	detail := ExpenseDetailResponse{
		ExpenseResponse: ExpenseToResponse(expense),
	}

	// 追加の詳細情報があれば設定
	// TODO: 承認履歴、カテゴリマスタ情報、月次集計情報、制限情報を設定

	// 操作可能性の判定
	detail.CanEdit = expense.CanEdit()
	detail.CanSubmit = expense.CanSubmit()
	detail.CanCancel = expense.CanCancel()

	return detail
}

// CreateExpenseSummaryResponse 経費集計レスポンスを作成（単一月）
func CreateExpenseSummaryResponse(summary *model.ExpenseSummary) *SummaryResponse {
	return &SummaryResponse{
		ID:             summary.ID,
		UserID:         summary.UserID,
		Year:           summary.Year,
		Month:          summary.Month,
		TotalAmount:    summary.TotalAmount,
		ApprovedAmount: summary.ApprovedAmount,
		PendingAmount:  summary.PendingAmount,
	}
}

// CreateExpenseYearlySummaryResponse 年次集計レスポンスを作成
func CreateExpenseYearlySummaryResponse(summary *model.ExpenseSummary) *ExpenseYearlySummaryResponse {
	return &ExpenseYearlySummaryResponse{
		UserID:           summary.UserID,
		Year:             summary.Year,
		TotalAmount:      summary.TotalAmount,
		TotalCount:       summary.TotalAmount, // ExpenseCountがないため、暫定的にTotalAmountを使用
		MonthlyBreakdown: make([]MonthlyBreakdown, 0),
	}
}

// エラーコード定義
const (
	ErrCodeCategoryNotFound       = "EXPENSE_CATEGORY_NOT_FOUND"
	ErrCodeCategoryInactive       = "EXPENSE_CATEGORY_INACTIVE"
	ErrCodeInternalError          = "EXPENSE_INTERNAL_ERROR"
	ErrCodeMonthlyLimitExceeded   = "EXPENSE_MONTHLY_LIMIT_EXCEEDED"
	ErrCodeYearlyLimitExceeded    = "EXPENSE_YEARLY_LIMIT_EXCEEDED"
	ErrCodeExpenseNotFound        = "EXPENSE_NOT_FOUND"
	ErrCodeUnauthorized           = "EXPENSE_UNAUTHORIZED"
	ErrCodeExpenseNotEditable     = "EXPENSE_NOT_EDITABLE"
	ErrCodeExpenseNotDeletable    = "EXPENSE_NOT_DELETABLE"
	ErrCodeVersionMismatch        = "EXPENSE_VERSION_MISMATCH"
	ErrCodeExpenseNotSubmittable  = "EXPENSE_NOT_SUBMITTABLE"
	ErrCodeReceiptRequired        = "EXPENSE_RECEIPT_REQUIRED"
	ErrCodeExpenseNotCancelable   = "EXPENSE_NOT_CANCELABLE"
	ErrCodeExpenseNotApprovable   = "EXPENSE_NOT_APPROVABLE"
	ErrCodeApprovalOrderViolation = "EXPENSE_APPROVAL_ORDER_VIOLATION"
	ErrCodeExpenseNotRejectable   = "EXPENSE_NOT_REJECTABLE"

	// S3関連エラーコード
	ErrCodeFileValidationFailed = "EXPENSE_FILE_VALIDATION_FAILED"
	ErrCodeS3PresignFailed      = "EXPENSE_S3_PRESIGN_FAILED"
	ErrCodeInvalidS3Key         = "EXPENSE_INVALID_S3_KEY"
	ErrCodeS3DeleteFailed       = "EXPENSE_S3_DELETE_FAILED"
	ErrCodeFileNotFound         = "EXPENSE_FILE_NOT_FOUND"
	ErrCodeFileSizeExceeded     = "EXPENSE_FILE_SIZE_EXCEEDED"
	ErrCodeInvalidFileType      = "EXPENSE_INVALID_FILE_TYPE"
	ErrCodeVirusDetected        = "EXPENSE_VIRUS_DETECTED"

	// 上限関連エラーコード
	ErrCodeLimitExceeded = "EXPENSE_LIMIT_EXCEEDED"

	// 上限管理関連エラーコード
	ErrCodeInvalidLimitType   = "EXPENSE_INVALID_LIMIT_TYPE"
	ErrCodeInvalidLimitAmount = "EXPENSE_INVALID_LIMIT_AMOUNT"

	// 権限関連エラーコード
	ErrCodeForbidden = "EXPENSE_FORBIDDEN"

	// ステータス関連エラーコード
	ErrCodeInvalidStatus     = "EXPENSE_INVALID_STATUS"
	ErrCodeLimitUpdateFailed = "EXPENSE_LIMIT_UPDATE_FAILED"
	ErrCodeInvalidOperation  = "EXPENSE_INVALID_OPERATION"
	ErrCodeInvalidRequest    = "EXPENSE_INVALID_REQUEST"
	
	// 承認者設定関連エラーコード
	ErrCodeNoApproversConfigured = "EXPENSE_NO_APPROVERS_CONFIGURED"
	
	// 期限関連エラーコード
	ErrCodeDeadlineExceeded = "EXPENSE_DEADLINE_EXCEEDED"
)

// ExpenseLimitSettingResponse 経費申請上限設定レスポンス
type ExpenseLimitSettingResponse struct {
	ID            uuid.UUID `json:"id"`             // 上限ID
	LimitType     string    `json:"limit_type"`     // 制限種別（monthly/yearly）
	Amount        int       `json:"amount"`         // 上限金額（円）
	EffectiveFrom time.Time `json:"effective_from"` // 適用開始日時
	CreatedBy     uuid.UUID `json:"created_by"`     // 作成者ID
	CreatedAt     time.Time `json:"created_at"`     // 作成日時
	UpdatedAt     time.Time `json:"updated_at"`     // 更新日時
}

// UpdateExpenseLimitRequest 経費申請上限更新リクエスト（レガシー：全社レベルのみ）
type UpdateExpenseLimitRequest struct {
	LimitType     string    `json:"limit_type" binding:"required,oneof=monthly yearly"` // 制限種別（monthly/yearly）
	Amount        int       `json:"amount" binding:"required,min=1,max=100000000"`      // 上限金額（1円〜1億円）
	EffectiveFrom time.Time `json:"effective_from" binding:"required"`                  // 適用開始日時
}

// CreateExpenseLimitRequest 経費申請上限作成リクエスト（新しいスコープ対応版）
type CreateExpenseLimitRequest struct {
	LimitType     string     `json:"limit_type" binding:"required,oneof=monthly yearly"`           // 制限種別（monthly/yearly）
	LimitScope    string     `json:"limit_scope" binding:"required,oneof=company department user"` // 制限適用範囲
	Amount        int        `json:"amount" binding:"required,min=1,max=100000000"`                // 上限金額（1円〜1億円）
	UserID        *uuid.UUID `json:"user_id,omitempty" binding:"omitempty,uuid"`                   // 個人制限の場合のユーザーID
	DepartmentID  *uuid.UUID `json:"department_id,omitempty" binding:"omitempty,uuid"`             // 部門制限の場合の部門ID
	EffectiveFrom time.Time  `json:"effective_from" binding:"required"`                            // 適用開始日時
}

// UpdateExpenseLimitV2Request 経費申請上限更新リクエスト（新しいスコープ対応版）
type UpdateExpenseLimitV2Request struct {
	LimitType     string     `json:"limit_type" binding:"required,oneof=monthly yearly"`           // 制限種別（monthly/yearly）
	LimitScope    string     `json:"limit_scope" binding:"required,oneof=company department user"` // 制限適用範囲
	Amount        int        `json:"amount" binding:"required,min=1,max=100000000"`                // 上限金額（1円〜1億円）
	UserID        *uuid.UUID `json:"user_id,omitempty" binding:"omitempty,uuid"`                   // 個人制限の場合のユーザーID
	DepartmentID  *uuid.UUID `json:"department_id,omitempty" binding:"omitempty,uuid"`             // 部門制限の場合の部門ID
	EffectiveFrom time.Time  `json:"effective_from" binding:"required"`                            // 適用開始日時
}

// ExpenseLimitListRequest 経費申請上限一覧取得リクエスト
type ExpenseLimitListRequest struct {
	LimitType    *string    `form:"limit_type" binding:"omitempty,oneof=monthly yearly"`           // 制限種別フィルター
	LimitScope   *string    `form:"limit_scope" binding:"omitempty,oneof=company department user"` // 制限適用範囲フィルター
	UserID       *uuid.UUID `form:"user_id" binding:"omitempty,uuid"`                              // ユーザーIDフィルター
	DepartmentID *uuid.UUID `form:"department_id" binding:"omitempty,uuid"`                        // 部門IDフィルター
	Page         int        `form:"page" binding:"omitempty,min=1"`                                // ページ番号（デフォルト1）
	Limit        int        `form:"limit" binding:"omitempty,min=1,max=100"`                       // 1ページあたりの件数（デフォルト10）
}

// ExpenseLimitDetailResponse 経費申請上限詳細レスポンス
type ExpenseLimitDetailResponse struct {
	ID            uuid.UUID  `json:"id"`
	LimitType     string     `json:"limit_type"`              // monthly/yearly
	LimitScope    string     `json:"limit_scope"`             // company/department/user
	Amount        int        `json:"amount"`                  // 上限金額
	UserID        *uuid.UUID `json:"user_id,omitempty"`       // 個人制限の場合のユーザーID
	DepartmentID  *uuid.UUID `json:"department_id,omitempty"` // 部門制限の場合の部門ID
	EffectiveFrom time.Time  `json:"effective_from"`          // 適用開始日時
	CreatedBy     uuid.UUID  `json:"created_by"`              // 設定者ID
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	// リレーション情報
	Creator *UserSummary `json:"creator,omitempty"` // 設定者情報
	User    *UserSummary `json:"user,omitempty"`    // 対象ユーザー情報（個人制限の場合）
	// 表示用情報
	ScopeDescription string `json:"scope_description"` // 適用範囲の説明
	TypeDescription  string `json:"type_description"`  // 制限種別の説明
}

// ExpenseLimitListResponse 経費申請上限一覧レスポンス
type ExpenseLimitListResponse struct {
	Items []ExpenseLimitDetailResponse `json:"items"`
	Total int                          `json:"total"`
	Page  int                          `json:"page"`
	Limit int                          `json:"limit"`
}

// Validate CreateExpenseLimitRequestのバリデーション
func (r *CreateExpenseLimitRequest) Validate() error {
	// スコープ固有のバリデーション
	switch r.LimitScope {
	case "user":
		if r.UserID == nil {
			return fmt.Errorf("個人制限の場合、ユーザーIDは必須です")
		}
		if r.DepartmentID != nil {
			return fmt.Errorf("個人制限の場合、部門IDは指定できません")
		}
	case "department":
		if r.DepartmentID == nil {
			return fmt.Errorf("部門制限の場合、部門IDは必須です")
		}
		if r.UserID != nil {
			return fmt.Errorf("部門制限の場合、ユーザーIDは指定できません")
		}
	case "company":
		if r.UserID != nil || r.DepartmentID != nil {
			return fmt.Errorf("全社制限の場合、ユーザーIDと部門IDは指定できません")
		}
	}

	// 適用開始日時は未来日時である必要がある
	if r.EffectiveFrom.Before(time.Now()) {
		return fmt.Errorf("適用開始日時は未来の日時を指定してください")
	}

	return nil
}

// Validate UpdateExpenseLimitV2Requestのバリデーション
func (r *UpdateExpenseLimitV2Request) Validate() error {
	// CreateExpenseLimitRequestと同じロジック
	createReq := CreateExpenseLimitRequest{
		LimitType:     r.LimitType,
		LimitScope:    r.LimitScope,
		Amount:        r.Amount,
		UserID:        r.UserID,
		DepartmentID:  r.DepartmentID,
		EffectiveFrom: r.EffectiveFrom,
	}
	return createReq.Validate()
}

// ToModel CreateExpenseLimitRequestをExpenseLimitモデルに変換
func (r *CreateExpenseLimitRequest) ToModel(createdBy uuid.UUID) *model.ExpenseLimit {
	limit := &model.ExpenseLimit{
		LimitType:     model.LimitType(r.LimitType),
		LimitScope:    model.LimitScope(r.LimitScope),
		Amount:        r.Amount,
		EffectiveFrom: r.EffectiveFrom,
		CreatedBy:     createdBy,
	}

	if r.UserID != nil {
		limit.UserID = r.UserID
	}
	if r.DepartmentID != nil {
		limit.DepartmentID = r.DepartmentID
	}

	return limit
}

// FromModel ExpenseLimitモデルからExpenseLimitDetailResponseに変換
func (r *ExpenseLimitDetailResponse) FromModel(limit *model.ExpenseLimit) {
	r.ID = limit.ID
	r.LimitType = string(limit.LimitType)
	r.LimitScope = string(limit.LimitScope)
	r.Amount = limit.Amount
	r.UserID = limit.UserID
	r.DepartmentID = limit.DepartmentID
	r.EffectiveFrom = limit.EffectiveFrom
	r.CreatedBy = limit.CreatedBy
	r.CreatedAt = limit.CreatedAt
	r.UpdatedAt = limit.UpdatedAt
	r.ScopeDescription = limit.GetScopeDescription()

	// 制限種別の説明
	switch limit.LimitType {
	case model.LimitTypeMonthly:
		r.TypeDescription = "月次制限"
	case model.LimitTypeYearly:
		r.TypeDescription = "年次制限"
	default:
		r.TypeDescription = "不明"
	}

	// リレーション情報は別途設定される
}

// ExpenseLimitHistoryRequest 経費申請上限履歴取得リクエスト
type ExpenseLimitHistoryRequest struct {
	LimitType    *string    `json:"limit_type,omitempty" binding:"omitempty,oneof=monthly yearly"`           // 制限種別フィルター
	LimitScope   *string    `json:"limit_scope,omitempty" binding:"omitempty,oneof=company department user"` // 制限スコープフィルター
	UserID       *uuid.UUID `json:"user_id,omitempty"`                                                       // ユーザーIDフィルター
	DepartmentID *uuid.UUID `json:"department_id,omitempty"`                                                 // 部門IDフィルター
	DateFrom     *time.Time `json:"date_from,omitempty"`                                                     // 期間From（effective_from基準）
	DateTo       *time.Time `json:"date_to,omitempty"`                                                       // 期間To（effective_from基準）
	Page         int        `json:"page" binding:"required,min=1"`                                           // ページ番号
	Limit        int        `json:"limit" binding:"required,min=1,max=100"`                                  // 1ページあたりの件数
	SortBy       string     `json:"sort_by" binding:"omitempty,oneof=effective_from created_at amount"`      // ソート項目
	SortOrder    string     `json:"sort_order" binding:"omitempty,oneof=asc desc"`                           // ソート順
}

// ExpenseLimitHistoryResponse 経費申請上限履歴レスポンス
type ExpenseLimitHistoryResponse struct {
	Items      []ExpenseLimitHistoryItem `json:"items"`       // 履歴項目リスト
	Total      int64                     `json:"total"`       // 総件数
	Page       int                       `json:"page"`        // 現在のページ
	Limit      int                       `json:"limit"`       // 1ページあたりの件数
	TotalPages int                       `json:"total_pages"` // 総ページ数
}

// ExpenseLimitHistoryItem 経費申請上限履歴項目
type ExpenseLimitHistoryItem struct {
	ID                uuid.UUID    `json:"id"`                        // 上限ID
	LimitType         string       `json:"limit_type"`                // 制限種別（monthly/yearly）
	LimitScope        string       `json:"limit_scope"`               // 制限スコープ（company/department/user）
	Amount            int          `json:"amount"`                    // 上限金額
	PreviousAmount    *int         `json:"previous_amount,omitempty"` // 変更前金額（履歴の場合）
	UserID            *uuid.UUID   `json:"user_id,omitempty"`         // ユーザーID（個人制限の場合）
	DepartmentID      *uuid.UUID   `json:"department_id,omitempty"`   // 部門ID（部門制限の場合）
	EffectiveFrom     time.Time    `json:"effective_from"`            // 有効開始日
	CreatedBy         uuid.UUID    `json:"created_by"`                // 作成者ID
	CreatedAt         time.Time    `json:"created_at"`                // 作成日時
	TypeDescription   string       `json:"type_description"`          // 制限種別説明
	ScopeDescription  string       `json:"scope_description"`         // 制限スコープ説明
	ChangeType        string       `json:"change_type"`               // 変更種別（create/update/delete）
	ChangeDescription string       `json:"change_description"`        // 変更内容説明
	Creator           *UserSummary `json:"creator,omitempty"`         // 作成者情報
	User              *UserSummary `json:"user,omitempty"`            // 対象ユーザー情報（個人制限の場合）
	// 部門情報は今後追加予定
}

// ========================================
// カテゴリ管理用DTO
// ========================================

// CreateExpenseCategoryRequest 経費カテゴリ作成リクエスト
type CreateExpenseCategoryRequest struct {
	Code            string `json:"code" binding:"required,min=1,max=50"`            // カテゴリコード
	Name            string `json:"name" binding:"required,min=1,max=100"`           // カテゴリ名
	RequiresDetails bool   `json:"requires_details"`                                // 詳細入力が必要かどうか
	IsActive        bool   `json:"is_active"`                                       // 有効フラグ
	DisplayOrder    int    `json:"display_order" binding:"required,min=1,max=1000"` // 表示順序
}

// UpdateExpenseCategoryRequest 経費カテゴリ更新リクエスト
type UpdateExpenseCategoryRequest struct {
	Name            *string `json:"name,omitempty" binding:"omitempty,min=1,max=100"`           // カテゴリ名
	RequiresDetails *bool   `json:"requires_details,omitempty"`                                 // 詳細入力が必要かどうか
	IsActive        *bool   `json:"is_active,omitempty"`                                        // 有効フラグ
	DisplayOrder    *int    `json:"display_order,omitempty" binding:"omitempty,min=1,max=1000"` // 表示順序
}

// ExpenseCategoryResponse 経費カテゴリレスポンス
type ExpenseCategoryResponse struct {
	ID              uuid.UUID `json:"id"`               // カテゴリID
	Code            string    `json:"code"`             // カテゴリコード
	Name            string    `json:"name"`             // カテゴリ名
	RequiresDetails bool      `json:"requires_details"` // 詳細入力が必要かどうか
	IsActive        bool      `json:"is_active"`        // 有効フラグ
	DisplayOrder    int       `json:"display_order"`    // 表示順序
	CreatedAt       time.Time `json:"created_at"`       // 作成日時
	UpdatedAt       time.Time `json:"updated_at"`       // 更新日時
}

// ExpenseCategoryListRequest 経費カテゴリ一覧リクエスト
type ExpenseCategoryListRequest struct {
	IsActive  *bool   `json:"is_active,omitempty"`                                             // 有効フラグフィルター
	Code      *string `json:"code,omitempty" binding:"omitempty,max=50"`                       // カテゴリコードフィルター
	Name      *string `json:"name,omitempty" binding:"omitempty,max=100"`                      // カテゴリ名フィルター（部分一致）
	Page      int     `json:"page" binding:"required,min=1"`                                   // ページ番号
	Limit     int     `json:"limit" binding:"required,min=1,max=100"`                          // 1ページあたりの件数
	SortBy    string  `json:"sort_by" binding:"omitempty,oneof=display_order created_at name"` // ソート項目
	SortOrder string  `json:"sort_order" binding:"omitempty,oneof=asc desc"`                   // ソート順
}

// ExpenseCategoryListResponse 経費カテゴリ一覧レスポンス
type ExpenseCategoryListResponse struct {
	Items      []ExpenseCategoryResponse `json:"items"`       // カテゴリ項目リスト
	Total      int64                     `json:"total"`       // 総件数
	Page       int                       `json:"page"`        // 現在のページ
	Limit      int                       `json:"limit"`       // 1ページあたりの件数
	TotalPages int                       `json:"total_pages"` // 総ページ数
}

// ReorderCategoriesRequest カテゴリ表示順序変更リクエスト
type ReorderCategoriesRequest struct {
	CategoryOrders []CategoryOrderItem `json:"category_orders" binding:"required,min=1"`
}

// CategoryOrderItem カテゴリ順序項目
type CategoryOrderItem struct {
	ID           uuid.UUID `json:"id" binding:"required"`                  // カテゴリID
	DisplayOrder int       `json:"display_order" binding:"required,min=1"` // 新しい表示順序
}

// BulkUpdateCategoriesRequest カテゴリ一括更新リクエスト
type BulkUpdateCategoriesRequest struct {
	CategoryIDs []uuid.UUID               `json:"category_ids" binding:"required,min=1"`                      // 対象カテゴリID
	Action      string                    `json:"action" binding:"required,oneof=activate deactivate delete"` // 操作種別
	Updates     *BulkCategoryUpdateFields `json:"updates,omitempty"`                                          // 更新フィールド（activate/deactivate以外の場合）
}

// BulkCategoryUpdateFields 一括更新フィールド
type BulkCategoryUpdateFields struct {
	IsActive        *bool `json:"is_active,omitempty"`        // 有効フラグ
	RequiresDetails *bool `json:"requires_details,omitempty"` // 詳細入力が必要かどうか
}

// ValidateCode カテゴリコードのバリデーション
func (r *CreateExpenseCategoryRequest) ValidateCode() error {
	// カテゴリコードの形式チェック（英数字とアンダースコアのみ）
	if !isValidCategoryCode(r.Code) {
		return fmt.Errorf("カテゴリコードは英数字とアンダースコアのみ使用できます")
	}
	return nil
}

// isValidCategoryCode カテゴリコードの形式をチェック
func isValidCategoryCode(code string) bool {
	// 英数字とアンダースコアのみ許可
	for _, char := range code {
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '_') {
			return false
		}
	}
	return true
}

// ToModel CreateExpenseCategoryRequestをExpenseCategoryMasterモデルに変換
func (r *CreateExpenseCategoryRequest) ToModel() *model.ExpenseCategoryMaster {
	return &model.ExpenseCategoryMaster{
		Code:            r.Code,
		Name:            r.Name,
		RequiresDetails: r.RequiresDetails,
		IsActive:        r.IsActive,
		DisplayOrder:    r.DisplayOrder,
	}
}

// FromModel ExpenseCategoryMasterモデルからExpenseCategoryResponseに変換
func (r *ExpenseCategoryResponse) FromModel(category *model.ExpenseCategoryMaster) {
	r.ID = category.ID
	r.Code = category.Code
	r.Name = category.Name
	r.RequiresDetails = category.RequiresDetails
	r.IsActive = category.IsActive
	r.DisplayOrder = category.DisplayOrder
	r.CreatedAt = category.CreatedAt
	r.UpdatedAt = category.UpdatedAt
}
