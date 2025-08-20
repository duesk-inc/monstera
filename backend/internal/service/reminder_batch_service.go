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

// ReminderBatchService リマインドバッチ処理サービスインターフェース
type ReminderBatchService interface {
	// 自動リマインド処理を実行
	ProcessAutoReminders(ctx context.Context) error

	// 特定の日数経過した未提出者にリマインドを送信
	SendRemindersForOverdueDays(ctx context.Context, days int) error

	// エスカレーション処理を実行
	ProcessEscalations(ctx context.Context) error

	// リマインド送信履歴を記録
	RecordReminderHistory(ctx context.Context, userID, reportID string, reminderType string) error

	// 本日送信予定のリマインドを取得
	GetTodaysReminders(ctx context.Context) ([]ReminderTarget, error)

	// リマインダーを送信（linter error対応）
	SendReminders(ctx context.Context) (*ReminderResult, error)
}

// ReminderTarget リマインド対象者
type ReminderTarget struct {
	UserID       string
	UserName     string
	UserEmail    string
	ReportID     string
	StartDate    time.Time
	EndDate      time.Time
	DaysOverdue  int
	ReminderType string // "first", "second", "escalation"
	ManagerID    *string
	ManagerEmail string
}

// ReminderResult リマインダー実行結果
type ReminderResult struct {
	SentCount  int // 送信成功数
	ErrorCount int // 送信失敗数
}

// reminderBatchService バッチ処理サービス実装
type reminderBatchService struct {
	db                   *gorm.DB
	reportRepo           repository.WeeklyReportRefactoredRepository
	userRepo             repository.UserRepository
	notificationRepo     repository.NotificationRepository
	reminderSettingsRepo repository.ReminderSettingsRepository
	logger               *zap.Logger
}

// NewReminderBatchService インスタンスを生成
func NewReminderBatchService(
	db *gorm.DB,
	reportRepo repository.WeeklyReportRefactoredRepository,
	userRepo repository.UserRepository,
	notificationRepo repository.NotificationRepository,
	reminderSettingsRepo repository.ReminderSettingsRepository,
	logger *zap.Logger,
) ReminderBatchService {
	return &reminderBatchService{
		db:                   db,
		reportRepo:           reportRepo,
		userRepo:             userRepo,
		notificationRepo:     notificationRepo,
		reminderSettingsRepo: reminderSettingsRepo,
		logger:               logger,
	}
}

// ProcessAutoReminders 自動リマインド処理を実行
func (s *reminderBatchService) ProcessAutoReminders(ctx context.Context) error {
	// リマインド設定を取得
	settings, err := s.reminderSettingsRepo.Get(ctx)
	if err != nil {
		s.logger.Error("Failed to get reminder settings", zap.Error(err))
		return err
	}

	if !settings.Enabled {
		s.logger.Info("Auto reminder is disabled")
		return nil
	}

	// 現在時刻と設定時刻を比較
	now := time.Now()
	reminderTime, err := time.Parse("15:04", settings.ReminderTime)
	if err != nil {
		s.logger.Error("Invalid reminder time format", zap.String("time", settings.ReminderTime))
		return err
	}

	// 設定時刻を今日の日付に合わせる
	scheduledTime := time.Date(now.Year(), now.Month(), now.Day(), reminderTime.Hour(), reminderTime.Minute(), 0, 0, now.Location())

	// 設定時刻の前後5分以内でない場合はスキップ
	if now.Before(scheduledTime.Add(-5*time.Minute)) || now.After(scheduledTime.Add(5*time.Minute)) {
		s.logger.Debug("Not in reminder time window",
			zap.Time("now", now),
			zap.Time("scheduled", scheduledTime))
		return nil
	}

	// 各リマインドタイプの処理
	if err := s.SendRemindersForOverdueDays(ctx, settings.FirstReminderDays); err != nil {
		s.logger.Error("Failed to send first reminders", zap.Error(err))
	}

	if err := s.SendRemindersForOverdueDays(ctx, settings.SecondReminderDays); err != nil {
		s.logger.Error("Failed to send second reminders", zap.Error(err))
	}

	if err := s.ProcessEscalations(ctx); err != nil {
		s.logger.Error("Failed to process escalations", zap.Error(err))
	}

	return nil
}

