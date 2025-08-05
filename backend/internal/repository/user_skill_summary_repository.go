package repository

import (
	"context"
	"fmt"

	"github.com/duesk/monstera/internal/model"
	"gorm.io/gorm"
	"go.uber.org/zap"
)

// UserSkillSummaryRepository ユーザースキルサマリーリポジトリのインターフェース
type UserSkillSummaryRepository interface {
	GetByUserID(ctx context.Context, userID string) ([]*model.UserSkillSummary, error)
	GetByUserIDAndCategory(ctx context.Context, userID string, category string) ([]*model.UserSkillSummary, error)
	GetByTechnology(ctx context.Context, technologyName string) ([]*model.UserSkillSummary, error)
	GetTopSkillsByCategory(ctx context.Context, category string, limit int) ([]*model.UserSkillSummary, error)
	SearchByTechnology(ctx context.Context, query string, limit int) ([]*model.UserSkillSummary, error)
	GetUsersBySkill(ctx context.Context, technologyName string, minExperienceMonths int) ([]*model.UserSkillSummary, error)
}

// userSkillSummaryRepository ユーザースキルサマリーリポジトリの実装
type userSkillSummaryRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewUserSkillSummaryRepository ユーザースキルサマリーリポジトリのコンストラクタ
func NewUserSkillSummaryRepository(db *gorm.DB, logger *zap.Logger) UserSkillSummaryRepository {
	return &userSkillSummaryRepository{
		db:     db,
		logger: logger,
	}
}

// GetByUserID ユーザーIDでスキルサマリーを取得
func (r *userSkillSummaryRepository) GetByUserID(ctx context.Context, userID string) ([]*model.UserSkillSummary, error) {
	var skills []*model.UserSkillSummary

	if err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("category_name, total_experience_months DESC, technology_name").
		Find(&skills).Error; err != nil {
		r.logger.Error("Failed to get user skill summary", zap.Error(err), zap.String("user_id", userID))
		return nil, fmt.Errorf("ユーザースキルサマリーの取得に失敗しました: %w", err)
	}

	return skills, nil
}

// GetByUserIDAndCategory ユーザーIDとカテゴリでスキルサマリーを取得
func (r *userSkillSummaryRepository) GetByUserIDAndCategory(ctx context.Context, userID string, category string) ([]*model.UserSkillSummary, error) {
	var skills []*model.UserSkillSummary

	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND category_name = ?", userID, category).
		Order("total_experience_months DESC, technology_name").
		Find(&skills).Error; err != nil {
		r.logger.Error("Failed to get user skill summary by category",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.String("category", category))
		return nil, fmt.Errorf("カテゴリ別スキルサマリーの取得に失敗しました: %w", err)
	}

	return skills, nil
}

// GetByTechnology 技術名でスキルサマリーを取得
func (r *userSkillSummaryRepository) GetByTechnology(ctx context.Context, technologyName string) ([]*model.UserSkillSummary, error) {
	var skills []*model.UserSkillSummary

	if err := r.db.WithContext(ctx).
		Where("technology_name = ?", technologyName).
		Order("total_experience_months DESC, user_name").
		Find(&skills).Error; err != nil {
		r.logger.Error("Failed to get skill summary by technology",
			zap.Error(err),
			zap.String("technology", technologyName))
		return nil, fmt.Errorf("技術別スキルサマリーの取得に失敗しました: %w", err)
	}

	return skills, nil
}

// GetTopSkillsByCategory カテゴリ別トップスキルを取得
func (r *userSkillSummaryRepository) GetTopSkillsByCategory(ctx context.Context, category string, limit int) ([]*model.UserSkillSummary, error) {
	var skills []*model.UserSkillSummary

	query := r.db.WithContext(ctx).
		Where("category_name = ?", category).
		Order("total_experience_months DESC, project_count DESC, technology_name")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&skills).Error; err != nil {
		r.logger.Error("Failed to get top skills by category",
			zap.Error(err),
			zap.String("category", category),
			zap.Int("limit", limit))
		return nil, fmt.Errorf("カテゴリ別トップスキルの取得に失敗しました: %w", err)
	}

	return skills, nil
}

// SearchByTechnology 技術名で検索
func (r *userSkillSummaryRepository) SearchByTechnology(ctx context.Context, query string, limit int) ([]*model.UserSkillSummary, error) {
	var skills []*model.UserSkillSummary

	dbQuery := r.db.WithContext(ctx).
		Where("technology_name LIKE ? OR technology_display_name LIKE ?",
			"%"+query+"%", "%"+query+"%").
		Order("total_experience_months DESC, project_count DESC, technology_name")

	if limit > 0 {
		dbQuery = dbQuery.Limit(limit)
	}

	if err := dbQuery.Find(&skills).Error; err != nil {
		r.logger.Error("Failed to search skills by technology",
			zap.Error(err),
			zap.String("query", query),
			zap.Int("limit", limit))
		return nil, fmt.Errorf("技術検索に失敗しました: %w", err)
	}

	return skills, nil
}

// GetUsersBySkill 特定スキルを持つユーザーを取得
func (r *userSkillSummaryRepository) GetUsersBySkill(ctx context.Context, technologyName string, minExperienceMonths int) ([]*model.UserSkillSummary, error) {
	var skills []*model.UserSkillSummary

	if err := r.db.WithContext(ctx).
		Where("technology_name = ? AND total_experience_months >= ?", technologyName, minExperienceMonths).
		Order("total_experience_months DESC, project_count DESC, user_name").
		Find(&skills).Error; err != nil {
		r.logger.Error("Failed to get users by skill",
			zap.Error(err),
			zap.String("technology", technologyName),
			zap.Int("min_months", minExperienceMonths))
		return nil, fmt.Errorf("スキル保有者の取得に失敗しました: %w", err)
	}

	return skills, nil
}
