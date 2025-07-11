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

// FreeSyncLogRepositoryInterface freee同期ログリポジトリインターフェース
type FreeSyncLogRepositoryInterface interface {
	// 同期ログCRUD
	Create(ctx context.Context, log *model.FreeSyncLog) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.FreeSyncLog, error)
	Update(ctx context.Context, log *model.FreeSyncLog) error

	// 同期ログ検索
	List(ctx context.Context, syncType *model.FreeSyncType, status *model.FreeSyncStatus, limit, offset int) ([]*model.FreeSyncLog, error)
	ListByTargetID(ctx context.Context, targetID uuid.UUID, limit, offset int) ([]*model.FreeSyncLog, error)
	ListByFreeeID(ctx context.Context, freeeID int, syncType model.FreeSyncType) ([]*model.FreeSyncLog, error)
	ListRecent(ctx context.Context, limit int) ([]*model.FreeSyncLog, error)
	Count(ctx context.Context, syncType *model.FreeSyncType, status *model.FreeSyncStatus) (int64, error)

	// 同期状態管理
	GetLatestByTarget(ctx context.Context, targetID uuid.UUID, syncType model.FreeSyncType) (*model.FreeSyncLog, error)
	GetPendingLogs(ctx context.Context, syncType *model.FreeSyncType, limit int) ([]*model.FreeSyncLog, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status model.FreeSyncStatus, errorMessage *string) error

	// 統計情報
	GetSummaryByType(ctx context.Context, startDate, endDate *time.Time) ([]*model.FreeSyncLogSummary, error)
	GetStats(ctx context.Context) (*model.FreeSyncLogStats, error)
	GetFailureRate(ctx context.Context, syncType *model.FreeSyncType, days int) (float64, error)

	// 一括操作
	CreateBatch(ctx context.Context, logs []*model.FreeSyncLog) error
	DeleteOldLogs(ctx context.Context, beforeDate time.Time) (int64, error)
	RetryFailedLogs(ctx context.Context, syncType *model.FreeSyncType, limit int) ([]*model.FreeSyncLog, error)
}

// freeSyncLogRepository freee同期ログリポジトリ実装
type freeSyncLogRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewFreeSyncLogRepository freee同期ログリポジトリのコンストラクタ
func NewFreeSyncLogRepository(db *gorm.DB, logger *zap.Logger) FreeSyncLogRepositoryInterface {
	return &freeSyncLogRepository{
		db:     db,
		logger: logger,
	}
}

// Create 同期ログを作成
func (r *freeSyncLogRepository) Create(ctx context.Context, log *model.FreeSyncLog) error {
	if err := r.db.WithContext(ctx).Create(log).Error; err != nil {
		r.logger.Error("Failed to create freee sync log", zap.Error(err))
		return fmt.Errorf("同期ログの作成に失敗しました: %w", err)
	}
	return nil
}

// GetByID IDで同期ログを取得
func (r *freeSyncLogRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.FreeSyncLog, error) {
	var log model.FreeSyncLog
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&log).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get freee sync log by ID", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("同期ログの取得に失敗しました: %w", err)
	}

	return &log, nil
}

