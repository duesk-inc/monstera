package service

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AlertDetectionBatchService アラート検知バッチサービスのインターフェース
type AlertDetectionBatchService interface {
	// 基本的なバッチ処理
	ProcessDailyAlertDetection(ctx context.Context) (*BatchExecutionResult, error)
	ProcessWeeklyAlertDetection(ctx context.Context, weekOffset int) (*BatchExecutionResult, error)
	ProcessMonthlyAlertDetection(ctx context.Context, monthOffset int) (*BatchExecutionResult, error)

	// 条件指定での処理
	ProcessAlertDetectionForDateRange(ctx context.Context, startDate, endDate time.Time) (*BatchExecutionResult, error)
	ProcessAlertDetectionForUsers(ctx context.Context, userIDs []string, weekStart, weekEnd time.Time) (*BatchExecutionResult, error)

	// 統計・分析
	GetDetectionStatistics(ctx context.Context, period StatisticsPeriod) (*DetectionStatistics, error)
	GetAlertTrends(ctx context.Context, days int) (*AlertTrendData, error)

	// ヘルスチェック・メンテナンス
	HealthCheck(ctx context.Context) (*BatchHealthStatus, error)
	CleanupOldAlerts(ctx context.Context, retentionDays int) (*CleanupResult, error)
}

// alertDetectionBatchService アラート検知バッチサービスの実装
type alertDetectionBatchService struct {
	db                *gorm.DB
	alertService      AlertService
	weeklyReportRepo  repository.WeeklyReportRepository
	userRepo          repository.UserRepository
	alertSettingsRepo repository.AlertSettingsRepository
	alertHistoryRepo  repository.AlertHistoryRepository
	logger            *zap.Logger
}

// NewAlertDetectionBatchService アラート検知バッチサービスのインスタンスを生成
func NewAlertDetectionBatchService(
	db *gorm.DB,
	alertService AlertService,
	weeklyReportRepo repository.WeeklyReportRepository,
	userRepo repository.UserRepository,
	alertSettingsRepo repository.AlertSettingsRepository,
	alertHistoryRepo repository.AlertHistoryRepository,
	logger *zap.Logger,
) AlertDetectionBatchService {
	return &alertDetectionBatchService{
		db:                db,
		alertService:      alertService,
		weeklyReportRepo:  weeklyReportRepo,
		userRepo:          userRepo,
		alertSettingsRepo: alertSettingsRepo,
		alertHistoryRepo:  alertHistoryRepo,
		logger:            logger,
	}
}

// BatchExecutionResult バッチ実行結果
type BatchExecutionResult struct {
	ExecutionID      string                      `json:"execution_id"`
	StartTime        time.Time                   `json:"start_time"`
	EndTime          time.Time                   `json:"end_time"`
	Duration         time.Duration               `json:"duration"`
	TargetPeriod     Period                      `json:"target_period"`
	ProcessedWeeks   int                         `json:"processed_weeks"`
	ProcessedUsers   int                         `json:"processed_users"`
	TotalAlerts      int                         `json:"total_alerts"`
	NewAlerts        int                         `json:"new_alerts"`
	AlertsByType     map[model.AlertType]int     `json:"alerts_by_type"`
	AlertsBySeverity map[model.AlertSeverity]int `json:"alerts_by_severity"`
	Errors           []AlertBatchError           `json:"errors,omitempty"`
	Status           BatchStatus                 `json:"status"`
}

// Period 処理対象期間
type Period struct {
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	Type      string    `json:"type"` // "daily", "weekly", "monthly"
}

