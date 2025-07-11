package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockExpenseService ExpenseServiceのモック
type MockExpenseService struct {
	mock.Mock
}

func (m *MockExpenseService) Create(ctx context.Context, userID uuid.UUID, req *dto.CreateExpenseRequest) (*model.Expense, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Expense), args.Error(1)
}

func (m *MockExpenseService) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.ExpenseWithDetails, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ExpenseWithDetails), args.Error(1)
}

func (m *MockExpenseService) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.UpdateExpenseRequest) (*model.Expense, error) {
	args := m.Called(ctx, id, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Expense), args.Error(1)
}

func (m *MockExpenseService) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockExpenseService) List(ctx context.Context, userID uuid.UUID, filter *dto.ExpenseFilterRequest) (*dto.ExpenseListResponse, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseListResponse), args.Error(1)
}

func (m *MockExpenseService) ApproveExpense(ctx context.Context, id uuid.UUID, approverID uuid.UUID, req *dto.ApproveExpenseRequest) (*model.Expense, error) {
	args := m.Called(ctx, id, approverID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Expense), args.Error(1)
}

func (m *MockExpenseService) BulkUpdateCategories(ctx context.Context, req *dto.BulkUpdateCategoriesRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockExpenseService) CancelExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.CancelExpenseRequest) (*model.Expense, error) {
	args := m.Called(ctx, id, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Expense), args.Error(1)
}

func (m *MockExpenseService) CheckLimits(ctx context.Context, userID uuid.UUID, amount int, expenseDate time.Time) (*dto.LimitCheckResult, error) {
	args := m.Called(ctx, userID, amount, expenseDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.LimitCheckResult), args.Error(1)
}

func (m *MockExpenseService) CheckLimitsWithScope(ctx context.Context, userID uuid.UUID, departmentID *uuid.UUID, amount int, expenseDate time.Time) (*dto.LimitCheckResult, error) {
	args := m.Called(ctx, userID, departmentID, amount, expenseDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.LimitCheckResult), args.Error(1)
}

// Add other missing methods for complete interface implementation
func (m *MockExpenseService) ListAll(ctx context.Context, filter *dto.ExpenseFilterRequest) (*dto.ExpenseListResponse, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseListResponse), args.Error(1)
}

func (m *MockExpenseService) GetCategories(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.ExpenseCategoryMaster), args.Error(1)
}

func (m *MockExpenseService) GetActiveCategories(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.ExpenseCategoryMaster), args.Error(1)
}

func (m *MockExpenseService) GetCategoriesWithFilter(ctx context.Context, filter *dto.ExpenseCategoryListRequest) (*dto.ExpenseCategoryListResponse, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseCategoryListResponse), args.Error(1)
}

func (m *MockExpenseService) GetCategoryByID(ctx context.Context, id uuid.UUID) (*dto.ExpenseCategoryResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseCategoryResponse), args.Error(1)
}

func (m *MockExpenseService) CreateCategory(ctx context.Context, req *dto.CreateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseCategoryResponse), args.Error(1)
}

func (m *MockExpenseService) UpdateCategory(ctx context.Context, id uuid.UUID, req *dto.UpdateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error) {
	args := m.Called(ctx, id, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseCategoryResponse), args.Error(1)
}

func (m *MockExpenseService) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockExpenseService) ReorderCategories(ctx context.Context, req *dto.ReorderCategoriesRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockExpenseService) GetMonthlySummary(ctx context.Context, userID uuid.UUID, year int, month int) (*dto.ExpenseSummaryResponse, error) {
	args := m.Called(ctx, userID, year, month)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseSummaryResponse), args.Error(1)
}

func (m *MockExpenseService) GetYearlySummary(ctx context.Context, userID uuid.UUID, year int) (*dto.ExpenseYearlySummaryResponse, error) {
	args := m.Called(ctx, userID, year)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseYearlySummaryResponse), args.Error(1)
}

func (m *MockExpenseService) GetFiscalYearSummary(ctx context.Context, userID uuid.UUID, fiscalYear int) (*dto.ExpenseYearlySummaryResponse, error) {
	args := m.Called(ctx, userID, fiscalYear)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseYearlySummaryResponse), args.Error(1)
}

func (m *MockExpenseService) GetCurrentLimits(ctx context.Context) (*dto.ExpenseLimitResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseLimitResponse), args.Error(1)
}

func (m *MockExpenseService) GetExpenseLimits(ctx context.Context) ([]model.ExpenseLimit, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.ExpenseLimit), args.Error(1)
}

func (m *MockExpenseService) UpdateExpenseLimit(ctx context.Context, userID uuid.UUID, req *dto.UpdateExpenseLimitRequest) (*model.ExpenseLimit, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ExpenseLimit), args.Error(1)
}

func (m *MockExpenseService) GetExpenseLimitsWithScope(ctx context.Context, filter *dto.ExpenseLimitListRequest) (*dto.ExpenseLimitListResponse, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseLimitListResponse), args.Error(1)
}

