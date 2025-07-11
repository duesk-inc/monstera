package repository

import (
	"context"
	"errors"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseReceiptRepository 経費領収書リポジトリのインターフェース
type ExpenseReceiptRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, receipt *model.ExpenseReceipt) error
	CreateBatch(ctx context.Context, receipts []*model.ExpenseReceipt) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.ExpenseReceipt, error)
	GetByExpenseID(ctx context.Context, expenseID uuid.UUID) ([]*model.ExpenseReceipt, error)
	Update(ctx context.Context, receipt *model.ExpenseReceipt) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByExpenseID(ctx context.Context, expenseID uuid.UUID) error

	// 表示順序関連
	UpdateDisplayOrder(ctx context.Context, id uuid.UUID, displayOrder int) error
	GetMaxDisplayOrder(ctx context.Context, expenseID uuid.UUID) (int, error)
}

// expenseReceiptRepository 経費領収書リポジトリの実装
type expenseReceiptRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewExpenseReceiptRepository 経費領収書リポジトリのインスタンスを生成
func NewExpenseReceiptRepository(db *gorm.DB, logger *zap.Logger) ExpenseReceiptRepository {
	return &expenseReceiptRepository{
		db:     db,
		logger: logger,
	}
}

// Create 領収書を作成
func (r *expenseReceiptRepository) Create(ctx context.Context, receipt *model.ExpenseReceipt) error {
	if err := r.db.WithContext(ctx).Create(receipt).Error; err != nil {
		r.logger.Error("Failed to create expense receipt",
			zap.Error(err),
			zap.String("expense_id", receipt.ExpenseID.String()),
		)
		return err
	}
	return nil
}

// CreateBatch 複数の領収書を一括作成
func (r *expenseReceiptRepository) CreateBatch(ctx context.Context, receipts []*model.ExpenseReceipt) error {
	if len(receipts) == 0 {
		return nil
	}

	if err := r.db.WithContext(ctx).CreateInBatches(receipts, 100).Error; err != nil {
		r.logger.Error("Failed to create expense receipts in batch",
			zap.Error(err),
			zap.Int("count", len(receipts)),
		)
		return err
	}
	return nil
}

// GetByID IDから領収書を取得
func (r *expenseReceiptRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ExpenseReceipt, error) {
	var receipt model.ExpenseReceipt
	if err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&receipt).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		r.logger.Error("Failed to get expense receipt by ID",
			zap.Error(err),
			zap.String("id", id.String()),
		)
		return nil, err
	}
	return &receipt, nil
}

// GetByExpenseID 経費申請IDから領収書一覧を取得
func (r *expenseReceiptRepository) GetByExpenseID(ctx context.Context, expenseID uuid.UUID) ([]*model.ExpenseReceipt, error) {
	var receipts []*model.ExpenseReceipt
	if err := r.db.WithContext(ctx).
		Where("expense_id = ?", expenseID).
		Order("display_order ASC, created_at ASC").
		Find(&receipts).Error; err != nil {
		r.logger.Error("Failed to get expense receipts by expense ID",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()),
		)
		return nil, err
	}
	return receipts, nil
}

// Update 領収書を更新
func (r *expenseReceiptRepository) Update(ctx context.Context, receipt *model.ExpenseReceipt) error {
	result := r.db.WithContext(ctx).
		Model(&model.ExpenseReceipt{}).
		Where("id = ?", receipt.ID).
		Updates(receipt)

	if result.Error != nil {
		r.logger.Error("Failed to update expense receipt",
			zap.Error(result.Error),
			zap.String("id", receipt.ID.String()),
		)
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// Delete 領収書を削除
func (r *expenseReceiptRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&model.ExpenseReceipt{})

	if result.Error != nil {
		r.logger.Error("Failed to delete expense receipt",
			zap.Error(result.Error),
			zap.String("id", id.String()),
		)
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// DeleteByExpenseID 経費申請IDから領収書を全て削除
func (r *expenseReceiptRepository) DeleteByExpenseID(ctx context.Context, expenseID uuid.UUID) error {
	if err := r.db.WithContext(ctx).
		Where("expense_id = ?", expenseID).
		Delete(&model.ExpenseReceipt{}).Error; err != nil {
		r.logger.Error("Failed to delete expense receipts by expense ID",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()),
		)
		return err
	}
	return nil
}

// UpdateDisplayOrder 表示順序を更新
func (r *expenseReceiptRepository) UpdateDisplayOrder(ctx context.Context, id uuid.UUID, displayOrder int) error {
	result := r.db.WithContext(ctx).
		Model(&model.ExpenseReceipt{}).
		Where("id = ?", id).
		Update("display_order", displayOrder)

	if result.Error != nil {
		r.logger.Error("Failed to update expense receipt display order",
			zap.Error(result.Error),
			zap.String("id", id.String()),
			zap.Int("display_order", displayOrder),
		)
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// GetMaxDisplayOrder 経費申請の最大表示順序を取得
func (r *expenseReceiptRepository) GetMaxDisplayOrder(ctx context.Context, expenseID uuid.UUID) (int, error) {
	var maxOrder int
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseReceipt{}).
		Where("expense_id = ?", expenseID).
		Select("COALESCE(MAX(display_order), 0)").
		Scan(&maxOrder).Error

	if err != nil {
		r.logger.Error("Failed to get max display order",
			zap.Error(err),
			zap.String("expense_id", expenseID.String()),
		)
		return 0, err
	}

	return maxOrder, nil
}
