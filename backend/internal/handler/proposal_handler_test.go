//go:build proposal_tests
// +build proposal_tests

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
	"github.com/duesk/monstera/internal/testdata"
	"github.com/duesk/monstera/internal/utils"
)

// MockProposalService ProposalServiceのモック実装
type MockProposalService struct {
	mock.Mock
}

func (m *MockProposalService) GetProposals(ctx context.Context, userID string, req *dto.GetProposalsRequest) (*dto.ProposalListResponse, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProposalListResponse), args.Error(1)
}

func (m *MockProposalService) GetProposalDetail(ctx context.Context, id string, userID string) (*dto.ProposalDetailResponse, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProposalDetailResponse), args.Error(1)
}

func (m *MockProposalService) UpdateProposalStatus(ctx context.Context, id string, userID string, req *dto.UpdateProposalStatusRequest) error {
	args := m.Called(ctx, id, userID, req)
	return args.Error(0)
}

func (m *MockProposalService) CreateQuestion(ctx context.Context, proposalID string, userID string, req *dto.CreateQuestionRequest) (*dto.ProposalQuestionDTO, error) {
	args := m.Called(ctx, proposalID, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProposalQuestionDTO), args.Error(1)
}

func (m *MockProposalService) GetQuestions(ctx context.Context, proposalID string, userID string, req *dto.GetQuestionsRequest) (*dto.QuestionsListResponse, error) {
	args := m.Called(ctx, proposalID, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.QuestionsListResponse), args.Error(1)
}

func (m *MockProposalService) UpdateQuestion(ctx context.Context, questionID string, userID string, req *dto.UpdateQuestionRequest) error {
	args := m.Called(ctx, questionID, userID, req)
	return args.Error(0)
}

func (m *MockProposalService) DeleteQuestion(ctx context.Context, questionID string, userID string) error {
	args := m.Called(ctx, questionID, userID)
	return args.Error(0)
}

func (m *MockProposalService) RespondToQuestion(ctx context.Context, questionID string, salesUserID string, req *dto.RespondQuestionRequest) error {
	args := m.Called(ctx, questionID, salesUserID, req)
	return args.Error(0)
}

func (m *MockProposalService) GetPendingQuestions(ctx context.Context, salesUserID string, req *dto.GetPendingQuestionsRequest) (*dto.PendingQuestionsListResponse, error) {
	args := m.Called(ctx, salesUserID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.PendingQuestionsListResponse), args.Error(1)
}

func (m *MockProposalService) AssignQuestionToSales(ctx context.Context, questionID string, assignerID string, salesUserID string) error {
	args := m.Called(ctx, questionID, assignerID, salesUserID)
	return args.Error(0)
}

func (m *MockProposalService) GetProposalStats(ctx context.Context, userID string) (*dto.ProposalSummaryResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProposalSummaryResponse), args.Error(1)
}

func (m *MockProposalService) GetProposalDashboard(ctx context.Context, userID string) (*dto.ProposalSummaryResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProposalSummaryResponse), args.Error(1)
}

func (m *MockProposalService) GetQuestionStatistics(ctx context.Context, userID string) (*dto.ProposalSummaryResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProposalSummaryResponse), args.Error(1)
}

func (m *MockProposalService) GetSystemProposalSummary(ctx context.Context) (*dto.ProposalSummaryResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProposalSummaryResponse), args.Error(1)
}

func (m *MockProposalService) GetProposalTrends(ctx context.Context, months int) (*dto.ProposalSummaryResponse, error) {
	args := m.Called(ctx, months)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProposalSummaryResponse), args.Error(1)
}

func (m *MockProposalService) GetUserProposalRanking(ctx context.Context, limit int) (*dto.ProposalSummaryResponse, error) {
	args := m.Called(ctx, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ProposalSummaryResponse), args.Error(1)
}

func (m *MockProposalService) CreateProposal(ctx context.Context, projectID string, userID string) (*model.EngineerProposal, error) {
	args := m.Called(ctx, projectID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.EngineerProposal), args.Error(1)
}

func (m *MockProposalService) CheckProposalPermission(ctx context.Context, proposalID string, userID string) error {
	args := m.Called(ctx, proposalID, userID)
	return args.Error(0)
}

func (m *MockProposalService) CheckQuestionPermission(ctx context.Context, questionID string, userID string) error {
	args := m.Called(ctx, questionID, userID)
	return args.Error(0)
}

