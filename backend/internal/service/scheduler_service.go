package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
)

// SchedulerService スケジューラーサービスのインターフェース
type SchedulerService interface {
	// ジョブ管理
	AddJob(name string, spec string, job func()) (cron.EntryID, error)
	RemoveJob(id cron.EntryID)
	StartJob(id cron.EntryID)
	StopJob(id cron.EntryID)

	// スケジューラー管理
	Start()
	Stop()
	IsRunning() bool

	// ジョブ情報取得
	GetJobInfo(id cron.EntryID) (*JobInfo, error)
	ListJobs() []JobInfo
}

// JobInfo ジョブ情報
type JobInfo struct {
	ID        cron.EntryID
	Name      string
	Schedule  string
	NextRun   time.Time
	PrevRun   time.Time
	IsRunning bool
}

// schedulerService スケジューラーサービスの実装
type schedulerService struct {
	cron      *cron.Cron
	logger    *zap.Logger
	jobs      map[cron.EntryID]string
	schedules map[cron.EntryID]string
	jobsMutex sync.RWMutex
	isRunning bool
}

// NewSchedulerService スケジューラーサービスのインスタンスを生成
func NewSchedulerService(logger *zap.Logger) SchedulerService {
	// 秒単位のスケジュールもサポート
	c := cron.New(cron.WithSeconds())

	return &schedulerService{
		cron:      c,
		logger:    logger,
		jobs:      make(map[cron.EntryID]string),
		schedules: make(map[cron.EntryID]string),
		isRunning: false,
	}
}

// AddJob ジョブを追加
func (s *schedulerService) AddJob(name string, spec string, job func()) (cron.EntryID, error) {
	s.jobsMutex.Lock()
	defer s.jobsMutex.Unlock()

	// ジョブをラップしてエラーハンドリングとログ記録を行う
	wrappedJob := func() {
		startTime := time.Now()
		s.logger.Info("Job started",
			zap.String("job_name", name),
			zap.Time("start_time", startTime),
		)

		// パニックからの回復
		defer func() {
			if r := recover(); r != nil {
				s.logger.Error("Job panicked",
					zap.String("job_name", name),
					zap.Any("panic", r),
				)
			}
		}()

		// ジョブ実行
		job()

		duration := time.Since(startTime)
		s.logger.Info("Job completed",
			zap.String("job_name", name),
			zap.Duration("duration", duration),
		)
	}

	id, err := s.cron.AddFunc(spec, wrappedJob)
	if err != nil {
		s.logger.Error("Failed to add job",
			zap.String("job_name", name),
			zap.String("spec", spec),
			zap.Error(err),
		)
		return 0, fmt.Errorf("failed to add job %s: %w", name, err)
	}

	s.jobs[id] = name
	s.schedules[id] = spec

	s.logger.Info("Job added successfully",
		zap.String("job_name", name),
		zap.String("spec", spec),
		zap.Int("job_id", int(id)),
	)

	return id, nil
}

// RemoveJob ジョブを削除
func (s *schedulerService) RemoveJob(id cron.EntryID) {
	s.jobsMutex.Lock()
	defer s.jobsMutex.Unlock()

	if name, exists := s.jobs[id]; exists {
		s.cron.Remove(id)
		delete(s.jobs, id)
		delete(s.schedules, id)

		s.logger.Info("Job removed",
			zap.String("job_name", name),
			zap.Int("job_id", int(id)),
		)
	}
}

// StartJob 特定のジョブを開始
func (s *schedulerService) StartJob(id cron.EntryID) {
	if entry := s.cron.Entry(id); entry.ID != 0 {
		// cronライブラリでは個別のジョブの開始/停止はサポートされていないため、
		// この実装では全体のスケジューラーを制御する
		s.logger.Warn("Individual job start is not supported, starting scheduler instead")
		s.Start()
	}
}

// StopJob 特定のジョブを停止
func (s *schedulerService) StopJob(id cron.EntryID) {
	// 個別のジョブ停止は削除で対応
	s.RemoveJob(id)
}

// Start スケジューラーを開始
func (s *schedulerService) Start() {
	if s.isRunning {
		s.logger.Warn("Scheduler is already running")
		return
	}

	s.cron.Start()
	s.isRunning = true

	s.logger.Info("Scheduler started",
		zap.Int("job_count", len(s.jobs)),
	)
}

// Stop スケジューラーを停止
func (s *schedulerService) Stop() {
	if !s.isRunning {
		s.logger.Warn("Scheduler is not running")
		return
	}

	ctx := s.cron.Stop()
	<-ctx.Done()
	s.isRunning = false

	s.logger.Info("Scheduler stopped")
}

// IsRunning スケジューラーが実行中かどうか
func (s *schedulerService) IsRunning() bool {
	return s.isRunning
}

