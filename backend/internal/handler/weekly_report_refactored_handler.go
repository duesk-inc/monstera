package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// WeeklyReportRefactoredHandler 週報関連のハンドラー（リファクタリング版）
type WeeklyReportRefactoredHandler interface {
	// ユーザー向けAPI
	GetUserWeeklyReports(c *gin.Context)
	GetUserWeeklyReportDetail(c *gin.Context)
	CreateWeeklyReport(c *gin.Context)
	UpdateWeeklyReport(c *gin.Context)
	SubmitWeeklyReport(c *gin.Context)
	DeleteWeeklyReport(c *gin.Context)

	// 管理者向けAPI
	GetAllWeeklyReports(c *gin.Context)
	GetUnsubmittedReports(c *gin.Context)
	GetWeeklyReportStatistics(c *gin.Context)
	BatchSubmitReports(c *gin.Context)
	BatchUpdateDeadlines(c *gin.Context)
}

// weeklyReportRefactoredHandler ハンドラー実装
type weeklyReportRefactoredHandler struct {
	BaseHandler
	service service.WeeklyReportRefactoredService
	util    *HandlerUtil
}

// NewWeeklyReportRefactoredHandler インスタンスを生成
func NewWeeklyReportRefactoredHandler(
	service service.WeeklyReportRefactoredService,
	logger *zap.Logger,
) WeeklyReportRefactoredHandler {
	return &weeklyReportRefactoredHandler{
		BaseHandler: BaseHandler{Logger: logger},
		service:     service,
		util:        NewHandlerUtil(logger),
	}
}

// GetUserWeeklyReports ユーザーの週報一覧を取得
func (h *weeklyReportRefactoredHandler) GetUserWeeklyReports(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// クエリパラメータを取得
	params := &service.ListParams{
		Page:      h.getIntQuery(c, "page", 1),
		Limit:     h.getIntQuery(c, "limit", 20),
		Status:    c.Query("status"),
		StartDate: c.Query("start_date"),
		EndDate:   c.Query("end_date"),
		Search:    c.Query("search"),
	}

	// バリデーション
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 100 {
		params.Limit = 20
	}

	// サービス呼び出し
	response, err := h.service.GetUserWeeklyReports(ctx, userID, params)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "週報一覧の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"reports":    response.Reports,
		"pagination": response.Pagination,
	})
}

// GetUserWeeklyReportDetail ユーザーの週報詳細を取得
func (h *weeklyReportRefactoredHandler) GetUserWeeklyReportDetail(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータからIDを取得
	reportID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	report, err := h.service.GetUserWeeklyReportDetail(ctx, userID, reportID)
	if err != nil {
		if err.Error() == message.MsgReportNotFoundByID {
			RespondNotFound(c, "週報")
			return
		}
		if err.Error() == message.MsgNoPermission {
			RespondForbidden(c, "この週報を閲覧する権限がありません")
			return
		}
		HandleError(c, http.StatusInternalServerError, "週報詳細の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"report": report,
	})
}

// CreateWeeklyReport 週報を作成
func (h *weeklyReportRefactoredHandler) CreateWeeklyReport(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディをバインド
	var req dto.CreateWeeklyReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, h.util.CreateValidationErrorMap(err))
		return
	}

	// 日付を変換
	startDate, err := parseDate(req.StartDate)
	if err != nil {
		RespondError(c, http.StatusBadRequest, "開始日の形式が正しくありません")
		return
	}
	endDate, err := parseDate(req.EndDate)
	if err != nil {
		RespondError(c, http.StatusBadRequest, "終了日の形式が正しくありません")
		return
	}

	// モデルに変換
	report := &model.WeeklyReport{
		UserID:                   userID,
		StartDate:                startDate,
		EndDate:                  endDate,
		Status:                   model.WeeklyReportStatusDraft,
		WeeklyRemarks:            req.WeeklyRemarks,
		WorkplaceName:            req.WorkplaceName,
		WorkplaceHours:           req.WorkplaceHours,
		WorkplaceChangeRequested: req.WorkplaceChangeRequested,
	}

	// 日次記録を変換
	dailyRecords := make([]*model.DailyRecord, len(req.DailyRecords))
	for i, dr := range req.DailyRecords {
		record, err := convertDailyRecordRequestToModel(&dr)
		if err != nil {
			RespondError(c, http.StatusBadRequest, fmt.Sprintf("日次記録の形式が正しくありません: %s", err.Error()))
			return
		}
		dailyRecords[i] = record
	}

	// サービス呼び出し
	if err := h.service.CreateWeeklyReport(ctx, report, dailyRecords); err != nil {
		HandleError(c, http.StatusInternalServerError, "週報の作成に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusCreated, "週報を作成しました", gin.H{
		"report_id": report.ID,
	})
}

