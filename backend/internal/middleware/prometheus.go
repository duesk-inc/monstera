package middleware

import (
	"strconv"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/metrics"
	"github.com/gin-gonic/gin"
)

// PrometheusMiddleware Prometheusメトリクスを収集するミドルウェア
func PrometheusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// リクエスト開始時刻を記録
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// 実行中のリクエスト数を増加
		metrics.HTTPRequestsInFlight.Inc()

		// リクエスト処理
		c.Next()

		// 実行中のリクエスト数を減少
		metrics.HTTPRequestsInFlight.Dec()

		// レスポンス時間を計算
		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Writer.Status())

		// パスを正規化（動的パラメータを置換）
		normalizedPath := normalizePath(path)

		// メトリクスを記録
		metrics.RecordHTTPRequest(method, normalizedPath, status, duration)
	}
}

// normalizePath パスを正規化して動的パラメータを置換
func normalizePath(path string) string {
	// UUIDパターンを検出して置換
	parts := strings.Split(path, "/")

	for i, part := range parts {
		// UUIDっぽい部分を:idに置換
		if len(part) == 36 && strings.Count(part, "-") == 4 {
			parts[i] = ":id"
		}
		// 数値のみの部分を:numに置換
		if _, err := strconv.Atoi(part); err == nil && part != "" {
			parts[i] = ":num"
		}
	}

	normalizedPath := strings.Join(parts, "/")

	// 一般的なパターンの置換
	replacements := map[string]string{
		"/api/v1/expenses/:id":                     "/api/v1/expenses/:id",
		"/api/v1/expenses/:id/approve":             "/api/v1/expenses/:id/approve",
		"/api/v1/expenses/:id/reject":              "/api/v1/expenses/:id/reject",
		"/api/v1/expenses/:id/cancel":              "/api/v1/expenses/:id/cancel",
		"/api/v1/expenses/:id/submit":              "/api/v1/expenses/:id/submit",
		"/api/v1/expenses/:id/receipts":            "/api/v1/expenses/:id/receipts",
		"/api/v1/expenses/:id/receipts/:id":        "/api/v1/expenses/:id/receipts/:receipt_id",
		"/api/v1/users/:id":                        "/api/v1/users/:id",
		"/api/v1/admin/expenses/:id/approve":       "/api/v1/admin/expenses/:id/approve",
		"/api/v1/admin/expenses/:id/reject":        "/api/v1/admin/expenses/:id/reject",
		"/api/v1/admin/expense-categories/:id":     "/api/v1/admin/expense-categories/:id",
		"/api/v1/admin/expense-limits/:id":         "/api/v1/admin/expense-limits/:id",
		"/api/v1/admin/users/:id":                  "/api/v1/admin/users/:id",	}

	// 既知のパターンに一致するか確認
	for pattern, replacement := range replacements {
		if matchPattern(normalizedPath, pattern) {
			return replacement
		}
	}

	return normalizedPath
}

// matchPattern パスがパターンに一致するかチェック
func matchPattern(path, pattern string) bool {
	pathParts := strings.Split(path, "/")
	patternParts := strings.Split(pattern, "/")

	if len(pathParts) != len(patternParts) {
		return false
	}

	for i := range pathParts {
		if patternParts[i] == ":id" || patternParts[i] == ":num" || patternParts[i] == ":receipt_id" {
			continue
		}
		if pathParts[i] != patternParts[i] {
			return false
		}
	}

	return true
}
