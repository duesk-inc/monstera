package utils

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/duesk/monstera/internal/message"
)

// ErrorHandler エラーハンドリング用のユーティリティ
type ErrorHandler struct {
	requestIDKey string
}

// NewErrorHandler ErrorHandlerのインスタンスを作成
func NewErrorHandler() *ErrorHandler {
	return &ErrorHandler{
		requestIDKey: "X-Request-ID",
	}
}

// HandleError エラーレスポンスを生成してJSONで返却
func (h *ErrorHandler) HandleError(c *gin.Context, code message.ErrorCode, userMessage string, details map[string]string) {
	// リクエストIDを取得（なければ生成）
	requestID := c.GetHeader(h.requestIDKey)
	if requestID == "" {
		requestID = uuid.New().String()
		c.Header(h.requestIDKey, requestID)
	}

	// エラー構造体を作成
	appError := &message.AppError{
		Code:       code,
		Message:    userMessage,
		StatusCode: message.GetHTTPStatusCode(code),
		Details:    details,
		Timestamp:  time.Now().Format(time.RFC3339),
		RequestID:  requestID,
	}

	// ログ出力（開発環境では詳細ログ、本番環境では最小限）
	h.logError(c, appError)

	// レスポンスを返却
	c.JSON(appError.StatusCode, gin.H{
		"error":      appError.Message,
		"code":       appError.Code,
		"timestamp":  appError.Timestamp,
		"request_id": appError.RequestID,
		"details":    appError.Details,
	})
}

// HandleWeeklyReportError 週報関連のエラーハンドリング（専用メッセージ付き）
func (h *ErrorHandler) HandleWeeklyReportError(c *gin.Context, code message.ErrorCode, details map[string]string) {
	userMessage := h.getWeeklyReportErrorMessage(code)
	h.HandleError(c, code, userMessage, details)
}

// HandleValidationError バリデーションエラーのハンドリング
func (h *ErrorHandler) HandleValidationError(c *gin.Context, fieldErrors map[string]string) {
	details := make(map[string]string)
	for field, errMsg := range fieldErrors {
		details[field] = errMsg
	}

	h.HandleError(c, message.ErrCodeInvalidRequest, "入力内容に不備があります。", details)
}

// HandleNotFoundError リソースが見つからない場合のエラーハンドリング
func (h *ErrorHandler) HandleNotFoundError(c *gin.Context, resourceType string) {
	details := map[string]string{
		"resource_type": resourceType,
	}

	var code message.ErrorCode
	var userMessage string

	switch resourceType {
	case "weekly_report":
		code = message.ErrCodeWeeklyReportNotFound
		userMessage = "指定された週報が見つかりません。"
	case "department":
		code = message.ErrCodeDepartmentNotFound
		userMessage = "指定された部署が見つかりません。"
	case "user":
		code = message.ErrCodeNotFound
		userMessage = "指定されたユーザーが見つかりません。"
	default:
		code = message.ErrCodeNotFound
		userMessage = "指定されたリソースが見つかりません。"
	}

	h.HandleError(c, code, userMessage, details)
}

// HandleAuthorizationError 認証・認可エラーのハンドリング
func (h *ErrorHandler) HandleAuthorizationError(c *gin.Context, action string) {
	details := map[string]string{
		"action": action,
	}

	h.HandleError(c, message.ErrCodeForbidden, "この操作を実行する権限がありません。", details)
}

// HandleBusinessLogicError ビジネスロジックエラーのハンドリング
func (h *ErrorHandler) HandleBusinessLogicError(c *gin.Context, code message.ErrorCode, customMessage string) {
	userMessage := customMessage
	if userMessage == "" {
		userMessage = h.getWeeklyReportErrorMessage(code)
	}

	h.HandleError(c, code, userMessage, nil)
}

// HandleInternalError 内部エラーのハンドリング
func (h *ErrorHandler) HandleInternalError(c *gin.Context, err error, operation string) {
	details := map[string]string{
		"operation": operation,
	}

	// 本番環境では内部エラーの詳細は非表示
	if gin.Mode() == gin.ReleaseMode {
		details = map[string]string{
			"operation": operation,
		}
	} else {
		details["error_detail"] = err.Error()
	}

	h.HandleError(c, message.ErrCodeInternalError, "内部エラーが発生しました。しばらく待ってから再度お試しください。", details)
}

