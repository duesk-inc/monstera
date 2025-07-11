package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ArchiveRepository アーカイブリポジトリのインターフェース
type ArchiveRepository interface {
	// WeeklyReportArchive関連
	CreateWeeklyReportArchive(ctx context.Context, archive *model.WeeklyReportArchive) error
	GetWeeklyReportArchive(ctx context.Context, id uuid.UUID) (*model.WeeklyReportArchive, error)
	GetWeeklyReportArchives(ctx context.Context, filter model.ArchiveFilter) ([]model.WeeklyReportArchive, int64, error)
	GetWeeklyReportArchiveByOriginalID(ctx context.Context, originalID uuid.UUID) (*model.WeeklyReportArchive, error)

	// DailyRecordArchive関連
	CreateDailyRecordArchive(ctx context.Context, archive *model.DailyRecordArchive) error
	GetDailyRecordArchivesByWeeklyReport(ctx context.Context, weeklyReportArchiveID uuid.UUID) ([]model.DailyRecordArchive, error)

	// WorkHourArchive関連
	CreateWorkHourArchive(ctx context.Context, archive *model.WorkHourArchive) error
	GetWorkHourArchivesByWeeklyReport(ctx context.Context, weeklyReportArchiveID uuid.UUID) ([]model.WorkHourArchive, error)

	// ArchiveStatistics関連
	CreateArchiveStatistics(ctx context.Context, stats *model.ArchiveStatistics) error
	UpdateArchiveStatistics(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	GetArchiveStatistics(ctx context.Context, id uuid.UUID) (*model.ArchiveStatistics, error)
	GetArchiveStatisticsList(ctx context.Context, filter ArchiveStatisticsFilter) ([]model.ArchiveStatistics, int64, error)

	// バルク操作
	BulkCreateWeeklyReportArchives(ctx context.Context, archives []model.WeeklyReportArchive) error
	BulkCreateDailyRecordArchives(ctx context.Context, archives []model.DailyRecordArchive) error
	BulkCreateWorkHourArchives(ctx context.Context, archives []model.WorkHourArchive) error

	// サマリー・統計
	GetArchiveSummary(ctx context.Context, filter *model.ArchiveFilter) (*model.ArchiveSummary, error)
	GetArchiveStatsByFiscalYear(ctx context.Context, fiscalYear int) (map[string]interface{}, error)
	GetArchiveStatsByDepartment(ctx context.Context, departmentID *uuid.UUID) (map[string]interface{}, error)

	// 検索・フィルタリング
	SearchArchivedReports(ctx context.Context, query string, filter model.ArchiveFilter) ([]model.WeeklyReportArchive, int64, error)
	GetArchivedReportsByDateRange(ctx context.Context, startDate, endDate time.Time, userID *uuid.UUID) ([]model.WeeklyReportArchive, error)

	// クリーンアップ
	DeleteExpiredArchives(ctx context.Context, expirationDate time.Time) (int64, error)
	GetArchiveStorageSize(ctx context.Context) (int64, error)

	// ストアドプロシージャ呼び出し
	ExecuteArchiveWeeklyReports(ctx context.Context, params ArchiveWeeklyReportsParams) (*ArchiveWeeklyReportsResult, error)
	ExecuteCleanupExpiredArchives(ctx context.Context, retentionYears int, executedBy uuid.UUID) (*CleanupExpiredArchivesResult, error)
	ExecuteArchiveUserWeeklyReports(ctx context.Context, params ArchiveUserWeeklyReportsParams) (*ArchiveUserWeeklyReportsResult, error)
	ExecuteGenerateArchiveReport(ctx context.Context, fiscalYear *int, departmentID *uuid.UUID) (*ArchiveReportResult, error)
	ExecuteValidateArchiveIntegrity(ctx context.Context) (*ArchiveIntegrityResult, error)
}

type archiveRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewArchiveRepository アーカイブリポジトリを生成
func NewArchiveRepository(db *gorm.DB, logger *zap.Logger) ArchiveRepository {
	return &archiveRepository{
		db:     db,
		logger: logger,
	}
}

// CreateWeeklyReportArchive 週報アーカイブを作成
func (r *archiveRepository) CreateWeeklyReportArchive(ctx context.Context, archive *model.WeeklyReportArchive) error {
	if err := r.db.WithContext(ctx).Create(archive).Error; err != nil {
		r.logger.Error("Failed to create weekly report archive",
			zap.String("original_id", archive.OriginalID.String()),
			zap.Error(err))
		return err
	}
	return nil
}

// GetWeeklyReportArchive 週報アーカイブを取得
func (r *archiveRepository) GetWeeklyReportArchive(ctx context.Context, id uuid.UUID) (*model.WeeklyReportArchive, error) {
	var archive model.WeeklyReportArchive
	err := r.db.WithContext(ctx).
		Preload("DailyRecords").
		Preload("WorkHours").
		Preload("ArchivedByUser").
		First(&archive, "id = ?", id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get weekly report archive",
			zap.String("id", id.String()),
			zap.Error(err))
		return nil, err
	}

	return &archive, nil
}

