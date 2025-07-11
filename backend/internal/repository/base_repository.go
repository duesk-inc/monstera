package repository

import (
	"context"

	"github.com/duesk/monstera/internal/common/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// BaseRepository リポジトリの基底インターフェース
type BaseRepository interface {
	GetDB() *gorm.DB
	GetLogger() *zap.Logger
}

// baseRepository リポジトリの基底構造体
type baseRepository struct {
	DB     *gorm.DB
	Logger *zap.Logger
}

// NewBaseRepository 基底リポジトリのインスタンスを生成
func NewBaseRepository(db *gorm.DB, logger *zap.Logger) BaseRepository {
	return &baseRepository{
		DB:     db,
		Logger: logger,
	}
}

// GetDB データベース接続を取得
func (r *baseRepository) GetDB() *gorm.DB {
	return r.DB
}

// GetLogger ロガーを取得
func (r *baseRepository) GetLogger() *zap.Logger {
	return r.Logger
}

// Create エンティティを作成
func (r *baseRepository) Create(ctx context.Context, entity interface{}) error {
	return r.DB.WithContext(ctx).Create(entity).Error
}

// Update エンティティを更新
func (r *baseRepository) Update(ctx context.Context, entity interface{}) error {
	return r.DB.WithContext(ctx).Save(entity).Error
}

// Delete エンティティを削除
func (r *baseRepository) Delete(ctx context.Context, entity interface{}) error {
	return r.DB.WithContext(ctx).Delete(entity).Error
}

// FindByID IDでエンティティを検索
func (r *baseRepository) FindByID(ctx context.Context, id interface{}, entity interface{}) error {
	return r.DB.WithContext(ctx).Where("id = ?", id).First(entity).Error
}

// FindAll すべてのエンティティを検索
func (r *baseRepository) FindAll(ctx context.Context, entities interface{}, opts ...repository.QueryOptions) error {
	query := r.DB.WithContext(ctx)

	// オプションがある場合は適用
	if len(opts) > 0 {
		query = repository.ApplyOptions(query, opts[0])
	}

	return query.Find(entities).Error
}

// Count エンティティ数をカウント
func (r *baseRepository) Count(ctx context.Context, model interface{}, opts ...repository.QueryOptions) (int64, error) {
	var count int64
	query := r.DB.WithContext(ctx).Model(model)

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

// Exists エンティティの存在確認
func (r *baseRepository) Exists(ctx context.Context, model interface{}, id interface{}) (bool, error) {
	var count int64
	err := r.DB.WithContext(ctx).Model(model).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

// Transaction トランザクション処理
func (r *baseRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	return r.DB.WithContext(ctx).Transaction(fn)
}

// CrudRepository インターフェース（互換性のため）
type CrudRepository[T any] interface {
	Create(ctx context.Context, entity *T) error
	Update(ctx context.Context, entity *T) error
	Delete(ctx context.Context, entity *T) error
	FindByID(ctx context.Context, id interface{}) (*T, error)
	FindAll(ctx context.Context, opts ...repository.QueryOptions) ([]*T, error)
	Count(ctx context.Context, opts ...repository.QueryOptions) (int64, error)
	Exists(ctx context.Context, id interface{}) (bool, error)
	Transaction(ctx context.Context, fn func(*gorm.DB) error) error
}

// FindOption 検索オプション（互換性のため）
type FindOption = repository.QueryOptions
