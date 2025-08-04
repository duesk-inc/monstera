package routes

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/middleware"
	"github.com/duesk/monstera/internal/model"
)

// NotificationRoutes 通知関連のルート設定
type NotificationRoutes struct {
	handler                    handler.NotificationHandler
	authMiddleware             *middleware.AuthRefactoredMiddleware
	weeklyReportAuthMiddleware *middleware.WeeklyReportAuthMiddleware
	logger                     *zap.Logger
}

// NewNotificationRoutes NotificationRoutesのインスタンスを作成
func NewNotificationRoutes(
	handler handler.NotificationHandler,
	authMiddleware *middleware.AuthRefactoredMiddleware,
	weeklyReportAuthMiddleware *middleware.WeeklyReportAuthMiddleware,
	logger *zap.Logger,
) *NotificationRoutes {
	return &NotificationRoutes{
		handler:                    handler,
		authMiddleware:             authMiddleware,
		weeklyReportAuthMiddleware: weeklyReportAuthMiddleware,
		logger:                     logger,
	}
}

// SetupRoutes 通知関連のルートを設定
func (nr *NotificationRoutes) SetupRoutes(router *gin.Engine) {
	// API v1グループ
	v1 := router.Group("/api/v1")

	// 認証が必要なエンドポイント
	auth := v1.Group("")
	auth.Use(nr.authMiddleware.AuthRequired())

	// 管理者権限が必要なエンドポイント
	admin := auth.Group("")
	admin.Use(nr.authMiddleware.RequireRoles(model.RoleAdmin, model.RoleSuperAdmin))

	// 管理者またはマネージャー権限が必要なエンドポイント
	manager := auth.Group("")
	manager.Use(nr.authMiddleware.RequireRoles(model.RoleAdmin, model.RoleSuperAdmin, model.RoleManager))

	// ユーザー向け通知API
	nr.setupUserNotificationRoutes(auth)

	// 管理者向け通知API
	nr.setupAdminNotificationRoutes(admin)

	// 週報関連通知API（管理者・マネージャー）
	nr.setupWeeklyReportNotificationRoutes(manager)

	// 統計・レポートAPI（管理者のみ）
	nr.setupNotificationStatsRoutes(admin)
}

// setupUserNotificationRoutes ユーザー向け通知ルートを設定
func (nr *NotificationRoutes) setupUserNotificationRoutes(group *gin.RouterGroup) {
	notifications := group.Group("/notifications")
	{
		// 通知一覧取得
		notifications.GET("", nr.handler.GetUserNotifications)

		// 未読通知取得
		notifications.GET("/unread", nr.handler.GetUnreadNotifications)

		// 未読通知数取得
		notifications.GET("/unread-count", nr.handler.GetUnreadCount)

		// 通知詳細取得
		notifications.GET("/:id", nr.handler.GetNotificationByID)

		// 通知操作
		notifications.PUT("/:id/read", nr.handler.MarkAsReadSingle)
		notifications.PUT("/read-all", nr.handler.MarkAllAsRead)
		notifications.PUT("/:id/hide", nr.handler.HideNotification)

		// 通知設定
		notifications.GET("/settings", nr.handler.GetUserNotificationSettings)
		notifications.PUT("/settings", nr.handler.UpdateNotificationSetting)
	}
}

// setupAdminNotificationRoutes 管理者向け通知ルートを設定
func (nr *NotificationRoutes) setupAdminNotificationRoutes(group *gin.RouterGroup) {
	admin := group.Group("/admin/notifications")
	{
		// 通知管理
		admin.GET("", nr.handler.GetAdvancedNotifications)  // 全通知一覧（フィルタ・検索付き）
		admin.POST("", nr.handler.CreateNotification)       // 通知作成
		admin.GET("/:id", nr.handler.GetNotificationByID)   // 通知詳細
		admin.PUT("/:id", nr.handler.UpdateNotification)    // 通知更新
		admin.DELETE("/:id", nr.handler.DeleteNotification) // 通知削除

		// 特定ユーザーの通知一覧
		admin.GET("/users/:user_id", func(c *gin.Context) {
			// user_idをrecipient_idクエリパラメータに設定
			c.Request.URL.RawQuery += "&recipient_id=" + c.Param("user_id")
			nr.handler.GetAdvancedNotifications(c)
		})
	}
}

// setupWeeklyReportNotificationRoutes 週報関連通知ルートを設定
func (nr *NotificationRoutes) setupWeeklyReportNotificationRoutes(group *gin.RouterGroup) {
	weeklyReport := group.Group("/weekly-reports/notifications")
	{
		// 週報リマインド
		reminders := weeklyReport.Group("/reminders")
		reminders.Use(nr.weeklyReportAuthMiddleware.RequireReminderSend())
		{
			// 個別リマインド
			reminders.POST("/single", nr.handler.SendWeeklyReportReminder)

			// 一括リマインド
			reminders.POST("/bulk", nr.handler.SendBulkReminder)
		}
	}
}

// setupNotificationStatsRoutes 通知統計ルートを設定
func (nr *NotificationRoutes) setupNotificationStatsRoutes(group *gin.RouterGroup) {
	stats := group.Group("/admin/notifications/stats")
	{
		// 通知統計
		stats.GET("", nr.handler.GetNotificationStats)

		// 期間別統計
		stats.GET("/period", func(c *gin.Context) {
			// 期間パラメータの検証を追加
			if c.Query("start_date") == "" || c.Query("end_date") == "" {
				c.JSON(400, gin.H{"error": "start_date and end_date are required"})
				return
			}
			nr.handler.GetNotificationStats(c)
		})
	}
}

// SetupWebSocketRoutes WebSocket関連のルートを設定（将来の拡張用）
func (nr *NotificationRoutes) SetupWebSocketRoutes(router *gin.Engine) {
	// WebSocketエンドポイント（リアルタイム通知用）
	ws := router.Group("/ws")
	ws.Use(nr.authMiddleware.AuthRequired())
	{
		// リアルタイム通知WebSocket
		ws.GET("/notifications", func(c *gin.Context) {
			// WebSocketハンドラーの実装（将来実装）
			c.JSON(501, gin.H{"message": "WebSocket notifications not implemented yet"})
		})
	}
}

// SetupHealthCheckRoutes ヘルスチェックルートを設定
func (nr *NotificationRoutes) SetupHealthCheckRoutes(router *gin.Engine) {
	health := router.Group("/health")
	{
		// 通知サービスの健康状態チェック
		health.GET("/notifications", func(c *gin.Context) {
			// 簡単なヘルスチェック
			c.JSON(200, gin.H{
				"service": "notifications",
				"status":  "healthy",
				"timestamp": gin.H{
					"unix": gin.H{
						"seconds": 1234567890,
					},
				},
			})
		})
	}
}