// getWeeklyReportErrorMessage 週報関連エラーコードからユーザー向けメッセージを取得
func (h *ErrorHandler) getWeeklyReportErrorMessage(code message.ErrorCode) string {
	switch code {
	// 基本操作
	case message.ErrCodeWeeklyReportNotFound:
		return "指定された週報が見つかりません。"
	case message.ErrCodeWeeklyReportAlreadyExists:
		return "指定された週の週報は既に存在します。"
	case message.ErrCodeWeeklyReportInvalidPeriod:
		return "無効な週報期間です。"
	case message.ErrCodeWeeklyReportInvalidStatus:
		return "無効な週報ステータスです。"
	case message.ErrCodeWeeklyReportDuplicateWeek:
		return "同じ週の週報が既に存在します。"
	case message.ErrCodeWeeklyReportInvalidDates:
		return "週報の日付範囲が無効です。開始日は終了日より前である必要があります。"
	case message.ErrCodeWeeklyReportFutureWeek:
		return "未来の週の週報は作成できません。"
	case message.ErrCodeWeeklyReportTooOldWeek:
		return "指定された週は古すぎるため作成できません。"

	// 提出関連
	case message.ErrCodeWeeklyReportAlreadySubmitted:
		return "この週報は既に提出済みです。"
	case message.ErrCodeWeeklyReportNotSubmittable:
		return "この週報は提出できない状態です。"
	case message.ErrCodeWeeklyReportRequiredFields:
		return "必須項目が未入力です。すべての項目を入力してください。"
	case message.ErrCodeWeeklyReportInvalidMood:
		return "気分の値が無効です。1〜5の範囲で選択してください。"
	case message.ErrCodeWeeklyReportInvalidWorkHours:
		return "勤務時間が無効です。0以上の値を入力してください。"
	case message.ErrCodeWeeklyReportDeadlinePassed:
		return "提出期限を過ぎています。"
	case message.ErrCodeWeeklyReportIncompleteData:
		return "週報データが不完全です。必要な情報をすべて入力してください。"

	// 編集関連
	case message.ErrCodeWeeklyReportNotEditable:
		return "この週報は編集できません。提出済みの週報は編集できません。"
	case message.ErrCodeWeeklyReportEditForbidden:
		return "この週報を編集する権限がありません。"
	case message.ErrCodeWeeklyReportConcurrentEdit:
		return "他のユーザーが編集中です。しばらく待ってから再度お試しください。"
	case message.ErrCodeWeeklyReportVersionConflict:
		return "データが他のユーザーによって更新されています。ページを再読み込みしてください。"

	// 承認・コメント関連
	case message.ErrCodeWeeklyReportNotApprovable:
		return "この週報は承認できません。"
	case message.ErrCodeWeeklyReportInvalidComment:
		return "コメントの内容が無効です。"
	case message.ErrCodeWeeklyReportCommentRequired:
		return "却下時はコメントが必須です。"
	case message.ErrCodeWeeklyReportApprovalForbidden:
		return "週報を承認する権限がありません。"

	// 未提出者管理関連
	case message.ErrCodeUnsubmittedUsersNotFound:
		return "未提出者が見つかりません。"
	case message.ErrCodeReminderSendFailed:
		return "リマインドの送信に失敗しました。"
	case message.ErrCodeReminderAlreadySent:
		return "本日既にリマインドを送信済みです。"
	case message.ErrCodeReminderInvalidRecipients:
		return "送信対象のユーザーが無効です。"
	case message.ErrCodeBulkReminderLimitExceeded:
		return "一括送信の上限（100件）を超えています。"

	// 統計・分析関連
	case message.ErrCodeStatsCalculationFailed:
		return "統計の計算に失敗しました。"
	case message.ErrCodeStatsInvalidPeriod:
		return "統計期間が無効です。"
	case message.ErrCodeStatsDataNotFound:
		return "統計データが見つかりません。"
	case message.ErrCodeStatsExportFailed:
		return "統計データのエクスポートに失敗しました。"

	// 通知関連
	case message.ErrCodeNotificationSendFailed:
		return "通知の送信に失敗しました。"
	case message.ErrCodeNotificationInvalidType:
		return "通知タイプが無効です。"
	case message.ErrCodeNotificationHistoryNotFound:
		return "通知履歴が見つかりません。"
	case message.ErrCodeNotificationPermissionDenied:
		return "通知を送信する権限がありません。"

	// アラート関連
	case message.ErrCodeAlertSettingNotFound:
		return "アラート設定が見つかりません。"
	case message.ErrCodeAlertSettingInvalid:
		return "アラート設定が無効です。"
	case message.ErrCodeAlertThresholdInvalid:
		return "アラート閾値が無効です。"
	case message.ErrCodeAlertAlreadyProcessed:
		return "このアラートは既に処理済みです。"

	// エクスポート関連
	case message.ErrCodeExportInvalidFormat:
		return "エクスポート形式が無効です。"
	case message.ErrCodeExportInvalidPeriod:
		return "エクスポート期間が無効です。"
	case message.ErrCodeExportFileGenerationFailed:
		return "ファイルの生成に失敗しました。"
	case message.ErrCodeExportGoogleDriveUploadFailed:
		return "Google Driveへのアップロードに失敗しました。"
	case message.ErrCodeExportDataTooLarge:
		return "エクスポートデータが大きすぎます。期間を短くして再度お試しください。"
	case message.ErrCodeExportJobNotFound:
		return "エクスポートジョブが見つかりません。"

	// 部署・ユーザー管理関連
	case message.ErrCodeDepartmentNotFound:
		return "指定された部署が見つかりません。"
	case message.ErrCodeManagerNotFound:
		return "指定された管理者が見つかりません。"
	case message.ErrCodeUserNotInDepartment:
		return "ユーザーは指定された部署に所属していません。"
	case message.ErrCodeInvalidDepartmentHierarchy:
		return "部署階層が無効です。"

	default:
		return "エラーが発生しました。"
	}
}

