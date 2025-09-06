package service

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "go.uber.org/zap"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"

    "github.com/duesk/monstera/internal/model"
    "github.com/duesk/monstera/internal/repository"
)

// setupAdminTestDB creates an in-memory sqlite DB and migrates minimal tables
func setupAdminTestDB(t *testing.T) *gorm.DB {
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
    assert.NoError(t, err)

    // migrate minimal tables needed for retrieval and LoadDetails
    err = db.AutoMigrate(
        &model.User{},
        &model.Expense{},
        &model.ExpenseApproval{},
        &model.ExpenseCategoryMaster{},
        &model.ExpenseSummary{},
    )
    assert.NoError(t, err)
    return db
}

func TestExpenseService_GetByIDForAdmin_Success(t *testing.T) {
    db := setupAdminTestDB(t)
    logger := zap.NewNop()

    // seed user
    user := &model.User{ID: "u-1", Email: "admin@test.local", Name: "Admin", Role: model.RoleManager}
    assert.NoError(t, db.Create(user).Error)

    // seed expense (category master optional)
    exp := &model.Expense{
        UserID:      user.ID,
        Title:       "テスト経費",
        Category:    model.ExpenseCategoryTransport,
        CategoryID:  "cat-transport",
        Amount:      1200,
        ExpenseDate: time.Now(),
        Status:      model.ExpenseStatusSubmitted,
        Version:     1,
    }
    assert.NoError(t, db.Create(exp).Error)

    repo := repository.NewExpenseRepository(db, logger)
    svc := &expenseService{db: db, expenseRepo: repo, logger: logger}

    got, err := svc.GetByIDForAdmin(context.Background(), exp.ID)
    assert.NoError(t, err)
    if assert.NotNil(t, got) {
        assert.Equal(t, exp.ID, got.ID)
        assert.Equal(t, exp.UserID, got.UserID)
    }
}

func TestExpenseService_GetByIDForAdmin_NotFound(t *testing.T) {
    db := setupAdminTestDB(t)
    logger := zap.NewNop()
    repo := repository.NewExpenseRepository(db, logger)
    svc := &expenseService{db: db, expenseRepo: repo, logger: logger}

    got, err := svc.GetByIDForAdmin(context.Background(), "non-existent")
    assert.Error(t, err)
    assert.Nil(t, got)
}

