package repository

import (
	"context"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// RolePermissionRepository ロール権限リポジトリのインターフェース
type RolePermissionRepository interface {
	CrudRepository[model.RolePermission]
	HasPermission(ctx context.Context, role, permission string) (bool, error)
	GetRolePermissions(ctx context.Context, role string) ([]model.RolePermission, error)
	GrantPermission(ctx context.Context, role, permission string) error
	RevokePermission(ctx context.Context, role, permission string) error
}

// rolePermissionRepository ロール権限リポジトリの実装
type rolePermissionRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewRolePermissionRepository ロール権限リポジトリのインスタンスを生成
func NewRolePermissionRepository(base BaseRepository) RolePermissionRepository {
	return &rolePermissionRepository{
		db:     base.GetDB(),
		logger: base.GetLogger(),
	}
}

// HasPermission 指定されたロールが権限を持っているか確認
func (r *rolePermissionRepository) HasPermission(ctx context.Context, role, permission string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.RolePermission{}).
		Where("role = ? AND permission = ? AND deleted_at IS NULL", role, permission).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check permission",
			zap.String("role", role),
			zap.String("permission", permission),
			zap.Error(err))
		return false, err
	}

	return count > 0, nil
}

// GetRolePermissions ロールの全権限を取得
func (r *rolePermissionRepository) GetRolePermissions(ctx context.Context, role string) ([]model.RolePermission, error) {
	var permissions []model.RolePermission
	err := r.db.WithContext(ctx).
		Where("role = ? AND deleted_at IS NULL", role).
		Find(&permissions).Error

	if err != nil {
		r.logger.Error("Failed to get role permissions",
			zap.String("role", role),
			zap.Error(err))
		return nil, err
	}

	return permissions, nil
}

// GrantPermission ロールに権限を付与
func (r *rolePermissionRepository) GrantPermission(ctx context.Context, role, permission string) error {
	// 既に権限が存在するか確認
	hasPermission, err := r.HasPermission(ctx, role, permission)
	if err != nil {
		return err
	}

	if hasPermission {
		r.logger.Info("Permission already granted",
			zap.String("role", role),
			zap.String("permission", permission))
		return nil
	}

	// 新しい権限を作成
	rolePermission := &model.RolePermission{
		Role:       role,
		Permission: permission,
	}

	if err := r.Create(ctx, rolePermission); err != nil {
		r.logger.Error("Failed to grant permission",
			zap.String("role", role),
			zap.String("permission", permission),
			zap.Error(err))
		return err
	}

	return nil
}

// RevokePermission ロールから権限を取り消し
func (r *rolePermissionRepository) RevokePermission(ctx context.Context, role, permission string) error {
	result := r.db.WithContext(ctx).
		Where("role = ? AND permission = ?", role, permission).
		Delete(&model.RolePermission{})

	if result.Error != nil {
		r.logger.Error("Failed to revoke permission",
			zap.String("role", role),
			zap.String("permission", permission),
			zap.Error(result.Error))
		return result.Error
	}

	if result.RowsAffected == 0 {
		r.logger.Warn("Permission not found to revoke",
			zap.String("role", role),
			zap.String("permission", permission))
	}

	return nil
}

// Create 権限を作成（CrudRepositoryインターフェース実装）
func (r *rolePermissionRepository) Create(ctx context.Context, entity *model.RolePermission) error {
	return r.db.WithContext(ctx).Create(entity).Error
}

// Update 権限を更新（CrudRepositoryインターフェース実装）
func (r *rolePermissionRepository) Update(ctx context.Context, entity *model.RolePermission) error {
	return r.db.WithContext(ctx).Save(entity).Error
}

// Delete 権限を削除（CrudRepositoryインターフェース実装）
func (r *rolePermissionRepository) Delete(ctx context.Context, entity *model.RolePermission) error {
	return r.db.WithContext(ctx).Delete(entity).Error
}

// FindByID IDで権限を検索（CrudRepositoryインターフェース実装）
func (r *rolePermissionRepository) FindByID(ctx context.Context, id interface{}) (*model.RolePermission, error) {
	var entity model.RolePermission
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

// FindAll すべての権限を検索（CrudRepositoryインターフェース実装）
func (r *rolePermissionRepository) FindAll(ctx context.Context, opts ...repository.QueryOptions) ([]*model.RolePermission, error) {
	var entities []*model.RolePermission
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

// Count 権限数をカウント（CrudRepositoryインターフェース実装）
func (r *rolePermissionRepository) Count(ctx context.Context, opts ...repository.QueryOptions) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&model.RolePermission{})

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

// Exists 権限の存在確認（CrudRepositoryインターフェース実装）
func (r *rolePermissionRepository) Exists(ctx context.Context, id interface{}) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.RolePermission{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

// Transaction トランザクション処理（CrudRepositoryインターフェース実装）
func (r *rolePermissionRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}
