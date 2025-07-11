package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/common/dateutil"
	"github.com/duesk/monstera/internal/common/logger"
	"github.com/duesk/monstera/internal/common/transaction"
	"github.com/duesk/monstera/internal/common/validate"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
)

// LeaveService は休暇関連のサービスインターフェースです
type LeaveService interface {
	// 休暇種別
	GetLeaveTypes(ctx context.Context) ([]dto.LeaveTypeResponse, error)

	// ユーザーの休暇残日数
	GetUserLeaveBalances(ctx context.Context, userID uuid.UUID) ([]dto.UserLeaveBalanceResponse, error)

	// 休暇申請
	CreateLeaveRequest(ctx context.Context, req dto.LeaveRequestRequest) (dto.LeaveRequestResponse, error)
	GetLeaveRequestsByUserID(ctx context.Context, userID uuid.UUID) ([]dto.LeaveRequestResponse, error)

	// 休日情報
	GetHolidaysByYear(ctx context.Context, year int) ([]dto.HolidayResponse, error)

	// 振替特別休暇
	GetSubstituteLeaveGrants(ctx context.Context, userID uuid.UUID) ([]dto.SubstituteLeaveGrantResponse, error)
	GetSubstituteLeaveGrantSummary(ctx context.Context, userID uuid.UUID) (dto.SubstituteLeaveGrantSummaryResponse, error)
	CreateSubstituteLeaveGrant(ctx context.Context, req dto.SubstituteLeaveGrantRequest) (dto.SubstituteLeaveGrantResponse, error)
	UpdateSubstituteLeaveGrant(ctx context.Context, id uuid.UUID, req dto.SubstituteLeaveGrantRequest) (dto.SubstituteLeaveGrantResponse, error)
	DeleteSubstituteLeaveGrant(ctx context.Context, id uuid.UUID) error

	// 振替特別休暇残日数の更新
	UpdateSubstituteLeaveUsage(ctx context.Context, userID uuid.UUID, usedDays float64) error
}

// leaveService は休暇関連のサービス実装です
type leaveService struct {
	txManager transaction.TransactionManager
	leaveRepo repository.LeaveRepository
	userRepo  repository.UserRepository
	logger    *zap.Logger
}

// NewLeaveService は新しいLeaveServiceインスタンスを作成します
func NewLeaveService(db *gorm.DB, leaveRepo repository.LeaveRepository, userRepo repository.UserRepository, logger *zap.Logger) LeaveService {
	return &leaveService{
		txManager: transaction.NewTransactionManager(db, logger),
		leaveRepo: leaveRepo,
		userRepo:  userRepo,
		logger:    logger,
	}
}

// トランザクションを実行するヘルパーメソッド
func (s *leaveService) executeInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return s.txManager.ExecuteInTransaction(ctx, func(tx *gorm.DB) error {
		return fn(tx)
	})
}

// GetLeaveTypes は有効な休暇種別一覧を取得します
func (s *leaveService) GetLeaveTypes(ctx context.Context) ([]dto.LeaveTypeResponse, error) {
	logger.LogInfo(s.logger, "休暇種別一覧取得開始")

	leaveTypes, err := s.leaveRepo.GetLeaveTypes(ctx)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "休暇種別の取得に失敗しました")
	}

	// モデルからDTOへの変換
	results := make([]dto.LeaveTypeResponse, len(leaveTypes))
	for i, lt := range leaveTypes {
		results[i] = dto.LeaveTypeResponse{
			ID:                lt.ID.String(),
			Code:              lt.Code,
			Name:              lt.Name,
			Description:       lt.Description,
			DefaultDays:       lt.DefaultDays,
			IsHourlyAvailable: lt.IsHourlyAvailable,
			ReasonRequired:    lt.ReasonRequired,
			GenderSpecific:    lt.GenderSpecific,
			DisplayOrder:      lt.DisplayOrder,
			IsActive:          lt.IsActive,
		}
	}

	logger.LogInfo(s.logger, "休暇種別一覧取得完了", zap.Int("count", len(results)))
	return results, nil
}

// GetUserLeaveBalances はユーザーの休暇残日数一覧を取得します
func (s *leaveService) GetUserLeaveBalances(ctx context.Context, userID uuid.UUID) ([]dto.UserLeaveBalanceResponse, error) {
	logger.LogInfo(s.logger, "休暇残日数一覧取得開始", zap.String("user_id", userID.String()))

	balances, err := s.leaveRepo.GetUserLeaveBalances(ctx, userID)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "休暇残日数の取得に失敗しました",
			zap.String("user_id", userID.String()))
	}

	// モデルからDTOへの変換
	results := make([]dto.UserLeaveBalanceResponse, len(balances))
	for i, b := range balances {
		results[i] = dto.UserLeaveBalanceResponse{
			ID:            b.ID.String(),
			LeaveTypeID:   b.LeaveTypeID.String(),
			LeaveTypeName: b.LeaveType.Name,
			FiscalYear:    b.FiscalYear,
			TotalDays:     b.TotalDays,
			UsedDays:      b.UsedDays,
			RemainingDays: b.RemainingDays,
			ExpireDate:    dateutil.FormatDate(b.ExpireDate),
		}
	}

	logger.LogInfo(s.logger, "休暇残日数一覧取得完了",
		zap.String("user_id", userID.String()),
		zap.Int("count", len(results)))
	return results, nil
}

