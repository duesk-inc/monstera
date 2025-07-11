package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// EngineerProposalRepository エンジニア提案リポジトリのインターフェース
type EngineerProposalRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, proposal *model.EngineerProposal) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.EngineerProposal, error)
	Update(ctx context.Context, proposal *model.EngineerProposal) error
	Delete(ctx context.Context, id uuid.UUID) error

	// ステータス管理
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, respondedAt *time.Time) error
	GetByUserAndStatus(ctx context.Context, userID uuid.UUID, statuses []string) ([]*model.EngineerProposal, error)

	// エンジニア向けクエリ
	GetByUserID(ctx context.Context, userID uuid.UUID, filter EngineerProposalFilter) ([]*model.EngineerProposal, int64, error)
	GetByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.EngineerProposal, error)
	CheckDuplicateProposal(ctx context.Context, projectID uuid.UUID, userID uuid.UUID) (bool, error)

	// 統計・分析クエリ
	GetProposalSummary(ctx context.Context, userID uuid.UUID) (*ProposalSummaryResult, error)
	GetProposalsByDateRange(ctx context.Context, userID uuid.UUID, startDate, endDate time.Time) ([]*model.EngineerProposal, error)
	GetRecentProposals(ctx context.Context, userID uuid.UUID, limit int) ([]*model.EngineerProposal, error)

	// 高度な統計・分析クエリ
	GetProposalTrends(ctx context.Context, userID uuid.UUID, months int) (*ProposalTrendResult, error)
	GetProposalsByMonthlyStats(ctx context.Context, userID uuid.UUID, year int) ([]*MonthlyProposalStats, error)
	GetProposalResponseTimeStats(ctx context.Context, userID uuid.UUID) (*ResponseTimeStats, error)
	GetTopProjectsByProposals(ctx context.Context, limit int) ([]*ProjectProposalStats, error)
	GetEngineerProposalRanking(ctx context.Context, startDate, endDate time.Time, limit int) ([]*EngineerProposalRank, error)
	GetProposalConversionRates(ctx context.Context, userID uuid.UUID, startDate, endDate time.Time) (*ConversionRateStats, error)

	// 管理者向けクエリ
	GetExpiredProposals(ctx context.Context, expireDays int) ([]*model.EngineerProposal, error)
	GetProposalsByStatus(ctx context.Context, status string, limit int) ([]*model.EngineerProposal, error)
	CountProposalsByStatus(ctx context.Context, status string) (int64, error)

	// 管理者向け統計・レポート
	GetSystemProposalSummary(ctx context.Context) (*SystemProposalSummary, error)
	GetDailyProposalStats(ctx context.Context, startDate, endDate time.Time) ([]*DailyProposalStats, error)
	GetProposalActivityHeatmap(ctx context.Context, userID uuid.UUID, year int) ([]*ActivityHeatmapData, error)

	// バルク操作
	UpdateMultipleStatuses(ctx context.Context, ids []uuid.UUID, status string) error
}

// EngineerProposalFilter エンジニア提案フィルター
type EngineerProposalFilter struct {
	Status    *string    `json:"status"`
	Page      int        `json:"page"`
	Limit     int        `json:"limit"`
	SortBy    *string    `json:"sort_by"`    // "created_at", "responded_at"
	SortOrder *string    `json:"sort_order"` // "asc", "desc"
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
}

// ProposalSummaryResult 提案サマリー結果
type ProposalSummaryResult struct {
	TotalProposals        int `json:"total_proposals"`
	PendingProposals      int `json:"pending_proposals"`
	RespondedProposals    int `json:"responded_proposals"`
	ProceedProposals      int `json:"proceed_proposals"`
	DeclinedProposals     int `json:"declined_proposals"`
	PendingQuestionsCount int `json:"pending_questions_count"`
}

// ProposalTrendResult 提案トレンド結果
type ProposalTrendResult struct {
	MonthlyData []MonthlyTrendData `json:"monthly_data"`
	TotalGrowth float64            `json:"total_growth"`      // 成長率（％）
	AvgResponse float64            `json:"avg_response_days"` // 平均回答日数
}

// MonthlyTrendData 月別トレンドデータ
type MonthlyTrendData struct {
	Month           string  `json:"month"` // "2024-01"
	TotalProposals  int     `json:"total_proposals"`
	ProceedCount    int     `json:"proceed_count"`
	DeclinedCount   int     `json:"declined_count"`
	PendingCount    int     `json:"pending_count"`
	ConversionRate  float64 `json:"conversion_rate"` // 進捗率（％）
	AvgResponseDays float64 `json:"avg_response_days"`
}

