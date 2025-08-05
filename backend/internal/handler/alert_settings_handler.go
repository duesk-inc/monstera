package admin

import (
	"net/http"
	"strconv"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// AlertSettingsHandler アラート設定ハンドラー
type AlertSettingsHandler struct {
	handler.BaseHandler
	alertSettingsRepo repository.AlertSettingsRepository
	alertHistoryRepo  repository.AlertHistoryRepository
	alertService      service.AlertService
	util              *handler.HandlerUtil
}

// NewAlertSettingsHandler アラート設定ハンドラーの作成
func NewAlertSettingsHandler(
	alertSettingsRepo repository.AlertSettingsRepository,
	alertHistoryRepo repository.AlertHistoryRepository,
	alertService service.AlertService,
	logger *zap.Logger,
) *AlertSettingsHandler {
	return &AlertSettingsHandler{
		BaseHandler:       handler.BaseHandler{Logger: logger},
		alertSettingsRepo: alertSettingsRepo,
		alertHistoryRepo:  alertHistoryRepo,
		alertService:      alertService,
		util:              handler.NewHandlerUtil(logger),
	}
}

// CreateAlertSettings アラート設定作成
func (h *AlertSettingsHandler) CreateAlertSettings(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.CreateAlertSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.util.RespondValidationError(c, h.util.ExtractValidationErrors(err))
		return
	}

	// 認証済みユーザーID取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// サービス呼び出し
	result, err := h.alertService.CreateAlertSettings(ctx, &req, userID)
	if err != nil {
		handler.HandleError(c, http.StatusInternalServerError,
			"アラート設定の作成に失敗しました", h.BaseHandler.Logger, err)
		return
	}

	handler.RespondSuccess(c, http.StatusCreated, "アラート設定を作成しました", gin.H{"settings": result})
}

// GetAlertSettings アラート設定取得
func (h *AlertSettingsHandler) GetAlertSettings(c *gin.Context) {
	ctx := c.Request.Context()

	// サービス呼び出し
	result, err := h.alertService.GetAlertSettings(ctx)
	if err != nil {
		if err == service.ErrAlertSettingsNotFound {
			handler.RespondNotFound(c, "アラート設定")
			return
		}
		handler.HandleError(c, http.StatusInternalServerError,
			"アラート設定の取得に失敗しました", h.BaseHandler.Logger, err)
		return
	}

	handler.RespondSuccess(c, http.StatusOK, "", gin.H{"settings": result})
}

// GetAlertSettingsList アラート設定一覧取得
func (h *AlertSettingsHandler) GetAlertSettingsList(c *gin.Context) {
	ctx := c.Request.Context()

	// ページネーションパラメータ取得
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	// サービス呼び出し
	settings, total, err := h.alertService.GetAlertSettingsList(ctx, page, limit)
	if err != nil {
		handler.HandleError(c, http.StatusInternalServerError,
			"アラート設定一覧の取得に失敗しました", h.BaseHandler.Logger, err)
		return
	}

	handler.RespondSuccess(c, http.StatusOK, "", gin.H{
		"settings": settings,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

// UpdateAlertSettings アラート設定更新
func (h *AlertSettingsHandler) UpdateAlertSettings(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータ取得
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		handler.RespondBadRequest(c, "無効なIDです")
		return
	}

	var req dto.UpdateAlertSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.util.RespondValidationError(c, h.util.ExtractValidationErrors(err))
		return
	}

	// 認証済みユーザーID取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// サービス呼び出し
	result, err := h.alertService.UpdateAlertSettings(ctx, id, &req, userID)
	if err != nil {
		if err == service.ErrAlertSettingsNotFound {
			handler.RespondNotFound(c, "アラート設定")
			return
		}
		handler.HandleError(c, http.StatusInternalServerError,
			"アラート設定の更新に失敗しました", h.BaseHandler.Logger, err)
		return
	}

	handler.RespondSuccess(c, http.StatusOK, "アラート設定を更新しました", gin.H{"settings": result})
}

// DeleteAlertSettings アラート設定削除
func (h *AlertSettingsHandler) DeleteAlertSettings(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータ取得
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		handler.RespondBadRequest(c, "無効なIDです")
		return
	}

	// サービス呼び出し
	err = h.alertService.DeleteAlertSettings(ctx, id)
	if err != nil {
		if err == service.ErrAlertSettingsNotFound {
			handler.RespondNotFound(c, "アラート設定")
			return
		}
		handler.HandleError(c, http.StatusInternalServerError,
			"アラート設定の削除に失敗しました", h.BaseHandler.Logger, err)
		return
	}

	handler.RespondSuccess(c, http.StatusOK, "アラート設定を削除しました", nil)
}

