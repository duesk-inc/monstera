package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// エラー定義
var (
	ErrAlertSettingsNotFound = errors.New("alert settings not found")
	ErrAlertHistoryNotFound  = errors.New("alert history not found")
)

// AlertService アラートサービスのインターフェース
type AlertService interface {
	// アラート設定管理
	GetAlertSettings(ctx context.Context) (*model.AlertSettings, error)
	CreateAlertSettings(ctx context.Context, req *dto.CreateAlertSettingsRequest, userID string) (*model.AlertSettings, error)
	GetAlertSettingsList(ctx context.Context, page, limit int) ([]*model.AlertSettings, int64, error)
	UpdateAlertSettings(ctx context.Context, id string, req *dto.UpdateAlertSettingsRequest, userID string) (*model.AlertSettings, error)
	DeleteAlertSettings(ctx context.Context, id string) error

	// アラート検出・作成
	DetectWeeklyReportAlerts(ctx context.Context, weekStart, weekEnd time.Time) error
	PerformComprehensiveAlertDetection(ctx context.Context, weekStart, weekEnd time.Time) (*AlertDetectionSummary, error)
	CreateAlert(ctx context.Context, req *CreateAlertRequest) (*model.AlertHistory, error)
	CreateBulkAlerts(ctx context.Context, alerts []model.AlertHistory) error

	// アラート管理
	GetAlertByID(ctx context.Context, id string) (*model.AlertHistory, error)
	GetAlerts(ctx context.Context, filters repository.AlertFilters, page, limit int) ([]*model.AlertHistory, int64, error)
	GetAlertHistories(ctx context.Context, filters map[string]string, page, limit int) ([]*model.AlertHistory, int64, error)
	GetAlertHistory(ctx context.Context, id string) (*model.AlertHistory, error)
	GetUnresolvedAlertsByUsers(ctx context.Context, userIDs []string) ([]*model.AlertHistory, error)
	GetAlertsByUser(ctx context.Context, userID string, status *model.AlertStatus) ([]*model.AlertHistory, error)

	// アラートステータス管理
	UpdateAlertStatus(ctx context.Context, id string, status string, comment string, userID string) error
	ResolveAlert(ctx context.Context, id string, resolvedBy string, comment string) error
	StartHandlingAlert(ctx context.Context, id string, handlerID string) error

	// 統計・分析
	GetAlertStats(ctx context.Context, startDate, endDate time.Time) (*repository.AlertStats, error)
	GetAlertSummary(ctx context.Context) (*dto.AlertSummaryDTO, error)
	GetActiveAlertCount(ctx context.Context) (int64, error)
	GetAlertTrends(ctx context.Context, userID string, days int) (*AlertTrends, error)
}

// CreateAlertRequest アラート作成リクエスト
type CreateAlertRequest struct {
	UserID         string                 `json:"user_id" validate:"required"`
	WeeklyReportID *string                `json:"weekly_report_id,omitempty"`
	AlertType      model.AlertType        `json:"alert_type" validate:"required"`
	Severity       model.AlertSeverity    `json:"severity" validate:"required"`
	DetectedValue  map[string]interface{} `json:"detected_value" validate:"required"`
	ThresholdValue map[string]interface{} `json:"threshold_value" validate:"required"`
}

// AlertTrends アラートトレンド情報
type AlertTrends struct {
	UserID       string                        `json:"user_id"`
	Period       int                           `json:"period_days"`
	TotalAlerts  int64                         `json:"total_alerts"`
	ByType       map[model.AlertType]int64     `json:"by_type"`
	BySeverity   map[model.AlertSeverity]int64 `json:"by_severity"`
	DailyCount   map[string]int64              `json:"daily_count"`
	ResolvedRate float64                       `json:"resolved_rate"`
}

// alertService アラートサービスの実装
type alertService struct {
	db                *gorm.DB
	alertRepo         repository.AlertRepository
	alertHistoryRepo  repository.AlertHistoryRepository
	alertSettingsRepo repository.AlertSettingsRepository
	weeklyReportRepo  repository.WeeklyReportRepository
	userRepo          repository.UserRepository
	// notificationService IntegratedNotificationService // TODO: implement when needed
	logger *zap.Logger
}

// NewAlertService アラートサービスのインスタンスを生成
func NewAlertService(
	db *gorm.DB,
	alertRepo repository.AlertRepository,
	alertHistoryRepo repository.AlertHistoryRepository,
	alertSettingsRepo repository.AlertSettingsRepository,
	weeklyReportRepo repository.WeeklyReportRepository,
	userRepo repository.UserRepository,
	// notificationService IntegratedNotificationService // TODO: implement when needed,
	logger *zap.Logger,
) AlertService {
	return &alertService{
		db:                db,
		alertRepo:         alertRepo,
		alertHistoryRepo:  alertHistoryRepo,
		alertSettingsRepo: alertSettingsRepo,
		weeklyReportRepo:  weeklyReportRepo,
		userRepo:          userRepo,
		// notificationService: notificationService, // TODO: implement when needed
		logger: logger,
	}
}

// GetAlertSettings アラート設定を取得
func (s *alertService) GetAlertSettings(ctx context.Context) (*model.AlertSettings, error) {
	settings, err := s.alertSettingsRepo.GetSettings(ctx)
	if err != nil {
		s.logger.Error("Failed to get alert settings", zap.Error(err))
		return nil, fmt.Errorf("アラート設定の取得に失敗しました: %w", err)
	}
	return settings, nil
}

