package utils

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/config"
)

// BatchContext バッチ処理用のコンテキスト管理
type BatchContext struct {
	config config.BatchConfig
	logger interface{} // *zap.Logger を想定
}

// NewBatchContext バッチコンテキストを作成
func NewBatchContext(cfg config.BatchConfig, logger interface{}) *BatchContext {
	return &BatchContext{
		config: cfg,
		logger: logger,
	}
}

// CreateOperationContext 操作種別に応じたコンテキストを作成
func (bc *BatchContext) CreateOperationContext(baseCtx context.Context, operation string) (context.Context, context.CancelFunc) {
	var timeout time.Duration

	switch operation {
	case "bulk_insert":
		timeout = 30 * time.Minute
	case "batch_update":
		timeout = 45 * time.Minute
	case "archive_operation":
		timeout = 2 * time.Hour
	case "migration_batch":
		timeout = 4 * time.Hour
	case "vacuum_analyze":
		timeout = 1 * time.Hour
	case "index_maintenance":
		timeout = 90 * time.Minute
	case "statistics_update":
		timeout = 30 * time.Minute
	default:
		timeout = bc.config.DefaultTimeout
	}

	return context.WithTimeout(baseCtx, timeout)
}

// CreateJobContext ジョブ名に応じたコンテキストを作成
func (bc *BatchContext) CreateJobContext(baseCtx context.Context, jobName string) (context.Context, context.CancelFunc) {
	timeout := bc.config.GetJobTimeout(jobName)
	return context.WithTimeout(baseCtx, timeout)
}

// RetryWithExponentialBackoff 指数バックオフによるリトライ実行
func (bc *BatchContext) RetryWithExponentialBackoff(ctx context.Context, operation func() error) error {
	var lastErr error

	for attempt := 0; attempt <= bc.config.MaxRetries; attempt++ {
		if attempt > 0 {
			delay := bc.calculateDelay(attempt)
			select {
			case <-time.After(delay):
			case <-ctx.Done():
				return ctx.Err()
			}
		}

		lastErr = operation()
		if lastErr == nil {
			return nil
		}

		if !bc.config.IsRetryableError(lastErr) {
			return lastErr
		}

		// ログ出力（実際の実装では logger を使用）
		if attempt < bc.config.MaxRetries {
			// bc.logger.Warn("Retrying operation", zap.Int("attempt", attempt+1), zap.Error(lastErr))
		}
	}

	return fmt.Errorf("operation failed after %d retries: %w", bc.config.MaxRetries, lastErr)
}

// calculateDelay リトライ間隔を計算（指数バックオフ + ジッター）
func (bc *BatchContext) calculateDelay(attempt int) time.Duration {
	// 指数バックオフ
	delay := float64(bc.config.BaseDelay) * math.Pow(bc.config.Multiplier, float64(attempt-1))

	// 最大遅延時間の制限
	if delay > float64(bc.config.MaxDelay) {
		delay = float64(bc.config.MaxDelay)
	}

	// ジッターを追加してサンダリングハード問題を回避
	if bc.config.JitterFactor > 0 {
		jitter := delay * bc.config.JitterFactor * (rand.Float64()*2 - 1) // -jitter to +jitter
		delay += jitter
	}

	// 負の値にならないよう保証
	if delay < 0 {
		delay = float64(bc.config.BaseDelay)
	}

	return time.Duration(delay)
}

// ChunkProcessor チャンク単位での処理を実行
type ChunkProcessor struct {
	config       config.BatchConfig
	batchContext *BatchContext
}

// NewChunkProcessor チャンクプロセッサーを作成
func NewChunkProcessor(cfg config.BatchConfig, bc *BatchContext) *ChunkProcessor {
	return &ChunkProcessor{
		config:       cfg,
		batchContext: bc,
	}
}

// ProcessInChunks データをチャンク単位で処理
func (cp *ChunkProcessor) ProcessInChunks(
	ctx context.Context,
	totalItems int,
	processor func(ctx context.Context, offset, limit int) error,
) error {
	for offset := 0; offset < totalItems; offset += cp.config.ChunkSize {
		limit := cp.config.ChunkSize
		if offset+limit > totalItems {
			limit = totalItems - offset
		}

		// チャンク処理用のコンテキスト作成
		chunkCtx, cancel := context.WithTimeout(ctx, cp.config.MaxTransactionTime)

		// リトライ付きでチャンク処理実行
		err := cp.batchContext.RetryWithExponentialBackoff(chunkCtx, func() error {
			return processor(chunkCtx, offset, limit)
		})

		cancel()

		if err != nil {
			return fmt.Errorf("failed to process chunk (offset: %d, limit: %d): %w", offset, limit, err)
		}

		// 進捗レポート
		if offset%cp.getProgressReportInterval() == 0 {
			// progress := float64(offset) / float64(totalItems) * 100
			// cp.batchContext.logger.Info("Chunk processing progress",
			// 	zap.Float64("progress_percent", progress),
			// 	zap.Int("processed_items", offset))
		}

		// コンテキストキャンセルチェック
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			// 継続
		}
	}

	return nil
}

// getProgressReportInterval 進捗レポート間隔を計算
func (cp *ChunkProcessor) getProgressReportInterval() int {
	// 全体の5%毎、または1000チャンク毎のうち小さい方
	return min(cp.config.ChunkSize*10, 1000)
}

// HealthChecker バッチ処理中のヘルスチェック
type HealthChecker struct {
	config        config.BatchConfig
	lastCheck     time.Time
	isHealthy     bool
	checkInterval time.Duration
}

