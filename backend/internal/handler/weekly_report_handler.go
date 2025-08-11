package handler

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
	"github.com/duesk/monstera/pkg/debug"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// WeeklyReportHandler 週報関連のハンドラー
type WeeklyReportHandler struct {
	reportService *service.WeeklyReportService
	logger        *zap.Logger
	handlerUtil   *HandlerUtil
	debugLogger   *debug.DebugLogger
	errorHandler  *utils.ErrorHandler
}

// NewWeeklyReportHandler WeeklyReportHandlerのインスタンスを生成
func NewWeeklyReportHandler(reportService *service.WeeklyReportService, logger *zap.Logger) *WeeklyReportHandler {
	// Loggerを含むHandlerUtilを正しく初期化
	handlerUtil := &HandlerUtil{
		Logger: logger,
	}

	return &WeeklyReportHandler{
		reportService: reportService,
		logger:        logger,
		handlerUtil:   handlerUtil,
		debugLogger:   debug.NewDebugLogger(logger),
		errorHandler:  utils.NewErrorHandler(),
	}
}

// Create 週報を作成
func (h *WeeklyReportHandler) Create(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストボディを読み取り
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "リクエストの読み取りに失敗しました。", nil)
		return
	}

	// ボディを再設定（後続の処理で使用するため）
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// ユーザー情報を取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}
	userRole, _ := c.Get("role")

	// ユーザーロールの文字列表現を取得する
	var userRoleStr string
	if userRole != nil {
		switch v := userRole.(type) {
		case string:
			userRoleStr = v
		case *model.Role:
			if v != nil {
				userRoleStr = v.String()
			} else {
				userRoleStr = "unknown"
			}
		default:
			userRoleStr = "unknown"
		}
	} else {
		userRoleStr = "unknown"
	}

	// デバッグログ: リクエスト開始
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationCreate,
			Description: "週報作成",
		},
		debug.RequestDebugData{
			Method:   c.Request.Method,
			URL:      c.Request.URL.String(),
			RawBody:  string(bodyBytes),
			UserID:   userUUID,
			UserRole: userRoleStr,
		},
	)

	var req dto.CreateWeeklyReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:  debug.CategoryAPI,
				Operation: debug.OperationCreate,
			},
			debug.ErrorDebugData{
				Error:       err,
				ErrorType:   "BindError",
				RequestData: string(bodyBytes),
			},
		)
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "リクエストの形式が正しくありません。", nil)
		return
	}

	// デバッグログ: データ処理（バインド後）
	h.debugLogger.DataProcess(
		debug.DebugLogConfig{
			Category:  debug.CategoryAPI,
			Operation: debug.OperationBind,
		},
		debug.DataProcessDebugData{
			InputData:   string(bodyBytes),
			OutputData:  req,
			ProcessType: "JSONBind",
			Metadata: map[string]interface{}{
				"daily_records_count": len(req.DailyRecords),
			},
		},
	)

	// 日付文字列をパース
	startDate, endDate, err := h.validateDateRange(req.StartDate, req.EndDate)
	if err != nil {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:  debug.CategoryAPI,
				Operation: debug.OperationCreate,
			},
			debug.ErrorDebugData{
				Error:       err,
				ErrorType:   "ValidationError",
				RequestData: req,
			},
		)
		h.respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 週報モデルを作成
	report := &model.WeeklyReport{
		UserID:                   userUUID,
		StartDate:                startDate,
		EndDate:                  endDate,
		Status:                   model.WeeklyReportStatusEnum(req.Status),
		WeeklyRemarks:            req.WeeklyRemarks,
		WorkplaceName:            req.WorkplaceName,
		WorkplaceHours:           req.WorkplaceHours,
		WorkplaceChangeRequested: req.WorkplaceChangeRequested,
	}

	// ステータスが指定されていない場合はドラフト
	if report.Status == "" {
		report.Status = model.WeeklyReportStatusDraft
	}

	// 日次勤怠記録を変換
	dailyRecords, err := h.convertDailyRecordRequests(req.DailyRecords)
	if err != nil {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:  debug.CategoryAPI,
				Operation: debug.OperationCreate,
			},
			debug.ErrorDebugData{
				Error:       err,
				ErrorType:   "ConversionError",
				RequestData: req.DailyRecords,
			},
		)
		h.respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 週報を保存
	if err := h.reportService.Create(ctx, report, dailyRecords); err != nil {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:  debug.CategoryAPI,
				Operation: debug.OperationCreate,
			},
			debug.ErrorDebugData{
				Error:       err,
				ErrorType:   "ServiceError",
				RequestData: report,
			},
		)
		h.handleError(c, http.StatusInternalServerError, message.MsgWeeklyReportCreateFailed, err)
		return
	}

	// レスポンスを作成
	response := h.createReportResponse(report)

	// デバッグ: レポートのステータスを確認
	h.logger.Debug("Weekly report created",
		zap.String("report_id", report.ID),
		zap.String("status", string(report.Status)),
		zap.Any("status_type", fmt.Sprintf("%T", report.Status)))

	// デバッグログ: レスポンス送信
	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:  debug.CategoryAPI,
			Operation: debug.OperationCreate,
		},
		debug.ResponseDebugData{
			StatusCode:   http.StatusCreated,
			ResponseBody: response,
			Metadata: map[string]interface{}{
				"report_id": report.ID,
				"status":    report.Status,
			},
		},
	)

	c.JSON(http.StatusCreated, response)
}

