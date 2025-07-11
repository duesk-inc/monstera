package logger

import (
	"context"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/errors"
)

// AccountingLogger 経理機能専用ロガー
type AccountingLogger struct {
	logger    *zap.Logger
	requestID string
	userID    *uuid.UUID
	category  string
}

// AccountingLogCategory ログカテゴリ
type AccountingLogCategory string

const (
	// API関連
	CategoryAPI        AccountingLogCategory = "API"
	CategoryAuth       AccountingLogCategory = "AUTH"
	CategoryPermission AccountingLogCategory = "PERMISSION"
	CategoryValidation AccountingLogCategory = "VALIDATION"

	// ビジネスロジック関連
	CategoryBilling      AccountingLogCategory = "BILLING"
	CategoryProjectGroup AccountingLogCategory = "PROJECT_GROUP"
	CategoryFreee        AccountingLogCategory = "FREEE"
	CategoryCalculation  AccountingLogCategory = "CALCULATION"

	// システム関連
	CategoryDatabase   AccountingLogCategory = "DATABASE"
	CategoryEncryption AccountingLogCategory = "ENCRYPTION"
	CategoryBatch      AccountingLogCategory = "BATCH"
	CategorySchedule   AccountingLogCategory = "SCHEDULE"

	// 監査関連
	CategoryAudit       AccountingLogCategory = "AUDIT"
	CategorySecurity    AccountingLogCategory = "SECURITY"
	CategoryPerformance AccountingLogCategory = "PERFORMANCE"
)

// AccountingLogLevel ログレベル
type AccountingLogLevel string

const (
	LevelDebug AccountingLogLevel = "DEBUG"
	LevelInfo  AccountingLogLevel = "INFO"
	LevelWarn  AccountingLogLevel = "WARN"
	LevelError AccountingLogLevel = "ERROR"
	LevelFatal AccountingLogLevel = "FATAL"
)