func (m *MockProposalService) CleanupOldQuestions(ctx context.Context, maxDays int) error {
	args := m.Called(ctx, maxDays)
	return args.Error(0)
}

// setupProposalTestHandler テスト用ハンドラーのセットアップ
func setupProposalTestHandler(t *testing.T) (ProposalHandler, *MockProposalService) {
	logger := zap.NewNop()
	mockService := &MockProposalService{}

	handler := NewProposalHandler(mockService, logger)

	return handler, mockService
}

// setupTestContext テスト用のGinコンテキストを作成
func setupTestContext(method, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	var bodyBytes []byte
	if body != nil {
		bodyBytes, _ = json.Marshal(body)
	}

	req := httptest.NewRequest(method, path, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	// テスト用のユーザーIDを設定
	userID := uuid.New().String()
	c.Set("user_id", userID)

	return c, w
}

// TestProposalHandler_GetProposals 提案一覧取得のテスト
func TestProposalHandler_GetProposals(t *testing.T) {
	t.Run("正常ケース - 提案一覧取得成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		c, w := setupTestContext("GET", "/api/v1/proposals", nil)

		// テストデータの準備
		userID := c.GetString("user_id")
		userUUID := userID
		expectedResponse := &dto.ProposalListResponse{
			Items: []dto.ProposalItemDTO{
				{
					ID:          uuid.New().String(),
					ProjectName: "テストプロジェクト",
					Status:      "proposed",
				},
			},
			Total: 1,
			Page:  1,
			Limit: 20,
		}

		// モックの設定
		mockService.On("GetProposals", mock.Anything, userUUID, mock.AnythingOfType("*dto.GetProposalsRequest")).
			Return(expectedResponse, nil)

		// テスト実行
		handler.GetProposals(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)

		var response dto.ProposalListResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, expectedResponse.Total, response.Total)
		assert.Len(t, response.Items, 1)
		assert.Equal(t, "テストプロジェクト", response.Items[0].ProjectName)
	})

	t.Run("異常ケース - サービスエラー", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		c, w := setupTestContext("GET", "/api/v1/proposals", nil)

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定（エラーを返す）
		mockService.On("GetProposals", mock.Anything, userUUID, mock.AnythingOfType("*dto.GetProposalsRequest")).
			Return(nil, fmt.Errorf("データベースエラー"))

		// テスト実行
		handler.GetProposals(c)

		// 結果検証
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

// TestProposalHandler_GetProposalDetail 提案詳細取得のテスト
func TestProposalHandler_GetProposalDetail(t *testing.T) {
	t.Run("正常ケース - 提案詳細取得成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		proposalID := uuid.New().String()
		c, w := setupTestContext("GET", fmt.Sprintf("/api/v1/proposals/%s", proposalID), nil)
		c.Params = []gin.Param{{Key: "id", Value: proposalID}}

		userID := c.GetString("user_id")
		userUUID := userID

		expectedResponse := &dto.ProposalDetailResponse{
			ID:        proposalID,
			ProjectID: uuid.New().String(),
			Status:    "proposed",
			Project: dto.ProjectDetailDTO{
				ID:          uuid.New().String(),
				ProjectName: "テストプロジェクト詳細",
				Description: "プロジェクトの説明",
			},
			Questions: []dto.ProposalQuestionDTO{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		// モックの設定
		mockService.On("GetProposalDetail", mock.Anything, proposalID, userUUID).
			Return(expectedResponse, nil)

		// テスト実行
		handler.GetProposalDetail(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)

		var response dto.ProposalDetailResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, proposalID, response.ID)
		assert.Equal(t, "テストプロジェクト詳細", response.Project.ProjectName)
	})

	t.Run("異常ケース - 無効なID形式", func(t *testing.T) {
		handler, _ := setupProposalTestHandler(t)
		c, w := setupTestContext("GET", "/api/v1/proposals/invalid-id", nil)
		c.Params = []gin.Param{{Key: "id", Value: "invalid-id"}}

		// テスト実行
		handler.GetProposalDetail(c)

		// 結果検証
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestProposalHandler_UpdateProposalStatus 提案ステータス更新のテスト
func TestProposalHandler_UpdateProposalStatus(t *testing.T) {
	t.Run("正常ケース - ステータス更新成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		proposalID := uuid.New().String()

		requestBody := dto.UpdateProposalStatusRequest{
			Status: "proceed",
		}

		c, w := setupTestContext("PUT", fmt.Sprintf("/api/v1/proposals/%s/status", proposalID), requestBody)
		c.Params = []gin.Param{{Key: "id", Value: proposalID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定
		mockService.On("UpdateProposalStatus", mock.Anything, proposalID, userUUID, &requestBody).
			Return(nil)

		// テスト実行
		handler.UpdateProposalStatus(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("異常ケース - 無効なリクエストボディ", func(t *testing.T) {
		handler, _ := setupProposalTestHandler(t)
		proposalID := uuid.New().String()

		c, w := setupTestContext("PUT", fmt.Sprintf("/api/v1/proposals/%s/status", proposalID), "invalid-json")
		c.Params = []gin.Param{{Key: "id", Value: proposalID}}

		// テスト実行
		handler.UpdateProposalStatus(c)

		// 結果検証
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestProposalHandler_CreateQuestion 質問作成のテスト
func TestProposalHandler_CreateQuestion(t *testing.T) {
	t.Run("正常ケース - 質問作成成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		proposalID := uuid.New().String()

		requestBody := dto.CreateQuestionRequest{
			QuestionText: "プロジェクトの開始時期はいつですか？",
		}

		c, w := setupTestContext("POST", fmt.Sprintf("/api/v1/proposals/%s/questions", proposalID), requestBody)
		c.Params = []gin.Param{{Key: "proposalId", Value: proposalID}}

		userID := c.GetString("user_id")
		userUUID := userID

		expectedQuestion := &dto.ProposalQuestionDTO{
			ID:           uuid.New().String(),
			QuestionText: "プロジェクトの開始時期はいつですか？",
			IsResponded:  false,
			CreatedAt:    time.Now(),
		}

		// モックの設定
		mockService.On("CreateQuestion", mock.Anything, proposalID, userUUID, &requestBody).
			Return(expectedQuestion, nil)

		// テスト実行
		handler.CreateQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusCreated, w.Code)

		var response dto.ProposalQuestionDTO
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "プロジェクトの開始時期はいつですか？", response.QuestionText)
		assert.False(t, response.IsResponded)
	})

	t.Run("異常ケース - 質問文が空", func(t *testing.T) {
		handler, _ := setupProposalTestHandler(t)
		proposalID := uuid.New().String()

		requestBody := dto.CreateQuestionRequest{
			QuestionText: "",
		}

		c, w := setupTestContext("POST", fmt.Sprintf("/api/v1/proposals/%s/questions", proposalID), requestBody)
		c.Params = []gin.Param{{Key: "proposalId", Value: proposalID}}

		// テスト実行
		handler.CreateQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestProposalHandler_GetQuestions 質問一覧取得のテスト
func TestProposalHandler_GetQuestions(t *testing.T) {
	t.Run("正常ケース - 質問一覧取得成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		proposalID := uuid.New().String()
		c, w := setupTestContext("GET", fmt.Sprintf("/api/v1/proposals/%s/questions", proposalID), nil)
		c.Params = []gin.Param{{Key: "proposalId", Value: proposalID}}

		userID := c.GetString("user_id")
		userUUID := userID

		expectedResponse := &dto.QuestionsListResponse{
			Items: []dto.ProposalQuestionDTO{
				{
					ID:           uuid.New().String(),
					QuestionText: "テスト質問1",
					IsResponded:  false,
					CreatedAt:    time.Now(),
				},
				{
					ID:           uuid.New().String(),
					QuestionText: "テスト質問2",
					IsResponded:  true,
					ResponseText: func(s string) *string { return &s }("テスト回答2"),
					CreatedAt:    time.Now(),
				},
			},
			Total: 2,
		}

		// モックの設定
		mockService.On("GetQuestions", mock.Anything, proposalID, userUUID, mock.AnythingOfType("*dto.GetQuestionsRequest")).
			Return(expectedResponse, nil)

		// テスト実行
		handler.GetQuestions(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)

		var response dto.QuestionsListResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, 2, response.Total)
		assert.Len(t, response.Items, 2)
		assert.Equal(t, "テスト質問1", response.Items[0].QuestionText)
		assert.False(t, response.Items[0].IsResponded)
		assert.True(t, response.Items[1].IsResponded)
	})
}

// TestProposalHandler_UpdateQuestion 質問更新のテスト
func TestProposalHandler_UpdateQuestion(t *testing.T) {
	t.Run("正常ケース - 質問更新成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		questionID := uuid.New().String()

		requestBody := dto.UpdateQuestionRequest{
			QuestionText: "更新された質問内容",
		}

		c, w := setupTestContext("PUT", fmt.Sprintf("/api/v1/questions/%s", questionID), requestBody)
		c.Params = []gin.Param{{Key: "id", Value: questionID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定
		mockService.On("UpdateQuestion", mock.Anything, questionID, userUUID, &requestBody).
			Return(nil)

		// テスト実行
		handler.UpdateQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// TestProposalHandler_DeleteQuestion 質問削除のテスト
func TestProposalHandler_DeleteQuestion(t *testing.T) {
	t.Run("正常ケース - 質問削除成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		questionID := uuid.New().String()

		c, w := setupTestContext("DELETE", fmt.Sprintf("/api/v1/questions/%s", questionID), nil)
		c.Params = []gin.Param{{Key: "id", Value: questionID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定
		mockService.On("DeleteQuestion", mock.Anything, questionID, userUUID).
			Return(nil)

		// テスト実行
		handler.DeleteQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// TestProposalHandler_RespondToQuestion 質問回答のテスト
func TestProposalHandler_RespondToQuestion(t *testing.T) {
	t.Run("正常ケース - 質問回答成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		questionID := uuid.New().String()

		requestBody := dto.RespondQuestionRequest{
			ResponseText: "こちらが回答です",
		}

		c, w := setupTestContext("PUT", fmt.Sprintf("/api/v1/questions/%s/response", questionID), requestBody)
		c.Params = []gin.Param{{Key: "id", Value: questionID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定
		mockService.On("RespondToQuestion", mock.Anything, questionID, userUUID, &requestBody).
			Return(nil)

		// テスト実行
		handler.RespondToQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// TestProposalHandler_GetPendingQuestions 未回答質問一覧取得のテスト
func TestProposalHandler_GetPendingQuestions(t *testing.T) {
	t.Run("正常ケース - 未回答質問一覧取得成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		c, w := setupTestContext("GET", "/api/v1/sales/questions/pending", nil)

		userID := c.GetString("user_id")
		userUUID := userID

		expectedResponse := &dto.PendingQuestionsListResponse{
			Items: []dto.PendingQuestionDTO{
				{
					ID:           uuid.New().String(),
					QuestionText: "未回答の質問1",
					ProjectName:  "プロジェクトA",
					Engineer: &dto.ProposalUserSummaryDTO{
						ID:        uuid.New().String(),
						FirstName: "太郎",
						LastName:  "山田",
						Email:     testdata.MockMaleEmail,
					},
					CreatedAt: time.Now(),
				},
			},
			Total: 1,
		}

		// モックの設定
		mockService.On("GetPendingQuestions", mock.Anything, userUUID, mock.AnythingOfType("*dto.GetPendingQuestionsRequest")).
			Return(expectedResponse, nil)

		// テスト実行
		handler.GetPendingQuestions(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)

		var response dto.PendingQuestionsListResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, 1, response.Total)
		assert.Len(t, response.Items, 1)
		assert.Equal(t, "未回答の質問1", response.Items[0].QuestionText)
	})
}

// TestProposalHandler_GetProposalStats 提案統計取得のテスト
func TestProposalHandler_GetProposalStats(t *testing.T) {
	t.Run("正常ケース - 提案統計取得成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		c, w := setupTestContext("GET", "/api/v1/proposals/stats", nil)

		userID := c.GetString("user_id")
		userUUID := userID

		expectedResponse := &dto.ProposalSummaryResponse{
			TotalProposals:        10,
			RespondedProposals:    3,
			ProceedProposals:      4,
			DeclinedProposals:     3,
			PendingQuestionsCount: 5,
		}

		// モックの設定
		mockService.On("GetProposalStats", mock.Anything, userUUID).
			Return(expectedResponse, nil)

		// テスト実行
		handler.GetProposalStats(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)

		var response dto.ProposalSummaryResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, 10, response.TotalProposals)
		assert.Equal(t, 3, response.RespondedProposals)
		assert.Equal(t, 4, response.ProceedProposals)
		assert.Equal(t, 3, response.DeclinedProposals)
		assert.Equal(t, 5, response.PendingQuestionsCount)
		// assert.Equal(t, 24.5, response.ResponseTime) // Field removed
	})

	t.Run("異常ケース - サービスエラー", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		c, w := setupTestContext("GET", "/api/v1/proposals/stats", nil)

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定（エラーを返す）
		mockService.On("GetProposalStats", mock.Anything, userUUID).
			Return(nil, fmt.Errorf("統計計算エラー"))

		// テスト実行
		handler.GetProposalStats(c)

		// 結果検証
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("異常ケース - ユーザーIDが不正", func(t *testing.T) {
		handler, _ := setupProposalTestHandler(t)
		c, w := setupTestContext("GET", "/api/v1/proposals/stats", nil)
		c.Set("user_id", "invalid-uuid")

		// テスト実行
		handler.GetProposalStats(c)

		// 結果検証
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestProposalHandler_AssignQuestionToSales 質問営業担当者割り当てのテスト
func TestProposalHandler_AssignQuestionToSales(t *testing.T) {
	t.Run("正常ケース - 営業担当者割り当て成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		questionID := uuid.New().String()
		salesUserID := uuid.New().String()

		requestBody := map[string]interface{}{
			"sales_user_id": salesUserID,
		}

		c, w := setupTestContext("POST", fmt.Sprintf("/api/v1/questions/%s/assign", questionID), requestBody)
		c.Params = []gin.Param{{Key: "id", Value: questionID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定
		mockService.On("AssignQuestionToSales", mock.Anything, questionID, userUUID, salesUserID).
			Return(nil)

		// テスト実行
		handler.AssignQuestionToSales(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("異常ケース - 無効な質問ID", func(t *testing.T) {
		handler, _ := setupProposalTestHandler(t)
		salesUserID := uuid.New().String()

		requestBody := map[string]interface{}{
			"sales_user_id": salesUserID,
		}

		c, w := setupTestContext("POST", "/api/v1/questions/invalid-id/assign", requestBody)
		c.Params = []gin.Param{{Key: "id", Value: "invalid-id"}}

		// テスト実行
		handler.AssignQuestionToSales(c)

		// 結果検証
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("異常ケース - 無効なリクエストボディ", func(t *testing.T) {
		handler, _ := setupProposalTestHandler(t)
		questionID := uuid.New().String()

		c, w := setupTestContext("POST", fmt.Sprintf("/api/v1/questions/%s/assign", questionID), "invalid-json")
		c.Params = []gin.Param{{Key: "id", Value: questionID}}

		// テスト実行
		handler.AssignQuestionToSales(c)

		// 結果検証
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestProposalHandler_GetProposalDashboard ダッシュボード取得のテスト
func TestProposalHandler_GetProposalDashboard(t *testing.T) {
	t.Run("正常ケース - ダッシュボード取得成功", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		c, w := setupTestContext("GET", "/api/v1/proposals/dashboard", nil)

		userID := c.GetString("user_id")
		userUUID := userID

		expectedResponse := &dto.ProposalSummaryResponse{
			TotalProposals:        15,
			RespondedProposals:    5,
			ProceedProposals:      6,
			DeclinedProposals:     4,
			PendingQuestionsCount: 8,
		}

		// モックの設定
		mockService.On("GetProposalDashboard", mock.Anything, userUUID).
			Return(expectedResponse, nil)

		// テスト実行
		handler.GetProposalDashboard(c)

		// 結果検証
		assert.Equal(t, http.StatusOK, w.Code)

		var response dto.ProposalSummaryResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, 15, response.TotalProposals)
		assert.Equal(t, 5, response.RespondedProposals)
		assert.Equal(t, 6, response.ProceedProposals)
		assert.Equal(t, 4, response.DeclinedProposals)
		assert.Equal(t, 8, response.PendingQuestionsCount)
		// assert.Equal(t, 18.5, response.ResponseTime) // Field removed
	})

	t.Run("異常ケース - サービスエラー", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		c, w := setupTestContext("GET", "/api/v1/proposals/dashboard", nil)

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定（エラーを返す）
		mockService.On("GetProposalDashboard", mock.Anything, userUUID).
			Return(nil, fmt.Errorf("ダッシュボードデータ取得エラー"))

		// テスト実行
		handler.GetProposalDashboard(c)

		// 結果検証
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

// TestProposalHandler_ErrorCases 追加のエラーケーステスト
func TestProposalHandler_ErrorCases(t *testing.T) {
	t.Run("GetProposalDetail - 存在しない提案ID", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		proposalID := uuid.New().String()
		c, w := setupTestContext("GET", fmt.Sprintf("/api/v1/proposals/%s", proposalID), nil)
		c.Params = []gin.Param{{Key: "id", Value: proposalID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定（not foundエラー）
		mockService.On("GetProposalDetail", mock.Anything, proposalID, userUUID).
			Return(nil, fmt.Errorf("提案が見つかりません"))

		// テスト実行
		handler.GetProposalDetail(c)

		// 結果検証
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("CreateQuestion - 質問数上限超過", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		proposalID := uuid.New().String()

		requestBody := dto.CreateQuestionRequest{
			QuestionText: "11個目の質問です",
		}

		c, w := setupTestContext("POST", fmt.Sprintf("/api/v1/proposals/%s/questions", proposalID), requestBody)
		c.Params = []gin.Param{{Key: "proposalId", Value: proposalID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定（質問数上限エラー）
		mockService.On("CreateQuestion", mock.Anything, proposalID, userUUID, &requestBody).
			Return(nil, fmt.Errorf("質問数が上限を超えています"))

		// テスト実行
		handler.CreateQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("UpdateQuestion - 24時間経過後の編集試行", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		questionID := uuid.New().String()

		requestBody := dto.UpdateQuestionRequest{
			QuestionText: "24時間後の編集試行",
		}

		c, w := setupTestContext("PUT", fmt.Sprintf("/api/v1/questions/%s", questionID), requestBody)
		c.Params = []gin.Param{{Key: "id", Value: questionID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定（編集期限エラー）
		mockService.On("UpdateQuestion", mock.Anything, questionID, userUUID, &requestBody).
			Return(fmt.Errorf("編集期限を超過しています"))

		// テスト実行
		handler.UpdateQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("DeleteQuestion - 回答済み質問の削除試行", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		questionID := uuid.New().String()

		c, w := setupTestContext("DELETE", fmt.Sprintf("/api/v1/questions/%s", questionID), nil)
		c.Params = []gin.Param{{Key: "id", Value: questionID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定（回答済み質問削除エラー）
		mockService.On("DeleteQuestion", mock.Anything, questionID, userUUID).
			Return(fmt.Errorf("回答済みの質問は削除できません"))

		// テスト実行
		handler.DeleteQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("RespondToQuestion - 空の回答テキスト", func(t *testing.T) {
		handler, _ := setupProposalTestHandler(t)
		questionID := uuid.New().String()

		requestBody := dto.RespondQuestionRequest{
			ResponseText: "",
		}

		c, w := setupTestContext("PUT", fmt.Sprintf("/api/v1/questions/%s/response", questionID), requestBody)
		c.Params = []gin.Param{{Key: "id", Value: questionID}}

		// テスト実行
		handler.RespondToQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestProposalHandler_PermissionChecks 権限チェックのテスト
func TestProposalHandler_PermissionChecks(t *testing.T) {
	t.Run("UpdateProposalStatus - 権限不足", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		proposalID := uuid.New().String()

		requestBody := dto.UpdateProposalStatusRequest{
			Status: "proceed",
		}

		c, w := setupTestContext("PUT", fmt.Sprintf("/api/v1/proposals/%s/status", proposalID), requestBody)
		c.Params = []gin.Param{{Key: "id", Value: proposalID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定（権限エラー）
		mockService.On("UpdateProposalStatus", mock.Anything, proposalID, userUUID, &requestBody).
			Return(fmt.Errorf("権限がありません"))

		// テスト実行
		handler.UpdateProposalStatus(c)

		// 結果検証
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("CreateQuestion - 他人の提案への質問投稿試行", func(t *testing.T) {
		handler, mockService := setupProposalTestHandler(t)
		proposalID := uuid.New().String()

		requestBody := dto.CreateQuestionRequest{
			QuestionText: "他人の提案への質問",
		}

		c, w := setupTestContext("POST", fmt.Sprintf("/api/v1/proposals/%s/questions", proposalID), requestBody)
		c.Params = []gin.Param{{Key: "proposalId", Value: proposalID}}

		userID := c.GetString("user_id")
		userUUID := userID

		// モックの設定（権限エラー）
		mockService.On("CreateQuestion", mock.Anything, proposalID, userUUID, &requestBody).
			Return(nil, fmt.Errorf("この提案への質問権限がありません"))

		// テスト実行
		handler.CreateQuestion(c)

		// 結果検証
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}
