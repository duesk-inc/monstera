package utils

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/message"
)

// DeadlockRetryConfig リトライ設定
type DeadlockRetryConfig struct {
	MaxRetries      int           // 最大リトライ回数
	BaseDelay       time.Duration // 基本遅延時間
	MaxDelay        time.Duration // 最大遅延時間
	Multiplier      float64       // 指数バックオフの乗数
	JitterFactor    float64       // ジッターファクター (0.0-1.0)
	EnableJitter    bool          // ジッターを有効にするか
	RetryableErrors []string      // リトライ対象のエラーコード（追加）
}

// DefaultDeadlockRetryConfig デフォルトのリトライ設定
func DefaultDeadlockRetryConfig() DeadlockRetryConfig {
	return DeadlockRetryConfig{
		MaxRetries:   3,
		BaseDelay:    100 * time.Millisecond,
		MaxDelay:     5 * time.Second,
		Multiplier:   2.0,
		JitterFactor: 0.1,
		EnableJitter: true,
		RetryableErrors: []string{
			"40001", // serialization_failure
			"40P01", // deadlock_detected
			"55P03", // lock_not_available
		},
	}
}

// DeadlockRetryManager デッドロック検出とリトライ処理のマネージャー
type DeadlockRetryManager struct {
	config       DeadlockRetryConfig
	errorHandler *PostgreSQLErrorHandler
	logger       *zap.Logger
}

// NewDeadlockRetryManager 新しいデッドロックリトライマネージャーを作成
func NewDeadlockRetryManager(config DeadlockRetryConfig, logger *zap.Logger) *DeadlockRetryManager {
	if logger == nil {
		logger = zap.NewNop()
	}

	return &DeadlockRetryManager{
		config:       config,
		errorHandler: NewPostgreSQLErrorHandler(logger),
		logger:       logger,
	}
}

// RetryContext リトライコンテキスト
type RetryContext struct {
	Attempt      int
	LastError    error
	TotalElapsed time.Duration
	StartTime    time.Time
}

// TransactionOperation トランザクション操作の関数型
type TransactionOperation func(tx *gorm.DB) error

// ExecuteWithRetry リトライ機能付きでトランザクション操作を実行
func (drm *DeadlockRetryManager) ExecuteWithRetry(
	ctx context.Context,
	db *gorm.DB,
	operation TransactionOperation,
) error {
	startTime := time.Now()

	for attempt := 0; attempt <= drm.config.MaxRetries; attempt++ {
		retryCtx := RetryContext{
			Attempt:      attempt,
			TotalElapsed: time.Since(startTime),
			StartTime:    startTime,
		}

		// コンテキストのキャンセルチェック
		if err := ctx.Err(); err != nil {
			drm.logger.Warn("コンテキストがキャンセルされました",
				zap.Int("attempt", attempt),
				zap.Error(err),
			)
			return err
		}

		drm.logger.Debug("トランザクション実行開始",
			zap.Int("attempt", attempt),
			zap.Int("max_retries", drm.config.MaxRetries),
			zap.Duration("elapsed", retryCtx.TotalElapsed),
		)

		// トランザクション実行
		err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			return operation(tx)
		})

		if err == nil {
			// 成功
			if attempt > 0 {
				drm.logger.Info("リトライ後にトランザクション成功",
					zap.Int("successful_attempt", attempt),
					zap.Duration("total_elapsed", time.Since(startTime)),
				)
			}
			return nil
		}

		retryCtx.LastError = err

		// エラーハンドリングとリトライ判定
		if !drm.shouldRetry(err, retryCtx) {
			drm.logger.Warn("リトライ不可能なエラー",
				zap.Int("attempt", attempt),
				zap.Error(err),
				zap.String("error_code", string(drm.errorHandler.HandleDatabaseError(err))),
			)
			return err
		}

		// 最大リトライ回数に達した場合
		if attempt >= drm.config.MaxRetries {
			drm.logger.Error("最大リトライ回数に到達",
				zap.Int("max_retries", drm.config.MaxRetries),
				zap.Error(err),
				zap.Duration("total_elapsed", time.Since(startTime)),
			)
			return fmt.Errorf("最大リトライ回数(%d)に達しました。最後のエラー: %w", drm.config.MaxRetries, err)
		}

		// バックオフ待機
		delay := drm.calculateDelay(attempt)
		drm.logger.Warn("リトライ可能なエラーが発生、待機後にリトライします",
			zap.Int("attempt", attempt),
			zap.Error(err),
			zap.Duration("delay", delay),
			zap.String("error_code", string(drm.errorHandler.HandleDatabaseError(err))),
		)

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
			// 次のリトライへ継続
		}
	}

	return fmt.Errorf("予期しないリトライループの終了")
}

// shouldRetry エラーがリトライ可能かどうかを判定
func (drm *DeadlockRetryManager) shouldRetry(err error, retryCtx RetryContext) bool {
	if err == nil {
		return false
	}

	// PostgreSQLエラーハンドラーでリトライ可能かチェック
	if drm.errorHandler.IsRetryableError(err) {
		return true
	}

	// エラーコードベースの判定
	errorCode := drm.errorHandler.HandleDatabaseError(err)

	retryableErrorCodes := []message.ErrorCode{
		message.ErrCodeDeadlock,
		message.ErrCodeConcurrencyError,
		message.ErrCodeLockTimeout,
		message.ErrCodeConnectionFailed,
		message.ErrCodeConnectionClosed,
		message.ErrCodeConnectionTimeout,
		message.ErrCodeResourceExhausted,
		message.ErrCodeTooManyConnections,
	}

	for _, retryableCode := range retryableErrorCodes {
		if errorCode == retryableCode {
			return true
		}
	}

	return false
}

