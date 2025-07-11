package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
)

// ScheduledJobRepositoryInterface スケジュールジョブリポジトリインターフェース
type ScheduledJobRepositoryInterface interface {
	// ジョブCRUD
	Create(ctx context.Context, job *model.ScheduledJob) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.ScheduledJob, error)
	Update(ctx context.Context, job *model.ScheduledJob) error
	Delete(ctx context.Context, id uuid.UUID) error

	// ジョブ検索
	List(ctx context.Context, jobType *model.ScheduledJobType, status *model.ScheduledJobStatus, limit, offset int) ([]*model.ScheduledJob, error)
	ListActive(ctx context.Context, jobType *model.ScheduledJobType) ([]*model.ScheduledJob, error)
	GetByName(ctx context.Context, jobName string) (*model.ScheduledJob, error)
	Count(ctx context.Context, jobType *model.ScheduledJobType, status *model.ScheduledJobStatus) (int64, error)

	// 実行管理
	GetDueJobs(ctx context.Context, now time.Time) ([]*model.ScheduledJob, error)
	UpdateLastRunAt(ctx context.Context, id uuid.UUID, lastRunAt time.Time, nextRunAt *time.Time) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status model.ScheduledJobStatus) error
	AddExecutionHistory(ctx context.Context, id uuid.UUID, status string, duration int64, errorMessage *string, resultSummary *string) error

	// 統計情報
	GetSummaryByType(ctx context.Context) ([]*model.ScheduledJobSummary, error)
	GetStats(ctx context.Context) (*model.ScheduledJobStats, error)
	GetExecutionHistory(ctx context.Context, jobID uuid.UUID, limit int) ([]model.ExecutionHistory, error)

	// バリデーション
	ExistsByID(ctx context.Context, id uuid.UUID) (bool, error)
	ExistsByName(ctx context.Context, name string, excludeID *uuid.UUID) (bool, error)
	CanExecute(ctx context.Context, id uuid.UUID) (bool, error)
}

// scheduledJobRepository スケジュールジョブリポジトリ実装
type scheduledJobRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewScheduledJobRepository スケジュールジョブリポジトリのコンストラクタ
func NewScheduledJobRepository(db *gorm.DB, logger *zap.Logger) ScheduledJobRepositoryInterface {
	return &scheduledJobRepository{
		db:     db,
		logger: logger,
	}
}

// Create スケジュールジョブを作成
func (r *scheduledJobRepository) Create(ctx context.Context, job *model.ScheduledJob) error {
	if err := r.db.WithContext(ctx).Create(job).Error; err != nil {
		r.logger.Error("Failed to create scheduled job", zap.Error(err))
		return fmt.Errorf("スケジュールジョブの作成に失敗しました: %w", err)
	}
	return nil
}

// GetByID IDでスケジュールジョブを取得
func (r *scheduledJobRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ScheduledJob, error) {
	var job model.ScheduledJob
	err := r.db.WithContext(ctx).
		Preload("Creator").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&job).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get scheduled job by ID", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("スケジュールジョブの取得に失敗しました: %w", err)
	}

	return &job, nil
}

// Update スケジュールジョブを更新
func (r *scheduledJobRepository) Update(ctx context.Context, job *model.ScheduledJob) error {
	result := r.db.WithContext(ctx).
		Model(job).
		Where("id = ? AND deleted_at IS NULL", job.ID).
		Updates(job)

	if result.Error != nil {
		r.logger.Error("Failed to update scheduled job", zap.Error(result.Error), zap.String("id", job.ID.String()))
		return fmt.Errorf("スケジュールジョブの更新に失敗しました: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("スケジュールジョブが見つかりません")
	}

	return nil
}

// Delete スケジュールジョブを論理削除
func (r *scheduledJobRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&model.ScheduledJob{})

	if result.Error != nil {
		r.logger.Error("Failed to delete scheduled job", zap.Error(result.Error), zap.String("id", id.String()))
		return fmt.Errorf("スケジュールジョブの削除に失敗しました: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("スケジュールジョブが見つかりません")
	}

	return nil
}

// List スケジュールジョブ一覧を取得
func (r *scheduledJobRepository) List(ctx context.Context, jobType *model.ScheduledJobType, status *model.ScheduledJobStatus, limit, offset int) ([]*model.ScheduledJob, error) {
	var jobs []*model.ScheduledJob
	query := r.db.WithContext(ctx).
		Preload("Creator").
		Where("deleted_at IS NULL")

	if jobType != nil {
		query = query.Where("job_type = ?", *jobType)
	}
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&jobs).Error

	if err != nil {
		r.logger.Error("Failed to list scheduled jobs", zap.Error(err))
		return nil, fmt.Errorf("スケジュールジョブ一覧の取得に失敗しました: %w", err)
	}

	return jobs, nil
}

