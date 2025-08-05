package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
)

// テスト用のデータベースをセットアップ
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// テーブルを作成
	err = db.AutoMigrate(
		&model.User{},
		&model.Expense{},
		&model.ExpenseSummary{},
		&model.ExpenseApproval{},
		&model.ExpenseCategory{},
		&model.ExpenseLimit{},
		&model.ExpenseApproverSetting{},
	)
	assert.NoError(t, err)

	return db
}

// TestUpdateMonthlySummary_Submit tests the updateMonthlySummary method for submit action
func TestUpdateMonthlySummary_Submit(t *testing.T) {
	db := setupTestDB(t)
	logger := zap.NewNop()

	service := &expenseService{
		db:     db,
		logger: logger,
	}

	ctx := context.Background()
	userID := uuid.New()
	expenseDate := time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC)
	amount := 10000

	// 新規作成のケース
	err := db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, expenseDate, amount, "submit")
	})
	assert.NoError(t, err)

	// データベースから集計を取得
	var summary model.ExpenseSummary
	err = db.Where("user_id = ? AND year = ? AND month = ?", userID, 2025, 7).First(&summary).Error
	assert.NoError(t, err)

	// 検証
	assert.Equal(t, userID, summary.UserID)
	assert.Equal(t, 2025, summary.Year)
	assert.Equal(t, 7, summary.Month)
	assert.Equal(t, 10000, summary.TotalAmount)
	assert.Equal(t, 10000, summary.PendingAmount)
	assert.Equal(t, 0, summary.ApprovedAmount)
	assert.Equal(t, 1, summary.ExpenseCount)

	// 同じ月に再度申請した場合
	err = db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, expenseDate, 5000, "submit")
	})
	assert.NoError(t, err)

	// 再度取得
	err = db.Where("user_id = ? AND year = ? AND month = ?", userID, 2025, 7).First(&summary).Error
	assert.NoError(t, err)

	// 検証（累積されている）
	assert.Equal(t, 15000, summary.TotalAmount)
	assert.Equal(t, 15000, summary.PendingAmount)
	assert.Equal(t, 2, summary.ExpenseCount)
}

// TestUpdateMonthlySummary_Cancel tests the updateMonthlySummary method for cancel action
func TestUpdateMonthlySummary_Cancel(t *testing.T) {
	db := setupTestDB(t)
	logger := zap.NewNop()

	service := &expenseService{
		db:     db,
		logger: logger,
	}

	ctx := context.Background()
	userID := uuid.New()
	expenseDate := time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC)

	// まず申請を作成
	err := db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, expenseDate, 10000, "submit")
	})
	assert.NoError(t, err)

	// 取消
	err = db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, expenseDate, -10000, "cancel")
	})
	assert.NoError(t, err)

	// データベースから集計を取得
	var summary model.ExpenseSummary
	err = db.Where("user_id = ? AND year = ? AND month = ?", userID, 2025, 7).First(&summary).Error
	assert.NoError(t, err)

	// 検証
	assert.Equal(t, 0, summary.TotalAmount)
	assert.Equal(t, 0, summary.PendingAmount)
	assert.Equal(t, 0, summary.ExpenseCount)
}

// TestUpdateMonthlySummary_Approve tests the updateMonthlySummary method for approve action
func TestUpdateMonthlySummary_Approve(t *testing.T) {
	db := setupTestDB(t)
	logger := zap.NewNop()

	service := &expenseService{
		db:     db,
		logger: logger,
	}

	ctx := context.Background()
	userID := uuid.New()
	expenseDate := time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC)
	amount := 10000

	// まず申請を作成
	err := db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, expenseDate, amount, "submit")
	})
	assert.NoError(t, err)

	// 承認
	err = db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, expenseDate, amount, "approve")
	})
	assert.NoError(t, err)

	// データベースから集計を取得
	var summary model.ExpenseSummary
	err = db.Where("user_id = ? AND year = ? AND month = ?", userID, 2025, 7).First(&summary).Error
	assert.NoError(t, err)

	// 検証
	assert.Equal(t, 10000, summary.TotalAmount)
	assert.Equal(t, 0, summary.PendingAmount)
	assert.Equal(t, 10000, summary.ApprovedAmount)
	assert.Equal(t, 1, summary.ExpenseCount) // 承認では件数は変わらない
}

