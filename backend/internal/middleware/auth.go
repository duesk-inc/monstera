package middleware

import (
	"net/http"
	"strings"

	"github.com/duesk/monstera/internal/common/auth"
	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AuthMiddleware JWT認証ミドルウェア
func AuthMiddleware(cfg *config.Config, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// トークンを取得
		tokenString := extractToken(c)
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
			c.Abort()
			return
		}

		// トークンを検証
		claims, err := auth.ValidateToken(tokenString, cfg.JWT.Secret)
		if err != nil {
			logger.Error("Invalid token", zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンです"})
			c.Abort()
			return
		}

		// コンテキストにユーザー情報を設定
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)   // 互換性のため残す
		c.Set("roles", claims.Roles) // 複数ロール対応

		c.Next()
	}
}

// RoleMiddleware 特定のロールのみアクセス可能にするミドルウェア
func RoleMiddleware(allowedRoles ...model.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 複数ロール対応を優先的にチェック
		rolesValue, exists := c.Get("roles")
		if exists {
			roles, ok := rolesValue.([]string)
			if ok && len(roles) > 0 {
				// 複数ロールから権限をチェック
				allowed := false
				for _, roleStr := range roles {
					role, err := model.ParseRole(roleStr)
					if err == nil {
						for _, allowedRole := range allowedRoles {
							if role == allowedRole {
								allowed = true
								break
							}
						}
						if allowed {
							break
						}
					}
				}

				if !allowed {
					c.JSON(http.StatusForbidden, gin.H{"error": "この操作を行う権限がありません"})
					c.Abort()
					return
				}

				c.Next()
				return
			}
		}

		// 互換性のため単一ロールもチェック
		roleValue, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
			c.Abort()
			return
		}

		roleStr, ok := roleValue.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ロール情報が不正です"})
			c.Abort()
			return
		}

		// ロールをチェック
		role, err := model.ParseRole(roleStr)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "無効なロールです"})
			c.Abort()
			return
		}

		allowed := false
		for _, allowedRole := range allowedRoles {
			if role == allowedRole {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "この操作を行う権限がありません"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// extractToken リクエストからJWTトークンを抽出
func extractToken(c *gin.Context) string {
	// まず、Authorization ヘッダーを確認
	bearerToken := c.GetHeader("Authorization")
	if bearerToken != "" && strings.HasPrefix(bearerToken, "Bearer ") {
		return strings.TrimPrefix(bearerToken, "Bearer ")
	}

	// 次に、クエリパラメータを確認
	token := c.Query("token")
	if token != "" {
		return token
	}

	// 最後に、Cookieを確認
	tokenCookie, err := c.Cookie("access_token")
	if err == nil && tokenCookie != "" {
		return tokenCookie
	}

	return ""
}
