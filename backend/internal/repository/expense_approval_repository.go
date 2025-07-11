package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseApprovalRepository 経費承認履歴に関するデータアクセスのインターフェース
type ExpenseApprovalRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, approval *model.ExpenseApproval) error
	CreateBatch(ctx context.Context, approvals []model.ExpenseApproval) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.ExpenseApproval, error)
	Update(ctx context.Context, approval *model.ExpenseApproval) error
	Delete(ctx context.Context, id uuid.UUID) error

	// 承認履歴取得
	GetByExpenseID(ctx context.Context, expenseID uuid.UUID) ([]model.ExpenseApproval, error)
	GetByExpenseIDOrderByStep(ctx context.Context, expenseID uuid.UUID) ([]model.ExpenseApproval, error)
	GetCurrentPendingApproval(ctx context.Context, expenseID uuid.UUID) (*model.ExpenseApproval, error)
	GetPendingApprovals(ctx context.Context, expenseID uuid.UUID) ([]model.ExpenseApproval, error)

	// 承認者関連
	GetByApproverID(ctx context.Context, approverID uuid.UUID) ([]model.ExpenseApproval, error)
	GetPendingByApproverID(ctx context.Context, approverID uuid.UUID, filter *dto.ApprovalFilterRequest) ([]model.ExpenseApproval, int64, error)
	GetPendingByApproverIDWithLimit(ctx context.Context, approverID uuid.UUID, limit int) ([]model.ExpenseApproval, error)
	CountPendingByApproverID(ctx context.Context, approverID uuid.UUID) (int64, error)

	// 承認フロー管理
	CreateApprovalFlow(ctx context.Context, expenseID uuid.UUID, amount int) error
	UpdateApprovalStatus(ctx context.Context, approvalID uuid.UUID, status model.ApprovalStatus, comment string, approverID uuid.UUID) error
	GetNextPendingApproval(ctx context.Context, expenseID uuid.UUID) (*model.ExpenseApproval, error)
	IsApprovalCompleted(ctx context.Context, expenseID uuid.UUID) (bool, error)
	IsApprovalRejected(ctx context.Context, expenseID uuid.UUID) (bool, error)

	// 統計・検索
	GetApprovalHistory(ctx context.Context, approverID uuid.UUID, fromDate, toDate time.Time) ([]model.ExpenseApproval, error)
	GetApprovalStatistics(ctx context.Context, approverID uuid.UUID, fromDate, toDate time.Time) (map[string]interface{}, error)
	GetExpensesByApprovalType(ctx context.Context, approvalType model.ApprovalType, status model.ApprovalStatus) ([]model.ExpenseApproval, error)

	// ユーティリティ
	ExistsByExpenseID(ctx context.Context, expenseID uuid.UUID) (bool, error)
	ExistsByApprovalID(ctx context.Context, approvalID uuid.UUID) (bool, error)
	CountPendingByLevel(ctx context.Context, level int) (int64, error)
	SetLogger(logger *zap.Logger)
}

// ExpenseApprovalRepositoryImpl 経費承認履歴に関するデータアクセスの実装
type ExpenseApprovalRepositoryImpl struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewExpenseApprovalRepository ExpenseApprovalRepositoryのインスタンスを生成する
func NewExpenseApprovalRepository(db *gorm.DB, logger *zap.Logger) ExpenseApprovalRepository {
	return &ExpenseApprovalRepositoryImpl{
		db:     db,
		logger: logger,
	}
}

// SetLogger ロガーを設定
func (r *ExpenseApprovalRepositoryImpl) SetLogger(logger *zap.Logger) {
	r.logger = logger
}

// ========================================
// 基本CRUD操作
// ========================================

// Create 承認レコードを作成
func (r *ExpenseApprovalRepositoryImpl) Create(ctx context.Context, approval *model.ExpenseApproval) error {
	if err := r.db.WithContext(ctx).Create(approval).Error; err != nil {
		r.logger.Error("Failed to create expense approval",
			zap.Error(err),
			zap.String("expense_id", approval.ExpenseID.String()),
			zap.String("approver_id", approval.ApproverID.String()),
			zap.String("approval_type", string(approval.ApprovalType)))
		return err
	}

	r.logger.Info("Expense approval created successfully",
		zap.String("approval_id", approval.ID.String()),
		zap.String("expense_id", approval.ExpenseID.String()),
		zap.String("approver_id", approval.ApproverID.String()),
		zap.String("approval_type", string(approval.ApprovalType)))
	return nil
}

