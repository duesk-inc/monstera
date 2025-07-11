package test

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
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/middleware"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/testutils"
)

// TestAPIIntegrationFullWorkflow 完全なAPIワークフローの統合テスト
func TestAPIIntegrationFullWorkflow(t *testing.T) {
	// テスト環境セットアップ
	testutils.SetupTestEnvironment()
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	// テストヘルパーの初期化
	helper := NewE2ETestHelper(db.(*gorm.DB), t)
	defer helper.CleanupTestData()

	// 完全なテストシナリオデータをセットアップ
	testData := helper.SetupCompleteTestScenario()

	// API統合テスト用のサーバーをセットアップ
	server := setupTestAPIServer(db, logger)

	// テストシナリオ実行
	t.Run("完全なAPI統合ワークフロー", func(t *testing.T) {
		runCompleteAPIWorkflow(t, server, testData, helper)
	})
}

// setupTestAPIServer テスト用APIサーバーをセットアップ
func setupTestAPIServer(db any, logger *zap.Logger) *gin.Engine {
	// テスト用設定
	cfg := &config.Config{
		Freee: config.FreeeConfig{
			ClientID:          "test-client-id",
			ClientSecret:      "test-client-secret",
			RedirectURI:       "http://localhost:3000/freee/callback",
			APIBaseURL:        "https://api.freee.co.jp",
			OAuthBaseURL:      "https://accounts.secure.freee.co.jp",
			APIVersion:        1,
			Scope:             "read write",
			RateLimitRequests: 300,
			RateLimitWindow:   3600,
			TimeoutSeconds:    30,
			MaxRetries:        3,
			RetryDelaySeconds: 5,
		},
		Encryption: config.EncryptionConfig{
			Key:       "test-encryption-key-32-characters",
			Algorithm: "AES-GCM",
		},
	}

	// リポジトリ層の初期化
	gormDB := db.(*gorm.DB)
	userRepo := repository.NewUserRepository(gormDB, logger)
	clientRepo := repository.NewClientRepository(gormDB, logger)
	projectRepo := repository.NewProjectRepository(gormDB, logger)
	projectAssignmentRepo := repository.NewProjectAssignmentRepository(gormDB, logger)
	invoiceRepo := repository.NewInvoiceRepository(gormDB, logger)
	projectGroupRepo := repository.NewProjectGroupRepository(gormDB, logger)
	freeSyncLogRepo := repository.NewFreeSyncLogRepository(gormDB, logger)
	scheduledJobRepo := repository.NewScheduledJobRepository(gormDB, logger)

	// サービス層の初期化
	projectGroupService := service.NewProjectGroupService(
		projectGroupRepo,
		projectRepo,
		clientRepo,
		logger,
	)
	billingService := service.NewBillingService(
		invoiceRepo,
		projectAssignmentRepo,
		projectGroupRepo,
		clientRepo,
		logger,
	)
	freeeService := service.NewFreeeService(
		cfg,
		freeSyncLogRepo,
		logger,
	)
	jobSchedulerService := service.NewJobSchedulerService(
		scheduledJobRepo,
		logger,
	)

	// ハンドラー層の初期化
	projectGroupHandler := handler.NewProjectGroupHandler(projectGroupService, logger)
	billingHandler := handler.NewBillingHandler(billingService, logger)
	freeeHandler := handler.NewFreeeHandler(freeeService, logger)
	dashboardHandler := handler.NewAccountingDashboardHandler(
		billingService,
		projectGroupService,
		freeeService,
		logger,
	)

	// Ginルーターの設定
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// ミドルウェア設定
	router.Use(gin.Recovery())
	router.Use(middleware.CORSMiddleware())

	// ルーティング設定
	api := router.Group("/api")
	{
		v1 := api.Group("/v1")
		{
			// 認証関連（簡単な実装）
			v1.POST("/auth/login", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"token": "test-jwt-token",
					"user": gin.H{
						"id":    uuid.New().String(),
						"email": "test@duesk.co.jp",
						"role":  7, // accounting_manager
					},
				})
			})

			// 経理機能
			accounting := v1.Group("/accounting")
			{
				// ダッシュボード
				accounting.GET("/dashboard", dashboardHandler.GetDashboard)
				accounting.GET("/dashboard/kpi", dashboardHandler.GetKPIData)

				// プロジェクトグループ管理
				projectGroups := accounting.Group("/project-groups")
				{
					projectGroups.GET("", projectGroupHandler.GetAll)
					projectGroups.POST("", projectGroupHandler.Create)
					projectGroups.GET("/:id", projectGroupHandler.GetByID)
					projectGroups.PUT("/:id", projectGroupHandler.Update)
					projectGroups.DELETE("/:id", projectGroupHandler.Delete)
				}

				// 請求処理
				billing := accounting.Group("/billing")
				{
					billing.POST("/preview", billingHandler.GetPreview)
					billing.POST("/execute", billingHandler.ExecuteBilling)
					billing.GET("/status/:id", billingHandler.GetBillingStatus)
					billing.POST("/approve/:id", billingHandler.ApproveBilling)
					billing.POST("/reject/:id", billingHandler.RejectBilling)
				}

				// freee連携
				freee := accounting.Group("/freee")
				{
					freee.GET("/oauth-url", freeeHandler.GetOAuthURL)
					freee.POST("/oauth/callback", freeeHandler.HandleOAuthCallback)
					freee.GET("/connection/status", freeeHandler.GetConnectionStatus)
					freee.DELETE("/connection", freeeHandler.DisconnectFreee)

					sync := freee.Group("/sync")
					{
						sync.POST("/partners", freeeHandler.SyncPartners)
						sync.POST("/invoices", freeeHandler.SyncInvoices)
						sync.POST("/batch", freeeHandler.BatchSync)
						sync.GET("/logs", freeeHandler.GetSyncLogs)
					}
				}

				// レポート
				reports := accounting.Group("/reports")
				{
					reports.GET("/monthly", func(c *gin.Context) {
						c.JSON(http.StatusOK, gin.H{"data": "monthly report data"})
					})
					reports.GET("/yearly", func(c *gin.Context) {
						c.JSON(http.StatusOK, gin.H{"data": "yearly report data"})
					})
					reports.POST("/export", func(c *gin.Context) {
						c.JSON(http.StatusOK, gin.H{"export_id": uuid.New().String()})
					})
				}

				// ジョブスケジュール
				jobs := accounting.Group("/jobs")
				{
					jobs.GET("", func(c *gin.Context) {
						c.JSON(http.StatusOK, gin.H{"jobs": []interface{}{}})
					})
					jobs.POST("", func(c *gin.Context) {
						c.JSON(http.StatusCreated, gin.H{"job_id": uuid.New().String()})
					})
					jobs.PUT("/:id", func(c *gin.Context) {
						c.JSON(http.StatusOK, gin.H{"message": "updated"})
					})
					jobs.DELETE("/:id", func(c *gin.Context) {
						c.JSON(http.StatusNoContent, gin.H{})
					})
				}
			}
		}
	}

	return router
}

