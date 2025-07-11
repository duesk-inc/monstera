package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WeeklyReportRepository 週報に関するデータアクセスの責務を持つ
type WeeklyReportRepository struct {
	repository.BaseRepository
	Logger *zap.Logger
}

// NewWeeklyReportRepository WeeklyReportRepositoryのインスタンスを生成する
func NewWeeklyReportRepository(db *gorm.DB, logger *zap.Logger) *WeeklyReportRepository {
	return &WeeklyReportRepository{
		BaseRepository: repository.NewBaseRepository(db, logger),
		Logger:         logger,
	}
}

// Create 新しい週報を作成
func (r *WeeklyReportRepository) Create(ctx context.Context, report *model.WeeklyReport) error {
	// UUIDがnilの場合は新規生成
	if report.ID == uuid.Nil {
		report.ID = r.NewID()
	}

	return r.WithContext(ctx).Create(report).Error
}

// FindByID IDで週報を検索
func (r *WeeklyReportRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.WeeklyReport, error) {
	// IDの検証
	if err := r.ValidateID(id); err != nil {
		return nil, err
	}

	var report model.WeeklyReport
	err := r.WithContext(ctx).First(&report, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &report, nil
}

// FindByUserID ユーザーIDで週報を検索
func (r *WeeklyReportRepository) FindByUserID(ctx context.Context, userID uuid.UUID, offset, limit int) ([]*model.WeeklyReport, int64, error) {
	var reports []*model.WeeklyReport
	var total int64

	db := r.WithContext(ctx).Where("user_id = ?", userID).Order("start_date DESC")

	// クエリオプションを適用
	opts := repository.QueryOptions{
		Offset:   offset,
		Limit:    limit,
		OrderBy:  "start_date",
		OrderDir: "desc",
	}

	err := repository.ExecuteAndCount(ctx, repository.ApplyOptions(db, opts), &reports, &total)

	// デバッグログ: データベースから取得直後のステータスを確認
	if err == nil && r.Logger != nil {
		for i, report := range reports {
			r.Logger.Debug("Repository: Retrieved report status",
				zap.Int("index", i),
				zap.String("report_id", report.ID.String()),
				zap.String("status", report.Status.String()),
				zap.Any("status_type", fmt.Sprintf("%T", report.Status)),
				zap.Int("status_length", len(report.Status.String())))
		}

		// 生SQLで確認（デバッグ用）
		if len(reports) > 0 {
			var rawStatus string
			rawErr := r.WithContext(ctx).Raw("SELECT status FROM weekly_reports WHERE id = ? LIMIT 1", reports[0].ID).Scan(&rawStatus).Error
			if rawErr == nil {
				r.Logger.Debug("Raw SQL status check",
					zap.String("report_id", reports[0].ID.String()),
					zap.String("raw_status", rawStatus),
					zap.Int("raw_status_length", len(rawStatus)))
			}
		}
	}

	return reports, total, err
}

// FindByDateRange 日付範囲で週報を検索
func (r *WeeklyReportRepository) FindByDateRange(ctx context.Context, userID uuid.UUID, startDate, endDate time.Time) ([]*model.WeeklyReport, error) {
	var reports []*model.WeeklyReport
	err := r.WithContext(ctx).Where("user_id = ? AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))",
		userID, startDate, endDate, startDate, endDate).
		Order("start_date DESC").
		Find(&reports).Error
	return reports, err
}

// FindByStatus ステータスで週報を検索
func (r *WeeklyReportRepository) FindByStatus(ctx context.Context, status string, offset, limit int) ([]*model.WeeklyReport, int64, error) {
	var reports []*model.WeeklyReport
	var total int64

	db := r.WithContext(ctx).Where("status = ?", status)

	// クエリオプションを適用
	opts := repository.QueryOptions{
		Offset:   offset,
		Limit:    limit,
		OrderBy:  "start_date",
		OrderDir: "desc",
	}

	err := repository.ExecuteAndCount(ctx, repository.ApplyOptions(db, opts), &reports, &total)
	return reports, total, err
}

// FindWithFilters フィルター条件で週報を検索
func (r *WeeklyReportRepository) FindWithFilters(
	ctx context.Context,
	userID uuid.UUID,
	status string,
	startDate string,
	endDate string,
	search string,
	offset int,
	limit int,
) ([]*model.WeeklyReport, int64, error) {
	var reports []*model.WeeklyReport
	var total int64

	query := r.WithContext(ctx).Model(&model.WeeklyReport{})

	// ユーザーIDが指定されていれば条件に追加
	if userID != uuid.Nil {
		query = query.Where("user_id = ?", userID)
	}

	// ステータスが指定されていれば条件に追加
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// 開始日が指定されていれば条件に追加（週報の開始日が指定日以降）
	if startDate != "" {
		query = query.Where("start_date >= ?", startDate)
	}

	// 終了日が指定されていれば条件に追加（週報の終了日が指定日以前）
	if endDate != "" {
		query = query.Where("end_date <= ?", endDate)
	}

	// 検索オプションを適用
	opts := repository.QueryOptions{
		Offset:     offset,
		Limit:      limit,
		OrderBy:    "start_date",
		OrderDir:   "desc",
		Search:     search,
		SearchKeys: []string{"summary", "achievements", "plans", "problems"},
	}

	// 検索キーワードが指定されていて、通常のSearchKeysを使わない場合の処理
	if search != "" && len(opts.SearchKeys) == 0 {
		search = "%" + search + "%"
		query = query.Where("summary LIKE ? OR achievements LIKE ? OR plans LIKE ? OR problems LIKE ?",
			search, search, search, search)
	}

	// クエリオプションを適用して検索を実行
	err := repository.ExecuteAndCount(ctx, repository.ApplyOptions(query, opts), &reports, &total)
	return reports, total, err
}

// Update 週報を更新
func (r *WeeklyReportRepository) Update(ctx context.Context, report *model.WeeklyReport) error {
	// 更新してはいけないフィールドを除外
	// - ID: 主キーは変更しない
	// - created_at: 作成日時は変更しない
	// - user_id: 所有者は変更しない
	// - deleted_at: 削除日時は独自のメカニズムで管理
	return r.WithContext(ctx).Model(report).Omit("id", "created_at", "user_id", "deleted_at").Updates(report).Error
}

// Delete 週報を削除
func (r *WeeklyReportRepository) Delete(ctx context.Context, id uuid.UUID) error {
	// IDの検証
	if err := r.ValidateID(id); err != nil {
		return err
	}

	return r.WithContext(ctx).Delete(&model.WeeklyReport{}, "id = ?", id).Error
}

// CountByStatusForUser ユーザーの週報ステータス別件数を取得
func (r *WeeklyReportRepository) CountByStatusForUser(ctx context.Context, userID uuid.UUID) (map[string]int, error) {
	type Result struct {
		Status string
		Count  int
	}

	var results []Result
	err := r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Select("status, COUNT(*) as count").
		Where("user_id = ?", userID).
		Group("status").
		Find(&results).Error
	if err != nil {
		return nil, err
	}

	counts := make(map[string]int)
	for _, result := range results {
		counts[result.Status] = result.Count
	}

	return counts, nil
}

// FindOneByDateRange 指定されたユーザーと日付範囲に一致する週報を1件取得
func (r *WeeklyReportRepository) FindOneByDateRange(ctx context.Context, userID uuid.UUID, startDate, endDate time.Time) (*model.WeeklyReport, error) {
	var report model.WeeklyReport

	// 週報の期間（start_date, end_date）と指定された期間（startDate, endDate）が重なるか判定
	// 以下の条件のいずれかを満たす場合、重なりがあると判断:
	// 1. 週報の開始日が指定期間内にある
	// 2. 週報の終了日が指定期間内にある
	// 3. 指定期間の開始日が週報の期間内にある
	// 4. 指定期間の終了日が週報の期間内にある
	err := r.WithContext(ctx).Where(
		"user_id = ? AND "+
			"((start_date BETWEEN ? AND ?) OR "+
			"(end_date BETWEEN ? AND ?) OR "+
			"(? BETWEEN start_date AND end_date) OR "+
			"(? BETWEEN start_date AND end_date))",
		userID, startDate, endDate, startDate, endDate, startDate, endDate).
		Order("start_date DESC").
		First(&report).Error

	if err != nil {
		return nil, err
	}

	return &report, nil
}

// UpdateStatus 週報のステータスと提出日時のみを更新
func (r *WeeklyReportRepository) UpdateStatus(ctx context.Context, report *model.WeeklyReport) error {
	// ステータスと提出日時のみを更新対象とする
	return r.WithContext(ctx).Model(report).Select("status", "submitted_at", "updated_at").Updates(report).Error
}

// UpdateTotalWorkHours 週報の合計稼働時間のみを更新
func (r *WeeklyReportRepository) UpdateTotalWorkHours(ctx context.Context, reportID uuid.UUID, totalHours float64) error {
	// IDの検証
	if err := r.ValidateID(reportID); err != nil {
		return err
	}

	return r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("id = ?", reportID).
		Update("total_work_hours", totalHours).Error
}

// UpdateClientTotalWorkHours 週報の客先勤怠合計稼働時間のみを更新
func (r *WeeklyReportRepository) UpdateClientTotalWorkHours(ctx context.Context, reportID uuid.UUID, clientTotalHours float64) error {
	// IDの検証
	if err := r.ValidateID(reportID); err != nil {
		return err
	}

	return r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("id = ?", reportID).
		Update("client_total_work_hours", clientTotalHours).Error
}

// UpdateBothTotalWorkHours 週報の自社と客先の合計稼働時間を更新
func (r *WeeklyReportRepository) UpdateBothTotalWorkHours(ctx context.Context, reportID uuid.UUID, totalHours float64, clientTotalHours float64) error {
	// IDの検証
	if err := r.ValidateID(reportID); err != nil {
		return err
	}

	return r.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("id = ?", reportID).
		Updates(map[string]interface{}{
			"total_work_hours":        totalHours,
			"client_total_work_hours": clientTotalHours,
		}).Error
}

// GetByWeek 指定された週の全週報を取得（アラート検知用）
func (r *WeeklyReportRepository) GetByWeek(ctx context.Context, weekStart, weekEnd time.Time) ([]*model.WeeklyReport, error) {
	var reports []*model.WeeklyReport

	err := r.WithContext(ctx).
		Preload("DailyRecords").
		Where("start_date = ? AND end_date = ?", weekStart, weekEnd).
		Find(&reports).Error

	if err != nil {
		r.Logger.Error("Failed to get weekly reports by week",
			zap.Error(err),
			zap.Time("week_start", weekStart),
			zap.Time("week_end", weekEnd))
		return nil, err
	}

	return reports, nil
}

// GetByUserAndWeek 指定されたユーザーと週の週報を取得（アラート検知用）
func (r *WeeklyReportRepository) GetByUserAndWeek(ctx context.Context, userID uuid.UUID, weekStart, weekEnd time.Time) ([]*model.WeeklyReport, error) {
	var reports []*model.WeeklyReport

	// IDの検証
	if err := r.ValidateID(userID); err != nil {
		return nil, err
	}

	err := r.WithContext(ctx).
		Preload("DailyRecords").
		Where("user_id = ? AND start_date = ? AND end_date = ?", userID, weekStart, weekEnd).
		Find(&reports).Error

	if err != nil {
		r.Logger.Error("Failed to get weekly reports by user and week",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Time("week_start", weekStart),
			zap.Time("week_end", weekEnd))
		return nil, err
	}

	return reports, nil
}

// GetByUserAndMonth 指定されたユーザーと月の週報を取得（月間残業時間チェック用）
func (r *WeeklyReportRepository) GetByUserAndMonth(ctx context.Context, userID uuid.UUID, monthStart, monthEnd time.Time) ([]*model.WeeklyReport, error) {
	var reports []*model.WeeklyReport

	// IDの検証
	if err := r.ValidateID(userID); err != nil {
		return nil, err
	}

	// 月の期間と重なる週報を取得
	err := r.WithContext(ctx).
		Preload("DailyRecords").
		Where("user_id = ? AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (start_date <= ? AND end_date >= ?))",
			userID, monthStart, monthEnd, monthStart, monthEnd, monthStart, monthEnd).
		Find(&reports).Error

	if err != nil {
		r.Logger.Error("Failed to get weekly reports by user and month",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Time("month_start", monthStart),
			zap.Time("month_end", monthEnd))
		return nil, err
	}

	return reports, nil
}

// GetConsecutiveHolidayWorkDays 指定されたユーザーの連続休日出勤日数を取得
func (r *WeeklyReportRepository) GetConsecutiveHolidayWorkDays(ctx context.Context, userID uuid.UUID, fromDate time.Time) (int, error) {
	// IDの検証
	if err := r.ValidateID(userID); err != nil {
		return 0, err
	}

	// fromDateから過去30日分のDailyRecordを取得して連続休日出勤をチェック
	var records []model.DailyRecord

	// 週報とDailyRecordをJOINして取得
	err := r.WithContext(ctx).
		Table("daily_records").
		Joins("JOIN weekly_reports ON daily_records.weekly_report_id = weekly_reports.id").
		Where("weekly_reports.user_id = ? AND daily_records.date >= ? AND daily_records.date <= ?",
			userID, fromDate.AddDate(0, 0, -30), fromDate).
		Where("daily_records.is_holiday_work = ?", true).
		Order("daily_records.date DESC").
		Find(&records).Error

	if err != nil {
		r.Logger.Error("Failed to get consecutive holiday work days",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.Time("from_date", fromDate))
		return 0, err
	}

	// 連続日数をカウント
	consecutiveDays := 0
	lastDate := fromDate

	for _, record := range records {
		// 日付が連続しているかチェック
		if lastDate.Sub(record.Date) <= 24*time.Hour {
			consecutiveDays++
			lastDate = record.Date
		} else {
			break // 連続していない場合は終了
		}
	}

	return consecutiveDays, nil
}

// GetMonthlyAggregatedData 月次集計データを効率的に取得
func (r *WeeklyReportRepository) GetMonthlyAggregatedData(ctx context.Context, year int, month int, departmentID *uuid.UUID) (*MonthlyAggregatedData, error) {
	// 月の開始日と終了日を計算
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second)

	result := &MonthlyAggregatedData{
		Year:  year,
		Month: month,
	}

	// 1. 基本統計を一括取得
	var stats struct {
		TotalReports     int64
		SubmittedReports int64
		TotalWorkHours   float64
		AvgWorkHours     float64
		OvertimeReports  int64
		AvgMood          float64
	}

	baseQuery := r.WithContext(ctx).
		Model(&model.WeeklyReport{}).
		Joins("JOIN users ON users.id = weekly_reports.user_id").
		Where("weekly_reports.deleted_at IS NULL").
		Where("users.deleted_at IS NULL").
		Where("((weekly_reports.start_date BETWEEN ? AND ?) OR (weekly_reports.end_date BETWEEN ? AND ?))",
			startDate, endDate, startDate, endDate)

	if departmentID != nil && *departmentID != uuid.Nil {
		baseQuery = baseQuery.Where("users.department_id = ?", *departmentID)
	}

	// 統計データを一括で取得
	err := baseQuery.
		Select(`
			COUNT(*) as total_reports,
			COUNT(CASE WHEN weekly_reports.status = 'submitted' THEN 1 END) as submitted_reports,
			COALESCE(SUM(weekly_reports.total_work_hours), 0) as total_work_hours,
			COALESCE(AVG(weekly_reports.total_work_hours), 0) as avg_work_hours,
			COUNT(CASE WHEN weekly_reports.total_work_hours > 40 THEN 1 END) as overtime_reports,
			COALESCE(AVG(weekly_reports.mood), 0) as avg_mood
		`).
		Scan(&stats).Error

	if err != nil {
		r.Logger.Error("Failed to get monthly statistics", zap.Error(err))
		return nil, err
	}

	result.TotalReports = int(stats.TotalReports)
	result.SubmittedReports = int(stats.SubmittedReports)
	result.TotalWorkHours = stats.TotalWorkHours
	result.AverageWorkHours = stats.AvgWorkHours
	result.OvertimeReports = int(stats.OvertimeReports)
	result.AverageMood = stats.AvgMood

	// 2. ムード分布を取得
	var moodDist []struct {
		Mood  int
		Count int
	}

	err = baseQuery.
		Select("weekly_reports.mood, COUNT(*) as count").
		Where("weekly_reports.mood > 0").
		Group("weekly_reports.mood").
		Scan(&moodDist).Error

	if err != nil {
		r.Logger.Error("Failed to get mood distribution", zap.Error(err))
		return nil, err
	}

	result.MoodDistribution = make(map[int]int)
	for _, m := range moodDist {
		result.MoodDistribution[m.Mood] = m.Count
	}

	// 3. 週ごとのサマリーを取得
	var weekSummaries []struct {
		WeekStart      time.Time
		WeekEnd        time.Time
		SubmittedCount int
		TotalCount     int
		AvgWorkHours   float64
		AvgMood        float64
	}

	err = baseQuery.
		Select(`
			weekly_reports.start_date as week_start,
			weekly_reports.end_date as week_end,
			COUNT(CASE WHEN weekly_reports.status = 'submitted' THEN 1 END) as submitted_count,
			COUNT(*) as total_count,
			COALESCE(AVG(weekly_reports.total_work_hours), 0) as avg_work_hours,
			COALESCE(AVG(weekly_reports.mood), 0) as avg_mood
		`).
		Group("weekly_reports.start_date, weekly_reports.end_date").
		Order("weekly_reports.start_date").
		Scan(&weekSummaries).Error

	if err != nil {
		r.Logger.Error("Failed to get weekly summaries", zap.Error(err))
		return nil, err
	}

	result.WeeklySummaries = make([]WeeklySummaryData, len(weekSummaries))
	for i, ws := range weekSummaries {
		result.WeeklySummaries[i] = WeeklySummaryData{
			WeekStart:        ws.WeekStart,
			WeekEnd:          ws.WeekEnd,
			SubmittedCount:   ws.SubmittedCount,
			TotalCount:       ws.TotalCount,
			AverageWorkHours: ws.AvgWorkHours,
			AverageMood:      ws.AvgMood,
		}
	}

	// 4. 部署別統計を取得（部署IDが指定されていない場合のみ）
	if departmentID == nil || *departmentID == uuid.Nil {
		var deptStats []struct {
			DepartmentID   uuid.UUID
			DepartmentName string
			UserCount      int
			SubmittedCount int
			AvgWorkHours   float64
			AvgMood        float64
		}

		err = r.WithContext(ctx).
			Table("weekly_reports").
			Select(`
				users.department_id,
				departments.name as department_name,
				COUNT(DISTINCT users.id) as user_count,
				COUNT(CASE WHEN weekly_reports.status = 'submitted' THEN 1 END) as submitted_count,
				COALESCE(AVG(weekly_reports.total_work_hours), 0) as avg_work_hours,
				COALESCE(AVG(weekly_reports.mood), 0) as avg_mood
			`).
			Joins("JOIN users ON users.id = weekly_reports.user_id").
			Joins("LEFT JOIN departments ON departments.id = users.department_id").
			Where("weekly_reports.deleted_at IS NULL").
			Where("users.deleted_at IS NULL").
			Where("((weekly_reports.start_date BETWEEN ? AND ?) OR (weekly_reports.end_date BETWEEN ? AND ?))",
				startDate, endDate, startDate, endDate).
			Group("users.department_id, departments.name").
			Scan(&deptStats).Error

		if err != nil {
			r.Logger.Error("Failed to get department statistics", zap.Error(err))
			return nil, err
		}

		result.DepartmentStats = make([]DepartmentStatsData, len(deptStats))
		for i, ds := range deptStats {
			submissionRate := float64(0)
			if ds.UserCount > 0 {
				submissionRate = float64(ds.SubmittedCount) / float64(ds.UserCount) * 100
			}
			result.DepartmentStats[i] = DepartmentStatsData{
				DepartmentID:     ds.DepartmentID,
				DepartmentName:   ds.DepartmentName,
				UserCount:        ds.UserCount,
				SubmissionRate:   submissionRate,
				AverageWorkHours: ds.AvgWorkHours,
				AverageMood:      ds.AvgMood,
			}
		}
	}

	// 5. トップパフォーマーを取得
	var topPerformers []struct {
		UserID         uuid.UUID
		UserName       string
		DepartmentName string
		SubmittedCount int
		TotalCount     int
		AvgWorkHours   float64
		TotalWorkHours float64
		AvgMood        float64
	}

	topQuery := r.WithContext(ctx).
		Table("weekly_reports").
		Select(`
			users.id as user_id,
			users.name as user_name,
			departments.name as department_name,
			COUNT(CASE WHEN weekly_reports.status = 'submitted' THEN 1 END) as submitted_count,
			COUNT(*) as total_count,
			COALESCE(AVG(weekly_reports.total_work_hours), 0) as avg_work_hours,
			COALESCE(SUM(weekly_reports.total_work_hours), 0) as total_work_hours,
			COALESCE(AVG(weekly_reports.mood), 0) as avg_mood
		`).
		Joins("JOIN users ON users.id = weekly_reports.user_id").
		Joins("LEFT JOIN departments ON departments.id = users.department_id").
		Where("weekly_reports.deleted_at IS NULL").
		Where("users.deleted_at IS NULL").
		Where("((weekly_reports.start_date BETWEEN ? AND ?) OR (weekly_reports.end_date BETWEEN ? AND ?))",
			startDate, endDate, startDate, endDate)

	if departmentID != nil && *departmentID != uuid.Nil {
		topQuery = topQuery.Where("users.department_id = ?", *departmentID)
	}

	err = topQuery.
		Group("users.id, users.name, departments.name").
		Having("COUNT(CASE WHEN weekly_reports.status = 'submitted' THEN 1 END) > 0").
		Order("COUNT(CASE WHEN weekly_reports.status = 'submitted' THEN 1 END) DESC, AVG(weekly_reports.total_work_hours) DESC").
		Limit(10).
		Scan(&topPerformers).Error

	if err != nil {
		r.Logger.Error("Failed to get top performers", zap.Error(err))
		return nil, err
	}

	result.TopPerformers = make([]UserPerformanceData, len(topPerformers))
	for i, tp := range topPerformers {
		submissionRate := float64(0)
		if tp.TotalCount > 0 {
			submissionRate = float64(tp.SubmittedCount) / float64(tp.TotalCount) * 100
		}
		result.TopPerformers[i] = UserPerformanceData{
			UserID:           tp.UserID,
			UserName:         tp.UserName,
			DepartmentName:   tp.DepartmentName,
			SubmissionRate:   submissionRate,
			AverageWorkHours: tp.AvgWorkHours,
			TotalWorkHours:   tp.TotalWorkHours,
			AverageMood:      tp.AvgMood,
			ReportCount:      tp.SubmittedCount,
		}
	}

	return result, nil
}

