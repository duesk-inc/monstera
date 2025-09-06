package routes

import (
    "github.com/duesk/monstera/internal/handler"
    "github.com/duesk/monstera/internal/middleware"
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// SetupEngineerRoutes Engineer向けのルートを一括登録
// - /api/v1/projects (List/Get/Create/Update)
// - /api/v1/engineer/clients (GetClientsLight)
func SetupEngineerRoutes(api *gin.RouterGroup, logger *zap.Logger, authRequired gin.HandlerFunc, projectHandler handler.ProjectHandler, clientHandler handler.ClientHandler) {
    // プロジェクト関連のエンドポイント（Engineerのみ）
    projects := api.Group("/projects")
    projects.Use(authRequired)
    projects.Use(middleware.EngineerOnly(logger))
    {
        projects.GET("", projectHandler.List)
        projects.GET("/:id", projectHandler.Get)
        projects.POST("", projectHandler.Create)
        projects.PUT("/:id", projectHandler.Update)
    }

    // エンジニア向け軽量クライアント一覧
    engineer := api.Group("/engineer")
    engineer.Use(authRequired)
    engineer.Use(middleware.EngineerOnly(logger))
    {
        engineerClients := engineer.Group("/clients")
        engineerClients.GET("", clientHandler.GetClientsLight)
    }
}

