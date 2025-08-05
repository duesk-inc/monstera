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

// ExpenseLimitRepository 経費申請上限に関するデータアクセスのインターフェース
type ExpenseLimitRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, limit *model.ExpenseLimit) error
	CreateLimit(ctx context.Context, limit *model.ExpenseLimit) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.ExpenseLimit, error)
	Update(ctx context.Context, limit *model.ExpenseLimit) error
	Delete(ctx context.Context, id uuid.UUID) error

	// 上限取得
	GetCurrentMonthlyLimit(ctx context.Context) (*model.ExpenseLimit, error)
	GetCurrentYearlyLimit(ctx context.Context) (*model.ExpenseLimit, error)
	GetEffectiveLimitByType(ctx context.Context, limitType model.LimitType, targetDate time.Time) (*model.ExpenseLimit, error)
	GetAllLimits(ctx context.Context) ([]model.ExpenseLimit, error)
	GetLimitsByType(ctx context.Context, limitType model.LimitType) ([]model.ExpenseLimit, error)

	// 上限チェック
	CheckMonthlyLimit(ctx context.Context, userID string, amount int, targetMonth time.Time) (bool, int, error)
	CheckYearlyLimit(ctx context.Context, userID string, amount int, targetYear int) (bool, int, error)
	GetRemainingMonthlyLimit(ctx context.Context, userID string, targetMonth time.Time) (int, error)
	GetRemainingYearlyLimit(ctx context.Context, userID string, targetYear int) (int, error)

	// 履歴管理
	GetLimitHistory(ctx context.Context, limitType model.LimitType, fromDate, toDate time.Time) ([]model.ExpenseLimit, error)
	GetLimitAtDate(ctx context.Context, limitType model.LimitType, date time.Time) (*model.ExpenseLimit, error)
	GetLatestLimitByType(ctx context.Context, limitType model.LimitType) (*model.ExpenseLimit, error)
	GetLimitHistoryWithScope(ctx context.Context, filter *dto.ExpenseLimitHistoryRequest) ([]model.ExpenseLimit, int64, error)

	// 初期化・設定
	InitializeDefaultLimits(ctx context.Context, createdBy uuid.UUID) error
	UpdateLimitAmount(ctx context.Context, limitType model.LimitType, newAmount int, createdBy uuid.UUID) error
	SetEffectiveDate(ctx context.Context, id uuid.UUID, effectiveFrom time.Time) error

	// スコープ対応の新機能
	GetLimitsWithScope(ctx context.Context, filter *dto.ExpenseLimitListRequest) ([]model.ExpenseLimit, int64, error)
	GetEffectiveLimitsForUser(ctx context.Context, userID string, departmentID *uuid.UUID, limitType model.LimitType, targetDate time.Time) (*model.ExpenseLimit, error)
	CheckLimitsForUser(ctx context.Context, userID string, departmentID *uuid.UUID, amount int, targetDate time.Time) (*dto.LimitCheckResult, error)
	CreateWithScope(ctx context.Context, limit *model.ExpenseLimit) error
	UpdateWithScope(ctx context.Context, limit *model.ExpenseLimit) error
	DeleteWithScope(ctx context.Context, id uuid.UUID) error

	// ユーティリティ
	ExistsByID(ctx context.Context, id uuid.UUID) (bool, error)
	CountByType(ctx context.Context, limitType model.LimitType) (int64, error)
	SetLogger(logger *zap.Logger)
}

// ExpenseLimitRepositoryImpl 経費申請上限に関するデータアクセスの実装
type ExpenseLimitRepositoryImpl struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewExpenseLimitRepository ExpenseLimitRepositoryのインスタンスを生成する
func NewExpenseLimitRepository(db *gorm.DB, logger *zap.Logger) ExpenseLimitRepository {
	return &ExpenseLimitRepositoryImpl{
		db:     db,
		logger: logger,
	}
}

// SetLogger ロガーを設定
func (r *ExpenseLimitRepositoryImpl) SetLogger(logger *zap.Logger) {
	r.logger = logger
}

// ========================================
// 基本CRUD操作
// ========================================

