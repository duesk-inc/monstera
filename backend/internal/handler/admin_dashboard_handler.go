package handler

import (
	"net/http"

	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AdminDashboardHandler 管理者ダッシュボードハンドラーのインターフェース
type AdminDashboardHandler interface {
	GetDashboardData(c *gin.Context) // ダッシュボードデータ取得
}

// adminDashboardHandler 管理者ダッシュボードハンドラーの実装
type adminDashboardHandler struct {
	BaseHandler
	adminDashboardService service.AdminDashboardService
	util                  *HandlerUtil
}

// NewAdminDashboardHandler 管理者ダッシュボードハンドラーのインスタンスを生成
func NewAdminDashboardHandler(
	adminDashboardService service.AdminDashboardService,
	logger *zap.Logger,
) AdminDashboardHandler {
	return &adminDashboardHandler{
		BaseHandler:           BaseHandler{Logger: logger},
		adminDashboardService: adminDashboardService,
		util:                  NewHandlerUtil(logger),
	}
}

// GetDashboardData ダッシュボードデータ取得
func (h *adminDashboardHandler) GetDashboardData(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得（権限確認のため）
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// サービス呼び出し
	dashboardData, err := h.adminDashboardService.GetDashboardData(ctx, userID)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "ダッシュボードデータの取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"dashboard": dashboardData,
	})
}
