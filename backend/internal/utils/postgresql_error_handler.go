package utils

import (
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/message"
)

// PostgreSQLErrorHandler PostgreSQL専用のエラーハンドラー
type PostgreSQLErrorHandler struct {
	logger *zap.Logger
}

// NewPostgreSQLErrorHandler 新しいPostgreSQLエラーハンドラーを作成
func NewPostgreSQLErrorHandler(logger *zap.Logger) *PostgreSQLErrorHandler {
	return &PostgreSQLErrorHandler{
		logger: logger,
	}
}

// HandleDatabaseError データベースエラーをアプリケーションエラーコードに変換
func (h *PostgreSQLErrorHandler) HandleDatabaseError(err error) message.ErrorCode {
	if err == nil {
		return ""
	}

	// GORM標準エラーの処理
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return message.ErrCodeNotFound
	}

	// PostgreSQL固有エラーの処理
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return h.handlePostgreSQLError(pgErr)
	}

	// 文字列ベースのエラー検出（フォールバック）
	return h.handleErrorByMessage(err.Error())
}

// handlePostgreSQLError PostgreSQL固有のエラーコード（SQLSTATE）を処理
func (h *PostgreSQLErrorHandler) handlePostgreSQLError(pgErr *pgconn.PgError) message.ErrorCode {
	h.logger.Debug("PostgreSQL error",
		zap.String("code", pgErr.Code),
		zap.String("message", pgErr.Message),
		zap.String("detail", pgErr.Detail),
		zap.String("constraint", pgErr.ConstraintName),
		zap.String("table", pgErr.TableName),
		zap.String("column", pgErr.ColumnName),
	)

	// PostgreSQL SQLSTATEコードによる分類
	// https://www.postgresql.org/docs/current/errcodes-appendix.html
	switch pgErr.Code {
	// Class 23 - Integrity Constraint Violation
	case "23505": // unique_violation
		return message.ErrCodeAlreadyExists
	case "23503": // foreign_key_violation
		return message.ErrCodeDependencyExists
	case "23502": // not_null_violation
		return message.ErrCodeValidation
	case "23514": // check_violation
		return message.ErrCodeValidation
	case "23P01": // exclusion_violation
		return message.ErrCodeConflict

	// Class 22 - Data Exception
	case "22001": // string_data_right_truncation
		return message.ErrCodeDataTooLong
	case "22003": // numeric_value_out_of_range
		return message.ErrCodeValueOutOfRange
	case "22007": // invalid_datetime_format
		return message.ErrCodeInvalidFormat
	case "22P02": // invalid_text_representation
		return message.ErrCodeInvalidFormat

	// Class 40 - Transaction Rollback
	case "40001": // serialization_failure
		return message.ErrCodeConcurrencyError
	case "40P01": // deadlock_detected
		return message.ErrCodeDeadlock

	// Class 42 - Syntax Error or Access Rule Violation
	case "42601": // syntax_error
		return message.ErrCodeInvalidQuery
	case "42703": // undefined_column
		return message.ErrCodeInvalidField
	case "42P01": // undefined_table
		return message.ErrCodeInvalidTable
	case "42883": // undefined_function
		return message.ErrCodeInvalidFunction

	// Class 53 - Insufficient Resources
	case "53000": // insufficient_resources
		return message.ErrCodeResourceExhausted
	case "53100": // disk_full
		return message.ErrCodeStorageFull
	case "53200": // out_of_memory
		return message.ErrCodeMemoryExhausted
	case "53300": // too_many_connections
		return message.ErrCodeTooManyConnections

	// Class 54 - Program Limit Exceeded
	case "54000": // program_limit_exceeded
		return message.ErrCodeLimitExceeded

	// Class 55 - Object Not In Prerequisite State
	case "55000": // object_not_in_prerequisite_state
		return message.ErrCodeInvalidState
	case "55006": // object_in_use
		return message.ErrCodeResourceBusy
	case "55P03": // lock_not_available
		return message.ErrCodeLockTimeout

	// Class 57 - Operator Intervention
	case "57014": // query_canceled
		return message.ErrCodeCanceled
	case "57P01": // admin_shutdown
		return message.ErrCodeUnavailable
	case "57P02": // crash_shutdown
		return message.ErrCodeUnavailable
	case "57P03": // cannot_connect_now
		return message.ErrCodeConnectionFailed

	// Class 58 - System Error
	case "58000": // system_error
		return message.ErrCodeInternal
	case "58030": // io_error
		return message.ErrCodeIOError

	// Class 08 - Connection Exception
	case "08000": // connection_exception
		return message.ErrCodeConnectionFailed
	case "08003": // connection_does_not_exist
		return message.ErrCodeConnectionClosed
	case "08006": // connection_failure
		return message.ErrCodeConnectionFailed
	case "08001": // sqlclient_unable_to_establish_sqlconnection
		return message.ErrCodeConnectionFailed
	case "08004": // sqlserver_rejected_establishment_of_sqlconnection
		return message.ErrCodeAuthenticationFailed

	// Class 28 - Invalid Authorization Specification
	case "28000": // invalid_authorization_specification
		return message.ErrCodeAuthenticationFailed
	case "28P01": // invalid_password
		return message.ErrCodeInvalidCredentials

	default:
		// その他のエラーコード
		if strings.HasPrefix(pgErr.Code, "23") {
			return message.ErrCodeConstraintViolation
		}
		if strings.HasPrefix(pgErr.Code, "22") {
			return message.ErrCodeDataException
		}
		if strings.HasPrefix(pgErr.Code, "42") {
			return message.ErrCodeSyntaxError
		}
		return message.ErrCodeDatabase
	}
}

