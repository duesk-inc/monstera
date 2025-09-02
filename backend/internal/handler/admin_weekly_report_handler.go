package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/common/userutil"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"

	"go.uber.org/zap"
)

// AdminWeeklyReportHandler 管理者用週報ハンドラーのインターフェース
type AdminWeeklyReportHandler interface {
	GetWeeklyReports(c *gin.Context)         // 週報一覧取得
	GetWeeklyReportDetail(c *gin.Context)    // 週報詳細取得
	CommentWeeklyReport(c *gin.Context)      // 週報へのコメント
	GetMonthlyAttendance(c *gin.Context)     // 月次勤怠一覧
	GetFollowUpRequiredUsers(c *gin.Context) // フォローアップ必要ユーザー一覧
	ExportMonthlyReport(c *gin.Context)      // 月次レポートエクスポート
	GetWeeklyReportSummary(c *gin.Context)   // 週報サマリー統計取得
	GetMonthlySummary(c *gin.Context)        // 月次サマリー取得
	CreateExportJob(c *gin.Context)          // エクスポートジョブ作成
    GetExportJobStatus(c *gin.Context)       // エクスポートジョブステータス取得
    ApproveWeeklyReport(c *gin.Context)      // 週報承認
    RejectWeeklyReport(c *gin.Context)       // 週報却下
    ReturnWeeklyReport(c *gin.Context)       // 週報差し戻し
}

// adminWeeklyReportHandler 管理者用週報ハンドラーの実装
type adminWeeklyReportHandler struct {
	BaseHandler
	adminWeeklyReportService service.AdminWeeklyReportService
	exportService            service.ExportService
	util                     *HandlerUtil
}

// NewAdminWeeklyReportHandler 管理者用週報ハンドラーのインスタンスを生成
func NewAdminWeeklyReportHandler(
	adminWeeklyReportService service.AdminWeeklyReportService,
	exportService service.ExportService,
	logger *zap.Logger,
) AdminWeeklyReportHandler {
	return &adminWeeklyReportHandler{
		BaseHandler:              BaseHandler{Logger: logger},
		adminWeeklyReportService: adminWeeklyReportService,
		exportService:            exportService,
		util:                     NewHandlerUtil(logger),
	}
}

// GetUserIDFromContext はGinコンテキストからユーザーIDを取得します
// userutilパッケージの関数をラップしてエラー型で返します
func GetUserIDFromContext(c *gin.Context) (string, error) {
	// ログインハンドラーからloggerを取得できないため、nilを渡す
	userID, ok := userutil.GetUserIDFromContext(c, nil)
	if !ok {
		return "", errors.New("ユーザーIDの取得に失敗しました")
	}
	return userID, nil
}

