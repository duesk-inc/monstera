package repository

import (
	"context"
	"fmt"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseCategoryRepository 経費カテゴリマスタに関するデータアクセスのインターフェース
type ExpenseCategoryRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, category *model.ExpenseCategoryMaster) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.ExpenseCategoryMaster, error)
	GetByCode(ctx context.Context, code string) (*model.ExpenseCategoryMaster, error)
	Update(ctx context.Context, category *model.ExpenseCategoryMaster) error
	Delete(ctx context.Context, id uuid.UUID) error

	// 一覧・検索機能
	GetAll(ctx context.Context) ([]model.ExpenseCategoryMaster, error)
	GetActive(ctx context.Context) ([]model.ExpenseCategoryMaster, error)
	GetActiveOrderByDisplayOrder(ctx context.Context) ([]model.ExpenseCategoryMaster, error)
	GetByIDs(ctx context.Context, ids []uuid.UUID) ([]model.ExpenseCategoryMaster, error)
	GetByCodes(ctx context.Context, codes []string) ([]model.ExpenseCategoryMaster, error)
	GetCategoriesWithFilter(ctx context.Context, filter *dto.ExpenseCategoryListRequest) ([]model.ExpenseCategoryMaster, int64, error)

	// 表示順序管理
	UpdateDisplayOrder(ctx context.Context, id uuid.UUID, newOrder int) error
	ReorderCategories(ctx context.Context, categoryOrders map[uuid.UUID]int) error
	GetMaxDisplayOrder(ctx context.Context) (int, error)

	// 有効性管理
	SetActive(ctx context.Context, id uuid.UUID, isActive bool) error
	ActivateByCode(ctx context.Context, code string) error
	DeactivateByCode(ctx context.Context, code string) error

	// バルク操作
	CreateBatch(ctx context.Context, categories []model.ExpenseCategoryMaster) error
	BulkUpdateActive(ctx context.Context, ids []uuid.UUID, isActive bool) error

	// 検証・チェック
	ExistsByID(ctx context.Context, id uuid.UUID) (bool, error)
	ExistsByCode(ctx context.Context, code string) (bool, error)
	IsCodeUnique(ctx context.Context, code string, excludeID *uuid.UUID) (bool, error)
	CountActive(ctx context.Context) (int64, error)

	// 初期化
	InitializeDefaultCategories(ctx context.Context) error
	ResetToDefaults(ctx context.Context) error

	// ユーティリティ
	SetLogger(logger *zap.Logger)
}

// ExpenseCategoryRepositoryImpl 経費カテゴリマスタに関するデータアクセスの実装
type ExpenseCategoryRepositoryImpl struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewExpenseCategoryRepository ExpenseCategoryRepositoryのインスタンスを生成する
func NewExpenseCategoryRepository(db *gorm.DB, logger *zap.Logger) ExpenseCategoryRepository {
	return &ExpenseCategoryRepositoryImpl{
		db:     db,
		logger: logger,
	}
}

// SetLogger ロガーを設定
func (r *ExpenseCategoryRepositoryImpl) SetLogger(logger *zap.Logger) {
	r.logger = logger
}

// ========================================
// 基本CRUD操作
// ========================================

// Create 新しいカテゴリを作成
func (r *ExpenseCategoryRepositoryImpl) Create(ctx context.Context, category *model.ExpenseCategoryMaster) error {
	if err := r.db.WithContext(ctx).Create(category).Error; err != nil {
		r.logger.Error("Failed to create expense category",
			zap.Error(err),
			zap.String("code", category.Code),
			zap.String("name", category.Name))
		return err
	}

	r.logger.Info("Expense category created successfully",
		zap.String("category_id", category.ID.String()),
		zap.String("code", category.Code),
		zap.String("name", category.Name))
	return nil
}

// GetByID カテゴリIDで単一レコードを取得
func (r *ExpenseCategoryRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*model.ExpenseCategoryMaster, error) {
	var category model.ExpenseCategoryMaster
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&category).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Expense category not found", zap.String("category_id", id.String()))
			return nil, err
		}
		r.logger.Error("Failed to get expense category by ID",
			zap.Error(err),
			zap.String("category_id", id.String()))
		return nil, err
	}

	return &category, nil
}

