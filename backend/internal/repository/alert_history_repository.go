package repository

import (
	"context"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AlertHistoryRepository アラート履歴リポジトリインターフェース
type AlertHistoryRepository interface {
	Create(ctx context.Context, alertHistory *model.AlertHistory) error
	CreateBatch(ctx context.Context, alertHistories []*model.AlertHistory) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.AlertHistory, error)
	GetList(ctx context.Context, filters dto.AlertFilters, page, limit int) ([]*model.AlertHistory, int64, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, handledBy uuid.UUID, comment string) error
	GetUnresolvedByUser(ctx context.Context, userID string) ([]*model.AlertHistory, error)
	GetSummary(ctx context.Context) (*dto.AlertSummaryDTO, error)
	GetRecentAlerts(ctx context.Context, limit int) ([]*model.AlertHistory, error)
}

type alertHistoryRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewAlertHistoryRepository アラート履歴リポジトリの作成
func NewAlertHistoryRepository(db *gorm.DB, logger *zap.Logger) AlertHistoryRepository {
	return &alertHistoryRepository{
		db:     db,
		logger: logger,
	}
}

// Create アラート履歴を作成
func (r *alertHistoryRepository) Create(ctx context.Context, alertHistory *model.AlertHistory) error {
	if err := r.db.WithContext(ctx).Create(alertHistory).Error; err != nil {
		r.logger.Error("Failed to create alert history",
			zap.Error(err),
			zap.String("user_id", alertHistory.UserID),
			zap.String("alert_type", string(alertHistory.AlertType)))
		return err
	}

	r.logger.Info("Alert history created successfully",
		zap.String("id", alertHistory.ID.String()),
		zap.String("user_id", alertHistory.UserID),
		zap.String("alert_type", string(alertHistory.AlertType)))

	return nil
}

// CreateBatch アラート履歴を一括作成
func (r *alertHistoryRepository) CreateBatch(ctx context.Context, alertHistories []*model.AlertHistory) error {
	if len(alertHistories) == 0 {
		return nil
	}

	if err := r.db.WithContext(ctx).CreateInBatches(alertHistories, 100).Error; err != nil {
		r.logger.Error("Failed to create alert histories batch",
			zap.Error(err),
			zap.Int("count", len(alertHistories)))
		return err
	}

	r.logger.Info("Alert histories batch created successfully",
		zap.Int("count", len(alertHistories)))

	return nil
}

// GetByID IDでアラート履歴を取得
func (r *alertHistoryRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.AlertHistory, error) {
	var alertHistory model.AlertHistory

	err := r.db.WithContext(ctx).
		Preload("AlertSetting").
		Preload("User").
		Preload("WeeklyReport").
		Preload("Handler").
		Where("id = ?", id).
		First(&alertHistory).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get alert history",
			zap.Error(err),
			zap.String("id", id.String()))
		return nil, err
	}

	return &alertHistory, nil
}

// GetList アラート履歴一覧を取得
func (r *alertHistoryRepository) GetList(ctx context.Context, filters dto.AlertFilters, page, limit int) ([]*model.AlertHistory, int64, error) {
	var alertHistories []*model.AlertHistory
	var total int64

	query := r.db.WithContext(ctx).Model(&model.AlertHistory{})

	// フィルター適用
	if filters.Status != "" && filters.Status != "all" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.Severity != "" && filters.Severity != "all" {
		query = query.Where("severity = ?", filters.Severity)
	}
	if filters.AlertType != "" && filters.AlertType != "all" {
		query = query.Where("alert_type = ?", filters.AlertType)
	}
	if filters.UserID != "" {
		query = query.Where("user_id = ?", filters.UserID)
	}
	if filters.DateFrom != "" {
		query = query.Where("created_at >= ?", filters.DateFrom)
	}
	if filters.DateTo != "" {
		query = query.Where("created_at <= ?", filters.DateTo)
	}

	// 総件数を取得
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count alert histories", zap.Error(err))
		return nil, 0, err
	}

	// データを取得
	offset := (page - 1) * limit
	err := query.
		Preload("AlertSetting").
		Preload("User").
		Preload("WeeklyReport").
		Preload("Handler").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&alertHistories).Error

	if err != nil {
		r.logger.Error("Failed to get alert histories list", zap.Error(err))
		return nil, 0, err
	}

	return alertHistories, total, nil
}

