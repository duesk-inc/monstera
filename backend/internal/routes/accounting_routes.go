package routes

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/middleware"
	"github.com/duesk/monstera/internal/service"
)

// RegisterAccountingRoutes 経理機能関連のルートを登録
func RegisterAccountingRoutes(
	r *gin.RouterGroup,
	projectGroupHandler *handler.ProjectGroupHandler,
	billingHandler *handler.BillingHandler,
	freeeHandler *handler.FreeeHandler,
	dashboardHandler *handler.AccountingDashboardHandler,
	authMiddleware gin.HandlerFunc,
	accountingMiddleware gin.HandlerFunc,
	logger *zap.Logger,
) {
	// 経理機能グループ
	accounting := r.Group("/accounting")
	accounting.Use(authMiddleware)
	accounting.Use(accountingMiddleware) // 経理権限チェック

	// ダッシュボード関連
	dashboard := accounting.Group("/dashboard")
	{
		dashboard.GET("", dashboardHandler.GetDashboard)
		dashboard.GET("/trend", dashboardHandler.GetMonthlyTrend)
		dashboard.GET("/ranking/clients", dashboardHandler.GetClientBillingRanking)
		dashboard.GET("/ranking/projects", dashboardHandler.GetProjectBillingRanking)
		dashboard.GET("/payment-status", dashboardHandler.GetPaymentStatus)
	}

	// プロジェクトグループ関連
	projectGroups := r.Group("/project-groups")
	projectGroups.Use(authMiddleware)
	projectGroups.Use(accountingMiddleware)
	{
		projectGroups.POST("", projectGroupHandler.CreateProjectGroup)
		projectGroups.GET("", projectGroupHandler.ListProjectGroups)
		projectGroups.GET("/:id", projectGroupHandler.GetProjectGroup)
		projectGroups.PUT("/:id", projectGroupHandler.UpdateProjectGroup)
		projectGroups.DELETE("/:id", projectGroupHandler.DeleteProjectGroup)
		projectGroups.POST("/:id/projects", projectGroupHandler.AddProjectsToGroup)
		projectGroups.DELETE("/:id/projects", projectGroupHandler.RemoveProjectsFromGroup)
		projectGroups.GET("/:id/statistics", projectGroupHandler.GetGroupStatistics)
		projectGroups.POST("/validate", projectGroupHandler.ValidateProjectGroup)
	}

	// 請求処理関連
	billing := r.Group("/billing")
	billing.Use(authMiddleware)
	billing.Use(accountingMiddleware)
	{
		billing.POST("/preview", billingHandler.PreviewBilling)
		billing.POST("/process", billingHandler.ProcessBilling)
		billing.GET("/summary", billingHandler.GetBillingSummary)
		billing.POST("/calculate", billingHandler.CalculateBilling)
		billing.GET("/history", billingHandler.GetBillingHistory)
		billing.POST("/report", billingHandler.GenerateInvoiceReport)
		billing.POST("/retry", billingHandler.RetryFailedBilling)

		// スケジュール関連
		scheduled := billing.Group("/scheduled")
		{
			scheduled.GET("", billingHandler.GetScheduledBillings)
			scheduled.POST("", billingHandler.ScheduleBilling)
			scheduled.DELETE("/:id", billingHandler.CancelScheduledBilling)
		}
	}

	// freee連携関連
	freee := r.Group("/freee")
	freee.Use(authMiddleware)
	freee.Use(accountingMiddleware)
	{
		// 接続管理
		freee.GET("/status", freeeHandler.GetConnectionStatus)
		freee.POST("/test", freeeHandler.TestConnection)
		freee.DELETE("/disconnect", freeeHandler.DisconnectFreee)

		// OAuth認証
		oauth := freee.Group("/oauth")
		{
			oauth.POST("/initiate", freeeHandler.InitiateOAuth)
			oauth.POST("/complete", freeeHandler.CompleteOAuth)
		}

		// 事業所管理
		companies := freee.Group("/companies")
		{
			companies.GET("", freeeHandler.GetCompanies)
			companies.POST("/select", freeeHandler.SelectCompany)
		}

		// 同期処理
		sync := freee.Group("/sync")
		{
			sync.POST("/partners", freeeHandler.SyncPartners)
			sync.POST("/invoices", freeeHandler.SyncInvoices)
			sync.GET("/history", freeeHandler.GetSyncHistory)
			sync.GET("/summary", freeeHandler.GetSyncSummary)
		}
	}

	logger.Info("Accounting routes registered successfully")
}

