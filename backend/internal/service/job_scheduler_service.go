package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
)

// JobSchedulerServiceInterface ジョブスケジューラーサービスインターフェース
type JobSchedulerServiceInterface interface {
	// ジョブ管理
	CreateJob(ctx context.Context, name string, jobType model.ScheduledJobType, cronExpression string, config map[string]interface{}) (*model.ScheduledJob, error)
	UpdateJob(ctx context.Context, jobID uuid.UUID, updates map[string]interface{}) error
	DeleteJob(ctx context.Context, jobID uuid.UUID) error
	GetJob(ctx context.Context, jobID uuid.UUID) (*model.ScheduledJob, error)
	ListJobs(ctx context.Context, filters map[string]interface{}) ([]*model.ScheduledJob, error)

	// ジョブ実行
	ExecuteJob(ctx context.Context, jobID uuid.UUID) error
	ExecuteJobAsync(ctx context.Context, jobID uuid.UUID) error

	// スケジューラー管理
	Start() error
	Stop() error
	IsRunning() bool

	// ジョブ登録
	RegisterJobHandler(jobType model.ScheduledJobType, handler JobHandler)

	// ジョブ状態管理
	EnableJob(ctx context.Context, jobID uuid.UUID) error
	DisableJob(ctx context.Context, jobID uuid.UUID) error

	// 実行履歴
	GetJobExecutionHistory(ctx context.Context, jobID uuid.UUID, limit int) ([]*JobExecutionHistory, error)
	CleanupOldExecutions(ctx context.Context, daysToKeep int) error
}

// JobHandler ジョブハンドラーインターフェース
type JobHandler interface {
	Execute(ctx context.Context, job *model.ScheduledJob) error
	Validate(config map[string]interface{}) error
}

// JobExecutionHistory ジョブ実行履歴
type JobExecutionHistory struct {
	ID          uuid.UUID
	JobID       uuid.UUID
	StartedAt   time.Time
	CompletedAt *time.Time
	Status      string
	Result      string
	Error       string
}

// jobSchedulerService ジョブスケジューラーサービス実装
type jobSchedulerService struct {
	db             *gorm.DB
	logger         *zap.Logger
	jobRepo        repository.ScheduledJobRepositoryInterface
	scheduler      *cron.Cron
	handlers       map[model.ScheduledJobType]JobHandler
	activeJobs     map[uuid.UUID]cron.EntryID
	mu             sync.RWMutex
	isRunning      bool
	executionStore map[uuid.UUID][]*JobExecutionHistory // 簡易的な実行履歴ストア
}

// NewJobSchedulerService ジョブスケジューラーサービスのコンストラクタ
func NewJobSchedulerService(
	db *gorm.DB,
	logger *zap.Logger,
	jobRepo repository.ScheduledJobRepositoryInterface,
) JobSchedulerServiceInterface {
	return &jobSchedulerService{
		db:             db,
		logger:         logger,
		jobRepo:        jobRepo,
		scheduler:      cron.New(cron.WithSeconds()),
		handlers:       make(map[model.ScheduledJobType]JobHandler),
		activeJobs:     make(map[uuid.UUID]cron.EntryID),
		executionStore: make(map[uuid.UUID][]*JobExecutionHistory),
	}
}

// CreateJob ジョブを作成
func (s *jobSchedulerService) CreateJob(ctx context.Context, name string, jobType model.ScheduledJobType, cronExpression string, config map[string]interface{}) (*model.ScheduledJob, error) {
	// cron式の検証
	if _, err := cron.ParseStandard(cronExpression); err != nil {
		return nil, fmt.Errorf("無効なcron式です: %w", err)
	}

	// ハンドラーの存在確認
	handler, exists := s.handlers[jobType]
	if !exists {
		return nil, fmt.Errorf("ジョブタイプ %s のハンドラーが登録されていません", jobType)
	}

	// 設定の検証
	if err := handler.Validate(config); err != nil {
		return nil, fmt.Errorf("ジョブ設定の検証に失敗しました: %w", err)
	}

	// ジョブを作成
	params := model.JobParameters(config)
	job := &model.ScheduledJob{
		JobName:        name,
		JobType:        jobType,
		CronExpression: cronExpression,
		Parameters:     &params,
		Status:         model.ScheduledJobStatusActive,
		NextRunAt:      s.calculateNextRunTime(cronExpression),
		CreatedBy:      uuid.New(), // TODO: 実際のユーザーIDを設定
	}

	if err := s.jobRepo.Create(ctx, job); err != nil {
		return nil, fmt.Errorf("ジョブの作成に失敗しました: %w", err)
	}

	// スケジューラーが実行中の場合は即座に登録
	if s.isRunning {
		if err := s.scheduleJob(job); err != nil {
			s.logger.Error("Failed to schedule job", zap.Error(err))
		}
	}

	s.logger.Info("Job created successfully",
		zap.String("job_id", job.ID.String()),
		zap.String("name", job.JobName),
		zap.String("type", string(job.JobType)))

	return job, nil
}

