package debug

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"go.uber.org/zap"
)

// DebugLogConfig デバッグログの設定
type DebugLogConfig struct {
	Category    string // ログのカテゴリ（API、Service、Repositoryなど）
	Operation   string // 操作名（Create、Update、Deleteなど）
	Description string // 詳細な説明（任意）
}

// RequestDebugData リクエストのデバッグデータ
type RequestDebugData struct {
	Method      string      `json:"method,omitempty"`
	URL         string      `json:"url,omitempty"`
	Headers     interface{} `json:"headers,omitempty"`
	QueryParams interface{} `json:"query_params,omitempty"`
	PathParams  interface{} `json:"path_params,omitempty"`
	RawBody     string      `json:"raw_body,omitempty"`
	ParsedBody  interface{} `json:"parsed_body,omitempty"`
	UserID      string      `json:"user_id,omitempty"`
	UserRole    string      `json:"user_role,omitempty"`
	Metadata    interface{} `json:"metadata,omitempty"`
}

// ResponseDebugData レスポンスのデバッグデータ
type ResponseDebugData struct {
	StatusCode   int         `json:"status_code,omitempty"`
	Headers      interface{} `json:"headers,omitempty"`
	ResponseBody interface{} `json:"response_body,omitempty"`
	ProcessTime  string      `json:"process_time,omitempty"`
	Metadata     interface{} `json:"metadata,omitempty"`
}

// ErrorDebugData エラーのデバッグデータ
type ErrorDebugData struct {
	Error       error       `json:"error,omitempty"`
	ErrorType   string      `json:"error_type,omitempty"`
	StackTrace  string      `json:"stack_trace,omitempty"`
	RequestData interface{} `json:"request_data,omitempty"`
	Metadata    interface{} `json:"metadata,omitempty"`
}

// DataProcessDebugData データ処理のデバッグデータ
type DataProcessDebugData struct {
	InputData   interface{} `json:"input_data,omitempty"`
	OutputData  interface{} `json:"output_data,omitempty"`
	ProcessType string      `json:"process_type,omitempty"`
	Metadata    interface{} `json:"metadata,omitempty"`
}

// DebugLogger デバッグログ出力クラス
type DebugLogger struct {
	logger        *zap.Logger
	isDevelopment bool
}

// NewDebugLogger デバッグロガーのインスタンスを作成
func NewDebugLogger(logger *zap.Logger) *DebugLogger {
	isDevelopment := os.Getenv("GO_ENV") == "development" || os.Getenv("GIN_MODE") == "debug"
	return &DebugLogger{
		logger:        logger,
		isDevelopment: isDevelopment,
	}
}

// RequestStart リクエスト開始ログを出力
func (d *DebugLogger) RequestStart(config DebugLogConfig, data RequestDebugData) {
	if !d.isDevelopment {
		return
	}

	d.logger.Info(fmt.Sprintf("=== %s %s リクエスト開始 ===", config.Category, config.Operation),
		zap.String("category", config.Category),
		zap.String("operation", config.Operation),
		zap.String("description", config.Description),
		zap.String("method", data.Method),
		zap.String("url", data.URL),
		zap.Any("headers", data.Headers),
		zap.Any("query_params", data.QueryParams),
		zap.Any("path_params", data.PathParams),
		zap.String("raw_body", data.RawBody),
		zap.Any("parsed_body", data.ParsedBody),
		zap.String("user_id", data.UserID),
		zap.String("user_role", data.UserRole),
		zap.Any("metadata", data.Metadata),
	)
}

// RequestSuccess リクエスト成功ログを出力
func (d *DebugLogger) RequestSuccess(config DebugLogConfig, data ResponseDebugData) {
	if !d.isDevelopment {
		return
	}

	d.logger.Info(fmt.Sprintf("=== %s %s リクエスト成功 ===", config.Category, config.Operation),
		zap.String("category", config.Category),
		zap.String("operation", config.Operation),
		zap.Int("status_code", data.StatusCode),
		zap.Any("headers", data.Headers),
		zap.Any("response_body", data.ResponseBody),
		zap.String("process_time", data.ProcessTime),
		zap.Any("metadata", data.Metadata),
	)
}

// RequestError リクエストエラーログを出力
func (d *DebugLogger) RequestError(config DebugLogConfig, data ErrorDebugData) {
	if !d.isDevelopment {
		return
	}

	d.logger.Error(fmt.Sprintf("=== %s %s リクエストエラー ===", config.Category, config.Operation),
		zap.String("category", config.Category),
		zap.String("operation", config.Operation),
		zap.Error(data.Error),
		zap.String("error_type", data.ErrorType),
		zap.String("stack_trace", data.StackTrace),
		zap.Any("request_data", data.RequestData),
		zap.Any("metadata", data.Metadata),
	)
}