// CreateBatch 複数の承認レコードを一括作成
func (r *ExpenseApprovalRepositoryImpl) CreateBatch(ctx context.Context, approvals []model.ExpenseApproval) error {
	if len(approvals) == 0 {
		return nil
	}

	if err := r.db.WithContext(ctx).CreateInBatches(approvals, 100).Error; err != nil {
		r.logger.Error("Failed to create expense approvals in batch",
			zap.Error(err),
			zap.Int("count", len(approvals)))
		return err
	}

	r.logger.Info("Expense approvals created successfully in batch",
		zap.Int("count", len(approvals)))
	return nil
}

// GetByID 承認IDで単一レコードを取得
func (r *ExpenseApprovalRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*model.ExpenseApproval, error) {
	var approval model.ExpenseApproval
	err := r.db.WithContext(ctx).
		Preload("Expense").
		Preload("Approver").
		Where("id = ?", id).
		First(&approval).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Expense approval not found", zap.String("approval_id", id.String()))
			return nil, err
		}
		r.logger.Error("Failed to get expense approval by ID",
			zap.Error(err),
			zap.String("approval_id", id.String()))
		return nil, err
	}

	return &approval, nil
}

// Update 承認レコードを更新
func (r *ExpenseApprovalRepositoryImpl) Update(ctx context.Context, approval *model.ExpenseApproval) error {
	err := r.db.WithContext(ctx).Save(approval).Error
	if err != nil {
		r.logger.Error("Failed to update expense approval",
			zap.Error(err),
			zap.String("approval_id", approval.ID.String()))
		return err
	}

	r.logger.Info("Expense approval updated successfully",
		zap.String("approval_id", approval.ID.String()),
		zap.String("status", string(approval.Status)))
	return nil
}

// Delete 承認レコードを削除（物理削除）
func (r *ExpenseApprovalRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	err := r.db.WithContext(ctx).Delete(&model.ExpenseApproval{}, id).Error
	if err != nil {
		r.logger.Error("Failed to delete expense approval",
			zap.Error(err),
			zap.String("approval_id", id.String()))
		return err
	}

	r.logger.Info("Expense approval deleted successfully",
		zap.String("approval_id", id.String()))
	return nil
}

// ========================================
// 承認履歴取得
// ========================================

// GetByExpenseID 経費申請IDで承認履歴を取得
func (r *ExpenseApprovalRepositoryImpl) GetByExpenseID(ctx context.Context, expenseID uuid.UUID) ([]model.ExpenseApproval, error) {
	var approvals []model.ExpenseApproval
	err := r.db.WithContext(ctx).
		Preload("Approver").
		Where("expense_id = ?", expenseID).
		Find(&approvals).Error

	if err != nil {
		r.logger.Error("Failed to get expense approvals by expense ID",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()))
		return nil, err
	}

	return approvals, nil
}

// GetByExpenseIDOrderByStep 経費申請IDで承認履歴を承認順序順で取得
func (r *ExpenseApprovalRepositoryImpl) GetByExpenseIDOrderByStep(ctx context.Context, expenseID uuid.UUID) ([]model.ExpenseApproval, error) {
	var approvals []model.ExpenseApproval
	err := r.db.WithContext(ctx).
		Preload("Approver").
		Where("expense_id = ?", expenseID).
		Order("approval_order ASC").
		Find(&approvals).Error

	if err != nil {
		r.logger.Error("Failed to get expense approvals by expense ID ordered by step",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()))
		return nil, err
	}

	return approvals, nil
}

// GetCurrentPendingApproval 現在承認待ちの承認レコードを取得
func (r *ExpenseApprovalRepositoryImpl) GetCurrentPendingApproval(ctx context.Context, expenseID uuid.UUID) (*model.ExpenseApproval, error) {
	var approval model.ExpenseApproval
	err := r.db.WithContext(ctx).
		Preload("Approver").
		Where("expense_id = ? AND status = ?", expenseID, model.ApprovalStatusPending).
		Order("approval_order ASC").
		First(&approval).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // 承認待ちがない場合はnilを返す
		}
		r.logger.Error("Failed to get current pending approval",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()))
		return nil, err
	}

	return &approval, nil
}

