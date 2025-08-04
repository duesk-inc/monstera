package batch

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
)

// Scheduler はバッチ処理のスケジューリングを管理
type Scheduler struct {
	cron                         *cron.Cron
	db                           *gorm.DB
	logger                       *zap.Logger
	alertService                 service.AlertService
	alertDetectionBatchService   service.AlertDetectionBatchService
	notificationService          service.NotificationService
	unsubmittedReportService     service.UnsubmittedReportService
	reminderBatchService         service.ReminderBatchService
	archiveService               service.ArchiveService
	expenseMonthlyCloseProcessor *ExpenseMonthlyCloseProcessor
	ctx                          context.Context
	cancel                       context.CancelFunc
}

// cronLoggerAdapter wraps zap.Logger to implement the Printf interface
type cronLoggerAdapter struct {
	logger *zap.Logger
}

func (c *cronLoggerAdapter) Printf(format string, args ...interface{}) {
	c.logger.Sugar().Infof(format, args...)
}

// NewScheduler 新しいスケジューラーインスタンスを作成
func NewScheduler(
	db *gorm.DB,
	notificationService service.NotificationService,
	alertService service.AlertService,
	alertDetectionBatchService service.AlertDetectionBatchService,
	archiveService service.ArchiveService,
	logger *zap.Logger,
) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())

	// 東京タイムゾーンでcronスケジューラーを作成
	location, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		logger.Warn("Failed to load Tokyo timezone, using UTC", zap.Error(err))
		location = time.UTC
	}

	// Create a logger adapter that implements the Printf interface
	cronLogger := &cronLoggerAdapter{logger: logger}

	cronScheduler := cron.New(
		cron.WithLocation(location),
		cron.WithLogger(cron.VerbosePrintfLogger(cronLogger)),
	)

	// Create repositories needed for batch services
	weeklyReportRefactoredRepo := repository.NewWeeklyReportRefactoredRepository(db, logger)
	userRepo := repository.NewUserRepository(db)
	userRepo.SetLogger(logger)
	departmentRepo := repository.NewDepartmentRepository(db)
	notificationRepo := repository.NewNotificationRepository(db, logger)
	reminderSettingsRepo := repository.NewReminderSettingsRepository(db)

	// Expense repositories
	expenseRepo := repository.NewExpenseRepository(db, logger)

	// Create batch services
	unsubmittedReportService := service.NewUnsubmittedReportService(
		db, weeklyReportRefactoredRepo, userRepo, departmentRepo,
		notificationRepo, reminderSettingsRepo, logger,
	)
	reminderBatchService := service.NewReminderBatchService(
		db, weeklyReportRefactoredRepo, userRepo,
		notificationRepo, reminderSettingsRepo, logger,
	)

	// Expense monthly close service
	expenseMonthlyCloseService := service.NewExpenseMonthlyCloseService(
		db, expenseRepo, userRepo, notificationService, logger,
	)
	expenseMonthlyCloseProcessor := NewExpenseMonthlyCloseProcessor(
		expenseMonthlyCloseService, logger,
	)

	return &Scheduler{
		cron:                         cronScheduler,
		db:                           db,
		logger:                       logger,
		alertService:                 alertService,
		alertDetectionBatchService:   alertDetectionBatchService,
		notificationService:          notificationService,
		unsubmittedReportService:     unsubmittedReportService,
		reminderBatchService:         reminderBatchService,
		archiveService:               archiveService,
		expenseMonthlyCloseProcessor: expenseMonthlyCloseProcessor,
		ctx:                          ctx,
		cancel:                       cancel,
	}
}

// Start スケジューラーを開始し、すべてのバッチジョブを登録
func (s *Scheduler) Start() error {
	s.logger.Info("Starting batch scheduler")

	// 各バッチジョブを登録
	if err := s.registerJobs(); err != nil {
		return err
	}

	// スケジューラー開始
	s.cron.Start()
	s.logger.Info("Batch scheduler started successfully")

	return nil
}

// Stop スケジューラーを停止
func (s *Scheduler) Stop() {
	s.logger.Info("Stopping batch scheduler")

	// コンテキストをキャンセル
	s.cancel()

	// cronスケジューラーを停止
	s.cron.Stop()

	s.logger.Info("Batch scheduler stopped")
}

