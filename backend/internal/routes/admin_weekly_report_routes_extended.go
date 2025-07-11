package routes

import (
	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
)

// SetupAdminWeeklyReportExtendedRoutes 管理者用週報管理拡張機能のルートを設定
// 設計書に基づいた新しいエンドポイントを追加
func SetupAdminWeeklyReportExtendedRoutes(
	router *gin.Engine,
	adminWeeklyReportHandler handler.AdminWeeklyReportHandler,
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
			// 管理者用週報管理エンドポイント
			adminWeeklyReports := authorized.Group("/admin/weekly-reports")
			adminWeeklyReports.Use(roleMiddleware(model.RoleAdmin, model.RoleManager))
			{
				// 既存のエンドポイント（既に実装済み）
				// GET    /admin/weekly-reports - 週報一覧取得
				// GET    /admin/weekly-reports/:id - 週報詳細取得
				// POST   /admin/weekly-reports/:id/comment - 週報へのコメント
				// GET    /admin/weekly-reports/monthly-attendance - 月次勤怠一覧
				// GET    /admin/weekly-reports/follow-up-required - フォローアップ必要ユーザー一覧
				// POST   /admin/weekly-reports/export/monthly - 月次レポートエクスポート
				// GET    /admin/weekly-reports/summary - 週報サマリー統計取得

				// === フェーズ1: 未提出者管理（設計書準拠） ===

				// 未提出者一覧取得
				adminWeeklyReports.GET("/unsubmitted", unsubmittedHandler.GetUnsubmittedReports)

				// 一括リマインド送信
				adminWeeklyReports.POST("/remind", unsubmittedHandler.SendRemindersToUnsubmitted)

				// === フェーズ3: 集計・分析（設計書準拠） ===

				// 週報サマリー統計取得（日付範囲ベース）
				adminWeeklyReports.GET("/summary", adminWeeklyReportHandler.GetWeeklyReportSummary)

				// 月次サマリー取得（年月ベース）
				adminWeeklyReports.GET("/monthly-summary", adminWeeklyReportHandler.GetMonthlySummary)

				// データエクスポート（非同期処理）
				adminWeeklyReports.POST("/export", func(c *gin.Context) {
					// TODO: 非同期エクスポート処理の実装
					c.JSON(501, gin.H{"error": "Not implemented yet"})
				})
			}
		}
	}
}
