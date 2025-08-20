package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/duesk/monstera/internal/dto"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// TestExpenseHandler_SubmitExpense_LimitExceeded tests limit exceeded error handling
func TestExpenseHandler_SubmitExpense_LimitExceeded(t *testing.T) {
	// テストケース定義
	tests := []struct {
		name           string
		expenseID      string
		serviceError   error
		expectedStatus int
		expectedCode   string
	}{
		{
			name:      "月次上限超過エラー",
			expenseID: "test-expense-1",
			serviceError: dto.NewExpenseError(
				dto.ErrCodeMonthlyLimitExceeded,
				"月次上限を超過します（残り: 6401円）",
			),
			expectedStatus: http.StatusBadRequest, // 期待値: 400
			expectedCode:   "E003B001",            // constants.ErrMonthlyLimitExceeded
		},
		{
			name:      "年次上限超過エラー",
			expenseID: "test-expense-2",
			serviceError: dto.NewExpenseError(
				dto.ErrCodeYearlyLimitExceeded,
				"年次上限を超過します（残り: 10000円）",
			),
			expectedStatus: http.StatusBadRequest, // 期待値: 400
			expectedCode:   "E003B002",            // constants.ErrYearlyLimitExceeded
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Ginのテストモードを設定
			gin.SetMode(gin.TestMode)

			// モックサービスの作成
			mockExpenseService := new(MockExpenseService)
			mockS3Service := new(MockS3Service)

			// ハンドラーの作成
			handler := &ExpenseHandler{
				expenseService: mockExpenseService,
				s3Service:      mockS3Service,
				logger:         zap.NewNop(),
			}

			// モックの設定
			mockExpenseService.On("SubmitExpense",
				mock.Anything,
				tt.expenseID,
				"test-user-id",
				mock.Anything,
			).Return(nil, tt.serviceError)

			// リクエストの作成
			body := dto.SubmitExpenseRequest{}
			jsonBody, _ := json.Marshal(body)
			req := httptest.NewRequest(
				http.MethodPost,
				fmt.Sprintf("/api/v1/expenses/%s/submit", tt.expenseID),
				bytes.NewBuffer(jsonBody),
			)
			req.Header.Set("Content-Type", "application/json")

			// レスポンスレコーダーの作成
			w := httptest.NewRecorder()

			// Ginコンテキストの作成
			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{
				{Key: "id", Value: tt.expenseID},
			}
			c.Set("userID", "test-user-id")

			// ハンドラーの実行
			handler.SubmitExpense(c)

			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatus, w.Code,
				"HTTPステータスコードが期待値と異なります。現在: %d, 期待値: %d",
				w.Code, tt.expectedStatus)

			// エラーレスポンスの検証
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)

			if errorData, ok := response["error"].(map[string]interface{}); ok {
				assert.Equal(t, tt.expectedCode, errorData["code"],
					"エラーコードが期待値と異なります")
			} else {
				t.Errorf("エラーレスポンスの形式が正しくありません: %v", response)
			}

			// モックの検証
			mockExpenseService.AssertExpectations(t)
		})
	}
}

// TestExpenseHandler_CreateWithReceipts_LimitExceeded tests limit exceeded error handling for CreateWithReceipts
func TestExpenseHandler_CreateWithReceipts_LimitExceeded(t *testing.T) {
	tests := []struct {
		name           string
		serviceError   error
		expectedStatus int
		expectedCode   string
	}{
		{
			name: "月次上限超過エラー（CreateWithReceipts）",
			serviceError: dto.NewExpenseError(
				dto.ErrCodeMonthlyLimitExceeded,
				"月次上限を超過します（残り: 5000円）",
			),
			expectedStatus: http.StatusBadRequest,
			expectedCode:   "E003B001",
		},
		{
			name: "年次上限超過エラー（CreateWithReceipts）",
			serviceError: dto.NewExpenseError(
				dto.ErrCodeYearlyLimitExceeded,
				"年次上限を超過します（残り: 50000円）",
			),
			expectedStatus: http.StatusBadRequest,
			expectedCode:   "E003B002",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)

			mockExpenseService := new(MockExpenseService)
			mockS3Service := new(MockS3Service)

			handler := &ExpenseHandler{
				expenseService: mockExpenseService,
				s3Service:      mockS3Service,
				logger:         zap.NewNop(),
			}

			// モックの設定
			mockExpenseService.On("CreateWithReceipts",
				mock.Anything,
				"test-user-id",
				mock.Anything,
			).Return(nil, tt.serviceError)

			// リクエストの作成
			body := dto.CreateExpenseWithReceiptsRequest{}
			jsonBody, _ := json.Marshal(body)
			req := httptest.NewRequest(
				http.MethodPost,
				"/api/v1/expenses/with-receipts",
				bytes.NewBuffer(jsonBody),
			)
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Set("userID", "test-user-id")

			handler.CreateExpenseWithReceipts(c)

			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatus, w.Code,
				"HTTPステータスコードが期待値と異なります")

			mockExpenseService.AssertExpectations(t)
		})
	}
}

// TestExpenseHandler_UpdateWithReceipts_LimitExceeded tests limit exceeded error handling for UpdateWithReceipts
func TestExpenseHandler_UpdateWithReceipts_LimitExceeded(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockExpenseService := new(MockExpenseService)
	mockS3Service := new(MockS3Service)

	handler := &ExpenseHandler{
		expenseService: mockExpenseService,
		s3Service:      mockS3Service,
		logger:         zap.NewNop(),
	}

	// 月次上限超過エラーを返すモック設定
	mockExpenseService.On("UpdateWithReceipts",
		mock.Anything,
		"test-expense-id",
		"test-user-id",
		mock.Anything,
	).Return(nil, dto.NewExpenseError(
		dto.ErrCodeMonthlyLimitExceeded,
		"月次上限を超過します",
	))

	body := dto.UpdateExpenseWithReceiptsRequest{}
	jsonBody, _ := json.Marshal(body)
	req := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/expenses/test-expense-id/with-receipts",
		bytes.NewBuffer(jsonBody),
	)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "test-expense-id"},
	}
	c.Set("userID", "test-user-id")

	handler.UpdateExpenseWithReceipts(c)

	// HTTPステータスコードが400であることを確認
	assert.Equal(t, http.StatusBadRequest, w.Code,
		"月次上限超過時はHTTP 400を返すべき")

	mockExpenseService.AssertExpectations(t)
}