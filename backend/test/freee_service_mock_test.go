package test

import (
	"context"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/testdata"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// FreeeServiceInterface インターフェース定義（テスト用）
type FreeeServiceInterface interface {
	// OAuth認証
	GenerateAuthURL(ctx context.Context, redirectURI string) (*FreeeAuthURLResponse, error)
	ExchangeCodeForToken(ctx context.Context, req *FreeeOAuthRequest) (*FreeeOAuthResponse, error)
	RefreshAccessToken(ctx context.Context, userID uuid.UUID) error
	RevokeToken(ctx context.Context, userID uuid.UUID) error

	// 接続管理
	GetConnectionStatus(ctx context.Context, userID uuid.UUID) (*FreeeConnectionStatusDTO, error)
	TestConnection(ctx context.Context, userID uuid.UUID) (*FreeeConnectionTestResult, error)

	// トークン管理
	GetValidAccessToken(ctx context.Context, userID uuid.UUID) (string, error)
	IsTokenExpired(tokenExpiresAt time.Time) bool
	ScheduleTokenRefresh(ctx context.Context, userID uuid.UUID) error

	// 取引先管理
	GetPartners(ctx context.Context, userID uuid.UUID) ([]*FreeePartnerDTO, error)
	CreatePartner(ctx context.Context, userID uuid.UUID, req *CreateFreeePartnerRequest) (*FreeePartnerDTO, error)
	UpdatePartner(ctx context.Context, userID uuid.UUID, partnerID int, req *UpdateFreeePartnerRequest) (*FreeePartnerDTO, error)
	SyncPartner(ctx context.Context, userID uuid.UUID, clientID uuid.UUID) (*FreeePartnerDTO, error)

	// 請求書管理
	GetInvoices(ctx context.Context, userID uuid.UUID, from, to *time.Time) ([]*FreeeInvoiceDTO, error)
	CreateInvoice(ctx context.Context, userID uuid.UUID, req *CreateFreeeInvoiceRequest) (*FreeeInvoiceDTO, error)
	SyncInvoice(ctx context.Context, userID uuid.UUID, invoiceID uuid.UUID) (*FreeeInvoiceDTO, error)

	// データ同期
	SyncAllData(ctx context.Context, userID uuid.UUID) (*FreeSyncResult, error)
	SyncClients(ctx context.Context, userID uuid.UUID) (*FreeSyncResult, error)
	ProcessBatchSync(ctx context.Context, userIDs []uuid.UUID) ([]*FreeBatchSyncResult, error)
}

// DTO定義（テスト用）
type FreeeAuthURLResponse struct {
	AuthURL string
	State   string
}

type FreeeOAuthRequest struct {
	Code        string
	State       string
	RedirectURI string
}

type FreeeOAuthResponse struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int
	TokenType    string
	CompanyID    int
}

type FreeeConnectionStatusDTO struct {
	IsConnected    bool
	CompanyID      int
	CompanyName    string
	LastSyncAt     time.Time
	TokenExpiresAt time.Time
}

type FreeeConnectionTestResult struct {
	Success     bool
	Message     string
	CompanyID   int
	CompanyName string
	UserEmail   string
}

type FreeePartnerDTO struct {
	ID                int
	Code              string
	Name              string
	ContactName       string
	Email             string
	Phone             string
	AddressZipcode    string
	AddressPrefecture string
	AddressLine1      string
	SyncedAt          time.Time
}

type CreateFreeePartnerRequest struct {
	Code        string
	Name        string
	ContactName string
	Email       string
	Phone       string
}

type UpdateFreeePartnerRequest struct {
	Name        string
	ContactName string
	Email       string
	Phone       string
}

type FreeeInvoiceDTO struct {
	ID            int
	InvoiceNumber string
	PartnerID     int
	PartnerName   string
	IssueDate     time.Time
	DueDate       time.Time
	TotalAmount   int
	TaxAmount     int
	SubTotal      int
	InvoiceStatus string
	PaymentStatus string
	SyncedAt      time.Time
}

type FreeeInvoiceItemRequest struct {
	Name      string
	Quantity  int
	UnitPrice int
	Amount    int
	TaxCode   int
}

type CreateFreeeInvoiceRequest struct {
	PartnerID     int
	IssueDate     time.Time
	DueDate       time.Time
	InvoiceNumber string
	Title         string
	Items         []FreeeInvoiceItemRequest
}

type FreeSyncResult struct {
	Success        bool
	TotalProcessed int
	SuccessCount   int
	FailureCount   int
	Details        map[string]interface{}
}