func (m *MockExpenseService) GetExpenseLimitByID(ctx context.Context, id uuid.UUID) (*dto.ExpenseLimitDetailResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseLimitDetailResponse), args.Error(1)
}

func (m *MockExpenseService) CreateExpenseLimitWithScope(ctx context.Context, createdBy uuid.UUID, req *dto.CreateExpenseLimitRequest) (*dto.ExpenseLimitDetailResponse, error) {
	args := m.Called(ctx, createdBy, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseLimitDetailResponse), args.Error(1)
}

func (m *MockExpenseService) UpdateExpenseLimitWithScope(ctx context.Context, id uuid.UUID, createdBy uuid.UUID, req *dto.UpdateExpenseLimitV2Request) (*dto.ExpenseLimitDetailResponse, error) {
	args := m.Called(ctx, id, createdBy, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseLimitDetailResponse), args.Error(1)
}

func (m *MockExpenseService) DeleteExpenseLimitWithScope(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockExpenseService) GetExpenseLimitHistory(ctx context.Context, filter *dto.ExpenseLimitHistoryRequest) (*dto.ExpenseLimitHistoryResponse, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExpenseLimitHistoryResponse), args.Error(1)
}

func (m *MockExpenseService) SubmitExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.SubmitExpenseRequest) (*model.Expense, error) {
	args := m.Called(ctx, id, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Expense), args.Error(1)
}

func (m *MockExpenseService) RejectExpense(ctx context.Context, id uuid.UUID, approverID uuid.UUID, req *dto.RejectExpenseRequest) (*model.Expense, error) {
	args := m.Called(ctx, id, approverID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Expense), args.Error(1)
}

func (m *MockExpenseService) GetPendingApprovals(ctx context.Context, approverID uuid.UUID, filter *dto.ApprovalFilterRequest) (*dto.ApprovalListResponse, error) {
	args := m.Called(ctx, approverID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ApprovalListResponse), args.Error(1)
}

func (m *MockExpenseService) GenerateUploadURL(ctx context.Context, userID uuid.UUID, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.UploadURLResponse), args.Error(1)
}

func (m *MockExpenseService) CompleteUpload(ctx context.Context, userID uuid.UUID, req *dto.CompleteUploadRequest) (*dto.CompleteUploadResponse, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.CompleteUploadResponse), args.Error(1)
}

func (m *MockExpenseService) DeleteUploadedFile(ctx context.Context, userID uuid.UUID, req *dto.DeleteUploadRequest) error {
	args := m.Called(ctx, userID, req)
	return args.Error(0)
}

func (m *MockExpenseService) GetPendingExpenses(ctx context.Context, threshold time.Duration) ([]model.Expense, error) {
	args := m.Called(ctx, threshold)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.Expense), args.Error(1)
}

// MockS3Service S3Serviceのモック
type MockS3Service struct {
	mock.Mock
}

func (m *MockS3Service) GenerateUploadURL(ctx context.Context, userID uuid.UUID, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.UploadURLResponse), args.Error(1)
}

func (m *MockS3Service) DeleteFile(ctx context.Context, fileKey string) error {
	args := m.Called(ctx, fileKey)
	return args.Error(0)
}

func (m *MockS3Service) GeneratePresignedUploadURL(ctx context.Context, fileKey string, contentType string, expiration time.Duration) (string, map[string]string, error) {
	args := m.Called(ctx, fileKey, contentType, expiration)
	return args.String(0), args.Get(1).(map[string]string), args.Error(2)
}

// テストヘルパー関数
func setupGinContext(method, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)

	var bodyBytes []byte
	if body != nil {
		bodyBytes, _ = json.Marshal(body)
	}

	req := httptest.NewRequest(method, path, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req

	// 認証済みユーザーIDを設定
	userID := uuid.New()
	ctx.Set("user_id", userID)

	return ctx, w
}

// TestExpenseHandler_CreateExpense 経費申請作成のテスト
func TestExpenseHandler_CreateExpense(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    interface{}
		setupMocks     func(*MockExpenseService, *MockS3Service)
		expectedStatus int
		expectedError  bool
	}{
		{
			name: "正常に経費申請が作成される",
			requestBody: dto.CreateExpenseRequest{
				Title:       "テスト経費",
				Amount:      10000,
				CategoryID:  uuid.New(),
				Description: "テスト用の経費申請です",
			},
			setupMocks: func(expenseService *MockExpenseService, s3Service *MockS3Service) {
				expense := &model.Expense{
					ID:     uuid.New(),
					Title:  "テスト経費",
					Amount: 10000,
					Status: model.ExpenseStatusDraft,
				}
				expenseService.On("Create", mock.Anything, mock.Anything, mock.Anything).Return(expense, nil)
			},
			expectedStatus: http.StatusCreated,
			expectedError:  false,
		},
		{
			name: "不正なリクエストボディでエラー",
			requestBody: map[string]interface{}{
				"title":  "",    // 空文字列
				"amount": -1000, // 負の値
			},
			setupMocks:     func(expenseService *MockExpenseService, s3Service *MockS3Service) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// モックの初期化
			mockExpenseService := new(MockExpenseService)
			mockS3Service := new(MockS3Service)

			// モックの設定
			if tt.setupMocks != nil {
				tt.setupMocks(mockExpenseService, mockS3Service)
			}

			// ハンドラーの作成
			logger := zap.NewNop()
			handler := NewExpenseHandler(mockExpenseService, mockS3Service, logger)

			// リクエストの作成
			ctx, w := setupGinContext("POST", "/api/v1/expenses", tt.requestBody)

			// テストの実行
			handler.CreateExpense(ctx)

			// 結果の検証
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "error")
			} else {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")
			}

			// モックの検証
			mockExpenseService.AssertExpectations(t)
			mockS3Service.AssertExpectations(t)
		})
	}
}