// UpdateStatus アラートステータスを更新
func (r *alertHistoryRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, handledBy uuid.UUID, comment string) error {
	updates := map[string]interface{}{
		"status":             status,
		"handled_by":         handledBy,
		"handled_at":         gorm.Expr("NOW()"),
		"resolution_comment": comment,
	}

	result := r.db.WithContext(ctx).
		Model(&model.AlertHistory{}).
		Where("id = ?", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update alert status",
			zap.Error(result.Error),
			zap.String("id", id.String()),
			zap.String("status", status))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	r.logger.Info("Alert status updated successfully",
		zap.String("id", id.String()),
		zap.String("status", status),
		zap.String("handled_by", handledBy.String()))

	return nil
}

// GetUnresolvedByUser ユーザーの未解決アラートを取得
func (r *alertHistoryRepository) GetUnresolvedByUser(ctx context.Context, userID string) ([]*model.AlertHistory, error) {
	var alertHistories []*model.AlertHistory

	err := r.db.WithContext(ctx).
		Preload("AlertSetting").
		Where("user_id = ? AND status != ?", userID, model.AlertStatusResolved).
		Order("created_at DESC").
		Find(&alertHistories).Error

	if err != nil {
		r.logger.Error("Failed to get unresolved alerts by user",
			zap.Error(err),
			zap.String("user_id", userID))
		return nil, err
	}

	return alertHistories, nil
}

// GetSummary アラートサマリーを取得
func (r *alertHistoryRepository) GetSummary(ctx context.Context) (*dto.AlertSummaryDTO, error) {
	var summary dto.AlertSummaryDTO

	// 総アラート数
	if err := r.db.WithContext(ctx).Model(&model.AlertHistory{}).Count(&summary.TotalAlerts).Error; err != nil {
		return nil, err
	}

	// ステータス別集計
	if err := r.db.WithContext(ctx).Model(&model.AlertHistory{}).
		Where("status = ?", model.AlertStatusUnhandled).
		Count(&summary.UnhandledAlerts).Error; err != nil {
		return nil, err
	}

	if err := r.db.WithContext(ctx).Model(&model.AlertHistory{}).
		Where("status = ?", model.AlertStatusHandling).
		Count(&summary.HandlingAlerts).Error; err != nil {
		return nil, err
	}

	if err := r.db.WithContext(ctx).Model(&model.AlertHistory{}).
		Where("status = ?", model.AlertStatusResolved).
		Count(&summary.ResolvedAlerts).Error; err != nil {
		return nil, err
	}

	// 重要度別集計
	var severityResults []struct {
		Severity string
		Count    int64
	}
	if err := r.db.WithContext(ctx).Model(&model.AlertHistory{}).
		Select("severity, COUNT(*) as count").
		Group("severity").
		Scan(&severityResults).Error; err != nil {
		return nil, err
	}

	summary.SeverityBreakdown = make(map[string]int64)
	for _, result := range severityResults {
		summary.SeverityBreakdown[result.Severity] = result.Count
	}

	// タイプ別集計
	var typeResults []struct {
		AlertType string
		Count     int64
	}
	if err := r.db.WithContext(ctx).Model(&model.AlertHistory{}).
		Select("alert_type, COUNT(*) as count").
		Group("alert_type").
		Scan(&typeResults).Error; err != nil {
		return nil, err
	}

	summary.TypeBreakdown = make(map[string]int64)
	for _, result := range typeResults {
		summary.TypeBreakdown[result.AlertType] = result.Count
	}

	// 最近のアラート
	recentAlerts, err := r.GetRecentAlerts(ctx, 5)
	if err != nil {
		return nil, err
	}

	for _, alert := range recentAlerts {
		summary.RecentAlerts = append(summary.RecentAlerts, *dto.ToAlertHistoryDTO(alert))
	}

	return &summary, nil
}

// GetRecentAlerts 最近のアラートを取得
func (r *alertHistoryRepository) GetRecentAlerts(ctx context.Context, limit int) ([]*model.AlertHistory, error) {
	var alertHistories []*model.AlertHistory

	err := r.db.WithContext(ctx).
		Preload("AlertSetting").
		Preload("User").
		Preload("WeeklyReport").
		Preload("Handler").
		Order("created_at DESC").
		Limit(limit).
		Find(&alertHistories).Error

	if err != nil {
		r.logger.Error("Failed to get recent alerts", zap.Error(err))
		return nil, err
	}

	return alertHistories, nil
}