// GetPendingApprovals 経費IDに紐づく承認待ち一覧を取得
func (r *ExpenseApprovalRepositoryImpl) GetPendingApprovals(ctx context.Context, expenseID uuid.UUID) ([]model.ExpenseApproval, error) {
	var approvals []model.ExpenseApproval
	err := r.db.WithContext(ctx).
		Preload("Approver").
		Where("expense_id = ? AND status = ?", expenseID, model.ApprovalStatusPending).
		Order("approval_order ASC").
		Find(&approvals).Error

	if err != nil {
		r.logger.Error("Failed to get pending approvals",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()))
		return nil, err
	}

	return approvals, nil
}

// ========================================
// 承認者関連
// ========================================

// GetByApproverID 承認者IDで承認履歴を取得
func (r *ExpenseApprovalRepositoryImpl) GetByApproverID(ctx context.Context, approverID uuid.UUID) ([]model.ExpenseApproval, error) {
	var approvals []model.ExpenseApproval
	err := r.db.WithContext(ctx).
		Preload("Expense").
		Preload("Expense.User").
		Where("approver_id = ?", approverID).
		Order("created_at DESC").
		Find(&approvals).Error

	if err != nil {
		r.logger.Error("Failed to get expense approvals by approver ID",
			zap.Error(err),
			zap.String("approver_id", approverID.String()))
		return nil, err
	}

	return approvals, nil
}

// GetPendingByApproverID 承認者の承認待ち一覧を取得（フィルタ対応）
func (r *ExpenseApprovalRepositoryImpl) GetPendingByApproverID(ctx context.Context, approverID uuid.UUID, filter *dto.ApprovalFilterRequest) ([]model.ExpenseApproval, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.ExpenseApproval{}).
		Joins("JOIN expenses ON expense_approvals.expense_id = expenses.id").
		Where("expense_approvals.approver_id = ? AND expense_approvals.status = ?", approverID, model.ApprovalStatusPending)

	// フィルタ条件を適用
	if filter.ApprovalType != nil {
		query = query.Where("expense_approvals.approval_type = ?", *filter.ApprovalType)
	}
	if filter.UserID != nil {
		query = query.Where("expenses.user_id = ?", *filter.UserID)
	}
	if filter.DateFrom != nil {
		query = query.Where("expenses.expense_date >= ?", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		query = query.Where("expenses.expense_date <= ?", *filter.DateTo)
	}
	if filter.AmountMin != nil {
		query = query.Where("expenses.amount >= ?", *filter.AmountMin)
	}
	if filter.AmountMax != nil {
		query = query.Where("expenses.amount <= ?", *filter.AmountMax)
	}
	if filter.CategoryID != nil {
		query = query.Where("expenses.category_id = ?", *filter.CategoryID)
	}
	if filter.Keyword != nil && *filter.Keyword != "" {
		searchTerm := "%" + *filter.Keyword + "%"
		query = query.Where("(expenses.title LIKE ? OR expenses.description LIKE ?)", searchTerm, searchTerm)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count pending approvals",
			zap.Error(err),
			zap.String("approver_id", approverID.String()))
		return nil, 0, err
	}

	// ソート条件を適用
	orderClause := "expense_approvals.created_at ASC"
	if filter.SortBy != "" {
		sortField := filter.SortBy
		if sortField == "expense_date" {
			sortField = "expenses.expense_date"
		} else if sortField == "amount" {
			sortField = "expenses.amount"
		} else if sortField == "created_at" {
			sortField = "expense_approvals.created_at"
		}

		sortOrder := "ASC"
		if filter.SortOrder == "desc" {
			sortOrder = "DESC"
		}
		orderClause = sortField + " " + sortOrder
	}

	// データ取得
	var approvals []model.ExpenseApproval
	err := query.
		Preload("Expense").
		Preload("Expense.User").
		Preload("Approver").
		Order(orderClause).
		Offset((filter.Page - 1) * filter.Limit).
		Limit(filter.Limit).
		Find(&approvals).Error

	if err != nil {
		r.logger.Error("Failed to get pending approvals by approver ID",
			zap.Error(err),
			zap.String("approver_id", approverID.String()))
		return nil, 0, err
	}

	return approvals, total, nil
}

