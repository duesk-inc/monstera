package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseRepository 経費申請に関するデータアクセスのインターフェース
type ExpenseRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, expense *model.Expense) error
	GetByID(ctx context.Context, id string) (*model.Expense, error)
	GetByIDForUpdate(ctx context.Context, id string) (*model.Expense, error)
	GetDetailByID(ctx context.Context, id string) (*model.ExpenseWithDetails, error)
	GetByIDWithDetails(ctx context.Context, id string) (*model.ExpenseWithDetails, error)
	Update(ctx context.Context, expense *model.Expense) error
	Delete(ctx context.Context, id string) error

	// 一覧・検索機能
	List(ctx context.Context, filter *dto.ExpenseFilterRequest) ([]model.Expense, int64, error)
	ListByUserID(ctx context.Context, userID string, filter *dto.ExpenseFilterRequest) ([]model.Expense, int64, error)
	ListForApproval(ctx context.Context, approverID string, filter *dto.ExpenseFilterRequest) ([]model.Expense, int64, error)

	// 集計機能
	GetMonthlySummary(ctx context.Context, userID string, year int, month int) (*model.ExpenseSummary, error)
	GetYearlySummary(ctx context.Context, userID string, year int) ([]model.ExpenseSummary, error)
	GetUserExpenseStatistics(ctx context.Context, userID string, fromDate, toDate time.Time) (*dto.ExpenseStatsResponse, error)

	// 承認関連
	GetPendingApprovals(ctx context.Context, approverID string) ([]model.Expense, error)
	UpdateStatus(ctx context.Context, id string, status model.ExpenseStatus) error
	CountPendingByUserID(ctx context.Context, userID string) (int64, error)

	// 制限チェック関連
	GetTotalAmountInPeriod(ctx context.Context, userID string, startDate, endDate time.Time) (int, error)
	GetMonthlyTotal(ctx context.Context, userID string, year int, month int) (int, error)
	GetYearlyTotal(ctx context.Context, userID string, year int) (int, error)

	// ユーティリティ
	ExistsByID(ctx context.Context, id string) (bool, error)
	CountExpiringSoon(ctx context.Context, days int) (int64, error)
	SetLogger(logger *zap.Logger)

	// CSVエクスポート用
	GetByUserIDForExport(ctx context.Context, userID string, filter *dto.ExpenseExportRequest) ([]*model.Expense, error)
	GetAllForExport(ctx context.Context, filter *dto.ExpenseExportRequest) ([]*model.Expense, error)

	// 期限関連
	GetExpiredExpenses(ctx context.Context, now time.Time) ([]*model.Expense, error)
	GetExpensesNeedingReminder(ctx context.Context, reminderDate time.Time) ([]*model.Expense, error)
	UpdateExpenseStatus(ctx context.Context, id string, status model.ExpenseStatus) error
	MarkAsExpired(ctx context.Context, id string) error
	MarkReminderSent(ctx context.Context, id string) error
	MarkExpiryNotificationSent(ctx context.Context, id string) error
}

// ExpenseRepositoryImpl 経費申請に関するデータアクセスの実装
type ExpenseRepositoryImpl struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewExpenseRepository ExpenseRepositoryのインスタンスを生成する
func NewExpenseRepository(db *gorm.DB, logger *zap.Logger) ExpenseRepository {
	return &ExpenseRepositoryImpl{
		db:     db,
		logger: logger,
	}
}

// SetLogger ロガーを設定
func (r *ExpenseRepositoryImpl) SetLogger(logger *zap.Logger) {
	r.logger = logger
}

// ========================================
// 基本CRUD操作
// ========================================

// Create 新しい経費申請を作成
func (r *ExpenseRepositoryImpl) Create(ctx context.Context, expense *model.Expense) error {
	if err := r.db.WithContext(ctx).Create(expense).Error; err != nil {
		r.logger.Error("Failed to create expense",
			zap.Error(err),
			zap.String("user_id", expense.UserID),
			zap.String("title", expense.Title))
		return err
	}

	r.logger.Info("Expense created successfully",
		zap.String("expense_id", expense.ID),
		zap.String("user_id", expense.UserID),
		zap.String("title", expense.Title))
	return nil
}