// NewHealthChecker ヘルスチェッカーを作成
func NewHealthChecker(cfg config.BatchConfig) *HealthChecker {
	return &HealthChecker{
		config:        cfg,
		checkInterval: cfg.HealthCheckInterval,
		isHealthy:     true,
	}
}

// PerformHealthCheck ヘルスチェックを実行
func (hc *HealthChecker) PerformHealthCheck(ctx context.Context, db interface{}) error {
	now := time.Now()
	if now.Sub(hc.lastCheck) < hc.checkInterval {
		return nil // チェック間隔未満の場合はスキップ
	}

	// コンテキストにタイムアウトを設定
	checkCtx, cancel := context.WithTimeout(ctx, hc.config.ConnectionTimeout)
	defer cancel()

	// 簡単なクエリでDB接続を確認
	// この部分は実際のDB実装に応じて調整が必要
	err := hc.executeHealthCheckQuery(checkCtx, db)

	hc.lastCheck = now
	hc.isHealthy = (err == nil)

	if err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}

	return nil
}

// executeHealthCheckQuery ヘルスチェッククエリを実行
func (hc *HealthChecker) executeHealthCheckQuery(ctx context.Context, db interface{}) error {
	// 実際の実装では、DBインターフェースを使用してクエリを実行
	// 例: SELECT 1
	// ここではダミー実装
	time.Sleep(10 * time.Millisecond) // DB呼び出しのシミュレーション
	return nil
}

// IsHealthy ヘルス状態を取得
func (hc *HealthChecker) IsHealthy() bool {
	return hc.isHealthy
}

// BatchMetrics バッチ処理のメトリクス収集
type BatchMetrics struct {
	StartTime      time.Time
	EndTime        time.Time
	ProcessedItems int
	FailedItems    int
	RetryCount     int
	ChunkCount     int
	TimeoutCount   int
	ErrorDetails   []string
}

// NewBatchMetrics メトリクスを初期化
func NewBatchMetrics() *BatchMetrics {
	return &BatchMetrics{
		StartTime:    time.Now(),
		ErrorDetails: make([]string, 0),
	}
}

// RecordError エラーを記録
func (bm *BatchMetrics) RecordError(err error) {
	bm.FailedItems++
	bm.ErrorDetails = append(bm.ErrorDetails, err.Error())
}

// RecordRetry リトライを記録
func (bm *BatchMetrics) RecordRetry() {
	bm.RetryCount++
}

// RecordTimeout タイムアウトを記録
func (bm *BatchMetrics) RecordTimeout() {
	bm.TimeoutCount++
}

// Finish 処理完了を記録
func (bm *BatchMetrics) Finish() {
	bm.EndTime = time.Now()
}

// GetDuration 処理時間を取得
func (bm *BatchMetrics) GetDuration() time.Duration {
	endTime := bm.EndTime
	if endTime.IsZero() {
		endTime = time.Now()
	}
	return endTime.Sub(bm.StartTime)
}

// GetThroughput スループットを計算（アイテム/秒）
func (bm *BatchMetrics) GetThroughput() float64 {
	duration := bm.GetDuration()
	if duration.Seconds() == 0 {
		return 0
	}
	return float64(bm.ProcessedItems) / duration.Seconds()
}

// GetSuccessRate 成功率を計算
func (bm *BatchMetrics) GetSuccessRate() float64 {
	total := bm.ProcessedItems + bm.FailedItems
	if total == 0 {
		return 0
	}
	return float64(bm.ProcessedItems) / float64(total) * 100
}

// GetSummary サマリー情報を取得
func (bm *BatchMetrics) GetSummary() map[string]interface{} {
	return map[string]interface{}{
		"duration_seconds":     bm.GetDuration().Seconds(),
		"processed_items":      bm.ProcessedItems,
		"failed_items":         bm.FailedItems,
		"retry_count":          bm.RetryCount,
		"timeout_count":        bm.TimeoutCount,
		"throughput_per_sec":   bm.GetThroughput(),
		"success_rate_percent": bm.GetSuccessRate(),
		"chunk_count":          bm.ChunkCount,
	}
}

// PostgreSQLErrorChecker PostgreSQL特有のエラーチェック
type PostgreSQLErrorChecker struct{}

// IsDeadlockError デッドロックエラーかどうか判定
func (pec *PostgreSQLErrorChecker) IsDeadlockError(err error) bool {
	if err == nil {
		return false
	}
	errStr := strings.ToLower(err.Error())
	return strings.Contains(errStr, "40p01") || strings.Contains(errStr, "deadlock")
}

// IsConnectionError 接続エラーかどうか判定
func (pec *PostgreSQLErrorChecker) IsConnectionError(err error) bool {
	if err == nil {
		return false
	}
	errStr := strings.ToLower(err.Error())
	connectionErrors := []string{
		"connection refused",
		"connection reset",
		"connection closed",
		"server closed",
		"53300", // too_many_connections
	}

	for _, pattern := range connectionErrors {
		if strings.Contains(errStr, pattern) {
			return true
		}
	}
	return false
}

// IsTimeoutError タイムアウトエラーかどうか判定
func (pec *PostgreSQLErrorChecker) IsTimeoutError(err error) bool {
	if err == nil {
		return false
	}
	errStr := strings.ToLower(err.Error())
	timeoutErrors := []string{
		"timeout",
		"context deadline exceeded",
		"statement timeout",
		"lock timeout",
	}

	for _, pattern := range timeoutErrors {
		if strings.Contains(errStr, pattern) {
			return true
		}
	}
	return false
}

// ユーティリティ関数
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