// calculateDelay バックオフ遅延時間を計算
func (drm *DeadlockRetryManager) calculateDelay(attempt int) time.Duration {
	// 指数バックオフ計算
	delay := float64(drm.config.BaseDelay) * math.Pow(drm.config.Multiplier, float64(attempt))

	// 最大遅延時間の制限
	if delay > float64(drm.config.MaxDelay) {
		delay = float64(drm.config.MaxDelay)
	}

	// ジッターの追加（リトライの衝突を避ける）
	if drm.config.EnableJitter {
		jitter := delay * drm.config.JitterFactor * (rand.Float64()*2 - 1) // -JitterFactor ~ +JitterFactor
		delay += jitter

		// 負の値にならないよう調整
		if delay < 0 {
			delay = float64(drm.config.BaseDelay)
		}
	}

	return time.Duration(delay)
}

// ExecuteWithRetryAndMetrics メトリクス付きでリトライ実行
func (drm *DeadlockRetryManager) ExecuteWithRetryAndMetrics(
	ctx context.Context,
	db *gorm.DB,
	operation TransactionOperation,
	operationName string,
) error {
	startTime := time.Now()

	err := drm.ExecuteWithRetry(ctx, db, operation)

	duration := time.Since(startTime)

	// メトリクス記録
	if err != nil {
		drm.logger.Error("トランザクション操作失敗",
			zap.String("operation", operationName),
			zap.Duration("duration", duration),
			zap.Error(err),
		)
	} else {
		drm.logger.Info("トランザクション操作成功",
			zap.String("operation", operationName),
			zap.Duration("duration", duration),
		)
	}

	return err
}

// CreateRetryStats リトライ統計情報
type RetryStats struct {
	OperationName   string        `json:"operation_name"`
	TotalAttempts   int           `json:"total_attempts"`
	SuccessfulRetry bool          `json:"successful_retry"`
	TotalDuration   time.Duration `json:"total_duration"`
	ErrorCodes      []string      `json:"error_codes"`
	FinalError      string        `json:"final_error,omitempty"`
}

// ExecuteWithRetryStats 統計情報付きでリトライ実行
func (drm *DeadlockRetryManager) ExecuteWithRetryStats(
	ctx context.Context,
	db *gorm.DB,
	operation TransactionOperation,
	operationName string,
) (*RetryStats, error) {
	startTime := time.Now()
	stats := &RetryStats{
		OperationName: operationName,
		ErrorCodes:    make([]string, 0),
	}

	for attempt := 0; attempt <= drm.config.MaxRetries; attempt++ {
		stats.TotalAttempts = attempt + 1

		// コンテキストのキャンセルチェック
		if err := ctx.Err(); err != nil {
			stats.TotalDuration = time.Since(startTime)
			stats.FinalError = err.Error()
			return stats, err
		}

		// トランザクション実行
		err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			return operation(tx)
		})

		if err == nil {
			// 成功
			stats.TotalDuration = time.Since(startTime)
			stats.SuccessfulRetry = attempt > 0
			return stats, nil
		}

		// エラーコードを記録
		errorCode := drm.errorHandler.HandleDatabaseError(err)
		stats.ErrorCodes = append(stats.ErrorCodes, string(errorCode))

		// リトライ判定
		retryCtx := RetryContext{
			Attempt:      attempt,
			LastError:    err,
			TotalElapsed: time.Since(startTime),
			StartTime:    startTime,
		}

		if !drm.shouldRetry(err, retryCtx) || attempt >= drm.config.MaxRetries {
			stats.TotalDuration = time.Since(startTime)
			stats.FinalError = err.Error()

			if attempt >= drm.config.MaxRetries {
				return stats, fmt.Errorf("最大リトライ回数(%d)に達しました。最後のエラー: %w", drm.config.MaxRetries, err)
			}
			return stats, err
		}

		// バックオフ待機
		delay := drm.calculateDelay(attempt)
		select {
		case <-ctx.Done():
			stats.TotalDuration = time.Since(startTime)
			stats.FinalError = ctx.Err().Error()
			return stats, ctx.Err()
		case <-time.After(delay):
			// 次のリトライへ継続
		}
	}

	stats.TotalDuration = time.Since(startTime)
	return stats, fmt.Errorf("予期しないリトライループの終了")
}

// GetRetryConfig 現在のリトライ設定を取得
func (drm *DeadlockRetryManager) GetRetryConfig() DeadlockRetryConfig {
	return drm.config
}

// UpdateRetryConfig リトライ設定を更新
func (drm *DeadlockRetryManager) UpdateRetryConfig(config DeadlockRetryConfig) {
	drm.config = config
	drm.logger.Info("リトライ設定を更新しました",
		zap.Int("max_retries", config.MaxRetries),
		zap.Duration("base_delay", config.BaseDelay),
		zap.Duration("max_delay", config.MaxDelay),
		zap.Float64("multiplier", config.Multiplier),
	)
}
