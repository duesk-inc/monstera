package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
)

// MockNotificationService NotificationServiceのモック
type MockNotificationService struct {
	mock.Mock
}

func (m *MockNotificationService) GetUserNotifications(ctx context.Context, userID string, limit, offset int) (interface{}, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0), args.Error(1)
}

func (m *MockNotificationService) MarkAsRead(ctx context.Context, userID string, notificationIDs []string) error {
	args := m.Called(ctx, userID, notificationIDs)
	return args.Error(0)
}

func (m *MockNotificationService) MarkAllAsRead(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockNotificationService) CreateNotification(ctx context.Context, request interface{}) (interface{}, error) {
	args := m.Called(ctx, request)
	return args.Get(0), args.Error(1)
}

func (m *MockNotificationService) GetUserNotificationSettings(ctx context.Context, userID string) (interface{}, error) {
	args := m.Called(ctx, userID)
	return args.Get(0), args.Error(1)
}

func (m *MockNotificationService) UpdateNotificationSetting(ctx context.Context, userID string, request interface{}) (interface{}, error) {
	args := m.Called(ctx, userID, request)
	return args.Get(0), args.Error(1)
}

// 新しいメソッドのモック実装
func (m *MockNotificationService) CreateAdvancedNotification(ctx context.Context, req *service.CreateAdvancedNotificationRequest) (*model.Notification, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*model.Notification), args.Error(1)
}

func (m *MockNotificationService) GetAdvancedNotificationByID(ctx context.Context, id string) (*model.Notification, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*model.Notification), args.Error(1)
}

func (m *MockNotificationService) UpdateAdvancedNotification(ctx context.Context, id string, req *service.UpdateAdvancedNotificationRequest) (*model.Notification, error) {
	args := m.Called(ctx, id, req)
	return args.Get(0).(*model.Notification), args.Error(1)
}

func (m *MockNotificationService) DeleteAdvancedNotification(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationService) GetNotificationsByRecipient(ctx context.Context, recipientID string, params *repository.NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error) {
	args := m.Called(ctx, recipientID, params)
	return args.Get(0).([]*model.Notification), args.Get(1).(*utils.PaginationResult), args.Error(2)
}

func (m *MockNotificationService) GetUnreadNotificationsByRecipient(ctx context.Context, recipientID string) ([]*model.Notification, error) {
	args := m.Called(ctx, recipientID)
	return args.Get(0).([]*model.Notification), args.Error(1)
}

func (m *MockNotificationService) GetRecentNotificationsByRecipient(ctx context.Context, recipientID string, limit int) ([]*model.Notification, error) {
	args := m.Called(ctx, recipientID, limit)
	return args.Get(0).([]*model.Notification), args.Error(1)
}

func (m *MockNotificationService) MarkAdvancedNotificationAsRead(ctx context.Context, userID string, notificationID string) error {
	args := m.Called(ctx, userID, notificationID)
	return args.Error(0)
}

func (m *MockNotificationService) MarkAdvancedNotificationsAsRead(ctx context.Context, userID string, notificationIDs []string) error {
	args := m.Called(ctx, userID, notificationIDs)
	return args.Error(0)
}

func (m *MockNotificationService) MarkAllAdvancedNotificationsAsRead(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockNotificationService) HideNotification(ctx context.Context, userID string, notificationID string) error {
	args := m.Called(ctx, userID, notificationID)
	return args.Error(0)
}

func (m *MockNotificationService) GetUnreadNotificationCount(ctx context.Context, userID string) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNotificationService) GetNotificationStatsByRecipient(ctx context.Context, recipientID string) (*service.NotificationStatsByRecipient, error) {
	args := m.Called(ctx, recipientID)
	return args.Get(0).(*service.NotificationStatsByRecipient), args.Error(1)
}

