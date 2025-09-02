package routes

import (
	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/middleware"
	adminmiddleware "github.com/duesk/monstera/internal/middleware"
	"github.com/duesk/monstera/internal/repository"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AdminHandlers 管理者用ハンドラーをまとめた構造体
type AdminHandlers struct {
	WeeklyReportHandler           handler.AdminWeeklyReportHandler
	DashboardHandler              handler.AdminDashboardHandler
	ClientHandler                 handler.ClientHandler
	InvoiceHandler                handler.InvoiceHandler
	SalesHandler                  handler.SalesHandler
	LeaveAdminHandler             handler.LeaveAdminHandler
	ExpenseHandler                *handler.ExpenseHandler
	ExpenseApproverSettingHandler *handler.ExpenseApproverSettingHandler
	ApprovalReminderHandler       *handler.ApprovalReminderHandler
	EngineerHandler               handler.AdminEngineerHandler
	UserHandler                   *handler.UserHandler
	// 経理機能ハンドラー
	ProjectGroupHandler        *handler.ProjectGroupHandler
	BillingHandler             *handler.BillingHandler
	FreeeHandler               *handler.FreeeHandler
	AccountingDashboardHandler *handler.AccountingDashboardHandler
}

// SetupAdminRoutes 管理者用ルートの設定
func SetupAdminRoutes(r *gin.RouterGroup, cfg *config.Config, handlers *AdminHandlers, logger *zap.Logger, rolePermissionRepo repository.RolePermissionRepository, cognitoAuthMiddleware *middleware.CognitoAuthMiddleware, userRepo repository.UserRepository) {
	// デバッグログ
	if handlers.LeaveAdminHandler == nil {
		logger.Error("LeaveAdminHandler is nil in SetupAdminRoutes")
	}

	// 管理者グループ
	admin := r.Group("/admin")

	// 管理者認証ミドルウェアを適用 - Cognito認証を使用
	if cognitoAuthMiddleware != nil {
		admin.Use(cognitoAuthMiddleware.AuthRequired())
		admin.Use(cognitoAuthMiddleware.AdminRequired())
	} else {
		// CognitoAuthMiddlewareが初期化されていない場合はエラー
		logger.Error("CognitoAuthMiddleware is not initialized")
		panic("CognitoAuthMiddleware is required for admin routes")
	}

	// ダッシュボード
	if handlers.DashboardHandler != nil {
		admin.GET("/dashboard", handlers.DashboardHandler.GetDashboardData)
	}

	// エクスポートジョブ管理
	if handlers.WeeklyReportHandler != nil {
		admin.GET("/export/:jobId/status", handlers.WeeklyReportHandler.GetExportJobStatus)
	}

	// エンジニア管理
	engineers := admin.Group("/engineers")
	{
		// エンジニア基本CRUD操作
		if handlers.EngineerHandler != nil {
			engineers.GET("", handlers.EngineerHandler.GetEngineers)
			engineers.GET("/:id", handlers.EngineerHandler.GetEngineerDetail)
			engineers.POST("", handlers.EngineerHandler.CreateEngineer)
			engineers.PUT("/:id", handlers.EngineerHandler.UpdateEngineer)
			engineers.DELETE("/:id", handlers.EngineerHandler.DeleteEngineer)
			engineers.PUT("/:id/status", handlers.EngineerHandler.UpdateEngineerStatus)
		}

		// 週報管理
		if handlers.WeeklyReportHandler != nil {
			weeklyReports := engineers.Group("/weekly-reports")
			{
				weeklyReports.GET("", handlers.WeeklyReportHandler.GetWeeklyReports)
				weeklyReports.GET("/:id", handlers.WeeklyReportHandler.GetWeeklyReportDetail)
				weeklyReports.POST("/:id/comment", handlers.WeeklyReportHandler.CommentWeeklyReport)
				weeklyReports.PUT("/:id/approve", handlers.WeeklyReportHandler.ApproveWeeklyReport)
				weeklyReports.PUT("/:id/reject", handlers.WeeklyReportHandler.RejectWeeklyReport)
				weeklyReports.PUT("/:id/return", handlers.WeeklyReportHandler.ReturnWeeklyReport)
				weeklyReports.GET("/monthly-attendance", handlers.WeeklyReportHandler.GetMonthlyAttendance)
				weeklyReports.POST("/export", handlers.WeeklyReportHandler.ExportMonthlyReport)
				weeklyReports.GET("/summary", handlers.WeeklyReportHandler.GetWeeklyReportSummary) // サマリー統計API
				weeklyReports.POST("/export-job", handlers.WeeklyReportHandler.CreateExportJob)    // 非同期エクスポートジョブ作成
			}

			// フォローアップ対象者
			engineers.GET("/follow-up-required", handlers.WeeklyReportHandler.GetFollowUpRequiredUsers)
		}

		// スキルシートPDF
		// スキルシートPDF（初期スコープ外・無効化）
		// if handlers.SkillSheetPDFHandler != nil {
		// 	engineers.GET("/skill-sheets/:id/pdf", handlers.SkillSheetPDFHandler.GenerateUserSkillSheetPDF)
		// }

		// 休暇申請管理エンドポイント
		if handlers.LeaveAdminHandler != nil {
			leave := engineers.Group("/leave")
			{
				leave.GET("/requests", handlers.LeaveAdminHandler.GetLeaveRequests)
				leave.PUT("/requests/:id/approve", handlers.LeaveAdminHandler.ApproveLeaveRequest)
				leave.PUT("/requests/:id/reject", handlers.LeaveAdminHandler.RejectLeaveRequest)
				leave.POST("/requests/bulk-approve", handlers.LeaveAdminHandler.BulkApproveLeaveRequests)
				leave.GET("/statistics", handlers.LeaveAdminHandler.GetLeaveStatistics)
				leave.GET("/statistics/users/:user_id", handlers.LeaveAdminHandler.GetUserLeaveStatistics)
			}
		}

		// 経費承認エンドポイント
		if handlers.ExpenseHandler != nil {
			expenses := engineers.Group("/expenses")
			{
				expenses.GET("/pending", handlers.ExpenseHandler.GetPendingApprovals)
				expenses.PUT("/:id/approve", handlers.ExpenseHandler.ApproveExpense)
				expenses.PUT("/:id/reject", handlers.ExpenseHandler.RejectExpense)
				expenses.GET("/check-limits", handlers.ExpenseHandler.CheckExpenseLimits)
				expenses.GET("/export", handlers.ExpenseHandler.ExportExpensesCSVAdmin) // 管理者用CSVエクスポート
			}
		}
	}

	// 経費申請上限管理エンドポイント（管理者のみ）
	if handlers.ExpenseHandler != nil {
		expenseLimits := admin.Group("/expense-limits")
		{
			expenseLimits.GET("", handlers.ExpenseHandler.GetExpenseLimits)
			expenseLimits.PUT("", handlers.ExpenseHandler.UpdateExpenseLimit)
		}
	}

	// 経費承認者設定エンドポイント（管理者のみ）
	if handlers.ExpenseApproverSettingHandler != nil {
		expenseApprovers := admin.Group("/expense-approvers")
		{
			expenseApprovers.POST("", handlers.ExpenseApproverSettingHandler.CreateApproverSetting)
			expenseApprovers.GET("", handlers.ExpenseApproverSettingHandler.GetApproverSettings)
			expenseApprovers.PUT("/:id", handlers.ExpenseApproverSettingHandler.UpdateApproverSetting)
			expenseApprovers.DELETE("/:id", handlers.ExpenseApproverSettingHandler.DeleteApproverSetting)
			expenseApprovers.GET("/histories", handlers.ExpenseApproverSettingHandler.GetApproverSettingHistories)
		}
	}

	// 承認催促管理
	if handlers.ApprovalReminderHandler != nil {
		approvalReminder := admin.Group("/approval-reminder")
		{
			approvalReminder.GET("/config", handlers.ApprovalReminderHandler.GetApprovalReminderConfig)
			approvalReminder.PUT("/config", handlers.ApprovalReminderHandler.UpdateApprovalReminderConfig)
			approvalReminder.POST("/execute", handlers.ApprovalReminderHandler.ExecuteApprovalReminder)
			approvalReminder.POST("/scheduler/start", handlers.ApprovalReminderHandler.StartScheduler)
			approvalReminder.POST("/scheduler/stop", handlers.ApprovalReminderHandler.StopScheduler)
		}
	}

	// TODO: スキルシート管理
	// skillSheets := engineers.Group("/skill-sheets")
	// {
	//     skillSheets.GET("/:user_id", handlers.SkillSheetHandler.GetSkillSheet)
	//     skillSheets.POST("/:user_id/export", handlers.SkillSheetHandler.ExportPDF)
	// }

	// ビジネス管理
	business := admin.Group("/business")
	{
		// 取引先管理
		if handlers.ClientHandler != nil {
			clients := business.Group("/clients")
			clients.Use(adminmiddleware.PermissionRequired("client:read", rolePermissionRepo, logger))
			{
				clients.GET("", handlers.ClientHandler.GetClients)
				clients.GET("/:id", handlers.ClientHandler.GetClient)
				clients.GET("/:id/projects", handlers.ClientHandler.GetClientProjects)
			}

			clientsWrite := business.Group("/clients")
			clientsWrite.Use(adminmiddleware.PermissionRequired("client:write", rolePermissionRepo, logger))
			{
				clientsWrite.POST("", handlers.ClientHandler.CreateClient)
				clientsWrite.PUT("/:id", handlers.ClientHandler.UpdateClient)
				clientsWrite.DELETE("/:id", handlers.ClientHandler.DeleteClient)
			}
		}

		// 請求管理
		if handlers.InvoiceHandler != nil {
			invoices := business.Group("/invoices")
			invoices.Use(adminmiddleware.PermissionRequired("invoice:read", rolePermissionRepo, logger))
			{
				invoices.GET("", handlers.InvoiceHandler.GetInvoices)
				invoices.GET("/summary", handlers.InvoiceHandler.GetInvoiceSummary)
				invoices.GET("/:id", handlers.InvoiceHandler.GetInvoice)
				// 請求書PDF（初期スコープ外・無効化）
				// invoices.GET("/:id/pdf", handlers.InvoiceHandler.ExportInvoicePDF)
			}

			invoicesWrite := business.Group("/invoices")
			invoicesWrite.Use(adminmiddleware.PermissionRequired("invoice:write", rolePermissionRepo, logger))
			{
				invoicesWrite.POST("", handlers.InvoiceHandler.CreateInvoice)
				invoicesWrite.PUT("/:id", handlers.InvoiceHandler.UpdateInvoice)
				invoicesWrite.PUT("/:id/status", handlers.InvoiceHandler.UpdateInvoiceStatus)
				invoicesWrite.DELETE("/:id", handlers.InvoiceHandler.DeleteInvoice)
			}
		}
	}

	// 営業管理
	sales := admin.Group("/sales")
	{
		if handlers.SalesHandler != nil {
			// 営業活動管理
			activities := sales.Group("/activities")
			activities.Use(adminmiddleware.PermissionRequired("sales:read", rolePermissionRepo, logger))
			{
				activities.GET("", handlers.SalesHandler.GetSalesActivities)
				activities.GET("/summary", handlers.SalesHandler.GetSalesSummary)
				activities.GET("/:id", handlers.SalesHandler.GetSalesActivity)
			}

			activitiesWrite := sales.Group("/activities")
			activitiesWrite.Use(adminmiddleware.PermissionRequired("sales:write", rolePermissionRepo, logger))
			{
				activitiesWrite.POST("", handlers.SalesHandler.CreateSalesActivity)
				activitiesWrite.PUT("/:id", handlers.SalesHandler.UpdateSalesActivity)
				activitiesWrite.DELETE("/:id", handlers.SalesHandler.DeleteSalesActivity)
			}

			// パイプライン・目標管理
			pipeline := sales.Group("/pipeline")
			pipeline.Use(adminmiddleware.PermissionRequired("sales:read", rolePermissionRepo, logger))
			{
				pipeline.GET("", handlers.SalesHandler.GetSalesPipeline)
				pipeline.GET("/extension-targets", handlers.SalesHandler.GetExtensionTargets)
				pipeline.GET("/targets", handlers.SalesHandler.GetSalesTargets)
			}
		}
	}

	// 経理管理
	accounting := admin.Group("/accounting")
	{
		// 経理権限チェックミドルウェア
		accountingMiddleware := adminmiddleware.PermissionRequired("accounting:read", rolePermissionRepo, logger)
		accountingWriteMiddleware := adminmiddleware.PermissionRequired("accounting:write", rolePermissionRepo, logger)

		// ダッシュボード（読み取り権限）
		dashboard := accounting.Group("/dashboard")
		dashboard.Use(accountingMiddleware)
		{
			if handlers.AccountingDashboardHandler != nil {
				dashboard.GET("", handlers.AccountingDashboardHandler.GetDashboard)
				dashboard.GET("/trend", handlers.AccountingDashboardHandler.GetMonthlyTrend)
				dashboard.GET("/ranking/clients", handlers.AccountingDashboardHandler.GetClientBillingRanking)
				dashboard.GET("/ranking/projects", handlers.AccountingDashboardHandler.GetProjectBillingRanking)
				dashboard.GET("/payment-status", handlers.AccountingDashboardHandler.GetPaymentStatus)
			}
		}

		// プロジェクトグループ管理
		projectGroups := accounting.Group("/project-groups")
		{
			// 読み取り
			projectGroupsRead := projectGroups.Group("")
			projectGroupsRead.Use(accountingMiddleware)
			{
				if handlers.ProjectGroupHandler != nil {
					projectGroupsRead.GET("", handlers.ProjectGroupHandler.ListProjectGroups)
					projectGroupsRead.GET("/:id", handlers.ProjectGroupHandler.GetProjectGroup)
					projectGroupsRead.GET("/:id/statistics", handlers.ProjectGroupHandler.GetGroupStatistics)
					projectGroupsRead.POST("/validate", handlers.ProjectGroupHandler.ValidateProjectGroup)
				}
			}

			// 書き込み
			projectGroupsWrite := projectGroups.Group("")
			projectGroupsWrite.Use(accountingWriteMiddleware)
			{
				if handlers.ProjectGroupHandler != nil {
					projectGroupsWrite.POST("", handlers.ProjectGroupHandler.CreateProjectGroup)
					projectGroupsWrite.PUT("/:id", handlers.ProjectGroupHandler.UpdateProjectGroup)
					projectGroupsWrite.DELETE("/:id", handlers.ProjectGroupHandler.DeleteProjectGroup)
					projectGroupsWrite.POST("/:id/projects", handlers.ProjectGroupHandler.AddProjectsToGroup)
					projectGroupsWrite.DELETE("/:id/projects", handlers.ProjectGroupHandler.RemoveProjectsFromGroup)
				}
			}
		}

		// 請求処理管理
		billing := accounting.Group("/billing")
		{
			// 読み取り
			billingRead := billing.Group("")
			billingRead.Use(accountingMiddleware)
			{
				if handlers.BillingHandler != nil {
					billingRead.GET("/summary", handlers.BillingHandler.GetBillingSummary)
					billingRead.GET("/history", handlers.BillingHandler.GetBillingHistory)
					billingRead.GET("/scheduled", handlers.BillingHandler.GetScheduledBillings)
				}
			}

			// 書き込み
			billingWrite := billing.Group("")
			billingWrite.Use(accountingWriteMiddleware)
			{
				if handlers.BillingHandler != nil {
					billingWrite.POST("/preview", handlers.BillingHandler.PreviewBilling)
					billingWrite.POST("/process", handlers.BillingHandler.ProcessBilling)
					billingWrite.POST("/calculate", handlers.BillingHandler.CalculateBilling)
					billingWrite.POST("/report", handlers.BillingHandler.GenerateInvoiceReport)
					billingWrite.POST("/retry", handlers.BillingHandler.RetryFailedBilling)
					billingWrite.POST("/scheduled", handlers.BillingHandler.ScheduleBilling)
					billingWrite.DELETE("/scheduled/:id", handlers.BillingHandler.CancelScheduledBilling)
				}
			}
		}

		// freee連携管理
		freee := accounting.Group("/freee")
		{
			// 読み取り
			freeeRead := freee.Group("")
			freeeRead.Use(accountingMiddleware)
			{
				if handlers.FreeeHandler != nil {
					freeeRead.GET("/status", handlers.FreeeHandler.GetConnectionStatus)
					freeeRead.GET("/companies", handlers.FreeeHandler.GetCompanies)
					freeeRead.GET("/sync/history", handlers.FreeeHandler.GetSyncHistory)
					freeeRead.GET("/sync/summary", handlers.FreeeHandler.GetSyncSummary)
				}
			}

			// 書き込み
			freeeWrite := freee.Group("")
			freeeWrite.Use(accountingWriteMiddleware)
			{
				if handlers.FreeeHandler != nil {
					freeeWrite.POST("/test", handlers.FreeeHandler.TestConnection)
					freeeWrite.DELETE("/disconnect", handlers.FreeeHandler.DisconnectFreee)
					freeeWrite.POST("/oauth/initiate", handlers.FreeeHandler.InitiateOAuth)
					freeeWrite.POST("/oauth/complete", handlers.FreeeHandler.CompleteOAuth)
					freeeWrite.POST("/companies/select", handlers.FreeeHandler.SelectCompany)
					freeeWrite.POST("/sync/partners", handlers.FreeeHandler.SyncPartners)
					freeeWrite.POST("/sync/invoices", handlers.FreeeHandler.SyncInvoices)
				}
			}
		}
	}

	// ユーザー管理
	users := admin.Group("/users")
	{
		if handlers.UserHandler != nil {
			// ユーザー作成（管理者のみ）
			users.POST("", handlers.UserHandler.CreateUser)
		}
	}

    // 初期スコープ外: 分析・レポート
	// analytics := admin.Group("/analytics")
	// {
	//     analytics.GET("/utilization", handlers.AnalyticsHandler.GetUtilizationReport)
	//     analytics.GET("/revenue", handlers.AnalyticsHandler.GetRevenueReport)
	//     analytics.GET("/projects", handlers.AnalyticsHandler.GetProjectsReport)
	// }
}