// GetByID 経費申請IDで単一レコードを取得
func (r *ExpenseRepositoryImpl) GetByID(ctx context.Context, id string) (*model.Expense, error) {
	var expense model.Expense
	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Approver").
		Where("id = ?", id).
		First(&expense).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Expense not found", zap.String("expense_id", id))
			return nil, err
		}
		r.logger.Error("Failed to get expense by ID",
			zap.Error(err),
			zap.String("expense_id", id))
		return nil, err
	}

	return &expense, nil
}

// GetByIDForUpdate 排他ロック付きで経費申請を取得
func (r *ExpenseRepositoryImpl) GetByIDForUpdate(ctx context.Context, id string) (*model.Expense, error) {
	var expense model.Expense
	err := r.db.WithContext(ctx).
		Set("gorm:query_option", "FOR UPDATE").
		Where("id = ?", id).
		First(&expense).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Expense not found for update", zap.String("expense_id", id))
			return nil, err
		}
		r.logger.Error("Failed to get expense by ID for update",
			zap.Error(err),
			zap.String("expense_id", id))
		return nil, err
	}

	return &expense, nil
}

// GetDetailByID 詳細情報付きで経費申請を取得
func (r *ExpenseRepositoryImpl) GetDetailByID(ctx context.Context, id string) (*model.ExpenseWithDetails, error) {
	// まず基本の経費申請を取得
	expense, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// ExpenseWithDetailsを構築
	expenseWithDetails := &model.ExpenseWithDetails{
		Expense: *expense,
	}

	// 詳細情報をロード
	if err := expenseWithDetails.LoadDetails(r.db); err != nil {
		r.logger.Error("Failed to load expense details",
			zap.Error(err),
			zap.String("expense_id", id))
		return nil, err
	}

	return expenseWithDetails, nil
}

// GetByIDWithDetails 詳細情報付きで経費申請を取得（GetDetailByIDのエイリアス）
func (r *ExpenseRepositoryImpl) GetByIDWithDetails(ctx context.Context, id string) (*model.ExpenseWithDetails, error) {
	return r.GetDetailByID(ctx, id)
}

// Update 経費申請を更新
func (r *ExpenseRepositoryImpl) Update(ctx context.Context, expense *model.Expense) error {
	err := r.db.WithContext(ctx).Save(expense).Error
	if err != nil {
		r.logger.Error("Failed to update expense",
			zap.Error(err),
			zap.String("expense_id", expense.ID))
		return err
	}

	r.logger.Info("Expense updated successfully",
		zap.String("expense_id", expense.ID),
		zap.String("status", string(expense.Status)))
	return nil
}

// Delete 経費申請を削除（論理削除）
func (r *ExpenseRepositoryImpl) Delete(ctx context.Context, id string) error {
	err := r.db.WithContext(ctx).Delete(&model.Expense{}, id).Error
	if err != nil {
		r.logger.Error("Failed to delete expense",
			zap.Error(err),
			zap.String("expense_id", id))
		return err
	}

	r.logger.Info("Expense deleted successfully",
		zap.String("expense_id", id))
	return nil
}

// ========================================
// 一覧・検索機能
// ========================================

// List 経費申請一覧を取得（全ユーザー対象）
func (r *ExpenseRepositoryImpl) List(ctx context.Context, filter *dto.ExpenseFilterRequest) ([]model.Expense, int64, error) {
	query := r.buildFilterQuery(ctx, filter)

	// 件数カウント
	var total int64
	if err := query.Model(&model.Expense{}).Count(&total).Error; err != nil {
		r.logger.Error("Failed to count expenses", zap.Error(err))
		return nil, 0, err
	}

	// データ取得
	var expenses []model.Expense
	err := query.
		Preload("User").
		Preload("Approver").
		Order(r.buildOrderClause(filter)).
		Offset((filter.Page - 1) * filter.Limit).
		Limit(filter.Limit).
		Find(&expenses).Error

	if err != nil {
		r.logger.Error("Failed to list expenses", zap.Error(err))
		return nil, 0, err
	}

	return expenses, total, nil
}

