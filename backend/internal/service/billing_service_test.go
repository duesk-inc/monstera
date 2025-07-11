package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"gorm.io/gorm"

	commonRepo "github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
)

// ========== モック実装 ==========

// MockClientRepository クライアントリポジトリのモック
type MockClientRepository struct {
	mock.Mock
}

func (m *MockClientRepository) Create(ctx context.Context, entity *model.Client) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockClientRepository) Update(ctx context.Context, entity *model.Client) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockClientRepository) Delete(ctx context.Context, entity *model.Client) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockClientRepository) FindByID(ctx context.Context, id interface{}) (*model.Client, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Client), args.Error(1)
}

func (m *MockClientRepository) FindAll(ctx context.Context, opts ...commonRepo.QueryOptions) ([]*model.Client, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Client), args.Error(1)
}

func (m *MockClientRepository) Count(ctx context.Context, opts ...commonRepo.QueryOptions) (int64, error) {
	args := m.Called(ctx, opts)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockClientRepository) Exists(ctx context.Context, id interface{}) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockClientRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	args := m.Called(ctx, fn)
	return args.Error(0)
}

func (m *MockClientRepository) FindByCompanyName(ctx context.Context, name string) (*model.Client, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Client), args.Error(1)
}

func (m *MockClientRepository) SearchByName(ctx context.Context, keyword string, limit, offset int) ([]*model.Client, error) {
	args := m.Called(ctx, keyword, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Client), args.Error(1)
}

func (m *MockClientRepository) GetActiveClients(ctx context.Context) ([]*model.Client, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Client), args.Error(1)
}

// MockProjectRepository プロジェクトリポジトリのモック
type MockProjectRepository struct {
	mock.Mock
}

func (m *MockProjectRepository) Create(ctx context.Context, entity *model.Project) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockProjectRepository) Update(ctx context.Context, entity *model.Project) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockProjectRepository) Delete(ctx context.Context, entity *model.Project) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockProjectRepository) FindByID(ctx context.Context, id interface{}) (*model.Project, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Project), args.Error(1)
}

func (m *MockProjectRepository) FindAll(ctx context.Context, opts ...commonRepo.QueryOptions) ([]*model.Project, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Project), args.Error(1)
}

func (m *MockProjectRepository) Count(ctx context.Context, opts ...commonRepo.QueryOptions) (int64, error) {
	args := m.Called(ctx, opts)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockProjectRepository) Exists(ctx context.Context, id interface{}) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockProjectRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	args := m.Called(ctx, fn)
	return args.Error(0)
}

func (m *MockProjectRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Project, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Project), args.Error(1)
}

func (m *MockProjectRepository) List(ctx context.Context, clientID *uuid.UUID, limit, offset int) ([]*model.Project, error) {
	args := m.Called(ctx, clientID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Project), args.Error(1)
}

func (m *MockProjectRepository) FindByClientID(ctx context.Context, clientID uuid.UUID) ([]*model.Project, error) {
	args := m.Called(ctx, clientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Project), args.Error(1)
}

func (m *MockProjectRepository) FindByStatus(ctx context.Context, status model.ProjectStatus) ([]*model.Project, error) {
	args := m.Called(ctx, status)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Project), args.Error(1)
}

func (m *MockProjectRepository) GetActiveProjectCount(ctx context.Context, clientID *uuid.UUID) (int64, error) {
	args := m.Called(ctx, clientID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockProjectRepository) FindActiveProjects(ctx context.Context) ([]*model.Project, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Project), args.Error(1)
}

// MockInvoiceRepository 請求書リポジトリのモック
type MockInvoiceRepository struct {
	mock.Mock
}

func (m *MockInvoiceRepository) Create(ctx context.Context, entity *model.Invoice) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockInvoiceRepository) Update(ctx context.Context, entity *model.Invoice) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockInvoiceRepository) Delete(ctx context.Context, entity *model.Invoice) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockInvoiceRepository) FindByID(ctx context.Context, id interface{}) (*model.Invoice, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) FindAll(ctx context.Context, opts ...commonRepo.QueryOptions) ([]*model.Invoice, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) Count(ctx context.Context, opts ...commonRepo.QueryOptions) (int64, error) {
	args := m.Called(ctx, opts)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockInvoiceRepository) Exists(ctx context.Context, id interface{}) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockInvoiceRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	args := m.Called(ctx, fn)
	return args.Error(0)
}