// GetPendingByApproverIDWithLimit 承認者の承認待ち一覧を件数制限付きで取得
func (r *ExpenseApprovalRepositoryImpl) GetPendingByApproverIDWithLimit(ctx context.Context, approverID uuid.UUID, limit int) ([]model.ExpenseApproval, error) {
	var approvals []model.ExpenseApproval
	err := r.db.WithContext(ctx).
		Preload("Expense").
		Preload("Expense.User").
		Where("approver_id = ? AND status = ?", approverID, model.ApprovalStatusPending).
		Order("created_at ASC").
		Limit(limit).
		Find(&approvals).Error

	if err != nil {
		r.logger.Error("Failed to get pending approvals by approver ID with limit",
			zap.Error(err),
			zap.String("approver_id", approverID.String()),
			zap.Int("limit", limit))
		return nil, err
	}

	return approvals, nil
}

// CountPendingByApproverID 承認者の承認待ち件数を取得
func (r *ExpenseApprovalRepositoryImpl) CountPendingByApproverID(ctx context.Context, approverID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseApproval{}).
		Where("approver_id = ? AND status = ?", approverID, model.ApprovalStatusPending).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to count pending approvals by approver ID",
			zap.Error(err),
			zap.String("approver_id", approverID.String()))
		return 0, err
	}

	return count, nil
}

// ========================================
// 承認フロー管理
// ========================================

// CreateApprovalFlow 承認フローを作成（金額に応じて必要な承認者を設定）
func (r *ExpenseApprovalRepositoryImpl) CreateApprovalFlow(ctx context.Context, expenseID uuid.UUID, amount int) error {
	// 承認フローの設計:
	// 5万円未満: 管理部のみ
	// 5万円以上: 管理部 → 役員

	var approvals []model.ExpenseApproval

	// 承認者設定から動的に取得
	settingRepo := NewExpenseApproverSettingRepository(r.db, r.logger)

	// 管理部承認者を取得
	managerSettings, err := settingRepo.GetActiveByApprovalType(ctx, model.ApprovalTypeManager)
	if err != nil {
		r.logger.Error("Failed to get manager approvers", zap.Error(err))
		return err
	}

	if len(managerSettings) == 0 {
		r.logger.Error("No active manager approvers found")
		return fmt.Errorf("管理部承認者が設定されていません")
	}

	// 管理部承認を作成（優先順位順）
	approvalOrder := 1
	for _, setting := range managerSettings {
		approval := model.ExpenseApproval{
			ExpenseID:     expenseID,
			ApproverID:    setting.ApproverID,
			ApprovalType:  model.ApprovalTypeManager,
			ApprovalOrder: approvalOrder,
			Status:        model.ApprovalStatusPending,
		}
		approvals = append(approvals, approval)
		approvalOrder++
	}

	// 5万円以上の場合は役員承認も必要
	if amount >= 50000 {
		executiveSettings, err := settingRepo.GetActiveByApprovalType(ctx, model.ApprovalTypeExecutive)
		if err != nil {
			r.logger.Error("Failed to get executive approvers", zap.Error(err))
			return err
		}

		if len(executiveSettings) == 0 {
			r.logger.Error("No active executive approvers found")
			return fmt.Errorf("役員承認者が設定されていません")
		}

		// 役員承認を作成（優先順位順）
		for _, setting := range executiveSettings {
			approval := model.ExpenseApproval{
				ExpenseID:     expenseID,
				ApproverID:    setting.ApproverID,
				ApprovalType:  model.ApprovalTypeExecutive,
				ApprovalOrder: approvalOrder,
				Status:        model.ApprovalStatusPending,
			}
			approvals = append(approvals, approval)
			approvalOrder++
		}
	}

	// 承認フローをバッチ作成
	if err := r.CreateBatch(ctx, approvals); err != nil {
		r.logger.Error("Failed to create approval flow",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()),
			zap.Int("amount", amount))
		return err
	}

	r.logger.Info("Approval flow created successfully",
		zap.String("expense_id", expenseID.String()),
		zap.Int("amount", amount),
		zap.Int("approval_steps", len(approvals)))
	return nil
}

