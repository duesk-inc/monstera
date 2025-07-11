# 共通パッケージ仕様書

## 概要

本ドキュメントはバックエンドシステムで使用する共通パッケージの設計と実装方法を定義します。

## パッケージ構成

```
internal/
├── common/
│   ├── logger/          # ログ機能
│   ├── database/        # データベース接続・設定
│   ├── transaction/     # トランザクション管理
│   ├── validation/      # バリデーション
│   ├── errors/          # エラーハンドリング
│   ├── auth/            # 認証・認可
│   ├── middleware/      # ミドルウェア
│   ├── utils/           # ユーティリティ
│   └── config/          # 設定管理
├── message/             # メッセージ一元管理
│   ├── common.go        # 共通メッセージ
│   ├── error_codes.go   # エラーコード定義
│   ├── auth.go          # 認証関連メッセージ
│   ├── profile.go       # プロフィール関連メッセージ
│   ├── leave.go         # 休暇関連メッセージ
│   └── weekly_report.go # 週報関連メッセージ
```

## 1. ログパッケージ

### 実装

```go
// internal/common/logger/logger.go
package logger

import (
    "fmt"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

type Logger struct {
    *zap.Logger
}

func NewLogger(level string, isDevelopment bool) (*Logger, error) {
    var config zap.Config
    
    if isDevelopment {
        config = zap.NewDevelopmentConfig()
        config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
    } else {
        config = zap.NewProductionConfig()
        config.EncoderConfig.TimeKey = "timestamp"
        config.EncoderConfig.EncodeTime = zapcore.RFC3339TimeEncoder
    }
    
    // ログレベルの設定
    switch level {
    case "debug":
        config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
    case "info":
        config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
    case "warn":
        config.Level = zap.NewAtomicLevelAt(zap.WarnLevel)
    case "error":
        config.Level = zap.NewAtomicLevelAt(zap.ErrorLevel)
    default:
        config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
    }
    
    zapLogger, err := config.Build()
    if err != nil {
        return nil, fmt.Errorf("ログの初期化に失敗しました: %w", err)
    }
    
    return &Logger{Logger: zapLogger}, nil
}

// 構造化ログのヘルパー関数
func LogInfo(logger *zap.Logger, message string, fields ...zap.Field) {
    if logger != nil {
        logger.Info(message, fields...)
    }
}

func LogError(logger *zap.Logger, message string, err error, fields ...zap.Field) {
    if logger != nil {
        allFields := append(fields, zap.Error(err))
        logger.Error(message, allFields...)
    }
}

func LogWarn(logger *zap.Logger, message string, fields ...zap.Field) {
    if logger != nil {
        logger.Warn(message, fields...)
    }
}

func LogDebug(logger *zap.Logger, message string, fields ...zap.Field) {
    if logger != nil {
        logger.Debug(message, fields...)
    }
}

// エラーのラッピングとログ記録
func LogAndWrapError(logger *zap.Logger, err error, message string, fields ...zap.Field) error {
    if logger != nil {
        allFields := append(fields, zap.Error(err))
        logger.Error(message, allFields...)
    }
    return fmt.Errorf("%s: %w", message, err)
}

// リクエストコンテキスト用のフィールド
func RequestFields(method, path, userID string) []zap.Field {
    return []zap.Field{
        zap.String("method", method),
        zap.String("path", path),
        zap.String("user_id", userID),
    }
}
```

## 2. データベースパッケージ

### 実装