// Get 週報を取得
func (h *WeeklyReportHandler) Get(c *gin.Context) {
	ctx := c.Request.Context()
	// IDを取得
	id, err := h.parseUUID(c, "id")
	if err != nil {
		return
	}

	// 週報を取得
	report, err := h.reportService.GetByID(ctx, id)
	if err != nil {
		h.handleError(c, http.StatusNotFound, message.MsgWeeklyReportNotFound, err, "id", id)
		return
	}

	// アクセス権のチェック
	if !h.hasAccessToReport(c, report) {
		h.respondError(c, http.StatusForbidden, message.MsgReportAccessDenied)
		return
	}

	// レスポンスを作成
	response := h.createReportResponse(report)
	c.JSON(http.StatusOK, response)
}

// Update 週報を更新
func (h *WeeklyReportHandler) Update(c *gin.Context) {
	ctx := c.Request.Context()

	// IDを取得
	id, err := h.parseUUID(c, "id")
	if err != nil {
		return
	}

	// リクエストボディを読み取り
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		h.handleError(c, http.StatusBadRequest, message.MsgRequestBodyReadFailed, err)
		return
	}

	// ボディを再設定（後続の処理で使用するため）
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// ユーザー情報を取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}
	userRole, _ := c.Get("role")

	// ユーザーロールの文字列表現を取得する
	var userRoleStr string
	if userRole != nil {
		switch v := userRole.(type) {
		case string:
			userRoleStr = v
		case *model.Role:
			if v != nil {
				userRoleStr = v.String()
			} else {
				userRoleStr = "unknown"
			}
		default:
			userRoleStr = "unknown"
		}
	} else {
		userRoleStr = "unknown"
	}

	// デバッグログ: リクエスト開始
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationUpdate,
			Description: "週報更新",
		},
		debug.RequestDebugData{
			Method:     c.Request.Method,
			URL:        c.Request.URL.String(),
			RawBody:    string(bodyBytes),
			UserID:     userUUID,
			UserRole:   userRoleStr,
			PathParams: map[string]string{"id": id},
		},
	)

	var req dto.UpdateWeeklyReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:  debug.CategoryAPI,
				Operation: debug.OperationUpdate,
			},
			debug.ErrorDebugData{
				Error:       err,
				ErrorType:   "BindError",
				RequestData: string(bodyBytes),
			},
		)
		h.handleError(c, http.StatusBadRequest, message.MsgInvalidRequest, err)
		return
	}

	// デバッグログ: データ処理（バインド後）
	h.debugLogger.DataProcess(
		debug.DebugLogConfig{
			Category:  debug.CategoryAPI,
			Operation: debug.OperationBind,
		},
		debug.DataProcessDebugData{
			InputData:   string(bodyBytes),
			OutputData:  req,
			ProcessType: "JSONBind",
			Metadata: map[string]interface{}{
				"report_id":           id,
				"daily_records_count": len(req.DailyRecords),
			},
		},
	)

	// 週報を取得
	report, err := h.reportService.GetByID(ctx, id)
	if err != nil {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:  debug.CategoryAPI,
				Operation: debug.OperationUpdate,
			},
			debug.ErrorDebugData{
				Error:       err,
				ErrorType:   "NotFoundError",
				RequestData: id,
			},
		)
		h.handleError(c, http.StatusNotFound, message.MsgWeeklyReportNotFound, err, "id", id)
		return
	}

	// アクセス権のチェック
	if !h.hasAccessToReport(c, report) {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:  debug.CategoryAPI,
				Operation: debug.OperationUpdate,
			},
			debug.ErrorDebugData{
				Error:       fmt.Errorf("access denied"),
				ErrorType:   "AuthorizationError",
				RequestData: map[string]interface{}{"report_id": id, "user_id": userUUID},
			},
		)
		h.respondError(c, http.StatusForbidden, message.MsgReportEditDenied)
		return
	}

	// ユーザーロールを取得
	userRole, _ = c.Get("role")

	// 提出済みの週報は編集不可（管理者は可能）
	if report.Status == model.WeeklyReportStatusSubmitted {
		if roleStr, ok := userRole.(string); ok {
			role, err := model.ParseRole(roleStr)
			if err != nil || !role.IsAdmin() {
				h.debugLogger.RequestError(
					debug.DebugLogConfig{
						Category:  debug.CategoryAPI,
						Operation: debug.OperationUpdate,
					},
					debug.ErrorDebugData{
						Error:       fmt.Errorf("submitted report cannot be edited"),
						ErrorType:   "BusinessLogicError",
						RequestData: map[string]interface{}{"report_id": id, "status": report.Status, "user_role": userRole},
					},
				)
				h.respondError(c, http.StatusForbidden, message.MsgCannotEditSubmitted)
				return
			}
		}
	}

	// リクエストの値を週報に反映
	if req.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			h.debugLogger.RequestError(
				debug.DebugLogConfig{
					Category:  debug.CategoryAPI,
					Operation: debug.OperationUpdate,
				},
				debug.ErrorDebugData{
					Error:       err,
					ErrorType:   "ValidationError",
					RequestData: req.StartDate,
				},
			)
			h.handleError(c, http.StatusBadRequest, message.MsgStartDateFormatInvalid, err)
			return
		}
		report.StartDate = startDate
	}

	if req.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			h.debugLogger.RequestError(
				debug.DebugLogConfig{
					Category:  debug.CategoryAPI,
					Operation: debug.OperationUpdate,
				},
				debug.ErrorDebugData{
					Error:       err,
					ErrorType:   "ValidationError",
					RequestData: req.EndDate,
				},
			)
			h.handleError(c, http.StatusBadRequest, message.MsgEndDateFormatInvalid, err)
			return
		}
		report.EndDate = endDate
	}

	// WeeklyRemarksは空文字列を許可（クリアする場合があるため）
	report.WeeklyRemarks = req.WeeklyRemarks

	if req.WorkplaceName != "" {
		report.WorkplaceName = req.WorkplaceName
	}
	if req.WorkplaceHours != "" {
		report.WorkplaceHours = req.WorkplaceHours
	}
	report.WorkplaceChangeRequested = req.WorkplaceChangeRequested

	// ステータスの設定 (空文字列は未指定を意味する可能性があるため処理しない)
	if req.Status != "" {
		report.Status = model.WeeklyReportStatusEnum(req.Status)
	}

	// 日次勤怠記録を変換
	dailyRecords, err := h.convertDailyRecordRequests(req.DailyRecords)
	if err != nil {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:  debug.CategoryAPI,
				Operation: debug.OperationUpdate,
			},
			debug.ErrorDebugData{
				Error:       err,
				ErrorType:   "ConversionError",
				RequestData: req.DailyRecords,
			},
		)
		h.respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 週報を更新
	if err := h.reportService.Update(ctx, report, dailyRecords); err != nil {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:  debug.CategoryAPI,
				Operation: debug.OperationUpdate,
			},
			debug.ErrorDebugData{
				Error:       err,
				ErrorType:   "ServiceError",
				RequestData: report,
			},
		)
		h.handleError(c, http.StatusInternalServerError, message.MsgWeeklyReportUpdateFailed, err)
		return
	}

	// レスポンスを作成
	response := h.createReportResponse(report)

	// デバッグログ: レスポンス送信
	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:  debug.CategoryAPI,
			Operation: debug.OperationUpdate,
		},
		debug.ResponseDebugData{
			StatusCode:   http.StatusOK,
			ResponseBody: response,
			Metadata: map[string]interface{}{
				"report_id": report.ID,
				"status":    report.Status,
			},
		},
	)

	c.JSON(http.StatusOK, response)
}