// GetWeeklyReportArchives 週報アーカイブ一覧を取得
func (r *archiveRepository) GetWeeklyReportArchives(ctx context.Context, filter model.ArchiveFilter) ([]model.WeeklyReportArchive, int64, error) {
	var archives []model.WeeklyReportArchive
	var total int64

	query := r.db.WithContext(ctx).Model(&model.WeeklyReportArchive{})

	// フィルタ適用
	query = r.applyArchiveFilter(query, filter)

	// 総数を取得
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count weekly report archives", zap.Error(err))
		return nil, 0, err
	}

	// ソート
	orderBy := filter.OrderBy
	if orderBy == "" {
		orderBy = "archived_at"
	}
	orderDir := filter.OrderDir
	if orderDir == "" {
		orderDir = "DESC"
	}
	query = query.Order(fmt.Sprintf("%s %s", orderBy, orderDir))

	// ページネーション
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	// データ取得
	if err := query.Preload("ArchivedByUser").Find(&archives).Error; err != nil {
		r.logger.Error("Failed to get weekly report archives", zap.Error(err))
		return nil, 0, err
	}

	return archives, total, nil
}

// GetWeeklyReportArchiveByOriginalID 元IDで週報アーカイブを取得
func (r *archiveRepository) GetWeeklyReportArchiveByOriginalID(ctx context.Context, originalID uuid.UUID) (*model.WeeklyReportArchive, error) {
	var archive model.WeeklyReportArchive
	err := r.db.WithContext(ctx).
		Preload("DailyRecords").
		Preload("WorkHours").
		First(&archive, "original_id = ?", originalID).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get weekly report archive by original ID",
			zap.String("original_id", originalID.String()),
			zap.Error(err))
		return nil, err
	}

	return &archive, nil
}

// CreateDailyRecordArchive 日次記録アーカイブを作成
func (r *archiveRepository) CreateDailyRecordArchive(ctx context.Context, archive *model.DailyRecordArchive) error {
	if err := r.db.WithContext(ctx).Create(archive).Error; err != nil {
		r.logger.Error("Failed to create daily record archive",
			zap.String("original_id", archive.OriginalID.String()),
			zap.Error(err))
		return err
	}
	return nil
}

// GetDailyRecordArchivesByWeeklyReport 週報IDで日次記録アーカイブを取得
func (r *archiveRepository) GetDailyRecordArchivesByWeeklyReport(ctx context.Context, weeklyReportArchiveID uuid.UUID) ([]model.DailyRecordArchive, error) {
	var archives []model.DailyRecordArchive
	err := r.db.WithContext(ctx).
		Where("weekly_report_archive_id = ?", weeklyReportArchiveID).
		Order("record_date").
		Find(&archives).Error

	if err != nil {
		r.logger.Error("Failed to get daily record archives",
			zap.String("weekly_report_archive_id", weeklyReportArchiveID.String()),
			zap.Error(err))
		return nil, err
	}

	return archives, nil
}

// CreateWorkHourArchive 勤怠時間アーカイブを作成
func (r *archiveRepository) CreateWorkHourArchive(ctx context.Context, archive *model.WorkHourArchive) error {
	if err := r.db.WithContext(ctx).Create(archive).Error; err != nil {
		r.logger.Error("Failed to create work hour archive",
			zap.String("original_id", archive.OriginalID.String()),
			zap.Error(err))
		return err
	}
	return nil
}

// GetWorkHourArchivesByWeeklyReport 週報IDで勤怠時間アーカイブを取得
func (r *archiveRepository) GetWorkHourArchivesByWeeklyReport(ctx context.Context, weeklyReportArchiveID uuid.UUID) ([]model.WorkHourArchive, error) {
	var archives []model.WorkHourArchive
	err := r.db.WithContext(ctx).
		Where("weekly_report_archive_id = ?", weeklyReportArchiveID).
		Order("date").
		Find(&archives).Error

	if err != nil {
		r.logger.Error("Failed to get work hour archives",
			zap.String("weekly_report_archive_id", weeklyReportArchiveID.String()),
			zap.Error(err))
		return nil, err
	}

	return archives, nil
}

// CreateArchiveStatistics アーカイブ統計を作成
func (r *archiveRepository) CreateArchiveStatistics(ctx context.Context, stats *model.ArchiveStatistics) error {
	if err := r.db.WithContext(ctx).Create(stats).Error; err != nil {
		r.logger.Error("Failed to create archive statistics", zap.Error(err))
		return err
	}
	return nil
}