// CreateLeaveRequest は新しい休暇申請を作成します
func (s *leaveService) CreateLeaveRequest(ctx context.Context, req dto.LeaveRequestRequest) (dto.LeaveRequestResponse, error) {
	logger.LogInfo(s.logger, "休暇申請作成開始",
		zap.String("user_id", req.UserID.String()),
		zap.String("leave_type_id", req.LeaveTypeID),
		zap.Float64("total_days", req.TotalDays),
		zap.Int("details_count", len(req.RequestDetails)))

	// 休暇種別の検証
	leaveType, err := s.leaveRepo.GetLeaveTypeByID(ctx, req.LeaveTypeID)
	if err != nil {
		return dto.LeaveRequestResponse{}, logger.LogAndWrapError(s.logger, err, "指定された休暇種別が見つかりません",
			zap.String("leave_type_id", req.LeaveTypeID))
	}

	// 理由が必要な休暇種別の場合の検証
	if leaveType.ReasonRequired && req.Reason == "" {
		logger.LogWarn(s.logger, "理由が必要な休暇種別に理由が指定されていない",
			zap.String("leave_type_code", leaveType.Code),
			zap.String("leave_type_name", leaveType.Name))
		return dto.LeaveRequestResponse{}, errors.New(message.MsgReasonRequired)
	}

	// 時間単位取得可能かの検証
	if req.IsHourlyBased && !leaveType.IsHourlyAvailable {
		logger.LogWarn(s.logger, "時間単位取得不可の休暇種別で時間単位の申請が行われた",
			zap.String("leave_type_code", leaveType.Code),
			zap.String("leave_type_name", leaveType.Name))
		return dto.LeaveRequestResponse{}, errors.New(message.MsgHourlyLeaveNotAllowed)
	}

	// 残日数の検証
	balance, err := s.leaveRepo.GetUserLeaveBalanceByType(ctx, req.UserID, req.LeaveTypeID)
	if err != nil {
		return dto.LeaveRequestResponse{}, logger.LogAndWrapError(s.logger, err, "休暇残日数の取得に失敗しました",
			zap.String("user_id", req.UserID.String()),
			zap.String("leave_type_id", req.LeaveTypeID))
	}

	if err := validate.ValidateMinValue(balance.RemainingDays, req.TotalDays, "残り日数"); err != nil {
		logger.LogWarn(s.logger, "休暇残日数不足",
			zap.Float64("requested_days", req.TotalDays),
			zap.Float64("remaining_days", balance.RemainingDays),
			zap.String("user_id", req.UserID.String()),
			zap.String("leave_type_id", req.LeaveTypeID))
		return dto.LeaveRequestResponse{}, fmt.Errorf(message.MsgLeaveBalanceExceededFormat, balance.RemainingDays)
	}

	// 申請詳細の日付重複チェック
	leaveDateMap := make(map[string]bool)
	for _, d := range req.RequestDetails {
		// 日付部分のみを抽出（時刻情報を除外）
		datePart := dateutil.ExtractDatePart(d.LeaveDate)

		if leaveDateMap[datePart] {
			logger.LogWarn(s.logger, "休暇申請に重複日付が含まれている", zap.String("date", datePart))
			return dto.LeaveRequestResponse{}, fmt.Errorf(message.MsgDuplicateLeaveDates, datePart)
		}
		leaveDateMap[datePart] = true
	}

	// 申請日が既に休暇取得済みでないかを確認
	leaveDates := make([]time.Time, 0, len(req.RequestDetails))
	for _, d := range req.RequestDetails {
		leaveDate, err := dateutil.ParseDateString(d.LeaveDate)
		if err != nil {
			return dto.LeaveRequestResponse{}, logger.LogAndWrapError(s.logger, err, "無効な日付フォーマット",
				zap.String("date", d.LeaveDate))
		}
		leaveDates = append(leaveDates, leaveDate)
	}

	existingRequests, err := s.leaveRepo.CheckExistingLeaveRequestsByDate(ctx, req.UserID, leaveDates)
	if err != nil {
		return dto.LeaveRequestResponse{}, logger.LogAndWrapError(s.logger, err, "既存の休暇申請の確認に失敗しました",
			zap.String("user_id", req.UserID.String()))
	}

	// 既に休暇申請されている日付があるかチェック
	var takenDates []string
	for dateStr, exists := range existingRequests {
		if exists {
			takenDates = append(takenDates, dateStr)
		}
	}

	if len(takenDates) > 0 {
		logger.LogWarn(s.logger, "既に申請されている日付が含まれている",
			zap.Strings("taken_dates", takenDates),
			zap.String("user_id", req.UserID.String()))
		return dto.LeaveRequestResponse{}, fmt.Errorf(message.MsgLeaveDatesAlreadyRequested, strings.Join(takenDates, ", "))
	}

	// 申請詳細の変換
	details := make([]model.LeaveRequestDetail, 0, len(req.RequestDetails))
	processedDates := make(map[string]bool)

	for _, d := range req.RequestDetails {
		// 日付部分のみを抽出して重複チェック（念のため再度チェック）
		datePart := dateutil.ExtractDatePart(d.LeaveDate)

		if processedDates[datePart] {
			// 同一日付のエントリは処理せず、スキップする
			continue
		}

		leaveDate, err := dateutil.ParseDateString(datePart)
		if err != nil {
			return dto.LeaveRequestResponse{}, logger.LogAndWrapError(s.logger, err, "無効な日付フォーマット",
				zap.String("date", d.LeaveDate))
		}

		processedDates[datePart] = true

		details = append(details, model.LeaveRequestDetail{
			ID:        uuid.New(),
			LeaveDate: leaveDate,
			StartTime: d.StartTime,
			EndTime:   d.EndTime,
			DayValue:  d.DayValue,
		})
	}

	// 重複除外後に日数が0になった場合はエラー
	if len(details) == 0 {
		logger.LogWarn(s.logger, "有効な休暇申請日が含まれていない", zap.String("user_id", req.UserID.String()))
		return dto.LeaveRequestResponse{}, errors.New(message.MsgNoValidLeaveDates)
	}

	// 休暇申請の作成
	now := time.Now()
	leaveTypeUUID, err := validate.ParseUUIDWithLogging(s.logger, req.LeaveTypeID, "休暇種別ID")
	if err != nil {
		return dto.LeaveRequestResponse{}, err
	}

	request := model.LeaveRequest{
		ID:            uuid.New(),
		UserID:        req.UserID,
		LeaveTypeID:   leaveTypeUUID,
		RequestDate:   now,
		IsHourlyBased: req.IsHourlyBased,
		Reason:        req.Reason,
		TotalDays:     req.TotalDays,
		Status:        "pending",
		CreatedAt:     now,
		UpdatedAt:     now,
		Details:       details,
		LeaveType:     leaveType,
	}

	var response dto.LeaveRequestResponse

	// トランザクション内で実行
	err = s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// トランザクション用のリポジトリを作成
		txLeaveRepo := repository.NewLeaveRepository(tx, s.logger)

		// リポジトリで申請を作成
		createdRequest, err := txLeaveRepo.CreateLeaveRequest(ctx, request)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "休暇申請の作成に失敗しました",
				zap.String("user_id", req.UserID.String()))
		}

		// 残日数を更新
		balance.UsedDays += req.TotalDays
		balance.RemainingDays -= req.TotalDays
		balance.UpdatedAt = now

		// gormのモデル構造の違いを考慮して、明示的にSaveするフィールドを指定
		if err := txLeaveRepo.UpdateUserLeaveBalance(ctx, balance); err != nil {
			return logger.LogAndWrapError(s.logger, err, "休暇残日数の更新に失敗しました",
				zap.String("user_id", req.UserID.String()),
				zap.String("balance_id", balance.ID.String()))
		}

		// 振替特別休暇の場合は特別な処理
		if leaveType.Code == "substitute" {
			// トランザクション内で振替特別休暇を更新
			// 通常のメソッドではなく、トランザクション内で実行するための内部実装を使用
			if err := s.updateSubstituteLeaveUsageWithTx(ctx, tx, req.UserID, req.TotalDays); err != nil {
				return logger.LogAndWrapError(s.logger, err, "振替特別休暇の残日数更新に失敗しました",
					zap.String("user_id", req.UserID.String()),
					zap.Float64("used_days", req.TotalDays))
			}
		}

		// レスポンスの作成
		detailResponses := make([]dto.LeaveRequestDetailResponse, len(createdRequest.Details))
		for i, d := range createdRequest.Details {
			detailResponses[i] = dto.LeaveRequestDetailResponse{
				ID:        d.ID.String(),
				LeaveDate: dateutil.FormatDate(d.LeaveDate),
				StartTime: d.StartTime,
				EndTime:   d.EndTime,
				DayValue:  d.DayValue,
			}
		}

		response = dto.LeaveRequestResponse{
			ID:            createdRequest.ID.String(),
			UserID:        createdRequest.UserID,
			LeaveTypeID:   createdRequest.LeaveTypeID.String(),
			LeaveTypeName: createdRequest.LeaveType.Name,
			RequestDate:   dateutil.FormatDate(createdRequest.RequestDate),
			IsHourlyBased: createdRequest.IsHourlyBased,
			Reason:        createdRequest.Reason,
			TotalDays:     createdRequest.TotalDays,
			Status:        createdRequest.Status,
			Details:       detailResponses,
		}

		return nil
	})

	if err != nil {
		return dto.LeaveRequestResponse{}, err
	}

	logger.LogInfo(s.logger, "休暇申請作成完了",
		zap.String("request_id", response.ID),
		zap.String("user_id", req.UserID.String()),
		zap.String("leave_type", leaveType.Name),
		zap.Float64("days", req.TotalDays))

	return response, nil
}

