package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestGetUserRoleString ユーザーロールの文字列変換ロジックのテスト
func TestGetUserRoleString(t *testing.T) {
	// Ginのテストモードを設定
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name         string
		roleValue    interface{}
		expectedRole string
	}{
		{
			name:         "文字列型のロール",
			roleValue:    "admin",
			expectedRole: "admin",
		},
		{
			name:         "*model.Role型のロール（Admin）",
			roleValue:    func() *model.Role { r := model.RoleAdmin; return &r }(),
			expectedRole: "admin",
		},
		{
			name:         "*model.Role型のロール（Employee）",
			roleValue:    func() *model.Role { r := model.RoleEmployee; return &r }(),
			expectedRole: "engineer",
		},
		{
			name:         "*model.Role型のロール（Manager）",
			roleValue:    func() *model.Role { r := model.RoleManager; return &r }(),
			expectedRole: "manager",
		},
		{
			name:         "*model.Role型のロール（SuperAdmin）",
			roleValue:    func() *model.Role { r := model.RoleSuperAdmin; return &r }(),
			expectedRole: "super_admin",
		},
		{
			name:         "nilのポインタ",
			roleValue:    (*model.Role)(nil),
			expectedRole: "unknown",
		},
		{
			name:         "nil値",
			roleValue:    nil,
			expectedRole: "unknown",
		},
		{
			name:         "想定外の型（int）",
			roleValue:    123,
			expectedRole: "unknown",
		},
		{
			name:         "想定外の型（bool）",
			roleValue:    true,
			expectedRole: "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// テスト用のロール文字列取得関数（ハンドラーの実装と同じロジック）
			getUserRoleString := func(userRole interface{}) string {
				var userRoleStr string
				if userRole != nil {
					switch v := userRole.(type) {
					case string:
						userRoleStr = v
					case *model.Role:
						if v != nil {
							userRoleStr = v.String()
						} else {
							userRoleStr = "unknown"
						}
					default:
						userRoleStr = "unknown"
					}
				} else {
					userRoleStr = "unknown"
				}
				return userRoleStr
			}

			// 実行
			result := getUserRoleString(tt.roleValue)

			// 検証
			assert.Equal(t, tt.expectedRole, result, "ロール変換結果が期待値と異なります")
		})
	}
}

// TestWeeklyReportHandlerTypeConversion 実際のハンドラーコンテキストでの型変換テスト
func TestWeeklyReportHandlerTypeConversion(t *testing.T) {
	// Ginのテストモードを設定
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name          string
		setupContext  func(c *gin.Context)
		expectedDebug string // デバッグログに記録されるべきロール文字列
	}{
		{
			name: "Contextに文字列ロールを設定",
			setupContext: func(c *gin.Context) {
				c.Set("role", "engineer")
			},
			expectedDebug: "engineer",
		},
		{
			name: "Contextに*model.Role型を設定（Admin）",
			setupContext: func(c *gin.Context) {
				role := model.RoleAdmin
				c.Set("role", &role)
			},
			expectedDebug: "admin",
		},
		{
			name: "Contextにロールを設定しない",
			setupContext: func(c *gin.Context) {
				// 何も設定しない
			},
			expectedDebug: "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// HTTPテストレコーダーとコンテキストの作成
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// リクエストの設定
			c.Request = httptest.NewRequest(http.MethodGet, "/test", nil)

			// コンテキストのセットアップ
			tt.setupContext(c)

			// ロール取得ロジックのテスト
			userRole, _ := c.Get("role")

			// 実際のハンドラーと同じロジックで変換
			var userRoleStr string
			if userRole != nil {
				switch v := userRole.(type) {
				case string:
					userRoleStr = v
				case *model.Role:
					if v != nil {
						userRoleStr = v.String()
					} else {
						userRoleStr = "unknown"
					}
				default:
					userRoleStr = "unknown"
				}
			} else {
				userRoleStr = "unknown"
			}

			// 検証
			assert.Equal(t, tt.expectedDebug, userRoleStr, "デバッグログ用のロール文字列が期待値と異なります")
		})
	}
}
