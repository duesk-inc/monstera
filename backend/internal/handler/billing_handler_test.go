package handler

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
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
)

// MockBillingService BillingServiceのモック実装
type MockBillingService struct {
	mock.Mock
}

// PreviewBilling 請求プレビュー
func (m *MockBillingService) PreviewBilling(ctx context.Context, req *dto.BillingPreviewRequest) (*dto.BillingPreviewResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.BillingPreviewResponse), args.Error(1)
}

// PreviewClientBilling クライアント請求プレビュー
func (m *MockBillingService) PreviewClientBilling(ctx context.Context, clientID string, billingYear, billingMonth int) (*dto.ClientBillingPreview, error) {
	args := m.Called(ctx, clientID, billingYear, billingMonth)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ClientBillingPreview), args.Error(1)
}

// PreviewGroupBilling グループ請求プレビュー
func (m *MockBillingService) PreviewGroupBilling(ctx context.Context, groupID string, billingYear, billingMonth int) (*dto.GroupBillingPreview, error) {
	args := m.Called(ctx, groupID, billingYear, billingMonth)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.GroupBillingPreview), args.Error(1)
}

// CalculateProjectBilling プロジェクト請求計算
func (m *MockBillingService) CalculateProjectBilling(ctx context.Context, assignment *model.ProjectAssignment, year, month int) (*dto.ProjectBillingDetail, error) {
	args := m.Called(ctx, assignment, year, month)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProjectBillingDetail), args.Error(1)
}

// CalculateBillingAmount 請求額計算
func (m *MockBillingService) CalculateBillingAmount(billingType model.ProjectBillingType, monthlyRate float64, actualHours, lowerLimit, upperLimit *float64) (float64, error) {
	args := m.Called(billingType, monthlyRate, actualHours, lowerLimit, upperLimit)
	return args.Get(0).(float64), args.Error(1)
}

// GetBillingHistory 請求履歴取得
func (m *MockBillingService) GetBillingHistory(ctx context.Context, req *dto.BillingHistoryRequest) (*dto.BillingHistoryResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.BillingHistoryResponse), args.Error(1)
}

// GetClientBillingHistory クライアント請求履歴取得
func (m *MockBillingService) GetClientBillingHistory(ctx context.Context, clientID string, limit int) ([]dto.BillingHistoryItemDTO, error) {
	args := m.Called(ctx, clientID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.BillingHistoryItemDTO), args.Error(1)
}

// ValidateBillingPeriod 請求期間バリデーション
func (m *MockBillingService) ValidateBillingPeriod(year, month int) error {
	args := m.Called(year, month)
	return args.Error(0)
}

// CheckDuplicateBilling 重複請求チェック
func (m *MockBillingService) CheckDuplicateBilling(ctx context.Context, clientID string, billingMonth string) (bool, error) {
	args := m.Called(ctx, clientID, billingMonth)
	return args.Bool(0), args.Error(1)
}

// ExecuteBilling 請求処理実行
func (m *MockBillingService) ExecuteBilling(ctx context.Context, req *dto.ExecuteBillingRequest, executorID string) (*dto.ExecuteBillingResponse, error) {
	args := m.Called(ctx, req, executorID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExecuteBillingResponse), args.Error(1)
}

// ExecuteClientBilling クライアント請求実行
func (m *MockBillingService) ExecuteClientBilling(ctx context.Context, clientID string, billingYear, billingMonth int, executorID string) (*dto.InvoiceResponse, error) {
	args := m.Called(ctx, clientID, billingYear, billingMonth, executorID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.InvoiceResponse), args.Error(1)
}

// ExecuteBatchBilling バッチ請求実行
func (m *MockBillingService) ExecuteBatchBilling(ctx context.Context, req *dto.BatchBillingRequest, executorID string) (*dto.BatchBillingResponse, error) {
	args := m.Called(ctx, req, executorID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.BatchBillingResponse), args.Error(1)
}

// RegenerateInvoice 請求書再生成
func (m *MockBillingService) RegenerateInvoice(ctx context.Context, invoiceID string, executorID string) (*dto.InvoiceResponse, error) {
	args := m.Called(ctx, invoiceID, executorID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.InvoiceResponse), args.Error(1)
}