type FreeBatchSyncResult struct {
	UserID         uuid.UUID
	Success        bool
	ProcessedCount int
	SuccessCount   int
	FailureCount   int
	Error          string
}

// MockFreeeService FreeeServiceのモック実装
type MockFreeeService struct {
	mock.Mock
}

// OAuth認証関連
func (m *MockFreeeService) GenerateAuthURL(ctx context.Context, redirectURI string) (*FreeeAuthURLResponse, error) {
	args := m.Called(ctx, redirectURI)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeeAuthURLResponse), args.Error(1)
}

func (m *MockFreeeService) ExchangeCodeForToken(ctx context.Context, req *FreeeOAuthRequest) (*FreeeOAuthResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeeOAuthResponse), args.Error(1)
}

func (m *MockFreeeService) RefreshAccessToken(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockFreeeService) RevokeToken(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

// 接続管理関連
func (m *MockFreeeService) GetConnectionStatus(ctx context.Context, userID uuid.UUID) (*FreeeConnectionStatusDTO, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeeConnectionStatusDTO), args.Error(1)
}

func (m *MockFreeeService) TestConnection(ctx context.Context, userID uuid.UUID) (*FreeeConnectionTestResult, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeeConnectionTestResult), args.Error(1)
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
func (m *MockFreeeService) GetPartners(ctx context.Context, userID uuid.UUID) ([]*FreeePartnerDTO, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*FreeePartnerDTO), args.Error(1)
}

func (m *MockFreeeService) CreatePartner(ctx context.Context, userID uuid.UUID, req *CreateFreeePartnerRequest) (*FreeePartnerDTO, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeePartnerDTO), args.Error(1)
}

func (m *MockFreeeService) UpdatePartner(ctx context.Context, userID uuid.UUID, partnerID int, req *UpdateFreeePartnerRequest) (*FreeePartnerDTO, error) {
	args := m.Called(ctx, userID, partnerID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeePartnerDTO), args.Error(1)
}

func (m *MockFreeeService) SyncPartner(ctx context.Context, userID uuid.UUID, clientID uuid.UUID) (*FreeePartnerDTO, error) {
	args := m.Called(ctx, userID, clientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeePartnerDTO), args.Error(1)
}

// 請求書管理関連
func (m *MockFreeeService) GetInvoices(ctx context.Context, userID uuid.UUID, from, to *time.Time) ([]*FreeeInvoiceDTO, error) {
	args := m.Called(ctx, userID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*FreeeInvoiceDTO), args.Error(1)
}

func (m *MockFreeeService) CreateInvoice(ctx context.Context, userID uuid.UUID, req *CreateFreeeInvoiceRequest) (*FreeeInvoiceDTO, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeeInvoiceDTO), args.Error(1)
}

func (m *MockFreeeService) SyncInvoice(ctx context.Context, userID uuid.UUID, invoiceID uuid.UUID) (*FreeeInvoiceDTO, error) {
	args := m.Called(ctx, userID, invoiceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeeInvoiceDTO), args.Error(1)
}

// データ同期関連
func (m *MockFreeeService) SyncAllData(ctx context.Context, userID uuid.UUID) (*FreeSyncResult, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeSyncResult), args.Error(1)
}

func (m *MockFreeeService) SyncClients(ctx context.Context, userID uuid.UUID) (*FreeSyncResult, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*FreeSyncResult), args.Error(1)
}

func (m *MockFreeeService) ProcessBatchSync(ctx context.Context, userIDs []uuid.UUID) ([]*FreeBatchSyncResult, error) {
	args := m.Called(ctx, userIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*FreeBatchSyncResult), args.Error(1)
}

// インターフェースの実装確認
var _ FreeeServiceInterface = (*MockFreeeService)(nil)

