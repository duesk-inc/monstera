package middleware

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// CORSConfig CORS設定ミドルウェア
func CORSConfig() gin.HandlerFunc {
	// 許可されたオリジンのリスト
	allowedOrigins := []string{
		"https://trusted-domain.com",
		"https://app.company.com",
		"http://localhost:3000", // 開発環境用
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		// オリジンが許可リストに含まれているかチェック
		isAllowed := false
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				isAllowed = true
				break
			}
		}

		if !isAllowed && origin != "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "CORS: オリジンが許可されていません"})
			c.Abort()
			return
		}

		// CORS ヘッダーの設定
		if isAllowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		c.Header("Access-Control-Max-Age", "86400") // 24時間

		// プリフライトリクエストの処理
		if c.Request.Method == "OPTIONS" {
			requestMethod := c.GetHeader("Access-Control-Request-Method")
			allowedMethods := []string{"GET", "POST", "PUT", "DELETE"}

			methodAllowed := false
			for _, method := range allowedMethods {
				if requestMethod == method {
					methodAllowed = true
					break
				}
			}

			if !methodAllowed {
				c.JSON(http.StatusMethodNotAllowed, gin.H{"error": "メソッドが許可されていません"})
				c.Abort()
				return
			}

			c.AbortWithStatus(http.StatusOK)
			return
		}

		c.Next()
	}
}

// EnhancedCSP より詳細なContent Security Policyミドルウェア
func EnhancedCSP() gin.HandlerFunc {
	return func(c *gin.Context) {
		cspDirectives := []string{
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline'", // 本番環境では 'unsafe-inline' を削除
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: https:",
			"connect-src 'self'",
			"font-src 'self'",
			"object-src 'none'",
			"media-src 'self'",
			"frame-src 'none'",
			"child-src 'none'",
			"form-action 'self'",
			"base-uri 'self'",
			"manifest-src 'self'",
		}

		csp := strings.Join(cspDirectives, "; ")
		c.Header("Content-Security-Policy", csp)
		c.Header("Content-Security-Policy-Report-Only", csp) // レポートモード

		c.Next()
	}
}

// InputSanitization 入力サニタイゼーションミドルウェア
func InputSanitization() gin.HandlerFunc {
	return func(c *gin.Context) {
		// リクエストボディの処理は後続のハンドラーで行う
		// ここではヘッダーとクエリパラメータをサニタイズ

		// クエリパラメータのサニタイズ
		query := c.Request.URL.Query()
		for key, values := range query {
			for i, value := range values {
				query[key][i] = sanitizeString(value)
			}
		}
		c.Request.URL.RawQuery = query.Encode()

		c.Next()
	}
}

// PathTraversalProtection パストラバーサル攻撃防止ミドルウェア
func PathTraversalProtection() gin.HandlerFunc {
	dangerousPatterns := []*regexp.Regexp{
		regexp.MustCompile(`\.\.[\\/]`),                // ../, ..\
		regexp.MustCompile(`\.\.[\\/]\.\.[\\/]`),       // ../../, ..\..\
		regexp.MustCompile(`%2e%2e%2f`),                // URL encoded ../
		regexp.MustCompile(`%2e%2e%5c`),                // URL encoded ..\
		regexp.MustCompile(`\.\.%2f`),                  // ..%2f
		regexp.MustCompile(`\.\.%5c`),                  // ..%5c
		regexp.MustCompile(`%252e%252e%252f`),          // Double URL encoded
		regexp.MustCompile(`\.\.[\\/]?\.\.[\\/]?\.\.`), // ../../../
	}

	return func(c *gin.Context) {
		path := c.Request.URL.Path

		for _, pattern := range dangerousPatterns {
			if pattern.MatchString(strings.ToLower(path)) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "不正なパスが検出されました"})
				c.Abort()
				return
			}
		}

		// パラメータもチェック
		for _, param := range c.Params {
			for _, pattern := range dangerousPatterns {
				if pattern.MatchString(strings.ToLower(param.Value)) {
					c.JSON(http.StatusBadRequest, gin.H{"error": "不正なパラメータが検出されました"})
					c.Abort()
					return
				}
			}
		}

		c.Next()
	}
}

