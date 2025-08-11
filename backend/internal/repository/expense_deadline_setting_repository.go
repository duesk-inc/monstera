package repository

import (
	"context"
	"fmt"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseDeadlineSettingRepository 経費申請期限設定リポジトリインターフェース
type ExpenseDeadlineSettingRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, setting *model.ExpenseDeadlineSetting) error
	GetByID(ctx context.Context, id string) (*model.ExpenseDeadlineSetting, error)
	Update(ctx context.Context, setting *model.ExpenseDeadlineSetting) error
	Delete(ctx context.Context, id string) error

	// スコープ別取得
	GetByScope(ctx context.Context, scope string, scopeID *string) (*model.ExpenseDeadlineSetting, error)
	GetGlobalSetting(ctx context.Context) (*model.ExpenseDeadlineSetting, error)
	GetDepartmentSetting(ctx context.Context, departmentID string) (*model.ExpenseDeadlineSetting, error)
	GetUserSetting(ctx context.Context, userID string) (*model.ExpenseDeadlineSetting, error)

	// 有効な設定を取得（優先順位: ユーザー > 部門 > グローバル）
	GetEffectiveSetting(ctx context.Context, userID string, departmentID *string) (*model.ExpenseDeadlineSetting, error)

	// 一覧取得
	List(ctx context.Context) ([]*model.ExpenseDeadlineSetting, error)
}

// expenseDeadlineSettingRepository 経費申請期限設定リポジトリ実装
type expenseDeadlineSettingRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewExpenseDeadlineSettingRepository 期限設定リポジトリのインスタンスを生成
func NewExpenseDeadlineSettingRepository(db *gorm.DB, logger *zap.Logger) ExpenseDeadlineSettingRepository {
	return &expenseDeadlineSettingRepository{
		db:     db,
		logger: logger,
	}
}

// Create 新しい期限設定を作成
func (r *expenseDeadlineSettingRepository) Create(ctx context.Context, setting *model.ExpenseDeadlineSetting) error {
	if err := r.db.WithContext(ctx).Create(setting).Error; err != nil {
		r.logger.Error("Failed to create expense deadline setting",
			zap.Error(err),
			zap.String("scope", setting.Scope))
		return err
	}
	return nil
}

// GetByID IDで期限設定を取得
func (r *expenseDeadlineSettingRepository) GetByID(ctx context.Context, id string) (*model.ExpenseDeadlineSetting, error) {
	var setting model.ExpenseDeadlineSetting
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&setting).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get expense deadline setting by ID",
			zap.Error(err),
			zap.String("id", id))
		return nil, err
	}
	return &setting, nil
}

// Update 期限設定を更新
func (r *expenseDeadlineSettingRepository) Update(ctx context.Context, setting *model.ExpenseDeadlineSetting) error {
	err := r.db.WithContext(ctx).Save(setting).Error
	if err != nil {
		r.logger.Error("Failed to update expense deadline setting",
			zap.Error(err),
			zap.String("id", setting.ID))
		return err
	}
	return nil
}

// Delete 期限設定を削除
func (r *expenseDeadlineSettingRepository) Delete(ctx context.Context, id string) error {
	err := r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.ExpenseDeadlineSetting{}).Error
	if err != nil {
		r.logger.Error("Failed to delete expense deadline setting",
			zap.Error(err),
			zap.String("id", id))
		return err
	}
	return nil
}

// GetByScope スコープで期限設定を取得
func (r *expenseDeadlineSettingRepository) GetByScope(ctx context.Context, scope string, scopeID *string) (*model.ExpenseDeadlineSetting, error) {
	var setting model.ExpenseDeadlineSetting
	query := r.db.WithContext(ctx).Where("scope = ?", scope)

	if scopeID != nil {
		query = query.Where("scope_id = ?", *scopeID)
	} else {
		query = query.Where("scope_id IS NULL")
	}

	err := query.First(&setting).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get expense deadline setting by scope",
			zap.Error(err),
			zap.String("scope", scope))
		return nil, err
	}
	return &setting, nil
}

// GetGlobalSetting グローバル設定を取得
func (r *expenseDeadlineSettingRepository) GetGlobalSetting(ctx context.Context) (*model.ExpenseDeadlineSetting, error) {
	return r.GetByScope(ctx, "global", nil)
}

// GetDepartmentSetting 部門設定を取得
func (r *expenseDeadlineSettingRepository) GetDepartmentSetting(ctx context.Context, departmentID string) (*model.ExpenseDeadlineSetting, error) {
	return r.GetByScope(ctx, "department", &departmentID)
}

// GetUserSetting ユーザー設定を取得
func (r *expenseDeadlineSettingRepository) GetUserSetting(ctx context.Context, userID string) (*model.ExpenseDeadlineSetting, error) {
	parsedID := userID
	// UUID validation removed after migration
	if parsedID == "" {
		return nil, fmt.Errorf("user ID cannot be empty")
	}
	return r.GetByScope(ctx, "user", &parsedID)
}

// GetEffectiveSetting 有効な設定を取得（優先順位: ユーザー > 部門 > グローバル）
func (r *expenseDeadlineSettingRepository) GetEffectiveSetting(ctx context.Context, userID string, departmentID *string) (*model.ExpenseDeadlineSetting, error) {
	// ユーザー設定を確認
	userSetting, err := r.GetUserSetting(ctx, userID)
	if err != nil {
		return nil, err
	}
	if userSetting != nil {
		return userSetting, nil
	}

	// 部門設定を確認
	if departmentID != nil {
		deptSetting, err := r.GetDepartmentSetting(ctx, *departmentID)
		if err != nil {
			return nil, err
		}
		if deptSetting != nil {
			return deptSetting, nil
		}
	}

	// グローバル設定を取得
	globalSetting, err := r.GetGlobalSetting(ctx)
	if err != nil {
		return nil, err
	}
	if globalSetting != nil {
		return globalSetting, nil
	}

	// デフォルト設定を返す
	return &model.ExpenseDeadlineSetting{
		Scope:               "global",
		DefaultDeadlineDays: 30,
		ReminderDaysBefore:  3,
		AutoExpireEnabled:   true,
	}, nil
}

// List 全ての期限設定を取得
func (r *expenseDeadlineSettingRepository) List(ctx context.Context) ([]*model.ExpenseDeadlineSetting, error) {
	var settings []*model.ExpenseDeadlineSetting
	err := r.db.WithContext(ctx).Order("scope, scope_id").Find(&settings).Error
	if err != nil {
		r.logger.Error("Failed to list expense deadline settings", zap.Error(err))
		return nil, err
	}
	return settings, nil
}
