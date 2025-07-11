package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/config"
)

// RedisClient ラップされたRedisクライアント
type RedisClient struct {
	client    *redis.Client
	logger    *zap.Logger
	keyPrefix string
	enabled   bool
}

// NewRedisClient 新しいRedisクライアントを作成
func NewRedisClient(cfg *config.RedisConfig, logger *zap.Logger) (*RedisClient, error) {
	if !cfg.Enabled {
		logger.Info("Redis is disabled, using no-op client")
		return &RedisClient{
			enabled: false,
			logger:  logger,
		}, nil
	}

	// Redisクライアントオプション
	opt := &redis.Options{
		Addr:         fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Password:     cfg.Password,
		DB:           cfg.DB,
		PoolSize:     cfg.PoolSize,
		MinIdleConns: cfg.MinIdleConns,
		MaxRetries:   cfg.MaxRetries,
	}

	client := redis.NewClient(opt)

	// 接続テスト
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	logger.Info("Successfully connected to Redis",
		zap.String("host", cfg.Host),
		zap.String("port", cfg.Port),
		zap.Int("db", cfg.DB))

	return &RedisClient{
		client:    client,
		logger:    logger,
		keyPrefix: cfg.KeyPrefix,
		enabled:   true,
	}, nil
}

// buildKey プレフィックスを付けたキーを生成
func (r *RedisClient) buildKey(key string) string {
	return r.keyPrefix + key
}

// Get キーから値を取得
func (r *RedisClient) Get(ctx context.Context, key string) (string, error) {
	if !r.enabled {
		return "", redis.Nil
	}

	fullKey := r.buildKey(key)
	val, err := r.client.Get(ctx, fullKey).Result()

	if err == redis.Nil {
		r.logger.Debug("Cache miss", zap.String("key", fullKey))
		return "", err
	} else if err != nil {
		r.logger.Error("Failed to get from Redis", zap.String("key", fullKey), zap.Error(err))
		return "", err
	}

	r.logger.Debug("Cache hit", zap.String("key", fullKey))
	return val, nil
}

// Set キーに値を設定（TTL付き）
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if !r.enabled {
		return nil
	}

	fullKey := r.buildKey(key)
	err := r.client.Set(ctx, fullKey, value, expiration).Err()

	if err != nil {
		r.logger.Error("Failed to set in Redis", zap.String("key", fullKey), zap.Error(err))
		return err
	}

	r.logger.Debug("Cache set", zap.String("key", fullKey), zap.Duration("ttl", expiration))
	return nil
}

// Delete キーを削除
func (r *RedisClient) Delete(ctx context.Context, keys ...string) error {
	if !r.enabled {
		return nil
	}

	fullKeys := make([]string, len(keys))
	for i, key := range keys {
		fullKeys[i] = r.buildKey(key)
	}

	err := r.client.Del(ctx, fullKeys...).Err()

	if err != nil {
		r.logger.Error("Failed to delete from Redis", zap.Strings("keys", fullKeys), zap.Error(err))
		return err
	}

	r.logger.Debug("Cache deleted", zap.Strings("keys", fullKeys))
	return nil
}

// Exists キーが存在するか確認
func (r *RedisClient) Exists(ctx context.Context, key string) (bool, error) {
	if !r.enabled {
		return false, nil
	}

	fullKey := r.buildKey(key)
	result, err := r.client.Exists(ctx, fullKey).Result()

	if err != nil {
		r.logger.Error("Failed to check existence in Redis", zap.String("key", fullKey), zap.Error(err))
		return false, err
	}

	return result > 0, nil
}

// SetNX キーが存在しない場合のみ設定
func (r *RedisClient) SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) (bool, error) {
	if !r.enabled {
		return true, nil
	}

	fullKey := r.buildKey(key)
	result, err := r.client.SetNX(ctx, fullKey, value, expiration).Result()

	if err != nil {
		r.logger.Error("Failed to SetNX in Redis", zap.String("key", fullKey), zap.Error(err))
		return false, err
	}

	return result, nil
}

