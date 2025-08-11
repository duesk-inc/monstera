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

// ExpenseRepositoryTestSuite リポジトリテストスイート
type ExpenseRepositoryTestSuite struct {
	suite.Suite
	db         *gorm.DB
	repository repository.ExpenseRepository
	ctx        context.Context
}

// TestUser テスト用のユーザーモデル
type TestUser struct {
	ID    string `gorm:"type:string;primary_key"`
	Name  string `gorm:"type:string"`
	Email string `gorm:"type:string"`
}

// TestExpense テスト用の経費申請モデル
type TestExpense struct {
	ID          string    `gorm:"type:string;primary_key"`
	UserID      string    `gorm:"type:string;not null"`
	Title       string    `gorm:"type:string;not null"`
	Amount      int       `gorm:"type:integer;not null"`
	Status      string    `gorm:"type:string;not null;default:'draft'"`
	ExpenseDate time.Time `gorm:"type:datetime;not null"`
	Description string    `gorm:"type:text"`
	CreatedAt   time.Time `gorm:"type:datetime"`
	UpdatedAt   time.Time `gorm:"type:datetime"`
}

// SetupSuite テストスイート開始時の設定
func (suite *ExpenseRepositoryTestSuite) SetupSuite() {
	// インメモリSQLiteデータベースを使用
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		suite.T().Fatal("Failed to connect to test database:", err)
	}

	// テスト用テーブルの作成
	err = db.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL,
			cognito_sub TEXT,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			name TEXT,
			first_name_kana TEXT,
			last_name_kana TEXT,
			birthdate DATETIME,
			gender TEXT,
			address TEXT,
			phone_number TEXT,
			role INTEGER NOT NULL DEFAULT 4,
			default_role INTEGER,
			department_id TEXT,
			manager_id TEXT,
			active BOOLEAN DEFAULT true,
			follow_up_required BOOLEAN DEFAULT false,
			follow_up_reason TEXT,
			last_follow_up_date DATETIME,
			sei TEXT,
			mei TEXT,
			sei_kana TEXT,
			mei_kana TEXT,
			employee_number TEXT,
			department TEXT,
			position TEXT,
			hire_date DATETIME,
			education TEXT,
			engineer_status TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
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

	err = db.Exec(`
		CREATE TABLE expense_summaries (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			year INTEGER NOT NULL,
			month INTEGER NOT NULL,
			total_amount INTEGER DEFAULT 0,
			approved_amount INTEGER DEFAULT 0,
			pending_amount INTEGER DEFAULT 0,
			rejected_amount INTEGER DEFAULT 0,
			total_count INTEGER DEFAULT 0,
			approved_count INTEGER DEFAULT 0,
			pending_count INTEGER DEFAULT 0,
			rejected_count INTEGER DEFAULT 0,
			created_at DATETIME,
			updated_at DATETIME
		)
	`).Error
	if err != nil {
		suite.T().Fatal("Failed to create expense_summaries table:", err)
	}

	suite.db = db
	suite.repository = repository.NewExpenseRepository(db, zap.NewNop())
	suite.ctx = context.Background()
}

// TearDownSuite テストスイート終了時のクリーンアップ
func (suite *ExpenseRepositoryTestSuite) TearDownSuite() {
	sqlDB, _ := suite.db.DB()
	sqlDB.Close()
}

// SetupTest 各テスト開始前の設定
func (suite *ExpenseRepositoryTestSuite) SetupTest() {
	// テストデータのクリーンアップ
	suite.db.Exec("DELETE FROM expenses")
	suite.db.Exec("DELETE FROM users")
	suite.db.Exec("DELETE FROM expense_summaries")
}

