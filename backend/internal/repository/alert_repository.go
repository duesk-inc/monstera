package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AlertRepository アラートリポジトリのインターフェース
type AlertRepository interface {
	// AlertSettings関連
	GetAlertSettings(ctx context.Context) (*model.AlertSettings, error)
	CreateAlertSettings(ctx context.Context, settings *model.AlertSettings) error
	UpdateAlertSettings(ctx context.Context, settings *model.AlertSettings) error

	// AlertHistory関連
	Create(ctx context.Context, alert *model.AlertHistory) error
	CreateBatch(ctx context.Context, alerts []model.AlertHistory) error
	GetByID(ctx context.Context, id string) (*model.AlertHistory, error)
	Update(ctx context.Context, alert *model.AlertHistory) error
	UpdateStatus(ctx context.Context, id string, status model.AlertStatus, resolvedBy *string, comment string) error

	// 検索・取得系
	GetAlerts(ctx context.Context, filters AlertFilters, offset, limit int) ([]*model.AlertHistory, int64, error)
	GetUnresolvedAlertsByUsers(ctx context.Context, userIDs []string) ([]*model.AlertHistory, error)
	GetAlertsByUser(ctx context.Context, userID string, status *model.AlertStatus) ([]*model.AlertHistory, error)
	GetAlertsByType(ctx context.Context, alertType model.AlertType) ([]*model.AlertHistory, error)

	// 統計・集計
	GetAlertStats(ctx context.Context, startDate, endDate time.Time) (*AlertStats, error)
	GetActiveAlertCount(ctx context.Context) (int64, error)
	GetAlertCountByUserAndType(ctx context.Context, userID string, alertType model.AlertType) (int64, error)
}

// AlertFilters アラート検索フィルタ
type AlertFilters struct {
	Status    *model.AlertStatus   `json:"status,omitempty"`
	Severity  *model.AlertSeverity `json:"severity,omitempty"`
	AlertType *model.AlertType     `json:"alert_type,omitempty"`
	UserID    *string              `json:"user_id,omitempty"`
	DateFrom  *time.Time           `json:"date_from,omitempty"`
	DateTo    *time.Time           `json:"date_to,omitempty"`
	SortBy    string               `json:"sort_by,omitempty"`
	SortOrder string               `json:"sort_order,omitempty"`
}

// AlertStats アラート統計情報
type AlertStats struct {
	TotalAlerts       int64                         `json:"total_alerts"`
	UnhandledAlerts   int64                         `json:"unhandled_alerts"`
	HandlingAlerts    int64                         `json:"handling_alerts"`
	ResolvedAlerts    int64                         `json:"resolved_alerts"`
	AlertsByType      map[model.AlertType]int64     `json:"alerts_by_type"`
	AlertsBySeverity  map[model.AlertSeverity]int64 `json:"alerts_by_severity"`
	AvgResolutionTime float64                       `json:"avg_resolution_time_hours"`
}

// alertRepository アラートリポジトリの実装
type alertRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewAlertRepository アラートリポジトリのインスタンスを生成
func NewAlertRepository(db *gorm.DB, logger *zap.Logger) AlertRepository {
	return &alertRepository{
		db:     db,
		logger: logger,
	}
}

// GetAlertSettings アラート設定を取得
func (r *alertRepository) GetAlertSettings(ctx context.Context) (*model.AlertSettings, error) {
	var settings model.AlertSettings

	// システム全体で1レコードのみ
	err := r.db.WithContext(ctx).
		Preload("UpdatedByUser").
		First(&settings).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get alert settings", zap.Error(err))
		return nil, err
	}

	return &settings, nil
}

// CreateAlertSettings アラート設定を作成
func (r *alertRepository) CreateAlertSettings(ctx context.Context, settings *model.AlertSettings) error {
	if settings.ID == "" {
		settings.ID = uuid.New().String()
	}

	if err := r.db.WithContext(ctx).Create(settings).Error; err != nil {
		r.logger.Error("Failed to create alert settings", zap.Error(err))
		return err
	}

	return nil
}