func (m *MockNotificationService) CreateWeeklyReportReminderNotification(ctx context.Context, req *service.WeeklyReportReminderRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) CreateWeeklyReportSubmittedNotification(ctx context.Context, req *service.WeeklyReportSubmittedRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) CreateWeeklyReportOverdueNotification(ctx context.Context, req *service.WeeklyReportOverdueRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) CreateBulkReminderCompleteNotification(ctx context.Context, req *service.BulkReminderCompleteRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) CreateBulkReminderFailedNotification(ctx context.Context, req *service.BulkReminderFailedRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) CreateExportCompleteNotification(ctx context.Context, req *service.ExportCompleteRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) CreateExportFailedNotification(ctx context.Context, req *service.ExportFailedRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) CreateSystemMaintenanceNotification(ctx context.Context, req *service.SystemMaintenanceRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) CreateAlertTriggeredNotification(ctx context.Context, req *service.AlertTriggeredRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) CreateBulkNotifications(ctx context.Context, notifications []*model.Notification) error {
	args := m.Called(ctx, notifications)
	return args.Error(0)
}

func (m *MockNotificationService) DeleteExpiredNotifications(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNotificationService) GetAllNotifications(ctx context.Context, params *repository.NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]*model.Notification), args.Get(1).(*utils.PaginationResult), args.Error(2)
}

func (m *MockNotificationService) GetNotificationStats(ctx context.Context, startDate, endDate time.Time) (*repository.NotificationStats, error) {
	args := m.Called(ctx, startDate, endDate)
	return args.Get(0).(*repository.NotificationStats), args.Error(1)
}

// MockRepository モックリポジトリ（簡略化）
type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) GetByID(ctx context.Context, id string) (interface{}, error) {
	args := m.Called(ctx, id)
	return args.Get(0), args.Error(1)
}

// テストのセットアップ
func setupNotificationHandlerTest() (handler.NotificationHandler, *MockNotificationService) {
	mockService := new(MockNotificationService)
	mockWeeklyReportRepo := new(MockRepository)
	mockUserRepo := new(MockRepository)
	mockDepartmentRepo := new(MockRepository)

	logger := zap.NewNop()

	handler := handler.NewNotificationHandler(
		mockService,
		mockWeeklyReportRepo,
		mockUserRepo,
		mockDepartmentRepo,
		logger,
	)

	return handler, mockService
}

// テストヘルパー：認証ユーザーIDを設定
func setAuthUser(c *gin.Context, userID string) {
	c.Set("user_id", userID)
}