// handleErrorByMessage エラーメッセージによる分類（フォールバック）
func (h *PostgreSQLErrorHandler) handleErrorByMessage(errorMessage string) message.ErrorCode {
	// エラーメッセージを小文字に変換
	lowerMessage := strings.ToLower(errorMessage)

	// PostgreSQL特有のエラーメッセージパターン
	switch {
	// 重複エラー
	case strings.Contains(lowerMessage, "duplicate key value violates unique constraint"):
		return message.ErrCodeAlreadyExists
	case strings.Contains(lowerMessage, "already exists"):
		return message.ErrCodeAlreadyExists

	// 外部キー制約
	case strings.Contains(lowerMessage, "violates foreign key constraint"):
		return message.ErrCodeDependencyExists
	case strings.Contains(lowerMessage, "is still referenced from table"):
		return message.ErrCodeDependencyExists

	// NULL制約
	case strings.Contains(lowerMessage, "violates not-null constraint"):
		return message.ErrCodeValidation
	case strings.Contains(lowerMessage, "null value in column"):
		return message.ErrCodeValidation

	// CHECK制約
	case strings.Contains(lowerMessage, "violates check constraint"):
		return message.ErrCodeValidation
	case strings.Contains(lowerMessage, "new row for relation"):
		return message.ErrCodeValidation

	// デッドロック
	case strings.Contains(lowerMessage, "deadlock detected"):
		return message.ErrCodeDeadlock

	// シリアライゼーション失敗
	case strings.Contains(lowerMessage, "could not serialize access"):
		return message.ErrCodeConcurrencyError
	case strings.Contains(lowerMessage, "concurrent update"):
		return message.ErrCodeConcurrencyError

	// タイムアウト
	case strings.Contains(lowerMessage, "statement timeout"):
		return message.ErrCodeTimeout
	case strings.Contains(lowerMessage, "lock timeout"):
		return message.ErrCodeLockTimeout
	case strings.Contains(lowerMessage, "context deadline exceeded"):
		return message.ErrCodeTimeout
	case strings.Contains(lowerMessage, "connection timeout"):
		return message.ErrCodeConnectionTimeout

	// 接続エラー
	case strings.Contains(lowerMessage, "connection refused"):
		return message.ErrCodeConnectionFailed
	case strings.Contains(lowerMessage, "connection reset"):
		return message.ErrCodeConnectionFailed
	case strings.Contains(lowerMessage, "broken pipe"):
		return message.ErrCodeConnectionClosed
	case strings.Contains(lowerMessage, "no connection to the server"):
		return message.ErrCodeConnectionFailed

	// 認証エラー
	case strings.Contains(lowerMessage, "password authentication failed"):
		return message.ErrCodeAuthenticationFailed
	case strings.Contains(lowerMessage, "permission denied"):
		return message.ErrCodePermissionDenied

	// データ型エラー
	case strings.Contains(lowerMessage, "invalid input syntax"):
		return message.ErrCodeInvalidFormat
	case strings.Contains(lowerMessage, "value too long"):
		return message.ErrCodeDataTooLong
	case strings.Contains(lowerMessage, "out of range"):
		return message.ErrCodeValueOutOfRange

	// テーブル・カラムエラー
	case strings.Contains(lowerMessage, "does not exist"):
		return message.ErrCodeNotFound
	case strings.Contains(lowerMessage, "column") && strings.Contains(lowerMessage, "does not exist"):
		return message.ErrCodeInvalidField
	case strings.Contains(lowerMessage, "relation") && strings.Contains(lowerMessage, "does not exist"):
		return message.ErrCodeInvalidTable

	// その他
	case strings.Contains(lowerMessage, "syntax error"):
		return message.ErrCodeSyntaxError
	case strings.Contains(lowerMessage, "insufficient"):
		return message.ErrCodeResourceExhausted

	default:
		return message.ErrCodeDatabase
	}
}

