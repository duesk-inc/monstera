package test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/testutils"
)

// TestDatabaseIntegrationFullWorkflow データベース統合ワークフローのテスト
func TestDatabaseIntegrationFullWorkflow(t *testing.T) {
	// テスト環境セットアップ
	testutils.SetupTestEnvironment()
	db := testutils.SetupTestDB(t)
	logger := zap.NewNop()

	gormDB := db.(*gorm.DB)
	helper := NewE2ETestHelper(gormDB, t)
	defer helper.CleanupTestData()

	ctx := context.Background()

	// リポジトリ層の初期化
	userRepo := repository.NewUserRepository(gormDB, logger)
	clientRepo := repository.NewClientRepository(gormDB, logger)
	projectRepo := repository.NewProjectRepository(gormDB, logger)
	projectAssignmentRepo := repository.NewProjectAssignmentRepository(gormDB, logger)
	invoiceRepo := repository.NewInvoiceRepository(gormDB, logger)
	projectGroupRepo := repository.NewProjectGroupRepository(gormDB, logger)
	freeSyncLogRepo := repository.NewFreeSyncLogRepository(gormDB, logger)
	scheduledJobRepo := repository.NewScheduledJobRepository(gormDB, logger)

	t.Run("完全なデータベース統合ワークフロー", func(t *testing.T) {
		// 1. ユーザー作成とロール管理
		t.Run("1. ユーザー作成とロール管理", func(t *testing.T) {
			// 複数ロールのユーザーを作成
			adminUser := helper.CreateTestUser(1, "admin@db-test.com")
			accountingManager := helper.CreateTestUser(7, "accounting.manager@db-test.com")
			accountingStaff := helper.CreateTestUser(8, "accounting.staff@db-test.com")
			engineer := helper.CreateTestUser(4, "engineer@db-test.com")

			// ユーザー取得テスト
			retrievedAdmin, err := userRepo.GetByID(ctx, adminUser.ID)
			require.NoError(t, err)
			assert.Equal(t, adminUser.Email, retrievedAdmin.Email)
			assert.Equal(t, adminUser.Role, retrievedAdmin.Role)

			// ロール別ユーザー検索テスト
			accountingUsers, err := userRepo.GetByRole(ctx, 7) // accounting_manager
			require.NoError(t, err)
			assert.Len(t, accountingUsers, 1)
			assert.Equal(t, accountingManager.ID, accountingUsers[0].ID)

			// アクティブユーザー検索テスト
			activeUsers, err := userRepo.GetActiveUsers(ctx)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(activeUsers), 4)
		})

		// 2. クライアント・プロジェクト管理
		t.Run("2. クライアント・プロジェクト管理", func(t *testing.T) {
			// クライアント作成
			client1 := helper.CreateTestClient("DB統合テストクライアント1")
			client2 := helper.CreateTestClient("DB統合テストクライアント2")

			// プロジェクト作成
			project1 := helper.CreateTestProject(client1.ID, "DB統合テストプロジェクト1")
			project2 := helper.CreateTestProject(client2.ID, "DB統合テストプロジェクト2")

			// クライアント別プロジェクト検索
			client1Projects, err := projectRepo.GetByClientID(ctx, client1.ID)
			require.NoError(t, err)
			assert.Len(t, client1Projects, 1)
			assert.Equal(t, project1.ID, client1Projects[0].ID)

			// アクティブプロジェクト検索
			activeProjects, err := projectRepo.GetActiveProjects(ctx)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(activeProjects), 2)

			// プロジェクト詳細情報取得（クライアント情報含む）
			projectWithClient, err := projectRepo.GetWithClient(ctx, project1.ID)
			require.NoError(t, err)
			assert.Equal(t, project1.ID, projectWithClient.ID)
			assert.Equal(t, client1.ID, projectWithClient.ClientID)
			assert.Equal(t, client1.Name, projectWithClient.Client.Name)
		})

		// 3. プロジェクトアサインメント管理
		t.Run("3. プロジェクトアサインメント管理", func(t *testing.T) {
			// テストデータ準備
			engineer := helper.CreateTestUser(4, "engineer.assignment@db-test.com")
			client := helper.CreateTestClient("アサインメントテストクライアント")
			project := helper.CreateTestProject(client.ID, "アサインメントテストプロジェクト")

			// プロジェクトアサインメント作成
			assignment1 := helper.CreateTestProjectAssignment(engineer.ID, project.ID, 500000)
			assignment2 := helper.CreateTestProjectAssignment(engineer.ID, project.ID, 600000)

			// ユーザー別アサインメント検索
			userAssignments, err := projectAssignmentRepo.GetByUserID(ctx, engineer.ID)
			require.NoError(t, err)
			assert.Len(t, userAssignments, 2)

			// プロジェクト別アサインメント検索
			projectAssignments, err := projectAssignmentRepo.GetByProjectID(ctx, project.ID)
			require.NoError(t, err)
			assert.Len(t, projectAssignments, 2)

			// 期間別アサインメント検索
			currentDate := time.Now()
			activeAssignments, err := projectAssignmentRepo.GetByDateRange(ctx,
				currentDate.AddDate(0, -2, 0),
				currentDate.AddDate(0, 2, 0))
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(activeAssignments), 2)

			// アサインメント詳細情報取得（ユーザー・プロジェクト情報含む）
			detailedAssignment, err := projectAssignmentRepo.GetWithDetails(ctx, assignment1.ID)
			require.NoError(t, err)
			assert.Equal(t, assignment1.ID, detailedAssignment.ID)
			assert.Equal(t, engineer.ID, detailedAssignment.UserID)
			assert.Equal(t, project.ID, detailedAssignment.ProjectID)
			assert.Equal(t, engineer.Email, detailedAssignment.User.Email)
			assert.Equal(t, project.Name, detailedAssignment.Project.Name)
		})

		// 4. 請求書管理
		t.Run("4. 請求書管理", func(t *testing.T) {
			// テストデータ準備
			client := helper.CreateTestClient("請求書テストクライアント")

			// 複数ステータスの請求書作成
			draftInvoice := helper.CreateTestInvoice(client.ID, 500000, "draft")
			sentInvoice := helper.CreateTestInvoice(client.ID, 600000, "sent")
			paidInvoice := helper.CreateTestInvoice(client.ID, 700000, "paid")

			// ステータス別請求書検索
			draftInvoices, err := invoiceRepo.GetByStatus(ctx, "draft")
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(draftInvoices), 1)

			// クライアント別請求書検索
			clientInvoices, err := invoiceRepo.GetByClientID(ctx, client.ID)
			require.NoError(t, err)
			assert.Len(t, clientInvoices, 3)

			// 期間別請求書検索
			currentDate := time.Now()
			monthlyInvoices, err := invoiceRepo.GetByDateRange(ctx,
				currentDate.AddDate(0, -1, 0),
				currentDate.AddDate(0, 1, 0))
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(monthlyInvoices), 3)

			// 請求書ステータス更新
			err = invoiceRepo.UpdateStatus(ctx, draftInvoice.ID, "sent")
			require.NoError(t, err)

			// 更新確認
			updatedInvoice, err := invoiceRepo.GetByID(ctx, draftInvoice.ID)
			require.NoError(t, err)
			assert.Equal(t, "sent", updatedInvoice.Status)

			// 請求書集計テスト
			totalAmount, err := invoiceRepo.GetTotalAmountByStatus(ctx, "paid")
			require.NoError(t, err)
			assert.GreaterOrEqual(t, totalAmount, 700000)

			// 月次集計テスト
			monthlyTotal, err := invoiceRepo.GetMonthlyTotal(ctx, currentDate.Year(), int(currentDate.Month()))
			require.NoError(t, err)
			assert.Greater(t, monthlyTotal, 0)
		})

		// 5. プロジェクトグループ管理
		t.Run("5. プロジェクトグループ管理", func(t *testing.T) {
			// テストデータ準備
			client1 := helper.CreateTestClient("グループテストクライアント1")
			client2 := helper.CreateTestClient("グループテストクライアント2")
			project1 := helper.CreateTestProject(client1.ID, "グループテストプロジェクト1")
			project2 := helper.CreateTestProject(client2.ID, "グループテストプロジェクト2")

			// プロジェクトグループ作成
			group1 := helper.CreateTestProjectGroup("DB統合テストグループ1",
				[]uuid.UUID{client1.ID}, []uuid.UUID{project1.ID})
			group2 := helper.CreateTestProjectGroup("DB統合テストグループ2",
				[]uuid.UUID{client2.ID}, []uuid.UUID{project2.ID})

			// プロジェクトグループ検索
			allGroups, err := projectGroupRepo.GetAll(ctx)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(allGroups), 2)

			// 詳細情報付きプロジェクトグループ取得
			detailedGroup, err := projectGroupRepo.GetWithDetails(ctx, group1.ID)
			require.NoError(t, err)
			assert.Equal(t, group1.ID, detailedGroup.ID)
			assert.Equal(t, group1.Name, detailedGroup.Name)

			// プロジェクトグループマッピング検索
			groupMappings, err := projectGroupRepo.GetMappingsByGroupID(ctx, group1.ID)
			require.NoError(t, err)
			assert.Len(t, groupMappings, 2) // client + project

			// クライアント別グループ検索
			clientGroups, err := projectGroupRepo.GetByClientID(ctx, client1.ID)
			require.NoError(t, err)
			assert.Len(t, clientGroups, 1)
			assert.Equal(t, group1.ID, clientGroups[0].ID)

			// プロジェクト別グループ検索
			projectGroups, err := projectGroupRepo.GetByProjectID(ctx, project1.ID)
			require.NoError(t, err)
			assert.Len(t, projectGroups, 1)
			assert.Equal(t, group1.ID, projectGroups[0].ID)
		})

		// 6. freee同期ログ管理
		t.Run("6. freee同期ログ管理", func(t *testing.T) {
			// 複数タイプの同期ログ作成
			partnerLog := helper.CreateTestFreeSyncLog("partners", "success")
			invoiceLog := helper.CreateTestFreeSyncLog("invoices", "success")
			failedLog := helper.CreateTestFreeSyncLog("partners", "failed")

			// 同期タイプ別ログ検索
			partnerLogs, err := freeSyncLogRepo.GetBySyncType(ctx, "partners")
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(partnerLogs), 2)

			// ステータス別ログ検索
			successLogs, err := freeSyncLogRepo.GetByStatus(ctx, "success")
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(successLogs), 2)

			failedLogs, err := freeSyncLogRepo.GetByStatus(ctx, "failed")
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(failedLogs), 1)

			// 期間別ログ検索
			currentDate := time.Now()
			recentLogs, err := freeSyncLogRepo.GetByDateRange(ctx,
				currentDate.AddDate(0, 0, -1),
				currentDate.AddDate(0, 0, 1))
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(recentLogs), 3)

			// 最新ログ取得
			latestLog, err := freeSyncLogRepo.GetLatestBySyncType(ctx, "partners")
			require.NoError(t, err)
			assert.NotNil(t, latestLog)

			// ログ統計取得
			syncStats, err := freeSyncLogRepo.GetSyncStatistics(ctx,
				currentDate.AddDate(0, 0, -7), currentDate)
			require.NoError(t, err)
			assert.Greater(t, syncStats.TotalSyncs, 0)
		})

		// 7. スケジュールジョブ管理
		t.Run("7. スケジュールジョブ管理", func(t *testing.T) {
			// 複数タイプのジョブ作成
			billingJob := helper.CreateTestScheduledJob("billing", time.Now().Add(24*time.Hour))
			syncJob := helper.CreateTestScheduledJob("sync", time.Now().Add(48*time.Hour))
			reportJob := helper.CreateTestScheduledJob("report", time.Now().Add(72*time.Hour))

			// ジョブタイプ別検索
			billingJobs, err := scheduledJobRepo.GetByJobType(ctx, "billing")
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(billingJobs), 1)

			// ステータス別検索
			pendingJobs, err := scheduledJobRepo.GetByStatus(ctx, "pending")
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(pendingJobs), 3)

			// 実行予定ジョブ検索
			currentTime := time.Now()
			upcomingJobs, err := scheduledJobRepo.GetUpcomingJobs(ctx, currentTime.Add(25*time.Hour))
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(upcomingJobs), 1)

			// ジョブステータス更新
			err = scheduledJobRepo.UpdateStatus(ctx, billingJob.ID, "running")
			require.NoError(t, err)

			// 更新確認
			updatedJob, err := scheduledJobRepo.GetByID(ctx, billingJob.ID)
			require.NoError(t, err)
			assert.Equal(t, "running", updatedJob.Status)

			// 実行完了処理
			err = scheduledJobRepo.MarkCompleted(ctx, billingJob.ID, "処理完了")
			require.NoError(t, err)

			// 完了確認
			completedJob, err := scheduledJobRepo.GetByID(ctx, billingJob.ID)
			require.NoError(t, err)
			assert.Equal(t, "completed", completedJob.Status)
			assert.NotNil(t, completedJob.CompletedAt)
		})

		// 8. 複合クエリと集計テスト
		t.Run("8. 複合クエリと集計テスト", func(t *testing.T) {
			// テストデータ準備
			client := helper.CreateTestClient("複合テストクライアント")
			project := helper.CreateTestProject(client.ID, "複合テストプロジェクト")
			engineer := helper.CreateTestUser(4, "complex.engineer@db-test.com")
			assignment := helper.CreateTestProjectAssignment(engineer.ID, project.ID, 800000)
			invoice := helper.CreateTestInvoice(client.ID, 800000, "paid")

			// クライアント売上集計
			clientRevenue, err := invoiceRepo.GetClientRevenue(ctx, client.ID)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, clientRevenue, 800000)

			// エンジニア稼働統計
			engineerStats, err := projectAssignmentRepo.GetEngineerStats(ctx, engineer.ID)
			require.NoError(t, err)
			assert.Greater(t, engineerStats.TotalProjects, 0)
			assert.Greater(t, engineerStats.TotalRevenue, 0)

			// プロジェクト収益性分析
			projectProfitability, err := projectRepo.GetProfitabilityStats(ctx, project.ID)
			require.NoError(t, err)
			assert.NotNil(t, projectProfitability)

			// 月次ダッシュボードデータ
			currentDate := time.Now()
			dashboardData, err := getDashboardData(ctx, gormDB, currentDate.Year(), int(currentDate.Month()))
			require.NoError(t, err)
			assert.NotNil(t, dashboardData)
			assert.Greater(t, dashboardData.TotalRevenue, 0)
			assert.Greater(t, dashboardData.TotalInvoices, 0)
		})

		// 9. トランザクション整合性テスト
		t.Run("9. トランザクション整合性テスト", func(t *testing.T) {
			// トランザクション内での複数操作
			err := gormDB.Transaction(func(tx *gorm.DB) error {
				// 新しいクライアント作成
				client := &model.Client{
					ID:          uuid.New(),
					Name:        "トランザクションテストクライアント",
					Description: "トランザクションテスト用",
					Address:     "東京都",
					PhoneNumber: "03-1234-5678",
					Email:       "transaction@test.com",
					Active:      true,
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				}
				if err := tx.Create(client).Error; err != nil {
					return err
				}

				// 関連プロジェクト作成
				project := &model.Project{
					ID:          uuid.New(),
					ClientID:    client.ID,
					Name:        "トランザクションテストプロジェクト",
					Description: "トランザクションテスト用",
					StartDate:   time.Now(),
					EndDate:     time.Now().AddDate(0, 6, 0),
					Status:      "active",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				}
				if err := tx.Create(project).Error; err != nil {
					return err
				}

				// 関連請求書作成
				invoice := &model.Invoice{
					ID:          uuid.New(),
					ClientID:    client.ID,
					InvoiceDate: time.Now(),
					DueDate:     time.Now().AddDate(0, 1, 0),
					Amount:      1000000,
					TaxAmount:   100000,
					TotalAmount: 1100000,
					Status:      "draft",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				}
				if err := tx.Create(invoice).Error; err != nil {
					return err
				}

				return nil
			})
			require.NoError(t, err)

			// トランザクション成功確認
			var count int64
			err = gormDB.Model(&model.Client{}).Where("name = ?", "トランザクションテストクライアント").Count(&count).Error
			require.NoError(t, err)
			assert.Equal(t, int64(1), count)
		})

		// 10. インデックス効率性テスト
		t.Run("10. インデックス効率性テスト", func(t *testing.T) {
			// 大量データでのクエリパフォーマンステスト
			startTime := time.Now()

			// インデックスが効いているべきクエリ
			var users []model.User
			err := gormDB.Where("role = ? AND active = ?", 7, true).Find(&users).Error
			require.NoError(t, err)

			queryDuration := time.Since(startTime)
			assert.Less(t, queryDuration, time.Second, "インデックス付きクエリは1秒以内で完了すべき")

			// 複合インデックステスト
			startTime = time.Now()
			var invoices []model.Invoice
			err = gormDB.Where("client_id = ? AND status = ?", uuid.New(), "paid").Find(&invoices).Error
			require.NoError(t, err)

			queryDuration = time.Since(startTime)
			assert.Less(t, queryDuration, time.Second, "複合インデックスクエリは1秒以内で完了すべき")
		})
	})
}

