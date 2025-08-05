package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WeeklyReportService 週報関連のビジネスロジックを担当
type WeeklyReportService struct {
	db                  *gorm.DB
	reportRepo          *repository.WeeklyReportRepository
	workHoursRepo       *repository.WorkHoursRepository
	dailyRecordRepo     *repository.DailyRecordRepository
	defaultSettingsRepo *repository.UserDefaultWorkSettingsRepository
	logger              *zap.Logger
}

// NewWeeklyReportService WeeklyReportServiceのインスタンスを生成
func NewWeeklyReportService(
	db *gorm.DB,
	reportRepo *repository.WeeklyReportRepository,
	workHoursRepo *repository.WorkHoursRepository,
	dailyRecordRepo *repository.DailyRecordRepository,
	logger *zap.Logger,
) *WeeklyReportService {
	return &WeeklyReportService{
		db:                  db,
		reportRepo:          reportRepo,
		workHoursRepo:       workHoursRepo,
		dailyRecordRepo:     dailyRecordRepo,
		defaultSettingsRepo: repository.NewUserDefaultWorkSettingsRepository(db),
		logger:              logger,
	}
}

// WeeklyReportFilters 週報一覧取得時のフィルター条件
type WeeklyReportFilters struct {
	Page      int
	Limit     int
	Status    string
	StartDate string
	EndDate   string
	Search    string
	UserID    uuid.UUID
}

// Create 新しい週報を作成
func (s *WeeklyReportService) Create(ctx context.Context, report *model.WeeklyReport, dailyRecords []*model.DailyRecord) error {
	// トランザクション開始
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 週報を保存
		reportRepo := repository.NewWeeklyReportRepository(tx, s.logger)
		if err := reportRepo.Create(ctx, report); err != nil {
			return fmt.Errorf(message.MsgWeeklyReportCreateFailed+": %w", err)
		}

		// 日次勤怠記録を保存
		if len(dailyRecords) > 0 {
			dailyRecordRepo := repository.NewDailyRecordRepository(tx, s.logger)

			// 各記録に週報IDを設定
			for _, record := range dailyRecords {
				record.WeeklyReportID = report.ID
			}

			// バッチ登録
			if err := dailyRecordRepo.BatchCreate(dailyRecords); err != nil {
				return fmt.Errorf(message.MsgDailyRecordCreateFailed+": %w", err)
			}

			// 自社と客先の合計稼働時間を計算
			companyTotalHours, clientTotalHours, err := dailyRecordRepo.CalculateBothTotalWorkHours(report.ID)
			if err != nil {
				return fmt.Errorf(message.MsgWorkHoursCalculationFailed+": %w", err)
			}

			// 週報の合計稼働時間を更新
			report.TotalWorkHours = companyTotalHours
			report.ClientTotalWorkHours = clientTotalHours
			if err := reportRepo.Update(ctx, report); err != nil {
				return fmt.Errorf(message.MsgWeeklyReportUpdateFailed+": %w", err)
			}
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}

// GetByID 指定されたIDの週報を取得（日次勤怠記録も含む）
func (s *WeeklyReportService) GetByID(ctx context.Context, id uuid.UUID) (*model.WeeklyReport, error) {
	// 週報を取得
	report, err := s.reportRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf(message.MsgReportNotFoundByID+": %w", err)
		}
		return nil, fmt.Errorf(message.MsgWeeklyReportGetFailed+": %w", err)
	}

	// 日次勤怠記録を取得
	dailyRecords, err := s.dailyRecordRepo.FindByWeeklyReportID(report.ID)
	if err != nil {
		s.logger.Error("Failed to get daily records", zap.Error(err), zap.String("report_id", id.String()))
	} else {
		report.DailyRecords = dailyRecords
	}

	return report, nil
}