// GetByCode カテゴリコードで単一レコードを取得
func (r *ExpenseCategoryRepositoryImpl) GetByCode(ctx context.Context, code string) (*model.ExpenseCategoryMaster, error) {
	var category model.ExpenseCategoryMaster
	err := r.db.WithContext(ctx).
		Where("code = ?", code).
		First(&category).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Expense category not found", zap.String("code", code))
			return nil, err
		}
		r.logger.Error("Failed to get expense category by code",
			zap.Error(err),
			zap.String("code", code))
		return nil, err
	}

	return &category, nil
}

// Update カテゴリを更新
func (r *ExpenseCategoryRepositoryImpl) Update(ctx context.Context, category *model.ExpenseCategoryMaster) error {
	err := r.db.WithContext(ctx).Save(category).Error
	if err != nil {
		r.logger.Error("Failed to update expense category",
			zap.Error(err),
			zap.String("category_id", category.ID.String()))
		return err
	}

	r.logger.Info("Expense category updated successfully",
		zap.String("category_id", category.ID.String()),
		zap.String("code", category.Code))
	return nil
}

// Delete カテゴリを削除（論理削除）
func (r *ExpenseCategoryRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	err := r.db.WithContext(ctx).Delete(&model.ExpenseCategoryMaster{}, id).Error
	if err != nil {
		r.logger.Error("Failed to delete expense category",
			zap.Error(err),
			zap.String("category_id", id.String()))
		return err
	}

	r.logger.Info("Expense category deleted successfully",
		zap.String("category_id", id.String()))
	return nil
}

// ========================================
// 一覧・検索機能
// ========================================

// GetAll 全カテゴリを取得（削除済み含まない）
func (r *ExpenseCategoryRepositoryImpl) GetAll(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	var categories []model.ExpenseCategoryMaster
	err := r.db.WithContext(ctx).
		Order("display_order ASC").
		Find(&categories).Error

	if err != nil {
		r.logger.Error("Failed to get all expense categories", zap.Error(err))
		return nil, err
	}

	return categories, nil
}

// GetActive 有効なカテゴリのみを取得
func (r *ExpenseCategoryRepositoryImpl) GetActive(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	var categories []model.ExpenseCategoryMaster
	err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("display_order ASC").
		Find(&categories).Error

	if err != nil {
		r.logger.Error("Failed to get active expense categories", zap.Error(err))
		return nil, err
	}

	return categories, nil
}

// GetActiveOrderByDisplayOrder 有効なカテゴリを表示順で取得
func (r *ExpenseCategoryRepositoryImpl) GetActiveOrderByDisplayOrder(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	return r.GetActive(ctx) // GetActiveが既に表示順でソートしている
}

// GetByIDs 複数のカテゴリIDで取得
func (r *ExpenseCategoryRepositoryImpl) GetByIDs(ctx context.Context, ids []uuid.UUID) ([]model.ExpenseCategoryMaster, error) {
	if len(ids) == 0 {
		return []model.ExpenseCategoryMaster{}, nil
	}

	var categories []model.ExpenseCategoryMaster
	err := r.db.WithContext(ctx).
		Where("id IN ?", ids).
		Order("display_order ASC").
		Find(&categories).Error

	if err != nil {
		r.logger.Error("Failed to get expense categories by IDs",
			zap.Error(err),
			zap.Int("id_count", len(ids)))
		return nil, err
	}

	return categories, nil
}

// GetByCodes 複数のカテゴリコードで取得
func (r *ExpenseCategoryRepositoryImpl) GetByCodes(ctx context.Context, codes []string) ([]model.ExpenseCategoryMaster, error) {
	if len(codes) == 0 {
		return []model.ExpenseCategoryMaster{}, nil
	}

	var categories []model.ExpenseCategoryMaster
	err := r.db.WithContext(ctx).
		Where("code IN ?", codes).
		Order("display_order ASC").
		Find(&categories).Error

	if err != nil {
		r.logger.Error("Failed to get expense categories by codes",
			zap.Error(err),
			zap.Int("code_count", len(codes)))
		return nil, err
	}

	return categories, nil
}

// ========================================
// 表示順序管理
// ========================================

// UpdateDisplayOrder 表示順序を更新
func (r *ExpenseCategoryRepositoryImpl) UpdateDisplayOrder(ctx context.Context, id uuid.UUID, newOrder int) error {
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Where("id = ?", id).
		Update("display_order", newOrder).Error

	if err != nil {
		r.logger.Error("Failed to update display order",
			zap.Error(err),
			zap.String("category_id", id.String()),
			zap.Int("new_order", newOrder))
		return err
	}

	r.logger.Info("Display order updated successfully",
		zap.String("category_id", id.String()),
		zap.Int("new_order", newOrder))
	return nil
}

