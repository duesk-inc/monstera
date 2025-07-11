package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
)

// MockNotificationRepository NotificationRepositoryのモック
type MockNotificationRepository struct {
	mock.Mock
}

func (m *MockNotificationRepository) GetNotificationByID(ctx context.Context, id uuid.UUID) (model.Notification, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(model.Notification), args.Error(1)
}

func (m *MockNotificationRepository) CreateNotification(ctx context.Context, notification model.Notification) (model.Notification, error) {
	args := m.Called(ctx, notification)
	return args.Get(0).(model.Notification), args.Error(1)
}

func (m *MockNotificationRepository) UpdateNotification(ctx context.Context, notification *model.Notification) error {
	args := m.Called(ctx, notification)
	return args.Error(0)
}

func (m *MockNotificationRepository) DeleteNotification(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationRepository) SoftDeleteNotification(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationRepository) GetNotificationsByRecipient(ctx context.Context, recipientID uuid.UUID, params *repository.NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error) {
	args := m.Called(ctx, recipientID, params)
	return args.Get(0).([]*model.Notification), args.Get(1).(*utils.PaginationResult), args.Error(2)
}

func (m *MockNotificationRepository) GetUnreadNotificationsByRecipient(ctx context.Context, recipientID uuid.UUID) ([]*model.Notification, error) {
	args := m.Called(ctx, recipientID)
	return args.Get(0).([]*model.Notification), args.Error(1)
}

func (m *MockNotificationRepository) GetRecentNotificationsByRecipient(ctx context.Context, recipientID uuid.UUID, limit int) ([]*model.Notification, error) {
	args := m.Called(ctx, recipientID, limit)
	return args.Get(0).([]*model.Notification), args.Error(1)
}

func (m *MockNotificationRepository) MarkNotificationAsRead(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationRepository) MarkNotificationsAsReadByRecipient(ctx context.Context, recipientID uuid.UUID, ids []uuid.UUID) error {
	args := m.Called(ctx, recipientID, ids)
	return args.Error(0)
}

func (m *MockNotificationRepository) MarkAllNotificationsAsReadByRecipient(ctx context.Context, recipientID uuid.UUID) error {
	args := m.Called(ctx, recipientID)
	return args.Error(0)
}

func (m *MockNotificationRepository) HideNotification(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationRepository) GetUnreadNotificationCountByRecipient(ctx context.Context, recipientID uuid.UUID) (int64, error) {
	args := m.Called(ctx, recipientID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNotificationRepository) GetNotificationCountByTypeAndRecipient(ctx context.Context, notificationType model.NotificationType, recipientID uuid.UUID) (int64, error) {
	args := m.Called(ctx, notificationType, recipientID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNotificationRepository) CreateNotificationsBulk(ctx context.Context, notifications []*model.Notification) error {
	args := m.Called(ctx, notifications)
	return args.Error(0)
}

func (m *MockNotificationRepository) DeleteExpiredNotifications(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNotificationRepository) GetAllNotifications(ctx context.Context, params *repository.NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]*model.Notification), args.Get(1).(*utils.PaginationResult), args.Error(2)
}

func (m *MockNotificationRepository) GetNotificationsByType(ctx context.Context, notificationType model.NotificationType, params *repository.NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error) {
	args := m.Called(ctx, notificationType, params)
	return args.Get(0).([]*model.Notification), args.Get(1).(*utils.PaginationResult), args.Error(2)
}

func (m *MockNotificationRepository) GetNotificationStats(ctx context.Context, startDate, endDate time.Time) (*repository.NotificationStats, error) {
	args := m.Called(ctx, startDate, endDate)
	return args.Get(0).(*repository.NotificationStats), args.Error(1)
}

// 既存インターフェースのモック実装
func (m *MockNotificationRepository) GetUserNotifications(ctx context.Context, userID uuid.UUID, limit, offset int) ([]model.UserNotification, int64, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0).([]model.UserNotification), args.Get(1).(int64), args.Error(2)
}