func (m *MockInvoiceRepository) FindByInvoiceNumber(ctx context.Context, invoiceNumber string) (*model.Invoice, error) {
	args := m.Called(ctx, invoiceNumber)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) FindByClientID(ctx context.Context, clientID uuid.UUID) ([]*model.Invoice, error) {
	args := m.Called(ctx, clientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) FindByStatus(ctx context.Context, status model.InvoiceStatus) ([]*model.Invoice, error) {
	args := m.Called(ctx, status)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) FindOverdue(ctx context.Context) ([]*model.Invoice, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) GetSummary(ctx context.Context, clientID *uuid.UUID, dateFrom, dateTo *time.Time) (*repository.InvoiceSummary, error) {
	args := m.Called(ctx, clientID, dateFrom, dateTo)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.InvoiceSummary), args.Error(1)
}

func (m *MockInvoiceRepository) CreateWithDetails(ctx context.Context, invoice *model.Invoice, details []*model.InvoiceDetail) error {
	args := m.Called(ctx, invoice, details)
	return args.Error(0)
}

func (m *MockInvoiceRepository) FindByBillingMonth(ctx context.Context, billingMonth string, clientID *uuid.UUID) ([]*model.Invoice, error) {
	args := m.Called(ctx, billingMonth, clientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) FindByProjectGroupID(ctx context.Context, projectGroupID uuid.UUID) ([]*model.Invoice, error) {
	args := m.Called(ctx, projectGroupID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) FindByFreeSyncStatus(ctx context.Context, status model.FreeSyncStatus) ([]*model.Invoice, error) {
	args := m.Called(ctx, status)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) FindNeedingSync(ctx context.Context, limit int) ([]*model.Invoice, error) {
	args := m.Called(ctx, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

func (m *MockInvoiceRepository) UpdateFreeSyncStatus(ctx context.Context, id uuid.UUID, status model.FreeSyncStatus, freeeInvoiceID *int) error {
	args := m.Called(ctx, id, status, freeeInvoiceID)
	return args.Error(0)
}

func (m *MockInvoiceRepository) GetMonthlyRevenue(ctx context.Context, year, month int, clientID *uuid.UUID) (float64, error) {
	args := m.Called(ctx, year, month, clientID)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockInvoiceRepository) GetBillingStats(ctx context.Context, startDate, endDate time.Time) (*repository.BillingStats, error) {
	args := m.Called(ctx, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.BillingStats), args.Error(1)
}

func (m *MockInvoiceRepository) CreateBatch(ctx context.Context, invoices []*model.Invoice) error {
	args := m.Called(ctx, invoices)
	return args.Error(0)
}

// MockProjectGroupRepository プロジェクトグループリポジトリのモック
type MockProjectGroupRepository struct {
	mock.Mock
}

func (m *MockProjectGroupRepository) Create(ctx context.Context, group *model.ProjectGroup) error {
	args := m.Called(ctx, group)
	return args.Error(0)
}

func (m *MockProjectGroupRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ProjectGroup, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ProjectGroup), args.Error(1)
}

func (m *MockProjectGroupRepository) GetByIDWithDetails(ctx context.Context, id uuid.UUID) (*model.ProjectGroup, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ProjectGroup), args.Error(1)
}

func (m *MockProjectGroupRepository) Update(ctx context.Context, group *model.ProjectGroup) error {
	args := m.Called(ctx, group)
	return args.Error(0)
}

func (m *MockProjectGroupRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockProjectGroupRepository) ExistsByID(ctx context.Context, id uuid.UUID) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockProjectGroupRepository) ExistsByName(ctx context.Context, name string, clientID uuid.UUID, excludeID *uuid.UUID) (bool, error) {
	args := m.Called(ctx, name, clientID, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockProjectGroupRepository) ListWithStats(ctx context.Context, clientID *uuid.UUID, limit, offset int) ([]*model.ProjectGroupWithProjects, error) {
	args := m.Called(ctx, clientID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectGroupWithProjects), args.Error(1)
}

func (m *MockProjectGroupRepository) Count(ctx context.Context, clientID *uuid.UUID) (int64, error) {
	args := m.Called(ctx, clientID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockProjectGroupRepository) AddProjects(ctx context.Context, groupID uuid.UUID, projectIDs []uuid.UUID) error {
	args := m.Called(ctx, groupID, projectIDs)
	return args.Error(0)
}

func (m *MockProjectGroupRepository) RemoveProjects(ctx context.Context, groupID uuid.UUID, projectIDs []uuid.UUID) error {
	args := m.Called(ctx, groupID, projectIDs)
	return args.Error(0)
}

func (m *MockProjectGroupRepository) GetProjectsByGroupID(ctx context.Context, groupID uuid.UUID) ([]*model.Project, error) {
	args := m.Called(ctx, groupID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Project), args.Error(1)
}

func (m *MockProjectGroupRepository) GetGroupsByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.ProjectGroup, error) {
	args := m.Called(ctx, projectID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectGroup), args.Error(1)
}

func (m *MockProjectGroupRepository) GetStats(ctx context.Context, clientID *uuid.UUID) (*model.ProjectGroupStats, error) {
	args := m.Called(ctx, clientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ProjectGroupStats), args.Error(1)
}

func (m *MockProjectGroupRepository) GetGroupRevenue(ctx context.Context, groupID uuid.UUID, startMonth, endMonth string) (float64, error) {
	args := m.Called(ctx, groupID, startMonth, endMonth)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockProjectGroupRepository) CanAddProjects(ctx context.Context, groupID uuid.UUID, projectIDs []uuid.UUID) error {
	args := m.Called(ctx, groupID, projectIDs)
	return args.Error(0)
}

func (m *MockProjectGroupRepository) List(ctx context.Context, clientID *uuid.UUID, limit, offset int) ([]*model.ProjectGroup, error) {
	args := m.Called(ctx, clientID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectGroup), args.Error(1)
}

func (m *MockProjectGroupRepository) Search(ctx context.Context, query string, clientID *uuid.UUID, limit, offset int) ([]*model.ProjectGroup, error) {
	args := m.Called(ctx, query, clientID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectGroup), args.Error(1)
}

// MockTransactionManager トランザクションマネージャーのモック
type MockTransactionManager struct {
	mock.Mock
}

func (m *MockTransactionManager) ExecuteInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	args := m.Called(ctx, fn)
	return args.Error(0)
}

func (m *MockTransactionManager) GetDB() *gorm.DB {
	args := m.Called()
	return args.Get(0).(*gorm.DB)
}

// MockProjectAssignmentRepository プロジェクトアサインメントリポジトリのモック
type MockProjectAssignmentRepository struct {
	mock.Mock
}

func (m *MockProjectAssignmentRepository) Create(ctx context.Context, entity *model.ProjectAssignment) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockProjectAssignmentRepository) Update(ctx context.Context, entity *model.ProjectAssignment) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockProjectAssignmentRepository) Delete(ctx context.Context, entity *model.ProjectAssignment) error {
	args := m.Called(ctx, entity)
	return args.Error(0)
}

