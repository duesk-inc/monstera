package middleware

import (
	"net/http"

	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AdminRequired 管理者権限チェックミドルウェア
func AdminRequired(logger *zap.Logger) gin.HandlerFunc {
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
			c.JSON(http.StatusForbidden, gin.H{"error": "管理者権限が必要です"})
			c.Abort()
			return
		}

		role, err := model.ParseRole(roleStr)
		if err != nil || !role.IsAdmin() {
			logger.Warn("Unauthorized admin access attempt",
				zap.Any("user_id", userID),
				zap.String("role", roleStr))
			c.JSON(http.StatusForbidden, gin.H{"error": "管理者権限が必要です"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// PermissionRequired 特定権限チェックミドルウェア
func PermissionRequired(permission string, rolePermissionRepo repository.RolePermissionRepository, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// ロールを取得
		roleValue, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
			c.Abort()
			return
		}

		role, ok := roleValue.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ロール情報が不正です"})
			c.Abort()
			return
		}

		// 権限をチェック
		ctx := c.Request.Context()
		hasPermission, err := rolePermissionRepo.HasPermission(ctx, role, permission)
		if err != nil {
			logger.Error("Failed to check permission",
				zap.Error(err),
				zap.String("role", role),
				zap.String("permission", permission))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "権限チェックに失敗しました"})
			c.Abort()
			return
		}

		if !hasPermission {
			logger.Warn("Permission denied",
				zap.String("role", role),
				zap.String("permission", permission),
				zap.Any("user_id", c.GetString("user_id")))
			c.JSON(http.StatusForbidden, gin.H{"error": "この操作を行う権限がありません"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ResourceOwnerOrAdmin リソースの所有者または管理者のみアクセス可能にするミドルウェア
func ResourceOwnerOrAdmin(resourceOwnerIDKey string, logger *zap.Logger) gin.HandlerFunc {
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

		// 管理者権限以上の場合は常にアクセス許可
		if roleStr, ok := roleValue.(string); ok {
			role, err := model.ParseRole(roleStr)
			if err == nil && role.IsAdmin() {
				c.Next()
				return
			}
		}

		// リソースの所有者IDを取得
		resourceOwnerID := c.Param(resourceOwnerIDKey)
		if resourceOwnerID == "" {
			// パラメータになければクエリから取得を試みる
			resourceOwnerID = c.Query(resourceOwnerIDKey)
		}

		// ユーザーIDとリソース所有者IDを比較
		if userID == resourceOwnerID {
			c.Next()
			return
		}

		logger.Warn("Access denied to resource",
			zap.Any("user_id", userID),
			zap.String("resource_owner_id", resourceOwnerID))
		c.JSON(http.StatusForbidden, gin.H{"error": "このリソースへのアクセス権限がありません"})
		c.Abort()
	}
}
