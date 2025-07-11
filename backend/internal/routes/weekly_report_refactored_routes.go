package routes

import (
	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
)

// SetupWeeklyReportRefactoredRoutes リファクタリングした週報関連のルートを設定
func SetupWeeklyReportRefactoredRoutes(
	router *gin.Engine,
	weeklyReportHandler handler.WeeklyReportRefactoredHandler,
	authMiddleware gin.HandlerFunc,
	roleMiddleware func(...model.Role) gin.HandlerFunc,
) {
	v1 := router.Group("/api/v1")
	{
		// 認証が必要なルート
		authorized := v1.Group("")
		authorized.Use(authMiddleware)
		{
			// ユーザー向けAPI
			userReports := authorized.Group("/weekly-reports")
			{
				// 自分の週報一覧取得
				userReports.GET("", weeklyReportHandler.GetUserWeeklyReports)

				// 自分の週報詳細取得
				userReports.GET("/:id", weeklyReportHandler.GetUserWeeklyReportDetail)

				// 週報作成
				userReports.POST("", weeklyReportHandler.CreateWeeklyReport)

				// 週報更新
				userReports.PUT("/:id", weeklyReportHandler.UpdateWeeklyReport)

				// 週報提出
				userReports.POST("/:id/submit", weeklyReportHandler.SubmitWeeklyReport)

				// 週報削除
				userReports.DELETE("/:id", weeklyReportHandler.DeleteWeeklyReport)
			}

			// 管理者向けAPI
			adminReports := authorized.Group("/admin/weekly-reports")
			adminReports.Use(roleMiddleware(model.RoleAdmin, model.RoleManager))
			{
				// 全週報一覧取得（最適化済み）
				adminReports.GET("", weeklyReportHandler.GetAllWeeklyReports)

				// 未提出週報一覧取得（最適化済み）
				adminReports.GET("/unsubmitted", weeklyReportHandler.GetUnsubmittedReports)

				// 週報統計情報取得
				adminReports.GET("/statistics", weeklyReportHandler.GetWeeklyReportStatistics)

				// 一括操作API
				adminReports.POST("/batch/submit", weeklyReportHandler.BatchSubmitReports)
				adminReports.POST("/batch/update-deadlines", weeklyReportHandler.BatchUpdateDeadlines)
			}
		}
	}
}
