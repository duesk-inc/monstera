package service

import (
	"context"
	"fmt"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseApproverSettingService 承認者設定サービスのインターフェース
type ExpenseApproverSettingService interface {
	// 承認者設定管理
	CreateApproverSetting(ctx context.Context, userID string, req *dto.ExpenseApproverSettingRequest) (*model.ExpenseApproverSetting, error)
	GetApproverSettings(ctx context.Context) (*dto.ExpenseApproverSettingsResponse, error)
	GetApproverSettingsByType(ctx context.Context, approvalType string) (*dto.ExpenseApproverSettingsResponse, error)
	UpdateApproverSetting(ctx context.Context, settingID string, userID string, req *dto.ExpenseApproverSettingRequest) (*model.ExpenseApproverSetting, error)
	DeleteApproverSetting(ctx context.Context, settingID string, userID string) error

	// 履歴管理
	GetApproverSettingHistories(ctx context.Context, page, limit int) (*dto.ExpenseApproverSettingHistoriesResponse, error)
	GetApproverSettingHistoryByID(ctx context.Context, settingID string) (*dto.ExpenseApproverSettingHistoriesResponse, error)

	// 承認者取得（承認フロー作成用）
	GetActiveApprovers(ctx context.Context, approvalType model.ApprovalType) ([]string, error)
}

// expenseApproverSettingService 承認者設定サービスの実装
type expenseApproverSettingService struct {
	db          *gorm.DB
	settingRepo repository.ExpenseApproverSettingRepository
	userRepo    repository.UserRepository
	logger      *zap.Logger
}

// NewExpenseApproverSettingService 承認者設定サービスのインスタンスを生成
func NewExpenseApproverSettingService(
	db *gorm.DB,
	settingRepo repository.ExpenseApproverSettingRepository,
	userRepo repository.UserRepository,
	logger *zap.Logger,
) ExpenseApproverSettingService {
	return &expenseApproverSettingService{
		db:          db,
		settingRepo: settingRepo,
		userRepo:    userRepo,
		logger:      logger,
	}
}

// CreateApproverSetting 承認者設定を作成
func (s *expenseApproverSettingService) CreateApproverSetting(ctx context.Context, userID string, req *dto.ExpenseApproverSettingRequest) (*model.ExpenseApproverSetting, error) {
	// 承認者の存在確認
	approver, err := s.userRepo.FindByID(req.ApproverID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("承認者が見つかりません")
		}
		s.logger.Error("Failed to find approver", zap.Error(err))
		return nil, fmt.Errorf("承認者の確認に失敗しました")
	}

	// 承認者が適切な権限を持っているかチェック
	if !s.canBeApprover(approver, model.ApprovalType(req.ApprovalType)) {
		return nil, fmt.Errorf("指定されたユーザーは%s承認者になれません", req.ApprovalType)
	}

	// 重複チェック
	exists, err := s.settingRepo.ExistsByApproverAndType(ctx, req.ApproverID, model.ApprovalType(req.ApprovalType))
	if err != nil {
		s.logger.Error("Failed to check existence", zap.Error(err))
		return nil, fmt.Errorf("重複チェックに失敗しました")
	}
	if exists {
		return nil, fmt.Errorf("この承認者は既に%s承認者として設定されています", req.ApprovalType)
	}

	// 設定作成
	setting := &model.ExpenseApproverSetting{
		ApprovalType: model.ApprovalType(req.ApprovalType),
		ApproverID:   req.ApproverID,
		IsActive:     true,
		Priority:     1,
		CreatedBy:    userID,
	}

	if req.IsActive != nil {
		setting.IsActive = *req.IsActive
	}
	if req.Priority != nil {
		setting.Priority = *req.Priority
	}

	// トランザクション内で処理
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// リポジトリをトランザクション用に作成
		txSettingRepo := repository.NewExpenseApproverSettingRepository(tx, s.logger)

		// 設定を作成
		if err := txSettingRepo.Create(ctx, setting); err != nil {
			return fmt.Errorf("承認者設定の作成に失敗しました: %w", err)
		}

		// 履歴を記録
		history := &model.ExpenseApproverSettingHistory{
			SettingID:    setting.ID,
			ApprovalType: setting.ApprovalType,
			ApproverID:   setting.ApproverID,
			Action:       "create",
			ChangedBy:    userID,
			NewValue: map[string]interface{}{
				"is_active": setting.IsActive,
				"priority":  setting.Priority,
			},
		}

		if err := txSettingRepo.CreateHistory(ctx, history); err != nil {
			s.logger.Error("Failed to create history", zap.Error(err))
			// 履歴の作成に失敗してもロールバックしない
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 作成した設定を再取得（関連データをロード）
	created, err := s.settingRepo.GetByID(ctx, setting.ID)
	if err != nil {
		s.logger.Error("Failed to get created setting", zap.Error(err))
		return setting, nil // 作成は成功しているので、基本情報だけ返す
	}

	return created, nil
}

// GetApproverSettings すべての承認者設定を取得
func (s *expenseApproverSettingService) GetApproverSettings(ctx context.Context) (*dto.ExpenseApproverSettingsResponse, error) {
	settings, err := s.settingRepo.GetAll(ctx)
	if err != nil {
		s.logger.Error("Failed to get all approver settings", zap.Error(err))
		return nil, fmt.Errorf("承認者設定の取得に失敗しました")
	}

	response := &dto.ExpenseApproverSettingsResponse{
		Settings: make([]dto.ExpenseApproverSettingResponse, 0, len(settings)),
	}

	for _, setting := range settings {
		var resp dto.ExpenseApproverSettingResponse
		resp.FromModel(&setting)
		response.Settings = append(response.Settings, resp)
	}

	return response, nil
}

// GetApproverSettingsByType 承認タイプ別に承認者設定を取得
func (s *expenseApproverSettingService) GetApproverSettingsByType(ctx context.Context, approvalType string) (*dto.ExpenseApproverSettingsResponse, error) {
	settings, err := s.settingRepo.GetByApprovalType(ctx, model.ApprovalType(approvalType))
	if err != nil {
		s.logger.Error("Failed to get approver settings by type", zap.Error(err))
		return nil, fmt.Errorf("承認者設定の取得に失敗しました")
	}

	response := &dto.ExpenseApproverSettingsResponse{
		Settings: make([]dto.ExpenseApproverSettingResponse, 0, len(settings)),
	}

	for _, setting := range settings {
		var resp dto.ExpenseApproverSettingResponse
		resp.FromModel(&setting)
		response.Settings = append(response.Settings, resp)
	}

	return response, nil
}

// UpdateApproverSetting 承認者設定を更新
func (s *expenseApproverSettingService) UpdateApproverSetting(ctx context.Context, settingID string, userID string, req *dto.ExpenseApproverSettingRequest) (*model.ExpenseApproverSetting, error) {
	// 既存の設定を取得
	setting, err := s.settingRepo.GetByID(ctx, settingID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("承認者設定が見つかりません")
		}
		s.logger.Error("Failed to get approver setting", zap.Error(err))
		return nil, fmt.Errorf("承認者設定の取得に失敗しました")
	}

	// 変更前の値を記録
	oldValue := map[string]interface{}{
		"approval_type": string(setting.ApprovalType),
		"approver_id":   setting.ApproverID,
		"is_active":     setting.IsActive,
		"priority":      setting.Priority,
	}

	// 承認タイプや承認者が変更される場合の検証
	if req.ApprovalType != string(setting.ApprovalType) || req.ApproverID != setting.ApproverID {
		// 承認者の存在確認
		approver, err := s.userRepo.FindByID(req.ApproverID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, fmt.Errorf("承認者が見つかりません")
			}
			s.logger.Error("Failed to find approver", zap.Error(err))
			return nil, fmt.Errorf("承認者の確認に失敗しました")
		}

		// 承認者が適切な権限を持っているかチェック
		if !s.canBeApprover(approver, model.ApprovalType(req.ApprovalType)) {
			return nil, fmt.Errorf("指定されたユーザーは%s承認者になれません", req.ApprovalType)
		}

		// 重複チェック（自分自身を除く）
		exists, err := s.settingRepo.ExistsByApproverAndType(ctx, req.ApproverID, model.ApprovalType(req.ApprovalType))
		if err != nil {
			s.logger.Error("Failed to check existence", zap.Error(err))
			return nil, fmt.Errorf("重複チェックに失敗しました")
		}
		if exists && (req.ApproverID != setting.ApproverID || req.ApprovalType != string(setting.ApprovalType)) {
			return nil, fmt.Errorf("この承認者は既に%s承認者として設定されています", req.ApprovalType)
		}
	}

	// 更新
	setting.ApprovalType = model.ApprovalType(req.ApprovalType)
	setting.ApproverID = req.ApproverID
	if req.IsActive != nil {
		setting.IsActive = *req.IsActive
	}
	if req.Priority != nil {
		setting.Priority = *req.Priority
	}

	// トランザクション内で処理
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// リポジトリをトランザクション用に作成
		txSettingRepo := repository.NewExpenseApproverSettingRepository(tx, s.logger)

		// 設定を更新
		if err := txSettingRepo.Update(ctx, setting); err != nil {
			return fmt.Errorf("承認者設定の更新に失敗しました: %w", err)
		}

		// 履歴を記録
		history := &model.ExpenseApproverSettingHistory{
			SettingID:    setting.ID,
			ApprovalType: setting.ApprovalType,
			ApproverID:   setting.ApproverID,
			Action:       "update",
			ChangedBy:    userID,
			OldValue:     oldValue,
			NewValue: map[string]interface{}{
				"approval_type": string(setting.ApprovalType),
				"approver_id":   setting.ApproverID,
				"is_active":     setting.IsActive,
				"priority":      setting.Priority,
			},
		}

		if err := txSettingRepo.CreateHistory(ctx, history); err != nil {
			s.logger.Error("Failed to create history", zap.Error(err))
			// 履歴の作成に失敗してもロールバックしない
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 更新した設定を再取得（関連データをロード）
	updated, err := s.settingRepo.GetByID(ctx, setting.ID)
	if err != nil {
		s.logger.Error("Failed to get updated setting", zap.Error(err))
		return setting, nil // 更新は成功しているので、基本情報だけ返す
	}

	return updated, nil
}

