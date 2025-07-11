package routes

import (
	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
)

// SetupUnsubmittedReportRoutes 未提出者管理関連のルートを設定
func SetupUnsubmittedReportRoutes(
	router *gin.Engine,
	unsubmittedHandler handler.UnsubmittedReportHandler,
	authMiddleware gin.HandlerFunc,
	roleMiddleware func(...model.Role) gin.HandlerFunc,
) {
	v1 := router.Group("/api/v1")
	{
		// 認証が必要なルート
		authorized := v1.Group("")
		authorized.Use(authMiddleware)
		{
			// 管理者・マネージャー向けAPI
			unsubmitted := authorized.Group("/unsubmitted-reports")
			unsubmitted.Use(roleMiddleware(model.RoleAdmin, model.RoleManager))
			{
				// 未提出者一覧取得
				unsubmitted.GET("", unsubmittedHandler.GetUnsubmittedReports)

				// 未提出者サマリー取得（ダッシュボード用）
				unsubmitted.GET("/summary", unsubmittedHandler.GetUnsubmittedSummary)

				// 部署別未提出統計
				unsubmitted.GET("/stats/department", unsubmittedHandler.GetDepartmentUnsubmittedStats)

				// マネージャー別未提出統計（自分の部下）
				unsubmitted.GET("/stats/manager", unsubmittedHandler.GetManagerUnsubmittedStats)

				// 特定マネージャーの未提出統計（管理者のみ）
				unsubmitted.GET("/stats/manager/:id",
					roleMiddleware(model.RoleAdmin),
					unsubmittedHandler.GetManagerUnsubmittedStats)

				// 未提出者へのリマインド送信
				unsubmitted.POST("/reminders", unsubmittedHandler.SendRemindersToUnsubmitted)

				// 未提出理由の記録
				unsubmitted.POST("/:id/reason", unsubmittedHandler.RecordUnsubmittedReason)

				// エスカレーション対象者の取得
				unsubmitted.GET("/escalation", unsubmittedHandler.GetEscalationTargets)
			}

			// 管理者専用API
			adminUnsubmitted := authorized.Group("/admin/unsubmitted-reports")
			adminUnsubmitted.Use(roleMiddleware(model.RoleAdmin))
			{
				// 自動リマインド設定
				adminUnsubmitted.GET("/auto-reminder-settings", unsubmittedHandler.GetAutoReminderSettings)
				adminUnsubmitted.PUT("/auto-reminder-settings", unsubmittedHandler.SetAutoReminderSettings)
			}
		}
	}
}
