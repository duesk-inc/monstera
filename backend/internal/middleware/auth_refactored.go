package middleware

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/common/auth"
	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/utils"
)

// Claims is an alias for auth.JWTClaims for backward compatibility
type Claims = auth.JWTClaims

// AuthRefactoredMiddleware リファクタリングされた認証ミドルウェア
type AuthRefactoredMiddleware struct {
	cfg           *config.Config
	logger        *zap.Logger
	errorHandler  *utils.ErrorHandler
	securityUtils *utils.SecurityUtils
	userRepo      repository.UserRepository

	// セッション管理
	sessionTimeout time.Duration
	maxSessions    int
}

// NewAuthRefactoredMiddleware AuthRefactoredMiddlewareのインスタンスを作成
func NewAuthRefactoredMiddleware(
	cfg *config.Config,
	logger *zap.Logger,
	userRepo repository.UserRepository,
) *AuthRefactoredMiddleware {
	return &AuthRefactoredMiddleware{
		cfg:            cfg,
		logger:         logger,
		errorHandler:   utils.NewErrorHandler(),
		securityUtils:  utils.NewSecurityUtils(),
		userRepo:       userRepo,
		sessionTimeout: 15 * time.Minute, // アクセストークンの有効期限
		maxSessions:    5,                // ユーザーあたりの最大セッション数
	}
}

// JWTAuth JWT認証ミドルウェア（拡張版）
func (a *AuthRefactoredMiddleware) JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// トークンを抽出
		tokenString := a.extractToken(c)
		if tokenString == "" {
			a.errorHandler.HandleError(c, message.ErrCodeUnauthorized, "認証が必要です。", nil)
			c.Abort()
			return
		}

		// トークンを検証
		claims, err := auth.ValidateToken(tokenString, a.cfg.JWT.Secret)
		if err != nil {
			// トークンエラーの詳細な処理
			a.handleTokenError(c, err)
			c.Abort()
			return
		}

		// ユーザーの有効性をチェック
		if err := a.validateUser(c.Request.Context(), claims.UserID.String()); err != nil {
			a.errorHandler.HandleError(c, message.ErrCodeAccountDisabled, "アカウントが無効です。", nil)
			c.Abort()
			return
		}

		// セキュリティチェック
		if err := a.performSecurityChecks(c, claims); err != nil {
			a.logger.Warn("Security check failed",
				zap.String("user_id", claims.UserID.String()),
				zap.Error(err))
			a.errorHandler.HandleError(c, message.ErrCodeForbidden, "セキュリティチェックに失敗しました。", nil)
			c.Abort()
			return
		}

		// コンテキストにユーザー情報を設定
		a.setUserContext(c, claims)

		// セッション情報を更新
		a.updateSessionActivity(c, claims.UserID.String())

		c.Next()
	}
}

