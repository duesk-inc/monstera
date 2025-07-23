package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/message"
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

// TestWeeklyReportService WeeklyReportServiceの包括的なテストスイート
func TestWeeklyReportService(t *testing.T) {
	t.Run("Create", testWeeklyReportCreate)
	t.Run("GetByID", testWeeklyReportGetByID)
	t.Run("Update", testWeeklyReportUpdate)
	t.Run("Delete", testWeeklyReportDelete)
	t.Run("List", testWeeklyReportList)
	t.Run("Submit", testWeeklyReportSubmit)
	t.Run("GetDailyRecords", testWeeklyReportGetDailyRecords)
	t.Run("GetWorkHours", testWeeklyReportGetWorkHours)
	t.Run("GetTotalWorkHours", testWeeklyReportGetTotalWorkHours)
	t.Run("FindWeeklyReportsByDateRange", testFindWeeklyReportsByDateRange)
	t.Run("FindWeeklyReportsByStatus", testFindWeeklyReportsByStatus)
	t.Run("GetUserWeeklyReportStats", testGetUserWeeklyReportStats)
	t.Run("GetByDateRange", testGetByDateRange)
	t.Run("FindByUserIDAndDateRange", testFindByUserIDAndDateRange)
	t.Run("SaveReport", testSaveReport)
	t.Run("GetUserDefaultWorkSettings", testGetUserDefaultWorkSettings)
	t.Run("SaveUserDefaultWorkSettings", testSaveUserDefaultWorkSettings)
}

// testWeeklyReportCreate Create メソッドのテスト
func testWeeklyReportCreate(t *testing.T) {
	t.Run("正常な週報作成", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		// テストデータの準備
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

		// Create メソッドの実行
		err := weeklyService.Create(ctx, report, dailyRecords)

		// 検証
		assert.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, report.ID)

		// データベースに保存されているかを確認
		var savedReport model.WeeklyReport
		err = db.First(&savedReport, "id = ?", report.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, userID, savedReport.UserID)
		assert.Equal(t, model.WeeklyReportStatusDraft, savedReport.Status)

		// 日次記録も保存されているかを確認
		var savedDailyRecords []model.DailyRecord
		err = db.Where("weekly_report_id = ?", report.ID).Find(&savedDailyRecords).Error
		assert.NoError(t, err)
		assert.Len(t, savedDailyRecords, 1)
	})

	t.Run("日次記録なしでの週報作成", func(t *testing.T) {
		_, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := &model.WeeklyReport{
			UserID:    userID,
			StartDate: getMonday(time.Now()),
			EndDate:   getMonday(time.Now()).AddDate(0, 0, 6),
			Status:    model.WeeklyReportStatusDraft,
		}

		err := weeklyService.Create(ctx, report, nil)
		assert.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, report.ID)
	})

	t.Run("空の週報での作成エラー", func(t *testing.T) {
		_, weeklyService := setupTestService(t)
		ctx := context.Background()

		// 必須フィールドが不足している週報
		report := &model.WeeklyReport{}

		err := weeklyService.Create(ctx, report, nil)
		assert.Error(t, err)
	})
}

// testWeeklyReportGetByID GetByID メソッドのテスト
func testWeeklyReportGetByID(t *testing.T) {
	t.Run("正常な週報取得", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		// テストデータの作成
		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)
		createTestDailyRecords(t, db, report.ID, userID)

		// GetByID メソッドの実行
		result, err := weeklyService.GetByID(ctx, report.ID)

		// 検証
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, report.ID, result.ID)
		assert.Equal(t, userID, result.UserID)
		assert.NotNil(t, result.DailyRecords)
	})

	t.Run("存在しない週報ID", func(t *testing.T) {
		_, weeklyService := setupTestService(t)
		ctx := context.Background()

		nonExistentID := uuid.New()
		result, err := weeklyService.GetByID(ctx, nonExistentID)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), message.MsgReportNotFoundByID)
	})

	t.Run("日次記録取得エラーのハンドリング", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		// 週報は作成するが日次記録は作成しない
		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)

		result, err := weeklyService.GetByID(ctx, report.ID)

		// 日次記録がなくても週報は取得できる
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, report.ID, result.ID)
	})
}

