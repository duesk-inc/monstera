package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/utils"
)

// AccountingPermissionRequired 経理機能の権限チェックミドルウェア
func AccountingPermissionRequired(
	action string,
	rolePermissionRepo repository.RolePermissionRepository,
	logger *zap.Logger,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		// ユーザーIDを取得
		userID, exists := c.Get("userID")
		if !exists {
			logger.Warn("User ID not found in context")
			utils.RespondError(c, http.StatusUnauthorized, "認証が必要です")
			c.Abort()
			return
		}

		userUUID, ok := userID.(uuid.UUID)
		if !ok {
			logger.Error("Invalid user ID type in context",
				zap.Any("userID", userID))
			utils.RespondError(c, http.StatusInternalServerError, "ユーザーID形式エラー")
			c.Abort()
			return
		}

		// 経理権限をチェック
		hasPermission, err := checkAccountingPermission(c, userUUID, action, rolePermissionRepo, logger)
		if err != nil {
			logger.Error("Failed to check accounting permission",
				zap.String("userID", userUUID.String()),
				zap.String("action", action),
				zap.Error(err))
			utils.RespondError(c, http.StatusInternalServerError, "権限チェックエラー")
			c.Abort()
			return
		}

		if !hasPermission {
			logger.Warn("User lacks accounting permission",
				zap.String("userID", userUUID.String()),
				zap.String("action", action),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method))
			utils.RespondError(c, http.StatusForbidden, "経理機能の権限がありません")
			c.Abort()
			return
		}

		logger.Debug("Accounting permission granted",
			zap.String("userID", userUUID.String()),
			zap.String("action", action))

		c.Next()
	}
}

// AccountingReadPermissionRequired 経理機能の読み取り権限チェック
func AccountingReadPermissionRequired(
	rolePermissionRepo repository.RolePermissionRepository,
	logger *zap.Logger,
) gin.HandlerFunc {
	return AccountingPermissionRequired("accounting:read", rolePermissionRepo, logger)
}

// AccountingWritePermissionRequired 経理機能の書き込み権限チェック
func AccountingWritePermissionRequired(
	rolePermissionRepo repository.RolePermissionRepository,
	logger *zap.Logger,
) gin.HandlerFunc {
	return AccountingPermissionRequired("accounting:write", rolePermissionRepo, logger)
}

// AccountingAdminPermissionRequired 経理機能の管理者権限チェック
func AccountingAdminPermissionRequired(
	rolePermissionRepo repository.RolePermissionRepository,
	logger *zap.Logger,
) gin.HandlerFunc {
	return AccountingPermissionRequired("accounting:admin", rolePermissionRepo, logger)
}

// BillingPermissionRequired 請求処理権限チェック
func BillingPermissionRequired(
	action string,
	rolePermissionRepo repository.RolePermissionRepository,
	logger *zap.Logger,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		// まず基本的な経理権限をチェック
		userID, exists := c.Get("userID")
		if !exists {
			logger.Warn("User ID not found in context for billing permission")
			utils.RespondError(c, http.StatusUnauthorized, "認証が必要です")
			c.Abort()
			return
		}

		userUUID, ok := userID.(uuid.UUID)
		if !ok {
			logger.Error("Invalid user ID type in context for billing permission",
				zap.Any("userID", userID))
			utils.RespondError(c, http.StatusInternalServerError, "ユーザーID形式エラー")
			c.Abort()
			return
		}

		// 請求処理権限をチェック
		billingAction := "billing:" + action
		hasPermission, err := checkAccountingPermission(c, userUUID, billingAction, rolePermissionRepo, logger)
		if err != nil {
			logger.Error("Failed to check billing permission",
				zap.String("userID", userUUID.String()),
				zap.String("action", billingAction),
				zap.Error(err))
			utils.RespondError(c, http.StatusInternalServerError, "権限チェックエラー")
			c.Abort()
			return
		}

		if !hasPermission {
			// 請求処理権限がない場合、一般的な経理書き込み権限で代替チェック
			fallbackPermission, fallbackErr := checkAccountingPermission(c, userUUID, "accounting:write", rolePermissionRepo, logger)
			if fallbackErr != nil || !fallbackPermission {
				logger.Warn("User lacks billing permission",
					zap.String("userID", userUUID.String()),
					zap.String("action", billingAction),
					zap.String("path", c.Request.URL.Path))
				utils.RespondError(c, http.StatusForbidden, "請求処理の権限がありません")
				c.Abort()
				return
			}
		}

		logger.Debug("Billing permission granted",
			zap.String("userID", userUUID.String()),
			zap.String("action", billingAction))

		c.Next()
	}
}