func (m *MockProjectAssignmentRepository) FindByID(ctx context.Context, id interface{}) (*model.ProjectAssignment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ProjectAssignment), args.Error(1)
}

func (m *MockProjectAssignmentRepository) FindAll(ctx context.Context, opts ...commonRepo.QueryOptions) ([]*model.ProjectAssignment, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectAssignment), args.Error(1)
}

func (m *MockProjectAssignmentRepository) Count(ctx context.Context, opts ...commonRepo.QueryOptions) (int64, error) {
	args := m.Called(ctx, opts)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockProjectAssignmentRepository) Exists(ctx context.Context, id interface{}) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockProjectAssignmentRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	args := m.Called(ctx, fn)
	return args.Error(0)
}

func (m *MockProjectAssignmentRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ProjectAssignment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ProjectAssignment), args.Error(1)
}

func (m *MockProjectAssignmentRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*model.ProjectAssignment, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectAssignment), args.Error(1)
}

func (m *MockProjectAssignmentRepository) FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.ProjectAssignment, error) {
	args := m.Called(ctx, projectID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectAssignment), args.Error(1)
}

func (m *MockProjectAssignmentRepository) FindActiveByUserID(ctx context.Context, userID uuid.UUID, date time.Time) ([]*model.ProjectAssignment, error) {
	args := m.Called(ctx, userID, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectAssignment), args.Error(1)
}