// MonthlyAggregatedData 月次集計データ構造体
type MonthlyAggregatedData struct {
	Year             int
	Month            int
	TotalReports     int
	SubmittedReports int
	TotalWorkHours   float64
	AverageWorkHours float64
	OvertimeReports  int
	AverageMood      float64
	MoodDistribution map[int]int
	WeeklySummaries  []WeeklySummaryData
	DepartmentStats  []DepartmentStatsData
	TopPerformers    []UserPerformanceData
}

// WeeklySummaryData 週次サマリーデータ
type WeeklySummaryData struct {
	WeekStart        time.Time
	WeekEnd          time.Time
	SubmittedCount   int
	TotalCount       int
	AverageWorkHours float64
	AverageMood      float64
}

// DepartmentStatsData 部署別統計データ
type DepartmentStatsData struct {
	DepartmentID     uuid.UUID
	DepartmentName   string
	UserCount        int
	SubmissionRate   float64
	AverageWorkHours float64
	AverageMood      float64
}

// UserPerformanceData ユーザーパフォーマンスデータ
type UserPerformanceData struct {
	UserID           uuid.UUID
	UserName         string
	DepartmentName   string
	SubmissionRate   float64
	AverageWorkHours float64
	TotalWorkHours   float64
	AverageMood      float64
	ReportCount      int
}

