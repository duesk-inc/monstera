package repository

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type UserLeaveBalanceRepository interface {
	GetByUserAndType(ctx context.Context, userID, leaveTypeID string) (*model.UserLeaveBalance, error)
	Create(ctx context.Context, balance *model.UserLeaveBalance) error
	Update(ctx context.Context, balance *model.UserLeaveBalance) error
	GetByUser(ctx context.Context, userID string) ([]*model.UserLeaveBalance, error)
}

type userLeaveBalanceRepository struct {
	DB     *gorm.DB
	Logger *zap.Logger
}

func NewUserLeaveBalanceRepository(db *gorm.DB, logger *zap.Logger) UserLeaveBalanceRepository {
	return &userLeaveBalanceRepository{
		DB:     db,
		Logger: logger,
	}
}

func (r *userLeaveBalanceRepository) GetByUserAndType(ctx context.Context, userID, leaveTypeID string) (*model.UserLeaveBalance, error) {
	var balance model.UserLeaveBalance
	err := r.DB.WithContext(ctx).
		Preload("LeaveType").
		Where("user_id = ? AND leave_type_id = ?", userID, leaveTypeID).
		First(&balance).Error

	if err != nil {
		r.Logger.Error("Failed to get user leave balance",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.String("leave_type_id", leaveTypeID))
		return nil, err
	}

	return &balance, nil
}

func (r *userLeaveBalanceRepository) Create(ctx context.Context, balance *model.UserLeaveBalance) error {
	err := r.DB.WithContext(ctx).Create(balance).Error
	if err != nil {
		r.Logger.Error("Failed to create user leave balance",
			zap.Error(err),
			zap.String("user_id", balance.UserID),
			zap.String("leave_type_id", balance.LeaveTypeID))
		return err
	}

	return nil
}

func (r *userLeaveBalanceRepository) Update(ctx context.Context, balance *model.UserLeaveBalance) error {
	err := r.DB.WithContext(ctx).Save(balance).Error
	if err != nil {
		r.Logger.Error("Failed to update user leave balance",
			zap.Error(err),
			zap.String("user_id", balance.UserID),
			zap.String("leave_type_id", balance.LeaveTypeID))
		return err
	}

	return nil
}

func (r *userLeaveBalanceRepository) GetByUser(ctx context.Context, userID string) ([]*model.UserLeaveBalance, error) {
	var balances []*model.UserLeaveBalance
	err := r.DB.WithContext(ctx).
		Preload("LeaveType").
		Where("user_id = ?", userID).
		Find(&balances).Error

	if err != nil {
		r.Logger.Error("Failed to get user leave balances",
			zap.Error(err),
			zap.String("user_id", userID))
		return nil, err
	}

	return balances, nil
}
