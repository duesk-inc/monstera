package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/testutils"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestWeeklyReportRefactoredService_GetUserWeeklyReports(t *testing.T) {
	// テスト用DBセットアップ
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	// リポジトリ作成
	reportRepo := repository.NewWeeklyReportRefactoredRepository(db, logger)
	userRepo := repository.NewUserRepository(db)
	dailyRecordRepo := repository.NewDailyRecordRepository(db)
	departmentRepo := repository.NewDepartmentRepository(db)
	notificationRepo := repository.NewNotificationRepository(db, logger)

	// サービス作成
	svc := service.NewWeeklyReportRefactoredService(
		db,
		reportRepo,
		userRepo,
		dailyRecordRepo,
		departmentRepo,
		notificationRepo,
		logger,
	)

	ctx := context.Background()

	// テストデータ作成
	userID := uuid.New()
	user := &model.User{
		ID:        userID,
		Email:     "test@duesk.co.jp",
		FirstName: "太郎",
		LastName:  "テスト",
		Active:    true,
	}
	require.NoError(t, userRepo.Create(user))

	// 週報を複数作成
	now := time.Now()
	for i := 0; i < 3; i++ {
		startDate := now.AddDate(0, 0, -7*(i+1))
		endDate := startDate.AddDate(0, 0, 6)

		report := &model.WeeklyReport{
			UserID:    userID,
			StartDate: startDate,
			EndDate:   endDate,
			Status:    model.WeeklyReportStatusDraft,
			Mood:      model.MoodStatusNeutral,
		}

		err := reportRepo.Create(ctx, report)
		require.NoError(t, err)
	}

	// テスト実行
	params := &service.ListParams{
		Page:  1,
		Limit: 10,
	}

	response, err := svc.GetUserWeeklyReports(ctx, userID, params)

	// アサーション
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Len(t, response.Reports, 3)
	assert.Equal(t, int64(3), response.Pagination.TotalCount)
	assert.Equal(t, 1, response.Pagination.CurrentPage)

	// N+1クエリが発生していないことを確認（ユーザー情報が含まれているか）
	for _, report := range response.Reports {
		assert.Equal(t, userID, report.UserID)
		assert.Equal(t, "draft", report.Status)
	}
}

func TestWeeklyReportRefactoredService_GetUnsubmittedReports(t *testing.T) {
	// テスト用DBセットアップ
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	// リポジトリ作成
	reportRepo := repository.NewWeeklyReportRefactoredRepository(db, logger)
	userRepo := repository.NewUserRepository(db)
	dailyRecordRepo := repository.NewDailyRecordRepository(db)
	departmentRepo := repository.NewDepartmentRepository(db)
	notificationRepo := repository.NewNotificationRepository(db, logger)

	// サービス作成
	svc := service.NewWeeklyReportRefactoredService(
		db,
		reportRepo,
		userRepo,
		dailyRecordRepo,
		departmentRepo,
		notificationRepo,
		logger,
	)

	ctx := context.Background()

	// 部署作成
	deptID := uuid.New()
	dept := &model.Department{
		ID:   deptID,
		Name: "開発部",
	}
	require.NoError(t, departmentRepo.Create(ctx, dept))

	// マネージャー作成
	managerID := uuid.New()
	manager := &model.User{
		ID:           managerID,
		Email:        "manager@duesk.co.jp",
		FirstName:    "マネージャー",
		LastName:     "テスト",
		Active:       true,
		DepartmentID: &deptID,
	}
	require.NoError(t, userRepo.Create(manager))

	// ユーザー作成
	userID := uuid.New()
	user := &model.User{
		ID:           userID,
		Email:        "user@duesk.co.jp",
		FirstName:    "ユーザー",
		LastName:     "テスト",
		Active:       true,
		DepartmentID: &deptID,
		ManagerID:    &managerID,
	}
	require.NoError(t, userRepo.Create(user))

	// 期限切れの未提出週報を作成
	now := time.Now()
	deadline := now.AddDate(0, 0, -3) // 3日前が期限

	report := &model.WeeklyReport{
		UserID:             userID,
		StartDate:          now.AddDate(0, 0, -7),
		EndDate:            now.AddDate(0, 0, -1),
		Status:             model.WeeklyReportStatusDraft,
		Mood:               model.MoodStatusNeutral,
		SubmissionDeadline: &deadline,
	}

	err := reportRepo.Create(ctx, report)
	require.NoError(t, err)

	// テスト実行
	params := &service.UnsubmittedListParams{
		Page:  1,
		Limit: 10,
	}

	response, err := svc.GetUnsubmittedReports(ctx, params)

	// アサーション
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Len(t, response.Reports, 1)

	// 未提出レポートの詳細確認
	unsubmittedReport := response.Reports[0]
	assert.Equal(t, userID, unsubmittedReport.UserID)
	assert.Equal(t, "ユーザー テスト", unsubmittedReport.UserName)
	assert.Equal(t, "user@duesk.co.jp", unsubmittedReport.UserEmail)
	assert.Equal(t, "開発部", unsubmittedReport.DepartmentName)
	assert.Equal(t, "マネージャー テスト", unsubmittedReport.ManagerName)
	assert.Equal(t, 3, unsubmittedReport.DaysOverdue)

	// 統計情報確認
	assert.Equal(t, int64(1), response.Statistics.TotalUnsubmitted)
	assert.Equal(t, int64(1), response.Statistics.OverdueThreeDays)
}