// testWeeklyReportUpdate Update メソッドのテスト
func testWeeklyReportUpdate(t *testing.T) {
	t.Run("正常な週報更新", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)

		// 更新データ
		report.WeeklyRemarks = "更新されたコメント"

		dailyRecords := []*model.DailyRecord{
			{
				UserID:       userID,
				Date:         report.StartDate,
				CompanyHours: 7.5,
				ClientHours:  0.5,
				WorkContent:  "更新された作業",
				WorkLocation: "社内",
			},
		}

		err := weeklyService.Update(ctx, report, dailyRecords)

		assert.NoError(t, err)

		// 更新確認
		var updatedReport model.WeeklyReport
		err = db.First(&updatedReport, "id = ?", report.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, "更新されたコメント", updatedReport.WeeklyRemarks)
	})

	t.Run("日次記録なしでの更新", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)

		report.WeeklyRemarks = "日次記録なしの更新"

		err := weeklyService.Update(ctx, report, nil)
		assert.NoError(t, err)
	})
}

// testWeeklyReportDelete Delete メソッドのテスト
func testWeeklyReportDelete(t *testing.T) {
	t.Run("正常な週報削除", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)
		createTestDailyRecords(t, db, report.ID, userID)

		err := weeklyService.Delete(ctx, report.ID)

		assert.NoError(t, err)

		// 削除確認（論理削除）
		var deletedReport model.WeeklyReport
		err = db.First(&deletedReport, "id = ?", report.ID).Error
		assert.Error(t, err)
		assert.Equal(t, gorm.ErrRecordNotFound, err)
	})

	t.Run("存在しない週報の削除", func(t *testing.T) {
		_, weeklyService := setupTestService(t)
		ctx := context.Background()

		nonExistentID := uuid.New()
		err := weeklyService.Delete(ctx, nonExistentID)

		assert.Error(t, err)
	})
}

// testWeeklyReportList List メソッドのテスト
func testWeeklyReportList(t *testing.T) {
	t.Run("正常な週報一覧取得", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
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

	t.Run("ステータスフィルタ", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()

		// 異なるステータスの週報を作成
		statuses := []model.WeeklyReportStatusEnum{
			model.WeeklyReportStatusDraft,
			model.WeeklyReportStatusSubmitted,
			model.WeeklyReportStatusDraft,
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

		filters := &service.WeeklyReportFilters{
			Page:   1,
			Limit:  10,
			UserID: userID,
			Status: string(model.WeeklyReportStatusSubmitted),
		}

		reports, total, err := weeklyService.List(ctx, filters)

		assert.NoError(t, err)
		assert.Equal(t, int64(1), total)
		assert.Len(t, reports, 1)
		assert.Equal(t, model.WeeklyReportStatusSubmitted, reports[0].Status)
	})

	t.Run("ページネーション", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()

		// 5件のテストデータ作成
		for i := 0; i < 5; i++ {
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
			Page:   2,
			Limit:  2,
			UserID: userID,
		}

		reports, total, err := weeklyService.List(ctx, filters)

		assert.NoError(t, err)
		assert.Equal(t, int64(5), total)
		assert.Len(t, reports, 2)
	})

	t.Run("フィルタのバリデーション", func(t *testing.T) {
		_, weeklyService := setupTestService(t)
		ctx := context.Background()

		filters := &service.WeeklyReportFilters{
			Page:  0, // 無効な値
			Limit: 0, // 無効な値
		}

		_, _, err := weeklyService.List(ctx, filters)

		// フィルタが正規化されてエラーにならないことを確認
		assert.NoError(t, err)
		assert.Equal(t, 1, filters.Page)   // デフォルト値に修正
		assert.Equal(t, 10, filters.Limit) // デフォルト値に修正
	})
}

// testWeeklyReportSubmit Submit メソッドのテスト
func testWeeklyReportSubmit(t *testing.T) {
	t.Run("正常な週報提出", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)

		err := weeklyService.Submit(ctx, report.ID)

		assert.NoError(t, err)

		// ステータス確認
		var submittedReport model.WeeklyReport
		err = db.First(&submittedReport, "id = ?", report.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, model.WeeklyReportStatusSubmitted, submittedReport.Status)
		assert.NotNil(t, submittedReport.SubmittedAt)
	})

	t.Run("既に提出済みの週報", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)

		// 先に提出
		err := weeklyService.Submit(ctx, report.ID)
		require.NoError(t, err)

		// 再度提出を試行
		err = weeklyService.Submit(ctx, report.ID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), message.MsgAlreadySubmitted)
	})

	t.Run("存在しない週報の提出", func(t *testing.T) {
		_, weeklyService := setupTestService(t)
		ctx := context.Background()

		nonExistentID := uuid.New()
		err := weeklyService.Submit(ctx, nonExistentID)

		assert.Error(t, err)
	})
}

