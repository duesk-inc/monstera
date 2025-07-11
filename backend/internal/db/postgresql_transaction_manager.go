package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// TransactionConfig PostgreSQL用のトランザクション設定
type TransactionConfig struct {
	IsolationLevel sql.IsolationLevel
	ReadOnly       bool
	Timeout        time.Duration
	RetryCount     int
}

// PostgreSQLTransactionManager PostgreSQL専用のトランザクションマネージャー
type PostgreSQLTransactionManager struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewPostgreSQLTransactionManager 新しいPostgreSQLトランザクションマネージャーを作成
func NewPostgreSQLTransactionManager(db *gorm.DB, logger *zap.Logger) *PostgreSQLTransactionManager {
	return &PostgreSQLTransactionManager{
		db:     db,
		logger: logger,
	}
}

// ExecuteWithIsolation 指定された分離レベルでトランザクションを実行
func (tm *PostgreSQLTransactionManager) ExecuteWithIsolation(
	ctx context.Context,
	config TransactionConfig,
	fn func(tx *gorm.DB) error,
) error {
	operation := getOperationFromContext(ctx)
	isolationLevel := isolationLevelToString(config.IsolationLevel)

	tm.logger.Info("Starting transaction",
		zap.String("operation", operation),
		zap.String("isolation_level", isolationLevel),
		zap.Duration("timeout", config.Timeout),
		zap.Bool("read_only", config.ReadOnly),
	)

	start := time.Now()
	defer func() {
		duration := time.Since(start)
		tm.logger.Info("Transaction completed",
			zap.String("operation", operation),
			zap.String("isolation_level", isolationLevel),
			zap.Duration("duration", duration),
		)
	}()

	// リトライ機能付きでトランザクションを実行
	maxRetries := config.RetryCount
	if maxRetries <= 0 {
		maxRetries = 3 // デフォルト3回
	}

	return tm.executeWithRetry(ctx, config, fn, maxRetries)
}

// executeWithRetry リトライ機能付きトランザクション実行
func (tm *PostgreSQLTransactionManager) executeWithRetry(
	ctx context.Context,
	config TransactionConfig,
	fn func(tx *gorm.DB) error,
	maxRetries int,
) error {
	for attempt := 0; attempt <= maxRetries; attempt++ {
		err := tm.executeTransaction(ctx, config, fn)

		if err == nil {
			return nil
		}

		// PostgreSQLのデッドロックまたはシリアライゼーション失敗の場合はリトライ
		if tm.shouldRetry(err) && attempt < maxRetries {
			backoff := tm.calculateBackoff(attempt)
			tm.logger.Warn("Transaction failed, retrying",
				zap.Error(err),
				zap.Int("attempt", attempt+1),
				zap.Int("max_retries", maxRetries),
				zap.Duration("backoff", backoff),
			)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
				continue
			}
		}

		tm.logger.Error("Transaction failed permanently",
			zap.Error(err),
			zap.Int("final_attempt", attempt+1),
		)
		return err
	}

	return fmt.Errorf("transaction failed after %d attempts", maxRetries)
}

// executeTransaction 単一のトランザクション実行
func (tm *PostgreSQLTransactionManager) executeTransaction(
	ctx context.Context,
	config TransactionConfig,
	fn func(tx *gorm.DB) error,
) error {
	// タイムアウト設定
	if config.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, config.Timeout)
		defer cancel()
	}

	return tm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 分離レベルの設定
		if config.IsolationLevel != 0 {
			isolationSQL := fmt.Sprintf("SET TRANSACTION ISOLATION LEVEL %s",
				isolationLevelToString(config.IsolationLevel))
			if err := tx.Exec(isolationSQL).Error; err != nil {
				return fmt.Errorf("failed to set isolation level: %w", err)
			}
		}

		// 読み取り専用の設定
		if config.ReadOnly {
			if err := tx.Exec("SET TRANSACTION READ ONLY").Error; err != nil {
				return fmt.Errorf("failed to set read only: %w", err)
			}
		}

		// Asia/Tokyoタイムゾーンの設定
		if err := tx.Exec("SET LOCAL timezone = 'Asia/Tokyo'").Error; err != nil {
			tm.logger.Warn("Failed to set timezone", zap.Error(err))
		}

		// ユーザー関数の実行
		return fn(tx)
	})
}

