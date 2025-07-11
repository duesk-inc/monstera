package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"gorm.io/gorm"
)

// BatchProcessorServiceInterface バッチプロセッサーサービスインターフェース
type BatchProcessorServiceInterface interface {
	// バッチ処理実行
	ProcessBatch(ctx context.Context, processor BatchProcessor, items []interface{}) (*BatchResult, error)
	ProcessBatchWithOptions(ctx context.Context, processor BatchProcessor, items []interface{}, options *BatchOptions) (*BatchResult, error)

	// 並行処理
	ProcessConcurrent(ctx context.Context, processor BatchProcessor, items []interface{}, concurrency int) (*BatchResult, error)
	ProcessConcurrentWithRetry(ctx context.Context, processor BatchProcessor, items []interface{}, concurrency int, retryOptions *RetryOptions) (*BatchResult, error)

	// チャンク処理
	ProcessInChunks(ctx context.Context, processor BatchProcessor, items []interface{}, chunkSize int) (*BatchResult, error)
	ProcessInChunksWithProgress(ctx context.Context, processor BatchProcessor, items []interface{}, chunkSize int, progressCallback ProgressCallback) (*BatchResult, error)

	// ストリーム処理
	ProcessStream(ctx context.Context, processor BatchProcessor, itemChannel <-chan interface{}) (*BatchResult, error)

	// バッチジョブ管理
	CreateBatchJob(ctx context.Context, name string, totalItems int) (*BatchJob, error)
	UpdateBatchJobProgress(ctx context.Context, jobID uuid.UUID, processedItems int, failedItems int) error
	CompleteBatchJob(ctx context.Context, jobID uuid.UUID, result *BatchResult) error
	GetBatchJob(ctx context.Context, jobID uuid.UUID) (*BatchJob, error)

	// エラーハンドリング
	SetErrorHandler(handler ErrorHandler)
	SetRetryPolicy(policy RetryPolicy)
}

// BatchProcessor バッチプロセッサーインターフェース
type BatchProcessor interface {
	Process(ctx context.Context, item interface{}) error
	Validate(item interface{}) error
	OnError(ctx context.Context, item interface{}, err error) error
	OnSuccess(ctx context.Context, item interface{}) error
}

// BatchOptions バッチ処理オプション
type BatchOptions struct {
	Concurrency      int
	ChunkSize        int
	RetryOptions     *RetryOptions
	ProgressCallback ProgressCallback
	ErrorHandler     ErrorHandler
	StopOnError      bool
	Timeout          time.Duration
}

// RetryOptions リトライオプション
type RetryOptions struct {
	MaxRetries     int
	RetryDelay     time.Duration
	BackoffFactor  float64
	MaxRetryDelay  time.Duration
	RetryableError func(error) bool
}

// BatchResult バッチ処理結果
type BatchResult struct {
	TotalItems      int
	ProcessedItems  int
	SuccessfulItems int
	FailedItems     int
	SkippedItems    int
	StartTime       time.Time
	EndTime         time.Time
	Duration        time.Duration
	Errors          []BatchError
	Metadata        map[string]interface{}
}

// BatchError バッチエラー
type BatchError struct {
	Index     int
	Item      interface{}
	Error     error
	Timestamp time.Time
	Retries   int
}

// BatchJob バッチジョブ
type BatchJob struct {
	ID              uuid.UUID
	Name            string
	Status          BatchJobStatus
	TotalItems      int
	ProcessedItems  int
	SuccessfulItems int
	FailedItems     int
	StartedAt       time.Time
	CompletedAt     *time.Time
	LastUpdatedAt   time.Time
	Metadata        map[string]interface{}
}

// BatchJobStatus バッチジョブステータス
type BatchJobStatus string

const (
	BatchJobStatusPending   BatchJobStatus = "pending"
	BatchJobStatusRunning   BatchJobStatus = "running"
	BatchJobStatusCompleted BatchJobStatus = "completed"
	BatchJobStatusFailed    BatchJobStatus = "failed"
	BatchJobStatusCancelled BatchJobStatus = "cancelled"
)

// ProgressCallback 進捗コールバック
type ProgressCallback func(processed, total int, percentage float64)