// DataProcess データ処理ログを出力
func (d *DebugLogger) DataProcess(config DebugLogConfig, data DataProcessDebugData) {
	if !d.isDevelopment {
		return
	}

	d.logger.Info(fmt.Sprintf("=== %s %s データ処理 (%s) ===", config.Category, config.Operation, data.ProcessType),
		zap.String("category", config.Category),
		zap.String("operation", config.Operation),
		zap.String("process_type", data.ProcessType),
		zap.Any("input_data", data.InputData),
		zap.Any("output_data", data.OutputData),
		zap.Any("metadata", data.Metadata),
	)
}

// Validation バリデーションログを出力
func (d *DebugLogger) Validation(config DebugLogConfig, isValid bool, errors interface{}, data interface{}) {
	if !d.isDevelopment {
		return
	}

	result := "成功"
	if !isValid {
		result = "失敗"
	}

	d.logger.Info(fmt.Sprintf("=== %s %s バリデーション ===", config.Category, config.Operation),
		zap.String("category", config.Category),
		zap.String("operation", config.Operation),
		zap.String("result", result),
		zap.Bool("is_valid", isValid),
		zap.Any("errors", errors),
		zap.Any("data", data),
	)
}

// Debug 汎用デバッグログを出力
func (d *DebugLogger) Debug(config DebugLogConfig, message string, data interface{}) {
	if !d.isDevelopment {
		return
	}

	d.logger.Info(fmt.Sprintf("[%s] %s: %s", config.Category, config.Operation, message),
		zap.String("category", config.Category),
		zap.String("operation", config.Operation),
		zap.String("message", message),
		zap.Any("data", data),
	)
}

// Timer 処理時間測定用のタイマー
type Timer struct {
	startTime time.Time
	label     string
	logger    *DebugLogger
	config    DebugLogConfig
}

// StartTimer タイマーを開始
func (d *DebugLogger) StartTimer(config DebugLogConfig, label string) *Timer {
	if !d.isDevelopment {
		return &Timer{}
	}

	timer := &Timer{
		startTime: time.Now(),
		label:     label,
		logger:    d,
		config:    config,
	}

	d.logger.Info(fmt.Sprintf("=== %s %s タイマー開始: %s ===", config.Category, config.Operation, label),
		zap.String("category", config.Category),
		zap.String("operation", config.Operation),
		zap.String("timer_label", label),
	)

	return timer
}

// End タイマーを終了し、経過時間をログ出力
func (t *Timer) End() {
	if t.logger == nil || !t.logger.isDevelopment {
		return
	}

	elapsed := time.Since(t.startTime)
	t.logger.logger.Info(fmt.Sprintf("=== %s %s タイマー終了: %s ===", t.config.Category, t.config.Operation, t.label),
		zap.String("category", t.config.Category),
		zap.String("operation", t.config.Operation),
		zap.String("timer_label", t.label),
		zap.Duration("elapsed_time", elapsed),
		zap.String("elapsed_ms", fmt.Sprintf("%.2fms", float64(elapsed.Nanoseconds())/1000000)),
	)
}

// JSONString 構造体をJSON文字列に変換（デバッグ用）
func JSONString(v interface{}) string {
	bytes, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Sprintf("JSON変換エラー: %v", err)
	}
	return string(bytes)
}

// よく使用されるカテゴリの定数
const (
	CategoryAPI        = "API"
	CategoryService    = "Service"
	CategoryRepository = "Repository"
	CategoryMiddleware = "Middleware"
	CategoryAuth       = "Auth"
	CategoryValidation = "Validation"
	CategoryDatabase   = "Database"
	CategoryExternal   = "External"
)

// よく使用される操作の定数
const (
	OperationCreate   = "Create"
	OperationRead     = "Read"
	OperationUpdate   = "Update"
	OperationDelete   = "Delete"
	OperationList     = "List"
	OperationSubmit   = "Submit"
	OperationValidate = "Validate"
	OperationConvert  = "Convert"
	OperationLogin    = "Login"
	OperationLogout   = "Logout"
	OperationBind     = "Bind"
	OperationQuery    = "Query"
)

/*
使用例:

// デバッグロガーの初期化
debugLogger := debug.NewDebugLogger(logger)

// リクエスト開始ログ
debugLogger.RequestStart(
    debug.DebugLogConfig{
        Category:    debug.CategoryAPI,
        Operation:   debug.OperationCreate,
        Description: "週報作成",
    },
    debug.RequestDebugData{
        Method:     "POST",
        URL:        "/api/v1/weekly-reports",
        RawBody:    string(bodyBytes),
        ParsedBody: req,
        UserID:     userID.String(),
        UserRole:   userRole,
    },
)

// データ処理ログ
debugLogger.DataProcess(
    debug.DebugLogConfig{
        Category:  debug.CategoryService,
        Operation: debug.OperationConvert,
    },
    debug.DataProcessDebugData{
        InputData:   inputDTO,
        OutputData:  outputModel,
        ProcessType: "DTOToModel",
    },
)

// タイマー使用例
timer := debugLogger.StartTimer(
    debug.DebugLogConfig{
        Category:  debug.CategoryRepository,
        Operation: debug.OperationCreate,
    },
    "週報作成処理",
)
defer timer.End()
*/
