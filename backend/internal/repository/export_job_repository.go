package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
)

// ExportJobRepository エクスポートジョブリポジトリのインターフェース
type ExportJobRepository interface {
	// Create エクスポートジョブを作成
	Create(ctx context.Context, job *model.ExportJob) error
	// GetByID IDでエクスポートジョブを取得
	GetByID(ctx context.Context, id uuid.UUID) (*model.ExportJob, error)
	// GetByUserID ユーザーIDでエクスポートジョブ一覧を取得
	GetByUserID(ctx context.Context, userID string, limit int) ([]model.ExportJob, error)
	// UpdateStatus ジョブのステータスを更新
	UpdateStatus(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	// GetExpiredJobs 期限切れジョブを取得
	GetExpiredJobs(ctx context.Context) ([]model.ExportJob, error)
	// DeleteExpiredJobs 期限切れジョブを削除
	DeleteExpiredJobs(ctx context.Context) error
	// GetPendingJobs 処理待ちジョブを取得
	GetPendingJobs(ctx context.Context, limit int) ([]model.ExportJob, error)
	// GetProcessingJobs 処理中ジョブを取得
	GetProcessingJobs(ctx context.Context) ([]model.ExportJob, error)
}

type exportJobRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewExportJobRepository エクスポートジョブリポジトリを生成
func NewExportJobRepository(db *gorm.DB, logger *zap.Logger) ExportJobRepository {
	return &exportJobRepository{
		db:     db,
		logger: logger,
	}
}

// Create エクスポートジョブを作成
func (r *exportJobRepository) Create(ctx context.Context, job *model.ExportJob) error {
	if err := r.db.WithContext(ctx).Create(job).Error; err != nil {
		r.logger.Error("Failed to create export job",
			zap.String("user_id", job.UserID),
			zap.String("job_type", string(job.JobType)),
			zap.Error(err),
		)
		return err
	}
	return nil
}

// GetByID IDでエクスポートジョブを取得
func (r *exportJobRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ExportJob, error) {
	var job model.ExportJob
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&job).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get export job by ID",
			zap.String("job_id", id.String()),
			zap.Error(err),
		)
		return nil, err
	}

	return &job, nil
}

// GetByUserID ユーザーIDでエクスポートジョブ一覧を取得
func (r *exportJobRepository) GetByUserID(ctx context.Context, userID string, limit int) ([]model.ExportJob, error) {
	var jobs []model.ExportJob
	query := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&jobs).Error; err != nil {
		r.logger.Error("Failed to get export jobs by user ID",
			zap.String("user_id", userID),
			zap.Error(err),
		)
		return nil, err
	}

	return jobs, nil
}

// UpdateStatus ジョブのステータスを更新
func (r *exportJobRepository) UpdateStatus(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	// updated_atを追加
	updates["updated_at"] = time.Now()

	result := r.db.WithContext(ctx).
		Model(&model.ExportJob{}).
		Where("id = ?", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update export job status",
			zap.String("job_id", id.String()),
			zap.Any("updates", updates),
			zap.Error(result.Error),
		)
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// GetExpiredJobs 期限切れジョブを取得
func (r *exportJobRepository) GetExpiredJobs(ctx context.Context) ([]model.ExportJob, error) {
	var jobs []model.ExportJob
	err := r.db.WithContext(ctx).
		Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).
		Where("status = ?", model.ExportJobStatusCompleted).
		Find(&jobs).Error

	if err != nil {
		r.logger.Error("Failed to get expired jobs", zap.Error(err))
		return nil, err
	}

	return jobs, nil
}

// DeleteExpiredJobs 期限切れジョブを削除
func (r *exportJobRepository) DeleteExpiredJobs(ctx context.Context) error {
	result := r.db.WithContext(ctx).
		Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).
		Where("status = ?", model.ExportJobStatusCompleted).
		Delete(&model.ExportJob{})

	if result.Error != nil {
		r.logger.Error("Failed to delete expired jobs", zap.Error(result.Error))
		return result.Error
	}

	r.logger.Info("Deleted expired export jobs", zap.Int64("count", result.RowsAffected))
	return nil
}

// GetPendingJobs 処理待ちジョブを取得
func (r *exportJobRepository) GetPendingJobs(ctx context.Context, limit int) ([]model.ExportJob, error) {
	var jobs []model.ExportJob
	query := r.db.WithContext(ctx).
		Where("status = ?", model.ExportJobStatusPending).
		Order("created_at ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&jobs).Error; err != nil {
		r.logger.Error("Failed to get pending jobs", zap.Error(err))
		return nil, err
	}

	return jobs, nil
}

// GetProcessingJobs 処理中ジョブを取得
func (r *exportJobRepository) GetProcessingJobs(ctx context.Context) ([]model.ExportJob, error) {
	var jobs []model.ExportJob
	err := r.db.WithContext(ctx).
		Where("status = ?", model.ExportJobStatusProcessing).
		Find(&jobs).Error

	if err != nil {
		r.logger.Error("Failed to get processing jobs", zap.Error(err))
		return nil, err
	}

	return jobs, nil
}

// GetStaleProcessingJobs 古い処理中ジョブを取得（タイムアウト処理用）
func (r *exportJobRepository) GetStaleProcessingJobs(ctx context.Context, timeout time.Duration) ([]model.ExportJob, error) {
	var jobs []model.ExportJob
	cutoffTime := time.Now().Add(-timeout)

	err := r.db.WithContext(ctx).
		Where("status = ?", model.ExportJobStatusProcessing).
		Where("started_at IS NOT NULL AND started_at < ?", cutoffTime).
		Find(&jobs).Error

	if err != nil {
		r.logger.Error("Failed to get stale processing jobs", zap.Error(err))
		return nil, err
	}

	return jobs, nil
}

// CountJobsByStatus ステータス別のジョブ数を取得
func (r *exportJobRepository) CountJobsByStatus(ctx context.Context, userID *string) (map[model.ExportJobStatus]int64, error) {
	type statusCount struct {
		Status model.ExportJobStatus
		Count  int64
	}

	var counts []statusCount
	query := r.db.WithContext(ctx).
		Model(&model.ExportJob{}).
		Select("status, COUNT(*) as count").
		Group("status")

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if err := query.Find(&counts).Error; err != nil {
		r.logger.Error("Failed to count jobs by status", zap.Error(err))
		return nil, err
	}

	result := make(map[model.ExportJobStatus]int64)
	for _, c := range counts {
		result[c.Status] = c.Count
	}

	return result, nil
}
