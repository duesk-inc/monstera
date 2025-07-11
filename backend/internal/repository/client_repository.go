package repository

import (
	"context"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ClientRepository 取引先リポジトリのインターフェース
type ClientRepository interface {
	CrudRepository[model.Client]
	FindByCompanyName(ctx context.Context, companyName string) (*model.Client, error)
	GetActiveClients(ctx context.Context) ([]*model.Client, error)
}

// clientRepository 取引先リポジトリの実装
type clientRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewClientRepository 取引先リポジトリのインスタンスを生成
func NewClientRepository(base BaseRepository) ClientRepository {
	return &clientRepository{
		db:     base.GetDB(),
		logger: base.GetLogger(),
	}
}

// FindByCompanyName 会社名で取引先を検索
func (r *clientRepository) FindByCompanyName(ctx context.Context, companyName string) (*model.Client, error) {
	var client model.Client
	err := r.db.WithContext(ctx).
		Where("company_name = ? AND deleted_at IS NULL", companyName).
		First(&client).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to find client by company name",
			zap.String("company_name", companyName),
			zap.Error(err))
		return nil, err
	}

	return &client, nil
}

// GetActiveClients アクティブな取引先一覧を取得
func (r *clientRepository) GetActiveClients(ctx context.Context) ([]*model.Client, error) {
	var clients []*model.Client
	err := r.db.WithContext(ctx).
		Joins("JOIN projects ON projects.client_id = clients.id").
		Where("projects.status = ? AND projects.deleted_at IS NULL", model.ProjectStatusActive).
		Where("clients.deleted_at IS NULL").
		Distinct("clients.*").
		Find(&clients).Error

	if err != nil {
		r.logger.Error("Failed to get active clients", zap.Error(err))
		return nil, err
	}

	return clients, nil
}

// Create 取引先を作成（CrudRepositoryインターフェース実装）
func (r *clientRepository) Create(ctx context.Context, entity *model.Client) error {
	return r.db.WithContext(ctx).Create(entity).Error
}

// Update 取引先を更新（CrudRepositoryインターフェース実装）
func (r *clientRepository) Update(ctx context.Context, entity *model.Client) error {
	return r.db.WithContext(ctx).Save(entity).Error
}

// Delete 取引先を削除（CrudRepositoryインターフェース実装）
func (r *clientRepository) Delete(ctx context.Context, entity *model.Client) error {
	return r.db.WithContext(ctx).Delete(entity).Error
}

// FindByID IDで取引先を検索（CrudRepositoryインターフェース実装）
func (r *clientRepository) FindByID(ctx context.Context, id interface{}) (*model.Client, error) {
	var entity model.Client
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

// FindAll すべての取引先を検索（CrudRepositoryインターフェース実装）
func (r *clientRepository) FindAll(ctx context.Context, opts ...repository.QueryOptions) ([]*model.Client, error) {
	var entities []*model.Client
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

// Count 取引先数をカウント（CrudRepositoryインターフェース実装）
func (r *clientRepository) Count(ctx context.Context, opts ...repository.QueryOptions) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&model.Client{})

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

// Exists 取引先の存在確認（CrudRepositoryインターフェース実装）
func (r *clientRepository) Exists(ctx context.Context, id interface{}) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Client{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

// Transaction トランザクション処理（CrudRepositoryインターフェース実装）
func (r *clientRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}
