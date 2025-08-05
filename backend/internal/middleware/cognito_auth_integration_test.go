package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/middleware"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockUserRepository モックユーザーリポジトリ
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) GetByCognitoSub(ctx context.Context, cognitoSub string) (*model.User, error) {
	args := m.Called(ctx, cognitoSub)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, user *model.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

// その他のUserRepositoryメソッドのスタブ実装
func (m *MockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return nil, nil
}
func (m *MockUserRepository) Create(ctx context.Context, user *model.User) error {
	return nil
}
func (m *MockUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}
func (m *MockUserRepository) List(ctx context.Context, filter repository.UserListFilter) ([]*model.User, error) {
	return nil, nil
}
func (m *MockUserRepository) Count(ctx context.Context, filter repository.UserListFilter) (int64, error) {
	return 0, nil
}
func (m *MockUserRepository) UpdateRole(ctx context.Context, userID uuid.UUID, role model.Role) error {
	return nil
}
func (m *MockUserRepository) UpdateStatus(ctx context.Context, userID uuid.UUID, status string) error {
	return nil
}
func (m *MockUserRepository) AddRole(ctx context.Context, userID uuid.UUID, role model.Role) error {
	return nil
}
func (m *MockUserRepository) RemoveRole(ctx context.Context, userID uuid.UUID, role model.Role) error {
	return nil
}
func (m *MockUserRepository) GetRoles(ctx context.Context, userID uuid.UUID) ([]model.Role, error) {
	return nil, nil
}
func (m *MockUserRepository) HasRole(ctx context.Context, userID uuid.UUID, role model.Role) (bool, error) {
	return false, nil
}

func TestCognitoAuthMiddleware_AdminRequired(t *testing.T) {
	// テスト用の設定
	cfg := &config.Config{
		Cognito: config.CognitoConfig{
			Enabled:      true,
			AuthSkipMode: true, // 認証スキップモードでテスト
		},
	}

	mockRepo := new(MockUserRepository)
	logger := zap.NewNop()

	// ミドルウェアを作成
	cognitoMiddleware := middleware.NewCognitoAuthMiddleware(cfg, mockRepo, logger)

	// Ginのテストコンテキストを作成
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// テスト用のエンドポイント
	router.GET("/admin-only", 
		cognitoMiddleware.AuthRequired(),
		cognitoMiddleware.AdminRequired(),
		func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "admin access granted"})
		})

	// テストケース1: 管理者ロールでアクセス
	t.Run("管理者ロールでアクセス成功", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/admin-only", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "admin access granted")
	})

	// 認証スキップモードを無効にしてテスト
	cfg.Cognito.AuthSkipMode = false

	// テストケース2: 認証なしでアクセス
	t.Run("認証なしでアクセス失敗", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/admin-only", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "認証が必要です")
	})
}

func TestCognitoAuthMiddleware_AuthRequired(t *testing.T) {
	// テスト用の設定
	cfg := &config.Config{
		Cognito: config.CognitoConfig{
			Enabled:      true,
			AuthSkipMode: true, // 認証スキップモードでテスト
		},
	}

	mockRepo := new(MockUserRepository)
	logger := zap.NewNop()

	// ミドルウェアを作成
	cognitoMiddleware := middleware.NewCognitoAuthMiddleware(cfg, mockRepo, logger)

	// Ginのテストコンテキストを作成
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// テスト用のエンドポイント
	router.GET("/auth-required", 
		cognitoMiddleware.AuthRequired(),
		func(c *gin.Context) {
			user, _ := c.Get("user")
			c.JSON(http.StatusOK, gin.H{
				"message": "authenticated",
				"user": user,
			})
		})

	// テストケース: 認証スキップモードでアクセス
	t.Run("認証スキップモードでアクセス成功", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/auth-required", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "authenticated")
	})
}