// UpdateArchiveStatistics アーカイブ統計を更新
func (r *archiveRepository) UpdateArchiveStatistics(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	updates["updated_at"] = time.Now()

	result := r.db.WithContext(ctx).
		Model(&model.ArchiveStatistics{}).
		Where("id = ?", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update archive statistics",
			zap.String("id", id.String()),
			zap.Error(result.Error))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// GetArchiveStatistics アーカイブ統計を取得
func (r *archiveRepository) GetArchiveStatistics(ctx context.Context, id uuid.UUID) (*model.ArchiveStatistics, error) {
	var stats model.ArchiveStatistics
	err := r.db.WithContext(ctx).
		Preload("ExecutedByUser").
		First(&stats, "id = ?", id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get archive statistics",
			zap.String("id", id.String()),
			zap.Error(err))
		return nil, err
	}

	return &stats, nil
}

// ArchiveStatisticsFilter アーカイブ統計フィルタ
type ArchiveStatisticsFilter struct {
	ArchiveType     *model.ArchiveType
	FiscalYear      *int
	ExecutedBy      *uuid.UUID
	Status          *model.ArchiveStatus
	ExecutionMethod *model.ExecutionMethod
	StartDate       *time.Time
	EndDate         *time.Time
	Limit           int
	Offset          int
}

// ストアドプロシージャ用のパラメータ構造体

// ArchiveWeeklyReportsParams 週報アーカイブパラメータ
type ArchiveWeeklyReportsParams struct {
	StartDate     time.Time
	EndDate       time.Time
	FiscalYear    int
	FiscalQuarter int
	ArchivedBy    uuid.UUID
	ArchiveReason model.ArchiveReason
	DepartmentID  *uuid.UUID
	MaxRecords    *int
}

// ArchiveWeeklyReportsResult 週報アーカイブ結果
type ArchiveWeeklyReportsResult struct {
	ArchivedCount int
	FailedCount   int
	StatisticsID  uuid.UUID
}

// ArchiveUserWeeklyReportsParams ユーザー週報アーカイブパラメータ
type ArchiveUserWeeklyReportsParams struct {
	UserID        uuid.UUID
	StartDate     time.Time
	EndDate       time.Time
	ArchivedBy    uuid.UUID
	ArchiveReason model.ArchiveReason
}

// ArchiveUserWeeklyReportsResult ユーザー週報アーカイブ結果
type ArchiveUserWeeklyReportsResult struct {
	ArchivedCount int
	FailedCount   int
}

// CleanupExpiredArchivesResult 期限切れアーカイブクリーンアップ結果
type CleanupExpiredArchivesResult struct {
	DeletedCount int
	StatisticsID uuid.UUID
}

// ArchiveReportResult アーカイブレポート結果
type ArchiveReportResult struct {
	YearlySummary     []YearlySummary
	QuarterlySummary  []QuarterlySummary
	DepartmentSummary []DepartmentSummary
	ReasonSummary     []ReasonSummary
}

// YearlySummary 年度別サマリー
type YearlySummary struct {
	FiscalYear        int       `json:"fiscal_year"`
	TotalArchives     int       `json:"total_archives"`
	TotalWorkHours    float64   `json:"total_work_hours"`
	AvgWorkHours      float64   `json:"avg_work_hours"`
	UniqueUsers       int       `json:"unique_users"`
	UniqueDepartments int       `json:"unique_departments"`
	OldestArchive     time.Time `json:"oldest_archive"`
	LatestArchive     time.Time `json:"latest_archive"`
}

// QuarterlySummary 四半期別サマリー
type QuarterlySummary struct {
	FiscalYear     int     `json:"fiscal_year"`
	FiscalQuarter  int     `json:"fiscal_quarter"`
	TotalArchives  int     `json:"total_archives"`
	TotalWorkHours float64 `json:"total_work_hours"`
	AvgWorkHours   float64 `json:"avg_work_hours"`
	UniqueUsers    int     `json:"unique_users"`
}

// DepartmentSummary 部署別サマリー
type DepartmentSummary struct {
	DepartmentID   *uuid.UUID `json:"department_id"`
	DepartmentName *string    `json:"department_name"`
	TotalArchives  int        `json:"total_archives"`
	TotalWorkHours float64    `json:"total_work_hours"`
	AvgWorkHours   float64    `json:"avg_work_hours"`
	UniqueUsers    int        `json:"unique_users"`
	CoveredYears   int        `json:"covered_years"`
}

// ReasonSummary アーカイブ理由別サマリー
type ReasonSummary struct {
	ArchiveReason model.ArchiveReason `json:"archive_reason"`
	TotalArchives int                 `json:"total_archives"`
	UniqueUsers   int                 `json:"unique_users"`
	FirstArchive  time.Time           `json:"first_archive"`
	LatestArchive time.Time           `json:"latest_archive"`
}

