package service

import (
    "bytes"
    "context"
    "encoding/csv"
    "fmt"
    "time"

	"github.com/duesk/monstera/internal/cache"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AdminWeeklyReportService 管理者用週報サービスのインターフェース
type AdminWeeklyReportService interface {
	GetWeeklyReports(ctx context.Context, page, limit int, status, userID, dateFrom, dateTo string) ([]dto.AdminWeeklyReportDTO, int64, error)
	GetWeeklyReportDetail(ctx context.Context, reportID string) (*dto.AdminWeeklyReportDetailDTO, error)
	CommentWeeklyReport(ctx context.Context, reportID, userID string, comment string) error
	GetMonthlyAttendance(ctx context.Context, month string) ([]dto.MonthlyAttendanceDTO, error)
	GetFollowUpRequiredUsers(ctx context.Context) ([]dto.FollowUpUserDTO, error)
	ExportMonthlyReport(ctx context.Context, month, format string, schema *string) ([]byte, string, string, error)
	// サマリー統計API
	GetWeeklyReportSummary(ctx context.Context, startDate, endDate time.Time, departmentID *string) (*dto.WeeklyReportSummaryStatsDTO, error)
	// 月次サマリー統計API
    GetMonthlySummary(ctx context.Context, year int, month int, departmentID *string) (*dto.MonthlySummaryDTO, error)
    // 承認フロー
    ApproveWeeklyReport(ctx context.Context, reportID, approverID string, comment *string) error
    RejectWeeklyReport(ctx context.Context, reportID, approverID string, comment string) error
    ReturnWeeklyReport(ctx context.Context, reportID, approverID string, comment string) error
}

// adminWeeklyReportService 管理者用週報サービスの実装
type adminWeeklyReportService struct {
	db               *gorm.DB
	weeklyReportRepo repository.WeeklyReportRepository
	userRepo         repository.UserRepository
	departmentRepo   repository.DepartmentRepository
	cacheManager     *cache.CacheManager
	logger           *zap.Logger
}

// NewAdminWeeklyReportService 管理者用週報サービスのインスタンスを生成
func NewAdminWeeklyReportService(
	db *gorm.DB,
	weeklyReportRepo repository.WeeklyReportRepository,
	userRepo repository.UserRepository,
	departmentRepo repository.DepartmentRepository,
	cacheManager *cache.CacheManager,
	logger *zap.Logger,
) AdminWeeklyReportService {
	return &adminWeeklyReportService{
		db:               db,
		weeklyReportRepo: weeklyReportRepo,
		userRepo:         userRepo,
		departmentRepo:   departmentRepo,
		cacheManager:     cacheManager,
		logger:           logger,
	}
}

// GetWeeklyReports 週報一覧を取得
func (s *adminWeeklyReportService) GetWeeklyReports(
	ctx context.Context,
	page, limit int,
	status, userID, dateFrom, dateTo string,
) ([]dto.AdminWeeklyReportDTO, int64, error) {
	// オフセットを計算
	offset := (page - 1) * limit

	// クエリ構築
	query := s.db.WithContext(ctx).Model(&model.WeeklyReport{}).
		Preload("User").
		Where("deleted_at IS NULL")

	// フィルター適用
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if dateFrom != "" {
		query = query.Where("start_date >= ?", dateFrom)
	}
	if dateTo != "" {
		query = query.Where("end_date <= ?", dateTo)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		s.logger.Error("Failed to count weekly reports", zap.Error(err))
		return nil, 0, err
	}

	// データを取得
	var reports []model.WeeklyReport
	if err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&reports).Error; err != nil {
		s.logger.Error("Failed to get weekly reports", zap.Error(err))
		return nil, 0, err
	}

	// DTOに変換（Phase 1: 文字列ステータス・ムードを含む）
	dtos := make([]dto.AdminWeeklyReportDTO, len(reports))
	for i, report := range reports {
		userName := fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName)
		dtos[i] = dto.ConvertAdminWeeklyReportDTO(&report, userName, report.User.Email)
	}

	return dtos, total, nil
}

// GetWeeklyReportDetail 週報詳細を取得
func (s *adminWeeklyReportService) GetWeeklyReportDetail(ctx context.Context, reportID string) (*dto.AdminWeeklyReportDetailDTO, error) {
	var report model.WeeklyReport
	if err := s.db.WithContext(ctx).
		Preload("User").
		Preload("DailyRecords").
		Where("id = ? AND deleted_at IS NULL", reportID).
		First(&report).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("週報が見つかりません")
		}
		s.logger.Error("Failed to get weekly report detail", zap.Error(err))
		return nil, err
	}

	// DTOに変換（Phase 1: 文字列ステータス・ムードを含む）
	userName := fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName)
	result := &dto.AdminWeeklyReportDetailDTO{
		AdminWeeklyReportDTO: dto.ConvertAdminWeeklyReportDTO(&report, userName, report.User.Email),
		DailyRecords:         make([]dto.DailyRecordDTO, len(report.DailyRecords)),
		WorkHours:            []dto.WorkHourDTO{},
	}

	// 日次レコードをDTOに変換
	for i, record := range report.DailyRecords {
		result.DailyRecords[i] = dto.DailyRecordDTO{
			ID:               record.ID,
			RecordDate:       record.Date,
			IsHoliday:        false, // TODO: 休日判定ロジックを実装
			IsHolidayWork:    record.IsHolidayWork,
			CompanyWorkHours: record.WorkHours,
			ClientWorkHours:  record.ClientWorkHours,
			TotalWorkHours:   record.WorkHours + record.ClientWorkHours,
			Remarks:          record.Remarks,
			CreatedAt:        record.CreatedAt,
		}
	}

	// WorkHoursは現在未実装
	// TODO: WorkHourモデルをWeeklyReportに関連付ける

	return result, nil
}

// CommentWeeklyReport 週報にコメントを追加
func (s *adminWeeklyReportService) CommentWeeklyReport(ctx context.Context, reportID, userID string, comment string) error {
	// トランザクション開始
	tx := s.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 週報を取得して更新
	var report model.WeeklyReport
	if err := tx.Where("id = ? AND deleted_at IS NULL", reportID).First(&report).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("週報が見つかりません")
		}
		return err
	}

	// コメントを更新
	now := time.Now()
	report.ManagerComment = &comment
	report.CommentedBy = &userID
	report.CommentedAt = &now

	if err := tx.Save(&report).Error; err != nil {
		tx.Rollback()
		s.logger.Error("Failed to update weekly report comment", zap.Error(err))
		return err
	}

	// TODO: 通知を送信（エンジニアに管理者からのコメントがあることを通知）

	if err := tx.Commit().Error; err != nil {
		return err
	}

	// キャッシュを無効化
	if s.cacheManager != nil {
		// 特定の週報詳細キャッシュを無効化
		if err := s.cacheManager.WeeklyReport().InvalidateWeeklyReportDetail(ctx, reportID); err != nil {
			s.logger.Warn("Failed to invalidate weekly report detail cache", zap.Error(err))
		}
		// 週報リストキャッシュも無効化
		if err := s.cacheManager.WeeklyReport().InvalidateWeeklyReportList(ctx); err != nil {
			s.logger.Warn("Failed to invalidate weekly report list cache", zap.Error(err))
		}
	}

	return nil
}

