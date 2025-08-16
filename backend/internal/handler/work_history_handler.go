package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// WorkHistoryHandler 職務経歴ハンドラー
type WorkHistoryHandler struct {
	workHistoryCRUDService      service.WorkHistoryCRUDService      // 個別CRUD操作用サービス
	workHistoryEnhancedService  interface{}                         // 拡張機能用サービス
	technologySuggestionService interface{}                         // 技術候補提案サービス
	logger                      *zap.Logger
}

// NewWorkHistoryHandler WorkHistoryHandlerのインスタンスを生成
func NewWorkHistoryHandler(workHistoryCRUDService service.WorkHistoryCRUDService, workHistoryEnhancedService interface{}, technologySuggestionService interface{}, logger *zap.Logger) *WorkHistoryHandler {
	return &WorkHistoryHandler{
		workHistoryCRUDService:      workHistoryCRUDService,
		workHistoryEnhancedService:  workHistoryEnhancedService,
		technologySuggestionService: technologySuggestionService,
		logger:                      logger,
	}
}

// GetWorkHistories 職務経歴一覧を取得
func (h *WorkHistoryHandler) GetWorkHistories(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		RespondError(c, http.StatusBadRequest, "ユーザーIDが必要です")
		return
	}

	// ページネーションパラメータ
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// サービスを呼び出して職務経歴一覧を取得
	ctx := context.Background()
	workHistories, total, err := h.workHistoryCRUDService.GetByUserID(ctx, userID, page, limit)
	if err != nil {
		h.logger.Error("Failed to get work histories", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "職務経歴一覧の取得に失敗しました")
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"work_histories": workHistories,
		"total":          total,
		"page":           page,
		"limit":          limit,
		"user_id":        userID,
	})
}

// GetWorkHistory 職務経歴詳細を取得
func (h *WorkHistoryHandler) GetWorkHistory(c *gin.Context) {
	historyID := c.Param("id")
	if _, err := uuid.Parse(historyID); err != nil {
		RespondError(c, http.StatusBadRequest, "無効な職務経歴IDです")
		return
	}

	// サービスを呼び出して職務経歴を取得
	ctx := context.Background()
	workHistory, err := h.workHistoryCRUDService.GetByID(ctx, historyID)
	if err != nil {
		h.logger.Error("Failed to get work history", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, "職務経歴の取得に失敗しました")
		return
	}

	if workHistory == nil {
		RespondError(c, http.StatusNotFound, "職務経歴が見つかりません")
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"work_history": workHistory,
	})
}

// CreateWorkHistory 職務経歴を作成
func (h *WorkHistoryHandler) CreateWorkHistory(c *gin.Context) {
	var req dto.WorkHistoryCreateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind request", zap.Error(err))
		RespondError(c, http.StatusBadRequest, "リクエストが不正です")
		return
	}

	// サービスを呼び出して職務経歴を作成
	ctx := context.Background()
	workHistory, err := h.workHistoryCRUDService.Create(ctx, &req)
	if err != nil {
		h.logger.Error("Failed to create work history", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	RespondSuccess(c, http.StatusCreated, "職務経歴を作成しました", gin.H{
		"work_history_id": workHistory.ID,
		"work_history":    workHistory,
	})
}

// UpdateWorkHistory 職務経歴を更新
func (h *WorkHistoryHandler) UpdateWorkHistory(c *gin.Context) {
	historyID := c.Param("id")
	if _, err := uuid.Parse(historyID); err != nil {
		RespondError(c, http.StatusBadRequest, "無効な職務経歴IDです")
		return
	}

	var req dto.WorkHistoryUpdateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind request", zap.Error(err))
		RespondError(c, http.StatusBadRequest, "リクエストが不正です")
		return
	}

	// サービスを呼び出して職務経歴を更新
	ctx := context.Background()
	err := h.workHistoryCRUDService.Update(ctx, historyID, &req)
	if err != nil {
		h.logger.Error("Failed to update work history", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	RespondSuccess(c, http.StatusOK, "職務経歴を更新しました", gin.H{
		"work_history_id": historyID,
	})
}

// DeleteWorkHistory 職務経歴を削除
func (h *WorkHistoryHandler) DeleteWorkHistory(c *gin.Context) {
	historyID := c.Param("id")
	if _, err := uuid.Parse(historyID); err != nil {
		RespondError(c, http.StatusBadRequest, "無効な職務経歴IDです")
		return
	}

	// サービスを呼び出して職務経歴を削除
	ctx := context.Background()
	err := h.workHistoryCRUDService.Delete(ctx, historyID)
	if err != nil {
		h.logger.Error("Failed to delete work history", zap.Error(err))
		RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	RespondSuccess(c, http.StatusOK, "職務経歴を削除しました", gin.H{
		"work_history_id": historyID,
	})
}

// GetUserWorkHistorySummary ユーザーの職務経歴サマリーを取得
func (h *WorkHistoryHandler) GetUserWorkHistorySummary(c *gin.Context) {
	userID := c.Param("user_id")
	if _, err := uuid.Parse(userID); err != nil {
		RespondError(c, http.StatusBadRequest, "無効なユーザーIDです")
		return
	}

	// TODO: 実装予定
	RespondSuccess(c, http.StatusOK, "", gin.H{
		"user_id":             userID,
		"total_projects":      0,
		"total_years":         0,
		"primary_role":        "",
		"top_technologies":    []string{},
		"industry_experience": []string{},
	})
}

// ExportWorkHistory 職務経歴をエクスポート
func (h *WorkHistoryHandler) ExportWorkHistory(c *gin.Context) {
	userID := c.Query("user_id")
	format := c.DefaultQuery("format", "pdf")

	if userID == "" {
		RespondError(c, http.StatusBadRequest, "ユーザーIDが必要です")
		return
	}

	if format != "pdf" && format != "excel" && format != "word" {
		RespondError(c, http.StatusBadRequest, "無効な出力形式です")
		return
	}

	// TODO: 実装予定
	RespondSuccess(c, http.StatusOK, "職務経歴のエクスポートを開始しました", gin.H{
		"download_url": "https://example.com/download/work-history." + format,
		"expires_at":   "2024-12-31T23:59:59Z",
	})
}

// GetWorkHistoryTemplate 職務経歴テンプレートを取得
func (h *WorkHistoryHandler) GetWorkHistoryTemplate(c *gin.Context) {
	templateType := c.DefaultQuery("type", "standard")

	// TODO: 実装予定
	RespondSuccess(c, http.StatusOK, "", gin.H{
		"template": gin.H{
			"type":     templateType,
			"sections": []string{"基本情報", "職務要約", "職務経歴", "資格・スキル", "自己PR"},
			"fields":   []interface{}{},
		},
	})
}

// SearchWorkHistories 職務経歴を検索
func (h *WorkHistoryHandler) SearchWorkHistories(c *gin.Context) {
	// 検索パラメータ
	keyword := c.Query("keyword")
	technologies := c.QueryArray("technologies")
	role := c.Query("role")

	// ページネーション
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// TODO: 実装予定
	RespondSuccess(c, http.StatusOK, "", gin.H{
		"results": []interface{}{},
		"total":   0,
		"page":    page,
		"limit":   limit,
		"search_params": gin.H{
			"keyword":      keyword,
			"technologies": technologies,
			"role":         role,
		},
	})
}