```go
// internal/common/database/database.go
package database

import (
    "fmt"
    "time"
    
    "gorm.io/driver/mysql"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
    "go.uber.org/zap"
)

type Config struct {
    Host     string `env:"DB_HOST" envDefault:"localhost"`
    Port     int    `env:"DB_PORT" envDefault:"3306"`
    User     string `env:"DB_USER" envDefault:"monstera"`
    Password string `env:"DB_PASSWORD" envDefault:"password"`
    DBName   string `env:"DB_NAME" envDefault:"monstera"`
    
    MaxOpenConns int           `env:"DB_MAX_OPEN_CONNS" envDefault:"25"`
    MaxIdleConns int           `env:"DB_MAX_IDLE_CONNS" envDefault:"5"`
    MaxLifetime  time.Duration `env:"DB_MAX_LIFETIME" envDefault:"5m"`
}

func NewConnection(config Config, zapLogger *zap.Logger) (*gorm.DB, error) {
    // データソース名の構築（MySQL形式）
    dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&collation=utf8mb4_0900_ai_ci&parseTime=True&loc=Local",
        config.User, config.Password, config.Host, config.Port, config.DBName)
    
    // GORM設定
    gormConfig := &gorm.Config{
        Logger: NewGormLogger(zapLogger),
        NowFunc: func() time.Time {
            return time.Now().UTC()
        },
    }
    
    // データベース接続
    db, err := gorm.Open(mysql.Open(dsn), gormConfig)
    if err != nil {
        return nil, fmt.Errorf("データベース接続に失敗しました: %w", err)
    }
    
    // コネクションプールの設定
    sqlDB, err := db.DB()
    if err != nil {
        return nil, fmt.Errorf("データベースインスタンスの取得に失敗しました: %w", err)
    }
    
    sqlDB.SetMaxOpenConns(config.MaxOpenConns)
    sqlDB.SetMaxIdleConns(config.MaxIdleConns)
    sqlDB.SetConnMaxLifetime(config.MaxLifetime)
    
    // 接続確認
    if err := sqlDB.Ping(); err != nil {
        return nil, fmt.Errorf("データベースとの疎通確認に失敗しました: %w", err)
    }
    
    zapLogger.Info("データベース接続が確立されました",
        zap.String("host", config.Host),
        zap.Int("port", config.Port),
        zap.String("database", config.DBName))
    
    return db, nil
}

// GORMのカスタムログ
type GormLogger struct {
    ZapLogger *zap.Logger
}

func NewGormLogger(zapLogger *zap.Logger) *GormLogger {
    return &GormLogger{ZapLogger: zapLogger}
}

func (l *GormLogger) LogMode(level logger.LogLevel) logger.Interface {
    return l
}

func (l *GormLogger) Info(ctx context.Context, msg string, data ...interface{}) {
    l.ZapLogger.Info(msg, zap.Any("data", data))
}

func (l *GormLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
    l.ZapLogger.Warn(msg, zap.Any("data", data))
}

func (l *GormLogger) Error(ctx context.Context, msg string, data ...interface{}) {
    l.ZapLogger.Error(msg, zap.Any("data", data))
}

func (l *GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
    elapsed := time.Since(begin)
    sql, rows := fc()
    
    fields := []zap.Field{
        zap.Duration("elapsed", elapsed),
        zap.String("sql", sql),
        zap.Int64("rows", rows),
    }
    
    if err != nil {
        fields = append(fields, zap.Error(err))
        l.ZapLogger.Error("SQL実行エラー", fields...)
    } else {
        l.ZapLogger.Debug("SQL実行", fields...)
    }
}
```

## 3. トランザクション管理パッケージ

### 実装

```go
// internal/common/transaction/manager.go
package transaction

import (
    "context"
    "fmt"
    
    "gorm.io/gorm"
    "go.uber.org/zap"
)

type TransactionManager interface {
    ExecuteInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error
}

type transactionManager struct {
    db     *gorm.DB
    logger *zap.Logger
}

func NewTransactionManager(db *gorm.DB, logger *zap.Logger) TransactionManager {
    return &transactionManager{
        db:     db,
        logger: logger,
    }
}

func (tm *transactionManager) ExecuteInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
    return tm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        if tm.logger != nil {
            tm.logger.Debug("トランザクション開始")
        }
        
        err := fn(tx)
        
        if err != nil {
            if tm.logger != nil {
                tm.logger.Warn("トランザクションロールバック", zap.Error(err))
            }
            return err
        }
        
        if tm.logger != nil {
            tm.logger.Debug("トランザクションコミット")
        }
        
        return nil
    })
}

// 読み取り専用トランザクション
func (tm *transactionManager) ExecuteInReadOnlyTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
    return tm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        // 読み取り専用設定
        if err := tx.Exec("SET TRANSACTION READ ONLY").Error; err != nil {
            return fmt.Errorf("読み取り専用トランザクションの設定に失敗しました: %w", err)
        }
        
        return fn(tx)
    })
}

// 分離レベル指定のトランザクション
func (tm *transactionManager) ExecuteWithIsolationLevel(ctx context.Context, level string, fn func(tx *gorm.DB) error) error {
    return tm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        // 分離レベルの設定
        sql := fmt.Sprintf("SET TRANSACTION ISOLATION LEVEL %s", level)
        if err := tx.Exec(sql).Error; err != nil {
            return fmt.Errorf("分離レベルの設定に失敗しました: %w", err)
        }
        
        return fn(tx)
    })
}
```

