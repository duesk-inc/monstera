package test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/routes"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestNotificationAPIWithAuthentication(t *testing.T) {
	// テスト環境のセットアップ
	gin.SetMode(gin.TestMode)
	logger := zap.NewNop()

	// テスト用の設定
	cfg := &config.Config{
		Server: config.ServerConfig{
			Port: "8080",
		},
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			User:     "test",
			Password: "test",
			DBName:   "test_db",
			SSLMode:  "disable",
		},
	}

	// ルーターの作成（実際のアプリケーションの初期化をシミュレート）
	router := gin.New()

	// テスト用のユーザー
	testUserID := uuid.New()
	testUser := &model.User{
		ID:          testUserID,
		CognitoSub:  "test-cognito-sub",
		Email:       "test@example.com",
		Name:        "Test User",
		DefaultRole: "user",
		Roles:       []string{"user"},
	}

	// 認証ミドルウェアのモック
	authMiddleware := func(c *gin.Context) {
		c.Set("user", testUser)
		c.Set("user_id", testUserID) // UUID型として設定
		c.Set("email", testUser.Email)
		c.Set("role", testUser.DefaultRole)
		c.Set("roles", testUser.Roles)
		c.Set("cognito_sub", testUser.CognitoSub)
		c.Next()
	}

	// APIルートの設定（簡略化）
	api := router.Group("/api/v1")
	api.Use(authMiddleware)

	// 通知エンドポイントのモック
	api.GET("/notifications", func(c *gin.Context) {
		// user_idがUUID型で取得できることを確認
		userID, exists := c.Get("user_id")
		assert.True(t, exists)
		assert.IsType(t, uuid.UUID{}, userID)

		// レスポンスを返す
		c.JSON(http.StatusOK, gin.H{
			"notifications": []gin.H{
				{
					"id":      uuid.New().String(),
					"user_id": userID.(uuid.UUID).String(),
					"notification": gin.H{
						"id":                uuid.New().String(),
						"notification_type": "system",
						"title":             "Test Notification",
						"message":           "This is a test notification",
						"created_at":        "2025-07-12T09:00:00Z",
					},
					"is_read":    false,
					"created_at": "2025-07-12T09:00:00Z",
				},
			},
			"unread_count": 1,
			"total_count":  1,
		})
	})

	t.Run("Get notifications with UUID user_id", func(t *testing.T) {
		// リクエストの作成
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/notifications", nil)

		// リクエストの実行
		router.ServeHTTP(w, req)

		// レスポンスの確認
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "notifications")
		assert.Contains(t, w.Body.String(), "unread_count")
		assert.Contains(t, w.Body.String(), "total_count")
	})

	// 経費集計エンドポイントのモック
	api.GET("/expenses/summary", func(c *gin.Context) {
		// user_idがUUID型で取得できることを確認
		userID, exists := c.Get("user_id")
		assert.True(t, exists)
		assert.IsType(t, uuid.UUID{}, userID)

		// レスポンスを返す
		c.JSON(http.StatusOK, gin.H{
			"data": gin.H{
				"monthly": gin.H{
					"period":          "2025-07",
					"total_amount":    50000,
					"approved_amount": 30000,
					"pending_amount":  20000,
					"rejected_amount": 0,
					"limit":           100000,
					"remaining":       50000,
					"usage_rate":      50.0,
				},
				"yearly": gin.H{
					"period":          "2025",
					"total_amount":    500000,
					"approved_amount": 300000,
					"pending_amount":  200000,
					"rejected_amount": 0,
					"limit":           1200000,
					"remaining":       700000,
					"usage_rate":      41.7,
				},
			},
		})
	})

	t.Run("Get expense summary with UUID user_id", func(t *testing.T) {
		// リクエストの作成
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/expenses/summary", nil)

		// リクエストの実行
		router.ServeHTTP(w, req)

		// レスポンスの確認
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "monthly")
		assert.Contains(t, w.Body.String(), "yearly")
		assert.Contains(t, w.Body.String(), "usage_rate")
	})
}

func TestNotificationAPIWithoutAuthentication(t *testing.T) {
	// テスト環境のセットアップ
	gin.SetMode(gin.TestMode)

	// ルーターの作成
	router := gin.New()

	// 認証なしミドルウェア（401を返す）
	authMiddleware := func(c *gin.Context) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		c.Abort()
	}

	// APIルートの設定
	api := router.Group("/api/v1")
	api.Use(authMiddleware)

	api.GET("/notifications", func(c *gin.Context) {
		// このハンドラーは呼ばれないはず
		t.Fatal("Handler should not be called without authentication")
	})

	t.Run("Get notifications without authentication", func(t *testing.T) {
		// リクエストの作成
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/notifications", nil)

		// リクエストの実行
		router.ServeHTTP(w, req)

		// レスポンスの確認
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "認証が必要です")
	})
}
