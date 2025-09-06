package routes

import (
    "github.com/duesk/monstera/internal/handler"
    "github.com/gin-gonic/gin"
)

// SetupWeeklyReportRoutes /api/v1/weekly-reports を登録
func SetupWeeklyReportRoutes(api *gin.RouterGroup, authRequired gin.HandlerFunc, reportHandler *handler.WeeklyReportHandler) {
    weekly := api.Group("/weekly-reports")
    weekly.Use(authRequired)
    {
        weekly.GET("", reportHandler.List)
        weekly.GET("/by-date-range", reportHandler.GetWeeklyReportByDateRange)
        weekly.GET("/:id", reportHandler.Get)
        weekly.POST("", reportHandler.Create)
        weekly.PUT("/:id", reportHandler.Update)
        weekly.DELETE("/:id", reportHandler.Delete)
        weekly.POST("/:id/submit", reportHandler.Submit)
        weekly.POST("/:id/copy", reportHandler.Copy)
        weekly.POST("/draft", reportHandler.SaveAsDraft)
        weekly.POST("/submit", reportHandler.SaveAndSubmit)
        weekly.GET("/default-settings", reportHandler.GetUserDefaultWorkSettings)
        weekly.POST("/default-settings", reportHandler.SaveUserDefaultWorkSettings)
    }
}