// ArchiveIntegrityResult アーカイブ整合性チェック結果
type ArchiveIntegrityResult struct {
	IntegrityIssues int                     `json:"integrity_issues"`
	Report          string                  `json:"report"`
	IssueDetails    []ArchiveIntegrityIssue `json:"issue_details,omitempty"`
}

// ArchiveIntegrityIssue アーカイブ整合性問題詳細
type ArchiveIntegrityIssue struct {
	IssueType   string     `json:"issue_type"`
	RecordID    uuid.UUID  `json:"record_id"`
	ParentID    *uuid.UUID `json:"parent_id"`
	Description string     `json:"description"`
}

// GetArchiveStatisticsList アーカイブ統計一覧を取得
func (r *archiveRepository) GetArchiveStatisticsList(ctx context.Context, filter ArchiveStatisticsFilter) ([]model.ArchiveStatistics, int64, error) {
	var stats []model.ArchiveStatistics
	var total int64

	query := r.db.WithContext(ctx).Model(&model.ArchiveStatistics{})

	// フィルタ適用
	if filter.ArchiveType != nil {
		query = query.Where("archive_type = ?", *filter.ArchiveType)
	}
	if filter.FiscalYear != nil {
		query = query.Where("fiscal_year = ?", *filter.FiscalYear)
	}
	if filter.ExecutedBy != nil {
		query = query.Where("executed_by = ?", *filter.ExecutedBy)
	}
	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}
	if filter.ExecutionMethod != nil {
		query = query.Where("execution_method = ?", *filter.ExecutionMethod)
	}
	if filter.StartDate != nil {
		query = query.Where("start_date >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("end_date <= ?", *filter.EndDate)
	}

	// 総数を取得
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count archive statistics", zap.Error(err))
		return nil, 0, err
	}

	// ソート・ページネーション
	query = query.Order("created_at DESC")
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	// データ取得
	if err := query.Preload("ExecutedByUser").Find(&stats).Error; err != nil {
		r.logger.Error("Failed to get archive statistics list", zap.Error(err))
		return nil, 0, err
	}

	return stats, total, nil
}

// BulkCreateWeeklyReportArchives 週報アーカイブをバルク作成
func (r *archiveRepository) BulkCreateWeeklyReportArchives(ctx context.Context, archives []model.WeeklyReportArchive) error {
	if len(archives) == 0 {
		return nil
	}

	batchSize := 100
	for i := 0; i < len(archives); i += batchSize {
		end := i + batchSize
		if end > len(archives) {
			end = len(archives)
		}

		batch := archives[i:end]
		if err := r.db.WithContext(ctx).CreateInBatches(&batch, batchSize).Error; err != nil {
			r.logger.Error("Failed to bulk create weekly report archives",
				zap.Int("batch_size", len(batch)),
				zap.Error(err))
			return err
		}
	}

	return nil
}

// BulkCreateDailyRecordArchives 日次記録アーカイブをバルク作成
func (r *archiveRepository) BulkCreateDailyRecordArchives(ctx context.Context, archives []model.DailyRecordArchive) error {
	if len(archives) == 0 {
		return nil
	}

	batchSize := 100
	for i := 0; i < len(archives); i += batchSize {
		end := i + batchSize
		if end > len(archives) {
			end = len(archives)
		}

		batch := archives[i:end]
		if err := r.db.WithContext(ctx).CreateInBatches(&batch, batchSize).Error; err != nil {
			r.logger.Error("Failed to bulk create daily record archives",
				zap.Int("batch_size", len(batch)),
				zap.Error(err))
			return err
		}
	}

	return nil
}

// BulkCreateWorkHourArchives 勤怠時間アーカイブをバルク作成
func (r *archiveRepository) BulkCreateWorkHourArchives(ctx context.Context, archives []model.WorkHourArchive) error {
	if len(archives) == 0 {
		return nil
	}

	batchSize := 100
	for i := 0; i < len(archives); i += batchSize {
		end := i + batchSize
		if end > len(archives) {
			end = len(archives)
		}

		batch := archives[i:end]
		if err := r.db.WithContext(ctx).CreateInBatches(&batch, batchSize).Error; err != nil {
			r.logger.Error("Failed to bulk create work hour archives",
				zap.Int("batch_size", len(batch)),
				zap.Error(err))
			return err
		}
	}

	return nil
}