// GetAlertHistories アラート履歴一覧取得
func (h *AlertSettingsHandler) GetAlertHistories(c *gin.Context) {
	ctx := c.Request.Context()

	// フィルターパラメータ取得
	var filters dto.AlertFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		handler.RespondBadRequest(c, "無効なパラメータです")
		return
	}

	// ページネーションパラメータ取得
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	// filtersをmap[string]stringに変換
	filterMap := make(map[string]string)
	if filters.UserID != "" {
		filterMap["user_id"] = filters.UserID
	}
	if filters.AlertType != "" {
		filterMap["alert_type"] = filters.AlertType
	}
	if filters.Status != "" {
		filterMap["status"] = filters.Status
	}
	if filters.Severity != "" {
		filterMap["severity"] = filters.Severity
	}
	if filters.DateFrom != "" {
		filterMap["date_from"] = filters.DateFrom
	}
	if filters.DateTo != "" {
		filterMap["date_to"] = filters.DateTo
	}

	// サービス呼び出し
	histories, total, err := h.alertService.GetAlertHistories(ctx, filterMap, page, limit)
	if err != nil {
		handler.HandleError(c, http.StatusInternalServerError,
			"アラート履歴一覧の取得に失敗しました", h.BaseHandler.Logger, err)
		return
	}

	handler.RespondSuccess(c, http.StatusOK, "", gin.H{
		"histories": histories,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

// GetAlertHistory アラート履歴取得
func (h *AlertSettingsHandler) GetAlertHistory(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータ取得
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		handler.RespondBadRequest(c, "無効なIDです")
		return
	}

	// サービス呼び出し
	result, err := h.alertService.GetAlertHistory(ctx, id)
	if err != nil {
		if err == service.ErrAlertHistoryNotFound {
			handler.RespondNotFound(c, "アラート履歴")
			return
		}
		handler.HandleError(c, http.StatusInternalServerError,
			"アラート履歴の取得に失敗しました", h.BaseHandler.Logger, err)
		return
	}

	handler.RespondSuccess(c, http.StatusOK, "", gin.H{"history": result})
}

// UpdateAlertStatus アラートステータス更新
func (h *AlertSettingsHandler) UpdateAlertStatus(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータ取得
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		handler.RespondBadRequest(c, "無効なIDです")
		return
	}

	var req dto.UpdateAlertStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.util.RespondValidationError(c, h.util.ExtractValidationErrors(err))
		return
	}

	// 認証済みユーザーID取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// サービス呼び出し
	err = h.alertService.UpdateAlertStatus(ctx, id, req.Status, req.Comment, userID)
	if err != nil {
		if err == service.ErrAlertHistoryNotFound {
			handler.RespondNotFound(c, "アラート履歴")
			return
		}
		handler.HandleError(c, http.StatusInternalServerError,
			"アラートステータスの更新に失敗しました", h.BaseHandler.Logger, err)
		return
	}

	handler.RespondSuccess(c, http.StatusOK, "アラートステータスを更新しました", nil)
}

// GetAlertSummary アラートサマリー取得
func (h *AlertSettingsHandler) GetAlertSummary(c *gin.Context) {
	ctx := c.Request.Context()

	// サービス呼び出し
	summary, err := h.alertService.GetAlertSummary(ctx)
	if err != nil {
		handler.HandleError(c, http.StatusInternalServerError,
			"アラートサマリーの取得に失敗しました", h.BaseHandler.Logger, err)
		return
	}

	handler.RespondSuccess(c, http.StatusOK, "", gin.H{"summary": summary})
}
