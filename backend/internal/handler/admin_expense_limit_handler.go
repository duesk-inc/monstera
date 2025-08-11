package handler

import (
	"net/http"

	"github.com/duesk/monstera/internal/constants"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AdminExpenseLimitHandler 管理者向け経費申請上限関連のハンドラー
type AdminExpenseLimitHandler struct {
	expenseService service.ExpenseService
	logger         *zap.Logger
	handlerUtil    *HandlerUtil
}

// NewAdminExpenseLimitHandler AdminExpenseLimitHandlerのインスタンスを生成
func NewAdminExpenseLimitHandler(expenseService service.ExpenseService, logger *zap.Logger) *AdminExpenseLimitHandler {
	return &AdminExpenseLimitHandler{
		expenseService: expenseService,
		logger:         logger,
		handlerUtil:    NewHandlerUtil(logger),
	}
}

// GetExpenseLimits 経費申請上限一覧を取得（スコープ対応）
func (h *AdminExpenseLimitHandler) GetExpenseLimits(c *gin.Context) {
	h.logger.Info("管理者向け経費申請上限一覧取得API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrLimitChangePermissionDenied, "管理者権限が必要です")
		return
	}

	// クエリパラメータをバインド
	var filter dto.ExpenseLimitListRequest
	if err := c.ShouldBindQuery(&filter); err != nil {
		h.logger.Error("Failed to bind expense limit list request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// デフォルト値を設定
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 10
	}

	// サービスから取得
	response, err := h.expenseService.GetExpenseLimitsWithScope(c.Request.Context(), &filter)
	if err != nil {
		h.logger.Error("Failed to get expense limits with scope", zap.Error(err))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "経費申請上限一覧の取得に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費申請上限一覧取得成功",
		zap.Int("total", response.Total),
		zap.Int("page", response.Page))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// GetExpenseLimit 経費申請上限詳細を取得
func (h *AdminExpenseLimitHandler) GetExpenseLimit(c *gin.Context) {
	h.logger.Info("管理者向け経費申請上限詳細取得API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrLimitChangePermissionDenied, "管理者権限が必要です")
		return
	}

	// 上限IDをパース
	limitID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// サービスから取得
	response, err := h.expenseService.GetExpenseLimitByID(c.Request.Context(), limitID)
	if err != nil {
		h.logger.Error("Failed to get expense limit by ID", zap.Error(err), zap.String("limit_id", limitID))

		if err.Error() == "経費申請上限が見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrLimitNotFound, "経費申請上限が見つかりません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "経費申請上限詳細の取得に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費申請上限詳細取得成功",
		zap.String("limit_id", limitID))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// CreateExpenseLimit 経費申請上限を作成（スコープ対応）
func (h *AdminExpenseLimitHandler) CreateExpenseLimit(c *gin.Context) {
	h.logger.Info("管理者向け経費申請上限作成API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrLimitChangePermissionDenied, "管理者権限が必要です")
		return
	}

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.CreateExpenseLimitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind create expense limit request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// サービスで作成
	response, err := h.expenseService.CreateExpenseLimitWithScope(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("Failed to create expense limit with scope", zap.Error(err))

		// バリデーションエラーの場合
		if err.Error() == "個人制限の場合、ユーザーIDは必須です" ||
			err.Error() == "部門制限の場合、部門IDは必須です" ||
			err.Error() == "全社制限の場合、ユーザーIDと部門IDは指定できません" {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrLimitScopeTargetRequired, err.Error())
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "経費申請上限の作成に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費申請上限作成成功",
		zap.String("limit_id", response.ID),
		zap.String("limit_type", response.LimitType),
		zap.String("limit_scope", response.LimitScope))

	c.JSON(http.StatusCreated, gin.H{"data": response})
}

// UpdateExpenseLimit 経費申請上限を更新（スコープ対応）
func (h *AdminExpenseLimitHandler) UpdateExpenseLimit(c *gin.Context) {
	h.logger.Info("管理者向け経費申請上限更新API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrLimitChangePermissionDenied, "管理者権限が必要です")
		return
	}

	// 上限IDをパース
	limitID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.UpdateExpenseLimitV2Request
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind update expense limit request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// サービスで更新
	response, err := h.expenseService.UpdateExpenseLimitWithScope(c.Request.Context(), limitID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to update expense limit with scope", zap.Error(err), zap.String("limit_id", limitID))

		if err.Error() == "経費申請上限が見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrLimitNotFound, "経費申請上限が見つかりません")
			return
		}

		// バリデーションエラーの場合
		if err.Error() == "個人制限の場合、ユーザーIDは必須です" ||
			err.Error() == "部門制限の場合、部門IDは必須です" ||
			err.Error() == "全社制限の場合、ユーザーIDと部門IDは指定できません" {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrLimitScopeTargetRequired, err.Error())
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "経費申請上限の更新に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費申請上限更新成功",
		zap.String("limit_id", limitID),
		zap.String("new_limit_id", response.ID),
		zap.String("limit_type", response.LimitType),
		zap.String("limit_scope", response.LimitScope))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// DeleteExpenseLimit 経費申請上限を削除
func (h *AdminExpenseLimitHandler) DeleteExpenseLimit(c *gin.Context) {
	h.logger.Info("管理者向け経費申請上限削除API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrLimitChangePermissionDenied, "管理者権限が必要です")
		return
	}

	// 上限IDをパース
	limitID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// サービスで削除
	err = h.expenseService.DeleteExpenseLimitWithScope(c.Request.Context(), limitID)
	if err != nil {
		h.logger.Error("Failed to delete expense limit with scope", zap.Error(err), zap.String("limit_id", limitID))

		if err.Error() == "経費申請上限が見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrLimitNotFound, "経費申請上限が見つかりません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "経費申請上限の削除に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費申請上限削除成功",
		zap.String("limit_id", limitID))

	c.JSON(http.StatusNoContent, nil)
}

// GetExpenseLimitHistory 経費申請上限履歴を取得
func (h *AdminExpenseLimitHandler) GetExpenseLimitHistory(c *gin.Context) {
	h.logger.Info("管理者向け経費申請上限履歴取得API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrLimitChangePermissionDenied, "管理者権限が必要です")
		return
	}

	// クエリパラメータをバインド
	var filter dto.ExpenseLimitHistoryRequest
	if err := c.ShouldBindQuery(&filter); err != nil {
		h.logger.Error("Failed to bind expense limit history request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// デフォルト値を設定
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 20
	}

	// サービスから取得
	response, err := h.expenseService.GetExpenseLimitHistory(c.Request.Context(), &filter)
	if err != nil {
		h.logger.Error("Failed to get expense limit history", zap.Error(err))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "経費申請上限履歴の取得に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費申請上限履歴取得成功",
		zap.Int64("total", response.Total),
		zap.Int("page", response.Page))

	c.JSON(http.StatusOK, gin.H{"data": response})
}