## 4. バリデーションパッケージ

### 実装

```go
// internal/common/validation/validator.go
package validation

import (
    "fmt"
    "reflect"
    "strings"
    
    "github.com/go-playground/validator/v10"
    "github.com/google/uuid"
)

type CustomValidator struct {
    validator *validator.Validate
}

func NewValidator() *CustomValidator {
    v := validator.New()
    
    // カスタムバリデーションルールの登録
    v.RegisterValidation("uuid", validateUUID)
    v.RegisterValidation("password", validatePassword)
    v.RegisterValidation("username", validateUsername)
    
    // JSONタグ名を使用するようにカスタマイズ
    v.RegisterTagNameFunc(func(fld reflect.StructField) string {
        name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
        if name == "-" {
            return ""
        }
        return name
    })
    
    return &CustomValidator{validator: v}
}

func (cv *CustomValidator) Validate(i interface{}) error {
    return cv.validator.Struct(i)
}

// カスタムバリデーション関数
func validateUUID(fl validator.FieldLevel) bool {
    uuidStr := fl.Field().String()
    _, err := uuid.Parse(uuidStr)
    return err == nil
}

func validatePassword(fl validator.FieldLevel) bool {
    password := fl.Field().String()
    
    // 最小8文字、最大128文字
    if len(password) < 8 || len(password) > 128 {
        return false
    }
    
    hasUpper, hasLower, hasDigit, hasSpecial := false, false, false, false
    
    for _, char := range password {
        switch {
        case 'A' <= char && char <= 'Z':
            hasUpper = true
        case 'a' <= char && char <= 'z':
            hasLower = true
        case '0' <= char && char <= '9':
            hasDigit = true
        case strings.ContainsRune("!@#$%^&*()_+-=[]{}|;:,.<>?", char):
            hasSpecial = true
        }
    }
    
    return hasUpper && hasLower && hasDigit && hasSpecial
}

func validateUsername(fl validator.FieldLevel) bool {
    username := fl.Field().String()
    
    // 3文字以上30文字以下
    if len(username) < 3 || len(username) > 30 {
        return false
    }
    
    // 英数字とアンダースコアのみ
    for _, char := range username {
        if !((char >= 'a' && char <= 'z') || 
             (char >= 'A' && char <= 'Z') || 
             (char >= '0' && char <= '9') || 
             char == '_') {
            return false
        }
    }
    
    return true
}

// バリデーションエラーの詳細メッセージ生成
func (cv *CustomValidator) GetValidationErrors(err error) map[string]string {
    errors := make(map[string]string)
    
    if validationErrors, ok := err.(validator.ValidationErrors); ok {
        for _, fieldError := range validationErrors {
            errors[fieldError.Field()] = getErrorMessage(fieldError)
        }
    }
    
    return errors
}

func getErrorMessage(fieldError validator.FieldError) string {
    field := fieldError.Field()
    tag := fieldError.Tag()
    param := fieldError.Param()
    
    switch tag {
    case "required":
        return fmt.Sprintf("%sは必須項目です", field)
    case "email":
        return fmt.Sprintf("%sは有効なメールアドレスを入力してください", field)
    case "min":
        return fmt.Sprintf("%sは最小%s文字以上入力してください", field, param)
    case "max":
        return fmt.Sprintf("%sは最大%s文字以下で入力してください", field, param)
    case "uuid":
        return fmt.Sprintf("%sは有効なUUID形式で入力してください", field)
    case "password":
        return fmt.Sprintf("%sは8文字以上で、大文字・小文字・数字・特殊文字を含む必要があります", field)
    case "username":
        return fmt.Sprintf("%sは3-30文字で、英数字とアンダースコアのみ使用可能です", field)
    default:
        return fmt.Sprintf("%sの入力値が不正です", field)
    }
}
```