// UpdateJob ジョブを更新
func (s *jobSchedulerService) UpdateJob(ctx context.Context, jobID uuid.UUID, updates map[string]interface{}) error {
	job, err := s.jobRepo.GetByID(ctx, jobID)
	if err != nil {
		return fmt.Errorf("ジョブの取得に失敗しました: %w", err)
	}

	// cron式が更新される場合は検証
	if cronExpr, ok := updates["cron_expression"].(string); ok {
		if _, err := cron.ParseStandard(cronExpr); err != nil {
			return fmt.Errorf("無効なcron式です: %w", err)
		}
		job.CronExpression = cronExpr
		job.NextRunAt = s.calculateNextRunTime(cronExpr)
	}

	// 設定が更新される場合は検証
	if config, ok := updates["config"].(map[string]interface{}); ok {
		handler, exists := s.handlers[job.JobType]
		if exists {
			if err := handler.Validate(config); err != nil {
				return fmt.Errorf("ジョブ設定の検証に失敗しました: %w", err)
			}
		}
		// JobParametersへの変換
		params := model.JobParameters(config)
		job.Parameters = &params
	}

	// その他のフィールドを更新
	if name, ok := updates["name"].(string); ok {
		job.JobName = name
	}

	if err := s.jobRepo.Update(ctx, job); err != nil {
		return fmt.Errorf("ジョブの更新に失敗しました: %w", err)
	}

	// スケジューラーから一度削除して再登録
	s.unscheduleJob(jobID)
	if job.IsActive() && s.isRunning {
		if err := s.scheduleJob(job); err != nil {
			s.logger.Error("Failed to reschedule job", zap.Error(err))
		}
	}

	return nil
}

// DeleteJob ジョブを削除
func (s *jobSchedulerService) DeleteJob(ctx context.Context, jobID uuid.UUID) error {
	// スケジューラーから削除
	s.unscheduleJob(jobID)

	// データベースから削除
	if err := s.jobRepo.Delete(ctx, jobID); err != nil {
		return fmt.Errorf("ジョブの削除に失敗しました: %w", err)
	}

	// 実行履歴も削除
	s.mu.Lock()
	delete(s.executionStore, jobID)
	s.mu.Unlock()

	return nil
}

// GetJob ジョブを取得
func (s *jobSchedulerService) GetJob(ctx context.Context, jobID uuid.UUID) (*model.ScheduledJob, error) {
	return s.jobRepo.GetByID(ctx, jobID)
}

// ListJobs ジョブ一覧を取得
func (s *jobSchedulerService) ListJobs(ctx context.Context, filters map[string]interface{}) ([]*model.ScheduledJob, error) {
	return s.jobRepo.List(ctx, nil, nil, 1000, 0) // TODO: フィルターの実装
}

