package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockAuthService AuthServiceのモック
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Login(ctx context.Context, email, password, userAgent, ipAddress string) (*service.AuthResponse, error) {
	args := m.Called(ctx, email, password, userAgent, ipAddress)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.AuthResponse), args.Error(1)
}

func (m *MockAuthService) RefreshToken(ctx context.Context, refreshToken string) (*service.AuthResponse, error) {
	args := m.Called(ctx, refreshToken)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.AuthResponse), args.Error(1)
}

func (m *MockAuthService) Logout(ctx context.Context, userID string, refreshToken string) error {
	args := m.Called(ctx, userID, refreshToken)
	return args.Error(0)
}

func (m *MockAuthService) RegisterUser(ctx context.Context, req *service.RegisterUserRequest) (*model.User, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockAuthService) ValidateClaims(claims map[string]interface{}) error {
	args := m.Called(claims)
	return args.Error(0)
}

func (m *MockAuthService) ValidateTOTP(ctx context.Context, userID string, code string) error {
	args := m.Called(ctx, userID, code)
	return args.Error(0)
}

func (m *MockAuthService) SendSMSCode(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockAuthService) VerifySMSCode(ctx context.Context, userID string, code string) error {
	args := m.Called(ctx, userID, code)
	return args.Error(0)
}

func (m *MockAuthService) UseBackupCode(ctx context.Context, userID string, code string) error {
	args := m.Called(ctx, userID, code)
	return args.Error(0)
}

// テスト用のヘルパー関数
func setupAuthTestRouter(handler *AuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api/v1")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/login", handler.Login)
			auth.POST("/logout", handler.Logout)
			auth.POST("/refresh", handler.RefreshToken)
			auth.POST("/register", handler.Register)
		}
	}
	return router
}

func TestAuthHandler_Login(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    interface{}
		setupMock      func(*MockAuthService)
		expectedStatus int
		expectedBody   map[string]interface{}
		checkCookies   bool
	}{
		{
			name: "ログイン成功",
			requestBody: LoginRequest{
				Email:    "test@example.com",
				Password: "password123",
			},
			setupMock: func(m *MockAuthService) {
				userID := uuid.New().String()
				adminRole := model.RoleAdmin
				user := &model.User{
					ID:          userID,
					Email:       "test@example.com",
					FirstName:   "Test",
					LastName:    "User",
					Role:        adminRole,
					DefaultRole: &adminRole,
					Status:      "active",
				}
				authResponse := &service.AuthResponse{
					AccessToken:  "access_token_123",
					RefreshToken: "refresh_token_123",
					ExpiresAt:    time.Now().Add(time.Hour),
					User:         user,
				}
				m.On("Login", mock.Anything, "test@example.com", "password123", mock.Anything, mock.Anything).
					Return(authResponse, nil)
			},
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"access_token":  "access_token_123",
				"refresh_token": "refresh_token_123",
			},
			checkCookies: true,
		},
		{
			name: "ログイン失敗_無効な認証情報",
			requestBody: LoginRequest{
				Email:    "test@example.com",
				Password: "wrongpassword",
			},
			setupMock: func(m *MockAuthService) {
				m.On("Login", mock.Anything, "test@example.com", "wrongpassword", mock.Anything, mock.Anything).
					Return(nil, errors.New("メールアドレスまたはパスワードが正しくありません"))
			},
			expectedStatus: http.StatusUnauthorized,
			expectedBody: map[string]interface{}{
				"error": "メールアドレスまたはパスワードが正しくありません",
			},
		},
		{
			name: "バリデーションエラー_メールアドレス未入力",
			requestBody: LoginRequest{
				Email:    "",
				Password: "password123",
			},
			setupMock:      func(m *MockAuthService) {},
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "無効なリクエストデータです",
			},
		},
		{
			name:           "JSONパースエラー",
			requestBody:    "invalid json",
			setupMock:      func(m *MockAuthService) {},
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "無効なリクエストデータです",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// モックの設定
			mockAuthService := new(MockAuthService)
			if tt.setupMock != nil {
				tt.setupMock(mockAuthService)
			}

			// ハンドラーの作成
			cfg := &config.Config{}
			logger := zap.NewNop()
			handler := NewAuthHandler(cfg, mockAuthService, logger)

			// ルーターのセットアップ
			router := setupAuthTestRouter(handler)

			// リクエストの作成
			var body bytes.Buffer
			if str, ok := tt.requestBody.(string); ok {
				body.WriteString(str)
			} else {
				json.NewEncoder(&body).Encode(tt.requestBody)
			}

			req, _ := http.NewRequest("POST", "/api/v1/auth/login", &body)
			req.Header.Set("Content-Type", "application/json")

			// レスポンスの記録
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// ステータスコードの確認
			assert.Equal(t, tt.expectedStatus, w.Code)

			// レスポンスボディの確認
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)

			for key, value := range tt.expectedBody {
				assert.Equal(t, value, response[key])
			}

			// クッキーの確認
			if tt.checkCookies && tt.expectedStatus == http.StatusOK {
				cookies := w.Result().Cookies()
				var foundAccessToken, foundRefreshToken bool
				for _, cookie := range cookies {
					if cookie.Name == "access_token" {
						foundAccessToken = true
						assert.Equal(t, "access_token_123", cookie.Value)
					}
					if cookie.Name == "refresh_token" {
						foundRefreshToken = true
						assert.Equal(t, "refresh_token_123", cookie.Value)
					}
				}
				assert.True(t, foundAccessToken, "access_token cookie should be set")
				assert.True(t, foundRefreshToken, "refresh_token cookie should be set")
			}

			// モックの呼び出し確認
			mockAuthService.AssertExpectations(t)
		})
	}
}

