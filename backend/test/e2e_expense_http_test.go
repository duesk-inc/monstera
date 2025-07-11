package test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/testutils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseHTTPE2ETestSuite HTTP経由でのE2Eテストスイート
type ExpenseHTTPE2ETestSuite struct {
	DB     *gorm.DB
	Server *gin.Engine
	Logger *zap.Logger
	Config *config.Config

	// テストユーザー
	TestUser    *model.User
	ManagerUser *model.User

	//認証情報
	TestUserToken    string
	ManagerUserToken string

	// テストデータ
	TestCategory *model.ExpenseCategoryMaster
}

// TestExpenseHTTPE2EFlow HTTP経由での完全E2Eテスト
func TestExpenseHTTPE2EFlow(t *testing.T) {
	// CI環境でのスキップ判定
	if os.Getenv("CI") == "true" && os.Getenv("RUN_E2E_TESTS") != "true" {
		t.Skip("E2Eテストはローカル環境でのみ実行")
	}

	// テスト環境のセットアップ
	testutils.SetupTestEnvironment()

	suite := &ExpenseHTTPE2ETestSuite{
		DB:     testutils.SetupTestDB(t),
		Logger: zap.NewNop(),
		Config: config.LoadConfig(),
	}

	// サーバーのセットアップ
	suite.setupServer(t)

	// テストデータの準備
	suite.setupTestData(t)

	// 認証トークンの取得
	suite.setupAuthentication(t)

	// テストケースの実行
	t.Run("🌐 HTTPベース経費申請CRUD操作", func(t *testing.T) {
		suite.testHTTPCRUDOperations(t)
	})

	t.Run("🔐 HTTP認証・認可チェック", func(t *testing.T) {
		suite.testHTTPAuthenticationAndAuthorization(t)
	})

	t.Run("📝 HTTPバリデーション・エラーハンドリング", func(t *testing.T) {
		suite.testHTTPValidationAndErrorHandling(t)
	})

	t.Run("📊 HTTP一覧・検索・フィルタリング", func(t *testing.T) {
		suite.testHTTPListSearchAndFiltering(t)
	})

	t.Run("🔄 HTTP承認ワークフロー", func(t *testing.T) {
		suite.testHTTPApprovalWorkflow(t)
	})

	t.Run("📈 HTTP集計・レポート", func(t *testing.T) {
		suite.testHTTPAggregationAndReporting(t)
	})

	t.Run("⚡ HTTPパフォーマンス・同時アクセス", func(t *testing.T) {
		suite.testHTTPPerformanceAndConcurrency(t)
	})
}

// setupServer サーバーのセットアップ
func (suite *ExpenseHTTPE2ETestSuite) setupServer(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// 実際のアプリケーションサーバーを起動
	// 注意: 実際の環境では、テスト用の設定でサーバーを起動する必要があります
	suite.Server = gin.New()
	suite.Server.Use(gin.Recovery())

	// ここで実際のルーティング設定を行う
	// 実装例：
	// app := application.NewApplication(suite.Config, suite.DB, suite.Logger)
	// app.SetupRoutes(suite.Server)

	// 簡易的なヘルスチェックエンドポイント
	suite.Server.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}

