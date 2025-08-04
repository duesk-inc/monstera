package middleware

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// AuditLogConfig 監査ログミドルウェア設定
type AuditLogConfig struct {
	// 監査対象外のパス（正規表現）
	ExcludePaths []string
	// 監査対象外のメソッド
	ExcludeMethods []string
	// リクエストボディの最大サイズ（バイト）
	MaxBodySize int64
	// レスポンスボディの最大サイズ（バイト）
	MaxResponseSize int64
	// 静的リソースの監査をスキップ
	SkipStaticResources bool
}

// DefaultAuditLogConfig デフォルト設定
func DefaultAuditLogConfig() AuditLogConfig {
	return AuditLogConfig{
		ExcludePaths: []string{
			"/health",
			"/metrics",
			"/favicon.ico",
			"/api/v1/auth/refresh",
		},
		ExcludeMethods:      []string{"OPTIONS"},
		MaxBodySize:         1024 * 1024, // 1MB
		MaxResponseSize:     1024 * 1024, // 1MB
		SkipStaticResources: true,
	}
}

// AuditLogMiddleware 監査ログミドルウェア
func AuditLogMiddleware(auditService service.AuditLogService, logger *zap.Logger, config ...AuditLogConfig) gin.HandlerFunc {
	cfg := DefaultAuditLogConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return func(c *gin.Context) {
		start := time.Now()

		// 監査対象外の判定
		if shouldSkipAudit(c, cfg) {
			c.Next()
			return
		}

		// リクエストボディの読み取り（必要な場合）
		var requestBody []byte
		if shouldCaptureRequestBody(c, cfg) {
			if c.Request.Body != nil {
				requestBody, _ = io.ReadAll(io.LimitReader(c.Request.Body, cfg.MaxBodySize))
				c.Request.Body = io.NopCloser(bytes.NewReader(requestBody))
			}
		}

		// レスポンスキャプチャー用ライター
		responseWriter := &responseBodyWriter{
			ResponseWriter: c.Writer,
			body:           bytes.NewBuffer([]byte{}),
			maxSize:        cfg.MaxResponseSize,
		}
		c.Writer = responseWriter

		// リクエスト処理
		c.Next()

		// 実行時間の計算
		duration := time.Since(start)

		// ユーザー情報の取得
		userID, exists := c.Get("user_id")
		if !exists {
			// 未認証の場合でも重要なアクションは記録
			if isImportantUnauthenticatedAction(c) {
				// ログイン失敗の場合は未認証として記録
				if c.Writer.Status() >= 400 {
					userID = uuid.Nil
				} else {
					// ログイン成功の場合は再度ユーザーIDを取得
					userID, exists = c.Get("user_id")
					if !exists {
						// まだ取得できない場合は監査ログ記録をスキップ
						return
					}
				}
			} else {
				return
			}
		}

		// アクションとリソースタイプの特定
		action, resourceType, resourceID := determineActionAndResource(c)
		if action == "" {
			return
		}

		// 監査ログの記録
		go func() {
			// バックグラウンドコンテキストを作成
			ctx := context.Background()

			if err := auditService.LogHTTPRequest(
				ctx,
				c,
				userID.(uuid.UUID),
				model.AuditActionType(action),
				model.ResourceType(resourceType),
				resourceID,
				duration,
			); err != nil {
				logger.Error("Failed to log audit",
					zap.Error(err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
				)
			}
		}()
	}
}

// responseBodyWriter レスポンスボディをキャプチャするライター
type responseBodyWriter struct {
	gin.ResponseWriter
	body    *bytes.Buffer
	maxSize int64
}

func (w *responseBodyWriter) Write(b []byte) (int, error) {
	// 最大サイズを超えない範囲でボディを保存
	if w.body.Len() < int(w.maxSize) {
		remaining := int(w.maxSize) - w.body.Len()
		if len(b) > remaining {
			w.body.Write(b[:remaining])
		} else {
			w.body.Write(b)
		}
	}
	return w.ResponseWriter.Write(b)
}

// shouldSkipAudit 監査をスキップするかどうか判定
func shouldSkipAudit(c *gin.Context, config AuditLogConfig) bool {
	path := c.Request.URL.Path
	method := c.Request.Method

	// 除外メソッドのチェック
	for _, excludeMethod := range config.ExcludeMethods {
		if method == excludeMethod {
			return true
		}
	}

	// 除外パスのチェック
	for _, excludePath := range config.ExcludePaths {
		if strings.HasPrefix(path, excludePath) {
			return true
		}
	}

	// 静的リソースのスキップ
	if config.SkipStaticResources {
		staticExtensions := []string{".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2", ".ttf"}
		for _, ext := range staticExtensions {
			if strings.HasSuffix(path, ext) {
				return true
			}
		}
	}

	return false
}

// shouldCaptureRequestBody リクエストボディをキャプチャするかどうか判定
func shouldCaptureRequestBody(c *gin.Context, config AuditLogConfig) bool {
	method := c.Request.Method

	// GET、DELETE以外でボディをキャプチャ
	if method == "POST" || method == "PUT" || method == "PATCH" {
		contentType := c.GetHeader("Content-Type")
		// JSON形式の場合のみキャプチャ
		return strings.Contains(contentType, "application/json")
	}

	return false
}

// isImportantUnauthenticatedAction 未認証でも重要なアクション
func isImportantUnauthenticatedAction(c *gin.Context) bool {
	path := c.Request.URL.Path
	method := c.Request.Method

	// ログイン試行
	if strings.Contains(path, "/auth/login") && method == "POST" {
		return true
	}

	// パスワードリセット
	if strings.Contains(path, "/auth/reset") && method == "POST" {
		return true
	}

	return false
}

// determineActionAndResource アクションとリソースタイプを特定
func determineActionAndResource(c *gin.Context) (string, string, *string) {
	path := c.Request.URL.Path
	method := c.Request.Method

	// パスのパース
	pathSegments := strings.Split(strings.Trim(path, "/"), "/")

	// 基本的なCRUD操作の判定
	var action string
	switch method {
	case "GET":
		action = "VIEW"
	case "POST":
		action = "CREATE"
	case "PUT", "PATCH":
		action = "UPDATE"
	case "DELETE":
		action = "DELETE"
	default:
		return "", "", nil
	}

	// 特定のエンドポイントの判定
	resourceType, resourceID := determineResourceFromPath(pathSegments)
	if resourceType == "" {
		return "", "", nil
	}

	// 特殊なアクションの判定
	specialAction := determineSpecialAction(pathSegments, method)
	if specialAction != "" {
		action = specialAction
	}

	return fmt.Sprintf("%s_%s", strings.ToUpper(resourceType), action), resourceType, resourceID
}

// determineResourceFromPath パスからリソースタイプとIDを特定
func determineResourceFromPath(segments []string) (string, *string) {
	if len(segments) < 3 {
		return "", nil
	}

	// /api/v1/... 形式を想定
	if segments[0] != "api" || segments[1] != "v1" {
		return "", nil
	}

	if len(segments) < 3 {
		return "", nil
	}

	resource := segments[2]
	var resourceID *string

	// リソースIDの取得
	if len(segments) > 3 && segments[3] != "" {
		// UUIDっぽい形式かチェック
		if len(segments[3]) == 36 && strings.Count(segments[3], "-") == 4 {
			resourceID = &segments[3]
		}
	}

	// リソースタイプの正規化
	switch resource {
	case "users":
		return "USER", resourceID
	case "weekly-reports":
		return "WEEKLY_REPORT", resourceID
	case "alert-settings":
		return "ALERT_SETTINGS", resourceID
	case "notifications":
		return "NOTIFICATION", resourceID
	case "auth":
		return "SESSION", nil
	case "expenses":
		return "EXPENSE", resourceID
	case "expense-categories":
		return "EXPENSE_CATEGORY", resourceID
	case "expense-limits":
		return "EXPENSE_LIMIT", resourceID
	case "expense-approvals":
		return "EXPENSE_APPROVAL", resourceID
	default:
		return strings.ToUpper(resource), resourceID
	}
}

// determineSpecialAction 特殊なアクションを判定
func determineSpecialAction(segments []string, method string) string {
	if len(segments) < 4 {
		return ""
	}

	// 最後のセグメントで特殊アクションを判定
	lastSegment := segments[len(segments)-1]

	switch lastSegment {
	case "login":
		return "LOGIN"
	case "logout":
		return "LOGOUT"
	case "submit":
		return "SUBMIT"
	case "export":
		return "EXPORT"
	case "archive":
		return "ARCHIVE"
	// 経費申請特有のアクション
	case "approve":
		return "APPROVE"
	case "reject":
		return "REJECT"
	case "cancel":
		return "CANCEL"
	default:
		return ""
	}
}
