package test

import (
	"testing"

	"github.com/duesk/monstera/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestUserModelCognitoIntegration Userモデルの統合テスト
func TestUserModelCognitoIntegration(t *testing.T) {
	// UserモデルのID型がstringになっていることを確認
	user := &model.User{
		ID:    "test-cognito-sub-123",
		Email: "test@example.com",
		Name:  "Test User",
	}

	// IDフィールドがstring型であることを確認
	assert.IsType(t, "", user.ID)
	assert.Equal(t, "test-cognito-sub-123", user.ID)

	// Passwordフィールドが存在しないことを確認（コンパイルエラーになるはず）
	// 以下の行はコメントアウトしておく（実際にはPasswordフィールドが削除されているためコンパイルエラーになる）
	// user.Password = "test" // このフィールドは存在しない
}

// TestUserIDMigration UserID型の移行テスト
func TestUserIDMigration(t *testing.T) {
	// 移行前のUUID型の例
	oldID := "550e8400-e29b-41d4-a716-446655440000"

	// 移行後のCognito Sub形式の例
	newID := "us-east-1_abc123def"

	// どちらの形式もstring型として扱えることを確認
	var userID string

	userID = oldID
	assert.Equal(t, oldID, userID)

	userID = newID
	assert.Equal(t, newID, userID)
}

// TestRelatedModelsUserID 関連モデルのUserIDフィールドテスト
func TestRelatedModelsUserID(t *testing.T) {
	cognitoSub := "test-cognito-sub-456"

	// Archive モデル
	archive := &model.Archive{
		UserID: cognitoSub,
	}
	assert.Equal(t, cognitoSub, archive.UserID)

	// Notification モデル
	notification := &model.Notification{
		UserID: cognitoSub,
	}
	assert.Equal(t, cognitoSub, notification.UserID)

	// SalesActivity モデル
	salesActivity := &model.SalesActivity{
		UserID: cognitoSub,
	}
	assert.Equal(t, cognitoSub, salesActivity.UserID)
}

// TestExpenseLimitUserID ExpenseLimitのUserIDフィールドテスト
func TestExpenseLimitUserID(t *testing.T) {
	cognitoSub := "test-cognito-sub-789"

	// ExpenseLimit モデル（UserIDはポインタ型）
	expenseLimit := &model.ExpenseLimit{
		UserID: &cognitoSub,
	}

	require.NotNil(t, expenseLimit.UserID)
	assert.Equal(t, cognitoSub, *expenseLimit.UserID)
}
