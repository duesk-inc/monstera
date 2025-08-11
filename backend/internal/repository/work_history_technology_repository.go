package repository

import (
	"context"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
)

// WorkHistoryTechnologyRepository 職務経歴技術項目リポジトリインターフェース
type WorkHistoryTechnologyRepository interface {
	GetByWorkHistoryID(ctx context.Context, workHistoryID string) ([]model.WorkHistoryTechnology, error)
	CreateBatch(ctx context.Context, technologies []model.WorkHistoryTechnology) error
	DeleteByWorkHistoryID(ctx context.Context, workHistoryID string) error
	GetWithCategory(ctx context.Context, workHistoryID string) ([]model.WorkHistoryTechnology, error)
}

// workHistoryTechnologyRepository 職務経歴技術項目リポジトリ実装
type workHistoryTechnologyRepository struct {
	base repository.BaseRepository
}

// NewWorkHistoryTechnologyRepository 職務経歴技術項目リポジトリのコンストラクタ
func NewWorkHistoryTechnologyRepository(base repository.BaseRepository) WorkHistoryTechnologyRepository {
	return &workHistoryTechnologyRepository{
		base: base,
	}
}

// GetByWorkHistoryID 職務経歴IDで技術項目を取得
func (r *workHistoryTechnologyRepository) GetByWorkHistoryID(ctx context.Context, workHistoryID string) ([]model.WorkHistoryTechnology, error) {
	var technologies []model.WorkHistoryTechnology

	db := r.base.WithContext(ctx)
	if err := db.Where("work_history_id = ?", workHistoryID).Find(&technologies).Error; err != nil {
		return nil, err
	}

	return technologies, nil
}

// GetWithCategory カテゴリ情報を含めて職務経歴IDで技術項目を取得
func (r *workHistoryTechnologyRepository) GetWithCategory(ctx context.Context, workHistoryID string) ([]model.WorkHistoryTechnology, error) {
	var technologies []model.WorkHistoryTechnology

	db := r.base.WithContext(ctx)
	if err := db.Preload("Category").Where("work_history_id = ?", workHistoryID).Find(&technologies).Error; err != nil {
		return nil, err
	}

	return technologies, nil
}

// CreateBatch 技術項目を一括作成
func (r *workHistoryTechnologyRepository) CreateBatch(ctx context.Context, technologies []model.WorkHistoryTechnology) error {
	if len(technologies) == 0 {
		return nil
	}

	db := r.base.WithContext(ctx)
	return db.Create(&technologies).Error
}

// DeleteByWorkHistoryID 職務経歴IDに紐づく技術項目を全削除
func (r *workHistoryTechnologyRepository) DeleteByWorkHistoryID(ctx context.Context, workHistoryID string) error {
	db := r.base.WithContext(ctx)
	return db.Where("work_history_id = ?", workHistoryID).Delete(&model.WorkHistoryTechnology{}).Error
}