// Delete 週報を削除
func (h *WeeklyReportHandler) Delete(c *gin.Context) {
	ctx := c.Request.Context()
	// IDを取得
	id, err := h.parseUUID(c, "id")
	if err != nil {
		return
	}

	// 週報を取得
	report, err := h.reportService.GetByID(ctx, id)
	if err != nil {
		h.handleError(c, http.StatusNotFound, message.MsgWeeklyReportNotFound, err, "id", id)
		return
	}

	// アクセス権のチェック
	if !h.hasAccessToReport(c, report) {
		h.respondError(c, http.StatusForbidden, message.MsgReportDeleteDenied)
		return
	}

	// 週報を削除
	if err := h.reportService.Delete(ctx, id); err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgWeeklyReportDeleteFailed, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": message.MsgWeeklyReportDeleted})
}

// List 週報一覧を取得
func (h *WeeklyReportHandler) List(c *gin.Context) {
	ctx := c.Request.Context()
	// クエリパラメータを取得
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	search := c.Query("search")

	// ユーザーIDとロールを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}
	userRole, _ := c.Get("role")

	// フィルター条件を作成
	filters := &service.WeeklyReportFilters{
		Page:      page,
		Limit:     limit,
		Status:    status,
		StartDate: startDate,
		EndDate:   endDate,
		Search:    search,
	}

	// ロールに応じてフィルターを設定
	isManagerOrAbove := false
	if roleStr, ok := userRole.(string); ok {
		role, err := model.ParseRole(roleStr)
		if err == nil && role.IsManager() {
			isManagerOrAbove = true
		}
	}

	if !isManagerOrAbove {
		// 一般ユーザーは自分の週報のみ表示
		filters.UserID = userUUID
	} else if userIDStr := c.Query("user_id"); userIDStr != "" {
		// 管理者やマネージャーは特定ユーザーの週報をフィルタリング可能
		// UUID validation removed after migration
		if userIDStr != "" {
			filters.UserID = userIDStr
		}
	}

	// 週報一覧を取得
	reports, total, err := h.reportService.List(ctx, filters)
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgWeeklyReportGetFailed, err)
		return
	}

	// デバッグログ: 取得したレポートのステータスを確認
	for i, report := range reports {
		h.logger.Debug("Report status check",
			zap.Int("index", i),
			zap.String("report_id", report.ID),
			zap.String("status", string(report.Status)),
			zap.Any("status_type", fmt.Sprintf("%T", report.Status)),
			zap.Int("status_length", len(report.Status)),
			zap.String("status_quoted", fmt.Sprintf("%q", report.Status)))
	}

	// レスポンスを作成
	response := dto.ListWeeklyReportsResponse{
		Reports: make([]dto.WeeklyReportResponse, len(reports)),
		Total:   total,
		Page:    page,
		Limit:   limit,
	}

	// 各週報のレスポンスを作成
	for i, report := range reports {
		// 一覧表示では日次勤怠記録は含めない簡易版レスポンスを返す
		response.Reports[i] = dto.WeeklyReportResponse{
			ID:                       report.ID,
			UserID:                   report.UserID,
			StartDate:                report.StartDate,
			EndDate:                  report.EndDate,
			Status:                   string(report.Status),
			WeeklyRemarks:            report.WeeklyRemarks,
			WorkplaceName:            report.WorkplaceName,
			WorkplaceHours:           report.WorkplaceHours,
			WorkplaceChangeRequested: report.WorkplaceChangeRequested,
			TotalWorkHours:           report.TotalWorkHours,
			SubmittedAt:              report.SubmittedAt,
			CreatedAt:                report.CreatedAt,
			UpdatedAt:                report.UpdatedAt,
		}

		// デバッグログ: レスポンスに設定されたステータスを確認
		h.logger.Debug("Response status check",
			zap.Int("index", i),
			zap.String("report_id", response.Reports[i].ID),
			zap.String("status", response.Reports[i].Status),
			zap.Any("status_type", fmt.Sprintf("%T", response.Reports[i].Status)),
			zap.String("status_hex", fmt.Sprintf("%x", response.Reports[i].Status)))
	}

	// デバッグログ: JSON送信直前の全体確認
	if len(response.Reports) > 0 {
		h.logger.Debug("Final response before JSON",
			zap.String("first_report_id", response.Reports[0].ID),
			zap.String("first_report_status", response.Reports[0].Status),
			zap.Any("response_type", fmt.Sprintf("%T", response)))
	}

	c.JSON(http.StatusOK, response)
}