// DeleteApproverSetting 承認者設定を削除
func (s *expenseApproverSettingService) DeleteApproverSetting(ctx context.Context, settingID string, userID string) error {
	// 既存の設定を取得
	setting, err := s.settingRepo.GetByID(ctx, settingID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("承認者設定が見つかりません")
		}
		s.logger.Error("Failed to get approver setting", zap.Error(err))
		return fmt.Errorf("承認者設定の取得に失敗しました")
	}

	// トランザクション内で処理
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// リポジトリをトランザクション用に作成
		txSettingRepo := repository.NewExpenseApproverSettingRepository(tx, s.logger)

		// 履歴を記録
		history := &model.ExpenseApproverSettingHistory{
			SettingID:    setting.ID,
			ApprovalType: setting.ApprovalType,
			ApproverID:   setting.ApproverID,
			Action:       "delete",
			ChangedBy:    userID,
			OldValue: map[string]interface{}{
				"approval_type": string(setting.ApprovalType),
				"approver_id":   setting.ApproverID,
				"is_active":     setting.IsActive,
				"priority":      setting.Priority,
			},
		}

		if err := txSettingRepo.CreateHistory(ctx, history); err != nil {
			s.logger.Error("Failed to create history", zap.Error(err))
			// 履歴の作成に失敗してもロールバックしない
		}

		// 設定を削除
		if err := txSettingRepo.Delete(ctx, settingID); err != nil {
			return fmt.Errorf("承認者設定の削除に失敗しました: %w", err)
		}

		return nil
	})

	return err
}