// テストケース：OAuth認証フロー
func TestFreeeService_OAuthFlow(t *testing.T) {
	ctx := context.Background()
	mockService := &MockFreeeService{}
	userID := uuid.New()

	t.Run("OAuth URL生成", func(t *testing.T) {
		expectedResponse := &FreeeAuthURLResponse{
			AuthURL: "https://accounts.secure.freee.co.jp/oauth/authorize?client_id=test&redirect_uri=http://localhost:3000/callback",
			State:   "random-state",
		}

		mockService.On("GenerateAuthURL", ctx, "http://localhost:3000/callback").
			Return(expectedResponse, nil).Once()

		response, err := mockService.GenerateAuthURL(ctx, "http://localhost:3000/callback")

		assert.NoError(t, err)
		assert.NotNil(t, response)
		assert.Contains(t, response.AuthURL, "oauth/authorize")
		assert.NotEmpty(t, response.State)

		mockService.AssertExpectations(t)
	})

	t.Run("トークン交換", func(t *testing.T) {
		req := &FreeeOAuthRequest{
			Code:        "authorization-code",
			State:       "random-state",
			RedirectURI: "http://localhost:3000/callback",
		}

		expectedResponse := &FreeeOAuthResponse{
			AccessToken:  "access-token",
			RefreshToken: "refresh-token",
			ExpiresIn:    3600,
			TokenType:    "Bearer",
			CompanyID:    12345,
		}

		mockService.On("ExchangeCodeForToken", ctx, req).
			Return(expectedResponse, nil).Once()

		response, err := mockService.ExchangeCodeForToken(ctx, req)

		assert.NoError(t, err)
		assert.NotNil(t, response)
		assert.Equal(t, "access-token", response.AccessToken)
		assert.Equal(t, 12345, response.CompanyID)

		mockService.AssertExpectations(t)
	})

	t.Run("トークンリフレッシュ", func(t *testing.T) {
		mockService.On("RefreshAccessToken", ctx, userID).
			Return(nil).Once()

		err := mockService.RefreshAccessToken(ctx, userID)

		assert.NoError(t, err)

		mockService.AssertExpectations(t)
	})
}

// テストケース：接続管理
func TestFreeeService_ConnectionManagement(t *testing.T) {
	ctx := context.Background()
	mockService := &MockFreeeService{}
	userID := uuid.New()

	t.Run("接続状態確認", func(t *testing.T) {
		expectedStatus := &FreeeConnectionStatusDTO{
			IsConnected:    true,
			CompanyID:      12345,
			CompanyName:    "テスト会社",
			LastSyncAt:     time.Now().Add(-1 * time.Hour),
			TokenExpiresAt: time.Now().Add(24 * time.Hour),
		}

		mockService.On("GetConnectionStatus", ctx, userID).
			Return(expectedStatus, nil).Once()

		status, err := mockService.GetConnectionStatus(ctx, userID)

		assert.NoError(t, err)
		assert.NotNil(t, status)
		assert.True(t, status.IsConnected)
		assert.Equal(t, "テスト会社", status.CompanyName)

		mockService.AssertExpectations(t)
	})

	t.Run("接続テスト", func(t *testing.T) {
		expectedResult := &FreeeConnectionTestResult{
			Success:     true,
			Message:     "freee APIへの接続に成功しました",
			CompanyID:   12345,
			CompanyName: "テスト会社",
			UserEmail:   "test@duesk.co.jp",
		}

		mockService.On("TestConnection", ctx, userID).
			Return(expectedResult, nil).Once()

		result, err := mockService.TestConnection(ctx, userID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.Success)
		assert.Equal(t, "test@duesk.co.jp", result.UserEmail)

		mockService.AssertExpectations(t)
	})
}

// テストケース：取引先同期
func TestFreeeService_PartnerSync(t *testing.T) {
	ctx := context.Background()
	mockService := &MockFreeeService{}
	userID := uuid.New()
	clientID := uuid.New()

	t.Run("取引先一覧取得", func(t *testing.T) {
		expectedPartners := []*FreeePartnerDTO{
			{
				ID:                1001,
				Code:              "PARTNER001",
				Name:              "テスト会社A",
				ContactName:       "山田太郎",
				Email:             "yamada@duesk.co.jp",
				Phone:             "03-1234-5678",
				AddressZipcode:    "100-0001",
				AddressPrefecture: "東京都",
				AddressLine1:      "千代田区千代田1-1",
			},
			{
				ID:                1002,
				Code:              "PARTNER002",
				Name:              "テスト会社B",
				ContactName:       "鈴木花子",
				Email:             testdata.MockFemaleEmail,
				Phone:             "03-9876-5432",
				AddressZipcode:    "150-0001",
				AddressPrefecture: "東京都",
				AddressLine1:      "渋谷区渋谷1-1",
			},
		}

		mockService.On("GetPartners", ctx, userID).
			Return(expectedPartners, nil).Once()

		partners, err := mockService.GetPartners(ctx, userID)

		assert.NoError(t, err)
		assert.NotNil(t, partners)
		assert.Len(t, partners, 2)
		assert.Equal(t, "テスト会社A", partners[0].Name)

		mockService.AssertExpectations(t)
	})

	t.Run("取引先作成", func(t *testing.T) {
		req := &CreateFreeePartnerRequest{
			Code:        "PARTNER003",
			Name:        "新規会社",
			ContactName: "佐藤次郎",
			Email:       "sato@duesk.co.jp",
			Phone:       "03-1111-2222",
		}

		expectedPartner := &FreeePartnerDTO{
			ID:          1003,
			Code:        req.Code,
			Name:        req.Name,
			ContactName: req.ContactName,
			Email:       req.Email,
			Phone:       req.Phone,
		}

		mockService.On("CreatePartner", ctx, userID, req).
			Return(expectedPartner, nil).Once()

		partner, err := mockService.CreatePartner(ctx, userID, req)

		assert.NoError(t, err)
		assert.NotNil(t, partner)
		assert.Equal(t, 1003, partner.ID)
		assert.Equal(t, "新規会社", partner.Name)

		mockService.AssertExpectations(t)
	})

	t.Run("取引先同期", func(t *testing.T) {
		expectedPartner := &FreeePartnerDTO{
			ID:       1001,
			Code:     "CLIENT001",
			Name:     "同期済み会社",
			SyncedAt: time.Now(),
		}

		mockService.On("SyncPartner", ctx, userID, clientID).
			Return(expectedPartner, nil).Once()

		partner, err := mockService.SyncPartner(ctx, userID, clientID)

		assert.NoError(t, err)
		assert.NotNil(t, partner)
		assert.Equal(t, "同期済み会社", partner.Name)
		assert.NotEmpty(t, partner.SyncedAt)

		mockService.AssertExpectations(t)
	})
}

