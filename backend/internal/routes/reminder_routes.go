package routes

import (
	"github.com/duesk/monstera/internal/handler"
	"github.com/gin-gonic/gin"
)

// RegisterReminderRoutes リマインド関連のルートを登録
func RegisterReminderRoutes(router *gin.RouterGroup, reminderHandler handler.ReminderHandler, authMiddleware gin.HandlerFunc, adminMiddleware gin.HandlerFunc) {
	reminder := router.Group("/reminders")
	{
		// 管理者のみアクセス可能
		adminOnly := reminder.Group("")
		adminOnly.Use(authMiddleware)
		adminOnly.Use(adminMiddleware)
		{
			// 手動リマインド送信
			adminOnly.POST("/send", reminderHandler.SendManualReminder)

			// 本日のリマインド対象者取得
			adminOnly.GET("/today", reminderHandler.GetTodaysReminders)

			// リマインド設定取得
			adminOnly.GET("/settings", reminderHandler.GetReminderSettings)

			// リマインド設定更新
			adminOnly.PUT("/settings", reminderHandler.UpdateReminderSettings)
		}
	}
}