// Submit 週報を提出
func (h *WeeklyReportHandler) Submit(c *gin.Context) {
	ctx := c.Request.Context()
	// IDを取得
	id, err := h.parseUUID(c, "id")
	if err != nil {
		return
	}

	// 週報を取得
	report, err := h.reportService.GetByID(ctx, id)
	if err != nil {
		h.handleError(c, http.StatusNotFound, message.MsgWeeklyReportNotFound, err, "id", id)
		return
	}

	// ユーザーIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 自分の週報かチェック
	if report.UserID != userUUID {
		h.respondError(c, http.StatusForbidden, message.MsgReportSubmitDenied)
		return
	}

	// 既に提出済みならエラー
	if report.Status == model.WeeklyReportStatusSubmitted {
		h.respondError(c, http.StatusBadRequest, message.MsgAlreadySubmitted)
		return
	}

	// 週報を提出
	if err := h.reportService.Submit(ctx, id); err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgWeeklyReportSubmitFailed, err)
		return
	}

	// 更新された週報を取得
	report, err = h.reportService.GetByID(ctx, id)
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgUpdatedReportGetFailed, err)
		return
	}

	// レスポンスを作成
	response := h.createReportResponse(report)
	c.JSON(http.StatusOK, response)
}

// Copy 週報をコピー
func (h *WeeklyReportHandler) Copy(c *gin.Context) {
	ctx := c.Request.Context()
	// IDを取得
	id, err := h.parseUUID(c, "id")
	if err != nil {
		return
	}

	// 元の週報を取得
	originalReport, err := h.reportService.GetByID(ctx, id)
	if err != nil {
		h.handleError(c, http.StatusNotFound, message.MsgWeeklyReportNotFound, err, "id", id)
		return
	}

	// ユーザーIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 1週間後の日付を設定
	newStartDate := originalReport.StartDate.AddDate(0, 0, 7)
	newEndDate := originalReport.EndDate.AddDate(0, 0, 7)

	// 新しい週報を作成
	newReport := &model.WeeklyReport{
		UserID:                   userUUID,
		StartDate:                newStartDate,
		EndDate:                  newEndDate,
		Status:                   model.WeeklyReportStatusDraft,
		WeeklyRemarks:            "",
		WorkplaceName:            originalReport.WorkplaceName,
		WorkplaceHours:           originalReport.WorkplaceHours,
		WorkplaceChangeRequested: originalReport.WorkplaceChangeRequested,
	}

	// 日次勤怠記録を1週間後にシフト
	var newDailyRecords []*model.DailyRecord
	if len(originalReport.DailyRecords) > 0 {
		newDailyRecords = make([]*model.DailyRecord, len(originalReport.DailyRecords))
		for i, record := range originalReport.DailyRecords {
			// 日付を1週間後にシフト
			newDate := record.Date.AddDate(0, 0, 7)

			// 新しい日次勤怠記録を作成
			newDailyRecords[i] = &model.DailyRecord{
				Date:          newDate,
				StartTime:     record.StartTime,
				EndTime:       record.EndTime,
				BreakTime:     record.BreakTime,
				WorkHours:     record.WorkHours,
				Remarks:       record.Remarks,
				IsHolidayWork: record.IsHolidayWork,
			}
		}
	}

	// 週報を保存
	if err := h.reportService.Create(ctx, newReport, newDailyRecords); err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgWeeklyReportCopyFailed, err)
		return
	}

	// レスポンスを作成
	response := h.createReportResponse(newReport)
	c.JSON(http.StatusCreated, response)
}