// トランザクション内でUpdateSubstituteLeaveUsageを実行するためのヘルパーメソッド
func (s *leaveService) updateSubstituteLeaveUsageWithTx(ctx context.Context, tx *gorm.DB, userID uuid.UUID, usedDays float64) error {
	// トランザクション用のリポジトリを作成
	txLeaveRepo := repository.NewLeaveRepository(tx, s.logger)

	// 振替特別休暇の付与履歴を取得
	grants, err := txLeaveRepo.GetSubstituteLeaveGrants(ctx, userID)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "振替特別休暇付与履歴の取得に失敗しました")
	}

	// 有効期限が近いものから順に使用する
	// 付与履歴を有効期限順にソート
	now := time.Now()
	validGrants := make([]model.SubstituteLeaveGrant, 0)
	for _, g := range grants {
		if !g.IsExpired && g.ExpireDate.After(now) && g.RemainingDays > 0 {
			validGrants = append(validGrants, g)
		}
	}

	// 有効期限が近い順にソート（バブルソート）
	for i := 0; i < len(validGrants)-1; i++ {
		for j := 0; j < len(validGrants)-i-1; j++ {
			if validGrants[j].ExpireDate.After(validGrants[j+1].ExpireDate) {
				validGrants[j], validGrants[j+1] = validGrants[j+1], validGrants[j]
			}
		}
	}

	// 残り使用日数
	remainingToUse := usedDays

	// 各付与履歴から順に使用
	for i := range validGrants {
		if remainingToUse <= 0 {
			break
		}

		// この付与履歴から使用できる日数
		canUse := validGrants[i].RemainingDays
		willUse := canUse
		if remainingToUse < canUse {
			willUse = remainingToUse
		}

		// 使用日数と残日数を更新
		validGrants[i].UsedDays += willUse
		validGrants[i].RemainingDays -= willUse
		validGrants[i].UpdatedAt = time.Now()

		// リポジトリで更新
		if err := txLeaveRepo.UpdateSubstituteLeaveGrant(ctx, validGrants[i]); err != nil {
			return logger.LogAndWrapError(s.logger, err, "振替特別休暇付与履歴の更新に失敗しました")
		}

		// 残り使用日数を減算
		remainingToUse -= willUse
	}

	// すべての日数を使い切れなかった場合はエラー
	if remainingToUse > 0 {
		return fmt.Errorf(message.MsgSubstituteLeaveInsufficientBalance)
	}

	// 休暇残日数テーブルの更新
	// まず休暇種別ID（substitute）を取得
	leaveTypes, err := txLeaveRepo.GetLeaveTypes(ctx)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "休暇種別の取得に失敗しました")
	}

	leaveType, found := validate.FindByCode(leaveTypes, "substitute", func(lt model.LeaveType) string { return lt.Code })
	if !found {
		logger.LogError(s.logger, "振替特別休暇の種別が見つかりません")
		return fmt.Errorf("振替特別休暇の種別が見つかりません")
	}

	substituteLeaveTypeID := leaveType.ID

	// 休暇残日数を取得して更新
	balance, err := txLeaveRepo.GetUserLeaveBalanceByType(ctx, userID, substituteLeaveTypeID.String())
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "休暇残日数の取得に失敗しました")
	}

	// 合計残日数を再計算
	totalRemaining, err := txLeaveRepo.GetTotalSubstituteLeaveBalance(ctx, userID)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "振替特別休暇合計残日数の計算に失敗しました")
	}

	// user_leave_balancesテーブルの更新
	balance.RemainingDays = totalRemaining
	balance.UsedDays = balance.TotalDays - totalRemaining
	balance.UpdatedAt = time.Now()

	if err := txLeaveRepo.UpdateUserLeaveBalance(ctx, balance); err != nil {
		return logger.LogAndWrapError(s.logger, err, "休暇残日数の更新に失敗しました")
	}

	return nil
}