// testWeeklyReportGetDailyRecords GetDailyRecords メソッドのテスト
func testWeeklyReportGetDailyRecords(t *testing.T) {
	t.Run("正常な日次記録取得", func(t *testing.T) {
		db, weeklyService := setupTestService(t)

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)
		expectedRecords := createTestDailyRecords(t, db, report.ID, userID)

		records, err := weeklyService.GetDailyRecords(report.ID)

		assert.NoError(t, err)
		assert.Len(t, records, len(expectedRecords))
	})

	t.Run("日次記録が存在しない場合", func(t *testing.T) {
		db, weeklyService := setupTestService(t)

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)

		records, err := weeklyService.GetDailyRecords(report.ID)

		assert.NoError(t, err)
		assert.Empty(t, records)
	})
}

// testWeeklyReportGetWorkHours GetWorkHours メソッドのテスト
func testWeeklyReportGetWorkHours(t *testing.T) {
	t.Run("作業時間マップの取得", func(t *testing.T) {
		db, weeklyService := setupTestService(t)

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)
		createTestWorkHours(t, db, report.ID)

		workHours, err := weeklyService.GetWorkHours(report.ID)

		assert.NoError(t, err)
		assert.NotEmpty(t, workHours)
	})

	t.Run("作業時間が存在しない場合", func(t *testing.T) {
		db, weeklyService := setupTestService(t)

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)

		workHours, err := weeklyService.GetWorkHours(report.ID)

		assert.NoError(t, err)
		assert.Empty(t, workHours)
	})
}

// testWeeklyReportGetTotalWorkHours GetTotalWorkHours メソッドのテスト
func testWeeklyReportGetTotalWorkHours(t *testing.T) {
	t.Run("合計作業時間の取得", func(t *testing.T) {
		db, weeklyService := setupTestService(t)

		userID := uuid.New()
		report := createTestWeeklyReport(t, db, userID)
		createTestDailyRecords(t, db, report.ID, userID)

		totalHours, err := weeklyService.GetTotalWorkHours(report.ID)

		assert.NoError(t, err)
		assert.Greater(t, totalHours, 0.0)
	})
}

// testFindWeeklyReportsByDateRange FindWeeklyReportsByDateRange メソッドのテスト
func testFindWeeklyReportsByDateRange(t *testing.T) {
	t.Run("日付範囲での週報検索", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()

		// 過去3週間の週報を作成
		now := time.Now()
		for i := 0; i < 3; i++ {
			weekStart := getMonday(now.AddDate(0, 0, -7*i))
			report := &model.WeeklyReport{
				UserID:    userID,
				StartDate: weekStart,
				EndDate:   weekStart.AddDate(0, 0, 6),
				Status:    model.WeeklyReportStatusDraft,
			}
			err := db.Create(report).Error
			require.NoError(t, err)
		}

		// 過去2週間の範囲で検索
		startDate := getMonday(now.AddDate(0, 0, -14))
		endDate := getMonday(now).AddDate(0, 0, 6)

		reports, err := weeklyService.FindWeeklyReportsByDateRange(ctx, userID, startDate, endDate)

		assert.NoError(t, err)
		assert.GreaterOrEqual(t, len(reports), 2)
	})
}

// testFindWeeklyReportsByStatus FindWeeklyReportsByStatus メソッドのテスト
func testFindWeeklyReportsByStatus(t *testing.T) {
	t.Run("ステータス別週報検索", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()

		// 異なるステータスの週報を作成
		statuses := []model.WeeklyReportStatusEnum{
			model.WeeklyReportStatusDraft,
			model.WeeklyReportStatusSubmitted,
			model.WeeklyReportStatusDraft,
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

		reports, total, err := weeklyService.FindWeeklyReportsByStatus(ctx, string(model.WeeklyReportStatusDraft), 0, 10)

		assert.NoError(t, err)
		assert.Equal(t, int64(2), total)
		assert.Len(t, reports, 2)
	})
}