// GetWeeklyReportByDateRange は日付範囲に基づいて週報を取得するハンドラー
func (h *WeeklyReportHandler) GetWeeklyReportByDateRange(c *gin.Context) {
	ctx := c.Request.Context()
	// クエリパラメータから日付範囲を取得
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")
	h.logger.Debug("日付範囲パラメータを受信", zap.String("start_date", startDateStr), zap.String("end_date", endDateStr))

	// 日付形式のバリデーション
	if startDateStr == "" || endDateStr == "" {
		h.handleError(c, http.StatusBadRequest, message.MsgDateRangeRequired, nil)
		return
	}

	// 日付範囲のパース
	startDate, endDate, err := h.validateDateRange(startDateStr, endDateStr)
	if err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// ユーザーIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 日付範囲で週報を検索
	report, err := h.reportService.GetByDateRange(ctx, userUUID, startDate, endDate)
	if err != nil {
		h.logger.Error("Failed to get weekly report by date range",
			zap.Error(err),
			zap.String("start_date", startDateStr),
			zap.String("end_date", endDateStr),
			zap.String("user_id", userUUID))

		// レコードが見つからない場合は204を返す
		h.respondError(c, http.StatusNoContent, message.MsgDateRangeReportNotFound)
		return
	}

	// 日次勤怠記録が取得できているか確認
	if len(report.DailyRecords) == 0 {
		// 日次勤怠記録が取得できていない場合は、明示的に取得
		dailyRecords, err := h.reportService.GetDailyRecords(report.ID)
		if err != nil {
			h.logger.Warn("Failed to get daily records for report",
				zap.Error(err),
				zap.String("report_id", report.ID))
		} else {
			report.DailyRecords = dailyRecords
		}
	}

	// デバッグログ：日次勤怠記録の件数を確認
	h.logger.Debug("Retrieved daily records count",
		zap.Int("count", len(report.DailyRecords)),
		zap.String("report_id", report.ID))

	// レスポンスを作成
	response := h.createReportResponse(report)

	// 日次勤怠記録が正しくレスポンスに含まれているか確認
	h.logger.Debug("Response daily records count",
		zap.Int("count", len(response.DailyRecords)),
		zap.String("report_id", response.ID))

	c.JSON(http.StatusOK, response)
}

