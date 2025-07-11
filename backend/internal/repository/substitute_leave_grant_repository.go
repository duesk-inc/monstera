package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type SubstituteLeaveGrantRepository interface {
	Create(ctx context.Context, grant *model.SubstituteLeaveGrant) error
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]*model.SubstituteLeaveGrant, error)
	GetActiveGrants(ctx context.Context, userID uuid.UUID, currentDate time.Time) ([]*model.SubstituteLeaveGrant, error)
}

type substituteLeaveGrantRepository struct {
	DB     *gorm.DB
	Logger *zap.Logger
}

func NewSubstituteLeaveGrantRepository(db *gorm.DB, logger *zap.Logger) SubstituteLeaveGrantRepository {
	return &substituteLeaveGrantRepository{
		DB:     db,
		Logger: logger,
	}
}

func (r *substituteLeaveGrantRepository) Create(ctx context.Context, grant *model.SubstituteLeaveGrant) error {
	err := r.DB.WithContext(ctx).Create(grant).Error
	if err != nil {
		r.Logger.Error("Failed to create substitute leave grant",
			zap.Error(err),
			zap.String("user_id", grant.UserID.String()))
		return err
	}
	return nil
}

func (r *substituteLeaveGrantRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*model.SubstituteLeaveGrant, error) {
	var grants []*model.SubstituteLeaveGrant
	err := r.DB.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("grant_date DESC").
		Find(&grants).Error

	if err != nil {
		r.Logger.Error("Failed to get substitute leave grants",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, err
	}

	return grants, nil
}

func (r *substituteLeaveGrantRepository) GetActiveGrants(ctx context.Context, userID uuid.UUID, currentDate time.Time) ([]*model.SubstituteLeaveGrant, error) {
	var grants []*model.SubstituteLeaveGrant
	err := r.DB.WithContext(ctx).
		Where("user_id = ? AND expire_date >= ?", userID, currentDate).
		Order("expire_date ASC").
		Find(&grants).Error

	if err != nil {
		r.Logger.Error("Failed to get active substitute leave grants",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, err
	}

	return grants, nil
}
