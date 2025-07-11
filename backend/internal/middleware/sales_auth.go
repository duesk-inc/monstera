package middleware

import (
	"net/http"

	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SalesPermission 営業権限の詳細設定
type SalesPermission struct {
	Resource string // リソース名（proposals, interviews等）
	Action   string // アクション（create, read, update, delete等）
	Scope    string // アクセス範囲（all, owned, team）
}

// SalesRoleRequired 営業ロールが必要なエンドポイント用ミドルウェア
func SalesRoleRequired(allowedRoles ...model.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		// ユーザーIDとロールを取得
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
			c.Abort()
			return
		}

		roleValue, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
			c.Abort()
			return
		}

		roleStr, ok := roleValue.(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "営業機能へのアクセス権限がありません"})
			c.Abort()
			return
		}

		role, err := model.ParseRoleExtended(roleStr)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "営業機能へのアクセス権限がありません"})
			c.Abort()
			return
		}

		// 権限チェック
		hasPermission := false
		for _, allowedRole := range allowedRoles {
			if role.HasSalesPermission(allowedRole) {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{"error": getSalesPermissionErrorMessage(allowedRoles)})
			c.Abort()
			return
		}

		// 営業担当者の場合、自分の担当分のみにフィルタリング
		if role == model.RoleSalesRep && !role.IsAdmin() {
			c.Set("filter_by_owner", userID)
		}

		c.Next()
	}
}

// SalesResourcePermission リソース単位での細かい権限制御
func SalesResourcePermission(db *gorm.DB, resource string, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// ユーザーロールを取得
		roleValue, _ := c.Get("role")
		roleStr, _ := roleValue.(string)
		role, _ := model.ParseRoleExtended(roleStr)

		// 管理者は全権限を持つ
		if role.IsAdmin() {
			c.Next()
			return
		}

		// 営業ロールでない場合は拒否
		if !role.IsSalesRole() {
			c.JSON(http.StatusForbidden, gin.H{"error": "営業機能へのアクセス権限がありません"})
			c.Abort()
			return
		}

		// データベースから権限設定を取得
		var permission struct {
			Scope string `gorm:"column:scope"`
		}

		roleType := "sales_rep"
		if role == model.RoleSalesManager {
			roleType = "sales_manager"
		}

		err := db.Table("sales_role_permissions").
			Where("role_type = ? AND resource = ? AND action = ?", roleType, resource, action).
			Select("scope").
			First(&permission).Error

		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "この操作を行う権限がありません"})
			c.Abort()
			return
		}

		// スコープに基づいてフィルタリング
		userID, _ := c.Get("user_id")
		switch permission.Scope {
		case "owned":
			c.Set("filter_by_owner", userID)
		case "team":
			// チームメンバーのIDを設定（将来実装）
			c.Set("filter_by_team", true)
		case "all":
			// フィルタリングなし
		}

		c.Next()
	}
}

// getSalesPermissionErrorMessage ロールに応じたエラーメッセージを取得
func getSalesPermissionErrorMessage(roles []model.Role) string {
	if len(roles) == 0 {
		return "営業機能へのアクセス権限がありません"
	}

	// 必要なロールが1つの場合
	if len(roles) == 1 {
		switch roles[0] {
		case model.RoleSalesManager:
			return "営業管理者権限が必要です"
		case model.RoleSalesRep:
			return "営業担当者以上の権限が必要です"
		default:
			return "適切な権限が必要です"
		}
	}

	// 複数のロールが許可されている場合
	return "営業関連の権限が必要です"
}

// CheckProposalOwnership 提案の所有者確認ミドルウェア
func CheckProposalOwnership(db *gorm.DB, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// filter_by_ownerが設定されていない場合はスキップ
		filterValue, exists := c.Get("filter_by_owner")
		if !exists {
			c.Next()
			return
		}

		userID, _ := filterValue.(string)
		proposalID := c.Param("id")

		// 提案の所有者を確認
		var count int64
		err := db.Table("proposals").
			Where("id = ? AND created_by = ? AND deleted_at IS NULL", proposalID, userID).
			Count(&count).Error

		if err != nil || count == 0 {
			logger.Warn("Unauthorized proposal access attempt",
				zap.String("user_id", userID),
				zap.String("proposal_id", proposalID))
			c.JSON(http.StatusForbidden, gin.H{"error": "この提案にアクセスする権限がありません"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// CheckInterviewOwnership 面談の所有者確認ミドルウェア
func CheckInterviewOwnership(db *gorm.DB, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// filter_by_ownerが設定されていない場合はスキップ
		filterValue, exists := c.Get("filter_by_owner")
		if !exists {
			c.Next()
			return
		}

		userID, _ := filterValue.(string)
		interviewID := c.Param("id")

		// 面談に紐づく提案の所有者を確認
		var count int64
		err := db.Table("interview_schedules i").
			Joins("JOIN proposals p ON i.proposal_id = p.id").
			Where("i.id = ? AND p.created_by = ? AND i.deleted_at IS NULL", interviewID, userID).
			Count(&count).Error

		if err != nil || count == 0 {
			logger.Warn("Unauthorized interview access attempt",
				zap.String("user_id", userID),
				zap.String("interview_id", interviewID))
			c.JSON(http.StatusForbidden, gin.H{"error": "この面談にアクセスする権限がありません"})
			c.Abort()
			return
		}

		c.Next()
	}
}
