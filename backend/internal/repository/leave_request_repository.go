package repository

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type LeaveRequestRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*model.LeaveRequest, error)
	Create(ctx context.Context, request *model.LeaveRequest) error
	Update(ctx context.Context, request *model.LeaveRequest) error
}

type leaveRequestRepository struct {
	DB     *gorm.DB
	Logger *zap.Logger
}

func NewLeaveRequestRepository(db *gorm.DB, logger *zap.Logger) LeaveRequestRepository {
	return &leaveRequestRepository{
		DB:     db,
		Logger: logger,
	}
}

func (r *leaveRequestRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.LeaveRequest, error) {
	var request model.LeaveRequest
	err := r.DB.WithContext(ctx).
		Preload("User").
		Preload("LeaveType").
		Preload("Details").
		Preload("Approver").
		First(&request, "id = ?", id).Error

	if err != nil {
		r.Logger.Error("Failed to get leave request by ID",
			zap.Error(err),
			zap.String("request_id", id.String()))
		return nil, err
	}

	return &request, nil
}

func (r *leaveRequestRepository) Create(ctx context.Context, request *model.LeaveRequest) error {
	err := r.DB.WithContext(ctx).Create(request).Error
	if err != nil {
		r.Logger.Error("Failed to create leave request",
			zap.Error(err),
			zap.String("user_id", request.UserID))
		return err
	}

	return nil
}

func (r *leaveRequestRepository) Update(ctx context.Context, request *model.LeaveRequest) error {
	err := r.DB.WithContext(ctx).Save(request).Error
	if err != nil {
		r.Logger.Error("Failed to update leave request",
			zap.Error(err),
			zap.String("request_id", request.ID.String()))
		return err
	}

	return nil
}
