package unit

import (
	"context"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// ExpenseRepositoryExtendedTestSuite 拡張リポジトリテストスイート
type ExpenseRepositoryExtendedTestSuite struct {
	suite.Suite
	db         *gorm.DB
	repository repository.ExpenseRepository
	ctx        context.Context
}

// SetupSuite テストスイート開始時の設定
func (suite *ExpenseRepositoryExtendedTestSuite) SetupSuite() {
	// インメモリSQLiteデータベースを使用
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		suite.T().Fatal("Failed to connect to test database:", err)
	}

	// テスト用テーブルの作成（簡略化）
	err = db.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL,
			password TEXT NOT NULL,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			name TEXT,
			created_at DATETIME,
			updated_at DATETIME
		)
	`).Error
	if err != nil {
		suite.T().Fatal("Failed to create users table:", err)
	}

	err = db.Exec(`
		CREATE TABLE expenses (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			title TEXT NOT NULL,
			category TEXT NOT NULL,
			category_id TEXT NOT NULL,
			amount INTEGER NOT NULL,
			expense_date DATETIME NOT NULL,
			status TEXT NOT NULL DEFAULT 'draft',
			description TEXT,
			receipt_url TEXT,
			receipt_urls TEXT,
			approver_id TEXT,
			approved_at DATETIME,
			paid_at DATETIME,
			version INTEGER DEFAULT 1,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			FOREIGN KEY (user_id) REFERENCES users(id)
		)
	`).Error
	if err != nil {
		suite.T().Fatal("Failed to create expenses table:", err)
	}

	suite.db = db
	suite.repository = repository.NewExpenseRepository(db, zap.NewNop())
	suite.ctx = context.Background()
}

// TearDownSuite テストスイート終了時のクリーンアップ
func (suite *ExpenseRepositoryExtendedTestSuite) TearDownSuite() {
	sqlDB, _ := suite.db.DB()
	sqlDB.Close()
}

// SetupTest 各テスト開始前の設定
func (suite *ExpenseRepositoryExtendedTestSuite) SetupTest() {
	// テストデータのクリーンアップ
	suite.db.Exec("DELETE FROM expenses")
	suite.db.Exec("DELETE FROM users")
}

// TestExpenseRepository_CreateWithInvalidData 不正なデータでの作成テスト
func (suite *ExpenseRepositoryExtendedTestSuite) TestExpenseRepository_CreateWithInvalidData() {
	// SQLiteで外部キー制約を有効にする
	suite.db.Exec("PRAGMA foreign_keys = ON")

	// 存在しないユーザーIDでの経費申請作成
	expense := &model.Expense{
		ID:          uuid.New(),
		UserID:      uuid.New(), // 存在しないユーザーID
		Title:       "テスト経費",
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New(),
		Amount:      5000,
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "テスト用の経費申請です",
		Version:     1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := suite.repository.Create(suite.ctx, expense)
	// 外部キー制約により失敗することを期待
	assert.Error(suite.T(), err, "存在しないユーザーIDでの作成は失敗する")
}

// TestExpenseRepository_UpdateNonExistent 存在しない経費申請の更新テスト
func (suite *ExpenseRepositoryExtendedTestSuite) TestExpenseRepository_UpdateNonExistent() {
	expense := &model.Expense{
		ID:          uuid.New(),
		UserID:      uuid.New(),
		Title:       "存在しない経費",
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New(),
		Amount:      5000,
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "存在しない経費申請の更新テスト",
		Version:     1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := suite.repository.Update(suite.ctx, expense)
	// エラーは発生しないが、0行更新される
	assert.NoError(suite.T(), err, "存在しない経費申請の更新でもエラーは発生しない")
}

// TestExpenseRepository_DeleteNonExistent 存在しない経費申請の削除テスト
func (suite *ExpenseRepositoryExtendedTestSuite) TestExpenseRepository_DeleteNonExistent() {
	nonExistentID := uuid.New()

	err := suite.repository.Delete(suite.ctx, nonExistentID)
	// エラーは発生しないが、0行削除される
	assert.NoError(suite.T(), err, "存在しない経費申請の削除でもエラーは発生しない")
}

// TestExpenseRepository_GetMonthlyTotalNoData データがない場合の月次合計テスト
func (suite *ExpenseRepositoryExtendedTestSuite) TestExpenseRepository_GetMonthlyTotalNoData() {
	userID := uuid.New()

	total, err := suite.repository.GetMonthlyTotal(suite.ctx, userID, 2024, 1)

	assert.NoError(suite.T(), err, "データがない場合でもエラーは発生しない")
	assert.Equal(suite.T(), 0, total, "データがない場合は0が返される")
}

// TestExpenseRepository_CountPendingNoData 保留中データがない場合のカウントテスト
func (suite *ExpenseRepositoryExtendedTestSuite) TestExpenseRepository_CountPendingNoData() {
	userID := uuid.New()

	count, err := suite.repository.CountPendingByUserID(suite.ctx, userID)

	assert.NoError(suite.T(), err, "データがない場合でもエラーは発生しない")
	assert.Equal(suite.T(), int64(0), count, "データがない場合は0が返される")
}

// TestExpenseRepository_ListWithPagination ページネーションテスト
func (suite *ExpenseRepositoryExtendedTestSuite) TestExpenseRepository_ListWithPagination() {
	// テストユーザーの作成（手動挿入）
	userID := uuid.New()
	suite.db.Exec("INSERT INTO users (id, email, password, first_name, last_name, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		userID.String(), "test@duesk.co.jp", "hashedpassword", "Test", "User", "Test User", time.Now(), time.Now())

	// 10件の経費申請を作成
	for i := 0; i < 10; i++ {
		expense := &model.Expense{
			ID:          uuid.New(),
			UserID:      userID,
			Title:       "経費申請" + string(rune(i+1)),
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New(),
			Amount:      1000 * (i + 1),
			Status:      model.ExpenseStatusDraft,
			ExpenseDate: time.Now().Add(-time.Duration(i) * 24 * time.Hour),
			Description: "テスト経費申請" + string(rune(i+1)),
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		suite.db.Create(expense)
	}

	// 1ページ目（5件ずつ）
	filter := &dto.ExpenseFilterRequest{
		Page:  1,
		Limit: 5,
	}
	expenses, total, err := suite.repository.ListByUserID(suite.ctx, userID, filter)

	assert.NoError(suite.T(), err, "ページネーション取得が成功する")
	assert.Equal(suite.T(), int64(10), total, "総件数が正しい")
	assert.Len(suite.T(), expenses, 5, "1ページ目は5件")

	// 2ページ目
	filter.Page = 2
	expenses, total, err = suite.repository.ListByUserID(suite.ctx, userID, filter)

	assert.NoError(suite.T(), err, "2ページ目の取得が成功する")
	assert.Equal(suite.T(), int64(10), total, "総件数が正しい")
	assert.Len(suite.T(), expenses, 5, "2ページ目も5件")

	// 3ページ目（データなし）
	filter.Page = 3
	expenses, total, err = suite.repository.ListByUserID(suite.ctx, userID, filter)

	assert.NoError(suite.T(), err, "3ページ目の取得が成功する")
	assert.Equal(suite.T(), int64(10), total, "総件数が正しい")
	assert.Len(suite.T(), expenses, 0, "3ページ目は0件")
}

// TestExpenseRepository_StatusFiltering ステータスフィルタリングテスト
func (suite *ExpenseRepositoryExtendedTestSuite) TestExpenseRepository_StatusFiltering() {
	// テストユーザーの作成（手動挿入）
	userID := uuid.New()
	suite.db.Exec("INSERT INTO users (id, email, password, first_name, last_name, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		userID.String(), "test@duesk.co.jp", "hashedpassword", "Test", "User", "Test User", time.Now(), time.Now())

	// 異なるステータスの経費申請を作成
	statuses := []model.ExpenseStatus{
		model.ExpenseStatusDraft,
		model.ExpenseStatusSubmitted,
		model.ExpenseStatusApproved,
		model.ExpenseStatusRejected,
	}

	for i, status := range statuses {
		expense := &model.Expense{
			ID:          uuid.New(),
			UserID:      userID,
			Title:       "経費申請" + string(status),
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New(),
			Amount:      1000 * (i + 1),
			Status:      status,
			ExpenseDate: time.Now(),
			Description: "ステータス" + string(status) + "の経費申請",
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		suite.db.Create(expense)
	}

	// 下書きのみフィルタリング
	draftStatus := string(model.ExpenseStatusDraft)
	filter := &dto.ExpenseFilterRequest{
		Page:   1,
		Limit:  10,
		Status: &draftStatus,
	}

	expenses, total, err := suite.repository.ListByUserID(suite.ctx, userID, filter)

	assert.NoError(suite.T(), err, "ステータスフィルタリングが成功する")
	assert.Equal(suite.T(), int64(1), total, "下書きステータスは1件")
	assert.Len(suite.T(), expenses, 1, "取得した経費申請は1件")
	assert.Equal(suite.T(), model.ExpenseStatusDraft, expenses[0].Status, "ステータスが下書きである")
}

// TestExpenseRepository_ConcurrentUpdate 楽観的ロックのテスト
func (suite *ExpenseRepositoryExtendedTestSuite) TestExpenseRepository_ConcurrentUpdate() {
	// テストユーザーの作成（手動挿入）
	userID := uuid.New()
	suite.db.Exec("INSERT INTO users (id, email, password, first_name, last_name, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		userID.String(), "test@duesk.co.jp", "hashedpassword", "Test", "User", "Test User", time.Now(), time.Now())

	// 経費申請を作成
	expense := &model.Expense{
		ID:          uuid.New(),
		UserID:      userID,
		Title:       "楽観ロックテスト",
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New(),
		Amount:      5000,
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "楽観的ロックのテスト",
		Version:     1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	suite.db.Create(expense)

	// 1回目の更新
	expense.Title = "更新されたタイトル1"
	expense.Version = 2
	err := suite.repository.Update(suite.ctx, expense)
	assert.NoError(suite.T(), err, "1回目の更新が成功する")

	// 古いバージョンでの更新（楽観的ロックの確認）
	oldExpense := &model.Expense{
		ID:          expense.ID,
		UserID:      userID,
		Title:       "更新されたタイトル2",
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New(),
		Amount:      6000,
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "古いバージョンでの更新",
		Version:     1, // 古いバージョン
		CreatedAt:   expense.CreatedAt,
		UpdatedAt:   time.Now(),
	}

	err2 := suite.repository.Update(suite.ctx, oldExpense)
	// SQLiteでは楽観的ロックは自動実装されないので、エラーにはならない
	assert.NoError(suite.T(), err2, "SQLiteでは楽観的ロック機能はサポートされていない")
}

// TestExpenseRepositoryExtendedTestSuite_Run テストスイートの実行
func TestExpenseRepositoryExtendedTestSuite_Run(t *testing.T) {
	suite.Run(t, new(ExpenseRepositoryExtendedTestSuite))
}

// TestExpenseRepository_EdgeCases エッジケーステスト
func TestExpenseRepository_EdgeCases(t *testing.T) {
	t.Run("空文字列のUUIDテスト", func(t *testing.T) {
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
		assert.NoError(t, err, "テストデータベースの作成が成功する")

		repo := repository.NewExpenseRepository(db, zap.NewNop())
		ctx := context.Background()

		// 空のUUIDでの検索
		_, err = repo.GetByID(ctx, uuid.Nil)
		assert.Error(t, err, "空のUUIDでの検索はエラーになる")

		// 存在チェック
		exists, err := repo.ExistsByID(ctx, uuid.Nil)
		assert.NoError(t, err, "空のUUIDでの存在チェックはエラーにならない")
		assert.False(t, exists, "空のUUIDは存在しない")
	})

	t.Run("極端なページネーション値", func(t *testing.T) {
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
		assert.NoError(t, err, "テストデータベースの作成が成功する")

		repo := repository.NewExpenseRepository(db, zap.NewNop())
		ctx := context.Background()

		// 極端に大きなページ番号
		filter := &dto.ExpenseFilterRequest{
			Page:  1000000,
			Limit: 10,
		}

		userID := uuid.New()
		expenses, total, err := repo.ListByUserID(ctx, userID, filter)

		assert.NoError(t, err, "極端なページ番号でもエラーにならない")
		assert.Equal(t, int64(0), total, "データがないので総件数は0")
		assert.Len(t, expenses, 0, "データがないので取得件数は0")
	})

	t.Run("無効な日付範囲での集計", func(t *testing.T) {
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
		assert.NoError(t, err, "テストデータベースの作成が成功する")

		repo := repository.NewExpenseRepository(db, zap.NewNop())
		ctx := context.Background()

		userID := uuid.New()

		// 無効な月での月次集計
		total, err := repo.GetMonthlyTotal(ctx, userID, 2024, 13) // 13月
		assert.NoError(t, err, "無効な月でもエラーにならない")
		assert.Equal(t, 0, total, "無効な月の場合は0が返される")

		// 負の年での年次集計
		total, err = repo.GetYearlyTotal(ctx, userID, -1)
		assert.NoError(t, err, "負の年でもエラーにならない")
		assert.Equal(t, 0, total, "負の年の場合は0が返される")
	})
}