// Update 週報を更新
func (s *WeeklyReportService) Update(ctx context.Context, report *model.WeeklyReport, dailyRecords []*model.DailyRecord) error {
	// トランザクション開始
	err := s.db.Transaction(func(tx *gorm.DB) error {
		reportRepo := repository.NewWeeklyReportRepository(tx, s.logger)
		dailyRecordRepo := repository.NewDailyRecordRepository(tx, s.logger)

		// 週報を更新
		if err := reportRepo.Update(ctx, report); err != nil {
			return fmt.Errorf(message.MsgWeeklyReportUpdateFailed+": %w", err)
		}

		// 日次勤怠記録を更新
		if dailyRecords != nil {
			// 既存の日次勤怠記録を削除
			if err := dailyRecordRepo.DeleteByWeeklyReportID(report.ID); err != nil {
				return fmt.Errorf(message.MsgExistingDailyRecordDeleteFailed+": %w", err)
			}

			// 各記録に週報IDを設定
			for _, record := range dailyRecords {
				record.WeeklyReportID = report.ID
			}

			// 新しい日次勤怠記録を登録
			if err := dailyRecordRepo.BatchCreate(dailyRecords); err != nil {
				return fmt.Errorf(message.MsgDailyRecordCreateFailed+": %w", err)
			}

			// 自社と客先の合計稼働時間を計算
			companyTotalHours, clientTotalHours, err := dailyRecordRepo.CalculateBothTotalWorkHours(report.ID)
			if err != nil {
				return fmt.Errorf(message.MsgWorkHoursCalculationFailed+": %w", err)
			}

			// 週報の合計稼働時間のみを更新
			if err := reportRepo.UpdateBothTotalWorkHours(ctx, report.ID, companyTotalHours, clientTotalHours); err != nil {
				return fmt.Errorf(message.MsgWeeklyReportUpdateFailed+": %w", err)
			}
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}

// Delete 週報を削除
func (s *WeeklyReportService) Delete(ctx context.Context, id uuid.UUID) error {
	// トランザクション開始
	err := s.db.Transaction(func(tx *gorm.DB) error {
		reportRepo := repository.NewWeeklyReportRepository(tx, s.logger)
		dailyRecordRepo := repository.NewDailyRecordRepository(tx, s.logger)
		workHoursRepo := repository.NewWorkHoursRepository(tx)

		// 日次勤怠記録を削除
		if err := dailyRecordRepo.DeleteByWeeklyReportID(id); err != nil {
			return fmt.Errorf(message.MsgDailyRecordDeleteFailed+": %w", err)
		}

		// 作業時間を削除（既存の互換性のため）
		if err := workHoursRepo.DeleteByReportID(id); err != nil {
			return fmt.Errorf(message.MsgWorkHoursDeleteFailed+": %w", err)
		}

		// 週報を削除
		if err := reportRepo.Delete(ctx, id); err != nil {
			return fmt.Errorf(message.MsgWeeklyReportDeleteFailed+": %w", err)
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}

// List フィルター条件に基づいて週報一覧を取得
func (s *WeeklyReportService) List(ctx context.Context, filters *WeeklyReportFilters) ([]*model.WeeklyReport, int64, error) {
	// フィルター条件の検証
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 {
		filters.Limit = 10
	} else if filters.Limit > 100 {
		filters.Limit = 100 // 最大100件まで
	}

	// オフセットを計算
	offset := (filters.Page - 1) * filters.Limit

	// 週報一覧を取得
	reports, total, err := s.reportRepo.FindWithFilters(ctx, filters.UserID, filters.Status, filters.StartDate, filters.EndDate, filters.Search, offset, filters.Limit)
	if err != nil {
		return nil, 0, fmt.Errorf(message.MsgWeeklyReportListGetFailed+": %w", err)
	}

	return reports, total, nil
}

// Submit 週報を提出済みに更新
func (s *WeeklyReportService) Submit(ctx context.Context, id uuid.UUID) error {
	// IDで週報を取得
	report, err := s.reportRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	// 既に提出済みならエラー
	if report.Status == model.WeeklyReportStatusSubmitted {
		return errors.New(message.MsgAlreadySubmitted)
	}

	// ステータスを提出済みに更新
	report.Status = model.WeeklyReportStatusSubmitted

	// 提出日時を設定
	now := time.Now()
	report.SubmittedAt = &now

	// 週報を更新
	return s.reportRepo.UpdateStatus(ctx, report)
}

// GetDailyRecords 週報に関連する日次勤怠記録を取得
func (s *WeeklyReportService) GetDailyRecords(reportID uuid.UUID) ([]*model.DailyRecord, error) {
	records, err := s.dailyRecordRepo.FindByWeeklyReportID(reportID)
	if err != nil {
		return nil, fmt.Errorf(message.MsgDailyRecordGetFailed+": %w", err)
	}
	return records, nil
}

// GetWorkHours 週報の作業時間を取得（既存の互換性のため）
func (s *WeeklyReportService) GetWorkHours(reportID uuid.UUID) (map[string]float64, error) {
	// 作業時間を取得
	workHours, err := s.workHoursRepo.FindByReportID(reportID)
	if err != nil {
		return nil, fmt.Errorf(message.MsgWorkHoursGetFailed+": %w", err)
	}

	// 日付と時間のマップを作成
	result := make(map[string]float64)
	for _, wh := range workHours {
		dateStr := wh.Date.Format("2006-01-02")
		result[dateStr] = wh.Hours
	}

	return result, nil
}

// GetTotalWorkHours 週報の合計作業時間を取得
func (s *WeeklyReportService) GetTotalWorkHours(reportID uuid.UUID) (float64, error) {
	return s.dailyRecordRepo.CalculateTotalWorkHours(reportID)
}

// FindWeeklyReportsByDateRange 指定された期間内に開始または終了する週報を取得
func (s *WeeklyReportService) FindWeeklyReportsByDateRange(ctx context.Context, userID string, startDate, endDate time.Time) ([]*model.WeeklyReport, error) {
	reports, err := s.reportRepo.FindByDateRange(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf(message.MsgDateRangeReportGetFailed+": %w", err)
	}
	return reports, nil
}

// calculateTotalHours 日次記録から合計稼働時間を計算
func (s *WeeklyReportService) calculateTotalHours(dailyRecords []*model.DailyRecord) (float64, float64) {
	var companyTotal, clientTotal float64

	for _, record := range dailyRecords {
		// 休日・欠勤は除外 (TODO: フィールド追加予定)
		// if record.IsHoliday || record.IsAbsent {
		//	continue
		// }

		// TODO: 正しいフィールド名で更新予定
		companyTotal += record.WorkHours // CompanyHoursの代替
		clientTotal += record.WorkHours  // ClientHoursの代替
	}

	return companyTotal, clientTotal
}

// FindWeeklyReportsByStatus 指定されたステータスの週報を取得
func (s *WeeklyReportService) FindWeeklyReportsByStatus(ctx context.Context, status string, offset, limit int) ([]*model.WeeklyReport, int64, error) {
	// ステータスに基づいて週報を取得
	reports, total, err := s.reportRepo.FindByStatus(ctx, status, offset, limit)
	if err != nil {
		return nil, 0, fmt.Errorf(message.MsgStatusReportGetFailed+": %w", err)
	}
	return reports, total, nil
}

// GetUserWeeklyReportStats ユーザーの週報統計情報を取得
func (s *WeeklyReportService) GetUserWeeklyReportStats(ctx context.Context, userID string) (map[string]int, error) {
	counts, err := s.reportRepo.CountByStatusForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf(message.MsgUserReportStatsGetFailed+": %w", err)
	}
	return counts, nil
}

// GetByDateRange 指定されたユーザーと日付範囲に一致する週報を1件取得
func (s *WeeklyReportService) GetByDateRange(ctx context.Context, userID string, startDate, endDate time.Time) (*model.WeeklyReport, error) {
	// リポジトリから週報を検索
	report, err := s.reportRepo.FindOneByDateRange(ctx, userID, startDate, endDate)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf(message.MsgDateRangeReportNotFound+": %w", err)
		}
		return nil, fmt.Errorf(message.MsgWeeklyReportGetFailed+": %w", err)
	}

	// 日次勤怠記録を取得
	dailyRecords, err := s.dailyRecordRepo.FindByWeeklyReportID(report.ID)
	if err != nil {
		s.logger.Error("Failed to get daily records", zap.Error(err), zap.String("report_id", report.ID.String()))
	} else {
		report.DailyRecords = dailyRecords
	}

	return report, nil
}

// Private methods

// updateWorkHours 作業時間を更新（古いAPIとの互換性のため維持）
func (s *WeeklyReportService) updateWorkHours(reportID uuid.UUID, workHours map[string]float64) error {
	// 既存の作業時間を削除
	if err := s.workHoursRepo.DeleteByReportID(reportID); err != nil {
		return err
	}

	// 新しい作業時間を追加
	for dateStr, hours := range workHours {
		// 日付文字列をtime.Time型に変換
		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			s.logger.Warn("Invalid date format", zap.String("date", dateStr), zap.Error(err))
			continue // 無効な日付はスキップ
		}

		// 作業時間モデルを作成
		workHour := &model.WorkHour{
			WeeklyReportID: reportID,
			Date:           date,
			Hours:          hours,
		}

		// 作業時間を保存
		if err := s.workHoursRepo.Create(workHour); err != nil {
			return err
		}
	}

	return nil
}

// FindByUserIDAndDateRange ユーザーIDと日付範囲で週報を検索
func (s *WeeklyReportService) FindByUserIDAndDateRange(ctx context.Context, userID string, startDate, endDate time.Time) (*model.WeeklyReport, error) {
	// リポジトリを使用して週報を検索
	report, err := s.reportRepo.FindOneByDateRange(ctx, userID, startDate, endDate)
	if err != nil {
		// レコードが見つからない場合はnilを返す
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf(message.MsgUserDateRangeReportSearchFailed+": %w", err)
	}
	return report, nil
}

// SaveReport 週報を保存（既存データがあれば更新、なければ新規作成）
func (s *WeeklyReportService) SaveReport(ctx context.Context, report *model.WeeklyReport, dailyRecords []*model.DailyRecord) error {
	// 既存の週報を検索
	existingReport, err := s.FindByUserIDAndDateRange(ctx, report.UserID, report.StartDate, report.EndDate)
	if err != nil {
		return err
	}

	// トランザクション開始
	err = s.db.Transaction(func(tx *gorm.DB) error {
		reportRepo := repository.NewWeeklyReportRepository(tx, s.logger)
		dailyRecordRepo := repository.NewDailyRecordRepository(tx, s.logger)

		// 既存データがある場合は更新、なければ新規作成
		if existingReport != nil {
			// 既に提出済みの場合はエラー（管理者以外）
			if existingReport.Status == model.WeeklyReportStatusSubmitted {
				return fmt.Errorf(message.MsgCannotEditSubmitted)
			}

			// IDを既存のものに設定
			report.ID = existingReport.ID

			// 週報を更新
			if err := reportRepo.Update(ctx, report); err != nil {
				return fmt.Errorf(message.MsgWeeklyReportUpdateFailed+": %w", err)
			}

			// 既存の日次勤怠記録を削除
			if err := dailyRecordRepo.DeleteByWeeklyReportID(report.ID); err != nil {
				return fmt.Errorf(message.MsgExistingDailyRecordDeleteFailed+": %w", err)
			}
		} else {
			// 新規作成
			if err := reportRepo.Create(ctx, report); err != nil {
				return fmt.Errorf(message.MsgWeeklyReportCreateFailed+": %w", err)
			}
		}

		// 各記録に週報IDを設定
		for _, record := range dailyRecords {
			record.WeeklyReportID = report.ID
		}

		// 日次勤怠記録を作成
		if err := dailyRecordRepo.BatchCreate(dailyRecords); err != nil {
			return fmt.Errorf("日次勤怠記録の作成に失敗しました: %w", err)
		}

		// 自社と客先の合計稼働時間を計算
		companyTotalHours, clientTotalHours, err := dailyRecordRepo.CalculateBothTotalWorkHours(report.ID)
		if err != nil {
			return fmt.Errorf(message.MsgWorkHoursCalculationFailed+": %w", err)
		}

		// 週報の合計稼働時間のみを更新
		if err := reportRepo.UpdateBothTotalWorkHours(ctx, report.ID, companyTotalHours, clientTotalHours); err != nil {
			return fmt.Errorf(message.MsgWeeklyReportUpdateFailed+": %w", err)
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}

// 週報の合計稼働時間を更新（内部利用）
func (s *WeeklyReportService) updateTotalWorkHours(ctx context.Context, reportID uuid.UUID) error {
	// 自社と客先の合計稼働時間を計算
	companyTotalHours, clientTotalHours, err := s.dailyRecordRepo.CalculateBothTotalWorkHours(reportID)
	if err != nil {
		return fmt.Errorf(message.MsgWorkHoursCalculationFailed+": %w", err)
	}

	// 週報の合計稼働時間のみを更新
	if err := s.reportRepo.UpdateBothTotalWorkHours(ctx, reportID, companyTotalHours, clientTotalHours); err != nil {
		return fmt.Errorf(message.MsgTotalWorkHoursUpdateFailed+": %w", err)
	}

	return nil
}

// GetUserDefaultWorkSettings ユーザーのデフォルト勤務時間設定を取得
func (s *WeeklyReportService) GetUserDefaultWorkSettings(userID string) (*model.UserDefaultWorkSettings, error) {
	settings, err := s.defaultSettingsRepo.FindByUserID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 設定が見つからない場合はデフォルト値を返す
			defaultSettings := &model.UserDefaultWorkSettings{
				UserID:           userID,
				WeekdayStartTime: "09:00",
				WeekdayEndTime:   "18:00",
				WeekdayBreakTime: 1.0,
			}
			return defaultSettings, nil
		}
		return nil, fmt.Errorf(message.MsgDefaultWorkSettingsGetFailed+": %w", err)
	}
	return settings, nil
}

// SaveUserDefaultWorkSettings ユーザーのデフォルト勤務時間設定を保存
func (s *WeeklyReportService) SaveUserDefaultWorkSettings(settings *model.UserDefaultWorkSettings) error {
	err := s.defaultSettingsRepo.UpsertSettings(settings)
	if err != nil {
		return fmt.Errorf(message.MsgDefaultWorkSettingsSaveFailed+": %w", err)
	}
	return nil
}
