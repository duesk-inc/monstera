package routes

import (
    "github.com/duesk/monstera/internal/handler"
    "github.com/gin-gonic/gin"
)

// SetupWorkHistoryRoutes /api/v1/work-history を登録
func SetupWorkHistoryRoutes(api *gin.RouterGroup, authRequired gin.HandlerFunc, workHistoryHandler *handler.WorkHistoryHandler) {
    wh := api.Group("/work-history")
    wh.Use(authRequired)
    {
        // 基本CRUD
        wh.GET("", workHistoryHandler.GetWorkHistories)
        wh.GET("/:id", workHistoryHandler.GetWorkHistory)
        wh.POST("", workHistoryHandler.CreateWorkHistory)
        wh.PUT("/:id", workHistoryHandler.UpdateWorkHistory)
        wh.DELETE("/:id", workHistoryHandler.DeleteWorkHistory)

        // 検索・エクスポート
        wh.GET("/search", workHistoryHandler.SearchWorkHistories)
        wh.GET("/summary", workHistoryHandler.GetUserWorkHistorySummary)
        wh.GET("/export", workHistoryHandler.ExportWorkHistory)
        wh.GET("/template", workHistoryHandler.GetWorkHistoryTemplate)

        // 技術サジェスト系
        wh.GET("/technology-suggestions", workHistoryHandler.GetTechnologySuggestions)
        wh.GET("/popular-technologies", workHistoryHandler.GetPopularTechnologies)
        wh.GET("/technology-categories", workHistoryHandler.GetTechnologyCategories)
    }
}

