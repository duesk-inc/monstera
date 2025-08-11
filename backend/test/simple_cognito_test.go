package test

import (
	"testing"

	"github.com/duesk/monstera/internal/model"
	"github.com/stretchr/testify/assert"
)

// TestUserModelBasic Userモデルの基本的なテスト
func TestUserModelBasic(t *testing.T) {
	// UserモデルのID型がstringになっていることを確認
	user := &model.User{
		ID:        "test-cognito-sub-123",
		Email:     "test@example.com",
		FirstName: "Test",
		LastName:  "User",
		Name:      "Test User",
	}

	// IDフィールドがstring型であることを確認
	assert.IsType(t, "", user.ID)
	assert.Equal(t, "test-cognito-sub-123", user.ID)
	assert.Equal(t, "test@example.com", user.Email)
	assert.Equal(t, "Test User", user.Name)
}