// ListByUserID 特定ユーザーの経費申請一覧を取得
func (r *ExpenseRepositoryImpl) ListByUserID(ctx context.Context, userID string, filter *dto.ExpenseFilterRequest) ([]model.Expense, int64, error) {
	query := r.buildFilterQuery(ctx, filter).Where("user_id = ?", userID)

	var total int64
	if err := query.Model(&model.Expense{}).Count(&total).Error; err != nil {
		r.logger.Error("Failed to count user expenses",
			zap.Error(err),
			zap.String("user_id", userID))
		return nil, 0, err
	}

	var expenses []model.Expense
	err := query.
		Preload("User").
		Preload("Approver").
		Order(r.buildOrderClause(filter)).
		Offset((filter.Page - 1) * filter.Limit).
		Limit(filter.Limit).
		Find(&expenses).Error

	if err != nil {
		r.logger.Error("Failed to list user expenses",
			zap.Error(err),
			zap.String("user_id", userID))
		return nil, 0, err
	}

	return expenses, total, nil
}

// ListForApproval 承認待ち経費申請一覧を取得
func (r *ExpenseRepositoryImpl) ListForApproval(ctx context.Context, approverID string, filter *dto.ExpenseFilterRequest) ([]model.Expense, int64, error) {
	// 承認待ちの経費申請を取得するためのサブクエリ
	subQuery := r.db.Table("expense_approvals").
		Select("expense_id").
		Where("approver_id = ? AND status = ?", approverID, model.ApprovalStatusPending)

	query := r.buildFilterQuery(ctx, filter).
		Where("id IN (?)", subQuery).
		Where("status = ?", model.ExpenseStatusSubmitted)

	var total int64
	if err := query.Model(&model.Expense{}).Count(&total).Error; err != nil {
		r.logger.Error("Failed to count approval expenses",
			zap.Error(err),
			zap.String("approver_id", approverID))
		return nil, 0, err
	}

	var expenses []model.Expense
	err := query.
		Preload("User").
		Preload("Approver").
		Order(r.buildOrderClause(filter)).
		Offset((filter.Page - 1) * filter.Limit).
		Limit(filter.Limit).
		Find(&expenses).Error

	if err != nil {
		r.logger.Error("Failed to list approval expenses",
			zap.Error(err),
			zap.String("approver_id", approverID))
		return nil, 0, err
	}

	return expenses, total, nil
}

// ========================================
// 集計機能
// ========================================

// GetMonthlySummary 月次集計を取得
func (r *ExpenseRepositoryImpl) GetMonthlySummary(ctx context.Context, userID string, year int, month int) (*model.ExpenseSummary, error) {
	var summary model.ExpenseSummary
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND year = ? AND month = ?", userID, year, month).
		First(&summary).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// レコードが存在しない場合は新規作成
			summary = model.ExpenseSummary{
				UserID: userID,
				Year:   year,
				Month:  month,
			}
			return &summary, nil
		}
		r.logger.Error("Failed to get monthly summary",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.Int("year", year),
			zap.Int("month", month))
		return nil, err
	}

	return &summary, nil
}

// GetYearlySummary 年次集計を取得
func (r *ExpenseRepositoryImpl) GetYearlySummary(ctx context.Context, userID string, year int) ([]model.ExpenseSummary, error) {
	var summaries []model.ExpenseSummary
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND year = ?", userID, year).
		Order("month ASC").
		Find(&summaries).Error

	if err != nil {
		r.logger.Error("Failed to get yearly summary",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.Int("year", year))
		return nil, err
	}

	return summaries, nil
}

