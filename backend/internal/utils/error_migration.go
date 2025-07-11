package utils

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/message"
)

// ErrorMigrationHelper 既存エラーハンドリングからの移行用ヘルパー
type ErrorMigrationHelper struct {
	errorHandler *ErrorHandler
}

// NewErrorMigrationHelper ErrorMigrationHelperのインスタンスを作成
func NewErrorMigrationHelper() *ErrorMigrationHelper {
	return &ErrorMigrationHelper{
		errorHandler: NewErrorHandler(),
	}
}

// MigrateError 既存のエラーメッセージを新しいエラーコードシステムに移行
func (m *ErrorMigrationHelper) MigrateError(c *gin.Context, err error, operation string) {
	// エラーの種類に応じて適切なエラーコードにマッピング
	if err == nil {
		return
	}

	// GORM関連エラー
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if strings.Contains(operation, "weekly_report") || strings.Contains(operation, "週報") {
			m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportNotFound, nil)
		} else {
			m.errorHandler.HandleError(c, message.ErrCodeNotFound, "指定されたリソースが見つかりません。", nil)
		}
		return
	}

	// バリデーションエラー
	if strings.Contains(err.Error(), "validation") || strings.Contains(err.Error(), "invalid") {
		if strings.Contains(operation, "weekly_report") {
			m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportRequiredFields, nil)
		} else {
			m.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "入力内容に不備があります。", nil)
		}
		return
	}

	// 権限エラー
	if strings.Contains(err.Error(), "permission") || strings.Contains(err.Error(), "forbidden") {
		m.errorHandler.HandleError(c, message.ErrCodeForbidden, "この操作を実行する権限がありません。", nil)
		return
	}

	// 重複エラー
	if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "already exists") {
		if strings.Contains(operation, "weekly_report") {
			m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportAlreadyExists, nil)
		} else {
			m.errorHandler.HandleError(c, message.ErrCodeAlreadyExists, "指定されたリソースは既に存在します。", nil)
		}
		return
	}

	// データベースエラー
	if strings.Contains(err.Error(), "database") || strings.Contains(err.Error(), "sql") {
		m.errorHandler.HandleError(c, message.ErrCodeDatabaseError, "データベースエラーが発生しました。", nil)
		return
	}

	// ネットワークエラー
	if strings.Contains(err.Error(), "network") || strings.Contains(err.Error(), "connection") {
		m.errorHandler.HandleError(c, message.ErrCodeNetworkError, "ネットワークエラーが発生しました。", nil)
		return
	}

	// タイムアウトエラー
	if strings.Contains(err.Error(), "timeout") || strings.Contains(err.Error(), "deadline") {
		m.errorHandler.HandleError(c, message.ErrCodeTimeout, "処理がタイムアウトしました。", nil)
		return
	}

	// デフォルト: 内部エラー
	m.errorHandler.HandleInternalError(c, err, operation)
}

// MigrateWeeklyReportError 週報関連の既存エラーを移行
func (m *ErrorMigrationHelper) MigrateWeeklyReportError(c *gin.Context, err error, operation string) {
	if err == nil {
		return
	}

	errorMessage := err.Error()

	// 週報特有のエラーパターンをマッチング
	switch {
	case strings.Contains(errorMessage, "not found"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportNotFound, nil)
	case strings.Contains(errorMessage, "already submitted"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportAlreadySubmitted, nil)
	case strings.Contains(errorMessage, "deadline"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportDeadlinePassed, nil)
	case strings.Contains(errorMessage, "not editable"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportNotEditable, nil)
	case strings.Contains(errorMessage, "invalid period"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportInvalidPeriod, nil)
	case strings.Contains(errorMessage, "duplicate week"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportDuplicateWeek, nil)
	case strings.Contains(errorMessage, "required field"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportRequiredFields, nil)
	case strings.Contains(errorMessage, "invalid mood"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportInvalidMood, nil)
	case strings.Contains(errorMessage, "invalid work hours"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportInvalidWorkHours, nil)
	case strings.Contains(errorMessage, "permission denied"):
		m.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportEditForbidden, nil)
	default:
		// 既存のエラーハンドリングにフォールバック
		m.MigrateError(c, err, operation)
	}
}

// MigrateValidationError バリデーションエラーの移行
func (m *ErrorMigrationHelper) MigrateValidationError(c *gin.Context, fieldErrors map[string]string) {
	m.errorHandler.HandleValidationError(c, fieldErrors)
}

// LegacyErrorToCode 既存のエラーメッセージ定数を新しいエラーコードに変換
func (m *ErrorMigrationHelper) LegacyErrorToCode(legacyMessage string) message.ErrorCode {
	// 既存のメッセージ定数を新しいエラーコードにマッピング
	legacyToCodeMap := map[string]message.ErrorCode{
		"リクエストの形式が正しくありません": message.ErrCodeInvalidRequest,
		"認証が必要です":           message.ErrCodeUnauthorized,
		"アクセス権限がありません":      message.ErrCodeForbidden,
		"リソースが見つかりません":      message.ErrCodeNotFound,
		"リソースが既に存在します":      message.ErrCodeAlreadyExists,
		"内部エラーが発生しました":      message.ErrCodeInternalError,
		"データベースエラーが発生しました":  message.ErrCodeDatabaseError,
		"週報が見つかりません":        message.ErrCodeWeeklyReportNotFound,
		"週報は既に提出済みです":       message.ErrCodeWeeklyReportAlreadySubmitted,
		"週報は編集できません":        message.ErrCodeWeeklyReportNotEditable,
		"必須項目が未入力です":        message.ErrCodeWeeklyReportRequiredFields,
		"提出期限を過ぎています":       message.ErrCodeWeeklyReportDeadlinePassed,
	}

	if code, exists := legacyToCodeMap[legacyMessage]; exists {
		return code
	}

	// デフォルトは内部エラー
	return message.ErrCodeInternalError
}

// CreateMigrationDetails 移行用の詳細情報を作成
func (m *ErrorMigrationHelper) CreateMigrationDetails(operation, legacyMessage string, originalError error) map[string]string {
	details := map[string]string{
		"operation":      operation,
		"legacy_message": legacyMessage,
		"migration":      "true",
	}

	if originalError != nil {
		details["original_error"] = originalError.Error()
	}

	return details
}

// IsLegacyErrorHandling 既存のエラーハンドリングかどうかを判定
func (m *ErrorMigrationHelper) IsLegacyErrorHandling(handlerName string) bool {
	// 移行対象のハンドラー名をリスト化
	legacyHandlers := []string{
		"weekly_report_handler",
		"auth_handler",
		"profile_handler",
		"leave_handler",
	}

	for _, legacy := range legacyHandlers {
		if strings.Contains(strings.ToLower(handlerName), legacy) {
			return true
		}
	}

	return false
}

// GetMigrationPriority 移行の優先度を取得
func (m *ErrorMigrationHelper) GetMigrationPriority(handlerName string) int {
	// 優先度: 1=高、2=中、3=低
	priorityMap := map[string]int{
		"weekly_report": 1, // 週報関連は最優先
		"auth":          1, // 認証関連も最優先
		"profile":       2, // プロフィール関連は中優先度
		"leave":         2, // 休暇関連は中優先度
		"client":        3, // その他は低優先度
	}

	for key, priority := range priorityMap {
		if strings.Contains(strings.ToLower(handlerName), key) {
			return priority
		}
	}

	return 3 // デフォルトは低優先度
}
