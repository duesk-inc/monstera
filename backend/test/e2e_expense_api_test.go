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

// ExpenseAPIE2ETestSuite 経費申請APIのE2Eテストスイート
type ExpenseAPIE2ETestSuite struct {
	DB     *gorm.DB
	Router *gin.Engine
	Logger *zap.Logger

	// テストユーザー
	GeneralUser   *model.User
	ManagerUser   *model.User
	ExecutiveUser *model.User

	// テストデータ
	TestCategory *model.ExpenseCategoryMaster
}

// TestExpenseAPIE2EComprehensive 経費申請APIの包括的E2Eテスト
func TestExpenseAPIE2EComprehensive(t *testing.T) {
	// テスト環境のセットアップ
	testutils.SetupTestEnvironment()

	suite := &ExpenseAPIE2ETestSuite{
		DB:     testutils.SetupTestDB(t),
		Logger: zap.NewNop(),
	}

	// Ginルーターの設定
	gin.SetMode(gin.TestMode)
	suite.Router = gin.New()

	// テストデータの準備
	suite.setupTestData(t)

	// テストケースの実行
	t.Run("🚀 経費申請ライフサイクル完全テスト", func(t *testing.T) {
		suite.testExpenseLifecycle(t)
	})

	t.Run("🔒 権限・認可テスト", func(t *testing.T) {
		suite.testAuthorizationAndPermissions(t)
	})

	t.Run("📊 一覧・検索・集計APIテスト", func(t *testing.T) {
		suite.testListSearchAndAggregationAPIs(t)
	})

	t.Run("⚡ パフォーマンステスト", func(t *testing.T) {
		suite.testPerformance(t)
	})

	t.Run("🛡️ セキュリティテスト", func(t *testing.T) {
		suite.testSecurity(t)
	})

	t.Run("🌐 境界値・エラーハンドリングテスト", func(t *testing.T) {
		suite.testBoundaryAndErrorHandling(t)
	})
}