// ErrorHandler エラーハンドラー
type ErrorHandler func(ctx context.Context, err error, item interface{}, index int) error

// RetryPolicy リトライポリシー
type RetryPolicy func(err error, retries int) (shouldRetry bool, delay time.Duration)

// batchProcessorService バッチプロセッサーサービス実装
type batchProcessorService struct {
	db           *gorm.DB
	logger       *zap.Logger
	errorHandler ErrorHandler
	retryPolicy  RetryPolicy
	jobs         map[uuid.UUID]*BatchJob
	jobsMutex    sync.RWMutex
}

// NewBatchProcessorService バッチプロセッサーサービスのコンストラクタ
func NewBatchProcessorService(db *gorm.DB, logger *zap.Logger) BatchProcessorServiceInterface {
	return &batchProcessorService{
		db:     db,
		logger: logger,
		jobs:   make(map[uuid.UUID]*BatchJob),
		errorHandler: func(ctx context.Context, err error, item interface{}, index int) error {
			return err // デフォルトはエラーをそのまま返す
		},
		retryPolicy: func(err error, retries int) (bool, time.Duration) {
			if retries >= 3 {
				return false, 0
			}
			return true, time.Duration(retries+1) * time.Second
		},
	}
}

// ProcessBatch バッチ処理を実行
func (s *batchProcessorService) ProcessBatch(ctx context.Context, processor BatchProcessor, items []interface{}) (*BatchResult, error) {
	return s.ProcessBatchWithOptions(ctx, processor, items, &BatchOptions{
		Concurrency: 1,
		ChunkSize:   len(items),
	})
}

// ProcessBatchWithOptions オプション付きバッチ処理を実行
func (s *batchProcessorService) ProcessBatchWithOptions(ctx context.Context, processor BatchProcessor, items []interface{}, options *BatchOptions) (*BatchResult, error) {
	result := &BatchResult{
		TotalItems: len(items),
		StartTime:  time.Now(),
		Errors:     make([]BatchError, 0),
		Metadata:   make(map[string]interface{}),
	}

	if options.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, options.Timeout)
		defer cancel()
	}

	// バリデーション
	for i, item := range items {
		if err := processor.Validate(item); err != nil {
			result.SkippedItems++
			result.Errors = append(result.Errors, BatchError{
				Index:     i,
				Item:      item,
				Error:     fmt.Errorf("バリデーションエラー: %w", err),
				Timestamp: time.Now(),
			})

			if options.StopOnError {
				result.EndTime = time.Now()
				result.Duration = result.EndTime.Sub(result.StartTime)
				return result, fmt.Errorf("バリデーションエラーにより処理を中止しました")
			}
		}
	}

	// 並行処理
	if options.Concurrency > 1 {
		return s.processConcurrentInternal(ctx, processor, items, options, result)
	}

	// 逐次処理
	return s.processSequentialInternal(ctx, processor, items, options, result)
}

// ProcessConcurrent 並行バッチ処理を実行
func (s *batchProcessorService) ProcessConcurrent(ctx context.Context, processor BatchProcessor, items []interface{}, concurrency int) (*BatchResult, error) {
	return s.ProcessBatchWithOptions(ctx, processor, items, &BatchOptions{
		Concurrency: concurrency,
		ChunkSize:   len(items),
	})
}

// ProcessConcurrentWithRetry リトライ付き並行バッチ処理を実行
func (s *batchProcessorService) ProcessConcurrentWithRetry(ctx context.Context, processor BatchProcessor, items []interface{}, concurrency int, retryOptions *RetryOptions) (*BatchResult, error) {
	return s.ProcessBatchWithOptions(ctx, processor, items, &BatchOptions{
		Concurrency:  concurrency,
		ChunkSize:    len(items),
		RetryOptions: retryOptions,
	})
}

// ProcessInChunks チャンク単位でバッチ処理を実行
func (s *batchProcessorService) ProcessInChunks(ctx context.Context, processor BatchProcessor, items []interface{}, chunkSize int) (*BatchResult, error) {
	return s.ProcessInChunksWithProgress(ctx, processor, items, chunkSize, nil)
}