// ExecuteJob ジョブを即座に実行（同期）
func (s *jobSchedulerService) ExecuteJob(ctx context.Context, jobID uuid.UUID) error {
	job, err := s.jobRepo.GetByID(ctx, jobID)
	if err != nil {
		return fmt.Errorf("ジョブの取得に失敗しました: %w", err)
	}

	handler, exists := s.handlers[job.JobType]
	if !exists {
		return fmt.Errorf("ジョブタイプ %s のハンドラーが登録されていません", job.JobType)
	}

	// 実行履歴を記録
	execution := &JobExecutionHistory{
		ID:        uuid.New(),
		JobID:     jobID,
		StartedAt: time.Now(),
		Status:    "running",
	}
	s.recordExecution(jobID, execution)

	// ジョブを実行
	err = handler.Execute(ctx, job)

	// 実行結果を記録
	now := time.Now()
	execution.CompletedAt = &now
	if err != nil {
		execution.Status = "failed"
		execution.Error = err.Error()
		// TODO: LastErrorフィールドの追加が必要
		// job.LastError = err.Error()
	} else {
		execution.Status = "completed"
		execution.Result = "成功"
	}

	// 最終実行時刻を更新
	job.LastRunAt = &execution.StartedAt
	if err := s.jobRepo.Update(ctx, job); err != nil {
		s.logger.Error("Failed to update job last run time", zap.Error(err))
	}

	return err
}

// ExecuteJobAsync ジョブを非同期で実行
func (s *jobSchedulerService) ExecuteJobAsync(ctx context.Context, jobID uuid.UUID) error {
	job, err := s.jobRepo.GetByID(ctx, jobID)
	if err != nil {
		return fmt.Errorf("ジョブの取得に失敗しました: %w", err)
	}

	// ハンドラーの存在確認
	if _, exists := s.handlers[job.JobType]; !exists {
		return fmt.Errorf("ジョブタイプ %s のハンドラーが登録されていません", job.JobType)
	}

	// 非同期で実行
	go func() {
		if err := s.ExecuteJob(context.Background(), jobID); err != nil {
			s.logger.Error("Async job execution failed",
				zap.String("job_id", jobID.String()),
				zap.Error(err))
		}
	}()

	return nil
}

// Start スケジューラーを開始
func (s *jobSchedulerService) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.isRunning {
		return fmt.Errorf("スケジューラーは既に実行中です")
	}

	// 全てのアクティブなジョブを読み込んでスケジュール
	ctx := context.Background()
	jobs, err := s.jobRepo.ListActive(ctx, nil)
	if err != nil {
		return fmt.Errorf("アクティブなジョブの取得に失敗しました: %w", err)
	}

	for _, job := range jobs {
		if err := s.scheduleJob(job); err != nil {
			s.logger.Error("Failed to schedule job",
				zap.String("job_id", job.ID.String()),
				zap.Error(err))
		}
	}

	s.scheduler.Start()
	s.isRunning = true

	s.logger.Info("Job scheduler started", zap.Int("active_jobs", len(s.activeJobs)))
	return nil
}

// Stop スケジューラーを停止
func (s *jobSchedulerService) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.isRunning {
		return fmt.Errorf("スケジューラーは実行されていません")
	}

	ctx := s.scheduler.Stop()
	<-ctx.Done()

	s.isRunning = false
	s.activeJobs = make(map[uuid.UUID]cron.EntryID)

	s.logger.Info("Job scheduler stopped")
	return nil
}

// IsRunning スケジューラーが実行中かチェック
func (s *jobSchedulerService) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.isRunning
}

// RegisterJobHandler ジョブハンドラーを登録
func (s *jobSchedulerService) RegisterJobHandler(jobType model.ScheduledJobType, handler JobHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handlers[jobType] = handler

	s.logger.Info("Job handler registered", zap.String("job_type", string(jobType)))
}

// EnableJob ジョブを有効化
func (s *jobSchedulerService) EnableJob(ctx context.Context, jobID uuid.UUID) error {
	job, err := s.jobRepo.GetByID(ctx, jobID)
	if err != nil {
		return fmt.Errorf("ジョブの取得に失敗しました: %w", err)
	}

	if job.Status == model.ScheduledJobStatusActive {
		return nil // 既に有効
	}

	job.Status = model.ScheduledJobStatusActive
	if err := s.jobRepo.Update(ctx, job); err != nil {
		return fmt.Errorf("ジョブの更新に失敗しました: %w", err)
	}

	// スケジューラーが実行中の場合はジョブをスケジュール
	if s.isRunning {
		if err := s.scheduleJob(job); err != nil {
			return fmt.Errorf("ジョブのスケジュールに失敗しました: %w", err)
		}
	}

	return nil
}