// ReorderCategories 複数カテゴリの表示順序を一括更新
func (r *ExpenseCategoryRepositoryImpl) ReorderCategories(ctx context.Context, categoryOrders map[uuid.UUID]int) error {
	if len(categoryOrders) == 0 {
		return nil
	}

	// トランザクション内で処理
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for categoryID, order := range categoryOrders {
			if err := tx.Model(&model.ExpenseCategoryMaster{}).
				Where("id = ?", categoryID).
				Update("display_order", order).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		r.logger.Error("Failed to reorder categories",
			zap.Error(err),
			zap.Int("category_count", len(categoryOrders)))
		return err
	}

	r.logger.Info("Categories reordered successfully",
		zap.Int("category_count", len(categoryOrders)))
	return nil
}

// GetMaxDisplayOrder 最大表示順序を取得
func (r *ExpenseCategoryRepositoryImpl) GetMaxDisplayOrder(ctx context.Context) (int, error) {
	var maxOrder int
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Select("COALESCE(MAX(display_order), 0)").
		Scan(&maxOrder).Error

	if err != nil {
		r.logger.Error("Failed to get max display order", zap.Error(err))
		return 0, err
	}

	return maxOrder, nil
}

// ========================================
// 有効性管理
// ========================================

// SetActive カテゴリの有効/無効を設定
func (r *ExpenseCategoryRepositoryImpl) SetActive(ctx context.Context, id uuid.UUID, isActive bool) error {
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Where("id = ?", id).
		Update("is_active", isActive).Error

	if err != nil {
		r.logger.Error("Failed to set category active status",
			zap.Error(err),
			zap.String("category_id", id.String()),
			zap.Bool("is_active", isActive))
		return err
	}

	r.logger.Info("Category active status updated",
		zap.String("category_id", id.String()),
		zap.Bool("is_active", isActive))
	return nil
}

// ActivateByCode カテゴリコードで有効化
func (r *ExpenseCategoryRepositoryImpl) ActivateByCode(ctx context.Context, code string) error {
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Where("code = ?", code).
		Update("is_active", true).Error

	if err != nil {
		r.logger.Error("Failed to activate category by code",
			zap.Error(err),
			zap.String("code", code))
		return err
	}

	r.logger.Info("Category activated by code",
		zap.String("code", code))
	return nil
}

// DeactivateByCode カテゴリコードで無効化
func (r *ExpenseCategoryRepositoryImpl) DeactivateByCode(ctx context.Context, code string) error {
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Where("code = ?", code).
		Update("is_active", false).Error

	if err != nil {
		r.logger.Error("Failed to deactivate category by code",
			zap.Error(err),
			zap.String("code", code))
		return err
	}

	r.logger.Info("Category deactivated by code",
		zap.String("code", code))
	return nil
}

// ========================================
// バルク操作
// ========================================

// CreateBatch 複数のカテゴリを一括作成
func (r *ExpenseCategoryRepositoryImpl) CreateBatch(ctx context.Context, categories []model.ExpenseCategoryMaster) error {
	if len(categories) == 0 {
		return nil
	}

	if err := r.db.WithContext(ctx).CreateInBatches(categories, 100).Error; err != nil {
		r.logger.Error("Failed to create categories in batch",
			zap.Error(err),
			zap.Int("count", len(categories)))
		return err
	}

	r.logger.Info("Categories created successfully in batch",
		zap.Int("count", len(categories)))
	return nil
}

// BulkUpdateActive 複数カテゴリの有効/無効を一括更新
func (r *ExpenseCategoryRepositoryImpl) BulkUpdateActive(ctx context.Context, ids []uuid.UUID, isActive bool) error {
	if len(ids) == 0 {
		return nil
	}

	err := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Where("id IN ?", ids).
		Update("is_active", isActive).Error

	if err != nil {
		r.logger.Error("Failed to bulk update active status",
			zap.Error(err),
			zap.Int("id_count", len(ids)),
			zap.Bool("is_active", isActive))
		return err
	}

	r.logger.Info("Bulk active status updated successfully",
		zap.Int("id_count", len(ids)),
		zap.Bool("is_active", isActive))
	return nil
}

// ========================================
// 検証・チェック
// ========================================

