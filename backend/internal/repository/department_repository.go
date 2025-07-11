package repository

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DepartmentRepository 部署リポジトリインターフェース
type DepartmentRepository interface {
	FindAll(ctx context.Context) ([]*model.Department, error)
	FindByID(ctx context.Context, id uuid.UUID) (*model.Department, error)
	Create(ctx context.Context, department *model.Department) error
	Update(ctx context.Context, department *model.Department) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// departmentRepository 部署リポジトリ実装
type departmentRepository struct {
	db *gorm.DB
}

// NewDepartmentRepository 部署リポジトリのインスタンスを生成
func NewDepartmentRepository(db *gorm.DB) DepartmentRepository {
	return &departmentRepository{
		db: db,
	}
}

// FindAll 全部署を取得
func (r *departmentRepository) FindAll(ctx context.Context) ([]*model.Department, error) {
	var departments []*model.Department
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Order("name ASC").
		Find(&departments).Error
	return departments, err
}

// FindByID IDで部署を検索
func (r *departmentRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Department, error) {
	var department model.Department
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&department).Error
	return &department, err
}

// Create 部署を作成
func (r *departmentRepository) Create(ctx context.Context, department *model.Department) error {
	return r.db.WithContext(ctx).Create(department).Error
}

// Update 部署を更新
func (r *departmentRepository) Update(ctx context.Context, department *model.Department) error {
	return r.db.WithContext(ctx).
		Model(department).
		Omit("id", "created_at", "deleted_at").
		Updates(department).Error
}

// Delete 部署を削除
func (r *departmentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&model.Department{}).Error
}
