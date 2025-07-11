package mocks

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/stretchr/testify/mock"
)

// MockHTTPClient HTTPクライアントのモック
type MockHTTPClient struct {
	mock.Mock
}

// Do HTTPリクエストのモック
func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	args := m.Called(req)
	if resp, ok := args.Get(0).(*http.Response); ok {
		return resp, args.Error(1)
	}
	return nil, args.Error(1)
}

// MockResponseBuilder モックレスポンスを作成するヘルパー
type MockResponseBuilder struct {
	StatusCode int
	Headers    map[string]string
	Body       interface{}
}

// NewMockResponse モックレスポンスを作成
func NewMockResponse(statusCode int) *MockResponseBuilder {
	return &MockResponseBuilder{
		StatusCode: statusCode,
		Headers:    make(map[string]string),
	}
}

// WithHeader ヘッダーを追加
func (b *MockResponseBuilder) WithHeader(key, value string) *MockResponseBuilder {
	b.Headers[key] = value
	return b
}

// WithJSONBody JSONボディを設定
func (b *MockResponseBuilder) WithJSONBody(body interface{}) *MockResponseBuilder {
	b.Body = body
	b.Headers["Content-Type"] = "application/json"
	return b
}

// WithStringBody 文字列ボディを設定
func (b *MockResponseBuilder) WithStringBody(body string) *MockResponseBuilder {
	b.Body = body
	return b
}

// Build レスポンスを構築
func (b *MockResponseBuilder) Build() *http.Response {
	resp := &http.Response{
		StatusCode: b.StatusCode,
		Header:     make(http.Header),
	}

	// ヘッダーを設定
	for key, value := range b.Headers {
		resp.Header.Set(key, value)
	}

	// ボディを設定
	var bodyReader io.ReadCloser
	switch v := b.Body.(type) {
	case string:
		bodyReader = io.NopCloser(strings.NewReader(v))
	case []byte:
		bodyReader = io.NopCloser(bytes.NewReader(v))
	case nil:
		bodyReader = io.NopCloser(strings.NewReader(""))
	default:
		// JSONへシリアライズ
		jsonData, err := json.Marshal(v)
		if err != nil {
			bodyReader = io.NopCloser(strings.NewReader(""))
		} else {
			bodyReader = io.NopCloser(bytes.NewReader(jsonData))
		}
	}
	resp.Body = bodyReader

	return resp
}

// 事前定義されたレスポンス

// NewSuccessLoginResponse 成功ログインレスポンス
func NewSuccessLoginResponse() *http.Response {
	return NewMockResponse(200).
		WithJSONBody(map[string]interface{}{
			"message": "ログイン成功",
			"user": map[string]interface{}{
				"id":         "test-user-id",
				"email":      "test@duesk.co.jp",
				"first_name": "Test",
				"last_name":  "User",
				"role":       "employee",
				"department": "開発部",
			},
			"redirect_to": "/dashboard",
		}).
		Build()
}

// NewFailedLoginResponse 失敗ログインレスポンス
func NewFailedLoginResponse() *http.Response {
	return NewMockResponse(401).
		WithJSONBody(map[string]interface{}{
			"error": "メールアドレスまたはパスワードが正しくありません",
		}).
		Build()
}

// NewSuccessUserInfoResponse 成功ユーザー情報取得レスポンス
func NewSuccessUserInfoResponse() *http.Response {
	return NewMockResponse(200).
		WithJSONBody(map[string]interface{}{
			"user": map[string]interface{}{
				"id":         "test-user-id",
				"email":      "test@duesk.co.jp",
				"first_name": "Test",
				"last_name":  "User",
				"role":       "employee",
				"department": "開発部",
			},
		}).
		Build()
}

// NewUnauthorizedResponse 認証失敗レスポンス
func NewUnauthorizedResponse() *http.Response {
	return NewMockResponse(401).
		WithJSONBody(map[string]interface{}{
			"error": "認証が必要です",
		}).
		Build()
}

// NewInternalServerErrorResponse サーバーエラーレスポンス
func NewInternalServerErrorResponse() *http.Response {
	return NewMockResponse(500).
		WithJSONBody(map[string]interface{}{
			"error": "サーバーエラーが発生しました",
		}).
		Build()
}

// SetupSuccessfulLogin 成功するログインのモックを設定
func (m *MockHTTPClient) SetupSuccessfulLogin(email string) {
	m.On("Do", mock.MatchedBy(func(req *http.Request) bool {
		return req.Method == "POST" && strings.Contains(req.URL.Path, "/login")
	})).Return(NewSuccessLoginResponse(), nil)
}

// SetupFailedLogin 失敗するログインのモックを設定
func (m *MockHTTPClient) SetupFailedLogin(email string) {
	m.On("Do", mock.MatchedBy(func(req *http.Request) bool {
		return req.Method == "POST" && strings.Contains(req.URL.Path, "/login")
	})).Return(NewFailedLoginResponse(), nil)
}

// SetupSuccessfulUserInfo 成功するユーザー情報取得のモックを設定
func (m *MockHTTPClient) SetupSuccessfulUserInfo() {
	m.On("Do", mock.MatchedBy(func(req *http.Request) bool {
		return req.Method == "GET" && strings.Contains(req.URL.Path, "/user")
	})).Return(NewSuccessUserInfoResponse(), nil)
}

// SetupUnauthorizedResponse 認証失敗レスポンスのモックを設定
func (m *MockHTTPClient) SetupUnauthorizedResponse() {
	m.On("Do", mock.Anything).Return(NewUnauthorizedResponse(), nil)
}

// SetupServerError サーバーエラーレスポンスのモックを設定
func (m *MockHTTPClient) SetupServerError() {
	m.On("Do", mock.Anything).Return(NewInternalServerErrorResponse(), nil)
}

// SetupNetworkError ネットワークエラーのモックを設定
func (m *MockHTTPClient) SetupNetworkError() {
	m.On("Do", mock.Anything).Return(nil, fmt.Errorf("ネットワークエラー"))
}
