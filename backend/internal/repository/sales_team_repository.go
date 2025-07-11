package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SalesTeamRepository 営業チームリポジトリのインターフェース
type SalesTeamRepository interface {
	Create(ctx context.Context, member *model.SalesTeam) error
	GetByID(ctx context.Context, id string) (*model.SalesTeam, error)
	GetByUserID(ctx context.Context, userID string) (*model.SalesTeam, error)
	GetList(ctx context.Context, filter SalesTeamFilter) ([]model.SalesTeam, int64, error)
	Update(ctx context.Context, member *model.SalesTeam) error
	UpdateStatus(ctx context.Context, id string, isActive bool, updatedBy string) error
	Delete(ctx context.Context, id string, deletedBy string) error
	GetActiveMembers(ctx context.Context) ([]model.SalesTeam, error)
	GetByRole(ctx context.Context, role string) ([]model.SalesTeam, error)
}

// SalesTeamFilter 営業チームフィルター
type SalesTeamFilter struct {
	TeamRole string
	IsActive *bool
	Page     int
	Limit    int
}

// salesTeamRepository 営業チームリポジトリの実装
type salesTeamRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewSalesTeamRepository 営業チームリポジトリのインスタンスを生成
func NewSalesTeamRepository(baseRepo BaseRepository) SalesTeamRepository {
	return &salesTeamRepository{
		db:     baseRepo.GetDB(),
		logger: baseRepo.GetLogger(),
	}
}

// Create 営業チームメンバーを作成
func (r *salesTeamRepository) Create(ctx context.Context, member *model.SalesTeam) error {
	if err := r.db.WithContext(ctx).Create(member).Error; err != nil {
		r.logger.Error("Failed to create sales team member", zap.Error(err))
		return err
	}
	return nil
}

// GetByID 営業チームメンバーをIDで取得
func (r *salesTeamRepository) GetByID(ctx context.Context, id string) (*model.SalesTeam, error) {
	var member model.SalesTeam
	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&member).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get sales team member by ID", zap.Error(err), zap.String("id", id))
		return nil, err
	}
	return &member, nil
}

// GetByUserID ユーザーIDで営業チームメンバーを取得
func (r *salesTeamRepository) GetByUserID(ctx context.Context, userID string) (*model.SalesTeam, error) {
	var member model.SalesTeam
	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		First(&member).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get sales team member by user ID", zap.Error(err), zap.String("user_id", userID))
		return nil, err
	}
	return &member, nil
}

// GetList 営業チームメンバー一覧を取得
func (r *salesTeamRepository) GetList(ctx context.Context, filter SalesTeamFilter) ([]model.SalesTeam, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.SalesTeam{}).
		Preload("User").
		Where("deleted_at IS NULL")

	// フィルター条件
	if filter.TeamRole != "" {
		query = query.Where("team_role = ?", filter.TeamRole)
	}
	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count sales team members", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// データを取得
	var members []model.SalesTeam
	if err := query.Order("joined_at DESC").Find(&members).Error; err != nil {
		r.logger.Error("Failed to get sales team members", zap.Error(err))
		return nil, 0, err
	}

	return members, total, nil
}

// Update 営業チームメンバーを更新
func (r *salesTeamRepository) Update(ctx context.Context, member *model.SalesTeam) error {
	if err := r.db.WithContext(ctx).Save(member).Error; err != nil {
		r.logger.Error("Failed to update sales team member", zap.Error(err))
		return err
	}
	return nil
}

// UpdateStatus ステータスを更新
func (r *salesTeamRepository) UpdateStatus(ctx context.Context, id string, isActive bool, updatedBy string) error {
	updates := map[string]interface{}{
		"is_active":  isActive,
		"updated_by": updatedBy,
		"updated_at": time.Now(),
	}

	// 非アクティブ化の場合、離脱日を設定
	if !isActive {
		updates["left_at"] = time.Now()
	}

	result := r.db.WithContext(ctx).Model(&model.SalesTeam{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update sales team status", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// Delete 営業チームメンバーを削除（論理削除）
func (r *salesTeamRepository) Delete(ctx context.Context, id string, deletedBy string) error {
	result := r.db.WithContext(ctx).Model(&model.SalesTeam{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"deleted_at": time.Now(),
			"updated_by": deletedBy,
		})
	if result.Error != nil {
		r.logger.Error("Failed to delete sales team member", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// GetActiveMembers アクティブな営業チームメンバーを取得
func (r *salesTeamRepository) GetActiveMembers(ctx context.Context) ([]model.SalesTeam, error) {
	var members []model.SalesTeam
	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("is_active = ? AND deleted_at IS NULL", true).
		Order("team_role, joined_at").
		Find(&members).Error; err != nil {
		r.logger.Error("Failed to get active sales team members", zap.Error(err))
		return nil, err
	}
	return members, nil
}

// GetByRole ロールで営業チームメンバーを取得
func (r *salesTeamRepository) GetByRole(ctx context.Context, role string) ([]model.SalesTeam, error) {
	var members []model.SalesTeam
	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("team_role = ? AND is_active = ? AND deleted_at IS NULL", role, true).
		Order("joined_at").
		Find(&members).Error; err != nil {
		r.logger.Error("Failed to get sales team members by role", zap.Error(err))
		return nil, err
	}
	return members, nil
}