// Create 新しい上限設定を作成
func (r *ExpenseLimitRepositoryImpl) Create(ctx context.Context, limit *model.ExpenseLimit) error {
	if err := r.db.WithContext(ctx).Create(limit).Error; err != nil {
		r.logger.Error("Failed to create expense limit",
			zap.Error(err),
			zap.String("limit_type", string(limit.LimitType)),
			zap.Int("amount", limit.Amount))
		return err
	}

	r.logger.Info("Expense limit created successfully",
		zap.String("limit_id", limit.ID.String()),
		zap.String("limit_type", string(limit.LimitType)),
		zap.Int("amount", limit.Amount))
	return nil
}

// GetByID 上限IDで単一レコードを取得
func (r *ExpenseLimitRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*model.ExpenseLimit, error) {
	var limit model.ExpenseLimit
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&limit).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Expense limit not found", zap.String("limit_id", id.String()))
			return nil, err
		}
		r.logger.Error("Failed to get expense limit by ID",
			zap.Error(err),
			zap.String("limit_id", id.String()))
		return nil, err
	}

	return &limit, nil
}

// Update 上限設定を更新
func (r *ExpenseLimitRepositoryImpl) Update(ctx context.Context, limit *model.ExpenseLimit) error {
	err := r.db.WithContext(ctx).Save(limit).Error
	if err != nil {
		r.logger.Error("Failed to update expense limit",
			zap.Error(err),
			zap.String("limit_id", limit.ID.String()))
		return err
	}

	r.logger.Info("Expense limit updated successfully",
		zap.String("limit_id", limit.ID.String()),
		zap.String("limit_type", string(limit.LimitType)))
	return nil
}

// Delete 上限設定を削除（物理削除）
func (r *ExpenseLimitRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	err := r.db.WithContext(ctx).Delete(&model.ExpenseLimit{}, id).Error
	if err != nil {
		r.logger.Error("Failed to delete expense limit",
			zap.Error(err),
			zap.String("limit_id", id.String()))
		return err
	}

	r.logger.Info("Expense limit deleted successfully",
		zap.String("limit_id", id.String()))
	return nil
}

// ========================================
// 上限取得
// ========================================

// GetCurrentMonthlyLimit 現在有効な月次上限を取得
func (r *ExpenseLimitRepositoryImpl) GetCurrentMonthlyLimit(ctx context.Context) (*model.ExpenseLimit, error) {
	return r.GetEffectiveLimitByType(ctx, model.LimitTypeMonthly, time.Now())
}

// GetCurrentYearlyLimit 現在有効な年次上限を取得
func (r *ExpenseLimitRepositoryImpl) GetCurrentYearlyLimit(ctx context.Context) (*model.ExpenseLimit, error) {
	return r.GetEffectiveLimitByType(ctx, model.LimitTypeYearly, time.Now())
}

// GetEffectiveLimitByType 指定日時点で有効な上限を取得
func (r *ExpenseLimitRepositoryImpl) GetEffectiveLimitByType(ctx context.Context, limitType model.LimitType, targetDate time.Time) (*model.ExpenseLimit, error) {
	var limit model.ExpenseLimit
	err := r.db.WithContext(ctx).
		Where("limit_type = ? AND effective_from <= ?", limitType, targetDate).
		Order("effective_from DESC").
		First(&limit).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("No effective expense limit found",
				zap.String("limit_type", string(limitType)),
				zap.Time("target_date", targetDate))
			return nil, err
		}
		r.logger.Error("Failed to get effective expense limit",
			zap.Error(err),
			zap.String("limit_type", string(limitType)),
			zap.Time("target_date", targetDate))
		return nil, err
	}

	return &limit, nil
}

// GetAllLimits 全ての上限設定を取得
func (r *ExpenseLimitRepositoryImpl) GetAllLimits(ctx context.Context) ([]model.ExpenseLimit, error) {
	var limits []model.ExpenseLimit
	err := r.db.WithContext(ctx).
		Order("limit_type ASC, effective_from DESC").
		Find(&limits).Error

	if err != nil {
		r.logger.Error("Failed to get all expense limits", zap.Error(err))
		return nil, err
	}

	return limits, nil
}

// GetLimitsByType タイプ別に上限設定を取得
func (r *ExpenseLimitRepositoryImpl) GetLimitsByType(ctx context.Context, limitType model.LimitType) ([]model.ExpenseLimit, error) {
	var limits []model.ExpenseLimit
	err := r.db.WithContext(ctx).
		Where("limit_type = ?", limitType).
		Order("effective_from DESC").
		Find(&limits).Error

	if err != nil {
		r.logger.Error("Failed to get expense limits by type",
			zap.Error(err),
			zap.String("limit_type", string(limitType)))
		return nil, err
	}

	return limits, nil
}