// UpdateAlertSettings アラート設定を更新
func (s *alertService) UpdateAlertSettings(ctx context.Context, id string, req *dto.UpdateAlertSettingsRequest, userID string) (*model.AlertSettings, error) {
	// 現在の設定を取得
	currentSettings, err := s.GetAlertSettings(ctx)
	if err != nil {
		return nil, err
	}

	// 更新者の存在確認
	if _, err := s.userRepo.FindByID(userID); err != nil {
		s.logger.Error("Updater not found",
			zap.String("updater_id", userID),
			zap.Error(err))
		return nil, fmt.Errorf("更新者が見つかりません: %w", err)
	}

	// 設定を更新（ポインタフィールドの適切な処理）
	updates := map[string]interface{}{
		"updated_by": userID,
	}

	if req.WeeklyHoursLimit != nil {
		updates["weekly_hours_limit"] = *req.WeeklyHoursLimit
	}
	if req.WeeklyHoursChangeLimit != nil {
		updates["weekly_hours_change_limit"] = *req.WeeklyHoursChangeLimit
	}
	if req.ConsecutiveHolidayWorkLimit != nil {
		updates["consecutive_holiday_work_limit"] = *req.ConsecutiveHolidayWorkLimit
	}
	if req.MonthlyOvertimeLimit != nil {
		updates["monthly_overtime_limit"] = *req.MonthlyOvertimeLimit
	}

	if err := s.alertSettingsRepo.Update(ctx, currentSettings.ID, updates); err != nil {
		s.logger.Error("Failed to update alert settings",
			zap.String("updater_id", userID),
			zap.Error(err))
		return nil, fmt.Errorf("アラート設定の更新に失敗しました: %w", err)
	}

	// 更新された設定を反映
	if req.WeeklyHoursLimit != nil {
		currentSettings.WeeklyHoursLimit = *req.WeeklyHoursLimit
	}
	if req.WeeklyHoursChangeLimit != nil {
		currentSettings.WeeklyHoursChangeLimit = *req.WeeklyHoursChangeLimit
	}
	if req.ConsecutiveHolidayWorkLimit != nil {
		currentSettings.ConsecutiveHolidayWorkLimit = *req.ConsecutiveHolidayWorkLimit
	}
	if req.MonthlyOvertimeLimit != nil {
		currentSettings.MonthlyOvertimeLimit = *req.MonthlyOvertimeLimit
	}
	currentSettings.UpdatedBy = userID

	s.logger.Info("Alert settings updated successfully",
		zap.String("updater_id", userID))

	return currentSettings, nil
}

// DetectWeeklyReportAlerts 週報に基づくアラートを検出
func (s *alertService) DetectWeeklyReportAlerts(ctx context.Context, weekStart, weekEnd time.Time) error {
	// アラート設定を取得
	settings, err := s.GetAlertSettings(ctx)
	if err != nil {
		return err
	}

	// 該当週の全週報を取得
	reports, err := s.weeklyReportRepo.GetByWeek(ctx, weekStart, weekEnd)
	if err != nil {
		s.logger.Error("Failed to get weekly reports",
			zap.Time("week_start", weekStart),
			zap.Time("week_end", weekEnd),
			zap.Error(err))
		return fmt.Errorf("週報の取得に失敗しました: %w", err)
	}

	alerts := []model.AlertHistory{}

	for _, report := range reports {
		// 基本的なアラートチェック
		if alert := s.checkOverwork(report, settings); alert != nil {
			alerts = append(alerts, *alert)
		}

		if alert := s.checkSuddenChange(ctx, report, settings); alert != nil {
			alerts = append(alerts, *alert)
		}

		if alert := s.checkHolidayWork(ctx, report, settings); alert != nil {
			alerts = append(alerts, *alert)
		}

		if alert := s.checkMonthlyOvertime(ctx, report, settings); alert != nil {
			alerts = append(alerts, *alert)
		}

		// 高度な勤務パターンアラートチェック
		patternAlerts := s.checkAbnormalWorkPattern(ctx, report, settings)
		for _, alert := range patternAlerts {
			alerts = append(alerts, *alert)
		}
	}

	// アラートが検出された場合は作成
	if len(alerts) > 0 {
		if err := s.CreateBulkAlerts(ctx, alerts); err != nil {
			return err
		}

		// 通知を送信 - TODO: implement when needed
		/*
			if err := s.notificationService.SendAlertNotifications(ctx, convertToAlertPointers(alerts)); err != nil {
				s.logger.Error("Failed to send alert notifications",
					zap.Int("alert_count", len(alerts)),
					zap.Error(err))
				// 通知送信エラーは無視（アラート自体は作成済み）
			}
		*/
	}

	s.logger.Info("Weekly report alert detection completed",
		zap.Time("week_start", weekStart),
		zap.Time("week_end", weekEnd),
		zap.Int("alert_count", len(alerts)))

	return nil
}