// registerJobs すべてのバッチジョブをスケジューラーに登録
func (s *Scheduler) registerJobs() error {
	// 1. アラート検知バッチ - 平日の毎時0分実行 (設計書準拠)
	_, err := s.cron.AddFunc("0 * * * 1-5", func() {
		s.runAlertDetectionBatch()
	})
	if err != nil {
		s.logger.Error("Failed to register alert detection batch", zap.Error(err))
		return err
	}

	// 2. 週報リマインダーバッチ - 平日の9時、13時、17時実行
	_, err = s.cron.AddFunc("0 9,13,17 * * 1-5", func() {
		s.runWeeklyReportReminderBatch()
	})
	if err != nil {
		s.logger.Error("Failed to register weekly report reminder batch", zap.Error(err))
		return err
	}

	// 3. 未提出者エスカレーションバッチ - 平日の18時実行
	_, err = s.cron.AddFunc("0 18 * * 1-5", func() {
		s.runUnsubmittedEscalationBatch()
	})
	if err != nil {
		s.logger.Error("Failed to register unsubmitted escalation batch", zap.Error(err))
		return err
	}

	// 4. 通知クリーンアップバッチ - 毎日午前2時実行
	_, err = s.cron.AddFunc("0 2 * * *", func() {
		s.runNotificationCleanupBatch()
	})
	if err != nil {
		s.logger.Error("Failed to register notification cleanup batch", zap.Error(err))
		return err
	}

	// 5. 月次アーカイブバッチ - 月末の午前3時実行
	// 1年以上古い週報データをアーカイブし、5年以上古いアーカイブを削除
	_, err = s.cron.AddFunc("0 3 28-31 * *", func() {
		// 月末かどうかをチェック
		if s.isLastDayOfMonth() {
			s.runMonthlyArchiveBatch()
		}
	})
	if err != nil {
		s.logger.Error("Failed to register monthly archive batch", zap.Error(err))
		return err
	}

	// 6. 経費月次締めバッチ - 毎月1日の午前2時実行（前月分を締める）
	_, err = s.cron.AddFunc("0 2 1 * *", func() {
		s.runExpenseMonthlyCloseBatch()
	})
	if err != nil {
		s.logger.Error("Failed to register expense monthly close batch", zap.Error(err))
		return err
	}

	s.logger.Info("All batch jobs registered successfully")
	return nil
}

// runAlertDetectionBatch アラート検知バッチを実行
func (s *Scheduler) runAlertDetectionBatch() {
	jobID := "alert_detection_" + time.Now().Format("20060102_150405")
	s.logger.Info("Starting alert detection batch", zap.String("job_id", jobID))

	start := time.Now()
	ctx, cancel := context.WithTimeout(s.ctx, 30*time.Minute)
	defer cancel()

	// 週報アラートの検知を実行
	now := time.Now()
	weekStart := now.AddDate(0, 0, int(time.Monday-now.Weekday()))
	weekEnd := weekStart.AddDate(0, 0, 6)

	err := s.alertService.DetectWeeklyReportAlerts(ctx, weekStart, weekEnd)
	duration := time.Since(start)

	if err != nil {
		s.logger.Error("Alert detection batch failed",
			zap.String("job_id", jobID),
			zap.Duration("duration", duration),
			zap.Error(err),
		)
	} else {
		s.logger.Info("Alert detection batch completed successfully",
			zap.String("job_id", jobID),
			zap.Duration("duration", duration),
		)
	}
}

// runWeeklyReportReminderBatch 週報リマインダーバッチを実行
func (s *Scheduler) runWeeklyReportReminderBatch() {
	jobID := "weekly_reminder_" + time.Now().Format("20060102_150405")
	s.logger.Info("Starting weekly report reminder batch", zap.String("job_id", jobID))

	start := time.Now()
	ctx, cancel := context.WithTimeout(s.ctx, 20*time.Minute)
	defer cancel()

	// 週報リマインダーを実行
	result, err := s.reminderBatchService.SendReminders(ctx)
	duration := time.Since(start)

	if err != nil {
		s.logger.Error("Weekly report reminder batch failed",
			zap.String("job_id", jobID),
			zap.Duration("duration", duration),
			zap.Error(err),
		)
	} else {
		s.logger.Info("Weekly report reminder batch completed successfully",
			zap.String("job_id", jobID),
			zap.Duration("duration", duration),
			zap.Int("reminders_sent", result.SentCount),
			zap.Int("errors", result.ErrorCount),
		)
	}
}