// ApproveWeeklyReport 週報を承認に更新
func (s *adminWeeklyReportService) ApproveWeeklyReport(ctx context.Context, reportID, approverID string, comment *string) error {
    tx := s.db.WithContext(ctx).Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()

    var report model.WeeklyReport
    if err := tx.Where("id = ? AND deleted_at IS NULL", reportID).First(&report).Error; err != nil {
        tx.Rollback()
        if err == gorm.ErrRecordNotFound {
            return fmt.Errorf("週報が見つかりません")
        }
        return err
    }

    // 提出済みのみ承認可能
    if report.Status != model.WeeklyReportStatusSubmitted {
        tx.Rollback()
        return fmt.Errorf("この週報は承認可能な状態ではありません")
    }

    now := time.Now()
    report.Status = model.WeeklyReportStatusApproved
    if comment != nil {
        report.ManagerComment = comment
    }
    report.CommentedBy = &approverID
    report.CommentedAt = &now

    if err := tx.Save(&report).Error; err != nil {
        tx.Rollback()
        s.logger.Error("Failed to approve weekly report", zap.Error(err))
        return err
    }

    if err := tx.Commit().Error; err != nil {
        return err
    }

    if s.cacheManager != nil {
        if err := s.cacheManager.WeeklyReport().InvalidateWeeklyReportDetail(ctx, reportID); err != nil {
            s.logger.Warn("Failed to invalidate weekly report detail cache", zap.Error(err))
        }
        if err := s.cacheManager.WeeklyReport().InvalidateWeeklyReportList(ctx); err != nil {
            s.logger.Warn("Failed to invalidate weekly report list cache", zap.Error(err))
        }
    }
    return nil
}

// RejectWeeklyReport 週報を却下に更新
func (s *adminWeeklyReportService) RejectWeeklyReport(ctx context.Context, reportID, approverID string, comment string) error {
    tx := s.db.WithContext(ctx).Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()

    var report model.WeeklyReport
    if err := tx.Where("id = ? AND deleted_at IS NULL", reportID).First(&report).Error; err != nil {
        tx.Rollback()
        if err == gorm.ErrRecordNotFound {
            return fmt.Errorf("週報が見つかりません")
        }
        return err
    }

    // 提出済みのみ却下可能
    if report.Status != model.WeeklyReportStatusSubmitted {
        tx.Rollback()
        return fmt.Errorf("この週報は却下可能な状態ではありません")
    }

    now := time.Now()
    report.Status = model.WeeklyReportStatusRejected
    report.ManagerComment = &comment
    report.CommentedBy = &approverID
    report.CommentedAt = &now

    if err := tx.Save(&report).Error; err != nil {
        tx.Rollback()
        s.logger.Error("Failed to reject weekly report", zap.Error(err))
        return err
    }

    if err := tx.Commit().Error; err != nil {
        return err
    }

    if s.cacheManager != nil {
        if err := s.cacheManager.WeeklyReport().InvalidateWeeklyReportDetail(ctx, reportID); err != nil {
            s.logger.Warn("Failed to invalidate weekly report detail cache", zap.Error(err))
        }
        if err := s.cacheManager.WeeklyReport().InvalidateWeeklyReportList(ctx); err != nil {
            s.logger.Warn("Failed to invalidate weekly report list cache", zap.Error(err))
        }
    }
    return nil
}

// ReturnWeeklyReport 週報を差し戻しに更新
func (s *adminWeeklyReportService) ReturnWeeklyReport(ctx context.Context, reportID, approverID string, comment string) error {
    tx := s.db.WithContext(ctx).Begin()
    defer func() {
        if r := recover(); r != nil { tx.Rollback() }
    }()

    var report model.WeeklyReport
    if err := tx.Where("id = ? AND deleted_at IS NULL", reportID).First(&report).Error; err != nil {
        tx.Rollback()
        if err == gorm.ErrRecordNotFound {
            return fmt.Errorf("週報が見つかりません")
        }
        return err
    }

    if report.Status != model.WeeklyReportStatusSubmitted {
        tx.Rollback()
        return fmt.Errorf("この週報は差し戻し可能な状態ではありません")
    }

    now := time.Now()
    report.Status = model.WeeklyReportStatusReturned
    report.ManagerComment = &comment
    report.CommentedBy = &approverID
    report.CommentedAt = &now

    if err := tx.Save(&report).Error; err != nil {
        tx.Rollback()
        s.logger.Error("Failed to return weekly report", zap.Error(err))
        return err
    }

    if err := tx.Commit().Error; err != nil { return err }

    if s.cacheManager != nil {
        if err := s.cacheManager.WeeklyReport().InvalidateWeeklyReportDetail(ctx, reportID); err != nil {
            s.logger.Warn("Failed to invalidate weekly report detail cache", zap.Error(err))
        }
        if err := s.cacheManager.WeeklyReport().InvalidateWeeklyReportList(ctx); err != nil {
            s.logger.Warn("Failed to invalidate weekly report list cache", zap.Error(err))
        }
    }
    return nil
}

// GetMonthlyAttendance 月次勤怠一覧を取得
func (s *adminWeeklyReportService) GetMonthlyAttendance(ctx context.Context, month string) ([]dto.MonthlyAttendanceDTO, error) {
	// 月の開始日と終了日を計算
	monthTime, err := time.Parse("2006-01", month)
	if err != nil {
		return nil, fmt.Errorf("無効な月の形式です")
	}

	startDate := monthTime
	endDate := monthTime.AddDate(0, 1, -1)

	// 該当月の週報を取得
	var reports []model.WeeklyReport
	if err := s.db.WithContext(ctx).
		Preload("User").
		Preload("DailyRecords").
		Where("deleted_at IS NULL").
		Where("start_date <= ? AND end_date >= ?", endDate, startDate).
		Find(&reports).Error; err != nil {
		s.logger.Error("Failed to get monthly attendance", zap.Error(err))
		return nil, err
	}

	// ユーザーごとに集計
	userAttendanceMap := make(map[string]*dto.MonthlyAttendanceDTO)

	for _, report := range reports {
		if _, exists := userAttendanceMap[report.UserID]; !exists {
			userAttendanceMap[report.UserID] = &dto.MonthlyAttendanceDTO{
				UserID:           report.UserID,
				UserName:         fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName),
				Month:            month,
				TotalWorkDays:    0,
				TotalWorkHours:   0,
				TotalClientHours: 0,
				WeeklyReports:    []dto.WeeklyReportSummaryDTO{},
			}
		}

		attendance := userAttendanceMap[report.UserID]

		// 週報サマリーを追加（Phase 1: 文字列ステータスを含む）
		summary := dto.WeeklyReportSummaryDTO{
			WeekStart:      report.StartDate,
			WeekEnd:        report.EndDate,
			Status:         0, // レガシー互換性のため（廃止予定）
			StatusString:   string(report.Status),
			TotalWorkHours: report.TotalWorkHours,
			ClientHours:    report.ClientWorkHours,
		}

		attendance.WeeklyReports = append(attendance.WeeklyReports, summary)
		attendance.TotalWorkHours += report.TotalWorkHours
		attendance.TotalClientHours += report.ClientWorkHours

		// 勤務日数を計算
		for _, record := range report.DailyRecords {
			if record.WorkHours > 0 || record.ClientWorkHours > 0 {
				attendance.TotalWorkDays++
			}
		}
	}

	// マップから配列に変換
	result := make([]dto.MonthlyAttendanceDTO, 0, len(userAttendanceMap))
	for _, attendance := range userAttendanceMap {
		result = append(result, *attendance)
	}

	return result, nil
}