// GetJobInfo ジョブ情報を取得
func (s *schedulerService) GetJobInfo(id cron.EntryID) (*JobInfo, error) {
	s.jobsMutex.RLock()
	defer s.jobsMutex.RUnlock()

	name, exists := s.jobs[id]
	if !exists {
		return nil, fmt.Errorf("job with id %d not found", id)
	}

	entry := s.cron.Entry(id)
	if entry.ID == 0 {
		return nil, fmt.Errorf("cron entry for job %d not found", id)
	}

	return &JobInfo{
		ID:        entry.ID,
		Name:      name,
		Schedule:  s.schedules[id],
		NextRun:   entry.Next,
		PrevRun:   entry.Prev,
		IsRunning: s.isRunning,
	}, nil
}

// ListJobs 全てのジョブ情報を取得
func (s *schedulerService) ListJobs() []JobInfo {
	s.jobsMutex.RLock()
	defer s.jobsMutex.RUnlock()

	entries := s.cron.Entries()
	jobs := make([]JobInfo, 0, len(entries))

	for _, entry := range entries {
		if name, exists := s.jobs[entry.ID]; exists {
			jobs = append(jobs, JobInfo{
				ID:        entry.ID,
				Name:      name,
				Schedule:  s.schedules[entry.ID],
				NextRun:   entry.Next,
				PrevRun:   entry.Prev,
				IsRunning: s.isRunning,
			})
		}
	}

	return jobs
}

// ExpenseApprovalReminderJob 経費申請承認催促ジョブ
type ExpenseApprovalReminderJob struct {
	ExpenseService      ExpenseService
	NotificationService NotificationService
	Logger              *zap.Logger

	// 設定
	ReminderThreshold time.Duration // 催促を送る閾値（例：3日）
	MaxReminders      int           // 最大催促回数
}

// NewExpenseApprovalReminderJob 経費申請承認催促ジョブのインスタンスを生成
func NewExpenseApprovalReminderJob(
	expenseService ExpenseService,
	notificationService NotificationService,
	logger *zap.Logger,
	reminderThreshold time.Duration,
	maxReminders int,
) *ExpenseApprovalReminderJob {
	return &ExpenseApprovalReminderJob{
		ExpenseService:      expenseService,
		NotificationService: notificationService,
		Logger:              logger,
		ReminderThreshold:   reminderThreshold,
		MaxReminders:        maxReminders,
	}
}

// Run ジョブを実行
func (j *ExpenseApprovalReminderJob) Run() {
	ctx := context.Background()
	startTime := time.Now()

	j.Logger.Info("Starting expense approval reminder job",
		zap.Duration("reminder_threshold", j.ReminderThreshold),
		zap.Int("max_reminders", j.MaxReminders),
	)

	// 承認待ちの経費申請を取得
	pendingExpenses, err := j.ExpenseService.GetPendingExpenses(ctx, j.ReminderThreshold)
	if err != nil {
		j.Logger.Error("Failed to get pending expenses",
			zap.Error(err),
		)
		return
	}

	if len(pendingExpenses) == 0 {
		j.Logger.Info("No pending expenses found for reminder")
		return
	}

	// 承認者ごとに経費申請をグルーピング
	approverExpenses := make(map[string][]model.Expense)
	for _, expense := range pendingExpenses {
		// 現在の承認者を特定（実装は ExpenseService に依存）
		approverID, err := j.ExpenseService.GetCurrentApprover(ctx, expense.ID)
		if err != nil {
			j.Logger.Error("Failed to get current approver",
				zap.String("expense_id", expense.ID),
				zap.Error(err),
			)
			continue
		}

		if approverID != nil {
			approverExpenses[*approverID] = append(approverExpenses[*approverID], expense)
		}
	}

	// 各承認者に催促通知を送信
	successCount := 0
	errorCount := 0

	for approverIDStr, expenses := range approverExpenses {
		approverID := approverIDStr
		// 催促通知を送信
		err = j.NotificationService.NotifyExpenseApprovalReminder(ctx, approverID, expenses)
		if err != nil {
			j.Logger.Error("Failed to send approval reminder",
				zap.String("approver_id", approverIDStr),
				zap.Int("expense_count", len(expenses)),
				zap.Error(err),
			)
			errorCount++
		} else {
			successCount++
			j.Logger.Info("Sent approval reminder",
				zap.String("approver_id", approverIDStr),
				zap.Int("expense_count", len(expenses)),
			)
		}
	}

	duration := time.Since(startTime)
	j.Logger.Info("Expense approval reminder job completed",
		zap.Int("total_pending", len(pendingExpenses)),
		zap.Int("approvers_notified", successCount),
		zap.Int("errors", errorCount),
		zap.Duration("duration", duration),
	)
}