// testGetUserWeeklyReportStats GetUserWeeklyReportStats メソッドのテスト
func testGetUserWeeklyReportStats(t *testing.T) {
	t.Run("ユーザー週報統計の取得", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()

		// 異なるステータスの週報を作成
		statuses := []model.WeeklyReportStatusEnum{
			model.WeeklyReportStatusDraft,
			model.WeeklyReportStatusSubmitted,
			model.WeeklyReportStatusDraft,
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
		assert.Contains(t, stats, "draft")
		assert.Contains(t, stats, "submitted")
	})
}

// testGetByDateRange GetByDateRange メソッドのテスト
func testGetByDateRange(t *testing.T) {
	t.Run("日付範囲での単一週報取得", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		weekStart := getMonday(time.Now())
		report := &model.WeeklyReport{
			UserID:    userID,
			StartDate: weekStart,
			EndDate:   weekStart.AddDate(0, 0, 6),
			Status:    model.WeeklyReportStatusDraft,
		}
		err := db.Create(report).Error
		require.NoError(t, err)

		createTestDailyRecords(t, db, report.ID, userID)

		result, err := weeklyService.GetByDateRange(ctx, userID, weekStart, weekStart.AddDate(0, 0, 6))

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, report.ID, result.ID)
		assert.NotNil(t, result.DailyRecords)
	})

	t.Run("該当する週報が存在しない場合", func(t *testing.T) {
		_, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		weekStart := getMonday(time.Now().AddDate(0, 0, -14)) // 2週間前

		result, err := weeklyService.GetByDateRange(ctx, userID, weekStart, weekStart.AddDate(0, 0, 6))

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), message.MsgDateRangeReportNotFound)
	})
}

// testFindByUserIDAndDateRange FindByUserIDAndDateRange メソッドのテスト
func testFindByUserIDAndDateRange(t *testing.T) {
	t.Run("ユーザーIDと日付範囲での週報検索", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		weekStart := getMonday(time.Now())
		report := &model.WeeklyReport{
			UserID:    userID,
			StartDate: weekStart,
			EndDate:   weekStart.AddDate(0, 0, 6),
			Status:    model.WeeklyReportStatusDraft,
		}
		err := db.Create(report).Error
		require.NoError(t, err)

		result, err := weeklyService.FindByUserIDAndDateRange(ctx, userID, weekStart, weekStart.AddDate(0, 0, 6))

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, report.ID, result.ID)
	})

	t.Run("該当する週報が存在しない場合", func(t *testing.T) {
		_, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		weekStart := getMonday(time.Now().AddDate(0, 0, -14))

		result, err := weeklyService.FindByUserIDAndDateRange(ctx, userID, weekStart, weekStart.AddDate(0, 0, 6))

		assert.NoError(t, err)
		assert.Nil(t, result) // エラーではなくnilを返す
	})
}

// testSaveReport SaveReport メソッドのテスト
func testSaveReport(t *testing.T) {
	t.Run("新規週報の保存", func(t *testing.T) {
		_, weeklyService := setupTestService(t)
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

	t.Run("既存週報の更新", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		existingReport := createTestWeeklyReport(t, db, userID)

		// 同じ期間の週報を更新
		newReport := &model.WeeklyReport{
			UserID:        userID,
			StartDate:     existingReport.StartDate,
			EndDate:       existingReport.EndDate,
			Status:        model.WeeklyReportStatusDraft,
			WeeklyRemarks: "更新されたコメント",
		}

		dailyRecords := []*model.DailyRecord{
			{
				UserID:       userID,
				Date:         newReport.StartDate,
				CompanyHours: 7.5,
				ClientHours:  0.5,
				WorkContent:  "更新された作業",
				WorkLocation: "社内",
			},
		}

		err := weeklyService.SaveReport(ctx, newReport, dailyRecords)

		assert.NoError(t, err)
		assert.Equal(t, existingReport.ID, newReport.ID) // 既存のIDが使用される

		// 更新確認
		var updatedReport model.WeeklyReport
		err = db.First(&updatedReport, "id = ?", existingReport.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, "更新されたコメント", updatedReport.WeeklyRemarks)
	})

	t.Run("提出済み週報の更新試行", func(t *testing.T) {
		db, weeklyService := setupTestService(t)
		ctx := context.Background()

		userID := uuid.New()
		existingReport := createTestWeeklyReport(t, db, userID)

		// 提出済みに変更
		err := db.Model(&existingReport).Update("status", model.WeeklyReportStatusSubmitted).Error
		require.NoError(t, err)

		newReport := &model.WeeklyReport{
			UserID:        userID,
			StartDate:     existingReport.StartDate,
			EndDate:       existingReport.EndDate,
			Status:        model.WeeklyReportStatusDraft,
			WeeklyRemarks: "更新しようとするコメント",
		}

		err = weeklyService.SaveReport(ctx, newReport, nil)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), message.MsgCannotEditSubmitted)
	})
}