// UpdateApprovalStatus 承認ステータスを更新
func (r *ExpenseApprovalRepositoryImpl) UpdateApprovalStatus(ctx context.Context, approvalID uuid.UUID, status model.ApprovalStatus, comment string, approverID uuid.UUID) error {
	// 楽観的ロックを考慮した更新
	result := r.db.WithContext(ctx).
		Model(&model.ExpenseApproval{}).
		Where("id = ? AND approver_id = ? AND status = ?", approvalID, approverID, model.ApprovalStatusPending).
		Updates(map[string]interface{}{
			"status":      status,
			"comment":     comment,
			"approved_at": time.Now(),
		})

	if result.Error != nil {
		r.logger.Error("Failed to update approval status",
			zap.Error(result.Error),
			zap.String("approval_id", approvalID.String()),
			zap.String("approver_id", approverID.String()),
			zap.String("status", string(status)))
		return result.Error
	}

	if result.RowsAffected == 0 {
		r.logger.Warn("No rows affected when updating approval status - possible concurrent modification",
			zap.String("approval_id", approvalID.String()),
			zap.String("approver_id", approverID.String()),
			zap.String("status", string(status)))
		return gorm.ErrRecordNotFound
	}

	r.logger.Info("Approval status updated successfully",
		zap.String("approval_id", approvalID.String()),
		zap.String("approver_id", approverID.String()),
		zap.String("status", string(status)))
	return nil
}

// GetNextPendingApproval 次の承認待ち承認者を取得
func (r *ExpenseApprovalRepositoryImpl) GetNextPendingApproval(ctx context.Context, expenseID uuid.UUID) (*model.ExpenseApproval, error) {
	return r.GetCurrentPendingApproval(ctx, expenseID)
}

// IsApprovalCompleted 承認が完了しているかチェック
func (r *ExpenseApprovalRepositoryImpl) IsApprovalCompleted(ctx context.Context, expenseID uuid.UUID) (bool, error) {
	var pendingCount int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseApproval{}).
		Where("expense_id = ? AND status = ?", expenseID, model.ApprovalStatusPending).
		Count(&pendingCount).Error

	if err != nil {
		r.logger.Error("Failed to check if approval is completed",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()))
		return false, err
	}

	return pendingCount == 0, nil
}

// IsApprovalRejected 承認が却下されているかチェック
func (r *ExpenseApprovalRepositoryImpl) IsApprovalRejected(ctx context.Context, expenseID uuid.UUID) (bool, error) {
	var rejectedCount int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseApproval{}).
		Where("expense_id = ? AND status = ?", expenseID, model.ApprovalStatusRejected).
		Count(&rejectedCount).Error

	if err != nil {
		r.logger.Error("Failed to check if approval is rejected",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()))
		return false, err
	}

	return rejectedCount > 0, nil
}

// ========================================
// 統計・検索
// ========================================

// GetApprovalHistory 承認者の承認履歴を期間指定で取得
func (r *ExpenseApprovalRepositoryImpl) GetApprovalHistory(ctx context.Context, approverID uuid.UUID, fromDate, toDate time.Time) ([]model.ExpenseApproval, error) {
	var approvals []model.ExpenseApproval
	err := r.db.WithContext(ctx).
		Preload("Expense").
		Preload("Expense.User").
		Where("approver_id = ? AND approved_at BETWEEN ? AND ?", approverID, fromDate, toDate).
		Where("status IN ?", []model.ApprovalStatus{model.ApprovalStatusApproved, model.ApprovalStatusRejected}).
		Order("approved_at DESC").
		Find(&approvals).Error

	if err != nil {
		r.logger.Error("Failed to get approval history",
			zap.Error(err),
			zap.String("approver_id", approverID.String()),
			zap.Time("from_date", fromDate),
			zap.Time("to_date", toDate))
		return nil, err
	}

	return approvals, nil
}