// ExistsByID カテゴリIDが存在するかチェック
func (r *ExpenseCategoryRepositoryImpl) ExistsByID(ctx context.Context, id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Where("id = ?", id).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check category existence by ID",
			zap.Error(err),
			zap.String("category_id", id.String()))
		return false, err
	}

	return count > 0, nil
}

// ExistsByCode カテゴリコードが存在するかチェック
func (r *ExpenseCategoryRepositoryImpl) ExistsByCode(ctx context.Context, code string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Where("code = ?", code).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check category existence by code",
			zap.Error(err),
			zap.String("code", code))
		return false, err
	}

	return count > 0, nil
}

// IsCodeUnique カテゴリコードがユニークかチェック
func (r *ExpenseCategoryRepositoryImpl) IsCodeUnique(ctx context.Context, code string, excludeID *uuid.UUID) (bool, error) {
	query := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Where("code = ?", code)

	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}

	var count int64
	err := query.Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check code uniqueness",
			zap.Error(err),
			zap.String("code", code))
		return false, err
	}

	return count == 0, nil
}

// CountActive 有効なカテゴリ数を取得
func (r *ExpenseCategoryRepositoryImpl) CountActive(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseCategoryMaster{}).
		Where("is_active = ?", true).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to count active categories", zap.Error(err))
		return 0, err
	}

	return count, nil
}

// ========================================
// 初期化
// ========================================

// InitializeDefaultCategories デフォルトカテゴリを初期化
func (r *ExpenseCategoryRepositoryImpl) InitializeDefaultCategories(ctx context.Context) error {
	// 既にカテゴリが存在する場合はスキップ
	count, err := r.CountActive(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		r.logger.Info("Categories already exist, skipping initialization",
			zap.Int64("count", count))
		return nil
	}

	// デフォルトカテゴリを取得
	defaultCategories := model.GetDefaultCategories()

	// バッチ作成
	if err := r.CreateBatch(ctx, defaultCategories); err != nil {
		r.logger.Error("Failed to initialize default categories", zap.Error(err))
		return err
	}

	r.logger.Info("Default categories initialized successfully",
		zap.Int("count", len(defaultCategories)))
	return nil
}

// ResetToDefaults デフォルトカテゴリにリセット
func (r *ExpenseCategoryRepositoryImpl) ResetToDefaults(ctx context.Context) error {
	// トランザクション内で処理
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 既存のカテゴリを全て削除（物理削除）
		if err := tx.Unscoped().Where("1 = 1").Delete(&model.ExpenseCategoryMaster{}).Error; err != nil {
			return err
		}

		// デフォルトカテゴリを作成
		defaultCategories := model.GetDefaultCategories()
		if err := tx.CreateInBatches(defaultCategories, 100).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		r.logger.Error("Failed to reset to default categories", zap.Error(err))
		return err
	}

	r.logger.Info("Categories reset to defaults successfully")
	return nil
}

// GetCategoriesWithFilter フィルター機能付きのカテゴリ一覧を取得
func (r *ExpenseCategoryRepositoryImpl) GetCategoriesWithFilter(ctx context.Context, filter *dto.ExpenseCategoryListRequest) ([]model.ExpenseCategoryMaster, int64, error) {
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
	query := r.db.WithContext(ctx).Model(&model.ExpenseCategoryMaster{})

	// フィルター適用
	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}
	if filter.Code != nil && *filter.Code != "" {
		query = query.Where("code LIKE ?", "%"+*filter.Code+"%")
	}
	if filter.Name != nil && *filter.Name != "" {
		query = query.Where("name LIKE ?", "%"+*filter.Name+"%")
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count expense categories with filter", zap.Error(err))
		return nil, 0, err
	}

	// ソート設定
	sortBy := "display_order"
	if filter.SortBy != "" {
		sortBy = filter.SortBy
	}
	sortOrder := "ASC"
	if filter.SortOrder == "desc" {
		sortOrder = "DESC"
	}

	// データを取得
	var categories []model.ExpenseCategoryMaster
	err := query.
		Order(fmt.Sprintf("%s %s", sortBy, sortOrder)).
		Offset(offset).
		Limit(limit).
		Find(&categories).Error

	if err != nil {
		r.logger.Error("Failed to get expense categories with filter", zap.Error(err))
		return nil, 0, err
	}

	r.logger.Info("経費カテゴリフィルター取得成功",
		zap.Int64("total", total),
		zap.Int("page", page),
		zap.Int("limit", limit))

	return categories, total, nil
}