// ========================================
// 上限チェック
// ========================================

// CheckMonthlyLimit 月次上限をチェック（true: 上限内、false: 上限超過）
func (r *ExpenseLimitRepositoryImpl) CheckMonthlyLimit(ctx context.Context, userID string, amount int, targetMonth time.Time) (bool, int, error) {
	// 現在の月次上限を取得
	limit, err := r.GetEffectiveLimitByType(ctx, model.LimitTypeMonthly, targetMonth)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// 上限設定がない場合は無制限として扱う
			return true, 0, nil
		}
		return false, 0, err
	}

	// 該当月の経費合計を取得
	var currentTotal int64
	startOfMonth := time.Date(targetMonth.Year(), targetMonth.Month(), 1, 0, 0, 0, 0, targetMonth.Location())
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond)

	err = r.db.WithContext(ctx).
		Table("expenses").
		Select("COALESCE(SUM(amount), 0)").
		Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfMonth, endOfMonth).
		Where("status IN ?", []string{"draft", "submitted", "approved"}).
		Scan(&currentTotal).Error

	if err != nil {
		r.logger.Error("Failed to calculate monthly expense total",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.Time("target_month", targetMonth))
		return false, 0, err
	}

	// 新規申請額を含めた合計が上限以内かチェック
	totalWithNew := int(currentTotal) + amount
	withinLimit := totalWithNew <= limit.Amount
	remaining := limit.Amount - int(currentTotal)

	r.logger.Debug("Monthly limit check",
		zap.String("user_id", userID),
		zap.Int("current_total", int(currentTotal)),
		zap.Int("new_amount", amount),
		zap.Int("limit", limit.Amount),
		zap.Bool("within_limit", withinLimit),
		zap.Int("remaining", remaining))

	return withinLimit, remaining, nil
}

// CheckYearlyLimit 年次上限をチェック（true: 上限内、false: 上限超過）
func (r *ExpenseLimitRepositoryImpl) CheckYearlyLimit(ctx context.Context, userID string, amount int, targetYear int) (bool, int, error) {
	// 現在の年次上限を取得
	targetDate := time.Date(targetYear, 1, 1, 0, 0, 0, 0, time.UTC)
	limit, err := r.GetEffectiveLimitByType(ctx, model.LimitTypeYearly, targetDate)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// 上限設定がない場合は無制限として扱う
			return true, 0, nil
		}
		return false, 0, err
	}

	// 該当年の経費合計を取得
	var currentTotal int64
	startOfYear := time.Date(targetYear, 1, 1, 0, 0, 0, 0, time.UTC)
	endOfYear := time.Date(targetYear, 12, 31, 23, 59, 59, 999999999, time.UTC)

	err = r.db.WithContext(ctx).
		Table("expenses").
		Select("COALESCE(SUM(amount), 0)").
		Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfYear, endOfYear).
		Where("status IN ?", []string{"draft", "submitted", "approved"}).
		Scan(&currentTotal).Error

	if err != nil {
		r.logger.Error("Failed to calculate yearly expense total",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.Int("target_year", targetYear))
		return false, 0, err
	}

	// 新規申請額を含めた合計が上限以内かチェック
	totalWithNew := int(currentTotal) + amount
	withinLimit := totalWithNew <= limit.Amount
	remaining := limit.Amount - int(currentTotal)

	r.logger.Debug("Yearly limit check",
		zap.String("user_id", userID),
		zap.Int("current_total", int(currentTotal)),
		zap.Int("new_amount", amount),
		zap.Int("limit", limit.Amount),
		zap.Bool("within_limit", withinLimit),
		zap.Int("remaining", remaining))

	return withinLimit, remaining, nil
}

// GetRemainingMonthlyLimit 月次の残り利用可能額を取得
func (r *ExpenseLimitRepositoryImpl) GetRemainingMonthlyLimit(ctx context.Context, userID string, targetMonth time.Time) (int, error) {
	_, remaining, err := r.CheckMonthlyLimit(ctx, userID, 0, targetMonth)
	return remaining, err
}

// GetRemainingYearlyLimit 年次の残り利用可能額を取得
func (r *ExpenseLimitRepositoryImpl) GetRemainingYearlyLimit(ctx context.Context, userID string, targetYear int) (int, error) {
	_, remaining, err := r.CheckYearlyLimit(ctx, userID, 0, targetYear)
	return remaining, err
}

