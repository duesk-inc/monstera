package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// VerifyWebhookSignature Webhookの署名を検証するミドルウェア
func VerifyWebhookSignature(secret string, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// リクエストボディを読み取る
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			logger.Error("Failed to read request body", zap.Error(err))
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "リクエストの読み取りに失敗しました"})
			return
		}

		// ボディを再利用できるようにリセット
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		// 署名ヘッダーを取得
		signature := c.GetHeader("X-Webhook-Signature")
		if signature == "" {
			logger.Warn("Missing webhook signature")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "署名が不正です"})
			return
		}

		// 期待される署名を計算
		h := hmac.New(sha256.New, []byte(secret))
		h.Write(body)
		expectedSignature := hex.EncodeToString(h.Sum(nil))

		// 署名を比較
		if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
			logger.Warn("Invalid webhook signature",
				zap.String("expected", expectedSignature),
				zap.String("received", signature),
			)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "署名が不正です"})
			return
		}

		logger.Debug("Webhook signature verified successfully")
		c.Next()
	}
}