// GetUserExpenseStatistics ユーザーの経費統計を取得
func (r *ExpenseRepositoryImpl) GetUserExpenseStatistics(ctx context.Context, userID string, fromDate, toDate time.Time) (*dto.ExpenseStatsResponse, error) {
	type statsResult struct {
		TotalExpenses    int64
		ApprovedExpenses int64
		PendingExpenses  int64
		RejectedExpenses int64
		TotalAmount      int64
		ApprovedAmount   int64
		PendingAmount    int64
	}

	var result statsResult
	err := r.db.WithContext(ctx).
		Table("expenses").
		Select(`
			COUNT(*) as total_expenses,
			COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_expenses,
			COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending_expenses,
			COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_expenses,
			COALESCE(SUM(amount), 0) as total_amount,
			COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_amount,
			COALESCE(SUM(CASE WHEN status = 'submitted' THEN amount ELSE 0 END), 0) as pending_amount
		`).
		Where("user_id = ? AND expense_date BETWEEN ? AND ?", userID, fromDate, toDate).
		Where("deleted_at IS NULL").
		Scan(&result).Error

	if err != nil {
		r.logger.Error("Failed to get user expense statistics",
			zap.Error(err),
			zap.String("user_id", userID))
		return nil, err
	}

	stats := &dto.ExpenseStatsResponse{
		TotalExpenses:    int(result.TotalExpenses),
		ApprovedExpenses: int(result.ApprovedExpenses),
		PendingExpenses:  int(result.PendingExpenses),
		RejectedExpenses: int(result.RejectedExpenses),
		TotalAmount:      int(result.TotalAmount),
		ApprovedAmount:   int(result.ApprovedAmount),
		PendingAmount:    int(result.PendingAmount),
	}

	// 平均値を計算
	if stats.TotalExpenses > 0 {
		stats.AverageAmount = float64(stats.TotalAmount) / float64(stats.TotalExpenses)
	}

	// 月平均を計算（期間が1ヶ月以上の場合）
	months := int(toDate.Sub(fromDate).Hours()/24/30) + 1
	if months > 0 {
		stats.MonthlyAverage = float64(stats.TotalAmount) / float64(months)
	}

	return stats, nil
}

// ========================================
// 承認関連
// ========================================

// GetPendingApprovals 承認待ち経費申請を取得
func (r *ExpenseRepositoryImpl) GetPendingApprovals(ctx context.Context, approverID string) ([]model.Expense, error) {
	subQuery := r.db.Table("expense_approvals").
		Select("expense_id").
		Where("approver_id = ? AND status = ?", approverID, model.ApprovalStatusPending)

	var expenses []model.Expense
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("id IN (?)", subQuery).
		Where("status = ?", model.ExpenseStatusSubmitted).
		Order("created_at ASC").
		Find(&expenses).Error

	if err != nil {
		r.logger.Error("Failed to get pending approvals",
			zap.Error(err),
			zap.String("approver_id", approverID))
		return nil, err
	}

	return expenses, nil
}

// UpdateStatus 経費申請のステータスを更新
func (r *ExpenseRepositoryImpl) UpdateStatus(ctx context.Context, id string, status model.ExpenseStatus) error {
	err := r.db.WithContext(ctx).
		Model(&model.Expense{}).
		Where("id = ?", id).
		Update("status", status).Error

	if err != nil {
		r.logger.Error("Failed to update expense status",
			zap.Error(err),
			zap.String("expense_id", id),
			zap.String("status", string(status)))
		return err
	}

	r.logger.Info("Expense status updated",
		zap.String("expense_id", id),
		zap.String("status", string(status)))
	return nil
}

// CountPendingByUserID ユーザーの承認待ち件数を取得
func (r *ExpenseRepositoryImpl) CountPendingByUserID(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.Expense{}).
		Where("user_id = ? AND status = ?", userID, model.ExpenseStatusSubmitted).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to count pending expenses",
			zap.Error(err),
			zap.String("user_id", userID))
		return 0, err
	}

	return count, nil
}

// ========================================
// 制限チェック関連
// ========================================