// CreateAlert アラートを作成
func (s *alertService) CreateAlert(ctx context.Context, req *CreateAlertRequest) (*model.AlertHistory, error) {
	// ユーザーの存在確認
	if _, err := s.userRepo.FindByID(req.UserID); err != nil {
		s.logger.Error("User not found",
			zap.String("user_id", req.UserID),
			zap.Error(err))
		return nil, fmt.Errorf("ユーザーが見つかりません: %w", err)
	}

	// JSON値に変換
	detectedValue, err := json.Marshal(req.DetectedValue)
	if err != nil {
		return nil, fmt.Errorf("検出値の変換に失敗しました: %w", err)
	}

	thresholdValue, err := json.Marshal(req.ThresholdValue)
	if err != nil {
		return nil, fmt.Errorf("閾値の変換に失敗しました: %w", err)
	}

	alert := &model.AlertHistory{
		UserID:         req.UserID,
		WeeklyReportID: req.WeeklyReportID,
		AlertType:      req.AlertType,
		Severity:       req.Severity,
		DetectedValue:  detectedValue,
		ThresholdValue: thresholdValue,
		Status:         model.AlertStatusUnhandled,
	}

	if err := s.alertHistoryRepo.Create(ctx, alert); err != nil {
		s.logger.Error("Failed to create alert",
			zap.String("user_id", req.UserID),
			zap.String("type", string(req.AlertType)),
			zap.Error(err))
		return nil, fmt.Errorf("アラートの作成に失敗しました: %w", err)
	}

	// 通知を送信 - TODO: implement when needed
	/*
		if err := s.notificationService.SendAlertNotifications(ctx, []*model.AlertHistory{alert}); err != nil {
			s.logger.Error("Failed to send alert notification",
				zap.String("alert_id", alert.ID),
				zap.Error(err))
			// 通知送信エラーは無視（アラート自体は作成済み）
		}
	*/

	s.logger.Info("Alert created successfully",
		zap.String("alert_id", alert.ID),
		zap.String("user_id", req.UserID),
		zap.String("type", string(req.AlertType)))

	return alert, nil
}

// CreateBulkAlerts 複数のアラートを一括作成
func (s *alertService) CreateBulkAlerts(ctx context.Context, alerts []model.AlertHistory) error {
	if len(alerts) == 0 {
		return nil
	}

	// ポインタスライスに変換
	alertPointers := make([]*model.AlertHistory, len(alerts))
	for i := range alerts {
		alertPointers[i] = &alerts[i]
	}

	if err := s.alertHistoryRepo.CreateBatch(ctx, alertPointers); err != nil {
		s.logger.Error("Failed to create bulk alerts",
			zap.Int("count", len(alerts)),
			zap.Error(err))
		return fmt.Errorf("アラートの一括作成に失敗しました: %w", err)
	}

	s.logger.Info("Bulk alerts created successfully",
		zap.Int("count", len(alerts)))

	return nil
}

// GetAlertByID IDでアラートを取得
func (s *alertService) GetAlertByID(ctx context.Context, id string) (*model.AlertHistory, error) {
	alertID := id
	alert, err := s.alertHistoryRepo.GetByID(ctx, alertID)
	if err != nil {
		s.logger.Error("Failed to get alert by ID",
			zap.String("alert_id", id),
			zap.Error(err))
		return nil, fmt.Errorf("アラートの取得に失敗しました: %w", err)
	}

	if alert == nil {
		return nil, fmt.Errorf("アラートが見つかりません")
	}

	return alert, nil
}

// GetAlerts フィルタ条件でアラートを取得
func (s *alertService) GetAlerts(ctx context.Context, filters repository.AlertFilters, page, limit int) ([]*model.AlertHistory, int64, error) {
	// repository.AlertFilters to dto.AlertFilters conversion
	dtoFilters := dto.AlertFilters{}
	if filters.Status != nil {
		dtoFilters.Status = string(*filters.Status)
	}
	if filters.Severity != nil {
		dtoFilters.Severity = string(*filters.Severity)
	}
	if filters.AlertType != nil {
		dtoFilters.AlertType = string(*filters.AlertType)
	}
	if filters.UserID != nil {
		dtoFilters.UserID = *filters.UserID
	}

	if filters.DateFrom != nil {
		dtoFilters.DateFrom = filters.DateFrom.Format("2006-01-02")
	}
	if filters.DateTo != nil {
		dtoFilters.DateTo = filters.DateTo.Format("2006-01-02")
	}

	alerts, total, err := s.alertHistoryRepo.GetList(ctx, dtoFilters, page, limit)
	if err != nil {
		s.logger.Error("Failed to get alerts",
			zap.Any("filters", filters),
			zap.Int("page", page),
			zap.Int("limit", limit),
			zap.Error(err))
		return nil, 0, fmt.Errorf("アラート一覧の取得に失敗しました: %w", err)
	}

	return alerts, total, nil
}

// GetUnresolvedAlertsByUsers ユーザー別未解決アラートを取得
func (s *alertService) GetUnresolvedAlertsByUsers(ctx context.Context, userIDs []string) ([]*model.AlertHistory, error) {
	return s.alertRepo.GetUnresolvedAlertsByUsers(ctx, userIDs)
}

// GetAlertsByUser ユーザーのアラートを取得
func (s *alertService) GetAlertsByUser(ctx context.Context, userID string, status *model.AlertStatus) ([]*model.AlertHistory, error) {
	return s.alertRepo.GetAlertsByUser(ctx, userID, status)
}