// ========================================
// 履歴管理
// ========================================

// GetLimitHistory 指定期間の上限履歴を取得
func (r *ExpenseLimitRepositoryImpl) GetLimitHistory(ctx context.Context, limitType model.LimitType, fromDate, toDate time.Time) ([]model.ExpenseLimit, error) {
	var limits []model.ExpenseLimit
	err := r.db.WithContext(ctx).
		Where("limit_type = ? AND effective_from BETWEEN ? AND ?", limitType, fromDate, toDate).
		Order("effective_from DESC").
		Find(&limits).Error

	if err != nil {
		r.logger.Error("Failed to get expense limit history",
			zap.Error(err),
			zap.String("limit_type", string(limitType)),
			zap.Time("from_date", fromDate),
			zap.Time("to_date", toDate))
		return nil, err
	}

	return limits, nil
}

// GetLimitAtDate 指定日時点の上限を取得
func (r *ExpenseLimitRepositoryImpl) GetLimitAtDate(ctx context.Context, limitType model.LimitType, date time.Time) (*model.ExpenseLimit, error) {
	return r.GetEffectiveLimitByType(ctx, limitType, date)
}

// GetLatestLimitByType 最新の上限設定を取得
func (r *ExpenseLimitRepositoryImpl) GetLatestLimitByType(ctx context.Context, limitType model.LimitType) (*model.ExpenseLimit, error) {
	var limit model.ExpenseLimit
	err := r.db.WithContext(ctx).
		Where("limit_type = ?", limitType).
		Order("effective_from DESC").
		First(&limit).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("No expense limit found",
				zap.String("limit_type", string(limitType)))
			return nil, err
		}
		r.logger.Error("Failed to get latest expense limit",
			zap.Error(err),
			zap.String("limit_type", string(limitType)))
		return nil, err
	}

	return &limit, nil
}

// ========================================
// 初期化・設定
// ========================================

// InitializeDefaultLimits デフォルト上限を初期化
func (r *ExpenseLimitRepositoryImpl) InitializeDefaultLimits(ctx context.Context, createdBy uuid.UUID) error {
	// 既に上限設定が存在する場合はスキップ
	count, err := r.CountByType(ctx, model.LimitTypeMonthly)
	if err != nil {
		return err
	}
	if count > 0 {
		r.logger.Info("Expense limits already exist, skipping initialization")
		return nil
	}

	// デフォルト値で初期化
	now := time.Now()
	limits := []model.ExpenseLimit{
		{
			LimitType:     model.LimitTypeMonthly,
			Amount:        50000, // 月次5万円
			EffectiveFrom: now,
			CreatedBy:     createdBy.String(),
		},
		{
			LimitType:     model.LimitTypeYearly,
			Amount:        200000, // 年次20万円
			EffectiveFrom: now,
			CreatedBy:     createdBy.String(),
		},
	}

	// トランザクション内で作成
	err = r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, limit := range limits {
			if err := tx.Create(&limit).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		r.logger.Error("Failed to initialize default expense limits",
			zap.Error(err),
			zap.String("created_by", createdBy.String()))
		return err
	}

	r.logger.Info("Default expense limits initialized successfully",
		zap.String("created_by", createdBy.String()))
	return nil
}

// UpdateLimitAmount 上限金額を更新（新しいレコードを作成）
func (r *ExpenseLimitRepositoryImpl) UpdateLimitAmount(ctx context.Context, limitType model.LimitType, newAmount int, createdBy uuid.UUID) error {
	// 新しい上限レコードを作成（履歴として保持）
	newLimit := model.ExpenseLimit{
		LimitType:     limitType,
		Amount:        newAmount,
		EffectiveFrom: time.Now(),
		CreatedBy:     createdBy.String(),
	}

	if err := r.Create(ctx, &newLimit); err != nil {
		return fmt.Errorf("failed to update limit amount: %w", err)
	}

	r.logger.Info("Expense limit amount updated",
		zap.String("limit_type", string(limitType)),
		zap.Int("new_amount", newAmount),
		zap.String("created_by", createdBy.String()))
	return nil
}