// runUnsubmittedEscalationBatch 未提出者エスカレーションバッチを実行
func (s *Scheduler) runUnsubmittedEscalationBatch() {
	jobID := "unsubmitted_escalation_" + time.Now().Format("20060102_150405")
	s.logger.Info("Starting unsubmitted escalation batch", zap.String("job_id", jobID))

	start := time.Now()
	ctx, cancel := context.WithTimeout(s.ctx, 15*time.Minute)
	defer cancel()

	// 長期未提出者のエスカレーション処理
	err := s.unsubmittedReportService.ProcessEscalations(ctx)
	duration := time.Since(start)

	if err != nil {
		s.logger.Error("Unsubmitted escalation batch failed",
			zap.String("job_id", jobID),
			zap.Duration("duration", duration),
			zap.Error(err),
		)
	} else {
		s.logger.Info("Unsubmitted escalation batch completed successfully",
			zap.String("job_id", jobID),
			zap.Duration("duration", duration),
		)
	}
}

// runNotificationCleanupBatch 通知クリーンアップバッチを実行
func (s *Scheduler) runNotificationCleanupBatch() {
	jobID := "notification_cleanup_" + time.Now().Format("20060102_150405")
	s.logger.Info("Starting notification cleanup batch", zap.String("job_id", jobID))

	start := time.Now()
	ctx, cancel := context.WithTimeout(s.ctx, 10*time.Minute)
	defer cancel()

	// 30日以上古い既読通知を削除
	cutoffDate := time.Now().AddDate(0, 0, -30)
	err := s.notificationService.CleanupOldNotifications(ctx, cutoffDate)
	duration := time.Since(start)

	if err != nil {
		s.logger.Error("Notification cleanup batch failed",
			zap.String("job_id", jobID),
			zap.Duration("duration", duration),
			zap.Error(err),
		)
	} else {
		s.logger.Info("Notification cleanup batch completed successfully",
			zap.String("job_id", jobID),
			zap.Duration("duration", duration),
		)
	}
}

// runMonthlyArchiveBatch 月次アーカイブバッチを実行
func (s *Scheduler) runMonthlyArchiveBatch() {
	jobID := "monthly_archive_" + time.Now().Format("20060102_150405")
	s.logger.Info("Starting monthly archive batch", zap.String("job_id", jobID))

	start := time.Now()
	ctx, cancel := context.WithTimeout(s.ctx, 60*time.Minute)
	defer cancel()

	// バッチ実行ユーザーIDを生成（システムユーザーとして扱う）
	batchUserID := uuid.New()

	// アーカイブパラメータを設定
	// 1年以上古い週報データをアーカイブ（本番運用では適切に調整）
	params := service.ArchiveOldReportsParams{
		RetentionYears: 1, // 1年以上古いデータをアーカイブ
		ExecutedBy:     batchUserID,
		ArchiveReason:  model.ArchiveReasonRetentionPolicy,
		DepartmentID:   nil,   // 全部署対象
		MaxRecords:     nil,   // 件数制限なし
		DryRun:         false, // 実際にアーカイブを実行
	}

	// アーカイブ処理を実行
	result, err := s.archiveService.ArchiveOldReports(ctx, params)
	duration := time.Since(start)

	if err != nil {
		s.logger.Error("Monthly archive batch failed",
			zap.String("job_id", jobID),
			zap.Duration("duration", duration),
			zap.Error(err),
		)
		return
	}

	// 成功時のログ出力
	s.logger.Info("Monthly archive batch completed successfully",
		zap.String("job_id", jobID),
		zap.Duration("duration", duration),
		zap.Int("total_candidates", result.TotalCandidates),
		zap.Int("archived_count", result.ArchivedCount),
		zap.Int("failed_count", result.FailedCount),
		zap.String("statistics_id", result.StatisticsID.String()),
		zap.Time("cutoff_date", result.CutoffDate),
	)

	// 続けて期限切れアーカイブのクリーンアップも実行
	s.runArchiveCleanupBatch(ctx, jobID, batchUserID)
}

// runExpenseMonthlyCloseBatch 経費月次締めバッチを実行
func (s *Scheduler) runExpenseMonthlyCloseBatch() {
	jobID := "expense_monthly_close_" + time.Now().Format("20060102_150405")
	s.logger.Info("Starting expense monthly close batch", zap.String("job_id", jobID))

	start := time.Now()
	ctx, cancel := context.WithTimeout(s.ctx, 30*time.Minute)
	defer cancel()

	// 月次締め処理を実行
	if err := s.expenseMonthlyCloseProcessor.ProcessMonthlyClose(ctx); err != nil {
		s.logger.Error("Expense monthly close batch failed",
			zap.String("job_id", jobID),
			zap.Error(err),
			zap.Duration("duration", time.Since(start)))
		return
	}

	s.logger.Info("Expense monthly close batch completed successfully",
		zap.String("job_id", jobID),
		zap.Duration("duration", time.Since(start)))
}