// AlertBatchError アラートバッチ処理エラー
type AlertBatchError struct {
	UserID    string    `json:"user_id,omitempty"`
	ErrorType string    `json:"error_type"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// BatchStatus バッチステータス
type BatchStatus string

const (
	BatchStatusSuccess        BatchStatus = "success"
	BatchStatusPartialSuccess BatchStatus = "partial_success"
	BatchStatusFailed         BatchStatus = "failed"
)

// StatisticsPeriod 統計期間
type StatisticsPeriod string

const (
	StatisticsPeriodDaily   StatisticsPeriod = "daily"
	StatisticsPeriodWeekly  StatisticsPeriod = "weekly"
	StatisticsPeriodMonthly StatisticsPeriod = "monthly"
)

// DetectionStatistics 検知統計情報
type DetectionStatistics struct {
	Period           StatisticsPeriod              `json:"period"`
	StartDate        time.Time                     `json:"start_date"`
	EndDate          time.Time                     `json:"end_date"`
	TotalAlerts      int64                         `json:"total_alerts"`
	AlertsByType     map[model.AlertType]int64     `json:"alerts_by_type"`
	AlertsBySeverity map[model.AlertSeverity]int64 `json:"alerts_by_severity"`
	TopUsers         []UserAlertCount              `json:"top_users"`
	Trends           []DailyAlertCount             `json:"trends"`
}

// UserAlertCount ユーザー別アラート数
type UserAlertCount struct {
	UserID     string `json:"user_id"`
	UserName   string `json:"user_name"`
	AlertCount int64  `json:"alert_count"`
}

// DailyAlertCount 日別アラート数
type DailyAlertCount struct {
	Date       time.Time `json:"date"`
	AlertCount int64     `json:"alert_count"`
}

// AlertTrendData アラートトレンドデータ
type AlertTrendData struct {
	Period         int                             `json:"period_days"`
	StartDate      time.Time                       `json:"start_date"`
	EndDate        time.Time                       `json:"end_date"`
	TotalAlerts    int64                           `json:"total_alerts"`
	DailyTrends    []DailyAlertCount               `json:"daily_trends"`
	TypeTrends     map[model.AlertType][]int64     `json:"type_trends"`
	SeverityTrends map[model.AlertSeverity][]int64 `json:"severity_trends"`
}

// BatchHealthStatus バッチヘルス状態
type BatchHealthStatus struct {
	SystemTime        time.Time  `json:"system_time"`
	DatabaseConnected bool       `json:"database_connected"`
	AlertSettings     bool       `json:"alert_settings_available"`
	LastExecution     *time.Time `json:"last_execution,omitempty"`
	ErrorCount        int        `json:"recent_error_count"`
	Status            string     `json:"status"`
}

// CleanupResult クリーンアップ結果
type CleanupResult struct {
	ExecutionTime time.Time `json:"execution_time"`
	RetentionDays int       `json:"retention_days"`
	DeletedAlerts int64     `json:"deleted_alerts"`
	DeletedBefore time.Time `json:"deleted_before"`
	Status        string    `json:"status"`
}

// ProcessDailyAlertDetection 日次アラート検知処理を実行
func (s *alertDetectionBatchService) ProcessDailyAlertDetection(ctx context.Context) (*BatchExecutionResult, error) {
	result := &BatchExecutionResult{
		ExecutionID:      fmt.Sprintf("daily_%d", time.Now().Unix()),
		StartTime:        time.Now(),
		AlertsByType:     make(map[model.AlertType]int),
		AlertsBySeverity: make(map[model.AlertSeverity]int),
		Status:           BatchStatusSuccess,
	}

	s.logger.Info("Starting daily alert detection process")

	// 昨日の週報をチェック（週報は週単位なので、現在の週をチェック）
	now := time.Now()
	weekStart, weekEnd := getWeekBounds(now)

	result.TargetPeriod = Period{
		StartDate: weekStart,
		EndDate:   weekEnd,
		Type:      "daily",
	}

	// 包括的なアラート検知を実行
	summary, err := s.alertService.PerformComprehensiveAlertDetection(ctx, weekStart, weekEnd)
	if err != nil {
		result.Status = BatchStatusFailed
		result.Errors = append(result.Errors, AlertBatchError{
			ErrorType: "detection_failed",
			Message:   err.Error(),
			Timestamp: time.Now(),
		})
		s.logger.Error("Failed to perform daily alert detection", zap.Error(err))
		return s.finalizeResult(result), err
	}

	// 結果を集計
	result.TotalAlerts = summary.TotalAlerts
	result.NewAlerts = summary.TotalAlerts
	result.ProcessedWeeks = 1

	for alertType, count := range summary.AlertCounts {
		result.AlertsByType[alertType] = count
	}

	// ユーザー数を取得
	userCount, err := s.getUserCount(ctx)
	if err != nil {
		s.logger.Warn("Failed to get user count", zap.Error(err))
	} else {
		result.ProcessedUsers = userCount
	}

	s.logger.Info("Daily alert detection completed successfully",
		zap.Int("total_alerts", result.TotalAlerts),
		zap.Int("new_alerts", result.NewAlerts))

	return s.finalizeResult(result), nil
}

// ProcessWeeklyAlertDetection 週次アラート検知処理を実行
func (s *alertDetectionBatchService) ProcessWeeklyAlertDetection(ctx context.Context, weekOffset int) (*BatchExecutionResult, error) {
	result := &BatchExecutionResult{
		ExecutionID:      fmt.Sprintf("weekly_%d", time.Now().Unix()),
		StartTime:        time.Now(),
		AlertsByType:     make(map[model.AlertType]int),
		AlertsBySeverity: make(map[model.AlertSeverity]int),
		Status:           BatchStatusSuccess,
	}

	s.logger.Info("Starting weekly alert detection process", zap.Int("week_offset", weekOffset))

	// 対象週の計算
	now := time.Now()
	targetDate := now.AddDate(0, 0, weekOffset*7)
	weekStart, weekEnd := getWeekBounds(targetDate)

	result.TargetPeriod = Period{
		StartDate: weekStart,
		EndDate:   weekEnd,
		Type:      "weekly",
	}

	// 包括的なアラート検知を実行
	summary, err := s.alertService.PerformComprehensiveAlertDetection(ctx, weekStart, weekEnd)
	if err != nil {
		result.Status = BatchStatusFailed
		result.Errors = append(result.Errors, AlertBatchError{
			ErrorType: "detection_failed",
			Message:   err.Error(),
			Timestamp: time.Now(),
		})
		return s.finalizeResult(result), err
	}

	// 結果を集計
	result.TotalAlerts = summary.TotalAlerts
	result.NewAlerts = summary.TotalAlerts
	result.ProcessedWeeks = 1

	for alertType, count := range summary.AlertCounts {
		result.AlertsByType[alertType] = count
	}

	// ユーザー数を取得
	userCount, err := s.getUserCount(ctx)
	if err != nil {
		s.logger.Warn("Failed to get user count", zap.Error(err))
	} else {
		result.ProcessedUsers = userCount
	}

	s.logger.Info("Weekly alert detection completed successfully",
		zap.Int("total_alerts", result.TotalAlerts),
		zap.Int("week_offset", weekOffset))

	return s.finalizeResult(result), nil
}

// ProcessMonthlyAlertDetection 月次アラート検知処理を実行
func (s *alertDetectionBatchService) ProcessMonthlyAlertDetection(ctx context.Context, monthOffset int) (*BatchExecutionResult, error) {
	result := &BatchExecutionResult{
		ExecutionID:      fmt.Sprintf("monthly_%d", time.Now().Unix()),
		StartTime:        time.Now(),
		AlertsByType:     make(map[model.AlertType]int),
		AlertsBySeverity: make(map[model.AlertSeverity]int),
		Status:           BatchStatusSuccess,
	}

	s.logger.Info("Starting monthly alert detection process", zap.Int("month_offset", monthOffset))

	// 対象月の計算
	now := time.Now()
	targetDate := now.AddDate(0, monthOffset, 0)
	monthStart, monthEnd := getMonthBounds(targetDate)

	result.TargetPeriod = Period{
		StartDate: monthStart,
		EndDate:   monthEnd,
		Type:      "monthly",
	}

	// 月内の各週について検知を実行
	totalAlerts := 0
	processedWeeks := 0

	for weekStart := getWeekStart(monthStart); weekStart.Before(monthEnd); weekStart = weekStart.AddDate(0, 0, 7) {
		weekEnd := weekStart.AddDate(0, 0, 6)
		if weekEnd.After(monthEnd) {
			weekEnd = monthEnd
		}

		summary, err := s.alertService.PerformComprehensiveAlertDetection(ctx, weekStart, weekEnd)
		if err != nil {
			result.Errors = append(result.Errors, AlertBatchError{
				ErrorType: "weekly_detection_failed",
				Message:   fmt.Sprintf("Week %s: %v", weekStart.Format("2006-01-02"), err),
				Timestamp: time.Now(),
			})
			continue
		}

		totalAlerts += summary.TotalAlerts
		processedWeeks++

		for alertType, count := range summary.AlertCounts {
			result.AlertsByType[alertType] += count
		}
	}

	result.TotalAlerts = totalAlerts
	result.NewAlerts = totalAlerts
	result.ProcessedWeeks = processedWeeks

	if len(result.Errors) > 0 && processedWeeks == 0 {
		result.Status = BatchStatusFailed
	} else if len(result.Errors) > 0 {
		result.Status = BatchStatusPartialSuccess
	}

	// ユーザー数を取得
	userCount, err := s.getUserCount(ctx)
	if err != nil {
		s.logger.Warn("Failed to get user count", zap.Error(err))
	} else {
		result.ProcessedUsers = userCount
	}

	s.logger.Info("Monthly alert detection completed",
		zap.Int("total_alerts", result.TotalAlerts),
		zap.Int("processed_weeks", processedWeeks),
		zap.Int("error_count", len(result.Errors)))

	return s.finalizeResult(result), nil
}

// ProcessAlertDetectionForDateRange 指定期間でのアラート検知処理を実行
func (s *alertDetectionBatchService) ProcessAlertDetectionForDateRange(ctx context.Context, startDate, endDate time.Time) (*BatchExecutionResult, error) {
	result := &BatchExecutionResult{
		ExecutionID:      fmt.Sprintf("range_%d", time.Now().Unix()),
		StartTime:        time.Now(),
		AlertsByType:     make(map[model.AlertType]int),
		AlertsBySeverity: make(map[model.AlertSeverity]int),
		Status:           BatchStatusSuccess,
	}

	result.TargetPeriod = Period{
		StartDate: startDate,
		EndDate:   endDate,
		Type:      "custom_range",
	}

	s.logger.Info("Starting alert detection for date range",
		zap.Time("start_date", startDate),
		zap.Time("end_date", endDate))

	// 期間内の各週について検知を実行
	totalAlerts := 0
	processedWeeks := 0

	for weekStart := getWeekStart(startDate); weekStart.Before(endDate); weekStart = weekStart.AddDate(0, 0, 7) {
		weekEnd := weekStart.AddDate(0, 0, 6)
		if weekEnd.After(endDate) {
			weekEnd = endDate
		}

		summary, err := s.alertService.PerformComprehensiveAlertDetection(ctx, weekStart, weekEnd)
		if err != nil {
			result.Errors = append(result.Errors, AlertBatchError{
				ErrorType: "weekly_detection_failed",
				Message:   fmt.Sprintf("Week %s: %v", weekStart.Format("2006-01-02"), err),
				Timestamp: time.Now(),
			})
			continue
		}

		totalAlerts += summary.TotalAlerts
		processedWeeks++

		for alertType, count := range summary.AlertCounts {
			result.AlertsByType[alertType] += count
		}
	}

	result.TotalAlerts = totalAlerts
	result.NewAlerts = totalAlerts
	result.ProcessedWeeks = processedWeeks

	if len(result.Errors) > 0 && processedWeeks == 0 {
		result.Status = BatchStatusFailed
	} else if len(result.Errors) > 0 {
		result.Status = BatchStatusPartialSuccess
	}

	return s.finalizeResult(result), nil
}

// ProcessAlertDetectionForUsers 指定ユーザーでのアラート検知処理を実行
func (s *alertDetectionBatchService) ProcessAlertDetectionForUsers(ctx context.Context, userIDs []string, weekStart, weekEnd time.Time) (*BatchExecutionResult, error) {
	result := &BatchExecutionResult{
		ExecutionID:      fmt.Sprintf("users_%d", time.Now().Unix()),
		StartTime:        time.Now(),
		AlertsByType:     make(map[model.AlertType]int),
		AlertsBySeverity: make(map[model.AlertSeverity]int),
		Status:           BatchStatusSuccess,
	}

	result.TargetPeriod = Period{
		StartDate: weekStart,
		EndDate:   weekEnd,
		Type:      "user_specific",
	}
	result.ProcessedUsers = len(userIDs)

	s.logger.Info("Starting alert detection for specific users",
		zap.Int("user_count", len(userIDs)),
		zap.Time("week_start", weekStart),
		zap.Time("week_end", weekEnd))

	// ユーザー別に検知を実行
	// totalAlerts := 0 // TODO: Use when implementing individual alert detection
	successCount := 0

	for _, userID := range userIDs {
		// TODO: ユーザー個別のアラート検知ロジックを実装
		// 現在は週全体の検知を使用
		s.logger.Debug("Processing user", zap.String("user_id", userID))
		successCount++
	}

	// 週全体での検知を実行
	summary, err := s.alertService.PerformComprehensiveAlertDetection(ctx, weekStart, weekEnd)
	if err != nil {
		result.Status = BatchStatusFailed
		result.Errors = append(result.Errors, AlertBatchError{
			ErrorType: "detection_failed",
			Message:   err.Error(),
			Timestamp: time.Now(),
		})
		return s.finalizeResult(result), err
	}

	result.TotalAlerts = summary.TotalAlerts
	result.NewAlerts = summary.TotalAlerts
	result.ProcessedWeeks = 1

	for alertType, count := range summary.AlertCounts {
		result.AlertsByType[alertType] = count
	}

	return s.finalizeResult(result), nil
}

// HealthCheck ヘルスチェックを実行
func (s *alertDetectionBatchService) HealthCheck(ctx context.Context) (*BatchHealthStatus, error) {
	status := &BatchHealthStatus{
		SystemTime: time.Now(),
	}

	// データベース接続確認
	if err := s.db.WithContext(ctx).Raw("SELECT 1").Error; err != nil {
		status.DatabaseConnected = false
		status.Status = "unhealthy"
		s.logger.Error("Database health check failed", zap.Error(err))
	} else {
		status.DatabaseConnected = true
	}

	// アラート設定の存在確認
	_, err := s.alertSettingsRepo.GetSettings(ctx)
	if err != nil {
		status.AlertSettings = false
		s.logger.Warn("Alert settings not found", zap.Error(err))
	} else {
		status.AlertSettings = true
	}

	// 最新の実行時刻を取得（簡単のため省略）
	// 実際の実装では、バッチ実行履歴テーブルから取得

	// エラー数を取得（簡単のため省略）
	status.ErrorCount = 0

	// 総合ステータス判定
	if status.DatabaseConnected && status.AlertSettings {
		status.Status = "healthy"
	} else {
		status.Status = "degraded"
	}

	return status, nil
}

// CleanupOldAlerts 古いアラートをクリーンアップ
func (s *alertDetectionBatchService) CleanupOldAlerts(ctx context.Context, retentionDays int) (*CleanupResult, error) {
	result := &CleanupResult{
		ExecutionTime: time.Now(),
		RetentionDays: retentionDays,
		Status:        "success",
	}

	cutoffDate := time.Now().AddDate(0, 0, -retentionDays)
	result.DeletedBefore = cutoffDate

	// 古いアラートを削除
	deleteResult := s.db.WithContext(ctx).
		Where("created_at < ?", cutoffDate).
		Delete(&model.AlertHistory{})

	if deleteResult.Error != nil {
		result.Status = "failed"
		s.logger.Error("Failed to cleanup old alerts", zap.Error(deleteResult.Error))
		return result, deleteResult.Error
	}

	result.DeletedAlerts = deleteResult.RowsAffected

	s.logger.Info("Old alerts cleanup completed",
		zap.Int("retention_days", retentionDays),
		zap.Int64("deleted_count", result.DeletedAlerts))

	return result, nil
}

// GetDetectionStatistics 検知統計情報を取得
func (s *alertDetectionBatchService) GetDetectionStatistics(ctx context.Context, period StatisticsPeriod) (*DetectionStatistics, error) {
	// 実装は省略（実際にはリポジトリレイヤーで統計クエリを実行）
	stats := &DetectionStatistics{
		Period:           period,
		AlertsByType:     make(map[model.AlertType]int64),
		AlertsBySeverity: make(map[model.AlertSeverity]int64),
	}

	// TODO: 実装を完成させる
	return stats, nil
}

// GetAlertTrends アラートトレンドデータを取得
func (s *alertDetectionBatchService) GetAlertTrends(ctx context.Context, days int) (*AlertTrendData, error) {
	// 実装は省略（実際にはリポジトリレイヤーでトレンド分析クエリを実行）
	trends := &AlertTrendData{
		Period:         days,
		TypeTrends:     make(map[model.AlertType][]int64),
		SeverityTrends: make(map[model.AlertSeverity][]int64),
	}

	// TODO: 実装を完成させる
	return trends, nil
}

// ヘルパー関数

// finalizeResult バッチ実行結果を確定
func (s *alertDetectionBatchService) finalizeResult(result *BatchExecutionResult) *BatchExecutionResult {
	result.EndTime = time.Now()
	result.Duration = result.EndTime.Sub(result.StartTime)
	return result
}

// getUserCount アクティブユーザー数を取得
func (s *alertDetectionBatchService) getUserCount(ctx context.Context) (int, error) {
	var count int64
	err := s.db.WithContext(ctx).Model(&model.User{}).Count(&count).Error
	return int(count), err
}

// getWeekBounds 指定日の週の境界を取得（月曜開始）
func getWeekBounds(date time.Time) (time.Time, time.Time) {
	weekday := int(date.Weekday())
	if weekday == 0 { // 日曜日
		weekday = 7
	}

	weekStart := date.AddDate(0, 0, -(weekday - 1))
	weekStart = time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, weekStart.Location())

	weekEnd := weekStart.AddDate(0, 0, 6)
	weekEnd = time.Date(weekEnd.Year(), weekEnd.Month(), weekEnd.Day(), 23, 59, 59, 0, weekEnd.Location())

	return weekStart, weekEnd
}

// getMonthBounds 指定日の月の境界を取得
func getMonthBounds(date time.Time) (time.Time, time.Time) {
	monthStart := time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, date.Location())
	monthEnd := monthStart.AddDate(0, 1, -1)
	monthEnd = time.Date(monthEnd.Year(), monthEnd.Month(), monthEnd.Day(), 23, 59, 59, 0, monthEnd.Location())

	return monthStart, monthEnd
}

// getWeekStart 指定日以降の最初の月曜日を取得
func getWeekStart(date time.Time) time.Time {
	weekday := int(date.Weekday())
	if weekday == 0 { // 日曜日
		weekday = 7
	}

	weekStart := date.AddDate(0, 0, -(weekday - 1))
	return time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, weekStart.Location())
}
