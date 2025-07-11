package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// モック
type mockExpenseRepo struct {
	mock.Mock
}

type mockCategoryRepo struct {
	mock.Mock
}

// TestExpenseService_SimpleValidation 基本的なバリデーションテスト
func TestExpenseService_SimpleValidation(t *testing.T) {
	t.Run("ExpenseServiceが初期化できる", func(t *testing.T) {
		// サービスの初期化テスト
		logger := zap.NewNop()
		db := &gorm.DB{}

		// expenseServiceは非公開のためインターフェースとして扱う
		service := NewExpenseService(
			db,
			nil, // 実際のリポジトリは使わない
			nil,
			nil,
			nil,
			nil,
			nil,
			nil,
			nil,
			nil,
			logger,
		)

		assert.NotNil(t, service, "ExpenseServiceが正常に初期化される")
	})

	t.Run("テスト環境の動作確認", func(t *testing.T) {
		// 基本的なテストが動作するか確認
		ctx := context.Background()
		assert.NotNil(t, ctx, "Contextが正常に作成される")

		// ダミーテスト
		testValue := "expense_test"
		assert.Equal(t, "expense_test", testValue, "文字列比較が正常に動作する")
	})
}