// ProcessInChunksWithProgress 進捗表示付きチャンク処理を実行
func (s *batchProcessorService) ProcessInChunksWithProgress(ctx context.Context, processor BatchProcessor, items []interface{}, chunkSize int, progressCallback ProgressCallback) (*BatchResult, error) {
	result := &BatchResult{
		TotalItems: len(items),
		StartTime:  time.Now(),
		Errors:     make([]BatchError, 0),
		Metadata:   make(map[string]interface{}),
	}

	totalChunks := (len(items) + chunkSize - 1) / chunkSize
	s.logger.Info("Starting chunk processing",
		zap.Int("total_items", len(items)),
		zap.Int("chunk_size", chunkSize),
		zap.Int("total_chunks", totalChunks))

	for i := 0; i < len(items); i += chunkSize {
		end := i + chunkSize
		if end > len(items) {
			end = len(items)
		}

		chunk := items[i:end]
		chunkResult := s.processChunk(ctx, processor, chunk, i)

		// 結果をマージ
		result.ProcessedItems += chunkResult.ProcessedItems
		result.SuccessfulItems += chunkResult.SuccessfulItems
		result.FailedItems += chunkResult.FailedItems
		result.SkippedItems += chunkResult.SkippedItems
		result.Errors = append(result.Errors, chunkResult.Errors...)

		// 進捗を報告
		if progressCallback != nil {
			percentage := float64(result.ProcessedItems) / float64(result.TotalItems) * 100
			progressCallback(result.ProcessedItems, result.TotalItems, percentage)
		}

		// コンテキストのチェック
		select {
		case <-ctx.Done():
			result.EndTime = time.Now()
			result.Duration = result.EndTime.Sub(result.StartTime)
			return result, ctx.Err()
		default:
		}
	}

	result.EndTime = time.Now()
	result.Duration = result.EndTime.Sub(result.StartTime)

	return result, nil
}

// ProcessStream ストリーム処理を実行
func (s *batchProcessorService) ProcessStream(ctx context.Context, processor BatchProcessor, itemChannel <-chan interface{}) (*BatchResult, error) {
	result := &BatchResult{
		StartTime: time.Now(),
		Errors:    make([]BatchError, 0),
		Metadata:  make(map[string]interface{}),
	}

	index := 0
	for {
		select {
		case item, ok := <-itemChannel:
			if !ok {
				// チャネルがクローズされた
				result.EndTime = time.Now()
				result.Duration = result.EndTime.Sub(result.StartTime)
				return result, nil
			}

			result.TotalItems++

			// バリデーション
			if err := processor.Validate(item); err != nil {
				result.SkippedItems++
				result.Errors = append(result.Errors, BatchError{
					Index:     index,
					Item:      item,
					Error:     fmt.Errorf("バリデーションエラー: %w", err),
					Timestamp: time.Now(),
				})
				index++
				continue
			}

			// 処理実行
			if err := s.processItemWithRetry(ctx, processor, item, index, nil); err != nil {
				result.FailedItems++
				result.Errors = append(result.Errors, BatchError{
					Index:     index,
					Item:      item,
					Error:     err,
					Timestamp: time.Now(),
				})
			} else {
				result.SuccessfulItems++
			}

			result.ProcessedItems++
			index++

		case <-ctx.Done():
			result.EndTime = time.Now()
			result.Duration = result.EndTime.Sub(result.StartTime)
			return result, ctx.Err()
		}
	}
}

// CreateBatchJob バッチジョブを作成
func (s *batchProcessorService) CreateBatchJob(ctx context.Context, name string, totalItems int) (*BatchJob, error) {
	job := &BatchJob{
		ID:            uuid.New(),
		Name:          name,
		Status:        BatchJobStatusPending,
		TotalItems:    totalItems,
		StartedAt:     time.Now(),
		LastUpdatedAt: time.Now(),
		Metadata:      make(map[string]interface{}),
	}

	s.jobsMutex.Lock()
	s.jobs[job.ID] = job
	s.jobsMutex.Unlock()

	s.logger.Info("Batch job created",
		zap.String("job_id", job.ID.String()),
		zap.String("name", name),
		zap.Int("total_items", totalItems))

	return job, nil
}