// TestUpdateMonthlySummary_Reject tests the updateMonthlySummary method for reject action
func TestUpdateMonthlySummary_Reject(t *testing.T) {
	db := setupTestDB(t)
	logger := zap.NewNop()

	service := &expenseService{
		db:     db,
		logger: logger,
	}

	ctx := context.Background()
	userID := uuid.New()
	expenseDate := time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC)
	amount := 10000

	// まず申請を作成
	err := db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, expenseDate, amount, "submit")
	})
	assert.NoError(t, err)

	// 却下
	err = db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, expenseDate, amount, "reject")
	})
	assert.NoError(t, err)

	// データベースから集計を取得
	var summary model.ExpenseSummary
	err = db.Where("user_id = ? AND year = ? AND month = ?", userID, 2025, 7).First(&summary).Error
	assert.NoError(t, err)

	// 検証
	assert.Equal(t, 0, summary.TotalAmount)
	assert.Equal(t, 0, summary.PendingAmount)
	assert.Equal(t, 0, summary.ApprovedAmount)
	assert.Equal(t, 0, summary.ExpenseCount)
}

// TestUpdateMonthlySummary_MultipleMonths tests the updateMonthlySummary method across different months
func TestUpdateMonthlySummary_MultipleMonths(t *testing.T) {
	db := setupTestDB(t)
	logger := zap.NewNop()

	service := &expenseService{
		db:     db,
		logger: logger,
	}

	ctx := context.Background()
	userID := uuid.New()

	// 7月の申請
	julyDate := time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC)
	err := db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, julyDate, 10000, "submit")
	})
	assert.NoError(t, err)

	// 8月の申請
	augustDate := time.Date(2025, 8, 15, 0, 0, 0, 0, time.UTC)
	err = db.Transaction(func(tx *gorm.DB) error {
		return service.updateMonthlySummary(ctx, tx, userID, augustDate, 20000, "submit")
	})
	assert.NoError(t, err)

	// 7月の集計を確認
	var julySummary model.ExpenseSummary
	err = db.Where("user_id = ? AND year = ? AND month = ?", userID, 2025, 7).First(&julySummary).Error
	assert.NoError(t, err)
	assert.Equal(t, 10000, julySummary.TotalAmount)
	assert.Equal(t, 1, julySummary.ExpenseCount)

	// 8月の集計を確認
	var augustSummary model.ExpenseSummary
	err = db.Where("user_id = ? AND year = ? AND month = ?", userID, 2025, 8).First(&augustSummary).Error
	assert.NoError(t, err)
	assert.Equal(t, 20000, augustSummary.TotalAmount)
	assert.Equal(t, 1, augustSummary.ExpenseCount)
}

// MockExpenseRepository is a mock implementation of ExpenseRepository for testing
type MockExpenseRepository struct {
	mock.Mock
}

func (m *MockExpenseRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Expense, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Expense), args.Error(1)
}

func (m *MockExpenseRepository) List(ctx context.Context, userID uuid.UUID, filter *repository.ExpenseListFilter) ([]model.Expense, int64, error) {
	args := m.Called(ctx, userID, filter)
	return args.Get(0).([]model.Expense), args.Get(1).(int64), args.Error(2)
}

func (m *MockExpenseRepository) Create(ctx context.Context, expense *model.Expense) error {
	args := m.Called(ctx, expense)
	return args.Error(0)
}

func (m *MockExpenseRepository) Update(ctx context.Context, expense *model.Expense) error {
	args := m.Called(ctx, expense)
	return args.Error(0)
}

func (m *MockExpenseRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockExpenseRepository) GetExpensesByStatus(ctx context.Context, status model.ExpenseStatus) ([]model.Expense, error) {
	args := m.Called(ctx, status)
	return args.Get(0).([]model.Expense), args.Error(1)
}

func (m *MockExpenseRepository) GetMonthlySummary(ctx context.Context, userID uuid.UUID, year int, month int) (*model.ExpenseSummary, error) {
	args := m.Called(ctx, userID, year, month)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ExpenseSummary), args.Error(1)
}

func (m *MockExpenseRepository) UpdateReceipt(ctx context.Context, id uuid.UUID, receiptURL string) error {
	args := m.Called(ctx, id, receiptURL)
	return args.Error(0)
}

func (m *MockExpenseRepository) AdminList(ctx context.Context, filter *repository.ExpenseAdminListFilter) ([]model.Expense, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]model.Expense), args.Get(1).(int64), args.Error(2)
}

func (m *MockExpenseRepository) GetPendingApprovalExpenses(ctx context.Context, approverID uuid.UUID, filter *repository.ExpenseListFilter) ([]model.Expense, int64, error) {
	args := m.Called(ctx, approverID, filter)
	return args.Get(0).([]model.Expense), args.Get(1).(int64), args.Error(2)
}

func (m *MockExpenseRepository) GetByIDWithDetails(ctx context.Context, id uuid.UUID) (*model.Expense, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Expense), args.Error(1)
}

func (m *MockExpenseRepository) GetListWithRelations(ctx context.Context, filter *repository.ExpenseListFilter) ([]model.Expense, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]model.Expense), args.Get(1).(int64), args.Error(2)
}