// GetFollowUpRequiredUsers フォローアップが必要なユーザー一覧を取得
func (s *adminWeeklyReportService) GetFollowUpRequiredUsers(ctx context.Context) ([]dto.FollowUpUserDTO, error) {
	// フォローアップが必要なユーザーを取得
	var users []model.User
	if err := s.db.WithContext(ctx).
		Where("follow_up_required = ? AND active = ? AND deleted_at IS NULL", true, true).
		Find(&users).Error; err != nil {
		s.logger.Error("Failed to get follow up required users", zap.Error(err))
		return nil, err
	}

	if len(users) == 0 {
		return []dto.FollowUpUserDTO{}, nil
	}

	// ユーザーIDを収集
	userIDs := make([]string, len(users))
	userMap := make(map[string]model.User)
	for i, user := range users {
		userIDs[i] = user.ID
		userMap[user.ID] = user
	}

	// 各ユーザーの最新週報を一括で取得するサブクエリ
	// サブクエリで各ユーザーの最新週報の終了日を取得
	type LatestReportInfo struct {
		UserID   string                       `gorm:"column:user_id"`
		EndDate  time.Time                    `gorm:"column:end_date"`
		Status   model.WeeklyReportStatusEnum `gorm:"column:status"`
		ReportID string                       `gorm:"column:id"`
	}

	var latestReports []LatestReportInfo
	subQuery := s.db.WithContext(ctx).
		Table("weekly_reports wr1").
		Select("wr1.user_id, wr1.end_date, wr1.status, wr1.id").
		Joins("INNER JOIN (SELECT user_id, MAX(end_date) as max_end_date FROM weekly_reports WHERE deleted_at IS NULL GROUP BY user_id) wr2 ON wr1.user_id = wr2.user_id AND wr1.end_date = wr2.max_end_date").
		Where("wr1.user_id IN ? AND wr1.deleted_at IS NULL", userIDs)

	if err := subQuery.Scan(&latestReports).Error; err != nil {
		s.logger.Error("Failed to get latest reports", zap.Error(err))
		return nil, err
	}

	// 最新週報をユーザーIDでマップ化
	latestReportMap := make(map[string]LatestReportInfo)
	for _, report := range latestReports {
		latestReportMap[report.UserID] = report
	}

	// 結果を構築
	result := make([]dto.FollowUpUserDTO, 0, len(users))
	for _, user := range users {
		followUpUser := dto.FollowUpUserDTO{
			UserID:           user.ID,
			UserName:         fmt.Sprintf("%s %s", user.LastName, user.FirstName),
			UserEmail:        user.Email,
			FollowUpReason:   user.FollowUpReason,
			LastFollowUpDate: user.LastFollowUpDate,
		}

		// 最新週報情報を設定
		if latestReport, exists := latestReportMap[user.ID]; exists {
			followUpUser.LastReportDate = &latestReport.EndDate
			status := 0 // レガシー互換性のため（廃止予定）
			followUpUser.LastReportStatus = &status
			// Phase 1: 文字列ステータスを追加
			statusString := string(latestReport.Status)
			followUpUser.LastReportStatusString = &statusString

			// 未提出期間を計算
			daysSinceLastReport := int(time.Since(latestReport.EndDate).Hours() / 24)
			followUpUser.DaysSinceLastReport = &daysSinceLastReport
		}

		result = append(result, followUpUser)
	}

	return result, nil
}

// ExportMonthlyReport 月次レポートをエクスポート
func (s *adminWeeklyReportService) ExportMonthlyReport(ctx context.Context, month, format string, schema *string) ([]byte, string, string, error) {
    // 月次勤怠データを取得
    // schema指定がweekly_minimalの場合は週報最小CSVを生成（非破壊切替）
    if schema != nil && *schema == "weekly_minimal" {
        if format != "csv" {
            return nil, "", "", fmt.Errorf("サポートされていない形式です")
        }
        return s.exportWeeklyMinimalCSV(ctx, month)
    }

    attendance, err := s.GetMonthlyAttendance(ctx, month)
    if err != nil {
        return nil, "", "", err
    }

    switch format {
    case "csv":
        return s.exportToCSV(attendance, month)
    default:
        return nil, "", "", fmt.Errorf("サポートされていない形式です")
    }
}

// exportToCSV CSV形式でエクスポート
func (s *adminWeeklyReportService) exportToCSV(attendance []dto.MonthlyAttendanceDTO, month string) ([]byte, string, string, error) {
    // TODO: CSV生成ロジックを実装（Excelは初期スコープ外）
	// ここでは簡易的な実装を示します
	csvData := "ユーザー名,月,総勤務日数,総勤務時間,総クライアント先時間\n"

	for _, a := range attendance {
		csvData += fmt.Sprintf("%s,%s,%d,%.2f,%.2f\n",
			a.UserName, a.Month, a.TotalWorkDays, a.TotalWorkHours, a.TotalClientHours)
	}

	filename := fmt.Sprintf("monthly_attendance_%s.csv", month)
	return []byte(csvData), filename, "text/csv", nil
}

// exportWeeklyMinimalCSV 週報最小8列のCSVをエクスポート（契約 v0.1.2 準拠）
func (s *adminWeeklyReportService) exportWeeklyMinimalCSV(ctx context.Context, month string) ([]byte, string, string, error) {
    // month: "YYYY-MM"
    start, end, err := s.parseMonthRange(month)
    if err != nil {
        return nil, "", "", err
    }

    // 対象月内に開始日のある週報を取得
    var reports []model.WeeklyReport
    q := s.db.WithContext(ctx).
        Model(&model.WeeklyReport{}).
        Preload("User").
        Where("deleted_at IS NULL").
        Where("start_date >= ? AND start_date < ?", start, end).
        Order("start_date ASC, user_id ASC")

    if err := q.Find(&reports).Error; err != nil {
        s.logger.Error("Failed to query weekly reports for CSV", zap.Error(err))
        return nil, "", "", err
    }

    // ヘッダー
    header := []string{"エンジニア名", "メールアドレス", "週開始日", "週終了日", "ステータス", "総勤務時間", "管理者コメント", "提出日時"}

    // バッファにCSVを書き出し
    var buf bytes.Buffer
    w := csv.NewWriter(&buf)
    // RFC4180に近い挙動（カンマ区切り、クォートはwriterが対応）
    if err := w.Write(header); err != nil {
        s.logger.Error("Failed to write CSV header", zap.Error(err))
        return nil, "", "", err
    }

    for _, r := range reports {
        userName := fmt.Sprintf("%s %s", r.User.LastName, r.User.FirstName)
        email := r.User.Email
        startStr := r.StartDate.Format("2006-01-02")
        endStr := r.EndDate.Format("2006-01-02")
        status := string(r.Status)
        total := fmt.Sprintf("%g", r.TotalWorkHours) // 数値表現
        comment := ""
        if r.ManagerComment != nil {
            comment = *r.ManagerComment
        }
        submitted := ""
        if r.SubmittedAt != nil {
            submitted = r.SubmittedAt.Local().Format("2006-01-02 15:04")
        }

        record := []string{userName, email, startStr, endStr, status, total, comment, submitted}
        if err := w.Write(record); err != nil {
            s.logger.Error("Failed to write CSV record", zap.Error(err))
            return nil, "", "", err
        }
    }
    w.Flush()
    if err := w.Error(); err != nil {
        s.logger.Error("Failed to flush CSV", zap.Error(err))
        return nil, "", "", err
    }

    // ファイル名とContent-Type
    filename := fmt.Sprintf("weekly_reports_%s.csv", time.Now().Format("20060102"))
    contentType := "text/csv; charset=utf-8"

    // BOM付与（UTF-8 BOM: EF BB BF）
    bom := []byte{0xEF, 0xBB, 0xBF}
    withBOM := append(bom, buf.Bytes()...)
    return withBOM, filename, contentType, nil
}