// SendRemindersForOverdueDays 特定の日数経過した未提出者にリマインドを送信
func (s *reminderBatchService) SendRemindersForOverdueDays(ctx context.Context, days int) error {
	// 対象となる未提出週報を取得
	queryParams := repository.QueryParams{
		Page:  1,
		Limit: 1000,
	}

	reports, _, err := s.reportRepo.FindUnsubmittedWithPreload(ctx, queryParams)
	if err != nil {
		return err
	}

	now := time.Now()
	targets := make([]ReminderTarget, 0)

	for _, report := range reports {
		if report.SubmissionDeadline == nil {
			continue
		}

		// 経過日数を計算
		daysOverdue := int(now.Sub(*report.SubmissionDeadline).Hours() / 24)

		// 指定日数と一致する場合のみ対象とする（当日のみ送信）
		if daysOverdue != days {
			continue
		}

		// 本日既にリマインドを送信済みかチェック
		if s.isReminderSentToday(ctx, report.UserID, report.ID) {
			continue
		}

		target := ReminderTarget{
			UserID:      report.UserID,
			UserName:    fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName),
			UserEmail:   report.User.Email,
			ReportID:    report.ID,
			StartDate:   report.StartDate,
			EndDate:     report.EndDate,
			DaysOverdue: daysOverdue,
		}

		// リマインドタイプを設定
		settings, _ := s.reminderSettingsRepo.Get(ctx)
		if daysOverdue == settings.FirstReminderDays {
			target.ReminderType = "first"
		} else if daysOverdue == settings.SecondReminderDays {
			target.ReminderType = "second"
		}

		// マネージャー情報を設定
		if report.User.Manager != nil {
			target.ManagerID = report.User.ManagerID
			target.ManagerEmail = report.User.Manager.Email
		}

		targets = append(targets, target)
	}

	// リマインドを送信
	for _, target := range targets {
		if err := s.sendReminder(ctx, target); err != nil {
			s.logger.Error("Failed to send reminder",
				zap.String("user_id", target.UserID),
				zap.Error(err))
			continue
		}

		// 送信履歴を記録
		if err := s.RecordReminderHistory(ctx, target.UserID, target.ReportID, target.ReminderType); err != nil {
			s.logger.Error("Failed to record reminder history",
				zap.String("user_id", target.UserID),
				zap.Error(err))
		}
	}

	s.logger.Info("Reminders sent",
		zap.Int("days", days),
		zap.Int("count", len(targets)))

	return nil
}

// ProcessEscalations エスカレーション処理を実行
func (s *reminderBatchService) ProcessEscalations(ctx context.Context) error {
	// リマインド設定を取得
	settings, err := s.reminderSettingsRepo.Get(ctx)
	if err != nil {
		return err
	}

	// エスカレーション対象を取得
	queryParams := repository.QueryParams{
		Page:  1,
		Limit: 1000,
	}

	reports, _, err := s.reportRepo.FindUnsubmittedWithPreload(ctx, queryParams)
	if err != nil {
		return err
	}

	now := time.Now()
	targets := make([]ReminderTarget, 0)

	for _, report := range reports {
		if report.SubmissionDeadline == nil {
			continue
		}

		// 経過日数を計算
		daysOverdue := int(now.Sub(*report.SubmissionDeadline).Hours() / 24)

		// エスカレーション日数以上の場合
		if daysOverdue < settings.EscalationDays {
			continue
		}

		// 本日既にエスカレーションを送信済みかチェック
		if s.isEscalationSentToday(ctx, report.UserID, report.ID) {
			continue
		}

		// マネージャーがいない場合はスキップ
		if report.User.ManagerID == nil {
			continue
		}

		target := ReminderTarget{
			UserID:       report.UserID,
			UserName:     fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName),
			UserEmail:    report.User.Email,
			ReportID:     report.ID,
			StartDate:    report.StartDate,
			EndDate:      report.EndDate,
			DaysOverdue:  daysOverdue,
			ReminderType: "escalation",
			ManagerID:    report.User.ManagerID,
		}

		if report.User.Manager != nil {
			target.ManagerEmail = report.User.Manager.Email
		}

		targets = append(targets, target)
	}

	// エスカレーション通知を送信
	for _, target := range targets {
		if err := s.sendEscalation(ctx, target); err != nil {
			s.logger.Error("Failed to send escalation",
				zap.String("user_id", target.UserID),
				zap.Error(err))
			continue
		}

		// 送信履歴を記録
		if err := s.RecordReminderHistory(ctx, target.UserID, target.ReportID, "escalation"); err != nil {
			s.logger.Error("Failed to record escalation history",
				zap.String("user_id", target.UserID),
				zap.Error(err))
		}
	}

	s.logger.Info("Escalations sent", zap.Int("count", len(targets)))

	return nil
}