// UpdateAlertStatus アラートのステータスを更新（内部実装）
func (s *alertService) updateAlertStatusInternal(ctx context.Context, id string, status model.AlertStatus, resolvedBy *string, comment string) error {
	// 既存のアラートを確認
	alert, err := s.GetAlertByID(ctx, id)
	if err != nil {
		return err
	}

	// ステータス遷移の妥当性チェック
	if !s.isValidStatusTransition(alert.Status, status) {
		return fmt.Errorf("無効なステータス遷移です: %s → %s", alert.Status, status)
	}

	alertID := id
	handledBy := ""
	if resolvedBy != nil {
		handledBy = *resolvedBy
	}

	if err := s.alertHistoryRepo.UpdateStatus(ctx, alertID, string(status), handledBy, comment); err != nil {
		s.logger.Error("Failed to update alert status",
			zap.String("alert_id", id),
			zap.String("status", string(status)),
			zap.Error(err))
		return fmt.Errorf("アラートステータスの更新に失敗しました: %w", err)
	}

	s.logger.Info("Alert status updated successfully",
		zap.String("alert_id", id),
		zap.String("old_status", string(alert.Status)),
		zap.String("new_status", string(status)))

	return nil
}

// UpdateAlertStatus アラートのステータスを更新（ハンドラー用の新しいシグネチャ）
func (s *alertService) UpdateAlertStatus(ctx context.Context, id string, status string, comment string, userID string) error {
	// ステータスをmodel.AlertStatusに変換
	var alertStatus model.AlertStatus
	switch status {
	case "handling":
		alertStatus = model.AlertStatusHandling
	case "resolved":
		alertStatus = model.AlertStatusResolved
	case "ignored":
		alertStatus = model.AlertStatusIgnored
	default:
		return fmt.Errorf("無効なステータス: %s", status)
	}

	// 内部実装を呼び出し
	return s.updateAlertStatusInternal(ctx, id, alertStatus, &userID, comment)
}

// ResolveAlert アラートを解決済みにする
func (s *alertService) ResolveAlert(ctx context.Context, id string, resolvedBy string, comment string) error {
	return s.updateAlertStatusInternal(ctx, id, model.AlertStatusResolved, &resolvedBy, comment)
}

// StartHandlingAlert アラートの対応を開始
func (s *alertService) StartHandlingAlert(ctx context.Context, id string, handlerID string) error {
	comment := fmt.Sprintf("対応開始: %s", handlerID)
	return s.updateAlertStatusInternal(ctx, id, model.AlertStatusHandling, &handlerID, comment)
}

// GetAlertStats アラート統計を取得
func (s *alertService) GetAlertStats(ctx context.Context, startDate, endDate time.Time) (*repository.AlertStats, error) {
	return s.alertRepo.GetAlertStats(ctx, startDate, endDate)
}

// GetActiveAlertCount アクティブなアラート数を取得
func (s *alertService) GetActiveAlertCount(ctx context.Context) (int64, error) {
	return s.alertRepo.GetActiveAlertCount(ctx)
}

// GetAlertTrends アラートトレンドを取得
func (s *alertService) GetAlertTrends(ctx context.Context, userID string, days int) (*AlertTrends, error) {
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -days)

	// 期間内のアラートを取得
	filters := repository.AlertFilters{
		UserID:    &userID,
		DateFrom:  &startDate,
		DateTo:    &endDate,
		SortBy:    "created_at",
		SortOrder: "ASC",
	}

	alerts, total, err := s.alertRepo.GetAlerts(ctx, filters, 0, 10000) // 全件取得
	if err != nil {
		return nil, fmt.Errorf("アラートの取得に失敗しました: %w", err)
	}

	trends := &AlertTrends{
		UserID:      userID,
		Period:      days,
		TotalAlerts: total,
		ByType:      make(map[model.AlertType]int64),
		BySeverity:  make(map[model.AlertSeverity]int64),
		DailyCount:  make(map[string]int64),
	}

	var resolvedCount int64

	for _, alert := range alerts {
		// タイプ別カウント
		trends.ByType[alert.AlertType]++

		// 深刻度別カウント
		trends.BySeverity[alert.Severity]++

		// 日別カウント
		dateKey := alert.CreatedAt.Format("2006-01-02")
		trends.DailyCount[dateKey]++

		// 解決済みカウント
		if alert.Status == model.AlertStatusResolved {
			resolvedCount++
		}
	}

	// 解決率
	if total > 0 {
		trends.ResolvedRate = float64(resolvedCount) / float64(total) * 100
	}

	return trends, nil
}

// checkOverwork 長時間労働をチェック
func (s *alertService) checkOverwork(report *model.WeeklyReport, settings *model.AlertSettings) *model.AlertHistory {
	// 総労働時間を計算（実装は週報モデルの構造に依存）
	totalHours := s.calculateTotalHours(report)

	if totalHours > float64(settings.WeeklyHoursLimit) {
		detectedValue := map[string]interface{}{
			"total_hours": totalHours,
			"week_start":  report.StartDate,
			"week_end":    report.EndDate,
		}

		thresholdValue := map[string]interface{}{
			"limit": settings.WeeklyHoursLimit,
		}

		detectedValueJSON, _ := json.Marshal(detectedValue)
		thresholdValueJSON, _ := json.Marshal(thresholdValue)

		severity := model.AlertSeverityMedium
		if totalHours > float64(settings.WeeklyHoursLimit)*1.2 {
			severity = model.AlertSeverityHigh
		}

		return &model.AlertHistory{
			UserID:         report.UserID,
			WeeklyReportID: &report.ID,
			AlertType:      model.AlertTypeOverwork,
			Severity:       severity,
			DetectedValue:  detectedValueJSON,
			ThresholdValue: thresholdValueJSON,
			Status:         model.AlertStatusUnhandled,
		}
	}

	return nil
}