func (s *adminWeeklyReportService) parseMonthRange(month string) (time.Time, time.Time, error) {
    // month形式: YYYY-MM
    t, err := time.Parse("2006-01", month)
    if err != nil {
        return time.Time{}, time.Time{}, fmt.Errorf("月の形式が不正です: %w", err)
    }
    start := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
    // 翌月初日
    next := start.AddDate(0, 1, 0)
    return start, next, nil
}

// Excel形式はv0では未サポート

// GetWeeklyReportSummary 週報サマリー統計を取得
func (s *adminWeeklyReportService) GetWeeklyReportSummary(
	ctx context.Context,
	startDate, endDate time.Time,
	departmentID *string,
) (*dto.WeeklyReportSummaryStatsDTO, error) {
	s.logger.Info("Getting weekly report summary",
		zap.Time("start_date", startDate),
		zap.Time("end_date", endDate),
		zap.Any("department_id", departmentID))

	// キャッシュから取得を試みる
	if s.cacheManager != nil {
		cachedSummary, err := s.cacheManager.WeeklyReport().GetWeeklyReportSummary(ctx, startDate, endDate, departmentID)
		if err == nil {
			s.logger.Debug("Weekly report summary served from cache")
			return cachedSummary, nil
		} else if err != redis.Nil {
			// Redisエラーの場合はログに記録して続行
			s.logger.Warn("Failed to get summary from cache", zap.Error(err))
		}
	}

	// メインクエリ: 週報データを取得
	query := s.db.WithContext(ctx).Model(&model.WeeklyReport{}).
		Preload("User").
		Preload("DailyRecords").
		Where("deleted_at IS NULL").
		Where("start_date >= ? AND end_date <= ?", startDate, endDate)

	// 部署フィルター
	if departmentID != nil {
		query = query.Joins("JOIN users ON weekly_reports.user_id = users.id").
			Where("users.department_id = ?", *departmentID)
	}

	var reports []model.WeeklyReport
	if err := query.Find(&reports).Error; err != nil {
		s.logger.Error("Failed to get weekly reports for summary", zap.Error(err))
		return nil, err
	}

	// アクティブユーザーを取得
	var totalUsers int64
	userQuery := s.db.WithContext(ctx).Model(&model.User{}).
		Where("active = ? AND deleted_at IS NULL", true)

	if departmentID != nil {
		userQuery = userQuery.Where("department_id = ?", *departmentID)
	}

	if err := userQuery.Count(&totalUsers).Error; err != nil {
		s.logger.Error("Failed to count total users", zap.Error(err))
		return nil, err
	}

	// 統計を計算
	summary := &dto.WeeklyReportSummaryStatsDTO{
		PeriodStart:     startDate,
		PeriodEnd:       endDate,
		TotalUsers:      int(totalUsers),
		SubmissionStats: s.calculateSubmissionStats(reports, int(totalUsers)),
		WorkHourStats:   s.calculateWorkHourStats(reports),
		UserSummaries:   s.calculateUserSummaries(reports),
	}

	// 部署別統計を計算
	departmentStats, err := s.calculateDepartmentStats(ctx, startDate, endDate)
	if err != nil {
		s.logger.Error("Failed to calculate department stats", zap.Error(err))
		return nil, err
	}
	summary.DepartmentStats = departmentStats

	// トレンド分析を計算
	trendAnalysis, err := s.calculateTrendAnalysis(ctx, startDate, endDate, departmentID)
	if err != nil {
		s.logger.Error("Failed to calculate trend analysis", zap.Error(err))
		return nil, err
	}
	summary.TrendAnalysis = trendAnalysis

	// キャッシュに保存
	if s.cacheManager != nil {
		if err := s.cacheManager.WeeklyReport().SetWeeklyReportSummary(ctx, startDate, endDate, departmentID, summary); err != nil {
			// キャッシュ保存の失敗はログに記録して続行
			s.logger.Warn("Failed to save summary to cache", zap.Error(err))
		}
	}

	return summary, nil
}

// calculateSubmissionStats 提出状況統計を計算
func (s *adminWeeklyReportService) calculateSubmissionStats(reports []model.WeeklyReport, totalUsers int) dto.SubmissionStatsDTO {
	submittedCount := 0
	draftCount := 0
	overdueCount := 0
	onTimeCount := 0

	for _, report := range reports {
		switch report.Status {
		case model.WeeklyReportStatusSubmitted:
			submittedCount++
			// 期限内提出チェック（簡易版）
			if report.SubmittedAt != nil {
				// 週末（日曜日）の23:59を期限として計算
				deadline := report.EndDate.AddDate(0, 0, 1).Add(23*time.Hour + 59*time.Minute)
				if report.SubmittedAt.Before(deadline) {
					onTimeCount++
				}
			}
		case model.WeeklyReportStatusDraft:
			draftCount++
			// 期限を過ぎているかチェック
			deadline := report.EndDate.AddDate(0, 0, 1).Add(23*time.Hour + 59*time.Minute)
			if time.Now().After(deadline) {
				overdueCount++
			}
		}
	}

	submissionRate := 0.0
	onTimeRate := 0.0
	if totalUsers > 0 {
		submissionRate = float64(submittedCount) / float64(totalUsers) * 100
	}
	if submittedCount > 0 {
		onTimeRate = float64(onTimeCount) / float64(submittedCount) * 100
	}

	return dto.SubmissionStatsDTO{
		SubmittedCount: submittedCount,
		DraftCount:     draftCount,
		OverdueCount:   overdueCount,
		SubmissionRate: submissionRate,
		OnTimeRate:     onTimeRate,
	}
}

// calculateWorkHourStats 勤務時間統計を計算
func (s *adminWeeklyReportService) calculateWorkHourStats(reports []model.WeeklyReport) dto.WorkHourStatsDTO {
	if len(reports) == 0 {
		return dto.WorkHourStatsDTO{}
	}

	var workHours []float64
	totalWorkHours := 0.0
	overtimeUsers := 0

	for _, report := range reports {
		workHours = append(workHours, report.TotalWorkHours)
		totalWorkHours += report.TotalWorkHours

		// 40時間を超えたら残業とみなす
		if report.TotalWorkHours > 40.0 {
			overtimeUsers++
		}
	}

	// 中央値を計算
	medianWorkHours := s.calculateMedian(workHours)

	// 最大・最小値
	maxWorkHours, minWorkHours := s.calculateMinMax(workHours)

	// 稼働率の簡易計算（実働時間 / 標準勤務時間）
	standardWorkHours := 40.0
	averageWorkHours := totalWorkHours / float64(len(reports))
	utilizationRate := (averageWorkHours / standardWorkHours) * 100

	return dto.WorkHourStatsDTO{
		TotalWorkHours:   totalWorkHours,
		AverageWorkHours: averageWorkHours,
		MedianWorkHours:  medianWorkHours,
		MaxWorkHours:     maxWorkHours,
		MinWorkHours:     minWorkHours,
		OvertimeUsers:    overtimeUsers,
		UtilizationRate:  utilizationRate,
	}
}

