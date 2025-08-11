package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// setupAlertTestService テスト用のアラートサービスを作成
func setupAlertTestService(t *testing.T) (
	service.AlertService,
	*MockAlertSettingsRepository,
	*MockAlertHistoryRepository,
	*MockWeeklyReportRepository,
	*MockNotificationRepository,
) {
	logger := zap.NewNop()

	mockAlertSettingsRepo := new(MockAlertSettingsRepository)
	mockAlertHistoryRepo := new(MockAlertHistoryRepository)
	mockWeeklyReportRepo := new(MockWeeklyReportRepository)
	mockNotificationRepo := new(MockNotificationRepository)

	alertService := service.NewAlertService(
		mockAlertSettingsRepo,
		mockAlertHistoryRepo,
		mockWeeklyReportRepo,
		mockNotificationRepo,
		logger,
	)

	return alertService, mockAlertSettingsRepo, mockAlertHistoryRepo, mockWeeklyReportRepo, mockNotificationRepo
}

func TestAlertService_GetAlertSettings(t *testing.T) {
	t.Run("正常にアラート設定を取得できる", func(t *testing.T) {
		service, mockAlertSettingsRepo, _, _, _ := setupAlertTestService(t)

		expectedSettings := &model.AlertSettings{
			ID:                          uuid.New().String(),
			WeeklyHoursLimit:            60,
			WeeklyHoursChangeLimit:      20,
			ConsecutiveHolidayWorkLimit: 3,
			MonthlyOvertimeLimit:        80,
		}

		mockAlertSettingsRepo.On("GetSettings", mock.Anything).Return(expectedSettings, nil)

		settings, err := service.GetAlertSettings(context.Background())

		assert.NoError(t, err)
		assert.NotNil(t, settings)
		assert.Equal(t, expectedSettings.ID, settings.ID)
		assert.Equal(t, expectedSettings.WeeklyHoursLimit, settings.WeeklyHoursLimit)
		assert.Equal(t, expectedSettings.WeeklyHoursChangeLimit, settings.WeeklyHoursChangeLimit)
		assert.Equal(t, expectedSettings.ConsecutiveHolidayWorkLimit, settings.ConsecutiveHolidayWorkLimit)
		assert.Equal(t, expectedSettings.MonthlyOvertimeLimit, settings.MonthlyOvertimeLimit)

		mockAlertSettingsRepo.AssertExpectations(t)
	})

	t.Run("アラート設定が存在しない場合エラーを返す", func(t *testing.T) {
		service, mockAlertSettingsRepo, _, _, _ := setupAlertTestService(t)

		mockAlertSettingsRepo.On("GetSettings", mock.Anything).Return(nil, gorm.ErrRecordNotFound)

		settings, err := service.GetAlertSettings(context.Background())

		assert.Error(t, err)
		assert.Nil(t, settings)
		assert.Contains(t, err.Error(), "アラート設定の取得に失敗しました")

		mockAlertSettingsRepo.AssertExpectations(t)
	})

	t.Run("リポジトリでエラーが発生した場合エラーを返す", func(t *testing.T) {
		service, mockAlertSettingsRepo, _, _, _ := setupAlertTestService(t)

		mockAlertSettingsRepo.On("GetSettings", mock.Anything).Return(nil, assert.AnError)

		settings, err := service.GetAlertSettings(context.Background())

		assert.Error(t, err)
		assert.Nil(t, settings)
		assert.Contains(t, err.Error(), "アラート設定の取得に失敗しました")

		mockAlertSettingsRepo.AssertExpectations(t)
	})
}

func TestAlertService_UpdateAlertSettings(t *testing.T) {
	t.Run("正常にアラート設定を更新できる", func(t *testing.T) {
		service, mockAlertSettingsRepo, _, _, _ := setupAlertTestService(t)

		settingsID := uuid.New().String()
		updates := map[string]interface{}{
			"weekly_hours_limit": 70,
			"updated_by":         "user123",
		}

		mockAlertSettingsRepo.On("Update", mock.Anything, settingsID, updates).Return(nil)

		err := service.UpdateAlertSettings(context.Background(), settingsID, updates)

		assert.NoError(t, err)
		mockAlertSettingsRepo.AssertExpectations(t)
	})

	t.Run("リポジトリでエラーが発生した場合エラーを返す", func(t *testing.T) {
		service, mockAlertSettingsRepo, _, _, _ := setupAlertTestService(t)

		settingsID := uuid.New().String()
		updates := map[string]interface{}{
			"weekly_hours_limit": 70,
		}

		mockAlertSettingsRepo.On("Update", mock.Anything, settingsID, updates).Return(assert.AnError)

		err := service.UpdateAlertSettings(context.Background(), settingsID, updates)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "アラート設定の更新に失敗しました")
		mockAlertSettingsRepo.AssertExpectations(t)
	})
}

// MockAlertSettingsRepository モックリポジトリの実装
type MockAlertSettingsRepository struct {
	mock.Mock
}

func (m *MockAlertSettingsRepository) Create(ctx context.Context, alertSettings *model.AlertSettings) error {
	args := m.Called(ctx, alertSettings)
	return args.Error(0)
}

func (m *MockAlertSettingsRepository) GetByID(ctx context.Context, id string) (*model.AlertSettings, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.AlertSettings), args.Error(1)
}

func (m *MockAlertSettingsRepository) GetList(ctx context.Context, page, limit int) ([]*model.AlertSettings, int64, error) {
	args := m.Called(ctx, page, limit)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*model.AlertSettings), args.Get(1).(int64), args.Error(2)
}

