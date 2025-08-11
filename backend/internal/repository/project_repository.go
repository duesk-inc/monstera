package repository

import (
	"context"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ProjectRepository 案件リポジトリのインターフェース
type ProjectRepository interface {
	CrudRepository[model.Project]
	GetByID(ctx context.Context, id string) (*model.Project, error)
	List(ctx context.Context, clientID *string, limit, offset int) ([]*model.Project, error)
	FindByClientID(ctx context.Context, clientID string) ([]*model.Project, error)
	FindActiveProjects(ctx context.Context) ([]*model.Project, error)
	FindByStatus(ctx context.Context, status model.ProjectStatus) ([]*model.Project, error)
	GetActiveProjectCount(ctx context.Context, clientID *string) (int64, error)
}

// projectRepository 案件リポジトリの実装
type projectRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewProjectRepository 案件リポジトリのインスタンスを生成
func NewProjectRepository(base BaseRepository) ProjectRepository {
	return &projectRepository{
		db:     base.GetDB(),
		logger: base.GetLogger(),
	}
}

// FindByClientID 取引先IDで案件を検索
func (r *projectRepository) FindByClientID(ctx context.Context, clientID string) ([]*model.Project, error) {
	var projects []*model.Project
	err := r.db.WithContext(ctx).
		Where("client_id = ? AND deleted_at IS NULL", clientID).
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to find projects by client ID",
			zap.String("client_id", clientID),
			zap.Error(err))
		return nil, err
	}

	return projects, nil
}

// GetByID IDで案件を取得
func (r *projectRepository) GetByID(ctx context.Context, id string) (*model.Project, error) {
	var project model.Project
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&project).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get project by ID",
			zap.String("id", id),
			zap.Error(err))
		return nil, err
	}

	return &project, nil
}

// List 案件一覧を取得
func (r *projectRepository) List(ctx context.Context, clientID *string, limit, offset int) ([]*model.Project, error) {
	var projects []*model.Project
	query := r.db.WithContext(ctx).Where("deleted_at IS NULL")

	if clientID != nil {
		query = query.Where("client_id = ?", *clientID)
	}

	err := query.Limit(limit).Offset(offset).Find(&projects).Error
	if err != nil {
		r.logger.Error("Failed to list projects", zap.Error(err))
		return nil, err
	}

	return projects, nil
}

// GetActiveProjectCount アクティブプロジェクト数を取得
func (r *projectRepository) GetActiveProjectCount(ctx context.Context, clientID *string) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&model.Project{}).
		Where("status = ? AND deleted_at IS NULL", model.ProjectStatusActive)

	if clientID != nil {
		query = query.Where("client_id = ?", *clientID)
	}

	err := query.Count(&count).Error
	if err != nil {
		r.logger.Error("Failed to count active projects", zap.Error(err))
		return 0, err
	}

	return count, nil
}

// FindActiveProjects アクティブな案件を検索
func (r *projectRepository) FindActiveProjects(ctx context.Context) ([]*model.Project, error) {
	var projects []*model.Project
	err := r.db.WithContext(ctx).
		Where("status = ? AND deleted_at IS NULL", model.ProjectStatusActive).
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to find active projects", zap.Error(err))
		return nil, err
	}

	return projects, nil
}

// FindByStatus ステータスで案件を検索
func (r *projectRepository) FindByStatus(ctx context.Context, status model.ProjectStatus) ([]*model.Project, error) {
	var projects []*model.Project
	err := r.db.WithContext(ctx).
		Where("status = ? AND deleted_at IS NULL", status).
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to find projects by status",
			zap.String("status", string(status)),
			zap.Error(err))
		return nil, err
	}

	return projects, nil
}

// Create 案件を作成（CrudRepositoryインターフェース実装）
func (r *projectRepository) Create(ctx context.Context, entity *model.Project) error {
	return r.db.WithContext(ctx).Create(entity).Error
}

// Update 案件を更新（CrudRepositoryインターフェース実装）
func (r *projectRepository) Update(ctx context.Context, entity *model.Project) error {
	return r.db.WithContext(ctx).Save(entity).Error
}

// Delete 案件を削除（CrudRepositoryインターフェース実装）
func (r *projectRepository) Delete(ctx context.Context, entity *model.Project) error {
	return r.db.WithContext(ctx).Delete(entity).Error
}

// FindByID IDで案件を検索（CrudRepositoryインターフェース実装）
func (r *projectRepository) FindByID(ctx context.Context, id interface{}) (*model.Project, error) {
	var entity model.Project
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

// FindAll すべての案件を検索（CrudRepositoryインターフェース実装）
func (r *projectRepository) FindAll(ctx context.Context, opts ...repository.QueryOptions) ([]*model.Project, error) {
	var entities []*model.Project
	query := r.db.WithContext(ctx)

	// オプションがある場合は適用
	if len(opts) > 0 {
		query = repository.ApplyOptions(query, opts[0])
	}

	if err := query.Find(&entities).Error; err != nil {
		return nil, err
	}
	return entities, nil
}

// Count 案件数をカウント（CrudRepositoryインターフェース実装）
func (r *projectRepository) Count(ctx context.Context, opts ...repository.QueryOptions) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&model.Project{})

	// オプションがある場合は適用（ただしページネーションは除く）
	if len(opts) > 0 {
		opt := opts[0]
		if opt.Search != "" && len(opt.SearchKeys) > 0 {
			query = repository.ApplySearch(query, opt.Search, opt.SearchKeys)
		}
	}

	err := query.Count(&count).Error
	return count, err
}

// Exists 案件の存在確認（CrudRepositoryインターフェース実装）
func (r *projectRepository) Exists(ctx context.Context, id interface{}) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Project{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

// Transaction トランザクション処理（CrudRepositoryインターフェース実装）
func (r *projectRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}