## 5. エラーハンドリングパッケージ

### 実装

```go
// internal/common/errors/errors.go
package errors

import (
    "fmt"
    "net/http"
)

// カスタムエラータイプ
type AppError struct {
    Code       string `json:"code"`
    Message    string `json:"message"`
    StatusCode int    `json:"-"`
    Cause      error  `json:"-"`
}

func (e *AppError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("%s: %s", e.Message, e.Cause.Error())
    }
    return e.Message
}

func (e *AppError) Unwrap() error {
    return e.Cause
}

// 事前定義されたエラー
var (
    // 認証関連
    ErrUnauthorized = &AppError{
        Code:       "UNAUTHORIZED",
        Message:    "認証が必要です",
        StatusCode: http.StatusUnauthorized,
    }
    
    ErrForbidden = &AppError{
        Code:       "FORBIDDEN",
        Message:    "この操作を実行する権限がありません",
        StatusCode: http.StatusForbidden,
    }
    
    // データ関連
    ErrNotFound = &AppError{
        Code:       "NOT_FOUND",
        Message:    "指定されたリソースが見つかりません",
        StatusCode: http.StatusNotFound,
    }
    
    ErrConflict = &AppError{
        Code:       "CONFLICT",
        Message:    "データの競合が発生しました",
        StatusCode: http.StatusConflict,
    }
    
    // バリデーション関連
    ErrValidation = &AppError{
        Code:       "VALIDATION_ERROR",
        Message:    "入力値に誤りがあります",
        StatusCode: http.StatusBadRequest,
    }
    
    // システム関連
    ErrInternal = &AppError{
        Code:       "INTERNAL_ERROR",
        Message:    "内部エラーが発生しました",
        StatusCode: http.StatusInternalServerError,
    }
)

// エラー生成関数
func NewAppError(code, message string, statusCode int, cause error) *AppError {
    return &AppError{
        Code:       code,
        Message:    message,
        StatusCode: statusCode,
        Cause:      cause,
    }
}

func NewValidationError(message string, cause error) *AppError {
    return &AppError{
        Code:       "VALIDATION_ERROR",
        Message:    message,
        StatusCode: http.StatusBadRequest,
        Cause:      cause,
    }
}

func NewNotFoundError(resource string) *AppError {
    return &AppError{
        Code:       "NOT_FOUND",
        Message:    fmt.Sprintf("%sが見つかりません", resource),
        StatusCode: http.StatusNotFound,
    }
}

func NewUnauthorizedError(message string) *AppError {
    return &AppError{
        Code:       "UNAUTHORIZED",
        Message:    message,
        StatusCode: http.StatusUnauthorized,
    }
}

func NewForbiddenError(message string) *AppError {
    return &AppError{
        Code:       "FORBIDDEN",
        Message:    message,
        StatusCode: http.StatusForbidden,
    }
}

func NewInternalError(message string, cause error) *AppError {
    return &AppError{
        Code:       "INTERNAL_ERROR",
        Message:    message,
        StatusCode: http.StatusInternalServerError,
        Cause:      cause,
    }
}

// エラーの判定関数
func IsAppError(err error) (*AppError, bool) {
    if appErr, ok := err.(*AppError); ok {
        return appErr, true
    }
    return nil, false
}

func IsNotFoundError(err error) bool {
    if appErr, ok := IsAppError(err); ok {
        return appErr.Code == "NOT_FOUND"
    }
    return false
}

func IsValidationError(err error) bool {
    if appErr, ok := IsAppError(err); ok {
        return appErr.Code == "VALIDATION_ERROR"
    }
    return false
}

func IsUnauthorizedError(err error) bool {
    if appErr, ok := IsAppError(err); ok {
        return appErr.Code == "UNAUTHORIZED"
    }
    return false
}
```

## 6. ユーティリティパッケージ

### 実装