// LogContext ログコンテキスト
type LogContext struct {
	RequestID string                 `json:"request_id,omitempty"`
	UserID    *uuid.UUID             `json:"user_id,omitempty"`
	Category  AccountingLogCategory  `json:"category"`
	Operation string                 `json:"operation,omitempty"`
	Resource  string                 `json:"resource,omitempty"`
	Details   map[string]interface{} `json:"details,omitempty"`
	Duration  *time.Duration         `json:"duration,omitempty"`
	IPAddress string                 `json:"ip_address,omitempty"`
	UserAgent string                 `json:"user_agent,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// NewAccountingLogger 新しい経理ロガーを作成
func NewAccountingLogger(baseLogger *zap.Logger, category AccountingLogCategory) *AccountingLogger {
	if baseLogger == nil {
		// デフォルトロガーを作成
		config := zap.NewProductionConfig()
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		baseLogger, _ = config.Build()
	}

	return &AccountingLogger{
		logger:   baseLogger.Named("accounting"),
		category: string(category),
	}
}

// NewAccountingLoggerFromGin Ginコンテキストから経理ロガーを作成
func NewAccountingLoggerFromGin(c *gin.Context, baseLogger *zap.Logger, category AccountingLogCategory) *AccountingLogger {
	accountingLogger := NewAccountingLogger(baseLogger, category)

	// リクエストIDを取得
	if requestID, exists := c.Get("request_id"); exists {
		if rid, ok := requestID.(string); ok {
			accountingLogger.requestID = rid
		}
	}

	// ユーザーIDを取得
	if userID, exists := c.Get("userID"); exists {
		if uid, ok := userID.(uuid.UUID); ok {
			accountingLogger.userID = &uid
		}
	}

	return accountingLogger
}

// WithRequestID リクエストIDを設定
func (al *AccountingLogger) WithRequestID(requestID string) *AccountingLogger {
	newLogger := *al
	newLogger.requestID = requestID
	return &newLogger
}

// WithUserID ユーザーIDを設定
func (al *AccountingLogger) WithUserID(userID uuid.UUID) *AccountingLogger {
	newLogger := *al
	newLogger.userID = &userID
	return &newLogger
}

// WithCategory カテゴリを設定
func (al *AccountingLogger) WithCategory(category AccountingLogCategory) *AccountingLogger {
	newLogger := *al
	newLogger.category = string(category)
	return &newLogger
}

// buildLogContext ログコンテキストを構築
func (al *AccountingLogger) buildLogContext(operation string, details map[string]interface{}) *LogContext {
	ctx := &LogContext{
		RequestID: al.requestID,
		UserID:    al.userID,
		Category:  AccountingLogCategory(al.category),
		Operation: operation,
		Details:   details,
		Timestamp: time.Now(),
	}

	if details == nil {
		ctx.Details = make(map[string]interface{})
	}

	return ctx
}

// getZapFields ログコンテキストからzapフィールドを作成
func (al *AccountingLogger) getZapFields(ctx *LogContext) []zap.Field {
	fields := []zap.Field{
		zap.String("category", string(ctx.Category)),
		zap.Time("timestamp", ctx.Timestamp),
	}

	if ctx.RequestID != "" {
		fields = append(fields, zap.String("request_id", ctx.RequestID))
	}

	if ctx.UserID != nil {
		fields = append(fields, zap.String("user_id", ctx.UserID.String()))
	}

	if ctx.Operation != "" {
		fields = append(fields, zap.String("operation", ctx.Operation))
	}

	if ctx.Resource != "" {
		fields = append(fields, zap.String("resource", ctx.Resource))
	}

	if ctx.Duration != nil {
		fields = append(fields, zap.Duration("duration", *ctx.Duration))
	}

	if ctx.IPAddress != "" {
		fields = append(fields, zap.String("ip_address", ctx.IPAddress))
	}

	if ctx.UserAgent != "" {
		fields = append(fields, zap.String("user_agent", ctx.UserAgent))
	}

	// 詳細情報を個別フィールドとして追加
	for key, value := range ctx.Details {
		fields = append(fields, zap.Any(key, value))
	}

	return fields
}

// Debug デバッグログを出力
func (al *AccountingLogger) Debug(message string, details map[string]interface{}) {
	ctx := al.buildLogContext("debug", details)
	fields := al.getZapFields(ctx)
	al.logger.Debug(message, fields...)
}

// Info 情報ログを出力
func (al *AccountingLogger) Info(message string, details map[string]interface{}) {
	ctx := al.buildLogContext("info", details)
	fields := al.getZapFields(ctx)
	al.logger.Info(message, fields...)
}

// Warn 警告ログを出力
func (al *AccountingLogger) Warn(message string, details map[string]interface{}) {
	ctx := al.buildLogContext("warn", details)
	fields := al.getZapFields(ctx)
	al.logger.Warn(message, fields...)
}

// Error エラーログを出力
func (al *AccountingLogger) Error(message string, err error, details map[string]interface{}) {
	ctx := al.buildLogContext("error", details)
	fields := al.getZapFields(ctx)

	if err != nil {
		fields = append(fields, zap.Error(err))

		// AccountingErrorの場合は追加情報を記録
		if accErr, ok := errors.AsAccountingError(err); ok {
			fields = append(fields,
				zap.String("error_code", string(accErr.Code)),
				zap.Int("http_code", accErr.HTTPStatus()),
			)

			if accErr.RequestID != "" {
				fields = append(fields, zap.String("error_request_id", accErr.RequestID))
			}

			if accErr.UserID != nil {
				fields = append(fields, zap.String("error_user_id", accErr.UserID.String()))
			}
		}
	}

	al.logger.Error(message, fields...)
}

// Fatal 致命的エラーログを出力
func (al *AccountingLogger) Fatal(message string, err error, details map[string]interface{}) {
	ctx := al.buildLogContext("fatal", details)
	fields := al.getZapFields(ctx)

	if err != nil {
		fields = append(fields, zap.Error(err))
	}

	al.logger.Fatal(message, fields...)
}

// LogAPIRequest APIリクエストをログ出力
func (al *AccountingLogger) LogAPIRequest(method, path string, requestBody interface{}) {
	details := map[string]interface{}{
		"method":       method,
		"path":         path,
		"request_body": requestBody,
	}

	al.WithCategory(CategoryAPI).Info("API request received", details)
}

// LogAPIResponse APIレスポンスをログ出力
func (al *AccountingLogger) LogAPIResponse(method, path string, statusCode int, responseBody interface{}, duration time.Duration) {
	details := map[string]interface{}{
		"method":        method,
		"path":          path,
		"status_code":   statusCode,
		"response_body": responseBody,
		"duration_ms":   duration.Milliseconds(),
	}

	level := "info"
	if statusCode >= 400 {
		level = "warn"
	}
	if statusCode >= 500 {
		level = "error"
	}

	message := fmt.Sprintf("API response sent [%d]", statusCode)

	switch level {
	case "warn":
		al.WithCategory(CategoryAPI).Warn(message, details)
	case "error":
		al.WithCategory(CategoryAPI).Error(message, nil, details)
	default:
		al.WithCategory(CategoryAPI).Info(message, details)
	}
}

// LogBillingOperation 請求処理操作をログ出力
func (al *AccountingLogger) LogBillingOperation(operation string, clientID *uuid.UUID, month string, amount *float64, details map[string]interface{}) {
	logDetails := map[string]interface{}{
		"operation": operation,
		"month":     month,
	}

	if clientID != nil {
		logDetails["client_id"] = clientID.String()
	}

	if amount != nil {
		logDetails["amount"] = *amount
	}

	// 追加詳細情報をマージ
	for key, value := range details {
		logDetails[key] = value
	}

	al.WithCategory(CategoryBilling).Info("Billing operation executed", logDetails)
}

// LogProjectGroupOperation プロジェクトグループ操作をログ出力
func (al *AccountingLogger) LogProjectGroupOperation(operation string, groupID *uuid.UUID, groupName string, details map[string]interface{}) {
	logDetails := map[string]interface{}{
		"operation":  operation,
		"group_name": groupName,
	}

	if groupID != nil {
		logDetails["group_id"] = groupID.String()
	}

	// 追加詳細情報をマージ
	for key, value := range details {
		logDetails[key] = value
	}

	al.WithCategory(CategoryProjectGroup).Info("Project group operation executed", logDetails)
}

// LogFreeeOperation freee連携操作をログ出力
func (al *AccountingLogger) LogFreeeOperation(operation string, endpoint string, statusCode int, details map[string]interface{}) {
	logDetails := map[string]interface{}{
		"operation":   operation,
		"endpoint":    endpoint,
		"status_code": statusCode,
	}

	// 追加詳細情報をマージ
	for key, value := range details {
		logDetails[key] = value
	}

	message := fmt.Sprintf("Freee operation: %s", operation)

	if statusCode >= 400 {
		al.WithCategory(CategoryFreee).Error(message, nil, logDetails)
	} else {
		al.WithCategory(CategoryFreee).Info(message, logDetails)
	}
}

// LogBatchOperation バッチ処理操作をログ出力
func (al *AccountingLogger) LogBatchOperation(jobID uuid.UUID, operation string, status string, progress int, details map[string]interface{}) {
	logDetails := map[string]interface{}{
		"job_id":    jobID.String(),
		"operation": operation,
		"status":    status,
		"progress":  progress,
	}

	// 追加詳細情報をマージ
	for key, value := range details {
		logDetails[key] = value
	}

	message := fmt.Sprintf("Batch operation: %s [%s]", operation, status)
	al.WithCategory(CategoryBatch).Info(message, logDetails)
}

// LogScheduleOperation スケジュール操作をログ出力
func (al *AccountingLogger) LogScheduleOperation(scheduleID uuid.UUID, operation string, nextRun *time.Time, details map[string]interface{}) {
	logDetails := map[string]interface{}{
		"schedule_id": scheduleID.String(),
		"operation":   operation,
	}

	if nextRun != nil {
		logDetails["next_run"] = nextRun.Format(time.RFC3339)
	}

	// 追加詳細情報をマージ
	for key, value := range details {
		logDetails[key] = value
	}

	message := fmt.Sprintf("Schedule operation: %s", operation)
	al.WithCategory(CategorySchedule).Info(message, logDetails)
}

// LogAuditEvent 監査イベントをログ出力
func (al *AccountingLogger) LogAuditEvent(action string, resource string, resourceID *uuid.UUID, oldValue, newValue interface{}) {
	details := map[string]interface{}{
		"action":   action,
		"resource": resource,
	}

	if resourceID != nil {
		details["resource_id"] = resourceID.String()
	}

	if oldValue != nil {
		details["old_value"] = oldValue
	}

	if newValue != nil {
		details["new_value"] = newValue
	}

	message := fmt.Sprintf("Audit event: %s on %s", action, resource)
	al.WithCategory(CategoryAudit).Info(message, details)
}

// LogSecurityEvent セキュリティイベントをログ出力
func (al *AccountingLogger) LogSecurityEvent(event string, severity string, details map[string]interface{}) {
	logDetails := map[string]interface{}{
		"event":    event,
		"severity": severity,
	}

	// 追加詳細情報をマージ
	for key, value := range details {
		logDetails[key] = value
	}

	message := fmt.Sprintf("Security event: %s [%s]", event, severity)

	switch severity {
	case "critical", "high":
		al.WithCategory(CategorySecurity).Error(message, nil, logDetails)
	case "medium":
		al.WithCategory(CategorySecurity).Warn(message, logDetails)
	default:
		al.WithCategory(CategorySecurity).Info(message, logDetails)
	}
}

// LogPerformanceMetric パフォーマンス指標をログ出力
func (al *AccountingLogger) LogPerformanceMetric(operation string, duration time.Duration, details map[string]interface{}) {
	logDetails := map[string]interface{}{
		"operation":   operation,
		"duration_ms": duration.Milliseconds(),
		"duration_ns": duration.Nanoseconds(),
	}

	// 追加詳細情報をマージ
	for key, value := range details {
		logDetails[key] = value
	}

	message := fmt.Sprintf("Performance metric: %s (%dms)", operation, duration.Milliseconds())

	// パフォーマンス閾値チェック
	if duration.Milliseconds() > 5000 { // 5秒以上
		al.WithCategory(CategoryPerformance).Warn(message, logDetails)
	} else if duration.Milliseconds() > 1000 { // 1秒以上
		al.WithCategory(CategoryPerformance).Info(message, logDetails)
	} else {
		al.WithCategory(CategoryPerformance).Debug(message, logDetails)
	}
}

// LogDatabaseOperation データベース操作をログ出力
func (al *AccountingLogger) LogDatabaseOperation(operation string, table string, affectedRows int64, duration time.Duration, details map[string]interface{}) {
	logDetails := map[string]interface{}{
		"operation":     operation,
		"table":         table,
		"affected_rows": affectedRows,
		"duration_ms":   duration.Milliseconds(),
	}

	// 追加詳細情報をマージ
	for key, value := range details {
		logDetails[key] = value
	}

	message := fmt.Sprintf("Database operation: %s on %s", operation, table)
	al.WithCategory(CategoryDatabase).Debug(message, logDetails)
}

// LogEncryptionOperation 暗号化操作をログ出力
func (al *AccountingLogger) LogEncryptionOperation(operation string, dataType string, success bool, details map[string]interface{}) {
	logDetails := map[string]interface{}{
		"operation": operation,
		"data_type": dataType,
		"success":   success,
	}

	// 追加詳細情報をマージ（機密情報は除く）
	for key, value := range details {
		// 機密フィールドをフィルタリング
		if key != "token" && key != "password" && key != "secret" && key != "key" {
			logDetails[key] = value
		}
	}

	message := fmt.Sprintf("Encryption operation: %s for %s", operation, dataType)

	if success {
		al.WithCategory(CategoryEncryption).Debug(message, logDetails)
	} else {
		al.WithCategory(CategoryEncryption).Error(message, nil, logDetails)
	}
}

// AccountingLoggerMiddleware Gin用の経理ロガーミドルウェア
func AccountingLoggerMiddleware(baseLogger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// リクエストIDを生成/取得
		requestID := uuid.New().String()
		if existingID, exists := c.Get("request_id"); exists {
			if id, ok := existingID.(string); ok {
				requestID = id
			}
		}
		c.Set("request_id", requestID)

		// 経理ロガーを作成してコンテキストに設定
		accountingLogger := NewAccountingLoggerFromGin(c, baseLogger, CategoryAPI)
		c.Set("accounting_logger", accountingLogger)

		// リクエスト情報をログ出力
		accountingLogger.LogAPIRequest(c.Request.Method, c.Request.URL.Path, nil)

		// 次のハンドラーを実行
		c.Next()

		// レスポンス情報をログ出力
		duration := time.Since(start)
		accountingLogger.LogAPIResponse(c.Request.Method, c.Request.URL.Path, c.Writer.Status(), nil, duration)
	}
}

// GetAccountingLoggerFromGin Ginコンテキストから経理ロガーを取得
func GetAccountingLoggerFromGin(c *gin.Context) *AccountingLogger {
	if logger, exists := c.Get("accounting_logger"); exists {
		if accountingLogger, ok := logger.(*AccountingLogger); ok {
			return accountingLogger
		}
	}

	// フォールバック: 新しいロガーを作成
	return NewAccountingLoggerFromGin(c, nil, CategoryAPI)
}

// PerformanceTracker パフォーマンス追跡用ヘルパー
type PerformanceTracker struct {
	logger    *AccountingLogger
	operation string
	startTime time.Time
	details   map[string]interface{}
}

// NewPerformanceTracker 新しいパフォーマンストラッカーを作成
func (al *AccountingLogger) NewPerformanceTracker(operation string, details map[string]interface{}) *PerformanceTracker {
	return &PerformanceTracker{
		logger:    al,
		operation: operation,
		startTime: time.Now(),
		details:   details,
	}
}

// Finish パフォーマンス追跡を終了
func (pt *PerformanceTracker) Finish() {
	duration := time.Since(pt.startTime)
	pt.logger.LogPerformanceMetric(pt.operation, duration, pt.details)
}

// FinishWithDetails 詳細情報付きでパフォーマンス追跡を終了
func (pt *PerformanceTracker) FinishWithDetails(additionalDetails map[string]interface{}) {
	duration := time.Since(pt.startTime)

	// 詳細情報をマージ
	mergedDetails := make(map[string]interface{})
	for key, value := range pt.details {
		mergedDetails[key] = value
	}
	for key, value := range additionalDetails {
		mergedDetails[key] = value
	}

	pt.logger.LogPerformanceMetric(pt.operation, duration, mergedDetails)
}

// LogStructuredError 構造化エラーログを出力
func (al *AccountingLogger) LogStructuredError(err error, operation string, details map[string]interface{}) {
	if err == nil {
		return
	}

	logDetails := map[string]interface{}{
		"operation": operation,
	}

	// 詳細情報をマージ
	for key, value := range details {
		logDetails[key] = value
	}

	message := fmt.Sprintf("Operation failed: %s", operation)
	al.Error(message, err, logDetails)
}

// LogWithContext コンテキスト付きでログを出力
func (al *AccountingLogger) LogWithContext(ctx context.Context, level AccountingLogLevel, message string, details map[string]interface{}) {
	// コンテキストから追加情報を取得
	if ctx != nil {
		if requestID := ctx.Value("request_id"); requestID != nil {
			if rid, ok := requestID.(string); ok {
				al = al.WithRequestID(rid)
			}
		}

		if userID := ctx.Value("user_id"); userID != nil {
			if uid, ok := userID.(uuid.UUID); ok {
				al = al.WithUserID(uid)
			}
		}
	}

	switch level {
	case LevelDebug:
		al.Debug(message, details)
	case LevelInfo:
		al.Info(message, details)
	case LevelWarn:
		al.Warn(message, details)
	case LevelError:
		al.Error(message, nil, details)
	case LevelFatal:
		al.Fatal(message, nil, details)
	}
}