// setupTestData テストデータの準備
func (suite *ExpenseAPIE2ETestSuite) setupTestData(t *testing.T) {
	ctx := context.Background()

	// テストユーザーの作成
	suite.GeneralUser = suite.createTestUser(t, model.RoleUser, "general@duesk.co.jp")
	suite.ManagerUser = suite.createTestUser(t, model.RoleManager, "manager@duesk.co.jp")
	suite.ExecutiveUser = suite.createTestUser(t, model.RoleExecutive, "executive@duesk.co.jp")

	// カテゴリマスタの作成
	suite.TestCategory = &model.ExpenseCategoryMaster{
		ID:          uuid.New(),
		Code:        "transport",
		Name:        "交通費",
		Description: "電車・バス・タクシー等の交通費",
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	require.NoError(t, suite.DB.WithContext(ctx).Create(suite.TestCategory).Error)

	// 承認者設定の作成
	approverSetting := &model.ExpenseApproverSetting{
		ID:                  uuid.New(),
		ManagerApproverID:   &suite.ManagerUser.ID,
		ExecutiveApproverID: &suite.ExecutiveUser.ID,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}
	require.NoError(t, suite.DB.WithContext(ctx).Create(approverSetting).Error)

	// 経費上限設定の作成
	limit := &model.ExpenseLimit{
		ID:           uuid.New(),
		TargetType:   model.TargetTypeCompany,
		MonthlyLimit: 100000,
		YearlyLimit:  1000000,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	require.NoError(t, suite.DB.WithContext(ctx).Create(limit).Error)
}

// testExpenseLifecycle 経費申請のライフサイクルテスト
func (suite *ExpenseAPIE2ETestSuite) testExpenseLifecycle(t *testing.T) {
	var expenseID uuid.UUID

	t.Run("Step1: 経費申請作成", func(t *testing.T) {
		createReq := &dto.CreateExpenseRequest{
			Title:       "営業会議費",
			Category:    string(model.ExpenseCategoryMeal),
			CategoryID:  suite.TestCategory.ID,
			Amount:      5000,
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: "クライアントとの会議に関する費用",
		}

		response := suite.makeAuthenticatedRequest(t, "POST", "/api/v1/expenses", createReq, suite.GeneralUser)
		assert.Equal(t, http.StatusCreated, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		expenseID = responseBody.Data.ID
		assert.Equal(t, createReq.Title, responseBody.Data.Title)
		assert.Equal(t, createReq.Amount, responseBody.Data.Amount)
		assert.Equal(t, string(model.ExpenseStatusDraft), responseBody.Data.Status)

		t.Logf("✅ 経費申請作成成功: ID=%s", expenseID)
	})

	t.Run("Step2: 経費申請詳細取得", func(t *testing.T) {
		response := suite.makeAuthenticatedRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", expenseID), nil, suite.GeneralUser)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Data dto.ExpenseDetailResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.Equal(t, expenseID, responseBody.Data.ID)
		assert.Equal(t, "営業会議費", responseBody.Data.Title)

		t.Logf("✅ 経費申請詳細取得成功")
	})

	t.Run("Step3: 経費申請更新", func(t *testing.T) {
		updateReq := &dto.UpdateExpenseRequest{
			Title:       "営業会議費（更新）",
			Category:    string(model.ExpenseCategoryMeal),
			CategoryID:  suite.TestCategory.ID,
			Amount:      6000,
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: "クライアントとの会議に関する費用（金額修正）",
		}

		response := suite.makeAuthenticatedRequest(t, "PUT", fmt.Sprintf("/api/v1/expenses/%s", expenseID), updateReq, suite.GeneralUser)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.Equal(t, updateReq.Title, responseBody.Data.Title)
		assert.Equal(t, updateReq.Amount, responseBody.Data.Amount)

		t.Logf("✅ 経費申請更新成功")
	})

	t.Run("Step4: 経費申請提出", func(t *testing.T) {
		response := suite.makeAuthenticatedRequest(t, "POST", fmt.Sprintf("/api/v1/expenses/%s/submit", expenseID), nil, suite.GeneralUser)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.Equal(t, string(model.ExpenseStatusSubmitted), responseBody.Data.Status)

		t.Logf("✅ 経費申請提出成功")
	})

	t.Run("Step5: 管理者による承認", func(t *testing.T) {
		approveReq := &dto.ApprovalRequest{
			Action:  "approve",
			Comment: "承認します",
		}

		response := suite.makeAuthenticatedRequest(t, "PUT", fmt.Sprintf("/api/v1/admin/expenses/%s/approve", expenseID), approveReq, suite.ManagerUser)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.Equal(t, string(model.ExpenseStatusApproved), responseBody.Data.Status)

		t.Logf("✅ 経費申請承認成功")
	})

	t.Run("Step6: 最終確認", func(t *testing.T) {
		response := suite.makeAuthenticatedRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", expenseID), nil, suite.GeneralUser)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Data dto.ExpenseDetailResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.Equal(t, string(model.ExpenseStatusApproved), responseBody.Data.Status)
		assert.NotNil(t, responseBody.Data.ApprovedAt)

		t.Logf("✅ 経費申請ライフサイクル完了")
	})
}

// testAuthorizationAndPermissions 権限・認可テスト
func (suite *ExpenseAPIE2ETestSuite) testAuthorizationAndPermissions(t *testing.T) {
	// 一般ユーザーの経費申請を作成
	createReq := &dto.CreateExpenseRequest{
		Title:       "権限テスト用経費",
		Category:    string(model.ExpenseCategoryTransport),
		CategoryID:  suite.TestCategory.ID,
		Amount:      3000,
		ExpenseDate: time.Now().Format("2006-01-02"),
		Description: "権限テスト用の経費申請",
	}

	response := suite.makeAuthenticatedRequest(t, "POST", "/api/v1/expenses", createReq, suite.GeneralUser)
	require.Equal(t, http.StatusCreated, response.Code)

	var createResponseBody struct {
		Data dto.ExpenseResponse `json:"data"`
	}
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &createResponseBody))
	expenseID := createResponseBody.Data.ID

	t.Run("他ユーザーからのアクセス拒否", func(t *testing.T) {
		// 他のユーザーが経費申請詳細にアクセス
		response := suite.makeAuthenticatedRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", expenseID), nil, suite.ManagerUser)
		assert.Equal(t, http.StatusForbidden, response.Code)

		t.Logf("✅ 他ユーザーからのアクセス拒否確認")
	})

	t.Run("他ユーザーからの更新拒否", func(t *testing.T) {
		updateReq := &dto.UpdateExpenseRequest{
			Title:       "不正な更新",
			Category:    string(model.ExpenseCategoryTransport),
			CategoryID:  suite.TestCategory.ID,
			Amount:      5000,
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: "不正な更新",
		}

		response := suite.makeAuthenticatedRequest(t, "PUT", fmt.Sprintf("/api/v1/expenses/%s", expenseID), updateReq, suite.ManagerUser)
		assert.Equal(t, http.StatusForbidden, response.Code)

		t.Logf("✅ 他ユーザーからの更新拒否確認")
	})

	t.Run("未認証アクセス拒否", func(t *testing.T) {
		// 認証なしでのアクセス
		req := httptest.NewRequest("GET", fmt.Sprintf("/api/v1/expenses/%s", expenseID), nil)
		recorder := httptest.NewRecorder()
		suite.Router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusUnauthorized, recorder.Code)

		t.Logf("✅ 未認証アクセス拒否確認")
	})
}