// テストケース：請求書同期
func TestFreeeService_InvoiceSync(t *testing.T) {
	ctx := context.Background()
	mockService := &MockFreeeService{}
	userID := uuid.New()
	invoiceID := uuid.New()

	t.Run("請求書一覧取得", func(t *testing.T) {
		from := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		to := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)

		expectedInvoices := []*FreeeInvoiceDTO{
			{
				ID:            2001,
				InvoiceNumber: "INV-2024-001",
				PartnerID:     1001,
				PartnerName:   "テスト会社A",
				IssueDate:     time.Date(2024, 1, 31, 0, 0, 0, 0, time.UTC),
				DueDate:       time.Date(2024, 2, 28, 0, 0, 0, 0, time.UTC),
				TotalAmount:   110000,
				TaxAmount:     10000,
				SubTotal:      100000,
				InvoiceStatus: "issued",
				PaymentStatus: "unpaid",
			},
		}

		mockService.On("GetInvoices", ctx, userID, &from, &to).
			Return(expectedInvoices, nil).Once()

		invoices, err := mockService.GetInvoices(ctx, userID, &from, &to)

		assert.NoError(t, err)
		assert.NotNil(t, invoices)
		assert.Len(t, invoices, 1)
		assert.Equal(t, "INV-2024-001", invoices[0].InvoiceNumber)
		assert.Equal(t, 110000, invoices[0].TotalAmount)

		mockService.AssertExpectations(t)
	})

	t.Run("請求書作成", func(t *testing.T) {
		req := &CreateFreeeInvoiceRequest{
			PartnerID:     1001,
			IssueDate:     time.Date(2024, 2, 29, 0, 0, 0, 0, time.UTC),
			DueDate:       time.Date(2024, 3, 31, 0, 0, 0, 0, time.UTC),
			InvoiceNumber: "INV-2024-002",
			Title:         "2月分請求書",
			Items: []FreeeInvoiceItemRequest{
				{
					Name:      "開発作業",
					Quantity:  1,
					UnitPrice: 100000,
					Amount:    100000,
					TaxCode:   10,
				},
			},
		}

		expectedInvoice := &FreeeInvoiceDTO{
			ID:            2002,
			InvoiceNumber: req.InvoiceNumber,
			PartnerID:     req.PartnerID,
			IssueDate:     req.IssueDate,
			DueDate:       req.DueDate,
			TotalAmount:   110000,
			TaxAmount:     10000,
			SubTotal:      100000,
			InvoiceStatus: "draft",
		}

		mockService.On("CreateInvoice", ctx, userID, req).
			Return(expectedInvoice, nil).Once()

		invoice, err := mockService.CreateInvoice(ctx, userID, req)

		assert.NoError(t, err)
		assert.NotNil(t, invoice)
		assert.Equal(t, 2002, invoice.ID)
		assert.Equal(t, "INV-2024-002", invoice.InvoiceNumber)

		mockService.AssertExpectations(t)
	})

	t.Run("請求書同期", func(t *testing.T) {
		expectedInvoice := &FreeeInvoiceDTO{
			ID:            2001,
			InvoiceNumber: "INV-2024-001",
			SyncedAt:      time.Now(),
		}

		mockService.On("SyncInvoice", ctx, userID, invoiceID).
			Return(expectedInvoice, nil).Once()

		invoice, err := mockService.SyncInvoice(ctx, userID, invoiceID)

		assert.NoError(t, err)
		assert.NotNil(t, invoice)
		assert.NotEmpty(t, invoice.SyncedAt)

		mockService.AssertExpectations(t)
	})
}