// Update 同期ログを更新
func (r *freeSyncLogRepository) Update(ctx context.Context, log *model.FreeSyncLog) error {
	result := r.db.WithContext(ctx).
		Model(log).
		Where("id = ?", log.ID).
		Updates(log)

	if result.Error != nil {
		r.logger.Error("Failed to update freee sync log", zap.Error(result.Error), zap.String("id", log.ID.String()))
		return fmt.Errorf("同期ログの更新に失敗しました: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("同期ログが見つかりません")
	}

	return nil
}

// List 同期ログ一覧を取得
func (r *freeSyncLogRepository) List(ctx context.Context, syncType *model.FreeSyncType, status *model.FreeSyncStatus, limit, offset int) ([]*model.FreeSyncLog, error) {
	var logs []*model.FreeSyncLog
	query := r.db.WithContext(ctx)

	if syncType != nil {
		query = query.Where("sync_type = ?", *syncType)
	}
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error

	if err != nil {
		r.logger.Error("Failed to list freee sync logs", zap.Error(err))
		return nil, fmt.Errorf("同期ログ一覧の取得に失敗しました: %w", err)
	}

	return logs, nil
}

// ListByTargetID ターゲットIDで同期ログを取得
func (r *freeSyncLogRepository) ListByTargetID(ctx context.Context, targetID uuid.UUID, limit, offset int) ([]*model.FreeSyncLog, error) {
	var logs []*model.FreeSyncLog
	err := r.db.WithContext(ctx).
		Where("target_id = ?", targetID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error

	if err != nil {
		r.logger.Error("Failed to list freee sync logs by target ID", zap.Error(err))
		return nil, fmt.Errorf("ターゲットIDによる同期ログの取得に失敗しました: %w", err)
	}

	return logs, nil
}

// ListByFreeeID freee IDで同期ログを取得
func (r *freeSyncLogRepository) ListByFreeeID(ctx context.Context, freeeID int, syncType model.FreeSyncType) ([]*model.FreeSyncLog, error) {
	var logs []*model.FreeSyncLog
	err := r.db.WithContext(ctx).
		Where("freee_id = ? AND sync_type = ?", freeeID, syncType).
		Order("created_at DESC").
		Find(&logs).Error

	if err != nil {
		r.logger.Error("Failed to list freee sync logs by freee ID", zap.Error(err))
		return nil, fmt.Errorf("freee IDによる同期ログの取得に失敗しました: %w", err)
	}

	return logs, nil
}

// ListRecent 最近の同期ログを取得
func (r *freeSyncLogRepository) ListRecent(ctx context.Context, limit int) ([]*model.FreeSyncLog, error) {
	var logs []*model.FreeSyncLog
	err := r.db.WithContext(ctx).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error

	if err != nil {
		r.logger.Error("Failed to list recent freee sync logs", zap.Error(err))
		return nil, fmt.Errorf("最近の同期ログの取得に失敗しました: %w", err)
	}

	return logs, nil
}

// Count 同期ログ数を取得
func (r *freeSyncLogRepository) Count(ctx context.Context, syncType *model.FreeSyncType, status *model.FreeSyncStatus) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&model.FreeSyncLog{})

	if syncType != nil {
		query = query.Where("sync_type = ?", *syncType)
	}
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	err := query.Count(&count).Error
	if err != nil {
		r.logger.Error("Failed to count freee sync logs", zap.Error(err))
		return 0, fmt.Errorf("同期ログ数の取得に失敗しました: %w", err)
	}

	return count, nil
}

// GetLatestByTarget ターゲットの最新同期ログを取得
func (r *freeSyncLogRepository) GetLatestByTarget(ctx context.Context, targetID uuid.UUID, syncType model.FreeSyncType) (*model.FreeSyncLog, error) {
	var log model.FreeSyncLog
	err := r.db.WithContext(ctx).
		Where("target_id = ? AND sync_type = ?", targetID, syncType).
		Order("created_at DESC").
		First(&log).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get latest sync log by target", zap.Error(err))
		return nil, fmt.Errorf("最新同期ログの取得に失敗しました: %w", err)
	}

	return &log, nil
}

// GetPendingLogs 処理中の同期ログを取得
func (r *freeSyncLogRepository) GetPendingLogs(ctx context.Context, syncType *model.FreeSyncType, limit int) ([]*model.FreeSyncLog, error) {
	var logs []*model.FreeSyncLog
	query := r.db.WithContext(ctx).
		Where("status = ?", model.FreeSyncStatusPending)

	if syncType != nil {
		query = query.Where("sync_type = ?", *syncType)
	}

	err := query.
		Order("created_at ASC").
		Limit(limit).
		Find(&logs).Error

	if err != nil {
		r.logger.Error("Failed to get pending sync logs", zap.Error(err))
		return nil, fmt.Errorf("処理中同期ログの取得に失敗しました: %w", err)
	}

	return logs, nil
}

