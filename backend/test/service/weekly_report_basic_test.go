package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// TestWeeklyReportServiceBasic WeeklyReportServiceの基本機能テスト
func TestWeeklyReportServiceBasic(t *testing.T) {
	t.Run("Create", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := &model.WeeklyReport{
			UserID:    userID,
			StartDate: getMonday(time.Now()),
			EndDate:   getMonday(time.Now()).AddDate(0, 0, 6),
			Status:    model.WeeklyReportStatusDraft,
		}

		dailyRecords := []*model.DailyRecord{
			{
				UserID:       userID,
				Date:         getMonday(time.Now()),
				CompanyHours: 8.0,
				ClientHours:  0.0,
				WorkContent:  "テスト作業",
				WorkLocation: "社内",
			},
		}

		err := weeklyService.Create(ctx, report, dailyRecords)

		assert.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, report.ID)

		// データベースに保存されているかを確認
		var savedReport model.WeeklyReport
		err = db.First(&savedReport, "id = ?", report.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, userID, savedReport.UserID)
		assert.Equal(t, model.WeeklyReportStatusDraft, savedReport.Status)
	})

	t.Run("GetByID", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createBasicTestWeeklyReport(t, db, userID)

		result, err := weeklyService.GetByID(ctx, report.ID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, report.ID, result.ID)
		assert.Equal(t, userID, result.UserID)
	})

	t.Run("Update", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createBasicTestWeeklyReport(t, db, userID)

		report.WeeklyRemarks = "更新されたコメント"

		err := weeklyService.Update(ctx, report, nil)

		assert.NoError(t, err)

		var updatedReport model.WeeklyReport
		err = db.First(&updatedReport, "id = ?", report.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, "更新されたコメント", updatedReport.WeeklyRemarks)
	})

	t.Run("Delete", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createBasicTestWeeklyReport(t, db, userID)

		err := weeklyService.Delete(ctx, report.ID)

		assert.NoError(t, err)

		var deletedReport model.WeeklyReport
		err = db.First(&deletedReport, "id = ?", report.ID).Error
		assert.Error(t, err)
		assert.Equal(t, gorm.ErrRecordNotFound, err)
	})

	t.Run("Submit", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createBasicTestWeeklyReport(t, db, userID)

		err := weeklyService.Submit(ctx, report.ID)

		assert.NoError(t, err)

		var submittedReport model.WeeklyReport
		err = db.First(&submittedReport, "id = ?", report.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, model.WeeklyReportStatusSubmitted, submittedReport.Status)
		assert.NotNil(t, submittedReport.SubmittedAt)
	})

	t.Run("List", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)
		ctx := context.Background()

		userID := uuid.New()

		// テストデータ作成
		for i := 0; i < 3; i++ {
			report := &model.WeeklyReport{
				UserID:    userID,
				StartDate: getMonday(time.Now()).AddDate(0, 0, -7*i),
				EndDate:   getMonday(time.Now()).AddDate(0, 0, -7*i+6),
				Status:    model.WeeklyReportStatusDraft,
			}
			err := db.Create(report).Error
			require.NoError(t, err)
		}

		filters := &service.WeeklyReportFilters{
			Page:   1,
			Limit:  10,
			UserID: userID,
		}

		reports, total, err := weeklyService.List(ctx, filters)

		assert.NoError(t, err)
		assert.Equal(t, int64(3), total)
		assert.Len(t, reports, 3)
	})

	t.Run("GetDailyRecords", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)

		userID := uuid.New()
		report := createBasicTestWeeklyReport(t, db, userID)

		records, err := weeklyService.GetDailyRecords(report.ID)

		assert.NoError(t, err)
		assert.NotNil(t, records)
	})

	t.Run("GetTotalWorkHours", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)

		userID := uuid.New()
		report := createBasicTestWeeklyReport(t, db, userID)

		totalHours, err := weeklyService.GetTotalWorkHours(report.ID)

		assert.NoError(t, err)
		assert.GreaterOrEqual(t, totalHours, 0.0)
	})

	t.Run("FindWeeklyReportsByDateRange", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		now := time.Now()

		report := &model.WeeklyReport{
			UserID:    userID,
			StartDate: getMonday(now),
			EndDate:   getMonday(now).AddDate(0, 0, 6),
			Status:    model.WeeklyReportStatusDraft,
		}
		err := db.Create(report).Error
		require.NoError(t, err)

		startDate := getMonday(now.AddDate(0, 0, -7))
		endDate := getMonday(now).AddDate(0, 0, 13)

		reports, err := weeklyService.FindWeeklyReportsByDateRange(ctx, userID, startDate, endDate)

		assert.NoError(t, err)
		assert.GreaterOrEqual(t, len(reports), 1)
	})

	t.Run("GetUserWeeklyReportStats", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)
		ctx := context.Background()

		userID := uuid.New()

		statuses := []model.WeeklyReportStatusEnum{
			model.WeeklyReportStatusDraft,
			model.WeeklyReportStatusSubmitted,
		}

		for i, status := range statuses {
			report := &model.WeeklyReport{
				UserID:    userID,
				StartDate: getMonday(time.Now()).AddDate(0, 0, -7*i),
				EndDate:   getMonday(time.Now()).AddDate(0, 0, -7*i+6),
				Status:    status,
			}
			err := db.Create(report).Error
			require.NoError(t, err)
		}

		stats, err := weeklyService.GetUserWeeklyReportStats(ctx, userID)

		assert.NoError(t, err)
		assert.NotNil(t, stats)
	})

	t.Run("SaveReport", func(t *testing.T) {
		_, weeklyService := setupBasicTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		weekStart := getMonday(time.Now())
		report := &model.WeeklyReport{
			UserID:    userID,
			StartDate: weekStart,
			EndDate:   weekStart.AddDate(0, 0, 6),
			Status:    model.WeeklyReportStatusDraft,
		}

		dailyRecords := []*model.DailyRecord{
			{
				UserID:       userID,
				Date:         weekStart,
				CompanyHours: 8.0,
				ClientHours:  0.0,
				WorkContent:  "テスト作業",
				WorkLocation: "社内",
			},
		}

		err := weeklyService.SaveReport(ctx, report, dailyRecords)

		assert.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, report.ID)
	})

	t.Run("GetUserDefaultWorkSettings", func(t *testing.T) {
		_, weeklyService := setupBasicTestService(t)

		userID := uuid.New()

		result, err := weeklyService.GetUserDefaultWorkSettings(userID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, userID, result.UserID)
		assert.Equal(t, "09:00", result.WeekdayStartTime)
		assert.Equal(t, "18:00", result.WeekdayEndTime)
		assert.Equal(t, 1.0, result.WeekdayBreakTime)
	})

	t.Run("SaveUserDefaultWorkSettings", func(t *testing.T) {
		db, weeklyService := setupBasicTestService(t)

		userID := uuid.New()
		settings := &model.UserDefaultWorkSettings{
			UserID:           userID,
			WeekdayStartTime: "08:30",
			WeekdayEndTime:   "17:30",
			WeekdayBreakTime: 0.5,
		}

		err := weeklyService.SaveUserDefaultWorkSettings(settings)

		assert.NoError(t, err)

		var savedSettings model.UserDefaultWorkSettings
		err = db.First(&savedSettings, "user_id = ?", userID).Error
		assert.NoError(t, err)
		assert.Equal(t, "08:30", savedSettings.WeekdayStartTime)
		assert.Equal(t, "17:30", savedSettings.WeekdayEndTime)
		assert.Equal(t, 0.5, savedSettings.WeekdayBreakTime)
	})
}

