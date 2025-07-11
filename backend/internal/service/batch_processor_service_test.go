package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// TestBatchProcessor モックバッチプロセッサー
type TestBatchProcessor struct {
	processFunc    func(ctx context.Context, item interface{}) error
	validateFunc   func(item interface{}) error
	onErrorFunc    func(ctx context.Context, item interface{}, err error) error
	onSuccessFunc  func(ctx context.Context, item interface{}) error
	processedItems []interface{}
	mutex          sync.Mutex
}

func NewTestBatchProcessor() *TestBatchProcessor {
	return &TestBatchProcessor{
		processedItems: make([]interface{}, 0),
	}
}

func (p *TestBatchProcessor) Process(ctx context.Context, item interface{}) error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	p.processedItems = append(p.processedItems, item)

	if p.processFunc != nil {
		return p.processFunc(ctx, item)
	}
	return nil
}

func (p *TestBatchProcessor) Validate(item interface{}) error {
	if p.validateFunc != nil {
		return p.validateFunc(item)
	}
	return nil
}

func (p *TestBatchProcessor) OnError(ctx context.Context, item interface{}, err error) error {
	if p.onErrorFunc != nil {
		return p.onErrorFunc(ctx, item, err)
	}
	return err
}

func (p *TestBatchProcessor) OnSuccess(ctx context.Context, item interface{}) error {
	if p.onSuccessFunc != nil {
		return p.onSuccessFunc(ctx, item)
	}
	return nil
}

func (p *TestBatchProcessor) GetProcessedItems() []interface{} {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	return append([]interface{}{}, p.processedItems...)
}

// TestBatchProcessorService バッチプロセッサーサービスのテストスイート
func TestBatchProcessorService(t *testing.T) {
	t.Run("ProcessBatch", func(t *testing.T) {
		testProcessBatch(t)
	})

	t.Run("ProcessBatchWithOptions", func(t *testing.T) {
		testProcessBatchWithOptions(t)
	})

	t.Run("ProcessConcurrent", func(t *testing.T) {
		testProcessConcurrent(t)
	})

	t.Run("ProcessConcurrentWithRetry", func(t *testing.T) {
		testProcessConcurrentWithRetry(t)
	})

	t.Run("ProcessInChunks", func(t *testing.T) {
		testProcessInChunks(t)
	})

	t.Run("ProcessInChunksWithProgress", func(t *testing.T) {
		testProcessInChunksWithProgress(t)
	})

	t.Run("ProcessStream", func(t *testing.T) {
		testProcessStream(t)
	})

	t.Run("BatchJobManagement", func(t *testing.T) {
		testBatchJobManagement(t)
	})

	t.Run("ErrorHandling", func(t *testing.T) {
		testErrorHandling(t)
	})

	t.Run("RetryPolicy", func(t *testing.T) {
		testRetryPolicy(t)
	})
}

// testProcessBatch 基本的なバッチ処理のテスト
func testProcessBatch(t *testing.T) {
	t.Run("正常にバッチ処理を実行", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		ctx := context.Background()

		items := []interface{}{"item1", "item2", "item3"}

		result, err := service.ProcessBatch(ctx, processor, items)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 3, result.TotalItems)
		assert.Equal(t, 3, result.ProcessedItems)
		assert.Equal(t, 3, result.SuccessfulItems)
		assert.Equal(t, 0, result.FailedItems)
		assert.Equal(t, 0, result.SkippedItems)
		assert.Empty(t, result.Errors)

		processedItems := processor.GetProcessedItems()
		assert.Len(t, processedItems, 3)
		assert.Contains(t, processedItems, "item1")
		assert.Contains(t, processedItems, "item2")
		assert.Contains(t, processedItems, "item3")
	})

	t.Run("空のアイテムリストの場合", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		ctx := context.Background()

		items := []interface{}{}

		result, err := service.ProcessBatch(ctx, processor, items)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 0, result.TotalItems)
		assert.Equal(t, 0, result.ProcessedItems)
		assert.Equal(t, 0, result.SuccessfulItems)
		assert.Equal(t, 0, result.FailedItems)
		assert.Equal(t, 0, result.SkippedItems)
	})

	t.Run("処理エラーが発生した場合", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		processor.processFunc = func(ctx context.Context, item interface{}) error {
			if item == "item2" {
				return errors.New("処理エラー")
			}
			return nil
		}
		ctx := context.Background()

		items := []interface{}{"item1", "item2", "item3"}

		result, err := service.ProcessBatch(ctx, processor, items)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 3, result.TotalItems)
		assert.Equal(t, 3, result.ProcessedItems)
		assert.Equal(t, 2, result.SuccessfulItems)
		assert.Equal(t, 1, result.FailedItems)
		assert.Len(t, result.Errors, 1)
		assert.Equal(t, "item2", result.Errors[0].Item)
	})
}

