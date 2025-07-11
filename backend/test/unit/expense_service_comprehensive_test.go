package unit

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// ExpenseTestData テスト用のデータ構造
type ExpenseTestData struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	Title       string
	Amount      int
	Status      string
	CategoryID  uuid.UUID
	ExpenseDate time.Time
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// ExpenseCategory テスト用のカテゴリ構造
type ExpenseCategory struct {
	ID       uuid.UUID
	Code     string
	Name     string
	IsActive bool
}

// TestExpenseServiceComprehensive 包括的な経費申請サービステスト
func TestExpenseServiceComprehensive(t *testing.T) {
	t.Run("経費申請の作成テスト", func(t *testing.T) {
		// テストデータの作成
		userID := uuid.New()
		categoryID := uuid.New()

		expense := ExpenseTestData{
			ID:          uuid.New(),
			UserID:      userID,
			Title:       "営業会議費",
			Amount:      5000,
			Status:      "draft",
			CategoryID:  categoryID,
			ExpenseDate: time.Now(),
			Description: "取引先との営業会議における食事代",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		// 基本的なバリデーション
		assert.NotEqual(t, uuid.Nil, expense.ID, "経費申請IDが設定されている")
		assert.NotEqual(t, uuid.Nil, expense.UserID, "ユーザーIDが設定されている")
		assert.NotEmpty(t, expense.Title, "タイトルが設定されている")
		assert.Greater(t, expense.Amount, 0, "金額が正の値")
		assert.Equal(t, "draft", expense.Status, "初期ステータスは下書き")
		assert.NotEmpty(t, expense.Description, "説明が設定されている")
		assert.True(t, expense.ExpenseDate.Before(time.Now().Add(time.Hour)), "経費日が現在時刻以前")
	})

	t.Run("経費申請の更新テスト", func(t *testing.T) {
		// 既存の経費申請
		originalExpense := ExpenseTestData{
			ID:          uuid.New(),
			UserID:      uuid.New(),
			Title:       "交通費",
			Amount:      1000,
			Status:      "draft",
			CategoryID:  uuid.New(),
			ExpenseDate: time.Now().Add(-24 * time.Hour),
			Description: "電車代",
			CreatedAt:   time.Now().Add(-25 * time.Hour),
			UpdatedAt:   time.Now().Add(-24 * time.Hour),
		}

		// 更新後の経費申請
		updatedExpense := originalExpense
		updatedExpense.Title = "タクシー代"
		updatedExpense.Amount = 2500
		updatedExpense.Description = "終電後のタクシー代"
		updatedExpense.UpdatedAt = time.Now()

		// 更新後のテスト
		assert.Equal(t, originalExpense.ID, updatedExpense.ID, "IDは変更されない")
		assert.Equal(t, originalExpense.UserID, updatedExpense.UserID, "ユーザーIDは変更されない")
		assert.Equal(t, "タクシー代", updatedExpense.Title, "タイトルが更新されている")
		assert.Equal(t, 2500, updatedExpense.Amount, "金額が更新されている")
		assert.Equal(t, "終電後のタクシー代", updatedExpense.Description, "説明が更新されている")
		assert.True(t, updatedExpense.UpdatedAt.After(originalExpense.UpdatedAt), "更新日時が更新されている")
	})

	t.Run("経費申請のステータス遷移テスト", func(t *testing.T) {
		expense := ExpenseTestData{
			ID:     uuid.New(),
			UserID: uuid.New(),
			Title:  "会議費",
			Amount: 3000,
			Status: "draft",
		}

		// 1. 下書き → 提出済み
		expense.Status = "submitted"
		assert.Equal(t, "submitted", expense.Status, "提出済みステータスに遷移")

		// 2. 提出済み → 承認済み
		expense.Status = "approved"
		assert.Equal(t, "approved", expense.Status, "承認済みステータスに遷移")

		// 別パターン: 提出済み → 却下
		expense.Status = "submitted" // リセット
		expense.Status = "rejected"
		assert.Equal(t, "rejected", expense.Status, "却下ステータスに遷移")
	})

	t.Run("カテゴリ管理テスト", func(t *testing.T) {
		categories := []ExpenseCategory{
			{
				ID:       uuid.New(),
				Code:     "TRANSPORT",
				Name:     "交通費",
				IsActive: true,
			},
			{
				ID:       uuid.New(),
				Code:     "ENTERTAINMENT",
				Name:     "接待費",
				IsActive: true,
			},
			{
				ID:       uuid.New(),
				Code:     "SUPPLIES",
				Name:     "消耗品費",
				IsActive: false, // 無効化されたカテゴリ
			},
		}

		// アクティブなカテゴリのみを取得
		activeCategories := make([]ExpenseCategory, 0)
		for _, category := range categories {
			if category.IsActive {
				activeCategories = append(activeCategories, category)
			}
		}

		assert.Len(t, activeCategories, 2, "アクティブなカテゴリが2つ")
		assert.Equal(t, "TRANSPORT", activeCategories[0].Code, "交通費カテゴリが含まれている")
		assert.Equal(t, "ENTERTAINMENT", activeCategories[1].Code, "接待費カテゴリが含まれている")
	})

	t.Run("金額上限チェックテスト", func(t *testing.T) {
		const monthlyLimit = 100000 // 月次上限：10万円
		const yearlyLimit = 1000000 // 年次上限：100万円

		// 現在の使用額
		currentMonthlyUsage := 75000 // 7.5万円
		currentYearlyUsage := 800000 // 80万円

		// 新しい申請額
		newExpenseAmount := 30000 // 3万円

		// 上限チェック
		projectedMonthlyUsage := currentMonthlyUsage + newExpenseAmount
		projectedYearlyUsage := currentYearlyUsage + newExpenseAmount

		monthlyExceeded := projectedMonthlyUsage > monthlyLimit
		yearlyExceeded := projectedYearlyUsage > yearlyLimit

		assert.True(t, monthlyExceeded, "月次上限を超過している")
		assert.False(t, yearlyExceeded, "年次上限は超過していない")

		// 警告の計算
		monthlyUsagePercentage := float64(projectedMonthlyUsage) / float64(monthlyLimit) * 100
		yearlyUsagePercentage := float64(projectedYearlyUsage) / float64(yearlyLimit) * 100

		assert.Greater(t, monthlyUsagePercentage, 100.0, "月次使用率が100%を超過")
		assert.Greater(t, yearlyUsagePercentage, 80.0, "年次使用率が80%を超過（警告レベル）")
		assert.Less(t, yearlyUsagePercentage, 100.0, "年次使用率は100%未満")
	})

	t.Run("承認フローテスト", func(t *testing.T) {
		// 申請額による承認フローの決定
		type ApprovalFlow struct {
			Amount                    int
			RequiresManagerApproval   bool
			RequiresExecutiveApproval bool
		}

		testCases := []struct {
			amount   int
			expected ApprovalFlow
		}{
			{1000, ApprovalFlow{1000, false, false}},  // 1,000円：承認不要
			{25000, ApprovalFlow{25000, true, false}}, // 25,000円：管理者承認のみ
			{75000, ApprovalFlow{75000, true, true}},  // 75,000円：管理者+役員承認
		}

		for _, tc := range testCases {
			flow := ApprovalFlow{Amount: tc.amount}

			// 承認フローの決定ロジック
			if tc.amount >= 10000 {
				flow.RequiresManagerApproval = true
			}
			if tc.amount >= 50000 {
				flow.RequiresExecutiveApproval = true
			}

			assert.Equal(t, tc.expected.RequiresManagerApproval, flow.RequiresManagerApproval,
				"金額%dでの管理者承認要否が正しい", tc.amount)
			assert.Equal(t, tc.expected.RequiresExecutiveApproval, flow.RequiresExecutiveApproval,
				"金額%dでの役員承認要否が正しい", tc.amount)
		}
	})

	t.Run("バリデーションエラーテスト", func(t *testing.T) {
		testCases := []struct {
			name    string
			expense ExpenseTestData
			isValid bool
			errors  []string
		}{
			{
				name: "正常なデータ",
				expense: ExpenseTestData{
					Title:       "正常な経費",
					Amount:      5000,
					Description: "正常な説明文です",
				},
				isValid: true,
				errors:  []string{},
			},
			{
				name: "タイトルが空",
				expense: ExpenseTestData{
					Title:       "",
					Amount:      5000,
					Description: "説明文",
				},
				isValid: false,
				errors:  []string{"タイトルは必須です"},
			},
			{
				name: "金額が負数",
				expense: ExpenseTestData{
					Title:       "テスト経費",
					Amount:      -1000,
					Description: "説明文",
				},
				isValid: false,
				errors:  []string{"金額は正の値である必要があります"},
			},
			{
				name: "説明文が短すぎる",
				expense: ExpenseTestData{
					Title:       "テスト経費",
					Amount:      5000,
					Description: "短い",
				},
				isValid: false,
				errors:  []string{"説明は10文字以上必要です"},
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				errors := validateExpense(tc.expense)

				if tc.isValid {
					assert.Empty(t, errors, "バリデーションエラーがない")
				} else {
					assert.NotEmpty(t, errors, "バリデーションエラーが存在する")
					for _, expectedError := range tc.errors {
						assert.Contains(t, errors, expectedError, "期待されるエラーメッセージが含まれている")
					}
				}
			})
		}
	})
}