// MonthlyProposalStats 月別提案統計
type MonthlyProposalStats struct {
	Month           string  `json:"month"`
	ProposalCount   int     `json:"proposal_count"`
	RespondedCount  int     `json:"responded_count"`
	ProceedCount    int     `json:"proceed_count"`
	DeclinedCount   int     `json:"declined_count"`
	ConversionRate  float64 `json:"conversion_rate"`
	AvgResponseTime float64 `json:"avg_response_time_hours"`
}

// ResponseTimeStats 回答時間統計
type ResponseTimeStats struct {
	AvgResponseHours     float64 `json:"avg_response_hours"`
	MinResponseHours     float64 `json:"min_response_hours"`
	MaxResponseHours     float64 `json:"max_response_hours"`
	MedianResponseHours  float64 `json:"median_response_hours"`
	FastestResponseCount int     `json:"fastest_response_count"` // 24時間以内回答数
	SlowResponseCount    int     `json:"slow_response_count"`    // 7日以上回答数
}

// ProjectProposalStats プロジェクト別提案統計
type ProjectProposalStats struct {
	ProjectID       uuid.UUID `json:"project_id"`
	ProjectName     string    `json:"project_name"`
	ProposalCount   int       `json:"proposal_count"`
	ProceedCount    int       `json:"proceed_count"`
	DeclinedCount   int       `json:"declined_count"`
	ConversionRate  float64   `json:"conversion_rate"`
	AvgResponseTime float64   `json:"avg_response_time_hours"`
}

// EngineerProposalRank エンジニア提案ランキング
type EngineerProposalRank struct {
	UserID          uuid.UUID `json:"user_id"`
	UserName        string    `json:"user_name"`
	ProposalCount   int       `json:"proposal_count"`
	ProceedCount    int       `json:"proceed_count"`
	ConversionRate  float64   `json:"conversion_rate"`
	AvgResponseTime float64   `json:"avg_response_time_hours"`
	Rank            int       `json:"rank"`
}

// ConversionRateStats 変換率統計
type ConversionRateStats struct {
	TotalProposals   int                    `json:"total_proposals"`
	ProceedCount     int                    `json:"proceed_count"`
	DeclinedCount    int                    `json:"declined_count"`
	OverallRate      float64                `json:"overall_conversion_rate"`
	WeeklyRates      []WeeklyConversionRate `json:"weekly_rates"`
	ComparisonToPrev float64                `json:"comparison_to_previous_period"`
}

// WeeklyConversionRate 週別変換率
type WeeklyConversionRate struct {
	WeekStart      time.Time `json:"week_start"`
	WeekEnd        time.Time `json:"week_end"`
	ProposalCount  int       `json:"proposal_count"`
	ProceedCount   int       `json:"proceed_count"`
	ConversionRate float64   `json:"conversion_rate"`
}

// SystemProposalSummary システム全体の提案サマリー
type SystemProposalSummary struct {
	TotalUsers        int     `json:"total_users"`
	ActiveUsers       int     `json:"active_users"` // 過去30日間で提案があったユーザー
	TotalProposals    int     `json:"total_proposals"`
	TodayProposals    int     `json:"today_proposals"`
	WeekProposals     int     `json:"week_proposals"`
	MonthProposals    int     `json:"month_proposals"`
	OverallConversion float64 `json:"overall_conversion_rate"`
	AvgResponseTime   float64 `json:"avg_response_time_hours"`
	TopPerformingUser string  `json:"top_performing_user"`
	MostActiveProject string  `json:"most_active_project"`
}

// DailyProposalStats 日別提案統計
type DailyProposalStats struct {
	Date            time.Time `json:"date"`
	ProposalCount   int       `json:"proposal_count"`
	RespondedCount  int       `json:"responded_count"`
	ProceedCount    int       `json:"proceed_count"`
	DeclinedCount   int       `json:"declined_count"`
	UniqueUsers     int       `json:"unique_users"`
	AvgResponseTime float64   `json:"avg_response_time_hours"`
}

