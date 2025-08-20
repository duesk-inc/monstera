package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/constants"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ExpenseHandler 経費申請関連のハンドラー
type ExpenseHandler struct {
	expenseService service.ExpenseService
	s3Service      service.S3Service
	logger         *zap.Logger
	handlerUtil    *HandlerUtil
}

// NewExpenseHandler ExpenseHandlerのインスタンスを生成
func NewExpenseHandler(expenseService service.ExpenseService, s3Service service.S3Service, logger *zap.Logger) *ExpenseHandler {
	return &ExpenseHandler{
		expenseService: expenseService,
		s3Service:      s3Service,
		logger:         logger,
		handlerUtil:    NewHandlerUtil(logger),
	}
}

// CreateExpense 経費申請を作成
func (h *ExpenseHandler) CreateExpense(c *gin.Context) {
	h.logger.Info("経費申請作成API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind create expense request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// 経費申請を作成
	expense, err := h.expenseService.Create(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("Failed to create expense", zap.Error(err), zap.String("user_id", userID))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "経費申請の作成に失敗しました", h.logger, err)
		return
	}

	// レスポンスを変換
	response := dto.ExpenseToResponse(expense)

	h.logger.Info("経費申請作成成功", zap.String("expense_id", expense.ID))
	c.JSON(http.StatusCreated, gin.H{"data": response})
}

// GetExpense 経費申請詳細を取得
func (h *ExpenseHandler) GetExpense(c *gin.Context) {
	h.logger.Info("経費申請詳細取得API開始")

	// 経費申請IDをパース
	expenseID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 経費申請を取得
	expense, err := h.expenseService.GetByID(c.Request.Context(), expenseID, userID)
	if err != nil {
		h.logger.Error("Failed to get expense", zap.Error(err), zap.String("expense_id", expenseID))

		// エラーメッセージから404判定
		if err.Error() == "経費申請が見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrExpenseNotFound, "経費申請が見つかりません")
			return
		}

		if err.Error() == "この経費申請にアクセスする権限がありません" {
			RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrApprovalPermissionDenied, "この経費申請にアクセスする権限がありません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "経費申請の取得に失敗しました", h.logger, err)
		return
	}

	// 詳細レスポンスを生成
	response := dto.ExpenseToDetailResponse(&expense.Expense)

	h.logger.Info("経費申請詳細取得成功", zap.String("expense_id", expenseID))
	c.JSON(http.StatusOK, gin.H{"data": response})
}

// UpdateExpense 経費申請を更新
func (h *ExpenseHandler) UpdateExpense(c *gin.Context) {
	h.logger.Info("経費申請更新API開始")

	// 経費申請IDをパース
	expenseID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.UpdateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind update expense request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// 経費申請を更新
	expense, err := h.expenseService.Update(c.Request.Context(), expenseID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to update expense", zap.Error(err), zap.String("expense_id", expenseID))

		// エラーメッセージから適切なステータスコードを判定
		if err.Error() == "経費申請が見つかりません" {
			RespondNotFound(c, "経費申請")
			return
		}

		if err.Error() == "この経費申請を編集する権限がありません" {
			RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrApprovalPermissionDenied, "この経費申請を編集する権限がありません")
			return
		}

		if err.Error() == "この経費申請は編集できません" {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrExpenseAlreadySubmitted, "この経費申請は編集できません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "経費申請の更新に失敗しました", h.logger, err)
		return
	}

	// レスポンスを変換
	response := dto.ExpenseToResponse(expense)

	h.logger.Info("経費申請更新成功", zap.String("expense_id", expenseID))
	c.JSON(http.StatusOK, gin.H{"data": response})
}

// DeleteExpense 経費申請を削除
func (h *ExpenseHandler) DeleteExpense(c *gin.Context) {
	h.logger.Info("経費申請削除API開始")

	// 経費申請IDをパース
	expenseID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 経費申請を削除
	err = h.expenseService.Delete(c.Request.Context(), expenseID, userID)
	if err != nil {
		h.logger.Error("Failed to delete expense", zap.Error(err), zap.String("expense_id", expenseID))

		// エラーメッセージから適切なステータスコードを判定
		if err.Error() == "経費申請が見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrExpenseNotFound, "経費申請が見つかりません")
			return
		}

		if err.Error() == "この経費申請を削除する権限がありません" {
			RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrApprovalPermissionDenied, "この経費申請を削除する権限がありません")
			return
		}

		if err.Error() == "この経費申請は削除できません" {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrExpenseAlreadySubmitted, "この経費申請は削除できません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "経費申請の削除に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("経費申請削除成功", zap.String("expense_id", expenseID))
	c.JSON(http.StatusNoContent, nil)
}

