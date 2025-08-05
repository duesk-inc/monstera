package repository

import (
	"context"
	"fmt"

	"github.com/duesk/monstera/internal/model"
	"gorm.io/gorm"
	"go.uber.org/zap"
)

// UserITExperienceRepository ユーザーIT経験リポジトリのインターフェース
type UserITExperienceRepository interface {
	GetByUserID(ctx context.Context, userID string) (*model.UserITExperience, error)
	GetAll(ctx context.Context) ([]*model.UserITExperience, error)
	GetByExperienceLevel(ctx context.Context, minMonths, maxMonths int) ([]*model.UserITExperience, error)
	GetActiveUsers(ctx context.Context) ([]*model.UserITExperience, error)
	GetTopExperiencedUsers(ctx context.Context, limit int) ([]*model.UserITExperience, error)
	GetUsersByProjectCount(ctx context.Context, minProjectCount int) ([]*model.UserITExperience, error)
	GetRecentlyActive(ctx context.Context, withinMonths int) ([]*model.UserITExperience, error)
}

// userITExperienceRepository ユーザーIT経験リポジトリの実装
type userITExperienceRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewUserITExperienceRepository ユーザーIT経験リポジトリのコンストラクタ
func NewUserITExperienceRepository(db *gorm.DB, logger *zap.Logger) UserITExperienceRepository {
	return &userITExperienceRepository{
		db:     db,
		logger: logger,
	}
}

// GetByUserID ユーザーIDでIT経験を取得
func (r *userITExperienceRepository) GetByUserID(ctx context.Context, userID string) (*model.UserITExperience, error) {
	var experience model.UserITExperience

	if err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		First(&experience).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get user IT experience", zap.Error(err), zap.String("user_id", userID))
		return nil, fmt.Errorf("ユーザーIT経験の取得に失敗しました: %w", err)
	}

	return &experience, nil
}

// GetAll 全ユーザーのIT経験を取得
func (r *userITExperienceRepository) GetAll(ctx context.Context) ([]*model.UserITExperience, error) {
	var experiences []*model.UserITExperience

	if err := r.db.WithContext(ctx).
		Order("total_it_experience_months DESC, total_project_count DESC, user_name").
		Find(&experiences).Error; err != nil {
		r.logger.Error("Failed to get all user IT experiences", zap.Error(err))
		return nil, fmt.Errorf("全ユーザーIT経験の取得に失敗しました: %w", err)
	}

	return experiences, nil
}

// GetByExperienceLevel 経験レベルでIT経験を取得
func (r *userITExperienceRepository) GetByExperienceLevel(ctx context.Context, minMonths, maxMonths int) ([]*model.UserITExperience, error) {
	var experiences []*model.UserITExperience

	query := r.db.WithContext(ctx).
		Where("total_it_experience_months >= ?", minMonths)

	if maxMonths > 0 {
		query = query.Where("total_it_experience_months < ?", maxMonths)
	}

	if err := query.
		Order("total_it_experience_months DESC, total_project_count DESC, user_name").
		Find(&experiences).Error; err != nil {
		r.logger.Error("Failed to get user IT experiences by level",
			zap.Error(err),
			zap.Int("min_months", minMonths),
			zap.Int("max_months", maxMonths))
		return nil, fmt.Errorf("経験レベル別IT経験の取得に失敗しました: %w", err)
	}

	return experiences, nil
}

// GetActiveUsers 現在進行中のプロジェクトがあるユーザーを取得
func (r *userITExperienceRepository) GetActiveUsers(ctx context.Context) ([]*model.UserITExperience, error) {
	var experiences []*model.UserITExperience

	if err := r.db.WithContext(ctx).
		Where("active_project_count > 0").
		Order("active_project_count DESC, total_it_experience_months DESC, user_name").
		Find(&experiences).Error; err != nil {
		r.logger.Error("Failed to get active users", zap.Error(err))
		return nil, fmt.Errorf("アクティブユーザーの取得に失敗しました: %w", err)
	}

	return experiences, nil
}

// GetTopExperiencedUsers 経験豊富なユーザーを取得
func (r *userITExperienceRepository) GetTopExperiencedUsers(ctx context.Context, limit int) ([]*model.UserITExperience, error) {
	var experiences []*model.UserITExperience

	query := r.db.WithContext(ctx).
		Where("total_it_experience_months > 0").
		Order("total_it_experience_months DESC, total_project_count DESC, user_name")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&experiences).Error; err != nil {
		r.logger.Error("Failed to get top experienced users",
			zap.Error(err),
			zap.Int("limit", limit))
		return nil, fmt.Errorf("経験豊富なユーザーの取得に失敗しました: %w", err)
	}

	return experiences, nil
}

// GetUsersByProjectCount プロジェクト数でユーザーを取得
func (r *userITExperienceRepository) GetUsersByProjectCount(ctx context.Context, minProjectCount int) ([]*model.UserITExperience, error) {
	var experiences []*model.UserITExperience

	if err := r.db.WithContext(ctx).
		Where("total_project_count >= ?", minProjectCount).
		Order("total_project_count DESC, total_it_experience_months DESC, user_name").
		Find(&experiences).Error; err != nil {
		r.logger.Error("Failed to get users by project count",
			zap.Error(err),
			zap.Int("min_project_count", minProjectCount))
		return nil, fmt.Errorf("プロジェクト数別ユーザーの取得に失敗しました: %w", err)
	}

	return experiences, nil
}

// GetRecentlyActive 最近アクティブなユーザーを取得
func (r *userITExperienceRepository) GetRecentlyActive(ctx context.Context, withinMonths int) ([]*model.UserITExperience, error) {
	var experiences []*model.UserITExperience

	if err := r.db.WithContext(ctx).
		Where("last_project_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? MONTH)", withinMonths).
		Order("last_project_date DESC, total_it_experience_months DESC, user_name").
		Find(&experiences).Error; err != nil {
		r.logger.Error("Failed to get recently active users",
			zap.Error(err),
			zap.Int("within_months", withinMonths))
		return nil, fmt.Errorf("最近アクティブなユーザーの取得に失敗しました: %w", err)
	}

	return experiences, nil
}