// getDashboardData ダッシュボードデータ取得のヘルパー関数
func getDashboardData(ctx context.Context, db *gorm.DB, year, month int) (*DashboardData, error) {
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Nanosecond)

	// 月次請求書集計
	var totalRevenue int
	var totalInvoices int64

	err := db.WithContext(ctx).Model(&model.Invoice{}).
		Where("invoice_date BETWEEN ? AND ?", startDate, endDate).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&totalRevenue).Error
	if err != nil {
		return nil, err
	}

	err = db.WithContext(ctx).Model(&model.Invoice{}).
		Where("invoice_date BETWEEN ? AND ?", startDate, endDate).
		Count(&totalInvoices).Error
	if err != nil {
		return nil, err
	}

	// アクティブプロジェクト数
	var activeProjects int64
	err = db.WithContext(ctx).Model(&model.Project{}).
		Where("status = ?", "active").
		Count(&activeProjects).Error
	if err != nil {
		return nil, err
	}

	// アクティブクライアント数
	var activeClients int64
	err = db.WithContext(ctx).Model(&model.Client{}).
		Where("active = ?", true).
		Count(&activeClients).Error
	if err != nil {
		return nil, err
	}

	return &DashboardData{
		TotalRevenue:   totalRevenue,
		TotalInvoices:  int(totalInvoices),
		ActiveProjects: int(activeProjects),
		ActiveClients:  int(activeClients),
		Year:           year,
		Month:          month,
	}, nil
}

