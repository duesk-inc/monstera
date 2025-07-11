package test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockHTTPClient HTTPクライアントのモック
type MockHTTPClient struct {
	mock.Mock
}

func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*http.Response), args.Error(1)
}

// FreeeHTTPClient freee API呼び出し用のHTTPクライアントラッパー
type FreeeHTTPClient struct {
	client      HTTPClient
	baseURL     string
	accessToken string
}

type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// NewFreeeHTTPClient FreeeHTTPClientのコンストラクタ
func NewFreeeHTTPClient(client HTTPClient, baseURL, accessToken string) *FreeeHTTPClient {
	return &FreeeHTTPClient{
		client:      client,
		baseURL:     baseURL,
		accessToken: accessToken,
	}
}

// APIレスポンス構造体（freee API用）
type FreeeAPIResponse struct {
	Meta    *FreeeAPIResponseMeta `json:"meta,omitempty"`
	Data    interface{}           `json:"data,omitempty"`
	Message string                `json:"message,omitempty"`
	Errors  []FreeeAPIError       `json:"errors,omitempty"`
}

type FreeeAPIResponseMeta struct {
	TotalCount int `json:"total_count"`
	Offset     int `json:"offset"`
	Limit      int `json:"limit"`
}

type FreeeAPIError struct {
	Type        string `json:"type"`
	Message     string `json:"message"`
	Description string `json:"description"`
}

