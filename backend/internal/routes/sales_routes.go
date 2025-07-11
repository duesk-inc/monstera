package routes

import (
	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/middleware"
	"github.com/duesk/monstera/internal/repository"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SalesHandlers 営業関連ハンドラーをまとめた構造体
type SalesHandlers struct {
	ProposalHandler          handler.ProposalHandler
	ContractExtensionHandler handler.ContractExtensionHandler
	InterviewScheduleHandler handler.InterviewScheduleHandler
	SalesEmailHandler        handler.SalesEmailHandler
	PocSyncHandler           handler.PocSyncHandler
	SalesTeamHandler         handler.SalesTeamHandler
}

// SetupSalesRoutes 営業関連ルートの設定
func SetupSalesRoutes(r *gin.RouterGroup, cfg *config.Config, handlers *SalesHandlers, logger *zap.Logger, rolePermissionRepo repository.RolePermissionRepository) {
	// 営業グループ（認証必須）
	sales := r.Group("/sales")
	sales.Use(middleware.AuthMiddleware(cfg, logger))

	// 提案管理
	proposals := sales.Group("/proposals")
	{
		// 提案CRUD
		proposals.POST("", handlers.ProposalHandler.CreateProposal)
		proposals.GET("", handlers.ProposalHandler.GetProposalList)
		proposals.GET("/:id", handlers.ProposalHandler.GetProposal)
		proposals.PUT("/:id", handlers.ProposalHandler.UpdateProposal)
		proposals.PUT("/:id/status", handlers.ProposalHandler.UpdateProposalStatus)
		proposals.DELETE("/:id", handlers.ProposalHandler.DeleteProposal)

		// ビジネスロジック
		proposals.GET("/engineers/:engineer_id/active", handlers.ProposalHandler.GetActiveProposalsByEngineer)
		proposals.GET("/parallel", handlers.ProposalHandler.GetParallelProposals)
		proposals.GET("/statistics", handlers.ProposalHandler.GetProposalStatistics)
		proposals.GET("/deadlines/upcoming", handlers.ProposalHandler.GetUpcomingDeadlines)
	}

	// 契約延長管理
	extensions := sales.Group("/extensions")
	{
		// 延長確認CRUD
		extensions.POST("", handlers.ContractExtensionHandler.CreateExtensionCheck)
		extensions.GET("", handlers.ContractExtensionHandler.GetExtensionCheckList)
		extensions.GET("/:id", handlers.ContractExtensionHandler.GetExtensionCheck)
		extensions.PUT("/:id", handlers.ContractExtensionHandler.UpdateExtensionCheck)
		extensions.PUT("/:id/status", handlers.ContractExtensionHandler.UpdateExtensionStatus)
		extensions.DELETE("/:id", handlers.ContractExtensionHandler.DeleteExtensionCheck)

		// ビジネスロジック
		extensions.GET("/targets", handlers.ContractExtensionHandler.GetExtensionTargets)
		extensions.GET("/engineers/:engineer_id/latest", handlers.ContractExtensionHandler.GetLatestByEngineer)
		extensions.GET("/pending", handlers.ContractExtensionHandler.GetPendingExtensions)
		extensions.POST("/auto-create", handlers.ContractExtensionHandler.AutoCreateExtensionChecks)

		// 設定管理
		extensions.GET("/settings", handlers.ContractExtensionHandler.GetExtensionSettings)
		extensions.PUT("/settings", handlers.ContractExtensionHandler.UpdateExtensionSettings)
	}

	// 面談スケジュール管理
	interviews := sales.Group("/interviews")
	{
		// 面談CRUD
		interviews.POST("", handlers.InterviewScheduleHandler.CreateInterview)
		interviews.GET("", handlers.InterviewScheduleHandler.GetInterviewList)
		interviews.GET("/:id", handlers.InterviewScheduleHandler.GetInterview)
		interviews.PUT("/:id", handlers.InterviewScheduleHandler.UpdateInterview)
		interviews.PUT("/:id/status", handlers.InterviewScheduleHandler.UpdateInterviewStatus)
		interviews.DELETE("/:id", handlers.InterviewScheduleHandler.DeleteInterview)

		// ビジネスロジック
		interviews.GET("/calendar", handlers.InterviewScheduleHandler.GetCalendarView)
		interviews.GET("/upcoming", handlers.InterviewScheduleHandler.GetUpcomingInterviews)
		interviews.GET("/proposals/:proposal_id", handlers.InterviewScheduleHandler.GetInterviewsByProposal)
		interviews.POST("/conflicts/check", handlers.InterviewScheduleHandler.CheckConflictingInterviews)

		// 設定管理
		interviews.GET("/reminder-settings", handlers.InterviewScheduleHandler.GetReminderSettings)
		interviews.PUT("/reminder-settings", handlers.InterviewScheduleHandler.UpdateReminderSettings)
	}

	// 営業メール管理
	emails := sales.Group("/emails")
	{
		// テンプレート管理
		templates := emails.Group("/templates")
		{
			templates.POST("", handlers.SalesEmailHandler.CreateEmailTemplate)
			templates.GET("", handlers.SalesEmailHandler.GetEmailTemplateList)
			templates.GET("/:id", handlers.SalesEmailHandler.GetEmailTemplate)
			templates.PUT("/:id", handlers.SalesEmailHandler.UpdateEmailTemplate)
			templates.DELETE("/:id", handlers.SalesEmailHandler.DeleteEmailTemplate)
		}

		// キャンペーン管理
		campaigns := emails.Group("/campaigns")
		{
			campaigns.POST("", handlers.SalesEmailHandler.CreateEmailCampaign)
			campaigns.GET("", handlers.SalesEmailHandler.GetEmailCampaignList)
			campaigns.GET("/:id", handlers.SalesEmailHandler.GetEmailCampaign)
			campaigns.PUT("/:id", handlers.SalesEmailHandler.UpdateEmailCampaign)
			campaigns.DELETE("/:id", handlers.SalesEmailHandler.DeleteEmailCampaign)

			// キャンペーン送信・統計
			campaigns.POST("/:id/send", handlers.SalesEmailHandler.SendCampaign)
			campaigns.GET("/:id/stats", handlers.SalesEmailHandler.GetCampaignStats)
			campaigns.GET("/:id/history", handlers.SalesEmailHandler.GetSentHistory)
		}

		// メール送信
		emails.POST("/proposal", handlers.SalesEmailHandler.SendProposalEmail)
		emails.POST("/interviews/:interview_id/confirmation", handlers.SalesEmailHandler.SendInterviewConfirmation)
		emails.POST("/extensions/:extension_id/request", handlers.SalesEmailHandler.SendContractExtensionRequest)
	}

	// POC同期管理
	pocSync := sales.Group("/poc-sync")
	{
		// 同期処理
		pocSync.POST("/sync/all", handlers.PocSyncHandler.SyncAllProjects)
		pocSync.POST("/sync/projects/:poc_project_id", handlers.PocSyncHandler.SyncProjectByID)
		pocSync.POST("/sync/force", handlers.PocSyncHandler.ForceSync)
		pocSync.POST("/sync/scheduled", handlers.PocSyncHandler.RunScheduledSync)

		// 同期状況管理
		pocSync.GET("/status", handlers.PocSyncHandler.GetSyncStatus)
		pocSync.GET("/unsynced", handlers.PocSyncHandler.GetUnsyncedProjects)
		pocSync.GET("/history", handlers.PocSyncHandler.GetSyncHistory)

		// 手動操作
		pocSync.POST("/projects", handlers.PocSyncHandler.CreateProjectFromPoc)
		pocSync.PUT("/projects/:id", handlers.PocSyncHandler.UpdateProjectFromPoc)

		// 設定管理
		pocSync.GET("/settings", handlers.PocSyncHandler.GetSyncSettings)
		pocSync.PUT("/settings", handlers.PocSyncHandler.UpdateSyncSettings)
	}

	// エンジニア提案への質問管理
	questions := sales.Group("/questions")
	{
		// 未回答質問一覧取得
		questions.GET("/pending", handlers.ProposalHandler.GetPendingQuestions)
		// 質問への回答
		questions.PUT("/:id/response", handlers.ProposalHandler.RespondToQuestion)
		// 営業担当者への割り当て
		questions.PUT("/:id/assign", handlers.ProposalHandler.AssignQuestionToSales)
	}

	// エンジニア提案管理（読み取り専用）
	engineerProposals := sales.Group("/engineer-proposals")
	{
		// 提案一覧（営業担当者が関わる提案のみ）
		engineerProposals.GET("", handlers.ProposalHandler.GetProposals)
		// 提案詳細
		engineerProposals.GET("/:id", handlers.ProposalHandler.GetProposalDetail)
		// 提案への質問一覧
		engineerProposals.GET("/:id/questions", handlers.ProposalHandler.GetQuestions)
	}

	// 営業チーム管理
	team := sales.Group("/team")
	{
		// チームメンバー管理
		team.POST("/members", handlers.SalesTeamHandler.AddTeamMember)
		team.GET("/members", handlers.SalesTeamHandler.GetTeamMembers)
		team.PUT("/members/:user_id/role", handlers.SalesTeamHandler.UpdateMemberRole)
		team.DELETE("/members/:user_id", handlers.SalesTeamHandler.RemoveTeamMember)

		// 権限管理
		permissions := team.Group("/permissions")
		{
			permissions.GET("/users/:user_id", handlers.SalesTeamHandler.GetUserPermissions)
			permissions.GET("", handlers.SalesTeamHandler.GetUserPermissions) // 自分の権限
			permissions.POST("", handlers.SalesTeamHandler.GrantPermission)
			permissions.DELETE("/:permission_id", handlers.SalesTeamHandler.RevokePermission)
		}

		// アクセス制御
		team.POST("/check-permission", handlers.SalesTeamHandler.CheckPermission)
		team.POST("/check-access", handlers.SalesTeamHandler.CheckResourceAccess)

		// 営業データアクセス
		team.GET("/accessible/proposals", handlers.SalesTeamHandler.GetAccessibleProposals)
		team.GET("/accessible/interviews", handlers.SalesTeamHandler.GetAccessibleInterviews)
		team.GET("/accessible/extensions", handlers.SalesTeamHandler.GetAccessibleExtensions)

		// 設定管理
		team.GET("/settings", handlers.SalesTeamHandler.GetTeamSettings)
		team.PUT("/settings", handlers.SalesTeamHandler.UpdateTeamSettings)
	}
}

// SetupAdminSalesRoutes 管理者用営業ルートの設定
func SetupAdminSalesRoutes(r *gin.RouterGroup, cfg *config.Config, handlers *SalesHandlers, logger *zap.Logger, rolePermissionRepo repository.RolePermissionRepository) {
	// 管理者営業グループ
	adminSales := r.Group("/admin/sales")
	adminSales.Use(middleware.AuthMiddleware(cfg, logger))
	adminSales.Use(middleware.AdminRequired(logger))

	// 管理者専用エンドポイント
	adminSales.GET("/dashboard", func(c *gin.Context) {
		// TODO: 営業ダッシュボードハンドラー実装
		c.JSON(200, gin.H{"message": "Sales dashboard - TODO"})
	})

	// 全体統計
	adminSales.GET("/statistics/overview", func(c *gin.Context) {
		// TODO: 営業統計ハンドラー実装
		c.JSON(200, gin.H{"message": "Sales statistics overview - TODO"})
	})

	// バッチ処理管理
	batch := adminSales.Group("/batch")
	{
		batch.POST("/extensions/auto-create", handlers.ContractExtensionHandler.AutoCreateExtensionChecks)
		batch.POST("/poc-sync/scheduled", handlers.PocSyncHandler.RunScheduledSync)
	}

	// システム設定
	settings := adminSales.Group("/settings")
	{
		settings.GET("/extensions", handlers.ContractExtensionHandler.GetExtensionSettings)
		settings.PUT("/extensions", handlers.ContractExtensionHandler.UpdateExtensionSettings)
		settings.GET("/interviews/reminders", handlers.InterviewScheduleHandler.GetReminderSettings)
		settings.PUT("/interviews/reminders", handlers.InterviewScheduleHandler.UpdateReminderSettings)
		settings.GET("/poc-sync", handlers.PocSyncHandler.GetSyncSettings)
		settings.PUT("/poc-sync", handlers.PocSyncHandler.UpdateSyncSettings)
		settings.GET("/team", handlers.SalesTeamHandler.GetTeamSettings)
		settings.PUT("/team", handlers.SalesTeamHandler.UpdateTeamSettings)
	}
}
