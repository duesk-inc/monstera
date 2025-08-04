package service_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// MockAuditLogRepository is a mock implementation of AuditLogRepository
type MockAuditLogRepository struct {
	mock.Mock
}

func (m *MockAuditLogRepository) Create(ctx context.Context, auditLog *model.AuditLog) error {
	args := m.Called(ctx, auditLog)
	return args.Error(0)
}

func (m *MockAuditLogRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.AuditLog, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.AuditLog), args.Error(1)
}

func (m *MockAuditLogRepository) GetByFilters(ctx context.Context, filters repository.AuditLogFilters) ([]*model.AuditLog, int64, error) {
	args := m.Called(ctx, filters)
	return args.Get(0).([]*model.AuditLog), args.Get(1).(int64), args.Error(2)
}

func (m *MockAuditLogRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]*model.AuditLog, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0).([]*model.AuditLog), args.Error(1)
}

func (m *MockAuditLogRepository) GetByResourceID(ctx context.Context, resourceType model.ResourceType, resourceID string, limit int, offset int) ([]*model.AuditLog, error) {
	args := m.Called(ctx, resourceType, resourceID, limit, offset)
	return args.Get(0).([]*model.AuditLog), args.Error(1)
}

func (m *MockAuditLogRepository) GetSuspiciousActivities(ctx context.Context, filters repository.SuspiciousActivityFilters) ([]*repository.SuspiciousActivity, error) {
	args := m.Called(ctx, filters)
	return args.Get(0).([]*repository.SuspiciousActivity), args.Error(1)
}

func (m *MockAuditLogRepository) DeleteOldLogs(ctx context.Context, retentionDays int) (int64, error) {
	args := m.Called(ctx, retentionDays)
	return args.Get(0).(int64), args.Error(1)
}

func TestLogHTTPRequest_Success(t *testing.T) {
	// Setup
	mockRepo := new(MockAuditLogRepository)
	logger := zap.NewNop()
	service := service.NewAuditLogService(&gorm.DB{}, logger, mockRepo)

	// Create test context
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Setup request
	c.Request = httptest.NewRequest("GET", "/api/v1/notifications", nil)
	c.Request.Header.Set("User-Agent", "TestAgent")
	c.Request.Header.Set("X-Forwarded-For", "192.168.1.1")
	c.Writer.WriteHeader(http.StatusOK)

	// Setup expectations
	userID := uuid.New()
	action := model.AuditActionType("NOTIFICATION_VIEW")
	resourceType := model.ResourceType("NOTIFICATION")
	duration := 20 * time.Millisecond

	// Mock expectation
	mockRepo.On("Create", mock.MatchedBy(func(ctx context.Context) bool {
		// Verify that context is not the request context
		select {
		case <-ctx.Done():
			return false
		default:
			return true
		}
	}), mock.MatchedBy(func(log *model.AuditLog) bool {
		return log.UserID == userID &&
			log.Action == string(action) &&
			log.ResourceType == string(resourceType) &&
			log.Method == "GET" &&
			log.Path == "/api/v1/notifications" &&
			log.StatusCode == 200 &&
			*log.IPAddress == "192.168.1.1" &&
			*log.UserAgent == "TestAgent"
	})).Return(nil)

	// Execute
	ctx := context.Background()
	err := service.LogHTTPRequest(ctx, c, userID, action, resourceType, nil, duration)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestLogHTTPRequest_WithCanceledContext(t *testing.T) {
	// Setup
	mockRepo := new(MockAuditLogRepository)
	logger := zap.NewNop()
	service := service.NewAuditLogService(&gorm.DB{}, logger, mockRepo)

	// Create test context
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Setup request
	c.Request = httptest.NewRequest("GET", "/api/v1/notifications", nil)
	c.Request.Header.Set("User-Agent", "TestAgent")
	c.Writer.WriteHeader(http.StatusOK)

	// Setup expectations
	userID := uuid.New()
	action := model.AuditActionType("NOTIFICATION_VIEW")
	resourceType := model.ResourceType("NOTIFICATION")
	duration := 20 * time.Millisecond

	// Create a canceled context
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	// Mock expectation - should still be called with the canceled context
	mockRepo.On("Create", mock.Anything, mock.Anything).Return(context.Canceled)

	// Execute
	err := service.LogHTTPRequest(ctx, c, userID, action, resourceType, nil, duration)

	// Assert - should return context.Canceled error
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "context canceled")
	mockRepo.AssertExpectations(t)
}

