package handler

import (
	"net/http"
	"time"

	"github.com/duesk/monstera/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

// MetricsHandler メトリクスハンドラー
type MetricsHandler struct {
	dbUtils *utils.DatabaseUtils
	logger  *zap.Logger
}

// NewMetricsHandler メトリクスハンドラーのインスタンスを生成
func NewMetricsHandler(dbUtils *utils.DatabaseUtils, logger *zap.Logger) *MetricsHandler {
	return &MetricsHandler{
		dbUtils: dbUtils,
		logger:  logger,
	}
}

// Handler Prometheusメトリクスを公開
func (h *MetricsHandler) Handler() gin.HandlerFunc {
	handler := promhttp.Handler()

	return func(c *gin.Context) {
		handler.ServeHTTP(c.Writer, c.Request)
	}
}

// HealthCheck ヘルスチェックエンドポイント
func (h *MetricsHandler) HealthCheck(c *gin.Context) {
	// データベース接続チェック
	dbStatus := "healthy"
	var dbError string

	if h.dbUtils != nil {
		if err := h.dbUtils.HealthCheck(c.Request.Context()); err != nil {
			dbStatus = "unhealthy"
			dbError = err.Error()
			h.logger.Error("Database health check failed", zap.Error(err))
		}
	} else {
		dbStatus = "unavailable"
		dbError = "Database connection not initialized"
	}

	// 全体のステータスを決定
	overallStatus := "healthy"
	if dbStatus != "healthy" {
		overallStatus = "unhealthy"
	}

	response := gin.H{
		"status":    overallStatus,
		"service":   "monstera-backend",
		"timestamp": time.Now().Unix(),
		"checks": gin.H{
			"database": gin.H{
				"status": dbStatus,
			},
		},
	}

	// エラーがある場合は詳細を追加
	if dbError != "" {
		response["checks"].(gin.H)["database"].(gin.H)["error"] = dbError
	}

	// ステータスコードを設定
	statusCode := http.StatusOK
	if overallStatus != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}

// ReadinessCheck 準備状態チェックエンドポイント
func (h *MetricsHandler) ReadinessCheck(c *gin.Context) {
	// データベース接続チェック
	dbReady := true
	var dbError string

	if h.dbUtils != nil {
		if err := h.dbUtils.HealthCheck(c.Request.Context()); err != nil {
			dbReady = false
			dbError = err.Error()
			h.logger.Error("Database readiness check failed", zap.Error(err))
		}
	} else {
		dbReady = false
		dbError = "Database connection not initialized"
	}

	// 全体の準備状態を決定
	isReady := dbReady

	response := gin.H{
		"ready":     isReady,
		"service":   "monstera-backend",
		"timestamp": time.Now().Unix(),
		"checks": gin.H{
			"database": gin.H{
				"ready": dbReady,
			},
		},
	}

	// エラーがある場合は詳細を追加
	if dbError != "" {
		response["checks"].(gin.H)["database"].(gin.H)["error"] = dbError
	}

	// ステータスコードを設定
	statusCode := http.StatusOK
	if !isReady {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}
