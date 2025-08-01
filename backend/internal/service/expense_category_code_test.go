package service

import (
	"context"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// MockCategoryRepository is a mock implementation of the category repository
type MockCategoryRepository struct {
	mock.Mock
}

func (m *MockCategoryRepository) Create(ctx context.Context, category *model.ExpenseCategoryMaster) error {
	args := m.Called(ctx, category)
	return args.Error(0)
}

func (m *MockCategoryRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ExpenseCategoryMaster, error) {
	args := m.Called(ctx, id)
	if args.Get(0) != nil {
		return args.Get(0).(*model.ExpenseCategoryMaster), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockCategoryRepository) GetByCode(ctx context.Context, code string) (*model.ExpenseCategoryMaster, error) {
	args := m.Called(ctx, code)
	if args.Get(0) != nil {
		return args.Get(0).(*model.ExpenseCategoryMaster), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockCategoryRepository) Update(ctx context.Context, category *model.ExpenseCategoryMaster) error {
	args := m.Called(ctx, category)
	return args.Error(0)
}

func (m *MockCategoryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockCategoryRepository) GetAll(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	args := m.Called(ctx)
	if args.Get(0) != nil {
		return args.Get(0).([]model.ExpenseCategoryMaster), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockCategoryRepository) GetActive(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	args := m.Called(ctx)
	if args.Get(0) != nil {
		return args.Get(0).([]model.ExpenseCategoryMaster), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockCategoryRepository) GetActiveOrderByDisplayOrder(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	args := m.Called(ctx)
	if args.Get(0) != nil {
		return args.Get(0).([]model.ExpenseCategoryMaster), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockCategoryRepository) GetByIDs(ctx context.Context, ids []uuid.UUID) ([]model.ExpenseCategoryMaster, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) != nil {
		return args.Get(0).([]model.ExpenseCategoryMaster), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockCategoryRepository) GetByCodes(ctx context.Context, codes []string) ([]model.ExpenseCategoryMaster, error) {
	args := m.Called(ctx, codes)
	if args.Get(0) != nil {
		return args.Get(0).([]model.ExpenseCategoryMaster), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockCategoryRepository) GetCategoriesWithFilter(ctx context.Context, filter *dto.ExpenseCategoryListRequest) ([]model.ExpenseCategoryMaster, int64, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) != nil {
		return args.Get(0).([]model.ExpenseCategoryMaster), args.Get(1).(int64), args.Error(2)
	}
	return nil, 0, args.Error(2)
}

func (m *MockCategoryRepository) UpdateDisplayOrder(ctx context.Context, id uuid.UUID, newOrder int) error {
	args := m.Called(ctx, id, newOrder)
	return args.Error(0)
}

func (m *MockCategoryRepository) ReorderCategories(ctx context.Context, categoryOrders map[uuid.UUID]int) error {
	args := m.Called(ctx, categoryOrders)
	return args.Error(0)
}

func (m *MockCategoryRepository) GetMaxDisplayOrder(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

func (m *MockCategoryRepository) SetActive(ctx context.Context, id uuid.UUID, isActive bool) error {
	args := m.Called(ctx, id, isActive)
	return args.Error(0)
}

func (m *MockCategoryRepository) ActivateByCode(ctx context.Context, code string) error {
	args := m.Called(ctx, code)
	return args.Error(0)
}

func (m *MockCategoryRepository) DeactivateByCode(ctx context.Context, code string) error {
	args := m.Called(ctx, code)
	return args.Error(0)
}

func (m *MockCategoryRepository) CreateBatch(ctx context.Context, categories []model.ExpenseCategoryMaster) error {
	args := m.Called(ctx, categories)
	return args.Error(0)
}

func (m *MockCategoryRepository) BulkUpdateActive(ctx context.Context, ids []uuid.UUID, isActive bool) error {
	args := m.Called(ctx, ids, isActive)
	return args.Error(0)
}

func (m *MockCategoryRepository) ExistsByID(ctx context.Context, id uuid.UUID) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockCategoryRepository) ExistsByCode(ctx context.Context, code string) (bool, error) {
	args := m.Called(ctx, code)
	return args.Bool(0), args.Error(1)
}

func (m *MockCategoryRepository) IsCodeUnique(ctx context.Context, code string, excludeID *uuid.UUID) (bool, error) {
	args := m.Called(ctx, code, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockCategoryRepository) CountActive(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockCategoryRepository) InitializeDefaultCategories(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockCategoryRepository) ResetToDefaults(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockCategoryRepository) SetLogger(logger *zap.Logger) {
	m.Called(logger)
}

// MockExpenseRepository is a mock implementation of the expense repository
type MockExpenseRepository struct {
	mock.Mock
}

func (m *MockExpenseRepository) Create(ctx context.Context, expense *model.Expense) error {
	args := m.Called(ctx, expense)
	return args.Error(0)
}

func (m *MockExpenseRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Expense, error) {
	args := m.Called(ctx, id)
	if args.Get(0) != nil {
		return args.Get(0).(*model.Expense), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockExpenseRepository) Update(ctx context.Context, expense *model.Expense) error {
	args := m.Called(ctx, expense)
	return args.Error(0)
}

func (m *MockExpenseRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// TestCreateExpenseWithCategoryCode tests creating an expense using category code
func TestCreateExpenseWithCategoryCode(t *testing.T) {
	ctx := context.Background()
	logger := zap.NewNop()
	mockDB := &gorm.DB{}

	mockCategoryRepo := new(MockCategoryRepository)
	mockExpenseRepo := new(MockExpenseRepository)

	// Create test category
	testCategory := &model.ExpenseCategoryMaster{
		ID:           uuid.New(),
		Code:         "transport",
		Name:         "旅費交通費",
		IsActive:     true,
		IsDefault:    false,
		DisplayOrder: 1,
	}

	// Setup mock expectations
	mockCategoryRepo.On("GetByCode", ctx, "transport").Return(testCategory, nil)
	mockExpenseRepo.On("Create", ctx, mock.AnythingOfType("*model.Expense")).Return(nil)

	// Create service with mocks
	service := &expenseService{
		db:           mockDB,
		logger:       logger,
		categoryRepo: mockCategoryRepo,
		expenseRepo:  mockExpenseRepo,
	}

	// Test data
	userID := uuid.New()
	req := &dto.CreateExpenseRequest{
		Title:       "Test Expense",
		Category:    "transport", // Using category code
		Amount:      1000,
		ExpenseDate: time.Now(),
		Description: "Test expense description",
	}

	// Execute
	expense, err := service.Create(ctx, userID, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, expense)
	assert.Equal(t, testCategory.ID, expense.CategoryID)
	assert.Equal(t, model.ExpenseCategory("transport"), expense.Category)

	// Verify mock expectations
	mockCategoryRepo.AssertExpectations(t)
	mockExpenseRepo.AssertExpectations(t)
}

// TestCreateExpenseWithCategoryID tests backward compatibility with category ID
func TestCreateExpenseWithCategoryID(t *testing.T) {
	ctx := context.Background()
	logger := zap.NewNop()
	mockDB := &gorm.DB{}

	mockCategoryRepo := new(MockCategoryRepository)
	mockExpenseRepo := new(MockExpenseRepository)

	// Create test category
	testCategoryID := uuid.New()
	testCategory := &model.ExpenseCategoryMaster{
		ID:           testCategoryID,
		Code:         "transport",
		Name:         "旅費交通費",
		IsActive:     true,
		IsDefault:    false,
		DisplayOrder: 1,
	}

	// Setup mock expectations
	mockCategoryRepo.On("GetByID", ctx, testCategoryID).Return(testCategory, nil)
	mockExpenseRepo.On("Create", ctx, mock.AnythingOfType("*model.Expense")).Return(nil)

	// Create service with mocks
	service := &expenseService{
		db:           mockDB,
		logger:       logger,
		categoryRepo: mockCategoryRepo,
		expenseRepo:  mockExpenseRepo,
	}

	// Test data
	userID := uuid.New()
	req := &dto.CreateExpenseRequest{
		Title:       "Test Expense",
		Category:    "",              // Not using category code
		CategoryID:  &testCategoryID, // Using category ID for backward compatibility
		Amount:      1000,
		ExpenseDate: time.Now(),
		Description: "Test expense description",
	}

	// Execute
	expense, err := service.Create(ctx, userID, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, expense)
	assert.Equal(t, testCategoryID, expense.CategoryID)
	assert.Equal(t, model.ExpenseCategory("transport"), expense.Category)

	// Verify mock expectations
	mockCategoryRepo.AssertExpectations(t)
	mockExpenseRepo.AssertExpectations(t)
}

// TestCreateExpenseWithInvalidCategoryCode tests error handling for invalid category code
func TestCreateExpenseWithInvalidCategoryCode(t *testing.T) {
	ctx := context.Background()
	logger := zap.NewNop()
	mockDB := &gorm.DB{}

	mockCategoryRepo := new(MockCategoryRepository)
	mockExpenseRepo := new(MockExpenseRepository)

	// Setup mock expectations - category not found
	mockCategoryRepo.On("GetByCode", ctx, "invalid_code").Return(nil, gorm.ErrRecordNotFound)

	// Create service with mocks
	service := &expenseService{
		db:           mockDB,
		logger:       logger,
		categoryRepo: mockCategoryRepo,
		expenseRepo:  mockExpenseRepo,
	}

	// Test data
	userID := uuid.New()
	req := &dto.CreateExpenseRequest{
		Title:       "Test Expense",
		Category:    "invalid_code", // Invalid category code
		Amount:      1000,
		ExpenseDate: time.Now(),
		Description: "Test expense description",
	}

	// Execute
	expense, err := service.Create(ctx, userID, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, expense)

	expenseErr, ok := err.(*dto.ExpenseError)
	assert.True(t, ok)
	assert.Equal(t, dto.ErrCodeCategoryNotFound, expenseErr.Code)
	assert.Contains(t, expenseErr.Message, "指定されたカテゴリが見つかりません")

	// Verify mock expectations
	mockCategoryRepo.AssertExpectations(t)
}