// SetEffectiveDate 有効開始日を設定
func (r *ExpenseLimitRepositoryImpl) SetEffectiveDate(ctx context.Context, id uuid.UUID, effectiveFrom time.Time) error {
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseLimit{}).
		Where("id = ?", id).
		Update("effective_from", effectiveFrom).Error

	if err != nil {
		r.logger.Error("Failed to set effective date",
			zap.Error(err),
			zap.String("limit_id", id.String()),
			zap.Time("effective_from", effectiveFrom))
		return err
	}

	r.logger.Info("Effective date updated successfully",
		zap.String("limit_id", id.String()),
		zap.Time("effective_from", effectiveFrom))
	return nil
}

// ========================================
// ユーティリティ
// ========================================

// ExistsByID 上限IDが存在するかチェック
func (r *ExpenseLimitRepositoryImpl) ExistsByID(ctx context.Context, id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseLimit{}).
		Where("id = ?", id).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check expense limit existence by ID",
			zap.Error(err),
			zap.String("limit_id", id.String()))
		return false, err
	}

	return count > 0, nil
}

// CountByType タイプ別の上限設定数を取得
func (r *ExpenseLimitRepositoryImpl) CountByType(ctx context.Context, limitType model.LimitType) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseLimit{}).
		Where("limit_type = ?", limitType).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to count expense limits by type",
			zap.Error(err),
			zap.String("limit_type", string(limitType)))
		return 0, err
	}

	return count, nil
}

// CreateLimit 新しい経費申請上限を作成（履歴として保持）
func (r *ExpenseLimitRepositoryImpl) CreateLimit(ctx context.Context, limit *model.ExpenseLimit) error {
	r.logger.Info("経費申請上限作成開始",
		zap.String("limit_id", limit.ID.String()),
		zap.String("limit_type", string(limit.LimitType)),
		zap.Int("amount", limit.Amount))

	// データベースに保存
	err := r.db.WithContext(ctx).Create(limit).Error
	if err != nil {
		r.logger.Error("Failed to create expense limit",
			zap.Error(err),
			zap.String("limit_id", limit.ID.String()),
			zap.String("limit_type", string(limit.LimitType)),
			zap.Int("amount", limit.Amount))
		return err
	}

	r.logger.Info("経費申請上限作成成功",
		zap.String("limit_id", limit.ID.String()),
		zap.String("limit_type", string(limit.LimitType)),
		zap.Int("amount", limit.Amount))

	return nil
}

// ========================================
// スコープ対応の新機能
// ========================================

// GetLimitsWithScope スコープ対応の上限一覧を取得
func (r *ExpenseLimitRepositoryImpl) GetLimitsWithScope(ctx context.Context, filter *dto.ExpenseLimitListRequest) ([]model.ExpenseLimit, int64, error) {
	// ページネーションのデフォルト値設定
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	// ベースクエリの構築
	query := r.db.WithContext(ctx).Model(&model.ExpenseLimit{})

	// フィルター適用
	if filter.LimitType != nil {
		query = query.Where("limit_type = ?", *filter.LimitType)
	}
	if filter.LimitScope != nil {
		query = query.Where("limit_scope = ?", *filter.LimitScope)
	}
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.DepartmentID != nil {
		query = query.Where("department_id = ?", *filter.DepartmentID)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count expense limits with scope", zap.Error(err))
		return nil, 0, err
	}

	// データを取得（リレーションも含める）
	var limits []model.ExpenseLimit
	err := query.
		Preload("Creator").
		Preload("User").
		Order("effective_from DESC").
		Offset(offset).
		Limit(limit).
		Find(&limits).Error

	if err != nil {
		r.logger.Error("Failed to get expense limits with scope", zap.Error(err))
		return nil, 0, err
	}

	return limits, total, nil
}

// GetEffectiveLimitsForUser 指定されたユーザーに適用される有効な制限を取得
func (r *ExpenseLimitRepositoryImpl) GetEffectiveLimitsForUser(ctx context.Context, userID string, departmentID *uuid.UUID, limitType model.LimitType, targetDate time.Time) (*model.ExpenseLimit, error) {
	// 適用可能な制限を取得（個人 > 部門 > 全社の優先順）
	var limits []model.ExpenseLimit
	query := r.db.WithContext(ctx).
		Where("limit_type = ? AND effective_from <= ?", limitType, targetDate)

	// 条件に基づいて制限を取得
	whereClause := "(limit_scope = ? AND user_id = ?) OR (limit_scope = ?"
	args := []interface{}{model.LimitScopeUser, userID, model.LimitScopeDepartment}

	if departmentID != nil {
		whereClause += " AND department_id = ?"
		args = append(args, *departmentID)
	} else {
		whereClause += " AND department_id IS NULL"
	}

	whereClause += ") OR limit_scope = ?"
	args = append(args, model.LimitScopeCompany)

	err := query.Where(whereClause, args...).
		Order("effective_from DESC").
		Find(&limits).Error

	if err != nil {
		r.logger.Error("Failed to get effective limits for user",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.String("limit_type", string(limitType)))
		return nil, err
	}

	// 最も制限の厳しい（金額の少ない）制限を選択
	var effectiveLimit *model.ExpenseLimit
	for _, limit := range limits {
		if limit.IsApplicableTo(userID, departmentID) {
			if effectiveLimit == nil || limit.Amount < effectiveLimit.Amount {
				effectiveLimit = &limit
			}
		}
	}

	if effectiveLimit == nil {
		return nil, gorm.ErrRecordNotFound
	}

	return effectiveLimit, nil
}

