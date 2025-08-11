package service

import (
	"context"
	"testing"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// 簡易的なモックリポジトリ実装
type mockAlertSettingsRepoSimple struct {
	settings *model.AlertSettings
	err      error
}

func (m *mockAlertSettingsRepoSimple) Create(ctx context.Context, alertSettings *model.AlertSettings) error {
	return nil
}

func (m *mockAlertSettingsRepoSimple) GetByID(ctx context.Context, id string) (*model.AlertSettings, error) {
	return m.settings, m.err
}

func (m *mockAlertSettingsRepoSimple) GetList(ctx context.Context, page, limit int) ([]*model.AlertSettings, int64, error) {
	return nil, 0, nil
}

func (m *mockAlertSettingsRepoSimple) GetSettings(ctx context.Context) (*model.AlertSettings, error) {
	return m.settings, m.err
}

func (m *mockAlertSettingsRepoSimple) Update(ctx context.Context, id string, updates map[string]interface{}) error {
	return nil
}

func (m *mockAlertSettingsRepoSimple) Delete(ctx context.Context, id string) error {
	return nil
}

func TestAlertService_GetSettings_Simple(t *testing.T) {
	logger := zap.NewNop()

	t.Run("正常にアラート設定を取得", func(t *testing.T) {
		expectedSettings := &model.AlertSettings{
			ID:                          uuid.New().String(),
			WeeklyHoursLimit:            60,
			WeeklyHoursChangeLimit:      20,
			ConsecutiveHolidayWorkLimit: 3,
			MonthlyOvertimeLimit:        80,
		}

		mockRepo := &mockAlertSettingsRepoSimple{
			settings: expectedSettings,
			err:      nil,
		}

		service := &alertService{
			alertSettingsRepo: mockRepo,
			logger:            logger,
		}

		settings, err := service.GetAlertSettings(context.Background())

		assert.NoError(t, err)
		assert.NotNil(t, settings)
		assert.Equal(t, expectedSettings.ID, settings.ID)
		assert.Equal(t, expectedSettings.WeeklyHoursLimit, settings.WeeklyHoursLimit)
	})

	t.Run("アラート設定が存在しない場合", func(t *testing.T) {
		mockRepo := &mockAlertSettingsRepoSimple{
			settings: nil,
			err:      gorm.ErrRecordNotFound,
		}

		service := &alertService{
			alertSettingsRepo: mockRepo,
			logger:            logger,
		}

		settings, err := service.GetAlertSettings(context.Background())

		assert.Error(t, err)
		assert.Nil(t, settings)
		assert.Contains(t, err.Error(), "アラート設定の取得に失敗しました")
	})
}