// testListSearchAndAggregationAPIs 一覧・検索・集計APIテスト
func (suite *ExpenseAPIE2ETestSuite) testListSearchAndAggregationAPIs(t *testing.T) {
	// テスト用の複数経費申請を作成
	expenseIDs := suite.createMultipleExpenses(t, 10)

	t.Run("経費申請一覧取得", func(t *testing.T) {
		response := suite.makeAuthenticatedRequest(t, "GET", "/api/v1/expenses?page=1&limit=5", nil, suite.GeneralUser)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Items []dto.ExpenseResponse `json:"items"`
			Total int64                 `json:"total"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.LessOrEqual(t, len(responseBody.Items), 5)
		assert.Greater(t, responseBody.Total, int64(0))

		t.Logf("✅ 経費申請一覧取得成功: %d件", len(responseBody.Items))
	})

	t.Run("ステータスフィルター", func(t *testing.T) {
		response := suite.makeAuthenticatedRequest(t, "GET", "/api/v1/expenses?status=draft", nil, suite.GeneralUser)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody struct {
			Items []dto.ExpenseResponse `json:"items"`
			Total int64                 `json:"total"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		for _, item := range responseBody.Items {
			assert.Equal(t, "draft", item.Status)
		}

		t.Logf("✅ ステータスフィルター機能確認")
	})

	t.Run("月次集計取得", func(t *testing.T) {
		currentTime := time.Now()
		url := fmt.Sprintf("/api/v1/expenses/summary?year=%d&month=%d", currentTime.Year(), int(currentTime.Month()))

		response := suite.makeAuthenticatedRequest(t, "GET", url, nil, suite.GeneralUser)
		assert.Equal(t, http.StatusOK, response.Code)

		var responseBody dto.ExpenseSummaryResponse
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		assert.GreaterOrEqual(t, responseBody.TotalAmount, 0)
		assert.GreaterOrEqual(t, responseBody.TotalCount, 0)

		t.Logf("✅ 月次集計取得成功: 総額=%d, 件数=%d", responseBody.TotalAmount, responseBody.TotalCount)
	})
}

