package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// SalesHandler 営業ハンドラーのインターフェース
type SalesHandler interface {
	GetSalesActivities(c *gin.Context)  // 営業活動一覧取得
	GetSalesActivity(c *gin.Context)    // 営業活動詳細取得
	CreateSalesActivity(c *gin.Context) // 営業活動作成
	UpdateSalesActivity(c *gin.Context) // 営業活動更新
	DeleteSalesActivity(c *gin.Context) // 営業活動削除
	GetSalesSummary(c *gin.Context)     // 営業サマリ取得
	GetSalesPipeline(c *gin.Context)    // 営業パイプライン取得
	GetExtensionTargets(c *gin.Context) // 契約延長確認対象取得
	GetSalesTargets(c *gin.Context)     // 営業目標取得
}

// salesHandler 営業ハンドラーの実装
type salesHandler struct {
	BaseHandler
	salesService service.SalesService
	util         *HandlerUtil
}

// NewSalesHandler 営業ハンドラーのインスタンスを生成
func NewSalesHandler(
	salesService service.SalesService,
	logger *zap.Logger,
) SalesHandler {
	return &salesHandler{
		BaseHandler:  BaseHandler{Logger: logger},
		salesService: salesService,
		util:         NewHandlerUtil(logger),
	}
}

// GetSalesActivities 営業活動一覧取得
func (h *salesHandler) GetSalesActivities(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストパラメータを取得
	req := &dto.SalesActivitySearchRequest{}

	// ページネーション
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	req.Page = page
	req.Limit = limit

	// 検索条件
	if clientIDStr := c.Query("client_id"); clientIDStr != "" {
		clientID, err := uuid.Parse(clientIDStr)
		if err == nil {
			req.ClientID = &clientID
		}
	}

	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		projectID, err := uuid.Parse(projectIDStr)
		if err == nil {
			req.ProjectID = &projectID
		}
	}

	if userIDStr := c.Query("user_id"); userIDStr != "" {
		userID, err := uuid.Parse(userIDStr)
		if err == nil {
			req.UserID = &userID
		}
	}

	req.ActivityType = c.Query("activity_type")
	req.Status = c.Query("status")

	if dateFromStr := c.Query("date_from"); dateFromStr != "" {
		if dateFrom, err := time.Parse("2006-01-02", dateFromStr); err == nil {
			req.DateFrom = &dateFrom
		}
	}

	if dateToStr := c.Query("date_to"); dateToStr != "" {
		if dateTo, err := time.Parse("2006-01-02", dateToStr); err == nil {
			req.DateTo = &dateTo
		}
	}

	// サービス呼び出し
	activities, total, err := h.salesService.GetSalesActivities(ctx, req)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "営業活動一覧の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"activities": activities,
		"total":      total,
		"page":       req.Page,
		"limit":      req.Limit,
	})
}

// GetSalesActivity 営業活動詳細取得
func (h *salesHandler) GetSalesActivity(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	activityID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	activity, err := h.salesService.GetSalesActivityByID(ctx, activityID)
	if err != nil {
		if err.Error() == "営業活動が見つかりません" {
			RespondNotFound(c, "営業活動")
			return
		}
		HandleError(c, http.StatusInternalServerError, "営業活動詳細の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"activity": activity,
	})
}

// CreateSalesActivity 営業活動作成
func (h *salesHandler) CreateSalesActivity(c *gin.Context) {
	ctx := c.Request.Context()

	// ユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		RespondUnauthorized(c)
		return
	}

	userID, ok := userIDStr.(string)
	if !ok {
		RespondUnauthorized(c)
		return
	}

	// リクエストボディを取得
	var req dto.CreateSalesActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, map[string]string{
			"request": "リクエストが不正です",
		})
		return
	}

	// サービス呼び出し
	activity, err := h.salesService.CreateSalesActivity(ctx, userID, &req)
	if err != nil {
		if err.Error() == "取引先が見つかりません" || err.Error() == "案件が見つかりません" {
			RespondNotFound(c, "指定されたリソース")
			return
		}
		HandleError(c, http.StatusInternalServerError, "営業活動の作成に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusCreated, "営業活動を作成しました", gin.H{
		"activity": activity,
	})
}

// UpdateSalesActivity 営業活動更新
func (h *salesHandler) UpdateSalesActivity(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	activityID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// リクエストボディを取得
	var req dto.UpdateSalesActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, map[string]string{
			"request": "リクエストが不正です",
		})
		return
	}

	// サービス呼び出し
	activity, err := h.salesService.UpdateSalesActivity(ctx, activityID, &req)
	if err != nil {
		if err.Error() == "営業活動が見つかりません" {
			RespondNotFound(c, "営業活動")
			return
		}
		HandleError(c, http.StatusInternalServerError, "営業活動の更新に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "営業活動を更新しました", gin.H{
		"activity": activity,
	})
}

// DeleteSalesActivity 営業活動削除
func (h *salesHandler) DeleteSalesActivity(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	activityID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	err = h.salesService.DeleteSalesActivity(ctx, activityID)
	if err != nil {
		if err.Error() == "営業活動が見つかりません" {
			RespondNotFound(c, "営業活動")
			return
		}
		HandleError(c, http.StatusInternalServerError, "営業活動の削除に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "営業活動を削除しました", nil)
}

// GetSalesSummary 営業サマリ取得
func (h *salesHandler) GetSalesSummary(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストパラメータを取得
	var userID *string
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		id, err := uuid.Parse(userIDStr)
		if err == nil {
			userID = &id
		}
	}

	var dateFrom, dateTo *time.Time
	if dateFromStr := c.Query("date_from"); dateFromStr != "" {
		if from, err := time.Parse("2006-01-02", dateFromStr); err == nil {
			dateFrom = &from
		}
	}

	if dateToStr := c.Query("date_to"); dateToStr != "" {
		if to, err := time.Parse("2006-01-02", dateToStr); err == nil {
			dateTo = &to
		}
	}

	// サービス呼び出し
	summary, err := h.salesService.GetSalesSummary(ctx, userID, dateFrom, dateTo)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "営業サマリの取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"summary": summary,
	})
}

// GetSalesPipeline 営業パイプライン取得
func (h *salesHandler) GetSalesPipeline(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストパラメータを取得
	var userID *string
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		id, err := uuid.Parse(userIDStr)
		if err == nil {
			userID = &id
		}
	}

	// サービス呼び出し
	pipeline, err := h.salesService.GetSalesPipeline(ctx, userID)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "営業パイプラインの取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"pipeline": pipeline,
	})
}

// GetExtensionTargets 契約延長確認対象取得
func (h *salesHandler) GetExtensionTargets(c *gin.Context) {
	ctx := c.Request.Context()

	// 確認日数を取得（デフォルト: 60日）
	days, err := strconv.Atoi(c.DefaultQuery("days", "60"))
	if err != nil || days < 1 {
		days = 60
	}

	// サービス呼び出し
	targets, err := h.salesService.GetExtensionTargets(ctx, days)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "契約延長確認対象の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"targets": targets,
		"days":    days,
	})
}

// GetSalesTargets 営業目標取得
func (h *salesHandler) GetSalesTargets(c *gin.Context) {
	ctx := c.Request.Context()

	// 対象月を取得（デフォルト: 当月）
	month := c.DefaultQuery("month", time.Now().Format("2006-01"))

	// サービス呼び出し
	targets, err := h.salesService.GetSalesTargets(ctx, month)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "営業目標の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"targets": targets,
		"month":   month,
	})
}
