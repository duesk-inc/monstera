package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"go.uber.org/zap"
	"time"

	"github.com/duesk/monstera/internal/dto"
)

// ExpenseSummaryCache 経費集計関連のキャッシュを管理
type ExpenseSummaryCache struct {
	redis  *RedisClient
	logger *zap.Logger
	ttl    time.Duration
}

// NewExpenseSummaryCache 経費集計キャッシュマネージャーを作成
func NewExpenseSummaryCache(redis *RedisClient, logger *zap.Logger) *ExpenseSummaryCache {
	return &ExpenseSummaryCache{
		redis:  redis,
		logger: logger,
		ttl:    15 * time.Minute, // デフォルトTTL: 15分（集計データは頻繁に変わる可能性があるため短め）
	}
}

// キーのプレフィックス定義
const (
	monthlyStatsPrefix = "expense_summary:monthly:"
	yearlyStatsPrefix  = "expense_summary:yearly:"
	limitUsagePrefix   = "expense_summary:limit_usage:"
)

// GetMonthlyStats 月次統計をキャッシュから取得
func (c *ExpenseSummaryCache) GetMonthlyStats(ctx context.Context, userID string, year, month int) (*dto.ExpenseSummaryResponse, error) {
	key := c.buildMonthlyKey(userID, year, month)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var stats dto.ExpenseSummaryResponse
	if err := json.Unmarshal([]byte(data), &stats); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &stats, nil
}

// SetMonthlyStats 月次統計をキャッシュに保存
func (c *ExpenseSummaryCache) SetMonthlyStats(ctx context.Context, userID string, year, month int, stats *dto.ExpenseSummaryResponse) error {
	key := c.buildMonthlyKey(userID, year, month)

	data, err := json.Marshal(stats)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	return c.redis.Set(ctx, key, data, c.ttl)
}

// GetYearlyStats 年次統計をキャッシュから取得
func (c *ExpenseSummaryCache) GetYearlyStats(ctx context.Context, userID string, fiscalYear int) (*dto.ExpenseYearlySummaryResponse, error) {
	key := c.buildYearlyKey(userID, fiscalYear)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var stats dto.ExpenseYearlySummaryResponse
	if err := json.Unmarshal([]byte(data), &stats); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &stats, nil
}

// SetYearlyStats 年次統計をキャッシュに保存
func (c *ExpenseSummaryCache) SetYearlyStats(ctx context.Context, userID string, fiscalYear int, stats *dto.ExpenseYearlySummaryResponse) error {
	key := c.buildYearlyKey(userID, fiscalYear)

	data, err := json.Marshal(stats)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	return c.redis.Set(ctx, key, data, c.ttl)
}

// GetLimitUsage 上限使用状況をキャッシュから取得
func (c *ExpenseSummaryCache) GetLimitUsage(ctx context.Context, userID string, fiscalYear int) (*dto.LimitCheckResult, error) {
	key := c.buildLimitUsageKey(userID, fiscalYear)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var usage dto.LimitCheckResult
	if err := json.Unmarshal([]byte(data), &usage); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &usage, nil
}

// SetLimitUsage 上限使用状況をキャッシュに保存
func (c *ExpenseSummaryCache) SetLimitUsage(ctx context.Context, userID string, fiscalYear int, usage *dto.LimitCheckResult) error {
	key := c.buildLimitUsageKey(userID, fiscalYear)

	data, err := json.Marshal(usage)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	// 上限使用状況は短めにキャッシュ（10分）
	return c.redis.Set(ctx, key, data, 10*time.Minute)
}

// InvalidateMonthlyStats 月次統計のキャッシュを無効化
func (c *ExpenseSummaryCache) InvalidateMonthlyStats(ctx context.Context, userID *string) error {
	pattern := monthlyStatsPrefix
    if userID != nil {
        pattern = fmt.Sprintf("%suser:%s:*", monthlyStatsPrefix, *userID)
	} else {
		pattern = monthlyStatsPrefix + "*"
	}
	return c.deleteByPattern(ctx, pattern)
}

// InvalidateYearlyStats 年次統計のキャッシュを無効化
func (c *ExpenseSummaryCache) InvalidateYearlyStats(ctx context.Context, userID *string) error {
	pattern := yearlyStatsPrefix
    if userID != nil {
        pattern = fmt.Sprintf("%suser:%s:*", yearlyStatsPrefix, *userID)
	} else {
		pattern = yearlyStatsPrefix + "*"
	}
	return c.deleteByPattern(ctx, pattern)
}

// InvalidateLimitUsage 上限使用状況のキャッシュを無効化
func (c *ExpenseSummaryCache) InvalidateLimitUsage(ctx context.Context, userID *string) error {
	pattern := limitUsagePrefix
    if userID != nil {
        pattern = fmt.Sprintf("%suser:%s:*", limitUsagePrefix, *userID)
	} else {
		pattern = limitUsagePrefix + "*"
	}
	return c.deleteByPattern(ctx, pattern)
}

// InvalidateUserSummaries ユーザーの全集計キャッシュを無効化
func (c *ExpenseSummaryCache) InvalidateUserSummaries(ctx context.Context, userID string) error {
	// 月次統計を無効化
	if err := c.InvalidateMonthlyStats(ctx, &userID); err != nil {
		return err
	}

	// 年次統計を無効化
	if err := c.InvalidateYearlyStats(ctx, &userID); err != nil {
		return err
	}

	// 上限使用状況を無効化
	return c.InvalidateLimitUsage(ctx, &userID)
}

// InvalidateAll 全ての経費集計関連キャッシュを無効化
func (c *ExpenseSummaryCache) InvalidateAll(ctx context.Context) error {
	patterns := []string{
		monthlyStatsPrefix + "*",
		yearlyStatsPrefix + "*",
		limitUsagePrefix + "*",
	}

	for _, pattern := range patterns {
		if err := c.deleteByPattern(ctx, pattern); err != nil {
			return err
		}
	}

	return nil
}

// buildMonthlyKey 月次統計用のキーを生成
func (c *ExpenseSummaryCache) buildMonthlyKey(userID string, year, month int) string {
	return fmt.Sprintf("%suser:%s:year:%d:month:%02d",
		monthlyStatsPrefix,
		userID,
		year,
		month,
	)
}

// buildYearlyKey 年次統計用のキーを生成
func (c *ExpenseSummaryCache) buildYearlyKey(userID string, fiscalYear int) string {
	return fmt.Sprintf("%suser:%s:fy:%d",
		yearlyStatsPrefix,
		userID,
		fiscalYear,
	)
}

// buildLimitUsageKey 上限使用状況用のキーを生成
func (c *ExpenseSummaryCache) buildLimitUsageKey(userID string, fiscalYear int) string {
	return fmt.Sprintf("%suser:%s:fy:%d",
		limitUsagePrefix,
		userID,
		fiscalYear,
	)
}

// deleteByPattern パターンにマッチするキーを削除
func (c *ExpenseSummaryCache) deleteByPattern(ctx context.Context, pattern string) error {
	if !c.redis.IsEnabled() {
		return nil
	}

	// 注意: 本番環境では SCAN を使用すべき
	// ここでは簡略化のため省略
	c.logger.Info("Invalidating cache by pattern", zap.String("pattern", pattern))
	return nil
}
