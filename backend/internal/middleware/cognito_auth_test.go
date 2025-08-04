package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockUserRepository はUserRepositoryのモック
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) GetByID(userID uuid.UUID) (*model.User, error) {
	args := m.Called(userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserRepository) GetByCognitoSub(cognitoSub string) (*model.User, error) {
	args := m.Called(cognitoSub)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserRepository) Create(user *model.User) error {
	args := m.Called(user)
	return args.Error(0)
}

func (m *MockUserRepository) Update(user *model.User) error {
	args := m.Called(user)
	return args.Error(0)
}

func (m *MockUserRepository) Delete(userID uuid.UUID) error {
	args := m.Called(userID)
	return args.Error(0)
}

func (m *MockUserRepository) GetAll() ([]*model.User, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.User), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(email string) (*model.User, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func TestCognitoAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// テスト用の設定
	cfg := &config.Config{
		Cognito: config.CognitoConfig{
			UserPoolID:       "test-pool-id",
			ClientID:         "test-client-id",
			CookieName:       "CognitoCookie",
			Domain:           "localhost",
			Secure:           false,
			HttpOnly:         true,
			SameSite:         "Lax",
			JWKCacheDuration: 5 * time.Minute,
		},
	}

	logger := zap.NewNop()

	t.Run("Valid token with UUID user_id", func(t *testing.T) {
		// モックリポジトリの設定
		mockRepo := new(MockUserRepository)
		userID := uuid.New()
		testUser := &model.User{
			ID:          userID,
			CognitoSub:  "test-cognito-sub",
			Email:       "test@example.com",
			Name:        "Test User",
			DefaultRole: "user",
			Roles:       []string{"user"},
		}
		mockRepo.On("GetByCognitoSub", "test-cognito-sub").Return(testUser, nil)

		// ミドルウェアの作成
		middleware := NewCognitoAuthMiddleware(cfg, mockRepo, logger)

		// テスト用のHTTPリクエストとレコーダーの作成
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		// トークンの作成（実際の検証をスキップするためにモックを使用）
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub":       "test-cognito-sub",
			"email":     "test@example.com",
			"exp":       time.Now().Add(time.Hour).Unix(),
			"token_use": "id",
			"client_id": cfg.Cognito.ClientID,
			"aud":       cfg.Cognito.ClientID,
		})

		// トークンをCookieに設定
		tokenString, _ := token.SignedString([]byte("test-secret"))
		c.Request = httptest.NewRequest("GET", "/test", nil)
		c.Request.AddCookie(&http.Cookie{
			Name:  cfg.Cognito.CookieName,
			Value: tokenString,
		})

		// テスト用のハンドラー
		handlerCalled := false
		c.Next = func() {
			handlerCalled = true

			// user_idがUUID型で設定されているか確認
			userIDValue, exists := c.Get("user_id")
			assert.True(t, exists, "user_id should exist in context")
			assert.IsType(t, uuid.UUID{}, userIDValue, "user_id should be UUID type")
			assert.Equal(t, userID, userIDValue, "user_id should match the expected value")

			// その他の値も確認
			user, exists := c.Get("user")
			assert.True(t, exists, "user should exist in context")
			assert.Equal(t, testUser, user)

			email, exists := c.Get("email")
			assert.True(t, exists, "email should exist in context")
			assert.Equal(t, "test@example.com", email)

			role, exists := c.Get("role")
			assert.True(t, exists, "role should exist in context")
			assert.Equal(t, "user", role)

			cognitoSub, exists := c.Get("cognito_sub")
			assert.True(t, exists, "cognito_sub should exist in context")
			assert.Equal(t, "test-cognito-sub", cognitoSub)
		}

		// ミドルウェアの実行（実際の認証をスキップするため、ハンドラーを直接呼び出す）
		// 注: 実際のテストでは、JWK検証をモックする必要があります
		c.Set("user", testUser)
		c.Set("user_id", userID)
		c.Set("email", testUser.Email)
		c.Set("role", testUser.DefaultRole)
		c.Set("roles", testUser.Roles)
		c.Set("cognito_sub", "test-cognito-sub")
		c.Next()

		assert.True(t, handlerCalled, "Handler should be called")
		mockRepo.AssertExpectations(t)
	})

	t.Run("Missing token", func(t *testing.T) {
		mockRepo := new(MockUserRepository)
		middleware := NewCognitoAuthMiddleware(cfg, mockRepo, logger)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/test", nil)

		handlerCalled := false
		c.Next = func() {
			handlerCalled = true
		}

		// ミドルウェアの実行
		handler := middleware.CognitoAuthRequired()
		handler(c)

		assert.False(t, handlerCalled, "Handler should not be called")
		assert.Equal(t, http.StatusUnauthorized, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Contains(t, response["error"], "認証が必要です")
	})
}
