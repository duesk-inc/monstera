package integration

import (
	"context"
	"errors"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

// MockAuthService 認証サービスのモック
type MockAuthService struct {
	mock.Mock
}

// Login ログインのモック
func (m *MockAuthService) Login(ctx context.Context, email, password, userAgent, ipAddress string) (interface{}, error) {
	args := m.Called(ctx, email, password, userAgent, ipAddress)
	return args.Get(0), args.Error(1)
}

// RegisterUser ユーザー登録のモック
func (m *MockAuthService) RegisterUser(ctx context.Context, user *model.User, password string) error {
	args := m.Called(ctx, user, password)
	return args.Error(0)
}

// RefreshToken トークンリフレッシュのモック
func (m *MockAuthService) RefreshToken(ctx context.Context, refreshToken string) (interface{}, error) {
	args := m.Called(ctx, refreshToken)
	return args.Get(0), args.Error(1)
}

// Logout ログアウトのモック
func (m *MockAuthService) Logout(ctx context.Context, refreshToken string) error {
	args := m.Called(ctx, refreshToken)
	return args.Error(0)
}

// GetUserByID ユーザーID取得のモック
func (m *MockAuthService) GetUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error) {
	args := m.Called(ctx, userID)
	if user, ok := args.Get(0).(*model.User); ok {
		return user, args.Error(1)
	}
	return nil, args.Error(1)
}

// ValidateToken トークン検証のモック
func (m *MockAuthService) ValidateToken(ctx context.Context, token string) (*model.User, error) {
	args := m.Called(ctx, token)
	if user, ok := args.Get(0).(*model.User); ok {
		return user, args.Error(1)
	}
	return nil, args.Error(1)
}

// setupMockAuthService モック認証サービスをセットアップするヘルパー関数
func setupMockAuthService(mockService *MockAuthService, shouldSucceed bool) {
	if shouldSucceed {
		// 成功レスポンスの設定
		successResponse := map[string]interface{}{
			"message":       "ログイン成功",
			"access_token":  "test-access-token",
			"refresh_token": "test-refresh-token",
			"user": map[string]interface{}{
				"id":         "test-user-id",
				"email":      "test@duesk.co.jp",
				"first_name": "Test",
				"last_name":  "User",
				"role":       "employee",
				"department": "開発部",
			},
			"redirect_to": "/dashboard",
		}
		mockService.On("Login", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(successResponse, nil)
	} else {
		// エラーレスポンスの設定
		mockService.On("Login", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("authentication failed"))
	}
}
