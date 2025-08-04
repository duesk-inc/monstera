package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// AuditLogHandler 監査ログハンドラー
type AuditLogHandler struct {
	auditService service.AuditLogService
	logger       *zap.Logger
}

// NewAuditLogHandler 監査ログハンドラーの生成
func NewAuditLogHandler(auditService service.AuditLogService, logger *zap.Logger) *AuditLogHandler {
	return &AuditLogHandler{
		auditService: auditService,
		logger:       logger,
	}
}

// GetAuditLogsRequest 監査ログ取得リクエスト
type GetAuditLogsRequest struct {
	UserID       *string    `form:"user_id"`
	Action       *string    `form:"action"`
	ResourceType *string    `form:"resource_type"`
	ResourceID   *string    `form:"resource_id"`
	Method       *string    `form:"method"`
	IPAddress    *string    `form:"ip_address"`
	StatusCode   *int       `form:"status_code"`
	MinDuration  *int64     `form:"min_duration"`
	MaxDuration  *int64     `form:"max_duration"`
	StartDate    *time.Time `form:"start_date" time_format:"2006-01-02T15:04:05Z07:00"`
	EndDate      *time.Time `form:"end_date" time_format:"2006-01-02T15:04:05Z07:00"`
	Page         int        `form:"page,default=1"`
	Limit        int        `form:"limit,default=20"`
}

// GetSuspiciousActivitiesRequest 不審なアクティビティ取得リクエスト
type GetSuspiciousActivitiesRequest struct {
	StartDate     *time.Time `form:"start_date" time_format:"2006-01-02T15:04:05Z07:00"`
	EndDate       *time.Time `form:"end_date" time_format:"2006-01-02T15:04:05Z07:00"`
	MinAttempts   int        `form:"min_attempts,default=5"`
	TimeWindowMin int        `form:"time_window_min,default=60"`
}

// GetAuditLogs 監査ログ一覧取得
func (h *AuditLogHandler) GetAuditLogs(c *gin.Context) {
	var req GetAuditLogsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "パラメータが不正です", err.Error())
		return
	}

	// フィルターの構築
	filters := repository.AuditLogFilters{
		Action:       req.Action,
		ResourceType: req.ResourceType,
		ResourceID:   req.ResourceID,
		Method:       req.Method,
		IPAddress:    req.IPAddress,
		StatusCode:   req.StatusCode,
		MinDuration:  req.MinDuration,
		MaxDuration:  req.MaxDuration,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
		Limit:        req.Limit,
		Offset:       (req.Page - 1) * req.Limit,
	}

	// UserIDの変換
	if req.UserID != nil {
		if userID, err := uuid.Parse(*req.UserID); err == nil {
			filters.UserID = &userID
		} else {
			utils.RespondError(c, http.StatusBadRequest, "ユーザーIDの形式が不正です")
			return
		}
	}

	auditLogs, total, err := h.auditService.GetAuditLogs(c.Request.Context(), filters)
	if err != nil {
		h.logger.Error("Failed to get audit logs", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "監査ログの取得に失敗しました")
		return
	}

	totalPages := (int(total) + req.Limit - 1) / req.Limit

	utils.RespondSuccess(c, gin.H{
		"items":       auditLogs,
		"total":       total,
		"page":        req.Page,
		"limit":       req.Limit,
		"total_pages": totalPages,
	})
}

// GetUserAuditLogs ユーザーの監査ログ取得
func (h *AuditLogHandler) GetUserAuditLogs(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "ユーザーIDの形式が不正です")
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}

	auditLogs, err := h.auditService.GetUserAuditLogs(c.Request.Context(), userID, page, limit)
	if err != nil {
		h.logger.Error("Failed to get user audit logs",
			zap.Error(err),
			zap.String("user_id", userID.String()),
		)
		utils.RespondError(c, http.StatusInternalServerError, "ユーザーの監査ログ取得に失敗しました")
		return
	}

	utils.RespondSuccess(c, gin.H{
		"items": auditLogs,
		"page":  page,
		"limit": limit,
	})
}