// testProcessBatchWithOptions オプション付きバッチ処理のテスト
func testProcessBatchWithOptions(t *testing.T) {
	t.Run("タイムアウト設定でバッチ処理", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		processor.processFunc = func(ctx context.Context, item interface{}) error {
			time.Sleep(100 * time.Millisecond)
			return nil
		}
		ctx := context.Background()

		items := []interface{}{"item1", "item2", "item3"}
		options := &BatchOptions{
			Timeout: 50 * time.Millisecond,
		}

		result, err := service.ProcessBatchWithOptions(ctx, processor, items, options)
		assert.Error(t, err)
		assert.NotNil(t, result)
		// タイムアウトにより一部のアイテムのみ処理される
		assert.True(t, result.ProcessedItems < result.TotalItems)
	})

	t.Run("バリデーションエラーでスキップ", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		processor.validateFunc = func(item interface{}) error {
			if item == "invalid" {
				return errors.New("バリデーションエラー")
			}
			return nil
		}
		ctx := context.Background()

		items := []interface{}{"item1", "invalid", "item3"}
		options := &BatchOptions{}

		result, err := service.ProcessBatchWithOptions(ctx, processor, items, options)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 3, result.TotalItems)
		assert.Equal(t, 2, result.ProcessedItems)
		assert.Equal(t, 2, result.SuccessfulItems)
		assert.Equal(t, 0, result.FailedItems)
		assert.Equal(t, 1, result.SkippedItems)
		assert.Len(t, result.Errors, 1)
	})

	t.Run("StopOnError設定でエラー時に中止", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		processor.processFunc = func(ctx context.Context, item interface{}) error {
			if item == "item2" {
				return errors.New("処理エラー")
			}
			return nil
		}
		ctx := context.Background()

		items := []interface{}{"item1", "item2", "item3"}
		options := &BatchOptions{
			StopOnError: true,
		}

		result, err := service.ProcessBatchWithOptions(ctx, processor, items, options)
		assert.Error(t, err)
		assert.NotNil(t, result)
		assert.Contains(t, err.Error(), "エラーにより処理を中止しました")
	})
}

// testProcessConcurrent 並行処理のテスト
func testProcessConcurrent(t *testing.T) {
	t.Run("並行処理で正常に実行", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		ctx := context.Background()

		items := []interface{}{"item1", "item2", "item3", "item4", "item5"}
		concurrency := 3

		result, err := service.ProcessConcurrent(ctx, processor, items, concurrency)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 5, result.TotalItems)
		assert.Equal(t, 5, result.ProcessedItems)
		assert.Equal(t, 5, result.SuccessfulItems)
		assert.Equal(t, 0, result.FailedItems)

		processedItems := processor.GetProcessedItems()
		assert.Len(t, processedItems, 5)
	})

	t.Run("並行処理でエラーが発生", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		processor.processFunc = func(ctx context.Context, item interface{}) error {
			if item == "item3" {
				return errors.New("並行処理エラー")
			}
			return nil
		}
		ctx := context.Background()

		items := []interface{}{"item1", "item2", "item3", "item4"}
		concurrency := 2

		result, err := service.ProcessConcurrent(ctx, processor, items, concurrency)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 4, result.TotalItems)
		assert.Equal(t, 4, result.ProcessedItems)
		assert.Equal(t, 3, result.SuccessfulItems)
		assert.Equal(t, 1, result.FailedItems)
		assert.Len(t, result.Errors, 1)
	})
}