// DashboardData ダッシュボードデータ構造体
type DashboardData struct {
	TotalRevenue   int `json:"total_revenue"`
	TotalInvoices  int `json:"total_invoices"`
	ActiveProjects int `json:"active_projects"`
	ActiveClients  int `json:"active_clients"`
	Year           int `json:"year"`
	Month          int `json:"month"`
}

// TestDatabaseConstraints データベース制約のテスト
func TestDatabaseConstraints(t *testing.T) {
	// テスト環境セットアップ
	testutils.SetupTestEnvironment()
	db := testutils.SetupTestDB(t)
	gormDB := db.(*gorm.DB)

	helper := NewE2ETestHelper(gormDB, t)
	defer helper.CleanupTestData()

	t.Run("外部キー制約テスト", func(t *testing.T) {
		// 存在しないクライアントIDでプロジェクト作成試行
		project := &model.Project{
			ID:          uuid.New(),
			ClientID:    uuid.New(), // 存在しないクライアントID
			Name:        "制約テストプロジェクト",
			Description: "外部キー制約テスト",
			StartDate:   time.Now(),
			EndDate:     time.Now().AddDate(0, 1, 0),
			Status:      "active",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		err := gormDB.Create(project).Error
		assert.Error(t, err, "存在しないクライアントIDでプロジェクト作成は失敗すべき")
	})

	t.Run("一意制約テスト", func(t *testing.T) {
		// 同じメールアドレスでユーザー作成試行
		user1 := helper.CreateTestUser(4, "duplicate@test.com")

		user2 := &model.User{
			ID:            uuid.New(),
			Email:         "duplicate@test.com", // 重複メールアドレス
			FirstName:     "重複",
			LastName:      "テスト",
			FirstNameKana: "チョウフク",
			LastNameKana:  "テスト",
			PhoneNumber:   "090-8765-4321",
			Role:          4,
			Active:        true,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		err := gormDB.Create(user2).Error
		assert.Error(t, err, "重複メールアドレスでユーザー作成は失敗すべき")
	})

	t.Run("カスケード削除テスト", func(t *testing.T) {
		// テストデータ作成
		client := helper.CreateTestClient("カスケードテストクライアント")
		project := helper.CreateTestProject(client.ID, "カスケードテストプロジェクト")
		engineer := helper.CreateTestUser(4, "cascade@test.com")
		assignment := helper.CreateTestProjectAssignment(engineer.ID, project.ID, 500000)

		// プロジェクト削除
		err := gormDB.Delete(&model.Project{}, project.ID).Error
		require.NoError(t, err)

		// 関連するアサインメントが削除されているか確認
		var assignmentCount int64
		err = gormDB.Model(&model.ProjectAssignment{}).Where("project_id = ?", project.ID).Count(&assignmentCount).Error
		require.NoError(t, err)
		assert.Equal(t, int64(0), assignmentCount, "プロジェクト削除時にアサインメントも削除されるべき")
	})
}

// TestDatabasePerformance データベースパフォーマンステスト
func TestDatabasePerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("パフォーマンステストをスキップ")
	}

	// テスト環境セットアップ
	testutils.SetupTestEnvironment()
	db := testutils.SetupTestDB(t)
	gormDB := db.(*gorm.DB)

	helper := NewE2ETestHelper(gormDB, t)
	defer helper.CleanupTestData()

	t.Run("大量データ挿入パフォーマンス", func(t *testing.T) {
		const batchSize = 1000
		clients := make([]model.Client, batchSize)

		for i := 0; i < batchSize; i++ {
			clients[i] = model.Client{
				ID:          uuid.New(),
				Name:        fmt.Sprintf("パフォーマンステストクライアント%d", i),
				Description: "パフォーマンステスト用クライアント",
				Address:     "東京都",
				PhoneNumber: "03-1234-5678",
				Email:       fmt.Sprintf("perf-test-%d@duesk.co.jp", i),
				Active:      true,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}
		}

		startTime := time.Now()
		err := gormDB.CreateInBatches(clients, 100).Error
		duration := time.Since(startTime)

		require.NoError(t, err)
		assert.Less(t, duration, 10*time.Second, "1000件のバッチ挿入は10秒以内で完了すべき")

		t.Logf("バッチ挿入パフォーマンス: %d件を%v で処理", batchSize, duration)
	})

	t.Run("複雑なJOINクエリパフォーマンス", func(t *testing.T) {
		startTime := time.Now()

		var results []struct {
			ClientName    string `json:"client_name"`
			ProjectName   string `json:"project_name"`
			EngineerEmail string `json:"engineer_email"`
			TotalAmount   int    `json:"total_amount"`
		}

		err := gormDB.Table("invoices i").
			Select("c.name as client_name, p.name as project_name, u.email as engineer_email, i.total_amount").
			Joins("JOIN clients c ON i.client_id = c.id").
			Joins("JOIN projects p ON p.client_id = c.id").
			Joins("JOIN project_assignments pa ON pa.project_id = p.id").
			Joins("JOIN users u ON pa.user_id = u.id").
			Where("i.status = ? AND c.active = ? AND p.status = ?", "paid", true, "active").
			Limit(100).
			Find(&results).Error

		duration := time.Since(startTime)

		require.NoError(t, err)
		assert.Less(t, duration, 5*time.Second, "複雑なJOINクエリは5秒以内で完了すべき")

		t.Logf("複雑なJOINクエリパフォーマンス: %v で処理", duration)
	})

	t.Run("集計クエリパフォーマンス", func(t *testing.T) {
		startTime := time.Now()

		var aggregateResults []struct {
			ClientID     uuid.UUID `json:"client_id"`
			ClientName   string    `json:"client_name"`
			TotalRevenue int       `json:"total_revenue"`
			InvoiceCount int       `json:"invoice_count"`
		}

		err := gormDB.Table("invoices i").
			Select("c.id as client_id, c.name as client_name, SUM(i.total_amount) as total_revenue, COUNT(i.id) as invoice_count").
			Joins("JOIN clients c ON i.client_id = c.id").
			Where("i.status = ?", "paid").
			Group("c.id, c.name").
			Having("SUM(i.total_amount) > ?", 100000).
			Order("total_revenue DESC").
			Limit(50).
			Find(&aggregateResults).Error

		duration := time.Since(startTime)

		require.NoError(t, err)
		assert.Less(t, duration, 3*time.Second, "集計クエリは3秒以内で完了すべき")

		t.Logf("集計クエリパフォーマンス: %v で処理", duration)
	})
}
