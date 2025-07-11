package repository

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ReminderSettingsRepository リマインド設定リポジトリインターフェース
type ReminderSettingsRepository interface {
	Get(ctx context.Context) (*model.ReminderSettings, error)
	Update(ctx context.Context, settings *model.ReminderSettings) error
}

// reminderSettingsRepository リマインド設定リポジトリ実装
type reminderSettingsRepository struct {
	db *gorm.DB
}

// NewReminderSettingsRepository リマインド設定リポジトリのインスタンスを生成
func NewReminderSettingsRepository(db *gorm.DB) ReminderSettingsRepository {
	return &reminderSettingsRepository{
		db: db,
	}
}

// Get 最新のリマインド設定を取得
func (r *reminderSettingsRepository) Get(ctx context.Context) (*model.ReminderSettings, error) {
	var settings model.ReminderSettings
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Order("updated_at DESC").
		First(&settings).Error

	if err == gorm.ErrRecordNotFound {
		// デフォルト設定を返す
		return &model.ReminderSettings{
			ID:                 uuid.New(),
			Enabled:            true,
			FirstReminderDays:  3,
			SecondReminderDays: 7,
			EscalationDays:     14,
			ReminderTime:       "09:00",
			IncludeManager:     true,
		}, nil
	}

	return &settings, err
}

// Update リマインド設定を更新
func (r *reminderSettingsRepository) Update(ctx context.Context, settings *model.ReminderSettings) error {
	// 既存の設定を取得
	existing, err := r.Get(ctx)
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}

	if existing.ID != uuid.Nil {
		// 既存の設定を更新
		settings.ID = existing.ID
		return r.db.WithContext(ctx).
			Model(settings).
			Omit("created_at", "deleted_at").
			Updates(settings).Error
	}

	// 新規作成
	return r.db.WithContext(ctx).Create(settings).Error
}
