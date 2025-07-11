package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// VirusScanHandler ウイルススキャンハンドラー
type VirusScanHandler struct {
	virusScanService service.VirusScanService
	handlerUtil      *HandlerUtil
	logger           *zap.Logger
}

// NewVirusScanHandler ウイルススキャンハンドラーのインスタンスを生成
func NewVirusScanHandler(
	virusScanService service.VirusScanService,
	logger *zap.Logger,
) *VirusScanHandler {
	return &VirusScanHandler{
		virusScanService: virusScanService,
		handlerUtil:      NewHandlerUtil(logger),
		logger:           logger,
	}
}

// GetScanResult スキャン結果を取得
// @Summary スキャン結果取得
// @Description 指定されたファイルのウイルススキャン結果を取得します
// @Tags VirusScan
// @Accept json
// @Produce json
// @Param file_id path string true "ファイルID"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/virus-scan/results/{file_id} [get]
func (h *VirusScanHandler) GetScanResult(c *gin.Context) {
	h.logger.Info("スキャン結果取得API開始")

	// パスパラメータからファイルIDを取得
	fileIDStr := c.Param("file_id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		RespondError(c, http.StatusBadRequest, "無効なファイルIDです")
		return
	}

	// スキャン結果を取得
	result, err := h.virusScanService.GetScanResult(c.Request.Context(), fileID)
	if err != nil {
		h.logger.Error("Failed to get scan result", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "スキャン結果の取得に失敗しました")
		return
	}

	if result == nil {
		RespondError(c, http.StatusNotFound, "スキャン結果が見つかりません")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// GetQuarantinedFiles 隔離ファイル一覧を取得
// @Summary 隔離ファイル一覧取得
// @Description 隔離されたファイルの一覧を取得します（管理者のみ）
// @Tags VirusScan
// @Accept json
// @Produce json
// @Param limit query int false "取得件数上限"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/admin/virus-scan/quarantined [get]
func (h *VirusScanHandler) GetQuarantinedFiles(c *gin.Context) {
	h.logger.Info("隔離ファイル一覧取得API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil || !isAdmin {
		RespondError(c, http.StatusForbidden, "管理者権限が必要です")
		return
	}

	// クエリパラメータから取得件数を取得
	limit := 100
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// 隔離ファイル一覧を取得
	files, err := h.virusScanService.GetQuarantinedFiles(c.Request.Context(), limit)
	if err != nil {
		h.logger.Error("Failed to get quarantined files", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "隔離ファイル一覧の取得に失敗しました")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": files,
		"meta": gin.H{
			"total": len(files),
		},
	})
}

// DeleteQuarantinedFile 隔離ファイルを削除
// @Summary 隔離ファイル削除
// @Description 隔離されたファイルを完全に削除します（管理者のみ）
// @Tags VirusScan
// @Accept json
// @Produce json
// @Param file_id path string true "ファイルID"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/admin/virus-scan/quarantined/{file_id} [delete]
func (h *VirusScanHandler) DeleteQuarantinedFile(c *gin.Context) {
	h.logger.Info("隔離ファイル削除API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil || !isAdmin {
		RespondError(c, http.StatusForbidden, "管理者権限が必要です")
		return
	}

	// パスパラメータからファイルIDを取得
	fileIDStr := c.Param("file_id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		RespondError(c, http.StatusBadRequest, "無効なファイルIDです")
		return
	}

	// 隔離ファイルを削除
	if err := h.virusScanService.DeleteQuarantinedFile(c.Request.Context(), fileID); err != nil {
		h.logger.Error("Failed to delete quarantined file", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "隔離ファイルの削除に失敗しました")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "隔離ファイルを削除しました"})
}

// GetScanStatistics スキャン統計を取得
// @Summary スキャン統計取得
// @Description 指定期間のウイルススキャン統計を取得します（管理者のみ）
// @Tags VirusScan
// @Accept json
// @Produce json
// @Param from query string false "開始日時 (RFC3339)"
// @Param to query string false "終了日時 (RFC3339)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/admin/virus-scan/statistics [get]
func (h *VirusScanHandler) GetScanStatistics(c *gin.Context) {
	h.logger.Info("スキャン統計取得API開始")

	// 管理者権限チェック
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil || !isAdmin {
		RespondError(c, http.StatusForbidden, "管理者権限が必要です")
		return
	}

	// クエリパラメータから期間を取得
	from := time.Now().AddDate(0, -1, 0) // デフォルト: 1ヶ月前から
	to := time.Now()

	if fromStr := c.Query("from"); fromStr != "" {
		if parsedFrom, err := time.Parse(time.RFC3339, fromStr); err == nil {
			from = parsedFrom
		}
	}

	if toStr := c.Query("to"); toStr != "" {
		if parsedTo, err := time.Parse(time.RFC3339, toStr); err == nil {
			to = parsedTo
		}
	}

	// 統計情報を取得
	statistics, err := h.virusScanService.GetScanStatistics(c.Request.Context(), from, to)
	if err != nil {
		h.logger.Error("Failed to get scan statistics", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "スキャン統計の取得に失敗しました")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": statistics,
		"meta": gin.H{
			"from": from,
			"to":   to,
		},
	})
}