// RecordReminderHistory リマインド送信履歴を記録
func (s *reminderBatchService) RecordReminderHistory(ctx context.Context, userID, reportID string, reminderType string) error {
	// 通知を作成
	notification := model.Notification{
		RecipientID:      &userID,
		NotificationType: model.NotificationTypeWeeklyReportReminder,
		Title:            s.getReminderTitle(reminderType),
		Message:          s.getReminderMessage(reminderType),
		Priority:         model.NotificationPriorityHigh,
		Status:           model.NotificationStatusUnread,
		Metadata: &model.NotificationMetadata{
			WeeklyReportID: &reportID,
			AdditionalData: map[string]interface{}{
				"reminder_type": reminderType,
			},
		},
	}

	_, err := s.notificationRepo.CreateNotification(ctx, notification)
	return err
}

// GetTodaysReminders 本日送信予定のリマインドを取得
func (s *reminderBatchService) GetTodaysReminders(ctx context.Context) ([]ReminderTarget, error) {
	// リマインド設定を取得
	settings, err := s.reminderSettingsRepo.Get(ctx)
	if err != nil {
		return nil, err
	}

	if !settings.Enabled {
		return []ReminderTarget{}, nil
	}

	// 各日数のリマインド対象を収集
	targets := make([]ReminderTarget, 0)

	// First reminder
	firstTargets, err := s.getTargetsForDays(ctx, settings.FirstReminderDays, "first")
	if err == nil {
		targets = append(targets, firstTargets...)
	}

	// Second reminder
	secondTargets, err := s.getTargetsForDays(ctx, settings.SecondReminderDays, "second")
	if err == nil {
		targets = append(targets, secondTargets...)
	}

	// Escalation
	escalationTargets, err := s.getEscalationTargets(ctx, settings.EscalationDays)
	if err == nil {
		targets = append(targets, escalationTargets...)
	}

	return targets, nil
}

// sendReminder リマインドを送信
func (s *reminderBatchService) sendReminder(ctx context.Context, target ReminderTarget) error {
	// ユーザーへの通知を作成
	notification := model.Notification{
		RecipientID:      &target.UserID,
		NotificationType: model.NotificationTypeWeeklyReportReminder,
		Title:            s.getReminderTitle(target.ReminderType),
		Message:          s.getReminderMessageWithDetails(target),
		Priority:         model.NotificationPriorityHigh,
		Status:           model.NotificationStatusUnread,
		Metadata: &model.NotificationMetadata{
			WeeklyReportID: &target.ReportID,
			AdditionalData: map[string]interface{}{
				"reminder_type": target.ReminderType,
				"days_overdue":  target.DaysOverdue,
			},
		},
	}

	if _, err := s.notificationRepo.CreateNotification(ctx, notification); err != nil {
		return err
	}

	// TODO: 実際のメール送信処理を実装

	return nil
}

// sendEscalation エスカレーション通知を送信
func (s *reminderBatchService) sendEscalation(ctx context.Context, target ReminderTarget) error {
	// ユーザーへの通知
	userNotification := model.Notification{
		RecipientID:      &target.UserID,
		NotificationType: model.NotificationTypeWeeklyReportOverdue,
		Title:            "週報提出の最終通知",
		Message:          s.getEscalationMessage(target),
		Priority:         model.NotificationPriorityHigh,
		Status:           model.NotificationStatusUnread,
		Metadata: &model.NotificationMetadata{
			WeeklyReportID: &target.ReportID,
			AdditionalData: map[string]interface{}{
				"reminder_type": "escalation",
				"days_overdue":  target.DaysOverdue,
			},
		},
	}

	if _, err := s.notificationRepo.CreateNotification(ctx, userNotification); err != nil {
		return err
	}

	// マネージャーへの通知
	if target.ManagerID != nil {
		managerNotification := model.Notification{
			RecipientID:      target.ManagerID,
			NotificationType: model.NotificationTypeWeeklyReportOverdue,
			Title:            "部下の週報未提出通知",
			Message:          s.getManagerEscalationMessage(target),
			Priority:         model.NotificationPriorityHigh,
			Status:           model.NotificationStatusUnread,
			Metadata: &model.NotificationMetadata{
				UserID:         &target.UserID,
				WeeklyReportID: &target.ReportID,
				AdditionalData: map[string]interface{}{
					"subordinate_name": target.UserName,
					"days_overdue":     target.DaysOverdue,
				},
			},
		}

		if _, err := s.notificationRepo.CreateNotification(ctx, managerNotification); err != nil {
			s.logger.Error("Failed to create manager notification", zap.Error(err))
		}
	}

	// TODO: 実際のメール送信処理を実装

	return nil
}

