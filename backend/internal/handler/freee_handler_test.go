package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
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
	"github.com/duesk/monstera/internal/handler"
)

// MockFreeeService FreeeServiceのモック実装
type MockFreeeService struct {
	mock.Mock
}

// OAuth認証関連
func (m *MockFreeeService) GenerateAuthURL(ctx context.Context, redirectURI string) (*dto.FreeeAuthURLResponse, error) {
	args := m.Called(ctx, redirectURI)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeAuthURLResponse), args.Error(1)
}

func (m *MockFreeeService) ExchangeCodeForToken(ctx context.Context, req *dto.FreeeOAuthRequest) (*dto.FreeeOAuthResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeOAuthResponse), args.Error(1)
}

func (m *MockFreeeService) RefreshAccessToken(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockFreeeService) RevokeToken(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

// 設定管理関連
func (m *MockFreeeService) GetFreeeSettings(ctx context.Context, userID uuid.UUID) (*dto.FreeeSettingsDTO, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeSettingsDTO), args.Error(1)
}

func (m *MockFreeeService) UpdateFreeeSettings(ctx context.Context, userID uuid.UUID, req *dto.UpdateFreeeSettingsRequest) error {
	args := m.Called(ctx, userID, req)
	return args.Error(0)
}

func (m *MockFreeeService) DeleteFreeeSettings(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

// 接続管理関連
func (m *MockFreeeService) GetConnectionStatus(ctx context.Context, userID uuid.UUID) (*dto.FreeeConnectionStatusDTO, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeConnectionStatusDTO), args.Error(1)
}

func (m *MockFreeeService) TestConnection(ctx context.Context, userID uuid.UUID) (*dto.FreeeConnectionTestResult, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeConnectionTestResult), args.Error(1)
}

// トークン管理関連
func (m *MockFreeeService) GetValidAccessToken(ctx context.Context, userID uuid.UUID) (string, error) {
	args := m.Called(ctx, userID)
	return args.String(0), args.Error(1)
}

func (m *MockFreeeService) IsTokenExpired(tokenExpiresAt time.Time) bool {
	args := m.Called(tokenExpiresAt)
	return args.Bool(0)
}

func (m *MockFreeeService) ScheduleTokenRefresh(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

// 取引先管理関連
func (m *MockFreeeService) GetPartners(ctx context.Context, userID uuid.UUID) ([]*dto.FreeePartnerDTO, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*dto.FreeePartnerDTO), args.Error(1)
}

func (m *MockFreeeService) CreatePartner(ctx context.Context, userID uuid.UUID, req *dto.CreateFreeePartnerRequest) (*dto.FreeePartnerDTO, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeePartnerDTO), args.Error(1)
}

func (m *MockFreeeService) UpdatePartner(ctx context.Context, userID uuid.UUID, partnerID int, req *dto.UpdateFreeePartnerRequest) (*dto.FreeePartnerDTO, error) {
	args := m.Called(ctx, userID, partnerID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeePartnerDTO), args.Error(1)
}

func (m *MockFreeeService) SyncPartner(ctx context.Context, userID uuid.UUID, clientID uuid.UUID) (*dto.FreeePartnerDTO, error) {
	args := m.Called(ctx, userID, clientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeePartnerDTO), args.Error(1)
}

// 請求書管理関連
func (m *MockFreeeService) GetInvoices(ctx context.Context, userID uuid.UUID, from, to *time.Time) ([]*dto.FreeeInvoiceDTO, error) {
	args := m.Called(ctx, userID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*dto.FreeeInvoiceDTO), args.Error(1)
}

func (m *MockFreeeService) CreateInvoice(ctx context.Context, userID uuid.UUID, req *dto.CreateFreeeInvoiceRequest) (*dto.FreeeInvoiceDTO, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeInvoiceDTO), args.Error(1)
}

func (m *MockFreeeService) UpdateInvoice(ctx context.Context, userID uuid.UUID, invoiceID int, req *dto.UpdateFreeeInvoiceRequest) (*dto.FreeeInvoiceDTO, error) {
	args := m.Called(ctx, userID, invoiceID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeInvoiceDTO), args.Error(1)
}

func (m *MockFreeeService) DeleteInvoice(ctx context.Context, userID uuid.UUID, invoiceID int) error {
	args := m.Called(ctx, userID, invoiceID)
	return args.Error(0)
}

func (m *MockFreeeService) SyncInvoice(ctx context.Context, userID uuid.UUID, invoiceID uuid.UUID) (*dto.FreeeInvoiceDTO, error) {
	args := m.Called(ctx, userID, invoiceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeInvoiceDTO), args.Error(1)
}

// 支払い情報管理関連
func (m *MockFreeeService) GetPayments(ctx context.Context, userID uuid.UUID, from, to *time.Time) ([]*dto.FreeePaymentDTO, error) {
	args := m.Called(ctx, userID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*dto.FreeePaymentDTO), args.Error(1)
}