// UpdateBatchJobProgress バッチジョブの進捗を更新
func (s *batchProcessorService) UpdateBatchJobProgress(ctx context.Context, jobID uuid.UUID, processedItems int, failedItems int) error {
	s.jobsMutex.Lock()
	defer s.jobsMutex.Unlock()

	job, exists := s.jobs[jobID]
	if !exists {
		return fmt.Errorf("ジョブが見つかりません: %s", jobID)
	}

	job.ProcessedItems = processedItems
	job.FailedItems = failedItems
	job.SuccessfulItems = processedItems - failedItems
	job.Status = BatchJobStatusRunning
	job.LastUpdatedAt = time.Now()

	return nil
}

// CompleteBatchJob バッチジョブを完了
func (s *batchProcessorService) CompleteBatchJob(ctx context.Context, jobID uuid.UUID, result *BatchResult) error {
	s.jobsMutex.Lock()
	defer s.jobsMutex.Unlock()

	job, exists := s.jobs[jobID]
	if !exists {
		return fmt.Errorf("ジョブが見つかりません: %s", jobID)
	}

	now := time.Now()
	job.ProcessedItems = result.ProcessedItems
	job.SuccessfulItems = result.SuccessfulItems
	job.FailedItems = result.FailedItems
	job.CompletedAt = &now
	job.LastUpdatedAt = now

	if result.FailedItems > 0 {
		job.Status = BatchJobStatusFailed
	} else {
		job.Status = BatchJobStatusCompleted
	}

	// メタデータをマージ
	for k, v := range result.Metadata {
		job.Metadata[k] = v
	}

	s.logger.Info("Batch job completed",
		zap.String("job_id", job.ID.String()),
		zap.String("status", string(job.Status)),
		zap.Int("processed", job.ProcessedItems),
		zap.Int("successful", job.SuccessfulItems),
		zap.Int("failed", job.FailedItems))

	return nil
}

// GetBatchJob バッチジョブを取得
func (s *batchProcessorService) GetBatchJob(ctx context.Context, jobID uuid.UUID) (*BatchJob, error) {
	s.jobsMutex.RLock()
	defer s.jobsMutex.RUnlock()

	job, exists := s.jobs[jobID]
	if !exists {
		return nil, fmt.Errorf("ジョブが見つかりません: %s", jobID)
	}

	// コピーを返す
	jobCopy := *job
	return &jobCopy, nil
}

// SetErrorHandler エラーハンドラーを設定
func (s *batchProcessorService) SetErrorHandler(handler ErrorHandler) {
	s.errorHandler = handler
}

// SetRetryPolicy リトライポリシーを設定
func (s *batchProcessorService) SetRetryPolicy(policy RetryPolicy) {
	s.retryPolicy = policy
}

// processConcurrentInternal 並行処理の内部実装
func (s *batchProcessorService) processConcurrentInternal(ctx context.Context, processor BatchProcessor, items []interface{}, options *BatchOptions, result *BatchResult) (*BatchResult, error) {
	g, ctx := errgroup.WithContext(ctx)

	// セマフォでコンカレンシーを制御
	sem := make(chan struct{}, options.Concurrency)
	resultChan := make(chan *itemResult, len(items))

	for i, item := range items {
		i, item := i, item // ループ変数をキャプチャ

		g.Go(func() error {
			sem <- struct{}{}        // セマフォを取得
			defer func() { <-sem }() // セマフォを解放

			itemRes := &itemResult{index: i, item: item}

			// 処理実行
			if err := s.processItemWithRetry(ctx, processor, item, i, options.RetryOptions); err != nil {
				itemRes.err = err
				if options.ErrorHandler != nil {
					itemRes.err = options.ErrorHandler(ctx, err, item, i)
				}
			} else {
				itemRes.success = true
			}

			resultChan <- itemRes
			return nil
		})
	}

	// 全ゴルーチンの完了を待つ
	go func() {
		g.Wait()
		close(resultChan)
	}()

	// 結果を収集
	for itemRes := range resultChan {
		result.ProcessedItems++
		if itemRes.success {
			result.SuccessfulItems++
		} else {
			result.FailedItems++
			result.Errors = append(result.Errors, BatchError{
				Index:     itemRes.index,
				Item:      itemRes.item,
				Error:     itemRes.err,
				Timestamp: time.Now(),
			})
		}
	}

	result.EndTime = time.Now()
	result.Duration = result.EndTime.Sub(result.StartTime)

	return result, g.Wait()
}