// GetTotalAmountInPeriod 指定期間の総金額を取得
func (r *ExpenseRepositoryImpl) GetTotalAmountInPeriod(ctx context.Context, userID string, startDate, endDate time.Time) (int, error) {
	var total int
	err := r.db.WithContext(ctx).
		Model(&model.Expense{}).
		Select("COALESCE(SUM(amount), 0)").
		Where("user_id = ? AND expense_date BETWEEN ? AND ?", userID, startDate, endDate).
		Where("status IN ?", []model.ExpenseStatus{
			model.ExpenseStatusSubmitted,
			model.ExpenseStatusApproved,
			model.ExpenseStatusPaid,
		}).
		Scan(&total).Error

	if err != nil {
		r.logger.Error("Failed to get total amount in period",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.Time("start_date", startDate),
			zap.Time("end_date", endDate))
		return 0, err
	}

	return total, nil
}

// GetMonthlyTotal 月次総額を取得
func (r *ExpenseRepositoryImpl) GetMonthlyTotal(ctx context.Context, userID string, year int, month int) (int, error) {
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)
	return r.GetTotalAmountInPeriod(ctx, userID, startDate, endDate)
}

// GetYearlyTotal 年次総額を取得
func (r *ExpenseRepositoryImpl) GetYearlyTotal(ctx context.Context, userID string, year int) (int, error) {
	startDate := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(year, 12, 31, 23, 59, 59, 0, time.UTC)
	return r.GetTotalAmountInPeriod(ctx, userID, startDate, endDate)
}

// ========================================
// ユーティリティ
// ========================================

// ExistsByID 経費申請IDが存在するかチェック
func (r *ExpenseRepositoryImpl) ExistsByID(ctx context.Context, id string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.Expense{}).
		Where("id = ?", id).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check expense existence",
			zap.Error(err),
			zap.String("expense_id", id))
		return false, err
	}

	return count > 0, nil
}

// ========================================
// プライベートヘルパーメソッド
// ========================================

// buildFilterQuery フィルター条件でクエリを構築
func (r *ExpenseRepositoryImpl) buildFilterQuery(ctx context.Context, filter *dto.ExpenseFilterRequest) *gorm.DB {
	query := r.db.WithContext(ctx).Model(&model.Expense{})

	// ステータスフィルター
	if filter.Status != nil && *filter.Status != "" {
		query = query.Where("status = ?", *filter.Status)
	}

	// カテゴリフィルター
	if filter.Category != nil && *filter.Category != "" {
		query = query.Where("category = ?", *filter.Category)
	}

	// 日付範囲フィルター（年度・会計年度指定を含む）
	startDate, endDate := filter.GetDateRange()
	if startDate != nil {
		query = query.Where("expense_date >= ?", *startDate)
	}
	if endDate != nil {
		query = query.Where("expense_date <= ?", *endDate)
	}

	// 金額範囲フィルター
	if filter.MinAmount != nil {
		query = query.Where("amount >= ?", *filter.MinAmount)
	}
	if filter.MaxAmount != nil {
		query = query.Where("amount <= ?", *filter.MaxAmount)
	}

	return query
}

// buildOrderClause ソート条件を構築
func (r *ExpenseRepositoryImpl) buildOrderClause(filter *dto.ExpenseFilterRequest) string {
	sortBy := "expense_date"
	if filter.SortBy != nil && *filter.SortBy != "" {
		sortBy = *filter.SortBy
	}

	sortOrder := "desc"
	if filter.SortOrder != nil && *filter.SortOrder != "" {
		sortOrder = strings.ToLower(*filter.SortOrder)
	}

	return fmt.Sprintf("%s %s", sortBy, sortOrder)
}

// GetByUserIDForExport ユーザーIDで経費申請を取得（CSVエクスポート用）
func (r *ExpenseRepositoryImpl) GetByUserIDForExport(ctx context.Context, userID string, filter *dto.ExpenseExportRequest) ([]*model.Expense, error) {
	var expenses []*model.Expense
	query := r.db.WithContext(ctx).
		Preload("User").
		
		Preload("Approver").
		Where("user_id = ?", userID)

	// フィルター条件を適用
	query = r.applyExportFilters(query, filter)

	// ソート（使用日の降順）
	query = query.Order("expense_date DESC")

	if err := query.Find(&expenses).Error; err != nil {
		r.logger.Error("Failed to get expenses for export",
			zap.Error(err),
			zap.String("user_id", userID))
		return nil, err
	}

	return expenses, nil
}