func (m *MockNotificationRepository) GetUserNotificationByID(ctx context.Context, id uuid.UUID) (model.UserNotification, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(model.UserNotification), args.Error(1)
}

func (m *MockNotificationRepository) CreateUserNotification(ctx context.Context, userNotification model.UserNotification) (model.UserNotification, error) {
	args := m.Called(ctx, userNotification)
	return args.Get(0).(model.UserNotification), args.Error(1)
}

func (m *MockNotificationRepository) CreateUserNotificationBulk(ctx context.Context, userNotifications []model.UserNotification) error {
	args := m.Called(ctx, userNotifications)
	return args.Error(0)
}

func (m *MockNotificationRepository) MarkAsRead(ctx context.Context, userID uuid.UUID, notificationIDs []uuid.UUID) error {
	args := m.Called(ctx, userID, notificationIDs)
	return args.Error(0)
}

func (m *MockNotificationRepository) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNotificationRepository) GetUserNotificationSettings(ctx context.Context, userID uuid.UUID) ([]model.NotificationSetting, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]model.NotificationSetting), args.Error(1)
}

func (m *MockNotificationRepository) GetUserNotificationSettingByType(ctx context.Context, userID uuid.UUID, notificationType model.NotificationType) (model.NotificationSetting, error) {
	args := m.Called(ctx, userID, notificationType)
	return args.Get(0).(model.NotificationSetting), args.Error(1)
}

func (m *MockNotificationRepository) UpsertUserNotificationSetting(ctx context.Context, setting model.NotificationSetting) (model.NotificationSetting, error) {
	args := m.Called(ctx, setting)
	return args.Get(0).(model.NotificationSetting), args.Error(1)
}

// テスト用のサービス作成ヘルパー
func createTestNotificationService(repo repository.NotificationRepository) service.NotificationService {
	logger := zap.NewNop()
	return service.NewNotificationService(repo, logger)
}

