package repository

import (
	"context"
	"testing"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type ExpenseReceiptRepositoryTestSuite struct {
	suite.Suite
	db     *gorm.DB
	repo   ExpenseReceiptRepository
	logger *zap.Logger
}

func (suite *ExpenseReceiptRepositoryTestSuite) SetupSuite() {
	// テスト用のインメモリデータベースを作成
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	suite.Require().NoError(err)

	// テーブルを作成
	err = db.AutoMigrate(&model.ExpenseReceipt{}, &model.Expense{})
	suite.Require().NoError(err)

	suite.db = db
	suite.logger = zap.NewNop()
	suite.repo = NewExpenseReceiptRepository(db, suite.logger)
}

func (suite *ExpenseReceiptRepositoryTestSuite) SetupTest() {
	// 各テストの前にデータをクリア
	suite.db.Exec("DELETE FROM expense_receipts")
	suite.db.Exec("DELETE FROM expenses")
}

func (suite *ExpenseReceiptRepositoryTestSuite) TestCreate() {
	ctx := context.Background()

	// テストデータ作成
	receipt := &model.ExpenseReceipt{
		ID:           uuid.New(),
		ExpenseID:    uuid.New(),
		ReceiptURL:   "https://example.com/receipt1.jpg",
		S3Key:        "receipts/test/receipt1.jpg",
		FileName:     "receipt1.jpg",
		FileSize:     1024,
		ContentType:  "image/jpeg",
		DisplayOrder: 1,
	}

	// 作成
	err := suite.repo.Create(ctx, receipt)
	assert.NoError(suite.T(), err)

	// 確認
	var saved model.ExpenseReceipt
	err = suite.db.Where("id = ?", receipt.ID).First(&saved).Error
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), receipt.ReceiptURL, saved.ReceiptURL)
	assert.Equal(suite.T(), receipt.S3Key, saved.S3Key)
}

func (suite *ExpenseReceiptRepositoryTestSuite) TestCreateBatch() {
	ctx := context.Background()
	expenseID := uuid.New()

	// テストデータ作成
	receipts := []*model.ExpenseReceipt{
		{
			ID:           uuid.New(),
			ExpenseID:    expenseID,
			ReceiptURL:   "https://example.com/receipt1.jpg",
			S3Key:        "receipts/test/receipt1.jpg",
			FileName:     "receipt1.jpg",
			FileSize:     1024,
			ContentType:  "image/jpeg",
			DisplayOrder: 1,
		},
		{
			ID:           uuid.New(),
			ExpenseID:    expenseID,
			ReceiptURL:   "https://example.com/receipt2.jpg",
			S3Key:        "receipts/test/receipt2.jpg",
			FileName:     "receipt2.jpg",
			FileSize:     2048,
			ContentType:  "image/jpeg",
			DisplayOrder: 2,
		},
	}

	// 作成
	err := suite.repo.CreateBatch(ctx, receipts)
	assert.NoError(suite.T(), err)

	// 確認
	var saved []model.ExpenseReceipt
	err = suite.db.Where("expense_id = ?", expenseID).Order("display_order").Find(&saved).Error
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), saved, 2)
	assert.Equal(suite.T(), receipts[0].ReceiptURL, saved[0].ReceiptURL)
	assert.Equal(suite.T(), receipts[1].ReceiptURL, saved[1].ReceiptURL)
}

func (suite *ExpenseReceiptRepositoryTestSuite) TestGetByExpenseID() {
	ctx := context.Background()
	expenseID := uuid.New()

	// テストデータ作成
	receipts := []model.ExpenseReceipt{
		{
			ID:           uuid.New(),
			ExpenseID:    expenseID,
			ReceiptURL:   "https://example.com/receipt1.jpg",
			S3Key:        "receipts/test/receipt1.jpg",
			FileName:     "receipt1.jpg",
			DisplayOrder: 2,
		},
		{
			ID:           uuid.New(),
			ExpenseID:    expenseID,
			ReceiptURL:   "https://example.com/receipt2.jpg",
			S3Key:        "receipts/test/receipt2.jpg",
			FileName:     "receipt2.jpg",
			DisplayOrder: 1,
		},
	}

	for _, r := range receipts {
		suite.db.Create(&r)
	}

	// 取得
	result, err := suite.repo.GetByExpenseID(ctx, expenseID)
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), result, 2)
	// DisplayOrder順になっているか確認
	assert.Equal(suite.T(), 1, result[0].DisplayOrder)
	assert.Equal(suite.T(), 2, result[1].DisplayOrder)
}