// calculateUserSummaries ユーザー別サマリーを計算
func (s *adminWeeklyReportService) calculateUserSummaries(reports []model.WeeklyReport) []dto.UserWeeklyReportSummaryDTO {
	userMap := make(map[string]*dto.UserWeeklyReportSummaryDTO)

	for _, report := range reports {
		if _, exists := userMap[report.UserID]; !exists {
			// Userモデルでは部署名がDepartmentフィールド（string型）で直接格納されている
			departmentName := report.User.Department

			userMap[report.UserID] = &dto.UserWeeklyReportSummaryDTO{
				UserID:         report.UserID,
				UserName:       fmt.Sprintf("%s %s", report.User.LastName, report.User.FirstName),
				UserEmail:      report.User.Email,
				DepartmentName: departmentName,
				ReportCount:    0,
				TotalWorkHours: 0,
			}
		}

		userSummary := userMap[report.UserID]
		userSummary.ReportCount++
		userSummary.TotalWorkHours += report.TotalWorkHours

		// 最新の提出日を更新
		if report.Status == model.WeeklyReportStatusSubmitted {
			if userSummary.LastSubmission == nil || (report.SubmittedAt != nil && report.SubmittedAt.After(*userSummary.LastSubmission)) {
				userSummary.LastSubmission = report.SubmittedAt
			}
		}
	}

	// 平均値を計算し、結果を配列に変換
	result := make([]dto.UserWeeklyReportSummaryDTO, 0, len(userMap))
	for _, userSummary := range userMap {
		if userSummary.ReportCount > 0 {
			userSummary.AverageWorkHours = userSummary.TotalWorkHours / float64(userSummary.ReportCount)
			// TODO: 提出率の計算
		}
		result = append(result, *userSummary)
	}

	return result
}

// calculateDepartmentStats 部署別統計を計算
func (s *adminWeeklyReportService) calculateDepartmentStats(ctx context.Context, startDate, endDate time.Time) ([]dto.DepartmentStatsDTO, error) {
	// 部署別集計クエリ
	type DepartmentStat struct {
		DepartmentID   string  `gorm:"column:department_id"`
		DepartmentName string  `gorm:"column:department_name"`
		UserCount      int     `gorm:"column:user_count"`
		SubmittedCount int     `gorm:"column:submitted_count"`
		TotalWorkHours float64 `gorm:"column:total_work_hours"`
	}

	var departmentStats []DepartmentStat
	err := s.db.WithContext(ctx).
		Table("departments d").
		Select(`
			d.id as department_id,
			d.name as department_name,
			COUNT(DISTINCT u.id) as user_count,
			COUNT(CASE WHEN wr.status = 'submitted' THEN 1 END) as submitted_count,
			COALESCE(SUM(wr.total_work_hours), 0) as total_work_hours
		`).
		Joins("LEFT JOIN users u ON d.id = u.department_id AND u.active = true AND u.deleted_at IS NULL").
		Joins("LEFT JOIN weekly_reports wr ON u.id = wr.user_id AND wr.start_date >= ? AND wr.end_date <= ? AND wr.deleted_at IS NULL", startDate, endDate).
		Where("d.deleted_at IS NULL").
		Group("d.id, d.name").
		Scan(&departmentStats).Error

	if err != nil {
		return nil, err
	}

	// DTOに変換
	result := make([]dto.DepartmentStatsDTO, len(departmentStats))
	for i, stat := range departmentStats {
		submissionRate := 0.0
		if stat.UserCount > 0 {
			submissionRate = float64(stat.SubmittedCount) / float64(stat.UserCount) * 100
		}

		averageWorkHours := 0.0
		if stat.SubmittedCount > 0 {
			averageWorkHours = stat.TotalWorkHours / float64(stat.SubmittedCount)
		}

		result[i] = dto.DepartmentStatsDTO{
			DepartmentID:     stat.DepartmentID,
			DepartmentName:   stat.DepartmentName,
			UserCount:        stat.UserCount,
			SubmissionRate:   submissionRate,
			AverageWorkHours: averageWorkHours,
		}
	}

	return result, nil
}

// calculateTrendAnalysis トレンド分析を計算
func (s *adminWeeklyReportService) calculateTrendAnalysis(ctx context.Context, startDate, endDate time.Time, departmentID *string) (dto.WeeklyReportTrendAnalysisDTO, error) {
	// 前期間のデータを取得
	previousPeriodDuration := endDate.Sub(startDate)
	previousStartDate := startDate.Add(-previousPeriodDuration)
	previousEndDate := startDate.Add(-24 * time.Hour)

	// 前期の統計を取得
	previousSummary, err := s.getBasicStats(ctx, previousStartDate, previousEndDate, departmentID)
	if err != nil {
		return dto.WeeklyReportTrendAnalysisDTO{}, err
	}

	// 現在期の統計を取得
	currentSummary, err := s.getBasicStats(ctx, startDate, endDate, departmentID)
	if err != nil {
		return dto.WeeklyReportTrendAnalysisDTO{}, err
	}

	// トレンドを計算
	submissionTrend := s.calculateTrend(currentSummary.SubmissionRate, previousSummary.SubmissionRate)
	workHourTrend := s.calculateTrend(currentSummary.AverageWorkHours, previousSummary.AverageWorkHours)

	// 週次比較は簡易実装
	weeklyComparison := dto.WeeklyComparisonDTO{
		CurrentWeek: dto.WeeklyStatsDTO{
			WeekStart:        startDate,
			WeekEnd:          endDate,
			SubmissionCount:  currentSummary.SubmittedCount,
			AverageWorkHours: currentSummary.AverageWorkHours,
		},
		PreviousWeek: dto.WeeklyStatsDTO{
			WeekStart:        previousStartDate,
			WeekEnd:          previousEndDate,
			SubmissionCount:  previousSummary.SubmittedCount,
			AverageWorkHours: previousSummary.AverageWorkHours,
		},
	}

	return dto.WeeklyReportTrendAnalysisDTO{
		SubmissionTrend:  submissionTrend,
		WorkHourTrend:    workHourTrend,
		WeeklyComparison: weeklyComparison,
	}, nil
}

// ヘルパー関数群

// getBasicStats 基本統計を取得
type BasicStats struct {
	SubmittedCount   int
	SubmissionRate   float64
	AverageWorkHours float64
}

