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

// 独立したテストセットアップ - 他のサービスのビルドエラーの影響を受けない
func setupIsolatedTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	err = db.AutoMigrate(
		&model.WeeklyReport{},
		&model.DailyRecord{},
		&model.WorkHour{},
		&model.UserDefaultWorkSettings{},
	)
	require.NoError(t, err)

	return db
}

func setupIsolatedWeeklyReportService(t *testing.T) (*gorm.DB, *service.WeeklyReportService) {
	db := setupIsolatedTestDB(t)

	zapLogger := zap.NewNop()

	reportRepo := repository.NewWeeklyReportRepository(db, zapLogger)
	workHoursRepo := repository.NewWorkHoursRepository(db)
	dailyRecordRepo := repository.NewDailyRecordRepository(db)

	weeklyService := service.NewWeeklyReportService(
		db,
		reportRepo,
		workHoursRepo,
		dailyRecordRepo,
		zapLogger,
	)

	return db, weeklyService
}

func createIsolatedTestWeeklyReport(t *testing.T, db *gorm.DB, userID uuid.UUID) *model.WeeklyReport {
	report := &model.WeeklyReport{
		ID:        uuid.New(),
		UserID:    userID,
		StartDate: getMonday(time.Now()),
		EndDate:   getMonday(time.Now()).AddDate(0, 0, 6),
		Status:    model.WeeklyReportStatusDraft,
		Mood:      model.MoodStatusGood,
	}

	err := db.Create(report).Error
	require.NoError(t, err)

	return report
}

func getMonday(t time.Time) time.Time {
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return t.AddDate(0, 0, -weekday+1).Truncate(24 * time.Hour)
}

func TestWeeklyReportServiceIsolated(t *testing.T) {
	t.Run("Create_正常系", func(t *testing.T) {
		db, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := &model.WeeklyReport{
			UserID:    userID,
			StartDate: getMonday(time.Now()),
			EndDate:   getMonday(time.Now()).AddDate(0, 0, 6),
			Status:    model.WeeklyReportStatusDraft,
			Mood:      model.MoodStatusGood,
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

	t.Run("GetByID_正常系", func(t *testing.T) {
		db, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createIsolatedTestWeeklyReport(t, db, userID)

		result, err := weeklyService.GetByID(ctx, report.ID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, report.ID, result.ID)
		assert.Equal(t, userID, result.UserID)
	})

	t.Run("GetByID_存在しないID", func(t *testing.T) {
		_, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		nonExistentID := uuid.New()
		result, err := weeklyService.GetByID(ctx, nonExistentID)

		assert.Error(t, err)
		assert.Nil(t, result)
	})

	t.Run("Update_正常系", func(t *testing.T) {
		db, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createIsolatedTestWeeklyReport(t, db, userID)

		report.WeeklyRemarks = "更新されたコメント"
		report.Mood = model.MoodStatusExcellent

		err := weeklyService.Update(ctx, report, nil)

		assert.NoError(t, err)

		var updatedReport model.WeeklyReport
		err = db.First(&updatedReport, "id = ?", report.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, "更新されたコメント", updatedReport.WeeklyRemarks)
		assert.Equal(t, model.MoodStatusExcellent, updatedReport.Mood)
	})

	t.Run("Delete_正常系", func(t *testing.T) {
		db, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createIsolatedTestWeeklyReport(t, db, userID)

		err := weeklyService.Delete(ctx, report.ID)

		assert.NoError(t, err)

		var deletedReport model.WeeklyReport
		err = db.First(&deletedReport, "id = ?", report.ID).Error
		assert.Error(t, err)
	})

	t.Run("Submit_正常系", func(t *testing.T) {
		db, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createIsolatedTestWeeklyReport(t, db, userID)

		err := weeklyService.Submit(ctx, report.ID, userID)

		assert.NoError(t, err)

		var submittedReport model.WeeklyReport
		err = db.First(&submittedReport, "id = ?", report.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, model.WeeklyReportStatusSubmitted, submittedReport.Status)
		assert.NotNil(t, submittedReport.SubmittedAt)
	})

	t.Run("Submit_権限なし", func(t *testing.T) {
		_, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()
		anotherUserID := uuid.New()

		// 別のユーザーのレポートを作成
		report := &model.WeeklyReport{
			ID:        uuid.New(),
			UserID:    anotherUserID,
			StartDate: getMonday(time.Now()),
			EndDate:   getMonday(time.Now()).AddDate(0, 0, 6),
			Status:    model.WeeklyReportStatusDraft,
			Mood:      model.MoodStatusGood,
		}

		err := weeklyService.Submit(ctx, report.ID, userID)

		assert.Error(t, err)
	})

	t.Run("List_フィルター条件なし", func(t *testing.T) {
		db, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		// テストデータを複数作成
		userID := uuid.New()
		for i := 0; i < 3; i++ {
			createIsolatedTestWeeklyReport(t, db, userID)
		}

		filters := service.WeeklyReportFilters{
			Page:  1,
			Limit: 10,
		}

		reports, total, err := weeklyService.List(ctx, filters)

		assert.NoError(t, err)
		assert.GreaterOrEqual(t, len(reports), 3)
		assert.GreaterOrEqual(t, total, int64(3))
	})

	t.Run("FindByUserIDAndDateRange_正常系", func(t *testing.T) {
		db, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createIsolatedTestWeeklyReport(t, db, userID)

		startDate := report.StartDate
		endDate := report.EndDate

		result, err := weeklyService.FindByUserIDAndDateRange(ctx, userID, startDate, endDate)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, report.ID, result.ID)
	})

	t.Run("GetUserDefaultWorkSettings_正常系", func(t *testing.T) {
		db, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()

		// デフォルト設定を作成
		settings := &model.UserDefaultWorkSettings{
			ID:           uuid.New(),
			UserID:       userID,
			WeekdayStart: "09:00",
			WeekdayEnd:   "18:00",
			WeekdayBreak: 60,
		}
		err := db.Create(settings).Error
		require.NoError(t, err)

		result, err := weeklyService.GetUserDefaultWorkSettings(ctx, userID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, userID, result.UserID)
		assert.Equal(t, "09:00", result.WeekdayStart)
		assert.Equal(t, "18:00", result.WeekdayEnd)
		assert.Equal(t, 60, result.WeekdayBreak)
	})

	t.Run("SaveUserDefaultWorkSettings_新規作成", func(t *testing.T) {
		_, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()
		settings := &model.UserDefaultWorkSettings{
			UserID:       userID,
			WeekdayStart: "09:30",
			WeekdayEnd:   "18:30",
			WeekdayBreak: 90,
		}

		err := weeklyService.SaveUserDefaultWorkSettings(ctx, settings)

		assert.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, settings.ID)
	})

	t.Run("GetTotalWorkHours_正常系", func(t *testing.T) {
		db, weeklyService := setupIsolatedWeeklyReportService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createIsolatedTestWeeklyReport(t, db, userID)

		// 日次記録を作成
		dailyRecord := &model.DailyRecord{
			ID:             uuid.New(),
			WeeklyReportID: report.ID,
			UserID:         userID,
			Date:           getMonday(time.Now()),
			CompanyHours:   8.0,
			ClientHours:    0.0,
		}
		err := db.Create(dailyRecord).Error
		require.NoError(t, err)

		companyTotal, clientTotal, err := weeklyService.GetTotalWorkHours(ctx, report.ID)

		assert.NoError(t, err)
		assert.Equal(t, float64(8.0), companyTotal)
		assert.Equal(t, float64(0.0), clientTotal)
	})
}