// isReminderSentToday 本日既にリマインドを送信済みかチェック
func (s *reminderBatchService) isReminderSentToday(ctx context.Context, userID, reportID string) bool {
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	count, err := s.notificationRepo.CountByTypeAndDateRange(
		ctx,
		userID,
		model.NotificationTypeWeeklyReportReminder,
		today,
		tomorrow,
	)

	if err != nil {
		s.logger.Error("Failed to check reminder history", zap.Error(err))
		return false
	}

	return count > 0
}

// isEscalationSentToday 本日既にエスカレーションを送信済みかチェック
func (s *reminderBatchService) isEscalationSentToday(ctx context.Context, userID, reportID string) bool {
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	count, err := s.notificationRepo.CountByTypeAndDateRange(
		ctx,
		userID,
		model.NotificationTypeWeeklyReportOverdue,
		today,
		tomorrow,
	)

	if err != nil {
		s.logger.Error("Failed to check escalation history", zap.Error(err))
		return false
	}

	return count > 0
}

// getTargetsForDays 指定日数の対象者を取得
func (s *reminderBatchService) getTargetsForDays(ctx context.Context, days int, reminderType string) ([]ReminderTarget, error) {
	queryParams := repository.QueryParams{
		Page:  1,
		Limit: 1000,
	}

	reports, _, err := s.reportRepo.FindUnsubmittedWithPreload(ctx, queryParams)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	targets := make([]ReminderTarget, 0)

	for _, report := range reports {
		if report.SubmissionDeadline == nil {
			continue
		}

		daysOverdue := int(now.Sub(*report.SubmissionDeadline).Hours() / 24)
		if daysOverdue != days {
			continue
		}

		if s.isReminderSentToday(ctx, report.UserID, report.ID) {
			continue
		}

		target := ReminderTarget{
			UserID:       report.UserID,
			UserName:     fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName),
			UserEmail:    report.User.Email,
			ReportID:     report.ID,
			StartDate:    report.StartDate,
			EndDate:      report.EndDate,
			DaysOverdue:  daysOverdue,
			ReminderType: reminderType,
		}

		if report.User.Manager != nil {
			target.ManagerID = report.User.ManagerID
			target.ManagerEmail = report.User.Manager.Email
		}

		targets = append(targets, target)
	}

	return targets, nil
}

// getEscalationTargets エスカレーション対象者を取得
func (s *reminderBatchService) getEscalationTargets(ctx context.Context, escalationDays int) ([]ReminderTarget, error) {
	queryParams := repository.QueryParams{
		Page:  1,
		Limit: 1000,
	}

	reports, _, err := s.reportRepo.FindUnsubmittedWithPreload(ctx, queryParams)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	targets := make([]ReminderTarget, 0)

	for _, report := range reports {
		if report.SubmissionDeadline == nil || report.User.ManagerID == nil {
			continue
		}

		daysOverdue := int(now.Sub(*report.SubmissionDeadline).Hours() / 24)
		if daysOverdue < escalationDays {
			continue
		}

		if s.isEscalationSentToday(ctx, report.UserID, report.ID) {
			continue
		}

		target := ReminderTarget{
			UserID:       report.UserID,
			UserName:     fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName),
			UserEmail:    report.User.Email,
			ReportID:     report.ID,
			StartDate:    report.StartDate,
			EndDate:      report.EndDate,
			DaysOverdue:  daysOverdue,
			ReminderType: "escalation",
			ManagerID:    report.User.ManagerID,
		}

		if report.User.Manager != nil {
			target.ManagerEmail = report.User.Manager.Email
		}

		targets = append(targets, target)
	}

	return targets, nil
}

// getReminderTitle リマインドのタイトルを取得
func (s *reminderBatchService) getReminderTitle(reminderType string) string {
	switch reminderType {
	case "first":
		return "週報提出のお願い"
	case "second":
		return "週報提出の再度のお願い"
	case "escalation":
		return "週報提出の最終通知"
	default:
		return "週報提出のリマインド"
	}
}