// GetExpenseList 経費申請一覧を取得
func (h *ExpenseHandler) GetExpenseList(c *gin.Context) {
	h.logger.Info("経費申請一覧取得API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// クエリパラメータを解析
	filter := &dto.ExpenseFilterRequest{}

	// ページネーション
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filter.Page = page
		} else {
			filter.Page = 1
		}
	} else {
		filter.Page = 1
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filter.Limit = limit
		} else {
			filter.Limit = 20
		}
	} else {
		filter.Limit = 20
	}

	// ステータスフィルター
	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}

	// カテゴリフィルター
	if category := c.Query("category"); category != "" {
		filter.Category = &category
	}

	// 日付範囲フィルター
	if startDate := c.Query("start_date"); startDate != "" {
		if parsedDate, err := h.handlerUtil.ParseDate(startDate); err == nil {
			filter.StartDate = &parsedDate
		}
	}

	if endDate := c.Query("end_date"); endDate != "" {
		if parsedDate, err := h.handlerUtil.ParseDate(endDate); err == nil {
			filter.EndDate = &parsedDate
		}
	}

	// 金額範囲フィルター
	if minAmountStr := c.Query("min_amount"); minAmountStr != "" {
		if minAmount, err := strconv.Atoi(minAmountStr); err == nil && minAmount >= 0 {
			filter.MinAmount = &minAmount
		}
	}

	if maxAmountStr := c.Query("max_amount"); maxAmountStr != "" {
		if maxAmount, err := strconv.Atoi(maxAmountStr); err == nil && maxAmount > 0 {
			filter.MaxAmount = &maxAmount
		}
	}

	// 年度フィルター
	if yearStr := c.Query("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil && year >= 2020 && year <= 2050 {
			filter.Year = &year
		}
	}

	if fiscalYearStr := c.Query("fiscal_year"); fiscalYearStr != "" {
		if fiscalYear, err := strconv.Atoi(fiscalYearStr); err == nil && fiscalYear >= 2020 && fiscalYear <= 2050 {
			filter.FiscalYear = &fiscalYear
		}
	}

	if monthStr := c.Query("month"); monthStr != "" {
		if month, err := strconv.Atoi(monthStr); err == nil && month >= 1 && month <= 12 {
			filter.Month = &month
		}
	}

	// ソート
	if sortBy := c.Query("sort_by"); sortBy != "" {
		filter.SortBy = &sortBy
	}

	if sortOrder := c.Query("sort_order"); sortOrder != "" {
		filter.SortOrder = &sortOrder
	}

	// 経費申請一覧を取得
	response, err := h.expenseService.List(c.Request.Context(), userID, filter)
	if err != nil {
		h.logger.Error("Failed to get expense list", zap.Error(err), zap.String("user_id", userID))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "経費申請一覧の取得に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("経費申請一覧取得成功",
		zap.String("user_id", userID),
		zap.Int("count", len(response.Items)),
		zap.Int64("total", response.Total))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// GetCategories 経費カテゴリ一覧を取得
func (h *ExpenseHandler) GetCategories(c *gin.Context) {
	h.logger.Info("経費カテゴリ一覧取得API開始")

	// 認証済みユーザーIDを取得（権限確認のため）
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// アクティブなカテゴリのみを取得
	categories, err := h.expenseService.GetActiveCategories(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get expense categories",
			zap.Error(err),
			zap.String("user_id", userID))
		HandleStandardError(c, http.StatusInternalServerError,
			constants.ErrExpenseSaveFailed,
			"カテゴリの取得に失敗しました", h.logger, err)
		return
	}

	// DTOに変換
	var response []dto.ExpenseCategoryResponse
	for _, category := range categories {
		var categoryDTO dto.ExpenseCategoryResponse
		categoryDTO.FromModel(&category)
		response = append(response, categoryDTO)
	}

	h.logger.Info("経費カテゴリ一覧取得成功",
		zap.String("user_id", userID),
		zap.Int("count", len(response)))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// SubmitExpense 経費申請を提出
func (h *ExpenseHandler) SubmitExpense(c *gin.Context) {
	h.logger.Info("経費申請提出API開始")

	// 経費申請IDをパース
	expenseID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド（任意）
	var req dto.SubmitExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// JSONが送信されない場合もあるため、エラーでも続行
		req = dto.SubmitExpenseRequest{}
	}

	// 経費申請を提出
	expense, err := h.expenseService.SubmitExpense(c.Request.Context(), expenseID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to submit expense", zap.Error(err), zap.String("expense_id", expenseID))

		// ExpenseErrorタイプを確認
		var expenseErr *dto.ExpenseError
		if errors.As(err, &expenseErr) {
			switch expenseErr.Code {
			case dto.ErrCodeExpenseNotFound:
				RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrExpenseNotFound, expenseErr.Message)
				return
			case dto.ErrCodeUnauthorized:
				RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrApprovalPermissionDenied, expenseErr.Message)
				return
			case dto.ErrCodeExpenseNotSubmittable:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrExpenseInvalidStatus, expenseErr.Message)
				return
			case dto.ErrCodeReceiptRequired:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrExpenseReceiptRequired, expenseErr.Message)
				return
			case dto.ErrCodeNoApproversConfigured:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrExpenseApproverNotConfigured, expenseErr.Message)
				return
			case dto.ErrCodeMonthlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
				return
			case dto.ErrCodeYearlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
				return
			default:
				HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, expenseErr.Message, h.logger, err)
				return
			}
		}

		// エラーメッセージから適切なステータスコードを判定（後方互換性のため残す）
		if err.Error() == "経費申請が見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrExpenseNotFound, "経費申請が見つかりません")
			return
		}

		if err.Error() == "この経費申請を提出する権限がありません" {
			RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrApprovalPermissionDenied, "この経費申請を提出する権限がありません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "経費申請の提出に失敗しました", h.logger, err)
		return
	}

	// レスポンスを変換
	response := dto.ExpenseToResponse(expense)

	h.logger.Info("経費申請提出成功", zap.String("expense_id", expenseID))
	c.JSON(http.StatusOK, gin.H{"data": response})
}

