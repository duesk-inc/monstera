package service

import (
	"context"
	"fmt"
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

// ========== シンプルなモック実装 ==========

// MockProjectGroupRepositorySimple モックプロジェクトグループリポジトリ（シンプル版）
type MockProjectGroupRepositorySimple struct {
	mock.Mock
}

func (m *MockProjectGroupRepositorySimple) Create(ctx context.Context, group *model.ProjectGroup) error {
	args := m.Called(ctx, group)
	return args.Error(0)
}

func (m *MockProjectGroupRepositorySimple) GetByID(ctx context.Context, id string) (*model.ProjectGroup, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ProjectGroup), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) GetByIDWithDetails(ctx context.Context, id string) (*model.ProjectGroup, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ProjectGroup), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) Update(ctx context.Context, group *model.ProjectGroup) error {
	args := m.Called(ctx, group)
	return args.Error(0)
}

func (m *MockProjectGroupRepositorySimple) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockProjectGroupRepositorySimple) ExistsByID(ctx context.Context, id string) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) ExistsByName(ctx context.Context, name string, clientID string, excludeID *string) (bool, error) {
	args := m.Called(ctx, name, clientID, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) ListWithStats(ctx context.Context, clientID *string, limit, offset int) ([]*model.ProjectGroupWithProjects, error) {
	args := m.Called(ctx, clientID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectGroupWithProjects), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) Count(ctx context.Context, clientID *string) (int64, error) {
	args := m.Called(ctx, clientID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) AddProjects(ctx context.Context, groupID string, projectIDs []string) error {
	args := m.Called(ctx, groupID, projectIDs)
	return args.Error(0)
}

func (m *MockProjectGroupRepositorySimple) RemoveProjects(ctx context.Context, groupID string, projectIDs []string) error {
	args := m.Called(ctx, groupID, projectIDs)
	return args.Error(0)
}

func (m *MockProjectGroupRepositorySimple) GetProjectsByGroupID(ctx context.Context, groupID string) ([]*model.Project, error) {
	args := m.Called(ctx, groupID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Project), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) GetGroupsByProjectID(ctx context.Context, projectID string) ([]*model.ProjectGroup, error) {
	args := m.Called(ctx, projectID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ProjectGroup), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) GetStats(ctx context.Context, clientID *string) (*model.ProjectGroupStats, error) {
	args := m.Called(ctx, clientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ProjectGroupStats), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) GetGroupRevenue(ctx context.Context, groupID string, startMonth, endMonth string) (float64, error) {
	args := m.Called(ctx, groupID, startMonth, endMonth)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockProjectGroupRepositorySimple) CanAddProjects(ctx context.Context, groupID string, projectIDs []string) error {
	args := m.Called(ctx, groupID, projectIDs)
	return args.Error(0)
}

// 未実装メソッド（インターフェース要件を満たすため）
func (m *MockProjectGroupRepositorySimple) List(ctx context.Context, clientID *string, limit, offset int) ([]*model.ProjectGroup, error) {
	return nil, nil
}

func (m *MockProjectGroupRepositorySimple) Search(ctx context.Context, query string, clientID *string, limit, offset int) ([]*model.ProjectGroup, error) {
	return nil, nil
}

// ========== 主要機能のテスト ==========

func TestProjectGroupService_GetByID_Success(t *testing.T) {
	// モックリポジトリの作成
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	// サービスは直接構築（簡略化）
	service := &projectGroupService{
		db:        &gorm.DB{},
		logger:    logger,
		groupRepo: groupRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()
	clientID := uuid.New().String()

	expectedGroup := &model.ProjectGroup{
		ID:          groupID,
		GroupName:   "テストグループ",
		ClientID:    clientID,
		Description: "テスト用グループ",
		Client: model.Client{
			ID:          clientID,
			CompanyName: "テスト会社",
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	groupRepo.On("GetByIDWithDetails", ctx, groupID).Return(expectedGroup, nil)

	result, err := service.GetProjectGroup(ctx, groupID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, groupID, result.ID)
	assert.Equal(t, "テストグループ", result.GroupName)
	assert.Equal(t, "テスト会社", result.ClientName)
}

func TestProjectGroupService_GetByID_NotFound(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	service := &projectGroupService{
		db:        &gorm.DB{},
		logger:    logger,
		groupRepo: groupRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()

	groupRepo.On("GetByIDWithDetails", ctx, groupID).Return((*model.ProjectGroup)(nil), nil)

	result, err := service.GetProjectGroup(ctx, groupID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "プロジェクトグループが見つかりません")
	assert.Nil(t, result)
}

func TestProjectGroupService_UpdateProjectGroup_Success(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	service := &projectGroupService{
		db:        &gorm.DB{},
		logger:    logger,
		groupRepo: groupRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()
	clientID := uuid.New().String()
	newName := "更新後のグループ名"
	newDescription := "更新後の説明"

	existingGroup := &model.ProjectGroup{
		ID:          groupID,
		GroupName:   "元のグループ名",
		ClientID:    clientID,
		Description: "元の説明",
	}

	req := &dto.UpdateProjectGroupRequest{
		GroupName:   &newName,
		Description: &newDescription,
	}

	groupRepo.On("GetByID", ctx, groupID).Return(existingGroup, nil)
	groupRepo.On("ExistsByName", ctx, newName, clientID, &groupID).Return(false, nil)
	groupRepo.On("Update", ctx, mock.AnythingOfType("*model.ProjectGroup")).Return(nil)

	result, err := service.UpdateProjectGroup(ctx, groupID, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, groupID, result.ID)
	assert.Equal(t, newName, result.GroupName)
	assert.Equal(t, newDescription, result.Description)
}

func TestProjectGroupService_DeleteProjectGroup_Success(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	// invoiceRepoのモック
	invoiceRepo := &MockInvoiceRepositoryForTest{}

	service := &projectGroupService{
		db:          &gorm.DB{},
		logger:      logger,
		groupRepo:   groupRepo,
		invoiceRepo: invoiceRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()

	groupRepo.On("ExistsByID", ctx, groupID).Return(true, nil)
	invoiceRepo.On("FindByProjectGroupID", ctx, groupID).Return([]*model.Invoice{}, nil)
	groupRepo.On("Delete", ctx, groupID).Return(nil)

	err := service.DeleteProjectGroup(ctx, groupID)

	assert.NoError(t, err)
}

func TestProjectGroupService_DeleteProjectGroup_HasInvoices(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()
	invoiceRepo := &MockInvoiceRepositoryForTest{}

	service := &projectGroupService{
		db:          &gorm.DB{},
		logger:      logger,
		groupRepo:   groupRepo,
		invoiceRepo: invoiceRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()

	invoices := []*model.Invoice{
		{ID: uuid.New().String()},
		{ID: uuid.New().String()},
	}

	groupRepo.On("ExistsByID", ctx, groupID).Return(true, nil)
	invoiceRepo.On("FindByProjectGroupID", ctx, groupID).Return(invoices, nil)

	err := service.DeleteProjectGroup(ctx, groupID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "2件の請求書が関連付けられているため削除できません")
}

func TestProjectGroupService_AddProjectsToGroup_Success(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	service := &projectGroupService{
		db:        &gorm.DB{},
		logger:    logger,
		groupRepo: groupRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()
	projectIDs := []string{uuid.New().String(), uuid.New().String()}

	groupRepo.On("CanAddProjects", ctx, groupID, projectIDs).Return(nil)
	groupRepo.On("AddProjects", ctx, groupID, projectIDs).Return(nil)

	err := service.AddProjectsToGroup(ctx, groupID, projectIDs)

	assert.NoError(t, err)
}

func TestProjectGroupService_RemoveProjectsFromGroup_Success(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	service := &projectGroupService{
		db:        &gorm.DB{},
		logger:    logger,
		groupRepo: groupRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()
	projectIDs := []string{uuid.New().String(), uuid.New().String()}

	groupRepo.On("ExistsByID", ctx, groupID).Return(true, nil)
	groupRepo.On("RemoveProjects", ctx, groupID, projectIDs).Return(nil)

	err := service.RemoveProjectsFromGroup(ctx, groupID, projectIDs)

	assert.NoError(t, err)
}

func TestProjectGroupService_GetProjectGroupStats_Success(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	service := &projectGroupService{
		db:        &gorm.DB{},
		logger:    logger,
		groupRepo: groupRepo,
	}

	ctx := context.Background()
	clientID := uuid.New().String()

	stats := &model.ProjectGroupStats{
		TotalGroups:    10,
		ActiveGroups:   8,
		TotalProjects:  25,
		TotalRevenue:   50000000,
		AverageRevenue: 5000000,
	}

	groupRepo.On("GetStats", ctx, &clientID).Return(stats, nil)

	result, err := service.GetProjectGroupStats(ctx, &clientID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 10, result.TotalGroups)
	assert.Equal(t, 8, result.ActiveGroups)
	assert.Equal(t, 25, result.TotalProjects)
	assert.Equal(t, float64(50000000), result.TotalRevenue)
	assert.Equal(t, float64(5000000), result.AverageRevenue)
}

func TestProjectGroupService_GetGroupRevenue_Success(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	service := &projectGroupService{
		db:        &gorm.DB{},
		logger:    logger,
		groupRepo: groupRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()
	startMonth := "2024-01"
	endMonth := "2024-12"
	revenue := 12000000.0

	groupRepo.On("GetGroupRevenue", ctx, groupID, startMonth, endMonth).Return(revenue, nil)

	result, err := service.GetGroupRevenue(ctx, groupID, startMonth, endMonth)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, groupID, result["group_id"])
	assert.Equal(t, startMonth, result["start_month"])
	assert.Equal(t, endMonth, result["end_month"])
	assert.Equal(t, revenue, result["revenue"])
}

func TestProjectGroupService_ValidateProjectsForGroup_Success(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	service := &projectGroupService{
		db:        &gorm.DB{},
		logger:    logger,
		groupRepo: groupRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()
	projectIDs := []string{uuid.New().String(), uuid.New().String()}

	groupRepo.On("CanAddProjects", ctx, groupID, projectIDs).Return(nil)

	err := service.ValidateProjectsForGroup(ctx, groupID, projectIDs)

	assert.NoError(t, err)
}

func TestProjectGroupService_ValidateProjectsForGroup_Error(t *testing.T) {
	groupRepo := &MockProjectGroupRepositorySimple{}
	logger := zap.NewNop()

	service := &projectGroupService{
		db:        &gorm.DB{},
		logger:    logger,
		groupRepo: groupRepo,
	}

	ctx := context.Background()
	groupID := uuid.New().String()
	projectIDs := []string{uuid.New().String()}

	groupRepo.On("CanAddProjects", ctx, groupID, projectIDs).Return(fmt.Errorf("プロジェクトが見つかりません"))

	err := service.ValidateProjectsForGroup(ctx, groupID, projectIDs)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "プロジェクトが見つかりません")
}

// ========== 補助モック ==========

// MockInvoiceRepositoryForTest 請求書リポジトリのモック（テスト用）
type MockInvoiceRepositoryForTest struct {
	mock.Mock
}

func (m *MockInvoiceRepositoryForTest) FindByProjectGroupID(ctx context.Context, groupID string) ([]*model.Invoice, error) {
	args := m.Called(ctx, groupID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

// CrudRepositoryインターフェースを満たすための実装（最小限）
func (m *MockInvoiceRepositoryForTest) Create(ctx context.Context, entity *model.Invoice) error {
	return nil
}

func (m *MockInvoiceRepositoryForTest) Update(ctx context.Context, entity *model.Invoice) error {
	return nil
}

func (m *MockInvoiceRepositoryForTest) Delete(ctx context.Context, entity *model.Invoice) error {
	return nil
}

func (m *MockInvoiceRepositoryForTest) FindByID(ctx context.Context, id interface{}) (*model.Invoice, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) FindAll(ctx context.Context, opts ...commonRepo.QueryOptions) ([]*model.Invoice, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) Count(ctx context.Context, opts ...commonRepo.QueryOptions) (int64, error) {
	return 0, nil
}

func (m *MockInvoiceRepositoryForTest) Exists(ctx context.Context, id interface{}) (bool, error) {
	return false, nil
}

func (m *MockInvoiceRepositoryForTest) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	return nil
}

// その他のメソッド（InvoiceRepositoryインターフェース要件）
func (m *MockInvoiceRepositoryForTest) FindByInvoiceNumber(ctx context.Context, invoiceNumber string) (*model.Invoice, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) FindByClientID(ctx context.Context, clientID string) ([]*model.Invoice, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) FindByStatus(ctx context.Context, status model.InvoiceStatus) ([]*model.Invoice, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) FindOverdue(ctx context.Context) ([]*model.Invoice, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) GetSummary(ctx context.Context, clientID *string, dateFrom, dateTo *time.Time) (*repository.InvoiceSummary, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) CreateWithDetails(ctx context.Context, invoice *model.Invoice, details []*model.InvoiceDetail) error {
	return nil
}

func (m *MockInvoiceRepositoryForTest) FindByBillingMonth(ctx context.Context, billingMonth string, clientID *string) ([]*model.Invoice, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) FindByFreeSyncStatus(ctx context.Context, status model.FreeSyncStatus) ([]*model.Invoice, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) FindNeedingSync(ctx context.Context, limit int) ([]*model.Invoice, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) UpdateFreeSyncStatus(ctx context.Context, id string, status model.FreeSyncStatus, freeeInvoiceID *int) error {
	return nil
}

func (m *MockInvoiceRepositoryForTest) GetMonthlyRevenue(ctx context.Context, year, month int, clientID *string) (float64, error) {
	return 0, nil
}

func (m *MockInvoiceRepositoryForTest) GetBillingStats(ctx context.Context, startDate, endDate time.Time) (*repository.BillingStats, error) {
	return nil, nil
}

func (m *MockInvoiceRepositoryForTest) CreateBatch(ctx context.Context, invoices []*model.Invoice) error {
	return nil
}
