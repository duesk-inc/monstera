package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/common/auth"
	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("AuthMiddleware", func(t *testing.T) {
		t.Run("正常なトークンでの認証成功", func(t *testing.T) {
			// テスト用の設定
			cfg := &config.Config{
				JWT: config.JWTConfig{
					Secret: "test-secret",
				},
			}
			logger := zap.NewNop()

			// テスト用のトークンを生成
			claims := &auth.Claims{
				UserID: "test-user-id",
				Email:  "test@duesk.co.jp",
				Role:   "employee",
				Roles:  []string{"employee"},
			}
			token, err := auth.GenerateToken(claims, cfg.JWT.Secret, time.Hour)
			assert.NoError(t, err)

			// ミドルウェアを作成
			middleware := AuthMiddleware(cfg, logger)

			// テストリクエストを作成
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/", nil)
			c.Request.Header.Set("Authorization", "Bearer "+token)

			// テスト用のハンドラー
			handlerCalled := false
			c.Set("test", true)
			middleware(c)
			if !c.IsAborted() {
				handlerCalled = true
			}

			// 検証
			assert.True(t, handlerCalled)
			assert.Equal(t, http.StatusOK, w.Code)
			
			// コンテキストに設定された値を検証
			userID, _ := c.Get("user_id")
			assert.Equal(t, "test-user-id", userID)
			
			email, _ := c.Get("email")
			assert.Equal(t, "test@duesk.co.jp", email)
			
			role, _ := c.Get("role")
			assert.Equal(t, "employee", role)
			
			roles, _ := c.Get("roles")
			assert.Equal(t, []string{"employee"}, roles)
		})

		t.Run("トークンなしでの認証失敗", func(t *testing.T) {
			cfg := &config.Config{
				JWT: config.JWTConfig{
					Secret: "test-secret",
				},
			}
			logger := zap.NewNop()

			middleware := AuthMiddleware(cfg, logger)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/", nil)

			middleware(c)

			assert.True(t, c.IsAborted())
			assert.Equal(t, http.StatusUnauthorized, w.Code)
		})

		t.Run("無効なトークンでの認証失敗", func(t *testing.T) {
			cfg := &config.Config{
				JWT: config.JWTConfig{
					Secret: "test-secret",
				},
			}
			logger := zap.NewNop()

			middleware := AuthMiddleware(cfg, logger)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/", nil)
			c.Request.Header.Set("Authorization", "Bearer invalid-token")

			middleware(c)

			assert.True(t, c.IsAborted())
			assert.Equal(t, http.StatusUnauthorized, w.Code)
		})

		t.Run("期限切れトークンでの認証失敗", func(t *testing.T) {
			cfg := &config.Config{
				JWT: config.JWTConfig{
					Secret: "test-secret",
				},
			}
			logger := zap.NewNop()

			// 期限切れのトークンを生成
			claims := &auth.Claims{
				UserID: "test-user-id",
				Email:  "test@duesk.co.jp",
				Role:   "employee",
			}
			token, err := auth.GenerateToken(claims, cfg.JWT.Secret, -time.Hour) // 過去の時間
			assert.NoError(t, err)

			middleware := AuthMiddleware(cfg, logger)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/", nil)
			c.Request.Header.Set("Authorization", "Bearer "+token)

			middleware(c)

			assert.True(t, c.IsAborted())
			assert.Equal(t, http.StatusUnauthorized, w.Code)
		})

		t.Run("クエリパラメータからのトークン取得", func(t *testing.T) {
			cfg := &config.Config{
				JWT: config.JWTConfig{
					Secret: "test-secret",
				},
			}
			logger := zap.NewNop()

			// テスト用のトークンを生成
			claims := &auth.Claims{
				UserID: "test-user-id",
				Email:  "test@duesk.co.jp",
				Role:   "employee",
			}
			token, err := auth.GenerateToken(claims, cfg.JWT.Secret, time.Hour)
			assert.NoError(t, err)

			middleware := AuthMiddleware(cfg, logger)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/?token="+token, nil)

			handlerCalled := false
			middleware(c)
			if !c.IsAborted() {
				handlerCalled = true
			}

			assert.True(t, handlerCalled)
			assert.Equal(t, http.StatusOK, w.Code)
		})

		t.Run("Cookieからのトークン取得", func(t *testing.T) {
			cfg := &config.Config{
				JWT: config.JWTConfig{
					Secret: "test-secret",
				},
			}
			logger := zap.NewNop()

			// テスト用のトークンを生成
			claims := &auth.Claims{
				UserID: "test-user-id",
				Email:  "test@duesk.co.jp",
				Role:   "employee",
			}
			token, err := auth.GenerateToken(claims, cfg.JWT.Secret, time.Hour)
			assert.NoError(t, err)

			middleware := AuthMiddleware(cfg, logger)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/", nil)
			c.Request.AddCookie(&http.Cookie{
				Name:  "access_token",
				Value: token,
			})

			handlerCalled := false
			middleware(c)
			if !c.IsAborted() {
				handlerCalled = true
			}

			assert.True(t, handlerCalled)
			assert.Equal(t, http.StatusOK, w.Code)
		})
	})

	t.Run("RoleMiddleware", func(t *testing.T) {
		t.Run("許可されたロールでのアクセス成功", func(t *testing.T) {
			logger := zap.NewNop()

			middleware := RoleMiddleware(model.RoleEmployee)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Set("role", "employee")

			handlerCalled := false
			middleware(c)
			if !c.IsAborted() {
				handlerCalled = true
			}

			assert.True(t, handlerCalled)
		})

		t.Run("許可されていないロールでのアクセス拒否", func(t *testing.T) {
			logger := zap.NewNop()

			middleware := RoleMiddleware(model.RoleAdmin)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Set("role", "employee")

			middleware(c)

			assert.True(t, c.IsAborted())
			assert.Equal(t, http.StatusForbidden, w.Code)
		})

		t.Run("複数ロール対応（新形式）", func(t *testing.T) {
			logger := zap.NewNop()

			middleware := RoleMiddleware(model.RoleManager, model.RoleAdmin)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Set("roles", []string{"employee", "manager"})

			handlerCalled := false
			middleware(c)
			if !c.IsAborted() {
				handlerCalled = true
			}

			assert.True(t, handlerCalled)
		})

		t.Run("ロール情報なしでのアクセス拒否", func(t *testing.T) {
			logger := zap.NewNop()

			middleware := RoleMiddleware(model.RoleEmployee)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			// roleもrolesも設定しない

			middleware(c)

			assert.True(t, c.IsAborted())
			assert.Equal(t, http.StatusUnauthorized, w.Code)
		})

		t.Run("無効なロール文字列でのアクセス拒否", func(t *testing.T) {
			logger := zap.NewNop()

			middleware := RoleMiddleware(model.RoleEmployee)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Set("role", "invalid-role")

			middleware(c)

			assert.True(t, c.IsAborted())
			assert.Equal(t, http.StatusForbidden, w.Code)
		})

		t.Run("ロール情報の型が不正な場合", func(t *testing.T) {
			logger := zap.NewNop()

			middleware := RoleMiddleware(model.RoleEmployee)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Set("role", 123) // 文字列ではなく数値

			middleware(c)

			assert.True(t, c.IsAborted())
			assert.Equal(t, http.StatusInternalServerError, w.Code)
		})
	})

	t.Run("extractToken", func(t *testing.T) {
		t.Run("Authorizationヘッダーからトークン抽出", func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/", nil)
			c.Request.Header.Set("Authorization", "Bearer test-token")

			token := extractToken(c)
			assert.Equal(t, "test-token", token)
		})

		t.Run("Bearer接頭辞なしの場合", func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/", nil)
			c.Request.Header.Set("Authorization", "test-token")

			token := extractToken(c)
			assert.Empty(t, token)
		})

		t.Run("クエリパラメータからトークン抽出", func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/?token=query-token", nil)

			token := extractToken(c)
			assert.Equal(t, "query-token", token)
		})

		t.Run("Cookieからトークン抽出", func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/", nil)
			c.Request.AddCookie(&http.Cookie{
				Name:  "access_token",
				Value: "cookie-token",
			})

			token := extractToken(c)
			assert.Equal(t, "cookie-token", token)
		})

		t.Run("優先順位：Header > Query > Cookie", func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/?token=query-token", nil)
			c.Request.Header.Set("Authorization", "Bearer header-token")
			c.Request.AddCookie(&http.Cookie{
				Name:  "access_token",
				Value: "cookie-token",
			})

			token := extractToken(c)
			assert.Equal(t, "header-token", token)
		})

		t.Run("トークンが見つからない場合", func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/", nil)

			token := extractToken(c)
			assert.Empty(t, token)
		})
	})
}