package repository

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseApproverSettingRepository 承認者設定リポジトリのインターフェース
type ExpenseApproverSettingRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, setting *model.ExpenseApproverSetting) error
	GetByID(ctx context.Context, id string) (*model.ExpenseApproverSetting, error)
	Update(ctx context.Context, setting *model.ExpenseApproverSetting) error
	Delete(ctx context.Context, id string) error

	// 検索機能
	GetAll(ctx context.Context) ([]model.ExpenseApproverSetting, error)
	GetByApprovalType(ctx context.Context, approvalType model.ApprovalType) ([]model.ExpenseApproverSetting, error)
	GetActiveByApprovalType(ctx context.Context, approvalType model.ApprovalType) ([]model.ExpenseApproverSetting, error)
	GetByApproverID(ctx context.Context, approverID string) ([]model.ExpenseApproverSetting, error)

	// 履歴管理
	CreateHistory(ctx context.Context, history *model.ExpenseApproverSettingHistory) error
	GetHistories(ctx context.Context, settingID string) ([]model.ExpenseApproverSettingHistory, error)
	GetAllHistories(ctx context.Context, limit, offset int) ([]model.ExpenseApproverSettingHistory, int64, error)

	// ユーティリティ
	ExistsByApproverAndType(ctx context.Context, approverID string, approvalType model.ApprovalType) (bool, error)
	SetLogger(logger *zap.Logger)
}

// ExpenseApproverSettingRepositoryImpl 承認者設定リポジトリの実装
type ExpenseApproverSettingRepositoryImpl struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewExpenseApproverSettingRepository 承認者設定リポジトリのインスタンスを生成
func NewExpenseApproverSettingRepository(db *gorm.DB, logger *zap.Logger) ExpenseApproverSettingRepository {
	return &ExpenseApproverSettingRepositoryImpl{
		db:     db,
		logger: logger,
	}
}

// SetLogger ロガーを設定
func (r *ExpenseApproverSettingRepositoryImpl) SetLogger(logger *zap.Logger) {
	r.logger = logger
}

// Create 承認者設定を作成
func (r *ExpenseApproverSettingRepositoryImpl) Create(ctx context.Context, setting *model.ExpenseApproverSetting) error {
	if err := r.db.WithContext(ctx).Create(setting).Error; err != nil {
		r.logger.Error("Failed to create approver setting",
			zap.Error(err),
			zap.String("approval_type", string(setting.ApprovalType)),
			zap.String("approver_id", setting.ApproverID))
		return err
	}

	r.logger.Info("Approver setting created successfully",
		zap.String("id", setting.ID),
		zap.String("approval_type", string(setting.ApprovalType)))
	return nil
}

// GetByID IDで承認者設定を取得
func (r *ExpenseApproverSettingRepositoryImpl) GetByID(ctx context.Context, id string) (*model.ExpenseApproverSetting, error) {
	var setting model.ExpenseApproverSetting
	err := r.db.WithContext(ctx).
		Preload("Approver").
		Preload("Creator").
		Where("id = ?", id).
		First(&setting).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get approver setting by ID",
			zap.Error(err),
			zap.String("id", id))
		return nil, err
	}

	return &setting, nil
}

// Update 承認者設定を更新
func (r *ExpenseApproverSettingRepositoryImpl) Update(ctx context.Context, setting *model.ExpenseApproverSetting) error {
	if err := r.db.WithContext(ctx).Save(setting).Error; err != nil {
		r.logger.Error("Failed to update approver setting",
			zap.Error(err),
			zap.String("id", setting.ID))
		return err
	}

	r.logger.Info("Approver setting updated successfully",
		zap.String("id", setting.ID))
	return nil
}

// Delete 承認者設定を削除
func (r *ExpenseApproverSettingRepositoryImpl) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.ExpenseApproverSetting{}, id).Error; err != nil {
		r.logger.Error("Failed to delete approver setting",
			zap.Error(err),
			zap.String("id", id))
		return err
	}

	r.logger.Info("Approver setting deleted successfully",
		zap.String("id", id))
	return nil
}

// GetAll すべての承認者設定を取得
func (r *ExpenseApproverSettingRepositoryImpl) GetAll(ctx context.Context) ([]model.ExpenseApproverSetting, error) {
	var settings []model.ExpenseApproverSetting
	err := r.db.WithContext(ctx).
		Preload("Approver").
		Preload("Creator").
		Order("approval_type, priority, created_at").
		Find(&settings).Error

	if err != nil {
		r.logger.Error("Failed to get all approver settings", zap.Error(err))
		return nil, err
	}

	return settings, nil
}