// processSequentialInternal 逐次処理の内部実装
func (s *batchProcessorService) processSequentialInternal(ctx context.Context, processor BatchProcessor, items []interface{}, options *BatchOptions, result *BatchResult) (*BatchResult, error) {
	for i, item := range items {
		select {
		case <-ctx.Done():
			result.EndTime = time.Now()
			result.Duration = result.EndTime.Sub(result.StartTime)
			return result, ctx.Err()
		default:
		}

		result.ProcessedItems++

		// 処理実行
		if err := s.processItemWithRetry(ctx, processor, item, i, options.RetryOptions); err != nil {
			result.FailedItems++
			result.Errors = append(result.Errors, BatchError{
				Index:     i,
				Item:      item,
				Error:     err,
				Timestamp: time.Now(),
			})

			if options.StopOnError {
				result.EndTime = time.Now()
				result.Duration = result.EndTime.Sub(result.StartTime)
				return result, fmt.Errorf("エラーにより処理を中止しました: %w", err)
			}
		} else {
			result.SuccessfulItems++
		}

		// 進捗コールバック
		if options.ProgressCallback != nil {
			percentage := float64(result.ProcessedItems) / float64(result.TotalItems) * 100
			options.ProgressCallback(result.ProcessedItems, result.TotalItems, percentage)
		}
	}

	result.EndTime = time.Now()
	result.Duration = result.EndTime.Sub(result.StartTime)

	return result, nil
}

// processChunk チャンクを処理
func (s *batchProcessorService) processChunk(ctx context.Context, processor BatchProcessor, chunk []interface{}, startIndex int) *BatchResult {
	result := &BatchResult{
		TotalItems: len(chunk),
		Errors:     make([]BatchError, 0),
	}

	for i, item := range chunk {
		if err := processor.Validate(item); err != nil {
			result.SkippedItems++
			continue
		}

		if err := s.processItemWithRetry(ctx, processor, item, startIndex+i, nil); err != nil {
			result.FailedItems++
			result.Errors = append(result.Errors, BatchError{
				Index:     startIndex + i,
				Item:      item,
				Error:     err,
				Timestamp: time.Now(),
			})
		} else {
			result.SuccessfulItems++
		}

		result.ProcessedItems++
	}

	return result
}

// processItemWithRetry リトライ付きでアイテムを処理
func (s *batchProcessorService) processItemWithRetry(ctx context.Context, processor BatchProcessor, item interface{}, index int, retryOptions *RetryOptions) error {
	var lastErr error
	retries := 0

	// リトライオプションがない場合はデフォルトポリシーを使用
	if retryOptions == nil {
		for {
			if err := processor.Process(ctx, item); err != nil {
				lastErr = err
				processor.OnError(ctx, item, err)

				shouldRetry, delay := s.retryPolicy(err, retries)
				if !shouldRetry {
					return lastErr
				}

				retries++
				time.Sleep(delay)
			} else {
				processor.OnSuccess(ctx, item)
				return nil
			}
		}
	}

	// カスタムリトライオプション
	maxRetries := retryOptions.MaxRetries
	retryDelay := retryOptions.RetryDelay

	for retries <= maxRetries {
		if err := processor.Process(ctx, item); err != nil {
			lastErr = err
			processor.OnError(ctx, item, err)

			// リトライ可能なエラーかチェック
			if retryOptions.RetryableError != nil && !retryOptions.RetryableError(err) {
				return lastErr
			}

			if retries >= maxRetries {
				return lastErr
			}

			// バックオフ計算
			delay := retryDelay
			if retryOptions.BackoffFactor > 1 {
				delay = time.Duration(float64(delay) * float64(retries) * retryOptions.BackoffFactor)
				if retryOptions.MaxRetryDelay > 0 && delay > retryOptions.MaxRetryDelay {
					delay = retryOptions.MaxRetryDelay
				}
			}

			retries++
			time.Sleep(delay)
		} else {
			processor.OnSuccess(ctx, item)
			return nil
		}
	}

	return lastErr
}

// itemResult アイテム処理結果（内部使用）
type itemResult struct {
	index   int
	item    interface{}
	success bool
	err     error
}