// freee API 取引先データ
type FreeePartnerAPIResponse struct {
	ID          int    `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	ContactName string `json:"contact_name"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Zipcode     string `json:"zipcode"`
	Prefecture  string `json:"prefecture"`
	StreetName1 string `json:"street_name1"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// freee API 請求書データ
type FreeeInvoiceAPIResponse struct {
	ID              int                              `json:"id"`
	CompanyID       int                              `json:"company_id"`
	IssueDate       string                           `json:"issue_date"`
	PartnerID       int                              `json:"partner_id"`
	PartnerCode     string                           `json:"partner_code"`
	InvoiceNumber   string                           `json:"invoice_number"`
	Title           string                           `json:"title"`
	DueDate         string                           `json:"due_date"`
	TotalAmount     int                              `json:"total_amount"`
	TotalVat        int                              `json:"total_vat"`
	SubTotal        int                              `json:"sub_total"`
	InvoiceStatus   string                           `json:"invoice_status"`
	PaymentStatus   string                           `json:"payment_status"`
	InvoiceContents []FreeeInvoiceContentAPIResponse `json:"invoice_contents"`
	CreatedAt       string                           `json:"created_at"`
	UpdatedAt       string                           `json:"updated_at"`
}

type FreeeInvoiceContentAPIResponse struct {
	ID          int    `json:"id"`
	Order       int    `json:"order"`
	Type        string `json:"type"`
	Qty         int    `json:"qty"`
	Unit        string `json:"unit"`
	UnitPrice   int    `json:"unit_price"`
	Amount      int    `json:"amount"`
	Vat         int    `json:"vat"`
	Description string `json:"description"`
}

// freee OAuth トークンレスポンス
type FreeeOAuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

// freee 会社情報
type FreeeCompanyAPIResponse struct {
	ID                  int    `json:"id"`
	Name                string `json:"name"`
	NameKana            string `json:"name_kana"`
	DisplayName         string `json:"display_name"`
	TaxAccountingPeriod string `json:"tax_accounting_period"`
	ContactName         string `json:"contact_name"`
	HeadCount           int    `json:"head_count"`
	CreatedAt           string `json:"created_at"`
	UpdatedAt           string `json:"updated_at"`
}

// HTTPクライアントのヘルパーメソッド
func (f *FreeeHTTPClient) newRequest(method, endpoint string, body interface{}) (*http.Request, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, f.baseURL+endpoint, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+f.accessToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	return req, nil
}

func (f *FreeeHTTPClient) doRequest(req *http.Request, result interface{}) error {
	resp, err := f.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errorResp FreeeAPIResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err != nil {
			return fmt.Errorf("HTTP %d: failed to decode error response", resp.StatusCode)
		}
		return fmt.Errorf("freee API error: %s", errorResp.Message)
	}

	if result != nil {
		return json.NewDecoder(resp.Body).Decode(result)
	}

	return nil
}

// APIメソッド実装例
func (f *FreeeHTTPClient) GetPartners(ctx context.Context) ([]*FreeePartnerAPIResponse, error) {
	req, err := f.newRequest("GET", "/api/1/partners", nil)
	if err != nil {
		return nil, err
	}
	req = req.WithContext(ctx)

	var response struct {
		Partners []*FreeePartnerAPIResponse `json:"partners"`
	}

	if err := f.doRequest(req, &response); err != nil {
		return nil, err
	}

	return response.Partners, nil
}

func (f *FreeeHTTPClient) CreatePartner(ctx context.Context, partner *FreeePartnerAPIResponse) (*FreeePartnerAPIResponse, error) {
	req, err := f.newRequest("POST", "/api/1/partners", map[string]interface{}{
		"name":         partner.Name,
		"code":         partner.Code,
		"contact_name": partner.ContactName,
		"email":        partner.Email,
		"phone":        partner.Phone,
		"zipcode":      partner.Zipcode,
		"prefecture":   partner.Prefecture,
		"street_name1": partner.StreetName1,
	})
	if err != nil {
		return nil, err
	}
	req = req.WithContext(ctx)

	var response struct {
		Partner *FreeePartnerAPIResponse `json:"partner"`
	}

	if err := f.doRequest(req, &response); err != nil {
		return nil, err
	}

	return response.Partner, nil
}

func (f *FreeeHTTPClient) GetInvoices(ctx context.Context, from, to time.Time) ([]*FreeeInvoiceAPIResponse, error) {
	endpoint := fmt.Sprintf("/api/1/invoices?from_issue_date=%s&to_issue_date=%s",
		from.Format("2006-01-02"), to.Format("2006-01-02"))

	req, err := f.newRequest("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}
	req = req.WithContext(ctx)

	var response struct {
		Invoices []*FreeeInvoiceAPIResponse `json:"invoices"`
	}

	if err := f.doRequest(req, &response); err != nil {
		return nil, err
	}

	return response.Invoices, nil
}

func (f *FreeeHTTPClient) ExchangeCodeForToken(ctx context.Context, code, redirectURI string) (*FreeeOAuthTokenResponse, error) {
	req, err := f.newRequest("POST", "/oauth/token", map[string]interface{}{
		"grant_type":   "authorization_code",
		"code":         code,
		"redirect_uri": redirectURI,
	})
	if err != nil {
		return nil, err
	}
	req = req.WithContext(ctx)

	var response FreeeOAuthTokenResponse
	if err := f.doRequest(req, &response); err != nil {
		return nil, err
	}

	return &response, nil
}

func (f *FreeeHTTPClient) GetCompanies(ctx context.Context) ([]*FreeeCompanyAPIResponse, error) {
	req, err := f.newRequest("GET", "/api/1/companies", nil)
	if err != nil {
		return nil, err
	}
	req = req.WithContext(ctx)

	var response struct {
		Companies []*FreeeCompanyAPIResponse `json:"companies"`
	}

	if err := f.doRequest(req, &response); err != nil {
		return nil, err
	}

	return response.Companies, nil
}

// テストケース：OAuth認証
func TestFreeeHTTPClient_OAuth(t *testing.T) {
	ctx := context.Background()
	mockClient := &MockHTTPClient{}
	freeeClient := NewFreeeHTTPClient(mockClient, "https://api.freee.co.jp", "")

	t.Run("認証コード交換", func(t *testing.T) {
		expectedResponse := &FreeeOAuthTokenResponse{
			AccessToken:  "new-access-token",
			TokenType:    "Bearer",
			ExpiresIn:    3600,
			RefreshToken: "new-refresh-token",
			Scope:        "read write",
		}

		// モックレスポンスを作成
		responseBody, _ := json.Marshal(expectedResponse)
		resp := &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(bytes.NewReader(responseBody)),
		}

		mockClient.On("Do", mock.MatchedBy(func(req *http.Request) bool {
			return req.Method == "POST" && req.URL.Path == "/oauth/token"
		})).Return(resp, nil).Once()

		result, err := freeeClient.ExchangeCodeForToken(ctx, "auth-code", "http://localhost:3000/callback")

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "new-access-token", result.AccessToken)
		assert.Equal(t, 3600, result.ExpiresIn)

		mockClient.AssertExpectations(t)
	})
}

// テストケース：取引先API
func TestFreeeHTTPClient_Partners(t *testing.T) {
	ctx := context.Background()
	mockClient := &MockHTTPClient{}
	freeeClient := NewFreeeHTTPClient(mockClient, "https://api.freee.co.jp", "test-token")

	t.Run("取引先一覧取得", func(t *testing.T) {
		expectedPartners := []*FreeePartnerAPIResponse{
			{
				ID:          1001,
				Code:        "PARTNER001",
				Name:        "テスト会社A",
				ContactName: "山田太郎",
				Email:       "yamada@duesk.co.jp",
				Phone:       "03-1234-5678",
				Zipcode:     "100-0001",
				Prefecture:  "東京都",
				StreetName1: "千代田区千代田1-1",
			},
		}

		responseBody, _ := json.Marshal(map[string]interface{}{
			"partners": expectedPartners,
		})
		resp := &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(bytes.NewReader(responseBody)),
		}

		mockClient.On("Do", mock.MatchedBy(func(req *http.Request) bool {
			return req.Method == "GET" && req.URL.Path == "/api/1/partners"
		})).Return(resp, nil).Once()

		partners, err := freeeClient.GetPartners(ctx)

		assert.NoError(t, err)
		assert.NotNil(t, partners)
		assert.Len(t, partners, 1)
		assert.Equal(t, "テスト会社A", partners[0].Name)
		assert.Equal(t, "PARTNER001", partners[0].Code)

		mockClient.AssertExpectations(t)
	})

	t.Run("取引先作成", func(t *testing.T) {
		newPartner := &FreeePartnerAPIResponse{
			Code:        "PARTNER002",
			Name:        "新規会社",
			ContactName: "佐藤花子",
			Email:       "sato@duesk.co.jp",
			Phone:       "03-9876-5432",
		}

		expectedResponse := &FreeePartnerAPIResponse{
			ID:          1002,
			Code:        newPartner.Code,
			Name:        newPartner.Name,
			ContactName: newPartner.ContactName,
			Email:       newPartner.Email,
			Phone:       newPartner.Phone,
			CreatedAt:   "2024-01-15T10:30:00+09:00",
		}

		responseBody, _ := json.Marshal(map[string]interface{}{
			"partner": expectedResponse,
		})
		resp := &http.Response{
			StatusCode: 201,
			Body:       io.NopCloser(bytes.NewReader(responseBody)),
		}

		mockClient.On("Do", mock.MatchedBy(func(req *http.Request) bool {
			return req.Method == "POST" && req.URL.Path == "/api/1/partners"
		})).Return(resp, nil).Once()

		partner, err := freeeClient.CreatePartner(ctx, newPartner)

		assert.NoError(t, err)
		assert.NotNil(t, partner)
		assert.Equal(t, 1002, partner.ID)
		assert.Equal(t, "新規会社", partner.Name)
		assert.NotEmpty(t, partner.CreatedAt)

		mockClient.AssertExpectations(t)
	})
}

// テストケース：請求書API
func TestFreeeHTTPClient_Invoices(t *testing.T) {
	ctx := context.Background()
	mockClient := &MockHTTPClient{}
	freeeClient := NewFreeeHTTPClient(mockClient, "https://api.freee.co.jp", "test-token")

	t.Run("請求書一覧取得", func(t *testing.T) {
		expectedInvoices := []*FreeeInvoiceAPIResponse{
			{
				ID:            2001,
				CompanyID:     12345,
				IssueDate:     "2024-01-31",
				PartnerID:     1001,
				PartnerCode:   "PARTNER001",
				InvoiceNumber: "INV-2024-001",
				Title:         "1月分請求書",
				DueDate:       "2024-02-29",
				TotalAmount:   110000,
				TotalVat:      10000,
				SubTotal:      100000,
				InvoiceStatus: "issued",
				PaymentStatus: "unpaid",
				InvoiceContents: []FreeeInvoiceContentAPIResponse{
					{
						ID:          3001,
						Order:       0,
						Type:        "normal",
						Qty:         1,
						Unit:        "式",
						UnitPrice:   100000,
						Amount:      100000,
						Vat:         10000,
						Description: "システム開発",
					},
				},
			},
		}

		responseBody, _ := json.Marshal(map[string]interface{}{
			"invoices": expectedInvoices,
		})
		resp := &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(bytes.NewReader(responseBody)),
		}

		mockClient.On("Do", mock.MatchedBy(func(req *http.Request) bool {
			return req.Method == "GET" && req.URL.Path == "/api/1/invoices"
		})).Return(resp, nil).Once()

		from := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		to := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)

		invoices, err := freeeClient.GetInvoices(ctx, from, to)

		assert.NoError(t, err)
		assert.NotNil(t, invoices)
		assert.Len(t, invoices, 1)
		assert.Equal(t, "INV-2024-001", invoices[0].InvoiceNumber)
		assert.Equal(t, 110000, invoices[0].TotalAmount)
		assert.Len(t, invoices[0].InvoiceContents, 1)

		mockClient.AssertExpectations(t)
	})
}

// テストケース：会社情報API
func TestFreeeHTTPClient_Companies(t *testing.T) {
	ctx := context.Background()
	mockClient := &MockHTTPClient{}
	freeeClient := NewFreeeHTTPClient(mockClient, "https://api.freee.co.jp", "test-token")

	t.Run("会社一覧取得", func(t *testing.T) {
		expectedCompanies := []*FreeeCompanyAPIResponse{
			{
				ID:          12345,
				Name:        "株式会社テスト",
				NameKana:    "カブシキガイシャテスト",
				DisplayName: "テスト",
				ContactName: "代表取締役 田中太郎",
				HeadCount:   10,
				CreatedAt:   "2020-01-01T00:00:00+09:00",
			},
		}

		responseBody, _ := json.Marshal(map[string]interface{}{
			"companies": expectedCompanies,
		})
		resp := &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(bytes.NewReader(responseBody)),
		}

		mockClient.On("Do", mock.MatchedBy(func(req *http.Request) bool {
			return req.Method == "GET" && req.URL.Path == "/api/1/companies"
		})).Return(resp, nil).Once()

		companies, err := freeeClient.GetCompanies(ctx)

		assert.NoError(t, err)
		assert.NotNil(t, companies)
		assert.Len(t, companies, 1)
		assert.Equal(t, 12345, companies[0].ID)
		assert.Equal(t, "株式会社テスト", companies[0].Name)

		mockClient.AssertExpectations(t)
	})
}

// テストケース：エラーハンドリング
func TestFreeeHTTPClient_ErrorHandling(t *testing.T) {
	ctx := context.Background()
	mockClient := &MockHTTPClient{}
	freeeClient := NewFreeeHTTPClient(mockClient, "https://api.freee.co.jp", "invalid-token")

	t.Run("認証エラー", func(t *testing.T) {
		errorResponse := FreeeAPIResponse{
			Message: "Invalid access token",
			Errors: []FreeeAPIError{
				{
					Type:        "authentication_error",
					Message:     "Invalid access token",
					Description: "The provided access token is invalid",
				},
			},
		}

		responseBody, _ := json.Marshal(errorResponse)
		resp := &http.Response{
			StatusCode: 401,
			Body:       io.NopCloser(bytes.NewReader(responseBody)),
		}

		mockClient.On("Do", mock.AnythingOfType("*http.Request")).
			Return(resp, nil).Once()

		_, err := freeeClient.GetPartners(ctx)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid access token")

		mockClient.AssertExpectations(t)
	})

	t.Run("レート制限エラー", func(t *testing.T) {
		errorResponse := FreeeAPIResponse{
			Message: "Rate limit exceeded",
			Errors: []FreeeAPIError{
				{
					Type:        "rate_limit_error",
					Message:     "Rate limit exceeded",
					Description: "API rate limit has been exceeded",
				},
			},
		}

		responseBody, _ := json.Marshal(errorResponse)
		resp := &http.Response{
			StatusCode: 429,
			Body:       io.NopCloser(bytes.NewReader(responseBody)),
		}

		mockClient.On("Do", mock.AnythingOfType("*http.Request")).
			Return(resp, nil).Once()

		_, err := freeeClient.GetPartners(ctx)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Rate limit exceeded")

		mockClient.AssertExpectations(t)
	})
}

// テストケース：実際のfreee APIサーバーを使用した統合テスト（テスト用サーバー）
func TestFreeeHTTPClient_Integration(t *testing.T) {
	// モックサーバーを作成
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.URL.Path {
		case "/api/1/partners":
			if r.Method == "GET" {
				response := map[string]interface{}{
					"partners": []map[string]interface{}{
						{
							"id":           1001,
							"code":         "PARTNER001",
							"name":         "統合テスト会社",
							"contact_name": "統合テスト担当者",
							"email":        "integration@test.com",
						},
					},
				}
				json.NewEncoder(w).Encode(response)
			}

		case "/api/1/companies":
			if r.Method == "GET" {
				response := map[string]interface{}{
					"companies": []map[string]interface{}{
						{
							"id":           12345,
							"name":         "統合テスト株式会社",
							"display_name": "統合テスト",
							"contact_name": "代表取締役 統合太郎",
						},
					},
				}
				json.NewEncoder(w).Encode(response)
			}

		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	// 実際のHTTPクライアントを使用
	freeeClient := NewFreeeHTTPClient(&http.Client{}, server.URL, "integration-test-token")
	ctx := context.Background()

	t.Run("統合テスト: 取引先一覧取得", func(t *testing.T) {
		partners, err := freeeClient.GetPartners(ctx)

		assert.NoError(t, err)
		assert.NotNil(t, partners)
		assert.Len(t, partners, 1)
		assert.Equal(t, "統合テスト会社", partners[0].Name)
	})

	t.Run("統合テスト: 会社一覧取得", func(t *testing.T) {
		companies, err := freeeClient.GetCompanies(ctx)

		assert.NoError(t, err)
		assert.NotNil(t, companies)
		assert.Len(t, companies, 1)
		assert.Equal(t, "統合テスト株式会社", companies[0].Name)
	})
}
