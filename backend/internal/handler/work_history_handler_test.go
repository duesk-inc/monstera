package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockWorkHistoryEnhancedService モックサービス
type MockWorkHistoryEnhancedService struct {
	mock.Mock
}

func (m *MockWorkHistoryEnhancedService) GetWorkHistory(ctx context.Context, userID string) (*dto.WorkHistoryListResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.WorkHistoryListResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) GetWorkHistoryByID(ctx context.Context, id string) (*dto.WorkHistoryEnhancedResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.WorkHistoryEnhancedResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) CreateWorkHistory(ctx context.Context, userID string, req dto.WorkHistoryRequestV2) (*dto.WorkHistoryEnhancedResponse, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.WorkHistoryEnhancedResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) UpdateWorkHistory(ctx context.Context, id string, req dto.WorkHistoryRequestV2) (*dto.WorkHistoryEnhancedResponse, error) {
	args := m.Called(ctx, id, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.WorkHistoryEnhancedResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) DeleteWorkHistory(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockWorkHistoryEnhancedService) GetUserSummary(ctx context.Context, userID string) (*dto.WorkHistorySummaryResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.WorkHistorySummaryResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) GetUserTechnologySkills(ctx context.Context, userID string) ([]dto.TechnologySkillExperienceResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.TechnologySkillExperienceResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) SearchWorkHistories(ctx context.Context, req dto.WorkHistoryQueryRequest) (*dto.WorkHistoryListResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.WorkHistoryListResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) SaveTemporary(ctx context.Context, userID string, req dto.WorkHistoryTempSaveRequestV2) error {
	args := m.Called(ctx, userID, req)
	return args.Error(0)
}

func (m *MockWorkHistoryEnhancedService) BulkCreateWorkHistories(ctx context.Context, req dto.WorkHistoryBulkCreateRequest) ([]dto.WorkHistoryEnhancedResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.WorkHistoryEnhancedResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) BulkUpdateWorkHistories(ctx context.Context, req dto.WorkHistoryBulkUpdateRequest) ([]dto.WorkHistoryEnhancedResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.WorkHistoryEnhancedResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) CalculateITExperience(ctx context.Context, userID string) (*dto.ITExperienceResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ITExperienceResponse), args.Error(1)
}

func (m *MockWorkHistoryEnhancedService) GetWorkHistoryAnalytics(ctx context.Context, req dto.WorkHistoryAnalyticsRequest) (*dto.WorkHistoryAnalyticsResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.WorkHistoryAnalyticsResponse), args.Error(1)
}

// MockTechnologySuggestionService モック技術候補サービス
type MockTechnologySuggestionService struct {
	mock.Mock
}

func (m *MockTechnologySuggestionService) SearchSuggestions(ctx context.Context, req dto.TechnologySuggestionRequest) ([]dto.TechnologySuggestionResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.TechnologySuggestionResponse), args.Error(1)
}

func (m *MockTechnologySuggestionService) GetPopularByCategory(ctx context.Context, category string, limit int) ([]dto.TechnologySuggestionResponse, error) {
	args := m.Called(ctx, category, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.TechnologySuggestionResponse), args.Error(1)
}

func (m *MockTechnologySuggestionService) GetUserRecentTechnologies(ctx context.Context, userID string, limit int) ([]dto.TechnologySuggestionResponse, error) {
	args := m.Called(ctx, userID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.TechnologySuggestionResponse), args.Error(1)
}

func (m *MockTechnologySuggestionService) NormalizeAndSuggest(ctx context.Context, input string) (*dto.TechnologySuggestionResponse, []dto.TechnologySuggestionResponse, error) {
	args := m.Called(ctx, input)
	if args.Get(0) == nil {
		return nil, args.Get(1).([]dto.TechnologySuggestionResponse), args.Error(2)
	}
	return args.Get(0).(*dto.TechnologySuggestionResponse), args.Get(1).([]dto.TechnologySuggestionResponse), args.Error(2)
}

func (m *MockTechnologySuggestionService) BulkSearchSuggestions(ctx context.Context, queries []string, categoryFilter *string) (map[string][]dto.TechnologySuggestionResponse, error) {
	args := m.Called(ctx, queries, categoryFilter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string][]dto.TechnologySuggestionResponse), args.Error(1)
}

func (m *MockTechnologySuggestionService) RegisterNewTechnology(ctx context.Context, category model.TechCategory, name string, displayName *string) (*model.TechnologyMaster, error) {
	args := m.Called(ctx, category, name, displayName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TechnologyMaster), args.Error(1)
}