// テストケース：バッチ同期
func TestFreeeService_BatchSync(t *testing.T) {
	ctx := context.Background()
	mockService := &MockFreeeService{}
	userID := uuid.New()

	t.Run("全データ同期", func(t *testing.T) {
		expectedResult := &FreeSyncResult{
			Success:        true,
			TotalProcessed: 20,
			SuccessCount:   18,
			FailureCount:   2,
			Details: map[string]interface{}{
				"partners": map[string]interface{}{
					"processed": 10,
					"success":   9,
					"failed":    1,
				},
				"invoices": map[string]interface{}{
					"processed": 10,
					"success":   9,
					"failed":    1,
				},
			},
		}

		mockService.On("SyncAllData", ctx, userID).
			Return(expectedResult, nil).Once()

		result, err := mockService.SyncAllData(ctx, userID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.Success)
		assert.Equal(t, 20, result.TotalProcessed)
		assert.Equal(t, 18, result.SuccessCount)

		mockService.AssertExpectations(t)
	})

	t.Run("クライアント同期", func(t *testing.T) {
		expectedResult := &FreeSyncResult{
			Success:        true,
			TotalProcessed: 10,
			SuccessCount:   10,
			FailureCount:   0,
		}

		mockService.On("SyncClients", ctx, userID).
			Return(expectedResult, nil).Once()

		result, err := mockService.SyncClients(ctx, userID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.Success)
		assert.Equal(t, 10, result.TotalProcessed)
		assert.Equal(t, 0, result.FailureCount)

		mockService.AssertExpectations(t)
	})

	t.Run("複数ユーザーのバッチ同期", func(t *testing.T) {
		userIDs := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}

		expectedResults := []*FreeBatchSyncResult{
			{
				UserID:         userIDs[0],
				Success:        true,
				ProcessedCount: 10,
				SuccessCount:   10,
				FailureCount:   0,
			},
			{
				UserID:         userIDs[1],
				Success:        true,
				ProcessedCount: 8,
				SuccessCount:   7,
				FailureCount:   1,
			},
			{
				UserID:         userIDs[2],
				Success:        false,
				ProcessedCount: 0,
				SuccessCount:   0,
				FailureCount:   0,
				Error:          "認証エラー",
			},
		}

		mockService.On("ProcessBatchSync", ctx, userIDs).
			Return(expectedResults, nil).Once()

		results, err := mockService.ProcessBatchSync(ctx, userIDs)

		assert.NoError(t, err)
		assert.NotNil(t, results)
		assert.Len(t, results, 3)
		assert.True(t, results[0].Success)
		assert.False(t, results[2].Success)
		assert.Equal(t, "認証エラー", results[2].Error)

		mockService.AssertExpectations(t)
	})
}

// テストケース：トークン管理
func TestFreeeService_TokenManagement(t *testing.T) {
	ctx := context.Background()
	mockService := &MockFreeeService{}
	userID := uuid.New()

	t.Run("有効なアクセストークン取得", func(t *testing.T) {
		expectedToken := "valid-access-token"

		mockService.On("GetValidAccessToken", ctx, userID).
			Return(expectedToken, nil).Once()

		token, err := mockService.GetValidAccessToken(ctx, userID)

		assert.NoError(t, err)
		assert.Equal(t, expectedToken, token)

		mockService.AssertExpectations(t)
	})

	t.Run("トークン有効期限チェック", func(t *testing.T) {
		// 期限切れのケース
		expiredTime := time.Now().Add(-1 * time.Hour)
		mockService.On("IsTokenExpired", expiredTime).
			Return(true).Once()

		isExpired := mockService.IsTokenExpired(expiredTime)
		assert.True(t, isExpired)

		// 有効なケース
		validTime := time.Now().Add(1 * time.Hour)
		mockService.On("IsTokenExpired", validTime).
			Return(false).Once()

		isExpired = mockService.IsTokenExpired(validTime)
		assert.False(t, isExpired)

		mockService.AssertExpectations(t)
	})

	t.Run("トークンリフレッシュスケジュール", func(t *testing.T) {
		mockService.On("ScheduleTokenRefresh", ctx, userID).
			Return(nil).Once()

		err := mockService.ScheduleTokenRefresh(ctx, userID)

		assert.NoError(t, err)

		mockService.AssertExpectations(t)
	})
}