// testProcessConcurrentWithRetry リトライ付き並行処理のテスト
func testProcessConcurrentWithRetry(t *testing.T) {
	t.Run("リトライで成功", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()

		attemptCount := 0
		processor.processFunc = func(ctx context.Context, item interface{}) error {
			if item == "retry_item" {
				attemptCount++
				if attemptCount < 3 {
					return errors.New("一時的なエラー")
				}
			}
			return nil
		}

		ctx := context.Background()
		items := []interface{}{"item1", "retry_item", "item3"}
		retryOptions := &RetryOptions{
			MaxRetries: 3,
			RetryDelay: 10 * time.Millisecond,
		}

		result, err := service.ProcessConcurrentWithRetry(ctx, processor, items, 2, retryOptions)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 3, result.TotalItems)
		assert.Equal(t, 3, result.ProcessedItems)
		assert.Equal(t, 3, result.SuccessfulItems)
		assert.Equal(t, 0, result.FailedItems)
	})

	t.Run("リトライ回数を超えて失敗", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		processor.processFunc = func(ctx context.Context, item interface{}) error {
			if item == "always_fail" {
				return errors.New("常にエラー")
			}
			return nil
		}

		ctx := context.Background()
		items := []interface{}{"item1", "always_fail", "item3"}
		retryOptions := &RetryOptions{
			MaxRetries: 2,
			RetryDelay: 10 * time.Millisecond,
		}

		result, err := service.ProcessConcurrentWithRetry(ctx, processor, items, 2, retryOptions)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 3, result.TotalItems)
		assert.Equal(t, 3, result.ProcessedItems)
		assert.Equal(t, 2, result.SuccessfulItems)
		assert.Equal(t, 1, result.FailedItems)
		assert.Len(t, result.Errors, 1)
	})
}

// testProcessInChunks チャンク処理のテスト
func testProcessInChunks(t *testing.T) {
	t.Run("チャンク単位で正常に処理", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		ctx := context.Background()

		items := []interface{}{"item1", "item2", "item3", "item4", "item5"}
		chunkSize := 2

		result, err := service.ProcessInChunks(ctx, processor, items, chunkSize)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 5, result.TotalItems)
		assert.Equal(t, 5, result.ProcessedItems)
		assert.Equal(t, 5, result.SuccessfulItems)
		assert.Equal(t, 0, result.FailedItems)

		processedItems := processor.GetProcessedItems()
		assert.Len(t, processedItems, 5)
	})

	t.Run("チャンクサイズがアイテム数より大きい場合", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		ctx := context.Background()

		items := []interface{}{"item1", "item2"}
		chunkSize := 5

		result, err := service.ProcessInChunks(ctx, processor, items, chunkSize)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 2, result.TotalItems)
		assert.Equal(t, 2, result.ProcessedItems)
		assert.Equal(t, 2, result.SuccessfulItems)
	})
}

// testProcessInChunksWithProgress 進捗付きチャンク処理のテスト
func testProcessInChunksWithProgress(t *testing.T) {
	t.Run("進捗コールバックが呼ばれる", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		ctx := context.Background()

		progressCallbacks := []float64{}
		progressCallback := func(processed, total int, percentage float64) {
			progressCallbacks = append(progressCallbacks, percentage)
		}

		items := []interface{}{"item1", "item2", "item3", "item4"}
		chunkSize := 2

		result, err := service.ProcessInChunksWithProgress(ctx, processor, items, chunkSize, progressCallback)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 4, result.TotalItems)
		assert.Equal(t, 4, result.ProcessedItems)
		assert.Equal(t, 4, result.SuccessfulItems)

		// 進捗コールバックが呼ばれたことを確認
		assert.NotEmpty(t, progressCallbacks)
		assert.Contains(t, progressCallbacks, 100.0) // 最終的に100%になる
	})
}