// RequireRoles 指定されたロールのみアクセス可能にするミドルウェア
func (a *AuthRefactoredMiddleware) RequireRoles(allowedRoles ...model.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRoles := a.getUserRoles(c)

		if len(userRoles) == 0 {
			a.errorHandler.HandleError(c, message.ErrCodeUnauthorized, "認証が必要です。", nil)
			c.Abort()
			return
		}

		// ロール権限をチェック
		if !a.hasAnyRole(userRoles, allowedRoles) {
			details := map[string]string{
				"required_roles": a.rolesToString(allowedRoles),
				"user_roles":     a.rolesToString(userRoles),
			}
			a.errorHandler.HandleError(c, message.ErrCodeInsufficientRole, "この操作を実行する権限がありません。", details)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequirePermission 特定の権限をチェックするミドルウェア
func (a *AuthRefactoredMiddleware) RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := a.getUserID(c)
		if userID == "" {
			a.errorHandler.HandleError(c, message.ErrCodeUnauthorized, "認証が必要です。", nil)
			c.Abort()
			return
		}

		// 権限チェック（実際の実装では権限リポジトリを使用）
		hasPermission, err := a.checkUserPermission(c.Request.Context(), userID, permission)
		if err != nil {
			a.logger.Error("Permission check failed",
				zap.String("user_id", userID),
				zap.String("permission", permission),
				zap.Error(err))
			a.errorHandler.HandleInternalError(c, err, "permission_check")
			c.Abort()
			return
		}

		if !hasPermission {
			details := map[string]string{
				"required_permission": permission,
				"user_id":             userID,
			}
			a.errorHandler.HandleError(c, message.ErrCodeInsufficientRole, "この操作を実行する権限がありません。", details)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAdmin 管理者権限をチェックするミドルウェア
func (a *AuthRefactoredMiddleware) RequireAdmin() gin.HandlerFunc {
	return a.RequireRoles(model.RoleAdmin, model.RoleSuperAdmin)
}

// RequireManager 管理者またはマネージャー権限をチェックするミドルウェア
func (a *AuthRefactoredMiddleware) RequireManager() gin.HandlerFunc {
	return a.RequireRoles(model.RoleAdmin, model.RoleSuperAdmin, model.RoleManager)
}

// RequireResourceOwnerOrAdmin リソースの所有者または管理者のみアクセス可能
func (a *AuthRefactoredMiddleware) RequireResourceOwnerOrAdmin(resourceUserIDParam string) gin.HandlerFunc {
	return func(c *gin.Context) {
		currentUserID := a.getUserID(c)
		if currentUserID == "" {
			a.errorHandler.HandleError(c, message.ErrCodeUnauthorized, "認証が必要です。", nil)
			c.Abort()
			return
		}

		// 管理者権限をチェック
		if a.isAdmin(c) {
			c.Next()
			return
		}

		// リソースの所有者IDを取得
		resourceOwnerID := a.getResourceOwnerID(c, resourceUserIDParam)
		if resourceOwnerID == "" {
			a.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "無効なリクエストです。", nil)
			c.Abort()
			return
		}

		// 所有者権限をチェック
		if currentUserID != resourceOwnerID {
			details := map[string]string{
				"current_user":   currentUserID,
				"resource_owner": resourceOwnerID,
			}
			a.errorHandler.HandleError(c, message.ErrCodeForbidden, "このリソースにアクセスする権限がありません。", details)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireDepartmentAccess 部署アクセス権限をチェック
func (a *AuthRefactoredMiddleware) RequireDepartmentAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := a.getUserID(c)
		if userID == "" {
			a.errorHandler.HandleError(c, message.ErrCodeUnauthorized, "認証が必要です。", nil)
			c.Abort()
			return
		}

		// 管理者は全部署にアクセス可能
		if a.isAdmin(c) {
			c.Next()
			return
		}

		// 部署IDをパラメータまたはクエリから取得
		departmentID := a.getDepartmentID(c)
		if departmentID == "" {
			a.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "部署IDが指定されていません。", nil)
			c.Abort()
			return
		}

		// ユーザーの部署アクセス権限をチェック
		hasAccess, err := a.checkDepartmentAccess(c.Request.Context(), userID, departmentID)
		if err != nil {
			a.errorHandler.HandleInternalError(c, err, "department_access_check")
			c.Abort()
			return
		}

		if !hasAccess {
			a.errorHandler.HandleError(c, message.ErrCodeUserNotInDepartment, "この部署にアクセスする権限がありません。", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitMiddleware レート制限ミドルウェア
func (a *AuthRefactoredMiddleware) RateLimitMiddleware(limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := a.getUserID(c)
		clientIP := c.ClientIP()

		// ユーザーIDまたはIPアドレスでレート制限
		key := userID
		if key == "" {
			key = clientIP
		}

		// レート制限チェック
		rateLimitInfo := a.securityUtils.CheckRateLimit(key, limit, window)
		if rateLimitInfo.IsExceeded {
			// レート制限超過のヘッダーを設定
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rateLimitInfo.Limit))
			c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", rateLimitInfo.Remaining))
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", rateLimitInfo.ResetTime.Unix()))

			if rateLimitInfo.RetryAfter > 0 {
				c.Header("Retry-After", fmt.Sprintf("%.0f", rateLimitInfo.RetryAfter.Seconds()))
			}

			a.errorHandler.HandleError(c, message.ErrCodeQuotaExceeded, "リクエスト制限に達しました。", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// extractToken リクエストからJWTトークンを抽出
func (a *AuthRefactoredMiddleware) extractToken(c *gin.Context) string {
	// Authorization ヘッダーから取得
	bearerToken := c.GetHeader("Authorization")
	if bearerToken != "" && strings.HasPrefix(bearerToken, "Bearer ") {
		return strings.TrimPrefix(bearerToken, "Bearer ")
	}

	// HTTPOnly Cookieから取得（推奨方法）
	if tokenCookie, err := c.Cookie("access_token"); err == nil && tokenCookie != "" {
		return tokenCookie
	}

	// クエリパラメータから取得（非推奨、特別な場合のみ）
	if token := c.Query("token"); token != "" {
		a.logger.Warn("Token passed via query parameter",
			zap.String("client_ip", c.ClientIP()),
			zap.String("user_agent", c.GetHeader("User-Agent")))
		return token
	}

	return ""
}

// handleTokenError トークンエラーを詳細に処理
func (a *AuthRefactoredMiddleware) handleTokenError(c *gin.Context, err error) {
	errorMsg := err.Error()

	switch {
	case strings.Contains(errorMsg, "expired"):
		a.errorHandler.HandleError(c, message.ErrCodeTokenExpired, "トークンの有効期限が切れています。", nil)
	case strings.Contains(errorMsg, "invalid"):
		a.errorHandler.HandleError(c, message.ErrCodeInvalidToken, "無効なトークンです。", nil)
	case strings.Contains(errorMsg, "malformed"):
		a.errorHandler.HandleError(c, message.ErrCodeInvalidToken, "トークンの形式が正しくありません。", nil)
	default:
		a.logger.Error("Token validation failed", zap.Error(err))
		a.errorHandler.HandleError(c, message.ErrCodeUnauthorized, "認証に失敗しました。", nil)
	}
}

// validateUser ユーザーの有効性をチェック
func (a *AuthRefactoredMiddleware) validateUser(ctx context.Context, userID string) error {
	// UUIDの形式チェック
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID format: %w", err)
	}

	// ユーザーの存在と有効性をチェック
	user, err := a.userRepo.GetByID(ctx, userUUID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	// アカウントの状態をチェック
	if user.DeletedAt.Valid {
		return fmt.Errorf("user account is deleted")
	}

	// 追加の状態チェック（例：アカウント停止、メール未認証など）
	// if !user.IsEmailVerified {
	//     return fmt.Errorf("email not verified")
	// }

	return nil
}

// performSecurityChecks セキュリティチェックを実行
func (a *AuthRefactoredMiddleware) performSecurityChecks(c *gin.Context, claims *Claims) error {
	// User-Agentの検証
	userAgent := c.GetHeader("User-Agent")
	if !a.securityUtils.ValidateUserAgent(userAgent) {
		return fmt.Errorf("invalid user agent")
	}

	// IPアドレスの検証
	clientIP := c.ClientIP()
	if !a.securityUtils.ValidateIPAddress(clientIP) {
		return fmt.Errorf("invalid IP address")
	}

	// セッションの重複チェック（必要に応じて）
	// if err := a.checkSessionDuplicate(claims.UserID, claims.SessionID); err != nil {
	//     return err
	// }

	return nil
}

// setUserContext ユーザー情報をコンテキストに設定
func (a *AuthRefactoredMiddleware) setUserContext(c *gin.Context, claims *Claims) {
	c.Set("user_id", claims.UserID)
	c.Set("email", claims.Email)
	c.Set("role", claims.Role)     // 互換性のため
	c.Set("roles", claims.Roles)   // 複数ロール
	c.Set("session_id", claims.ID) // JWT ID as session ID
	c.Set("token_issued_at", claims.IssuedAt)
}

// updateSessionActivity セッションアクティビティを更新
func (a *AuthRefactoredMiddleware) updateSessionActivity(c *gin.Context, userID string) {
	// 最終アクセス時刻を更新（非同期で実行）
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// セッション情報の更新（実装例）
		// TODO: セッション更新処理を実装（ctx を使用）
		_ = ctx // ctxを将来的に使用
		a.logger.Debug("Session activity updated",
			zap.String("user_id", userID),
			zap.String("client_ip", c.ClientIP()),
			zap.Time("timestamp", time.Now()))
	}()
}

// Helper methods

func (a *AuthRefactoredMiddleware) getUserRoles(c *gin.Context) []model.Role {
	rolesValue, exists := c.Get("roles")
	if !exists {
		return nil
	}

	rolesStr, ok := rolesValue.([]string)
	if !ok {
		return nil
	}

	roles := make([]model.Role, 0, len(rolesStr))
	for _, roleStr := range rolesStr {
		if role, err := model.ParseRole(roleStr); err == nil {
			roles = append(roles, role)
		}
	}

	return roles
}

func (a *AuthRefactoredMiddleware) getUserID(c *gin.Context) string {
	userID, _ := c.Get("user_id")
	if userIDStr, ok := userID.(string); ok {
		return userIDStr
	}
	return ""
}

func (a *AuthRefactoredMiddleware) isAdmin(c *gin.Context) bool {
	roles := a.getUserRoles(c)
	for _, role := range roles {
		if role == model.RoleAdmin || role == model.RoleSuperAdmin {
			return true
		}
	}
	return false
}

func (a *AuthRefactoredMiddleware) hasAnyRole(userRoles []model.Role, allowedRoles []model.Role) bool {
	for _, userRole := range userRoles {
		for _, allowedRole := range allowedRoles {
			if userRole == allowedRole {
				return true
			}
		}
	}
	return false
}

func (a *AuthRefactoredMiddleware) rolesToString(roles []model.Role) string {
	strs := make([]string, len(roles))
	for i, role := range roles {
		strs[i] = role.String()
	}
	return strings.Join(strs, ", ")
}

func (a *AuthRefactoredMiddleware) getResourceOwnerID(c *gin.Context, paramName string) string {
	// URLパラメータから取得
	if resourceID := c.Param(paramName); resourceID != "" {
		return resourceID
	}

	// クエリパラメータから取得
	if resourceID := c.Query(paramName); resourceID != "" {
		return resourceID
	}

	return ""
}

func (a *AuthRefactoredMiddleware) getDepartmentID(c *gin.Context) string {
	// URLパラメータから取得
	if deptID := c.Param("department_id"); deptID != "" {
		return deptID
	}

	// クエリパラメータから取得
	if deptID := c.Query("department_id"); deptID != "" {
		return deptID
	}

	return ""
}

func (a *AuthRefactoredMiddleware) checkUserPermission(ctx context.Context, userID, permission string) (bool, error) {
	// 実際の実装では権限リポジトリを使用
	// 現在は簡略化
	return true, nil
}

func (a *AuthRefactoredMiddleware) checkDepartmentAccess(ctx context.Context, userID, departmentID string) (bool, error) {
	// 実際の実装では部署アクセス権限をチェック
	// 現在は簡略化
	return true, nil
}
