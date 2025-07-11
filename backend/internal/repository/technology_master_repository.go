package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// TechnologyMasterRepository 技術マスタリポジトリのインターフェース
type TechnologyMasterRepository interface {
	Create(ctx context.Context, tech *model.TechnologyMaster) error
	Update(ctx context.Context, tech *model.TechnologyMaster) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.TechnologyMaster, error)
	GetByName(ctx context.Context, category model.TechCategory, name string) (*model.TechnologyMaster, error)
	SearchByPrefix(ctx context.Context, category model.TechCategory, prefix string, limit int) ([]*model.TechnologyMaster, error)
	IncrementUsageCount(ctx context.Context, id uuid.UUID) error
	GetAll(ctx context.Context) ([]*model.TechnologyMaster, error)
	GetByCategory(ctx context.Context, category model.TechCategory) ([]*model.TechnologyMaster, error)
}

// technologyMasterRepository 技術マスタリポジトリの実装
type technologyMasterRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewTechnologyMasterRepository 技術マスタリポジトリのコンストラクタ
func NewTechnologyMasterRepository(db *gorm.DB, logger *zap.Logger) TechnologyMasterRepository {
	return &technologyMasterRepository{
		db:     db,
		logger: logger,
	}
}

// Create 技術マスタを作成
func (r *technologyMasterRepository) Create(ctx context.Context, tech *model.TechnologyMaster) error {
	if err := r.db.WithContext(ctx).Create(tech).Error; err != nil {
		r.logger.Error("Failed to create technology master", zap.Error(err))
		return fmt.Errorf("技術マスタの作成に失敗しました: %w", err)
	}
	return nil
}

// Update 技術マスタを更新
func (r *technologyMasterRepository) Update(ctx context.Context, tech *model.TechnologyMaster) error {
	if err := r.db.WithContext(ctx).Save(tech).Error; err != nil {
		r.logger.Error("Failed to update technology master", zap.Error(err))
		return fmt.Errorf("技術マスタの更新に失敗しました: %w", err)
	}
	return nil
}

// Delete 技術マスタを削除（論理削除）
func (r *technologyMasterRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).Model(&model.TechnologyMaster{}).
		Where("id = ?", id).
		Update("is_active", false).Error; err != nil {
		r.logger.Error("Failed to delete technology master", zap.Error(err))
		return fmt.Errorf("技術マスタの削除に失敗しました: %w", err)
	}
	return nil
}

// GetByID IDで技術マスタを取得
func (r *technologyMasterRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.TechnologyMaster, error) {
	var tech model.TechnologyMaster
	if err := r.db.WithContext(ctx).
		Where("id = ? AND is_active = ?", id, true).
		First(&tech).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get technology master by ID", zap.Error(err))
		return nil, fmt.Errorf("技術マスタの取得に失敗しました: %w", err)
	}
	return &tech, nil
}

// GetByName カテゴリと名前で技術マスタを取得
func (r *technologyMasterRepository) GetByName(ctx context.Context, category model.TechCategory, name string) (*model.TechnologyMaster, error) {
	var tech model.TechnologyMaster
	if err := r.db.WithContext(ctx).
		Where("category = ? AND name = ? AND is_active = ?", category, name, true).
		First(&tech).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get technology master by name", zap.Error(err))
		return nil, fmt.Errorf("技術マスタの取得に失敗しました: %w", err)
	}
	return &tech, nil
}

// SearchByPrefix 前方一致検索で技術マスタを取得
func (r *technologyMasterRepository) SearchByPrefix(ctx context.Context, category model.TechCategory, prefix string, limit int) ([]*model.TechnologyMaster, error) {
	var techs []*model.TechnologyMaster

	query := r.db.WithContext(ctx).
		Where("category = ? AND is_active = ?", category, true).
		Where("(name LIKE ? OR display_name LIKE ? OR aliases LIKE ?)",
			prefix+"%", prefix+"%", "%"+prefix+"%").
		Order("usage_count DESC, sort_order ASC, name ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&techs).Error; err != nil {
		r.logger.Error("Failed to search technology master", zap.Error(err))
		return nil, fmt.Errorf("技術マスタの検索に失敗しました: %w", err)
	}

	return techs, nil
}

// IncrementUsageCount 使用回数をインクリメント
func (r *technologyMasterRepository) IncrementUsageCount(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).Model(&model.TechnologyMaster{}).
		Where("id = ?", id).
		Update("usage_count", gorm.Expr("usage_count + ?", 1)).Error; err != nil {
		r.logger.Error("Failed to increment usage count", zap.Error(err))
		return fmt.Errorf("使用回数の更新に失敗しました: %w", err)
	}
	return nil
}

// GetAll 全ての技術マスタを取得
func (r *technologyMasterRepository) GetAll(ctx context.Context) ([]*model.TechnologyMaster, error) {
	var techs []*model.TechnologyMaster
	if err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("category ASC, sort_order ASC, name ASC").
		Find(&techs).Error; err != nil {
		r.logger.Error("Failed to get all technology masters", zap.Error(err))
		return nil, fmt.Errorf("技術マスタ一覧の取得に失敗しました: %w", err)
	}
	return techs, nil
}

// GetByCategory カテゴリで技術マスタを取得
func (r *technologyMasterRepository) GetByCategory(ctx context.Context, category model.TechCategory) ([]*model.TechnologyMaster, error) {
	var techs []*model.TechnologyMaster
	if err := r.db.WithContext(ctx).
		Where("category = ? AND is_active = ?", category, true).
		Order("sort_order ASC, name ASC").
		Find(&techs).Error; err != nil {
		r.logger.Error("Failed to get technology masters by category", zap.Error(err))
		return nil, fmt.Errorf("技術マスタの取得に失敗しました: %w", err)
	}
	return techs, nil
}

// NormalizeTechnologyName 技術名を正規化（ヘルパー関数）
func NormalizeTechnologyName(name string) string {
	// 大文字小文字を統一
	normalized := strings.ToLower(name)

	// 一般的な表記ゆれを統一
	replacements := map[string]string{
		"c#":         "csharp",
		"c++":        "cplusplus",
		"node.js":    "nodejs",
		"react.js":   "react",
		"vue.js":     "vue",
		"angular.js": "angular",
		"asp.net":    "aspnet",
		".net":       "dotnet",
	}

	for old, new := range replacements {
		if normalized == old {
			return new
		}
	}

	return normalized
}
