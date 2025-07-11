package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// PocSyncHandler POC同期ハンドラ
type PocSyncHandler struct {
	pocSyncService service.PocSyncService
	logger         *zap.Logger
}

// NewPocSyncHandler POC同期ハンドラのインスタンスを生成
func NewPocSyncHandler(pocSyncService service.PocSyncService, logger *zap.Logger) *PocSyncHandler {
	return &PocSyncHandler{
		pocSyncService: pocSyncService,
		logger:         logger,
	}
}

// SyncAllProjects 全プロジェクトを同期
// @Summary 全POCプロジェクトを同期
// @Description 同期待ちの全POCプロジェクトを同期します
// @Tags POC同期
// @Accept json
// @Produce json
// @Success 200 {object} service.SyncResult
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/all [post]
func (h *PocSyncHandler) SyncAllProjects(c *gin.Context) {
	ctx := c.Request.Context()

	result, err := h.pocSyncService.SyncAllProjects(ctx)
	if err != nil {
		h.logger.Error("Failed to sync all projects", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "プロジェクトの同期に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// SyncProjectByID 指定プロジェクトを同期
// @Summary 指定POCプロジェクトを同期
// @Description 指定されたPOCプロジェクトを同期します
// @Tags POC同期
// @Accept json
// @Produce json
// @Param id path string true "POCプロジェクトID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/{id} [post]
func (h *PocSyncHandler) SyncProjectByID(c *gin.Context) {
	ctx := c.Request.Context()
	pocProjectID := c.Param("id")

	if pocProjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "POCプロジェクトIDが必要です"})
		return
	}

	err := h.pocSyncService.SyncProjectByID(ctx, pocProjectID)
	if err != nil {
		h.logger.Error("Failed to sync project", zap.Error(err), zap.String("poc_project_id", pocProjectID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "プロジェクトの同期に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "同期が完了しました"})
}

// ForceSync 強制同期
// @Summary POCプロジェクトを強制同期
// @Description 失敗状態のPOCプロジェクトを強制的に同期します
// @Tags POC同期
// @Accept json
// @Produce json
// @Param id path string true "POCプロジェクトID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/{id}/force [post]
func (h *PocSyncHandler) ForceSync(c *gin.Context) {
	ctx := c.Request.Context()
	pocProjectID := c.Param("id")

	if pocProjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "POCプロジェクトIDが必要です"})
		return
	}

	err := h.pocSyncService.ForceSync(ctx, pocProjectID)
	if err != nil {
		h.logger.Error("Failed to force sync project", zap.Error(err), zap.String("poc_project_id", pocProjectID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "強制同期に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "強制同期が完了しました"})
}

// RunScheduledSync スケジュール同期を実行
// @Summary スケジュール同期を実行
// @Description 自動同期設定に基づいて同期を実行します
// @Tags POC同期
// @Accept json
// @Produce json
// @Success 200 {object} service.SyncResult
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/scheduled [post]
func (h *PocSyncHandler) RunScheduledSync(c *gin.Context) {
	ctx := c.Request.Context()

	result, err := h.pocSyncService.RunScheduledSync(ctx)
	if err != nil {
		h.logger.Error("Failed to run scheduled sync", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "スケジュール同期に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetSyncStatus 同期ステータスを取得
// @Summary 同期ステータスを取得
// @Description POC同期の現在のステータスを取得します
// @Tags POC同期
// @Accept json
// @Produce json
// @Success 200 {object} service.SyncStatusResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/status [get]
func (h *PocSyncHandler) GetSyncStatus(c *gin.Context) {
	ctx := c.Request.Context()

	status, err := h.pocSyncService.GetSyncStatus(ctx)
	if err != nil {
		h.logger.Error("Failed to get sync status", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "同期ステータスの取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, status)
}

// GetUnsyncedProjects 未同期プロジェクトを取得
// @Summary 未同期プロジェクトを取得
// @Description 同期されていないPOCプロジェクトの一覧を取得します
// @Tags POC同期
// @Accept json
// @Produce json
// @Success 200 {object} []model.PocProject
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/unsynced [get]
func (h *PocSyncHandler) GetUnsyncedProjects(c *gin.Context) {
	ctx := c.Request.Context()

	projects, err := h.pocSyncService.GetUnsyncedProjects(ctx)
	if err != nil {
		h.logger.Error("Failed to get unsynced projects", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "未同期プロジェクトの取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": projects, "total": len(projects)})
}

// GetSyncHistory 同期履歴を取得
// @Summary 同期履歴を取得
// @Description POC同期の履歴を取得します
// @Tags POC同期
// @Accept json
// @Produce json
// @Param start_date query string false "開始日時 (RFC3339)"
// @Param end_date query string false "終了日時 (RFC3339)"
// @Param status query string false "ステータス"
// @Param page query int false "ページ番号" default(1)
// @Param limit query int false "取得件数" default(20)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/history [get]
func (h *PocSyncHandler) GetSyncHistory(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータを解析
	filter := service.SyncHistoryFilter{
		Status: c.Query("status"),
		Page:   1,
		Limit:  20,
	}

	if startDate := c.Query("start_date"); startDate != "" {
		t, err := time.Parse(time.RFC3339, startDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "開始日時の形式が不正です"})
			return
		}
		filter.StartDate = &t
	}

	if endDate := c.Query("end_date"); endDate != "" {
		t, err := time.Parse(time.RFC3339, endDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "終了日時の形式が不正です"})
			return
		}
		filter.EndDate = &t
	}

	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			filter.Page = p
		}
	}

	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			filter.Limit = l
		}
	}

	history, total, err := h.pocSyncService.GetSyncHistory(ctx, filter)
	if err != nil {
		h.logger.Error("Failed to get sync history", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "同期履歴の取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items": history,
		"total": total,
		"page":  filter.Page,
		"limit": filter.Limit,
	})
}