// IsRetryableError リトライ可能なエラーかどうかを判定
func (h *PostgreSQLErrorHandler) IsRetryableError(err error) bool {
	if err == nil {
		return false
	}

	// PostgreSQL固有エラーの判定
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "40001", // serialization_failure
			"40P01", // deadlock_detected
			"55P03", // lock_not_available
			"57014", // query_canceled
			"08000", // connection_exception
			"08001", // unable to establish connection
			"08003", // connection_does_not_exist
			"08006": // connection_failure
			return true
		}
	}

	// エラーメッセージによる判定
	errorMessage := strings.ToLower(err.Error())
	retryablePatterns := []string{
		"deadlock",
		"could not serialize",
		"concurrent update",
		"connection refused",
		"connection reset",
		"broken pipe",
		"statement timeout",
		"lock timeout",
		"too many connections",
	}

	for _, pattern := range retryablePatterns {
		if strings.Contains(errorMessage, pattern) {
			return true
		}
	}

	return false
}

// GetConstraintName 制約名を取得
func (h *PostgreSQLErrorHandler) GetConstraintName(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.ConstraintName
	}
	return ""
}

// GetTableName テーブル名を取得
func (h *PostgreSQLErrorHandler) GetTableName(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.TableName
	}
	return ""
}

// GetColumnName カラム名を取得
func (h *PostgreSQLErrorHandler) GetColumnName(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.ColumnName
	}
	return ""
}

// ExtractDuplicateKeyInfo 重複キー情報を抽出
func (h *PostgreSQLErrorHandler) ExtractDuplicateKeyInfo(err error) (table, constraint, value string) {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		table = pgErr.TableName
		constraint = pgErr.ConstraintName
		// Detail フィールドから値を抽出
		if pgErr.Detail != "" {
			// 例: "Key (email)=(test@duesk.co.jp) already exists."
			if start := strings.Index(pgErr.Detail, "=("); start != -1 {
				if end := strings.Index(pgErr.Detail[start:], ")"); end != -1 {
					value = pgErr.Detail[start+2 : start+end]
				}
			}
		}
	}
	return
}