// checkSuddenChange 前週比急激な変化をチェック
func (s *alertService) checkSuddenChange(ctx context.Context, report *model.WeeklyReport, settings *model.AlertSettings) *model.AlertHistory {
	// 前週の週報を取得
	previousWeekStart := report.StartDate.AddDate(0, 0, -7)
	previousWeekEnd := report.EndDate.AddDate(0, 0, -7)

	previousReports, err := s.weeklyReportRepo.GetByUserAndWeek(ctx, report.UserID, previousWeekStart, previousWeekEnd)
	if err != nil || len(previousReports) == 0 {
		return nil // 前週のデータがない場合はスキップ
	}

	previousReport := previousReports[0]

	currentHours := s.calculateTotalHours(report)
	previousHours := s.calculateTotalHours(previousReport)

	changePercent := ((currentHours - previousHours) / previousHours) * 100

	if changePercent > float64(settings.WeeklyHoursChangeLimit) || changePercent < -float64(settings.WeeklyHoursChangeLimit) {
		detectedValue := map[string]interface{}{
			"current_hours":  currentHours,
			"previous_hours": previousHours,
			"change_percent": changePercent,
		}

		thresholdValue := map[string]interface{}{
			"limit_percent": settings.WeeklyHoursChangeLimit,
		}

		detectedValueJSON, _ := json.Marshal(detectedValue)
		thresholdValueJSON, _ := json.Marshal(thresholdValue)

		severity := model.AlertSeverityLow
		if changePercent > float64(settings.WeeklyHoursChangeLimit)*1.5 {
			severity = model.AlertSeverityMedium
		}

		return &model.AlertHistory{
			UserID:         report.UserID,
			WeeklyReportID: &report.ID,
			AlertType:      model.AlertTypeSuddenChange,
			Severity:       severity,
			DetectedValue:  detectedValueJSON,
			ThresholdValue: thresholdValueJSON,
			Status:         model.AlertStatusUnhandled,
		}
	}

	return nil
}

// checkHolidayWork 連続休日出勤をチェック
func (s *alertService) checkHolidayWork(ctx context.Context, report *model.WeeklyReport, settings *model.AlertSettings) *model.AlertHistory {
	// 実装は週報モデルの構造に依存
	// ここでは簡略化した例を示す
	consecutiveHolidayWork := s.countConsecutiveHolidayWork(ctx, report)

	if consecutiveHolidayWork > settings.ConsecutiveHolidayWorkLimit {
		detectedValue := map[string]interface{}{
			"consecutive_days": consecutiveHolidayWork,
			"week_start":       report.StartDate,
			"week_end":         report.EndDate,
		}

		thresholdValue := map[string]interface{}{
			"limit": settings.ConsecutiveHolidayWorkLimit,
		}

		detectedValueJSON, _ := json.Marshal(detectedValue)
		thresholdValueJSON, _ := json.Marshal(thresholdValue)

		return &model.AlertHistory{
			UserID:         report.UserID,
			WeeklyReportID: &report.ID,
			AlertType:      model.AlertTypeHolidayWork,
			Severity:       model.AlertSeverityHigh,
			DetectedValue:  detectedValueJSON,
			ThresholdValue: thresholdValueJSON,
			Status:         model.AlertStatusUnhandled,
		}
	}

	return nil
}

// checkMonthlyOvertime 月間残業時間をチェック
func (s *alertService) checkMonthlyOvertime(ctx context.Context, report *model.WeeklyReport, settings *model.AlertSettings) *model.AlertHistory {
	// 月初と月末を計算
	monthStart := time.Date(report.StartDate.Year(), report.StartDate.Month(), 1, 0, 0, 0, 0, report.StartDate.Location())
	monthEnd := monthStart.AddDate(0, 1, -1)

	// 月間の総残業時間を計算（実装は週報モデルの構造に依存）
	monthlyOvertime := s.calculateMonthlyOvertime(ctx, report.UserID, monthStart, monthEnd)

	if monthlyOvertime > float64(settings.MonthlyOvertimeLimit) {
		detectedValue := map[string]interface{}{
			"monthly_overtime": monthlyOvertime,
			"month":            report.StartDate.Format("2006-01"),
		}

		thresholdValue := map[string]interface{}{
			"limit": settings.MonthlyOvertimeLimit,
		}

		detectedValueJSON, _ := json.Marshal(detectedValue)
		thresholdValueJSON, _ := json.Marshal(thresholdValue)

		severity := model.AlertSeverityMedium
		if monthlyOvertime > float64(settings.MonthlyOvertimeLimit)*1.2 {
			severity = model.AlertSeverityHigh
		}

		return &model.AlertHistory{
			UserID:         report.UserID,
			WeeklyReportID: &report.ID,
			AlertType:      model.AlertTypeMonthlyOvertime,
			Severity:       severity,
			DetectedValue:  detectedValueJSON,
			ThresholdValue: thresholdValueJSON,
			Status:         model.AlertStatusUnhandled,
		}
	}

	return nil
}

// isValidStatusTransition ステータス遷移の妥当性をチェック
func (s *alertService) isValidStatusTransition(from, to model.AlertStatus) bool {
	switch from {
	case model.AlertStatusUnhandled:
		return to == model.AlertStatusHandling || to == model.AlertStatusResolved
	case model.AlertStatusHandling:
		return to == model.AlertStatusResolved
	case model.AlertStatusResolved:
		return false // 解決済みからは遷移不可
	}
	return false
}