// GetAllForExport 全ての経費申請を取得（CSVエクスポート用）
func (r *ExpenseRepositoryImpl) GetAllForExport(ctx context.Context, filter *dto.ExpenseExportRequest) ([]*model.Expense, error) {
	var expenses []*model.Expense
	query := r.db.WithContext(ctx).
		Preload("User").
		
		Preload("Approver")

	// フィルター条件を適用
	query = r.applyExportFilters(query, filter)

	// ソート（使用日の降順）
	query = query.Order("expense_date DESC")

	if err := query.Find(&expenses).Error; err != nil {
		r.logger.Error("Failed to get all expenses for export", zap.Error(err))
		return nil, err
	}

	return expenses, nil
}

// applyExportFilters エクスポート用のフィルター条件を適用
func (r *ExpenseRepositoryImpl) applyExportFilters(query *gorm.DB, filter *dto.ExpenseExportRequest) *gorm.DB {
	// ユーザーIDフィルター
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}

	// 部門IDフィルター
	if filter.DepartmentID != nil {
		query = query.Joins("JOIN users u ON expenses.user_id = u.id").
			Where("u.department_id = ?", *filter.DepartmentID)
	}

	// ステータスフィルター
	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}

	// カテゴリIDフィルター
	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}

	// 日付範囲フィルター
	if filter.DateFrom != nil && filter.DateTo != nil {
		query = query.Where("expense_date BETWEEN ? AND ?", *filter.DateFrom, *filter.DateTo)
	} else if filter.DateFrom != nil {
		query = query.Where("expense_date >= ?", *filter.DateFrom)
	} else if filter.DateTo != nil {
		query = query.Where("expense_date <= ?", *filter.DateTo)
	}

	// 金額範囲フィルター
	if filter.AmountMin != nil && filter.AmountMax != nil {
		query = query.Where("amount BETWEEN ? AND ?", *filter.AmountMin, *filter.AmountMax)
	} else if filter.AmountMin != nil {
		query = query.Where("amount >= ?", *filter.AmountMin)
	} else if filter.AmountMax != nil {
		query = query.Where("amount <= ?", *filter.AmountMax)
	}

	// キーワード検索
	if filter.Keyword != nil && *filter.Keyword != "" {
		keyword := "%" + *filter.Keyword + "%"
		query = query.Where("(title LIKE ? OR description LIKE ?)", keyword, keyword)
	}

	// 会計年度フィルター
	if filter.FiscalYear != nil {
		startDate := time.Date(*filter.FiscalYear, 4, 1, 0, 0, 0, 0, time.Local)
		endDate := time.Date(*filter.FiscalYear+1, 3, 31, 23, 59, 59, 999999999, time.Local)
		query = query.Where("expense_date BETWEEN ? AND ?", startDate, endDate)
	}

	// 年月フィルター
	if filter.Year != nil && filter.Month != nil {
		startDate := time.Date(*filter.Year, time.Month(*filter.Month), 1, 0, 0, 0, 0, time.Local)
		endDate := startDate.AddDate(0, 1, 0).Add(-time.Nanosecond)
		query = query.Where("expense_date BETWEEN ? AND ?", startDate, endDate)
	} else if filter.Year != nil {
		startDate := time.Date(*filter.Year, 1, 1, 0, 0, 0, 0, time.Local)
		endDate := time.Date(*filter.Year, 12, 31, 23, 59, 59, 999999999, time.Local)
		query = query.Where("expense_date BETWEEN ? AND ?", startDate, endDate)
	} else if filter.Month != nil {
		query = query.Where("MONTH(expense_date) = ?", *filter.Month)
	}

	return query
}