// applyArchiveFilter アーカイブフィルタを適用
func (r *archiveRepository) applyArchiveFilter(query *gorm.DB, filter model.ArchiveFilter) *gorm.DB {
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.DepartmentID != nil {
		query = query.Where("department_id = ?", *filter.DepartmentID)
	}
	if filter.FiscalYear != nil {
		query = query.Where("fiscal_year = ?", *filter.FiscalYear)
	}
	if filter.FiscalQuarter != nil {
		query = query.Where("fiscal_quarter = ?", *filter.FiscalQuarter)
	}
	if filter.StartDate != nil {
		query = query.Where("start_date >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("end_date <= ?", *filter.EndDate)
	}
	if len(filter.Status) > 0 {
		query = query.Where("status IN ?", filter.Status)
	}
	if filter.ArchiveReason != nil {
		query = query.Where("archive_reason = ?", *filter.ArchiveReason)
	}

	return query
}

// GetArchiveSummary アーカイブサマリーを取得
func (r *archiveRepository) GetArchiveSummary(ctx context.Context, filter *model.ArchiveFilter) (*model.ArchiveSummary, error) {
	summary := &model.ArchiveSummary{
		ByFiscalYear:    make(map[int]int64),
		ByArchiveReason: make(map[model.ArchiveReason]int64),
		ByDepartment:    make(map[string]int64),
	}

	query := r.db.WithContext(ctx).Model(&model.WeeklyReportArchive{})
	if filter != nil {
		query = r.applyArchiveFilter(query, *filter)
	}

	// 総アーカイブ数
	if err := query.Count(&summary.TotalArchived).Error; err != nil {
		return nil, err
	}

	// 年度別統計
	var yearStats []struct {
		FiscalYear int `json:"fiscal_year"`
		Count      int `json:"count"`
	}
	if err := query.Select("fiscal_year, COUNT(*) as count").Group("fiscal_year").Find(&yearStats).Error; err != nil {
		return nil, err
	}
	for _, stat := range yearStats {
		summary.ByFiscalYear[stat.FiscalYear] = int64(stat.Count)
	}

	// アーカイブ理由別統計
	var reasonStats []struct {
		ArchiveReason model.ArchiveReason `json:"archive_reason"`
		Count         int                 `json:"count"`
	}
	if err := query.Select("archive_reason, COUNT(*) as count").Group("archive_reason").Find(&reasonStats).Error; err != nil {
		return nil, err
	}
	for _, stat := range reasonStats {
		summary.ByArchiveReason[stat.ArchiveReason] = int64(stat.Count)
	}

	// 最古・最新のアーカイブ日時
	var dates struct {
		Oldest *time.Time `json:"oldest"`
		Latest *time.Time `json:"latest"`
	}
	if err := query.Select("MIN(archived_at) as oldest, MAX(archived_at) as latest").Find(&dates).Error; err != nil {
		return nil, err
	}
	summary.OldestArchiveDate = dates.Oldest
	summary.LatestArchiveDate = dates.Latest

	return summary, nil
}

// GetArchiveStatsByFiscalYear 年度別アーカイブ統計を取得
func (r *archiveRepository) GetArchiveStatsByFiscalYear(ctx context.Context, fiscalYear int) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	query := r.db.WithContext(ctx).Model(&model.WeeklyReportArchive{}).Where("fiscal_year = ?", fiscalYear)

	// 基本統計
	var basicStats struct {
		TotalCount        int64   `json:"total_count"`
		AvgWorkHours      float64 `json:"avg_work_hours"`
		TotalWorkHours    float64 `json:"total_work_hours"`
		UniqueUsers       int64   `json:"unique_users"`
		UniqueDepartments int64   `json:"unique_departments"`
	}

	if err := query.Select(`
		COUNT(*) as total_count,
		AVG(total_work_hours) as avg_work_hours,
		SUM(total_work_hours) as total_work_hours,
		COUNT(DISTINCT user_id) as unique_users,
		COUNT(DISTINCT department_id) as unique_departments
	`).Find(&basicStats).Error; err != nil {
		return nil, err
	}

	stats["basic"] = basicStats

	// 四半期別統計
	var quarterStats []struct {
		Quarter int   `json:"quarter"`
		Count   int64 `json:"count"`
	}
	if err := query.Select("fiscal_quarter as quarter, COUNT(*) as count").Group("fiscal_quarter").Find(&quarterStats).Error; err != nil {
		return nil, err
	}
	stats["by_quarter"] = quarterStats

	return stats, nil
}