// SaveAsDraft 週報を下書きとして保存（新規または更新）
func (h *WeeklyReportHandler) SaveAsDraft(c *gin.Context) {
	ctx := c.Request.Context()
	var req dto.CreateWeeklyReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, http.StatusBadRequest, message.MsgInvalidRequest, err)
		return
	}

	// JSON文字列をチェック
	h.logger.Debug("Weekly report draft request", zap.Any("request", req))

	// 日付文字列をパース
	startDate, endDate, err := h.validateDateRange(req.StartDate, req.EndDate)
	if err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// ユーザーIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 週報モデルを作成
	report := &model.WeeklyReport{
		UserID:                   userUUID,
		StartDate:                startDate,
		EndDate:                  endDate,
		Status:                   model.WeeklyReportStatusDraft, // 下書きステータスを明示的に設定
		WeeklyRemarks:            req.WeeklyRemarks,
		WorkplaceName:            req.WorkplaceName,
		WorkplaceHours:           req.WorkplaceHours,
		WorkplaceChangeRequested: req.WorkplaceChangeRequested,
	}

	// リクエストIDが指定されている場合は既存レコードのIDを設定
	if req.ID != "" {
		// UUID validation removed after migration
		report.ID = req.ID
	}

	// 日次勤怠記録を変換
	dailyRecords, err := h.convertDailyRecordRequests(req.DailyRecords)
	if err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 週報を保存（新規or更新）
	if err := h.reportService.SaveReport(ctx, report, dailyRecords); err != nil {
		h.logger.Error("Failed to save weekly report as draft", zap.Error(err))

		// エラーメッセージに応じて適切なステータスコードを返す
		if err.Error() == "提出済みの週報は編集できません" {
			h.respondError(c, http.StatusForbidden, err.Error())
			return
		}

		h.respondError(c, http.StatusInternalServerError, message.MsgWeeklyReportSaveFailed)
		return
	}

	// レスポンスを作成
	response := h.createReportResponse(report)
	c.JSON(http.StatusOK, response)
}

// SaveAndSubmit 週報を保存して提出
func (h *WeeklyReportHandler) SaveAndSubmit(c *gin.Context) {
	ctx := c.Request.Context()
	var req dto.CreateWeeklyReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, http.StatusBadRequest, message.MsgInvalidRequest, err)
		return
	}

	// JSON文字列をチェック
	h.logger.Debug("Weekly report save and submit request", zap.Any("request", req))

	// 日付文字列をパース
	startDate, endDate, err := h.validateDateRange(req.StartDate, req.EndDate)
	if err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// ユーザーIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 週報モデルを作成
	report := &model.WeeklyReport{
		UserID:                   userUUID,
		StartDate:                startDate,
		EndDate:                  endDate,
		Status:                   model.WeeklyReportStatusSubmitted, // 提出済みステータスを設定
		WeeklyRemarks:            req.WeeklyRemarks,
		WorkplaceName:            req.WorkplaceName,
		WorkplaceHours:           req.WorkplaceHours,
		WorkplaceChangeRequested: req.WorkplaceChangeRequested,
	}

	// リクエストIDが指定されている場合は既存レコードのIDを設定
	if req.ID != "" {
		// UUID validation removed after migration
		report.ID = req.ID
	}

	// 提出日時を設定
	now := time.Now()
	report.SubmittedAt = &now

	// 日次勤怠記録を変換
	dailyRecords, err := h.convertDailyRecordRequests(req.DailyRecords)
	if err != nil {
		h.respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 週報を保存（新規or更新）
	if err := h.reportService.SaveReport(ctx, report, dailyRecords); err != nil {
		h.logger.Error("Failed to save and submit weekly report", zap.Error(err))

		// エラーメッセージに応じて適切なステータスコードを返す
		if err.Error() == "提出済みの週報は編集できません" {
			h.respondError(c, http.StatusForbidden, err.Error())
			return
		}

		h.respondError(c, http.StatusInternalServerError, message.MsgWeeklyReportSubmitFailed)
		return
	}

	// レスポンスを作成
	response := h.createReportResponse(report)
	c.JSON(http.StatusOK, response)
}

// PrivateレスポンスヘルパーメソッドArea