// ActivityHeatmapData 活動ヒートマップデータ
type ActivityHeatmapData struct {
	Date          time.Time `json:"date"`
	ProposalCount int       `json:"proposal_count"`
	ResponseCount int       `json:"response_count"`
	ActivityLevel int       `json:"activity_level"` // 0-4 (0=なし、4=非常に活発)
}

// engineerProposalRepository エンジニア提案リポジトリの実装
type engineerProposalRepository struct {
	db         *gorm.DB
	logger     *zap.Logger
	sqlAdapter *PostgreSQLSQLAdapter
}

// NewEngineerProposalRepository エンジニア提案リポジトリのインスタンスを生成
func NewEngineerProposalRepository(db *gorm.DB, logger *zap.Logger) EngineerProposalRepository {
	return &engineerProposalRepository{
		db:         db,
		logger:     logger,
		sqlAdapter: NewPostgreSQLSQLAdapter(db, logger),
	}
}

// Create エンジニア提案を作成
func (r *engineerProposalRepository) Create(ctx context.Context, proposal *model.EngineerProposal) error {
	if err := r.db.WithContext(ctx).Create(proposal).Error; err != nil {
		r.logger.Error("Failed to create engineer proposal",
			zap.Error(err),
			zap.String("project_id", proposal.ProjectID.String()),
			zap.String("user_id", proposal.UserID.String()))
		return err
	}

	r.logger.Info("Engineer proposal created successfully",
		zap.String("proposal_id", proposal.ID.String()),
		zap.String("project_id", proposal.ProjectID.String()),
		zap.String("user_id", proposal.UserID.String()))

	return nil
}

// GetByID IDでエンジニア提案を取得
func (r *engineerProposalRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.EngineerProposal, error) {
	var proposal model.EngineerProposal

	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&proposal).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Engineer proposal not found", zap.String("id", id.String()))
			return nil, err
		}
		r.logger.Error("Failed to get engineer proposal by ID",
			zap.Error(err),
			zap.String("id", id.String()))
		return nil, err
	}

	return &proposal, nil
}

// Update エンジニア提案を更新
func (r *engineerProposalRepository) Update(ctx context.Context, proposal *model.EngineerProposal) error {
	if err := r.db.WithContext(ctx).Save(proposal).Error; err != nil {
		r.logger.Error("Failed to update engineer proposal",
			zap.Error(err),
			zap.String("proposal_id", proposal.ID.String()))
		return err
	}

	r.logger.Info("Engineer proposal updated successfully",
		zap.String("proposal_id", proposal.ID.String()))

	return nil
}

// Delete エンジニア提案を削除（論理削除）
func (r *engineerProposalRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Model(&model.EngineerProposal{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("deleted_at", time.Now())

	if result.Error != nil {
		r.logger.Error("Failed to delete engineer proposal",
			zap.Error(result.Error),
			zap.String("id", id.String()))
		return result.Error
	}

	if result.RowsAffected == 0 {
		r.logger.Warn("Engineer proposal not found for deletion", zap.String("id", id.String()))
		return gorm.ErrRecordNotFound
	}

	r.logger.Info("Engineer proposal deleted successfully", zap.String("id", id.String()))
	return nil
}

// UpdateStatus ステータスを更新
func (r *engineerProposalRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, respondedAt *time.Time) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}

	if respondedAt != nil {
		updates["responded_at"] = *respondedAt
	}

	result := r.db.WithContext(ctx).
		Model(&model.EngineerProposal{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update engineer proposal status",
			zap.Error(result.Error),
			zap.String("id", id.String()),
			zap.String("status", status))
		return result.Error
	}

	if result.RowsAffected == 0 {
		r.logger.Warn("Engineer proposal not found for status update",
			zap.String("id", id.String()))
		return gorm.ErrRecordNotFound
	}

	r.logger.Info("Engineer proposal status updated successfully",
		zap.String("id", id.String()),
		zap.String("status", status))

	return nil
}

// GetByUserAndStatus ユーザーIDとステータスでエンジニア提案を取得
func (r *engineerProposalRepository) GetByUserAndStatus(ctx context.Context, userID uuid.UUID, statuses []string) ([]*model.EngineerProposal, error) {
	var proposals []*model.EngineerProposal

	query := r.db.WithContext(ctx).
		Preload("User").
		Where("user_id = ? AND deleted_at IS NULL", userID)

	if len(statuses) > 0 {
		query = query.Where("status IN ?", statuses)
	}

	if err := query.Order("created_at DESC").Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get engineer proposals by user and status",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Strings("statuses", statuses))
		return nil, err
	}

	return proposals, nil
}