// GetApproverSettingHistories 承認者設定履歴を取得
func (s *expenseApproverSettingService) GetApproverSettingHistories(ctx context.Context, page, limit int) (*dto.ExpenseApproverSettingHistoriesResponse, error) {
	offset := (page - 1) * limit
	histories, total, err := s.settingRepo.GetAllHistories(ctx, limit, offset)
	if err != nil {
		s.logger.Error("Failed to get approver setting histories", zap.Error(err))
		return nil, fmt.Errorf("承認者設定履歴の取得に失敗しました")
	}

	response := &dto.ExpenseApproverSettingHistoriesResponse{
		Histories: make([]dto.ExpenseApproverSettingHistoryResponse, 0, len(histories)),
		Total:     total,
	}

	for _, history := range histories {
		var resp dto.ExpenseApproverSettingHistoryResponse
		resp.FromHistoryModel(&history)
		response.Histories = append(response.Histories, resp)
	}

	return response, nil
}

// GetApproverSettingHistoryByID 特定の設定の履歴を取得
func (s *expenseApproverSettingService) GetApproverSettingHistoryByID(ctx context.Context, settingID string) (*dto.ExpenseApproverSettingHistoriesResponse, error) {
	histories, err := s.settingRepo.GetHistories(ctx, settingID)
	if err != nil {
		s.logger.Error("Failed to get approver setting history", zap.Error(err))
		return nil, fmt.Errorf("承認者設定履歴の取得に失敗しました")
	}

	response := &dto.ExpenseApproverSettingHistoriesResponse{
		Histories: make([]dto.ExpenseApproverSettingHistoryResponse, 0, len(histories)),
		Total:     int64(len(histories)),
	}

	for _, history := range histories {
		var resp dto.ExpenseApproverSettingHistoryResponse
		resp.FromHistoryModel(&history)
		response.Histories = append(response.Histories, resp)
	}

	return response, nil
}