// GetArchiveStatsByDepartment 部署別アーカイブ統計を取得
func (r *archiveRepository) GetArchiveStatsByDepartment(ctx context.Context, departmentID *uuid.UUID) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	query := r.db.WithContext(ctx).Model(&model.WeeklyReportArchive{})
	if departmentID != nil {
		query = query.Where("department_id = ?", *departmentID)
	}

	// 部署別統計
	var deptStats []struct {
		DepartmentID   *uuid.UUID `json:"department_id"`
		DepartmentName *string    `json:"department_name"`
		Count          int64      `json:"count"`
		AvgWorkHours   float64    `json:"avg_work_hours"`
		TotalWorkHours float64    `json:"total_work_hours"`
	}

	if err := query.Select(`
		department_id,
		department_name,
		COUNT(*) as count,
		AVG(total_work_hours) as avg_work_hours,
		SUM(total_work_hours) as total_work_hours
	`).Group("department_id, department_name").Find(&deptStats).Error; err != nil {
		return nil, err
	}

	stats["departments"] = deptStats
	return stats, nil
}

// SearchArchivedReports アーカイブされた週報を検索
func (r *archiveRepository) SearchArchivedReports(ctx context.Context, query string, filter model.ArchiveFilter) ([]model.WeeklyReportArchive, int64, error) {
	var archives []model.WeeklyReportArchive
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&model.WeeklyReportArchive{})

	// テキスト検索
	if query != "" {
		searchPattern := "%" + query + "%"
		dbQuery = dbQuery.Where(
			"user_name LIKE ? OR user_email LIKE ? OR department_name LIKE ? OR comment LIKE ? OR manager_comment LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	// フィルタ適用
	dbQuery = r.applyArchiveFilter(dbQuery, filter)

	// 総数取得
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// データ取得
	orderBy := filter.OrderBy
	if orderBy == "" {
		orderBy = "archived_at"
	}
	orderDir := filter.OrderDir
	if orderDir == "" {
		orderDir = "DESC"
	}

	dbQuery = dbQuery.Order(fmt.Sprintf("%s %s", orderBy, orderDir))

	if filter.Limit > 0 {
		dbQuery = dbQuery.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		dbQuery = dbQuery.Offset(filter.Offset)
	}

	if err := dbQuery.Find(&archives).Error; err != nil {
		return nil, 0, err
	}

	return archives, total, nil
}

// GetArchivedReportsByDateRange 日付範囲でアーカイブ週報を取得
func (r *archiveRepository) GetArchivedReportsByDateRange(ctx context.Context, startDate, endDate time.Time, userID *uuid.UUID) ([]model.WeeklyReportArchive, error) {
	var archives []model.WeeklyReportArchive

	query := r.db.WithContext(ctx).
		Where("start_date >= ? AND end_date <= ?", startDate, endDate)

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if err := query.Order("start_date").Find(&archives).Error; err != nil {
		return nil, err
	}

	return archives, nil
}

// DeleteExpiredArchives 期限切れアーカイブを削除
func (r *archiveRepository) DeleteExpiredArchives(ctx context.Context, expirationDate time.Time) (int64, error) {
	// 関連データを先に削除
	var archiveIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&model.WeeklyReportArchive{}).
		Where("archived_at < ?", expirationDate).
		Pluck("id", &archiveIDs).Error; err != nil {
		return 0, err
	}

	if len(archiveIDs) == 0 {
		return 0, nil
	}

	// 関連テーブルを削除
	r.db.WithContext(ctx).Where("weekly_report_archive_id IN ?", archiveIDs).Delete(&model.WorkHourArchive{})
	r.db.WithContext(ctx).Where("weekly_report_archive_id IN ?", archiveIDs).Delete(&model.DailyRecordArchive{})

	// メインテーブルを削除
	result := r.db.WithContext(ctx).
		Where("archived_at < ?", expirationDate).
		Delete(&model.WeeklyReportArchive{})

	if result.Error != nil {
		return 0, result.Error
	}

	return result.RowsAffected, nil
}

// GetArchiveStorageSize アーカイブストレージサイズを取得
func (r *archiveRepository) GetArchiveStorageSize(ctx context.Context) (int64, error) {
	var size struct {
		TotalSize int64 `json:"total_size"`
	}

	// 概算でのサイズ計算（実際のストレージサイズではなく、レコード数ベース）
	err := r.db.WithContext(ctx).Raw(`
		SELECT 
			(SELECT COUNT(*) FROM weekly_reports_archive) * 1024 +
			(SELECT COUNT(*) FROM daily_records_archive) * 512 +
			(SELECT COUNT(*) FROM work_hours_archive) * 256 +
			(SELECT COUNT(*) FROM archive_statistics) * 128 as total_size
	`).Scan(&size).Error

	if err != nil {
		return 0, err
	}

	return size.TotalSize, nil
}

// ストアドプロシージャ実装