// ListActive アクティブなスケジュールジョブを取得
func (r *scheduledJobRepository) ListActive(ctx context.Context, jobType *model.ScheduledJobType) ([]*model.ScheduledJob, error) {
	var jobs []*model.ScheduledJob
	query := r.db.WithContext(ctx).
		Where("status = ? AND deleted_at IS NULL", model.ScheduledJobStatusActive)

	if jobType != nil {
		query = query.Where("job_type = ?", *jobType)
	}

	err := query.
		Order("next_run_at ASC").
		Find(&jobs).Error

	if err != nil {
		r.logger.Error("Failed to list active scheduled jobs", zap.Error(err))
		return nil, fmt.Errorf("アクティブなスケジュールジョブの取得に失敗しました: %w", err)
	}

	return jobs, nil
}

// GetByName 名前でスケジュールジョブを取得
func (r *scheduledJobRepository) GetByName(ctx context.Context, jobName string) (*model.ScheduledJob, error) {
	var job model.ScheduledJob
	err := r.db.WithContext(ctx).
		Where("job_name = ? AND deleted_at IS NULL", jobName).
		First(&job).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get scheduled job by name", zap.Error(err), zap.String("name", jobName))
		return nil, fmt.Errorf("スケジュールジョブの取得に失敗しました: %w", err)
	}

	return &job, nil
}

// Count スケジュールジョブ数を取得
func (r *scheduledJobRepository) Count(ctx context.Context, jobType *model.ScheduledJobType, status *model.ScheduledJobStatus) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).
		Model(&model.ScheduledJob{}).
		Where("deleted_at IS NULL")

	if jobType != nil {
		query = query.Where("job_type = ?", *jobType)
	}
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	err := query.Count(&count).Error
	if err != nil {
		r.logger.Error("Failed to count scheduled jobs", zap.Error(err))
		return 0, fmt.Errorf("スケジュールジョブ数の取得に失敗しました: %w", err)
	}

	return count, nil
}

// GetDueJobs 実行予定のジョブを取得
func (r *scheduledJobRepository) GetDueJobs(ctx context.Context, now time.Time) ([]*model.ScheduledJob, error) {
	var jobs []*model.ScheduledJob
	err := r.db.WithContext(ctx).
		Where("status = ? AND next_run_at <= ? AND deleted_at IS NULL", model.ScheduledJobStatusActive, now).
		Order("next_run_at ASC").
		Find(&jobs).Error

	if err != nil {
		r.logger.Error("Failed to get due jobs", zap.Error(err))
		return nil, fmt.Errorf("実行予定ジョブの取得に失敗しました: %w", err)
	}

	return jobs, nil
}

