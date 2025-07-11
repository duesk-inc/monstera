package service

import (
	"context"
	"encoding/json"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExportService エクスポートサービスのインターフェース
type ExportService interface {
	// エクスポートジョブ管理
	CreateExportJob(ctx context.Context, userID uuid.UUID, jobType model.ExportJobType, format model.ExportJobFormat, parameters json.RawMessage) (*model.ExportJob, error)
	ProcessExportJob(ctx context.Context, jobID uuid.UUID) error
	GetExportJob(ctx context.Context, jobID uuid.UUID) (*model.ExportJob, error)

	// 既存メソッド
	ExportData(ctx context.Context) error
}

// exportService エクスポートサービスの実装
type exportService struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewExportService エクスポートサービスのインスタンスを生成
func NewExportService(db *gorm.DB, logger *zap.Logger) ExportService {
	return &exportService{
		db:     db,
		logger: logger,
	}
}

// CreateExportJob エクスポートジョブを作成
func (s *exportService) CreateExportJob(ctx context.Context, userID uuid.UUID, jobType model.ExportJobType, format model.ExportJobFormat, parameters json.RawMessage) (*model.ExportJob, error) {
	job := &model.ExportJob{
		UserID:     userID,
		JobType:    jobType,
		Format:     format,
		Status:     model.ExportJobStatusPending,
		Parameters: parameters,
	}

	if err := s.db.WithContext(ctx).Create(job).Error; err != nil {
		s.logger.Error("Failed to create export job", zap.Error(err))
		return nil, err
	}

	return job, nil
}

// ProcessExportJob エクスポートジョブを処理
func (s *exportService) ProcessExportJob(ctx context.Context, jobID uuid.UUID) error {
	// TODO: 実際のエクスポート処理を実装
	// 暫定的にステータスを更新するのみ
	if err := s.db.WithContext(ctx).Model(&model.ExportJob{}).
		Where("id = ?", jobID).
		Updates(map[string]interface{}{
			"status": model.ExportJobStatusCompleted,
		}).Error; err != nil {
		s.logger.Error("Failed to update export job status", zap.Error(err))
		return err
	}

	return nil
}

// GetExportJob エクスポートジョブを取得
func (s *exportService) GetExportJob(ctx context.Context, jobID uuid.UUID) (*model.ExportJob, error) {
	var job model.ExportJob
	if err := s.db.WithContext(ctx).First(&job, "id = ?", jobID).Error; err != nil {
		s.logger.Error("Failed to get export job", zap.Error(err))
		return nil, err
	}

	return &job, nil
}

// ExportData データをエクスポート（暫定実装）
func (s *exportService) ExportData(ctx context.Context) error {
	// TODO: 実際の実装
	return nil
}