// CancelExpense 経費申請を取消
func (h *ExpenseHandler) CancelExpense(c *gin.Context) {
	h.logger.Info("経費申請取消API開始")

	// 経費申請IDをパース
	expenseID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド（任意）
	var req dto.CancelExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// JSONが送信されない場合もあるため、エラーでも続行
		req = dto.CancelExpenseRequest{}
	}

	// 経費申請を取消
	expense, err := h.expenseService.CancelExpense(c.Request.Context(), expenseID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to cancel expense", zap.Error(err), zap.String("expense_id", expenseID))

		// エラーメッセージから適切なステータスコードを判定
		if err.Error() == "経費申請が見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrExpenseNotFound, "経費申請が見つかりません")
			return
		}

		if err.Error() == "この経費申請を取消する権限がありません" {
			RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrApprovalPermissionDenied, "この経費申請を取消する権限がありません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "経費申請の取消に失敗しました", h.logger, err)
		return
	}

	// レスポンスを変換
	response := dto.ExpenseToResponse(expense)

	h.logger.Info("経費申請取消成功", zap.String("expense_id", expenseID))
	c.JSON(http.StatusOK, gin.H{"data": response})
}

// GenerateUploadURL ファイルアップロード用のPre-signed URLを生成
func (h *ExpenseHandler) GenerateUploadURL(c *gin.Context) {
	h.logger.Info("ファイルアップロードURL生成API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.GenerateUploadURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind upload URL request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// Pre-signed URLを生成
	uploadURLResponse, err := h.s3Service.GenerateUploadURL(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("Failed to generate upload URL", zap.Error(err), zap.String("user_id", userID))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "アップロードURLの生成に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("ファイルアップロードURL生成成功",
		zap.String("user_id", userID),
		zap.String("s3_key", uploadURLResponse.S3Key))

	c.JSON(http.StatusOK, gin.H{"data": uploadURLResponse})
}

// CompleteUpload ファイルアップロード完了通知
func (h *ExpenseHandler) CompleteUpload(c *gin.Context) {
	h.logger.Info("ファイルアップロード完了通知API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.CompleteUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind complete upload request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// アップロード完了処理
	response, err := h.expenseService.CompleteUpload(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("Failed to complete upload", zap.Error(err),
			zap.String("user_id", userID),
			zap.String("s3_key", req.S3Key))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "ファイルアップロードの完了処理に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("ファイルアップロード完了",
		zap.String("user_id", userID),
		zap.String("s3_key", req.S3Key))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// DeleteUploadedFile アップロード済みファイルを削除
func (h *ExpenseHandler) DeleteUploadedFile(c *gin.Context) {
	h.logger.Info("アップロード済みファイル削除API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.DeleteUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind delete upload request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// ファイル削除処理
	err := h.expenseService.DeleteUploadedFile(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("Failed to delete uploaded file", zap.Error(err),
			zap.String("user_id", userID),
			zap.String("s3_key", req.S3Key))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "ファイルの削除に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("アップロード済みファイル削除成功",
		zap.String("user_id", userID),
		zap.String("s3_key", req.S3Key))

	c.JSON(http.StatusNoContent, nil)
}

// ApproveExpense 経費申請を承認（管理者用）
func (h *ExpenseHandler) ApproveExpense(c *gin.Context) {
	h.logger.Info("経費申請承認API開始")

	// 経費申請IDをパース
	expenseID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// 承認者ID（管理者）を取得
	approverID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.ApproveExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind approve expense request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// 経費申請を承認
	expense, err := h.expenseService.ApproveExpense(c.Request.Context(), expenseID, approverID, &req)
	if err != nil {
		h.logger.Error("Failed to approve expense", zap.Error(err), zap.String("expense_id", expenseID))

		// エラーメッセージから適切なステータスコードを判定
		if err.Error() == "経費申請が見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrApprovalTargetNotFound, "経費申請が見つかりません")
			return
		}

		if err.Error() == "この経費申請を承認する権限がありません" {
			RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrNoApprovalAuthority, "この経費申請を承認する権限がありません")
			return
		}

		if err.Error() == "この経費申請は承認できません" {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrAlreadyApproved, "この経費申請は承認できません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrApprovalProcessFailed, "経費申請の承認に失敗しました", h.logger, err)
		return
	}

	// レスポンスを変換
	response := dto.ExpenseToResponse(expense)

	h.logger.Info("経費申請承認成功", zap.String("expense_id", expenseID))
	c.JSON(http.StatusOK, gin.H{"data": response})
}

// RejectExpense 経費申請を却下（管理者用）
func (h *ExpenseHandler) RejectExpense(c *gin.Context) {
	h.logger.Info("経費申請却下API開始")

	// 経費申請IDをパース
	expenseID, err := ParseUUID(c, "id", h.logger)
	if err != nil {
		return
	}

	// 承認者ID（管理者）を取得
	approverID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.RejectExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind reject expense request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// 経費申請を却下
	expense, err := h.expenseService.RejectExpense(c.Request.Context(), expenseID, approverID, &req)
	if err != nil {
		h.logger.Error("Failed to reject expense", zap.Error(err), zap.String("expense_id", expenseID))

		// エラーメッセージから適切なステータスコードを判定
		if err.Error() == "経費申請が見つかりません" {
			RespondStandardErrorWithCode(c, http.StatusNotFound, constants.ErrApprovalTargetNotFound, "経費申請が見つかりません")
			return
		}

		if err.Error() == "この経費申請を却下する権限がありません" {
			RespondStandardErrorWithCode(c, http.StatusForbidden, constants.ErrNoApprovalAuthority, "この経費申請を却下する権限がありません")
			return
		}

		if err.Error() == "この経費申請は却下できません" {
			RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrAlreadyRejected, "この経費申請は却下できません")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrApprovalProcessFailed, "経費申請の却下に失敗しました", h.logger, err)
		return
	}

	// レスポンスを変換
	response := dto.ExpenseToResponse(expense)

	h.logger.Info("経費申請却下成功", zap.String("expense_id", expenseID))
	c.JSON(http.StatusOK, gin.H{"data": response})
}

// GetPendingApprovals 承認待ち経費申請一覧を取得（管理者用）
func (h *ExpenseHandler) GetPendingApprovals(c *gin.Context) {
	h.logger.Info("承認待ち経費申請一覧取得API開始")

	// 承認者ID（管理者）を取得
	approverID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// クエリパラメータを解析
	filter := &dto.ApprovalFilterRequest{
		Page:  1,
		Limit: 20,
	}

	// ページネーション
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filter.Page = page
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filter.Limit = limit
		}
	}

	// ステータスフィルター（デフォルトは pending）
	pendingStatus := "pending"
	filter.Status = &pendingStatus

	// 承認待ち一覧を取得
	response, err := h.expenseService.GetPendingApprovals(c.Request.Context(), approverID, filter)
	if err != nil {
		h.logger.Error("Failed to get pending approvals", zap.Error(err), zap.String("approver_id", approverID))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "承認待ち経費申請の取得に失敗しました", h.logger, err)
		return
	}

	h.logger.Info("承認待ち経費申請一覧取得成功",
		zap.String("approver_id", approverID),
		zap.Int64("total", response.Total))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// CheckExpenseLimits 経費申請上限チェック
