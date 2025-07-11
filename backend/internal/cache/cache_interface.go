package cache

import (
	"context"
	"time"

	"go.uber.org/zap"
)

// Cache 汎用キャッシュインターフェース
type Cache interface {
	// Get キーから値を取得
	Get(ctx context.Context, key string, dest interface{}) error

	// Set キーに値を設定
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error

	// Delete キーを削除
	Delete(ctx context.Context, keys ...string) error

	// Exists キーが存在するか確認
	Exists(ctx context.Context, key string) (bool, error)

	// Clear パターンにマッチするキーをクリア
	Clear(ctx context.Context, pattern string) error
}

// CacheManager 各種キャッシュマネージャーを統合管理
type CacheManager struct {
	redis          *RedisClient
	weeklyReport   *WeeklyReportCache
	expense        *ExpenseCache
	category       *CategoryCache
	expenseSummary *ExpenseSummaryCache
	logger         *zap.Logger
}

// NewCacheManager キャッシュマネージャーを作成
func NewCacheManager(redisClient *RedisClient, logger *zap.Logger) *CacheManager {
	return &CacheManager{
		redis:          redisClient,
		weeklyReport:   NewWeeklyReportCache(redisClient, logger),
		expense:        NewExpenseCache(redisClient, logger),
		category:       NewCategoryCache(redisClient, logger),
		expenseSummary: NewExpenseSummaryCache(redisClient, logger),
		logger:         logger,
	}
}

// WeeklyReport 週報キャッシュマネージャーを取得
func (m *CacheManager) WeeklyReport() *WeeklyReportCache {
	return m.weeklyReport
}

// Expense 経費申請キャッシュマネージャーを取得
func (m *CacheManager) Expense() *ExpenseCache {
	return m.expense
}

// Category カテゴリキャッシュマネージャーを取得
func (m *CacheManager) Category() *CategoryCache {
	return m.category
}

// ExpenseSummary 経費集計キャッシュマネージャーを取得
func (m *CacheManager) ExpenseSummary() *ExpenseSummaryCache {
	return m.expenseSummary
}

// Redis Redisクライアントを取得
func (m *CacheManager) Redis() *RedisClient {
	return m.redis
}

// HealthCheck キャッシュシステムの健全性をチェック
func (m *CacheManager) HealthCheck(ctx context.Context) error {
	return m.redis.HealthCheck(ctx)
}

// Close キャッシュシステムを閉じる
func (m *CacheManager) Close() error {
	return m.redis.Close()
}

// IsEnabled キャッシュが有効かチェック
func (m *CacheManager) IsEnabled() bool {
	return m.redis != nil
}

// Delete キーを削除
func (m *CacheManager) Delete(ctx context.Context, keys ...string) error {
	if m.redis == nil {
		return nil
	}
	return m.redis.Delete(ctx, keys...)
}

// DeleteByPrefix プレフィックスにマッチするキーを削除
func (m *CacheManager) DeleteByPrefix(ctx context.Context, prefix string) error {
	if m.redis == nil {
		return nil
	}
	return m.redis.Clear(ctx, prefix)
}