// GetByUserID ユーザーIDでエンジニア提案一覧を取得
func (r *engineerProposalRepository) GetByUserID(ctx context.Context, userID uuid.UUID, filter EngineerProposalFilter) ([]*model.EngineerProposal, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.EngineerProposal{}).
		Preload("User").
		Where("user_id = ? AND deleted_at IS NULL", userID)

	// フィルター条件を適用
	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}

	if filter.StartDate != nil {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}

	if filter.EndDate != nil {
		query = query.Where("created_at <= ?", *filter.EndDate)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count engineer proposals",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// ソート順序を設定
	orderBy := "created_at DESC"
	if filter.SortBy != nil && filter.SortOrder != nil {
		switch *filter.SortBy {
		case "created_at", "responded_at":
			orderBy = *filter.SortBy + " " + *filter.SortOrder
		}
	}

	// データを取得
	var proposals []*model.EngineerProposal
	if err := query.Order(orderBy).Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get engineer proposals by user ID",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, 0, err
	}

	return proposals, total, nil
}

// GetByProjectID プロジェクトIDでエンジニア提案を取得
func (r *engineerProposalRepository) GetByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.EngineerProposal, error) {
	var proposals []*model.EngineerProposal

	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Order("created_at DESC").
		Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get engineer proposals by project ID",
			zap.Error(err),
			zap.String("project_id", projectID.String()))
		return nil, err
	}

	return proposals, nil
}

// CheckDuplicateProposal 重複提案をチェック
func (r *engineerProposalRepository) CheckDuplicateProposal(ctx context.Context, projectID uuid.UUID, userID uuid.UUID) (bool, error) {
	var count int64

	if err := r.db.WithContext(ctx).
		Model(&model.EngineerProposal{}).
		Where("project_id = ? AND user_id = ? AND deleted_at IS NULL", projectID, userID).
		Count(&count).Error; err != nil {
		r.logger.Error("Failed to check duplicate proposal",
			zap.Error(err),
			zap.String("project_id", projectID.String()),
			zap.String("user_id", userID.String()))
		return false, err
	}

	return count > 0, nil
}

// GetProposalSummary 提案サマリーを取得
func (r *engineerProposalRepository) GetProposalSummary(ctx context.Context, userID uuid.UUID) (*ProposalSummaryResult, error) {
	var result ProposalSummaryResult

	// 基本統計を取得
	type statusCount struct {
		Status string
		Count  int
	}

	var statusCounts []statusCount
	if err := r.db.WithContext(ctx).
		Model(&model.EngineerProposal{}).
		Select("status, COUNT(*) as count").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Group("status").
		Scan(&statusCounts).Error; err != nil {
		r.logger.Error("Failed to get proposal summary",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, err
	}

	// ステータス別にカウントを設定
	for _, sc := range statusCounts {
		result.TotalProposals += sc.Count
		switch sc.Status {
		case "proposed":
			result.PendingProposals = sc.Count
		case "proceed":
			result.ProceedProposals = sc.Count
		case "declined":
			result.DeclinedProposals = sc.Count
		}
	}

	result.RespondedProposals = result.ProceedProposals + result.DeclinedProposals

	// 未回答質問数を取得（別リポジトリで実装予定のため、現在は0を設定）
	result.PendingQuestionsCount = 0

	return &result, nil
}

// GetProposalsByDateRange 日付範囲でエンジニア提案を取得
func (r *engineerProposalRepository) GetProposalsByDateRange(ctx context.Context, userID uuid.UUID, startDate, endDate time.Time) ([]*model.EngineerProposal, error) {
	var proposals []*model.EngineerProposal

	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("user_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL", userID, startDate, endDate).
		Order("created_at DESC").
		Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get engineer proposals by date range",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Time("start_date", startDate),
			zap.Time("end_date", endDate))
		return nil, err
	}

	return proposals, nil
}

// GetRecentProposals 最近のエンジニア提案を取得
func (r *engineerProposalRepository) GetRecentProposals(ctx context.Context, userID uuid.UUID, limit int) ([]*model.EngineerProposal, error) {
	var proposals []*model.EngineerProposal

	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get recent engineer proposals",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Int("limit", limit))
		return nil, err
	}

	return proposals, nil
}