// GetExpiredExpenses 期限切れになるべき経費申請を取得
func (r *ExpenseRepositoryImpl) GetExpiredExpenses(ctx context.Context, now time.Time) ([]*model.Expense, error) {
	var expenses []*model.Expense
	err := r.db.WithContext(ctx).
		Where("status = ?", model.ExpenseStatusSubmitted).
		Where("auto_expire_enabled = ?", true).
		Where("deadline_at IS NOT NULL").
		Where("deadline_at < ?", now).
		Find(&expenses).Error

	if err != nil {
		r.logger.Error("Failed to get expired expenses", zap.Error(err))
		return nil, err
	}

	return expenses, nil
}

// GetExpensesNeedingReminder リマインダーが必要な経費申請を取得
func (r *ExpenseRepositoryImpl) GetExpensesNeedingReminder(ctx context.Context, reminderDate time.Time) ([]*model.Expense, error) {
	var expenses []*model.Expense
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("status = ?", model.ExpenseStatusSubmitted).
		Where("deadline_at IS NOT NULL").
		Where("reminder_sent_at IS NULL").
		Where("deadline_at <= ?", reminderDate).
		Find(&expenses).Error

	if err != nil {
		r.logger.Error("Failed to get expenses needing reminder", zap.Error(err))
		return nil, err
	}

	return expenses, nil
}

// UpdateExpenseStatus 経費申請のステータスを更新
func (r *ExpenseRepositoryImpl) UpdateExpenseStatus(ctx context.Context, id string, status model.ExpenseStatus) error {
	err := r.db.WithContext(ctx).
		Model(&model.Expense{}).
		Where("id = ?", id).
		Update("status", status).Error

	if err != nil {
		r.logger.Error("Failed to update expense status",
			zap.Error(err),
			zap.String("expense_id", id),
			zap.String("status", string(status)))
		return err
	}

	return nil
}

// MarkAsExpired 経費申請を期限切れとしてマーク
func (r *ExpenseRepositoryImpl) MarkAsExpired(ctx context.Context, id string) error {
	now := time.Now()
	err := r.db.WithContext(ctx).
		Model(&model.Expense{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     model.ExpenseStatusExpired,
			"expired_at": now,
		}).Error

	if err != nil {
		r.logger.Error("Failed to mark expense as expired",
			zap.Error(err),
			zap.String("expense_id", id))
		return err
	}

	return nil
}

// MarkReminderSent リマインダー送信済みとしてマーク
func (r *ExpenseRepositoryImpl) MarkReminderSent(ctx context.Context, id string) error {
	now := time.Now()
	err := r.db.WithContext(ctx).
		Model(&model.Expense{}).
		Where("id = ?", id).
		Update("reminder_sent_at", now).Error

	if err != nil {
		r.logger.Error("Failed to mark reminder sent",
			zap.Error(err),
			zap.String("expense_id", id))
		return err
	}

	return nil
}

// MarkExpiryNotificationSent 期限切れ通知送信済みとしてマーク
func (r *ExpenseRepositoryImpl) MarkExpiryNotificationSent(ctx context.Context, id string) error {
	err := r.db.WithContext(ctx).
		Model(&model.Expense{}).
		Where("id = ?", id).
		Update("expiry_notification_sent", true).Error

	if err != nil {
		r.logger.Error("Failed to mark expiry notification sent",
			zap.Error(err),
			zap.String("expense_id", id))
		return err
	}

	return nil
}

// CountExpiringSoon 期限が近い経費申請数を取得
func (r *ExpenseRepositoryImpl) CountExpiringSoon(ctx context.Context, days int) (int64, error) {
	var count int64
	futureDate := time.Now().AddDate(0, 0, days)

	err := r.db.WithContext(ctx).Model(&model.Expense{}).
		Where("deadline IS NOT NULL AND deadline <= ? AND status IN (?)",
			futureDate,
			[]model.ExpenseStatus{model.ExpenseStatusDraft, model.ExpenseStatusSubmitted}).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to count expiring expenses",
			zap.Error(err),
			zap.Int("days", days))
		return 0, err
	}

	return count, nil
}