// CancelInvoice 請求書キャンセル
func (m *MockBillingService) CancelInvoice(ctx context.Context, invoiceID string, reason string, executorID string) error {
	args := m.Called(ctx, invoiceID, reason, executorID)
	return args.Error(0)
}

// UpdateInvoiceStatus 請求書ステータス更新
func (m *MockBillingService) UpdateInvoiceStatus(ctx context.Context, invoiceID string, status model.InvoiceStatus, executorID string) error {
	args := m.Called(ctx, invoiceID, status, executorID)
	return args.Error(0)
}

// GenerateMonthlyInvoices 月次請求書生成
func (m *MockBillingService) GenerateMonthlyInvoices(ctx context.Context, year, month int, executorID string) (*dto.MonthlyInvoiceGenerationResult, error) {
	args := m.Called(ctx, year, month, executorID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.MonthlyInvoiceGenerationResult), args.Error(1)
}

// RetryFailedBillings 失敗した請求のリトライ
func (m *MockBillingService) RetryFailedBillings(ctx context.Context, billingMonth string) (*dto.RetryBillingResult, error) {
	args := m.Called(ctx, billingMonth)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.RetryBillingResult), args.Error(1)
}

// GetBillingSummary 請求サマリー取得
func (m *MockBillingService) GetBillingSummary(ctx context.Context, year, month int) (*dto.BillingSummaryResponse, error) {
	args := m.Called(ctx, year, month)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.BillingSummaryResponse), args.Error(1)
}

// ========== テストヘルパー関数 ==========

