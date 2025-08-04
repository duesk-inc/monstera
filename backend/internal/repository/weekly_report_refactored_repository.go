package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/utils"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WeeklyReportRefactoredRepository 週報に関するデータアクセスの改善版
type WeeklyReportRefactoredRepository interface {
	// 基本操作
	Create(ctx context.Context, report *model.WeeklyReport) error
	Update(ctx context.Context, report *model.WeeklyReport) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*model.WeeklyReport, error)

	// 検索操作（最適化済み）
	FindWithPreload(ctx context.Context, params QueryParams) ([]*model.WeeklyReport, *utils.PaginationResult, error)
	FindByUserIDWithPreload(ctx context.Context, userID uuid.UUID, params QueryParams) ([]*model.WeeklyReport, *utils.PaginationResult, error)
	FindUnsubmittedWithPreload(ctx context.Context, params QueryParams) ([]*model.WeeklyReport, *utils.PaginationResult, error)

	// 統計操作
	CountByStatus(ctx context.Context, status model.WeeklyReportStatusEnum) (int64, error)
	CountUnsubmittedByDepartment(ctx context.Context, departmentID uuid.UUID) (int64, error)
	GetSubmissionStatistics(ctx context.Context, startDate, endDate time.Time) (*SubmissionStatistics, error)

	// バルク操作
	BatchUpdateStatus(ctx context.Context, ids []uuid.UUID, status model.WeeklyReportStatusEnum) error
	BatchUpdateSubmissionDeadline(ctx context.Context, ids []uuid.UUID, deadline time.Time) error
}

// QueryParams クエリパラメータ
type QueryParams struct {
	Page      int
	Limit     int
	Status    *model.WeeklyReportStatusEnum
	StartDate *time.Time
	EndDate   *time.Time
	Search    string
	OrderBy   string
	OrderDir  string

	// 詳細フィルタ
	DepartmentID *uuid.UUID
	ManagerID    *uuid.UUID
}

// SubmissionStatistics 提出統計
type SubmissionStatistics struct {
	TotalReports     int64
	SubmittedCount   int64
	UnsubmittedCount int64
	ApprovedCount    int64
	RejectedCount    int64
	SubmissionRate   float64
}

// weeklyReportRefactoredRepository 実装
type weeklyReportRefactoredRepository struct {
	repository.BaseRepository
	logger  *zap.Logger
	dbUtils *utils.DatabaseUtils
}

// NewWeeklyReportRefactoredRepository インスタンスを生成
func NewWeeklyReportRefactoredRepository(db *gorm.DB, logger *zap.Logger) WeeklyReportRefactoredRepository {
	return &weeklyReportRefactoredRepository{
		BaseRepository: repository.NewBaseRepository(db, logger),
		logger:         logger,
		dbUtils:        utils.NewDatabaseUtils(db),
	}
}

// Create 新しい週報を作成
func (r *weeklyReportRefactoredRepository) Create(ctx context.Context, report *model.WeeklyReport) error {
	if report.ID == uuid.Nil {
		report.ID = r.NewID()
	}
	return r.WithContext(ctx).Create(report).Error
}

// Update 週報を更新
func (r *weeklyReportRefactoredRepository) Update(ctx context.Context, report *model.WeeklyReport) error {
	return r.WithContext(ctx).Model(report).
		Omit("id", "created_at", "user_id", "deleted_at").
		Updates(report).Error
}

// Delete 週報を削除
func (r *weeklyReportRefactoredRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if err := r.ValidateID(id); err != nil {
		return err
	}
	return r.WithContext(ctx).Delete(&model.WeeklyReport{}, "id = ?", id).Error
}

// FindByID IDで週報を検索（関連データを含む）
func (r *weeklyReportRefactoredRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.WeeklyReport, error) {
	if err := r.ValidateID(id); err != nil {
		return nil, err
	}

	var report model.WeeklyReport
	err := r.WithContext(ctx).
		Preload("User").
		Preload("User.Department").
		Preload("DailyRecords").
		First(&report, "id = ?", id).Error

	if err != nil {
		return nil, err
	}
	return &report, nil
}

