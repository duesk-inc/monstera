package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// VirusScanLogRepository ウイルススキャンログリポジトリのインターフェース
type VirusScanLogRepository interface {
	Create(ctx context.Context, log *model.VirusScanLog) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.VirusScanLog, error)
	GetByFileID(ctx context.Context, fileID uuid.UUID) (*model.VirusScanLog, error)
	Update(ctx context.Context, log *model.VirusScanLog) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *VirusScanLogFilter) ([]*model.VirusScanLog, int64, error)
	GetQuarantinedFiles(ctx context.Context, limit int) ([]*model.VirusScanLog, error)
	GetStatistics(ctx context.Context, from, to time.Time) (*model.VirusScanStatistics, error)
	GetTopThreats(ctx context.Context, limit int, days int) ([]*model.VirusThreat, error)
	MarkAsQuarantined(ctx context.Context, id uuid.UUID) error
	PermanentlyDelete(ctx context.Context, id uuid.UUID) error
}

// VirusScanLogFilter ウイルススキャンログのフィルター
type VirusScanLogFilter struct {
	UserID       *uuid.UUID
	ScanStatus   *string
	VirusName    *string
	ResourceType *string
	ResourceID   *uuid.UUID
	From         *time.Time
	To           *time.Time
	Page         int
	Limit        int
}

// virusScanLogRepository ウイルススキャンログリポジトリの実装
type virusScanLogRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewVirusScanLogRepository ウイルススキャンログリポジトリのインスタンスを生成
func NewVirusScanLogRepository(db *gorm.DB, logger *zap.Logger) VirusScanLogRepository {
	return &virusScanLogRepository{
		db:     db,
		logger: logger,
	}
}

// Create ウイルススキャンログを作成
func (r *virusScanLogRepository) Create(ctx context.Context, log *model.VirusScanLog) error {
	if err := r.db.WithContext(ctx).Create(log).Error; err != nil {
		r.logger.Error("Failed to create virus scan log",
			zap.Error(err),
			zap.String("file_id", log.FileID.String()))
		return err
	}
	return nil
}

// GetByID IDでウイルススキャンログを取得
func (r *virusScanLogRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.VirusScanLog, error) {
	var log model.VirusScanLog
	if err := r.db.WithContext(ctx).First(&log, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get virus scan log by ID",
			zap.Error(err),
			zap.String("id", id.String()))
		return nil, err
	}
	return &log, nil
}

// GetByFileID ファイルIDでウイルススキャンログを取得
func (r *virusScanLogRepository) GetByFileID(ctx context.Context, fileID uuid.UUID) (*model.VirusScanLog, error) {
	var log model.VirusScanLog
	if err := r.db.WithContext(ctx).
		Where("file_id = ?", fileID).
		Order("created_at DESC").
		First(&log).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get virus scan log by file ID",
			zap.Error(err),
			zap.String("file_id", fileID.String()))
		return nil, err
	}
	return &log, nil
}

// Update ウイルススキャンログを更新
func (r *virusScanLogRepository) Update(ctx context.Context, log *model.VirusScanLog) error {
	if err := r.db.WithContext(ctx).Save(log).Error; err != nil {
		r.logger.Error("Failed to update virus scan log",
			zap.Error(err),
			zap.String("id", log.ID.String()))
		return err
	}
	return nil
}

// Delete ウイルススキャンログを削除（ソフトデリート）
func (r *virusScanLogRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).Delete(&model.VirusScanLog{}, "id = ?", id).Error; err != nil {
		r.logger.Error("Failed to delete virus scan log",
			zap.Error(err),
			zap.String("id", id.String()))
		return err
	}
	return nil
}

// List フィルター条件でウイルススキャンログ一覧を取得
func (r *virusScanLogRepository) List(ctx context.Context, filter *VirusScanLogFilter) ([]*model.VirusScanLog, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.VirusScanLog{})

	// フィルター適用
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.ScanStatus != nil {
		query = query.Where("scan_status = ?", *filter.ScanStatus)
	}
	if filter.VirusName != nil {
		query = query.Where("virus_name LIKE ?", "%"+*filter.VirusName+"%")
	}
	if filter.ResourceType != nil {
		query = query.Where("resource_type = ?", *filter.ResourceType)
	}
	if filter.ResourceID != nil {
		query = query.Where("resource_id = ?", *filter.ResourceID)
	}
	if filter.From != nil {
		query = query.Where("created_at >= ?", *filter.From)
	}
	if filter.To != nil {
		query = query.Where("created_at <= ?", *filter.To)
	}

	// 総数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count virus scan logs", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
		if filter.Page > 0 {
			offset := (filter.Page - 1) * filter.Limit
			query = query.Offset(offset)
		}
	}

	// ソート
	query = query.Order("created_at DESC")

	// データ取得
	var logs []*model.VirusScanLog
	if err := query.Find(&logs).Error; err != nil {
		r.logger.Error("Failed to list virus scan logs", zap.Error(err))
		return nil, 0, err
	}

	return logs, total, nil
}

