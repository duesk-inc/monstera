package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// LeaveHandler は休暇関連のハンドラーインターフェースです
type LeaveHandler interface {
	GetLeaveTypes(c *gin.Context)
	GetUserLeaveBalances(c *gin.Context)
	CreateLeaveRequest(c *gin.Context)
	GetLeaveRequests(c *gin.Context)
	GetHolidays(c *gin.Context)

	// 振替特別休暇
	GetSubstituteLeaveGrants(c *gin.Context)
	GetSubstituteLeaveGrantSummary(c *gin.Context)
	CreateSubstituteLeaveGrant(c *gin.Context)
	UpdateSubstituteLeaveGrant(c *gin.Context)
	DeleteSubstituteLeaveGrant(c *gin.Context)
}

// leaveHandler は休暇関連のハンドラー実装です
type leaveHandler struct {
	leaveService service.LeaveService
	handlerUtil  *HandlerUtil
	logger       *zap.Logger
}

// NewLeaveHandler は新しいLeaveHandlerインスタンスを作成します
func NewLeaveHandler(leaveService service.LeaveService, logger *zap.Logger) *leaveHandler {
	// Loggerを含むHandlerUtilを正しく初期化
	handlerUtil := &HandlerUtil{
		Logger: logger,
	}

	return &leaveHandler{
		leaveService: leaveService,
		handlerUtil:  handlerUtil,
		logger:       logger,
	}
}

// GetLeaveTypes は休暇種別一覧を取得するハンドラーです
func (h *leaveHandler) GetLeaveTypes(c *gin.Context) {
	ctx := c.Request.Context()
	h.logger.Info("休暇種別一覧取得開始", zap.String("endpoint", "GetLeaveTypes"))

	leaveTypes, err := h.leaveService.GetLeaveTypes(ctx)
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgLeaveTypeListLoadFailed, err)
		return
	}

	h.logger.Info("休暇種別一覧取得完了", zap.Int("count", len(leaveTypes)))
	c.JSON(http.StatusOK, leaveTypes)
}

// GetUserLeaveBalances はユーザーの休暇残日数一覧を取得するハンドラーです
func (h *leaveHandler) GetUserLeaveBalances(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーのIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	h.logger.Info("休暇残日数一覧取得開始",
		zap.String("endpoint", "GetUserLeaveBalances"),
		zap.String("user_id", userUUID.String()))

	balances, err := h.leaveService.GetUserLeaveBalances(ctx, userUUID)
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgLeaveBalanceListLoadFailed, err, "user_id", userUUID.String())
		return
	}

	h.logger.Info("休暇残日数一覧取得完了",
		zap.String("user_id", userUUID.String()),
		zap.Int("count", len(balances)))
	c.JSON(http.StatusOK, balances)
}

// CreateLeaveRequest は新しい休暇申請を作成するハンドラーです
func (h *leaveHandler) CreateLeaveRequest(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーのIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	var req dto.LeaveRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleValidationError(c, err)
		return
	}

	// デバッグログ: 受信データの詳細確認
	h.logger.Info("=== 受信データ詳細確認 ===",
		zap.String("endpoint", "CreateLeaveRequest"),
		zap.String("user_id", userUUID.String()),
		zap.String("leave_type_id", req.LeaveTypeID),
		zap.Bool("is_hourly_based", req.IsHourlyBased),
		zap.String("reason", req.Reason),
		zap.Float64("total_days", req.TotalDays),
		zap.Int("details_count", len(req.RequestDetails)))

	// RequestDetailsの詳細ログ
	for i, detail := range req.RequestDetails {
		h.logger.Info("RequestDetail",
			zap.Int("index", i),
			zap.String("leave_date", detail.LeaveDate),
			zap.String("start_time", detail.StartTime),
			zap.String("end_time", detail.EndTime),
			zap.Float64("day_value", detail.DayValue))
	}

	h.logger.Info("休暇申請作成開始",
		zap.String("endpoint", "CreateLeaveRequest"),
		zap.String("user_id", userUUID.String()),
		zap.String("leave_type_id", req.LeaveTypeID),
		zap.Int("details_count", len(req.RequestDetails)))

	// ユーザーIDを設定
	req.UserID = userUUID

	response, err := h.leaveService.CreateLeaveRequest(ctx, req)
	if err != nil {
		h.handleError(c, http.StatusBadRequest, message.MsgLeaveRequestCreateFailed, err,
			"user_id", userUUID.String(),
			"leave_type_id", req.LeaveTypeID)
		return
	}

	h.logger.Info("休暇申請作成完了",
		zap.String("user_id", userUUID.String()),
		zap.String("request_id", response.ID))
	c.JSON(http.StatusCreated, response)
}