```go
// internal/common/utils/utils.go
package utils

import (
    "crypto/rand"
    "encoding/hex"
    "regexp"
    "strings"
    "time"
    
    "github.com/google/uuid"
)

// UUID関連
func NewID() uuid.UUID {
    return uuid.New()
}

func ValidateUUID(uuidStr string) error {
    _, err := uuid.Parse(uuidStr)
    return err
}

func UUIDFromString(uuidStr string) (uuid.UUID, error) {
    return uuid.Parse(uuidStr)
}

// 文字列操作
func TrimAndLower(s string) string {
    return strings.ToLower(strings.TrimSpace(s))
}

func IsEmpty(s string) bool {
    return strings.TrimSpace(s) == ""
}

func IsValidEmail(email string) bool {
    emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
    return emailRegex.MatchString(email)
}

// ランダム文字列生成
func GenerateRandomString(length int) (string, error) {
    bytes := make([]byte, length/2)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    return hex.EncodeToString(bytes)[:length], nil
}

// 時間関連
func TimePtr(t time.Time) *time.Time {
    return &t
}

func FormatTime(t time.Time) string {
    return t.Format(time.RFC3339)
}

func ParseTime(timeStr string) (time.Time, error) {
    return time.Parse(time.RFC3339, timeStr)
}

// スライス操作
func Contains(slice []string, item string) bool {
    for _, s := range slice {
        if s == item {
            return true
        }
    }
    return false
}

func ContainsUUID(slice []uuid.UUID, item uuid.UUID) bool {
    for _, id := range slice {
        if id == item {
            return true
        }
    }
    return false
}

func RemoveDuplicates(slice []string) []string {
    keys := make(map[string]bool)
    result := []string{}
    
    for _, item := range slice {
        if !keys[item] {
            keys[item] = true
            result = append(result, item)
        }
    }
    
    return result
}

// ポインター操作
func StringPtr(s string) *string {
    return &s
}

func IntPtr(i int) *int {
    return &i
}

func BoolPtr(b bool) *bool {
    return &b
}

func StringValue(s *string) string {
    if s == nil {
        return ""
    }
    return *s
}

func IntValue(i *int) int {
    if i == nil {
        return 0
    }
    return *i
}

func BoolValue(b *bool) bool {
    if b == nil {
        return false
    }
    return *b
}

// ページネーション
type PaginationParams struct {
    Page  int
    Limit int
}

func (p PaginationParams) Offset() int {
    return (p.Page - 1) * p.Limit
}

func (p PaginationParams) Validate() error {
    if p.Page < 1 {
        return fmt.Errorf("ページ番号は1以上である必要があります")
    }
    if p.Limit < 1 || p.Limit > 100 {
        return fmt.Errorf("件数は1-100の範囲で指定してください")
    }
    return nil
}

type PaginationResult struct {
    Total      int `json:"total"`
    Page       int `json:"page"`
    Limit      int `json:"limit"`
    TotalPages int `json:"total_pages"`
}

func NewPaginationResult(total, page, limit int) PaginationResult {
    totalPages := (total + limit - 1) / limit
    return PaginationResult{
        Total:      total,
        Page:       page,
        Limit:      limit,
        TotalPages: totalPages,
    }
}
```

## 7. メッセージ管理パッケージ

### 概要

メッセージ管理パッケージは、システム全体で使用されるメッセージ（エラーメッセージ、成功メッセージ、確認メッセージなど）を一元管理します。これにより、一貫性のあるメッセージ表示と将来的な多言語対応を可能にします。

### 設計原則

1. **一元管理**: すべてのメッセージを単一のパッケージで管理
2. **構造化**: メッセージの種類と機能ドメインによる体系的な分類
3. **保守性**: メッセージの追加・変更が容易な構造
4. **国際化対応**: 将来的な多言語対応を考慮した設計
5. **型安全性**: エラーコードの型定義による安全な使用

### パッケージ構成

```
internal/message/
├── common.go        # 共通メッセージ定義
├── error_codes.go   # エラーコード定義
├── auth.go          # 認証関連メッセージ
├── profile.go       # プロフィール関連メッセージ
├── leave.go         # 休暇関連メッセージ
└── weekly_report.go # 週報関連メッセージ
```

### 実装

#### エラーコード定義 (error_codes.go)

