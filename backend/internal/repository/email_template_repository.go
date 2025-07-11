package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// EmailTemplateRepository メールテンプレートリポジトリのインターフェース
type EmailTemplateRepository interface {
	Create(ctx context.Context, template *model.EmailTemplate) error
	GetByID(ctx context.Context, id string) (*model.EmailTemplate, error)
	GetList(ctx context.Context, filter EmailTemplateFilter) ([]model.EmailTemplate, int64, error)
	Update(ctx context.Context, template *model.EmailTemplate) error
	Delete(ctx context.Context, id string, deletedBy string) error
	GetByCategory(ctx context.Context, category string) (*model.EmailTemplate, error)
	GetActiveTemplates(ctx context.Context) ([]model.EmailTemplate, error)
	GetTemplatesByCreator(ctx context.Context, createdBy string) ([]model.EmailTemplate, error)
	ToggleActive(ctx context.Context, id string, isActive bool, updatedBy string) error
	SearchByName(ctx context.Context, name string) ([]model.EmailTemplate, error)
}

// EmailTemplateFilter メールテンプレートフィルター
type EmailTemplateFilter struct {
	Category  string
	IsActive  *bool
	CreatedBy string
	Page      int
	Limit     int
}

// emailTemplateRepository メールテンプレートリポジトリの実装
type emailTemplateRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewEmailTemplateRepository メールテンプレートリポジトリのインスタンスを生成
func NewEmailTemplateRepository(baseRepo BaseRepository) EmailTemplateRepository {
	return &emailTemplateRepository{
		db:     baseRepo.GetDB(),
		logger: baseRepo.GetLogger(),
	}
}

// Create メールテンプレートを作成
func (r *emailTemplateRepository) Create(ctx context.Context, template *model.EmailTemplate) error {
	if err := r.db.WithContext(ctx).Create(template).Error; err != nil {
		r.logger.Error("Failed to create email template", zap.Error(err))
		return err
	}
	return nil
}

// GetByID メールテンプレートをIDで取得
func (r *emailTemplateRepository) GetByID(ctx context.Context, id string) (*model.EmailTemplate, error) {
	var template model.EmailTemplate
	if err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&template).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get email template by ID", zap.Error(err), zap.String("id", id))
		return nil, err
	}
	return &template, nil
}

// GetList メールテンプレート一覧を取得
func (r *emailTemplateRepository) GetList(ctx context.Context, filter EmailTemplateFilter) ([]model.EmailTemplate, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.EmailTemplate{}).
		Where("deleted_at IS NULL")

	// フィルター条件
	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	}
	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}
	if filter.CreatedBy != "" {
		query = query.Where("created_by = ?", filter.CreatedBy)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count email templates", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// データを取得
	var templates []model.EmailTemplate
	if err := query.Order("created_at DESC").Find(&templates).Error; err != nil {
		r.logger.Error("Failed to get email templates", zap.Error(err))
		return nil, 0, err
	}

	return templates, total, nil
}

// Update メールテンプレートを更新
func (r *emailTemplateRepository) Update(ctx context.Context, template *model.EmailTemplate) error {
	if err := r.db.WithContext(ctx).Save(template).Error; err != nil {
		r.logger.Error("Failed to update email template", zap.Error(err))
		return err
	}
	return nil
}

// Delete メールテンプレートを削除（論理削除）
func (r *emailTemplateRepository) Delete(ctx context.Context, id string, deletedBy string) error {
	result := r.db.WithContext(ctx).Model(&model.EmailTemplate{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"deleted_at": time.Now(),
			"updated_by": deletedBy,
		})
	if result.Error != nil {
		r.logger.Error("Failed to delete email template", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// GetByCategory カテゴリでメールテンプレートを取得
func (r *emailTemplateRepository) GetByCategory(ctx context.Context, category string) (*model.EmailTemplate, error) {
	var template model.EmailTemplate
	if err := r.db.WithContext(ctx).
		Where("category = ? AND is_active = ? AND deleted_at IS NULL", category, true).
		First(&template).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get email template by category", zap.Error(err), zap.String("category", category))
		return nil, err
	}
	return &template, nil
}

// GetActiveTemplates アクティブなメールテンプレートを取得
func (r *emailTemplateRepository) GetActiveTemplates(ctx context.Context) ([]model.EmailTemplate, error) {
	var templates []model.EmailTemplate
	if err := r.db.WithContext(ctx).
		Where("is_active = ? AND deleted_at IS NULL", true).
		Order("category, name").
		Find(&templates).Error; err != nil {
		r.logger.Error("Failed to get active templates", zap.Error(err))
		return nil, err
	}
	return templates, nil
}

// GetTemplatesByCreator 作成者でメールテンプレートを取得
func (r *emailTemplateRepository) GetTemplatesByCreator(ctx context.Context, createdBy string) ([]model.EmailTemplate, error) {
	var templates []model.EmailTemplate
	if err := r.db.WithContext(ctx).
		Where("created_by = ? AND deleted_at IS NULL", createdBy).
		Order("created_at DESC").
		Find(&templates).Error; err != nil {
		r.logger.Error("Failed to get templates by creator", zap.Error(err))
		return nil, err
	}
	return templates, nil
}

// ToggleActive アクティブ状態を切り替え
func (r *emailTemplateRepository) ToggleActive(ctx context.Context, id string, isActive bool, updatedBy string) error {
	result := r.db.WithContext(ctx).Model(&model.EmailTemplate{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"is_active":  isActive,
			"updated_by": updatedBy,
			"updated_at": time.Now(),
		})
	if result.Error != nil {
		r.logger.Error("Failed to toggle active status", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// SearchByName 名前でメールテンプレートを検索
func (r *emailTemplateRepository) SearchByName(ctx context.Context, name string) ([]model.EmailTemplate, error) {
	var templates []model.EmailTemplate
	if err := r.db.WithContext(ctx).
		Where("name LIKE ? AND deleted_at IS NULL", "%"+name+"%").
		Order("name").
		Find(&templates).Error; err != nil {
		r.logger.Error("Failed to search templates by name", zap.Error(err))
		return nil, err
	}
	return templates, nil
}
