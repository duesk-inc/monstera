package handler

import (
	"net/http"
	"strconv"

	"github.com/duesk/monstera/internal/common/userutil"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ExpenseApproverSettingHandler 承認者設定ハンドラー
type ExpenseApproverSettingHandler struct {
	settingService service.ExpenseApproverSettingService
	logger         *zap.Logger
}

// NewExpenseApproverSettingHandler 承認者設定ハンドラーのインスタンスを生成
func NewExpenseApproverSettingHandler(
	settingService service.ExpenseApproverSettingService,
	logger *zap.Logger,
) *ExpenseApproverSettingHandler {
	return &ExpenseApproverSettingHandler{
		settingService: settingService,
		logger:         logger,
	}
}

// CreateApproverSetting 承認者設定を作成
// @Summary 承認者設定を作成
// @Description 経費申請の承認者を設定します
// @Tags Expense Approver Settings
// @Accept json
// @Produce json
// @Param request body dto.ExpenseApproverSettingRequest true "承認者設定リクエスト"
// @Success 201 {object} dto.ExpenseApproverSettingResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/expense-approvers [post]
func (h *ExpenseApproverSettingHandler) CreateApproverSetting(c *gin.Context) {
	var req dto.ExpenseApproverSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request body", zap.Error(err))
		utils.RespondError(c, http.StatusBadRequest, "リクエストが不正です")
		return
	}

	// ユーザーIDを取得
	userID, ok := userutil.GetUserIDFromContext(c, h.logger)
	if !ok {
		h.logger.Error("Failed to get user ID from context")
		utils.RespondError(c, http.StatusUnauthorized, "認証が必要です")
		return
	}

	// 承認者設定を作成
	setting, err := h.settingService.CreateApproverSetting(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("Failed to create approver setting", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	// レスポンスを作成
	var response dto.ExpenseApproverSettingResponse
	response.FromModel(setting)

	c.JSON(http.StatusCreated, response)
}

// GetApproverSettings 承認者設定一覧を取得
// @Summary 承認者設定一覧を取得
// @Description すべての承認者設定を取得します
// @Tags Expense Approver Settings
// @Accept json
// @Produce json
// @Param approval_type query string false "承認タイプ (manager, executive)"
// @Success 200 {object} dto.ExpenseApproverSettingsResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/expense-approvers [get]
func (h *ExpenseApproverSettingHandler) GetApproverSettings(c *gin.Context) {
	approvalType := c.Query("approval_type")

	var response *dto.ExpenseApproverSettingsResponse
	var err error

	if approvalType != "" {
		// 承認タイプ別に取得
		response, err = h.settingService.GetApproverSettingsByType(c.Request.Context(), approvalType)
	} else {
		// すべて取得
		response, err = h.settingService.GetApproverSettings(c.Request.Context())
	}

	if err != nil {
		h.logger.Error("Failed to get approver settings", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

// UpdateApproverSetting 承認者設定を更新
// @Summary 承認者設定を更新
// @Description 既存の承認者設定を更新します
// @Tags Expense Approver Settings
// @Accept json
// @Produce json
// @Param id path string true "設定ID"
// @Param request body dto.ExpenseApproverSettingRequest true "承認者設定リクエスト"
// @Success 200 {object} dto.ExpenseApproverSettingResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/expense-approvers/{id} [put]
func (h *ExpenseApproverSettingHandler) UpdateApproverSetting(c *gin.Context) {
	// 設定IDを取得
	settingIDStr := c.Param("id")
	settingID := settingIDStr
	// UUID validation removed after migration
	if settingID == "" {
		h.logger.Error("Invalid setting ID", zap.Error(err))
		utils.RespondError(c, http.StatusBadRequest, "設定IDが不正です")
		return
	}

	var req dto.ExpenseApproverSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request body", zap.Error(err))
		utils.RespondError(c, http.StatusBadRequest, "リクエストが不正です")
		return
	}

	// ユーザーIDを取得
	userID, ok := userutil.GetUserIDFromContext(c, h.logger)
	if !ok {
		h.logger.Error("Failed to get user ID from context")
		utils.RespondError(c, http.StatusUnauthorized, "認証が必要です")
		return
	}

	// 承認者設定を更新
	setting, err := h.settingService.UpdateApproverSetting(c.Request.Context(), settingID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to update approver setting", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	// レスポンスを作成
	var response dto.ExpenseApproverSettingResponse
	response.FromModel(setting)

	c.JSON(http.StatusOK, response)
}

// DeleteApproverSetting 承認者設定を削除
// @Summary 承認者設定を削除
// @Description 承認者設定を削除します
// @Tags Expense Approver Settings
// @Accept json
// @Produce json
// @Param id path string true "設定ID"
// @Success 204
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/expense-approvers/{id} [delete]
func (h *ExpenseApproverSettingHandler) DeleteApproverSetting(c *gin.Context) {
	// 設定IDを取得
	settingIDStr := c.Param("id")
	settingID := settingIDStr
	// UUID validation removed after migration
	if settingID == "" {
		h.logger.Error("Invalid setting ID", zap.Error(err))
		utils.RespondError(c, http.StatusBadRequest, "設定IDが不正です")
		return
	}

	// ユーザーIDを取得
	userID, ok := userutil.GetUserIDFromContext(c, h.logger)
	if !ok {
		h.logger.Error("Failed to get user ID from context")
		utils.RespondError(c, http.StatusUnauthorized, "認証が必要です")
		return
	}

	// 承認者設定を削除
	if err := h.settingService.DeleteApproverSetting(c.Request.Context(), settingID, userID); err != nil {
		h.logger.Error("Failed to delete approver setting", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

// GetApproverSettingHistories 承認者設定履歴を取得
// @Summary 承認者設定履歴を取得
// @Description 承認者設定の変更履歴を取得します
// @Tags Expense Approver Settings
// @Accept json
// @Produce json
// @Param page query int false "ページ番号" default(1)
// @Param limit query int false "1ページあたりの件数" default(20) maximum(100)
// @Param setting_id query string false "設定ID"
// @Success 200 {object} dto.ExpenseApproverSettingHistoriesResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/expense-approvers/histories [get]
func (h *ExpenseApproverSettingHandler) GetApproverSettingHistories(c *gin.Context) {
	// ページネーション
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	settingIDStr := c.Query("setting_id")

	var response *dto.ExpenseApproverSettingHistoriesResponse
	var err error

	if settingIDStr != "" {
		// 特定の設定の履歴を取得
		settingID := settingIDStr
		// UUID validation removed after migration
		if settingID == "" {
			h.logger.Error("Invalid setting ID", zap.Error(err))
			utils.RespondError(c, http.StatusBadRequest, "設定IDが不正です")
			return
		}
		response, err = h.settingService.GetApproverSettingHistoryByID(c.Request.Context(), settingID)
	} else {
		// すべての履歴を取得
		response, err = h.settingService.GetApproverSettingHistories(c.Request.Context(), page, limit)
	}

	if err != nil {
		h.logger.Error("Failed to get approver setting histories", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}