// Helper functions

func setupBasicTestService(t *testing.T) (*gorm.DB, *service.WeeklyReportService) {
	// インメモリSQLiteデータベース作成
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	// テーブル作成
	err = db.AutoMigrate(
		&model.WeeklyReport{},
		&model.DailyRecord{},
		&model.WorkHour{},
		&model.User{},
		&model.UserDefaultWorkSettings{},
	)
	require.NoError(t, err)

	// ロガー作成
	zapLogger, _ := zap.NewDevelopment()

	// リポジトリ作成
	reportRepo := repository.NewWeeklyReportRepository(db, zapLogger)
	workHoursRepo := repository.NewWorkHoursRepository(db)
	dailyRecordRepo := repository.NewDailyRecordRepository(db)

	// サービス作成
	weeklyService := service.NewWeeklyReportService(db, reportRepo, workHoursRepo, dailyRecordRepo, zapLogger)

	return db, weeklyService
}

func createBasicTestWeeklyReport(t *testing.T, db *gorm.DB, userID uuid.UUID) *model.WeeklyReport {
	weekStart := getMonday(time.Now())
	report := &model.WeeklyReport{
		UserID:    userID,
		StartDate: weekStart,
		EndDate:   weekStart.AddDate(0, 0, 6),
		Status:    model.WeeklyReportStatusDraft,
	}
	err := db.Create(report).Error
	require.NoError(t, err)
	return report
}

// getMonday 指定した日付の週の月曜日を取得
func getMonday(date time.Time) time.Time {
	weekday := date.Weekday()
	if weekday == time.Sunday {
		weekday = 7
	}
	monday := date.AddDate(0, 0, -int(weekday)+1)
	return time.Date(monday.Year(), monday.Month(), monday.Day(), 0, 0, 0, 0, monday.Location())
}