// UpdateLastRunAt 最終実行時刻を更新
func (r *scheduledJobRepository) UpdateLastRunAt(ctx context.Context, id uuid.UUID, lastRunAt time.Time, nextRunAt *time.Time) error {
	updates := map[string]interface{}{
		"last_run_at": lastRunAt,
		"next_run_at": nextRunAt,
	}

	result := r.db.WithContext(ctx).
		Model(&model.ScheduledJob{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update last run at", zap.Error(result.Error))
		return fmt.Errorf("最終実行時刻の更新に失敗しました: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("スケジュールジョブが見つかりません")
	}

	return nil
}

// UpdateStatus ステータスを更新
func (r *scheduledJobRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status model.ScheduledJobStatus) error {
	result := r.db.WithContext(ctx).
		Model(&model.ScheduledJob{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("status", status)

	if result.Error != nil {
		r.logger.Error("Failed to update job status", zap.Error(result.Error))
		return fmt.Errorf("ジョブステータスの更新に失敗しました: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("スケジュールジョブが見つかりません")
	}

	return nil
}

// AddExecutionHistory 実行履歴を追加
func (r *scheduledJobRepository) AddExecutionHistory(ctx context.Context, id uuid.UUID, status string, duration int64, errorMessage *string, resultSummary *string) error {
	// トランザクション内で処理
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// ジョブを取得
		var job model.ScheduledJob
		if err := tx.Where("id = ? AND deleted_at IS NULL", id).First(&job).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("スケジュールジョブが見つかりません")
			}
			return fmt.Errorf("スケジュールジョブの取得に失敗しました: %w", err)
		}

		// 実行履歴を追加
		job.AddExecutionHistory(status, duration, errorMessage, resultSummary)

		// 更新
		if err := tx.Model(&job).Update("execution_log", job.ExecutionLog).Error; err != nil {
			return fmt.Errorf("実行履歴の更新に失敗しました: %w", err)
		}

		return nil
	})
}

// GetSummaryByType タイプ別のサマリーを取得
func (r *scheduledJobRepository) GetSummaryByType(ctx context.Context) ([]*model.ScheduledJobSummary, error) {
	var summaries []*model.ScheduledJobSummary

	// タイプ別の基本統計を取得
	err := r.db.WithContext(ctx).
		Model(&model.ScheduledJob{}).
		Select(`
			job_type,
			COUNT(*) as total_jobs,
			SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active_jobs,
			SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as running_jobs
		`, model.ScheduledJobStatusActive, model.ScheduledJobStatusRunning).
		Where("deleted_at IS NULL").
		Group("job_type").
		Scan(&summaries).Error

	if err != nil {
		r.logger.Error("Failed to get job summary by type", zap.Error(err))
		return nil, fmt.Errorf("タイプ別サマリーの取得に失敗しました: %w", err)
	}

	// 各タイプの実行統計を取得
	for _, summary := range summaries {
		var jobs []*model.ScheduledJob
		err := r.db.WithContext(ctx).
			Where("job_type = ? AND deleted_at IS NULL", summary.JobType).
			Find(&jobs).Error

		if err != nil {
			continue
		}

		// 実行統計を集計
		for _, job := range jobs {
			if job.ExecutionLog != nil {
				summary.TotalExecutions += job.ExecutionLog.TotalExecutions
				summary.SuccessfulRuns += job.ExecutionLog.SuccessfulRuns
				summary.FailedRuns += job.ExecutionLog.FailedRuns

				// 最終実行時刻
				if job.ExecutionLog.LastExecution != nil {
					if summary.LastExecution == nil || job.ExecutionLog.LastExecution.After(*summary.LastExecution) {
						summary.LastExecution = job.ExecutionLog.LastExecution
					}
				}
			}

			// 次回実行時刻
			if job.NextRunAt != nil && job.Status == model.ScheduledJobStatusActive {
				if summary.NextExecution == nil || job.NextRunAt.Before(*summary.NextExecution) {
					summary.NextExecution = job.NextRunAt
				}
			}
		}
	}

	return summaries, nil
}

// GetStats 統計情報を取得
func (r *scheduledJobRepository) GetStats(ctx context.Context) (*model.ScheduledJobStats, error) {
	stats := &model.ScheduledJobStats{}

	// 総ジョブ数
	var totalJobs int64
	if err := r.db.WithContext(ctx).
		Model(&model.ScheduledJob{}).
		Where("deleted_at IS NULL").
		Count(&totalJobs).Error; err != nil {
		return nil, fmt.Errorf("総ジョブ数の取得に失敗しました: %w", err)
	}
	stats.TotalJobs = int(totalJobs)

	// アクティブジョブ数
	var activeJobs int64
	if err := r.db.WithContext(ctx).
		Model(&model.ScheduledJob{}).
		Where("status = ? AND deleted_at IS NULL", model.ScheduledJobStatusActive).
		Count(&activeJobs).Error; err != nil {
		return nil, fmt.Errorf("アクティブジョブ数の取得に失敗しました: %w", err)
	}
	stats.ActiveJobs = int(activeJobs)

	// 実行中ジョブ数
	var runningJobs int64
	if err := r.db.WithContext(ctx).
		Model(&model.ScheduledJob{}).
		Where("status = ? AND deleted_at IS NULL", model.ScheduledJobStatusRunning).
		Count(&runningJobs).Error; err != nil {
		return nil, fmt.Errorf("実行中ジョブ数の取得に失敗しました: %w", err)
	}
	stats.RunningJobs = int(runningJobs)

	// 今日の実行数
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.AddDate(0, 0, 1)

	var jobs []*model.ScheduledJob
	if err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Find(&jobs).Error; err != nil {
		return nil, fmt.Errorf("ジョブの取得に失敗しました: %w", err)
	}

	// 統計を集計
	totalDuration := float64(0)
	totalExecutions := 0
	successfulExecutions := 0

	for _, job := range jobs {
		if job.ExecutionLog != nil {
			// 今日の実行をカウント
			for _, execution := range job.ExecutionLog.RecentExecutions {
				if execution.ExecutedAt.After(today) && execution.ExecutedAt.Before(tomorrow) {
					stats.TodaysRuns++
				}
			}

			// 全体の統計
			totalExecutions += job.ExecutionLog.TotalExecutions
			successfulExecutions += job.ExecutionLog.SuccessfulRuns
			totalDuration += job.ExecutionLog.AverageDuration * float64(job.ExecutionLog.TotalExecutions)
		}

		// 今後の実行予定数
		if job.Status == model.ScheduledJobStatusActive && job.NextRunAt != nil {
			nextDay := time.Now().AddDate(0, 0, 1)
			if job.NextRunAt.Before(nextDay) {
				stats.UpcomingRuns++
			}
		}
	}

	// 成功率
	if totalExecutions > 0 {
		stats.SuccessRate = float64(successfulExecutions) / float64(totalExecutions) * 100
		stats.AverageDuration = totalDuration / float64(totalExecutions)
	}

	return stats, nil
}

// GetExecutionHistory 実行履歴を取得
func (r *scheduledJobRepository) GetExecutionHistory(ctx context.Context, jobID uuid.UUID, limit int) ([]model.ExecutionHistory, error) {
	var job model.ScheduledJob
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", jobID).
		First(&job).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get job for execution history", zap.Error(err))
		return nil, fmt.Errorf("ジョブの取得に失敗しました: %w", err)
	}

	if job.ExecutionLog == nil || len(job.ExecutionLog.RecentExecutions) == 0 {
		return []model.ExecutionHistory{}, nil
	}

	// 指定された件数まで返す
	history := job.ExecutionLog.RecentExecutions
	if limit > 0 && len(history) > limit {
		history = history[:limit]
	}

	return history, nil
}

