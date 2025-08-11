package repository

import (
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserDefaultWorkSettingsRepository はユーザーのデフォルト勤務時間設定のリポジトリ
type UserDefaultWorkSettingsRepository struct {
	db *gorm.DB
}

// NewUserDefaultWorkSettingsRepository は新しいUserDefaultWorkSettingsRepositoryを作成します
func NewUserDefaultWorkSettingsRepository(db *gorm.DB) *UserDefaultWorkSettingsRepository {
	return &UserDefaultWorkSettingsRepository{
		db: db,
	}
}

// FindByUserID はユーザーIDに基づいてデフォルト勤務時間設定を検索します
func (r *UserDefaultWorkSettingsRepository) FindByUserID(userID string) (*model.UserDefaultWorkSettings, error) {
	var settings model.UserDefaultWorkSettings
	err := r.db.Where("user_id = ?", userID).First(&settings).Error
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

// Create は新しいデフォルト勤務時間設定を作成します
func (r *UserDefaultWorkSettingsRepository) Create(settings *model.UserDefaultWorkSettings) error {
	return r.db.Create(settings).Error
}

// Update はデフォルト勤務時間設定を更新します
func (r *UserDefaultWorkSettingsRepository) Update(settings *model.UserDefaultWorkSettings) error {
	// 更新するフィールドを明示的に指定
	return r.db.Model(settings).
		Where("id = ?", settings.ID).
		Updates(map[string]interface{}{
			"weekday_start_time": settings.WeekdayStartTime,
			"weekday_end_time":   settings.WeekdayEndTime,
			"weekday_break_time": settings.WeekdayBreakTime,
			"updated_at":         time.Now(),
		}).Error
}

// Delete はデフォルト勤務時間設定を削除します
func (r *UserDefaultWorkSettingsRepository) Delete(id string) error {
	return r.db.Delete(&model.UserDefaultWorkSettings{}, id).Error
}

// DeleteByUserID はユーザーIDに基づいてデフォルト勤務時間設定を削除します
func (r *UserDefaultWorkSettingsRepository) DeleteByUserID(userID string) error {
	return r.db.Where("user_id = ?", userID).Delete(&model.UserDefaultWorkSettings{}).Error
}

// UpsertSettings はユーザーIDに基づいて設定を作成または更新します
func (r *UserDefaultWorkSettingsRepository) UpsertSettings(settings *model.UserDefaultWorkSettings) error {
	// 既存の設定を検索
	var existingSettings model.UserDefaultWorkSettings
	result := r.db.Where("user_id = ?", settings.UserID).First(&existingSettings)

	// 設定が存在する場合は更新、存在しない場合は作成
	if result.Error == nil {
		settings.ID = existingSettings.ID // 既存のIDを使用
		// 更新するフィールドを明示的に指定
		return r.db.Model(&existingSettings).
			Updates(map[string]interface{}{
				"weekday_start_time": settings.WeekdayStartTime,
				"weekday_end_time":   settings.WeekdayEndTime,
				"weekday_break_time": settings.WeekdayBreakTime,
				"updated_at":         time.Now(),
			}).Error
	} else if result.Error == gorm.ErrRecordNotFound {
		// 新規作成の場合はIDを生成
		if settings.ID == "" {
			settings.ID = uuid.New().String()
		}
		// 作成日時と更新日時を設定
		now := time.Now()
		settings.CreatedAt = now
		settings.UpdatedAt = now
		return r.db.Create(settings).Error
	} else {
		return result.Error
	}
}