// runArchiveCleanupBatch アーカイブクリーンアップバッチを実行
func (s *Scheduler) runArchiveCleanupBatch(ctx context.Context, parentJobID string, executedBy uuid.UUID) {
	cleanupJobID := parentJobID + "_cleanup"
	s.logger.Info("Starting archive cleanup batch", zap.String("job_id", cleanupJobID))

	start := time.Now()

	// クリーンアップパラメータを設定
	// 5年以上古いアーカイブデータを削除
	cleanupParams := service.CleanupExpiredArchivesParams{
		RetentionYears: 5, // 5年以上古いアーカイブを削除
		ExecutedBy:     executedBy,
		DryRun:         false, // 実際に削除を実行
	}

	// クリーンアップ処理を実行
	cleanupResult, err := s.archiveService.CleanupExpiredArchives(ctx, cleanupParams)
	duration := time.Since(start)

	if err != nil {
		s.logger.Error("Archive cleanup batch failed",
			zap.String("job_id", cleanupJobID),
			zap.Duration("duration", duration),
			zap.Error(err),
		)
		return
	}

	// 成功時のログ出力
	s.logger.Info("Archive cleanup batch completed successfully",
		zap.String("job_id", cleanupJobID),
		zap.Duration("duration", duration),
		zap.Int("deleted_count", cleanupResult.DeletedCount),
		zap.String("statistics_id", cleanupResult.StatisticsID.String()),
		zap.Time("cutoff_date", cleanupResult.CutoffDate),
	)

	// 最後に整合性チェックを実行
	s.runArchiveIntegrityCheck(ctx, parentJobID)
}

// runArchiveIntegrityCheck アーカイブ整合性チェックを実行
func (s *Scheduler) runArchiveIntegrityCheck(ctx context.Context, parentJobID string) {
	integrityJobID := parentJobID + "_integrity_check"
	s.logger.Info("Starting archive integrity check", zap.String("job_id", integrityJobID))

	start := time.Now()

	// 整合性チェックを実行
	integrityResult, err := s.archiveService.ValidateArchiveIntegrity(ctx)
	duration := time.Since(start)

	if err != nil {
		s.logger.Error("Archive integrity check failed",
			zap.String("job_id", integrityJobID),
			zap.Duration("duration", duration),
			zap.Error(err),
		)
		return
	}

	// 結果をログ出力
	if integrityResult.IntegrityIssues > 0 {
		s.logger.Warn("Archive integrity issues found",
			zap.String("job_id", integrityJobID),
			zap.Duration("duration", duration),
			zap.Int("issue_count", integrityResult.IntegrityIssues),
			zap.String("report", integrityResult.Report),
		)
	} else {
		s.logger.Info("Archive integrity check completed successfully - no issues found",
			zap.String("job_id", integrityJobID),
			zap.Duration("duration", duration),
		)
	}
}

// isLastDayOfMonth 今日が月末かどうかを判定
func (s *Scheduler) isLastDayOfMonth() bool {
	now := time.Now()
	tomorrow := now.AddDate(0, 0, 1)
	return now.Month() != tomorrow.Month()
}

// GetJobStatuses 現在のジョブステータスを取得（ヘルスチェック用）
func (s *Scheduler) GetJobStatuses() []JobStatus {
	entries := s.cron.Entries()
	statuses := make([]JobStatus, len(entries))

	for i, entry := range entries {
		statuses[i] = JobStatus{
			ID:       entry.ID,
			Next:     entry.Next,
			Prev:     entry.Prev,
			Schedule: fmt.Sprintf("%v", entry.Schedule), // Use fmt.Sprintf since Schedule doesn't have String()
		}
	}

	return statuses
}

// JobStatus ジョブの実行状況
type JobStatus struct {
	ID       cron.EntryID `json:"id"`
	Next     time.Time    `json:"next"`
	Prev     time.Time    `json:"prev"`
	Schedule string       `json:"schedule"`
}

// HealthCheck スケジューラーのヘルスチェック
func (s *Scheduler) HealthCheck() HealthStatus {
	jobs := s.GetJobStatuses()
	running := len(jobs) > 0

	return HealthStatus{
		Running:    running,
		JobCount:   len(jobs),
		LastUpdate: time.Now(),
		Jobs:       jobs,
	}
}

// HealthStatus スケジューラーの健康状態
type HealthStatus struct {
	Running    bool        `json:"running"`
	JobCount   int         `json:"job_count"`
	LastUpdate time.Time   `json:"last_update"`
	Jobs       []JobStatus `json:"jobs"`
}