// DisableJob ジョブを無効化
func (s *jobSchedulerService) DisableJob(ctx context.Context, jobID uuid.UUID) error {
	job, err := s.jobRepo.GetByID(ctx, jobID)
	if err != nil {
		return fmt.Errorf("ジョブの取得に失敗しました: %w", err)
	}

	if job.Status != model.ScheduledJobStatusActive {
		return nil // 既に無効
	}

	job.Status = model.ScheduledJobStatusInactive
	if err := s.jobRepo.Update(ctx, job); err != nil {
		return fmt.Errorf("ジョブの更新に失敗しました: %w", err)
	}

	// スケジューラーから削除
	s.unscheduleJob(jobID)

	return nil
}

// GetJobExecutionHistory ジョブ実行履歴を取得
func (s *jobSchedulerService) GetJobExecutionHistory(ctx context.Context, jobID uuid.UUID, limit int) ([]*JobExecutionHistory, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	history, exists := s.executionStore[jobID]
	if !exists {
		return []*JobExecutionHistory{}, nil
	}

	// 最新のものから返す
	start := len(history) - limit
	if start < 0 {
		start = 0
	}

	result := make([]*JobExecutionHistory, 0, limit)
	for i := len(history) - 1; i >= start; i-- {
		result = append(result, history[i])
	}

	return result, nil
}

// CleanupOldExecutions 古い実行履歴をクリーンアップ
func (s *jobSchedulerService) CleanupOldExecutions(ctx context.Context, daysToKeep int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().AddDate(0, 0, -daysToKeep)
	cleaned := 0

	for jobID, history := range s.executionStore {
		newHistory := make([]*JobExecutionHistory, 0)
		for _, exec := range history {
			if exec.StartedAt.After(cutoff) {
				newHistory = append(newHistory, exec)
			} else {
				cleaned++
			}
		}
		s.executionStore[jobID] = newHistory
	}

	s.logger.Info("Cleaned up old executions", zap.Int("cleaned", cleaned))
	return nil
}

// scheduleJob ジョブをスケジュールに登録（内部メソッド）
func (s *jobSchedulerService) scheduleJob(job *model.ScheduledJob) error {
	// ハンドラーの存在確認
	if _, exists := s.handlers[job.JobType]; !exists {
		return fmt.Errorf("ジョブタイプ %s のハンドラーが登録されていません", job.JobType)
	}

	// cron式でジョブを登録
	entryID, err := s.scheduler.AddFunc(job.CronExpression, func() {
		ctx := context.Background()
		if err := s.ExecuteJob(ctx, job.ID); err != nil {
			s.logger.Error("Scheduled job execution failed",
				zap.String("job_id", job.ID.String()),
				zap.String("job_name", job.JobName),
				zap.Error(err))
		}

		// 次回実行時刻を更新
		job.NextRunAt = s.calculateNextRunTime(job.CronExpression)
		if err := s.jobRepo.Update(ctx, job); err != nil {
			s.logger.Error("Failed to update next run time", zap.Error(err))
		}
	})

	if err != nil {
		return err
	}

	s.mu.Lock()
	s.activeJobs[job.ID] = entryID
	s.mu.Unlock()

	return nil
}

// unscheduleJob ジョブをスケジュールから削除（内部メソッド）
func (s *jobSchedulerService) unscheduleJob(jobID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, exists := s.activeJobs[jobID]; exists {
		s.scheduler.Remove(entryID)
		delete(s.activeJobs, jobID)
	}
}

// calculateNextRunTime 次回実行時刻を計算（内部メソッド）
func (s *jobSchedulerService) calculateNextRunTime(cronExpression string) *time.Time {
	schedule, err := cron.ParseStandard(cronExpression)
	if err != nil {
		return nil
	}

	next := schedule.Next(time.Now())
	return &next
}

// recordExecution 実行履歴を記録（内部メソッド）
func (s *jobSchedulerService) recordExecution(jobID uuid.UUID, execution *JobExecutionHistory) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.executionStore[jobID]; !exists {
		s.executionStore[jobID] = make([]*JobExecutionHistory, 0)
	}

	s.executionStore[jobID] = append(s.executionStore[jobID], execution)

	// 最大1000件まで保持
	if len(s.executionStore[jobID]) > 1000 {
		s.executionStore[jobID] = s.executionStore[jobID][1:]
	}
}
