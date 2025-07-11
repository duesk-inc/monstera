package handler

import (
	"net/http"
	"strings"

	"github.com/duesk/monstera/internal/constants"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AdminCategoryHandler 管理者向け経費カテゴリ関連のハンドラー
type AdminCategoryHandler struct {
	expenseService service.ExpenseService
	logger         *zap.Logger
	handlerUtil    *HandlerUtil
}

// NewAdminCategoryHandler AdminCategoryHandlerのインスタンスを生成
func NewAdminCategoryHandler(expenseService service.ExpenseService, logger *zap.Logger) *AdminCategoryHandler {
	return &AdminCategoryHandler{
		expenseService: expenseService,
		logger:         logger,
		handlerUtil:    NewHandlerUtil(logger),
	}
}

// GetCategories 経費カテゴリ一覧を取得
func (h *AdminCategoryHandler) GetCategories(c *gin.Context) {
	h.logger.Info("管理者向け経費カテゴリ一覧取得API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrCategoryPermissionDenied, "管理者権限が必要です")
		return
	}

	// クエリパラメータをバインド
	var filter dto.ExpenseCategoryListRequest
	if err := c.ShouldBindQuery(&filter); err != nil {
		h.logger.Error("Failed to bind category list request", zap.Error(err))
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
	response, err := h.expenseService.GetCategoriesWithFilter(c.Request.Context(), &filter)
	if err != nil {
		h.logger.Error("Failed to get categories with filter", zap.Error(err))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "経費カテゴリ一覧の取得に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費カテゴリ一覧取得成功",
		zap.Int64("total", response.Total),
		zap.Int("page", response.Page))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// GetCategory 経費カテゴリ詳細を取得
func (h *AdminCategoryHandler) GetCategory(c *gin.Context) {
	h.logger.Info("管理者向け経費カテゴリ詳細取得API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrCategoryPermissionDenied, "管理者権限が必要です")
		return
	}

	// カテゴリIDをパース
	categoryID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// サービスから取得
	response, err := h.expenseService.GetCategoryByID(c.Request.Context(), categoryID)
	if err != nil {
		h.logger.Error("Failed to get category by ID", zap.Error(err), zap.String("category_id", categoryID.String()))

		if err.Error() == "経費カテゴリが見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrCategoryNotFound, "経費カテゴリが見つかりません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "経費カテゴリ詳細の取得に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費カテゴリ詳細取得成功",
		zap.String("category_id", categoryID.String()))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// CreateCategory 経費カテゴリを作成
func (h *AdminCategoryHandler) CreateCategory(c *gin.Context) {
	h.logger.Info("管理者向け経費カテゴリ作成API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrCategoryPermissionDenied, "管理者権限が必要です")
		return
	}

	// リクエストボディをバインド
	var req dto.CreateExpenseCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind create category request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// サービスで作成
	response, err := h.expenseService.CreateCategory(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("Failed to create category", zap.Error(err))

		// バリデーションエラーの場合
		if err.Error() == "カテゴリコードは英数字とアンダースコアのみ使用できます" {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrCategoryCodeInvalid, err.Error())
			return
		}
		if strings.Contains(err.Error(), "は既に使用されています") {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrCategoryCodeDuplicate, err.Error())
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "経費カテゴリの作成に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費カテゴリ作成成功",
		zap.String("category_id", response.ID.String()),
		zap.String("code", response.Code))

	c.JSON(http.StatusCreated, gin.H{"data": response})
}

// UpdateCategory 経費カテゴリを更新
func (h *AdminCategoryHandler) UpdateCategory(c *gin.Context) {
	h.logger.Info("管理者向け経費カテゴリ更新API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrCategoryPermissionDenied, "管理者権限が必要です")
		return
	}

	// カテゴリIDをパース
	categoryID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// リクエストボディをバインド
	var req dto.UpdateExpenseCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind update category request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// サービスで更新
	response, err := h.expenseService.UpdateCategory(c.Request.Context(), categoryID, &req)
	if err != nil {
		h.logger.Error("Failed to update category", zap.Error(err), zap.String("category_id", categoryID.String()))

		if err.Error() == "経費カテゴリが見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrCategoryNotFound, "経費カテゴリが見つかりません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "経費カテゴリの更新に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費カテゴリ更新成功",
		zap.String("category_id", categoryID.String()),
		zap.String("code", response.Code))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// DeleteCategory 経費カテゴリを削除
func (h *AdminCategoryHandler) DeleteCategory(c *gin.Context) {
	h.logger.Info("管理者向け経費カテゴリ削除API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrCategoryPermissionDenied, "管理者権限が必要です")
		return
	}

	// カテゴリIDをパース
	categoryID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// サービスで削除
	err = h.expenseService.DeleteCategory(c.Request.Context(), categoryID)
	if err != nil {
		h.logger.Error("Failed to delete category", zap.Error(err), zap.String("category_id", categoryID.String()))

		if err.Error() == "経費カテゴリが見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrCategoryNotFound, "経費カテゴリが見つかりません")
			return
		}

		// デフォルトカテゴリ削除エラーの場合
		if strings.Contains(err.Error(), "デフォルトカテゴリ") {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrDefaultCategoryDelete, err.Error())
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "経費カテゴリの削除に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費カテゴリ削除成功",
		zap.String("category_id", categoryID.String()))

	c.JSON(http.StatusNoContent, nil)
}

// ReorderCategories 経費カテゴリの表示順序を変更
func (h *AdminCategoryHandler) ReorderCategories(c *gin.Context) {
	h.logger.Info("管理者向け経費カテゴリ順序変更API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrCategoryPermissionDenied, "管理者権限が必要です")
		return
	}

	// リクエストボディをバインド
	var req dto.ReorderCategoriesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind reorder categories request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// サービスで順序変更
	err = h.expenseService.ReorderCategories(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("Failed to reorder categories", zap.Error(err))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "経費カテゴリの順序変更に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費カテゴリ順序変更成功",
		zap.Int("count", len(req.CategoryOrders)))

	c.JSON(http.StatusOK, gin.H{"message": "カテゴリの順序を変更しました"})
}

// BulkUpdateCategories 経費カテゴリの一括更新
func (h *AdminCategoryHandler) BulkUpdateCategories(c *gin.Context) {
	h.logger.Info("管理者向け経費カテゴリ一括更新API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "管理者権限チェックに失敗しました", h.logger, err)
		return
	}
	if !isAdmin {
		RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrCategoryPermissionDenied, "管理者権限が必要です")
		return
	}

	// リクエストボディをバインド
	var req dto.BulkUpdateCategoriesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind bulk update categories request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// サービスで一括更新
	err = h.expenseService.BulkUpdateCategories(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("Failed to bulk update categories", zap.Error(err))

		// デフォルトカテゴリ削除エラーの場合
		if strings.Contains(err.Error(), "デフォルトカテゴリ") {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrDefaultCategoryDelete, err.Error())
			return
		}
		if strings.Contains(err.Error(), "無効な操作") {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrCategoryCodeInvalid, err.Error())
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrCategorySaveFailed, "経費カテゴリの一括更新に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("管理者向け経費カテゴリ一括更新成功",
		zap.String("action", req.Action),
		zap.Int("count", len(req.CategoryIDs)))

	c.JSON(http.StatusOK, gin.H{"message": "カテゴリの一括更新が完了しました"})
}