```go
package message

// ErrorCode エラーコードの型定義
type ErrorCode string

// エラーコード定義
const (
    // 認証・認可関連 (AUTH_XXX)
    ErrCodeUnauthorized       ErrorCode = "AUTH_001"
    ErrCodeInvalidCredentials ErrorCode = "AUTH_002"
    
    // バリデーション関連 (VAL_XXX)
    ErrCodeInvalidRequest     ErrorCode = "VAL_001"
    ErrCodeInvalidFormat      ErrorCode = "VAL_002"
    
    // システムエラー (SYS_XXX)
    ErrCodeInternalError      ErrorCode = "SYS_001"
    ErrCodeDatabaseError      ErrorCode = "SYS_002"
)

// AppError アプリケーションエラー構造体
type AppError struct {
    Code       ErrorCode         `json:"code"`
    Message    string            `json:"message"`
    StatusCode int               `json:"-"`
    Details    map[string]string `json:"details,omitempty"`
    Timestamp  string            `json:"timestamp"`
    RequestID  string            `json:"request_id,omitempty"`
}
```

#### 共通メッセージ定義 (common.go)

```go
package message

// 共通エラーメッセージ
const (
    MsgUnauthorized       = "認証が必要です"
    MsgInvalidRequest     = "無効なリクエストデータです"
    MsgInternalServerError = "サーバー内部エラーが発生しました"
    MsgNotFound           = "リソースが見つかりません"
)

// 成功メッセージ
const (
    MsgSuccess = "正常に処理されました"
    MsgCreated = "正常に作成されました"
    MsgUpdated = "正常に更新されました"
    MsgDeleted = "正常に削除されました"
)

// フォーマット関数
func FormatNotFound(resource string) string {
    return fmt.Sprintf("%sが見つかりません", resource)
}

func FormatCreated(resource string) string {
    return fmt.Sprintf("%sが正常に作成されました", resource)
}
```

### 使用方法

#### ハンドラーでの使用例

```go
import "github.com/duesk/monstera/internal/message"

// 従来の方法
RespondError(c, http.StatusUnauthorized, "認証が必要です")

// 新しい方法
RespondError(c, http.StatusUnauthorized, message.MsgUnauthorized)

// エラーコード付き
RespondErrorWithCode(c, message.ErrCodeUnauthorized, message.MsgUnauthorized)
```

#### エラーハンドリングユーティリティ

handler_util.goに以下の新しい関数が追加されています：

```go
// RespondErrorWithCode エラーコード付きのエラーレスポンスを返す
func RespondErrorWithCode(c *gin.Context, errorCode message.ErrorCode, message string, details ...map[string]string)

// RespondValidationError バリデーションエラーレスポンスを返す
func RespondValidationError(c *gin.Context, errors map[string]string)

// RespondNotFound リソースが見つからない場合のレスポンスを返す
func RespondNotFound(c *gin.Context, resource string)

// RespondUnauthorized 認証エラーレスポンスを返す
func RespondUnauthorized(c *gin.Context)
```

### エラーレスポンス形式

```json
{
    "error": "認証が必要です",
    "code": "AUTH_001",
    "timestamp": "2024-01-01T00:00:00Z",
    "request_id": "123e4567-e89b-12d3-a456-426614174000",
    "details": {
        "field": "詳細情報"
    }
}
```

### 移行戦略

#### Phase 1: 基盤構築と新規実装での利用（現在）
- メッセージパッケージの作成 ✓
- 新規実装でのメッセージパッケージ利用
- ハンドラーユーティリティの拡張 ✓

#### Phase 2: 既存コードの段階的リファクタリング
- 機能単位での既存メッセージの移行
- テストコードの更新

#### Phase 3: 多言語対応の基盤追加
- メッセージキーベースの実装への移行
- 言語ファイルの分離

#### Phase 4: エラーコードベースの統一的なエラーハンドリング
- すべてのエラーレスポンスをエラーコード付きに統一
- APIドキュメントの自動生成対応

### ベストプラクティス

1. **一貫性の確保**
   - 同じ意味のメッセージは必ず同じ定数を使用
   - 新しいメッセージは適切なファイルに追加

