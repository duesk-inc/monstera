package repository

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type LeavePeriodUsageRepository interface {
	GetByPeriodID(ctx context.Context, periodID uuid.UUID) ([]*model.LeavePeriodUsage, error)
	GetByUserAndPeriod(ctx context.Context, userID, periodID uuid.UUID) (*model.LeavePeriodUsage, error)
	Create(ctx context.Context, usage *model.LeavePeriodUsage) error
	Update(ctx context.Context, usage *model.LeavePeriodUsage) error
	UpdateUsedDays(ctx context.Context, userID, periodID uuid.UUID, usedDays float64) error
}

type leavePeriodUsageRepository struct {
	DB     *gorm.DB
	Logger *zap.Logger
}

func NewLeavePeriodUsageRepository(db *gorm.DB, logger *zap.Logger) LeavePeriodUsageRepository {
	return &leavePeriodUsageRepository{
		DB:     db,
		Logger: logger,
	}
}

func (r *leavePeriodUsageRepository) GetByPeriodID(ctx context.Context, periodID uuid.UUID) ([]*model.LeavePeriodUsage, error) {
	var usages []*model.LeavePeriodUsage
	err := r.DB.WithContext(ctx).
		Preload("User").
		Preload("Period").
		Where("period_id = ?", periodID).
		Find(&usages).Error

	if err != nil {
		r.Logger.Error("Failed to get leave period usages",
			zap.Error(err),
			zap.String("period_id", periodID.String()))
		return nil, err
	}

	return usages, nil
}

func (r *leavePeriodUsageRepository) GetByUserAndPeriod(ctx context.Context, userID, periodID uuid.UUID) (*model.LeavePeriodUsage, error) {
	var usage model.LeavePeriodUsage
	err := r.DB.WithContext(ctx).
		Preload("User").
		Preload("Period").
		Where("user_id = ? AND period_id = ?", userID, periodID).
		First(&usage).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.Logger.Error("Failed to get leave period usage",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.String("period_id", periodID.String()))
		return nil, err
	}

	return &usage, nil
}

func (r *leavePeriodUsageRepository) Create(ctx context.Context, usage *model.LeavePeriodUsage) error {
	err := r.DB.WithContext(ctx).Create(usage).Error
	if err != nil {
		r.Logger.Error("Failed to create leave period usage",
			zap.Error(err),
			zap.String("user_id", usage.UserID.String()),
			zap.String("period_id", usage.RecommendedLeavePeriodID.String()))
		return err
	}
	return nil
}

func (r *leavePeriodUsageRepository) Update(ctx context.Context, usage *model.LeavePeriodUsage) error {
	err := r.DB.WithContext(ctx).Save(usage).Error
	if err != nil {
		r.Logger.Error("Failed to update leave period usage",
			zap.Error(err),
			zap.String("usage_id", usage.ID.String()))
		return err
	}
	return nil
}

func (r *leavePeriodUsageRepository) UpdateUsedDays(ctx context.Context, userID, periodID uuid.UUID, usedDays float64) error {
	// 既存のレコードを確認
	usage, err := r.GetByUserAndPeriod(ctx, userID, periodID)
	if err != nil {
		return err
	}

	if usage == nil {
		// レコードが存在しない場合は新規作成
		usage = &model.LeavePeriodUsage{
			ID:                       uuid.New(),
			UserID:                   userID,
			RecommendedLeavePeriodID: periodID,
			UsedDays:                 int(usedDays),
		}
		return r.Create(ctx, usage)
	}

	// 既存レコードを更新
	usage.UsedDays = int(usedDays)
	return r.Update(ctx, usage)
}
