package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AuditLogRepository 監査ログリポジトリインターフェース
type AuditLogRepository interface {
	Create(ctx context.Context, auditLog *model.AuditLog) error
	GetByID(ctx context.Context, id string) (*model.AuditLog, error)
	GetByFilters(ctx context.Context, filters AuditLogFilters) ([]*model.AuditLog, int64, error)
	GetByUserID(ctx context.Context, userID string, limit int, offset int) ([]*model.AuditLog, error)
	GetByResourceID(ctx context.Context, resourceType model.ResourceType, resourceID string, limit int, offset int) ([]*model.AuditLog, error)
	DeleteOldLogs(ctx context.Context, retentionDays int) (int64, error)
	GetSuspiciousActivities(ctx context.Context, filters SuspiciousActivityFilters) ([]*SuspiciousActivity, error)
}

// AuditLogFilters 監査ログフィルター
type AuditLogFilters struct {
	UserID       *string    `json:"user_id"`
	Action       *string    `json:"action"`
	ResourceType *string    `json:"resource_type"`
	ResourceID   *string    `json:"resource_id"`
	Method       *string    `json:"method"`
	IPAddress    *string    `json:"ip_address"`
	StatusCode   *int       `json:"status_code"`
	MinDuration  *int64     `json:"min_duration"`
	MaxDuration  *int64     `json:"max_duration"`
	StartDate    *time.Time `json:"start_date"`
	EndDate      *time.Time `json:"end_date"`
	Limit        int        `json:"limit"`
	Offset       int        `json:"offset"`
}

// SuspiciousActivityFilters 不審なアクティビティフィルター
type SuspiciousActivityFilters struct {
	StartDate     *time.Time `json:"start_date"`
	EndDate       *time.Time `json:"end_date"`
	MinAttempts   int        `json:"min_attempts"`
	TimeWindowMin int        `json:"time_window_min"`
}

// SuspiciousActivity 不審なアクティビティ
type SuspiciousActivity struct {
	UserID       string    `json:"user_id"`
	IPAddress    string    `json:"ip_address"`
	Action       string    `json:"action"`
	AttemptCount int       `json:"attempt_count"`
	FirstAttempt time.Time `json:"first_attempt"`
	LastAttempt  time.Time `json:"last_attempt"`
	SuccessCount int       `json:"success_count"`
	FailureCount int       `json:"failure_count"`
}

// auditLogRepository 監査ログリポジトリ実装
type auditLogRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewAuditLogRepository 監査ログリポジトリの生成
func NewAuditLogRepository(db *gorm.DB, logger *zap.Logger) AuditLogRepository {
	return &auditLogRepository{
		db:     db,
		logger: logger,
	}
}

// Create 監査ログを作成
func (r *auditLogRepository) Create(ctx context.Context, auditLog *model.AuditLog) error {
	if err := r.db.WithContext(ctx).Create(auditLog).Error; err != nil {
		r.logger.Error("Failed to create audit log",
			zap.Error(err),
			zap.String("user_id", auditLog.UserID),
			zap.String("action", auditLog.Action),
			zap.String("resource_type", auditLog.ResourceType),
		)
		return err
	}

	r.logger.Debug("Audit log created",
		zap.String("id", auditLog.ID),
		zap.String("user_id", auditLog.UserID),
		zap.String("action", auditLog.Action),
		zap.String("resource_type", auditLog.ResourceType),
	)

	return nil
}

// GetByID IDで監査ログを取得
func (r *auditLogRepository) GetByID(ctx context.Context, id string) (*model.AuditLog, error) {
	var auditLog model.AuditLog
	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("id = ?", id).
		First(&auditLog).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get audit log by ID",
			zap.Error(err),
			zap.String("id", id),
		)
		return nil, err
	}

	return &auditLog, nil
}

// GetByFilters フィルターで監査ログを検索
func (r *auditLogRepository) GetByFilters(ctx context.Context, filters AuditLogFilters) ([]*model.AuditLog, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.AuditLog{})

	// フィルター適用
	query = r.applyFilters(query, filters)

	// 総件数取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count audit logs", zap.Error(err))
		return nil, 0, err
	}

	// データ取得
	var auditLogs []*model.AuditLog
	query = query.Preload("User").
		Order("created_at DESC").
		Limit(filters.Limit).
		Offset(filters.Offset)

	if err := query.Find(&auditLogs).Error; err != nil {
		r.logger.Error("Failed to get audit logs", zap.Error(err))
		return nil, 0, err
	}

	return auditLogs, total, nil
}

// GetByUserID ユーザーIDで監査ログを取得
func (r *auditLogRepository) GetByUserID(ctx context.Context, userID string, limit int, offset int) ([]*model.AuditLog, error) {
	var auditLogs []*model.AuditLog
	if err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&auditLogs).Error; err != nil {
		r.logger.Error("Failed to get audit logs by user ID",
			zap.Error(err),
			zap.String("user_id", userID),
		)
		return nil, err
	}

	return auditLogs, nil
}