// FileSizeLimit ファイルサイズ制限ミドルウェア
func FileSizeLimit(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": fmt.Sprintf("ファイルサイズが上限（%d bytes）を超えています", maxSize),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// APIVersioning APIバージョニング管理ミドルウェア
func APIVersioning() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// 非推奨バージョンの警告
		if strings.Contains(path, "/api/v1/") {
			c.Header("Warning", "299 - \"API version v1 is deprecated. Please use v2.\"")
			c.Header("Sunset", "2024-12-31") // サポート終了日
		}

		// サポート終了バージョンの拒否
		if strings.Contains(path, "/api/v0/") {
			c.JSON(http.StatusGone, gin.H{
				"error":           "API version v0 is no longer supported",
				"message":         "Please upgrade to v2 or later",
				"current_version": "v2",
				"documentation":   "https://api.example.com/docs/v2",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// SecureErrorHandler セキュアなエラーハンドリングミドルウェア
func SecureErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// エラーをキャッチして機密情報を除去
		c.Next()

		// エラーが発生した場合の処理
		if len(c.Errors) > 0 {
			lastError := c.Errors.Last()

			// 本番環境では詳細なエラー情報を隠す
			sanitizedError := sanitizeErrorMessage(lastError.Error())

			// ログには詳細なエラーを記録（実際の実装ではロガーを使用）
			fmt.Printf("Internal Error: %s\n", lastError.Error())

			// クライアントには安全なエラーメッセージのみ返す
			if !c.Writer.Written() {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": sanitizedError,
					"code":  "INTERNAL_ERROR",
				})
			}
		}
	}
}

// ErrorLogging エラーログ記録ミドルウェア
func ErrorLogging() gin.HandlerFunc {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	return func(c *gin.Context) {
		c.Next()

		// エラーが発生した場合はログに記録
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				logger.Error("Request error",
					zap.String("method", c.Request.Method),
					zap.String("path", c.Request.URL.Path),
					zap.String("ip", c.ClientIP()),
					zap.String("user_agent", c.GetHeader("User-Agent")),
					zap.String("error", err.Error()),
				)
			}
		}
	}
}