// GetApprovalStatistics 承認者の承認統計を取得
func (r *ExpenseApprovalRepositoryImpl) GetApprovalStatistics(ctx context.Context, approverID uuid.UUID, fromDate, toDate time.Time) (map[string]interface{}, error) {
	type statsResult struct {
		TotalApprovals     int64
		ApprovedCount      int64
		RejectedCount      int64
		PendingCount       int64
		TotalAmount        int64
		ApprovedAmount     int64
		RejectedAmount     int64
		AverageProcessTime float64 // 平均処理時間（時間）
	}

	var result statsResult

	// 基本統計
	err := r.db.WithContext(ctx).
		Table("expense_approvals ea").
		Select(`
			COUNT(*) as total_approvals,
			COUNT(CASE WHEN ea.status = 'approved' THEN 1 END) as approved_count,
			COUNT(CASE WHEN ea.status = 'rejected' THEN 1 END) as rejected_count,
			COUNT(CASE WHEN ea.status = 'pending' THEN 1 END) as pending_count,
			COALESCE(SUM(e.amount), 0) as total_amount,
			COALESCE(SUM(CASE WHEN ea.status = 'approved' THEN e.amount ELSE 0 END), 0) as approved_amount,
			COALESCE(SUM(CASE WHEN ea.status = 'rejected' THEN e.amount ELSE 0 END), 0) as rejected_amount,
			COALESCE(AVG(CASE WHEN ea.approved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, ea.created_at, ea.approved_at) END), 0) as average_process_time
		`).
		Joins("LEFT JOIN expenses e ON ea.expense_id = e.id").
		Where("ea.approver_id = ? AND ea.created_at BETWEEN ? AND ?", approverID, fromDate, toDate).
		Scan(&result).Error

	if err != nil {
		r.logger.Error("Failed to get approval statistics",
			zap.Error(err),
			zap.String("approver_id", approverID.String()))
		return nil, err
	}

	stats := map[string]interface{}{
		"total_approvals":      result.TotalApprovals,
		"approved_count":       result.ApprovedCount,
		"rejected_count":       result.RejectedCount,
		"pending_count":        result.PendingCount,
		"total_amount":         result.TotalAmount,
		"approved_amount":      result.ApprovedAmount,
		"rejected_amount":      result.RejectedAmount,
		"average_process_time": result.AverageProcessTime,
	}

	// 承認率を計算
	if result.TotalApprovals > 0 {
		stats["approval_rate"] = float64(result.ApprovedCount) / float64(result.TotalApprovals) * 100
	} else {
		stats["approval_rate"] = 0.0
	}

	return stats, nil
}

// GetExpensesByApprovalType 承認種別とステータスで経費申請を取得
func (r *ExpenseApprovalRepositoryImpl) GetExpensesByApprovalType(ctx context.Context, approvalType model.ApprovalType, status model.ApprovalStatus) ([]model.ExpenseApproval, error) {
	var approvals []model.ExpenseApproval
	err := r.db.WithContext(ctx).
		Preload("Expense").
		Preload("Expense.User").
		Preload("Approver").
		Where("approval_type = ? AND status = ?", approvalType, status).
		Order("created_at DESC").
		Find(&approvals).Error

	if err != nil {
		r.logger.Error("Failed to get expenses by approval type",
			zap.Error(err),
			zap.String("approval_type", string(approvalType)),
			zap.String("status", string(status)))
		return nil, err
	}

	return approvals, nil
}

// ========================================
// ユーティリティ
// ========================================

// ExistsByExpenseID 経費申請IDに承認レコードが存在するかチェック
func (r *ExpenseApprovalRepositoryImpl) ExistsByExpenseID(ctx context.Context, expenseID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseApproval{}).
		Where("expense_id = ?", expenseID).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check approval existence by expense ID",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()))
		return false, err
	}

	return count > 0, nil
}

// ExistsByApprovalID 承認IDが存在するかチェック
func (r *ExpenseApprovalRepositoryImpl) ExistsByApprovalID(ctx context.Context, approvalID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseApproval{}).
		Where("id = ?", approvalID).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check approval existence by approval ID",
			zap.Error(err),
			zap.String("approval_id", approvalID.String()))
		return false, err
	}

	return count > 0, nil
}

// CountPendingByLevel 承認レベル別の待機中承認数を取得
func (r *ExpenseApprovalRepositoryImpl) CountPendingByLevel(ctx context.Context, level int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.ExpenseApproval{}).
		Where("status = ? AND approval_type = ?", model.ApprovalStatusPending, level).
		Count(&count).Error
	return count, err
}
