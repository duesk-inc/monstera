package repository

import (
	"context"
	"testing"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB テスト用データベースのセットアップ
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	// テーブルを作成
	err = db.AutoMigrate(&model.TechnologyMaster{})
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

func TestTechnologyMasterRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	logger := zap.NewNop()
	repo := NewTechnologyMasterRepository(db, logger)

	tech := &model.TechnologyMaster{
		Category:    model.TechCategoryProgrammingLanguages,
		Name:        "golang",
		DisplayName: "Go",
		Aliases:     "go,golang",
		Description: "Google開発のプログラミング言語",
		IsActive:    true,
		SortOrder:   1,
	}

	err := repo.Create(context.Background(), tech)
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, tech.ID)
}

func TestTechnologyMasterRepository_GetByName(t *testing.T) {
	db := setupTestDB(t)
	logger := zap.NewNop()
	repo := NewTechnologyMasterRepository(db, logger)

	// テストデータを作成
	tech := &model.TechnologyMaster{
		Category:    model.TechCategoryProgrammingLanguages,
		Name:        "golang",
		DisplayName: "Go",
		IsActive:    true,
	}
	err := repo.Create(context.Background(), tech)
	assert.NoError(t, err)

	// 名前で検索
	found, err := repo.GetByName(context.Background(), model.TechCategoryProgrammingLanguages, "golang")
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "golang", found.Name)
	assert.Equal(t, "Go", found.DisplayName)
}

func TestTechnologyMasterRepository_SearchByPrefix(t *testing.T) {
	db := setupTestDB(t)
	logger := zap.NewNop()
	repo := NewTechnologyMasterRepository(db, logger)

	// テストデータを作成
	techs := []*model.TechnologyMaster{
		{
			Category:    model.TechCategoryProgrammingLanguages,
			Name:        "java",
			DisplayName: "Java",
			UsageCount:  10,
			IsActive:    true,
		},
		{
			Category:    model.TechCategoryProgrammingLanguages,
			Name:        "javascript",
			DisplayName: "JavaScript",
			UsageCount:  5,
			IsActive:    true,
		},
		{
			Category:    model.TechCategoryProgrammingLanguages,
			Name:        "python",
			DisplayName: "Python",
			IsActive:    true,
		},
	}

	for _, tech := range techs {
		err := repo.Create(context.Background(), tech)
		assert.NoError(t, err)
	}

	// "java"で検索
	results, err := repo.SearchByPrefix(context.Background(), model.TechCategoryProgrammingLanguages, "java", 10)
	assert.NoError(t, err)
	assert.Len(t, results, 2)
	// UsageCountが高い順にソート
	assert.Equal(t, "java", results[0].Name)
	assert.Equal(t, "javascript", results[1].Name)
}

func TestNormalizeTechnologyName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"C#", "csharp"},
		{"c#", "csharp"},
		{"C++", "cplusplus"},
		{"Node.js", "nodejs"},
		{"React.js", "react"},
		{"Vue.js", "vue"},
		{"Angular.js", "angular"},
		{"ASP.NET", "aspnet"},
		{".NET", "dotnet"},
		{"Python", "python"},
		{"JAVA", "java"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := NormalizeTechnologyName(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