func (m *MockFreeeService) GetInvoicePayments(ctx context.Context, userID uuid.UUID, invoiceID int) ([]*dto.FreeePaymentDTO, error) {
	args := m.Called(ctx, userID, invoiceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*dto.FreeePaymentDTO), args.Error(1)
}

// データ同期関連
func (m *MockFreeeService) SyncAllData(ctx context.Context, userID uuid.UUID) (*dto.FreeSyncResult, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeSyncResult), args.Error(1)
}

func (m *MockFreeeService) SyncClients(ctx context.Context, userID uuid.UUID) (*dto.FreeSyncResult, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeSyncResult), args.Error(1)
}

func (m *MockFreeeService) SyncInvoices(ctx context.Context, userID uuid.UUID) (*dto.FreeSyncResult, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeSyncResult), args.Error(1)
}

// バッチ処理関連
func (m *MockFreeeService) ProcessBatchSync(ctx context.Context, userIDs []uuid.UUID) ([]*dto.FreeBatchSyncResult, error) {
	args := m.Called(ctx, userIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*dto.FreeBatchSyncResult), args.Error(1)
}

// ハンドラーで使用されているメソッド（インターフェースには定義されていないが、ハンドラーで呼ばれている）
func (m *MockFreeeService) InitiateOAuth(ctx context.Context, userID uuid.UUID, redirectURL string) (string, string, error) {
	args := m.Called(ctx, userID, redirectURL)
	return args.String(0), args.String(1), args.Error(2)
}

func (m *MockFreeeService) CompleteOAuth(ctx context.Context, userID uuid.UUID, code, state string) error {
	args := m.Called(ctx, userID, code, state)
	return args.Error(0)
}

func (m *MockFreeeService) Disconnect(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockFreeeService) SyncSpecificPartners(ctx context.Context, userID uuid.UUID, clientIDs []uuid.UUID) (*dto.FreeeSyncResponse, error) {
	args := m.Called(ctx, userID, clientIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeSyncResponse), args.Error(1)
}

func (m *MockFreeeService) SyncAllPartners(ctx context.Context, userID uuid.UUID) (*dto.FreeeSyncResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeSyncResponse), args.Error(1)
}

func (m *MockFreeeService) SyncSpecificInvoices(ctx context.Context, userID uuid.UUID, invoiceIDs []uuid.UUID) (*dto.FreeeSyncResponse, error) {
	args := m.Called(ctx, userID, invoiceIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeSyncResponse), args.Error(1)
}

func (m *MockFreeeService) SyncInvoicesByMonth(ctx context.Context, userID uuid.UUID, targetMonth string) (*dto.FreeeSyncResponse, error) {
	args := m.Called(ctx, userID, targetMonth)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeSyncResponse), args.Error(1)
}

func (m *MockFreeeService) GetSyncHistory(ctx context.Context, userID uuid.UUID, filters map[string]interface{}, offset, limit int) ([]*dto.FreeeSyncHistoryItem, int, error) {
	args := m.Called(ctx, userID, filters, offset, limit)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*dto.FreeeSyncHistoryItem), args.Int(1), args.Error(2)
}

func (m *MockFreeeService) GetCompanies(ctx context.Context, userID uuid.UUID) ([]*dto.FreeeCompanyDTO, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*dto.FreeeCompanyDTO), args.Error(1)
}

func (m *MockFreeeService) SelectCompany(ctx context.Context, userID uuid.UUID, companyID int) error {
	args := m.Called(ctx, userID, companyID)
	return args.Error(0)
}

func (m *MockFreeeService) GetSyncSummary(ctx context.Context, userID uuid.UUID) (*dto.FreeeSyncSummaryResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.FreeeSyncSummaryResponse), args.Error(1)
}

// テストヘルパー関数
func setupFreeeHandlerTest() (*MockFreeeService, *handler.FreeeHandler, *gin.Engine) {
	gin.SetMode(gin.TestMode)
	mockService := &MockFreeeService{}
	logger := zap.NewNop()
	h := handler.NewFreeeHandler(mockService, logger)

	router := gin.New()
	return mockService, h, router
}