// createReportResponse 週報レスポンスを作成
func (h *WeeklyReportHandler) createReportResponse(report *model.WeeklyReport) *dto.WeeklyReportResponse {
	// デバッグログ: 変換前のステータス値を確認
	h.logger.Debug("Creating report response",
		zap.String("report_id", report.ID),
		zap.String("status", string(report.Status)),
		zap.Any("status_type", fmt.Sprintf("%T", report.Status)),
		zap.Int("status_length", len(report.Status)),
		zap.String("status_quoted", fmt.Sprintf("%q", report.Status)))

	response := &dto.WeeklyReportResponse{
		ID:                       report.ID,
		UserID:                   report.UserID,
		StartDate:                report.StartDate,
		EndDate:                  report.EndDate,
		Status:                   string(report.Status), // WeeklyReportStatusEnumのString()メソッドを使用
		WeeklyRemarks:            report.WeeklyRemarks,
		WorkplaceName:            report.WorkplaceName,
		WorkplaceHours:           report.WorkplaceHours,
		WorkplaceChangeRequested: report.WorkplaceChangeRequested,
		TotalWorkHours:           report.TotalWorkHours,
		ClientTotalWorkHours:     report.ClientTotalWorkHours,
		SubmittedAt:              report.SubmittedAt,
		CreatedAt:                report.CreatedAt,
		UpdatedAt:                report.UpdatedAt,
	}

	// 日次勤怠記録があれば追加
	if len(report.DailyRecords) > 0 {
		// レスポンスの日次勤怠記録配列を初期化
		response.DailyRecords = make([]dto.DailyRecordResponse, len(report.DailyRecords))

		// 各日次勤怠記録をレスポンス形式に変換
		for i, record := range report.DailyRecords {
			response.DailyRecords[i] = dto.DailyRecordResponse{
				ID:              record.ID,
				Date:            record.Date.Format("2006-01-02"),
				StartTime:       record.StartTime,
				EndTime:         record.EndTime,
				BreakTime:       record.BreakTime,
				WorkHours:       record.WorkHours,
				ClientStartTime: record.ClientStartTime,
				ClientEndTime:   record.ClientEndTime,
				ClientBreakTime: record.ClientBreakTime,
				ClientWorkHours: record.ClientWorkHours,
				HasClientWork:   record.HasClientWork,
				Remarks:         record.Remarks,
				IsHolidayWork:   record.IsHolidayWork,
			}
		}

		// デバッグログを追加：日次勤怠記録の件数
		h.logger.Debug("Added daily records to response",
			zap.Int("record_count", len(response.DailyRecords)),
			zap.String("report_id", report.ID))
	} else {
		// 日次勤怠記録がない場合にデバッグログを出力
		h.logger.Debug("No daily records available for report",
			zap.String("report_id", report.ID))

		// 空の配列を設定（nullではなく）
		response.DailyRecords = []dto.DailyRecordResponse{}
	}

	return response
}

// parseTimeWithDate 日付と時刻を結合して時刻文字列を生成するヘルパーメソッド
func (h *WeeklyReportHandler) parseTimeWithDate(date time.Time, timeStr string, fieldName string) *string {
	if timeStr == "" {
		return nil
	}

	// 時刻だけを保持する場合は、そのまま返す
	// タイムゾーン情報を持つ日時をパース試行（デバッグ用）
	_, err := time.Parse("15:04", timeStr)
	if err == nil {
		// デバッグログ追加
		h.logger.Info(fieldName+" パース成功",
			zap.String("original_"+strings.ToLower(fieldName), timeStr))
		return &timeStr
	} else {
		// エラーの場合もログ出力
		h.logger.Warn(fieldName+" パース失敗",
			zap.String("original_"+strings.ToLower(fieldName), timeStr),
			zap.Error(err))
		return nil
	}
}

// convertDailyRecordRequests 日次勤怠記録リクエストを内部モデルに変換
func (h *WeeklyReportHandler) convertDailyRecordRequests(requests []dto.DailyRecordRequest) ([]*model.DailyRecord, error) {
	if len(requests) == 0 {
		return []*model.DailyRecord{}, nil
	}

	dailyRecords := make([]*model.DailyRecord, len(requests))

	for i, recordReq := range requests {
		// 日付文字列をパース
		date, err := time.Parse("2006-01-02", recordReq.Date)
		if err != nil {
			h.logger.Error("Invalid date format", zap.Error(err), zap.String("date", recordReq.Date))
			return nil, fmt.Errorf(message.MsgDateFormatInvalid, recordReq.Date)
		}

		// 日次勤怠記録を作成
		dailyRecords[i] = &model.DailyRecord{
			Date:            date,
			StartTime:       recordReq.StartTime,
			EndTime:         recordReq.EndTime,
			BreakTime:       recordReq.BreakTime,
			WorkHours:       recordReq.WorkHours,
			ClientStartTime: recordReq.ClientStartTime,
			ClientEndTime:   recordReq.ClientEndTime,
			ClientBreakTime: recordReq.ClientBreakTime,
			ClientWorkHours: recordReq.ClientWorkHours,
			HasClientWork:   recordReq.HasClientWork,
			Remarks:         recordReq.Remarks,
			IsHolidayWork:   recordReq.IsHolidayWork,
		}
	}

	return dailyRecords, nil
}

// validateDateRange 日付範囲のバリデーションを行う
func (h *WeeklyReportHandler) validateDateRange(startDateStr string, endDateStr string) (time.Time, time.Time, error) {
	// 開始日のパース
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		h.logger.Error("Invalid start date format", zap.Error(err))
		return time.Time{}, time.Time{}, fmt.Errorf(message.MsgStartDateFormatInvalid)
	}

	// 終了日のパース
	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		h.logger.Error("Invalid end date format", zap.Error(err))
		return time.Time{}, time.Time{}, fmt.Errorf(message.MsgEndDateFormatInvalid)
	}

	return startDate, endDate, nil
}

// 追加の共通ヘルパーメソッド