// UpdateStatus 同期ログのステータスを更新
func (r *freeSyncLogRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status model.FreeSyncStatus, errorMessage *string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if errorMessage != nil {
		updates["error_message"] = *errorMessage
	}

	result := r.db.WithContext(ctx).
		Model(&model.FreeSyncLog{}).
		Where("id = ?", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update sync log status", zap.Error(result.Error))
		return fmt.Errorf("同期ログステータスの更新に失敗しました: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("同期ログが見つかりません")
	}

	return nil
}

// GetSummaryByType タイプ別のサマリーを取得
func (r *freeSyncLogRepository) GetSummaryByType(ctx context.Context, startDate, endDate *time.Time) ([]*model.FreeSyncLogSummary, error) {
	var summaries []*model.FreeSyncLogSummary

	query := r.db.WithContext(ctx).
		Model(&model.FreeSyncLog{}).
		Select(`
			sync_type,
			COUNT(*) as total_count,
			SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as success_count,
			SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as failed_count,
			SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending_count,
			MAX(created_at) as last_sync_at
		`, model.FreeSyncStatusSuccess, model.FreeSyncStatusFailed, model.FreeSyncStatusPending).
		Group("sync_type")

	if startDate != nil && endDate != nil {
		query = query.Where("created_at BETWEEN ? AND ?", *startDate, *endDate)
	}

	err := query.Scan(&summaries).Error
	if err != nil {
		r.logger.Error("Failed to get sync log summary by type", zap.Error(err))
		return nil, fmt.Errorf("タイプ別サマリーの取得に失敗しました: %w", err)
	}

	return summaries, nil
}

// GetStats 統計情報を取得
func (r *freeSyncLogRepository) GetStats(ctx context.Context) (*model.FreeSyncLogStats, error) {
	stats := &model.FreeSyncLogStats{}

	// 総同期数
	var totalSyncs int64
	if err := r.db.WithContext(ctx).
		Model(&model.FreeSyncLog{}).
		Count(&totalSyncs).Error; err != nil {
		return nil, fmt.Errorf("総同期数の取得に失敗しました: %w", err)
	}
	stats.TotalSyncs = int(totalSyncs)

	// 成功率
	var successCount int64
	if err := r.db.WithContext(ctx).
		Model(&model.FreeSyncLog{}).
		Where("status = ?", model.FreeSyncStatusSuccess).
		Count(&successCount).Error; err != nil {
		return nil, fmt.Errorf("成功数の取得に失敗しました: %w", err)
	}

	if totalSyncs > 0 {
		stats.SuccessRate = float64(successCount) / float64(totalSyncs) * 100
	}

	// 今日の同期数
	today := time.Now().Truncate(24 * time.Hour)
	var todaysSyncs int64
	if err := r.db.WithContext(ctx).
		Model(&model.FreeSyncLog{}).
		Where("created_at >= ?", today).
		Count(&todaysSyncs).Error; err != nil {
		return nil, fmt.Errorf("今日の同期数の取得に失敗しました: %w", err)
	}
	stats.TodaysSyncs = int(todaysSyncs)

	// 最近の失敗数（24時間以内）
	yesterday := time.Now().Add(-24 * time.Hour)
	var recentFailures int64
	if err := r.db.WithContext(ctx).
		Model(&model.FreeSyncLog{}).
		Where("status = ? AND created_at >= ?", model.FreeSyncStatusFailed, yesterday).
		Count(&recentFailures).Error; err != nil {
		return nil, fmt.Errorf("最近の失敗数の取得に失敗しました: %w", err)
	}
	stats.RecentFailures = int(recentFailures)

	// 最終成功同期
	var lastSuccess model.FreeSyncLog
	if err := r.db.WithContext(ctx).
		Where("status = ?", model.FreeSyncStatusSuccess).
		Order("created_at DESC").
		First(&lastSuccess).Error; err == nil {
		stats.LastSuccessSync = &lastSuccess.CreatedAt
	}

	// 最終失敗同期
	var lastFailed model.FreeSyncLog
	if err := r.db.WithContext(ctx).
		Where("status = ?", model.FreeSyncStatusFailed).
		Order("created_at DESC").
		First(&lastFailed).Error; err == nil {
		stats.LastFailedSync = &lastFailed.CreatedAt
	}

	return stats, nil
}

// GetFailureRate 失敗率を取得
func (r *freeSyncLogRepository) GetFailureRate(ctx context.Context, syncType *model.FreeSyncType, days int) (float64, error) {
	since := time.Now().AddDate(0, 0, -days)

	query := r.db.WithContext(ctx).
		Model(&model.FreeSyncLog{}).
		Where("created_at >= ?", since)

	if syncType != nil {
		query = query.Where("sync_type = ?", *syncType)
	}

	var totalCount, failedCount int64

	if err := query.Count(&totalCount).Error; err != nil {
		return 0, fmt.Errorf("総数の取得に失敗しました: %w", err)
	}

	if err := query.Where("status = ?", model.FreeSyncStatusFailed).Count(&failedCount).Error; err != nil {
		return 0, fmt.Errorf("失敗数の取得に失敗しました: %w", err)
	}

	if totalCount == 0 {
		return 0, nil
	}

	return float64(failedCount) / float64(totalCount) * 100, nil
}

// CreateBatch 同期ログを一括作成
func (r *freeSyncLogRepository) CreateBatch(ctx context.Context, logs []*model.FreeSyncLog) error {
	if len(logs) == 0 {
		return nil
	}

	// バッチサイズを100に制限
	batchSize := 100
	for i := 0; i < len(logs); i += batchSize {
		end := i + batchSize
		if end > len(logs) {
			end = len(logs)
		}

		if err := r.db.WithContext(ctx).CreateInBatches(logs[i:end], batchSize).Error; err != nil {
			r.logger.Error("Failed to create sync logs in batch", zap.Error(err))
			return fmt.Errorf("同期ログの一括作成に失敗しました: %w", err)
		}
	}

	return nil
}

// DeleteOldLogs 古い同期ログを削除
func (r *freeSyncLogRepository) DeleteOldLogs(ctx context.Context, beforeDate time.Time) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("created_at < ?", beforeDate).
		Delete(&model.FreeSyncLog{})

	if result.Error != nil {
		r.logger.Error("Failed to delete old sync logs", zap.Error(result.Error))
		return 0, fmt.Errorf("古い同期ログの削除に失敗しました: %w", result.Error)
	}

	return result.RowsAffected, nil
}

