package integration

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/duesk/monstera/internal/middleware"
	"github.com/duesk/monstera/test/cognito"
	"github.com/duesk/monstera/test/cognito/mocks"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// TestCognitoAuthMiddleware_Integration Cognito認証ミドルウェアの統合テスト
func TestCognitoAuthMiddleware_Integration(t *testing.T) {
	tests := []struct {
		name           string
		setupRequest   func(*http.Request)
		middlewareType string // "required", "optional", "admin"
		expectedStatus int
		expectedBody   string
	}{
		{
			name: "成功 - AuthRequiredで有効なトークン",
			setupRequest: func(req *http.Request) {
				req.Header.Set("Authorization", "Bearer valid-test-token")
			},
			middlewareType: "required",
			expectedStatus: http.StatusOK,
			expectedBody:   `{"message":"認証成功"}`,
		},
		{
			name: "失敗 - AuthRequiredでトークンなし",
			setupRequest: func(req *http.Request) {
				// トークンを設定しない
			},
			middlewareType: "required",
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   `{"error":"認証トークンがありません"}`,
		},
		{
			name: "成功 - OptionalAuthでトークンなし",
			setupRequest: func(req *http.Request) {
				// トークンを設定しない
			},
			middlewareType: "optional",
			expectedStatus: http.StatusOK,
			expectedBody:   `{"message":"アクセス成功","hasUser":false}`,
		},
		{
			name: "成功 - OptionalAuthで有効なトークン",
			setupRequest: func(req *http.Request) {
				req.Header.Set("Authorization", "Bearer valid-test-token")
			},
			middlewareType: "optional",
			expectedStatus: http.StatusOK,
			expectedBody:   `{"message":"アクセス成功","hasUser":true}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// テスト環境セットアップ
			testConfig, err := cognito.SetupTestConfig()
			if err != nil {
				t.Skipf("テスト環境のセットアップに失敗しました: %v", err)
				return
			}
			defer func() {
				if testConfig != nil {
					testConfig.Cleanup()
				}
			}()

			// モックユーザーリポジトリの作成
			userRepo := &mocks.MockUserRepository{}
			setupMockUserRepo(userRepo, tt.expectedStatus == http.StatusOK)

			// Ginエンジンのセットアップ
			gin.SetMode(gin.TestMode)
			router := gin.New()

			// ミドルウェアのセットアップ
			cognitoAuth := createMockCognitoAuth(userRepo, testConfig)

			switch tt.middlewareType {
			case "required":
				router.Use(cognitoAuth.AuthRequired())
				router.GET("/test", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{"message": "認証成功"})
				})
			case "optional":
				router.Use(cognitoAuth.OptionalAuth())
				router.GET("/test", func(c *gin.Context) {
					user, exists := c.Get("user")
					c.JSON(http.StatusOK, gin.H{
						"message": "アクセス成功",
						"hasUser": exists && user != nil,
					})
				})
			case "admin":
				router.Use(cognitoAuth.AdminRequired())
				router.GET("/admin/test", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{"message": "管理者認証成功"})
				})
			}

			// HTTPリクエストの作成
			urlPath := "/test"
			if tt.middlewareType == "admin" {
				urlPath = "/admin/test"
			}
			req := httptest.NewRequest("GET", urlPath, nil)
			tt.setupRequest(req)

			// レスポンスレコーダーの作成
			w := httptest.NewRecorder()

			// リクエストの実行
			router.ServeHTTP(w, req)

			// 結果の検証
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.JSONEq(t, tt.expectedBody, w.Body.String())

			// モックの呼び出し検証
			userRepo.AssertExpectations(t)
		})
	}
}

// TestMiddlewareChain ミドルウェアチェーンのテスト
func TestMiddlewareChain(t *testing.T) {
	// テスト環境セットアップ
	testConfig, err := cognito.SetupTestConfig()
	if err != nil {
		t.Skipf("テスト環境のセットアップに失敗しました: %v", err)
		return
	}
	defer func() {
		if testConfig != nil {
			testConfig.Cleanup()
		}
	}()

	// モックユーザーリポジトリの作成
	userRepo := &mocks.MockUserRepository{}
	setupMockUserRepo(userRepo, true)

	// Ginエンジンのセットアップ
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// 複数のミドルウェアをチェーンしてテスト
	cognitoAuth := createMockCognitoAuth(userRepo, testConfig)
	router.Use(gin.Logger())               // ログミドルウェア
	router.Use(cognitoAuth.AuthRequired()) // 認証ミドルウェア
	router.GET("/protected", func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報が見つかりません"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message": "プロテクトされたリソースへのアクセス成功",
			"user":    user,
		})
	})

	// HTTPリクエストの作成
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer valid-test-token")

	// レスポンスレコーダーの作成
	w := httptest.NewRecorder()

	// リクエストの実行
	router.ServeHTTP(w, req)

	// 結果の検証
	assert.Equal(t, http.StatusOK, w.Code)

	// レスポンスにユーザー情報が含まれているか確認
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "user")
	assert.Contains(t, response, "message")

	// モックの呼び出し検証
	userRepo.AssertExpectations(t)
}

// setupMockUserRepo ユーザーリポジトリのモックを設定
func setupMockUserRepo(userRepo *mocks.MockUserRepository, shouldSucceed bool) {
	if shouldSucceed {
		// 成功時のテストユーザー
		testUser := cognito.GetTestUsers()[2] // 従業員ユーザー
		userRepo.On("GetByID", mock.Anything, mock.Anything).Return(testUser, nil)
		userRepo.On("GetByCognitoSub", mock.Anything, mock.Anything).Return(testUser, nil)
	} else {
		// 失敗時
		userRepo.On("GetByID", mock.Anything, mock.Anything).Return(nil, errors.New("user not found"))
		userRepo.On("GetByCognitoSub", mock.Anything, mock.Anything).Return(nil, errors.New("user not found"))
	}
}

// createMockCognitoAuth モック認証サービスを使ったCognito認証ミドルウェアを作成
func createMockCognitoAuth(userRepo *mocks.MockUserRepository, testConfig *cognito.TestConfig) *middleware.CognitoAuthMiddleware {
	// 実際のCognito認証ミドルウェアを作成（テスト設定で）
	return middleware.NewCognitoAuthMiddleware(testConfig.Config, userRepo, testConfig.Logger)
}
