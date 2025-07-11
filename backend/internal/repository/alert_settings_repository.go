package repository

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AlertSettingsRepository アラート設定リポジトリインターフェース
type AlertSettingsRepository interface {
	Create(ctx context.Context, alertSettings *model.AlertSettings) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.AlertSettings, error)
	GetList(ctx context.Context, page, limit int) ([]*model.AlertSettings, int64, error)
	GetActiveSettings(ctx context.Context) ([]*model.AlertSettings, error)
	Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type alertSettingsRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewAlertSettingsRepository アラート設定リポジトリの作成
func NewAlertSettingsRepository(db *gorm.DB, logger *zap.Logger) AlertSettingsRepository {
	return &alertSettingsRepository{
		db:     db,
		logger: logger,
	}
}

// Create アラート設定を作成
func (r *alertSettingsRepository) Create(ctx context.Context, alertSettings *model.AlertSettings) error {
	if err := r.db.WithContext(ctx).Create(alertSettings).Error; err != nil {
		r.logger.Error("Failed to create alert settings",
			zap.Error(err),
			zap.String("id", alertSettings.ID.String()))
		return err
	}

	r.logger.Info("Alert settings created successfully",
		zap.String("id", alertSettings.ID.String()))

	return nil
}

// GetByID IDでアラート設定を取得
func (r *alertSettingsRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.AlertSettings, error) {
	var alertSettings model.AlertSettings

	err := r.db.WithContext(ctx).
		Preload("Creator").
		Preload("Updater").
		Where("id = ?", id).
		First(&alertSettings).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get alert settings",
			zap.Error(err),
			zap.String("id", id.String()))
		return nil, err
	}

	return &alertSettings, nil
}

// GetList アラート設定一覧を取得
func (r *alertSettingsRepository) GetList(ctx context.Context, page, limit int) ([]*model.AlertSettings, int64, error) {
	var alertSettings []*model.AlertSettings
	var total int64

	query := r.db.WithContext(ctx).Model(&model.AlertSettings{})

	// 総件数を取得
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count alert settings", zap.Error(err))
		return nil, 0, err
	}

	// データを取得
	offset := (page - 1) * limit
	err := query.
		Preload("Creator").
		Preload("Updater").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&alertSettings).Error

	if err != nil {
		r.logger.Error("Failed to get alert settings list", zap.Error(err))
		return nil, 0, err
	}

	return alertSettings, total, nil
}

// GetActiveSettings 有効なアラート設定を取得
func (r *alertSettingsRepository) GetActiveSettings(ctx context.Context) ([]*model.AlertSettings, error) {
	var alertSettings []*model.AlertSettings

	err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Find(&alertSettings).Error

	if err != nil {
		r.logger.Error("Failed to get active alert settings", zap.Error(err))
		return nil, err
	}

	return alertSettings, nil
}

// Update アラート設定を更新
func (r *alertSettingsRepository) Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	result := r.db.WithContext(ctx).
		Model(&model.AlertSettings{}).
		Where("id = ?", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update alert settings",
			zap.Error(result.Error),
			zap.String("id", id.String()))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	r.logger.Info("Alert settings updated successfully",
		zap.String("id", id.String()),
		zap.Int64("rows_affected", result.RowsAffected))

	return nil
}

// Delete アラート設定を削除（論理削除）
func (r *alertSettingsRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Delete(&model.AlertSettings{}, id)

	if result.Error != nil {
		r.logger.Error("Failed to delete alert settings",
			zap.Error(result.Error),
			zap.String("id", id.String()))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	r.logger.Info("Alert settings deleted successfully",
		zap.String("id", id.String()))

	return nil
}