func (suite *ExpenseReceiptRepositoryTestSuite) TestDelete() {
	ctx := context.Background()
	receipt := &model.ExpenseReceipt{
		ID:           uuid.New(),
		ExpenseID:    uuid.New(),
		ReceiptURL:   "https://example.com/receipt1.jpg",
		S3Key:        "receipts/test/receipt1.jpg",
		FileName:     "receipt1.jpg",
		DisplayOrder: 1,
	}

	// 作成
	suite.db.Create(receipt)

	// 削除
	err := suite.repo.Delete(ctx, receipt.ID)
	assert.NoError(suite.T(), err)

	// 確認
	var count int64
	suite.db.Model(&model.ExpenseReceipt{}).Where("id = ?", receipt.ID).Count(&count)
	assert.Equal(suite.T(), int64(0), count)
}

func (suite *ExpenseReceiptRepositoryTestSuite) TestDeleteByExpenseID() {
	ctx := context.Background()
	expenseID := uuid.New()

	// テストデータ作成
	for i := 0; i < 3; i++ {
		receipt := &model.ExpenseReceipt{
			ID:           uuid.New(),
			ExpenseID:    expenseID,
			ReceiptURL:   "https://example.com/receipt.jpg",
			S3Key:        "receipts/test/receipt.jpg",
			FileName:     "receipt.jpg",
			DisplayOrder: i + 1,
		}
		suite.db.Create(receipt)
	}

	// 削除
	err := suite.repo.DeleteByExpenseID(ctx, expenseID)
	assert.NoError(suite.T(), err)

	// 確認
	var count int64
	suite.db.Model(&model.ExpenseReceipt{}).Where("expense_id = ?", expenseID).Count(&count)
	assert.Equal(suite.T(), int64(0), count)
}

func (suite *ExpenseReceiptRepositoryTestSuite) TestUpdateDisplayOrder() {
	ctx := context.Background()
	receipt := &model.ExpenseReceipt{
		ID:           uuid.New(),
		ExpenseID:    uuid.New(),
		ReceiptURL:   "https://example.com/receipt1.jpg",
		S3Key:        "receipts/test/receipt1.jpg",
		FileName:     "receipt1.jpg",
		DisplayOrder: 1,
	}

	// 作成
	suite.db.Create(receipt)

	// 表示順更新
	err := suite.repo.UpdateDisplayOrder(ctx, receipt.ID, 5)
	assert.NoError(suite.T(), err)

	// 確認
	var updated model.ExpenseReceipt
	suite.db.Where("id = ?", receipt.ID).First(&updated)
	assert.Equal(suite.T(), 5, updated.DisplayOrder)
}

func (suite *ExpenseReceiptRepositoryTestSuite) TestCountByExpenseID() {
	ctx := context.Background()
	expenseID := uuid.New()

	// テストデータ作成
	for i := 0; i < 5; i++ {
		receipt := &model.ExpenseReceipt{
			ID:           uuid.New(),
			ExpenseID:    expenseID,
			ReceiptURL:   "https://example.com/receipt.jpg",
			S3Key:        "receipts/test/receipt.jpg",
			FileName:     "receipt.jpg",
			DisplayOrder: i + 1,
		}
		suite.db.Create(receipt)
	}

	// カウント
	count, err := suite.repo.CountByExpenseID(ctx, expenseID)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), int64(5), count)
}

func TestExpenseReceiptRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(ExpenseReceiptRepositoryTestSuite))
}