// calculateTotalHours 週報から総労働時間を計算
func (s *alertService) calculateTotalHours(report *model.WeeklyReport) float64 {
	// WeeklyReportモデルにTotalWorkHoursフィールドがある場合はそれを使用
	if report.TotalWorkHours > 0 {
		return report.TotalWorkHours
	}

	// DailyRecordsから計算
	totalHours := 0.0
	for _, record := range report.DailyRecords {
		// 自社勤務時間 + 客先勤務時間
		totalHours += record.WorkHours + record.ClientWorkHours
	}

	return totalHours
}

// countConsecutiveHolidayWork 連続休日出勤日数を計算
func (s *alertService) countConsecutiveHolidayWork(ctx context.Context, report *model.WeeklyReport) int {
	// リポジトリから連続休日出勤日数を取得
	consecutiveDays, err := s.weeklyReportRepo.GetConsecutiveHolidayWorkDays(ctx, report.UserID, report.EndDate)
	if err != nil {
		s.logger.Error("Failed to get consecutive holiday work days",
			zap.Error(err),
			zap.String("user_id", report.UserID),
			zap.Time("end_date", report.EndDate))
		return 0
	}

	return consecutiveDays
}

// calculateMonthlyOvertime 月間残業時間を計算
func (s *alertService) calculateMonthlyOvertime(ctx context.Context, userID string, monthStart, monthEnd time.Time) float64 {
	// 指定された月の週報を取得
	reports, err := s.weeklyReportRepo.GetByUserAndMonth(ctx, userID, monthStart, monthEnd)
	if err != nil {
		s.logger.Error("Failed to get monthly reports for overtime calculation",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.Time("month_start", monthStart),
			zap.Time("month_end", monthEnd))
		return 0.0
	}

	totalOvertimeHours := 0.0
	standardWorkHoursPerDay := 8.0                                           // 標準労働時間（8時間/日）
	standardWorkDaysPerWeek := 5.0                                           // 標準労働日数（5日/週）
	standardWeeklyHours := standardWorkHoursPerDay * standardWorkDaysPerWeek // 40時間/週

	for _, report := range reports {
		// 週の総労働時間を計算
		totalWeeklyHours := s.calculateTotalHours(report)

		// 残業時間を計算（標準労働時間を超えた分）
		if totalWeeklyHours > standardWeeklyHours {
			overtimeHours := totalWeeklyHours - standardWeeklyHours

			// 月の期間内の日数分のみを計算対象とする
			weekDaysInMonth := s.calculateWorkDaysInMonth(report, monthStart, monthEnd)
			if weekDaysInMonth > 0 {
				// 週報の期間のうち、対象月に含まれる比率で残業時間を按分
				ratio := weekDaysInMonth / 7.0
				totalOvertimeHours += overtimeHours * ratio
			}
		}
	}

	return totalOvertimeHours
}

// calculateWorkDaysInMonth 週報の期間のうち、指定された月に含まれる営業日数を計算
func (s *alertService) calculateWorkDaysInMonth(report *model.WeeklyReport, monthStart, monthEnd time.Time) float64 {
	// 週報期間と月期間の重複部分を計算
	reportStart := report.StartDate
	reportEnd := report.EndDate

	// 重複期間の開始日と終了日を決定
	overlapStart := reportStart
	if monthStart.After(reportStart) {
		overlapStart = monthStart
	}

	overlapEnd := reportEnd
	if monthEnd.Before(reportEnd) {
		overlapEnd = monthEnd
	}

	// 重複がない場合
	if overlapStart.After(overlapEnd) {
		return 0.0
	}

	// 重複期間の日数を計算
	days := overlapEnd.Sub(overlapStart).Hours()/24 + 1

	// 土日を除外した営業日数を概算で計算
	// 簡単のため、7日中5日が営業日として計算
	workDays := days * (5.0 / 7.0)

	return workDays
}

// convertToAlertPointers AlertHistoryのスライスをポインタのスライスに変換
func convertToAlertPointers(alerts []model.AlertHistory) []*model.AlertHistory {
	result := make([]*model.AlertHistory, len(alerts))
	for i := range alerts {
		result[i] = &alerts[i]
	}
	return result
}

// Advanced alert detection methods

// checkAbnormalWorkPattern 異常な勤務パターンを検知
func (s *alertService) checkAbnormalWorkPattern(ctx context.Context, report *model.WeeklyReport, settings *model.AlertSettings) []*model.AlertHistory {
	var alerts []*model.AlertHistory

	// 過度な深夜労働チェック
	lateNightWorkAlert := s.checkLateNightWork(report)
	if lateNightWorkAlert != nil {
		alerts = append(alerts, lateNightWorkAlert)
	}

	// 不規則な勤務時間チェック
	irregularWorkAlert := s.checkIrregularWorkHours(report)
	if irregularWorkAlert != nil {
		alerts = append(alerts, irregularWorkAlert)
	}

	// 連続長時間労働チェック
	consecutiveLongWorkAlert := s.checkConsecutiveLongWork(ctx, report, settings)
	if consecutiveLongWorkAlert != nil {
		alerts = append(alerts, consecutiveLongWorkAlert)
	}

	return alerts
}