// GetLeaveRequests はユーザーの休暇申請一覧を取得するハンドラーです
func (h *leaveHandler) GetLeaveRequests(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーのIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	h.logger.Info("休暇申請一覧取得開始",
		zap.String("endpoint", "GetLeaveRequests"),
		zap.String("user_id", userUUID.String()))

	requests, err := h.leaveService.GetLeaveRequestsByUserID(ctx, userUUID)
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgLeaveRequestListLoadFailed, err, "user_id", userUUID.String())
		return
	}

	h.logger.Info("休暇申請一覧取得完了",
		zap.String("user_id", userUUID.String()),
		zap.Int("count", len(requests)))
	c.JSON(http.StatusOK, requests)
}

// GetHolidays は休日情報を取得するハンドラーです
func (h *leaveHandler) GetHolidays(c *gin.Context) {
	ctx := c.Request.Context()
	yearStr := c.Query("year")

	year := time.Now().Year()
	if yearStr != "" {
		var err error
		year, err = strconv.Atoi(yearStr)
		if err != nil {
			h.handleError(c, http.StatusBadRequest, fmt.Sprintf(message.MsgInvalidYear, yearStr), err, "year", yearStr)
			return
		}
	}

	h.logger.Info("休日情報取得開始",
		zap.String("endpoint", "GetHolidays"),
		zap.Int("year", year))

	holidays, err := h.leaveService.GetHolidaysByYear(ctx, year)
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgHolidayListLoadFailed, err, "year", year)
		return
	}

	h.logger.Info("休日情報取得完了",
		zap.Int("year", year),
		zap.Int("count", len(holidays)))
	c.JSON(http.StatusOK, holidays)
}

// GetSubstituteLeaveGrants はユーザーの振替特別休暇付与履歴一覧を取得するハンドラーです
func (h *leaveHandler) GetSubstituteLeaveGrants(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーのIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	h.logger.Info("振替特別休暇付与履歴一覧取得開始",
		zap.String("endpoint", "GetSubstituteLeaveGrants"),
		zap.String("user_id", userUUID.String()))

	grants, err := h.leaveService.GetSubstituteLeaveGrants(ctx, userUUID)
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgSubstituteLeaveGrantListLoadFailed, err, "user_id", userUUID.String())
		return
	}

	h.logger.Info("振替特別休暇付与履歴一覧取得完了",
		zap.String("user_id", userUUID.String()),
		zap.Int("count", len(grants)))
	c.JSON(http.StatusOK, grants)
}

// GetSubstituteLeaveGrantSummary はユーザーの振替特別休暇の合計残日数と履歴を取得するハンドラーです
func (h *leaveHandler) GetSubstituteLeaveGrantSummary(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーのIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	h.logger.Info("振替特別休暇サマリー取得開始",
		zap.String("endpoint", "GetSubstituteLeaveGrantSummary"),
		zap.String("user_id", userUUID.String()))

	summary, err := h.leaveService.GetSubstituteLeaveGrantSummary(ctx, userUUID)
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgSubstituteLeaveGrantSummaryLoadFailed, err, "user_id", userUUID.String())
		return
	}

	h.logger.Info("振替特別休暇サマリー取得完了", zap.String("user_id", userUUID.String()))
	c.JSON(http.StatusOK, summary)
}

// CreateSubstituteLeaveGrant は新しい振替特別休暇付与履歴を作成するハンドラーです
func (h *leaveHandler) CreateSubstituteLeaveGrant(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーのIDを取得（管理者権限チェックなども将来的には実装）
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	var req dto.SubstituteLeaveGrantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleValidationError(c, err)
		return
	}

	h.logger.Info("振替特別休暇付与履歴作成開始",
		zap.String("endpoint", "CreateSubstituteLeaveGrant"),
		zap.String("operator_id", userUUID.String()),
		zap.String("target_user_id", req.UserID.String()))

	response, err := h.leaveService.CreateSubstituteLeaveGrant(ctx, req)
	if err != nil {
		h.handleError(c, http.StatusBadRequest, message.MsgSubstituteLeaveGrantCreateFailed, err,
			"operator_id", userUUID.String(),
			"target_user_id", req.UserID.String())
		return
	}

	h.logger.Info("振替特別休暇付与履歴作成完了",
		zap.String("operator_id", userUUID.String()),
		zap.String("grant_id", response.ID))
	c.JSON(http.StatusCreated, response)
}