2. **命名規則**
   - エラーメッセージ: `Msg<内容>`
   - エラーコード: `ErrCode<内容>`
   - フォーマット関数: `Format<操作>`

3. **ドメイン分離**
   - 機能ごとに専用のメッセージファイルを作成
   - 共通メッセージはcommon.goに配置

4. **エラーコード体系**
   - カテゴリプレフィックス（AUTH, VAL, RES, BIZ, SYS, DAT）
   - 連番による管理（001, 002, ...）

## 8. 設定管理パッケージ

### 実装

```go
// internal/common/config/config.go
package config

import (
    "fmt"
    "os"
    "strconv"
    "time"
)

type Config struct {
    // サーバー設定
    Server ServerConfig `json:"server"`
    
    // データベース設定
    Database DatabaseConfig `json:"database"`
    
    // JWT設定
    JWT JWTConfig `json:"jwt"`
    
    // ログ設定
    Log LogConfig `json:"log"`
    
    // その他
    Environment string `env:"ENVIRONMENT" envDefault:"development"`
    Debug       bool   `env:"DEBUG" envDefault:"false"`
}

type ServerConfig struct {
    Port         int           `env:"PORT" envDefault:"8080"`
    Host         string        `env:"HOST" envDefault:"0.0.0.0"`
    ReadTimeout  time.Duration `env:"READ_TIMEOUT" envDefault:"30s"`
    WriteTimeout time.Duration `env:"WRITE_TIMEOUT" envDefault:"30s"`
    IdleTimeout  time.Duration `env:"IDLE_TIMEOUT" envDefault:"120s"`
}

type DatabaseConfig struct {
    Host     string `env:"DB_HOST" envDefault:"localhost"`
    Port     int    `env:"DB_PORT" envDefault:"3306"`
    User     string `env:"DB_USER" envDefault:"monstera"`
    Password string `env:"DB_PASSWORD" envDefault:"password"`
    DBName   string `env:"DB_NAME" envDefault:"monstera"`
    
    MaxOpenConns int           `env:"DB_MAX_OPEN_CONNS" envDefault:"25"`
    MaxIdleConns int           `env:"DB_MAX_IDLE_CONNS" envDefault:"5"`
    MaxLifetime  time.Duration `env:"DB_MAX_LIFETIME" envDefault:"5m"`
}

type JWTConfig struct {
    AccessSecret     string        `env:"JWT_ACCESS_SECRET" envDefault:"your-access-secret"`
    RefreshSecret    string        `env:"JWT_REFRESH_SECRET" envDefault:"your-refresh-secret"`
    AccessExpiresIn  time.Duration `env:"JWT_ACCESS_EXPIRES_IN" envDefault:"1h"`
    RefreshExpiresIn time.Duration `env:"JWT_REFRESH_EXPIRES_IN" envDefault:"168h"` // 7日
}

type LogConfig struct {
    Level       string `env:"LOG_LEVEL" envDefault:"info"`
    Development bool   `env:"LOG_DEVELOPMENT" envDefault:"true"`
    OutputPath  string `env:"LOG_OUTPUT_PATH" envDefault:"stdout"`
}

func Load() (*Config, error) {
    config := &Config{}
    
    // 環境変数から設定を読み込み
    if err := loadFromEnv(config); err != nil {
        return nil, fmt.Errorf("設定の読み込みに失敗しました: %w", err)
    }
    
    // バリデーション
    if err := validate(config); err != nil {
        return nil, fmt.Errorf("設定の検証に失敗しました: %w", err)
    }
    
    return config, nil
}

func loadFromEnv(config *Config) error {
    // Server設定
    config.Server.Port = getEnvAsInt("PORT", 8080)
    config.Server.Host = getEnv("HOST", "0.0.0.0")
    config.Server.ReadTimeout = getEnvAsDuration("READ_TIMEOUT", 30*time.Second)
    config.Server.WriteTimeout = getEnvAsDuration("WRITE_TIMEOUT", 30*time.Second)
    config.Server.IdleTimeout = getEnvAsDuration("IDLE_TIMEOUT", 120*time.Second)
    
    // Database設定
    config.Database.Host = getEnv("DB_HOST", "localhost")
    config.Database.Port = getEnvAsInt("DB_PORT", 3306)
    config.Database.User = getEnv("DB_USER", "monstera")
    config.Database.Password = getEnv("DB_PASSWORD", "password")
    config.Database.DBName = getEnv("DB_NAME", "monstera")
    config.Database.MaxOpenConns = getEnvAsInt("DB_MAX_OPEN_CONNS", 25)
    config.Database.MaxIdleConns = getEnvAsInt("DB_MAX_IDLE_CONNS", 5)
    config.Database.MaxLifetime = getEnvAsDuration("DB_MAX_LIFETIME", 5*time.Minute)
    
    // JWT設定
    config.JWT.AccessSecret = getEnv("JWT_ACCESS_SECRET", "your-access-secret")
    config.JWT.RefreshSecret = getEnv("JWT_REFRESH_SECRET", "your-refresh-secret")
    config.JWT.AccessExpiresIn = getEnvAsDuration("JWT_ACCESS_EXPIRES_IN", time.Hour)
    config.JWT.RefreshExpiresIn = getEnvAsDuration("JWT_REFRESH_EXPIRES_IN", 168*time.Hour)
    
    // Log設定
    config.Log.Level = getEnv("LOG_LEVEL", "info")
    config.Log.Development = getEnvAsBool("LOG_DEVELOPMENT", true)
    config.Log.OutputPath = getEnv("LOG_OUTPUT_PATH", "stdout")
    
    // その他
    config.Environment = getEnv("ENVIRONMENT", "development")
    config.Debug = getEnvAsBool("DEBUG", false)
    
    return nil
}

func validate(config *Config) error {
    if config.Server.Port <= 0 || config.Server.Port > 65535 {
        return fmt.Errorf("無効なポート番号です: %d", config.Server.Port)
    }
    
    if config.Database.Host == "" {
        return fmt.Errorf("データベースホストが設定されていません")
    }
    
    if config.JWT.AccessSecret == "" || config.JWT.RefreshSecret == "" {
        return fmt.Errorf("JWTシークレットが設定されていません")
    }
    
    return nil
}

// ヘルパー関数
func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intValue, err := strconv.Atoi(value); err == nil {
            return intValue
        }
    }
    return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
    if value := os.Getenv(key); value != "" {
        if boolValue, err := strconv.ParseBool(value); err == nil {
            return boolValue
        }
    }
    return defaultValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
    if value := os.Getenv(key); value != "" {
        if duration, err := time.ParseDuration(value); err == nil {
            return duration
        }
    }
    return defaultValue
}

// 開発環境判定
func (c *Config) IsDevelopment() bool {
    return c.Environment == "development"
}

func (c *Config) IsProduction() bool {
    return c.Environment == "production"
}

func (c *Config) IsTest() bool {
    return c.Environment == "test"
}
```