// CreateProjectFromPoc POCからプロジェクトを作成
// @Summary POCからプロジェクトを作成
// @Description POCプロジェクトから新規プロジェクトを作成します
// @Tags POC同期
// @Accept json
// @Produce json
// @Param poc_project_id body map[string]string true "POCプロジェクトID"
// @Success 201 {object} model.Project
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/create-project [post]
func (h *PocSyncHandler) CreateProjectFromPoc(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		PocProjectID string `json:"poc_project_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	project, err := h.pocSyncService.CreateProjectFromPoc(ctx, req.PocProjectID)
	if err != nil {
		h.logger.Error("Failed to create project from POC", zap.Error(err), zap.String("poc_project_id", req.PocProjectID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "プロジェクトの作成に失敗しました"})
		return
	}

	c.JSON(http.StatusCreated, project)
}

// UpdateProjectFromPoc POCからプロジェクトを更新
// @Summary POCからプロジェクトを更新
// @Description POCプロジェクトから既存プロジェクトを更新します
// @Tags POC同期
// @Accept json
// @Produce json
// @Param body body map[string]string true "リクエストボディ"
// @Success 200 {object} model.Project
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/update-project [put]
func (h *PocSyncHandler) UpdateProjectFromPoc(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		ProjectID    string `json:"project_id" binding:"required"`
		PocProjectID string `json:"poc_project_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	project, err := h.pocSyncService.UpdateProjectFromPoc(ctx, req.ProjectID, req.PocProjectID)
	if err != nil {
		h.logger.Error("Failed to update project from POC",
			zap.Error(err),
			zap.String("project_id", req.ProjectID),
			zap.String("poc_project_id", req.PocProjectID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "プロジェクトの更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, project)
}

// GetSyncSettings 同期設定を取得
// @Summary 同期設定を取得
// @Description POC同期の設定を取得します
// @Tags POC同期
// @Accept json
// @Produce json
// @Success 200 {object} service.SyncSettings
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/settings [get]
func (h *PocSyncHandler) GetSyncSettings(c *gin.Context) {
	ctx := c.Request.Context()

	settings, err := h.pocSyncService.GetSyncSettings(ctx)
	if err != nil {
		h.logger.Error("Failed to get sync settings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "同期設定の取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateSyncSettings 同期設定を更新
// @Summary 同期設定を更新
// @Description POC同期の設定を更新します
// @Tags POC同期
// @Accept json
// @Produce json
// @Param body body service.SyncSettings true "同期設定"
// @Success 200 {object} map[string]string
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/poc/sync/settings [put]
func (h *PocSyncHandler) UpdateSyncSettings(c *gin.Context) {
	ctx := c.Request.Context()

	var settings service.SyncSettings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	err := h.pocSyncService.UpdateSyncSettings(ctx, &settings)
	if err != nil {
		h.logger.Error("Failed to update sync settings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "同期設定の更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "同期設定を更新しました"})
}