func (h *ExpenseHandler) CheckExpenseLimits(c *gin.Context) {
	h.logger.Info("経費申請上限チェックAPI開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// クエリパラメータから金額と日付を取得
	amountStr := c.Query("amount")
	if amountStr == "" {
		RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrExpenseAmountInvalid, "金額パラメータが必要です")
		return
	}

	amount, err := strconv.Atoi(amountStr)
	if err != nil || amount <= 0 {
		RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrExpenseAmountInvalid, "有効な金額を入力してください")
		return
	}

	// 日付パラメータを取得（デフォルトは現在日時）
	var expenseDate time.Time
	if dateStr := c.Query("expense_date"); dateStr != "" {
		if parsedDate, err := h.handlerUtil.ParseDate(dateStr); err == nil {
			expenseDate = parsedDate
		} else {
			expenseDate = time.Now()
		}
	} else {
		expenseDate = time.Now()
	}

	// 上限チェック実行
	limitResult, err := h.expenseService.CheckLimits(c.Request.Context(), userID, amount, expenseDate)
	if err != nil {
		h.logger.Error("Failed to check expense limits", zap.Error(err), zap.String("user_id", userID))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "上限チェックに失敗しました", h.logger, err)
		return
	}

	h.logger.Info("経費申請上限チェック成功",
		zap.String("user_id", userID),
		zap.Int("amount", amount),
		zap.Bool("within_monthly_limit", limitResult.WithinMonthlyLimit),
		zap.Bool("within_yearly_limit", limitResult.WithinYearlyLimit))

	c.JSON(http.StatusOK, gin.H{"data": limitResult})
}