// UpdateWeeklyReport 週報を更新
func (h *weeklyReportRefactoredHandler) UpdateWeeklyReport(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータからIDを取得
	reportID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// リクエストボディをバインド
	var req dto.UpdateWeeklyReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, h.util.CreateValidationErrorMap(err))
		return
	}

	// 既存の週報を取得（権限チェック）
	existingReport, err := h.service.GetUserWeeklyReportDetail(ctx, userID, reportID)
	if err != nil {
		if err.Error() == message.MsgReportNotFoundByID {
			RespondNotFound(c, "週報")
			return
		}
		if err.Error() == message.MsgNoPermission {
			RespondForbidden(c, "この週報を更新する権限がありません")
			return
		}
		HandleError(c, http.StatusInternalServerError, "週報の取得に失敗しました", h.Logger, err)
		return
	}

	// レスポンスを週報DTOに型アサーション
	existingReportDTO, ok := existingReport.(*dto.WeeklyReportResponse)
	if !ok {
		HandleError(c, http.StatusInternalServerError, "週報データの形式が不正です", h.Logger, nil)
		return
	}

	// 提出済みの場合は更新不可
	if existingReportDTO.Status == string(model.WeeklyReportStatusSubmitted) {
		RespondError(c, http.StatusBadRequest, "提出済みの週報は更新できません")
		return
	}

	// 日付を変換
	startDate, err := parseDate(req.StartDate)
	if err != nil {
		RespondError(c, http.StatusBadRequest, "開始日の形式が正しくありません")
		return
	}
	endDate, err := parseDate(req.EndDate)
	if err != nil {
		RespondError(c, http.StatusBadRequest, "終了日の形式が正しくありません")
		return
	}

	// モデルに変換
	report := &model.WeeklyReport{
		ID:                       reportID,
		UserID:                   userID,
		StartDate:                startDate,
		EndDate:                  endDate,
		Status:                   model.WeeklyReportStatusEnum(existingReportDTO.Status),
		WeeklyRemarks:            req.WeeklyRemarks,
		WorkplaceName:            req.WorkplaceName,
		WorkplaceHours:           req.WorkplaceHours,
		WorkplaceChangeRequested: req.WorkplaceChangeRequested,
	}

	// 日次記録を変換
	var dailyRecords []*model.DailyRecord
	if req.DailyRecords != nil {
		dailyRecords = make([]*model.DailyRecord, len(req.DailyRecords))
		for i, dr := range req.DailyRecords {
			record, err := convertDailyRecordRequestToModel(&dr)
			if err != nil {
				RespondError(c, http.StatusBadRequest, fmt.Sprintf("日次記録の形式が正しくありません: %s", err.Error()))
				return
			}
			dailyRecords[i] = record
		}
	}

	// サービス呼び出し
	if err := h.service.UpdateWeeklyReport(ctx, report, dailyRecords); err != nil {
		HandleError(c, http.StatusInternalServerError, "週報の更新に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "週報を更新しました", nil)
}

// SubmitWeeklyReport 週報を提出
func (h *weeklyReportRefactoredHandler) SubmitWeeklyReport(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータからIDを取得
	reportID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	if err := h.service.SubmitWeeklyReport(ctx, userID, reportID); err != nil {
		if err.Error() == message.MsgReportNotFoundByID {
			RespondNotFound(c, "週報")
			return
		}
		if err.Error() == message.MsgNoPermission {
			RespondForbidden(c, "この週報を提出する権限がありません")
			return
		}
		if err.Error() == message.MsgAlreadySubmitted {
			RespondError(c, http.StatusBadRequest, err.Error())
			return
		}
		HandleError(c, http.StatusInternalServerError, "週報の提出に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "週報を提出しました", nil)
}

// DeleteWeeklyReport 週報を削除
func (h *weeklyReportRefactoredHandler) DeleteWeeklyReport(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータからIDを取得
	reportID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	if err := h.service.DeleteWeeklyReport(ctx, userID, reportID); err != nil {
		if err.Error() == message.MsgReportNotFoundByID {
			RespondNotFound(c, "週報")
			return
		}
		if err.Error() == message.MsgNoPermission {
			RespondForbidden(c, "この週報を削除する権限がありません")
			return
		}
		HandleError(c, http.StatusInternalServerError, "週報の削除に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "週報を削除しました", nil)
}

// GetAllWeeklyReports 全週報一覧を取得（管理者向け）
func (h *weeklyReportRefactoredHandler) GetAllWeeklyReports(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータを取得
	params := &service.AdminListParams{
		ListParams: service.ListParams{
			Page:      h.getIntQuery(c, "page", 1),
			Limit:     h.getIntQuery(c, "limit", 20),
			Status:    c.Query("status"),
			StartDate: c.Query("start_date"),
			EndDate:   c.Query("end_date"),
			Search:    c.Query("search"),
			SortBy:    c.Query("sort_by"),
			SortOrder: c.Query("sort_order"),
		},
		UserID:       c.Query("user_id"),
		DepartmentID: c.Query("department_id"),
	}

	// バリデーション
	if params.ListParams.Page < 1 {
		params.ListParams.Page = 1
	}
	if params.ListParams.Limit < 1 || params.ListParams.Limit > 100 {
		params.ListParams.Limit = 20
	}

	// サービス呼び出し
	response, err := h.service.GetAllWeeklyReports(ctx, params)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "週報一覧の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"reports":    response.Reports,
		"pagination": response.Pagination,
	})
}

// GetUnsubmittedReports 未提出週報一覧を取得
func (h *weeklyReportRefactoredHandler) GetUnsubmittedReports(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータを取得
	params := &service.UnsubmittedListParams{
		ListParams: service.ListParams{
			Page:      h.getIntQuery(c, "page", 1),
			Limit:     h.getIntQuery(c, "limit", 20),
			StartDate: c.Query("start_date"),
			EndDate:   c.Query("end_date"),
		},
		WeekOffset: h.getIntQuery(c, "week_offset", 0),
	}

	// バリデーション
	if params.ListParams.Page < 1 {
		params.ListParams.Page = 1
	}
	if params.ListParams.Limit < 1 || params.ListParams.Limit > 100 {
		params.ListParams.Limit = 20
	}

	// サービス呼び出し
	response, err := h.service.GetUnsubmittedReports(ctx, params)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "未提出週報一覧の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"reports":    response.Reports,
		"pagination": response.Pagination,
	})
}

// GetWeeklyReportStatistics 週報統計情報を取得
func (h *weeklyReportRefactoredHandler) GetWeeklyReportStatistics(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータから日付範囲を取得
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		RespondValidationError(c, map[string]string{
			"date_range": "開始日と終了日を指定してください",
		})
		return
	}

	// 日付をパース
	startDate, err := parseDate(startDateStr)
	if err != nil {
		RespondValidationError(c, map[string]string{
			"start_date": "無効な日付形式です（YYYY-MM-DD）",
		})
		return
	}

	endDate, err := parseDate(endDateStr)
	if err != nil {
		RespondValidationError(c, map[string]string{
			"end_date": "無効な日付形式です（YYYY-MM-DD）",
		})
		return
	}

	// サービス呼び出し
	statistics, err := h.service.GetWeeklyReportStatistics(ctx, startDate, endDate)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "統計情報の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"statistics": statistics,
	})
}

