package service_test

import (
	"context"
	"fmt"
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

func TestUnsubmittedReportService_GetUnsubmittedReports(t *testing.T) {
	// テスト用DBセットアップ
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	// リポジトリ作成
	reportRepo := repository.NewWeeklyReportRefactoredRepository(db, logger)
	userRepo := repository.NewUserRepository(db)
	departmentRepo := repository.NewDepartmentRepository(db)
	notificationRepo := repository.NewNotificationRepository(db, logger)
	reminderSettingsRepo := repository.NewReminderSettingsRepository(db)

	// サービス作成
	svc := service.NewUnsubmittedReportService(
		db,
		reportRepo,
		userRepo,
		departmentRepo,
		notificationRepo,
		reminderSettingsRepo,
		logger,
	)

	ctx := context.Background()

	// テストデータ作成
	// 部署作成
	deptID := uuid.New()
	dept := &model.Department{
		ID:   deptID,
		Name: "開発部",
	}
	require.NoError(t, departmentRepo.Create(ctx, dept))

	// ユーザー作成
	users := make([]*model.User, 3)
	for i := 0; i < 3; i++ {
		userID := uuid.New()
		user := &model.User{
			ID:           userID,
			Email:        fmt.Sprintf("user%d@duesk.co.jp", i+1),
			FirstName:    fmt.Sprintf("太郎%d", i+1),
			LastName:     "テスト",
			Active:       true,
			DepartmentID: &deptID,
		}
		require.NoError(t, userRepo.Create(user))
		users[i] = user
	}

	// 未提出週報を作成（期限切れ）
	now := time.Now()
	for i, user := range users {
		deadline := now.AddDate(0, 0, -(i+1)*3) // 3日、6日、9日前
		report := &model.WeeklyReport{
			UserID:             user.ID,
			StartDate:          deadline.AddDate(0, 0, -7),
			EndDate:            deadline.AddDate(0, 0, -1),
			Status:             model.WeeklyReportStatusDraft,
			SubmissionDeadline: &deadline,
		}
		require.NoError(t, reportRepo.Create(ctx, report))
	}

	// テスト実行
	params := &service.UnsubmittedReportParams{
		Page:  1,
		Limit: 10,
	}

	response, err := svc.GetUnsubmittedReports(ctx, params)

	// アサーション
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Len(t, response.Reports, 3)
	assert.Equal(t, int64(3), response.Summary.TotalUnsubmitted)

	// 経過日数による分類を確認
	assert.Equal(t, int64(1), response.Summary.ByOverdueDays["0-2days"])  // 3日前
	assert.Equal(t, int64(1), response.Summary.ByOverdueDays["3-6days"])  // 6日前
	assert.Equal(t, int64(1), response.Summary.ByOverdueDays["7-13days"]) // 9日前

	// 部署別集計を確認
	assert.Equal(t, int64(3), response.Summary.ByDepartment["開発部"])

	// 平均遅延日数を確認
	assert.Greater(t, response.Summary.AverageOverdueDays, 5.0)
}

func TestUnsubmittedReportService_GetDepartmentUnsubmittedStats(t *testing.T) {
	// テスト用DBセットアップ
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	// リポジトリ作成
	reportRepo := repository.NewWeeklyReportRefactoredRepository(db, logger)
	userRepo := repository.NewUserRepository(db)
	departmentRepo := repository.NewDepartmentRepository(db)
	notificationRepo := repository.NewNotificationRepository(db, logger)
	reminderSettingsRepo := repository.NewReminderSettingsRepository(db)

	// サービス作成
	svc := service.NewUnsubmittedReportService(
		db,
		reportRepo,
		userRepo,
		departmentRepo,
		notificationRepo,
		reminderSettingsRepo,
		logger,
	)

	ctx := context.Background()

	// 部署作成
	depts := []struct {
		id   uuid.UUID
		name string
	}{
		{uuid.New(), "開発部"},
		{uuid.New(), "営業部"},
	}

	for _, d := range depts {
		dept := &model.Department{
			ID:   d.id,
			Name: d.name,
		}
		require.NoError(t, departmentRepo.Create(ctx, dept))
	}

	// 各部署にユーザーと未提出週報を作成
	now := time.Now()
	deadline := now.AddDate(0, 0, -3)

	// 開発部: 3人中2人が未提出
	for i := 0; i < 3; i++ {
		user := &model.User{
			ID:           uuid.New(),
			Email:        fmt.Sprintf("dev%d@duesk.co.jp", i+1),
			FirstName:    fmt.Sprintf("開発者%d", i+1),
			LastName:     "テスト",
			Active:       true,
			DepartmentID: &depts[0].id,
		}
		require.NoError(t, userRepo.Create(user))

		if i < 2 { // 2人分の未提出週報を作成
			report := &model.WeeklyReport{
				UserID:             user.ID,
				StartDate:          deadline.AddDate(0, 0, -7),
				EndDate:            deadline.AddDate(0, 0, -1),
				Status:             model.WeeklyReportStatusDraft,
				SubmissionDeadline: &deadline,
			}
			require.NoError(t, reportRepo.Create(ctx, report))
		}
	}

	// 営業部: 2人中1人が未提出
	for i := 0; i < 2; i++ {
		user := &model.User{
			ID:           uuid.New(),
			Email:        fmt.Sprintf("sales%d@duesk.co.jp", i+1),
			FirstName:    fmt.Sprintf("営業%d", i+1),
			LastName:     "テスト",
			Active:       true,
			DepartmentID: &depts[1].id,
		}
		require.NoError(t, userRepo.Create(user))

		if i < 1 { // 1人分の未提出週報を作成
			report := &model.WeeklyReport{
				UserID:             user.ID,
				StartDate:          deadline.AddDate(0, 0, -7),
				EndDate:            deadline.AddDate(0, 0, -1),
				Status:             model.WeeklyReportStatusDraft,
				SubmissionDeadline: &deadline,
			}
			require.NoError(t, reportRepo.Create(ctx, report))
		}
	}

	// テスト実行
	stats, err := svc.GetDepartmentUnsubmittedStats(ctx)

	// アサーション
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Len(t, stats, 2)

	// 部署別の統計を確認
	for _, stat := range stats {
		switch stat.DepartmentName {
		case "開発部":
			assert.Equal(t, int64(3), stat.TotalEmployees)
			assert.Equal(t, int64(2), stat.UnsubmittedCount)
			assert.InDelta(t, 66.7, stat.UnsubmittedRate, 0.1)
		case "営業部":
			assert.Equal(t, int64(2), stat.TotalEmployees)
			assert.Equal(t, int64(1), stat.UnsubmittedCount)
			assert.Equal(t, 50.0, stat.UnsubmittedRate)
		}
	}
}

func TestUnsubmittedReportService_SendRemindersToUnsubmitted(t *testing.T) {
	// テスト用DBセットアップ
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	// リポジトリ作成
	reportRepo := repository.NewWeeklyReportRefactoredRepository(db, logger)
	userRepo := repository.NewUserRepository(db)
	departmentRepo := repository.NewDepartmentRepository(db)
	notificationRepo := repository.NewNotificationRepository(db, logger)
	reminderSettingsRepo := repository.NewReminderSettingsRepository(db)

	// サービス作成
	svc := service.NewUnsubmittedReportService(
		db,
		reportRepo,
		userRepo,
		departmentRepo,
		notificationRepo,
		reminderSettingsRepo,
		logger,
	)

	ctx := context.Background()

	// テスト用ユーザーID
	userIDs := []uuid.UUID{
		uuid.New(),
		uuid.New(),
		uuid.New(),
	}

	// リマインド送信
	message := "週報の提出をお願いします。"
	err := svc.SendRemindersToUnsubmitted(ctx, userIDs, message)

	// アサーション
	assert.NoError(t, err)

	// 通知が作成されたことを確認
	var notifications []model.NotificationHistory
	err = db.Find(&notifications).Error
	require.NoError(t, err)

	assert.Len(t, notifications, 3)
	for i, notification := range notifications {
		assert.Equal(t, userIDs[i], notification.UserID)
		assert.Equal(t, model.NotificationTypeWeeklyReportReminder, notification.Type)
		assert.Equal(t, "週報提出のリマインド", notification.Title)
		assert.Equal(t, message, notification.Message)
		assert.Equal(t, model.NotificationPriorityHigh, notification.Priority)
		assert.Equal(t, model.NotificationStatusPending, notification.Status)
	}
}

func TestUnsubmittedReportService_AutoReminderSettings(t *testing.T) {
	// テスト用DBセットアップ
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	// リポジトリ作成
	reportRepo := repository.NewWeeklyReportRefactoredRepository(db, logger)
	userRepo := repository.NewUserRepository(db)
	departmentRepo := repository.NewDepartmentRepository(db)
	notificationRepo := repository.NewNotificationRepository(db, logger)
	reminderSettingsRepo := repository.NewReminderSettingsRepository(db)

	// サービス作成
	svc := service.NewUnsubmittedReportService(
		db,
		reportRepo,
		userRepo,
		departmentRepo,
		notificationRepo,
		reminderSettingsRepo,
		logger,
	)

	ctx := context.Background()

	// デフォルト設定を取得
	defaultSettings, err := svc.GetAutoReminderSettings(ctx)
	assert.NoError(t, err)
	assert.NotNil(t, defaultSettings)
	assert.True(t, defaultSettings.Enabled)
	assert.Equal(t, 3, defaultSettings.FirstReminderDays)
	assert.Equal(t, 7, defaultSettings.SecondReminderDays)
	assert.Equal(t, 14, defaultSettings.EscalationDays)
	assert.Equal(t, "09:00", defaultSettings.ReminderTime)
	assert.True(t, defaultSettings.IncludeManager)

	// 設定を更新
	updatedBy := uuid.New()
	newSettings := &service.AutoReminderSettings{
		Enabled:            false,
		FirstReminderDays:  5,
		SecondReminderDays: 10,
		EscalationDays:     20,
		ReminderTime:       "10:00",
		IncludeManager:     false,
		UpdatedBy:          updatedBy,
	}

	err = svc.SetAutoReminderSettings(ctx, newSettings)
	assert.NoError(t, err)

	// 更新後の設定を取得
	updatedSettings, err := svc.GetAutoReminderSettings(ctx)
	assert.NoError(t, err)
	assert.NotNil(t, updatedSettings)
	assert.False(t, updatedSettings.Enabled)
	assert.Equal(t, 5, updatedSettings.FirstReminderDays)
	assert.Equal(t, 10, updatedSettings.SecondReminderDays)
	assert.Equal(t, 20, updatedSettings.EscalationDays)
	assert.Equal(t, "10:00", updatedSettings.ReminderTime)
	assert.False(t, updatedSettings.IncludeManager)
	assert.Equal(t, updatedBy, updatedSettings.UpdatedBy)
}