// checkLateNightWork 深夜労働（22:00以降の勤務）をチェック
func (s *alertService) checkLateNightWork(report *model.WeeklyReport) *model.AlertHistory {
	lateNightDays := 0
	lateNightHours := 0.0

	for _, record := range report.DailyRecords {
		// 終了時刻が22:00以降の場合
		if record.EndTime != "" && record.EndTime >= "22:00" {
			lateNightDays++

			// 22:00以降の労働時間を概算計算
			endTime, err := time.Parse("15:04", record.EndTime)
			if err == nil {
				lateNightStart, _ := time.Parse("15:04", "22:00")
				if endTime.After(lateNightStart) {
					lateNightHours += endTime.Sub(lateNightStart).Hours()
				}
			}
		}

		// 客先勤務も同様にチェック
		if record.ClientEndTime != "" && record.ClientEndTime >= "22:00" {
			lateNightDays++

			endTime, err := time.Parse("15:04", record.ClientEndTime)
			if err == nil {
				lateNightStart, _ := time.Parse("15:04", "22:00")
				if endTime.After(lateNightStart) {
					lateNightHours += endTime.Sub(lateNightStart).Hours()
				}
			}
		}
	}

	// 週に3日以上深夜労働、または深夜労働時間が週10時間以上の場合アラート
	if lateNightDays >= 3 || lateNightHours >= 10.0 {
		detectedValue := map[string]interface{}{
			"late_night_days":  lateNightDays,
			"late_night_hours": lateNightHours,
			"week_start":       report.StartDate,
			"week_end":         report.EndDate,
		}

		thresholdValue := map[string]interface{}{
			"max_late_night_days":  3,
			"max_late_night_hours": 10.0,
		}

		detectedValueJSON, _ := json.Marshal(detectedValue)
		thresholdValueJSON, _ := json.Marshal(thresholdValue)

		severity := model.AlertSeverityMedium
		if lateNightDays >= 5 || lateNightHours >= 20.0 {
			severity = model.AlertSeverityHigh
		}

		return &model.AlertHistory{
			UserID:         report.UserID,
			WeeklyReportID: &report.ID,
			AlertType:      model.AlertTypeOverwork,
			Severity:       severity,
			DetectedValue:  detectedValueJSON,
			ThresholdValue: thresholdValueJSON,
			Status:         model.AlertStatusUnhandled,
		}
	}

	return nil
}

// checkIrregularWorkHours 不規則な勤務時間をチェック
func (s *alertService) checkIrregularWorkHours(report *model.WeeklyReport) *model.AlertHistory {
	startTimes := []string{}
	endTimes := []string{}

	for _, record := range report.DailyRecords {
		if record.StartTime != "" && record.EndTime != "" {
			startTimes = append(startTimes, record.StartTime)
			endTimes = append(endTimes, record.EndTime)
		}

		// 客先勤務も含める
		if record.ClientStartTime != "" && record.ClientEndTime != "" {
			startTimes = append(startTimes, record.ClientStartTime)
			endTimes = append(endTimes, record.ClientEndTime)
		}
	}

	// 開始時刻と終了時刻のばらつきを計算
	startVariance := s.calculateTimeVariance(startTimes)
	endVariance := s.calculateTimeVariance(endTimes)

	// ばらつきが大きい場合（3時間以上）アラート
	if startVariance >= 3.0 || endVariance >= 3.0 {
		detectedValue := map[string]interface{}{
			"start_time_variance": startVariance,
			"end_time_variance":   endVariance,
			"week_start":          report.StartDate,
			"week_end":            report.EndDate,
		}

		thresholdValue := map[string]interface{}{
			"max_variance_hours": 3.0,
		}

		detectedValueJSON, _ := json.Marshal(detectedValue)
		thresholdValueJSON, _ := json.Marshal(thresholdValue)

		return &model.AlertHistory{
			UserID:         report.UserID,
			WeeklyReportID: &report.ID,
			AlertType:      model.AlertTypeSuddenChange,
			Severity:       model.AlertSeverityLow,
			DetectedValue:  detectedValueJSON,
			ThresholdValue: thresholdValueJSON,
			Status:         model.AlertStatusUnhandled,
		}
	}

	return nil
}

// calculateTimeVariance 時刻文字列のばらつき（分散）を計算
func (s *alertService) calculateTimeVariance(times []string) float64 {
	if len(times) <= 1 {
		return 0.0
	}

	// 時刻を分単位に変換
	minutes := []float64{}
	for _, timeStr := range times {
		t, err := time.Parse("15:04", timeStr)
		if err == nil {
			totalMinutes := float64(t.Hour()*60 + t.Minute())
			minutes = append(minutes, totalMinutes)
		}
	}

	if len(minutes) <= 1 {
		return 0.0
	}

	// 平均を計算
	sum := 0.0
	for _, m := range minutes {
		sum += m
	}
	mean := sum / float64(len(minutes))

	// 分散を計算
	variance := 0.0
	for _, m := range minutes {
		variance += (m - mean) * (m - mean)
	}
	variance /= float64(len(minutes))

	// 時間単位に変換
	return math.Sqrt(variance) / 60.0
}