func (s *adminWeeklyReportService) getBasicStats(ctx context.Context, startDate, endDate time.Time, departmentID *string) (BasicStats, error) {
	query := s.db.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("deleted_at IS NULL").
		Where("start_date >= ? AND end_date <= ?", startDate, endDate)

	if departmentID != nil {
		query = query.Joins("JOIN users ON weekly_reports.user_id = users.id").
			Where("users.department_id = ?", *departmentID)
	}

	var result struct {
		TotalCount       int     `gorm:"column:total_count"`
		SubmittedCount   int     `gorm:"column:submitted_count"`
		AverageWorkHours float64 `gorm:"column:average_work_hours"`
	}

	err := query.Select(`
		COUNT(*) as total_count,
		COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_count,
		COALESCE(AVG(total_work_hours), 0) as average_work_hours
	`).Scan(&result).Error

	if err != nil {
		return BasicStats{}, err
	}

	submissionRate := 0.0
	if result.TotalCount > 0 {
		submissionRate = float64(result.SubmittedCount) / float64(result.TotalCount) * 100
	}

	return BasicStats{
		SubmittedCount:   result.SubmittedCount,
		SubmissionRate:   submissionRate,
		AverageWorkHours: result.AverageWorkHours,
	}, nil
}

// calculateTrend トレンドを計算
func (s *adminWeeklyReportService) calculateTrend(current, previous float64) dto.TrendDataDTO {
	change := current - previous
	changeRate := 0.0
	if previous != 0 {
		changeRate = (change / previous) * 100
	}

	trend := "stable"
	if change > 0.1 { // 0.1を闾値として使用
		trend = "up"
	} else if change < -0.1 {
		trend = "down"
	}

	return dto.TrendDataDTO{
		Current:    current,
		Previous:   previous,
		Change:     change,
		ChangeRate: changeRate,
		Trend:      trend,
	}
}

// calculateMedian 中央値を計算
func (s *adminWeeklyReportService) calculateMedian(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}

	// コピーしてソート
	sorted := make([]float64, len(values))
	copy(sorted, values)

	// 簡単なバブルソート
	for i := 0; i < len(sorted); i++ {
		for j := 0; j < len(sorted)-1-i; j++ {
			if sorted[j] > sorted[j+1] {
				sorted[j], sorted[j+1] = sorted[j+1], sorted[j]
			}
		}
	}

	n := len(sorted)
	if n%2 == 0 {
		return (sorted[n/2-1] + sorted[n/2]) / 2
	}
	return sorted[n/2]
}

// calculateMinMax 最大・最小値を計算
func (s *adminWeeklyReportService) calculateMinMax(values []float64) (float64, float64) {
	if len(values) == 0 {
		return 0, 0
	}

	max, min := values[0], values[0]
	for _, value := range values[1:] {
		if value > max {
			max = value
		}
		if value < min {
			min = value
		}
	}
	return max, min
}

// GetMonthlySummary 月次サマリーを取得
func (s *adminWeeklyReportService) GetMonthlySummary(
	ctx context.Context,
	year int,
	month int,
	departmentID *string,
) (*dto.MonthlySummaryDTO, error) {
	s.logger.Info("Getting monthly summary",
		zap.Int("year", year),
		zap.Int("month", month),
		zap.Any("department_id", departmentID))

	// リポジトリの最適化されたメソッドを使用して月次集計データを取得
	aggregatedData, err := s.weeklyReportRepo.GetMonthlyAggregatedData(ctx, year, month, departmentID)
	if err != nil {
		s.logger.Error("Failed to get monthly aggregated data", zap.Error(err))
		return nil, err
	}

	// アクティブユーザー数を取得
	var totalUsers int64
	userQuery := s.db.WithContext(ctx).Model(&model.User{}).
		Where("active = ? AND deleted_at IS NULL", true)

	if departmentID != nil && *departmentID != "" {
		userQuery = userQuery.Where("department_id = ?", *departmentID)
	}

	if err := userQuery.Count(&totalUsers).Error; err != nil {
		s.logger.Error("Failed to count total users", zap.Error(err))
		return nil, err
	}

	// 週次サマリーを変換
	weeklySummaries := make([]dto.WeeklySummaryDTO, len(aggregatedData.WeeklySummaries))
	for i, ws := range aggregatedData.WeeklySummaries {
		submissionRate := 0.0
		if ws.TotalCount > 0 {
			submissionRate = float64(ws.SubmittedCount) / float64(ws.TotalCount) * 100
		}

		// 週番号を計算
		monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		weekNumber := int(ws.WeekStart.Sub(monthStart).Hours()/24/7) + 1

		weeklySummaries[i] = dto.WeeklySummaryDTO{
			WeekNumber:       weekNumber,
			StartDate:        ws.WeekStart,
			EndDate:          ws.WeekEnd,
			SubmissionRate:   submissionRate,
			AverageWorkHours: ws.AverageWorkHours,
			SubmittedCount:   ws.SubmittedCount,
			TotalCount:       ws.TotalCount,
		}
	}

	// 月次統計を構築
	submissionRate := 0.0
	if aggregatedData.TotalReports > 0 {
		submissionRate = float64(aggregatedData.SubmittedReports) / float64(aggregatedData.TotalReports) * 100
	}

	monthlyStats := dto.MonthlyStatsDTO{
		TotalReports:          aggregatedData.TotalReports,
		SubmittedReports:      aggregatedData.SubmittedReports,
		OverallSubmissionRate: submissionRate,
		TotalWorkHours:        aggregatedData.TotalWorkHours,
		AverageWorkHours:      aggregatedData.AverageWorkHours,
		OvertimeReports:       aggregatedData.OvertimeReports,
	}

	// 部署別統計を変換
	departmentStats := make([]dto.DepartmentStatsDTO, len(aggregatedData.DepartmentStats))
	for i, ds := range aggregatedData.DepartmentStats {
		departmentStats[i] = dto.DepartmentStatsDTO{
			DepartmentID:     ds.DepartmentID,
			DepartmentName:   ds.DepartmentName,
			UserCount:        ds.UserCount,
			SubmissionRate:   ds.SubmissionRate,
			AverageWorkHours: ds.AverageWorkHours,
		}
	}

	// トップパフォーマーを変換
	topPerformers := make([]dto.UserPerformanceDTO, len(aggregatedData.TopPerformers))
	for i, tp := range aggregatedData.TopPerformers {
		// オンタイム率は簡易的に100%とする（実際の計算は履歴データが必要）
		onTimeRate := 100.0
		if tp.SubmissionRate < 100 {
			onTimeRate = tp.SubmissionRate * 0.9 // 簡易計算
		}

		topPerformers[i] = dto.UserPerformanceDTO{
			UserID:           tp.UserID,
			UserName:         tp.UserName,
			DepartmentName:   tp.DepartmentName,
			SubmissionRate:   tp.SubmissionRate,
			AverageWorkHours: tp.AverageWorkHours,
			TotalWorkHours:   tp.TotalWorkHours,
			ReportCount:      tp.ReportCount,
			OnTimeRate:       onTimeRate,
		}
	}

	// アラートサマリーを取得
	alertSummary, err := s.getAlertSummaryForMonth(ctx, year, month, departmentID)
	if err != nil {
		s.logger.Warn("Failed to get alert summary", zap.Error(err))
		// エラーでも続行（空のアラートサマリーを使用）
		alertSummary = &dto.AlertSummaryDTO{
			AlertsByType: make(map[string]int64),
		}
	}

	// 前月との比較データを作成
	comparisonData, err := s.calculateMonthlyComparison(ctx, year, month, departmentID)
	if err != nil {
		s.logger.Warn("Failed to calculate monthly comparison", zap.Error(err))
		// エラーでも続行（空の比較データを使用）
		comparisonData = &dto.MonthlyComparisonDTO{}
	}

	return &dto.MonthlySummaryDTO{
		Year:            year,
		Month:           month,
		TotalUsers:      int(totalUsers),
		WeeklySummaries: weeklySummaries,
		MonthlyStats:    monthlyStats,
		DepartmentStats: departmentStats,
		TopPerformers:   topPerformers,
		AlertSummary:    *alertSummary,
		ComparisonData:  *comparisonData,
	}, nil
}