// BatchSubmitReports 複数の週報を一括提出
func (h *weeklyReportRefactoredHandler) BatchSubmitReports(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストボディをバインド
	var req struct {
		ReportIDs []string `json:"report_ids" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, map[string]string{
			"report_ids": "週報IDを1つ以上指定してください",
		})
		return
	}

	// UUIDに変換
	reportIDs := make([]string, 0, len(req.ReportIDs))
	for _, idStr := range req.ReportIDs {
		id := idStr
		// UUID validation removed after migration
		if id == "" {
			RespondValidationError(c, map[string]string{
				"report_ids": "無効な週報IDが含まれています: " + idStr,
			})
			return
		}
		reportIDs = append(reportIDs, id)
	}

	// サービス呼び出し
	if err := h.service.BatchSubmitReports(ctx, reportIDs); err != nil {
		HandleError(c, http.StatusInternalServerError, "一括提出に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "週報を一括提出しました", gin.H{
		"submitted_count": len(reportIDs),
	})
}

// BatchUpdateDeadlines 複数の週報の提出期限を一括更新
func (h *weeklyReportRefactoredHandler) BatchUpdateDeadlines(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストボディをバインド
	var req struct {
		ReportIDs []string `json:"report_ids" binding:"required,min=1"`
		Deadline  string   `json:"deadline" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, h.util.CreateValidationErrorMap(err))
		return
	}

	// 期限をパース
	deadline, err := parseDateTime(req.Deadline)
	if err != nil {
		RespondValidationError(c, map[string]string{
			"deadline": "無効な日時形式です（YYYY-MM-DD HH:MM:SS）",
		})
		return
	}

	// UUIDに変換
	reportIDs := make([]string, 0, len(req.ReportIDs))
	for _, idStr := range req.ReportIDs {
		id := idStr
		// UUID validation removed after migration
		if id == "" {
			RespondValidationError(c, map[string]string{
				"report_ids": "無効な週報IDが含まれています: " + idStr,
			})
			return
		}
		reportIDs = append(reportIDs, id)
	}

	// サービス呼び出し
	if err := h.service.BatchUpdateDeadlines(ctx, reportIDs, deadline); err != nil {
		HandleError(c, http.StatusInternalServerError, "提出期限の一括更新に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "提出期限を一括更新しました", gin.H{
		"updated_count": len(reportIDs),
	})
}

// getIntQuery クエリパラメータを整数として取得
func (h *weeklyReportRefactoredHandler) getIntQuery(c *gin.Context, key string, defaultValue int) int {
	valueStr := c.Query(key)
	if valueStr == "" {
		return defaultValue
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}

	return value
}