// testGetUserDefaultWorkSettings GetUserDefaultWorkSettings メソッドのテスト
func testGetUserDefaultWorkSettings(t *testing.T) {
	t.Run("デフォルト勤務設定の取得", func(t *testing.T) {
		db, weeklyService := setupTestService(t)

		userID := uuid.New()

		// デフォルト設定を作成
		settings := &model.UserDefaultWorkSettings{
			UserID:           userID,
			WeekdayStartTime: "09:00",
			WeekdayEndTime:   "18:00",
			WeekdayBreakTime: 1.0,
		}
		err := db.Create(settings).Error
		require.NoError(t, err)

		result, err := weeklyService.GetUserDefaultWorkSettings(userID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, userID, result.UserID)
		assert.Equal(t, "09:00", result.WeekdayStartTime)
	})

	t.Run("設定が存在しない場合のデフォルト値", func(t *testing.T) {
		_, weeklyService := setupTestService(t)

		userID := uuid.New()

		result, err := weeklyService.GetUserDefaultWorkSettings(userID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, userID, result.UserID)
		assert.Equal(t, "09:00", result.WeekdayStartTime)
		assert.Equal(t, "18:00", result.WeekdayEndTime)
		assert.Equal(t, 1.0, result.WeekdayBreakTime)
	})
}

// testSaveUserDefaultWorkSettings SaveUserDefaultWorkSettings メソッドのテスト
func testSaveUserDefaultWorkSettings(t *testing.T) {
	t.Run("デフォルト勤務設定の保存", func(t *testing.T) {
		db, weeklyService := setupTestService(t)

		userID := uuid.New()
		settings := &model.UserDefaultWorkSettings{
			UserID:           userID,
			WeekdayStartTime: "08:30",
			WeekdayEndTime:   "17:30",
			WeekdayBreakTime: 0.5,
		}

		err := weeklyService.SaveUserDefaultWorkSettings(settings)

		assert.NoError(t, err)

		// 保存確認
		var savedSettings model.UserDefaultWorkSettings
		err = db.First(&savedSettings, "user_id = ?", userID).Error
		assert.NoError(t, err)
		assert.Equal(t, "08:30", savedSettings.WeekdayStartTime)
		assert.Equal(t, "17:30", savedSettings.WeekdayEndTime)
		assert.Equal(t, 0.5, savedSettings.WeekdayBreakTime)
	})
}

// Helper functions

func setupTestService(t *testing.T) (*gorm.DB, *service.WeeklyReportService) {
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

func createTestWeeklyReport(t *testing.T, db *gorm.DB, userID uuid.UUID) *model.WeeklyReport {
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

func createTestDailyRecords(t *testing.T, db *gorm.DB, reportID, userID uuid.UUID) []*model.DailyRecord {
	weekStart := getMonday(time.Now())
	var records []*model.DailyRecord

	for i := 0; i < 5; i++ {
		record := &model.DailyRecord{
			WeeklyReportID: reportID,
			UserID:         userID,
			Date:           weekStart.AddDate(0, 0, i),
			CompanyHours:   8.0,
			ClientHours:    0.0,
			WorkContent:    "テスト作業",
			WorkLocation:   "社内",
		}
		records = append(records, record)
	}

	err := db.Create(&records).Error
	require.NoError(t, err)
	return records
}

func createTestWorkHours(t *testing.T, db *gorm.DB, reportID uuid.UUID) {
	weekStart := getMonday(time.Now())

	for i := 0; i < 5; i++ {
		workHour := &model.WorkHour{
			WeeklyReportID: reportID,
			Date:           weekStart.AddDate(0, 0, i),
			Hours:          8.0,
		}
		err := db.Create(workHour).Error
		require.NoError(t, err)
	}
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