// runCompleteAPIWorkflow 完全なAPIワークフローを実行
func runCompleteAPIWorkflow(t *testing.T, server *gin.Engine, testData *TestScenarioData, helper *E2ETestHelper) {
	// 1. 認証テスト
	t.Run("1. 認証フロー", func(t *testing.T) {
		loginReq := map[string]string{
			"email":    "accounting.manager@test.com",
			"password": "testpassword",
		}

		jsonData, _ := json.Marshal(loginReq)
		req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var loginResponse map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &loginResponse)
		require.NoError(t, err)
		assert.Contains(t, loginResponse, "token")
		assert.Contains(t, loginResponse, "user")
	})

	// 2. ダッシュボードテスト
	t.Run("2. ダッシュボード表示", func(t *testing.T) {
		// メインダッシュボード
		req, _ := http.NewRequest("GET", "/api/v1/accounting/dashboard", nil)
		w := httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// KPIデータ
		req, _ = http.NewRequest("GET", "/api/v1/accounting/dashboard/kpi", nil)
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	// 3. プロジェクトグループCRUD操作
	t.Run("3. プロジェクトグループCRUD", func(t *testing.T) {
		var createdGroupID string

		// Create
		createReq := dto.CreateProjectGroupRequest{
			Name:        "API統合テストグループ",
			Description: "API統合テスト用のプロジェクトグループ",
			ClientIDs:   []string{testData.Clients.Client1.ID.String()},
			ProjectIDs:  []string{testData.Projects.Project1.ID.String()},
		}

		jsonData, _ := json.Marshal(createReq)
		req, _ := http.NewRequest("POST", "/api/v1/accounting/project-groups", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var createResponse dto.ProjectGroupResponse
		err := json.Unmarshal(w.Body.Bytes(), &createResponse)
		require.NoError(t, err)
		createdGroupID = createResponse.ID

		// Read (GetAll)
		req, _ = http.NewRequest("GET", "/api/v1/accounting/project-groups", nil)
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Read (GetByID)
		req, _ = http.NewRequest("GET", fmt.Sprintf("/api/v1/accounting/project-groups/%s", createdGroupID), nil)
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Update
		updateReq := dto.UpdateProjectGroupRequest{
			Name:        "API統合テストグループ（更新済み）",
			Description: "更新されたAPI統合テスト用のプロジェクトグループ",
			ClientIDs:   []string{testData.Clients.Client1.ID.String()},
			ProjectIDs:  []string{testData.Projects.Project1.ID.String()},
		}

		jsonData, _ = json.Marshal(updateReq)
		req, _ = http.NewRequest("PUT", fmt.Sprintf("/api/v1/accounting/project-groups/%s", createdGroupID), bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Delete
		req, _ = http.NewRequest("DELETE", fmt.Sprintf("/api/v1/accounting/project-groups/%s", createdGroupID), nil)
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)
	})

	// 4. 請求処理ワークフロー
	t.Run("4. 請求処理ワークフロー", func(t *testing.T) {
		// 請求プレビュー
		previewReq := dto.BillingPreviewRequest{
			Year:           2024,
			Month:          12,
			ProjectGroupID: testData.ProjectGroups.Group1.ID.String(),
		}

		jsonData, _ := json.Marshal(previewReq)
		req, _ := http.NewRequest("POST", "/api/v1/accounting/billing/preview", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		server.ServeHTTP(w, req)

		// データがない場合は404、ある場合は200を期待
		assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusNotFound)

		// 請求処理実行（DryRun）
		executeReq := dto.BillingExecuteRequest{
			Year:           2024,
			Month:          12,
			ProjectGroupID: testData.ProjectGroups.Group1.ID.String(),
			DryRun:         true,
		}

		jsonData, _ = json.Marshal(executeReq)
		req, _ = http.NewRequest("POST", "/api/v1/accounting/billing/execute", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusNotFound)
	})

	// 5. freee連携ワークフロー
	t.Run("5. freee連携ワークフロー", func(t *testing.T) {
		// OAuth URL取得
		req, _ := http.NewRequest("GET", "/api/v1/accounting/freee/oauth-url", nil)
		w := httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// 接続状態確認
		req, _ = http.NewRequest("GET", "/api/v1/accounting/freee/connection/status", nil)
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		// 未接続または接続済みのいずれかを期待
		assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusUnauthorized)

		// 同期ログ取得
		req, _ = http.NewRequest("GET", "/api/v1/accounting/freee/sync/logs", nil)
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	// 6. レポート機能
	t.Run("6. レポート機能", func(t *testing.T) {
		// 月次レポート
		req, _ := http.NewRequest("GET", "/api/v1/accounting/reports/monthly?year=2024&month=12", nil)
		w := httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// 年次レポート
		req, _ = http.NewRequest("GET", "/api/v1/accounting/reports/yearly?year=2024", nil)
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// レポートエクスポート
		exportReq := map[string]interface{}{
			"type":   "monthly",
			"year":   2024,
			"month":  12,
			"format": "xlsx",
		}

		jsonData, _ := json.Marshal(exportReq)
		req, _ = http.NewRequest("POST", "/api/v1/accounting/reports/export", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	// 7. ジョブスケジュール管理
	t.Run("7. ジョブスケジュール管理", func(t *testing.T) {
		var createdJobID string

		// ジョブ一覧取得
		req, _ := http.NewRequest("GET", "/api/v1/accounting/jobs", nil)
		w := httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// ジョブ作成
		createJobReq := map[string]interface{}{
			"job_type":     "billing",
			"scheduled_at": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
			"parameters": map[string]interface{}{
				"year":  2024,
				"month": 12,
			},
		}

		jsonData, _ := json.Marshal(createJobReq)
		req, _ = http.NewRequest("POST", "/api/v1/accounting/jobs", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var createJobResponse map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &createJobResponse)
		require.NoError(t, err)
		createdJobID = createJobResponse["job_id"].(string)

		// ジョブ更新
		updateJobReq := map[string]interface{}{
			"status": "paused",
		}

		jsonData, _ = json.Marshal(updateJobReq)
		req, _ = http.NewRequest("PUT", fmt.Sprintf("/api/v1/accounting/jobs/%s", createdJobID), bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// ジョブ削除
		req, _ = http.NewRequest("DELETE", fmt.Sprintf("/api/v1/accounting/jobs/%s", createdJobID), nil)
		w = httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)
	})

	// 8. データ整合性の最終確認
	t.Run("8. データ整合性確認", func(t *testing.T) {
		helper.AssertDataIntegrity(t, testData)

		// 最終的なダッシュボード状態確認
		req, _ := http.NewRequest("GET", "/api/v1/accounting/dashboard", nil)
		w := httptest.NewRecorder()
		server.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var dashboardResponse dto.AccountingSummaryResponse
		err := json.Unmarshal(w.Body.Bytes(), &dashboardResponse)
		require.NoError(t, err)

		// ダッシュボードの基本構造を確認
		assert.NotNil(t, dashboardResponse.MonthlyStats)
		assert.NotNil(t, dashboardResponse.ProjectGroups)
		assert.NotNil(t, dashboardResponse.RecentActivities)
	})
}

// TestAPIErrorScenarios APIエラーシナリオのテスト
func TestAPIErrorScenarios(t *testing.T) {
	// テスト環境セットアップ
	testutils.SetupTestEnvironment()
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	server := setupTestAPIServer(db, logger)

	// エラーシナリオテスト
	errorScenarios := []struct {
		name           string
		method         string
		path           string
		body           interface{}
		expectedStatus int
		description    string
	}{
		{
			name:           "無効なJSON",
			method:         "POST",
			path:           "/api/v1/accounting/project-groups",
			body:           `{"invalid": json}`,
			expectedStatus: http.StatusBadRequest,
			description:    "不正なJSONフォーマット",
		},
		{
			name:   "必須フィールド不足",
			method: "POST",
			path:   "/api/v1/accounting/project-groups",
			body: map[string]interface{}{
				"description": "説明のみ",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "name フィールドが不足",
		},
		{
			name:           "存在しないリソース",
			method:         "GET",
			path:           "/api/v1/accounting/project-groups/nonexistent-id",
			body:           nil,
			expectedStatus: http.StatusNotFound,
			description:    "存在しないプロジェクトグループ",
		},
		{
			name:           "無効なUUID",
			method:         "GET",
			path:           "/api/v1/accounting/project-groups/invalid-uuid",
			body:           nil,
			expectedStatus: http.StatusBadRequest,
			description:    "無効なUUID形式",
		},
		{
			name:           "存在しないエンドポイント",
			method:         "GET",
			path:           "/api/v1/accounting/nonexistent",
			body:           nil,
			expectedStatus: http.StatusNotFound,
			description:    "存在しないエンドポイント",
		},
	}

	for _, scenario := range errorScenarios {
		t.Run(scenario.name, func(t *testing.T) {
			var req *http.Request
			var err error

			if scenario.body != nil {
				var jsonData []byte
				if str, ok := scenario.body.(string); ok {
					jsonData = []byte(str)
				} else {
					jsonData, _ = json.Marshal(scenario.body)
				}
				req, err = http.NewRequest(scenario.method, scenario.path, bytes.NewBuffer(jsonData))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req, err = http.NewRequest(scenario.method, scenario.path, nil)
			}
			require.NoError(t, err)

			w := httptest.NewRecorder()
			server.ServeHTTP(w, req)

			assert.Equal(t, scenario.expectedStatus, w.Code,
				"Scenario: %s - %s", scenario.name, scenario.description)

			// エラーレスポンスの構造確認
			if w.Code >= 400 {
				var errorResponse map[string]interface{}
				err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
				if err == nil {
					assert.Contains(t, errorResponse, "error", "エラーレスポンスには error フィールドが必要")
				}
			}
		})
	}
}