func TestAuthHandler_Logout(t *testing.T) {
	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		setupMock      func(*MockAuthService)
		expectedStatus int
		expectedBody   map[string]interface{}
	}{
		{
			name: "ログアウト成功",
			setupContext: func(c *gin.Context) {
				userID := uuid.New().String()
				c.Set("user_id", userID)
			},
			setupMock: func(m *MockAuthService) {
				m.On("Logout", mock.Anything, mock.Anything, mock.Anything).
					Return(nil)
			},
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"message": "ログアウトしました",
			},
		},
		{
			name:           "ユーザーID未設定",
			setupContext:   func(c *gin.Context) {},
			setupMock:      func(m *MockAuthService) {},
			expectedStatus: http.StatusUnauthorized,
			expectedBody: map[string]interface{}{
				"error": "ユーザー情報が見つかりません",
			},
		},
		{
			name: "ログアウト失敗",
			setupContext: func(c *gin.Context) {
				userID := uuid.New().String()
				c.Set("user_id", userID)
			},
			setupMock: func(m *MockAuthService) {
				m.On("Logout", mock.Anything, mock.Anything, mock.Anything).
					Return(errors.New("ログアウトに失敗しました"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectedBody: map[string]interface{}{
				"error": "ログアウトに失敗しました",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// モックの設定
			mockAuthService := new(MockAuthService)
			if tt.setupMock != nil {
				tt.setupMock(mockAuthService)
			}

			// ハンドラーの作成
			cfg := &config.Config{}
			logger := zap.NewNop()
			handler := NewAuthHandler(cfg, mockAuthService, logger)

			// Ginコンテキストのセットアップ
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			req, _ := http.NewRequest("POST", "/api/v1/auth/logout", nil)
			c.Request = req

			if tt.setupContext != nil {
				tt.setupContext(c)
			}

			// ハンドラーの実行
			handler.Logout(c)

			// ステータスコードの確認
			assert.Equal(t, tt.expectedStatus, w.Code)

			// レスポンスボディの確認
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)

			for key, value := range tt.expectedBody {
				assert.Equal(t, value, response[key])
			}

			// クッキーがクリアされているか確認
			if tt.expectedStatus == http.StatusOK {
				cookies := w.Result().Cookies()
				for _, cookie := range cookies {
					if cookie.Name == "access_token" || cookie.Name == "refresh_token" {
						assert.Equal(t, "", cookie.Value)
						assert.True(t, cookie.MaxAge < 0, "Cookie should be deleted")
					}
				}
			}

			// モックの呼び出し確認
			mockAuthService.AssertExpectations(t)
		})
	}
}

func TestAuthHandler_RefreshToken(t *testing.T) {
	tests := []struct {
		name           string
		refreshToken   string
		setupMock      func(*MockAuthService)
		expectedStatus int
		expectedBody   map[string]interface{}
	}{
		{
			name:         "トークンリフレッシュ成功",
			refreshToken: "valid_refresh_token",
			setupMock: func(m *MockAuthService) {
				userID := uuid.New().String()
				adminRole := model.RoleAdmin
				user := &model.User{
					ID:          userID,
					Email:       "test@example.com",
					FirstName:   "Test",
					LastName:    "User",
					Role:        adminRole,
					DefaultRole: &adminRole,
					Status:      "active",
				}
				authResponse := &service.AuthResponse{
					AccessToken:  "new_access_token",
					RefreshToken: "new_refresh_token",
					ExpiresAt:    time.Now().Add(time.Hour),
					User:         user,
				}
				m.On("RefreshToken", mock.Anything, "valid_refresh_token").
					Return(authResponse, nil)
			},
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"access_token":  "new_access_token",
				"refresh_token": "new_refresh_token",
			},
		},
		{
			name:         "トークンリフレッシュ失敗",
			refreshToken: "invalid_refresh_token",
			setupMock: func(m *MockAuthService) {
				m.On("RefreshToken", mock.Anything, "invalid_refresh_token").
					Return(nil, errors.New("無効なリフレッシュトークンです"))
			},
			expectedStatus: http.StatusUnauthorized,
			expectedBody: map[string]interface{}{
				"error": "無効なリフレッシュトークンです",
			},
		},
		{
			name:           "リフレッシュトークン未提供",
			refreshToken:   "",
			setupMock:      func(m *MockAuthService) {},
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "リフレッシュトークンが必要です",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// モックの設定
			mockAuthService := new(MockAuthService)
			if tt.setupMock != nil {
				tt.setupMock(mockAuthService)
			}

			// ハンドラーの作成
			cfg := &config.Config{}
			logger := zap.NewNop()
			handler := NewAuthHandler(cfg, mockAuthService, logger)

			// ルーターのセットアップ
			router := setupAuthTestRouter(handler)

			// リクエストの作成
			body := RefreshTokenRequest{
				RefreshToken: tt.refreshToken,
			}
			jsonBody, _ := json.Marshal(body)

			req, _ := http.NewRequest("POST", "/api/v1/auth/refresh", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			// レスポンスの記録
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// ステータスコードの確認
			assert.Equal(t, tt.expectedStatus, w.Code)

			// レスポンスボディの確認
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)

			for key, value := range tt.expectedBody {
				assert.Equal(t, value, response[key])
			}

			// モックの呼び出し確認
			mockAuthService.AssertExpectations(t)
		})
	}
}