// AttackDetection 攻撃検出ミドルウェア
func AttackDetection() gin.HandlerFunc {
	// 攻撃パターンの定義
	sqlInjectionPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(union|select|insert|delete|update|drop|create|alter|exec|execute)`),
		regexp.MustCompile(`(?i)('|\"|;|--|\*|\/\*|\*\/|xp_|sp_)`),
		regexp.MustCompile(`(?i)(or\s+1\s*=\s*1|and\s+1\s*=\s*1)`),
	}

	xssPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`),
		regexp.MustCompile(`(?i)javascript:`),
		regexp.MustCompile(`(?i)on(load|error|click|mouseover)=`),
		regexp.MustCompile(`(?i)<iframe[^>]*>.*?</iframe>`),
	}

	pathTraversalPatterns := []*regexp.Regexp{
		regexp.MustCompile(`\.\.[\\/]`),
		regexp.MustCompile(`%2e%2e%2f`),
		regexp.MustCompile(`%2e%2e%5c`),
	}

	commandInjectionPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(;|\||&|\$\(|` + "`" + `)`),
		regexp.MustCompile(`(?i)(cat|ls|pwd|whoami|id|uname|netstat|ps|kill)`),
	}

	return func(c *gin.Context) {
		fullURL := c.Request.URL.String()
		userAgent := c.GetHeader("User-Agent")

		// SQLインジェクション検出
		for _, pattern := range sqlInjectionPatterns {
			if pattern.MatchString(fullURL) {
				logAttack(c, "SQL_INJECTION", fullURL)
				c.JSON(http.StatusBadRequest, gin.H{"error": "不正なリクエストが検出されました"})
				c.Abort()
				return
			}
		}

		// XSS攻撃検出
		for _, pattern := range xssPatterns {
			if pattern.MatchString(fullURL) {
				logAttack(c, "XSS_ATTEMPT", fullURL)
				c.JSON(http.StatusBadRequest, gin.H{"error": "不正なリクエストが検出されました"})
				c.Abort()
				return
			}
		}

		// パストラバーサル攻撃検出
		for _, pattern := range pathTraversalPatterns {
			if pattern.MatchString(fullURL) {
				logAttack(c, "PATH_TRAVERSAL", fullURL)
				c.JSON(http.StatusBadRequest, gin.H{"error": "不正なリクエストが検出されました"})
				c.Abort()
				return
			}
		}

		// コマンドインジェクション検出
		for _, pattern := range commandInjectionPatterns {
			if pattern.MatchString(fullURL) {
				logAttack(c, "COMMAND_INJECTION", fullURL)
				c.JSON(http.StatusBadRequest, gin.H{"error": "不正なリクエストが検出されました"})
				c.Abort()
				return
			}
		}

		// 怪しいユーザーエージェント検出
		suspiciousUAPatterns := []string{
			"sqlmap",
			"nikto",
			"nessus",
			"burp",
			"dirb",
			"gobuster",
			"wget",
			"curl",
		}

		for _, suspicious := range suspiciousUAPatterns {
			if strings.Contains(strings.ToLower(userAgent), suspicious) {
				logAttack(c, "SUSPICIOUS_USER_AGENT", userAgent)
				c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// Helper functions

func sanitizeString(input string) string {
	// 基本的なサニタイゼーション
	replacements := map[string]string{
		"<script>":    "&lt;script&gt;",
		"</script>":   "&lt;/script&gt;",
		"<":           "&lt;",
		">":           "&gt;",
		"\"":          "&quot;",
		"'":           "&#39;",
		"&":           "&amp;",
		"javascript:": "",
		"vbscript:":   "",
		"data:":       "",
	}

	sanitized := input
	for old, new := range replacements {
		sanitized = strings.ReplaceAll(sanitized, old, new)
	}

	return sanitized
}

func sanitizeErrorMessage(errorMsg string) string {
	// 機密情報を含む可能性のあるパターンを除去
	sensitivePatterns := map[string]string{
		`password\\s*=\\s*\\S+`:                               "password=***",
		`user\\s*=\\s*\\S+`:                                   "user=***",
		`host\\s*=\\s*\\S+`:                                   "host=***",
		`database\\s*=\\s*\\S+`:                               "database=***",
		`secret\\s*=\\s*\\S+`:                                 "secret=***",
		`token\\s*=\\s*\\S+`:                                  "token=***",
		`key\\s*=\\s*\\S+`:                                    "key=***",
		`\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b`:              "xxx.xxx.xxx.xxx", // IP addresses
		`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`: "***@***.***",     // Email addresses
	}

	sanitized := errorMsg
	for pattern, replacement := range sensitivePatterns {
		re := regexp.MustCompile(pattern)
		sanitized = re.ReplaceAllString(sanitized, replacement)
	}

	// 一般的なエラーメッセージに変換
	if strings.Contains(strings.ToLower(sanitized), "database") ||
		strings.Contains(strings.ToLower(sanitized), "sql") ||
		strings.Contains(strings.ToLower(sanitized), "connection") {
		return "データベース接続エラーが発生しました"
	}

	if strings.Contains(strings.ToLower(sanitized), "file") ||
		strings.Contains(strings.ToLower(sanitized), "path") {
		return "ファイル操作エラーが発生しました"
	}

	return "内部エラーが発生しました"
}

func logAttack(c *gin.Context, attackType, details string) {
	// 攻撃ログの記録（実際の実装では適切なロガーとセキュリティ監視システムを使用）
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	logger.Warn("Security attack detected",
		zap.String("attack_type", attackType),
		zap.String("ip", c.ClientIP()),
		zap.String("user_agent", c.GetHeader("User-Agent")),
		zap.String("method", c.Request.Method),
		zap.String("path", c.Request.URL.Path),
		zap.String("details", details),
		zap.String("timestamp", c.GetString("request_id")),
	)
}
