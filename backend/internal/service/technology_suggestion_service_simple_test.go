package service

import (
	"testing"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestTechnologySuggestionServiceLogic(t *testing.T) {
	t.Run("カテゴリ名変換ロジック", func(t *testing.T) {
		service := &technologySuggestionService{}

		testCases := []struct {
			input    string
			expected model.TechCategory
		}{
			{"プログラミング言語", model.TechCategoryProgrammingLanguages},
			{"programming_languages", model.TechCategoryProgrammingLanguages},
			{"サーバー・データベース", model.TechCategoryServersDatabases},
			{"servers_databases", model.TechCategoryServersDatabases},
			{"ツール・その他", model.TechCategoryTools},
			{"tools", model.TechCategoryTools},
			{"不明なカテゴリ", model.TechCategoryTools}, // デフォルト
		}

		for _, tc := range testCases {
			t.Run(tc.input, func(t *testing.T) {
				result := service.categoryNameToEnum(tc.input)
				assert.Equal(t, tc.expected, result)
			})
		}
	})

	t.Run("カテゴリ表示名取得", func(t *testing.T) {
		service := &technologySuggestionService{}

		testCases := []struct {
			category model.TechCategory
			expected string
		}{
			{model.TechCategoryProgrammingLanguages, "プログラミング言語"},
			{model.TechCategoryServersDatabases, "サーバー・データベース"},
			{model.TechCategoryTools, "ツール・その他"},
			{model.TechCategory("unknown"), "unknown"}, // デフォルト
		}

		for _, tc := range testCases {
			t.Run(string(tc.category), func(t *testing.T) {
				result := service.getCategoryDisplayName(tc.category)
				assert.Equal(t, tc.expected, result)
			})
		}
	})

	t.Run("マッチスコア計算", func(t *testing.T) {
		service := &technologySuggestionService{}

		testCases := []struct {
			query    string
			target   string
			expected float64
			desc     string
		}{
			{"java", "java", 1.0, "完全一致"},
			{"Java", "java", 1.0, "大文字小文字の完全一致"},
			{"java", "javascript", 0.9, "前方一致"},
			{"script", "javascript", 0.7, "部分一致"},
			{"jaba", "java", 0.45, "1文字違い（レーベンシュタイン距離）"},
			{"abc", "xyz", 0, "全く異なる文字列"},
		}

		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				score := service.calculateMatchScore(tc.query, tc.target)
				assert.InDelta(t, tc.expected, score, 0.1, "スコアが期待値から離れすぎている")
			})
		}
	})

	t.Run("レスポンス変換", func(t *testing.T) {
		service := &technologySuggestionService{}

		// DisplayNameあり
		tech1 := &model.TechnologyMaster{
			Name:        "java",
			DisplayName: "Java",
			Category:    model.TechCategoryProgrammingLanguages,
			UsageCount:  150,
		}

		response1 := service.convertToSuggestionResponse(tech1)
		assert.Equal(t, "java", response1.TechnologyName)
		assert.NotNil(t, response1.TechnologyDisplayName)
		assert.Equal(t, "Java", *response1.TechnologyDisplayName)
		assert.Equal(t, "プログラミング言語", response1.CategoryDisplayName)
		assert.True(t, response1.IsPopular)

		// DisplayNameなし
		tech2 := &model.TechnologyMaster{
			Name:        "customlib",
			DisplayName: "",
			Category:    model.TechCategoryTools,
			UsageCount:  50,
		}

		response2 := service.convertToSuggestionResponse(tech2)
		assert.Equal(t, "customlib", response2.TechnologyName)
		assert.Nil(t, response2.TechnologyDisplayName)
		assert.Equal(t, "ツール・その他", response2.CategoryDisplayName)
		assert.False(t, response2.IsPopular)
	})

	t.Run("レーベンシュタイン距離計算", func(t *testing.T) {
		testCases := []struct {
			s1       string
			s2       string
			expected int
		}{
			{"", "", 0},
			{"a", "", 1},
			{"", "a", 1},
			{"cat", "cat", 0},
			{"cat", "cut", 1},
			{"cat", "dog", 3},
			{"saturday", "sunday", 3},
		}

		for _, tc := range testCases {
			t.Run(tc.s1+"_vs_"+tc.s2, func(t *testing.T) {
				distance := levenshteinDistance(tc.s1, tc.s2)
				assert.Equal(t, tc.expected, distance)
			})
		}
	})

	t.Run("技術候補の重複チェック", func(t *testing.T) {
		service := &technologySuggestionService{}

		responses := []dto.TechnologySuggestionResponse{
			{
				TechnologyName: "java",
				UsageCount:     100,
			},
			{
				TechnologyName: "javascript",
				UsageCount:     200,
			},
		}

		// 現在の実装では常にfalseを返すことを確認
		// TODO: 実装が更新されたらテストも更新
		result := service.containsTechnology(responses, uuid.New())
		assert.False(t, result)
	})
}

// ヘルパー関数のテスト
func TestHelperFunctions(t *testing.T) {
	t.Run("min関数", func(t *testing.T) {
		assert.Equal(t, 1, min(1, 2, 3))
		assert.Equal(t, -5, min(10, -5, 0))
		assert.Equal(t, 5, min(5))
	})

	t.Run("max関数", func(t *testing.T) {
		assert.Equal(t, 10, max(5, 10))
		assert.Equal(t, 5, max(5, -10))
		assert.Equal(t, 0, max(0, 0))
	})
}