// GetWeeklyReports 週報一覧取得
func (h *adminWeeklyReportHandler) GetWeeklyReports(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータ取得
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	status := c.Query("status")
	userID := c.Query("user_id")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	// サービス呼び出し
	reports, total, err := h.adminWeeklyReportService.GetWeeklyReports(
		ctx, page, limit, status, userID, dateFrom, dateTo)

	if err != nil {
		HandleError(c, http.StatusInternalServerError, "週報一覧の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"reports": reports,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

// GetWeeklyReportDetail 週報詳細取得
func (h *adminWeeklyReportHandler) GetWeeklyReportDetail(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	reportID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	report, err := h.adminWeeklyReportService.GetWeeklyReportDetail(ctx, reportID)
	if err != nil {
		if err.Error() == "週報が見つかりません" {
			RespondNotFound(c, "週報")
			return
		}
		HandleError(c, http.StatusInternalServerError, "週報詳細の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"report": report,
	})
}

// CommentWeeklyReport 週報へのコメント
func (h *adminWeeklyReportHandler) CommentWeeklyReport(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	reportID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディを取得
	var req struct {
		Comment string `json:"comment" binding:"required,min=1,max=1000"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, map[string]string{
			"comment": "コメントは1文字以上1000文字以内で入力してください",
		})
		return
	}

	// サービス呼び出し
	err = h.adminWeeklyReportService.CommentWeeklyReport(ctx, reportID, userID, req.Comment)
	if err != nil {
		if err.Error() == "週報が見つかりません" {
			RespondNotFound(c, "週報")
			return
		}
		HandleError(c, http.StatusInternalServerError, "コメントの投稿に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "コメントを投稿しました", nil)
}

// ApproveWeeklyReport 週報を承認
func (h *adminWeeklyReportHandler) ApproveWeeklyReport(c *gin.Context) {
    ctx := c.Request.Context()

    // パスID
    reportID, err := ParseUUID(c, "id", h.Logger)
    if err != nil { return }

    // 認証ユーザー
    approverID, ok := h.util.GetAuthenticatedUserID(c)
    if !ok { return }

    // 任意コメント
    var req struct{ Comment *string `json:"comment"` }
    _ = c.ShouldBindJSON(&req) // 任意なのでバリデーションしない

    if err := h.adminWeeklyReportService.ApproveWeeklyReport(ctx, reportID, approverID, req.Comment); err != nil {
        if err.Error() == "週報が見つかりません" {
            RespondNotFound(c, "週報"); return
        }
        HandleError(c, http.StatusUnprocessableEntity, "承認できません", h.Logger, err)
        return
    }
    RespondSuccess(c, http.StatusOK, "承認しました", nil)
}

// RejectWeeklyReport 週報を却下
func (h *adminWeeklyReportHandler) RejectWeeklyReport(c *gin.Context) {
    ctx := c.Request.Context()

    reportID, err := ParseUUID(c, "id", h.Logger)
    if err != nil { return }

    approverID, ok := h.util.GetAuthenticatedUserID(c)
    if !ok { return }

    var req struct{ Comment string `json:"comment" binding:"required,min=1,max=1000"` }
    if err := c.ShouldBindJSON(&req); err != nil {
        RespondValidationError(c, map[string]string{"comment": "コメントは1〜1000文字で必須です"});
        return
    }

    if err := h.adminWeeklyReportService.RejectWeeklyReport(ctx, reportID, approverID, req.Comment); err != nil {
        if err.Error() == "週報が見つかりません" {
            RespondNotFound(c, "週報"); return
        }
        HandleError(c, http.StatusUnprocessableEntity, "却下できません", h.Logger, err)
        return
    }
    RespondSuccess(c, http.StatusOK, "却下しました", nil)
}

// ReturnWeeklyReport 週報を差し戻し
func (h *adminWeeklyReportHandler) ReturnWeeklyReport(c *gin.Context) {
    ctx := c.Request.Context()

    reportID, err := ParseUUID(c, "id", h.Logger)
    if err != nil { return }

    approverID, ok := h.util.GetAuthenticatedUserID(c)
    if !ok { return }

    var req struct{ Comment string `json:"comment" binding:"required,min=1,max=1000"` }
    if err := c.ShouldBindJSON(&req); err != nil {
        RespondValidationError(c, map[string]string{"comment": "コメントは1〜1000文字で必須です"});
        return
    }

    if err := h.adminWeeklyReportService.ReturnWeeklyReport(ctx, reportID, approverID, req.Comment); err != nil {
        if err.Error() == "週報が見つかりません" { RespondNotFound(c, "週報"); return }
        HandleError(c, http.StatusUnprocessableEntity, "差し戻しできません", h.Logger, err)
        return
    }
    RespondSuccess(c, http.StatusOK, "差し戻しました", nil)
}

// GetMonthlyAttendance 月次勤怠一覧
func (h *adminWeeklyReportHandler) GetMonthlyAttendance(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータから月を取得
	month := c.Query("month")
	if month == "" {
		RespondValidationError(c, map[string]string{
			"month": "月を指定してください（形式: YYYY-MM）",
		})
		return
	}

	// サービス呼び出し
	attendance, err := h.adminWeeklyReportService.GetMonthlyAttendance(ctx, month)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "月次勤怠一覧の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"attendance": attendance,
		"month":      month,
	})
}

// GetFollowUpRequiredUsers フォローアップ必要ユーザー一覧
func (h *adminWeeklyReportHandler) GetFollowUpRequiredUsers(c *gin.Context) {
	ctx := c.Request.Context()

	// サービス呼び出し
	users, err := h.adminWeeklyReportService.GetFollowUpRequiredUsers(ctx)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "フォローアップ対象者の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"users": users,
		"total": len(users),
	})
}

// ExportMonthlyReport 月次レポートエクスポート
func (h *adminWeeklyReportHandler) ExportMonthlyReport(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータから月を取得
	month := c.Query("month")
	if month == "" {
		RespondValidationError(c, map[string]string{
			"month": "月を指定してください（形式: YYYY-MM）",
		})
		return
	}

	format := c.DefaultQuery("format", "csv")
	if format != "csv" && format != "excel" {
		RespondValidationError(c, map[string]string{
			"format": "形式は csv または excel を指定してください",
		})
		return
	}

	// サービス呼び出し
	data, filename, contentType, err := h.adminWeeklyReportService.ExportMonthlyReport(ctx, month, format)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "レポートのエクスポートに失敗しました", h.Logger, err)
		return
	}

	// ファイルをレスポンスとして返す
	c.Header("Content-Type", contentType)
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, contentType, data)
}

// GetWeeklyReportSummary 週報サマリー統計取得
func (h *adminWeeklyReportHandler) GetWeeklyReportSummary(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータを取得
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")
	departmentIDStr := c.Query("department_id")

	// 日付のバリデーション
	if startDateStr == "" || endDateStr == "" {
		RespondValidationError(c, map[string]string{
			"start_date": "開始日を指定してください（形式: YYYY-MM-DD）",
			"end_date":   "終了日を指定してください（形式: YYYY-MM-DD）",
		})
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		RespondValidationError(c, map[string]string{
			"start_date": "開始日の形式が正しくありません（YYYY-MM-DD）",
		})
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		RespondValidationError(c, map[string]string{
			"end_date": "終了日の形式が正しくありません（YYYY-MM-DD）",
		})
		return
	}

	// 日付の範囲チェック
	if endDate.Before(startDate) {
		RespondValidationError(c, map[string]string{
			"end_date": "終了日は開始日よりも後の日付である必要があります",
		})
		return
	}

	// 期間の上限チェック（365日まで）
	if endDate.Sub(startDate) > 365*24*time.Hour {
		RespondValidationError(c, map[string]string{
			"period": "統計期間は365日以内で指定してください",
		})
		return
	}

	// 部署IDのパース（オプション）
	var departmentID *string
	if departmentIDStr != "" {
		parsedDepartmentID, err := ParseUUID(c, "department_id", h.Logger)
		if err != nil {
			return
		}
		departmentID = &parsedDepartmentID
	}

	// サービス呼び出し
	summary, err := h.adminWeeklyReportService.GetWeeklyReportSummary(ctx, startDate, endDate, departmentID)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "週報サマリーの取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"summary": summary,
	})
}

// GetMonthlySummary 月次サマリー取得
func (h *adminWeeklyReportHandler) GetMonthlySummary(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータを取得
	yearStr := c.Query("year")
	monthStr := c.Query("month")
	departmentIDStr := c.Query("department_id")

	// 年月のバリデーション
	if yearStr == "" || monthStr == "" {
		RespondValidationError(c, map[string]string{
			"year":  "年を指定してください",
			"month": "月を指定してください",
		})
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2020 || year > 2100 {
		RespondValidationError(c, map[string]string{
			"year": "年は2020〜2100の範囲で指定してください",
		})
		return
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		RespondValidationError(c, map[string]string{
			"month": "月は1〜12の範囲で指定してください",
		})
		return
	}

	// 部署IDのパース（オプション）
	var departmentID *string
	if departmentIDStr != "" {
		parsedID := departmentIDStr
		// UUID validation removed after migration
		if parsedID == "" {
			RespondValidationError(c, map[string]string{
				"department_id": "部署IDの形式が正しくありません",
			})
			return
		}
		departmentID = &parsedID
	}

	// サービス呼び出し
	summary, err := h.adminWeeklyReportService.GetMonthlySummary(ctx, year, month, departmentID)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "月次サマリーの取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"summary": summary,
	})
}

// CreateExportJob エクスポートジョブを作成
func (h *adminWeeklyReportHandler) CreateExportJob(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストボディを取得
    var req struct {
        JobType    string      `json:"job_type" binding:"required"`
        Format     string      `json:"format" binding:"required,oneof=csv"`
        Parameters interface{} `json:"parameters" binding:"required"`
    }

	if err := c.ShouldBindJSON(&req); err != nil {
		HandleError(c, http.StatusBadRequest, "リクエストが不正です", h.Logger, err)
		return
	}

	// ユーザーIDを取得
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		HandleError(c, http.StatusUnauthorized, "認証情報が無効です", h.Logger, err)
		return
	}

	// ジョブタイプを検証
	var jobType model.ExportJobType
	switch req.JobType {
	case "weekly_report":
		jobType = model.ExportJobTypeWeeklyReport
	case "monthly_attendance":
		jobType = model.ExportJobTypeMonthlyAttendance
	case "monthly_summary":
		jobType = model.ExportJobTypeMonthlySummary
	default:
		HandleError(c, http.StatusBadRequest, "不正なジョブタイプです", h.Logger, nil)
		return
	}

	// フォーマットを検証
	var format model.ExportJobFormat
    switch req.Format {
    case "csv":
        format = model.ExportJobFormatCSV
    default:
        HandleError(c, http.StatusBadRequest, "不正なフォーマットです", h.Logger, nil)
        return
    }

	// エクスポートジョブを作成
	// ParametersをJSONにマーシャル
	paramsJSON, err := json.Marshal(req.Parameters)
	if err != nil {
		HandleError(c, http.StatusBadRequest, "パラメータのシリアライズに失敗しました", h.Logger, err)
		return
	}

	job, err := h.exportService.CreateExportJob(ctx, userID, jobType, format, json.RawMessage(paramsJSON))
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "エクスポートジョブの作成に失敗しました", h.Logger, err)
		return
	}

	// 非同期でジョブを処理（ゴルーチンで実行）
	go func() {
		// 新しいコンテキストを作成（リクエストコンテキストから独立）
		bgCtx := context.Background()
		if err := h.exportService.ProcessExportJob(bgCtx, job.ID); err != nil {
			h.Logger.Error("Failed to process export job",
				zap.String("job_id", job.ID),
				zap.Error(err))
		}
	}()

	RespondSuccess(c, http.StatusCreated, "エクスポートジョブを作成しました", gin.H{
		"job_id": job.ID,
		"status": job.Status,
	})
}

// GetExportJobStatus エクスポートジョブのステータスを取得
func (h *adminWeeklyReportHandler) GetExportJobStatus(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからジョブIDを取得
	jobIDStr := c.Param("jobId")
	jobID := jobIDStr
	// UUID validation removed after migration
	if jobID == "" {
		HandleError(c, http.StatusBadRequest, "不正なジョブIDです", h.Logger, fmt.Errorf("empty job ID"))
		return
	}

	// ジョブ情報を取得
	job, err := h.exportService.GetExportJob(ctx, jobID)
	if err != nil {
		HandleError(c, http.StatusNotFound, "ジョブが見つかりません", h.Logger, err)
		return
	}

	// レスポンスを構築
	response := gin.H{
		"job_id":         job.ID,
		"status":         job.Status,
		"progress":       job.Progress,
		"total_records":  job.TotalRecords,
		"processed_rows": job.ProcessedRows,
		"created_at":     job.CreatedAt,
	}

	// 処理開始時刻
	if job.StartedAt != nil {
		response["started_at"] = job.StartedAt
	}

	// 完了時刻
	if job.CompletedAt != nil {
		response["completed_at"] = job.CompletedAt
	}

	// ファイル情報（完了時のみ）
	if job.Status == model.ExportJobStatusCompleted && job.FileURL != nil {
		response["file_url"] = *job.FileURL
		response["file_name"] = *job.FileName
		response["file_size"] = *job.FileSize
		response["expires_at"] = *job.ExpiresAt
	}

	// エラー情報（失敗時のみ）
	if job.Status == model.ExportJobStatusFailed && job.ErrorMessage != nil {
		response["error_message"] = *job.ErrorMessage
	}

	RespondSuccess(c, http.StatusOK, "", response)
}