// テストケース
func TestFreeeHandler_GetConnectionStatus(t *testing.T) {
	mockService, h, router := setupFreeeHandlerTest()
	userID := uuid.New()

	// ミドルウェアを追加してユーザーIDをセット
	router.Use(func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	})
	router.GET("/api/v1/freee/status", h.GetConnectionStatus)

	t.Run("正常な接続状態取得", func(t *testing.T) {
		expectedStatus := &dto.FreeeConnectionStatusDTO{
			IsConnected:    true,
			CompanyID:      12345,
			CompanyName:    "テスト会社",
			LastSyncAt:     time.Now().Add(-1 * time.Hour),
			TokenExpiresAt: time.Now().Add(24 * time.Hour),
		}

		mockService.On("GetConnectionStatus", mock.Anything, userID).
			Return(expectedStatus, nil).Once()

		req := httptest.NewRequest("GET", "/api/v1/freee/status", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeConnectionStatusDTO
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.IsConnected)
		assert.Equal(t, expectedStatus.CompanyName, response.CompanyName)

		mockService.AssertExpectations(t)
	})

	t.Run("未接続状態", func(t *testing.T) {
		expectedStatus := &dto.FreeeConnectionStatusDTO{
			IsConnected: false,
		}

		mockService.On("GetConnectionStatus", mock.Anything, userID).
			Return(expectedStatus, nil).Once()

		req := httptest.NewRequest("GET", "/api/v1/freee/status", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeConnectionStatusDTO
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response.IsConnected)

		mockService.AssertExpectations(t)
	})
}

