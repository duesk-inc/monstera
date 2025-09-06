package routes

import (
    "github.com/duesk/monstera/internal/handler"
    "github.com/duesk/monstera/internal/middleware"
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// SetupAuthRoutes /api/v1/auth 直下の認証関連ルートを登録
// - 公開: POST /register, /login, /refresh
// - 認証必須: GET /me, POST /logout
func SetupAuthRoutes(api *gin.RouterGroup, logger *zap.Logger, rateLimiter middleware.RateLimiter, authRequired gin.HandlerFunc, authHandler *handler.AuthHandler) {
    auth := api.Group("/auth")
    {
        // 監査補助の軽いログを付けてハンドラーを呼ぶ
        auth.POST("/register", func(c *gin.Context) {
            if logger != nil { logger.Info("Register endpoint called") }
            authHandler.Register(c)
        })
        auth.POST("/login", middleware.LoginRateLimitMiddleware(rateLimiter), func(c *gin.Context) {
            if logger != nil { logger.Info("Login endpoint called") }
            authHandler.Login(c)
        })
        auth.POST("/refresh", authHandler.RefreshToken)

        // 認証必須
        protected := auth.Group("/")
        protected.Use(authRequired)
        {
            protected.GET("/me", authHandler.Me)
            protected.POST("/logout", authHandler.Logout)
        }
    }
}