// GetExpiredProposals 期限切れ提案を取得
func (r *engineerProposalRepository) GetExpiredProposals(ctx context.Context, expireDays int) ([]*model.EngineerProposal, error) {
	var proposals []*model.EngineerProposal

	expireDate := time.Now().AddDate(0, 0, -expireDays)

	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("status = ? AND created_at <= ? AND deleted_at IS NULL", "proposed", expireDate).
		Order("created_at ASC").
		Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get expired engineer proposals",
			zap.Error(err),
			zap.Int("expire_days", expireDays))
		return nil, err
	}

	return proposals, nil
}

// GetProposalsByStatus ステータス別提案を取得
func (r *engineerProposalRepository) GetProposalsByStatus(ctx context.Context, status string, limit int) ([]*model.EngineerProposal, error) {
	var proposals []*model.EngineerProposal

	query := r.db.WithContext(ctx).
		Preload("User").
		Where("status = ? AND deleted_at IS NULL", status).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get engineer proposals by status",
			zap.Error(err),
			zap.String("status", status),
			zap.Int("limit", limit))
		return nil, err
	}

	return proposals, nil
}

// CountProposalsByStatus ステータス別提案数をカウント
func (r *engineerProposalRepository) CountProposalsByStatus(ctx context.Context, status string) (int64, error) {
	var count int64

	if err := r.db.WithContext(ctx).
		Model(&model.EngineerProposal{}).
		Where("status = ? AND deleted_at IS NULL", status).
		Count(&count).Error; err != nil {
		r.logger.Error("Failed to count engineer proposals by status",
			zap.Error(err),
			zap.String("status", status))
		return 0, err
	}

	return count, nil
}

// UpdateMultipleStatuses 複数提案のステータスを一括更新
func (r *engineerProposalRepository) UpdateMultipleStatuses(ctx context.Context, ids []uuid.UUID, status string) error {
	if len(ids) == 0 {
		return nil
	}

	result := r.db.WithContext(ctx).
		Model(&model.EngineerProposal{}).
		Where("id IN ? AND deleted_at IS NULL", ids).
		Updates(map[string]interface{}{
			"status":     status,
			"updated_at": time.Now(),
		})

	if result.Error != nil {
		r.logger.Error("Failed to update multiple engineer proposal statuses",
			zap.Error(result.Error),
			zap.Int("count", len(ids)),
			zap.String("status", status))
		return result.Error
	}

	r.logger.Info("Multiple engineer proposal statuses updated successfully",
		zap.Int64("updated_count", result.RowsAffected),
		zap.String("status", status))

	return nil
}

// GetProposalTrends 提案トレンドを取得
func (r *engineerProposalRepository) GetProposalTrends(ctx context.Context, userID uuid.UUID, months int) (*ProposalTrendResult, error) {
	var trendData []MonthlyTrendData

	// 過去N月分のデータを取得
	startDate := time.Now().AddDate(0, -months, 0)

	query := `
		SELECT 
			DATE_FORMAT(created_at, '%Y-%m') as month,
			COUNT(*) as total_proposals,
			SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) as proceed_count,
			SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_count,
			SUM(CASE WHEN status = 'proposed' THEN 1 ELSE 0 END) as pending_count,
			ROUND(SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as conversion_rate,
			ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) / 24.0 
			ELSE NULL END), 2) as avg_response_days
		FROM proposals 
		WHERE user_id = ? AND created_at >= ? AND deleted_at IS NULL
		GROUP BY DATE_FORMAT(created_at, '%Y-%m')
		ORDER BY month ASC
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, query, &trendData, userID, startDate); err != nil {
		r.logger.Error("Failed to get proposal trends",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Int("months", months))
		return nil, err
	}

	// 成長率を計算
	var totalGrowth float64 = 0
	if len(trendData) >= 2 {
		firstMonth := trendData[0].TotalProposals
		lastMonth := trendData[len(trendData)-1].TotalProposals
		if firstMonth > 0 {
			totalGrowth = float64(lastMonth-firstMonth) * 100.0 / float64(firstMonth)
		}
	}

	// 平均回答日数を計算
	var avgResponseDays float64 = 0
	var totalDays float64 = 0
	var validMonths int = 0
	for _, data := range trendData {
		if data.AvgResponseDays > 0 {
			totalDays += data.AvgResponseDays
			validMonths++
		}
	}
	if validMonths > 0 {
		avgResponseDays = totalDays / float64(validMonths)
	}

	return &ProposalTrendResult{
		MonthlyData: trendData,
		TotalGrowth: totalGrowth,
		AvgResponse: avgResponseDays,
	}, nil
}

// GetProposalsByMonthlyStats 月別統計を取得
func (r *engineerProposalRepository) GetProposalsByMonthlyStats(ctx context.Context, userID uuid.UUID, year int) ([]*MonthlyProposalStats, error) {
	var stats []*MonthlyProposalStats

	query := `
		SELECT 
			DATE_FORMAT(created_at, '%Y-%m') as month,
			COUNT(*) as proposal_count,
			SUM(CASE WHEN status IN ('proceed', 'declined') THEN 1 ELSE 0 END) as responded_count,
			SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) as proceed_count,
			SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_count,
			ROUND(SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as conversion_rate,
			ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) 
			ELSE NULL END), 2) as avg_response_time
		FROM proposals 
		WHERE user_id = ? AND YEAR(created_at) = ? AND deleted_at IS NULL
		GROUP BY DATE_FORMAT(created_at, '%Y-%m')
		ORDER BY month ASC
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, query, &stats, userID, year); err != nil {
		r.logger.Error("Failed to get monthly proposal stats",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Int("year", year))
		return nil, err
	}

	return stats, nil
}