// WeeklyReportFilter 週報検索フィルタ
type WeeklyReportFilter struct {
	StartDate    string
	EndDate      string
	Status       []string
	UserIDs      []uuid.UUID
	DepartmentID *uuid.UUID
	Limit        int
	Offset       int
}

// GetAll フィルタ条件に基づいて週報を取得（エクスポート用）
func (r *WeeklyReportRepository) GetAll(ctx context.Context, filter WeeklyReportFilter) ([]model.WeeklyReport, error) {
	var reports []model.WeeklyReport

	query := r.WithContext(ctx).
		Joins("JOIN users ON users.id = weekly_reports.user_id").
		Where("weekly_reports.deleted_at IS NULL").
		Where("users.deleted_at IS NULL")

	// 日付範囲フィルタ
	if filter.StartDate != "" && filter.EndDate != "" {
		query = query.Where("weekly_reports.start_date >= ? AND weekly_reports.end_date <= ?", filter.StartDate, filter.EndDate)
	}

	// ステータスフィルタ
	if len(filter.Status) > 0 {
		query = query.Where("weekly_reports.status IN ?", filter.Status)
	}

	// ユーザーIDフィルタ
	if len(filter.UserIDs) > 0 {
		query = query.Where("weekly_reports.user_id IN ?", filter.UserIDs)
	}

	// 部署IDフィルタ
	if filter.DepartmentID != nil && *filter.DepartmentID != uuid.Nil {
		query = query.Where("users.department_id = ?", *filter.DepartmentID)
	}

	// ソート
	query = query.Order("weekly_reports.start_date DESC, weekly_reports.created_at DESC")

	// リミット・オフセット
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	err := query.Find(&reports).Error
	if err != nil {
		r.Logger.Error("Failed to get all weekly reports with filter",
			zap.Error(err),
			zap.Any("filter", filter))
		return nil, err
	}

	return reports, nil
}

// GetByID IDで週報を取得（新しいシグネチャ）
func (r *WeeklyReportRepository) GetByID(ctx context.Context, id string) (*model.WeeklyReport, error) {
	reportID, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	return r.FindByID(ctx, reportID)
}
