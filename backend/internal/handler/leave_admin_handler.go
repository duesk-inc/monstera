package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type LeaveAdminHandler interface {
	GetLeaveRequests(c *gin.Context)
	ApproveLeaveRequest(c *gin.Context)
	RejectLeaveRequest(c *gin.Context)
	BulkApproveLeaveRequests(c *gin.Context)
	GetLeaveStatistics(c *gin.Context)
	GetUserLeaveStatistics(c *gin.Context)
}

type leaveAdminHandler struct {
	leaveAdminService service.LeaveAdminService
	logger            *zap.Logger
}

func NewLeaveAdminHandler(leaveAdminService service.LeaveAdminService, logger *zap.Logger) LeaveAdminHandler {
	return &leaveAdminHandler{
		leaveAdminService: leaveAdminService,
		logger:            logger,
	}
}

// GetLeaveRequests 休暇申請一覧取得
func (h *leaveAdminHandler) GetLeaveRequests(c *gin.Context) {
	// ページネーション
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// フィルター条件
	filters := repository.LeaveRequestFilters{
		UserName: c.Query("user_name"),
		Status:   c.Query("status"),
	}

	// 申請期間フィルター
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filters.StartDate = &startDate
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filters.EndDate = &endDate
		}
	}

	// 休暇種別フィルター
	if leaveTypeIDStr := c.Query("leave_type_id"); leaveTypeIDStr != "" {
		if leaveTypeID, err := uuid.Parse(leaveTypeIDStr); err == nil {
			filters.LeaveTypeID = &leaveTypeID
		}
	}

	pagination := repository.Pagination{
		Page:  page,
		Limit: limit,
	}

	// データ取得
	requests, total, err := h.leaveAdminService.GetLeaveRequests(c.Request.Context(), filters, pagination)
	if err != nil {
		h.logger.Error("Failed to get leave requests", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "休暇申請一覧の取得に失敗しました")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items": requests,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// ApproveLeaveRequest 休暇申請承認
func (h *leaveAdminHandler) ApproveLeaveRequest(c *gin.Context) {
	// リクエストID取得
	requestIDStr := c.Param("id")
	requestID := requestIDStr
	// UUID validation removed after migration
	if requestID == "" {
		utils.RespondError(c, http.StatusBadRequest, "無効なリクエストIDです")
		return
	}

	// 承認者ID取得（認証情報から）
	userID, exists := c.Get("userID")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "認証情報が見つかりません")
		return
	}
	approverID := userID.(string)

	// 承認処理
	if err := h.leaveAdminService.ApproveLeaveRequest(c.Request.Context(), requestID, approverID); err != nil {
		h.logger.Error("Failed to approve leave request", zap.Error(err), zap.String("request_id", requestIDStr))
		utils.RespondError(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "休暇申請を承認しました",
	})
}

// RejectLeaveRequest 休暇申請却下
func (h *leaveAdminHandler) RejectLeaveRequest(c *gin.Context) {
	// リクエストID取得
	requestIDStr := c.Param("id")
	requestID := requestIDStr
	// UUID validation removed after migration
	if requestID == "" {
		utils.RespondError(c, http.StatusBadRequest, "無効なリクエストIDです")
		return
	}

	// リクエストボディ取得
	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "却下理由を入力してください")
		return
	}

	// 承認者ID取得（認証情報から）
	userID, exists := c.Get("userID")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "認証情報が見つかりません")
		return
	}
	approverID := userID.(string)

	// 却下処理
	if err := h.leaveAdminService.RejectLeaveRequest(c.Request.Context(), requestID, approverID, req.Reason); err != nil {
		h.logger.Error("Failed to reject leave request", zap.Error(err), zap.String("request_id", requestIDStr))
		utils.RespondError(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "休暇申請を却下しました",
	})
}

// BulkApproveLeaveRequests 休暇申請一括承認
func (h *leaveAdminHandler) BulkApproveLeaveRequests(c *gin.Context) {
	// リクエストボディ取得
	var req struct {
		RequestIDs []string `json:"request_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "リクエストIDを指定してください")
		return
	}

	// UUID変換
	requestIDs := make([]string, 0, len(req.RequestIDs))
	for _, idStr := range req.RequestIDs {
		id := idStr
		// UUID validation removed after migration
		if id == "" {
			utils.RespondError(c, http.StatusBadRequest, "無効なリクエストIDが含まれています")
			return
		}
		requestIDs = append(requestIDs, id)
	}

	// 承認者ID取得（認証情報から）
	userID, exists := c.Get("userID")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "認証情報が見つかりません")
		return
	}
	approverID := userID.(string)

	// 一括承認処理
	results, err := h.leaveAdminService.BulkApproveLeaveRequests(c.Request.Context(), requestIDs, approverID)
	if err != nil {
		h.logger.Error("Failed to bulk approve leave requests", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "一括承認処理に失敗しました")
		return
	}

	// 成功件数をカウント
	successCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "一括承認処理が完了しました",
		"results": results,
		"summary": gin.H{
			"total":   len(results),
			"success": successCount,
			"failed":  len(results) - successCount,
		},
	})
}

// GetLeaveStatistics 休暇統計情報取得
func (h *leaveAdminHandler) GetLeaveStatistics(c *gin.Context) {
	// フィルター条件
	filters := repository.StatisticsFilters{}

	// 年フィルター
	if yearStr := c.Query("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			filters.Year = year
		}
	}

	// 月フィルター
	if monthStr := c.Query("month"); monthStr != "" {
		if month, err := strconv.Atoi(monthStr); err == nil && month >= 1 && month <= 12 {
			filters.Month = &month
		}
	}

	// 休暇種別フィルター
	if leaveTypeIDStr := c.Query("leave_type_id"); leaveTypeIDStr != "" {
		if leaveTypeID, err := uuid.Parse(leaveTypeIDStr); err == nil {
			filters.LeaveTypeID = &leaveTypeID
		}
	}

	// 統計データ取得
	stats, err := h.leaveAdminService.GetLeaveStatistics(c.Request.Context(), filters)
	if err != nil {
		h.logger.Error("Failed to get leave statistics", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "統計情報の取得に失敗しました")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// GetUserLeaveStatistics ユーザー別休暇統計情報取得
func (h *leaveAdminHandler) GetUserLeaveStatistics(c *gin.Context) {
	// ユーザーID取得
	userIDStr := c.Param("user_id")
	userID := userIDStr
	// UUID validation removed after migration
	if userID == "" {
		utils.RespondError(c, http.StatusBadRequest, "無効なユーザーIDです")
		return
	}

	// フィルター条件
	filters := repository.StatisticsFilters{}

	// 年フィルター
	if yearStr := c.Query("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			filters.Year = year
		} else {
			// デフォルトは今年
			filters.Year = time.Now().Year()
		}
	} else {
		// デフォルトは今年
		filters.Year = time.Now().Year()
	}

	// 統計データ取得
	stats, err := h.leaveAdminService.GetUserLeaveStatistics(c.Request.Context(), userID, filters)
	if err != nil {
		h.logger.Error("Failed to get user leave statistics", zap.Error(err), zap.String("user_id", userIDStr))
		utils.RespondError(c, http.StatusInternalServerError, "ユーザー統計情報の取得に失敗しました")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}
