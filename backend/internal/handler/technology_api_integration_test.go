package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestTechnologyAPI(t *testing.T) {
	// モックサービスとハンドラーの準備
	mockWorkHistoryService := new(MockWorkHistoryEnhancedService)
	mockTechService := new(MockTechnologySuggestionService)
	handler := NewWorkHistoryHandler(mockWorkHistoryService, mockTechService, nil)

	t.Run("技術候補検索 - 複数パラメータ", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history/technology-suggestions", handler.GetTechnologySuggestions)

		suggestions := []dto.TechnologySuggestionResponse{
			{
				TechnologyName:      "javascript",
				CategoryDisplayName: "プログラミング言語",
				UsageCount:          200,
				IsPopular:           true,
				MatchScore:          0.9,
			},
			{
				TechnologyName:      "java",
				CategoryDisplayName: "プログラミング言語",
				UsageCount:          150,
				IsPopular:           true,
				MatchScore:          1.0,
			},
		}

		mockTechService.On("SearchSuggestions", mock.Anything, mock.MatchedBy(func(req dto.TechnologySuggestionRequest) bool {
			return req.Query == "java" &&
				req.Limit == 20 &&
				req.IncludePopular == true &&
				req.CategoryName != nil && *req.CategoryName == "プログラミング言語"
		})).Return(suggestions, nil)

		// URLパラメータを構築
		params := url.Values{}
		params.Add("query", "java")
		params.Add("limit", "20")
		params.Add("include_popular", "true")
		params.Add("category", "プログラミング言語")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/work-history/technology-suggestions?"+params.Encode(), nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var result []dto.TechnologySuggestionResponse
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Len(t, result, 2)

		// マッチスコアの高い順に返ってくることを確認
		assert.Equal(t, "java", result[1].TechnologyName)
		assert.Equal(t, float64(1.0), result[1].MatchScore)

		mockTechService.AssertExpectations(t)
	})

	t.Run("人気技術取得 - カテゴリ別", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history/popular-technologies", handler.GetPopularTechnologies)

		popularTechs := []dto.TechnologySuggestionResponse{
			{
				TechnologyName:      "docker",
				CategoryDisplayName: "ツール・その他",
				UsageCount:          300,
				IsPopular:           true,
				MatchScore:          1.0,
			},
			{
				TechnologyName:      "kubernetes",
				CategoryDisplayName: "ツール・その他",
				UsageCount:          250,
				IsPopular:           true,
				MatchScore:          1.0,
			},
		}

		mockTechService.On("GetPopularByCategory", mock.Anything, "ツール・その他", 5).Return(popularTechs, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/work-history/popular-technologies?category=ツール・その他&limit=5", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var result []dto.TechnologySuggestionResponse
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Len(t, result, 2)
		assert.True(t, result[0].UsageCount >= result[1].UsageCount) // 使用回数順

		mockTechService.AssertExpectations(t)
	})

	t.Run("技術カテゴリ一覧 - 全カテゴリ取得", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history/technology-categories", handler.GetTechnologyCategories)

		categories := []model.TechnologyCategoryInfo{
			{
				Name:        "programming_languages",
				DisplayName: "プログラミング言語",
				Description: "Java, Python, JavaScript など",
				Count:       120,
				SortOrder:   1,
			},
			{
				Name:        "servers_databases",
				DisplayName: "サーバー・データベース",
				Description: "MySQL, PostgreSQL, MongoDB, Apache など",
				Count:       80,
				SortOrder:   2,
			},
			{
				Name:        "tools",
				DisplayName: "ツール・その他",
				Description: "Git, Jenkins, Docker, Kubernetes など",
				Count:       150,
				SortOrder:   3,
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
		assert.Len(t, result, 3)

		// ソート順を確認
		assert.Equal(t, "programming_languages", result[0].Name)
		assert.Equal(t, "servers_databases", result[1].Name)
		assert.Equal(t, "tools", result[2].Name)

		mockTechService.AssertExpectations(t)
	})

	t.Run("技術候補検索 - エラーケース", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history/technology-suggestions", handler.GetTechnologySuggestions)

		// クエリパラメータなし
		req := httptest.NewRequest(http.MethodGet, "/api/v1/work-history/technology-suggestions", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var result map[string]string
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Contains(t, result["error"], "検索クエリは必須です")
	})

	t.Run("人気技術取得 - エラーケース", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history/popular-technologies", handler.GetPopularTechnologies)

		// カテゴリパラメータなし
		req := httptest.NewRequest(http.MethodGet, "/api/v1/work-history/popular-technologies", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var result map[string]string
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Contains(t, result["error"], "カテゴリは必須です")
	})
}

// 実際の使用シナリオテスト
func TestTechnologyAPIUsageScenario(t *testing.T) {
	mockWorkHistoryService := new(MockWorkHistoryEnhancedService)
	mockTechService := new(MockTechnologySuggestionService)
	handler := NewWorkHistoryHandler(mockWorkHistoryService, mockTechService, nil)

	t.Run("フロントエンドでの技術入力シナリオ", func(t *testing.T) {
		router := setupTestRouter()
		router.GET("/api/v1/work-history/technology-suggestions", handler.GetTechnologySuggestions)
		router.GET("/api/v1/work-history/technology-categories", handler.GetTechnologyCategories)

		// Step 1: カテゴリ一覧を取得
		categories := []model.TechnologyCategoryInfo{
			{Name: "programming_languages", DisplayName: "プログラミング言語", Count: 50},
			{Name: "servers_databases", DisplayName: "サーバー・データベース", Count: 30},
		}
		mockTechService.On("GetCategories", mock.Anything).Return(categories, nil).Once()

		req1 := httptest.NewRequest(http.MethodGet, "/api/v1/work-history/technology-categories", nil)
		w1 := httptest.NewRecorder()
		router.ServeHTTP(w1, req1)
		assert.Equal(t, http.StatusOK, w1.Code)

		// Step 2: ユーザーが"ja"と入力（Java, JavaScript を候補表示）
		suggestions := []dto.TechnologySuggestionResponse{
			{TechnologyName: "java", CategoryDisplayName: "プログラミング言語", MatchScore: 1.0},
			{TechnologyName: "javascript", CategoryDisplayName: "プログラミング言語", MatchScore: 0.9},
		}
		mockTechService.On("SearchSuggestions", mock.Anything, mock.MatchedBy(func(req dto.TechnologySuggestionRequest) bool {
			return req.Query == "ja"
		})).Return(suggestions, nil).Once()

		req2 := httptest.NewRequest(http.MethodGet, "/api/v1/work-history/technology-suggestions?query=ja", nil)
		w2 := httptest.NewRecorder()
		router.ServeHTTP(w2, req2)
		assert.Equal(t, http.StatusOK, w2.Code)

		var result []dto.TechnologySuggestionResponse
		json.Unmarshal(w2.Body.Bytes(), &result)
		assert.Len(t, result, 2)
		assert.Equal(t, "java", result[0].TechnologyName)

		mockTechService.AssertExpectations(t)
	})
}