// getReminderMessage リマインドのメッセージを取得
func (s *reminderBatchService) getReminderMessage(reminderType string) string {
	switch reminderType {
	case "first":
		return "週報の提出期限が過ぎています。早めの提出をお願いします。"
	case "second":
		return "週報が未提出です。至急提出をお願いします。"
	case "escalation":
		return "週報の提出が大幅に遅れています。本日中に必ず提出してください。"
	default:
		return "週報の提出をお願いします。"
	}
}

// getReminderMessageWithDetails 詳細を含むリマインドメッセージを生成
func (s *reminderBatchService) getReminderMessageWithDetails(target ReminderTarget) string {
	base := s.getReminderMessage(target.ReminderType)
	details := fmt.Sprintf("\n\n対象週報: %s 〜 %s\n提出期限超過日数: %d日",
		target.StartDate.Format("2006/01/02"),
		target.EndDate.Format("2006/01/02"),
		target.DaysOverdue)
	return base + details
}

// getEscalationMessage エスカレーションメッセージを生成
func (s *reminderBatchService) getEscalationMessage(target ReminderTarget) string {
	return fmt.Sprintf(
		"週報の提出期限を%d日超過しています。\n\n"+
			"対象週報: %s 〜 %s\n"+
			"本日中に必ず提出してください。\n"+
			"マネージャーにも通知されています。",
		target.DaysOverdue,
		target.StartDate.Format("2006/01/02"),
		target.EndDate.Format("2006/01/02"),
	)
}

// getManagerEscalationMessage マネージャー向けエスカレーションメッセージを生成
func (s *reminderBatchService) getManagerEscalationMessage(target ReminderTarget) string {
	return fmt.Sprintf(
		"%sさんの週報が未提出です。\n\n"+
			"対象週報: %s 〜 %s\n"+
			"提出期限超過日数: %d日\n\n"+
			"フォローアップをお願いします。",
		target.UserName,
		target.StartDate.Format("2006/01/02"),
		target.EndDate.Format("2006/01/02"),
		target.DaysOverdue,
	)
}

// ptr ポインタを返すヘルパー関数
func ptr[T any](v T) *T {
	return &v
}

// sendRemindersForDaysWithCount 指定日数のリマインダーを送信してカウントを返す
func (s *reminderBatchService) sendRemindersForDaysWithCount(ctx context.Context, days int) (int, int) {
	// 対象となる未提出週報を取得
	queryParams := repository.QueryParams{
		Page:  1,
		Limit: 1000,
	}

	reports, _, err := s.reportRepo.FindUnsubmittedWithPreload(ctx, queryParams)
	if err != nil {
		s.logger.Error("Failed to get unsubmitted reports", zap.Error(err))
		return -1, 1
	}

	now := time.Now()
	sentCount := 0
	errorCount := 0

	for _, report := range reports {
		if report.SubmissionDeadline == nil {
			continue
		}

		// 経過日数を計算
		daysOverdue := int(now.Sub(*report.SubmissionDeadline).Hours() / 24)

		// 指定日数と一致する場合のみ対象とする（当日のみ送信）
		if daysOverdue != days {
			continue
		}

		// 本日既にリマインドを送信済みかチェック
		if s.isReminderSentToday(ctx, report.UserID, report.ID) {
			continue
		}

		target := ReminderTarget{
			UserID:      report.UserID,
			UserName:    fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName),
			UserEmail:   report.User.Email,
			ReportID:    report.ID,
			StartDate:   report.StartDate,
			EndDate:     report.EndDate,
			DaysOverdue: daysOverdue,
		}

		// リマインドタイプを設定
		settings, _ := s.reminderSettingsRepo.Get(ctx)
		if daysOverdue == settings.FirstReminderDays {
			target.ReminderType = "first"
		} else if daysOverdue == settings.SecondReminderDays {
			target.ReminderType = "second"
		}

		// マネージャー情報を設定
		if report.User.Manager != nil {
			target.ManagerID = report.User.ManagerID
			target.ManagerEmail = report.User.Manager.Email
		}

		// リマインドを送信
		if err := s.sendReminder(ctx, target); err != nil {
			s.logger.Error("Failed to send reminder",
				zap.String("user_id", target.UserID),
				zap.Error(err))
			errorCount++
			continue
		}

		// 送信履歴を記録
		if err := s.RecordReminderHistory(ctx, target.UserID, target.ReportID, target.ReminderType); err != nil {
			s.logger.Error("Failed to record reminder history",
				zap.String("user_id", target.UserID),
				zap.Error(err))
		}

		sentCount++
	}

	s.logger.Info("Reminders sent with count",
		zap.Int("days", days),
		zap.Int("sent_count", sentCount),
		zap.Int("error_count", errorCount))

	return sentCount, errorCount
}

