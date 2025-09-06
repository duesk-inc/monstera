package middleware

import (
    "net/http"

    "github.com/duesk/monstera/internal/message"
    "github.com/duesk/monstera/internal/model"
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// EngineerOnly エンジニアロールのみ許可するミドルウェア
// 要件: RBACはengineerのみ（管理系に露出しない）
func EngineerOnly(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 認証済みであること（user_id）
        if _, exists := c.Get("user_id"); !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
            c.Abort()
            return
        }

        // ロール取得（model.Role または string 両対応）
        roleVal, exists := c.Get("role")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
            c.Abort()
            return
        }

        var role model.Role
        switch v := roleVal.(type) {
        case model.Role:
            role = v
        case *model.Role:
            role = *v
        case string:
            parsed, err := model.ParseRole(v)
            if err != nil {
                logger.Warn("EngineerOnly: invalid role string", zap.String("role", v))
                c.JSON(http.StatusForbidden, gin.H{"error": "エンジニア専用エンドポイントです"})
                c.Abort()
                return
            }
            role = parsed
        default:
            logger.Warn("EngineerOnly: unsupported role type", zap.Any("role", roleVal))
            c.JSON(http.StatusForbidden, gin.H{"error": "エンジニア専用エンドポイントです"})
            c.Abort()
            return
        }

        if role != model.RoleEngineer {
            logger.Debug("EngineerOnly: access denied", zap.Int("role", int(role)))
            c.JSON(http.StatusForbidden, gin.H{"error": "エンジニア専用エンドポイントです"})
            c.Abort()
            return
        }

        c.Next()
    }
}