// CheckLimitsForUser 指定されたユーザーの上限チェック（スコープ対応）
func (r *ExpenseLimitRepositoryImpl) CheckLimitsForUser(ctx context.Context, userID string, departmentID *uuid.UUID, amount int, targetDate time.Time) (*dto.LimitCheckResult, error) {
	result := &dto.LimitCheckResult{
		WithinMonthlyLimit: true,
		WithinYearlyLimit:  true,
		RemainingMonthly:   0,
		RemainingYearly:    0,
	}

	// 月次制限チェック
	monthlyLimit, err := r.GetEffectiveLimitsForUser(ctx, userID, departmentID, model.LimitTypeMonthly, targetDate)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	if monthlyLimit != nil {
		// 当月の使用額を計算
		startOfMonth := time.Date(targetDate.Year(), targetDate.Month(), 1, 0, 0, 0, 0, targetDate.Location())
		endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond)

		var currentMonthlyTotal int64
		err = r.db.WithContext(ctx).
			Table("expenses").
			Select("COALESCE(SUM(amount), 0)").
			Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfMonth, endOfMonth).
			Where("status IN ?", []string{"draft", "submitted", "approved"}).
			Scan(&currentMonthlyTotal).Error

		if err != nil {
			return nil, err
		}

		totalWithNew := int(currentMonthlyTotal) + amount
		result.WithinMonthlyLimit = totalWithNew <= monthlyLimit.Amount
		result.RemainingMonthly = monthlyLimit.Amount - int(currentMonthlyTotal)
	}

	// 年次制限チェック
	yearlyLimit, err := r.GetEffectiveLimitsForUser(ctx, userID, departmentID, model.LimitTypeYearly, targetDate)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	if yearlyLimit != nil {
		// 当年の使用額を計算
		startOfYear := time.Date(targetDate.Year(), 1, 1, 0, 0, 0, 0, targetDate.Location())
		endOfYear := time.Date(targetDate.Year(), 12, 31, 23, 59, 59, 999999999, targetDate.Location())

		var currentYearlyTotal int64
		err = r.db.WithContext(ctx).
			Table("expenses").
			Select("COALESCE(SUM(amount), 0)").
			Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfYear, endOfYear).
			Where("status IN ?", []string{"draft", "submitted", "approved"}).
			Scan(&currentYearlyTotal).Error

		if err != nil {
			return nil, err
		}

		totalWithNew := int(currentYearlyTotal) + amount
		result.WithinYearlyLimit = totalWithNew <= yearlyLimit.Amount
		result.RemainingYearly = yearlyLimit.Amount - int(currentYearlyTotal)
	}

	return result, nil
}

// CreateWithScope スコープ対応の上限作成
func (r *ExpenseLimitRepositoryImpl) CreateWithScope(ctx context.Context, limit *model.ExpenseLimit) error {
	// バリデーション
	if err := r.validateLimitScope(limit); err != nil {
		return err
	}

	if err := r.db.WithContext(ctx).Create(limit).Error; err != nil {
		r.logger.Error("Failed to create expense limit with scope",
			zap.Error(err),
			zap.String("limit_type", string(limit.LimitType)),
			zap.String("limit_scope", string(limit.LimitScope)),
			zap.Int("amount", limit.Amount))
		return err
	}

	r.logger.Info("Expense limit created successfully with scope",
		zap.String("limit_id", limit.ID.String()),
		zap.String("limit_type", string(limit.LimitType)),
		zap.String("limit_scope", string(limit.LimitScope)),
		zap.Int("amount", limit.Amount))
	return nil
}