// Expire キーの有効期限を設定
func (r *RedisClient) Expire(ctx context.Context, key string, expiration time.Duration) error {
	if !r.enabled {
		return nil
	}

	fullKey := r.buildKey(key)
	err := r.client.Expire(ctx, fullKey, expiration).Err()

	if err != nil {
		r.logger.Error("Failed to set expiration in Redis", zap.String("key", fullKey), zap.Error(err))
		return err
	}

	return nil
}

// TTL キーの残り有効期限を取得
func (r *RedisClient) TTL(ctx context.Context, key string) (time.Duration, error) {
	if !r.enabled {
		return 0, nil
	}

	fullKey := r.buildKey(key)
	ttl, err := r.client.TTL(ctx, fullKey).Result()

	if err != nil {
		r.logger.Error("Failed to get TTL from Redis", zap.String("key", fullKey), zap.Error(err))
		return 0, err
	}

	return ttl, nil
}

// Increment 数値をインクリメント
func (r *RedisClient) Increment(ctx context.Context, key string) (int64, error) {
	if !r.enabled {
		return 0, nil
	}

	fullKey := r.buildKey(key)
	val, err := r.client.Incr(ctx, fullKey).Result()

	if err != nil {
		r.logger.Error("Failed to increment in Redis", zap.String("key", fullKey), zap.Error(err))
		return 0, err
	}

	return val, nil
}

// Decrement 数値をデクリメント
func (r *RedisClient) Decrement(ctx context.Context, key string) (int64, error) {
	if !r.enabled {
		return 0, nil
	}

	fullKey := r.buildKey(key)
	val, err := r.client.Decr(ctx, fullKey).Result()

	if err != nil {
		r.logger.Error("Failed to decrement in Redis", zap.String("key", fullKey), zap.Error(err))
		return 0, err
	}

	return val, nil
}

// FlushDB データベースをクリア（開発/テスト用）
func (r *RedisClient) FlushDB(ctx context.Context) error {
	if !r.enabled {
		return nil
	}

	err := r.client.FlushDB(ctx).Err()

	if err != nil {
		r.logger.Error("Failed to flush Redis DB", zap.Error(err))
		return err
	}

	r.logger.Warn("Redis DB flushed")
	return nil
}

// Close Redisクライアントを閉じる
func (r *RedisClient) Close() error {
	if !r.enabled || r.client == nil {
		return nil
	}

	return r.client.Close()
}

// HealthCheck Redis接続の健全性をチェック
func (r *RedisClient) HealthCheck(ctx context.Context) error {
	if !r.enabled {
		return nil
	}

	return r.client.Ping(ctx).Err()
}

// GetClient 内部のRedisクライアントを取得（高度な操作用）
func (r *RedisClient) GetClient() *redis.Client {
	return r.client
}

// IsEnabled Redisが有効かどうか
func (r *RedisClient) IsEnabled() bool {
	return r.enabled
}

// Clear パターンにマッチするキーを削除
func (r *RedisClient) Clear(ctx context.Context, pattern string) error {
	if !r.enabled {
		return nil
	}

	// パターンにプレフィックスを追加
	fullPattern := r.buildKey(pattern)

	// SCANを使用してパターンにマッチするキーを取得
	var cursor uint64
	var keys []string

	for {
		var batch []string
		var err error

		batch, cursor, err = r.client.Scan(ctx, cursor, fullPattern, 100).Result()
		if err != nil {
			r.logger.Error("Failed to scan keys in Redis", zap.String("pattern", fullPattern), zap.Error(err))
			return err
		}

		keys = append(keys, batch...)

		if cursor == 0 {
			break
		}
	}

	// キーが見つからない場合は何もしない
	if len(keys) == 0 {
		r.logger.Debug("No keys found matching pattern", zap.String("pattern", fullPattern))
		return nil
	}

	// バッチでキーを削除
	batchSize := 100
	for i := 0; i < len(keys); i += batchSize {
		end := i + batchSize
		if end > len(keys) {
			end = len(keys)
		}

		batch := keys[i:end]
		if err := r.client.Del(ctx, batch...).Err(); err != nil {
			r.logger.Error("Failed to delete keys in Redis",
				zap.Strings("keys", batch),
				zap.Error(err))
			return err
		}
	}

	r.logger.Info("Cleared keys matching pattern",
		zap.String("pattern", fullPattern),
		zap.Int("count", len(keys)))

	return nil
}
