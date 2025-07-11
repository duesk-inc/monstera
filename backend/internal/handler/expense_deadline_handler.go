package handler

import (
	"net/http"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ExpenseDeadlineHandler 経費申請期限設定ハンドラー
type ExpenseDeadlineHandler struct {
	expenseService service.ExpenseService
	handlerUtil    *HandlerUtil
	logger         *zap.Logger
}

// NewExpenseDeadlineHandler 経費申請期限設定ハンドラーのインスタンスを生成
func NewExpenseDeadlineHandler(
	expenseService service.ExpenseService,
	logger *zap.Logger,
) *ExpenseDeadlineHandler {
	return &ExpenseDeadlineHandler{
		expenseService: expenseService,
		handlerUtil:    NewHandlerUtil(logger),
		logger:         logger,
	}
}

// GetDeadlineSettings 期限設定一覧を取得
// @Summary 期限設定一覧取得
// @Description 経費申請の期限設定一覧を取得します
// @Tags ExpenseDeadline
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/admin/expense-deadline-settings [get]
func (h *ExpenseDeadlineHandler) GetDeadlineSettings(c *gin.Context) {
	h.logger.Info("期限設定一覧取得API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil || !isAdmin {
		RespondError(c, http.StatusForbidden, "管理者権限が必要です")
		return
	}

	// 期限設定一覧を取得
	settings, err := h.expenseService.GetDeadlineSettings(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get deadline settings", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "期限設定の取得に失敗しました")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": settings})
}

// CreateDeadlineSetting 期限設定を作成
// @Summary 期限設定作成
// @Description 新しい期限設定を作成します
// @Tags ExpenseDeadline
// @Accept json
// @Produce json
// @Param body body model.ExpenseDeadlineSetting true "期限設定情報"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/admin/expense-deadline-settings [post]
func (h *ExpenseDeadlineHandler) CreateDeadlineSetting(c *gin.Context) {
	h.logger.Info("期限設定作成API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil || !isAdmin {
		RespondError(c, http.StatusForbidden, "管理者権限が必要です")
		return
	}

	// リクエストボディをバインド
	var setting model.ExpenseDeadlineSetting
	if err := c.ShouldBindJSON(&setting); err != nil {
		h.logger.Error("Failed to bind deadline setting request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// 作成者を設定
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}
	setting.CreatedBy = userID

	// 期限設定を作成
	if err := h.expenseService.CreateDeadlineSetting(c.Request.Context(), &setting); err != nil {
		h.logger.Error("Failed to create deadline setting", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "期限設定の作成に失敗しました")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": setting})
}

// UpdateDeadlineSetting 期限設定を更新
// @Summary 期限設定更新
// @Description 期限設定を更新します
// @Tags ExpenseDeadline
// @Accept json
// @Produce json
// @Param id path string true "期限設定ID"
// @Param body body model.ExpenseDeadlineSetting true "期限設定情報"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/admin/expense-deadline-settings/{id} [put]
func (h *ExpenseDeadlineHandler) UpdateDeadlineSetting(c *gin.Context) {
	h.logger.Info("期限設定更新API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil || !isAdmin {
		RespondError(c, http.StatusForbidden, "管理者権限が必要です")
		return
	}

	// パスパラメータから期限設定IDを取得
	settingID, ok := h.handlerUtil.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	// リクエストボディをバインド
	var setting model.ExpenseDeadlineSetting
	if err := c.ShouldBindJSON(&setting); err != nil {
		h.logger.Error("Failed to bind deadline setting request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// IDを設定
	setting.ID = settingID

	// 期限設定を更新
	if err := h.expenseService.UpdateDeadlineSetting(c.Request.Context(), &setting); err != nil {
		h.logger.Error("Failed to update deadline setting", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "期限設定の更新に失敗しました")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": setting})
}

// DeleteDeadlineSetting 期限設定を削除
// @Summary 期限設定削除
// @Description 期限設定を削除します
// @Tags ExpenseDeadline
// @Accept json
// @Produce json
// @Param id path string true "期限設定ID"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/admin/expense-deadline-settings/{id} [delete]
func (h *ExpenseDeadlineHandler) DeleteDeadlineSetting(c *gin.Context) {
	h.logger.Info("期限設定削除API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil || !isAdmin {
		RespondError(c, http.StatusForbidden, "管理者権限が必要です")
		return
	}

	// パスパラメータから期限設定IDを取得
	settingID, ok := h.handlerUtil.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	// 期限設定を削除
	if err := h.expenseService.DeleteDeadlineSetting(c.Request.Context(), settingID); err != nil {
		h.logger.Error("Failed to delete deadline setting", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "期限設定の削除に失敗しました")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "期限設定を削除しました"})
}