// FindWithPreload 最適化されたクエリで週報を検索
func (r *weeklyReportRefactoredRepository) FindWithPreload(ctx context.Context, params QueryParams) ([]*model.WeeklyReport, *utils.PaginationResult, error) {
	var reports []*model.WeeklyReport

	query := r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Preload("User").
		Preload("User.Department")

	// フィルタ適用
	query = r.applyFilters(query, params)

	// ページネーション適用
	paginationOpts := &utils.PaginationOptions{
		Page:    params.Page,
		Limit:   params.Limit,
		SortBy:  params.OrderBy,
		SortDir: params.OrderDir,
	}
	query, pagination, err := r.dbUtils.ApplyPagination(query, paginationOpts)
	if err != nil {
		return nil, nil, err
	}

	// データ取得
	if err := query.Find(&reports).Error; err != nil {
		return nil, nil, err
	}

	return reports, pagination, nil
}

// FindByUserIDWithPreload ユーザーIDで週報を検索（最適化済み）
func (r *weeklyReportRefactoredRepository) FindByUserIDWithPreload(ctx context.Context, userID uuid.UUID, params QueryParams) ([]*model.WeeklyReport, *utils.PaginationResult, error) {
	var reports []*model.WeeklyReport

	query := r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Preload("User").
		Preload("DailyRecords").
		Where("user_id = ?", userID)

	// フィルタ適用
	query = r.applyFilters(query, params)

	// ページネーション適用
	paginationOpts := &utils.PaginationOptions{
		Page:    params.Page,
		Limit:   params.Limit,
		SortBy:  params.OrderBy,
		SortDir: params.OrderDir,
	}
	query, pagination, err := r.dbUtils.ApplyPagination(query, paginationOpts)
	if err != nil {
		return nil, nil, err
	}

	// データ取得
	if err := query.Find(&reports).Error; err != nil {
		return nil, nil, err
	}

	return reports, pagination, nil
}

// FindUnsubmittedWithPreload 未提出の週報を検索（最適化済み）
func (r *weeklyReportRefactoredRepository) FindUnsubmittedWithPreload(ctx context.Context, params QueryParams) ([]*model.WeeklyReport, *utils.PaginationResult, error) {
	var reports []*model.WeeklyReport

	query := r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Preload("User").
		Preload("User.Department").
		Preload("User.Manager").
		Where("status = ?", model.WeeklyReportStatusDraft).
		Where("submission_deadline < ?", time.Now())

	// 追加フィルタ適用
	if params.DepartmentID != nil {
		query = query.Joins("JOIN users ON users.id = weekly_reports.user_id").
			Where("users.department_id = ?", *params.DepartmentID)
	}

	if params.ManagerID != nil {
		query = query.Joins("JOIN users ON users.id = weekly_reports.user_id").
			Where("users.manager_id = ?", *params.ManagerID)
	}

	// ソート
	if params.OrderBy == "" {
		params.OrderBy = "submission_deadline"
		params.OrderDir = "asc"
	}
	query = r.applySort(query, params)

	// ページネーション適用
	paginationOpts := &utils.PaginationOptions{
		Page:    params.Page,
		Limit:   params.Limit,
		SortBy:  params.OrderBy,
		SortDir: params.OrderDir,
	}
	query, pagination, err := r.dbUtils.ApplyPagination(query, paginationOpts)
	if err != nil {
		return nil, nil, err
	}

	// データ取得
	if err := query.Find(&reports).Error; err != nil {
		return nil, nil, err
	}

	return reports, pagination, nil
}

// CountByStatus ステータス別の件数を取得
func (r *weeklyReportRefactoredRepository) CountByStatus(ctx context.Context, status model.WeeklyReportStatusEnum) (int64, error) {
	var count int64
	err := r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("status = ?", status).
		Count(&count).Error
	return count, err
}