## 使用例

### 依存性の初期化

```go
// main.go
func main() {
    // 設定の読み込み
    config, err := config.Load()
    if err != nil {
        log.Fatal("設定の読み込みに失敗しました:", err)
    }
    
    // ログの初期化
    logger, err := logger.NewLogger(config.Log.Level, config.Log.Development)
    if err != nil {
        log.Fatal("ログの初期化に失敗しました:", err)
    }
    defer logger.Sync()
    
    // データベース接続
    db, err := database.NewConnection(config.Database, logger.Logger)
    if err != nil {
        logger.Fatal("データベース接続に失敗しました", zap.Error(err))
    }
    
    // バリデーターの初期化
    validator := validation.NewValidator()
    
    // トランザクションマネージャーの初期化
    txManager := transaction.NewTransactionManager(db, logger.Logger)
    
    // アプリケーションの起動
    app := NewApp(config, logger.Logger, db, validator, txManager)
    app.Run()
}
```

---

## 関連ドキュメント

- [バックエンド仕様書](./backend-specification.md)
- [ハンドラー実装仕様書](./backend-handler-implementation.md)
- [サービス実装仕様書](./backend-service-implementation.md)
- [リポジトリ実装仕様書](./backend-repository-implementation.md)
- [認証実装仕様書](./backend-auth-implementation.md)
- [テスト実装ガイド](./backend-testing-guide.md) 