func TestFreeeHandler_InitiateOAuth(t *testing.T) {
	mockService, h, router := setupFreeeHandlerTest()
	userID := uuid.New()

	router.Use(func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	})
	router.POST("/api/v1/freee/oauth/initiate", h.InitiateOAuth)

	t.Run("OAuth認証開始成功", func(t *testing.T) {
		req := dto.FreeeOAuthInitiateRequest{
			RedirectURL: "https://app.example.com/freee/callback",
		}

		expectedAuthURL := "https://accounts.secure.freee.co.jp/oauth/authorize?client_id=test&redirect_uri=https://app.example.com/freee/callback&response_type=code&state=random-state"
		expectedState := "random-state"

		mockService.On("InitiateOAuth", mock.Anything, userID, req.RedirectURL).
			Return(expectedAuthURL, expectedState, nil).Once()

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/freee/oauth/initiate", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeOAuthInitiateResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, expectedAuthURL, response.AuthURL)
		assert.Equal(t, expectedState, response.State)

		mockService.AssertExpectations(t)
	})

	t.Run("リクエスト形式エラー", func(t *testing.T) {
		request := httptest.NewRequest("POST", "/api/v1/freee/oauth/initiate", bytes.NewBufferString("invalid json"))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

func TestFreeeHandler_CompleteOAuth(t *testing.T) {
	mockService, h, router := setupFreeeHandlerTest()
	userID := uuid.New()

	router.Use(func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	})
	router.POST("/api/v1/freee/oauth/complete", h.CompleteOAuth)

	t.Run("OAuth認証完了成功", func(t *testing.T) {
		req := dto.FreeeOAuthCompleteRequest{
			Code:  "authorization-code",
			State: "random-state",
		}

		mockService.On("CompleteOAuth", mock.Anything, userID, req.Code, req.State).
			Return(nil).Once()

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/freee/oauth/complete", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeOAuthCompleteResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, "freee認証が完了しました", response.Message)

		mockService.AssertExpectations(t)
	})

	t.Run("必須パラメータ不足", func(t *testing.T) {
		req := dto.FreeeOAuthCompleteRequest{
			Code: "authorization-code",
			// Stateが不足
		}

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/freee/oauth/complete", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

func TestFreeeHandler_TestConnection(t *testing.T) {
	mockService, h, router := setupFreeeHandlerTest()
	userID := uuid.New()

	router.Use(func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	})
	router.POST("/api/v1/freee/test", h.TestConnection)

	t.Run("接続テスト成功", func(t *testing.T) {
		expectedResult := &dto.FreeeConnectionTestResult{
			Success:     true,
			Message:     "freee APIへの接続に成功しました",
			CompanyID:   12345,
			CompanyName: "テスト会社",
			UserEmail:   "test@duesk.co.jp",
		}

		mockService.On("TestConnection", mock.Anything, userID).
			Return(expectedResult, nil).Once()

		request := httptest.NewRequest("POST", "/api/v1/freee/test", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeConnectionTestResult
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, expectedResult.CompanyName, response.CompanyName)

		mockService.AssertExpectations(t)
	})
}

func TestFreeeHandler_SyncPartners(t *testing.T) {
	mockService, h, router := setupFreeeHandlerTest()
	userID := uuid.New()

	router.Use(func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	})
	router.POST("/api/v1/freee/sync/partners", h.SyncPartners)

	t.Run("全取引先同期成功", func(t *testing.T) {
		req := dto.FreeeSyncPartnersRequest{
			ClientIDs: []uuid.UUID{},
		}

		expectedResult := &dto.FreeeSyncResponse{
			Success:     true,
			Message:     "取引先の同期が完了しました",
			SyncedCount: 10,
			FailedCount: 0,
			Details: []dto.FreeeSyncDetail{
				{
					ItemID:   uuid.New(),
					ItemName: "テスト会社A",
					Status:   "success",
					Message:  "同期完了",
					FreeeID:  1001,
				},
			},
		}

		mockService.On("SyncAllPartners", mock.Anything, userID).
			Return(expectedResult, nil).Once()

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/freee/sync/partners", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeSyncResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, 10, response.SyncedCount)

		mockService.AssertExpectations(t)
	})

	t.Run("特定取引先同期成功", func(t *testing.T) {
		clientIDs := []uuid.UUID{uuid.New(), uuid.New()}
		req := dto.FreeeSyncPartnersRequest{
			ClientIDs: clientIDs,
		}

		expectedResult := &dto.FreeeSyncResponse{
			Success:     true,
			Message:     "取引先の同期が完了しました",
			SyncedCount: 2,
			FailedCount: 0,
		}

		mockService.On("SyncSpecificPartners", mock.Anything, userID, clientIDs).
			Return(expectedResult, nil).Once()

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/freee/sync/partners", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeSyncResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, 2, response.SyncedCount)

		mockService.AssertExpectations(t)
	})
}

func TestFreeeHandler_SyncInvoices(t *testing.T) {
	mockService, h, router := setupFreeeHandlerTest()
	userID := uuid.New()

	router.Use(func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	})
	router.POST("/api/v1/freee/sync/invoices", h.SyncInvoices)

	t.Run("特定月の請求書同期成功", func(t *testing.T) {
		req := dto.FreeeSyncInvoicesRequest{
			TargetMonth: "2024-01",
		}

		expectedResult := &dto.FreeeSyncResponse{
			Success:     true,
			Message:     "請求書の同期が完了しました",
			SyncedCount: 5,
			FailedCount: 0,
		}

		mockService.On("SyncInvoicesByMonth", mock.Anything, userID, req.TargetMonth).
			Return(expectedResult, nil).Once()

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/freee/sync/invoices", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeSyncResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, 5, response.SyncedCount)

		mockService.AssertExpectations(t)
	})

	t.Run("パラメータ不足エラー", func(t *testing.T) {
		req := dto.FreeeSyncInvoicesRequest{
			// InvoiceIDsもTargetMonthも指定なし
		}

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/freee/sync/invoices", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

func TestFreeeHandler_GetSyncHistory(t *testing.T) {
	mockService, h, router := setupFreeeHandlerTest()
	userID := uuid.New()

	router.Use(func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	})
	router.GET("/api/v1/freee/sync/history", h.GetSyncHistory)

	t.Run("同期履歴取得成功", func(t *testing.T) {
		expectedHistory := []*dto.FreeeSyncHistoryItem{
			{
				ID:          uuid.New(),
				SyncType:    "partner",
				Status:      "success",
				Message:     "同期完了",
				ItemCount:   10,
				ErrorCount:  0,
				StartedAt:   time.Now().Add(-1 * time.Hour),
				CompletedAt: time.Now().Add(-50 * time.Minute),
			},
		}

		mockService.On("GetSyncHistory", mock.Anything, userID, mock.AnythingOfType("map[string]interface {}"), 0, 20).
			Return(expectedHistory, 1, nil).Once()

		req := httptest.NewRequest("GET", "/api/v1/freee/sync/history", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeSyncHistoryResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, 1, response.Total)
		assert.Equal(t, 1, len(response.Items))

		mockService.AssertExpectations(t)
	})

	t.Run("フィルター付き履歴取得", func(t *testing.T) {
		expectedHistory := []*dto.FreeeSyncHistoryItem{}

		filters := map[string]interface{}{
			"sync_type": "invoice",
			"status":    "failed",
		}

		mockService.On("GetSyncHistory", mock.Anything, userID, filters, 0, 20).
			Return(expectedHistory, 0, nil).Once()

		req := httptest.NewRequest("GET", "/api/v1/freee/sync/history?sync_type=invoice&status=failed", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		mockService.AssertExpectations(t)
	})
}

func TestFreeeHandler_SelectCompany(t *testing.T) {
	mockService, h, router := setupFreeeHandlerTest()
	userID := uuid.New()

	router.Use(func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	})
	router.POST("/api/v1/freee/companies/select", h.SelectCompany)

	t.Run("事業所選択成功", func(t *testing.T) {
		req := dto.FreeeSelectCompanyRequest{
			CompanyID: 12345,
		}

		mockService.On("SelectCompany", mock.Anything, userID, req.CompanyID).
			Return(nil).Once()

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/freee/companies/select", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.FreeeSelectCompanyResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)

		mockService.AssertExpectations(t)
	})

	t.Run("事業所ID未指定エラー", func(t *testing.T) {
		req := dto.FreeeSelectCompanyRequest{
			CompanyID: 0,
		}

		jsonBody, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/api/v1/freee/companies/select", bytes.NewBuffer(jsonBody))
		request.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, request)

		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}