// GetLeaveRequestsByUserID はユーザーIDによる休暇申請一覧を取得します
func (s *leaveService) GetLeaveRequestsByUserID(ctx context.Context, userID uuid.UUID) ([]dto.LeaveRequestResponse, error) {
	logger.LogInfo(s.logger, "ユーザーの休暇申請一覧取得開始", zap.String("user_id", userID.String()))

	requests, err := s.leaveRepo.GetLeaveRequestsByUserID(ctx, userID)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "休暇申請の取得に失敗しました",
			zap.String("user_id", userID.String()))
	}

	// レスポンスの作成
	results := make([]dto.LeaveRequestResponse, len(requests))
	for i, r := range requests {
		detailResponses := make([]dto.LeaveRequestDetailResponse, len(r.Details))
		for j, d := range r.Details {
			detailResponses[j] = dto.LeaveRequestDetailResponse{
				ID:        d.ID.String(),
				LeaveDate: dateutil.FormatDate(d.LeaveDate),
				StartTime: d.StartTime,
				EndTime:   d.EndTime,
				DayValue:  d.DayValue,
			}
		}

		results[i] = dto.LeaveRequestResponse{
			ID:            r.ID.String(),
			UserID:        r.UserID,
			LeaveTypeID:   r.LeaveTypeID.String(),
			LeaveTypeName: r.LeaveType.Name,
			RequestDate:   dateutil.FormatDate(r.RequestDate),
			IsHourlyBased: r.IsHourlyBased,
			Reason:        r.Reason,
			TotalDays:     r.TotalDays,
			Status:        r.Status,
			Details:       detailResponses,
		}

		if r.ProcessedAt != nil {
			results[i].ProcessedAt = dateutil.FormatDateTime(*r.ProcessedAt)
		}

		if r.ApproverID != nil && *r.ApproverID != uuid.Nil {
			results[i].ApproverID = r.ApproverID.String()
		}
	}

	logger.LogInfo(s.logger, "ユーザーの休暇申請一覧取得完了",
		zap.String("user_id", userID.String()),
		zap.Int("count", len(results)))
	return results, nil
}

// GetHolidaysByYear は指定年の休日情報を取得します
func (s *leaveService) GetHolidaysByYear(ctx context.Context, year int) ([]dto.HolidayResponse, error) {
	logger.LogInfo(s.logger, "休日情報取得開始", zap.Int("year", year))

	holidays, err := s.leaveRepo.GetHolidaysByYear(ctx, year)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "休日情報の取得に失敗しました", zap.Int("year", year))
	}

	// レスポンスの作成
	results := make([]dto.HolidayResponse, len(holidays))
	for i, h := range holidays {
		results[i] = dto.HolidayResponse{
			Date: dateutil.FormatDate(h.HolidayDate),
			Name: h.HolidayName,
			Type: string(h.HolidayType),
		}
	}

	logger.LogInfo(s.logger, "休日情報取得完了", zap.Int("year", year), zap.Int("count", len(results)))
	return results, nil
}

