package handler

import (
	"net/http"
	"time"

	"errors"
	"fmt"
	"strings"

	"github.com/duesk/monstera/internal/common/userutil"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// BaseHandler 全てのハンドラーの基本となる構造体
type BaseHandler struct {
	Logger *zap.Logger
}

// HandlerUtil 共通ハンドラユーティリティ
type HandlerUtil struct {
	Logger *zap.Logger
}

// NewHandlerUtil HandlerUtilのインスタンスを生成します
func NewHandlerUtil(logger *zap.Logger) *HandlerUtil {
	return &HandlerUtil{
		Logger: logger,
	}
}

// GetAuthenticatedUserID 認証済みユーザーのIDを取得する共通関数
func (h *HandlerUtil) GetAuthenticatedUserID(c *gin.Context) (uuid.UUID, bool) {
	// userutil.GetUserIDFromContextを利用
	userUUID, ok := userutil.GetUserIDFromContext(c, h.Logger)
	if !ok {
		RespondError(c, http.StatusUnauthorized, message.MsgUnauthorized)
		return uuid.UUID{}, false
	}

	return userUUID, true
}

// ParseUUIDParam パスパラメータからUUIDを解析する
func (h *HandlerUtil) ParseUUIDParam(c *gin.Context, paramName string) (uuid.UUID, bool) {
	idStr := c.Param(paramName)
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.Logger.Warn("Invalid UUID parameter",
			zap.String("param", paramName),
			zap.String("value", idStr),
			zap.Error(err))
		RespondError(c, http.StatusBadRequest, fmt.Sprintf("無効な%sです", paramName))
		return uuid.UUID{}, false
	}
	return id, true
}

// IsAdmin はユーザーが管理者かどうかを確認する関数
func (h *HandlerUtil) IsAdmin(c *gin.Context) (bool, error) {
	// ロールを取得
	role, exists := c.Get("role")
	if !exists {
		RespondError(c, http.StatusUnauthorized, message.MsgUnauthorized)
		return false, errors.New("role not found in context")
	}

	// 文字列に変換
	roleStr, ok := role.(string)
	if !ok {
		HandleError(c, http.StatusInternalServerError, message.MsgInvalidRoleFormat, h.Logger, errors.New("invalid role format"), "role", role)
		return false, errors.New("invalid role format")
	}

	// ロールをパースして管理者権限以上か確認
	parsedRole, err := model.ParseRole(roleStr)
	if err != nil {
		return false, err
	}
	return parsedRole.IsAdmin(), nil
}

// ExtractValidationErrors バリデーションエラーを抽出する
func (h *HandlerUtil) ExtractValidationErrors(err error) map[string]string {
	return h.CreateValidationErrorMap(err)
}

// RespondValidationError バリデーションエラーレスポンスを返す (HandlerUtilメソッド)
func (h *HandlerUtil) RespondValidationError(c *gin.Context, errors map[string]string) {
	RespondValidationError(c, errors)
}

// ParseUUID UUIDをパースする共通ユーティリティ
func ParseUUID(c *gin.Context, paramName string, logger *zap.Logger) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Param(paramName))
	if err != nil {
		if logger != nil {
			logger.Error("Invalid UUID format", zap.Error(err), zap.String("param", paramName))
		}
		RespondError(c, http.StatusBadRequest, message.MsgInvalidIDFormat)
		return uuid.UUID{}, err
	}
	return id, nil
}

// RespondSuccess 成功レスポンスを返す共通ユーティリティ
func RespondSuccess(c *gin.Context, statusCode int, message string, data gin.H) {
	response := gin.H{}
	if data != nil {
		for k, v := range data {
			response[k] = v
		}
	}

	if message != "" {
		response["message"] = message
	}

	c.JSON(statusCode, response)
}

// RespondError エラーレスポンスを返す共通ユーティリティ（仕様書準拠）
func RespondError(c *gin.Context, statusCode int, message string) {
	response := dto.ErrorResponse{
		Error: message,
	}
	c.JSON(statusCode, response)
}

// HandleError エラーをログに記録してレスポンスを返す共通ユーティリティ
func HandleError(c *gin.Context, statusCode int, message string, logger *zap.Logger, err error, keyValues ...interface{}) {
	fields := make([]zap.Field, 0, len(keyValues)/2+1)
	if err != nil {
		fields = append(fields, zap.Error(err))
	}

	// キーと値のペアをフィールドに追加
	for i := 0; i < len(keyValues); i += 2 {
		if i+1 < len(keyValues) {
			// キーは文字列であることを期待
			if key, ok := keyValues[i].(string); ok {
				// 値の型によって適切なzap.Fieldを作成
				switch val := keyValues[i+1].(type) {
				case string:
					fields = append(fields, zap.String(key, val))
				case int:
					fields = append(fields, zap.Int(key, val))
				case bool:
					fields = append(fields, zap.Bool(key, val))
				default:
					// その他の型はStringerインターフェースを実装していれば文字列化
					fields = append(fields, zap.Any(key, val))
				}
			}
		}
	}

	if logger != nil {
		logger.Error(message, fields...)
	}
	RespondError(c, statusCode, message)
}

