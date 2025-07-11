package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ContractExtensionRepository 契約延長確認リポジトリのインターフェース
type ContractExtensionRepository interface {
	Create(ctx context.Context, extension *model.ContractExtension) error
	GetByID(ctx context.Context, id string) (*model.ContractExtension, error)
	GetList(ctx context.Context, filter ContractExtensionFilter) ([]model.ContractExtension, int64, error)
	Update(ctx context.Context, extension *model.ContractExtension) error
	UpdateStatus(ctx context.Context, id string, status model.ContractExtensionStatus, updatedBy string) error
	Delete(ctx context.Context, id string, deletedBy string) error
	GetByEngineer(ctx context.Context, engineerID string) ([]model.ContractExtension, error)
	GetByProject(ctx context.Context, projectID string) ([]model.ContractExtension, error)
	GetPendingExtensions(ctx context.Context) ([]model.ContractExtension, error)
	GetUpcomingExtensions(ctx context.Context, days int) ([]model.ContractExtension, error)
}

// ContractExtensionFilter 契約延長確認フィルター
type ContractExtensionFilter struct {
	EngineerID    string
	ProjectID     string
	Status        []model.ContractExtensionStatus
	CheckDateFrom *time.Time
	CheckDateTo   *time.Time
	Page          int
	Limit         int
}

// contractExtensionRepository 契約延長確認リポジトリの実装
type contractExtensionRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewContractExtensionRepository 契約延長確認リポジトリのインスタンスを生成
func NewContractExtensionRepository(baseRepo BaseRepository) ContractExtensionRepository {
	return &contractExtensionRepository{
		db:     baseRepo.GetDB(),
		logger: baseRepo.GetLogger(),
	}
}

// Create 契約延長確認を作成
func (r *contractExtensionRepository) Create(ctx context.Context, extension *model.ContractExtension) error {
	if err := r.db.WithContext(ctx).Create(extension).Error; err != nil {
		r.logger.Error("Failed to create contract extension", zap.Error(err))
		return err
	}
	return nil
}

// GetByID 契約延長確認をIDで取得
func (r *contractExtensionRepository) GetByID(ctx context.Context, id string) (*model.ContractExtension, error) {
	var extension model.ContractExtension
	if err := r.db.WithContext(ctx).
		Preload("Engineer.User").
		Preload("Project.Client").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&extension).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get contract extension by ID", zap.Error(err), zap.String("id", id))
		return nil, err
	}
	return &extension, nil
}

// GetList 契約延長確認一覧を取得
func (r *contractExtensionRepository) GetList(ctx context.Context, filter ContractExtensionFilter) ([]model.ContractExtension, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.ContractExtension{}).
		Preload("Engineer.User").
		Preload("Project.Client").
		Where("deleted_at IS NULL")

	// フィルター条件
	if filter.EngineerID != "" {
		query = query.Where("engineer_id = ?", filter.EngineerID)
	}
	if filter.ProjectID != "" {
		query = query.Where("project_id = ?", filter.ProjectID)
	}
	if len(filter.Status) > 0 {
		query = query.Where("status IN ?", filter.Status)
	}
	if filter.CheckDateFrom != nil {
		query = query.Where("extension_check_date >= ?", *filter.CheckDateFrom)
	}
	if filter.CheckDateTo != nil {
		query = query.Where("extension_check_date <= ?", *filter.CheckDateTo)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count contract extensions", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// データを取得
	var extensions []model.ContractExtension
	if err := query.Order("extension_check_date ASC").Find(&extensions).Error; err != nil {
		r.logger.Error("Failed to get contract extensions", zap.Error(err))
		return nil, 0, err
	}

	return extensions, total, nil
}

// Update 契約延長確認を更新
func (r *contractExtensionRepository) Update(ctx context.Context, extension *model.ContractExtension) error {
	if err := r.db.WithContext(ctx).Save(extension).Error; err != nil {
		r.logger.Error("Failed to update contract extension", zap.Error(err))
		return err
	}
	return nil
}

// UpdateStatus ステータスを更新
func (r *contractExtensionRepository) UpdateStatus(ctx context.Context, id string, status model.ContractExtensionStatus, updatedBy string) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_by": updatedBy,
		"updated_at": time.Now(),
	}

	// チェック済みの場合
	if status != model.ContractExtensionStatusPending {
		updates["checked_at"] = time.Now()
		updates["checked_by"] = updatedBy
	}

	result := r.db.WithContext(ctx).Model(&model.ContractExtension{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update contract extension status", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// Delete 契約延長確認を削除（論理削除）
func (r *contractExtensionRepository) Delete(ctx context.Context, id string, deletedBy string) error {
	result := r.db.WithContext(ctx).Model(&model.ContractExtension{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"deleted_at": time.Now(),
			"updated_by": deletedBy,
		})
	if result.Error != nil {
		r.logger.Error("Failed to delete contract extension", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// GetByEngineer エンジニアIDで契約延長確認を取得
func (r *contractExtensionRepository) GetByEngineer(ctx context.Context, engineerID string) ([]model.ContractExtension, error) {
	var extensions []model.ContractExtension
	if err := r.db.WithContext(ctx).
		Preload("Project.Client").
		Where("engineer_id = ? AND deleted_at IS NULL", engineerID).
		Order("extension_check_date DESC").
		Find(&extensions).Error; err != nil {
		r.logger.Error("Failed to get extensions by engineer", zap.Error(err))
		return nil, err
	}
	return extensions, nil
}

// GetByProject プロジェクトIDで契約延長確認を取得
func (r *contractExtensionRepository) GetByProject(ctx context.Context, projectID string) ([]model.ContractExtension, error) {
	var extensions []model.ContractExtension
	if err := r.db.WithContext(ctx).
		Preload("Engineer.User").
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Order("extension_check_date DESC").
		Find(&extensions).Error; err != nil {
		r.logger.Error("Failed to get extensions by project", zap.Error(err))
		return nil, err
	}
	return extensions, nil
}

// GetPendingExtensions 保留中の契約延長確認を取得
func (r *contractExtensionRepository) GetPendingExtensions(ctx context.Context) ([]model.ContractExtension, error) {
	var extensions []model.ContractExtension
	if err := r.db.WithContext(ctx).
		Preload("Engineer.User").
		Preload("Project.Client").
		Where("status = ? AND deleted_at IS NULL", model.ContractExtensionStatusPending).
		Order("extension_check_date ASC").
		Find(&extensions).Error; err != nil {
		r.logger.Error("Failed to get pending extensions", zap.Error(err))
		return nil, err
	}
	return extensions, nil
}

// GetUpcomingExtensions 今後の契約延長確認を取得（指定日数以内）
func (r *contractExtensionRepository) GetUpcomingExtensions(ctx context.Context, days int) ([]model.ContractExtension, error) {
	targetDate := time.Now().AddDate(0, 0, days)
	var extensions []model.ContractExtension
	if err := r.db.WithContext(ctx).
		Preload("Engineer.User").
		Preload("Project.Client").
		Where("status = ? AND current_contract_end_date BETWEEN ? AND ? AND deleted_at IS NULL",
			model.ContractExtensionStatusPending, time.Now(), targetDate).
		Order("current_contract_end_date ASC").
		Find(&extensions).Error; err != nil {
		r.logger.Error("Failed to get upcoming extensions", zap.Error(err))
		return nil, err
	}
	return extensions, nil
}