// GetQuarantinedFiles 隔離されたファイル一覧を取得
func (r *virusScanLogRepository) GetQuarantinedFiles(ctx context.Context, limit int) ([]*model.VirusScanLog, error) {
	var logs []*model.VirusScanLog
	query := r.db.WithContext(ctx).
		Where("scan_status = ?", model.ScanStatusQuarantined).
		Order("quarantined_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		r.logger.Error("Failed to get quarantined files", zap.Error(err))
		return nil, err
	}

	return logs, nil
}

// GetStatistics 統計情報を取得
func (r *virusScanLogRepository) GetStatistics(ctx context.Context, from, to time.Time) (*model.VirusScanStatistics, error) {
	var stats model.VirusScanStatistics

	// 基本クエリ
	baseQuery := r.db.WithContext(ctx).Model(&model.VirusScanLog{}).
		Where("created_at BETWEEN ? AND ?", from, to)

	// 総スキャン数
	if err := baseQuery.Count(&stats.TotalScans).Error; err != nil {
		return nil, err
	}

	// ステータス別カウント
	type statusCount struct {
		ScanStatus string
		Count      int64
	}

	var counts []statusCount
	if err := baseQuery.
		Select("scan_status, COUNT(*) as count").
		Group("scan_status").
		Scan(&counts).Error; err != nil {
		return nil, err
	}

	for _, c := range counts {
		switch c.ScanStatus {
		case string(model.ScanStatusClean):
			stats.CleanFiles = c.Count
		case string(model.ScanStatusInfected):
			stats.InfectedFiles = c.Count
		case string(model.ScanStatusError):
			stats.ErrorScans = c.Count
		case string(model.ScanStatusQuarantined):
			stats.QuarantinedFiles = c.Count
		}
	}

	return &stats, nil
}

// GetTopThreats トップ脅威を取得
func (r *virusScanLogRepository) GetTopThreats(ctx context.Context, limit int, days int) ([]*model.VirusThreat, error) {
	since := time.Now().AddDate(0, 0, -days)

	var threats []*model.VirusThreat

	query := `
		SELECT 
			virus_name,
			COUNT(*) as total_count,
			MIN(created_at) as first_seen,
			MAX(created_at) as last_seen
		FROM virus_scan_logs
		WHERE scan_status = 'infected'
			AND virus_name IS NOT NULL
			AND created_at >= ?
		GROUP BY virus_name
		ORDER BY total_count DESC
		LIMIT ?
	`

	rows, err := r.db.WithContext(ctx).Raw(query, since, limit).Rows()
	if err != nil {
		r.logger.Error("Failed to get top threats", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var threat model.VirusThreat
		if err := rows.Scan(&threat.VirusName, &threat.TotalCount, &threat.FirstSeen, &threat.LastSeen); err != nil {
			r.logger.Error("Failed to scan threat row", zap.Error(err))
			continue
		}

		// 脅威レベルを設定（件数に基づいて）
		switch {
		case threat.TotalCount >= 100:
			threat.ThreatLevel = "critical"
		case threat.TotalCount >= 50:
			threat.ThreatLevel = "high"
		case threat.TotalCount >= 10:
			threat.ThreatLevel = "medium"
		default:
			threat.ThreatLevel = "low"
		}

		threats = append(threats, &threat)
	}

	return threats, nil
}

// MarkAsQuarantined ファイルを隔離済みとしてマーク
func (r *virusScanLogRepository) MarkAsQuarantined(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	if err := r.db.WithContext(ctx).
		Model(&model.VirusScanLog{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"scan_status":    model.ScanStatusQuarantined,
			"quarantined_at": now,
		}).Error; err != nil {
		r.logger.Error("Failed to mark as quarantined",
			zap.Error(err),
			zap.String("id", id.String()))
		return err
	}
	return nil
}

// PermanentlyDelete 完全削除
func (r *virusScanLogRepository) PermanentlyDelete(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).
		Unscoped().
		Delete(&model.VirusScanLog{}, "id = ?", id).Error; err != nil {
		r.logger.Error("Failed to permanently delete virus scan log",
			zap.Error(err),
			zap.String("id", id.String()))
		return err
	}
	return nil
}
