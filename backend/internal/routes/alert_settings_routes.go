package routes

import (
	"github.com/duesk/monstera/internal/handler/admin"
	"github.com/duesk/monstera/internal/middleware"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SetupAlertSettingsRoutes アラート設定ルートの設定
func SetupAlertSettingsRoutes(
	router *gin.RouterGroup,
	alertHandler *admin.AlertSettingsHandler,
	authMiddleware gin.HandlerFunc,
	managerRoleMiddleware gin.HandlerFunc,
	logger *zap.Logger,
) {
	// 認証とロギングミドルウェアを適用
	alertGroup := router.Group("/admin/alert-settings")
	alertGroup.Use(authMiddleware)
	alertGroup.Use(managerRoleMiddleware) // マネージャー権限以上を要求
	alertGroup.Use(middleware.RequestLogger(logger))

	// アラート設定API
	alertGroup.POST("", alertHandler.CreateAlertSettings)
	alertGroup.GET("", alertHandler.GetAlertSettingsList)
	alertGroup.GET("/:id", alertHandler.GetAlertSettings)
	alertGroup.PUT("/:id", alertHandler.UpdateAlertSettings)
	alertGroup.DELETE("/:id", alertHandler.DeleteAlertSettings)

	// アラート履歴API
	alertHistoryGroup := router.Group("/admin/alert-histories")
	alertHistoryGroup.Use(authMiddleware)
	alertHistoryGroup.Use(managerRoleMiddleware) // マネージャー権限以上を要求
	alertHistoryGroup.Use(middleware.RequestLogger(logger))

	alertHistoryGroup.GET("", alertHandler.GetAlertHistories)
	alertHistoryGroup.GET("/:id", alertHandler.GetAlertHistory)
	alertHistoryGroup.PUT("/:id/status", alertHandler.UpdateAlertStatus)

	// アラートサマリーAPI
	summaryGroup := router.Group("/admin/alerts")
	summaryGroup.Use(authMiddleware)
	summaryGroup.Use(managerRoleMiddleware) // マネージャー権限以上を要求
	summaryGroup.Use(middleware.RequestLogger(logger))

	summaryGroup.GET("/summary", alertHandler.GetAlertSummary)
}
