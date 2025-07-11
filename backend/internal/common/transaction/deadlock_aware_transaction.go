package transaction

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/utils"
)

// DeadlockAwareTransactionManager デッドロック対応トランザクションマネージャー
type DeadlockAwareTransactionManager struct {
	db           *gorm.DB
	retryManager *utils.DeadlockRetryManager
	logger       *zap.Logger
}

// NewDeadlockAwareTransactionManager 新しいデッドロック対応トランザクションマネージャーを作成
func NewDeadlockAwareTransactionManager(db *gorm.DB, logger *zap.Logger) *DeadlockAwareTransactionManager {
	if logger == nil {
		logger = zap.NewNop()
	}

	// デフォルト設定でリトライマネージャーを作成
	retryConfig := utils.DefaultDeadlockRetryConfig()
	retryManager := utils.NewDeadlockRetryManager(retryConfig, logger)

	return &DeadlockAwareTransactionManager{
		db:           db,
		retryManager: retryManager,
		logger:       logger,
	}
}

// NewDeadlockAwareTransactionManagerWithConfig カスタム設定でデッドロック対応トランザクションマネージャーを作成
func NewDeadlockAwareTransactionManagerWithConfig(
	db *gorm.DB,
	retryConfig utils.DeadlockRetryConfig,
	logger *zap.Logger,
) *DeadlockAwareTransactionManager {
	if logger == nil {
		logger = zap.NewNop()
	}

	retryManager := utils.NewDeadlockRetryManager(retryConfig, logger)

	return &DeadlockAwareTransactionManager{
		db:           db,
		retryManager: retryManager,
		logger:       logger,
	}
}

// ExecuteInTransaction デッドロック検出・リトライ機能付きでトランザクション内で関数を実行
func (tm *DeadlockAwareTransactionManager) ExecuteInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return tm.retryManager.ExecuteWithRetry(ctx, tm.db, fn)
}

// ExecuteInTransactionWithName 操作名付きでトランザクション実行
func (tm *DeadlockAwareTransactionManager) ExecuteInTransactionWithName(
	ctx context.Context,
	operationName string,
	fn func(tx *gorm.DB) error,
) error {
	return tm.retryManager.ExecuteWithRetryAndMetrics(ctx, tm.db, fn, operationName)
}

// ExecuteInTransactionWithStats 統計情報付きでトランザクション実行
func (tm *DeadlockAwareTransactionManager) ExecuteInTransactionWithStats(
	ctx context.Context,
	operationName string,
	fn func(tx *gorm.DB) error,
) (*utils.RetryStats, error) {
	return tm.retryManager.ExecuteWithRetryStats(ctx, tm.db, fn, operationName)
}

// GetDB データベース接続を取得
func (tm *DeadlockAwareTransactionManager) GetDB() *gorm.DB {
	return tm.db
}

// GetRetryConfig 現在のリトライ設定を取得
func (tm *DeadlockAwareTransactionManager) GetRetryConfig() utils.DeadlockRetryConfig {
	return tm.retryManager.GetRetryConfig()
}

// UpdateRetryConfig リトライ設定を更新
func (tm *DeadlockAwareTransactionManager) UpdateRetryConfig(config utils.DeadlockRetryConfig) {
	tm.retryManager.UpdateRetryConfig(config)
}

// EnhancedTransactionManager 拡張されたトランザクションマネージャーインターフェース
type EnhancedTransactionManager interface {
	TransactionManager
	ExecuteInTransactionWithName(ctx context.Context, operationName string, fn func(tx *gorm.DB) error) error
	ExecuteInTransactionWithStats(ctx context.Context, operationName string, fn func(tx *gorm.DB) error) (*utils.RetryStats, error)
	GetRetryConfig() utils.DeadlockRetryConfig
	UpdateRetryConfig(config utils.DeadlockRetryConfig)
}

// 型チェック: DeadlockAwareTransactionManagerがEnhancedTransactionManagerを実装していることを確認
var _ EnhancedTransactionManager = (*DeadlockAwareTransactionManager)(nil)

// TransactionExecutor 実行専用インターフェース
type TransactionExecutor struct {
	manager *DeadlockAwareTransactionManager
}

// NewTransactionExecutor 新しいトランザクション実行者を作成
func NewTransactionExecutor(db *gorm.DB, logger *zap.Logger) *TransactionExecutor {
	return &TransactionExecutor{
		manager: NewDeadlockAwareTransactionManager(db, logger),
	}
}

// Execute シンプルなトランザクション実行
func (te *TransactionExecutor) Execute(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return te.manager.ExecuteInTransaction(ctx, fn)
}

// ExecuteNamed 名前付きトランザクション実行
func (te *TransactionExecutor) ExecuteNamed(ctx context.Context, name string, fn func(tx *gorm.DB) error) error {
	return te.manager.ExecuteInTransactionWithName(ctx, name, fn)
}