// UpdateAlertSettings アラート設定を更新
func (r *alertRepository) UpdateAlertSettings(ctx context.Context, settings *model.AlertSettings) error {
	result := r.db.WithContext(ctx).
		Model(&model.AlertSettings{}).
		Where("id = ?", settings.ID).
		Updates(map[string]interface{}{
			"weekly_hours_limit":             settings.WeeklyHoursLimit,
			"weekly_hours_change_limit":      settings.WeeklyHoursChangeLimit,
			"consecutive_holiday_work_limit": settings.ConsecutiveHolidayWorkLimit,
			"monthly_overtime_limit":         settings.MonthlyOvertimeLimit,
			"updated_by":                     settings.UpdatedBy,
			"updated_at":                     time.Now(),
		})

	if result.Error != nil {
		r.logger.Error("Failed to update alert settings",
			zap.String("id", settings.ID),
			zap.Error(result.Error))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// Create アラート履歴を作成
func (r *alertRepository) Create(ctx context.Context, alert *model.AlertHistory) error {
	if alert.ID == "" {
		alert.ID = uuid.New().String()
	}

	// JSON形式のデータを確実に保存
	if alert.DetectedValue == nil {
		alert.DetectedValue = json.RawMessage("{}")
	}
	if alert.ThresholdValue == nil {
		alert.ThresholdValue = json.RawMessage("{}")
	}

	if err := r.db.WithContext(ctx).Create(alert).Error; err != nil {
		r.logger.Error("Failed to create alert history",
			zap.String("user_id", alert.UserID),
			zap.String("type", string(alert.AlertType)),
			zap.Error(err))
		return err
	}

	return nil
}

// CreateBatch 複数のアラート履歴を一括作成
func (r *alertRepository) CreateBatch(ctx context.Context, alerts []model.AlertHistory) error {
	if len(alerts) == 0 {
		return nil
	}

	// UUIDとデフォルト値を設定
	for i := range alerts {
		if alerts[i].ID == "" {
			alerts[i].ID = uuid.New().String()
		}
		if alerts[i].DetectedValue == nil {
			alerts[i].DetectedValue = json.RawMessage("{}")
		}
		if alerts[i].ThresholdValue == nil {
			alerts[i].ThresholdValue = json.RawMessage("{}")
		}
		if alerts[i].Status == "" {
			alerts[i].Status = model.AlertStatusUnhandled
		}
	}

	// バッチサイズを100に制限して挿入
	batchSize := 100
	for i := 0; i < len(alerts); i += batchSize {
		end := i + batchSize
		if end > len(alerts) {
			end = len(alerts)
		}

		if err := r.db.WithContext(ctx).CreateInBatches(alerts[i:end], batchSize).Error; err != nil {
			r.logger.Error("Failed to create alert history batch",
				zap.Int("batch_start", i),
				zap.Int("batch_end", end),
				zap.Error(err))
			return err
		}
	}

	r.logger.Info("Successfully created alert history batch",
		zap.Int("total_count", len(alerts)))

	return nil
}

// GetByID IDでアラート履歴を取得
func (r *alertRepository) GetByID(ctx context.Context, id string) (*model.AlertHistory, error) {
	var alert model.AlertHistory

	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("WeeklyReport").
		Preload("ResolvedByUser").
		First(&alert, "id = ?", id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get alert history by ID",
			zap.String("id", id),
			zap.Error(err))
		return nil, err
	}

	return &alert, nil
}

// Update アラート履歴を更新
func (r *alertRepository) Update(ctx context.Context, alert *model.AlertHistory) error {
	if err := r.db.WithContext(ctx).Save(alert).Error; err != nil {
		r.logger.Error("Failed to update alert history",
			zap.String("id", alert.ID),
			zap.Error(err))
		return err
	}

	return nil
}

// UpdateStatus アラートのステータスを更新
func (r *alertRepository) UpdateStatus(ctx context.Context, id string, status model.AlertStatus, resolvedBy *string, comment string) error {
	updates := map[string]interface{}{
		"status": status,
	}

	if status == model.AlertStatusResolved {
		now := time.Now()
		updates["resolved_at"] = now
		if resolvedBy != nil {
			updates["resolved_by"] = *resolvedBy
		}
		if comment != "" {
			updates["resolution_comment"] = comment
		}
	}

	result := r.db.WithContext(ctx).
		Model(&model.AlertHistory{}).
		Where("id = ?", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update alert status",
			zap.String("id", id),
			zap.String("status", string(status)),
			zap.Error(result.Error))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// GetAlerts フィルタ条件でアラート履歴を取得
func (r *alertRepository) GetAlerts(ctx context.Context, filters AlertFilters, offset, limit int) ([]*model.AlertHistory, int64, error) {
	var alerts []*model.AlertHistory
	var total int64

	query := r.db.WithContext(ctx).Model(&model.AlertHistory{})

	// フィルタ適用
	query = r.applyAlertFilters(query, filters)

	// 総件数を取得
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count alerts", zap.Error(err))
		return nil, 0, err
	}

	// ソート適用
	sortBy := filters.SortBy
	if sortBy == "" {
		sortBy = "created_at"
	}
	sortOrder := filters.SortOrder
	if sortOrder == "" {
		sortOrder = "DESC"
	}
	query = query.Order(sortBy + " " + sortOrder)

	// データ取得
	err := query.
		Preload("User").
		Preload("WeeklyReport").
		Preload("ResolvedByUser").
		Offset(offset).
		Limit(limit).
		Find(&alerts).Error

	if err != nil {
		r.logger.Error("Failed to get alerts", zap.Error(err))
		return nil, 0, err
	}

	return alerts, total, nil
}

// GetUnresolvedAlertsByUsers ユーザー別未解決アラートを取得
func (r *alertRepository) GetUnresolvedAlertsByUsers(ctx context.Context, userIDs []string) ([]*model.AlertHistory, error) {
	if len(userIDs) == 0 {
		return []*model.AlertHistory{}, nil
	}

	var alerts []*model.AlertHistory

	err := r.db.WithContext(ctx).
		Where("user_id IN ? AND status != ?", userIDs, model.AlertStatusResolved).
		Order("created_at DESC").
		Find(&alerts).Error

	if err != nil {
		r.logger.Error("Failed to get unresolved alerts by users",
			zap.Int("user_count", len(userIDs)),
			zap.Error(err))
		return nil, err
	}

	return alerts, nil
}

// GetAlertsByUser ユーザーのアラートを取得
func (r *alertRepository) GetAlertsByUser(ctx context.Context, userID string, status *model.AlertStatus) ([]*model.AlertHistory, error) {
	var alerts []*model.AlertHistory

	query := r.db.WithContext(ctx).Where("user_id = ?", userID)

	if status != nil {
		query = query.Where("status = ?", *status)
	}

	err := query.
		Order("created_at DESC").
		Preload("WeeklyReport").
		Find(&alerts).Error

	if err != nil {
		r.logger.Error("Failed to get alerts by user",
			zap.String("user_id", userID),
			zap.Error(err))
		return nil, err
	}

	return alerts, nil
}

// GetAlertsByType タイプ別アラートを取得
func (r *alertRepository) GetAlertsByType(ctx context.Context, alertType model.AlertType) ([]*model.AlertHistory, error) {
	var alerts []*model.AlertHistory

	err := r.db.WithContext(ctx).
		Where("alert_type = ?", alertType).
		Order("created_at DESC").
		Preload("User").
		Preload("WeeklyReport").
		Find(&alerts).Error

	if err != nil {
		r.logger.Error("Failed to get alerts by type",
			zap.String("type", string(alertType)),
			zap.Error(err))
		return nil, err
	}

	return alerts, nil
}

// GetAlertStats アラート統計を取得
func (r *alertRepository) GetAlertStats(ctx context.Context, startDate, endDate time.Time) (*AlertStats, error) {
	stats := &AlertStats{
		AlertsByType:     make(map[model.AlertType]int64),
		AlertsBySeverity: make(map[model.AlertSeverity]int64),
	}

	// 期間内の総アラート数
	if err := r.db.WithContext(ctx).
		Model(&model.AlertHistory{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&stats.TotalAlerts).Error; err != nil {
		return nil, err
	}

	// ステータス別カウント
	var statusCounts []struct {
		Status model.AlertStatus `gorm:"column:status"`
		Count  int64             `gorm:"column:count"`
	}

	if err := r.db.WithContext(ctx).
		Model(&model.AlertHistory{}).
		Select("status, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Group("status").
		Find(&statusCounts).Error; err != nil {
		return nil, err
	}

	for _, sc := range statusCounts {
		switch sc.Status {
		case model.AlertStatusUnhandled:
			stats.UnhandledAlerts = sc.Count
		case model.AlertStatusHandling:
			stats.HandlingAlerts = sc.Count
		case model.AlertStatusResolved:
			stats.ResolvedAlerts = sc.Count
		}
	}

	// タイプ別カウント
	var typeCounts []struct {
		Type  model.AlertType `gorm:"column:alert_type"`
		Count int64           `gorm:"column:count"`
	}

	if err := r.db.WithContext(ctx).
		Model(&model.AlertHistory{}).
		Select("alert_type, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Group("alert_type").
		Find(&typeCounts).Error; err != nil {
		return nil, err
	}

	for _, tc := range typeCounts {
		stats.AlertsByType[tc.Type] = tc.Count
	}

	// 深刻度別カウント
	var severityCounts []struct {
		Severity model.AlertSeverity `gorm:"column:severity"`
		Count    int64               `gorm:"column:count"`
	}

	if err := r.db.WithContext(ctx).
		Model(&model.AlertHistory{}).
		Select("severity, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Group("severity").
		Find(&severityCounts).Error; err != nil {
		return nil, err
	}

	for _, sc := range severityCounts {
		stats.AlertsBySeverity[sc.Severity] = sc.Count
	}

	// 平均解決時間を計算（時間単位）
	var avgResolutionTime struct {
		AvgHours float64 `gorm:"column:avg_hours"`
	}

	err := r.db.WithContext(ctx).
		Model(&model.AlertHistory{}).
		Select("AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours").
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Where("status = ? AND resolved_at IS NOT NULL", model.AlertStatusResolved).
		Scan(&avgResolutionTime).Error

	if err == nil {
		stats.AvgResolutionTime = avgResolutionTime.AvgHours
	}

	return stats, nil
}

// GetActiveAlertCount アクティブなアラート数を取得
func (r *alertRepository) GetActiveAlertCount(ctx context.Context) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&model.AlertHistory{}).
		Where("status IN ?", []model.AlertStatus{model.AlertStatusUnhandled, model.AlertStatusHandling}).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to get active alert count", zap.Error(err))
		return 0, err
	}

	return count, nil
}

// GetAlertCountByUserAndType ユーザーとタイプ別のアラート数を取得
func (r *alertRepository) GetAlertCountByUserAndType(ctx context.Context, userID string, alertType model.AlertType) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&model.AlertHistory{}).
		Where("user_id = ? AND alert_type = ?", userID, alertType).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to get alert count by user and type",
			zap.String("user_id", userID),
			zap.String("type", string(alertType)),
			zap.Error(err))
		return 0, err
	}

	return count, nil
}

// applyAlertFilters フィルタ条件を適用
func (r *alertRepository) applyAlertFilters(query *gorm.DB, filters AlertFilters) *gorm.DB {
	if filters.Status != nil {
		query = query.Where("status = ?", *filters.Status)
	}

	if filters.Severity != nil {
		query = query.Where("severity = ?", *filters.Severity)
	}

	if filters.AlertType != nil {
		query = query.Where("alert_type = ?", *filters.AlertType)
	}

	if filters.UserID != nil {
		query = query.Where("user_id = ?", *filters.UserID)
	}

	if filters.DateFrom != nil {
		query = query.Where("created_at >= ?", *filters.DateFrom)
	}

	if filters.DateTo != nil {
		query = query.Where("created_at <= ?", *filters.DateTo)
	}

	return query
}