// GetByResourceID リソースIDで監査ログを取得
func (r *auditLogRepository) GetByResourceID(ctx context.Context, resourceType model.ResourceType, resourceID string, limit int, offset int) ([]*model.AuditLog, error) {
	var auditLogs []*model.AuditLog
	if err := r.db.WithContext(ctx).
		Where("resource_type = ? AND resource_id = ?", string(resourceType), resourceID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&auditLogs).Error; err != nil {
		r.logger.Error("Failed to get audit logs by resource ID",
			zap.Error(err),
			zap.String("resource_type", string(resourceType)),
			zap.String("resource_id", resourceID),
		)
		return nil, err
	}

	return auditLogs, nil
}

// DeleteOldLogs 古い監査ログを削除
func (r *auditLogRepository) DeleteOldLogs(ctx context.Context, retentionDays int) (int64, error) {
	cutoffDate := time.Now().AddDate(0, 0, -retentionDays)

	result := r.db.WithContext(ctx).
		Where("created_at < ?", cutoffDate).
		Delete(&model.AuditLog{})

	if result.Error != nil {
		r.logger.Error("Failed to delete old audit logs",
			zap.Error(result.Error),
			zap.Int("retention_days", retentionDays),
		)
		return 0, result.Error
	}

	r.logger.Info("Deleted old audit logs",
		zap.Int64("deleted_count", result.RowsAffected),
		zap.Int("retention_days", retentionDays),
		zap.Time("cutoff_date", cutoffDate),
	)

	return result.RowsAffected, nil
}

// GetSuspiciousActivities 不審なアクティビティを検出
func (r *auditLogRepository) GetSuspiciousActivities(ctx context.Context, filters SuspiciousActivityFilters) ([]*SuspiciousActivity, error) {
	var activities []*SuspiciousActivity

	// timeWindow := time.Duration(filters.TimeWindowMin) * time.Minute
	startDate := filters.StartDate
	endDate := filters.EndDate

	if startDate == nil {
		t := time.Now().Add(-24 * time.Hour)
		startDate = &t
	}
	if endDate == nil {
		t := time.Now()
		endDate = &t
	}

	query := `
		SELECT 
			user_id,
			ip_address,
			action,
			COUNT(*) as attempt_count,
			MIN(created_at) as first_attempt,
			MAX(created_at) as last_attempt,
			SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as success_count,
			SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as failure_count
		FROM audit_logs 
		WHERE created_at BETWEEN ? AND ?
			AND action IN ('LOGIN', 'LOGIN_FAILED', 'USER_DELETE', 'PERMISSION_CHANGE')
		GROUP BY user_id, ip_address, action
		HAVING COUNT(*) >= ? 
			AND TIMESTAMPDIFF(MINUTE, MIN(created_at), MAX(created_at)) <= ?
		ORDER BY attempt_count DESC, failure_count DESC
	`

	if err := r.db.WithContext(ctx).Raw(query, startDate, endDate, filters.MinAttempts, filters.TimeWindowMin).
		Scan(&activities).Error; err != nil {
		r.logger.Error("Failed to get suspicious activities",
			zap.Error(err),
			zap.Time("start_date", *startDate),
			zap.Time("end_date", *endDate),
		)
		return nil, err
	}

	return activities, nil
}

// applyFilters クエリにフィルターを適用
func (r *auditLogRepository) applyFilters(query *gorm.DB, filters AuditLogFilters) *gorm.DB {
	if filters.UserID != nil {
		query = query.Where("user_id = ?", *filters.UserID)
	}
	if filters.Action != nil {
		query = query.Where("action = ?", *filters.Action)
	}
	if filters.ResourceType != nil {
		query = query.Where("resource_type = ?", *filters.ResourceType)
	}
	if filters.ResourceID != nil {
		query = query.Where("resource_id = ?", *filters.ResourceID)
	}
	if filters.Method != nil {
		query = query.Where("method = ?", *filters.Method)
	}
	if filters.IPAddress != nil {
		query = query.Where("ip_address = ?", *filters.IPAddress)
	}
	if filters.StatusCode != nil {
		query = query.Where("status_code = ?", *filters.StatusCode)
	}
	if filters.MinDuration != nil {
		query = query.Where("duration >= ?", *filters.MinDuration)
	}
	if filters.MaxDuration != nil {
		query = query.Where("duration <= ?", *filters.MaxDuration)
	}
	if filters.StartDate != nil {
		query = query.Where("created_at >= ?", *filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("created_at <= ?", *filters.EndDate)
	}

	return query
}
