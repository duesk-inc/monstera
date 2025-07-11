package middleware

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RequestLogger リクエスト/レスポンスをログに記録するミドルウェア
func RequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// リクエストボディを読み取る（ログ用）
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			// ボディを再利用できるようにリセット
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// レスポンスライターをラップ
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		// リクエスト情報をログに記録
		logger.Info("Request received",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.String("query", c.Request.URL.RawQuery),
			zap.String("client_ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
			zap.Int("body_size", len(requestBody)),
		)

		// 次のハンドラーを実行
		c.Next()

		// レスポンス情報をログに記録
		duration := time.Since(start)
		logger.Info("Request completed",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("duration", duration),
			zap.Int("response_size", blw.body.Len()),
		)

		// エラーがある場合は追加でログ
		if len(c.Errors) > 0 {
			// gin.Errorの配列を[]errorに変換
			errors := make([]error, len(c.Errors))
			for i, ginErr := range c.Errors {
				errors[i] = ginErr.Err
			}
			logger.Error("Request errors",
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
				zap.Errors("errors", errors),
			)
		}
	}
}

// bodyLogWriter レスポンスボディをキャプチャするためのラッパー
type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

// Write レスポンスボディを書き込み
func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}
