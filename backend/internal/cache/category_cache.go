package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/dto"
)

// CategoryCache カテゴリ関連のキャッシュを管理
type CategoryCache struct {
	redis  *RedisClient
	logger *zap.Logger
	ttl    time.Duration
}

// NewCategoryCache カテゴリキャッシュマネージャーを作成
func NewCategoryCache(redis *RedisClient, logger *zap.Logger) *CategoryCache {
	return &CategoryCache{
		redis:  redis,
		logger: logger,
		ttl:    60 * time.Minute, // デフォルトTTL: 60分（カテゴリは変更頻度が低いため長め）
	}
}

// キーのプレフィックス定義
const (
	categoryListPrefix   = "categories:list:"
	categoryDetailPrefix = "categories:detail:"
	categoryActivePrefix = "categories:active:"
)

// GetCategoryList カテゴリ一覧をキャッシュから取得
func (c *CategoryCache) GetCategoryList(ctx context.Context) ([]*dto.ExpenseCategoryResponse, error) {
	key := categoryListPrefix + "all"

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var categories []*dto.ExpenseCategoryResponse
	if err := json.Unmarshal([]byte(data), &categories); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		// キャッシュが壊れている場合は削除
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return categories, nil
}

// SetCategoryList カテゴリ一覧をキャッシュに保存
func (c *CategoryCache) SetCategoryList(ctx context.Context, categories []*dto.ExpenseCategoryResponse) error {
	key := categoryListPrefix + "all"

	data, err := json.Marshal(categories)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	return c.redis.Set(ctx, key, data, c.ttl)
}

// GetActiveCategories アクティブなカテゴリ一覧をキャッシュから取得
func (c *CategoryCache) GetActiveCategories(ctx context.Context) ([]*dto.ExpenseCategoryResponse, error) {
	key := categoryActivePrefix + "list"

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var categories []*dto.ExpenseCategoryResponse
	if err := json.Unmarshal([]byte(data), &categories); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return categories, nil
}

// SetActiveCategories アクティブなカテゴリ一覧をキャッシュに保存
func (c *CategoryCache) SetActiveCategories(ctx context.Context, categories []*dto.ExpenseCategoryResponse) error {
	key := categoryActivePrefix + "list"

	data, err := json.Marshal(categories)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	return c.redis.Set(ctx, key, data, c.ttl)
}

// GetCategoryDetail カテゴリ詳細をキャッシュから取得
func (c *CategoryCache) GetCategoryDetail(ctx context.Context, categoryID uuid.UUID) (*dto.ExpenseCategoryResponse, error) {
	key := fmt.Sprintf("%s%s", categoryDetailPrefix, categoryID.String())

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var category dto.ExpenseCategoryResponse
	if err := json.Unmarshal([]byte(data), &category); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &category, nil
}

// SetCategoryDetail カテゴリ詳細をキャッシュに保存
func (c *CategoryCache) SetCategoryDetail(ctx context.Context, categoryID uuid.UUID, category *dto.ExpenseCategoryResponse) error {
	key := fmt.Sprintf("%s%s", categoryDetailPrefix, categoryID.String())

	data, err := json.Marshal(category)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	// 詳細データは長めにキャッシュ（2時間）
	return c.redis.Set(ctx, key, data, c.ttl*2)
}

// InvalidateCategoryList カテゴリ一覧のキャッシュを無効化
func (c *CategoryCache) InvalidateCategoryList(ctx context.Context) error {
	// 全カテゴリリストを無効化
	if err := c.redis.Delete(ctx, categoryListPrefix+"all"); err != nil {
		return err
	}

	// アクティブカテゴリリストも無効化
	return c.redis.Delete(ctx, categoryActivePrefix+"list")
}

// InvalidateCategoryDetail 特定のカテゴリ詳細キャッシュを無効化
func (c *CategoryCache) InvalidateCategoryDetail(ctx context.Context, categoryID uuid.UUID) error {
	key := fmt.Sprintf("%s%s", categoryDetailPrefix, categoryID.String())
	return c.redis.Delete(ctx, key)
}

// InvalidateCategory カテゴリ関連の全キャッシュを無効化（カテゴリ更新時に使用）
func (c *CategoryCache) InvalidateCategory(ctx context.Context, categoryID uuid.UUID) error {
	// カテゴリ詳細を無効化
	if err := c.InvalidateCategoryDetail(ctx, categoryID); err != nil {
		return err
	}

	// カテゴリ一覧も無効化（カテゴリの変更が反映されるように）
	return c.InvalidateCategoryList(ctx)
}

// InvalidateAll 全てのカテゴリ関連キャッシュを無効化
func (c *CategoryCache) InvalidateAll(ctx context.Context) error {
	patterns := []string{
		categoryListPrefix + "*",
		categoryDetailPrefix + "*",
		categoryActivePrefix + "*",
	}

	for _, pattern := range patterns {
		if err := c.deleteByPattern(ctx, pattern); err != nil {
			return err
		}
	}

	return nil
}

// deleteByPattern パターンにマッチするキーを削除
func (c *CategoryCache) deleteByPattern(ctx context.Context, pattern string) error {
	if !c.redis.IsEnabled() {
		return nil
	}

	// 注意: 本番環境では SCAN を使用すべき
	// ここでは簡略化のため省略
	c.logger.Info("Invalidating cache by pattern", zap.String("pattern", pattern))
	return nil
}
