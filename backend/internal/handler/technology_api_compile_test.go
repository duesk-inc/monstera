package handler_test

import (
	"testing"

	"github.com/duesk/monstera/internal/handler"
	"github.com/stretchr/testify/assert"
)

// コンパイル可能であることを確認するテスト
func TestTechnologyAPICompiles(t *testing.T) {
	// ハンドラーの型が存在することを確認
	var h *handler.WorkHistoryHandler
	assert.Nil(t, h) // 初期値はnil

	// メソッドが存在することを確認（コンパイル時チェック）
	type TechAPIHandler interface {
		GetTechnologySuggestions(c *gin.Context)
		GetPopularTechnologies(c *gin.Context)
		GetTechnologyCategories(c *gin.Context)
	}

	// WorkHistoryHandlerがTechAPIHandlerインターフェースを実装していることを確認
	var _ TechAPIHandler = (*handler.WorkHistoryHandler)(nil)

	t.Log("技術候補APIのすべてのメソッドが正しく定義されています")
}