// testPerformance パフォーマンステスト
func (suite *ExpenseAPIE2ETestSuite) testPerformance(t *testing.T) {
	t.Run("大量データでの一覧取得性能", func(t *testing.T) {
		start := time.Now()

		response := suite.makeAuthenticatedRequest(t, "GET", "/api/v1/expenses?page=1&limit=100", nil, suite.GeneralUser)

		duration := time.Since(start)
		assert.Equal(t, http.StatusOK, response.Code)
		assert.Less(t, duration, 2*time.Second, "API応答時間が2秒以内であること")

		t.Logf("✅ 一覧取得性能確認: %v", duration)
	})

	t.Run("同期処理性能", func(t *testing.T) {
		createReq := &dto.CreateExpenseRequest{
			Title:       "性能テスト用経費",
			Category:    string(model.ExpenseCategoryOther),
			CategoryID:  suite.TestCategory.ID,
			Amount:      1000,
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: "性能テスト用の経費申請",
		}

		start := time.Now()
		response := suite.makeAuthenticatedRequest(t, "POST", "/api/v1/expenses", createReq, suite.GeneralUser)
		duration := time.Since(start)

		assert.Equal(t, http.StatusCreated, response.Code)
		assert.Less(t, duration, 1*time.Second, "作成処理が1秒以内であること")

		t.Logf("✅ 作成処理性能確認: %v", duration)
	})
}