// GetProposalResponseTimeStats 回答時間統計を取得
func (r *engineerProposalRepository) GetProposalResponseTimeStats(ctx context.Context, userID uuid.UUID) (*ResponseTimeStats, error) {
	var stats ResponseTimeStats

	// 基本統計を取得
	query := `
		SELECT 
			ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, responded_at)), 2) as avg_response_hours,
			ROUND(MIN(TIMESTAMPDIFF(HOUR, created_at, responded_at)), 2) as min_response_hours,
			ROUND(MAX(TIMESTAMPDIFF(HOUR, created_at, responded_at)), 2) as max_response_hours,
			COUNT(CASE WHEN TIMESTAMPDIFF(HOUR, created_at, responded_at) <= 24 THEN 1 END) as fastest_response_count,
			COUNT(CASE WHEN TIMESTAMPDIFF(HOUR, created_at, responded_at) >= 168 THEN 1 END) as slow_response_count
		FROM proposals 
		WHERE user_id = ? AND responded_at IS NOT NULL AND deleted_at IS NULL
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, query, &stats, userID); err != nil {
		r.logger.Error("Failed to get proposal response time stats",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, err
	}

	// 中央値を取得（別途クエリが必要）
	var medianQuery = `
		SELECT ROUND(
			AVG(response_hours), 2
		) as median_response_hours
		FROM (
			SELECT 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) as response_hours,
				ROW_NUMBER() OVER (ORDER BY TIMESTAMPDIFF(HOUR, created_at, responded_at)) as row_num,
				COUNT(*) OVER () as total_count
			FROM proposals 
			WHERE user_id = ? AND responded_at IS NOT NULL AND deleted_at IS NULL
		) as ordered_times
		WHERE row_num IN (FLOOR((total_count + 1) / 2), CEIL((total_count + 1) / 2))
	`

	var medianResult struct {
		MedianResponseHours float64 `json:"median_response_hours"`
	}

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, medianQuery, &medianResult, userID); err != nil {
		r.logger.Warn("Failed to get median response time", zap.Error(err))
		// エラーでも処理を続行
	} else {
		stats.MedianResponseHours = medianResult.MedianResponseHours
	}

	return &stats, nil
}

// GetTopProjectsByProposals 提案数の多いプロジェクトを取得
func (r *engineerProposalRepository) GetTopProjectsByProposals(ctx context.Context, limit int) ([]*ProjectProposalStats, error) {
	var stats []*ProjectProposalStats

	// NOTE: このクエリはmonstera-pocスキーマとの結合が必要になる可能性があります
	// 現在はproject_idのみを使用して統計を作成
	query := `
		SELECT 
			project_id,
			'Unknown Project' as project_name,
			COUNT(*) as proposal_count,
			SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) as proceed_count,
			SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_count,
			ROUND(SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as conversion_rate,
			ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) 
			ELSE NULL END), 2) as avg_response_time
		FROM proposals 
		WHERE deleted_at IS NULL
		GROUP BY project_id
		ORDER BY proposal_count DESC
		LIMIT ?
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, query, &stats, limit); err != nil {
		r.logger.Error("Failed to get top projects by proposals",
			zap.Error(err),
			zap.Int("limit", limit))
		return nil, err
	}

	return stats, nil
}