// ExecuteWithTimeout タイムアウト付きトランザクション実行
func (te *TransactionExecutor) ExecuteWithTimeout(
	parentCtx context.Context,
	timeout time.Duration,
	name string,
	fn func(tx *gorm.DB) error,
) error {
	ctx, cancel := context.WithTimeout(parentCtx, timeout)
	defer cancel()

	return te.manager.ExecuteInTransactionWithName(ctx, name, fn)
}

// CriticalTransactionExecutor 重要なトランザクション専用実行者
type CriticalTransactionExecutor struct {
	manager *DeadlockAwareTransactionManager
}

// NewCriticalTransactionExecutor 重要なトランザクション専用実行者を作成
func NewCriticalTransactionExecutor(db *gorm.DB, logger *zap.Logger) *CriticalTransactionExecutor {
	// 重要なトランザクション用に設定を調整
	config := utils.DeadlockRetryConfig{
		MaxRetries:   5, // より多くのリトライ
		BaseDelay:    200 * time.Millisecond,
		MaxDelay:     10 * time.Second,
		Multiplier:   2.0,
		JitterFactor: 0.2, // より大きなジッター
		EnableJitter: true,
		RetryableErrors: []string{
			"40001", // serialization_failure
			"40P01", // deadlock_detected
			"55P03", // lock_not_available
		},
	}

	manager := NewDeadlockAwareTransactionManagerWithConfig(db, config, logger)

	return &CriticalTransactionExecutor{
		manager: manager,
	}
}

// Execute 重要なトランザクション実行
func (cte *CriticalTransactionExecutor) Execute(
	ctx context.Context,
	operationName string,
	fn func(tx *gorm.DB) error,
) (*utils.RetryStats, error) {
	stats, err := cte.manager.ExecuteInTransactionWithStats(ctx, operationName, fn)

	// 重要なトランザクションの場合、詳細ログを出力
	if stats != nil {
		cte.manager.logger.Info("重要なトランザクション実行完了",
			zap.String("operation", operationName),
			zap.Int("attempts", stats.TotalAttempts),
			zap.Duration("duration", stats.TotalDuration),
			zap.Bool("successful_retry", stats.SuccessfulRetry),
			zap.Strings("error_codes", stats.ErrorCodes),
		)
	}

	return stats, err
}

// BatchTransactionExecutor バッチ処理専用トランザクション実行者
type BatchTransactionExecutor struct {
	manager *DeadlockAwareTransactionManager
}

// NewBatchTransactionExecutor バッチ処理専用トランザクション実行者を作成
func NewBatchTransactionExecutor(db *gorm.DB, logger *zap.Logger) *BatchTransactionExecutor {
	// バッチ処理用に設定を調整
	config := utils.DeadlockRetryConfig{
		MaxRetries:   3,
		BaseDelay:    500 * time.Millisecond, // より長い初期遅延
		MaxDelay:     30 * time.Second,       // より長い最大遅延
		Multiplier:   2.5,                    // より強い指数バックオフ
		JitterFactor: 0.3,                    // より大きなジッター
		EnableJitter: true,
		RetryableErrors: []string{
			"40001", // serialization_failure
			"40P01", // deadlock_detected
			"55P03", // lock_not_available
			"53300", // too_many_connections
		},
	}

	manager := NewDeadlockAwareTransactionManagerWithConfig(db, config, logger)

	return &BatchTransactionExecutor{
		manager: manager,
	}
}

// ExecuteBatch バッチトランザクション実行
func (bte *BatchTransactionExecutor) ExecuteBatch(
	ctx context.Context,
	batchName string,
	batchSize int,
	fn func(tx *gorm.DB) error,
) error {
	operationName := fmt.Sprintf("batch_%s_size_%d", batchName, batchSize)
	return bte.manager.ExecuteInTransactionWithName(ctx, operationName, fn)
}

// ExecuteBatchWithProgress 進捗付きバッチトランザクション実行
func (bte *BatchTransactionExecutor) ExecuteBatchWithProgress(
	ctx context.Context,
	batchName string,
	batchSize int,
	progressCallback func(attempt int, elapsed time.Duration),
	fn func(tx *gorm.DB) error,
) (*utils.RetryStats, error) {
	operationName := fmt.Sprintf("batch_%s_size_%d", batchName, batchSize)

	startTime := time.Now()
	var lastAttempt int

	// 進捗コールバック付きの操作実行
	stats, err := bte.manager.ExecuteInTransactionWithStats(ctx, operationName, func(tx *gorm.DB) error {
		lastAttempt++
		if progressCallback != nil {
			progressCallback(lastAttempt, time.Since(startTime))
		}
		return fn(tx)
	})

	return stats, err
}