// GetSubstituteLeaveGrants はユーザーの振替特別休暇付与履歴一覧を取得します
func (s *leaveService) GetSubstituteLeaveGrants(ctx context.Context, userID uuid.UUID) ([]dto.SubstituteLeaveGrantResponse, error) {
	logger.LogInfo(s.logger, "振替特別休暇付与履歴一覧取得開始", zap.String("user_id", userID.String()))

	grants, err := s.leaveRepo.GetSubstituteLeaveGrants(ctx, userID)
	if err != nil {
		logger.LogError(s.logger, "振替特別休暇付与履歴一覧取得失敗",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, fmt.Errorf("振替特別休暇付与履歴の取得に失敗しました: %w", err)
	}

	// 現在の日付を取得
	now := time.Now()

	// モデルからDTOへの変換
	results := make([]dto.SubstituteLeaveGrantResponse, len(grants))
	for i, g := range grants {
		// 有効期限を過ぎている場合は期限切れフラグを更新
		if !g.IsExpired && g.ExpireDate.Before(now) {
			logger.LogInfo(s.logger, "振替特別休暇期限切れを検出",
				zap.String("grant_id", g.ID.String()),
				zap.String("user_id", userID.String()),
				zap.Time("expire_date", g.ExpireDate))

			g.IsExpired = true
			g.RemainingDays = 0
			if err := s.leaveRepo.UpdateSubstituteLeaveGrant(ctx, g); err != nil {
				// エラーはログに記録するが、処理は続行
				logger.LogWarn(s.logger, "有効期限切れの振替特別休暇更新に失敗",
					zap.Error(err),
					zap.String("grant_id", g.ID.String()))
			}
		}

		results[i] = dto.SubstituteLeaveGrantResponse{
			ID:            g.ID.String(),
			UserID:        g.UserID,
			GrantDate:     g.GrantDate.Format("2006-01-02"),
			GrantedDays:   g.GrantedDays,
			UsedDays:      g.UsedDays,
			RemainingDays: g.RemainingDays,
			WorkDate:      g.WorkDate.Format("2006-01-02"),
			Reason:        g.Reason,
			ExpireDate:    g.ExpireDate.Format("2006-01-02"),
			IsExpired:     g.IsExpired,
		}
	}

	logger.LogInfo(s.logger, "振替特別休暇付与履歴一覧取得完了",
		zap.String("user_id", userID.String()),
		zap.Int("count", len(results)))
	return results, nil
}

// GetSubstituteLeaveGrantSummary はユーザーの振替特別休暇の合計残日数と履歴を取得します
func (s *leaveService) GetSubstituteLeaveGrantSummary(ctx context.Context, userID uuid.UUID) (dto.SubstituteLeaveGrantSummaryResponse, error) {
	logger.LogInfo(s.logger, "振替特別休暇サマリー取得開始", zap.String("user_id", userID.String()))

	// 付与履歴を取得
	grantResponses, err := s.GetSubstituteLeaveGrants(ctx, userID)
	if err != nil {
		logger.LogError(s.logger, "振替特別休暇サマリー取得失敗",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return dto.SubstituteLeaveGrantSummaryResponse{}, err
	}

	// 合計を計算
	var totalGranted, totalUsed, totalRemaining float64
	for _, g := range grantResponses {
		if !g.IsExpired {
			totalGranted += g.GrantedDays
			totalUsed += g.UsedDays
			totalRemaining += g.RemainingDays
		}
	}

	logger.LogInfo(s.logger, "振替特別休暇サマリー取得完了",
		zap.String("user_id", userID.String()),
		zap.Float64("total_granted", totalGranted),
		zap.Float64("total_used", totalUsed),
		zap.Float64("total_remaining", totalRemaining))

	return dto.SubstituteLeaveGrantSummaryResponse{
		TotalGrantedDays:   totalGranted,
		TotalUsedDays:      totalUsed,
		TotalRemainingDays: totalRemaining,
		Grants:             grantResponses,
	}, nil
}

// CreateSubstituteLeaveGrant は新しい振替特別休暇付与履歴を作成します
func (s *leaveService) CreateSubstituteLeaveGrant(ctx context.Context, req dto.SubstituteLeaveGrantRequest) (dto.SubstituteLeaveGrantResponse, error) {
	logger.LogInfo(s.logger, "振替特別休暇付与履歴作成開始",
		zap.String("user_id", req.UserID.String()),
		zap.String("grant_date", req.GrantDate),
		zap.Float64("granted_days", req.GrantedDays),
		zap.String("work_date", req.WorkDate),
		zap.String("expire_date", req.ExpireDate))

	// 日付のパース
	grantDate, err := time.Parse("2006-01-02", req.GrantDate)
	if err != nil {
		logger.LogError(s.logger, "無効な付与日フォーマット", zap.String("grant_date", req.GrantDate), zap.Error(err))
		return dto.SubstituteLeaveGrantResponse{}, fmt.Errorf(message.MsgInvalidGrantDateFormat, req.GrantDate)
	}

	workDate, err := time.Parse("2006-01-02", req.WorkDate)
	if err != nil {
		logger.LogError(s.logger, "無効な出勤日フォーマット", zap.String("work_date", req.WorkDate), zap.Error(err))
		return dto.SubstituteLeaveGrantResponse{}, fmt.Errorf(message.MsgInvalidWorkDateFormat, req.WorkDate)
	}

	expireDate, err := time.Parse("2006-01-02", req.ExpireDate)
	if err != nil {
		logger.LogError(s.logger, "無効な有効期限フォーマット", zap.String("expire_date", req.ExpireDate), zap.Error(err))
		return dto.SubstituteLeaveGrantResponse{}, fmt.Errorf(message.MsgInvalidExpireDateFormat, req.ExpireDate)
	}

	// 初期値設定
	now := time.Now()
	grant := model.SubstituteLeaveGrant{
		ID:            uuid.New(),
		UserID:        req.UserID,
		GrantDate:     grantDate,
		GrantedDays:   req.GrantedDays,
		UsedDays:      0,               // 新規作成時は使用日数0
		RemainingDays: req.GrantedDays, // 初期の残日数は付与日数と同じ
		WorkDate:      workDate,
		Reason:        req.Reason,
		ExpireDate:    expireDate,
		IsExpired:     false, // 初期状態は有効
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	var response dto.SubstituteLeaveGrantResponse

	// トランザクション内で実行
	err = s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// トランザクション用のリポジトリを作成
		txLeaveRepo := repository.NewLeaveRepository(tx, s.logger)

		// リポジトリで作成
		createdGrant, err := txLeaveRepo.CreateSubstituteLeaveGrant(ctx, grant)
		if err != nil {
			logger.LogError(s.logger, "振替特別休暇付与履歴の作成失敗",
				zap.Error(err),
				zap.String("user_id", req.UserID.String()))
			return fmt.Errorf("振替特別休暇付与履歴の作成に失敗しました: %w", err)
		}

		// 休暇残日数テーブルの更新
		// まず休暇種別ID（substitute）を取得
		leaveTypes, err := txLeaveRepo.GetLeaveTypes(ctx)
		if err != nil {
			logger.LogError(s.logger, "休暇種別の取得失敗", zap.Error(err))
			return fmt.Errorf("休暇種別の取得に失敗しました: %w", err)
		}

		var substituteLeaveTypeID uuid.UUID
		for _, lt := range leaveTypes {
			if lt.Code == "substitute" {
				substituteLeaveTypeID = lt.ID
				break
			}
		}

		if substituteLeaveTypeID == uuid.Nil {
			logger.LogError(s.logger, "振替特別休暇の種別が見つからない")
			return fmt.Errorf(message.MsgSubstituteLeaveTypeNotFound)
		}

		// 休暇残日数を取得して更新
		balance, err := txLeaveRepo.GetUserLeaveBalanceByType(ctx, req.UserID, substituteLeaveTypeID.String())
		if err != nil {
			logger.LogError(s.logger, "休暇残日数の取得失敗",
				zap.Error(err),
				zap.String("user_id", req.UserID.String()),
				zap.String("leave_type_id", substituteLeaveTypeID.String()))
			return fmt.Errorf("休暇残日数の取得に失敗しました: %w", err)
		}

		// 合計残日数を再計算
		totalRemaining, err := txLeaveRepo.GetTotalSubstituteLeaveBalance(ctx, req.UserID)
		if err != nil {
			logger.LogError(s.logger, "振替特別休暇合計残日数の計算失敗",
				zap.Error(err),
				zap.String("user_id", req.UserID.String()))
			return fmt.Errorf("振替特別休暇合計残日数の計算に失敗しました: %w", err)
		}

		// user_leave_balancesテーブルの更新
		balance.RemainingDays = totalRemaining
		balance.TotalDays = totalRemaining
		balance.UpdatedAt = now

		if err := txLeaveRepo.UpdateUserLeaveBalance(ctx, balance); err != nil {
			logger.LogError(s.logger, "休暇残日数の更新失敗",
				zap.Error(err),
				zap.String("user_id", req.UserID.String()),
				zap.String("balance_id", balance.ID.String()))
			return fmt.Errorf("休暇残日数の更新に失敗しました: %w", err)
		}

		// レスポンスの作成
		response = dto.SubstituteLeaveGrantResponse{
			ID:            createdGrant.ID.String(),
			UserID:        createdGrant.UserID,
			GrantDate:     createdGrant.GrantDate.Format("2006-01-02"),
			GrantedDays:   createdGrant.GrantedDays,
			UsedDays:      createdGrant.UsedDays,
			RemainingDays: createdGrant.RemainingDays,
			WorkDate:      createdGrant.WorkDate.Format("2006-01-02"),
			Reason:        createdGrant.Reason,
			ExpireDate:    createdGrant.ExpireDate.Format("2006-01-02"),
			IsExpired:     createdGrant.IsExpired,
		}

		return nil
	})

	if err != nil {
		return dto.SubstituteLeaveGrantResponse{}, err
	}

	logger.LogInfo(s.logger, "振替特別休暇付与履歴作成完了",
		zap.String("grant_id", response.ID),
		zap.String("user_id", req.UserID.String()),
		zap.Float64("granted_days", req.GrantedDays))

	return response, nil
}

// UpdateSubstituteLeaveGrant は振替特別休暇付与履歴を更新します
func (s *leaveService) UpdateSubstituteLeaveGrant(ctx context.Context, id uuid.UUID, req dto.SubstituteLeaveGrantRequest) (dto.SubstituteLeaveGrantResponse, error) {
	logger.LogInfo(s.logger, "振替特別休暇付与履歴更新開始",
		zap.String("grant_id", id.String()),
		zap.String("user_id", req.UserID.String()),
		zap.String("grant_date", req.GrantDate),
		zap.Float64("granted_days", req.GrantedDays))

	// 既存の付与履歴を取得
	existingGrant, err := s.leaveRepo.GetSubstituteLeaveGrantByID(ctx, id)
	if err != nil {
		logger.LogError(s.logger, "指定された振替特別休暇付与履歴が見つからない",
			zap.Error(err),
			zap.String("grant_id", id.String()))
		return dto.SubstituteLeaveGrantResponse{}, fmt.Errorf("指定された振替特別休暇付与履歴が見つかりません: %w", err)
	}

	// 日付のパース
	grantDate, err := time.Parse("2006-01-02", req.GrantDate)
	if err != nil {
		logger.LogError(s.logger, "無効な付与日フォーマット", zap.String("grant_date", req.GrantDate), zap.Error(err))
		return dto.SubstituteLeaveGrantResponse{}, fmt.Errorf(message.MsgInvalidGrantDateFormat, req.GrantDate)
	}

	workDate, err := time.Parse("2006-01-02", req.WorkDate)
	if err != nil {
		logger.LogError(s.logger, "無効な出勤日フォーマット", zap.String("work_date", req.WorkDate), zap.Error(err))
		return dto.SubstituteLeaveGrantResponse{}, fmt.Errorf(message.MsgInvalidWorkDateFormat, req.WorkDate)
	}

	expireDate, err := time.Parse("2006-01-02", req.ExpireDate)
	if err != nil {
		logger.LogError(s.logger, "無効な有効期限フォーマット", zap.String("expire_date", req.ExpireDate), zap.Error(err))
		return dto.SubstituteLeaveGrantResponse{}, fmt.Errorf(message.MsgInvalidExpireDateFormat, req.ExpireDate)
	}

	// 使用済日数のチェック
	if existingGrant.UsedDays > req.GrantedDays {
		logger.LogWarn(s.logger, "付与日数を使用済日数よりも少なく設定することはできない",
			zap.Float64("used_days", existingGrant.UsedDays),
			zap.Float64("requested_granted_days", req.GrantedDays),
			zap.String("grant_id", id.String()))
		return dto.SubstituteLeaveGrantResponse{}, fmt.Errorf(message.MsgGrantedDaysLessThanUsed)
	}

	// 更新値の設定
	existingGrant.GrantDate = grantDate
	existingGrant.GrantedDays = req.GrantedDays
	existingGrant.RemainingDays = req.GrantedDays - existingGrant.UsedDays
	existingGrant.WorkDate = workDate
	existingGrant.Reason = req.Reason
	existingGrant.ExpireDate = expireDate
	existingGrant.UpdatedAt = time.Now()

	// 有効期限チェック
	if existingGrant.ExpireDate.Before(time.Now()) {
		logger.LogInfo(s.logger, "振替特別休暇が期限切れのため無効化",
			zap.String("grant_id", id.String()),
			zap.Time("expire_date", existingGrant.ExpireDate))
		existingGrant.IsExpired = true
		existingGrant.RemainingDays = 0
	}

	var response dto.SubstituteLeaveGrantResponse

	// トランザクション内で実行
	err = s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// トランザクション用のリポジトリを作成
		txLeaveRepo := repository.NewLeaveRepository(tx, s.logger)

		// リポジトリで更新
		if err := txLeaveRepo.UpdateSubstituteLeaveGrant(ctx, existingGrant); err != nil {
			logger.LogError(s.logger, "振替特別休暇付与履歴の更新失敗",
				zap.Error(err),
				zap.String("grant_id", id.String()))
			return fmt.Errorf("振替特別休暇付与履歴の更新に失敗しました: %w", err)
		}

		// 休暇残日数テーブルの更新
		// まず休暇種別ID（substitute）を取得
		leaveTypes, err := txLeaveRepo.GetLeaveTypes(ctx)
		if err != nil {
			logger.LogError(s.logger, "休暇種別の取得失敗", zap.Error(err))
			return fmt.Errorf("休暇種別の取得に失敗しました: %w", err)
		}

		var substituteLeaveTypeID uuid.UUID
		for _, lt := range leaveTypes {
			if lt.Code == "substitute" {
				substituteLeaveTypeID = lt.ID
				break
			}
		}

		if substituteLeaveTypeID == uuid.Nil {
			logger.LogError(s.logger, "振替特別休暇の種別が見つからない")
			return fmt.Errorf(message.MsgSubstituteLeaveTypeNotFound)
		}

		// 休暇残日数を取得して更新
		balance, err := txLeaveRepo.GetUserLeaveBalanceByType(ctx, req.UserID, substituteLeaveTypeID.String())
		if err != nil {
			logger.LogError(s.logger, "休暇残日数の取得失敗",
				zap.Error(err),
				zap.String("user_id", req.UserID.String()),
				zap.String("leave_type_id", substituteLeaveTypeID.String()))
			return fmt.Errorf("休暇残日数の取得に失敗しました: %w", err)
		}

		// 合計残日数を再計算
		totalRemaining, err := txLeaveRepo.GetTotalSubstituteLeaveBalance(ctx, req.UserID)
		if err != nil {
			logger.LogError(s.logger, "振替特別休暇合計残日数の計算失敗",
				zap.Error(err),
				zap.String("user_id", req.UserID.String()))
			return fmt.Errorf("振替特別休暇合計残日数の計算に失敗しました: %w", err)
		}

		// user_leave_balancesテーブルの更新
		balance.RemainingDays = totalRemaining
		balance.TotalDays = totalRemaining
		balance.UpdatedAt = time.Now()

		if err := txLeaveRepo.UpdateUserLeaveBalance(ctx, balance); err != nil {
			logger.LogError(s.logger, "休暇残日数の更新失敗",
				zap.Error(err),
				zap.String("user_id", req.UserID.String()),
				zap.String("balance_id", balance.ID.String()))
			return fmt.Errorf("休暇残日数の更新に失敗しました: %w", err)
		}

		// レスポンスの作成
		response = dto.SubstituteLeaveGrantResponse{
			ID:            existingGrant.ID.String(),
			UserID:        existingGrant.UserID,
			GrantDate:     existingGrant.GrantDate.Format("2006-01-02"),
			GrantedDays:   existingGrant.GrantedDays,
			UsedDays:      existingGrant.UsedDays,
			RemainingDays: existingGrant.RemainingDays,
			WorkDate:      existingGrant.WorkDate.Format("2006-01-02"),
			Reason:        existingGrant.Reason,
			ExpireDate:    existingGrant.ExpireDate.Format("2006-01-02"),
			IsExpired:     existingGrant.IsExpired,
		}

		return nil
	})

	if err != nil {
		return dto.SubstituteLeaveGrantResponse{}, err
	}

	logger.LogInfo(s.logger, "振替特別休暇付与履歴更新完了",
		zap.String("grant_id", id.String()),
		zap.String("user_id", req.UserID.String()),
		zap.Float64("granted_days", req.GrantedDays),
		zap.Float64("remaining_days", response.RemainingDays))

	return response, nil
}