// calculateWeeklySummaries 月内の週次サマリーを計算
func (s *adminWeeklyReportService) calculateWeeklySummaries(
	ctx context.Context,
	year int,
	month int,
	departmentID *string,
	totalUsers int,
) []dto.WeeklySummaryDTO {
	var summaries []dto.WeeklySummaryDTO

	// 月の開始日と終了日
	monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	monthEnd := monthStart.AddDate(0, 1, 0).Add(-24 * time.Hour)

	// 月曜日始まりで週を計算
	weekStart := monthStart
	// 月初が月曜日でない場合は、その週の月曜日まで戻る
	for weekStart.Weekday() != time.Monday {
		weekStart = weekStart.AddDate(0, 0, -1)
	}

	weekNumber := 1
	for weekStart.Before(monthEnd) || weekStart.Equal(monthEnd) {
		weekEnd := weekStart.AddDate(0, 0, 6) // 日曜日

		// 月内に含まれる部分のみを対象とする
		effectiveStart := weekStart
		if effectiveStart.Before(monthStart) {
			effectiveStart = monthStart
		}
		effectiveEnd := weekEnd
		if effectiveEnd.After(monthEnd) {
			effectiveEnd = monthEnd
		}

		// この週の週報を取得
		query := s.db.WithContext(ctx).Model(&model.WeeklyReport{}).
			Where("deleted_at IS NULL").
			Where("start_date <= ? AND end_date >= ?", effectiveEnd, effectiveStart)

		if departmentID != nil {
			query = query.Joins("JOIN users ON weekly_reports.user_id = users.id").
				Where("users.department_id = ?", *departmentID)
		}

		var weekReports []model.WeeklyReport
		if err := query.Find(&weekReports).Error; err != nil {
			s.logger.Warn("Failed to get weekly reports for week",
				zap.Int("week_number", weekNumber),
				zap.Error(err))
			weekStart = weekStart.AddDate(0, 0, 7)
			weekNumber++
			continue
		}

		// 週次統計を計算
		submittedCount := 0
		totalWorkHours := 0.0

		for _, report := range weekReports {
			if report.Status == model.WeeklyReportStatusSubmitted {
				submittedCount++
			}
			totalWorkHours += report.TotalWorkHours
		}

		avgWorkHours := 0.0
		if len(weekReports) > 0 {
			avgWorkHours = totalWorkHours / float64(len(weekReports))
		}

		submissionRate := 0.0
		if totalUsers > 0 {
			submissionRate = float64(submittedCount) / float64(totalUsers) * 100
		}

		summaries = append(summaries, dto.WeeklySummaryDTO{
			WeekNumber:       weekNumber,
			StartDate:        effectiveStart,
			EndDate:          effectiveEnd,
			SubmissionRate:   submissionRate,
			AverageWorkHours: avgWorkHours,
			SubmittedCount:   submittedCount,
			TotalCount:       totalUsers,
		})

		weekStart = weekStart.AddDate(0, 0, 7)
		weekNumber++

		// 次の週が月を超える場合は終了
		if weekStart.After(monthEnd) {
			break
		}
	}

	return summaries
}

// calculateMonthlyStats 月次統計を計算
func (s *adminWeeklyReportService) calculateMonthlyStats(
	reports []model.WeeklyReport,
	totalUsers int,
) dto.MonthlyStatsDTO {
	totalReports := len(reports)
	submittedReports := 0
	totalWorkHours := 0.0
	overtimeReports := 0

	for _, report := range reports {
		if report.Status == model.WeeklyReportStatusSubmitted {
			submittedReports++
		}

		totalWorkHours += report.TotalWorkHours

		// 週40時間を超える場合は残業とみなす
		if report.TotalWorkHours > 40 {
			overtimeReports++
		}
	}

	avgWorkHours := 0.0
	if totalReports > 0 {
		avgWorkHours = totalWorkHours / float64(totalReports)
	}

	submissionRate := 0.0
	expectedReports := totalUsers * 4 // 月4週と仮定
	if expectedReports > 0 {
		submissionRate = float64(submittedReports) / float64(expectedReports) * 100
	}

	return dto.MonthlyStatsDTO{
		TotalReports:          totalReports,
		SubmittedReports:      submittedReports,
		OverallSubmissionRate: submissionRate,
		TotalWorkHours:        totalWorkHours,
		AverageWorkHours:      avgWorkHours,
		OvertimeReports:       overtimeReports,
	}
}

// calculateDepartmentStatsForMonth 月次の部署別統計を計算
func (s *adminWeeklyReportService) calculateDepartmentStatsForMonth(
	ctx context.Context,
	reports []model.WeeklyReport,
) []dto.DepartmentStatsDTO {
	departmentMap := make(map[string]*dto.DepartmentStatsDTO)
	departmentReports := make(map[string][]model.WeeklyReport)

	// 部署ごとにレポートをグループ化
	for _, report := range reports {
		if report.User.DepartmentID != nil {
			deptID := *report.User.DepartmentID
			departmentReports[deptID] = append(departmentReports[deptID], report)

			if _, exists := departmentMap[deptID]; !exists {
				// 部署情報を取得
				deptName := "不明"
				if report.User.Department != "" {
					deptName = report.User.Department
				}

				departmentMap[deptID] = &dto.DepartmentStatsDTO{
					DepartmentID:   deptID,
					DepartmentName: deptName,
				}
			}
		}
	}

	// 各部署の統計を計算
	for deptID, deptReports := range departmentReports {
		stats := departmentMap[deptID]

		// ユーザー数を取得
		var userCount int64
		s.db.WithContext(ctx).Model(&model.User{}).
			Where("department_id = ? AND active = ? AND deleted_at IS NULL", deptID, true).
			Count(&userCount)
		stats.UserCount = int(userCount)

		// 提出率を計算
		submittedCount := 0
		totalWorkHours := 0.0

		for _, report := range deptReports {
			if report.Status == model.WeeklyReportStatusSubmitted {
				submittedCount++
			}
			totalWorkHours += report.TotalWorkHours
		}

		if stats.UserCount > 0 {
			expectedReports := stats.UserCount * 4 // 月4週と仮定
			stats.SubmissionRate = float64(submittedCount) / float64(expectedReports) * 100
		}

		if len(deptReports) > 0 {
			stats.AverageWorkHours = totalWorkHours / float64(len(deptReports))
		}
	}

	// マップから配列に変換
	var result []dto.DepartmentStatsDTO
	for _, stats := range departmentMap {
		result = append(result, *stats)
	}

	return result
}