// TestCreateAdvancedNotification 高度な通知作成のテスト
func TestCreateAdvancedNotification(t *testing.T) {
	mockRepo := new(MockNotificationRepository)
	notificationService := createTestNotificationService(mockRepo)

	t.Run("通知作成成功", func(t *testing.T) {
		// テストデータ
		recipientID := uuid.New()
		req := &service.CreateAdvancedNotificationRequest{
			RecipientID: &recipientID,
			Type:        model.NotificationTypeWeeklyReportReminder,
			Priority:    model.NotificationPriorityHigh,
			Title:       "週報提出リマインド",
			Message:     "今週の週報をご提出ください。",
			Metadata: &model.NotificationMetadata{
				WeeklyReportID: &uuid.UUID{},
				StartDate:      timePtr(time.Now().Truncate(24 * time.Hour)),
				EndDate:        timePtr(time.Now().Truncate(24*time.Hour).AddDate(0, 0, 6)),
			},
		}

		expectedNotification := model.Notification{
			ID:               uuid.New(),
			RecipientID:      req.RecipientID,
			Title:            req.Title,
			Message:          req.Message,
			NotificationType: req.Type,
			Priority:         req.Priority,
			Status:           model.NotificationStatusUnread,
			Metadata:         req.Metadata,
			CreatedAt:        time.Now(),
		}

		// モック設定
		mockRepo.On("CreateNotification", mock.Anything, mock.MatchedBy(func(notification model.Notification) bool {
			return notification.Title == req.Title &&
				notification.Message == req.Message &&
				notification.NotificationType == req.Type &&
				notification.Priority == req.Priority
		})).Return(expectedNotification, nil)

		// テスト実行
		result, err := notificationService.CreateAdvancedNotification(context.Background(), req)

		// アサーション
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, expectedNotification.Title, result.Title)
		assert.Equal(t, expectedNotification.Message, result.Message)
		assert.Equal(t, expectedNotification.NotificationType, result.NotificationType)
		assert.Equal(t, expectedNotification.Priority, result.Priority)

		mockRepo.AssertExpectations(t)
	})

	t.Run("必須フィールド不足", func(t *testing.T) {
		// 不正なリクエスト（Titleが空）
		req := &service.CreateAdvancedNotificationRequest{
			Type:     model.NotificationTypeWeeklyReportReminder,
			Priority: model.NotificationPriorityHigh,
			Title:    "", // 空のタイトル
			Message:  "テストメッセージ",
		}

		// テスト実行
		result, err := notificationService.CreateAdvancedNotification(context.Background(), req)

		// アサーション
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

// TestGetNotificationsByRecipient 受信者別通知取得のテスト
func TestGetNotificationsByRecipient(t *testing.T) {
	mockRepo := new(MockNotificationRepository)
	notificationService := createTestNotificationService(mockRepo)

	t.Run("受信者別通知取得成功", func(t *testing.T) {
		// テストデータ
		recipientID := uuid.New()
		params := &repository.NotificationQueryParams{
			Page:  1,
			Limit: 20,
		}

		notifications := []*model.Notification{
			{
				ID:               uuid.New(),
				RecipientID:      &recipientID,
				Title:            "テスト通知1",
				Message:          "テストメッセージ1",
				NotificationType: model.NotificationTypeWeeklyReportReminder,
				Priority:         model.NotificationPriorityHigh,
				Status:           model.NotificationStatusUnread,
				CreatedAt:        time.Now(),
			},
		}

		pagination := &utils.PaginationResult{
			Page:       1,
			Limit:      20,
			Total:      1,
			TotalPages: 1,
		}

		// モック設定
		mockRepo.On("GetNotificationsByRecipient", mock.Anything, recipientID, params).
			Return(notifications, pagination, nil)

		// テスト実行
		result, resultPagination, err := notificationService.GetNotificationsByRecipient(context.Background(), recipientID, params)

		// アサーション
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Len(t, result, 1)
		assert.Equal(t, notifications[0].Title, result[0].Title)
		assert.Equal(t, pagination.Total, resultPagination.Total)

		mockRepo.AssertExpectations(t)
	})
}

// TestCreateWeeklyReportReminderNotification 週報リマインド通知作成のテスト
func TestCreateWeeklyReportReminderNotification(t *testing.T) {
	mockRepo := new(MockNotificationRepository)
	notificationService := createTestNotificationService(mockRepo)

	t.Run("週報リマインド通知作成成功", func(t *testing.T) {
		// テストデータ
		recipientID := uuid.New()
		startDate := time.Now().Truncate(24 * time.Hour)
		endDate := startDate.AddDate(0, 0, 6)

		req := &service.WeeklyReportReminderRequest{
			RecipientID: recipientID,
			StartDate:   startDate,
			EndDate:     endDate,
		}

		expectedNotification := model.Notification{
			ID:               uuid.New(),
			RecipientID:      &recipientID,
			Title:            "週報提出リマインド",
			NotificationType: model.NotificationTypeWeeklyReportReminder,
			Priority:         model.NotificationPriorityMedium,
			Status:           model.NotificationStatusUnread,
			CreatedAt:        time.Now(),
		}

		// モック設定
		mockRepo.On("CreateNotification", mock.Anything, mock.MatchedBy(func(notification model.Notification) bool {
			return notification.NotificationType == model.NotificationTypeWeeklyReportReminder &&
				notification.RecipientID != nil &&
				*notification.RecipientID == recipientID
		})).Return(expectedNotification, nil)

		// テスト実行
		err := notificationService.CreateWeeklyReportReminderNotification(context.Background(), req)

		// アサーション
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})

	t.Run("無効な日付範囲", func(t *testing.T) {
		// 不正な日付範囲（終了日が開始日より前）
		req := &service.WeeklyReportReminderRequest{
			RecipientID: uuid.New(),
			StartDate:   time.Now(),
			EndDate:     time.Now().AddDate(0, 0, -1), // 前日
		}

		// テスト実行
		err := notificationService.CreateWeeklyReportReminderNotification(context.Background(), req)

		// アサーション
		assert.Error(t, err)
	})
}

// TestGetUnreadNotificationCount 未読通知数取得のテスト
func TestGetUnreadNotificationCount(t *testing.T) {
	mockRepo := new(MockNotificationRepository)
	notificationService := createTestNotificationService(mockRepo)

	t.Run("未読通知数取得成功", func(t *testing.T) {
		// テストデータ
		userID := uuid.New()
		expectedCount := int64(5)

		// モック設定
		mockRepo.On("GetUnreadNotificationCountByRecipient", mock.Anything, userID).
			Return(expectedCount, nil)

		// テスト実行
		result, err := notificationService.GetUnreadNotificationCount(context.Background(), userID)

		// アサーション
		assert.NoError(t, err)
		assert.Equal(t, expectedCount, result)

		mockRepo.AssertExpectations(t)
	})
}

// TestMarkAdvancedNotificationsAsRead 通知一括既読のテスト
func TestMarkAdvancedNotificationsAsRead(t *testing.T) {
	mockRepo := new(MockNotificationRepository)
	notificationService := createTestNotificationService(mockRepo)

	t.Run("通知一括既読成功", func(t *testing.T) {
		// テストデータ
		userID := uuid.New()
		notificationIDs := []uuid.UUID{uuid.New(), uuid.New()}

		// モック設定
		mockRepo.On("MarkNotificationsAsReadByRecipient", mock.Anything, userID, notificationIDs).
			Return(nil)

		// テスト実行
		err := notificationService.MarkAdvancedNotificationsAsRead(context.Background(), userID, notificationIDs)

		// アサーション
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})
}

// TestGetNotificationStats 通知統計取得のテスト
func TestGetNotificationStats(t *testing.T) {
	mockRepo := new(MockNotificationRepository)
	notificationService := createTestNotificationService(mockRepo)

	t.Run("通知統計取得成功", func(t *testing.T) {
		// テストデータ
		startDate := time.Now().AddDate(0, 0, -30)
		endDate := time.Now()

		expectedStats := &repository.NotificationStats{
			TotalNotifications:  100,
			UnreadNotifications: 20,
			ReadNotifications:   80,
			NotificationsByType: map[model.NotificationType]int64{
				model.NotificationTypeWeeklyReportReminder:  50,
				model.NotificationTypeWeeklyReportSubmitted: 30,
			},
			NotificationsByDate: map[string]int64{
				"2023-12-01": 10,
				"2023-12-02": 15,
			},
		}

		// モック設定
		mockRepo.On("GetNotificationStats", mock.Anything, startDate, endDate).
			Return(expectedStats, nil)

		// テスト実行
		result, err := notificationService.GetNotificationStats(context.Background(), startDate, endDate)

		// アサーション
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, expectedStats.TotalNotifications, result.TotalNotifications)
		assert.Equal(t, expectedStats.UnreadNotifications, result.UnreadNotifications)
		assert.Equal(t, expectedStats.ReadNotifications, result.ReadNotifications)
		assert.Equal(t, len(expectedStats.NotificationsByType), len(result.NotificationsByType))

		mockRepo.AssertExpectations(t)
	})
}

// TestDeleteExpiredNotifications 期限切れ通知削除のテスト
func TestDeleteExpiredNotifications(t *testing.T) {
	mockRepo := new(MockNotificationRepository)
	notificationService := createTestNotificationService(mockRepo)

	t.Run("期限切れ通知削除成功", func(t *testing.T) {
		// テストデータ
		expectedDeletedCount := int64(10)

		// モック設定
		mockRepo.On("DeleteExpiredNotifications", mock.Anything).
			Return(expectedDeletedCount, nil)

		// テスト実行
		result, err := notificationService.DeleteExpiredNotifications(context.Background())

		// アサーション
		assert.NoError(t, err)
		assert.Equal(t, expectedDeletedCount, result)

		mockRepo.AssertExpectations(t)
	})
}

// ヘルパー関数
func timePtr(t time.Time) *time.Time {
	return &t
}