// testProcessStream ストリーム処理のテスト
func testProcessStream(t *testing.T) {
	t.Run("ストリーム処理で正常に実行", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		ctx := context.Background()

		// チャネルを作成してアイテムを送信
		itemChannel := make(chan interface{}, 3)
		itemChannel <- "item1"
		itemChannel <- "item2"
		itemChannel <- "item3"
		close(itemChannel)

		result, err := service.ProcessStream(ctx, processor, itemChannel)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 3, result.TotalItems)
		assert.Equal(t, 3, result.ProcessedItems)
		assert.Equal(t, 3, result.SuccessfulItems)
		assert.Equal(t, 0, result.FailedItems)

		processedItems := processor.GetProcessedItems()
		assert.Len(t, processedItems, 3)
	})

	t.Run("ストリーム処理でコンテキストキャンセル", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()

		ctx, cancel := context.WithCancel(context.Background())

		// 無限に送信するチャネル
		itemChannel := make(chan interface{})
		go func() {
			defer close(itemChannel)
			for i := 0; i < 100; i++ {
				select {
				case itemChannel <- i:
				case <-ctx.Done():
					return
				}
			}
		}()

		// 少し待ってからキャンセル
		go func() {
			time.Sleep(50 * time.Millisecond)
			cancel()
		}()

		result, err := service.ProcessStream(ctx, processor, itemChannel)
		assert.Error(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.ProcessedItems < 100) // 全ては処理されない
	})
}

// testBatchJobManagement バッチジョブ管理のテスト
func testBatchJobManagement(t *testing.T) {
	t.Run("バッチジョブの作成と取得", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		ctx := context.Background()

		// ジョブ作成
		job, err := service.CreateBatchJob(ctx, "テストジョブ", 100)
		assert.NoError(t, err)
		assert.NotNil(t, job)
		assert.Equal(t, "テストジョブ", job.Name)
		assert.Equal(t, 100, job.TotalItems)
		assert.Equal(t, BatchJobStatusPending, job.Status)

		// ジョブ取得
		retrievedJob, err := service.GetBatchJob(ctx, job.ID)
		assert.NoError(t, err)
		assert.NotNil(t, retrievedJob)
		assert.Equal(t, job.ID, retrievedJob.ID)
		assert.Equal(t, job.Name, retrievedJob.Name)
	})

	t.Run("バッチジョブの進捗更新", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		ctx := context.Background()

		// ジョブ作成
		job, err := service.CreateBatchJob(ctx, "進捗テスト", 50)
		require.NoError(t, err)

		// 進捗更新
		err = service.UpdateBatchJobProgress(ctx, job.ID, 25, 2)
		assert.NoError(t, err)

		// 更新内容を確認
		updatedJob, err := service.GetBatchJob(ctx, job.ID)
		assert.NoError(t, err)
		assert.Equal(t, 25, updatedJob.ProcessedItems)
		assert.Equal(t, 2, updatedJob.FailedItems)
		assert.Equal(t, 23, updatedJob.SuccessfulItems)
		assert.Equal(t, BatchJobStatusRunning, updatedJob.Status)
	})

	t.Run("バッチジョブの完了", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		ctx := context.Background()

		// ジョブ作成
		job, err := service.CreateBatchJob(ctx, "完了テスト", 10)
		require.NoError(t, err)

		// 処理結果
		result := &BatchResult{
			TotalItems:      10,
			ProcessedItems:  10,
			SuccessfulItems: 8,
			FailedItems:     2,
			Metadata:        map[string]interface{}{"test": "value"},
		}

		// ジョブ完了
		err = service.CompleteBatchJob(ctx, job.ID, result)
		assert.NoError(t, err)

		// 完了状態を確認
		completedJob, err := service.GetBatchJob(ctx, job.ID)
		assert.NoError(t, err)
		assert.Equal(t, BatchJobStatusFailed, completedJob.Status) // 失敗がある場合
		assert.Equal(t, 10, completedJob.ProcessedItems)
		assert.Equal(t, 8, completedJob.SuccessfulItems)
		assert.Equal(t, 2, completedJob.FailedItems)
		assert.NotNil(t, completedJob.CompletedAt)
		assert.Equal(t, "value", completedJob.Metadata["test"])
	})

	t.Run("存在しないジョブにアクセス", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		ctx := context.Background()

		nonExistentID := uuid.New()

		// 存在しないジョブの取得
		_, err := service.GetBatchJob(ctx, nonExistentID)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "ジョブが見つかりません")

		// 存在しないジョブの進捗更新
		err = service.UpdateBatchJobProgress(ctx, nonExistentID, 10, 0)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "ジョブが見つかりません")
	})
}

