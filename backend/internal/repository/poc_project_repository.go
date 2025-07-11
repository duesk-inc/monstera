package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// PocProjectRepository POCプロジェクトリポジトリのインターフェース
type PocProjectRepository interface {
	Create(ctx context.Context, project *model.PocProject) error
	GetByID(ctx context.Context, id string) (*model.PocProject, error)
	GetByExternalID(ctx context.Context, externalID string) (*model.PocProject, error)
	GetList(ctx context.Context, filter PocProjectFilter) ([]model.PocProject, int64, error)
	Update(ctx context.Context, project *model.PocProject) error
	UpdateSyncStatus(ctx context.Context, id string, status model.PocSyncStatus, errorMsg string) error
	Delete(ctx context.Context, id string) error
	GetPendingSync(ctx context.Context) ([]model.PocProject, error)
	GetRecentlySynced(ctx context.Context, hours int) ([]model.PocProject, error)
}

// PocProjectFilter POCプロジェクトフィルター
type PocProjectFilter struct {
	Status     string
	SyncStatus model.PocSyncStatus
	Page       int
	Limit      int
}

// pocProjectRepository POCプロジェクトリポジトリの実装
type pocProjectRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewPocProjectRepository POCプロジェクトリポジトリのインスタンスを生成
func NewPocProjectRepository(baseRepo BaseRepository) PocProjectRepository {
	return &pocProjectRepository{
		db:     baseRepo.GetDB(),
		logger: baseRepo.GetLogger(),
	}
}

// Create POCプロジェクトを作成
func (r *pocProjectRepository) Create(ctx context.Context, project *model.PocProject) error {
	if err := r.db.WithContext(ctx).Create(project).Error; err != nil {
		r.logger.Error("Failed to create POC project", zap.Error(err))
		return err
	}
	return nil
}

// GetByID POCプロジェクトをIDで取得
func (r *pocProjectRepository) GetByID(ctx context.Context, id string) (*model.PocProject, error) {
	var project model.PocProject
	if err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get POC project by ID", zap.Error(err), zap.String("id", id))
		return nil, err
	}
	return &project, nil
}

// GetByExternalID 外部IDでPOCプロジェクトを取得
func (r *pocProjectRepository) GetByExternalID(ctx context.Context, externalID string) (*model.PocProject, error) {
	var project model.PocProject
	if err := r.db.WithContext(ctx).
		Where("external_id = ?", externalID).
		First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get POC project by external ID", zap.Error(err), zap.String("external_id", externalID))
		return nil, err
	}
	return &project, nil
}

// GetList POCプロジェクト一覧を取得
func (r *pocProjectRepository) GetList(ctx context.Context, filter PocProjectFilter) ([]model.PocProject, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.PocProject{})

	// フィルター条件
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.SyncStatus != "" {
		query = query.Where("sync_status = ?", filter.SyncStatus)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count POC projects", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// データを取得
	var projects []model.PocProject
	if err := query.Order("created_at DESC").Find(&projects).Error; err != nil {
		r.logger.Error("Failed to get POC projects", zap.Error(err))
		return nil, 0, err
	}

	return projects, total, nil
}

// Update POCプロジェクトを更新
func (r *pocProjectRepository) Update(ctx context.Context, project *model.PocProject) error {
	if err := r.db.WithContext(ctx).Save(project).Error; err != nil {
		r.logger.Error("Failed to update POC project", zap.Error(err))
		return err
	}
	return nil
}

// UpdateSyncStatus 同期ステータスを更新
func (r *pocProjectRepository) UpdateSyncStatus(ctx context.Context, id string, status model.PocSyncStatus, errorMsg string) error {
	updates := map[string]interface{}{
		"sync_status": status,
		"updated_at":  time.Now(),
	}

	if status == model.PocSyncStatusCompleted {
		updates["last_synced_at"] = time.Now()
		updates["sync_error"] = ""
	} else if status == model.PocSyncStatusFailed {
		updates["sync_error"] = errorMsg
	}

	result := r.db.WithContext(ctx).Model(&model.PocProject{}).
		Where("id = ?", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update sync status", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// Delete POCプロジェクトを削除
func (r *pocProjectRepository) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Delete(&model.PocProject{}, "id = ?", id)
	if result.Error != nil {
		r.logger.Error("Failed to delete POC project", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// GetPendingSync 同期待ちのPOCプロジェクトを取得
func (r *pocProjectRepository) GetPendingSync(ctx context.Context) ([]model.PocProject, error) {
	var projects []model.PocProject
	if err := r.db.WithContext(ctx).
		Where("sync_status = ?", model.PocSyncStatusPending).
		Find(&projects).Error; err != nil {
		r.logger.Error("Failed to get pending sync projects", zap.Error(err))
		return nil, err
	}
	return projects, nil
}

// GetRecentlySynced 最近同期されたPOCプロジェクトを取得
func (r *pocProjectRepository) GetRecentlySynced(ctx context.Context, hours int) ([]model.PocProject, error) {
	since := time.Now().Add(-time.Duration(hours) * time.Hour)
	var projects []model.PocProject
	if err := r.db.WithContext(ctx).
		Where("last_synced_at > ? AND sync_status = ?", since, model.PocSyncStatusCompleted).
		Order("last_synced_at DESC").
		Find(&projects).Error; err != nil {
		r.logger.Error("Failed to get recently synced projects", zap.Error(err))
		return nil, err
	}
	return projects, nil
}