// GetByApprovalType 承認タイプで承認者設定を取得
func (r *ExpenseApproverSettingRepositoryImpl) GetByApprovalType(ctx context.Context, approvalType model.ApprovalType) ([]model.ExpenseApproverSetting, error) {
	var settings []model.ExpenseApproverSetting
	err := r.db.WithContext(ctx).
		Preload("Approver").
		Preload("Creator").
		Where("approval_type = ?", approvalType).
		Order("priority, created_at").
		Find(&settings).Error

	if err != nil {
		r.logger.Error("Failed to get approver settings by type",
			zap.Error(err),
			zap.String("approval_type", string(approvalType)))
		return nil, err
	}

	return settings, nil
}

// GetActiveByApprovalType アクティブな承認者設定を承認タイプで取得
func (r *ExpenseApproverSettingRepositoryImpl) GetActiveByApprovalType(ctx context.Context, approvalType model.ApprovalType) ([]model.ExpenseApproverSetting, error) {
	var settings []model.ExpenseApproverSetting
	err := r.db.WithContext(ctx).
		Preload("Approver").
		Where("approval_type = ? AND is_active = ?", approvalType, true).
		Order("priority, created_at").
		Find(&settings).Error

	if err != nil {
		r.logger.Error("Failed to get active approver settings by type",
			zap.Error(err),
			zap.String("approval_type", string(approvalType)))
		return nil, err
	}

	return settings, nil
}

// GetByApproverID 承認者IDで承認者設定を取得
func (r *ExpenseApproverSettingRepositoryImpl) GetByApproverID(ctx context.Context, approverID string) ([]model.ExpenseApproverSetting, error) {
	var settings []model.ExpenseApproverSetting
	err := r.db.WithContext(ctx).
		Preload("Approver").
		Preload("Creator").
		Where("approver_id = ?", approverID).
		Order("approval_type, priority").
		Find(&settings).Error

	if err != nil {
		r.logger.Error("Failed to get approver settings by approver ID",
			zap.Error(err),
			zap.String("approver_id", approverID))
		return nil, err
	}

	return settings, nil
}

// CreateHistory 承認者設定履歴を作成
func (r *ExpenseApproverSettingRepositoryImpl) CreateHistory(ctx context.Context, history *model.ExpenseApproverSettingHistory) error {
	if err := r.db.WithContext(ctx).Create(history).Error; err != nil {
		r.logger.Error("Failed to create approver setting history",
			zap.Error(err),
			zap.String("setting_id", history.SettingID),
			zap.String("action", history.Action))
		return err
	}

	return nil
}

// GetHistories 設定IDで履歴を取得
func (r *ExpenseApproverSettingRepositoryImpl) GetHistories(ctx context.Context, settingID string) ([]model.ExpenseApproverSettingHistory, error) {
	var histories []model.ExpenseApproverSettingHistory
	err := r.db.WithContext(ctx).
		Preload("Changer").
		Where("setting_id = ?", settingID).
		Order("changed_at DESC").
		Find(&histories).Error

	if err != nil {
		r.logger.Error("Failed to get approver setting histories",
			zap.Error(err),
			zap.String("setting_id", settingID))
		return nil, err
	}

	return histories, nil
}

// GetAllHistories すべての履歴を取得（ページング対応）
func (r *ExpenseApproverSettingRepositoryImpl) GetAllHistories(ctx context.Context, limit, offset int) ([]model.ExpenseApproverSettingHistory, int64, error) {
	var histories []model.ExpenseApproverSettingHistory
	var total int64

	// 総件数を取得
	if err := r.db.WithContext(ctx).Model(&model.ExpenseApproverSettingHistory{}).Count(&total).Error; err != nil {
		r.logger.Error("Failed to count approver setting histories", zap.Error(err))
		return nil, 0, err
	}

	// データを取得
	err := r.db.WithContext(ctx).
		Preload("Changer").
		Order("changed_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&histories).Error

	if err != nil {
		r.logger.Error("Failed to get all approver setting histories", zap.Error(err))
		return nil, 0, err
	}

	return histories, total, nil
}

// ExistsByApproverAndType 承認者IDと承認タイプで存在確認
func (r *ExpenseApproverSettingRepositoryImpl) ExistsByApproverAndType(ctx context.Context, approverID string, approvalType model.ApprovalType) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ExpenseApproverSetting{}).
		Where("approver_id = ? AND approval_type = ?", approverID, approvalType).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check existence by approver and type",
			zap.Error(err),
			zap.String("approver_id", approverID),
			zap.String("approval_type", string(approvalType)))
		return false, err
	}

	return count > 0, nil
}