// GetExpenseSummary 経費申請集計を取得
func (h *ExpenseHandler) GetExpenseSummary(c *gin.Context) {
	h.logger.Info("経費申請集計取得API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// クエリパラメータを解析
	now := time.Now()
	year := now.Year()
	month := int(now.Month())

	// 会計年度パラメータ
	var fiscalYear *int
	if fiscalYearStr := c.Query("fiscal_year"); fiscalYearStr != "" {
		if parsedFiscalYear, err := strconv.Atoi(fiscalYearStr); err == nil && parsedFiscalYear >= 2020 && parsedFiscalYear <= 2050 {
			fiscalYear = &parsedFiscalYear
		}
	}

	// 年度パラメータ（会計年度が指定されていない場合のみ）
	if fiscalYear == nil {
		if yearStr := c.Query("year"); yearStr != "" {
			if parsedYear, err := strconv.Atoi(yearStr); err == nil && parsedYear >= 2020 && parsedYear <= 2050 {
				year = parsedYear
			}
		}
	}

	// 月度パラメータ
	if monthStr := c.Query("month"); monthStr != "" {
		if parsedMonth, err := strconv.Atoi(monthStr); err == nil && parsedMonth >= 1 && parsedMonth <= 12 {
			month = parsedMonth
		}
	}

	// 月次集計を取得
	monthlySummary, err := h.expenseService.GetMonthlySummary(c.Request.Context(), userID, year, month)
	if err != nil {
		h.logger.Error("Failed to get monthly summary", zap.Error(err),
			zap.String("user_id", userID),
			zap.Int("year", year),
			zap.Int("month", month))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrSummaryProcessFailed, "月次集計の取得に失敗しました", h.logger, err)
		return
	}

	// 年次集計を取得（会計年度 or カレンダー年度）
	var yearlySummary *dto.ExpenseYearlySummaryResponse
	if fiscalYear != nil {
		// 会計年度集計を取得
		yearlySummary, err = h.expenseService.GetFiscalYearSummary(c.Request.Context(), userID, *fiscalYear)
		year = *fiscalYear // ログ用に年度を更新
	} else {
		// カレンダー年度集計を取得
		yearlySummary, err = h.expenseService.GetYearlySummary(c.Request.Context(), userID, year)
	}

	if err != nil {
		yearType := "カレンダー年度"
		if fiscalYear != nil {
			yearType = "会計年度"
		}
		h.logger.Error("Failed to get yearly summary", zap.Error(err),
			zap.String("user_id", userID),
			zap.Int("year", year),
			zap.String("year_type", yearType))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrSummaryProcessFailed, "年次集計の取得に失敗しました", h.logger, err)
		return
	}

	// 期間文字列を作成（会計年度 or カレンダー年度）
	var period string
	if yearlySummary.IsFiscalYear {
		period = fmt.Sprintf("%d年度", year) // 例: "2024年度"
	} else {
		period = fmt.Sprintf("%d年", year) // 例: "2024年"
	}

	// レスポンスを作成
	response := &dto.ExpenseSummaryResponse{
		Monthly: monthlySummary.Monthly,
		Yearly: dto.ExpensePeriodSummary{
			Period:         period,
			TotalAmount:    yearlySummary.TotalAmount,
			ApprovedAmount: 0, // TODO: 承認済み金額の計算が必要
			PendingAmount:  0, // TODO: 承認待ち金額の計算が必要
			RejectedAmount: 0, // TODO: 却下金額の計算が必要
			Limit:          0, // TODO: 年次上限の取得が必要
			Remaining:      0, // TODO: 残額の計算が必要
			UsageRate:      0, // TODO: 使用率の計算が必要
		},
	}

	h.logger.Info("経費申請集計取得成功",
		zap.String("user_id", userID),
		zap.Int("year", year),
		zap.Int("month", month),
		zap.Int("monthly_total", monthlySummary.Monthly.TotalAmount),
		zap.Int("yearly_total", yearlySummary.TotalAmount))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// GetExpenseLimits 経費申請上限一覧を取得