// GetMyAuditLogs 自分の監査ログ取得
func (h *AuditLogHandler) GetMyAuditLogs(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "認証が必要です")
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}

	auditLogs, err := h.auditService.GetUserAuditLogs(c.Request.Context(), userID.(uuid.UUID), page, limit)
	if err != nil {
		h.logger.Error("Failed to get my audit logs",
			zap.Error(err),
			zap.String("user_id", userID.(uuid.UUID).String()),
		)
		utils.RespondError(c, http.StatusInternalServerError, "監査ログの取得に失敗しました")
		return
	}

	utils.RespondSuccess(c, gin.H{
		"items": auditLogs,
		"page":  page,
		"limit": limit,
	})
}

// GetResourceAuditLogs リソースの監査ログ取得
func (h *AuditLogHandler) GetResourceAuditLogs(c *gin.Context) {
	resourceType := c.Param("resource_type")
	resourceID := c.Param("resource_id")

	if resourceType == "" || resourceID == "" {
		utils.RespondError(c, http.StatusBadRequest, "リソースタイプとリソースIDが必要です")
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}

	auditLogs, err := h.auditService.GetResourceAuditLogs(
		c.Request.Context(),
		model.ResourceType(resourceType),
		resourceID,
		page,
		limit,
	)
	if err != nil {
		h.logger.Error("Failed to get resource audit logs",
			zap.Error(err),
			zap.String("resource_type", resourceType),
			zap.String("resource_id", resourceID),
		)
		utils.RespondError(c, http.StatusInternalServerError, "リソースの監査ログ取得に失敗しました")
		return
	}

	utils.RespondSuccess(c, gin.H{
		"items": auditLogs,
		"page":  page,
		"limit": limit,
	})
}

// GetSuspiciousActivities 不審なアクティビティ取得
func (h *AuditLogHandler) GetSuspiciousActivities(c *gin.Context) {
	var req GetSuspiciousActivitiesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "パラメータが不正です", err.Error())
		return
	}

	filters := repository.SuspiciousActivityFilters{
		StartDate:     req.StartDate,
		EndDate:       req.EndDate,
		MinAttempts:   req.MinAttempts,
		TimeWindowMin: req.TimeWindowMin,
	}

	activities, err := h.auditService.GetSuspiciousActivities(c.Request.Context(), filters)
	if err != nil {
		h.logger.Error("Failed to get suspicious activities", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "不審なアクティビティの取得に失敗しました")
		return
	}

	utils.RespondSuccess(c, gin.H{
		"items": activities,
	})
}

// CleanupOldLogsRequest 古いログ削除リクエスト
type CleanupOldLogsRequest struct {
	RetentionDays int `json:"retention_days" binding:"required,min=1,max=3650"`
}

// CleanupOldLogs 古い監査ログ削除
func (h *AuditLogHandler) CleanupOldLogs(c *gin.Context) {
	var req CleanupOldLogsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "パラメータが不正です", err.Error())
		return
	}

	deletedCount, err := h.auditService.CleanupOldLogs(c.Request.Context(), req.RetentionDays)
	if err != nil {
		h.logger.Error("Failed to cleanup old audit logs",
			zap.Error(err),
			zap.Int("retention_days", req.RetentionDays),
		)
		utils.RespondError(c, http.StatusInternalServerError, "古いログの削除に失敗しました")
		return
	}

	h.logger.Info("Cleaned up old audit logs",
		zap.Int64("deleted_count", deletedCount),
		zap.Int("retention_days", req.RetentionDays),
	)

	utils.RespondSuccess(c, gin.H{
		"deleted_count":  deletedCount,
		"retention_days": req.RetentionDays,
		"cleanup_date":   time.Now(),
	})
}

// SetupAuditLogRoutes 監査ログルートの設定
func SetupAuditLogRoutes(router *gin.RouterGroup, handler *AuditLogHandler) {
	audit := router.Group("/audit-logs")
	{
		// 管理者のみアクセス可能
		audit.GET("", handler.GetAuditLogs)                                               // 監査ログ一覧
		audit.GET("/users/:user_id", handler.GetUserAuditLogs)                            // ユーザーの監査ログ
		audit.GET("/resources/:resource_type/:resource_id", handler.GetResourceAuditLogs) // リソースの監査ログ
		audit.GET("/suspicious", handler.GetSuspiciousActivities)                         // 不審なアクティビティ
		audit.DELETE("/cleanup", handler.CleanupOldLogs)                                  // 古いログ削除
	}

	// 一般ユーザーもアクセス可能
	router.GET("/my-audit-logs", handler.GetMyAuditLogs) // 自分の監査ログ
}