// RespondErrorWithCode エラーコード付きのエラーレスポンスを返す（仕様書準拠）
func RespondErrorWithCode(c *gin.Context, errorCode message.ErrorCode, msg string, details ...map[string]string) {
	response := dto.ErrorResponse{
		Error: msg,
		Code:  string(errorCode),
	}

	if len(details) > 0 && details[0] != nil {
		response.Details = details[0]
	}

	statusCode := message.GetHTTPStatusCode(errorCode)
	c.JSON(statusCode, response)
}

// RespondStandardErrorWithCode 標準エラーコード（E001V001など）付きのエラーレスポンスを返す
func RespondStandardErrorWithCode(c *gin.Context, statusCode int, errorCode string, message string) {
	response := gin.H{
		"error_code": errorCode,
		"message":    message,
	}
	c.JSON(statusCode, response)
}

// RespondAppError AppError構造体を使用してエラーレスポンスを返す
func RespondAppError(c *gin.Context, appErr *message.AppError) {
	requestID, _ := c.Get("request_id")
	requestIDStr, _ := requestID.(string)

	if requestIDStr != "" && appErr.RequestID == "" {
		appErr.RequestID = requestIDStr
	}

	if appErr.Timestamp == "" {
		appErr.Timestamp = time.Now().Format(time.RFC3339)
	}

	c.JSON(appErr.StatusCode, appErr)
}

// HandleErrorWithCode エラーコード付きでエラーをログに記録してレスポンスを返す
func HandleErrorWithCode(c *gin.Context, errorCode message.ErrorCode, msg string, logger *zap.Logger, err error, keyValues ...interface{}) {
	fields := make([]zap.Field, 0, len(keyValues)/2+2)
	if err != nil {
		fields = append(fields, zap.Error(err))
	}
	fields = append(fields, zap.String("error_code", string(errorCode)))

	// キーと値のペアをフィールドに追加
	for i := 0; i < len(keyValues); i += 2 {
		if i+1 < len(keyValues) {
			// キーは文字列であることを期待
			if key, ok := keyValues[i].(string); ok {
				// 値の型によって適切なzap.Fieldを作成
				switch val := keyValues[i+1].(type) {
				case string:
					fields = append(fields, zap.String(key, val))
				case int:
					fields = append(fields, zap.Int(key, val))
				case bool:
					fields = append(fields, zap.Bool(key, val))
				default:
					// その他の型はStringerインターフェースを実装していれば文字列化
					fields = append(fields, zap.Any(key, val))
				}
			}
		}
	}

	if logger != nil {
		logger.Error(msg, fields...)
	}
	RespondErrorWithCode(c, errorCode, msg)
}

// RespondValidationError バリデーションエラーレスポンスを返す
func RespondValidationError(c *gin.Context, errors map[string]string) {
	RespondErrorWithCode(c, message.ErrCodeInvalidRequest, message.MsgValidationError, errors)
}

// RespondNotFound リソースが見つからない場合のレスポンスを返す
func RespondNotFound(c *gin.Context, resource string) {
	RespondErrorWithCode(c, message.ErrCodeNotFound, message.FormatNotFound(resource))
}

// RespondUnauthorized 認証エラーレスポンスを返す
func RespondUnauthorized(c *gin.Context) {
	RespondErrorWithCode(c, message.ErrCodeUnauthorized, message.MsgUnauthorized)
}

// RespondForbidden 権限エラーレスポンスを返す
func RespondForbidden(c *gin.Context, msg ...string) {
	var errorMessage string
	if len(msg) > 0 && msg[0] != "" {
		errorMessage = msg[0]
	} else {
		errorMessage = message.MsgForbidden
	}
	RespondErrorWithCode(c, message.ErrCodeForbidden, errorMessage)
}

// RespondBadRequest バッドリクエストレスポンスを返す
func RespondBadRequest(c *gin.Context, msg string) {
	RespondError(c, http.StatusBadRequest, msg)
}

// HandleStandardError 標準エラーコードでエラーをログに記録してレスポンスを返す
func HandleStandardError(c *gin.Context, statusCode int, errorCode string, msg string, logger *zap.Logger, err error, keyValues ...interface{}) {
	fields := make([]zap.Field, 0, len(keyValues)/2+2)
	if err != nil {
		fields = append(fields, zap.Error(err))
	}
	fields = append(fields, zap.String("error_code", errorCode))

	// キーと値のペアをフィールドに追加
	for i := 0; i < len(keyValues); i += 2 {
		if i+1 < len(keyValues) {
			// キーは文字列であることを期待
			if key, ok := keyValues[i].(string); ok {
				// 値の型によって適切なzap.Fieldを作成
				switch val := keyValues[i+1].(type) {
				case string:
					fields = append(fields, zap.String(key, val))
				case int:
					fields = append(fields, zap.Int(key, val))
				case bool:
					fields = append(fields, zap.Bool(key, val))
				default:
					// その他の型はStringerインターフェースを実装していれば文字列化
					fields = append(fields, zap.Any(key, val))
				}
			}
		}
	}

	if logger != nil {
		logger.Error(msg, fields...)
	}
	RespondStandardErrorWithCode(c, statusCode, errorCode, msg)
}