func (h *ExpenseHandler) GetExpenseLimits(c *gin.Context) {
	h.logger.Info("経費申請上限一覧取得API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "管理者権限チェックに失敗しました")
		return
	}
	if !isAdmin {
		RespondForbidden(c, "管理者権限が必要です")
		return
	}

	// 経費申請上限一覧を取得
	limits, err := h.expenseService.GetExpenseLimits(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get expense limits", zap.Error(err), zap.String("user_id", userID))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "経費申請上限の取得に失敗しました", h.logger, err)
		return
	}

	// レスポンスを変換
	var response []dto.ExpenseLimitSettingResponse
	for _, limit := range limits {
		response = append(response, dto.ExpenseLimitSettingResponse{
			ID:            limit.ID,
			LimitType:     string(limit.LimitType),
			Amount:        limit.Amount,
			EffectiveFrom: limit.EffectiveFrom,
			CreatedBy:     limit.CreatedBy,
			CreatedAt:     limit.CreatedAt,
			UpdatedAt:     limit.UpdatedAt,
		})
	}

	h.logger.Info("経費申請上限一覧取得成功",
		zap.String("user_id", userID),
		zap.Int("count", len(response)))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// UpdateExpenseLimit 経費申請上限を更新
func (h *ExpenseHandler) UpdateExpenseLimit(c *gin.Context) {
	h.logger.Info("経費申請上限更新API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "管理者権限チェックに失敗しました")
		return
	}
	if !isAdmin {
		RespondForbidden(c, "管理者権限が必要です")
		return
	}

	// リクエストボディをバインド
	var req dto.UpdateExpenseLimitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind update expense limit request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// 経費申請上限を更新
	limit, err := h.expenseService.UpdateExpenseLimit(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("Failed to update expense limit", zap.Error(err),
			zap.String("user_id", userID),
			zap.String("limit_type", req.LimitType))

		// エラーメッセージから適切なステータスコードを判定
		if err.Error() == "無効な上限種別です" {
			RespondError(c, http.StatusBadRequest, "無効な上限種別です")
			return
		}

		if err.Error() == "上限金額は1以上である必要があります" {
			RespondError(c, http.StatusBadRequest, "上限金額は1以上である必要があります")
			return
		}

		HandleStandardError(c, http.StatusInternalServerError, constants.ErrLimitSaveFailed, "経費申請上限の更新に失敗しました", h.logger, err)
		return
	}

	// レスポンスを変換
	response := dto.ExpenseLimitSettingResponse{
		ID:            limit.ID,
		LimitType:     string(limit.LimitType),
		Amount:        limit.Amount,
		EffectiveFrom: limit.EffectiveFrom,
		CreatedBy:     limit.CreatedBy,
		CreatedAt:     limit.CreatedAt,
		UpdatedAt:     limit.UpdatedAt,
	}

	h.logger.Info("経費申請上限更新成功",
		zap.String("user_id", userID),
		zap.String("limit_type", req.LimitType),
		zap.Int("amount", req.Amount))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// ========================================
// 複数領収書対応API
// ========================================

// CreateExpenseWithReceipts 複数領収書を含む経費申請を作成
func (h *ExpenseHandler) CreateExpenseWithReceipts(c *gin.Context) {
	h.logger.Info("複数領収書対応経費申請作成API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.CreateExpenseWithReceiptsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind create expense with receipts request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// 経費申請を作成
	expense, err := h.expenseService.CreateWithReceipts(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("Failed to create expense with receipts", zap.Error(err))

		// エラー処理
		if expenseErr, ok := err.(*dto.ExpenseError); ok {
			switch expenseErr.Code {
			case dto.ErrCodeCategoryNotFound, dto.ErrCodeCategoryInactive:
				RespondError(c, http.StatusBadRequest, expenseErr.Message)
			case dto.ErrCodeLimitExceeded:
				RespondError(c, http.StatusBadRequest, expenseErr.Message)
			case dto.ErrCodeMonthlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
			case dto.ErrCodeYearlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
			default:
				RespondError(c, http.StatusInternalServerError, "経費申請の作成に失敗しました")
			}
			return
		}

		RespondError(c, http.StatusInternalServerError, "経費申請の作成に失敗しました")
		return
	}

	h.logger.Info("複数領収書対応経費申請作成成功",
		zap.String("expense_id", expense.ID),
		zap.String("user_id", userID),
		zap.Int("receipt_count", len(expense.Receipts)))

	c.JSON(http.StatusCreated, gin.H{"data": expense})
}

// UpdateExpenseWithReceipts 複数領収書を含む経費申請を更新
func (h *ExpenseHandler) UpdateExpenseWithReceipts(c *gin.Context) {
	h.logger.Info("複数領収書対応経費申請更新API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータから経費申請IDを取得
	expenseID, ok := h.handlerUtil.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.UpdateExpenseWithReceiptsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind update expense with receipts request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// 経費申請を更新
	expense, err := h.expenseService.UpdateWithReceipts(c.Request.Context(), expenseID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to update expense with receipts", zap.Error(err))

		// エラー処理
		if expenseErr, ok := err.(*dto.ExpenseError); ok {
			switch expenseErr.Code {
			case dto.ErrCodeExpenseNotFound:
				RespondError(c, http.StatusNotFound, expenseErr.Message)
			case dto.ErrCodeForbidden:
				RespondError(c, http.StatusForbidden, expenseErr.Message)
			case dto.ErrCodeInvalidStatus, dto.ErrCodeVersionMismatch:
				RespondError(c, http.StatusBadRequest, expenseErr.Message)
			case dto.ErrCodeMonthlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
			case dto.ErrCodeYearlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
			default:
				RespondError(c, http.StatusInternalServerError, "経費申請の更新に失敗しました")
			}
			return
		}

		RespondError(c, http.StatusInternalServerError, "経費申請の更新に失敗しました")
		return
	}

	h.logger.Info("複数領収書対応経費申請更新成功",
		zap.String("expense_id", expense.ID),
		zap.String("user_id", userID))

	c.JSON(http.StatusOK, gin.H{"data": expense})
}

// GetExpenseReceipts 経費申請の領収書一覧を取得
func (h *ExpenseHandler) GetExpenseReceipts(c *gin.Context) {
	h.logger.Info("経費申請領収書一覧取得API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータから経費申請IDを取得
	expenseID, ok := h.handlerUtil.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	// 領収書一覧を取得
	receipts, err := h.expenseService.GetExpenseReceipts(c.Request.Context(), expenseID, userID)
	if err != nil {
		h.logger.Error("Failed to get expense receipts", zap.Error(err))

		// エラー処理
		if expenseErr, ok := err.(*dto.ExpenseError); ok {
			switch expenseErr.Code {
			case dto.ErrCodeExpenseNotFound:
				RespondError(c, http.StatusNotFound, expenseErr.Message)
			case dto.ErrCodeForbidden:
				RespondError(c, http.StatusForbidden, expenseErr.Message)
			case dto.ErrCodeMonthlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
			case dto.ErrCodeYearlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
			default:
				RespondError(c, http.StatusInternalServerError, "領収書の取得に失敗しました")
			}
			return
		}

		RespondError(c, http.StatusInternalServerError, "領収書の取得に失敗しました")
		return
	}

	h.logger.Info("経費申請領収書一覧取得成功",
		zap.String("expense_id", expenseID),
		zap.String("user_id", userID),
		zap.Int("count", len(receipts)))

	c.JSON(http.StatusOK, gin.H{"data": receipts})
}

// DeleteExpenseReceipt 経費申請の領収書を削除
func (h *ExpenseHandler) DeleteExpenseReceipt(c *gin.Context) {
	h.logger.Info("経費申請領収書削除API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータから経費申請IDと領収書IDを取得
	expenseID, ok := h.handlerUtil.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	receiptID, ok := h.handlerUtil.ParseUUIDParam(c, "receipt_id")
	if !ok {
		return
	}

	// 領収書を削除
	err := h.expenseService.DeleteExpenseReceipt(c.Request.Context(), expenseID, receiptID, userID)
	if err != nil {
		h.logger.Error("Failed to delete expense receipt", zap.Error(err))

		// エラー処理
		if expenseErr, ok := err.(*dto.ExpenseError); ok {
			switch expenseErr.Code {
			case dto.ErrCodeExpenseNotFound:
				RespondError(c, http.StatusNotFound, expenseErr.Message)
			case dto.ErrCodeForbidden:
				RespondError(c, http.StatusForbidden, expenseErr.Message)
			case dto.ErrCodeInvalidStatus, dto.ErrCodeInvalidOperation:
				RespondError(c, http.StatusBadRequest, expenseErr.Message)
			case dto.ErrCodeMonthlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
			case dto.ErrCodeYearlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
			default:
				RespondError(c, http.StatusInternalServerError, "領収書の削除に失敗しました")
			}
			return
		}

		RespondError(c, http.StatusInternalServerError, "領収書の削除に失敗しました")
		return
	}

	h.logger.Info("経費申請領収書削除成功",
		zap.String("expense_id", expenseID),
		zap.String("receipt_id", receiptID),
		zap.String("user_id", userID))

	c.JSON(http.StatusOK, gin.H{"message": "領収書を削除しました"})
}

// UpdateReceiptOrder 領収書の表示順序を更新
func (h *ExpenseHandler) UpdateReceiptOrder(c *gin.Context) {
	h.logger.Info("領収書表示順序更新API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータから経費申請IDを取得
	expenseID, ok := h.handlerUtil.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.UpdateReceiptOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind update receipt order request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// 表示順序を更新
	err := h.expenseService.UpdateReceiptOrder(c.Request.Context(), expenseID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to update receipt order", zap.Error(err))

		// エラー処理
		if expenseErr, ok := err.(*dto.ExpenseError); ok {
			switch expenseErr.Code {
			case dto.ErrCodeExpenseNotFound:
				RespondError(c, http.StatusNotFound, expenseErr.Message)
			case dto.ErrCodeForbidden:
				RespondError(c, http.StatusForbidden, expenseErr.Message)
			case dto.ErrCodeInvalidStatus:
				RespondError(c, http.StatusBadRequest, expenseErr.Message)
			case dto.ErrCodeMonthlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
			case dto.ErrCodeYearlyLimitExceeded:
				RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
			default:
				RespondError(c, http.StatusInternalServerError, "表示順序の更新に失敗しました")
			}
			return
		}

		RespondError(c, http.StatusInternalServerError, "表示順序の更新に失敗しました")
		return
	}

	h.logger.Info("領収書表示順序更新成功",
		zap.String("expense_id", expenseID),
		zap.String("user_id", userID))

	c.JSON(http.StatusOK, gin.H{"message": "表示順序を更新しました"})
}

// GenerateReceiptUploadURL 領収書アップロード用URLを生成
func (h *ExpenseHandler) GenerateReceiptUploadURL(c *gin.Context) {
	h.logger.Info("領収書アップロードURL生成API開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.GenerateReceiptUploadURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind generate receipt upload URL request", zap.Error(err))
		validationErrors := h.handlerUtil.CreateValidationErrorMap(err)
		RespondValidationError(c, validationErrors)
		return
	}

	// アップロードURLを生成
	response, err := h.expenseService.GenerateReceiptUploadURL(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("Failed to generate receipt upload URL", zap.Error(err))

		// エラー処理
		if expenseErr, ok := err.(*dto.ExpenseError); ok {
			if expenseErr.Code == dto.ErrCodeInvalidRequest {
				RespondError(c, http.StatusBadRequest, expenseErr.Message)
				return
			}
		}

		RespondError(c, http.StatusInternalServerError, "アップロードURLの生成に失敗しました")
		return
	}

	h.logger.Info("領収書アップロードURL生成成功",
		zap.String("user_id", userID),
		zap.String("file_name", req.FileName))

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// ExportExpensesCSV 経費申請のCSVエクスポート
func (h *ExpenseHandler) ExportExpensesCSV(c *gin.Context) {
	h.logger.Info("経費申請CSVエクスポートAPI開始")

	// 認証済みユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// エクスポート条件を取得
	var filter dto.ExpenseExportRequest

	// クエリパラメータから取得
	filter.Status = h.getQueryParam(c, "status")
	filter.CategoryID = h.parseUUIDParam(c, "category_id")
	filter.DateFrom = h.parseTimeParam(c, "date_from")
	filter.DateTo = h.parseTimeParam(c, "date_to")
	filter.AmountMin = h.parseIntParam(c, "amount_min")
	filter.AmountMax = h.parseIntParam(c, "amount_max")
	filter.Keyword = h.getQueryParam(c, "keyword")
	filter.FiscalYear = h.parseIntParam(c, "fiscal_year")
	filter.Month = h.parseIntParam(c, "month")
	filter.Year = h.parseIntParam(c, "year")

	// エクスポート設定
	filter.IncludeReceipts = c.Query("include_receipts") == "true"
	filter.IncludeApprovals = c.Query("include_approvals") == "true"
	filter.DateFormat = c.DefaultQuery("date_format", "2006-01-02")
	filter.Encoding = c.DefaultQuery("encoding", "UTF-8-BOM")
	filter.Language = c.DefaultQuery("language", "ja")

	// CSVデータを生成
	csvData, err := h.expenseService.ExportExpensesCSV(c.Request.Context(), userID, &filter)
	if err != nil {
		h.logger.Error("Failed to export expenses CSV", zap.Error(err))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "CSVエクスポートに失敗しました", h.logger, err)
		return
	}

	// レスポンスヘッダーを設定
	filename := fmt.Sprintf("expenses_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Length", fmt.Sprintf("%d", len(csvData)))

	// CSVデータを送信
	c.Data(http.StatusOK, "text/csv; charset=utf-8", csvData)
}

// ExportExpensesCSVAdmin 管理者用経費申請のCSVエクスポート
func (h *ExpenseHandler) ExportExpensesCSVAdmin(c *gin.Context) {
	h.logger.Info("管理者用経費申請CSVエクスポートAPI開始")

	// 認証済みユーザーIDを取得（管理者権限チェック用）
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// コンテキストにユーザーIDを設定（監査ログ用）
	ctx := context.WithValue(c.Request.Context(), "user_id", userID)

	// エクスポート条件を取得
	var filter dto.ExpenseExportRequest

	// クエリパラメータから取得
	filter.UserID = h.parseUUIDParam(c, "user_id")
	filter.DepartmentID = h.parseUUIDParam(c, "department_id")
	filter.Status = h.getQueryParam(c, "status")
	filter.CategoryID = h.parseUUIDParam(c, "category_id")
	filter.DateFrom = h.parseTimeParam(c, "date_from")
	filter.DateTo = h.parseTimeParam(c, "date_to")
	filter.AmountMin = h.parseIntParam(c, "amount_min")
	filter.AmountMax = h.parseIntParam(c, "amount_max")
	filter.Keyword = h.getQueryParam(c, "keyword")
	filter.FiscalYear = h.parseIntParam(c, "fiscal_year")
	filter.Month = h.parseIntParam(c, "month")
	filter.Year = h.parseIntParam(c, "year")

	// エクスポート設定
	filter.IncludeReceipts = c.Query("include_receipts") == "true"
	filter.IncludeApprovals = c.Query("include_approvals") == "true"
	filter.DateFormat = c.DefaultQuery("date_format", "2006-01-02")
	filter.Encoding = c.DefaultQuery("encoding", "UTF-8-BOM")
	filter.Language = c.DefaultQuery("language", "ja")

	// CSVデータを生成
	csvData, err := h.expenseService.ExportExpensesCSVAdmin(ctx, &filter)
	if err != nil {
		h.logger.Error("Failed to export all expenses CSV", zap.Error(err))
		HandleStandardError(c, http.StatusInternalServerError, constants.ErrExpenseSaveFailed, "CSVエクスポートに失敗しました", h.logger, err)
		return
	}

	// レスポンスヘッダーを設定
	filename := fmt.Sprintf("all_expenses_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Length", fmt.Sprintf("%d", len(csvData)))

	// CSVデータを送信
	c.Data(http.StatusOK, "text/csv; charset=utf-8", csvData)
}

// ヘルパー関数
func (h *ExpenseHandler) getQueryParam(c *gin.Context, key string) *string {
	if value := c.Query(key); value != "" {
		return &value
	}
	return nil
}

func (h *ExpenseHandler) parseUUIDParam(c *gin.Context, key string) *string {
	if value := c.Query(key); value != "" {
		// UUID validation removed after migration
		if value != "" {
			return &value
		}
	}
	return nil
}

func (h *ExpenseHandler) parseTimeParam(c *gin.Context, key string) *time.Time {
	if value := c.Query(key); value != "" {
		if t, err := time.Parse("2006-01-02", value); err == nil {
			return &t
		}
	}
	return nil
}

func (h *ExpenseHandler) parseIntParam(c *gin.Context, key string) *int {
	if value := c.Query(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return &i
		}
	}
	return nil
}