// logError エラーログの出力
func (h *ErrorHandler) logError(c *gin.Context, appError *message.AppError) {
	// 基本的なエラー情報
	logFields := map[string]interface{}{
		"error_code":  appError.Code,
		"status_code": appError.StatusCode,
		"message":     appError.Message,
		"request_id":  appError.RequestID,
		"timestamp":   appError.Timestamp,
		"method":      c.Request.Method,
		"path":        c.Request.URL.Path,
		"client_ip":   c.ClientIP(),
		"user_agent":  c.GetHeader("User-Agent"),
	}

	// ユーザー情報（存在する場合）
	if userID, exists := c.Get("user_id"); exists {
		logFields["user_id"] = userID
	}

	// 詳細情報
	if appError.Details != nil {
		logFields["details"] = appError.Details
	}

	// エラーレベルの判定
	if message.IsServerError(appError.Code) {
		// サーバーエラーはERRORレベル
		fmt.Printf("[ERROR] %+v\n", logFields)
	} else if message.IsClientError(appError.Code) {
		// クライアントエラーはWARNレベル
		fmt.Printf("[WARN] %+v\n", logFields)
	} else {
		// その他はINFOレベル
		fmt.Printf("[INFO] %+v\n", logFields)
	}
}

// CreateValidationDetails フィールド検証エラーの詳細情報を作成
func (h *ErrorHandler) CreateValidationDetails(field, value, constraint string) map[string]string {
	return map[string]string{
		"field":      field,
		"value":      value,
		"constraint": constraint,
	}
}

// CreateResourceDetails リソース関連エラーの詳細情報を作成
func (h *ErrorHandler) CreateResourceDetails(resourceType, resourceID, operation string) map[string]string {
	details := map[string]string{
		"resource_type": resourceType,
		"operation":     operation,
	}

	if resourceID != "" {
		details["resource_id"] = resourceID
	}

	return details
}

// IsWeeklyReportError 週報関連エラーかどうかを判定
func (h *ErrorHandler) IsWeeklyReportError(code message.ErrorCode) bool {
	return message.IsWeeklyReportError(code)
}