func (m *MockProjectAssignmentRepository) FindActiveByProjectID(ctx context.Context, projectID uuid.UUID, date time.Time) ([]*model.ProjectAssignment, error) {
	args := m.Called(ctx, projectID, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectAssignment), args.Error(1)
}

func (m *MockProjectAssignmentRepository) CheckOverlap(ctx context.Context, userID, projectID uuid.UUID, startDate, endDate time.Time, excludeID *uuid.UUID) (bool, error) {
	args := m.Called(ctx, userID, projectID, startDate, endDate, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockProjectAssignmentRepository) UpdateEndDate(ctx context.Context, id uuid.UUID, endDate *time.Time) error {
	args := m.Called(ctx, id, endDate)
	return args.Error(0)
}

func (m *MockProjectAssignmentRepository) FindBetweenDates(ctx context.Context, startDate, endDate time.Time) ([]*model.ProjectAssignment, error) {
	args := m.Called(ctx, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectAssignment), args.Error(1)
}

func (m *MockProjectAssignmentRepository) GetUserMonthlyAssignments(ctx context.Context, userID uuid.UUID, year, month int) ([]*model.ProjectAssignment, error) {
	args := m.Called(ctx, userID, year, month)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectAssignment), args.Error(1)
}

// AssignmentSummary 仮の定義
type AssignmentSummary struct {
	TotalAssignments  int
	ActiveAssignments int
}

func (m *MockProjectAssignmentRepository) GetAssignmentSummary(ctx context.Context, userID *uuid.UUID, projectID *uuid.UUID) (*AssignmentSummary, error) {
	args := m.Called(ctx, userID, projectID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*AssignmentSummary), args.Error(1)
}

// ========== テストケース ==========

func TestBillingService_PreviewBilling(t *testing.T) {
	// Setup
	ctx := context.Background()
	clientRepo := &MockClientRepository{}
	projectRepo := &MockProjectRepository{}
	assignmentRepo := &MockProjectAssignmentRepository{}
	invoiceRepo := &MockInvoiceRepository{}
	groupRepo := &MockProjectGroupRepository{}
	txManager := &MockTransactionManager{}
	logger := zap.NewNop()

	service := NewBillingService(
		&gorm.DB{},
		logger,
		clientRepo,
		projectRepo,
		assignmentRepo,
		invoiceRepo,
		groupRepo,
		txManager,
	)

	// Test data
	clientID := uuid.New()
	client := &model.Client{
		ID:          clientID,
		CompanyName: "テスト会社",
	}

	req := &dto.BillingPreviewRequest{
		BillingYear:  2024,
		BillingMonth: 1,
		ClientIDs:    []uuid.UUID{clientID},
	}

	// Mock setup
	clientRepo.On("FindByID", ctx, clientID).Return(client, nil)
	invoiceRepo.On("FindByBillingMonth", ctx, "2024-01", &clientID).Return([]*model.Invoice{}, nil)
	groupRepo.On("List", ctx, &clientID, 100, 0).Return([]*model.ProjectGroup{}, nil)
	projectRepo.On("FindByClientID", ctx, clientID).Return([]*model.Project{}, nil)

	// Execute
	result, err := service.PreviewBilling(ctx, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2024, result.BillingYear)
	assert.Equal(t, 1, result.BillingMonth)
	assert.Equal(t, 1, len(result.Clients))
	assert.Equal(t, clientID, result.Clients[0].ClientID)
	assert.Equal(t, "テスト会社", result.Clients[0].ClientName)
}