// TestGetAdvancedNotifications 高度な通知一覧取得のテスト
func TestGetAdvancedNotifications(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, mockService := setupNotificationHandlerTest()

	t.Run("全通知一覧取得成功", func(t *testing.T) {
		// テストデータ
		notifications := []*model.Notification{
			{
				ID:               uuid.New().String(),
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

		// モックの設定
		mockService.On("GetAllNotifications", mock.Anything, mock.AnythingOfType("*repository.NotificationQueryParams")).
			Return(notifications, pagination, nil)

		// リクエスト作成
		req, _ := http.NewRequest("GET", "/admin/notifications?page=1&limit=20", nil)
		w := httptest.NewRecorder()

		// Ginコンテキスト作成
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		setAuthUser(c, uuid.New().String())

		// ハンドラー実行
		handler.GetAdvancedNotifications(c)

		// アサーション
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "items")
		assert.Contains(t, response, "pagination")

		mockService.AssertExpectations(t)
	})

	t.Run("フィルタ付き通知一覧取得", func(t *testing.T) {
		// テストデータ
		notifications := []*model.Notification{}
		pagination := &utils.PaginationResult{Page: 1, Limit: 20, Total: 0, TotalPages: 0}

		// モックの設定
		mockService.On("GetAllNotifications", mock.Anything, mock.MatchedBy(func(params *repository.NotificationQueryParams) bool {
			return params.Status != nil && *params.Status == model.NotificationStatusUnread
		})).Return(notifications, pagination, nil)

		// リクエスト作成（フィルタ付き）
		req, _ := http.NewRequest("GET", "/admin/notifications?status=unread&type=weekly_report_reminder", nil)
		w := httptest.NewRecorder()

		// Ginコンテキスト作成
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		setAuthUser(c, uuid.New().String())

		// ハンドラー実行
		handler.GetAdvancedNotifications(c)

		// アサーション
		assert.Equal(t, http.StatusOK, w.Code)
		mockService.AssertExpectations(t)
	})
}

// TestGetNotificationByID 通知詳細取得のテスト
func TestGetNotificationByID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, mockService := setupNotificationHandlerTest()

	t.Run("通知詳細取得成功", func(t *testing.T) {
		// テストデータ
		notificationID := uuid.New().String()
		notification := &model.Notification{
			ID:               notificationID,
			Title:            "テスト通知",
			Message:          "テストメッセージ",
			NotificationType: model.NotificationTypeWeeklyReportReminder,
			Priority:         model.NotificationPriorityHigh,
			Status:           model.NotificationStatusUnread,
			CreatedAt:        time.Now(),
		}

		// モックの設定
		mockService.On("GetAdvancedNotificationByID", mock.Anything, notificationID).
			Return(notification, nil)

		// リクエスト作成
		req, _ := http.NewRequest("GET", fmt.Sprintf("/notifications/%s", notificationID), nil)
		w := httptest.NewRecorder()

		// Ginコンテキスト作成
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Params = []gin.Param{{Key: "id", Value: notificationID}}
		setAuthUser(c, uuid.New().String())

		// ハンドラー実行
		handler.GetNotificationByID(c)

		// アサーション
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "data")

		mockService.AssertExpectations(t)
	})

	t.Run("無効な通知ID", func(t *testing.T) {
		// リクエスト作成
		req, _ := http.NewRequest("GET", "/notifications/invalid-id", nil)
		w := httptest.NewRecorder()

		// Ginコンテキスト作成
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Params = []gin.Param{{Key: "id", Value: "invalid-id"}}
		setAuthUser(c, uuid.New().String())

		// ハンドラー実行
		handler.GetNotificationByID(c)

		// アサーション
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestSendWeeklyReportReminder 週報リマインド送信のテスト
func TestSendWeeklyReportReminder(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, mockService := setupNotificationHandlerTest()

	t.Run("週報リマインド送信成功", func(t *testing.T) {
		// テストデータ
		recipientID := uuid.New().String()
		startDate := time.Now().Truncate(24 * time.Hour)
		endDate := startDate.AddDate(0, 0, 6)

		req := service.WeeklyReportReminderRequest{
			RecipientID: recipientID,
			StartDate:   startDate,
			EndDate:     endDate,
		}

		// モックの設定
		mockService.On("CreateWeeklyReportReminderNotification", mock.Anything, mock.MatchedBy(func(req *service.WeeklyReportReminderRequest) bool {
			return req.RecipientID == recipientID
		})).Return(nil)

		// リクエストボディ作成
		reqBody, _ := json.Marshal(req)
		httpReq, _ := http.NewRequest("POST", "/weekly-reports/notifications/reminders/single", bytes.NewBuffer(reqBody))
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		// Ginコンテキスト作成
		c, _ := gin.CreateTestContext(w)
		c.Request = httpReq
		setAuthUser(c, uuid.New().String())

		// ハンドラー実行
		handler.SendWeeklyReportReminder(c)

		// アサーション
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "message")

		mockService.AssertExpectations(t)
	})

	t.Run("不正なリクエスト形式", func(t *testing.T) {
		// 不正なJSONリクエスト
		httpReq, _ := http.NewRequest("POST", "/weekly-reports/notifications/reminders/single", bytes.NewBuffer([]byte("{invalid json")))
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		// Ginコンテキスト作成
		c, _ := gin.CreateTestContext(w)
		c.Request = httpReq
		setAuthUser(c, uuid.New().String())

		// ハンドラー実行
		handler.SendWeeklyReportReminder(c)

		// アサーション
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestSendBulkReminder 一括リマインド送信のテスト
func TestSendBulkReminder(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, mockService := setupNotificationHandlerTest()

	t.Run("一括リマインド送信成功", func(t *testing.T) {
		// テストデータ
		userIDs := []string{uuid.New().String(), uuid.New().String()}
		startDate := time.Now().Truncate(24 * time.Hour)
		endDate := startDate.AddDate(0, 0, 6)

		req := struct {
			UserIDs   []string  `json:"user_ids"`
			StartDate time.Time `json:"start_date"`
			EndDate   time.Time `json:"end_date"`
			Message   string    `json:"message"`
		}{
			UserIDs:   userIDs,
			StartDate: startDate,
			EndDate:   endDate,
			Message:   "週報の提出をお願いします",
		}

		// モックの設定（各ユーザーのリマインド）
		mockService.On("CreateWeeklyReportReminderNotification", mock.Anything, mock.AnythingOfType("*service.WeeklyReportReminderRequest")).
			Return(nil).Times(len(userIDs))

		// 一括リマインド完了通知のモック
		mockService.On("CreateBulkReminderCompleteNotification", mock.Anything, mock.AnythingOfType("*service.BulkReminderCompleteRequest")).
			Return(nil)

		// リクエストボディ作成
		reqBody, _ := json.Marshal(req)
		httpReq, _ := http.NewRequest("POST", "/weekly-reports/notifications/reminders/bulk", bytes.NewBuffer(reqBody))
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		// Ginコンテキスト作成
		c, _ := gin.CreateTestContext(w)
		c.Request = httpReq
		setAuthUser(c, uuid.New().String())

		// ハンドラー実行
		handler.SendBulkReminder(c)

		// アサーション
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "message")
		assert.Contains(t, response, "total_count")
		assert.Contains(t, response, "success_count")
		assert.Contains(t, response, "failure_count")

		// 成功数の確認
		assert.Equal(t, float64(len(userIDs)), response["total_count"])
		assert.Equal(t, float64(len(userIDs)), response["success_count"])
		assert.Equal(t, float64(0), response["failure_count"])

		mockService.AssertExpectations(t)
	})
}

// TestGetUnreadCount 未読通知数取得のテスト
func TestGetUnreadCount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, mockService := setupNotificationHandlerTest()

	t.Run("未読通知数取得成功", func(t *testing.T) {
		// テストデータ
		userID := uuid.New().String()
		expectedCount := int64(5)

		// モックの設定
		mockService.On("GetUnreadNotificationCount", mock.Anything, userID).
			Return(expectedCount, nil)

		// リクエスト作成
		req, _ := http.NewRequest("GET", "/notifications/unread-count", nil)
		w := httptest.NewRecorder()

		// Ginコンテキスト作成
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		setAuthUser(c, userID)

		// ハンドラー実行
		handler.GetUnreadCount(c)

		// アサーション
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "data")

		data := response["data"].(map[string]interface{})
		assert.Equal(t, float64(expectedCount), data["unread_count"])

		mockService.AssertExpectations(t)
	})
}

// TestGetNotificationStats 通知統計取得のテスト
func TestGetNotificationStats(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, mockService := setupNotificationHandlerTest()

	t.Run("通知統計取得成功", func(t *testing.T) {
		// テストデータ
		stats := &repository.NotificationStats{
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

		// モックの設定
		mockService.On("GetNotificationStats", mock.Anything, mock.AnythingOfType("time.Time"), mock.AnythingOfType("time.Time")).
			Return(stats, nil)

		// リクエスト作成
		req, _ := http.NewRequest("GET", "/admin/notifications/stats", nil)
		w := httptest.NewRecorder()

		// Ginコンテキスト作成
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		setAuthUser(c, uuid.New().String())

		// ハンドラー実行
		handler.GetNotificationStats(c)

		// アサーション
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "data")

		mockService.AssertExpectations(t)
	})
}
