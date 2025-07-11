package middleware

import (
	"net/http"

	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RequireManagerRole マネージャー権限以上（マネージャー、管理者、スーパー管理者）を要求するミドルウェア
func RequireManagerRole(logger *zap.Logger) gin.HandlerFunc {
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
			logger.Warn("Invalid role type",
				zap.Any("user_id", userID),
				zap.Any("role", roleValue))
			c.JSON(http.StatusForbidden, gin.H{"error": "マネージャー権限以上が必要です"})
			c.Abort()
			return
		}

		role, err := model.ParseRole(roleStr)
		if err != nil || !role.IsManager() {
			logger.Warn("Unauthorized manager access attempt",
				zap.Any("user_id", userID),
				zap.String("role", roleStr))
			c.JSON(http.StatusForbidden, gin.H{"error": "マネージャー権限以上が必要です"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireRole 指定されたロール以上の権限を要求するミドルウェア
func RequireRole(requiredRole model.Role, logger *zap.Logger) gin.HandlerFunc {
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
			logger.Warn("Invalid role type",
				zap.Any("user_id", userID),
				zap.Any("role", roleValue))
			c.JSON(http.StatusForbidden, gin.H{"error": getPermissionErrorMessage(requiredRole)})
			c.Abort()
			return
		}

		role, err := model.ParseRole(roleStr)
		if err != nil || !role.HasPermission(requiredRole) {
			logger.Warn("Unauthorized access attempt",
				zap.Any("user_id", userID),
				zap.String("role", roleStr),
				zap.String("required_role", requiredRole.String()))
			c.JSON(http.StatusForbidden, gin.H{"error": getPermissionErrorMessage(requiredRole)})
			c.Abort()
			return
		}

		c.Next()
	}
}

// getPermissionErrorMessage ロールに応じたエラーメッセージを取得
func getPermissionErrorMessage(role model.Role) string {
	switch role {
	case model.RoleSuperAdmin:
		return "スーパー管理者権限が必要です"
	case model.RoleAdmin:
		return "管理者権限以上が必要です"
	case model.RoleManager:
		return "マネージャー権限以上が必要です"
	default:
		return "権限が不足しています"
	}
}