// CountUnsubmittedByDepartment 部署別の未提出件数を取得
func (r *weeklyReportRefactoredRepository) CountUnsubmittedByDepartment(ctx context.Context, departmentID uuid.UUID) (int64, error) {
	var count int64
	err := r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Joins("JOIN users ON users.id = weekly_reports.user_id").
		Where("users.department_id = ?", departmentID).
		Where("weekly_reports.status = ?", model.WeeklyReportStatusDraft).
		Where("weekly_reports.submission_deadline < ?", time.Now()).
		Count(&count).Error
	return count, err
}

// GetSubmissionStatistics 提出統計を取得
func (r *weeklyReportRefactoredRepository) GetSubmissionStatistics(ctx context.Context, startDate, endDate time.Time) (*SubmissionStatistics, error) {
	stats := &SubmissionStatistics{}

	// 総件数
	err := r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("start_date >= ? AND end_date <= ?", startDate, endDate).
		Count(&stats.TotalReports).Error
	if err != nil {
		return nil, err
	}

	// ステータス別件数
	type StatusCount struct {
		Status model.WeeklyReportStatusEnum
		Count  int64
	}

	var statusCounts []StatusCount
	err = r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Select("status, COUNT(*) as count").
		Where("start_date >= ? AND end_date <= ?", startDate, endDate).
		Group("status").
		Scan(&statusCounts).Error
	if err != nil {
		return nil, err
	}

	// 統計を集計
	for _, sc := range statusCounts {
		switch sc.Status {
		case model.WeeklyReportStatusSubmitted:
			stats.SubmittedCount = sc.Count
		case model.WeeklyReportStatusDraft:
			stats.UnsubmittedCount = sc.Count
		case model.WeeklyReportStatusApproved:
			stats.ApprovedCount = sc.Count
		case model.WeeklyReportStatusRejected:
			stats.RejectedCount = sc.Count
		}
	}

	// 提出率計算
	if stats.TotalReports > 0 {
		stats.SubmissionRate = float64(stats.SubmittedCount+stats.ApprovedCount) / float64(stats.TotalReports) * 100
	}

	return stats, nil
}

// BatchUpdateStatus 複数の週報のステータスを一括更新
func (r *weeklyReportRefactoredRepository) BatchUpdateStatus(ctx context.Context, ids []uuid.UUID, status model.WeeklyReportStatusEnum) error {
	if len(ids) == 0 {
		return nil
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": now,
	}

	if status == model.WeeklyReportStatusSubmitted {
		updates["submitted_at"] = &now
	}

	return r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("id IN ?", ids).
		Updates(updates).Error
}

// BatchUpdateSubmissionDeadline 複数の週報の提出期限を一括更新
func (r *weeklyReportRefactoredRepository) BatchUpdateSubmissionDeadline(ctx context.Context, ids []uuid.UUID, deadline time.Time) error {
	if len(ids) == 0 {
		return nil
	}

	return r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("id IN ?", ids).
		Update("submission_deadline", deadline).Error
}

// applyFilters フィルタを適用
func (r *weeklyReportRefactoredRepository) applyFilters(query *gorm.DB, params QueryParams) *gorm.DB {
	if params.Status != nil {
		query = query.Where("status = ?", *params.Status)
	}

	if params.StartDate != nil {
		query = query.Where("start_date >= ?", *params.StartDate)
	}

	if params.EndDate != nil {
		query = query.Where("end_date <= ?", *params.EndDate)
	}

	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where(
			"weekly_remarks LIKE ? OR workplace_name LIKE ?",
			search, search,
		)
	}

	// ソート適用
	query = r.applySort(query, params)

	return query
}

// applySort ソートを適用
func (r *weeklyReportRefactoredRepository) applySort(query *gorm.DB, params QueryParams) *gorm.DB {
	orderBy := params.OrderBy
	if orderBy == "" {
		orderBy = "created_at"
	}

	orderDir := params.OrderDir
	if orderDir != "asc" && orderDir != "desc" {
		orderDir = "desc"
	}

	return query.Order(fmt.Sprintf("%s %s", orderBy, orderDir))
}