// calculateTopPerformers トップパフォーマーを計算
func (s *adminWeeklyReportService) calculateTopPerformers(
	reports []model.WeeklyReport,
	limit int,
) []dto.UserPerformanceDTO {
	userPerformance := make(map[string]*dto.UserPerformanceDTO)
	userReports := make(map[string][]model.WeeklyReport)

	// ユーザーごとにレポートをグループ化
	for _, report := range reports {
		userID := report.UserID
		userReports[userID] = append(userReports[userID], report)

		if _, exists := userPerformance[userID]; !exists {
			deptName := "不明"
			if report.User.Department != "" {
				deptName = report.User.Department
			}

			userPerformance[userID] = &dto.UserPerformanceDTO{
				UserID:         userID,
				UserName:       report.User.FirstName + " " + report.User.LastName,
				DepartmentName: deptName,
			}
		}
	}

	// 各ユーザーのパフォーマンスを計算
	for userID, userReportList := range userReports {
		perf := userPerformance[userID]
		perf.ReportCount = len(userReportList)

		submittedCount := 0
		onTimeCount := 0
		totalWorkHours := 0.0

		for _, report := range userReportList {
			if report.Status == model.WeeklyReportStatusSubmitted {
				submittedCount++
				// 週の終了日から3日以内に提出されたら期限内とみなす
				if report.SubmittedAt != nil && report.SubmittedAt.Before(report.EndDate.AddDate(0, 0, 3)) {
					onTimeCount++
				}
			}
			totalWorkHours += report.TotalWorkHours
		}

		// 4週間分を想定
		expectedReports := 4
		if expectedReports > 0 {
			perf.SubmissionRate = float64(submittedCount) / float64(expectedReports) * 100
		}

		if submittedCount > 0 {
			perf.OnTimeRate = float64(onTimeCount) / float64(submittedCount) * 100
		}

		perf.TotalWorkHours = totalWorkHours
		if len(userReportList) > 0 {
			perf.AverageWorkHours = totalWorkHours / float64(len(userReportList))
		}
	}

	// パフォーマンススコアで並び替え（提出率を重視）
	var performers []dto.UserPerformanceDTO
	for _, perf := range userPerformance {
		performers = append(performers, *perf)
	}

	// 簡単なバブルソート（提出率でソート）
	for i := 0; i < len(performers); i++ {
		for j := 0; j < len(performers)-1-i; j++ {
			if performers[j].SubmissionRate < performers[j+1].SubmissionRate {
				performers[j], performers[j+1] = performers[j+1], performers[j]
			}
		}
	}

	// 上位のみ返す
	if len(performers) > limit {
		return performers[:limit]
	}
	return performers
}

// getAlertSummaryForMonth 月次のアラートサマリーを取得
func (s *adminWeeklyReportService) getAlertSummaryForMonth(
	ctx context.Context,
	year int,
	month int,
	departmentID *string,
) (*dto.AlertSummaryDTO, error) {
	// 月の開始日と終了日
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	endDate := startDate.AddDate(0, 1, 0).Add(-24 * time.Hour)

	// アラート履歴を取得
	query := s.db.WithContext(ctx).Model(&model.AlertHistory{}).
		Where("created_at >= ? AND created_at <= ?", startDate, endDate)

	if departmentID != nil {
		query = query.Joins("JOIN users ON alert_histories.user_id = users.id").
			Where("users.department_id = ?", *departmentID)
	}

	var alerts []model.AlertHistory
	if err := query.Find(&alerts).Error; err != nil {
		return nil, err
	}

	// サマリーを作成
	summary := &dto.AlertSummaryDTO{
		TotalAlerts:  int64(len(alerts)),
		AlertsByType: make(map[string]int64),
	}

	for _, alert := range alerts {
		// 重要度別カウント
		switch alert.Severity {
		case model.AlertSeverityHigh:
			summary.HighSeverity++
		case model.AlertSeverityMedium:
			summary.MediumSeverity++
		case model.AlertSeverityLow:
			summary.LowSeverity++
		}

		// ステータス別カウント
		if alert.Status == model.AlertStatusResolved {
			summary.ResolvedAlerts++
		} else {
			summary.PendingAlerts++
		}

		// タイプ別カウント
		summary.AlertsByType[string(alert.AlertType)]++
	}

	return summary, nil
}

// calculateMonthlyComparison 前月との比較データを計算
func (s *adminWeeklyReportService) calculateMonthlyComparison(
	ctx context.Context,
	year int,
	month int,
	departmentID *string,
) (*dto.MonthlyComparisonDTO, error) {
	// 前月の年月を計算
	prevMonth := month - 1
	prevYear := year
	if prevMonth < 1 {
		prevMonth = 12
		prevYear--
	}

	// 現在月のデータ
	currentData := s.getMonthlyComparisonData(ctx, year, month, departmentID)

	// 前月のデータ
	previousData := s.getMonthlyComparisonData(ctx, prevYear, prevMonth, departmentID)

	// 変化を計算
	changes := dto.MonthlyComparisonChangeDTO{
		SubmissionRateChange: currentData.SubmissionRate - previousData.SubmissionRate,
		WorkHoursChange:      currentData.AverageWorkHours - previousData.AverageWorkHours,
		ReportsChange:        currentData.TotalReports - previousData.TotalReports,
	}

	// トレンドを判定
	changes.SubmissionRateTrend = s.determineTrend(changes.SubmissionRateChange)
	changes.WorkHoursTrend = s.determineTrend(changes.WorkHoursChange)

	return &dto.MonthlyComparisonDTO{
		PreviousMonth: *previousData,
		CurrentMonth:  *currentData,
		Changes:       changes,
	}, nil
}

// getMonthlyComparisonData 月次比較用のデータを取得
func (s *adminWeeklyReportService) getMonthlyComparisonData(
	ctx context.Context,
	year int,
	month int,
	departmentID *string,
) *dto.MonthlyComparisonDataDTO {
	// 月の開始日と終了日
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	endDate := startDate.AddDate(0, 1, 0).Add(-24 * time.Hour)

	// 週報データを取得
	query := s.db.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("deleted_at IS NULL").
		Where("start_date <= ? AND end_date >= ?", endDate, startDate)

	if departmentID != nil {
		query = query.Joins("JOIN users ON weekly_reports.user_id = users.id").
			Where("users.department_id = ?", *departmentID)
	}

	var reports []model.WeeklyReport
	query.Find(&reports)

	// 統計を計算
	totalReports := len(reports)
	submittedCount := 0
	totalWorkHours := 0.0

	for _, report := range reports {
		if report.Status == model.WeeklyReportStatusSubmitted {
			submittedCount++
		}
		totalWorkHours += report.TotalWorkHours
	}

	// アクティブユーザー数を取得
	var totalUsers int64
	userQuery := s.db.WithContext(ctx).Model(&model.User{}).
		Where("active = ? AND deleted_at IS NULL", true)

	if departmentID != nil {
		userQuery = userQuery.Where("department_id = ?", *departmentID)
	}
	userQuery.Count(&totalUsers)

	// 平均値を計算
	avgWorkHours := 0.0
	if totalReports > 0 {
		avgWorkHours = totalWorkHours / float64(totalReports)
	}

	submissionRate := 0.0
	expectedReports := int(totalUsers) * 4 // 月4週と仮定
	if expectedReports > 0 {
		submissionRate = float64(submittedCount) / float64(expectedReports) * 100
	}

	return &dto.MonthlyComparisonDataDTO{
		Year:             year,
		Month:            month,
		SubmissionRate:   submissionRate,
		AverageWorkHours: avgWorkHours,
		TotalReports:     totalReports,
	}
}

// determineTrend 変化からトレンドを判定
func (s *adminWeeklyReportService) determineTrend(change float64) string {
	if change > 0.1 {
		return "up"
	} else if change < -0.1 {
		return "down"
	}
	return "stable"
}