// TestExpenseHandler_GetExpense 経費申請詳細取得のテスト
func TestExpenseHandler_GetExpense(t *testing.T) {
	tests := []struct {
		name           string
		expenseID      string
		setupMocks     func(*MockExpenseService, *MockS3Service, uuid.UUID)
		expectedStatus int
		expectedError  bool
	}{
		{
			name:      "正常に経費申請詳細を取得",
			expenseID: uuid.New().String(),
			setupMocks: func(expenseService *MockExpenseService, s3Service *MockS3Service, expenseID uuid.UUID) {
				response := &dto.ExpenseDetailResponse{
					ExpenseResponse: dto.ExpenseResponse{
						ID:     expenseID,
						Title:  "テスト経費",
						Amount: 10000,
						Status: "draft",
					},
				}
				expenseService.On("GetByID", mock.Anything, expenseID, mock.Anything).Return(response, nil)
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name:           "不正なUUID形式でエラー",
			expenseID:      "invalid-uuid",
			setupMocks:     func(expenseService *MockExpenseService, s3Service *MockS3Service, expenseID uuid.UUID) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// モックの初期化
			mockExpenseService := new(MockExpenseService)
			mockS3Service := new(MockS3Service)

			// UUIDの解析
			var expenseUUID uuid.UUID
			if tt.expenseID != "invalid-uuid" {
				expenseUUID, _ = uuid.Parse(tt.expenseID)
			}

			// モックの設定
			if tt.setupMocks != nil {
				tt.setupMocks(mockExpenseService, mockS3Service, expenseUUID)
			}

			// ハンドラーの作成
			logger := zap.NewNop()
			handler := NewExpenseHandler(mockExpenseService, mockS3Service, logger)

			// リクエストの作成
			ctx, w := setupGinContext("GET", "/api/v1/expenses/"+tt.expenseID, nil)
			ctx.Params = gin.Params{
				{Key: "id", Value: tt.expenseID},
			}

			// テストの実行
			handler.GetExpense(ctx)

			// 結果の検証
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "error")
			} else {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")
			}

			// モックの検証
			mockExpenseService.AssertExpectations(t)
			mockS3Service.AssertExpectations(t)
		})
	}
}

// TestExpenseHandler_DeleteExpense 経費申請削除のテスト
func TestExpenseHandler_DeleteExpense(t *testing.T) {
	tests := []struct {
		name           string
		expenseID      string
		setupMocks     func(*MockExpenseService, *MockS3Service, uuid.UUID)
		expectedStatus int
		expectedError  bool
	}{
		{
			name:      "正常に経費申請を削除",
			expenseID: uuid.New().String(),
			setupMocks: func(expenseService *MockExpenseService, s3Service *MockS3Service, expenseID uuid.UUID) {
				expenseService.On("Delete", mock.Anything, expenseID, mock.Anything).Return(nil)
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name:           "不正なUUID形式でエラー",
			expenseID:      "invalid-uuid",
			setupMocks:     func(expenseService *MockExpenseService, s3Service *MockS3Service, expenseID uuid.UUID) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// モックの初期化
			mockExpenseService := new(MockExpenseService)
			mockS3Service := new(MockS3Service)

			// UUIDの解析
			var expenseUUID uuid.UUID
			if tt.expenseID != "invalid-uuid" {
				expenseUUID, _ = uuid.Parse(tt.expenseID)
			}

			// モックの設定
			if tt.setupMocks != nil {
				tt.setupMocks(mockExpenseService, mockS3Service, expenseUUID)
			}

			// ハンドラーの作成
			logger := zap.NewNop()
			handler := NewExpenseHandler(mockExpenseService, mockS3Service, logger)

			// リクエストの作成
			ctx, w := setupGinContext("DELETE", "/api/v1/expenses/"+tt.expenseID, nil)
			ctx.Params = gin.Params{
				{Key: "id", Value: tt.expenseID},
			}

			// テストの実行
			handler.DeleteExpense(ctx)

			// 結果の検証
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "error")
			} else {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "message")
			}

			// モックの検証
			mockExpenseService.AssertExpectations(t)
			mockS3Service.AssertExpectations(t)
		})
	}
}
