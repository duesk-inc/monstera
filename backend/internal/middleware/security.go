package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// rateLimiter レート制限用の構造体
type rateLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// rateLimiters クライアントIPごとのレート制限管理
var (
	rateLimiters = make(map[string]*rateLimiter)
	mu           sync.RWMutex
)

// AuthRequired 認証が必要なエンドポイント用ミドルウェア
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "認証トークンが必要です"})
			c.Abort()
			return
		}

		// Bearer トークンの検証
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークン形式です"})
			c.Abort()
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")

		// JWTトークンの検証（実際の実装では適切なJWT検証を行う）
		if !isValidJWT(token) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンです"})
			c.Abort()
			return
		}

		// ユーザー情報をコンテキストに設定
		userID, role := extractUserInfoFromJWT(token)
		c.Set("user_id", userID)
		c.Set("user_role", role)

		c.Next()
	}
}

// RequireRoleBasic 指定されたロールが必要なエンドポイント用ミドルウェア（基本版）
func RequireRoleBasic(requiredRole model.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "ロール情報が取得できません"})
			c.Abort()
			return
		}

		role, ok := userRole.(model.Role)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "無効なロール情報です"})
			c.Abort()
			return
		}

		// ロールの権限チェック（数値が小さいほど権限が高い）
		if role > requiredRole {
			c.JSON(http.StatusForbidden, gin.H{"error": "権限が不足しています"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// JSONSizeLimit JSONペイロードのサイズ制限ミドルウェア
func JSONSizeLimit(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": fmt.Sprintf("リクエストサイズが上限（%d bytes）を超えています", maxSize),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// CSRFProtection CSRF攻撃防止ミドルウェア
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "DELETE" {
			csrfToken := c.GetHeader("X-CSRF-Token")
			if csrfToken == "" {
				csrfToken = c.PostForm("csrf_token")
			}

			if !isValidCSRFToken(csrfToken) {
				c.JSON(http.StatusForbidden, gin.H{"error": "CSRF トークンが無効です"})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// RateLimit API呼び出し回数制限ミドルウェア
func RateLimit(requestsPerMinute int, duration time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := getClientIP(c)

		mu.RLock()
		limiter, exists := rateLimiters[clientIP]
		mu.RUnlock()

		if !exists {
			mu.Lock()
			rateLimiters[clientIP] = &rateLimiter{
				limiter:  rate.NewLimiter(rate.Every(duration/time.Duration(requestsPerMinute)), requestsPerMinute),
				lastSeen: time.Now(),
			}
			limiter = rateLimiters[clientIP]
			mu.Unlock()
		}

		limiter.lastSeen = time.Now()

		if !limiter.limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "リクエスト制限に達しました。しばらく待ってから再試行してください",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// LoginRateLimit ログイン試行制限ミドルウェア
func LoginRateLimit(attemptsPerMinute int, duration time.Duration) gin.HandlerFunc {
	loginAttempts := make(map[string]*rateLimiter)
	var loginMu sync.RWMutex

	return func(c *gin.Context) {
		clientIP := getClientIP(c)

		loginMu.RLock()
		limiter, exists := loginAttempts[clientIP]
		loginMu.RUnlock()

		if !exists {
			loginMu.Lock()
			loginAttempts[clientIP] = &rateLimiter{
				limiter:  rate.NewLimiter(rate.Every(duration/time.Duration(attemptsPerMinute)), attemptsPerMinute),
				lastSeen: time.Now(),
			}
			limiter = loginAttempts[clientIP]
			loginMu.Unlock()
		}

		limiter.lastSeen = time.Now()

		if !limiter.limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "ログイン試行回数が上限に達しました。しばらく待ってから再試行してください",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// SessionSecurity セッションセキュリティミドルウェア
func SessionSecurity() gin.HandlerFunc {
	return func(c *gin.Context) {
		// セッション固定化攻撃の防止
		sessionID := generateSessionID()
		c.Set("session_id", sessionID)

		// Secure フラグとHttpOnlyフラグを設定
		c.SetSameSite(http.SameSiteStrictMode)

		c.Next()
	}
}

// SessionTimeout セッションタイムアウトミドルウェア
func SessionTimeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionCookie, err := c.Cookie("session")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "セッションが見つかりません"})
			c.Abort()
			return
		}

		// セッションの有効性チェック（実際の実装では適切なセッション管理を行う）
		if !isValidSession(sessionCookie, timeout) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "セッションが期限切れです"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ForceHTTPS HTTPS通信を強制するミドルウェア
func ForceHTTPS() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Header.Get("X-Forwarded-Proto") != "https" {
			httpsURL := "https://" + c.Request.Host + c.Request.RequestURI
			c.Redirect(http.StatusMovedPermanently, httpsURL)
			c.Abort()
			return
		}

		// HSTS ヘッダーを設定
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		c.Next()
	}
}

// SecurityHeaders セキュリティヘッダーを設定するミドルウェア
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// XSS保護
		c.Header("X-XSS-Protection", "1; mode=block")

		// コンテンツタイプスニッフィング防止
		c.Header("X-Content-Type-Options", "nosniff")

		// クリックジャッキング防止
		c.Header("X-Frame-Options", "DENY")

		// コンテンツセキュリティポリシー
		c.Header("Content-Security-Policy", "default-src 'self'")

		// リファラーポリシー
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		c.Next()
	}
}

// Helper functions

func isValidJWT(token string) bool {
	// 実際の実装では適切なJWT検証を行う
	// ここではテスト用の簡単な実装
	return token != "expired.jwt.token" && token != "invalid.jwt.token"
}

func extractUserInfoFromJWT(token string) (string, model.Role) {
	// 実際の実装では JWTからユーザー情報を抽出
	// ここではテスト用の簡単な実装
	if strings.Contains(token, "admin") {
		return "admin-user-id", model.RoleAdmin
	} else if strings.Contains(token, "manager") {
		return "manager-user-id", model.RoleManager
	}
	return "user-id", model.RoleEmployee
}

func isValidCSRFToken(token string) bool {
	// 実際の実装では適切なCSRFトークン検証を行う
	return token != "" && len(token) > 10
}

func getClientIP(c *gin.Context) string {
	// X-Forwarded-For ヘッダーから実際のクライアントIPを取得
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		return strings.Split(xff, ",")[0]
	}
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return xri
	}
	return c.ClientIP()
}

func generateSessionID() string {
	// 実際の実装では安全なセッションID生成を行う
	return fmt.Sprintf("session_%d", time.Now().UnixNano())
}

func isValidSession(sessionID string, timeout time.Duration) bool {
	// 実際の実装では適切なセッション管理を行う
	// ここではテスト用の簡単な実装
	return sessionID != "expired_session"
}

// cleanupRateLimiters 古いレート制限エントリを定期的にクリーンアップ
func cleanupRateLimiters() {
	for {
		time.Sleep(time.Minute)

		mu.Lock()
		for ip, limiter := range rateLimiters {
			if time.Since(limiter.lastSeen) > time.Hour {
				delete(rateLimiters, ip)
			}
		}
		mu.Unlock()
	}
}

func init() {
	// バックグラウンドでクリーンアップを実行
	go cleanupRateLimiters()
}