func TestLogHTTPRequest_SkipNonAuditableAction(t *testing.T) {
	// Setup
	mockRepo := new(MockAuditLogRepository)
	logger := zap.NewNop()
	service := service.NewAuditLogService(&gorm.DB{}, logger, mockRepo)

	// Create test context
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Setup request
	c.Request = httptest.NewRequest("GET", "/api/v1/health", nil)

	// Setup expectations with a non-auditable action
	userID := uuid.New()
	action := model.AuditActionUserView // This action is not auditable according to ShouldAudit()
	resourceType := model.ResourceType("USER")
	duration := 5 * time.Millisecond

	// No repository calls should be made
	// (no mock expectations set)

	// Execute
	ctx := context.Background()
	err := service.LogHTTPRequest(ctx, c, userID, action, resourceType, nil, duration)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestLogHTTPRequest_WithRequestBody(t *testing.T) {
	// Setup
	mockRepo := new(MockAuditLogRepository)
	logger := zap.NewNop()
	service := service.NewAuditLogService(&gorm.DB{}, logger, mockRepo)

	// Create test context
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Setup POST request
	c.Request = httptest.NewRequest("POST", "/api/v1/users", nil)
	c.Request.Header.Set("User-Agent", "TestAgent")
	c.Writer.WriteHeader(http.StatusCreated)

	// Set request body in context
	requestBody := map[string]interface{}{"name": "Test User", "email": "test@example.com"}
	c.Set("request_body", requestBody)

	// Setup expectations
	userID := uuid.New()
	action := model.AuditActionType("USER_CREATE")
	resourceType := model.ResourceType("USER")
	resourceID := "new-user-id"
	duration := 50 * time.Millisecond

	// Mock expectation
	mockRepo.On("Create", mock.Anything, mock.MatchedBy(func(log *model.AuditLog) bool {
		return log.RequestBody != nil && *log.RequestBody != ""
	})).Return(nil)

	// Execute
	ctx := context.Background()
	err := service.LogHTTPRequest(ctx, c, userID, action, resourceType, &resourceID, duration)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestLogHTTPRequest_WithError(t *testing.T) {
	// Setup
	mockRepo := new(MockAuditLogRepository)
	logger := zap.NewNop()
	service := service.NewAuditLogService(&gorm.DB{}, logger, mockRepo)

	// Create test context
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Setup request
	c.Request = httptest.NewRequest("POST", "/api/v1/login", nil)
	c.Writer.WriteHeader(http.StatusUnauthorized)

	// Add error to context
	c.Errors = append(c.Errors, &gin.Error{
		Err:  assert.AnError,
		Type: gin.ErrorTypePublic,
		Meta: "Invalid credentials",
	})

	// Setup expectations
	userID := uuid.Nil // Failed login
	action := model.AuditActionLoginFailed
	resourceType := model.ResourceType("SESSION")
	duration := 10 * time.Millisecond

	// Mock expectation
	mockRepo.On("Create", mock.Anything, mock.MatchedBy(func(log *model.AuditLog) bool {
		return log.ErrorMessage != nil && *log.ErrorMessage != ""
	})).Return(nil)

	// Execute
	ctx := context.Background()
	err := service.LogHTTPRequest(ctx, c, userID, action, resourceType, nil, duration)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