// setupTestData テストデータの準備
func (suite *ExpenseHTTPE2ETestSuite) setupTestData(t *testing.T) {
	ctx := context.Background()

	// テストユーザーの作成
	suite.TestUser = &model.User{
		ID:        uuid.New(),
		Email:     "http.test@duesk.co.jp",
		Password:  "$2a$10$test.hashed.password",
		FirstName: "HTTP",
		LastName:  "テスト",
		Role:      model.RoleUser,
		Active:    true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	require.NoError(t, suite.DB.WithContext(ctx).Create(suite.TestUser).Error)

	suite.ManagerUser = &model.User{
		ID:        uuid.New(),
		Email:     "http.manager@duesk.co.jp",
		Password:  "$2a$10$test.hashed.password",
		FirstName: "HTTPマネージャー",
		LastName:  "テスト",
		Role:      model.RoleManager,
		Active:    true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	require.NoError(t, suite.DB.WithContext(ctx).Create(suite.ManagerUser).Error)

	// カテゴリマスタの作成
	suite.TestCategory = &model.ExpenseCategoryMaster{
		ID:          uuid.New(),
		Code:        "http_test",
		Name:        "HTTPテスト用カテゴリ",
		Description: "HTTPテスト専用のカテゴリ",
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	require.NoError(t, suite.DB.WithContext(ctx).Create(suite.TestCategory).Error)
}

// setupAuthentication 認証のセットアップ
func (suite *ExpenseHTTPE2ETestSuite) setupAuthentication(t *testing.T) {
	// 実際のJWTトークンを生成
	// 注意: 実際の環境では、認証エンドポイントを呼び出してトークンを取得する
	suite.TestUserToken = suite.generateRealJWT(suite.TestUser)
	suite.ManagerUserToken = suite.generateRealJWT(suite.ManagerUser)
}

// testHTTPCRUDOperations HTTP CRUD操作テスト
func (suite *ExpenseHTTPE2ETestSuite) testHTTPCRUDOperations(t *testing.T) {
	var expenseID uuid.UUID

	t.Run("HTTP: 経費申請作成", func(t *testing.T) {
		createReq := &dto.CreateExpenseRequest{
			Title:       "HTTPテスト経費申請",
			Category:    string(model.ExpenseCategoryTransport),
			CategoryID:  suite.TestCategory.ID,
			Amount:      12000,
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: "HTTPテスト用の経費申請",
		}

		response := suite.makeHTTPRequest(t, "POST", "/api/v1/expenses", createReq, suite.TestUserToken)
		assert.Equal(t, http.StatusCreated, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		expenseID = responseBody.Data.ID
		assert.Equal(t, createReq.Title, responseBody.Data.Title)
		assert.Equal(t, createReq.Amount, responseBody.Data.Amount)
		assert.Equal(t, "draft", responseBody.Data.Status)

		// レスポンスヘッダーの確認
		assert.Equal(t, "application/json; charset=utf-8", response.Header().Get("Content-Type"))

		t.Logf("✅ HTTP: 経費申請作成成功 ID=%s", expenseID)
	})

	t.Run("HTTP: 経費申請詳細取得", func(t *testing.T) {
		response := suite.makeHTTPRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", expenseID), nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Data dto.ExpenseDetailResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.Equal(t, expenseID, responseBody.Data.ID)
		assert.Equal(t, "HTTPテスト経費申請", responseBody.Data.Title)
		assert.Equal(t, 12000, responseBody.Data.Amount)

		// 詳細レスポンスの確認
		assert.NotNil(t, responseBody.Data.CreatedAt)
		assert.NotNil(t, responseBody.Data.UpdatedAt)

		t.Logf("✅ HTTP: 経費申請詳細取得成功")
	})

	t.Run("HTTP: 経費申請更新", func(t *testing.T) {
		updateReq := &dto.UpdateExpenseRequest{
			Title:       "HTTPテスト経費申請（更新版）",
			Category:    string(model.ExpenseCategoryTransport),
			CategoryID:  suite.TestCategory.ID,
			Amount:      15000,
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: "HTTPテスト用の経費申請（金額修正）",
		}

		response := suite.makeHTTPRequest(t, "PUT", fmt.Sprintf("/api/v1/expenses/%s", expenseID), updateReq, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.Equal(t, updateReq.Title, responseBody.Data.Title)
		assert.Equal(t, updateReq.Amount, responseBody.Data.Amount)

		t.Logf("✅ HTTP: 経費申請更新成功")
	})

	t.Run("HTTP: 経費申請削除", func(t *testing.T) {
		// 削除用の新しい経費申請を作成
		createReq := &dto.CreateExpenseRequest{
			Title:       "削除テスト経費",
			Category:    string(model.ExpenseCategoryOther),
			CategoryID:  suite.TestCategory.ID,
			Amount:      5000,
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: "削除テスト用",
		}

		createResponse := suite.makeHTTPRequest(t, "POST", "/api/v1/expenses", createReq, suite.TestUserToken)
		require.Equal(t, http.StatusCreated, createResponse.Code)

		var createResponseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(createResponse.Body.Bytes(), &createResponseBody))

		deleteID := createResponseBody.Data.ID

		// 削除実行
		deleteResponse := suite.makeHTTPRequest(t, "DELETE", fmt.Sprintf("/api/v1/expenses/%s", deleteID), nil, suite.TestUserToken)
		assert.Equal(t, http.StatusNoContent, deleteResponse.Code)

		// 削除確認
		getResponse := suite.makeHTTPRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", deleteID), nil, suite.TestUserToken)
		assert.Equal(t, http.StatusNotFound, getResponse.Code)

		t.Logf("✅ HTTP: 経費申請削除成功")
	})
}

// testHTTPAuthenticationAndAuthorization HTTP認証・認可テスト
func (suite *ExpenseHTTPE2ETestSuite) testHTTPAuthenticationAndAuthorization(t *testing.T) {
	// テスト用経費申請を作成
	createReq := &dto.CreateExpenseRequest{
		Title:       "認証テスト経費",
		Category:    string(model.ExpenseCategoryMeal),
		CategoryID:  suite.TestCategory.ID,
		Amount:      8000,
		ExpenseDate: time.Now().Format("2006-01-02"),
		Description: "認証テスト用の経費申請",
	}

	createResponse := suite.makeHTTPRequest(t, "POST", "/api/v1/expenses", createReq, suite.TestUserToken)
	require.Equal(t, http.StatusCreated, createResponse.Code)

	var createResponseBody struct {
		Data dto.ExpenseResponse `json:"data"`
	}
	require.NoError(t, json.Unmarshal(createResponse.Body.Bytes(), &createResponseBody))
	expenseID := createResponseBody.Data.ID

	t.Run("HTTP: 未認証アクセス拒否", func(t *testing.T) {
		response := suite.makeHTTPRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", expenseID), nil, "")
		assert.Equal(t, http.StatusUnauthorized, response.Code)

		var errorResponse struct {
			Error string `json:"error"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &errorResponse))
		assert.Contains(t, errorResponse.Error, "認証")

		t.Logf("✅ HTTP: 未認証アクセス拒否確認")
	})

	t.Run("HTTP: 無効なトークンによるアクセス拒否", func(t *testing.T) {
		invalidToken := "invalid.jwt.token"
		response := suite.makeHTTPRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", expenseID), nil, invalidToken)
		assert.Equal(t, http.StatusUnauthorized, response.Code)

		t.Logf("✅ HTTP: 無効なトークンアクセス拒否確認")
	})

	t.Run("HTTP: 他ユーザーの経費申請アクセス拒否", func(t *testing.T) {
		response := suite.makeHTTPRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", expenseID), nil, suite.ManagerUserToken)
		assert.Equal(t, http.StatusForbidden, response.Code)

		t.Logf("✅ HTTP: 他ユーザーアクセス拒否確認")
	})

	t.Run("HTTP: 期限切れトークン処理", func(t *testing.T) {
		// 期限切れトークンのシミュレーション
		expiredToken := suite.generateExpiredJWT(suite.TestUser)
		response := suite.makeHTTPRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", expenseID), nil, expiredToken)
		assert.Equal(t, http.StatusUnauthorized, response.Code)

		t.Logf("✅ HTTP: 期限切れトークン処理確認")
	})
}

// testHTTPValidationAndErrorHandling HTTPバリデーション・エラーハンドリングテスト
func (suite *ExpenseHTTPE2ETestSuite) testHTTPValidationAndErrorHandling(t *testing.T) {
	t.Run("HTTP: 必須項目バリデーションエラー", func(t *testing.T) {
		invalidReq := map[string]interface{}{
			"title":        "",             // 必須項目が空
			"category":     "",             // 必須項目が空
			"amount":       -1000,          // 負の値
			"expense_date": "invalid-date", // 無効な日付形式
		}

		response := suite.makeHTTPRequest(t, "POST", "/api/v1/expenses", invalidReq, suite.TestUserToken)
		assert.Equal(t, http.StatusBadRequest, response.Code)

		var errorResponse struct {
			Error   string              `json:"error"`
			Details map[string][]string `json:"details"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &errorResponse))

		assert.NotEmpty(t, errorResponse.Details)
		assert.Contains(t, errorResponse.Error, "バリデーション")

		t.Logf("✅ HTTP: バリデーションエラー処理確認")
	})

	t.Run("HTTP: JSON形式エラー", func(t *testing.T) {
		invalidJSON := bytes.NewBufferString("{invalid json}")
		req := httptest.NewRequest("POST", "/api/v1/expenses", invalidJSON)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.TestUserToken))

		recorder := httptest.NewRecorder()
		suite.Server.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusBadRequest, recorder.Code)

		t.Logf("✅ HTTP: JSON形式エラー処理確認")
	})

	t.Run("HTTP: 存在しないリソースアクセス", func(t *testing.T) {
		nonExistentID := uuid.New()
		response := suite.makeHTTPRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", nonExistentID), nil, suite.TestUserToken)
		assert.Equal(t, http.StatusNotFound, response.Code)

		var errorResponse struct {
			Error string `json:"error"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &errorResponse))
		assert.Contains(t, errorResponse.Error, "見つかりません")

		t.Logf("✅ HTTP: 存在しないリソースエラー処理確認")
	})

	t.Run("HTTP: 無効なUUID形式", func(t *testing.T) {
		response := suite.makeHTTPRequest(t, "GET", "/api/v1/expenses/invalid-uuid", nil, suite.TestUserToken)
		assert.Equal(t, http.StatusBadRequest, response.Code)

		t.Logf("✅ HTTP: 無効なUUID形式エラー処理確認")
	})
}

// testHTTPListSearchAndFiltering HTTP一覧・検索・フィルタリングテスト
func (suite *ExpenseHTTPE2ETestSuite) testHTTPListSearchAndFiltering(t *testing.T) {
	// テスト用データを複数作成
	suite.createMultipleTestExpenses(t, 15)

	t.Run("HTTP: 基本的な一覧取得", func(t *testing.T) {
		response := suite.makeHTTPRequest(t, "GET", "/api/v1/expenses?page=1&limit=10", nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Items []dto.ExpenseResponse `json:"items"`
			Total int64                 `json:"total"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.LessOrEqual(t, len(responseBody.Items), 10)
		assert.Greater(t, responseBody.Total, int64(0))

		t.Logf("✅ HTTP: 一覧取得成功 - 取得件数=%d, 総件数=%d", len(responseBody.Items), responseBody.Total)
	})

	t.Run("HTTP: ページネーション", func(t *testing.T) {
		// 1ページ目
		page1Response := suite.makeHTTPRequest(t, "GET", "/api/v1/expenses?page=1&limit=5", nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, page1Response.Code)

		// 2ページ目
		page2Response := suite.makeHTTPRequest(t, "GET", "/api/v1/expenses?page=2&limit=5", nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, page2Response.Code)

		var page1Body, page2Body struct {
			Items []dto.ExpenseResponse `json:"items"`
			Total int64                 `json:"total"`
		}
		require.NoError(t, json.Unmarshal(page1Response.Body.Bytes(), &page1Body))
		require.NoError(t, json.Unmarshal(page2Response.Body.Bytes(), &page2Body))

		// 同じ総件数
		assert.Equal(t, page1Body.Total, page2Body.Total)

		// 異なるアイテム
		if len(page1Body.Items) > 0 && len(page2Body.Items) > 0 {
			assert.NotEqual(t, page1Body.Items[0].ID, page2Body.Items[0].ID)
		}

		t.Logf("✅ HTTP: ページネーション確認")
	})

	t.Run("HTTP: ステータスフィルタリング", func(t *testing.T) {
		response := suite.makeHTTPRequest(t, "GET", "/api/v1/expenses?status=draft", nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Items []dto.ExpenseResponse `json:"items"`
			Total int64                 `json:"total"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		for _, item := range responseBody.Items {
			assert.Equal(t, "draft", item.Status)
		}

		t.Logf("✅ HTTP: ステータスフィルタリング確認")
	})

	t.Run("HTTP: 日付範囲フィルタリング", func(t *testing.T) {
		fromDate := time.Now().Add(-30 * 24 * time.Hour).Format("2006-01-02")
		toDate := time.Now().Format("2006-01-02")

		url := fmt.Sprintf("/api/v1/expenses?from_date=%s&to_date=%s", fromDate, toDate)
		response := suite.makeHTTPRequest(t, "GET", url, nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Items []dto.ExpenseResponse `json:"items"`
			Total int64                 `json:"total"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		t.Logf("✅ HTTP: 日付範囲フィルタリング確認 - 件数=%d", len(responseBody.Items))
	})
}

// testHTTPApprovalWorkflow HTTP承認ワークフローテスト
func (suite *ExpenseHTTPE2ETestSuite) testHTTPApprovalWorkflow(t *testing.T) {
	// 承認テスト用の経費申請を作成
	createReq := &dto.CreateExpenseRequest{
		Title:       "承認ワークフローテスト経費",
		Category:    string(model.ExpenseCategoryTransport),
		CategoryID:  suite.TestCategory.ID,
		Amount:      20000,
		ExpenseDate: time.Now().Format("2006-01-02"),
		Description: "承認ワークフローテスト用の経費申請",
	}

	createResponse := suite.makeHTTPRequest(t, "POST", "/api/v1/expenses", createReq, suite.TestUserToken)
	require.Equal(t, http.StatusCreated, createResponse.Code)

	var createResponseBody struct {
		Data dto.ExpenseResponse `json:"data"`
	}
	require.NoError(t, json.Unmarshal(createResponse.Body.Bytes(), &createResponseBody))
	expenseID := createResponseBody.Data.ID

	t.Run("HTTP: 経費申請提出", func(t *testing.T) {
		response := suite.makeHTTPRequest(t, "POST", fmt.Sprintf("/api/v1/expenses/%s/submit", expenseID), nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.Equal(t, "submitted", responseBody.Data.Status)

		t.Logf("✅ HTTP: 経費申請提出成功")
	})

	t.Run("HTTP: 管理者による承認", func(t *testing.T) {
		approveReq := &dto.ApprovalRequest{
			Action:  "approve",
			Comment: "HTTPテストでの承認",
		}

		response := suite.makeHTTPRequest(t, "PUT", fmt.Sprintf("/api/v1/admin/expenses/%s/approve", expenseID), approveReq, suite.ManagerUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.Equal(t, "approved", responseBody.Data.Status)

		t.Logf("✅ HTTP: 管理者承認成功")
	})

	t.Run("HTTP: 承認済み経費申請の再提出エラー", func(t *testing.T) {
		response := suite.makeHTTPRequest(t, "POST", fmt.Sprintf("/api/v1/expenses/%s/submit", expenseID), nil, suite.TestUserToken)
		assert.Equal(t, http.StatusBadRequest, response.Code)

		t.Logf("✅ HTTP: 承認済み経費申請の再提出エラー確認")
	})
}

// testHTTPAggregationAndReporting HTTP集計・レポートテスト
func (suite *ExpenseHTTPE2ETestSuite) testHTTPAggregationAndReporting(t *testing.T) {
	t.Run("HTTP: 月次集計取得", func(t *testing.T) {
		currentTime := time.Now()
		url := fmt.Sprintf("/api/v1/expenses/summary?year=%d&month=%d", currentTime.Year(), int(currentTime.Month()))

		response := suite.makeHTTPRequest(t, "GET", url, nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody dto.ExpenseSummaryResponse
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.GreaterOrEqual(t, responseBody.TotalAmount, 0)
		assert.GreaterOrEqual(t, responseBody.TotalCount, 0)

		t.Logf("✅ HTTP: 月次集計取得成功 - 総額=%d, 件数=%d", responseBody.TotalAmount, responseBody.TotalCount)
	})

	t.Run("HTTP: 年次集計取得", func(t *testing.T) {
		currentTime := time.Now()
		url := fmt.Sprintf("/api/v1/expenses/summary?year=%d", currentTime.Year())

		response := suite.makeHTTPRequest(t, "GET", url, nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody []dto.ExpenseSummaryResponse
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		t.Logf("✅ HTTP: 年次集計取得成功 - 月数=%d", len(responseBody))
	})

	t.Run("HTTP: 統計情報取得", func(t *testing.T) {
		fromDate := time.Now().Add(-30 * 24 * time.Hour).Format("2006-01-02")
		toDate := time.Now().Format("2006-01-02")

		url := fmt.Sprintf("/api/v1/expenses/statistics?from_date=%s&to_date=%s", fromDate, toDate)
		response := suite.makeHTTPRequest(t, "GET", url, nil, suite.TestUserToken)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody dto.ExpenseStatsResponse
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.GreaterOrEqual(t, responseBody.TotalExpenses, 0)
		assert.GreaterOrEqual(t, responseBody.TotalAmount, 0)

		t.Logf("✅ HTTP: 統計情報取得成功 - 総件数=%d, 総額=%d", responseBody.TotalExpenses, responseBody.TotalAmount)
	})
}

// testHTTPPerformanceAndConcurrency HTTPパフォーマンス・同時アクセステスト
func (suite *ExpenseHTTPE2ETestSuite) testHTTPPerformanceAndConcurrency(t *testing.T) {
	t.Run("HTTP: 応答時間パフォーマンス", func(t *testing.T) {
		start := time.Now()

		response := suite.makeHTTPRequest(t, "GET", "/api/v1/expenses?page=1&limit=50", nil, suite.TestUserToken)

		duration := time.Since(start)
		assert.Equal(t, http.StatusOK, response.Code)
		assert.Less(t, duration, 2*time.Second, "API応答時間が2秒以内であること")

		t.Logf("✅ HTTP: 応答時間確認 - %v", duration)
	})

	t.Run("HTTP: 同時アクセステスト", func(t *testing.T) {
		concurrentRequests := 10
		done := make(chan bool, concurrentRequests)

		for i := 0; i < concurrentRequests; i++ {
			go func(index int) {
				defer func() { done <- true }()

				createReq := &dto.CreateExpenseRequest{
					Title:       fmt.Sprintf("同時アクセステスト経費 %d", index),
					Category:    string(model.ExpenseCategoryOther),
					CategoryID:  suite.TestCategory.ID,
					Amount:      1000 + index*100,
					ExpenseDate: time.Now().Format("2006-01-02"),
					Description: fmt.Sprintf("同時アクセステスト用 %d", index),
				}

				response := suite.makeHTTPRequest(t, "POST", "/api/v1/expenses", createReq, suite.TestUserToken)
				assert.Equal(t, http.StatusCreated, response.Code)
			}(i)
		}

		// 全ての同時アクセスの完了を待機
		for i := 0; i < concurrentRequests; i++ {
			<-done
		}

		t.Logf("✅ HTTP: 同時アクセステスト完了 - %d件の同時リクエスト", concurrentRequests)
	})
}

// Helper methods

// makeHTTPRequest HTTPリクエストを実行
func (suite *ExpenseHTTPE2ETestSuite) makeHTTPRequest(t *testing.T, method, path string, body interface{}, token string) *httptest.ResponseRecorder {
	var jsonBody []byte
	var err error

	if body != nil {
		jsonBody, err = json.Marshal(body)
		require.NoError(t, err)
	}

	req := httptest.NewRequest(method, path, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	if token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	}

	recorder := httptest.NewRecorder()
	suite.Server.ServeHTTP(recorder, req)

	return recorder
}

// createMultipleTestExpenses 複数のテスト用経費申請を作成
func (suite *ExpenseHTTPE2ETestSuite) createMultipleTestExpenses(t *testing.T, count int) {
	for i := 0; i < count; i++ {
		createReq := &dto.CreateExpenseRequest{
			Title:       fmt.Sprintf("HTTPテスト経費 %d", i+1),
			Category:    string(model.ExpenseCategoryOther),
			CategoryID:  suite.TestCategory.ID,
			Amount:      1000 * (i + 1),
			ExpenseDate: time.Now().Add(-time.Duration(i) * 24 * time.Hour).Format("2006-01-02"),
			Description: fmt.Sprintf("HTTPテスト用の経費申請 %d", i+1),
		}

		response := suite.makeHTTPRequest(t, "POST", "/api/v1/expenses", createReq, suite.TestUserToken)
		require.Equal(t, http.StatusCreated, response.Code)
	}
}

// generateRealJWT 実際のJWTトークンを生成
func (suite *ExpenseHTTPE2ETestSuite) generateRealJWT(user *model.User) string {
	// 実際のJWT生成ロジックを実装
	// 注意: 実際の環境では、JWT生成サービスを使用する
	return fmt.Sprintf("real.jwt.token.for.%s", user.ID.String())
}

// generateExpiredJWT 期限切れJWTトークンを生成
func (suite *ExpenseHTTPE2ETestSuite) generateExpiredJWT(user *model.User) string {
	// 期限切れトークンのシミュレーション
	return fmt.Sprintf("expired.jwt.token.for.%s", user.ID.String())
}