// GetEngineerProposalRanking エンジニア提案ランキングを取得
func (r *engineerProposalRepository) GetEngineerProposalRanking(ctx context.Context, startDate, endDate time.Time, limit int) ([]*EngineerProposalRank, error) {
	var rankings []*EngineerProposalRank

	query := `
		SELECT 
			p.user_id,
			CONCAT(u.first_name, ' ', u.last_name) as user_name,
			COUNT(*) as proposal_count,
			SUM(CASE WHEN p.status = 'proceed' THEN 1 ELSE 0 END) as proceed_count,
			ROUND(SUM(CASE WHEN p.status = 'proceed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as conversion_rate,
			ROUND(AVG(CASE WHEN p.responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, p.created_at, p.responded_at) 
			ELSE NULL END), 2) as avg_response_time,
			RANK() OVER (ORDER BY COUNT(*) DESC, SUM(CASE WHEN p.status = 'proceed' THEN 1 ELSE 0 END) DESC) as rank
		FROM proposals p
		JOIN users u ON p.user_id = u.id
		WHERE p.created_at BETWEEN ? AND ? AND p.deleted_at IS NULL
		GROUP BY p.user_id, u.first_name, u.last_name
		ORDER BY proposal_count DESC, proceed_count DESC
		LIMIT ?
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, query, &rankings, startDate, endDate, limit); err != nil {
		r.logger.Error("Failed to get engineer proposal ranking",
			zap.Error(err),
			zap.Time("start_date", startDate),
			zap.Time("end_date", endDate),
			zap.Int("limit", limit))
		return nil, err
	}

	return rankings, nil
}

// GetProposalConversionRates 変換率統計を取得
func (r *engineerProposalRepository) GetProposalConversionRates(ctx context.Context, userID uuid.UUID, startDate, endDate time.Time) (*ConversionRateStats, error) {
	var stats ConversionRateStats

	// 全体の変換率を取得
	overallQuery := `
		SELECT 
			COUNT(*) as total_proposals,
			SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) as proceed_count,
			SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_count,
			ROUND(SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as overall_rate
		FROM proposals 
		WHERE user_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, overallQuery, &stats, userID, startDate, endDate); err != nil {
		r.logger.Error("Failed to get overall conversion rates",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, err
	}

	// 週別の変換率を取得
	weeklyQuery := `
		SELECT 
			DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY) as week_start,
			DATE_ADD(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), INTERVAL 6 DAY) as week_end,
			COUNT(*) as proposal_count,
			SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) as proceed_count,
			ROUND(SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as conversion_rate
		FROM proposals 
		WHERE user_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL
		GROUP BY week_start, week_end
		ORDER BY week_start ASC
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, weeklyQuery, &stats.WeeklyRates, userID, startDate, endDate); err != nil {
		r.logger.Error("Failed to get weekly conversion rates",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, err
	}

	// 前期間との比較（同じ期間長の前の期間）
	duration := endDate.Sub(startDate)
	prevStartDate := startDate.Add(-duration)
	prevEndDate := startDate

	var prevStats struct {
		OverallRate float64 `json:"overall_rate"`
	}

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, overallQuery, &prevStats, userID, prevStartDate, prevEndDate); err != nil {
		r.logger.Warn("Failed to get previous period conversion rates", zap.Error(err))
		// エラーでも処理を続行
	} else {
		stats.ComparisonToPrev = stats.OverallRate - prevStats.OverallRate
	}

	return &stats, nil
}

// GetSystemProposalSummary システム全体の提案サマリーを取得
func (r *engineerProposalRepository) GetSystemProposalSummary(ctx context.Context) (*SystemProposalSummary, error) {
	var summary SystemProposalSummary

	now := time.Now()
	today := now.Truncate(24 * time.Hour)
	weekStart := today.AddDate(0, 0, -int(today.Weekday()))
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	thirtyDaysAgo := now.AddDate(0, 0, -30)

	// 基本統計を取得
	basicQuery := `
		SELECT 
			(SELECT COUNT(DISTINCT user_id) FROM proposals WHERE deleted_at IS NULL) as total_users,
			(SELECT COUNT(DISTINCT user_id) FROM proposals WHERE created_at >= ? AND deleted_at IS NULL) as active_users,
			COUNT(*) as total_proposals,
			SUM(CASE WHEN DATE(created_at) = DATE(?) THEN 1 ELSE 0 END) as today_proposals,
			SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as week_proposals,
			SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as month_proposals,
			ROUND(SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as overall_conversion,
			ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) 
			ELSE NULL END), 2) as avg_response_time
		FROM proposals 
		WHERE deleted_at IS NULL
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, basicQuery, &summary, thirtyDaysAgo, now, weekStart, monthStart); err != nil {
		r.logger.Error("Failed to get system proposal summary", zap.Error(err))
		return nil, err
	}

	// トップパフォーマーを取得
	var topUser struct {
		UserName string `json:"user_name"`
	}

	topUserQuery := `
		SELECT CONCAT(u.first_name, ' ', u.last_name) as user_name
		FROM proposals p
		JOIN users u ON p.user_id = u.id
		WHERE p.created_at >= ? AND p.deleted_at IS NULL
		GROUP BY p.user_id, u.first_name, u.last_name
		ORDER BY SUM(CASE WHEN p.status = 'proceed' THEN 1 ELSE 0 END) DESC
		LIMIT 1
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, topUserQuery, &topUser, monthStart); err != nil {
		r.logger.Warn("Failed to get top performing user", zap.Error(err))
		summary.TopPerformingUser = "Unknown"
	} else {
		summary.TopPerformingUser = topUser.UserName
	}

	// 最も活発なプロジェクト（現在はプロジェクトIDのみ）
	var activeProject struct {
		ProjectID string `json:"project_id"`
	}

	activeProjectQuery := `
		SELECT project_id
		FROM proposals 
		WHERE created_at >= ? AND deleted_at IS NULL
		GROUP BY project_id
		ORDER BY COUNT(*) DESC
		LIMIT 1
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, activeProjectQuery, &activeProject, monthStart); err != nil {
		r.logger.Warn("Failed to get most active project", zap.Error(err))
		summary.MostActiveProject = "Unknown"
	} else {
		summary.MostActiveProject = activeProject.ProjectID
	}

	return &summary, nil
}