// ExistsByID IDでスケジュールジョブの存在を確認
func (r *scheduledJobRepository) ExistsByID(ctx context.Context, id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ScheduledJob{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check job existence", zap.Error(err))
		return false, fmt.Errorf("スケジュールジョブの確認に失敗しました: %w", err)
	}

	return count > 0, nil
}

// ExistsByName 名前でスケジュールジョブの存在を確認
func (r *scheduledJobRepository) ExistsByName(ctx context.Context, name string, excludeID *uuid.UUID) (bool, error) {
	var count int64
	query := r.db.WithContext(ctx).
		Model(&model.ScheduledJob{}).
		Where("job_name = ? AND deleted_at IS NULL", name)

	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}

	err := query.Count(&count).Error
	if err != nil {
		r.logger.Error("Failed to check job name existence", zap.Error(err))
		return false, fmt.Errorf("スケジュールジョブ名の確認に失敗しました: %w", err)
	}

	return count > 0, nil
}

// CanExecute ジョブが実行可能か確認
func (r *scheduledJobRepository) CanExecute(ctx context.Context, id uuid.UUID) (bool, error) {
	var job model.ScheduledJob
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&job).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil
		}
		r.logger.Error("Failed to check job executability", zap.Error(err))
		return false, fmt.Errorf("ジョブの確認に失敗しました: %w", err)
	}

	return job.CanRun(), nil
}
