package repository

import (
	"context"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
)

// TechnologyCategoryRepository 技術カテゴリリポジトリインターフェース
type TechnologyCategoryRepository interface {
	GetAll(ctx context.Context) ([]model.TechnologyCategory, error)
	GetByName(ctx context.Context, name string) (*model.TechnologyCategory, error)
	GetByID(ctx context.Context, id string) (*model.TechnologyCategory, error)
}

// technologyCategoryRepository 技術カテゴリリポジトリ実装
type technologyCategoryRepository struct {
	base repository.BaseRepository
}

// NewTechnologyCategoryRepository 技術カテゴリリポジトリのコンストラクタ
func NewTechnologyCategoryRepository(base repository.BaseRepository) TechnologyCategoryRepository {
	return &technologyCategoryRepository{
		base: base,
	}
}

// GetAll すべての技術カテゴリを取得
func (r *technologyCategoryRepository) GetAll(ctx context.Context) ([]model.TechnologyCategory, error) {
	var categories []model.TechnologyCategory

	db := r.base.WithContext(ctx)
	if err := db.Order("sort_order ASC").Find(&categories).Error; err != nil {
		return nil, err
	}

	return categories, nil
}

// GetByName 名前で技術カテゴリを取得
func (r *technologyCategoryRepository) GetByName(ctx context.Context, name string) (*model.TechnologyCategory, error) {
	var category model.TechnologyCategory

	db := r.base.WithContext(ctx)
	if err := db.Where("name = ?", name).First(&category).Error; err != nil {
		return nil, err
	}

	return &category, nil
}

// GetByID IDで技術カテゴリを取得
func (r *technologyCategoryRepository) GetByID(ctx context.Context, id string) (*model.TechnologyCategory, error) {
	var category model.TechnologyCategory

	db := r.base.WithContext(ctx)
	if err := db.Where("id = ?", id).First(&category).Error; err != nil {
		return nil, err
	}

	return &category, nil
}
