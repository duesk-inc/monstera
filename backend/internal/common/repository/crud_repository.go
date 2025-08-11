package repository

import (
	"context"
	"fmt"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// CRUDRepository はCRUD操作のインターフェース
type CRUDRepository[T any, ID comparable] interface {
	// Create エンティティを作成する
	Create(ctx context.Context, entity *T) error
	// FindByID IDによるエンティティの取得
	FindByID(ctx context.Context, id ID) (*T, error)
	// Update エンティティを更新する
	Update(ctx context.Context, entity *T) error
	// Delete エンティティを削除する
	Delete(ctx context.Context, id ID) error
	// List エンティティの一覧を取得する
	List(ctx context.Context, opts QueryOptions) ([]T, int64, error)
}

// GormCRUDRepository はGorm用のCRUDリポジトリ実装
type GormCRUDRepository[T any] struct {
	BaseRepository
	logger *zap.Logger
}

// NewGormCRUDRepository は新しいGormCRUDRepositoryインスタンスを作成する
func NewGormCRUDRepository[T any](base BaseRepository, logger *zap.Logger) *GormCRUDRepository[T] {
	if logger == nil {
		logger = zap.NewNop()
	}

	return &GormCRUDRepository[T]{
		BaseRepository: base,
		logger:         logger,
	}
}

// Create はエンティティを作成する
func (r *GormCRUDRepository[T]) Create(ctx context.Context, entity *T) error {
	return r.WithContext(ctx).Create(entity).Error
}

// FindByID はIDによりエンティティを取得する
func (r *GormCRUDRepository[T]) FindByID(ctx context.Context, id string) (*T, error) {
	if err := r.ValidateID(id); err != nil {
		return nil, err
	}

	var entity T
	err := r.WithContext(ctx).First(&entity, "id = ?", id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("ID %s のエンティティが見つかりません", id)
		}
		return nil, err
	}

	return &entity, nil
}

// Update はエンティティを更新する
func (r *GormCRUDRepository[T]) Update(ctx context.Context, entity *T) error {
	return r.WithContext(ctx).Save(entity).Error
}

// Delete はエンティティを削除する
func (r *GormCRUDRepository[T]) Delete(ctx context.Context, id string) error {
	if err := r.ValidateID(id); err != nil {
		return err
	}

	var entity T
	return r.WithContext(ctx).Delete(&entity, "id = ?", id).Error
}

// List はエンティティの一覧を取得する
func (r *GormCRUDRepository[T]) List(ctx context.Context, opts QueryOptions) ([]T, int64, error) {
	var entities []T
	var count int64

	db := r.WithContext(ctx)
	db = ApplyOptions(db, opts)

	err := ExecuteAndCount(ctx, db, &entities, &count)
	return entities, count, err
}

// ListWithFilter はフィルターでエンティティを検索する
func (r *GormCRUDRepository[T]) ListWithFilter(
	ctx context.Context,
	filter map[string]interface{},
	opts QueryOptions,
) ([]T, int64, error) {
	var entities []T
	var count int64

	db := r.WithContext(ctx)

	// フィルター条件を適用
	if len(filter) > 0 {
		db = db.Where(filter)
	}

	// クエリオプションを適用
	db = ApplyOptions(db, opts)

	err := ExecuteAndCount(ctx, db, &entities, &count)
	return entities, count, err
}

// CreateInBatch はバッチで複数エンティティを作成する
func (r *GormCRUDRepository[T]) CreateInBatch(ctx context.Context, entities []T, batchSize int) error {
	if len(entities) == 0 {
		return nil
	}

	if batchSize <= 0 {
		batchSize = 100
	}

	return r.WithContext(ctx).CreateInBatches(entities, batchSize).Error
}

// UpdateColumns は特定のカラムのみを更新する
func (r *GormCRUDRepository[T]) UpdateColumns(
	ctx context.Context,
	id string,
	values map[string]interface{},
) error {
	if err := r.ValidateID(id); err != nil {
		return err
	}

	var entity T
	return r.WithContext(ctx).Model(&entity).Where("id = ?", id).Updates(values).Error
}