func TestBillingService_CalculateBillingAmount_Fixed(t *testing.T) {
	service := &billingService{logger: zap.NewNop()}

	// Test fixed billing
	amount, err := service.CalculateBillingAmount(
		model.ProjectBillingTypeFixed,
		500000,
		nil,
		nil,
		nil,
	)

	assert.NoError(t, err)
	assert.Equal(t, float64(500000), amount)
}

func TestBillingService_CalculateBillingAmount_UpperLower(t *testing.T) {
	service := &billingService{logger: zap.NewNop()}

	// Test data
	monthlyRate := float64(500000)
	lowerLimit := float64(140)
	upperLimit := float64(180)

	testCases := []struct {
		name           string
		actualHours    float64
		expectedAmount float64
	}{
		{
			name:           "範囲内",
			actualHours:    160,
			expectedAmount: 500000,
		},
		{
			name:           "下限を下回る",
			actualHours:    120,
			expectedAmount: 428571.43, // (500000 / 140) * 120 = 428571.4285714286
		},
		{
			name:           "上限を上回る",
			actualHours:    200,
			expectedAmount: 555555.56, // (500000 / 180) * 200 = 555555.5555555556
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			amount, err := service.CalculateBillingAmount(
				model.ProjectBillingTypeVariableUpperLower,
				monthlyRate,
				&tc.actualHours,
				&lowerLimit,
				&upperLimit,
			)

			assert.NoError(t, err)
			assert.InDelta(t, tc.expectedAmount, amount, 1.0)
		})
	}
}

func TestBillingService_CalculateBillingAmount_Middle(t *testing.T) {
	service := &billingService{logger: zap.NewNop()}

	// Test data
	monthlyRate := float64(500000)
	lowerLimit := float64(140)
	upperLimit := float64(180)
	actualHours := float64(160)

	// Middle hours = (140 + 180) / 2 = 160
	// Hourly rate = 500000 / 160 = 3125
	// Amount = 3125 * 160 = 500000

	amount, err := service.CalculateBillingAmount(
		model.ProjectBillingTypeVariableMiddle,
		monthlyRate,
		&actualHours,
		&lowerLimit,
		&upperLimit,
	)

	assert.NoError(t, err)
	assert.Equal(t, float64(500000), amount)
}

func TestBillingService_ValidateBillingPeriod(t *testing.T) {
	service := &billingService{logger: zap.NewNop()}

	testCases := []struct {
		name    string
		year    int
		month   int
		wantErr bool
	}{
		{
			name:    "有効な期間",
			year:    2024,
			month:   1,
			wantErr: false,
		},
		{
			name:    "無効な月（0）",
			year:    2024,
			month:   0,
			wantErr: true,
		},
		{
			name:    "無効な月（13）",
			year:    2024,
			month:   13,
			wantErr: true,
		},
		{
			name:    "無効な年（1999）",
			year:    1999,
			month:   1,
			wantErr: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := service.ValidateBillingPeriod(tc.year, tc.month)
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestBillingService_CheckDuplicateBilling(t *testing.T) {
	// Setup
	ctx := context.Background()
	invoiceRepo := &MockInvoiceRepository{}
	logger := zap.NewNop()

	service := &billingService{
		logger:      logger,
		invoiceRepo: invoiceRepo,
	}

	// Test data
	clientID := uuid.New()
	billingMonth := "2024-01"

	// Test case 1: No duplicate
	invoiceRepo.On("FindByBillingMonth", ctx, billingMonth, &clientID).Return([]*model.Invoice{}, nil).Once()
	isDuplicate, err := service.CheckDuplicateBilling(ctx, clientID, billingMonth)
	assert.NoError(t, err)
	assert.False(t, isDuplicate)

	// Test case 2: Has duplicate
	existingInvoices := []*model.Invoice{{ID: uuid.New()}}
	invoiceRepo.On("FindByBillingMonth", ctx, billingMonth, &clientID).Return(existingInvoices, nil).Once()
	isDuplicate, err = service.CheckDuplicateBilling(ctx, clientID, billingMonth)
	assert.NoError(t, err)
	assert.True(t, isDuplicate)
}