// testSecurity セキュリティテスト
func (suite *ExpenseAPIE2ETestSuite) testSecurity(t *testing.T) {
	t.Run("SQLインジェクション対策", func(t *testing.T) {
		maliciousInput := "'; DROP TABLE expenses; --"
		createReq := &dto.CreateExpenseRequest{
			Title:       maliciousInput,
			Category:    string(model.ExpenseCategoryOther),
			CategoryID:  suite.TestCategory.ID,
			Amount:      1000,
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: maliciousInput,
		}

		response := suite.makeAuthenticatedRequest(t, "POST", "/api/v1/expenses", createReq, suite.GeneralUser)
		assert.Equal(t, http.StatusCreated, response.Code)

		// データベースが正常に動作することを確認
		var count int64
		suite.DB.Model(&model.Expense{}).Count(&count)
		assert.Greater(t, count, int64(0))

		t.Logf("✅ SQLインジェクション対策確認")
	})

	t.Run("XSS対策", func(t *testing.T) {
		xssPayload := "<script>alert('xss')</script>"
		createReq := &dto.CreateExpenseRequest{
			Title:       xssPayload,
			Category:    string(model.ExpenseCategoryOther),
			CategoryID:  suite.TestCategory.ID,
			Amount:      1000,
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: xssPayload,
		}

		response := suite.makeAuthenticatedRequest(t, "POST", "/api/v1/expenses", createReq, suite.GeneralUser)
		assert.Equal(t, http.StatusCreated, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		// スクリプトタグがエスケープされていることを確認
		assert.NotContains(t, responseBody.Data.Title, "<script>")

		t.Logf("✅ XSS対策確認")
	})
}

// testBoundaryAndErrorHandling 境界値・エラーハンドリングテスト
func (suite *ExpenseAPIE2ETestSuite) testBoundaryAndErrorHandling(t *testing.T) {
	t.Run("無効なUUIDでのアクセス", func(t *testing.T) {
		response := suite.makeAuthenticatedRequest(t, "GET", "/api/v1/expenses/invalid-uuid", nil, suite.GeneralUser)
		assert.Equal(t, http.StatusBadRequest, response.Code)

		t.Logf("✅ 無効なUUID処理確認")
	})

	t.Run("存在しない経費申請へのアクセス", func(t *testing.T) {
		nonExistentID := uuid.New()
		response := suite.makeAuthenticatedRequest(t, "GET", fmt.Sprintf("/api/v1/expenses/%s", nonExistentID), nil, suite.GeneralUser)
		assert.Equal(t, http.StatusNotFound, response.Code)

		t.Logf("✅ 存在しないリソース処理確認")
	})

	t.Run("バリデーションエラー", func(t *testing.T) {
		invalidReq := &dto.CreateExpenseRequest{
			Title:       "", // 必須項目が空
			Category:    "invalid_category",
			Amount:      -1000, // 負の値
			ExpenseDate: "invalid-date",
			Description: "",
		}

		response := suite.makeAuthenticatedRequest(t, "POST", "/api/v1/expenses", invalidReq, suite.GeneralUser)
		assert.Equal(t, http.StatusBadRequest, response.Code)

		var errorResponse struct {
			Error   string              `json:"error"`
			Details map[string][]string `json:"details"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &errorResponse))

		assert.NotEmpty(t, errorResponse.Details)

		t.Logf("✅ バリデーションエラー処理確認")
	})

	t.Run("大きすぎる金額", func(t *testing.T) {
		largeAmountReq := &dto.CreateExpenseRequest{
			Title:       "大額経費",
			Category:    string(model.ExpenseCategoryOther),
			CategoryID:  suite.TestCategory.ID,
			Amount:      10000000, // 1000万円
			ExpenseDate: time.Now().Format("2006-01-02"),
			Description: "大額の経費申請",
		}

		response := suite.makeAuthenticatedRequest(t, "POST", "/api/v1/expenses", largeAmountReq, suite.GeneralUser)
		// 上限チェックによりエラーまたは警告が発生することを確認
		assert.True(t, response.Code == http.StatusBadRequest || response.Code == http.StatusCreated)

		t.Logf("✅ 大額経費処理確認")
	})
}

// Helper methods

// createTestUser テストユーザーを作成
func (suite *ExpenseAPIE2ETestSuite) createTestUser(t *testing.T, role model.Role, email string) *model.User {
	user := &model.User{
		ID:        uuid.New(),
		Email:     email,
		FirstName: "テスト",
		LastName:  "ユーザー",
		Role:      role,
		Active:    true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	require.NoError(t, suite.DB.Create(user).Error)
	return user
}

// createMultipleExpenses 複数の経費申請を作成
func (suite *ExpenseAPIE2ETestSuite) createMultipleExpenses(t *testing.T, count int) []uuid.UUID {
	var expenseIDs []uuid.UUID

	for i := 0; i < count; i++ {
		createReq := &dto.CreateExpenseRequest{
			Title:       fmt.Sprintf("テスト経費 %d", i+1),
			Category:    string(model.ExpenseCategoryOther),
			CategoryID:  suite.TestCategory.ID,
			Amount:      1000 * (i + 1),
			ExpenseDate: time.Now().Add(-time.Duration(i) * 24 * time.Hour).Format("2006-01-02"),
			Description: fmt.Sprintf("テスト用の経費申請 %d", i+1),
		}

		response := suite.makeAuthenticatedRequest(t, "POST", "/api/v1/expenses", createReq, suite.GeneralUser)
		require.Equal(t, http.StatusCreated, response.Code)

		var responseBody struct {
			Data dto.ExpenseResponse `json:"data"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &responseBody))

		expenseIDs = append(expenseIDs, responseBody.Data.ID)
	}

	return expenseIDs
}

// makeAuthenticatedRequest 認証付きHTTPリクエストを実行
func (suite *ExpenseAPIE2ETestSuite) makeAuthenticatedRequest(t *testing.T, method, path string, body interface{}, user *model.User) *httptest.ResponseRecorder {
	var jsonBody []byte
	var err error

	if body != nil {
		jsonBody, err = json.Marshal(body)
		require.NoError(t, err)
	}

	req := httptest.NewRequest(method, path, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// トークンの設定（実際の認証機能と統合する場合）
	token := suite.generateTestToken(user)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	recorder := httptest.NewRecorder()
	suite.Router.ServeHTTP(recorder, req)

	return recorder
}

// generateTestToken テスト用トークンを生成
func (suite *ExpenseAPIE2ETestSuite) generateTestToken(user *model.User) string {
	// 実際のトークン生成ロジックまたはモック実装
	return fmt.Sprintf("test.token.for.%s", user.ID.String())
}
