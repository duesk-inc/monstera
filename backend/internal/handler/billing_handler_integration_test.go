package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/handler"
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
func (m *MockBillingService) PreviewClientBilling(ctx context.Context, clientID uuid.UUID, billingYear, billingMonth int) (*dto.ClientBillingPreview, error) {
	args := m.Called(ctx, clientID, billingYear, billingMonth)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ClientBillingPreview), args.Error(1)
}

// PreviewGroupBilling グループ請求プレビュー
func (m *MockBillingService) PreviewGroupBilling(ctx context.Context, groupID uuid.UUID, billingYear, billingMonth int) (*dto.GroupBillingPreview, error) {
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
func (m *MockBillingService) GetClientBillingHistory(ctx context.Context, clientID uuid.UUID, limit int) ([]dto.BillingHistoryItemDTO, error) {
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
func (m *MockBillingService) CheckDuplicateBilling(ctx context.Context, clientID uuid.UUID, billingMonth string) (bool, error) {
	args := m.Called(ctx, clientID, billingMonth)
	return args.Bool(0), args.Error(1)
}

// ExecuteBilling 請求処理実行
func (m *MockBillingService) ExecuteBilling(ctx context.Context, req *dto.ExecuteBillingRequest, executorID uuid.UUID) (*dto.ExecuteBillingResponse, error) {
	args := m.Called(ctx, req, executorID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ExecuteBillingResponse), args.Error(1)
}

// ExecuteClientBilling クライアント請求実行
func (m *MockBillingService) ExecuteClientBilling(ctx context.Context, clientID uuid.UUID, billingYear, billingMonth int, executorID uuid.UUID) (*dto.InvoiceResponse, error) {
	args := m.Called(ctx, clientID, billingYear, billingMonth, executorID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.InvoiceResponse), args.Error(1)
}

// ExecuteBatchBilling バッチ請求実行
func (m *MockBillingService) ExecuteBatchBilling(ctx context.Context, req *dto.BatchBillingRequest, executorID uuid.UUID) (*dto.BatchBillingResponse, error) {
	args := m.Called(ctx, req, executorID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.BatchBillingResponse), args.Error(1)
}

// RegenerateInvoice 請求書再生成
func (m *MockBillingService) RegenerateInvoice(ctx context.Context, invoiceID uuid.UUID, executorID uuid.UUID) (*dto.InvoiceResponse, error) {
	args := m.Called(ctx, invoiceID, executorID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.InvoiceResponse), args.Error(1)
}

// CancelInvoice 請求書キャンセル
func (m *MockBillingService) CancelInvoice(ctx context.Context, invoiceID uuid.UUID, reason string, executorID uuid.UUID) error {
	args := m.Called(ctx, invoiceID, reason, executorID)
	return args.Error(0)
}

// UpdateInvoiceStatus 請求書ステータス更新
func (m *MockBillingService) UpdateInvoiceStatus(ctx context.Context, invoiceID uuid.UUID, status model.InvoiceStatus, executorID uuid.UUID) error {
	args := m.Called(ctx, invoiceID, status, executorID)
	return args.Error(0)
}

// GenerateMonthlyInvoices 月次請求書生成
func (m *MockBillingService) GenerateMonthlyInvoices(ctx context.Context, year, month int, executorID uuid.UUID) (*dto.MonthlyInvoiceGenerationResult, error) {
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

// TestBillingHandler_PreviewBilling_Integration 請求プレビューの統合テスト
func TestBillingHandler_PreviewBilling_Integration(t *testing.T) {
	// Ginテストモードを設定
	gin.SetMode(gin.TestMode)

	// モックサービスとハンドラーをセットアップ
	mockService := &MockBillingService{}
	logger := zap.NewNop()
	h := handler.NewBillingHandler(mockService, logger)

	// ルーターをセットアップ
	router := gin.New()
	router.POST("/api/v1/billing/preview", h.PreviewBilling)

	// テストケース1: 正常なリクエスト
	t.Run("正常なリクエスト", func(t *testing.T) {
		clientID := uuid.New()
		req := dto.BillingPreviewRequest{
			ClientIDs:    []uuid.UUID{clientID},
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
		}

		mockService.On("PreviewBilling", mock.Anything, mock.AnythingOfType("*dto.BillingPreviewRequest")).
			Return(expectedResponse, nil)

		// リクエストを作成
		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/billing/preview", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")

		// レスポンスレコーダーを作成
		recorder := httptest.NewRecorder()

		// リクエストを実行
		router.ServeHTTP(recorder, request)

		// アサーション
		assert.Equal(t, http.StatusOK, recorder.Code)

		var response dto.BillingPreviewResponse
		err := json.Unmarshal(recorder.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, expectedResponse.BillingYear, response.BillingYear)
		assert.Equal(t, expectedResponse.BillingMonth, response.BillingMonth)
		assert.Equal(t, len(expectedResponse.Clients), len(response.Clients))
		assert.Equal(t, expectedResponse.TotalAmount, response.TotalAmount)
	})

	// テストケース2: バリデーションエラー
	t.Run("ClientIDsが空の場合", func(t *testing.T) {
		req := dto.BillingPreviewRequest{
			ClientIDs:    []uuid.UUID{},
			BillingYear:  2024,
			BillingMonth: 1,
			IsPreview:    true,
		}

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/billing/preview", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")

		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, request)

		assert.Equal(t, http.StatusBadRequest, recorder.Code)
	})
}