// parseUUID UUIDをパースする
func (h *WeeklyReportHandler) parseUUID(c *gin.Context, paramName string) (string, error) {
	return ParseUUID(c, paramName, h.logger)
}

// hasAccessToReport 週報へのアクセス権があるかチェックする
func (h *WeeklyReportHandler) hasAccessToReport(c *gin.Context, report *model.WeeklyReport) bool {
	userID, _ := c.Get("user_id")
	userRole, _ := c.Get("role")

	// 型変換を確実に行う
	userUUID, ok := userID.(string)
	if !ok {
		return false
	}

	// 自分の週報か、マネージャー権限以上であればアクセス可能
	if report.UserID == userUUID {
		return true
	}

	// ロールを確認
	if roleStr, ok := userRole.(string); ok {
		role, err := model.ParseRole(roleStr)
		if err == nil && role.IsManager() {
			return true
		}
	}

	return false
}

// respondError エラーレスポンスを返す
func (h *WeeklyReportHandler) respondError(c *gin.Context, statusCode int, message string) {
	RespondError(c, statusCode, message)
}

// handleError エラーをログに記録してレスポンスを返す
func (h *WeeklyReportHandler) handleError(c *gin.Context, statusCode int, message string, err error, keyValues ...interface{}) {
	HandleError(c, statusCode, message, h.logger, err, keyValues...)
}

// GetUserDefaultWorkSettings ユーザーのデフォルト勤務時間設定を取得
func (h *WeeklyReportHandler) GetUserDefaultWorkSettings(c *gin.Context) {
	// ユーザーIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// デフォルト勤務時間設定を取得
	settings, err := h.reportService.GetUserDefaultWorkSettings(userUUID)
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, message.MsgDefaultWorkSettingsGetFailed, err)
		return
	}

	// 成功レスポンスを返す
	c.JSON(http.StatusOK, settings)
}

// SaveUserDefaultWorkSettings ユーザーのデフォルト勤務時間設定を保存
func (h *WeeklyReportHandler) SaveUserDefaultWorkSettings(c *gin.Context) {
	// リクエストボディを生のJSONとして読み込み
	var reqBody map[string]interface{}
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		h.logger.Error("リクエストのバインドに失敗しました", zap.Error(err))
		h.handleError(c, http.StatusBadRequest, message.MsgInvalidRequest, err)
		return
	}

	// デバッグログ：リクエストデータを詳細に記録
	h.logger.Debug("デフォルト設定保存リクエスト (詳細)",
		zap.Any("request_body", reqBody),
		zap.String("content_type", c.GetHeader("Content-Type")),
		zap.String("request_method", c.Request.Method))

	// ユーザーIDを取得
	userUUID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 必須フィールドの検証
	if _, ok := reqBody["weekday_start_time"]; !ok {
		h.respondError(c, http.StatusBadRequest, message.MsgWeekdayStartTimeRequired)
		return
	}
	if _, ok := reqBody["weekday_end_time"]; !ok {
		h.respondError(c, http.StatusBadRequest, message.MsgWeekdayEndTimeRequired)
		return
	}
	if _, ok := reqBody["weekday_break_time"]; !ok {
		h.respondError(c, http.StatusBadRequest, message.MsgWeekdayBreakTimeRequired)
		return
	}

	// 基本情報を取得
	weekdayStartTime, _ := reqBody["weekday_start_time"].(string)
	weekdayEndTime, _ := reqBody["weekday_end_time"].(string)

	// 数値型の処理改善（float64か数値文字列の両方に対応）
	var weekdayBreakTimeFloat float64
	if breakTime, ok := reqBody["weekday_break_time"].(float64); ok {
		weekdayBreakTimeFloat = breakTime
	} else if breakTimeStr, ok := reqBody["weekday_break_time"].(string); ok {
		if parsedFloat, err := strconv.ParseFloat(breakTimeStr, 64); err == nil {
			weekdayBreakTimeFloat = parsedFloat
		}
	}

	// モデルに変換
	settings := &model.UserDefaultWorkSettings{
		UserID:           userUUID,
		WeekdayStartTime: weekdayStartTime,
		WeekdayEndTime:   weekdayEndTime,
		WeekdayBreakTime: weekdayBreakTimeFloat,
	}

	// 設定を保存
	if err := h.reportService.SaveUserDefaultWorkSettings(settings); err != nil {
		h.logger.Error("設定の保存に失敗しました",
			zap.Error(err),
			zap.String("user_id", userUUID),
			zap.Any("settings", settings))
		h.handleError(c, http.StatusInternalServerError, message.MsgDefaultWorkSettingsSaveFailed, err)
		return
	}

	// 成功レスポンスを返す
	c.JSON(http.StatusOK, gin.H{
		"message":  message.MsgDefaultWorkSettingsSaved,
		"settings": settings,
	})
}
