package errors

import (
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// AccountingErrorCode 経理機能のエラーコード
type AccountingErrorCode string

const (
	// 一般的な経理エラー
	ErrAccountingGeneral        AccountingErrorCode = "ACCOUNTING_GENERAL"
	ErrAccountingPermission     AccountingErrorCode = "ACCOUNTING_PERMISSION"
	ErrAccountingNotFound       AccountingErrorCode = "ACCOUNTING_NOT_FOUND"
	ErrAccountingInvalidRequest AccountingErrorCode = "ACCOUNTING_INVALID_REQUEST"
	ErrAccountingDataConflict   AccountingErrorCode = "ACCOUNTING_DATA_CONFLICT"

	// プロジェクトグループ関連エラー
	ErrProjectGroupNotFound       AccountingErrorCode = "PROJECT_GROUP_NOT_FOUND"
	ErrProjectGroupInvalidName    AccountingErrorCode = "PROJECT_GROUP_INVALID_NAME"
	ErrProjectGroupDuplicate      AccountingErrorCode = "PROJECT_GROUP_DUPLICATE"
	ErrProjectGroupHasProjects    AccountingErrorCode = "PROJECT_GROUP_HAS_PROJECTS"
	ErrProjectGroupProjectLimit   AccountingErrorCode = "PROJECT_GROUP_PROJECT_LIMIT"
	ErrProjectGroupClientMismatch AccountingErrorCode = "PROJECT_GROUP_CLIENT_MISMATCH"

	// 請求処理関連エラー
	ErrBillingInvalidMonth      AccountingErrorCode = "BILLING_INVALID_MONTH"
	ErrBillingAlreadyProcessed  AccountingErrorCode = "BILLING_ALREADY_PROCESSED"
	ErrBillingCalculationFailed AccountingErrorCode = "BILLING_CALCULATION_FAILED"
	ErrBillingInvalidAmount     AccountingErrorCode = "BILLING_INVALID_AMOUNT"
	ErrBillingNoWorkRecords     AccountingErrorCode = "BILLING_NO_WORK_RECORDS"
	ErrBillingClientNotActive   AccountingErrorCode = "BILLING_CLIENT_NOT_ACTIVE"
	ErrBillingProjectNotActive  AccountingErrorCode = "BILLING_PROJECT_NOT_ACTIVE"
	ErrBillingScheduleFailed    AccountingErrorCode = "BILLING_SCHEDULE_FAILED"
	ErrBillingRetryFailed       AccountingErrorCode = "BILLING_RETRY_FAILED"

	// freee連携関連エラー
	ErrFreeeNotConnected        AccountingErrorCode = "FREEE_NOT_CONNECTED"
	ErrFreeeAuthFailed          AccountingErrorCode = "FREEE_AUTH_FAILED"
	ErrFreeeTokenExpired        AccountingErrorCode = "FREEE_TOKEN_EXPIRED"
	ErrFreeeTokenRefreshFailed  AccountingErrorCode = "FREEE_TOKEN_REFRESH_FAILED"
	ErrFreeeAPIError            AccountingErrorCode = "FREEE_API_ERROR"
	ErrFreeeRateLimit           AccountingErrorCode = "FREEE_RATE_LIMIT"
	ErrFreeeCompanyNotSelected  AccountingErrorCode = "FREEE_COMPANY_NOT_SELECTED"
	ErrFreeeSyncFailed          AccountingErrorCode = "FREEE_SYNC_FAILED"
	ErrFreeePartnerNotFound     AccountingErrorCode = "FREEE_PARTNER_NOT_FOUND"
	ErrFreeeInvoiceCreateFailed AccountingErrorCode = "FREEE_INVOICE_CREATE_FAILED"

	// 暗号化関連エラー
	ErrEncryptionFailed     AccountingErrorCode = "ENCRYPTION_FAILED"
	ErrDecryptionFailed     AccountingErrorCode = "DECRYPTION_FAILED"
	ErrInvalidEncryptionKey AccountingErrorCode = "INVALID_ENCRYPTION_KEY"

	// バッチ処理関連エラー
	ErrBatchProcessingFailed  AccountingErrorCode = "BATCH_PROCESSING_FAILED"
	ErrBatchJobNotFound       AccountingErrorCode = "BATCH_JOB_NOT_FOUND"
	ErrBatchJobAlreadyRunning AccountingErrorCode = "BATCH_JOB_ALREADY_RUNNING"
	ErrBatchJobCancelled      AccountingErrorCode = "BATCH_JOB_CANCELLED"

	// スケジュール関連エラー
	ErrScheduleNotFound        AccountingErrorCode = "SCHEDULE_NOT_FOUND"
	ErrScheduleInvalidTime     AccountingErrorCode = "SCHEDULE_INVALID_TIME"
	ErrScheduleAlreadyExecuted AccountingErrorCode = "SCHEDULE_ALREADY_EXECUTED"
	ErrScheduleCronInvalid     AccountingErrorCode = "SCHEDULE_CRON_INVALID"
)

// AccountingError 経理機能のエラー構造体
type AccountingError struct {
	Code      AccountingErrorCode    `json:"code"`
	Message   string                 `json:"message"`
	Details   map[string]interface{} `json:"details,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	RequestID string                 `json:"request_id,omitempty"`
	UserID    *uuid.UUID             `json:"user_id,omitempty"`
	HTTPCode  int                    `json:"-"`
	Cause     error                  `json:"-"`
}

// Error エラーメッセージを返す
func (e *AccountingError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Unwrap 元のエラーを返す
func (e *AccountingError) Unwrap() error {
	return e.Cause
}

// HTTPStatus HTTPステータスコードを返す
func (e *AccountingError) HTTPStatus() int {
	if e.HTTPCode > 0 {
		return e.HTTPCode
	}
	return http.StatusInternalServerError
}

// NewAccountingError 新しい経理エラーを作成
func NewAccountingError(code AccountingErrorCode, message string) *AccountingError {
	return &AccountingError{
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		HTTPCode:  getDefaultHTTPCode(code),
		Details:   make(map[string]interface{}),
	}
}

// NewAccountingErrorWithCause 元のエラーを含む経理エラーを作成
func NewAccountingErrorWithCause(code AccountingErrorCode, message string, cause error) *AccountingError {
	return &AccountingError{
		Code:      code,
		Message:   message,
		Cause:     cause,
		Timestamp: time.Now(),
		HTTPCode:  getDefaultHTTPCode(code),
		Details:   make(map[string]interface{}),
	}
}

// WithDetail 詳細情報を追加
func (e *AccountingError) WithDetail(key string, value interface{}) *AccountingError {
	if e.Details == nil {
		e.Details = make(map[string]interface{})
	}
	e.Details[key] = value
	return e
}

// WithUserID ユーザーIDを設定
func (e *AccountingError) WithUserID(userID uuid.UUID) *AccountingError {
	e.UserID = &userID
	return e
}

// WithRequestID リクエストIDを設定
func (e *AccountingError) WithRequestID(requestID string) *AccountingError {
	e.RequestID = requestID
	return e
}

// WithHTTPCode HTTPコードを設定
func (e *AccountingError) WithHTTPCode(code int) *AccountingError {
	e.HTTPCode = code
	return e
}

// getDefaultHTTPCode エラーコードに基づくデフォルトHTTPコードを取得
func getDefaultHTTPCode(code AccountingErrorCode) int {
	switch code {
	case ErrAccountingNotFound, ErrProjectGroupNotFound, ErrBatchJobNotFound, ErrScheduleNotFound, ErrFreeePartnerNotFound:
		return http.StatusNotFound
	case ErrAccountingPermission:
		return http.StatusForbidden
	case ErrAccountingInvalidRequest, ErrProjectGroupInvalidName, ErrBillingInvalidMonth, ErrBillingInvalidAmount, ErrScheduleInvalidTime, ErrScheduleCronInvalid:
		return http.StatusBadRequest
	case ErrAccountingDataConflict, ErrProjectGroupDuplicate, ErrBillingAlreadyProcessed, ErrBatchJobAlreadyRunning, ErrScheduleAlreadyExecuted:
		return http.StatusConflict
	case ErrFreeeAuthFailed, ErrFreeeTokenExpired:
		return http.StatusUnauthorized
	case ErrFreeeRateLimit:
		return http.StatusTooManyRequests
	case ErrFreeeAPIError, ErrFreeeSyncFailed, ErrFreeeInvoiceCreateFailed:
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}

// プロジェクトグループ関連エラー関数

// ErrProjectGroupNotFoundError プロジェクトグループが見つからないエラー
func ErrProjectGroupNotFoundError(groupID uuid.UUID) *AccountingError {
	return NewAccountingError(ErrProjectGroupNotFound, "プロジェクトグループが見つかりません").
		WithDetail("group_id", groupID.String())
}

// ErrProjectGroupDuplicateError 重複したプロジェクトグループエラー
func ErrProjectGroupDuplicateError(name string, clientID uuid.UUID) *AccountingError {
	return NewAccountingError(ErrProjectGroupDuplicate, "同じ名前のプロジェクトグループが既に存在します").
		WithDetail("name", name).
		WithDetail("client_id", clientID.String())
}

// ErrProjectGroupHasProjectsError プロジェクトを含むグループの削除エラー
func ErrProjectGroupHasProjectsError(groupID uuid.UUID, projectCount int) *AccountingError {
	return NewAccountingError(ErrProjectGroupHasProjects, "プロジェクトが含まれているため削除できません").
		WithDetail("group_id", groupID.String()).
		WithDetail("project_count", projectCount)
}

// 請求処理関連エラー関数

// ErrBillingAlreadyProcessedError 既に処理済みの請求エラー
func ErrBillingAlreadyProcessedError(month string, clientID uuid.UUID) *AccountingError {
	return NewAccountingError(ErrBillingAlreadyProcessed, "指定月の請求は既に処理済みです").
		WithDetail("month", month).
		WithDetail("client_id", clientID.String())
}

// ErrBillingNoWorkRecordsError 作業記録がないエラー
func ErrBillingNoWorkRecordsError(month string, projectID uuid.UUID) *AccountingError {
	return NewAccountingError(ErrBillingNoWorkRecords, "指定月の作業記録が見つかりません").
		WithDetail("month", month).
		WithDetail("project_id", projectID.String())
}

// ErrBillingCalculationFailedError 請求額計算失敗エラー
func ErrBillingCalculationFailedError(reason string) *AccountingError {
	return NewAccountingError(ErrBillingCalculationFailed, "請求額の計算に失敗しました").
		WithDetail("reason", reason)
}

// freee連携関連エラー関数

// ErrFreeeNotConnectedError freee未接続エラー
func ErrFreeeNotConnectedError(userID uuid.UUID) *AccountingError {
	return NewAccountingError(ErrFreeeNotConnected, "freeeとの連携が設定されていません").
		WithDetail("user_id", userID.String())
}

// ErrFreeeTokenExpiredError freeeトークン期限切れエラー
func ErrFreeeTokenExpiredError(userID uuid.UUID) *AccountingError {
	return NewAccountingError(ErrFreeeTokenExpired, "freeeアクセストークンの有効期限が切れています").
		WithDetail("user_id", userID.String())
}

// ErrFreeeAPIError freee APIエラー
func ErrFreeeAPIErrorWithDetails(endpoint string, status int, message string) *AccountingError {
	return NewAccountingError(ErrFreeeAPIError, "freee APIでエラーが発生しました").
		WithDetail("endpoint", endpoint).
		WithDetail("status", status).
		WithDetail("api_message", message)
}

// ErrFreeeRateLimitError freeeレート制限エラー
func ErrFreeeRateLimitError(retryAfter int) *AccountingError {
	return NewAccountingError(ErrFreeeRateLimit, "freee APIのレート制限に達しました").
		WithDetail("retry_after_seconds", retryAfter)
}

// バッチ処理関連エラー関数

// ErrBatchJobNotFoundError バッチジョブが見つからないエラー
func ErrBatchJobNotFoundError(jobID uuid.UUID) *AccountingError {
	return NewAccountingError(ErrBatchJobNotFound, "バッチジョブが見つかりません").
		WithDetail("job_id", jobID.String())
}

// ErrBatchJobAlreadyRunningError バッチジョブ実行中エラー
func ErrBatchJobAlreadyRunningError(jobID uuid.UUID) *AccountingError {
	return NewAccountingError(ErrBatchJobAlreadyRunning, "バッチジョブは既に実行中です").
		WithDetail("job_id", jobID.String())
}

// スケジュール関連エラー関数

// ErrScheduleNotFoundError スケジュールが見つからないエラー
func ErrScheduleNotFoundError(scheduleID uuid.UUID) *AccountingError {
	return NewAccountingError(ErrScheduleNotFound, "スケジュールが見つかりません").
		WithDetail("schedule_id", scheduleID.String())
}

// ErrScheduleInvalidTimeError 無効なスケジュール時刻エラー
func ErrScheduleInvalidTimeError(scheduledTime time.Time) *AccountingError {
	return NewAccountingError(ErrScheduleInvalidTime, "無効なスケジュール時刻です").
		WithDetail("scheduled_time", scheduledTime)
}

// 暗号化関連エラー関数

// ErrEncryptionFailedError 暗号化失敗エラー
func ErrEncryptionFailedError(reason string) *AccountingError {
	return NewAccountingError(ErrEncryptionFailed, "データの暗号化に失敗しました").
		WithDetail("reason", reason)
}

// ErrDecryptionFailedError 復号化失敗エラー
func ErrDecryptionFailedError(reason string) *AccountingError {
	return NewAccountingError(ErrDecryptionFailed, "データの復号化に失敗しました").
		WithDetail("reason", reason)
}

// ユーティリティ関数

// IsAccountingError 経理エラーかどうかを判定
func IsAccountingError(err error) bool {
	_, ok := err.(*AccountingError)
	return ok
}

// AsAccountingError エラーを経理エラーとして取得
func AsAccountingError(err error) (*AccountingError, bool) {
	if accErr, ok := err.(*AccountingError); ok {
		return accErr, true
	}
	return nil, false
}

// WrapAsAccountingError 一般的なエラーを経理エラーでラップ
func WrapAsAccountingError(err error, code AccountingErrorCode, message string) *AccountingError {
	return NewAccountingErrorWithCause(code, message, err)
}

// IsRetryableError リトライ可能なエラーかどうかを判定
func IsRetryableError(err error) bool {
	if accErr, ok := AsAccountingError(err); ok {
		switch accErr.Code {
		case ErrFreeeRateLimit, ErrFreeeAPIError, ErrBatchProcessingFailed:
			return true
		default:
			return false
		}
	}
	return false
}

// GetErrorMessage エラーコードに対応するメッセージを取得
func GetErrorMessage(code AccountingErrorCode) string {
	messages := map[AccountingErrorCode]string{
		ErrAccountingGeneral:          "経理機能でエラーが発生しました",
		ErrAccountingPermission:       "経理機能の権限がありません",
		ErrAccountingNotFound:         "リソースが見つかりません",
		ErrAccountingInvalidRequest:   "リクエストが無効です",
		ErrAccountingDataConflict:     "データの競合が発生しました",
		ErrProjectGroupNotFound:       "プロジェクトグループが見つかりません",
		ErrProjectGroupInvalidName:    "プロジェクトグループ名が無効です",
		ErrProjectGroupDuplicate:      "プロジェクトグループが重複しています",
		ErrProjectGroupHasProjects:    "プロジェクトが含まれているため操作できません",
		ErrProjectGroupProjectLimit:   "プロジェクト数の上限を超えています",
		ErrProjectGroupClientMismatch: "クライアントが一致しません",
		ErrBillingInvalidMonth:        "請求月が無効です",
		ErrBillingAlreadyProcessed:    "請求は既に処理済みです",
		ErrBillingCalculationFailed:   "請求額の計算に失敗しました",
		ErrBillingInvalidAmount:       "請求額が無効です",
		ErrBillingNoWorkRecords:       "作業記録が見つかりません",
		ErrBillingClientNotActive:     "クライアントがアクティブではありません",
		ErrBillingProjectNotActive:    "プロジェクトがアクティブではありません",
		ErrBillingScheduleFailed:      "請求スケジュールの設定に失敗しました",
		ErrBillingRetryFailed:         "請求処理のリトライに失敗しました",
		ErrFreeeNotConnected:          "freeeとの連携が設定されていません",
		ErrFreeeAuthFailed:            "freee認証に失敗しました",
		ErrFreeeTokenExpired:          "freeeトークンの有効期限が切れています",
		ErrFreeeTokenRefreshFailed:    "freeeトークンの更新に失敗しました",
		ErrFreeeAPIError:              "freee APIでエラーが発生しました",
		ErrFreeeRateLimit:             "freee APIのレート制限に達しました",
		ErrFreeeCompanyNotSelected:    "freee事業所が選択されていません",
		ErrFreeeSyncFailed:            "freee同期に失敗しました",
		ErrFreeePartnerNotFound:       "freee取引先が見つかりません",
		ErrFreeeInvoiceCreateFailed:   "freee請求書の作成に失敗しました",
		ErrEncryptionFailed:           "暗号化に失敗しました",
		ErrDecryptionFailed:           "復号化に失敗しました",
		ErrInvalidEncryptionKey:       "暗号化キーが無効です",
		ErrBatchProcessingFailed:      "バッチ処理に失敗しました",
		ErrBatchJobNotFound:           "バッチジョブが見つかりません",
		ErrBatchJobAlreadyRunning:     "バッチジョブは既に実行中です",
		ErrBatchJobCancelled:          "バッチジョブがキャンセルされました",
		ErrScheduleNotFound:           "スケジュールが見つかりません",
		ErrScheduleInvalidTime:        "スケジュール時刻が無効です",
		ErrScheduleAlreadyExecuted:    "スケジュールは既に実行済みです",
		ErrScheduleCronInvalid:        "Cron式が無効です",
	}

	if message, exists := messages[code]; exists {
		return message
	}
	return "不明なエラーが発生しました"
}
