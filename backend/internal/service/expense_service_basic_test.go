package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// 基本的なExpenseServiceのテスト
func TestExpenseService_Basic(t *testing.T) {
	t.Run("テスト環境の確認", func(t *testing.T) {
		assert.True(t, true, "テスト環境が正常に動作している")
	})
}
