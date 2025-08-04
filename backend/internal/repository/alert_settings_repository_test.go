package repository

import (
	"context"
	"testing"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupAlertSettingsDB テスト用データベースのセットアップ
func setupAlertSettingsDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	// テーブルを作成
	err = db.AutoMigrate(&model.AlertSettings{}, &model.User{})
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

func TestAlertSettingsRepository_Create(t *testing.T) {
	db := setupAlertSettingsDB(t)
	logger := zap.NewNop()
	repo := NewAlertSettingsRepository(db, logger)

	// テストユーザーを作成
	user := &model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
		Name:  "Test User",
	}
	err := db.Create(user).Error
	require.NoError(t, err)

	settings := &model.AlertSettings{
		ID:                          uuid.New(),
		WeeklyHoursLimit:            60,
		WeeklyHoursChangeLimit:      20,
		ConsecutiveHolidayWorkLimit: 3,
		MonthlyOvertimeLimit:        80,
		UpdatedBy:                   user.ID,
	}

	err = repo.Create(context.Background(), settings)
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, settings.ID)
}

func TestAlertSettingsRepository_GetSettings(t *testing.T) {
	db := setupAlertSettingsDB(t)
	logger := zap.NewNop()
	repo := NewAlertSettingsRepository(db, logger)

	// テストユーザーを作成
	user := &model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
		Name:  "Test User",
	}
	err := db.Create(user).Error
	require.NoError(t, err)

	// テストデータを作成
	settings := &model.AlertSettings{
		ID:                          uuid.New(),
		WeeklyHoursLimit:            60,
		WeeklyHoursChangeLimit:      20,
		ConsecutiveHolidayWorkLimit: 3,
		MonthlyOvertimeLimit:        80,
		UpdatedBy:                   user.ID,
	}
	err = db.Create(settings).Error
	require.NoError(t, err)

	// GetSettingsをテスト
	result, err := repo.GetSettings(context.Background())
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, settings.ID, result.ID)
	assert.Equal(t, settings.WeeklyHoursLimit, result.WeeklyHoursLimit)
	assert.Equal(t, settings.WeeklyHoursChangeLimit, result.WeeklyHoursChangeLimit)
	assert.Equal(t, settings.ConsecutiveHolidayWorkLimit, result.ConsecutiveHolidayWorkLimit)
	assert.Equal(t, settings.MonthlyOvertimeLimit, result.MonthlyOvertimeLimit)
}

func TestAlertSettingsRepository_GetSettings_NotFound(t *testing.T) {
	db := setupAlertSettingsDB(t)
	logger := zap.NewNop()
	repo := NewAlertSettingsRepository(db, logger)

	// データが存在しない場合
	result, err := repo.GetSettings(context.Background())
	assert.Error(t, err)
	assert.Equal(t, gorm.ErrRecordNotFound, err)
	assert.Nil(t, result)
}

func TestAlertSettingsRepository_GetByID(t *testing.T) {
	db := setupAlertSettingsDB(t)
	logger := zap.NewNop()
	repo := NewAlertSettingsRepository(db, logger)

	// テストユーザーを作成
	user := &model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
		Name:  "Test User",
	}
	err := db.Create(user).Error
	require.NoError(t, err)

	// テストデータを作成
	settings := &model.AlertSettings{
		ID:                          uuid.New(),
		WeeklyHoursLimit:            60,
		WeeklyHoursChangeLimit:      20,
		ConsecutiveHolidayWorkLimit: 3,
		MonthlyOvertimeLimit:        80,
		UpdatedBy:                   user.ID,
	}
	err = db.Create(settings).Error
	require.NoError(t, err)

	// GetByIDをテスト
	result, err := repo.GetByID(context.Background(), settings.ID)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, settings.ID, result.ID)
}

func TestAlertSettingsRepository_Update(t *testing.T) {
	db := setupAlertSettingsDB(t)
	logger := zap.NewNop()
	repo := NewAlertSettingsRepository(db, logger)

	// テストユーザーを作成
	user := &model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
		Name:  "Test User",
	}
	err := db.Create(user).Error
	require.NoError(t, err)

	// テストデータを作成
	settings := &model.AlertSettings{
		ID:                          uuid.New(),
		WeeklyHoursLimit:            60,
		WeeklyHoursChangeLimit:      20,
		ConsecutiveHolidayWorkLimit: 3,
		MonthlyOvertimeLimit:        80,
		UpdatedBy:                   user.ID,
	}
	err = db.Create(settings).Error
	require.NoError(t, err)

	// 更新
	updates := map[string]interface{}{
		"weekly_hours_limit": 70,
		"updated_by":         user.ID,
	}
	err = repo.Update(context.Background(), settings.ID, updates)
	assert.NoError(t, err)

	// 更新後のデータを確認
	var updated model.AlertSettings
	err = db.First(&updated, settings.ID).Error
	require.NoError(t, err)
	assert.Equal(t, 70, updated.WeeklyHoursLimit)
}

func TestAlertSettingsRepository_Delete(t *testing.T) {
	db := setupAlertSettingsDB(t)
	logger := zap.NewNop()
	repo := NewAlertSettingsRepository(db, logger)

	// テストユーザーを作成
	user := &model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
		Name:  "Test User",
	}
	err := db.Create(user).Error
	require.NoError(t, err)

	// テストデータを作成
	settings := &model.AlertSettings{
		ID:                          uuid.New(),
		WeeklyHoursLimit:            60,
		WeeklyHoursChangeLimit:      20,
		ConsecutiveHolidayWorkLimit: 3,
		MonthlyOvertimeLimit:        80,
		UpdatedBy:                   user.ID,
	}
	err = db.Create(settings).Error
	require.NoError(t, err)

	// 削除
	err = repo.Delete(context.Background(), settings.ID)
	assert.NoError(t, err)

	// 削除されたことを確認
	var deleted model.AlertSettings
	err = db.First(&deleted, settings.ID).Error
	assert.Error(t, err) // レコードが見つからないことを確認
}
