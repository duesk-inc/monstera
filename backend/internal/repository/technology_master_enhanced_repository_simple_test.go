package repository

import (
	"context"
	"testing"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestTechnologyMasterEnhancedRepositoryBasic(t *testing.T) {
	// テスト用のSQLiteデータベースを作成
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// テーブル作成（SQLite用に簡略化）
	err = db.Exec(`
		CREATE TABLE technology_master (
			id TEXT PRIMARY KEY,
			category TEXT NOT NULL,
			name TEXT NOT NULL,
			display_name TEXT,
			aliases TEXT,
			description TEXT,
			usage_count INTEGER DEFAULT 0,
			is_active BOOLEAN DEFAULT true,
			sort_order INTEGER DEFAULT 0,
			created_at DATETIME,
			updated_at DATETIME
		)
	`).Error
	assert.NoError(t, err)

	repo := NewTechnologyMasterEnhancedRepository(db, zap.NewNop())
	ctx := context.Background()

	t.Run("Create and Get", func(t *testing.T) {
		tech := &model.TechnologyMaster{
			ID:          uuid.New(),
			Category:    model.TechCategoryProgrammingLanguages,
			Name:        "Java",
			DisplayName: "Java",
			IsActive:    true,
			SortOrder:   1,
		}

		err := repo.Create(ctx, tech)
		assert.NoError(t, err)

		// 作成されたデータを確認
		result, err := repo.GetByID(ctx, tech.ID)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "Java", result.Name)
	})

	t.Run("SearchSuggestions", func(t *testing.T) {
		// テストデータ作成
		tech := &model.TechnologyMaster{
			ID:          uuid.New(),
			Category:    model.TechCategoryProgrammingLanguages,
			Name:        "javascript",
			DisplayName: "JavaScript",
			IsActive:    true,
			SortOrder:   1,
			UsageCount:  50,
		}
		err := repo.Create(ctx, tech)
		assert.NoError(t, err)

		// "ja"で検索
		categoryName := "programming_languages"
		req := dto.TechnologySuggestionRequest{
			Query:          "ja",
			CategoryName:   &categoryName,
			Limit:          10,
			IncludePopular: true,
		}

		results, err := repo.SearchSuggestions(ctx, req)
		assert.NoError(t, err)
		assert.True(t, len(results) >= 1) // JavaScript が該当
	})

	t.Run("IncrementUsageCount", func(t *testing.T) {
		tech := &model.TechnologyMaster{
			ID:          uuid.New(),
			Category:    model.TechCategoryProgrammingLanguages,
			Name:        "Go",
			DisplayName: "Go",
			IsActive:    true,
			SortOrder:   1,
			UsageCount:  5,
		}
		err := repo.Create(ctx, tech)
		assert.NoError(t, err)

		// 使用回数をインクリメント
		err = repo.IncrementUsageCount(ctx, tech.ID)
		assert.NoError(t, err)

		// 確認
		result, err := repo.GetByID(ctx, tech.ID)
		assert.NoError(t, err)
		assert.Equal(t, 6, result.UsageCount)
	})

	t.Run("FindOrCreateByName", func(t *testing.T) {
		// 存在しない技術で検索（新規作成される）
		result, err := repo.FindOrCreateByName(ctx, model.TechCategoryProgrammingLanguages, "Rust")
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "rust", result.Name) // 正規化される
		assert.Equal(t, "Rust", result.DisplayName)

		// 同じ技術で再度検索（既存が返される）
		result2, err := repo.FindOrCreateByName(ctx, model.TechCategoryProgrammingLanguages, "Rust")
		assert.NoError(t, err)
		assert.NotNil(t, result2)
		assert.Equal(t, result.ID, result2.ID)
	})
}
