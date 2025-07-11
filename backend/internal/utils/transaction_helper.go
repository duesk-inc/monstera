package utils

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// TransactionHelper サービス層での便利なトランザクション操作
type TransactionHelper struct {
	retryManager *DeadlockRetryManager
	db           *gorm.DB
	logger       *zap.Logger
}

// NewTransactionHelper 新しいトランザクションヘルパーを作成
func NewTransactionHelper(db *gorm.DB, logger *zap.Logger) *TransactionHelper {
	if logger == nil {
		logger = zap.NewNop()
	}

	// デフォルト設定でリトライマネージャーを作成
	retryConfig := DefaultDeadlockRetryConfig()
	retryManager := NewDeadlockRetryManager(retryConfig, logger)

	return &TransactionHelper{
		retryManager: retryManager,
		db:           db,
		logger:       logger,
	}
}

// ExecuteStandard 標準的なトランザクション実行
func (th *TransactionHelper) ExecuteStandard(
	ctx context.Context,
	operationName string,
	fn func(tx *gorm.DB) error,
) error {
	return th.retryManager.ExecuteWithRetryAndMetrics(ctx, th.db, fn, operationName)
}

// ExecuteStandardWithTimeout タイムアウト付き標準トランザクション実行
func (th *TransactionHelper) ExecuteStandardWithTimeout(
	ctx context.Context,
	timeout time.Duration,
	operationName string,
	fn func(tx *gorm.DB) error,
) error {
	timeoutCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	return th.retryManager.ExecuteWithRetryAndMetrics(timeoutCtx, th.db, fn, operationName)
}

// ExecuteCritical 重要なトランザクション実行（詳細統計付き）
func (th *TransactionHelper) ExecuteCritical(
	ctx context.Context,
	operationName string,
	fn func(tx *gorm.DB) error,
) (*RetryStats, error) {
	return th.retryManager.ExecuteWithRetryStats(ctx, th.db, fn, operationName)
}

// ExecuteBatch バッチ処理用トランザクション実行
func (th *TransactionHelper) ExecuteBatch(
	ctx context.Context,
	batchName string,
	batchSize int,
	fn func(tx *gorm.DB) error,
) error {
	operationName := fmt.Sprintf("batch_%s_size_%d", batchName, batchSize)
	return th.retryManager.ExecuteWithRetryAndMetrics(ctx, th.db, fn, operationName)
}

// ExecuteBatchWithProgress 進捗付きバッチ処理
func (th *TransactionHelper) ExecuteBatchWithProgress(
	ctx context.Context,
	batchName string,
	batchSize int,
	progressCallback func(attempt int, elapsed time.Duration),
	fn func(tx *gorm.DB) error,
) (*RetryStats, error) {
	operationName := fmt.Sprintf("batch_%s_size_%d", batchName, batchSize)

	startTime := time.Now()
	var lastAttempt int

	// 進捗コールバック付きの操作実行
	return th.retryManager.ExecuteWithRetryStats(ctx, th.db, func(tx *gorm.DB) error {
		lastAttempt++
		if progressCallback != nil {
			progressCallback(lastAttempt, time.Since(startTime))
		}
		return fn(tx)
	}, operationName)
}

// TransactionType トランザクションタイプ
type TransactionType string

const (
	TransactionTypeStandard TransactionType = "standard"
	TransactionTypeCritical TransactionType = "critical"
	TransactionTypeBatch    TransactionType = "batch"
)

// ExecuteByType タイプ指定でトランザクション実行
func (th *TransactionHelper) ExecuteByType(
	ctx context.Context,
	transactionType TransactionType,
	operationName string,
	fn func(tx *gorm.DB) error,
) error {
	switch transactionType {
	case TransactionTypeStandard:
		return th.ExecuteStandard(ctx, operationName, fn)
	case TransactionTypeCritical:
		_, err := th.ExecuteCritical(ctx, operationName, fn)
		return err
	case TransactionTypeBatch:
		return th.ExecuteBatch(ctx, operationName, 1, fn)
	default:
		return th.ExecuteStandard(ctx, operationName, fn)
	}
}

// ServiceTransactionWrapper サービス固有のトランザクションラッパー
type ServiceTransactionWrapper struct {
	helper      *TransactionHelper
	serviceName string
	logger      *zap.Logger
}

// NewServiceTransactionWrapper サービス固有のトランザクションラッパーを作成
func NewServiceTransactionWrapper(db *gorm.DB, serviceName string, logger *zap.Logger) *ServiceTransactionWrapper {
	return &ServiceTransactionWrapper{
		helper:      NewTransactionHelper(db, logger),
		serviceName: serviceName,
		logger:      logger,
	}
}

// Execute サービス固有の操作名付きでトランザクション実行
func (stw *ServiceTransactionWrapper) Execute(
	ctx context.Context,
	operation string,
	fn func(tx *gorm.DB) error,
) error {
	operationName := fmt.Sprintf("%s_%s", stw.serviceName, operation)
	return stw.helper.ExecuteStandard(ctx, operationName, fn)
}

// ExecuteWithTimeout タイムアウト付きサービストランザクション実行
func (stw *ServiceTransactionWrapper) ExecuteWithTimeout(
	ctx context.Context,
	timeout time.Duration,
	operation string,
	fn func(tx *gorm.DB) error,
) error {
	operationName := fmt.Sprintf("%s_%s", stw.serviceName, operation)
	return stw.helper.ExecuteStandardWithTimeout(ctx, timeout, operationName, fn)
}