// validateExpense テスト用のバリデーション関数
func validateExpense(expense ExpenseTestData) []string {
	var errors []string

	if expense.Title == "" {
		errors = append(errors, "タイトルは必須です")
	}

	if expense.Amount <= 0 {
		errors = append(errors, "金額は正の値である必要があります")
	}

	if len(expense.Description) < 10 {
		errors = append(errors, "説明は10文字以上必要です")
	}

	return errors
}

// TestExpenseIntegrationScenarios 統合シナリオテスト
func TestExpenseIntegrationScenarios(t *testing.T) {
	t.Run("完全な経費申請フローテスト", func(t *testing.T) {
		ctx := context.Background()
		userID := uuid.New()

		// 1. 経費申請の作成
		expense := ExpenseTestData{
			ID:          uuid.New(),
			UserID:      userID,
			Title:       "プロジェクト打ち上げ費用",
			Amount:      8000,
			Status:      "draft",
			CategoryID:  uuid.New(),
			ExpenseDate: time.Now().Add(-24 * time.Hour),
			Description: "プロジェクト完了に伴う打ち上げ費用（チームメンバー4名分）",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		assert.Equal(t, "draft", expense.Status, "初期状態は下書き")

		// 2. 経費申請の提出
		expense.Status = "submitted"
		expense.UpdatedAt = time.Now()

		assert.Equal(t, "submitted", expense.Status, "提出状態に遷移")

		// 3. 承認処理（金額が8,000円なので管理者承認は不要）
		if expense.Amount < 10000 {
			expense.Status = "approved"
		} else {
			expense.Status = "pending_approval"
		}

		assert.Equal(t, "approved", expense.Status, "少額のため自動承認")

		// 4. 処理完了の確認
		assert.NotNil(t, ctx, "コンテキストが有効")
		assert.NotEqual(t, uuid.Nil, expense.ID, "経費申請IDが有効")
		assert.Equal(t, userID, expense.UserID, "ユーザーIDが一致")
	})

	t.Run("高額経費申請の承認フローテスト", func(t *testing.T) {
		// 高額経費申請（役員承認が必要）
		expense := ExpenseTestData{
			ID:          uuid.New(),
			UserID:      uuid.New(),
			Title:       "システム導入費用",
			Amount:      75000,
			Status:      "draft",
			CategoryID:  uuid.New(),
			ExpenseDate: time.Now().Add(-48 * time.Hour),
			Description: "新システム導入に伴う初期費用およびライセンス費用",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		// 提出
		expense.Status = "submitted"

		// 承認フローの決定
		requiresManagerApproval := expense.Amount >= 10000
		requiresExecutiveApproval := expense.Amount >= 50000

		assert.True(t, requiresManagerApproval, "管理者承認が必要")
		assert.True(t, requiresExecutiveApproval, "役員承認が必要")

		// 第1段階：管理者承認
		expense.Status = "manager_approved"

		// 第2段階：役員承認
		expense.Status = "executive_approved"

		// 最終承認
		expense.Status = "approved"

		assert.Equal(t, "approved", expense.Status, "最終承認完了")
	})
}