func TestWeeklyReportRefactoredService_BatchOperations(t *testing.T) {
	// テスト用DBセットアップ
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	// リポジトリ作成
	reportRepo := repository.NewWeeklyReportRefactoredRepository(db, logger)
	userRepo := repository.NewUserRepository(db)
	dailyRecordRepo := repository.NewDailyRecordRepository(db)
	departmentRepo := repository.NewDepartmentRepository(db)
	notificationRepo := repository.NewNotificationRepository(db, logger)

	// サービス作成
	svc := service.NewWeeklyReportRefactoredService(
		db,
		reportRepo,
		userRepo,
		dailyRecordRepo,
		departmentRepo,
		notificationRepo,
		logger,
	)

	ctx := context.Background()

	// ユーザー作成
	userID := uuid.New()
	user := &model.User{
		ID:        userID,
		Email:     "test@duesk.co.jp",
		FirstName: "太郎",
		LastName:  "テスト",
		Active:    true,
	}
	require.NoError(t, userRepo.Create(user))

	// 複数の週報を作成
	reportIDs := make([]uuid.UUID, 3)
	for i := 0; i < 3; i++ {
		report := &model.WeeklyReport{
			UserID:    userID,
			StartDate: time.Now().AddDate(0, 0, -7*(i+1)),
			EndDate:   time.Now().AddDate(0, 0, -7*i-1),
			Status:    model.WeeklyReportStatusDraft,
			Mood:      model.MoodStatusNeutral,
		}

		err := reportRepo.Create(ctx, report)
		require.NoError(t, err)
		reportIDs[i] = report.ID
	}

	// 一括提出テスト
	err := svc.BatchSubmitReports(ctx, reportIDs)
	assert.NoError(t, err)

	// 提出状態を確認
	for _, id := range reportIDs {
		report, err := reportRepo.FindByID(ctx, id)
		require.NoError(t, err)
		assert.Equal(t, model.WeeklyReportStatusSubmitted, report.Status)
		assert.NotNil(t, report.SubmittedAt)
	}

	// 提出期限一括更新テスト
	newDeadline := time.Now().AddDate(0, 0, 7)
	err = svc.BatchUpdateDeadlines(ctx, reportIDs, newDeadline)
	assert.NoError(t, err)

	// 期限更新を確認
	for _, id := range reportIDs {
		report, err := reportRepo.FindByID(ctx, id)
		require.NoError(t, err)
		assert.NotNil(t, report.SubmissionDeadline)
		assert.Equal(t, newDeadline.Format("2006-01-02"), report.SubmissionDeadline.Format("2006-01-02"))
	}
}