// ExecuteCritical 重要なサービストランザクション実行
func (stw *ServiceTransactionWrapper) ExecuteCritical(
	ctx context.Context,
	operation string,
	fn func(tx *gorm.DB) error,
) (*RetryStats, error) {
	operationName := fmt.Sprintf("%s_critical_%s", stw.serviceName, operation)
	return stw.helper.ExecuteCritical(ctx, operationName, fn)
}

// DeadlockRecoveryCallback デッドロック回復時のコールバック関数型
type DeadlockRecoveryCallback func(attempt int, err error, elapsed time.Duration)

// TransactionWithRecovery 回復コールバック付きトランザクション実行
func (th *TransactionHelper) TransactionWithRecovery(
	ctx context.Context,
	operationName string,
	fn func(tx *gorm.DB) error,
	recoveryCallback DeadlockRecoveryCallback,
) error {
	stats, err := th.retryManager.ExecuteWithRetryStats(ctx, th.db, fn, operationName)

	if stats != nil && recoveryCallback != nil {
		// リトライが発生した場合はコールバックを呼び出し
		if stats.TotalAttempts > 1 {
			for i, errorCode := range stats.ErrorCodes {
				if errorCode == "ErrCodeDeadlock" || errorCode == "ErrCodeConcurrencyError" {
					recoveryCallback(i+1, fmt.Errorf("error_code: %s", errorCode), stats.TotalDuration)
				}
			}
		}
	}

	return err
}

// BulkOperationHelper 大量データ操作ヘルパー
type BulkOperationHelper struct {
	helper      *TransactionHelper
	defaultSize int
	logger      *zap.Logger
}

// NewBulkOperationHelper 新しい大量データ操作ヘルパーを作成
func NewBulkOperationHelper(db *gorm.DB, defaultBatchSize int, logger *zap.Logger) *BulkOperationHelper {
	return &BulkOperationHelper{
		helper:      NewTransactionHelper(db, logger),
		defaultSize: defaultBatchSize,
		logger:      logger,
	}
}

// ExecuteInChunks チャンクに分けて大量データ操作を実行
func (boh *BulkOperationHelper) ExecuteInChunks(
	ctx context.Context,
	operationName string,
	totalItems int,
	chunkSize int,
	processorFn func(tx *gorm.DB, start, end int) error,
) error {
	if chunkSize <= 0 {
		chunkSize = boh.defaultSize
	}

	for start := 0; start < totalItems; start += chunkSize {
		end := start + chunkSize
		if end > totalItems {
			end = totalItems
		}

		chunkOperationName := fmt.Sprintf("%s_chunk_%d_%d", operationName, start, end)

		err := boh.helper.ExecuteBatch(ctx, chunkOperationName, end-start, func(tx *gorm.DB) error {
			return processorFn(tx, start, end)
		})

		if err != nil {
			boh.logger.Error("チャンク処理でエラーが発生しました",
				zap.String("operation", operationName),
				zap.Int("start", start),
				zap.Int("end", end),
				zap.Error(err),
			)
			return fmt.Errorf("チャンク処理エラー (start=%d, end=%d): %w", start, end, err)
		}

		boh.logger.Debug("チャンク処理完了",
			zap.String("operation", operationName),
			zap.Int("start", start),
			zap.Int("end", end),
			zap.Int("processed", end-start),
		)
	}

	boh.logger.Info("大量データ操作完了",
		zap.String("operation", operationName),
		zap.Int("total_items", totalItems),
		zap.Int("chunk_size", chunkSize),
	)

	return nil
}

// ConcurrentTransactionManager 並行トランザクション管理
type ConcurrentTransactionManager struct {
	helper      *TransactionHelper
	maxWorkers  int
	workerQueue chan func() error
	logger      *zap.Logger
}

// NewConcurrentTransactionManager 新しい並行トランザクションマネージャーを作成
func NewConcurrentTransactionManager(db *gorm.DB, maxWorkers int, logger *zap.Logger) *ConcurrentTransactionManager {
	return &ConcurrentTransactionManager{
		helper:      NewTransactionHelper(db, logger),
		maxWorkers:  maxWorkers,
		workerQueue: make(chan func() error, maxWorkers*2),
		logger:      logger,
	}
}

// ExecuteConcurrent 並行してトランザクションを実行
func (ctm *ConcurrentTransactionManager) ExecuteConcurrent(
	ctx context.Context,
	operations []func(ctx context.Context, helper *TransactionHelper) error,
) []error {
	resultChan := make(chan error, len(operations))

	// ワーカーゴルーチンを起動
	for i := 0; i < ctm.maxWorkers; i++ {
		go func() {
			for operation := range ctm.workerQueue {
				resultChan <- operation()
			}
		}()
	}

	// 操作をキューに追加
	for _, operation := range operations {
		op := operation // クロージャーキャプチャ
		ctm.workerQueue <- func() error {
			return op(ctx, ctm.helper)
		}
	}

	// 結果を収集
	errors := make([]error, len(operations))
	for i := 0; i < len(operations); i++ {
		errors[i] = <-resultChan
	}

	close(ctm.workerQueue)
	return errors
}