func (m *MockTechnologySuggestionService) GetCategories(ctx context.Context) ([]model.TechnologyCategoryInfo, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.TechnologyCategoryInfo), args.Error(1)
}

// テストヘルパー関数
func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestWorkHistoryHandler(t *testing.T) {
	// モックサービスとハンドラーの準備
	mockWorkHistoryService := new(MockWorkHistoryEnhancedService)
	mockTechService := new(MockTechnologySuggestionService)
	logger := zap.NewNop()
	handler := NewWorkHistoryHandler(mockWorkHistoryService, mockTechService, logger)

	userID := uuid.New().String()

	t.Run("GetWorkHistory - 成功", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history", func(c *gin.Context) {
			c.Set("userID", userID)
			handler.GetWorkHistory(c)
		})

		response := &dto.WorkHistoryListResponse{
			Summary: dto.WorkHistorySummaryResponse{
				UserID:            userID,
				TotalProjectCount: 3,
			},
			WorkHistories: []dto.WorkHistoryEnhancedResponse{
				{
					ID:          uuid.New().String(),
					UserID:      userID,
					ProjectName: "テストプロジェクト",
				},
			},
			Total: 1,
		}

		mockWorkHistoryService.On("GetWorkHistory", mock.Anything, userID).Return(response, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/work-history", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var result dto.WorkHistoryListResponse
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Equal(t, int32(3), result.Summary.TotalProjectCount)
		assert.Len(t, result.WorkHistories, 1)

		mockWorkHistoryService.AssertExpectations(t)
	})

	t.Run("CreateWorkHistory - 成功", func(t *testing.T) {
		router := setupTestRouter()
		router.POST("/api/v1/work-history", func(c *gin.Context) {
			c.Set("userID", userID)
			handler.CreateWorkHistory(c)
		})

		createReq := dto.WorkHistoryRequestV2{
			ProjectName: "新規プロジェクト",
			StartDate:   "2023-01-01",
			Industry:    "IT・Web",
			Role:        "SE",
		}

		createdResponse := &dto.WorkHistoryEnhancedResponse{
			ID:          uuid.New().String(),
			UserID:      userID,
			ProjectName: "新規プロジェクト",
			StartDate:   "2023-01-01",
			Role:        "SE",
		}

		mockWorkHistoryService.On("CreateWorkHistory", mock.Anything, userID, mock.MatchedBy(func(req dto.WorkHistoryRequestV2) bool {
			return req.ProjectName == "新規プロジェクト"
		})).Return(createdResponse, nil)

		body, _ := json.Marshal(createReq)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/work-history", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var result dto.WorkHistoryEnhancedResponse
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Equal(t, "新規プロジェクト", result.ProjectName)

		mockWorkHistoryService.AssertExpectations(t)
	})

	t.Run("GetWorkHistory - 認証エラー", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history", handler.GetWorkHistory)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/work-history", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)

		var result map[string]string
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Contains(t, result["error"], "認証が必要です")
	})

	t.Run("GetTechnologySuggestions - 成功", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history/technology-suggestions", handler.GetTechnologySuggestions)

		suggestions := []dto.TechnologySuggestionResponse{
			{
				TechnologyName:      "java",
				CategoryDisplayName: "プログラミング言語",
				UsageCount:          150,
				IsPopular:           true,
				MatchScore:          1.0,
			},
		}

		mockTechService.On("SearchSuggestions", mock.Anything, mock.MatchedBy(func(req dto.TechnologySuggestionRequest) bool {
			return req.Query == "java"
		})).Return(suggestions, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/work-history/technology-suggestions?query=java", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var result []dto.TechnologySuggestionResponse
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Len(t, result, 1)
		assert.Equal(t, "java", result[0].TechnologyName)

		mockTechService.AssertExpectations(t)
	})

	t.Run("GetTechnologyCategories - 成功", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history/technology-categories", handler.GetTechnologyCategories)

		categories := []model.TechnologyCategoryInfo{
			{
				Name:        "programming_languages",
				DisplayName: "プログラミング言語",
				Count:       50,
			},
		}

		mockTechService.On("GetCategories", mock.Anything).Return(categories, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/work-history/technology-categories", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var result []model.TechnologyCategoryInfo
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Len(t, result, 1)
		assert.Equal(t, "プログラミング言語", result[0].DisplayName)

		mockTechService.AssertExpectations(t)
	})
}