// processEscalationsWithCount エスカレーション処理を実行してカウントを返す
func (s *reminderBatchService) processEscalationsWithCount(ctx context.Context) (int, int) {
	// リマインド設定を取得
	settings, err := s.reminderSettingsRepo.Get(ctx)
	if err != nil {
		s.logger.Error("Failed to get reminder settings for escalation", zap.Error(err))
		return -1, 1
	}

	// エスカレーション対象を取得
	queryParams := repository.QueryParams{
		Page:  1,
		Limit: 1000,
	}

	reports, _, err := s.reportRepo.FindUnsubmittedWithPreload(ctx, queryParams)
	if err != nil {
		s.logger.Error("Failed to get unsubmitted reports for escalation", zap.Error(err))
		return -1, 1
	}

	now := time.Now()
	sentCount := 0
	errorCount := 0

	for _, report := range reports {
		if report.SubmissionDeadline == nil {
			continue
		}

		// 経過日数を計算
		daysOverdue := int(now.Sub(*report.SubmissionDeadline).Hours() / 24)

		// エスカレーション日数以上の場合
		if daysOverdue < settings.EscalationDays {
			continue
		}

		// 本日既にエスカレーションを送信済みかチェック
		if s.isEscalationSentToday(ctx, report.UserID, report.ID) {
			continue
		}

		// マネージャーがいない場合はスキップ
		if report.User.ManagerID == nil {
			continue
		}

		target := ReminderTarget{
			UserID:       report.UserID,
			UserName:     fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName),
			UserEmail:    report.User.Email,
			ReportID:     report.ID,
			StartDate:    report.StartDate,
			EndDate:      report.EndDate,
			DaysOverdue:  daysOverdue,
			ReminderType: "escalation",
			ManagerID:    report.User.ManagerID,
		}

		if report.User.Manager != nil {
			target.ManagerEmail = report.User.Manager.Email
		}

		// エスカレーション通知を送信
		if err := s.sendEscalation(ctx, target); err != nil {
			s.logger.Error("Failed to send escalation",
				zap.String("user_id", target.UserID),
				zap.Error(err))
			errorCount++
			continue
		}

		// 送信履歴を記録
		if err := s.RecordReminderHistory(ctx, target.UserID, target.ReportID, "escalation"); err != nil {
			s.logger.Error("Failed to record escalation history",
				zap.String("user_id", target.UserID),
				zap.Error(err))
		}

		sentCount++
	}

	s.logger.Info("Escalations sent with count",
		zap.Int("sent_count", sentCount),
		zap.Int("error_count", errorCount))

	return sentCount, errorCount
}

// SendReminders リマインダーを送信（linter error対応）
func (s *reminderBatchService) SendReminders(ctx context.Context) (*ReminderResult, error) {
	// リマインド設定を取得
	settings, err := s.reminderSettingsRepo.Get(ctx)
	if err != nil {
		return &ReminderResult{SentCount: 0, ErrorCount: 1}, err
	}

	if !settings.Enabled {
		return &ReminderResult{SentCount: 0, ErrorCount: 0}, nil
	}

	// 結果を集計するためのカウンター
	totalSent := 0
	totalErrors := 0

	// 第一リマインダー
	if firstSent, firstErrors := s.sendRemindersForDaysWithCount(ctx, settings.FirstReminderDays); firstSent >= 0 {
		totalSent += firstSent
		totalErrors += firstErrors
	} else {
		totalErrors++
	}

	// 第二リマインダー
	if secondSent, secondErrors := s.sendRemindersForDaysWithCount(ctx, settings.SecondReminderDays); secondSent >= 0 {
		totalSent += secondSent
		totalErrors += secondErrors
	} else {
		totalErrors++
	}

	// エスカレーション
	if escalationSent, escalationErrors := s.processEscalationsWithCount(ctx); escalationSent >= 0 {
		totalSent += escalationSent
		totalErrors += escalationErrors
	} else {
		totalErrors++
	}

	return &ReminderResult{
		SentCount:  totalSent,
		ErrorCount: totalErrors,
	}, nil
}