// RetryFailedLogs 失敗したログをリトライ対象として取得
func (r *freeSyncLogRepository) RetryFailedLogs(ctx context.Context, syncType *model.FreeSyncType, limit int) ([]*model.FreeSyncLog, error) {
	var logs []*model.FreeSyncLog

	// 24時間以内に失敗したログのみ対象
	since := time.Now().Add(-24 * time.Hour)

	query := r.db.WithContext(ctx).
		Where("status = ? AND created_at >= ?", model.FreeSyncStatusFailed, since)

	if syncType != nil {
		query = query.Where("sync_type = ?", *syncType)
	}

	// target_idでグループ化して最新のものだけ取得
	subQuery := r.db.
		Model(&model.FreeSyncLog{}).
		Select("MAX(id) as id").
		Where("status = ? AND created_at >= ?", model.FreeSyncStatusFailed, since).
		Group("target_id, sync_type")

	if syncType != nil {
		subQuery = subQuery.Where("sync_type = ?", *syncType)
	}

	err := query.
		Where("id IN (?)", subQuery).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error

	if err != nil {
		r.logger.Error("Failed to get failed logs for retry", zap.Error(err))
		return nil, fmt.Errorf("リトライ対象ログの取得に失敗しました: %w", err)
	}

	return logs, nil
}