// shouldRetry PostgreSQL特有のエラーでリトライすべきかどうかを判定
func (tm *PostgreSQLTransactionManager) shouldRetry(err error) bool {
	if err == nil {
		return false
	}

	errorMsg := strings.ToLower(err.Error())

	// PostgreSQLのリトライ可能なエラー
	retryableErrors := []string{
		"deadlock detected",          // デッドロック
		"could not serialize access", // シリアライゼーション失敗
		"serialization_failure",      // シリアライゼーション失敗
		"connection reset by peer",   // 接続エラー
		"connection refused",         // 接続エラー
		"timeout",                    // タイムアウト
		"lock_timeout",               // ロックタイムアウト
		"statement_timeout",          // ステートメントタイムアウト
	}

	for _, retryableError := range retryableErrors {
		if strings.Contains(errorMsg, retryableError) {
			return true
		}
	}

	return false
}

// calculateBackoff 指数バックオフでリトライ間隔を計算
func (tm *PostgreSQLTransactionManager) calculateBackoff(attempt int) time.Duration {
	baseDelay := 100 * time.Millisecond
	maxDelay := 5 * time.Second

	delay := baseDelay * time.Duration(1<<uint(attempt)) // 指数バックオフ
	if delay > maxDelay {
		delay = maxDelay
	}

	return delay
}

// isolationLevelToString 分離レベルを文字列に変換
func isolationLevelToString(level sql.IsolationLevel) string {
	switch level {
	case sql.LevelDefault:
		return "DEFAULT"
	case sql.LevelReadUncommitted:
		return "READ UNCOMMITTED"
	case sql.LevelReadCommitted:
		return "READ COMMITTED"
	case sql.LevelWriteCommitted:
		return "WRITE COMMITTED"
	case sql.LevelRepeatableRead:
		return "REPEATABLE READ"
	case sql.LevelSnapshot:
		return "SNAPSHOT"
	case sql.LevelSerializable:
		return "SERIALIZABLE"
	case sql.LevelLinearizable:
		return "LINEARIZABLE"
	default:
		return "READ COMMITTED" // PostgreSQLのデフォルト
	}
}

// getOperationFromContext コンテキストからオペレーション名を取得
func getOperationFromContext(ctx context.Context) string {
	if operation, ok := ctx.Value("operation").(string); ok {
		return operation
	}
	return "unknown"
}

// DefaultConfigs 用途別のデフォルト設定
var DefaultConfigs = struct {
	ReadOnly  TransactionConfig
	ReadWrite TransactionConfig
	Critical  TransactionConfig
	Batch     TransactionConfig
	Report    TransactionConfig
}{
	ReadOnly: TransactionConfig{
		IsolationLevel: sql.LevelReadCommitted,
		ReadOnly:       true,
		Timeout:        30 * time.Second,
		RetryCount:     1,
	},
	ReadWrite: TransactionConfig{
		IsolationLevel: sql.LevelReadCommitted,
		ReadOnly:       false,
		Timeout:        30 * time.Second,
		RetryCount:     3,
	},
	Critical: TransactionConfig{
		IsolationLevel: sql.LevelSerializable,
		ReadOnly:       false,
		Timeout:        60 * time.Second,
		RetryCount:     5,
	},
	Batch: TransactionConfig{
		IsolationLevel: sql.LevelReadCommitted,
		ReadOnly:       false,
		Timeout:        300 * time.Second,
		RetryCount:     3,
	},
	Report: TransactionConfig{
		IsolationLevel: sql.LevelRepeatableRead,
		ReadOnly:       true,
		Timeout:        120 * time.Second,
		RetryCount:     1,
	},
}

// Usage Examples:
//
// // 経費申請（一般的な読み書き）
// err := tm.ExecuteWithIsolation(ctx, DefaultConfigs.ReadWrite, func(tx *gorm.DB) error {
//     // 経費作成処理
//     return nil
// })
//
// // 経費承認（重要な処理）
// err := tm.ExecuteWithIsolation(ctx, DefaultConfigs.Critical, func(tx *gorm.DB) error {
//     // 承認処理
//     return nil
// })
//
// // レポート生成（読み取り専用）
// err := tm.ExecuteWithIsolation(ctx, DefaultConfigs.Report, func(tx *gorm.DB) error {
//     // レポート生成処理
//     return nil
// })
//
// // バッチ処理（長時間実行）
// err := tm.ExecuteWithIsolation(ctx, DefaultConfigs.Batch, func(tx *gorm.DB) error {
//     // バッチ処理
//     return nil
// })