// TestExpenseRepository_Create 経費申請作成のテスト
func (suite *ExpenseRepositoryTestSuite) TestExpenseRepository_Create() {
	// テストユーザーの作成
	userID := uuid.New().String()
	suite.db.Exec("INSERT INTO users (id, email, cognito_sub, first_name, last_name, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		userID, "test@duesk.co.jp", "test-cognito-sub", "Test", "User", "Test User", time.Now(), time.Now())

	// テスト用経費申請
	expense := &model.Expense{
		ID:          uuid.New().String(),
		UserID:      userID,
		Title:       "テスト経費",
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New().String(),
		Amount:      5000,
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "テスト用の経費申請です",
		Version:     1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// 作成実行
	err := suite.repository.Create(suite.ctx, expense)

	// アサーション
	assert.NoError(suite.T(), err, "経費申請の作成が成功する")

	// データベースから確認
	var savedExpense model.Expense
	err = suite.db.Where("id = ?", expense.ID).First(&savedExpense).Error
	assert.NoError(suite.T(), err, "作成されたデータが取得できる")
	assert.Equal(suite.T(), expense.Title, savedExpense.Title, "タイトルが一致する")
	assert.Equal(suite.T(), expense.Amount, savedExpense.Amount, "金額が一致する")
	assert.Equal(suite.T(), expense.UserID, savedExpense.UserID, "ユーザーIDが一致する")
}

// TestExpenseRepository_GetByID 経費申請取得のテスト
func (suite *ExpenseRepositoryTestSuite) TestExpenseRepository_GetByID() {
	// テストユーザーの作成
	user := &model.User{
		ID:        uuid.New().String(),
		Email:     "test@duesk.co.jp",
		FirstName: "Test",
		LastName:  "User",
		Name:      "Test User",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	suite.db.Create(user)

	// テスト用経費申請をDBに直接作成
	expenseID := uuid.New().String()
	expense := &model.Expense{
		ID:          expenseID,
		UserID:      user.ID,
		Title:       "取得テスト経費",
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New().String(),
		Amount:      3000,
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "取得テスト用の経費申請",
		Version:     1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	suite.db.Create(expense)

	// 取得実行
	retrievedExpense, err := suite.repository.GetByID(suite.ctx, expenseID)

	// アサーション
	assert.NoError(suite.T(), err, "取得が成功する")
	assert.NotNil(suite.T(), retrievedExpense, "取得したデータがnilでない")
	assert.Equal(suite.T(), expense.ID, retrievedExpense.ID, "IDが一致する")
	assert.Equal(suite.T(), expense.Title, retrievedExpense.Title, "タイトルが一致する")
	assert.Equal(suite.T(), expense.Amount, retrievedExpense.Amount, "金額が一致する")
	assert.Equal(suite.T(), expense.UserID, retrievedExpense.UserID, "ユーザーIDが一致する")
}

// TestExpenseRepository_GetByID_NotFound 存在しない経費申請の取得テスト
func (suite *ExpenseRepositoryTestSuite) TestExpenseRepository_GetByID_NotFound() {
	nonExistentID := uuid.New().String()

	// 存在しないIDで取得を試行
	retrievedExpense, err := suite.repository.GetByID(suite.ctx, nonExistentID)

	// アサーション
	assert.Error(suite.T(), err, "エラーが発生する")
	assert.Equal(suite.T(), gorm.ErrRecordNotFound, err, "RecordNotFoundエラーである")
	assert.Nil(suite.T(), retrievedExpense, "取得したデータがnilである")
}

// TestExpenseRepository_Update 経費申請更新のテスト
func (suite *ExpenseRepositoryTestSuite) TestExpenseRepository_Update() {
	// テストユーザーの作成
	user := &model.User{
		ID:        uuid.New().String(),
		Email:     "test@duesk.co.jp",
		FirstName: "Test",
		LastName:  "User",
		Name:      "Test User",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	suite.db.Create(user)

	// 既存の経費申請を作成
	expenseID := uuid.New().String()
	originalExpense := &model.Expense{
		ID:          expenseID,
		UserID:      user.ID,
		Title:       "元のタイトル",
		Amount:      2000,
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New().String(),
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "元の説明",
		Version:     1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	suite.db.Create(originalExpense)

	// 更新用データ
	updatedExpense := &model.Expense{
		ID:          expenseID,
		UserID:      user.ID,
		Title:       "更新されたタイトル",
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New().String(),
		Amount:      4000,
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "更新された説明",
		Version:     1,
		CreatedAt:   originalExpense.CreatedAt,
		UpdatedAt:   time.Now(),
	}

	// 更新実行
	err := suite.repository.Update(suite.ctx, updatedExpense)

	// アサーション
	assert.NoError(suite.T(), err, "更新が成功する")

	// データベースから確認
	var savedExpense model.Expense
	err = suite.db.Where("id = ?", expenseID).First(&savedExpense).Error
	assert.NoError(suite.T(), err, "更新されたデータが取得できる")
	assert.Equal(suite.T(), "更新されたタイトル", savedExpense.Title, "タイトルが更新されている")
	assert.Equal(suite.T(), 4000, savedExpense.Amount, "金額が更新されている")
	assert.Equal(suite.T(), "更新された説明", savedExpense.Description, "説明が更新されている")
}

// TestExpenseRepository_Delete 経費申請削除のテスト
func (suite *ExpenseRepositoryTestSuite) TestExpenseRepository_Delete() {
	// テストユーザーの作成
	user := &model.User{
		ID:        uuid.New().String(),
		Email:     "test@duesk.co.jp",
		FirstName: "Test",
		LastName:  "User",
		Name:      "Test User",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	suite.db.Create(user)

	// 削除対象の経費申請を作成
	expenseID := uuid.New().String()
	expense := &model.Expense{
		ID:          expenseID,
		UserID:      user.ID,
		Title:       "削除テスト経費",
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New().String(),
		Amount:      1000,
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "削除テスト用の経費申請",
		Version:     1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	suite.db.Create(expense)

	// 削除実行
	err := suite.repository.Delete(suite.ctx, expenseID)

	// アサーション
	assert.NoError(suite.T(), err, "削除が成功する")

	// データベースから確認（削除されているか）
	var deletedExpense model.Expense
	err = suite.db.Where("id = ?", expenseID).First(&deletedExpense).Error
	assert.Error(suite.T(), err, "削除されたデータは取得できない")
	assert.Equal(suite.T(), gorm.ErrRecordNotFound, err, "RecordNotFoundエラーである")
}

// TestExpenseRepository_GetMonthlyTotal 月次合計取得のテスト
func (suite *ExpenseRepositoryTestSuite) TestExpenseRepository_GetMonthlyTotal() {
	// テストユーザーの作成
	user := &model.User{
		ID:        uuid.New().String(),
		Email:     "test@duesk.co.jp",
		FirstName: "Test",
		LastName:  "User",
		Name:      "Test User",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	suite.db.Create(user)

	// 2024年1月の経費申請を複数作成
	testDate := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	expenses := []*model.Expense{
		{
			ID:          uuid.New().String(),
			UserID:      user.ID,
			Title:       "経費1",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      1000,
			Status:      model.ExpenseStatusApproved,
			ExpenseDate: testDate,
			Description: "テスト経費1",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			UserID:      user.ID,
			Title:       "経費2",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      2000,
			Status:      model.ExpenseStatusApproved,
			ExpenseDate: testDate.Add(24 * time.Hour),
			Description: "テスト経費2",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			UserID:      user.ID,
			Title:       "経費3",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      1500,
			Status:      model.ExpenseStatusDraft, // 下書きは含まれない
			ExpenseDate: testDate.Add(48 * time.Hour),
			Description: "テスト経費3",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	for _, expense := range expenses {
		suite.db.Create(expense)
	}

	// 月次合計取得
	total, err := suite.repository.GetMonthlyTotal(suite.ctx, user.ID, 2024, 1)

	// アサーション
	assert.NoError(suite.T(), err, "月次合計取得が成功する")
	// 承認済みの経費のみの合計（1000 + 2000 = 3000）
	assert.Equal(suite.T(), 3000, total, "月次合計が正しい")
}

// TestExpenseRepository_CountPendingByUserID 保留中申請数の取得テスト
func (suite *ExpenseRepositoryTestSuite) TestExpenseRepository_CountPendingByUserID() {
	// テストユーザーの作成
	user := &model.User{
		ID:        uuid.New().String(),
		Email:     "test@duesk.co.jp",
		FirstName: "Test",
		LastName:  "User",
		Name:      "Test User",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	suite.db.Create(user)

	// 異なるステータスの経費申請を作成
	expenses := []*model.Expense{
		{
			ID:          uuid.New().String(),
			UserID:      user.ID,
			Title:       "提出済み経費1",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      1000,
			Status:      model.ExpenseStatusSubmitted, // カウント対象
			ExpenseDate: time.Now(),
			Description: "提出済み経費1",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			UserID:      user.ID,
			Title:       "提出済み経費2",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      2000,
			Status:      model.ExpenseStatusSubmitted, // カウント対象
			ExpenseDate: time.Now(),
			Description: "提出済み経費2",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			UserID:      user.ID,
			Title:       "下書き経費",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      1500,
			Status:      model.ExpenseStatusDraft, // カウント対象外
			ExpenseDate: time.Now(),
			Description: "下書き経費",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			UserID:      user.ID,
			Title:       "承認済み経費",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      3000,
			Status:      model.ExpenseStatusApproved, // カウント対象外
			ExpenseDate: time.Now(),
			Description: "承認済み経費",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	for _, expense := range expenses {
		suite.db.Create(expense)
	}

	// 保留中申請数の取得
	count, err := suite.repository.CountPendingByUserID(suite.ctx, user.ID)

	// アサーション
	assert.NoError(suite.T(), err, "保留中申請数取得が成功する")
	assert.Equal(suite.T(), int64(2), count, "保留中申請数が正しい（提出済み2件）")
}

// TestExpenseRepository_ExistsByID 存在チェックのテスト
func (suite *ExpenseRepositoryTestSuite) TestExpenseRepository_ExistsByID() {
	// テストユーザーの作成
	user := &model.User{
		ID:        uuid.New().String(),
		Email:     "test@duesk.co.jp",
		FirstName: "Test",
		LastName:  "User",
		Name:      "Test User",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	suite.db.Create(user)

	// 存在する経費申請を作成
	existingID := uuid.New().String()
	expense := &model.Expense{
		ID:          existingID,
		UserID:      user.ID,
		Title:       "存在チェック経費",
		Category:    model.ExpenseCategoryOther,
		CategoryID:  uuid.New().String(),
		Amount:      1000,
		Status:      model.ExpenseStatusDraft,
		ExpenseDate: time.Now(),
		Description: "存在チェック用経費",
		Version:     1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	suite.db.Create(expense)

	// 存在する場合のテスト
	exists, err := suite.repository.ExistsByID(suite.ctx, existingID)
	assert.NoError(suite.T(), err, "存在チェックが成功する")
	assert.True(suite.T(), exists, "存在する経費申請でtrueが返される")

	// 存在しない場合のテスト
	nonExistentID := uuid.New().String()
	exists, err = suite.repository.ExistsByID(suite.ctx, nonExistentID)
	assert.NoError(suite.T(), err, "存在チェックが成功する")
	assert.False(suite.T(), exists, "存在しない経費申請でfalseが返される")
}

// TestExpenseRepository_ListByUserID ユーザー別一覧取得のテスト
func (suite *ExpenseRepositoryTestSuite) TestExpenseRepository_ListByUserID() {
	// テストユーザーの作成
	user1 := &model.User{
		ID:        uuid.New().String(),
		Email:     "test1@duesk.co.jp",
		FirstName: "Test",
		LastName:  "User 1",
		Name:      "Test User 1",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	user2 := &model.User{
		ID:        uuid.New().String(),
		Email:     "test2@duesk.co.jp",
		FirstName: "Test",
		LastName:  "User 2",
		Name:      "Test User 2",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	suite.db.Create(user1)
	suite.db.Create(user2)

	// 複数ユーザーの経費申請を作成
	expenses := []*model.Expense{
		{
			ID:          uuid.New().String(),
			UserID:      user1.ID, // user1の経費
			Title:       "User1経費1",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      1000,
			Status:      model.ExpenseStatusDraft,
			ExpenseDate: time.Now(),
			Description: "User1の経費1",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			UserID:      user1.ID, // user1の経費
			Title:       "User1経費2",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      2000,
			Status:      model.ExpenseStatusSubmitted,
			ExpenseDate: time.Now(),
			Description: "User1の経費2",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New().String(),
			UserID:      user2.ID, // user2の経費（含まれない）
			Title:       "User2経費1",
			Category:    model.ExpenseCategoryOther,
			CategoryID:  uuid.New().String(),
			Amount:      1500,
			Status:      model.ExpenseStatusDraft,
			ExpenseDate: time.Now(),
			Description: "User2の経費1",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	for _, expense := range expenses {
		suite.db.Create(expense)
	}

	// User1の経費一覧を取得
	filter := &dto.ExpenseFilterRequest{
		Page:  1,
		Limit: 10,
	}
	expenseList, total, err := suite.repository.ListByUserID(suite.ctx, user1.ID, filter)

	// アサーション
	assert.NoError(suite.T(), err, "ユーザー別一覧取得が成功する")
	assert.Equal(suite.T(), int64(2), total, "User1の経費申請が2件")
	assert.Len(suite.T(), expenseList, 2, "取得した一覧に2件含まれる")

	// 各経費申請がUser1のものであることを確認
	for _, expense := range expenseList {
		assert.Equal(suite.T(), user1.ID, expense.UserID, "すべてUser1の経費申請である")
	}
}

// TestExpenseRepositoryTestSuite_Run テストスイートの実行
func TestExpenseRepositoryTestSuite_Run(t *testing.T) {
	suite.Run(t, new(ExpenseRepositoryTestSuite))
}

// TestExpenseRepository_Basic 基本的なリポジトリテスト（非スイート）
func TestExpenseRepository_Basic(t *testing.T) {
	t.Run("ExpenseRepositoryインターフェースの確認", func(t *testing.T) {
		// インメモリデータベースの作成
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
		assert.NoError(t, err, "テストデータベースの作成が成功する")

		// リポジトリの作成
		repo := repository.NewExpenseRepository(db, zap.NewNop())
		assert.NotNil(t, repo, "リポジトリが正常に作成される")

		// インターフェースの実装確認
		var _ repository.ExpenseRepository = repo
	})

	t.Run("ロガーの設定テスト", func(t *testing.T) {
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
		assert.NoError(t, err, "テストデータベースの作成が成功する")

		repo := repository.NewExpenseRepository(db, zap.NewNop())
		newLogger := zap.NewNop()

		// ロガーの設定
		repo.SetLogger(newLogger)

		// エラーが発生しないことを確認（ロガーの設定が正常に動作）
		assert.NotNil(t, repo, "ロガー設定後もリポジトリが有効")
	})
}