// UpdateWithScope スコープ対応の上限更新
func (r *ExpenseLimitRepositoryImpl) UpdateWithScope(ctx context.Context, limit *model.ExpenseLimit) error {
	// バリデーション
	if err := r.validateLimitScope(limit); err != nil {
		return err
	}

	err := r.db.WithContext(ctx).Save(limit).Error
	if err != nil {
		r.logger.Error("Failed to update expense limit with scope",
			zap.Error(err),
			zap.String("limit_id", limit.ID.String()))
		return err
	}

	r.logger.Info("Expense limit updated successfully with scope",
		zap.String("limit_id", limit.ID.String()),
		zap.String("limit_type", string(limit.LimitType)),
		zap.String("limit_scope", string(limit.LimitScope)))
	return nil
}

// DeleteWithScope スコープ対応の上限削除
func (r *ExpenseLimitRepositoryImpl) DeleteWithScope(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&model.ExpenseLimit{}, id)
	if result.Error != nil {
		r.logger.Error("Failed to delete expense limit with scope",
			zap.Error(result.Error),
			zap.String("limit_id", id.String()))
		return result.Error
	}

	if result.RowsAffected == 0 {
		r.logger.Warn("Expense limit not found for deletion",
			zap.String("limit_id", id.String()))
		return gorm.ErrRecordNotFound
	}

	r.logger.Info("Expense limit deleted successfully with scope",
		zap.String("limit_id", id.String()))
	return nil
}

// validateLimitScope 上限スコープのバリデーション
func (r *ExpenseLimitRepositoryImpl) validateLimitScope(limit *model.ExpenseLimit) error {
	switch limit.LimitScope {
	case model.LimitScopeUser:
		if limit.UserID == nil {
			return fmt.Errorf("個人制限の場合、ユーザーIDは必須です")
		}
		if limit.DepartmentID != nil {
			return fmt.Errorf("個人制限の場合、部門IDは指定できません")
		}
	case model.LimitScopeDepartment:
		if limit.DepartmentID == nil {
			return fmt.Errorf("部門制限の場合、部門IDは必須です")
		}
		if limit.UserID != nil {
			return fmt.Errorf("部門制限の場合、ユーザーIDは指定できません")
		}
	case model.LimitScopeCompany:
		if limit.UserID != nil || limit.DepartmentID != nil {
			return fmt.Errorf("全社制限の場合、ユーザーIDと部門IDは指定できません")
		}
	default:
		return fmt.Errorf("無効な制限スコープです: %s", limit.LimitScope)
	}
	return nil
}

// GetLimitHistoryWithScope スコープ対応の上限履歴を取得
func (r *ExpenseLimitRepositoryImpl) GetLimitHistoryWithScope(ctx context.Context, filter *dto.ExpenseLimitHistoryRequest) ([]model.ExpenseLimit, int64, error) {
	// ページネーションのデフォルト値設定
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// ベースクエリの構築
	query := r.db.WithContext(ctx).Model(&model.ExpenseLimit{})

	// フィルター適用
	if filter.LimitType != nil {
		query = query.Where("limit_type = ?", *filter.LimitType)
	}
	if filter.LimitScope != nil {
		query = query.Where("limit_scope = ?", *filter.LimitScope)
	}
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.DepartmentID != nil {
		query = query.Where("department_id = ?", *filter.DepartmentID)
	}
	if filter.DateFrom != nil {
		query = query.Where("effective_from >= ?", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		query = query.Where("effective_from <= ?", *filter.DateTo)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count expense limit history", zap.Error(err))
		return nil, 0, err
	}

	// ソート設定
	sortBy := "effective_from"
	if filter.SortBy != "" {
		sortBy = filter.SortBy
	}
	sortOrder := "DESC"
	if filter.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	// データを取得（リレーションも含める）
	var limits []model.ExpenseLimit
	err := query.
		Preload("Creator").
		Preload("User").
		Order(fmt.Sprintf("%s %s", sortBy, sortOrder)).
		Offset(offset).
		Limit(limit).
		Find(&limits).Error

	if err != nil {
		r.logger.Error("Failed to get expense limit history with scope", zap.Error(err))
		return nil, 0, err
	}

	r.logger.Info("経費申請上限履歴取得成功",
		zap.Int64("total", total),
		zap.Int("page", page),
		zap.Int("limit", limit))

	return limits, total, nil
}
