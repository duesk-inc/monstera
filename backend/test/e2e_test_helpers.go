package test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
)

// min helper function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// E2ETestHelper エンドツーエンドテスト用のヘルパー構造体
type E2ETestHelper struct {
	DB *gorm.DB
	T  *testing.T
}

// NewE2ETestHelper E2ETestHelperのコンストラクタ
func NewE2ETestHelper(db *gorm.DB, t *testing.T) *E2ETestHelper {
	return &E2ETestHelper{
		DB: db,
		T:  t,
	}
}

// CreateTestUser テスト用ユーザーを作成
func (h *E2ETestHelper) CreateTestUser(role int, email string) *model.User {
	user := &model.User{
		ID:            uuid.New(),
		Email:         email,
		FirstName:     "テスト",
		LastName:      "ユーザー",
		FirstNameKana: "テスト",
		LastNameKana:  "ユーザー",
		PhoneNumber:   "090-1234-5678",
		Role:          model.Role(role),
		Active:        true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err := h.DB.Create(user).Error
	require.NoError(h.T, err)

	return user
}

// CreateTestClient テスト用クライアントを作成
func (h *E2ETestHelper) CreateTestClient(name string) *model.Client {
	client := &model.Client{
		ID:              uuid.New(),
		CompanyName:     name,
		CompanyNameKana: name + "カナ",
		Name:            name, // エイリアス
		BillingType:     model.BillingTypeMonthly,
		PaymentTerms:    30,
		ContactPerson:   "テスト担当者",
		ContactEmail:    "test@duesk.co.jp",
		ContactPhone:    "03-1234-5678",
		Address:         "東京都渋谷区",
		Notes:           "テスト用クライアント",
		IsActive:        true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err := h.DB.Create(client).Error
	require.NoError(h.T, err)

	return client
}

// CreateTestProject テスト用プロジェクトを作成
func (h *E2ETestHelper) CreateTestProject(clientID uuid.UUID, name string) *model.Project {
	startDate := time.Now().AddDate(0, -1, 0) // 1ヶ月前開始
	endDate := time.Now().AddDate(0, 1, 0)    // 1ヶ月後終了

	project := &model.Project{
		ID:              uuid.New(),
		ClientID:        clientID,
		ProjectName:     name,
		ProjectCode:     "TEST-" + name[:min(len(name), 10)],
		Status:          model.ProjectStatusActive,
		StartDate:       &startDate,
		EndDate:         &endDate,
		MonthlyRate:     500000.0,
		WorkingHoursMin: 140,
		WorkingHoursMax: 180,
		ContractType:    model.ContractTypeSES,
		WorkLocation:    "東京都",
		Description:     "テスト用プロジェクト",
		Requirements:    "テスト要件",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err := h.DB.Create(project).Error
	require.NoError(h.T, err)

	return project
}

// CreateTestProjectAssignment テスト用プロジェクトアサインメントを作成
func (h *E2ETestHelper) CreateTestProjectAssignment(userID, projectID uuid.UUID, billingRate float64) *model.ProjectAssignment {
	endDate := time.Now().AddDate(0, 1, 0)

	assignment := &model.ProjectAssignment{
		ID:              uuid.New(),
		UserID:          userID,
		ProjectID:       projectID,
		Role:            "エンジニア",
		StartDate:       time.Now().AddDate(0, -1, 0),
		EndDate:         &endDate,
		UtilizationRate: 100,
		BillingRate:     billingRate,
		Notes:           "テスト用アサインメント",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err := h.DB.Create(assignment).Error
	require.NoError(h.T, err)

	return assignment
}

// CreateTestInvoice テスト用請求書を作成
func (h *E2ETestHelper) CreateTestInvoice(clientID uuid.UUID, amount float64, status string) *model.Invoice {
	now := time.Now()
	invoiceNumber := fmt.Sprintf("TEST-%d-%02d-%04d", now.Year(), now.Month(), now.Unix()%10000)
	billingMonth := fmt.Sprintf("%04d-%02d", now.Year(), now.Month())
	taxAmount := amount * 0.1 // 10%税率

	invoice := &model.Invoice{
		ID:             uuid.New(),
		ClientID:       clientID,
		InvoiceNumber:  invoiceNumber,
		InvoiceDate:    now,
		DueDate:        now.AddDate(0, 1, 0),
		BillingMonth:   billingMonth,
		Subtotal:       amount,
		TaxRate:        10.0,
		TaxAmount:      taxAmount,
		TotalAmount:    amount + taxAmount,
		Status:         model.InvoiceStatus(status),
		PaymentMethod:  "bank_transfer",
		Notes:          "テスト用請求書",
		CreatedBy:      uuid.New(), // テスト用ユーザーID
		FreeSyncStatus: model.FreeSyncStatusNotSynced,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	err := h.DB.Create(invoice).Error
	require.NoError(h.T, err)

	return invoice
}

// CreateTestProjectGroup テスト用プロジェクトグループを作成
func (h *E2ETestHelper) CreateTestProjectGroup(name string, clientID uuid.UUID, projectIDs []uuid.UUID) *model.ProjectGroup {
	group := &model.ProjectGroup{
		ID:          uuid.New(),
		GroupName:   name,
		ClientID:    clientID,
		Description: "テスト用プロジェクトグループ",
		CreatedBy:   uuid.New(), // テスト用ユーザーID
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := h.DB.Create(group).Error
	require.NoError(h.T, err)

	// プロジェクトマッピングを作成
	for _, projectID := range projectIDs {
		mapping := &model.ProjectGroupMapping{
			ID:             uuid.New(),
			ProjectGroupID: group.ID,
			ProjectID:      projectID,
			CreatedAt:      time.Now(),
		}
		err = h.DB.Create(mapping).Error
		require.NoError(h.T, err)
	}

	return group
}

// CreateTestFreeSyncLog テスト用freee同期ログを作成
func (h *E2ETestHelper) CreateTestFreeSyncLog(syncType, status string) *model.FreeSyncLog {
	var errorMessage *string
	if status == "failed" {
		msg := "テスト同期エラー"
		errorMessage = &msg
	}

	requestData := model.FreeSyncRequestData{"test": "request_data"}
	responseData := model.FreeSyncResponseData{"test": "response_data"}

	log := &model.FreeSyncLog{
		ID:           uuid.New(),
		SyncType:     model.FreeSyncType(syncType),
		Status:       model.FreeSyncStatus(status),
		ErrorMessage: errorMessage,
		RequestData:  &requestData,
		ResponseData: &responseData,
		CreatedAt:    time.Now(),
	}

	err := h.DB.Create(log).Error
	require.NoError(h.T, err)

	return log
}

// CreateTestScheduledJob テスト用スケジュールジョブを作成
func (h *E2ETestHelper) CreateTestScheduledJob(jobType string, nextRunAt time.Time) *model.ScheduledJob {
	parameters := model.JobParameters{"test": "params"}

	job := &model.ScheduledJob{
		ID:             uuid.New(),
		JobName:        "テスト" + jobType + "ジョブ",
		JobType:        model.ScheduledJobType(jobType),
		Description:    "テスト用スケジュールジョブ",
		CronExpression: "0 0 1 * *", // 毎月1日実行
		Status:         model.ScheduledJobStatusInactive,
		NextRunAt:      &nextRunAt,
		Parameters:     &parameters,
		CreatedBy:      uuid.New(), // テスト用ユーザーID
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	err := h.DB.Create(job).Error
	require.NoError(h.T, err)

	return job
}

// SetupCompleteTestScenario 完全なテストシナリオ用のデータセットアップ
func (h *E2ETestHelper) SetupCompleteTestScenario() *TestScenarioData {
	// ユーザー作成
	adminUser := h.CreateTestUser(int(model.RoleAdmin), "admin@test.com")
	accountingManager := h.CreateTestUser(int(model.RoleManager), "accounting.manager@test.com")
	accountingStaff := h.CreateTestUser(int(model.RoleEmployee), "accounting.staff@test.com")
	engineer := h.CreateTestUser(int(model.RoleEmployee), "engineer@test.com")

	// クライアント作成
	client1 := h.CreateTestClient("テストクライアント1")
	client2 := h.CreateTestClient("テストクライアント2")

	// プロジェクト作成
	project1 := h.CreateTestProject(client1.ID, "テストプロジェクト1")
	project2 := h.CreateTestProject(client2.ID, "テストプロジェクト2")

	// プロジェクトアサインメント作成
	assignment1 := h.CreateTestProjectAssignment(engineer.ID, project1.ID, 500000)
	assignment2 := h.CreateTestProjectAssignment(engineer.ID, project2.ID, 600000)

	// 請求書作成
	invoice1 := h.CreateTestInvoice(client1.ID, 500000.0, "draft")
	invoice2 := h.CreateTestInvoice(client2.ID, 600000.0, "sent")

	// プロジェクトグループ作成
	group1 := h.CreateTestProjectGroup(
		"テストグループ1",
		client1.ID,
		[]uuid.UUID{project1.ID},
	)
	group2 := h.CreateTestProjectGroup(
		"テストグループ2",
		client2.ID,
		[]uuid.UUID{project2.ID},
	)

	// 同期ログ作成
	syncLog1 := h.CreateTestFreeSyncLog("client_sync", "success")
	syncLog2 := h.CreateTestFreeSyncLog("invoice_create", "success")

	// スケジュールジョブ作成
	job1 := h.CreateTestScheduledJob("billing", time.Now().Add(24*time.Hour))
	job2 := h.CreateTestScheduledJob("sync", time.Now().Add(48*time.Hour))

	return &TestScenarioData{
		Users: TestUsers{
			Admin:             adminUser,
			AccountingManager: accountingManager,
			AccountingStaff:   accountingStaff,
			Engineer:          engineer,
		},
		Clients: TestClients{
			Client1: client1,
			Client2: client2,
		},
		Projects: TestProjects{
			Project1: project1,
			Project2: project2,
		},
		Assignments: TestAssignments{
			Assignment1: assignment1,
			Assignment2: assignment2,
		},
		Invoices: TestInvoices{
			Invoice1: invoice1,
			Invoice2: invoice2,
		},
		ProjectGroups: TestProjectGroups{
			Group1: group1,
			Group2: group2,
		},
		SyncLogs: TestSyncLogs{
			SyncLog1: syncLog1,
			SyncLog2: syncLog2,
		},
		Jobs: TestJobs{
			Job1: job1,
			Job2: job2,
		},
	}
}

// CleanupTestData テストデータのクリーンアップ
func (h *E2ETestHelper) CleanupTestData() {
	// 外部キー制約のある順番でクリーンアップ
	h.DB.Exec("DELETE FROM scheduled_jobs WHERE job_type IN ('billing', 'freee_sync')")
	h.DB.Exec("DELETE FROM freee_sync_logs WHERE sync_type IN ('client_sync', 'invoice_create')")
	h.DB.Exec("DELETE FROM project_group_mappings WHERE project_group_id IN (SELECT id FROM project_groups WHERE group_name LIKE 'テスト%')")
	h.DB.Exec("DELETE FROM project_groups WHERE group_name LIKE 'テスト%'")
	h.DB.Exec("DELETE FROM invoices WHERE client_id IN (SELECT id FROM clients WHERE company_name LIKE 'テスト%')")
	h.DB.Exec("DELETE FROM project_assignments WHERE project_id IN (SELECT id FROM projects WHERE project_name LIKE 'テスト%')")
	h.DB.Exec("DELETE FROM projects WHERE project_name LIKE 'テスト%'")
	h.DB.Exec("DELETE FROM clients WHERE company_name LIKE 'テスト%'")
	h.DB.Exec("DELETE FROM users WHERE email LIKE '%@test.com'")
}

// TestScenarioData テストシナリオで使用するデータ構造体
type TestScenarioData struct {
	Users         TestUsers
	Clients       TestClients
	Projects      TestProjects
	Assignments   TestAssignments
	Invoices      TestInvoices
	ProjectGroups TestProjectGroups
	SyncLogs      TestSyncLogs
	Jobs          TestJobs
}

type TestUsers struct {
	Admin             *model.User
	AccountingManager *model.User
	AccountingStaff   *model.User
	Engineer          *model.User
}

type TestClients struct {
	Client1 *model.Client
	Client2 *model.Client
}

type TestProjects struct {
	Project1 *model.Project
	Project2 *model.Project
}

type TestAssignments struct {
	Assignment1 *model.ProjectAssignment
	Assignment2 *model.ProjectAssignment
}

type TestInvoices struct {
	Invoice1 *model.Invoice
	Invoice2 *model.Invoice
}

type TestProjectGroups struct {
	Group1 *model.ProjectGroup
	Group2 *model.ProjectGroup
}

type TestSyncLogs struct {
	SyncLog1 *model.FreeSyncLog
	SyncLog2 *model.FreeSyncLog
}

type TestJobs struct {
	Job1 *model.ScheduledJob
	Job2 *model.ScheduledJob
}

// AssertDataIntegrity データ整合性をアサートするヘルパー
func (h *E2ETestHelper) AssertDataIntegrity(t *testing.T, data *TestScenarioData) {
	ctx := context.Background()

	// ユーザーデータの整合性確認
	var userCount int64
	err := h.DB.WithContext(ctx).Model(&model.User{}).
		Where("email LIKE ?", "%@test.com").
		Count(&userCount).Error
	require.NoError(t, err)
	require.Equal(t, int64(4), userCount, "テストユーザー数が正しくありません")

	// クライアントデータの整合性確認
	var clientCount int64
	err = h.DB.WithContext(ctx).Model(&model.Client{}).
		Where("company_name LIKE ?", "テスト%").
		Count(&clientCount).Error
	require.NoError(t, err)
	require.Equal(t, int64(2), clientCount, "テストクライアント数が正しくありません")

	// プロジェクトデータの整合性確認
	var projectCount int64
	err = h.DB.WithContext(ctx).Model(&model.Project{}).
		Where("project_name LIKE ?", "テスト%").
		Count(&projectCount).Error
	require.NoError(t, err)
	require.Equal(t, int64(2), projectCount, "テストプロジェクト数が正しくありません")

	// プロジェクトアサインメントの整合性確認
	var assignmentCount int64
	err = h.DB.WithContext(ctx).Model(&model.ProjectAssignment{}).
		Where("project_id IN (?)",
			h.DB.Model(&model.Project{}).Select("id").Where("project_name LIKE ?", "テスト%")).
		Count(&assignmentCount).Error
	require.NoError(t, err)
	require.Equal(t, int64(2), assignmentCount, "テストプロジェクトアサインメント数が正しくありません")

	// 請求書データの整合性確認
	var invoiceCount int64
	err = h.DB.WithContext(ctx).Model(&model.Invoice{}).
		Where("client_id IN (?)",
			h.DB.Model(&model.Client{}).Select("id").Where("company_name LIKE ?", "テスト%")).
		Count(&invoiceCount).Error
	require.NoError(t, err)
	require.Equal(t, int64(2), invoiceCount, "テスト請求書数が正しくありません")

	// プロジェクトグループの整合性確認
	var groupCount int64
	err = h.DB.WithContext(ctx).Model(&model.ProjectGroup{}).
		Where("group_name LIKE ?", "テスト%").
		Count(&groupCount).Error
	require.NoError(t, err)
	require.Equal(t, int64(2), groupCount, "テストプロジェクトグループ数が正しくありません")

	// 同期ログの整合性確認
	var syncLogCount int64
	err = h.DB.WithContext(ctx).Model(&model.FreeSyncLog{}).
		Where("sync_type IN (?, ?)", "client_sync", "invoice_create").
		Count(&syncLogCount).Error
	require.NoError(t, err)
	require.Equal(t, int64(2), syncLogCount, "テスト同期ログ数が正しくありません")

	// スケジュールジョブの整合性確認
	var jobCount int64
	err = h.DB.WithContext(ctx).Model(&model.ScheduledJob{}).
		Where("job_type IN (?, ?)", "billing", "sync").
		Count(&jobCount).Error
	require.NoError(t, err)
	require.Equal(t, int64(2), jobCount, "テストスケジュールジョブ数が正しくありません")

	t.Log("全てのデータ整合性チェックが正常に完了しました")
}