// RespondInternalError 内部エラーレスポンスを返す
func RespondInternalError(c *gin.Context, logger *zap.Logger, err error) {
	HandleErrorWithCode(c, message.ErrCodeInternalError, message.MsgInternalServerError, logger, err)
}

// CreateValidationErrorMap バリデーションエラーをマップに変換する
func (h *HandlerUtil) CreateValidationErrorMap(err error) map[string]string {
	errorMap := make(map[string]string)

	// Ginのバリデーションエラーを解析
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			field := fieldError.Field()
			tag := fieldError.Tag()

			switch tag {
			case "required":
				errorMap[field] = field + "は必須です"
			case "email":
				errorMap[field] = "有効なメールアドレスを入力してください"
			case "min":
				errorMap[field] = field + "は最小" + fieldError.Param() + "文字以上で入力してください"
			case "max":
				errorMap[field] = field + "は最大" + fieldError.Param() + "文字以下で入力してください"
			case "len":
				errorMap[field] = field + "は" + fieldError.Param() + "文字で入力してください"
			case "gte":
				errorMap[field] = field + "は" + fieldError.Param() + "以上で入力してください"
			case "lte":
				errorMap[field] = field + "は" + fieldError.Param() + "以下で入力してください"
			default:
				errorMap[field] = field + "が無効です"
			}
		}
		return errorMap
	}

	// JSON unmarshal エラーの場合
	if strings.Contains(err.Error(), "cannot unmarshal") {
		errorMap["format"] = "JSONフォーマットが正しくありません"
		return errorMap
	}

	// その他のバインディングエラー
	if strings.Contains(err.Error(), "bind") {
		errorMap["request"] = "リクエストの形式が正しくありません"
		return errorMap
	}

	// 一般的なエラーの場合
	errorMap["error"] = err.Error()
	return errorMap
}

// ParseDate 日付文字列をtime.Timeにパースする（日付のみ）
func (h *HandlerUtil) ParseDate(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, fmt.Errorf("日付が空です")
	}

	// 複数の日付フォーマットを試行
	formats := []string{
		"2006-01-02", // YYYY-MM-DD
		"2006/01/02", // YYYY/MM/DD
		"02/01/2006", // DD/MM/YYYY
		"01/02/2006", // MM/DD/YYYY
		"2006-1-2",   // YYYY-M-D
		"2006/1/2",   // YYYY/M/D
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			// 時刻を00:00:00に設定（日付のみ）
			return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
		}
	}

	return time.Time{}, fmt.Errorf("日付フォーマットが無効です: %s", dateStr)
}

// ParseDateTime 日時文字列をtime.Timeにパースする（日付と時刻）
func (h *HandlerUtil) ParseDateTime(dateTimeStr string) (time.Time, error) {
	if dateTimeStr == "" {
		return time.Time{}, fmt.Errorf("日時が空です")
	}

	// 複数の日時フォーマットを試行
	formats := []string{
		time.RFC3339,          // 2006-01-02T15:04:05Z07:00
		"2006-01-02 15:04:05", // YYYY-MM-DD HH:MM:SS
		"2006-01-02T15:04:05", // YYYY-MM-DDTHH:MM:SS
		"2006/01/02 15:04:05", // YYYY/MM/DD HH:MM:SS
		"02/01/2006 15:04:05", // DD/MM/YYYY HH:MM:SS
		"01/02/2006 15:04:05", // MM/DD/YYYY HH:MM:SS
		"2006-01-02 15:04",    // YYYY-MM-DD HH:MM
		"2006-01-02T15:04",    // YYYY-MM-DDTHH:MM
		"2006/01/02 15:04",    // YYYY/MM/DD HH:MM
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateTimeStr); err == nil {
			return t, nil
		}
	}

	// 日付のみの場合は時刻を00:00:00に設定
	if t, err := h.ParseDate(dateTimeStr); err == nil {
		return t, nil
	}

	return time.Time{}, fmt.Errorf("日時フォーマットが無効です: %s", dateTimeStr)
}

// ParseDateWithLocation タイムゾーンを指定して日付をパースする
func (h *HandlerUtil) ParseDateWithLocation(dateStr string, loc *time.Location) (time.Time, error) {
	t, err := h.ParseDate(dateStr)
	if err != nil {
		return time.Time{}, err
	}

	if loc == nil {
		loc = time.Local
	}

	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc), nil
}

// ParseDateTimeWithLocation タイムゾーンを指定して日時をパースする
func (h *HandlerUtil) ParseDateTimeWithLocation(dateTimeStr string, loc *time.Location) (time.Time, error) {
	t, err := h.ParseDateTime(dateTimeStr)
	if err != nil {
		return time.Time{}, err
	}

	if loc == nil {
		loc = time.Local
	}

	return t.In(loc), nil
}
