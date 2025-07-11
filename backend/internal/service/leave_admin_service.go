package service

import (
	"context"
	"fmt"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type LeaveAdminService interface {
	GetLeaveRequests(ctx context.Context, filters repository.LeaveRequestFilters, pagination repository.Pagination) ([]*model.LeaveRequest, int64, error)
	ApproveLeaveRequest(ctx context.Context, requestID, approverID uuid.UUID) error
	RejectLeaveRequest(ctx context.Context, requestID, approverID uuid.UUID, reason string) error
	BulkApproveLeaveRequests(ctx context.Context, requestIDs []uuid.UUID, approverID uuid.UUID) ([]ApprovalResult, error)
	GetLeaveStatistics(ctx context.Context, filters repository.StatisticsFilters) (*repository.LeaveStatistics, error)
	GetUserLeaveStatistics(ctx context.Context, userID uuid.UUID, filters repository.StatisticsFilters) (*repository.UserLeaveStatistics, error)
}

type leaveAdminService struct {
	db                   *gorm.DB
	leaveRequestRepo     repository.LeaveRequestRepository
	leaveAdminRepo       repository.LeaveRequestAdminRepository
	userLeaveBalanceRepo repository.UserLeaveBalanceRepository
	// notificationService NotificationService // TODO: 通知機能実装時に有効化
	logger *zap.Logger
}

type ApprovalResult struct {
	RequestID uuid.UUID `json:"requestId"`
	Success   bool      `json:"success"`
	Error     string    `json:"error,omitempty"`
}

func NewLeaveAdminService(
	db *gorm.DB,
	leaveRequestRepo repository.LeaveRequestRepository,
	leaveAdminRepo repository.LeaveRequestAdminRepository,
	userLeaveBalanceRepo repository.UserLeaveBalanceRepository,
	// notificationService NotificationService, // TODO: 通知機能実装時に有効化
	logger *zap.Logger,
) LeaveAdminService {
	return &leaveAdminService{
		db:                   db,
		leaveRequestRepo:     leaveRequestRepo,
		leaveAdminRepo:       leaveAdminRepo,
		userLeaveBalanceRepo: userLeaveBalanceRepo,
		// notificationService: notificationService, // TODO: 通知機能実装時に有効化
		logger: logger,
	}
}

func (s *leaveAdminService) GetLeaveRequests(ctx context.Context, filters repository.LeaveRequestFilters, pagination repository.Pagination) ([]*model.LeaveRequest, int64, error) {
	// 退職者除外をデフォルトで有効化
	filters.ExcludeRetired = true
	return s.leaveAdminRepo.GetAllWithFilters(ctx, filters, pagination)
}

func (s *leaveAdminService) ApproveLeaveRequest(ctx context.Context, requestID, approverID uuid.UUID) error {
	// トランザクション開始
	return s.db.Transaction(func(tx *gorm.DB) error {
		// トランザクション用のリポジトリ作成
		txLeaveRequestRepo := repository.NewLeaveRequestRepository(tx, s.logger)
		txLeaveAdminRepo := repository.NewLeaveRequestAdminRepository(tx, s.logger)
		txUserLeaveBalanceRepo := repository.NewUserLeaveBalanceRepository(tx, s.logger)

		// 申請情報取得
		request, err := txLeaveRequestRepo.GetByID(ctx, requestID)
		if err != nil {
			return fmt.Errorf("申請情報の取得に失敗しました")
		}

		if request.Status != "pending" {
			return fmt.Errorf("この申請は既に処理されています")
		}

		// 残日数チェック
		balance, err := txUserLeaveBalanceRepo.GetByUserAndType(ctx, request.UserID, request.LeaveTypeID)
		if err != nil {
			return fmt.Errorf("休暇残日数の取得に失敗しました")
		}

		if balance.RemainingDays < request.TotalDays {
			return fmt.Errorf("休暇残日数が不足しています（残日数: %.1f日）", balance.RemainingDays)
		}

		// 承認処理
		if err := txLeaveAdminRepo.ApproveRequest(ctx, requestID, approverID); err != nil {
			return fmt.Errorf("承認処理に失敗しました")
		}

		// 残日数更新
		balance.UsedDays += request.TotalDays
		balance.RemainingDays = balance.TotalDays - balance.UsedDays
		if err := txUserLeaveBalanceRepo.Update(ctx, balance); err != nil {
			return fmt.Errorf("休暇残日数の更新に失敗しました")
		}

		// 通知送信（トランザクション外で実行）
		// TODO: NotifyLeaveApprovalメソッドをNotificationServiceに追加後有効化
		// go func() {
		// 	if err := s.notificationService.NotifyLeaveApproval(context.Background(), request.UserID, requestID); err != nil {
		// 		s.logger.Error("Failed to send approval notification", zap.Error(err))
		// 	}
		// }()

		return nil
	})
}

func (s *leaveAdminService) RejectLeaveRequest(ctx context.Context, requestID, approverID uuid.UUID, reason string) error {
	if reason == "" {
		return fmt.Errorf("却下理由を入力してください")
	}

	// トランザクション開始
	return s.db.Transaction(func(tx *gorm.DB) error {
		// トランザクション用のリポジトリ作成
		txLeaveRequestRepo := repository.NewLeaveRequestRepository(tx, s.logger)
		txLeaveAdminRepo := repository.NewLeaveRequestAdminRepository(tx, s.logger)

		// 申請情報取得
		request, err := txLeaveRequestRepo.GetByID(ctx, requestID)
		if err != nil {
			return fmt.Errorf("申請情報の取得に失敗しました")
		}

		if request.Status != "pending" {
			return fmt.Errorf("この申請は既に処理されています")
		}

		// 却下処理
		if err := txLeaveAdminRepo.RejectRequest(ctx, requestID, approverID, reason); err != nil {
			return fmt.Errorf("却下処理に失敗しました")
		}

		// 通知送信（トランザクション外で実行）
		// TODO: NotifyLeaveRejectionメソッドをNotificationServiceに追加後有効化
		// go func() {
		// 	if err := s.notificationService.NotifyLeaveRejection(context.Background(), request.UserID, requestID, reason); err != nil {
		// 		s.logger.Error("Failed to send rejection notification", zap.Error(err))
		// 	}
		// }()

		return nil
	})
}

func (s *leaveAdminService) BulkApproveLeaveRequests(ctx context.Context, requestIDs []uuid.UUID, approverID uuid.UUID) ([]ApprovalResult, error) {
	results := make([]ApprovalResult, 0, len(requestIDs))

	for _, requestID := range requestIDs {
		result := ApprovalResult{
			RequestID: requestID,
			Success:   true,
		}

		// 個別に承認処理を実行
		if err := s.ApproveLeaveRequest(ctx, requestID, approverID); err != nil {
			result.Success = false
			result.Error = err.Error()
		}

		results = append(results, result)
	}

	return results, nil
}

func (s *leaveAdminService) GetLeaveStatistics(ctx context.Context, filters repository.StatisticsFilters) (*repository.LeaveStatistics, error) {
	return s.leaveAdminRepo.GetStatistics(ctx, filters)
}

func (s *leaveAdminService) GetUserLeaveStatistics(ctx context.Context, userID uuid.UUID, filters repository.StatisticsFilters) (*repository.UserLeaveStatistics, error) {
	return s.leaveAdminRepo.GetUserStatistics(ctx, userID, filters)
}