// GetActiveApprovers アクティブな承認者を取得（承認フロー作成用）
func (s *expenseApproverSettingService) GetActiveApprovers(ctx context.Context, approvalType model.ApprovalType) ([]string, error) {
	settings, err := s.settingRepo.GetActiveByApprovalType(ctx, approvalType)
	if err != nil {
		s.logger.Error("Failed to get active approvers", zap.Error(err))
		return nil, err
	}

	approverIDs := make([]string, 0, len(settings))
	for _, setting := range settings {
		approverIDs = append(approverIDs, setting.ApproverID)
	}

	// 承認者が設定されていない場合のデフォルト値
	if len(approverIDs) == 0 {
		s.logger.Warn("No active approvers found for approval type",
			zap.String("approval_type", string(approvalType)))
		// デフォルトの承認者IDを返す（実装に応じて変更）
		// return []string{"00000000-0000-0000-0000-000000000001"}, nil
	}

	return approverIDs, nil
}

// canBeApprover ユーザーが承認者になれるかチェック
func (s *expenseApproverSettingService) canBeApprover(user *model.User, approvalType model.ApprovalType) bool {
	// 管理者は全ての承認タイプの承認者になれる
	if user.Role == model.RoleAdmin {
		return true
	}

	switch approvalType {
	case model.ApprovalTypeManager:
		// 管理部承認者: 管理者またはマネージャー
		return user.Role == model.RoleManager || user.Role == model.RoleAdmin
	case model.ApprovalTypeExecutive:
		// 役員承認者: 管理者のみ
		return user.Role == model.RoleAdmin
	default:
		return false
	}
}