func setupGinTest() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func performRequest(r *gin.Engine, method, path string, body interface{}) *httptest.ResponseRecorder {
	var req *http.Request
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		req = httptest.NewRequest(method, path, bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ========== テストケース ==========

func TestBillingHandler_PreviewBilling(t *testing.T) {
	// Setup
	mockService := &MockBillingService{}
	logger := zap.NewNop()
	handler := NewBillingHandler(mockService, logger)

	router := setupGinTest()
	router.POST("/api/v1/billing/preview", handler.PreviewBilling)

	// Test data
	clientID := uuid.New().String()

	req := dto.BillingPreviewRequest{
		ClientIDs:    []string{clientID},
		BillingYear:  2024,
		BillingMonth: 1,
		IsPreview:    true,
	}

	expectedResponse := &dto.BillingPreviewResponse{
		BillingYear:  2024,
		BillingMonth: 1,
		Clients: []dto.ClientBillingPreview{
			{
				ClientID:     clientID,
				ClientName:   "テスト会社",
				Amount:       500000,
				TotalAmount:  550000,
				ProjectCount: 2,
				Status:       "success",
			},
		},
		TotalAmount:  550000,
		TotalClients: 1,
		CreatedAt:    time.Now(),
	}

	// Mock setup
	mockService.On("PreviewBilling", mock.Anything, mock.AnythingOfType("*dto.BillingPreviewRequest")).
		Return(expectedResponse, nil)

	// Execute
	w := performRequest(router, "POST", "/api/v1/billing/preview", req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response dto.BillingPreviewResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedResponse.BillingYear, response.BillingYear)
	assert.Equal(t, expectedResponse.BillingMonth, response.BillingMonth)
	assert.Equal(t, len(expectedResponse.Clients), len(response.Clients))
	assert.Equal(t, expectedResponse.TotalAmount, response.TotalAmount)
}

func TestBillingHandler_PreviewBilling_InvalidRequest(t *testing.T) {
	// Setup
	mockService := &MockBillingService{}
	logger := zap.NewNop()
	handler := NewBillingHandler(mockService, logger)

	router := setupGinTest()
	router.POST("/api/v1/billing/preview", handler.PreviewBilling)

	testCases := []struct {
		name           string
		request        interface{}
		expectedStatus int
	}{
		{
			name:           "Invalid JSON",
			request:        "invalid json",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Missing ClientIDs",
			request: map[string]interface{}{
				"billing_year":  2024,
				"billing_month": 1,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Empty ClientIDs",
			request: dto.BillingPreviewRequest{
				ClientIDs:    []string{},
				BillingYear:  2024,
				BillingMonth: 1,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Invalid Year (too early)",
			request: dto.BillingPreviewRequest{
				ClientIDs:    []string{uuid.New().String()},
				BillingYear:  2019,
				BillingMonth: 1,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Invalid Year (too late)",
			request: dto.BillingPreviewRequest{
				ClientIDs:    []string{uuid.New().String()},
				BillingYear:  2051,
				BillingMonth: 1,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Invalid Month (0)",
			request: dto.BillingPreviewRequest{
				ClientIDs:    []string{uuid.New().String()},
				BillingYear:  2024,
				BillingMonth: 0,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Invalid Month (13)",
			request: dto.BillingPreviewRequest{
				ClientIDs:    []string{uuid.New().String()},
				BillingYear:  2024,
				BillingMonth: 13,
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			w := performRequest(router, "POST", "/api/v1/billing/preview", tc.request)
			assert.Equal(t, tc.expectedStatus, w.Code)
		})
	}
}

func TestBillingHandler_PreviewBilling_ServiceError(t *testing.T) {
	// Setup
	mockService := &MockBillingService{}
	logger := zap.NewNop()
	handler := NewBillingHandler(mockService, logger)

	router := setupGinTest()
	router.POST("/api/v1/billing/preview", handler.PreviewBilling)

	// Test data
	clientID := uuid.New().String()
	req := dto.BillingPreviewRequest{
		ClientIDs:    []string{clientID},
		BillingYear:  2024,
		BillingMonth: 1,
		IsPreview:    true,
	}

	// Mock setup - サービスエラーを返すよう設定
	mockService.On("PreviewBilling", mock.Anything, mock.AnythingOfType("*dto.BillingPreviewRequest")).
		Return(nil, fmt.Errorf("データベース接続エラー"))

	// Execute
	w := performRequest(router, "POST", "/api/v1/billing/preview", req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var errorResponse map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Contains(t, errorResponse["error"], "請求プレビューの生成")
}

func TestBillingHandler_PreviewBilling_MultipleClients(t *testing.T) {
	// Setup
	mockService := &MockBillingService{}
	logger := zap.NewNop()
	handler := NewBillingHandler(mockService, logger)

	router := setupGinTest()
	router.POST("/api/v1/billing/preview", handler.PreviewBilling)

	// Test data - 複数クライアント
	clientID1 := uuid.New().String()
	clientID2 := uuid.New().String()
	clientID3 := uuid.New().String()

	req := dto.BillingPreviewRequest{
		ClientIDs:    []string{clientID1, clientID2, clientID3},
		BillingYear:  2024,
		BillingMonth: 3,
		IsPreview:    true,
	}

	expectedResponse := &dto.BillingPreviewResponse{
		BillingYear:  2024,
		BillingMonth: 3,
		Clients: []dto.ClientBillingPreview{
			{
				ClientID:     clientID1,
				ClientName:   "会社A",
				Amount:       500000,
				TotalAmount:  550000,
				ProjectCount: 2,
				Status:       "success",
			},
			{
				ClientID:     clientID2,
				ClientName:   "会社B",
				Amount:       300000,
				TotalAmount:  330000,
				ProjectCount: 1,
				Status:       "success",
			},
			{
				ClientID:     clientID3,
				ClientName:   "会社C",
				Amount:       750000,
				TotalAmount:  825000,
				ProjectCount: 3,
				Status:       "success",
			},
		},
		TotalAmount:  1705000,
		TotalClients: 3,
		CreatedAt:    time.Now(),
	}

	// Mock setup
	mockService.On("PreviewBilling", mock.Anything, mock.AnythingOfType("*dto.BillingPreviewRequest")).
		Return(expectedResponse, nil)

	// Execute
	w := performRequest(router, "POST", "/api/v1/billing/preview", req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response dto.BillingPreviewResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedResponse.BillingYear, response.BillingYear)
	assert.Equal(t, expectedResponse.BillingMonth, response.BillingMonth)
	assert.Equal(t, 3, len(response.Clients))
	assert.Equal(t, expectedResponse.TotalAmount, response.TotalAmount)
	assert.Equal(t, 3, response.TotalClients)
}

// Helper function
func floatPtr(f float64) *float64 {
	return &f
}