// FreeePermissionRequired freee連携権限チェック
func FreeePermissionRequired(
	action string,
	rolePermissionRepo repository.RolePermissionRepository,
	logger *zap.Logger,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			logger.Warn("User ID not found in context for freee permission")
			utils.RespondError(c, http.StatusUnauthorized, "認証が必要です")
			c.Abort()
			return
		}

		userUUID, ok := userID.(uuid.UUID)
		if !ok {
			logger.Error("Invalid user ID type in context for freee permission",
				zap.Any("userID", userID))
			utils.RespondError(c, http.StatusInternalServerError, "ユーザーID形式エラー")
			c.Abort()
			return
		}

		// freee連携権限をチェック
		freeeAction := "freee:" + action
		hasPermission, err := checkAccountingPermission(c, userUUID, freeeAction, rolePermissionRepo, logger)
		if err != nil {
			logger.Error("Failed to check freee permission",
				zap.String("userID", userUUID.String()),
				zap.String("action", freeeAction),
				zap.Error(err))
			utils.RespondError(c, http.StatusInternalServerError, "権限チェックエラー")
			c.Abort()
			return
		}

		if !hasPermission {
			// freee権限がない場合、一般的な経理権限で代替チェック
			fallbackAction := "accounting:write"
			if action == "read" || action == "view" {
				fallbackAction = "accounting:read"
			}

			fallbackPermission, fallbackErr := checkAccountingPermission(c, userUUID, fallbackAction, rolePermissionRepo, logger)
			if fallbackErr != nil || !fallbackPermission {
				logger.Warn("User lacks freee permission",
					zap.String("userID", userUUID.String()),
					zap.String("action", freeeAction),
					zap.String("path", c.Request.URL.Path))
				utils.RespondError(c, http.StatusForbidden, "freee連携の権限がありません")
				c.Abort()
				return
			}
		}

		logger.Debug("Freee permission granted",
			zap.String("userID", userUUID.String()),
			zap.String("action", freeeAction))

		c.Next()
	}
}

// checkAccountingPermission 経理権限チェックのヘルパー関数
func checkAccountingPermission(
	c *gin.Context,
	userID uuid.UUID,
	permission string,
	rolePermissionRepo repository.RolePermissionRepository,
	logger *zap.Logger,
) (bool, error) {
	// 管理者権限をチェック
	isAdmin, exists := c.Get("isAdmin")
	if exists && isAdmin.(bool) {
		logger.Debug("Admin user granted permission",
			zap.String("userID", userID.String()),
			zap.String("permission", permission))
		return true, nil
	}

	// ロールを取得
	roleValue, exists := c.Get("role")
	if !exists {
		logger.Warn("Role not found in context",
			zap.String("userID", userID.String()))
		return false, nil
	}

	role, ok := roleValue.(string)
	if !ok {
		logger.Error("Invalid role type in context",
			zap.String("userID", userID.String()),
			zap.Any("role", roleValue))
		return false, nil
	}

	// 役割ベースの権限をチェック
	hasPermission, err := rolePermissionRepo.HasPermission(c.Request.Context(), role, permission)
	if err != nil {
		return false, err
	}

	if hasPermission {
		return true, nil
	}

	// 階層的権限チェック
	// accounting:admin > accounting:write > accounting:read
	if permission == "accounting:read" {
		// 書き込み権限または管理者権限があれば読み取りも可能
		if writePermission, err := rolePermissionRepo.HasPermission(c.Request.Context(), role, "accounting:write"); err == nil && writePermission {
			return true, nil
		}
		if adminPermission, err := rolePermissionRepo.HasPermission(c.Request.Context(), role, "accounting:admin"); err == nil && adminPermission {
			return true, nil
		}
	} else if permission == "accounting:write" {
		// 管理者権限があれば書き込みも可能
		if adminPermission, err := rolePermissionRepo.HasPermission(c.Request.Context(), role, "accounting:admin"); err == nil && adminPermission {
			return true, nil
		}
	}

	// 特定の経理機能権限チェック
	if strings.HasPrefix(permission, "billing:") || strings.HasPrefix(permission, "freee:") {
		// 経理管理者権限があれば全ての経理機能にアクセス可能
		if adminPermission, err := rolePermissionRepo.HasPermission(c.Request.Context(), role, "accounting:admin"); err == nil && adminPermission {
			return true, nil
		}
	}

	return false, nil
}

// AccountingResourcePermissionRequired リソース固有の権限チェック
func AccountingResourcePermissionRequired(
	resource string,
	action string,
	rolePermissionRepo repository.RolePermissionRepository,
	logger *zap.Logger,
) gin.HandlerFunc {
	permission := resource + ":" + action
	return AccountingPermissionRequired(permission, rolePermissionRepo, logger)
}

// ConditionalAccountingPermission 条件付き経理権限チェック
func ConditionalAccountingPermission(
	condition func(c *gin.Context) bool,
	requiredPermission string,
	rolePermissionRepo repository.RolePermissionRepository,
	logger *zap.Logger,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 条件をチェック
		if !condition(c) {
			// 条件を満たさない場合は権限チェックをスキップ
			c.Next()
			return
		}

		// 条件を満たす場合は権限チェックを実行
		AccountingPermissionRequired(requiredPermission, rolePermissionRepo, logger)(c)
	}
}

// LogAccountingAccess 経理機能へのアクセスログを記録
func LogAccountingAccess(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.Next()
			return
		}

		userUUID, ok := userID.(uuid.UUID)
		if !ok {
			c.Next()
			return
		}

		// アクセス情報をログに記録
		logger.Info("Accounting access",
			zap.String("userID", userUUID.String()),
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.String("query", c.Request.URL.RawQuery),
			zap.String("userAgent", c.Request.UserAgent()),
			zap.String("clientIP", c.ClientIP()))

		c.Next()

		// レスポンス情報をログに記録
		logger.Info("Accounting access response",
			zap.String("userID", userUUID.String()),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Int("size", c.Writer.Size()))
	}
}