// GetDailyProposalStats 日別提案統計を取得
func (r *engineerProposalRepository) GetDailyProposalStats(ctx context.Context, startDate, endDate time.Time) ([]*DailyProposalStats, error) {
	var stats []*DailyProposalStats

	query := `
		SELECT 
			DATE(created_at) as date,
			COUNT(*) as proposal_count,
			SUM(CASE WHEN status IN ('proceed', 'declined') THEN 1 ELSE 0 END) as responded_count,
			SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) as proceed_count,
			SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_count,
			COUNT(DISTINCT user_id) as unique_users,
			ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) 
			ELSE NULL END), 2) as avg_response_time
		FROM proposals 
		WHERE created_at BETWEEN ? AND ? AND deleted_at IS NULL
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, query, &stats, startDate, endDate); err != nil {
		r.logger.Error("Failed to get daily proposal stats",
			zap.Error(err),
			zap.Time("start_date", startDate),
			zap.Time("end_date", endDate))
		return nil, err
	}

	return stats, nil
}

// GetProposalActivityHeatmap 活動ヒートマップデータを取得
func (r *engineerProposalRepository) GetProposalActivityHeatmap(ctx context.Context, userID uuid.UUID, year int) ([]*ActivityHeatmapData, error) {
	var heatmapData []*ActivityHeatmapData

	query := `
		SELECT 
			DATE(created_at) as date,
			COUNT(*) as proposal_count,
			SUM(CASE WHEN status IN ('proceed', 'declined') THEN 1 ELSE 0 END) as response_count,
			CASE 
				WHEN COUNT(*) = 0 THEN 0
				WHEN COUNT(*) BETWEEN 1 AND 2 THEN 1
				WHEN COUNT(*) BETWEEN 3 AND 5 THEN 2
				WHEN COUNT(*) BETWEEN 6 AND 10 THEN 3
				ELSE 4
			END as activity_level
		FROM proposals 
		WHERE user_id = ? AND YEAR(created_at) = ? AND deleted_at IS NULL
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`

	if err := r.sqlAdapter.ExecuteRawSQL(ctx, query, &heatmapData, userID, year); err != nil {
		r.logger.Error("Failed to get proposal activity heatmap",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Int("year", year))
		return nil, err
	}

	return heatmapData, nil
}