func (m *MockAlertSettingsRepository) GetSettings(ctx context.Context) (*model.AlertSettings, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.AlertSettings), args.Error(1)
}

func (m *MockAlertSettingsRepository) Update(ctx context.Context, id string, updates map[string]interface{}) error {
	args := m.Called(ctx, id, updates)
	return args.Error(0)
}

func (m *MockAlertSettingsRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// MockAlertHistoryRepository モックリポジトリの実装
type MockAlertHistoryRepository struct {
	mock.Mock
}

func (m *MockAlertHistoryRepository) Create(ctx context.Context, alertHistory *model.AlertHistory) error {
	args := m.Called(ctx, alertHistory)
	return args.Error(0)
}

func (m *MockAlertHistoryRepository) CreateBatch(ctx context.Context, alertHistories []*model.AlertHistory) error {
	args := m.Called(ctx, alertHistories)
	return args.Error(0)
}

func (m *MockAlertHistoryRepository) GetByID(ctx context.Context, id string) (*model.AlertHistory, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.AlertHistory), args.Error(1)
}

func (m *MockAlertHistoryRepository) GetList(ctx context.Context, filters map[string]interface{}, page, limit int) ([]*model.AlertHistory, int64, error) {
	args := m.Called(ctx, filters, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*model.AlertHistory), args.Get(1).(int64), args.Error(2)
}

func (m *MockAlertHistoryRepository) GetByUser(ctx context.Context, userID string, filters map[string]interface{}, page, limit int) ([]*model.AlertHistory, int64, error) {
	args := m.Called(ctx, userID, filters, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*model.AlertHistory), args.Get(1).(int64), args.Error(2)
}

func (m *MockAlertHistoryRepository) GetByWeeklyReport(ctx context.Context, weeklyReportID string) ([]*model.AlertHistory, error) {
	args := m.Called(ctx, weeklyReportID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.AlertHistory), args.Error(1)
}

func (m *MockAlertHistoryRepository) GetUnresolvedByUser(ctx context.Context, userID string, page, limit int) ([]*model.AlertHistory, int64, error) {
	args := m.Called(ctx, userID, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*model.AlertHistory), args.Get(1).(int64), args.Error(2)
}

func (m *MockAlertHistoryRepository) UpdateStatus(ctx context.Context, id string, status model.AlertStatus, resolvedBy *string) error {
	args := m.Called(ctx, id, status, resolvedBy)
	return args.Error(0)
}

func (m *MockAlertHistoryRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// MockWeeklyReportRepository モックリポジトリの実装
type MockWeeklyReportRepository struct {
	mock.Mock
}

func (m *MockWeeklyReportRepository) Create(ctx context.Context, report *model.WeeklyReport) error {
	args := m.Called(ctx, report)
	return args.Error(0)
}

func (m *MockWeeklyReportRepository) GetByID(ctx context.Context, id string) (*model.WeeklyReport, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.WeeklyReport), args.Error(1)
}

func (m *MockWeeklyReportRepository) GetByUserAndWeek(ctx context.Context, userID string, weekStart time.Time) (*model.WeeklyReport, error) {
	args := m.Called(ctx, userID, weekStart)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.WeeklyReport), args.Error(1)
}

func (m *MockWeeklyReportRepository) GetByWeek(ctx context.Context, weekStart time.Time) ([]*model.WeeklyReport, error) {
	args := m.Called(ctx, weekStart)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.WeeklyReport), args.Error(1)
}

func (m *MockWeeklyReportRepository) GetUserReports(ctx context.Context, userID string, filters map[string]interface{}, page, limit int) ([]*model.WeeklyReport, int64, error) {
	args := m.Called(ctx, userID, filters, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*model.WeeklyReport), args.Get(1).(int64), args.Error(2)
}

func (m *MockWeeklyReportRepository) GetList(ctx context.Context, filters map[string]interface{}, page, limit int) ([]*model.WeeklyReport, int64, error) {
	args := m.Called(ctx, filters, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*model.WeeklyReport), args.Get(1).(int64), args.Error(2)
}

func (m *MockWeeklyReportRepository) Update(ctx context.Context, id string, updates map[string]interface{}) error {
	args := m.Called(ctx, id, updates)
	return args.Error(0)
}

func (m *MockWeeklyReportRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// MockNotificationRepository モックリポジトリの実装
type MockNotificationRepository struct {
	mock.Mock
}

func (m *MockNotificationRepository) Create(ctx context.Context, notification *model.Notification) error {
	args := m.Called(ctx, notification)
	return args.Error(0)
}

func (m *MockNotificationRepository) CreateBatch(ctx context.Context, notifications []*model.Notification) error {
	args := m.Called(ctx, notifications)
	return args.Error(0)
}

func (m *MockNotificationRepository) GetByID(ctx context.Context, id string) (*model.Notification, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Notification), args.Error(1)
}

func (m *MockNotificationRepository) GetUnreadCount(ctx context.Context, userID string) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNotificationRepository) GetList(ctx context.Context, userID string, filters map[string]interface{}, page, limit int) ([]*model.Notification, int64, error) {
	args := m.Called(ctx, userID, filters, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*model.Notification), args.Get(1).(int64), args.Error(2)
}

func (m *MockNotificationRepository) MarkAsRead(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationRepository) MarkAllAsRead(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockNotificationRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationRepository) DeleteOldNotifications(ctx context.Context, days int) (int64, error) {
	args := m.Called(ctx, days)
	return args.Get(0).(int64), args.Error(1)
}
