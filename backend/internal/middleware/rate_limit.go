package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RateLimiter レート制限を管理するインターフェース
type RateLimiter interface {
	Allow(key string, limit int, window time.Duration) (bool, error)
	Reset(key string)
}

// InMemoryRateLimiter メモリベースのレート制限実装
type InMemoryRateLimiter struct {
	mu      sync.RWMutex
	buckets map[string]*bucket
	logger  *zap.Logger
}

// bucket レート制限用のバケット
type bucket struct {
	count      int
	resetAt    time.Time
	windowSize time.Duration
	mu         sync.Mutex
}

// NewInMemoryRateLimiter InMemoryRateLimiterのインスタンスを生成
func NewInMemoryRateLimiter(logger *zap.Logger) *InMemoryRateLimiter {
	limiter := &InMemoryRateLimiter{
		buckets: make(map[string]*bucket),
		logger:  logger,
	}

	// 定期的に期限切れのバケットをクリーンアップ
	go limiter.cleanup()

	return limiter
}

// Allow 指定されたキーに対してリクエストを許可するかチェック
func (r *InMemoryRateLimiter) Allow(key string, limit int, window time.Duration) (bool, error) {
	r.mu.Lock()
	b, exists := r.buckets[key]
	if !exists {
		b = &bucket{
			count:      0,
			resetAt:    time.Now().Add(window),
			windowSize: window,
		}
		r.buckets[key] = b
	}
	r.mu.Unlock()

	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	if now.After(b.resetAt) {
		// ウィンドウがリセットされた
		b.count = 1
		b.resetAt = now.Add(b.windowSize)
		return true, nil
	}

	if b.count >= limit {
		return false, nil
	}

	b.count++
	return true, nil
}

// Reset 指定されたキーのカウントをリセット
func (r *InMemoryRateLimiter) Reset(key string) {
	r.mu.Lock()
	delete(r.buckets, key)
	r.mu.Unlock()
}

// cleanup 期限切れのバケットを定期的にクリーンアップ
func (r *InMemoryRateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		r.mu.Lock()
		for key, b := range r.buckets {
			b.mu.Lock()
			if now.After(b.resetAt) {
				delete(r.buckets, key)
			}
			b.mu.Unlock()
		}
		r.mu.Unlock()
	}
}

// RateLimitMiddleware APIのレート制限を行うミドルウェア
func RateLimitMiddleware(limiter RateLimiter, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		key := fmt.Sprintf("api:%s", clientIP)

		allowed, err := limiter.Allow(key, limit, window)
		if err != nil {
			response := dto.ErrorResponse{
				Error: "レート制限の確認に失敗しました",
			}
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		if !allowed {
			response := dto.ErrorResponse{
				Error: "リクエスト数が上限に達しました。しばらく待ってから再度お試しください",
				Code:  "RATE_LIMIT_EXCEEDED",
			}
			c.JSON(http.StatusTooManyRequests, response)
			c.Abort()
			return
		}

		c.Next()
	}
}

// LoginRateLimitMiddleware ログイン試行のレート制限を行うミドルウェア（仕様書準拠）
func LoginRateLimitMiddleware(limiter RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		key := fmt.Sprintf("login_attempts:%s", clientIP)

		// 仕様書に準拠: 15分間に5回まで
		allowed, err := limiter.Allow(key, 5, 15*time.Minute)
		if err != nil {
			response := dto.ErrorResponse{
				Error: "レート制限の確認に失敗しました",
			}
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		if !allowed {
			response := dto.ErrorResponse{
				Error: "ログイン試行回数が上限に達しました。しばらく待ってから再度お試しください",
				Code:  "LOGIN_RATE_LIMIT_EXCEEDED",
			}
			c.JSON(http.StatusTooManyRequests, response)
			c.Abort()
			return
		}

		c.Next()
	}
}