// checkConsecutiveLongWork 連続した長時間労働をチェック
func (s *alertService) checkConsecutiveLongWork(ctx context.Context, report *model.WeeklyReport, settings *model.AlertSettings) *model.AlertHistory {
	// 過去4週間の週報を取得
	pastWeeks := 4
	consecutiveLongWorkWeeks := 0

	currentWeekStart := report.StartDate
	for i := 0; i < pastWeeks; i++ {
		weekStart := currentWeekStart.AddDate(0, 0, -7*i)
		weekEnd := weekStart.AddDate(0, 0, 6)

		reports, err := s.weeklyReportRepo.GetByUserAndWeek(ctx, report.UserID, weekStart, weekEnd)
		if err != nil || len(reports) == 0 {
			break // データがない場合は終了
		}

		weeklyHours := s.calculateTotalHours(reports[0])
		if weeklyHours > float64(settings.WeeklyHoursLimit) {
			consecutiveLongWorkWeeks++
		} else {
			break // 連続していない場合は終了
		}
	}

	// 3週間以上連続で長時間労働の場合アラート
	if consecutiveLongWorkWeeks >= 3 {
		detectedValue := map[string]interface{}{
			"consecutive_weeks": consecutiveLongWorkWeeks,
			"week_start":        report.StartDate,
			"week_end":          report.EndDate,
		}

		thresholdValue := map[string]interface{}{
			"max_consecutive_weeks": 3,
		}

		detectedValueJSON, _ := json.Marshal(detectedValue)
		thresholdValueJSON, _ := json.Marshal(thresholdValue)

		severity := model.AlertSeverityMedium
		if consecutiveLongWorkWeeks >= 4 {
			severity = model.AlertSeverityHigh
		}

		return &model.AlertHistory{
			UserID:         report.UserID,
			WeeklyReportID: &report.ID,
			AlertType:      model.AlertTypeHolidayWork,
			Severity:       severity,
			DetectedValue:  detectedValueJSON,
			ThresholdValue: thresholdValueJSON,
			Status:         model.AlertStatusUnhandled,
		}
	}

	return nil
}

// PerformComprehensiveAlertDetection 包括的なアラート検知を実行
func (s *alertService) PerformComprehensiveAlertDetection(ctx context.Context, weekStart, weekEnd time.Time) (*AlertDetectionSummary, error) {
	summary := &AlertDetectionSummary{
		WeekStart:   weekStart,
		WeekEnd:     weekEnd,
		AlertCounts: make(map[model.AlertType]int),
		ProcessedAt: time.Now(),
	}

	// 週報に基づくアラート検知を実行
	if err := s.DetectWeeklyReportAlerts(ctx, weekStart, weekEnd); err != nil {
		s.logger.Error("Failed to detect weekly report alerts",
			zap.Error(err),
			zap.Time("week_start", weekStart),
			zap.Time("week_end", weekEnd))
		return nil, err
	}

	// 検知されたアラートの統計を取得
	filters := repository.AlertFilters{
		DateFrom:  &weekStart,
		DateTo:    &weekEnd,
		SortBy:    "created_at",
		SortOrder: "ASC",
	}

	alerts, total, err := s.alertRepo.GetAlerts(ctx, filters, 0, 1000) // 最大1000件取得
	if err != nil {
		s.logger.Error("Failed to get alert statistics",
			zap.Error(err))
		return nil, err
	}

	summary.TotalAlerts = int(total)

	// アラートタイプ別のカウント
	for _, alert := range alerts {
		summary.AlertCounts[alert.AlertType]++
	}

	s.logger.Info("Comprehensive alert detection completed",
		zap.Time("week_start", weekStart),
		zap.Time("week_end", weekEnd),
		zap.Int("total_alerts", summary.TotalAlerts),
		zap.Any("alert_counts", summary.AlertCounts))

	return summary, nil
}

// AlertDetectionSummary アラート検知結果のサマリー
type AlertDetectionSummary struct {
	WeekStart   time.Time               `json:"week_start"`
	WeekEnd     time.Time               `json:"week_end"`
	TotalAlerts int                     `json:"total_alerts"`
	AlertCounts map[model.AlertType]int `json:"alert_counts"`
	ProcessedAt time.Time               `json:"processed_at"`
}

// CreateAlertSettings アラート設定を作成（暫定実装）
func (s *alertService) CreateAlertSettings(ctx context.Context, req *dto.CreateAlertSettingsRequest, userID string) (*model.AlertSettings, error) {
	// TODO: 実際の実装
	return &model.AlertSettings{}, nil
}

// GetAlertSettingsList アラート設定一覧を取得（暫定実装）
func (s *alertService) GetAlertSettingsList(ctx context.Context, page, limit int) ([]*model.AlertSettings, int64, error) {
	// TODO: 実際の実装
	return []*model.AlertSettings{}, 0, nil
}

// DeleteAlertSettings アラート設定を削除（暫定実装）
func (s *alertService) DeleteAlertSettings(ctx context.Context, id string) error {
	// TODO: 実際の実装
	return nil
}

// GetAlertHistories アラート履歴一覧を取得（暫定実装）
func (s *alertService) GetAlertHistories(ctx context.Context, filters map[string]string, page, limit int) ([]*model.AlertHistory, int64, error) {
	// TODO: 実際の実装
	return []*model.AlertHistory{}, 0, nil
}

// GetAlertHistory アラート履歴を取得（暫定実装）
func (s *alertService) GetAlertHistory(ctx context.Context, id string) (*model.AlertHistory, error) {
	// TODO: 実際の実装
	return &model.AlertHistory{}, nil
}

// GetAlertSummary アラートサマリーを取得（暫定実装）
func (s *alertService) GetAlertSummary(ctx context.Context) (*dto.AlertSummaryDTO, error) {
	// TODO: 実際の実装
	return &dto.AlertSummaryDTO{}, nil
}