// DeleteSubstituteLeaveGrant は振替特別休暇付与履歴を削除します
func (s *leaveService) DeleteSubstituteLeaveGrant(ctx context.Context, id uuid.UUID) error {
	logger.LogInfo(s.logger, "振替特別休暇付与履歴削除開始", zap.String("grant_id", id.String()))

	// 既存の付与履歴を取得
	existingGrant, err := s.leaveRepo.GetSubstituteLeaveGrantByID(ctx, id)
	if err != nil {
		logger.LogError(s.logger, "指定された振替特別休暇付与履歴が見つからない",
			zap.Error(err),
			zap.String("grant_id", id.String()))
		return fmt.Errorf("指定された振替特別休暇付与履歴が見つかりません: %w", err)
	}

	// 使用済日数のチェック
	if existingGrant.UsedDays > 0 {
		logger.LogWarn(s.logger, "既に使用されている振替特別休暇は削除できない",
			zap.Float64("used_days", existingGrant.UsedDays),
			zap.String("grant_id", id.String()),
			zap.String("user_id", existingGrant.UserID.String()))
		return fmt.Errorf(message.MsgSubstituteLeaveCannotDelete)
	}

	// トランザクション内で実行
	err = s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// トランザクション用のリポジトリを作成
		txLeaveRepo := repository.NewLeaveRepository(tx, s.logger)

		// リポジトリで削除
		if err := txLeaveRepo.DeleteSubstituteLeaveGrant(ctx, id); err != nil {
			logger.LogError(s.logger, "振替特別休暇付与履歴の削除失敗",
				zap.Error(err),
				zap.String("grant_id", id.String()))
			return fmt.Errorf("振替特別休暇付与履歴の削除に失敗しました: %w", err)
		}

		// 休暇残日数テーブルの更新
		// まず休暇種別ID（substitute）を取得
		leaveTypes, err := txLeaveRepo.GetLeaveTypes(ctx)
		if err != nil {
			logger.LogError(s.logger, "休暇種別の取得失敗", zap.Error(err))
			return fmt.Errorf("休暇種別の取得に失敗しました: %w", err)
		}

		var substituteLeaveTypeID uuid.UUID
		for _, lt := range leaveTypes {
			if lt.Code == "substitute" {
				substituteLeaveTypeID = lt.ID
				break
			}
		}

		if substituteLeaveTypeID == uuid.Nil {
			logger.LogError(s.logger, "振替特別休暇の種別が見つからない")
			return fmt.Errorf(message.MsgSubstituteLeaveTypeNotFound)
		}

		// 休暇残日数を取得して更新
		balance, err := txLeaveRepo.GetUserLeaveBalanceByType(ctx, existingGrant.UserID, substituteLeaveTypeID.String())
		if err != nil {
			logger.LogError(s.logger, "休暇残日数の取得失敗",
				zap.Error(err),
				zap.String("user_id", existingGrant.UserID.String()),
				zap.String("leave_type_id", substituteLeaveTypeID.String()))
			return fmt.Errorf("休暇残日数の取得に失敗しました: %w", err)
		}

		// 合計残日数を再計算
		totalRemaining, err := txLeaveRepo.GetTotalSubstituteLeaveBalance(ctx, existingGrant.UserID)
		if err != nil {
			logger.LogError(s.logger, "振替特別休暇合計残日数の計算失敗",
				zap.Error(err),
				zap.String("user_id", existingGrant.UserID.String()))
			return fmt.Errorf("振替特別休暇合計残日数の計算に失敗しました: %w", err)
		}

		// user_leave_balancesテーブルの更新
		balance.RemainingDays = totalRemaining
		balance.TotalDays = totalRemaining
		balance.UpdatedAt = time.Now()

		if err := txLeaveRepo.UpdateUserLeaveBalance(ctx, balance); err != nil {
			logger.LogError(s.logger, "休暇残日数の更新失敗",
				zap.Error(err),
				zap.String("user_id", existingGrant.UserID.String()),
				zap.String("balance_id", balance.ID.String()))
			return fmt.Errorf("休暇残日数の更新に失敗しました: %w", err)
		}

		return nil
	})

	if err != nil {
		return err
	}

	logger.LogInfo(s.logger, "振替特別休暇付与履歴削除完了",
		zap.String("grant_id", id.String()),
		zap.String("user_id", existingGrant.UserID.String()),
		zap.Float64("granted_days", existingGrant.GrantedDays))

	return nil
}

// UpdateSubstituteLeaveUsage は振替特別休暇の使用日数を更新します
func (s *leaveService) UpdateSubstituteLeaveUsage(ctx context.Context, userID uuid.UUID, usedDays float64) error {
	logger.LogInfo(s.logger, "振替特別休暇使用日数更新開始",
		zap.String("user_id", userID.String()),
		zap.Float64("used_days", usedDays))

	// トランザクション内で実行
	err := s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		return s.updateSubstituteLeaveUsageWithTx(ctx, tx, userID, usedDays)
	})

	if err != nil {
		logger.LogError(s.logger, "振替特別休暇使用日数更新失敗",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Float64("used_days", usedDays))
		return err
	}

	logger.LogInfo(s.logger, "振替特別休暇使用日数更新完了",
		zap.String("user_id", userID.String()),
		zap.Float64("used_days", usedDays))
	return nil
}