// ExecuteArchiveWeeklyReports 週報アーカイブストアドプロシージャを実行
func (r *archiveRepository) ExecuteArchiveWeeklyReports(ctx context.Context, params ArchiveWeeklyReportsParams) (*ArchiveWeeklyReportsResult, error) {
	var result ArchiveWeeklyReportsResult
	var archivedCount, failedCount int
	var statisticsIDStr string

	departmentIDStr := ""
	if params.DepartmentID != nil {
		departmentIDStr = params.DepartmentID.String()
	}

	maxRecords := 0
	if params.MaxRecords != nil {
		maxRecords = *params.MaxRecords
	}

	err := r.db.WithContext(ctx).Raw(`
		CALL ArchiveWeeklyReports(?, ?, ?, ?, ?, ?, ?, ?, @archived_count, @failed_count, @statistics_id);
		SELECT @archived_count, @failed_count, @statistics_id;
	`,
		params.StartDate,
		params.EndDate,
		params.FiscalYear,
		params.FiscalQuarter,
		params.ArchivedBy.String(),
		params.ArchiveReason,
		departmentIDStr,
		maxRecords,
	).Row().Scan(&archivedCount, &failedCount, &statisticsIDStr)

	if err != nil {
		r.logger.Error("Failed to execute ArchiveWeeklyReports procedure", zap.Error(err))
		return nil, err
	}

	statisticsID, err := uuid.Parse(statisticsIDStr)
	if err != nil {
		r.logger.Error("Failed to parse statistics ID", zap.Error(err))
		return nil, err
	}

	result.ArchivedCount = archivedCount
	result.FailedCount = failedCount
	result.StatisticsID = statisticsID

	r.logger.Info("Weekly reports archived successfully",
		zap.Int("archived_count", archivedCount),
		zap.Int("failed_count", failedCount),
		zap.String("statistics_id", statisticsID.String()))

	return &result, nil
}

// ExecuteCleanupExpiredArchives 期限切れアーカイブクリーンアップストアドプロシージャを実行
func (r *archiveRepository) ExecuteCleanupExpiredArchives(ctx context.Context, retentionYears int, executedBy uuid.UUID) (*CleanupExpiredArchivesResult, error) {
	var result CleanupExpiredArchivesResult
	var deletedCount int
	var statisticsIDStr string

	err := r.db.WithContext(ctx).Raw(`
		CALL CleanupExpiredArchives(?, ?, @deleted_count, @statistics_id);
		SELECT @deleted_count, @statistics_id;
	`,
		retentionYears,
		executedBy.String(),
	).Row().Scan(&deletedCount, &statisticsIDStr)

	if err != nil {
		r.logger.Error("Failed to execute CleanupExpiredArchives procedure", zap.Error(err))
		return nil, err
	}

	statisticsID, err := uuid.Parse(statisticsIDStr)
	if err != nil {
		r.logger.Error("Failed to parse statistics ID", zap.Error(err))
		return nil, err
	}

	result.DeletedCount = deletedCount
	result.StatisticsID = statisticsID

	r.logger.Info("Expired archives cleaned up successfully",
		zap.Int("deleted_count", deletedCount),
		zap.String("statistics_id", statisticsID.String()))

	return &result, nil
}

// ExecuteArchiveUserWeeklyReports ユーザー週報アーカイブストアドプロシージャを実行
func (r *archiveRepository) ExecuteArchiveUserWeeklyReports(ctx context.Context, params ArchiveUserWeeklyReportsParams) (*ArchiveUserWeeklyReportsResult, error) {
	var result ArchiveUserWeeklyReportsResult
	var archivedCount, failedCount int

	err := r.db.WithContext(ctx).Raw(`
		CALL ArchiveUserWeeklyReports(?, ?, ?, ?, ?, @archived_count, @failed_count);
		SELECT @archived_count, @failed_count;
	`,
		params.UserID.String(),
		params.StartDate,
		params.EndDate,
		params.ArchivedBy.String(),
		params.ArchiveReason,
	).Row().Scan(&archivedCount, &failedCount)

	if err != nil {
		r.logger.Error("Failed to execute ArchiveUserWeeklyReports procedure", zap.Error(err))
		return nil, err
	}

	result.ArchivedCount = archivedCount
	result.FailedCount = failedCount

	r.logger.Info("User weekly reports archived successfully",
		zap.String("user_id", params.UserID.String()),
		zap.Int("archived_count", archivedCount),
		zap.Int("failed_count", failedCount))

	return &result, nil
}