// UpdateSubstituteLeaveGrant は振替特別休暇付与履歴を更新するハンドラーです
func (h *leaveHandler) UpdateSubstituteLeaveGrant(c *gin.Context) {
	ctx := c.Request.Context()
	idStr := c.Param("id")

	// IDの形式チェック
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, http.StatusBadRequest, fmt.Sprintf(message.MsgInvalidIDFormat, idStr), err, "id", idStr)
		return
	}

	// 認証済みユーザーのIDを取得（管理者権限チェックなども将来的には実装）
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	var req dto.SubstituteLeaveGrantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleValidationError(c, err)
		return
	}

	h.logger.Info("振替特別休暇付与履歴更新開始",
		zap.String("endpoint", "UpdateSubstituteLeaveGrant"),
		zap.String("operator_id", userUUID.String()),
		zap.String("grant_id", id.String()),
		zap.String("target_user_id", req.UserID.String()))

	response, err := h.leaveService.UpdateSubstituteLeaveGrant(ctx, id, req)
	if err != nil {
		h.handleError(c, http.StatusBadRequest, message.MsgSubstituteLeaveGrantUpdateFailed, err,
			"operator_id", userUUID.String(),
			"grant_id", id.String(),
			"target_user_id", req.UserID.String())
		return
	}

	h.logger.Info("振替特別休暇付与履歴更新完了",
		zap.String("operator_id", userUUID.String()),
		zap.String("grant_id", id.String()))
	c.JSON(http.StatusOK, response)
}

// DeleteSubstituteLeaveGrant は振替特別休暇付与履歴を削除するハンドラーです
func (h *leaveHandler) DeleteSubstituteLeaveGrant(c *gin.Context) {
	ctx := c.Request.Context()
	idStr := c.Param("id")

	// IDの形式チェック
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, http.StatusBadRequest, fmt.Sprintf(message.MsgInvalidIDFormat, idStr), err, "id", idStr)
		return
	}

	// 認証済みユーザーのIDを取得（管理者権限チェックなども将来的には実装）
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	h.logger.Info("振替特別休暇付与履歴削除開始",
		zap.String("endpoint", "DeleteSubstituteLeaveGrant"),
		zap.String("operator_id", userUUID.String()),
		zap.String("grant_id", id.String()))

	if err := h.leaveService.DeleteSubstituteLeaveGrant(ctx, id); err != nil {
		h.handleError(c, http.StatusBadRequest, message.MsgSubstituteLeaveGrantDeleteFailed, err,
			"operator_id", userUUID.String(),
			"grant_id", id.String())
		return
	}

	h.logger.Info("振替特別休暇付与履歴削除完了",
		zap.String("operator_id", userUUID.String()),
		zap.String("grant_id", id.String()))
	c.JSON(http.StatusOK, gin.H{"message": message.MsgSubstituteLeaveGrantDeleted})
}

// handleError はエラーをログに記録してレスポンスを返す共通メソッド
func (h *leaveHandler) handleError(c *gin.Context, statusCode int, message string, err error, keyValues ...interface{}) {
	HandleError(c, statusCode, message, h.logger, err, keyValues...)
}

// respondError はエラーレスポンスを返す共通メソッド
func (h *leaveHandler) respondError(c *gin.Context, statusCode int, message string) {
	RespondError(c, statusCode, message)
}

// handleValidationError はバリデーションエラーを処理する共通メソッド
func (h *leaveHandler) handleValidationError(c *gin.Context, err error) {
	var validationErrors validator.ValidationErrors
	if errors.As(err, &validationErrors) {
		// バリデーションエラーの詳細情報をマップに変換
		errorDetails := make(map[string]string)
		for _, e := range validationErrors {
			errorDetails[e.Field()] = getValidationErrorMsg(e)
		}

		h.logger.Warn("バリデーションエラー",
			zap.String("endpoint", c.Request.URL.Path),
			zap.Any("validation_errors", errorDetails))

		c.JSON(http.StatusBadRequest, gin.H{
			"error":   message.MsgValidationError,
			"details": errorDetails,
		})
		return
	}

	// その他のバインドエラー
	h.handleError(c, http.StatusBadRequest, fmt.Sprintf(message.MsgInvalidRequestFormat, err.Error()), err)
}

// getValidationErrorMsg はバリデーションエラーメッセージを返す
func getValidationErrorMsg(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return "この項目は必須です"
	case "min":
		return e.Param() + "以上の値を入力してください"
	case "max":
		return e.Param() + "以下の値を入力してください"
	case "email":
		return "有効なメールアドレスを入力してください"
	case "uuid":
		return "有効なIDを入力してください"
	case "oneof":
		return "指定された値のいずれかを入力してください: " + e.Param()
	case "datetime":
		return "正しい日時形式で入力してください"
	default:
		return "入力値が不正です: " + e.Tag()
	}
}