// testErrorHandling エラーハンドリングのテスト
func testErrorHandling(t *testing.T) {
	t.Run("カスタムエラーハンドラーを設定", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()
		processor.processFunc = func(ctx context.Context, item interface{}) error {
			return errors.New("テストエラー")
		}

		handledErrors := []error{}
		errorHandler := func(ctx context.Context, err error, item interface{}, index int) error {
			handledErrors = append(handledErrors, err)
			return nil // エラーを無視
		}

		service.SetErrorHandler(errorHandler)

		ctx := context.Background()
		items := []interface{}{"item1", "item2"}
		options := &BatchOptions{
			ErrorHandler: errorHandler,
		}

		result, err := service.ProcessBatchWithOptions(ctx, processor, items, options)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 2, result.TotalItems)
		assert.Equal(t, 2, result.ProcessedItems)
		assert.Equal(t, 2, result.SuccessfulItems) // エラーハンドラーでエラーを無視
		assert.Equal(t, 0, result.FailedItems)

		assert.Len(t, handledErrors, 2)
	})
}

// testRetryPolicy リトライポリシーのテスト
func testRetryPolicy(t *testing.T) {
	t.Run("カスタムリトライポリシーを設定", func(t *testing.T) {
		service := setupBatchProcessorTestService(t)
		processor := NewTestBatchProcessor()

		attemptCount := 0
		processor.processFunc = func(ctx context.Context, item interface{}) error {
			if item == "retry_item" {
				attemptCount++
				if attemptCount < 2 {
					return errors.New("リトライテストエラー")
				}
			}
			return nil
		}

		// カスタムリトライポリシー（1回だけリトライ）
		retryPolicy := func(err error, retries int) (bool, time.Duration) {
			if retries >= 1 {
				return false, 0
			}
			return true, 10 * time.Millisecond
		}

		service.SetRetryPolicy(retryPolicy)

		ctx := context.Background()
		items := []interface{}{"item1", "retry_item"}

		result, err := service.ProcessBatch(ctx, processor, items)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 2, result.TotalItems)
		assert.Equal(t, 2, result.ProcessedItems)
		assert.Equal(t, 2, result.SuccessfulItems)
		assert.Equal(t, 0, result.FailedItems)
		assert.Equal(t, 2, attemptCount) // リトライが1回実行された
	})
}

// Helper functions

func setupBatchProcessorTestService(t *testing.T) BatchProcessorServiceInterface {
	// テスト用のインメモリデータベースを作成
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	// ロガーを作成
	zapLogger, _ := zap.NewDevelopment()

	// サービスを作成
	service := NewBatchProcessorService(db, zapLogger)

	return service
}