// ExecuteGenerateArchiveReport アーカイブレポート生成ストアドプロシージャを実行
func (r *archiveRepository) ExecuteGenerateArchiveReport(ctx context.Context, fiscalYear *int, departmentID *uuid.UUID) (*ArchiveReportResult, error) {
	var result ArchiveReportResult

	fiscalYearParam := ""
	if fiscalYear != nil {
		fiscalYearParam = fmt.Sprintf("%d", *fiscalYear)
	}

	departmentIDParam := ""
	if departmentID != nil {
		departmentIDParam = departmentID.String()
	}

	// ストアドプロシージャを実行して複数の結果セットを取得
	rows, err := r.db.WithContext(ctx).Raw(`
		CALL GenerateArchiveReport(?, ?)
	`, fiscalYearParam, departmentIDParam).Rows()

	if err != nil {
		r.logger.Error("Failed to execute GenerateArchiveReport procedure", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	// 最初の結果セット：年度別サマリー
	for rows.Next() {
		var summary YearlySummary
		err := rows.Scan(
			&summary.FiscalYear,
			&summary.TotalArchives,
			&summary.TotalWorkHours,
			&summary.AvgWorkHours,
			&summary.UniqueUsers,
			&summary.UniqueDepartments,
			&summary.OldestArchive,
			&summary.LatestArchive,
		)
		if err != nil {
			return nil, err
		}
		result.YearlySummary = append(result.YearlySummary, summary)
	}

	// 次の結果セットに移動
	if !rows.NextResultSet() {
		return &result, nil
	}

	// 2番目の結果セット：四半期別サマリー
	for rows.Next() {
		var summary QuarterlySummary
		err := rows.Scan(
			&summary.FiscalYear,
			&summary.FiscalQuarter,
			&summary.TotalArchives,
			&summary.TotalWorkHours,
			&summary.AvgWorkHours,
			&summary.UniqueUsers,
		)
		if err != nil {
			return nil, err
		}
		result.QuarterlySummary = append(result.QuarterlySummary, summary)
	}

	// 次の結果セットに移動
	if !rows.NextResultSet() {
		return &result, nil
	}

	// 3番目の結果セット：部署別サマリー
	for rows.Next() {
		var summary DepartmentSummary
		var deptIDStr, deptNameStr *string
		err := rows.Scan(
			&deptIDStr,
			&deptNameStr,
			&summary.TotalArchives,
			&summary.TotalWorkHours,
			&summary.AvgWorkHours,
			&summary.UniqueUsers,
			&summary.CoveredYears,
		)
		if err != nil {
			return nil, err
		}

		if deptIDStr != nil {
			deptID, err := uuid.Parse(*deptIDStr)
			if err == nil {
				summary.DepartmentID = &deptID
			}
		}
		summary.DepartmentName = deptNameStr

		result.DepartmentSummary = append(result.DepartmentSummary, summary)
	}

	// 次の結果セットに移動
	if !rows.NextResultSet() {
		return &result, nil
	}

	// 4番目の結果セット：アーカイブ理由別サマリー
	for rows.Next() {
		var summary ReasonSummary
		err := rows.Scan(
			&summary.ArchiveReason,
			&summary.TotalArchives,
			&summary.UniqueUsers,
			&summary.FirstArchive,
			&summary.LatestArchive,
		)
		if err != nil {
			return nil, err
		}
		result.ReasonSummary = append(result.ReasonSummary, summary)
	}

	return &result, nil
}

// ExecuteValidateArchiveIntegrity アーカイブ整合性チェックストアドプロシージャを実行
func (r *archiveRepository) ExecuteValidateArchiveIntegrity(ctx context.Context) (*ArchiveIntegrityResult, error) {
	var result ArchiveIntegrityResult
	var integrityIssues int
	var report string

	// 整合性チェックを実行
	err := r.db.WithContext(ctx).Raw(`
		CALL ValidateArchiveIntegrity(@integrity_issues, @report);
		SELECT @integrity_issues, @report;
	`).Row().Scan(&integrityIssues, &report)

	if err != nil {
		r.logger.Error("Failed to execute ValidateArchiveIntegrity procedure", zap.Error(err))
		return nil, err
	}

	result.IntegrityIssues = integrityIssues
	result.Report = report

	// 問題がある場合は詳細情報を取得
	if integrityIssues > 0 {
		// 再度プロシージャを実行して詳細情報を取得
		rows, err := r.db.WithContext(ctx).Raw(`CALL ValidateArchiveIntegrity(@integrity_issues, @report)`).Rows()
		if err != nil {
			r.logger.Warn("Failed to get integrity issue details", zap.Error(err))
		} else {
			defer rows.Close()

			// 詳細情報を解析
			for rows.Next() {
				var issue ArchiveIntegrityIssue
				var parentIDStr *string
				err := rows.Scan(
					&issue.IssueType,
					&issue.RecordID,
					&parentIDStr,
					&issue.Description,
				)
				if err != nil {
					continue
				}

				if parentIDStr != nil {
					parentID, err := uuid.Parse(*parentIDStr)
					if err == nil {
						issue.ParentID = &parentID
					}
				}

				result.IssueDetails = append(result.IssueDetails, issue)
			}
		}
	}

	r.logger.Info("Archive integrity validation completed",
		zap.Int("integrity_issues", integrityIssues),
		zap.Int("issue_details", len(result.IssueDetails)))

	return &result, nil
}
