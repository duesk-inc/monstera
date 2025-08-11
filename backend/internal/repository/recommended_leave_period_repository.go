package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type RecommendedLeavePeriodRepository interface {
	GetByID(ctx context.Context, id string) (*model.RecommendedLeavePeriod, error)
	GetExpiredActivePeriods(ctx context.Context, currentDate time.Time) ([]*model.RecommendedLeavePeriod, error)
	Create(ctx context.Context, period *model.RecommendedLeavePeriod) error
	Update(ctx context.Context, period *model.RecommendedLeavePeriod) error
	GetActivePeriods(ctx context.Context) ([]*model.RecommendedLeavePeriod, error)
}

type recommendedLeavePeriodRepository struct {
	DB     *gorm.DB
	Logger *zap.Logger
}

func NewRecommendedLeavePeriodRepository(db *gorm.DB, logger *zap.Logger) RecommendedLeavePeriodRepository {
	return &recommendedLeavePeriodRepository{
		DB:     db,
		Logger: logger,
	}
}

func (r *recommendedLeavePeriodRepository) GetByID(ctx context.Context, id string) (*model.RecommendedLeavePeriod, error) {
	var period model.RecommendedLeavePeriod
	err := r.DB.WithContext(ctx).First(&period, "id = ?", id).Error
	if err != nil {
		r.Logger.Error("Failed to get recommended leave period by ID",
			zap.Error(err),
			zap.String("period_id", id))
		return nil, err
	}
	return &period, nil
}

func (r *recommendedLeavePeriodRepository) GetExpiredActivePeriods(ctx context.Context, currentDate time.Time) ([]*model.RecommendedLeavePeriod, error) {
	var periods []*model.RecommendedLeavePeriod
	err := r.DB.WithContext(ctx).
		Where("is_active = ? AND end_date < ?", true, currentDate).
		Find(&periods).Error

	if err != nil {
		r.Logger.Error("Failed to get expired active periods",
			zap.Error(err),
			zap.Time("current_date", currentDate))
		return nil, err
	}

	return periods, nil
}

func (r *recommendedLeavePeriodRepository) Create(ctx context.Context, period *model.RecommendedLeavePeriod) error {
	err := r.DB.WithContext(ctx).Create(period).Error
	if err != nil {
		r.Logger.Error("Failed to create recommended leave period",
			zap.Error(err),
			zap.String("period_name", period.Name))
		return err
	}
	return nil
}

func (r *recommendedLeavePeriodRepository) Update(ctx context.Context, period *model.RecommendedLeavePeriod) error {
	err := r.DB.WithContext(ctx).Save(period).Error
	if err != nil {
		r.Logger.Error("Failed to update recommended leave period",
			zap.Error(err),
			zap.String("period_id", period.ID))
		return err
	}
	return nil
}

func (r *recommendedLeavePeriodRepository) GetActivePeriods(ctx context.Context) ([]*model.RecommendedLeavePeriod, error) {
	var periods []*model.RecommendedLeavePeriod
	err := r.DB.WithContext(ctx).
		Where("is_active = ?", true).
		Order("start_date ASC").
		Find(&periods).Error

	if err != nil {
		r.Logger.Error("Failed to get active periods", zap.Error(err))
		return nil, err
	}

	return periods, nil
}
