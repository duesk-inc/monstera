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

type ExpenseCategoryRepositoryTestSuite struct {
	suite.Suite
	db     *gorm.DB
	repo   ExpenseCategoryRepository
	logger *zap.Logger
}

func (suite *ExpenseCategoryRepositoryTestSuite) SetupSuite() {
	// テスト用のインメモリデータベースを作成
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	suite.Require().NoError(err)

	// テーブルを作成
	err = db.AutoMigrate(&model.ExpenseCategoryMaster{})
	suite.Require().NoError(err)

	suite.db = db
	suite.logger = zap.NewNop()
	suite.repo = NewExpenseCategoryRepository(db, suite.logger)
}

func (suite *ExpenseCategoryRepositoryTestSuite) SetupTest() {
	// 各テストの前にデータをクリア
	suite.db.Exec("DELETE FROM expense_categories")
	
	// SQLiteのtableが正しく作成されていることを確認
	// TableNameメソッドが正しく動作することを確認
	suite.db.Table("expense_categories").AutoMigrate(&model.ExpenseCategoryMaster{})
}

func (suite *ExpenseCategoryRepositoryTestSuite) TearDownTest() {
	// 各テストの後にデータをクリア
	suite.db.Exec("DELETE FROM expense_categories")
}

func (suite *ExpenseCategoryRepositoryTestSuite) TestTableName() {
	// TableNameメソッドが正しいテーブル名を返すことを確認
	category := model.ExpenseCategoryMaster{}
	assert.Equal(suite.T(), "expense_categories", category.TableName())
}

func (suite *ExpenseCategoryRepositoryTestSuite) TestGetByID() {
	ctx := context.Background()

	// テストデータ作成
	category := &model.ExpenseCategoryMaster{
		ID:              uuid.New(),
		Code:            "test_category",
		Name:            "テストカテゴリ",
		RequiresDetails: false,
		IsActive:        true,
		DisplayOrder:    1,
	}

	// データベースに保存
	err := suite.db.Create(category).Error
	suite.Require().NoError(err)

	// GetByIDをテスト
	result, err := suite.repo.GetByID(ctx, category.ID)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), result)
	assert.Equal(suite.T(), category.ID, result.ID)
	assert.Equal(suite.T(), category.Code, result.Code)
	assert.Equal(suite.T(), category.Name, result.Name)

	// 存在しないIDの場合
	nonExistentID := uuid.New()
	result, err = suite.repo.GetByID(ctx, nonExistentID)
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Equal(suite.T(), gorm.ErrRecordNotFound, err)
}

func (suite *ExpenseCategoryRepositoryTestSuite) TestGetActive() {
	ctx := context.Background()

	// テストデータ作成
	activeCategories := []model.ExpenseCategoryMaster{
		{
			ID:              uuid.New(),
			Code:            "transport",
			Name:            "旅費交通費",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    1,
		},
		{
			ID:              uuid.New(),
			Code:            "entertainment",
			Name:            "交際費",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    2,
		},
	}

	// データベースに保存
	for _, cat := range activeCategories {
		err := suite.db.Create(&cat).Error
		suite.Require().NoError(err)
	}

	// GetActiveをテスト
	result, err := suite.repo.GetActive(ctx)
	assert.NoError(suite.T(), err)
	assert.GreaterOrEqual(suite.T(), len(result), 2) // 少なくとも2つのアクティブなカテゴリ
	
	// 表示順序でソートされていることを確認
	for i := 1; i < len(result); i++ {
		assert.GreaterOrEqual(suite.T(), result[i].DisplayOrder, result[i-1].DisplayOrder)
	}
	
	// アクティブなカテゴリのみが含まれていることを確認
	for _, cat := range result {
		assert.True(suite.T(), cat.IsActive)
	}
}

func (suite *ExpenseCategoryRepositoryTestSuite) TestGetActiveOrderByDisplayOrder() {
	ctx := context.Background()

	// テストデータ作成（表示順序がバラバラ）
	categories := []model.ExpenseCategoryMaster{
		{
			ID:              uuid.New(),
			Code:            "category3",
			Name:            "カテゴリ3",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    3,
		},
		{
			ID:              uuid.New(),
			Code:            "category1",
			Name:            "カテゴリ1",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    1,
		},
		{
			ID:              uuid.New(),
			Code:            "category2",
			Name:            "カテゴリ2",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    2,
		},
	}

	// データベースに保存
	for _, cat := range categories {
		err := suite.db.Create(&cat).Error
		suite.Require().NoError(err)
	}

	// GetActiveOrderByDisplayOrderをテスト
	result, err := suite.repo.GetActiveOrderByDisplayOrder(ctx)
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), result, 3)
	
	// 表示順序でソートされていることを確認
	assert.Equal(suite.T(), "category1", result[0].Code)
	assert.Equal(suite.T(), "category2", result[1].Code)
	assert.Equal(suite.T(), "category3", result[2].Code)
}

func (suite *ExpenseCategoryRepositoryTestSuite) TestGetByCode() {
	ctx := context.Background()

	// テストデータ作成
	category := &model.ExpenseCategoryMaster{
		ID:              uuid.New(),
		Code:            "transport",
		Name:            "旅費交通費",
		RequiresDetails: false,
		IsActive:        true,
		DisplayOrder:    1,
	}

	// データベースに保存
	err := suite.db.Create(category).Error
	suite.Require().NoError(err)

	// GetByCodeをテスト
	result, err := suite.repo.GetByCode(ctx, "transport")
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), result)
	assert.Equal(suite.T(), category.Code, result.Code)
	assert.Equal(suite.T(), category.Name, result.Name)

	// 存在しないコードの場合
	result, err = suite.repo.GetByCode(ctx, "nonexistent")
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Equal(suite.T(), gorm.ErrRecordNotFound, err)
}

func TestExpenseCategoryRepositorySuite(t *testing.T) {
	suite.Run(t, new(ExpenseCategoryRepositoryTestSuite))
}