// RegisterPublicAccountingRoutes 公開経理APIルートを登録（OAuth callbackなど）
func RegisterPublicAccountingRoutes(
	r *gin.RouterGroup,
	freeeService service.FreeeServiceInterface,
	logger *zap.Logger,
) {
	// freee OAuth コールバック（認証不要）
	r.GET("/freee/oauth/callback", func(c *gin.Context) {
		code := c.Query("code")
		state := c.Query("state")
		error := c.Query("error")

		if error != "" {
			logger.Error("OAuth callback error",
				zap.String("error", error),
				zap.String("description", c.Query("error_description")))
			c.JSON(400, gin.H{
				"error": "OAuth認証エラー: " + error,
			})
			return
		}

		if code == "" || state == "" {
			c.JSON(400, gin.H{
				"error": "認証コードまたはステートが不足しています",
			})
			return
		}

		// stateからユーザーIDを取得してOAuth完了処理
		// 実際の実装では、stateの検証とユーザーIDの復元が必要
		logger.Info("OAuth callback received",
			zap.String("state", state),
			zap.Bool("has_code", code != ""))

		// フロントエンドにリダイレクト
		c.Redirect(302, "/admin/accounting/freee-settings?status=success")
	})
}

// RegisterAccountingWebhooks 経理機能のWebhookルートを登録
func RegisterAccountingWebhooks(
	r *gin.RouterGroup,
	freeeService service.FreeeServiceInterface,
	webhookSecret string,
	logger *zap.Logger,
) {
	webhooks := r.Group("/webhooks")

	// freee Webhook
	webhooks.POST("/freee", middleware.VerifyWebhookSignature(webhookSecret, logger), func(c *gin.Context) {
		var payload map[string]interface{}
		if err := c.ShouldBindJSON(&payload); err != nil {
			logger.Error("Invalid webhook payload", zap.Error(err))
			c.JSON(400, gin.H{"error": "Invalid payload"})
			return
		}

		eventType, ok := payload["event_type"].(string)
		if !ok {
			c.JSON(400, gin.H{"error": "Missing event_type"})
			return
		}

		logger.Info("Received freee webhook",
			zap.String("event_type", eventType),
			zap.Any("payload", payload))

		// イベントタイプに応じた処理
		switch eventType {
		case "invoice.created":
			// 請求書作成通知
			logger.Info("Invoice created webhook received")
		case "invoice.updated":
			// 請求書更新通知
			logger.Info("Invoice updated webhook received")
		case "payment.created":
			// 入金通知
			logger.Info("Payment created webhook received")
		default:
			logger.Warn("Unknown webhook event type", zap.String("type", eventType))
		}

		c.JSON(200, gin.H{"status": "ok"})
	})
}

// RegisterAccountingHealthCheck 経理機能のヘルスチェックルートを登録
func RegisterAccountingHealthCheck(
	r *gin.RouterGroup,
	billingService service.BillingServiceInterface,
	freeeService service.FreeeServiceInterface,
	logger *zap.Logger,
) {
	r.GET("/health/accounting", func(c *gin.Context) {
		health := gin.H{
			"status": "healthy",
			"components": gin.H{
				"billing": "ok",
				"freee":   "ok",
			},
		}

		// 請求サービスのチェック
		ctx := c.Request.Context()
		now := time.Now()
		if _, err := billingService.GetBillingSummary(ctx, now.Year(), int(now.Month())); err != nil {
			health["components"].(gin.H)["billing"] = "degraded"
			health["status"] = "degraded"
			logger.Warn("Billing service health check failed", zap.Error(err))
		}

		// freeeサービスのチェック（ダミーユーザーIDで確認）
		dummyUserID := uuid.New().String()
		if _, err := freeeService.GetConnectionStatus(ctx, dummyUserID); err != nil {
			// 接続がないのは正常なので、エラーの種類を確認
			if err.Error() != "freee settings not found" {
				health["components"].(gin.H)["freee"] = "degraded"
				health["status"] = "degraded"
				logger.Warn("Freee service health check failed", zap.Error(err))
			}
		}

		statusCode := 200
		if health["status"] != "healthy" {
			statusCode = 503
		}

		c.JSON(statusCode, health)
	})
}
