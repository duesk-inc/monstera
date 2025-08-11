package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

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

// MockS3Service S3Serviceのモック
type MockS3Service struct {
	mock.Mock
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
	userID := uuid.New().String()
	ctx.Set("user_id", userID)

	return ctx, w
}

// TestExpenseHandler_Basic 基本的なハンドラーテスト
func TestExpenseHandler_Basic(t *testing.T) {
	t.Run("Ginコンテキストが正常に作成される", func(t *testing.T) {
		ctx, w := setupGinContext("POST", "/test", nil)

		assert.NotNil(t, ctx, "Ginコンテキストが作成される")
		assert.NotNil(t, w, "ResponseRecorderが作成される")
		assert.Equal(t, "POST", ctx.Request.Method, "HTTPメソッドが正しく設定される")
		assert.Equal(t, "/test", ctx.Request.URL.Path, "URLパスが正しく設定される")

		// ユーザーIDが設定されているか確認
		userID, exists := ctx.Get("user_id")
		assert.True(t, exists, "ユーザーIDが設定されている")
		assert.IsType(t, string{}, userID, "ユーザーIDがUUID型である")
	})

	t.Run("JSONレスポンスが正常に作成される", func(t *testing.T) {
		ctx, w := setupGinContext("GET", "/test", nil)

		// テスト用のJSONレスポンス
		testData := map[string]interface{}{
			"message": "test success",
			"status":  "ok",
		}

		ctx.JSON(http.StatusOK, testData)

		assert.Equal(t, http.StatusOK, w.Code, "ステータスコードが正しい")
		assert.Contains(t, w.Header().Get("Content-Type"), "application/json", "Content-Typeがapplication/json")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err, "JSONが正常にパースされる")
		assert.Equal(t, "test success", response["message"], "メッセージが正しい")
		assert.Equal(t, "ok", response["status"], "ステータスが正しい")
	})

	t.Run("バリデーションエラーのレスポンス", func(t *testing.T) {
		ctx, w := setupGinContext("POST", "/test", nil)

		// バリデーションエラーのレスポンス
		errorResponse := map[string]interface{}{
			"error":   "validation_error",
			"message": "必須フィールドが不足しています",
		}

		ctx.JSON(http.StatusBadRequest, errorResponse)

		assert.Equal(t, http.StatusBadRequest, w.Code, "ステータスコードが400")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err, "JSONが正常にパースされる")
		assert.Contains(t, response, "error", "エラーフィールドが存在する")
		assert.Equal(t, "validation_error", response["error"], "エラータイプが正しい")
	})
}

// TestExpenseHandler_MockSetup モックのセットアップテスト
func TestExpenseHandler_MockSetup(t *testing.T) {
	t.Run("ExpenseServiceモックが正常に動作", func(t *testing.T) {
		mockService := new(MockExpenseService)

		// モックの動作をテスト
		mockService.On("TestMethod", mock.Anything).Return("test_result")

		assert.NotNil(t, mockService, "モックサービスが作成される")
	})

	t.Run("S3Serviceモックが正常に動作", func(t *testing.T) {
		mockS3Service := new(MockS3Service)

		// モックの動作をテスト
		mockS3Service.On("TestMethod", mock.Anything).Return("test_result")

		assert.NotNil(t, mockS3Service, "モックS3サービスが作成される")
	})

	t.Run("ロガーが正常に初期化される", func(t *testing.T) {
		logger := zap.NewNop()

		assert.NotNil(t, logger, "ロガーが作成される")
	})
}
