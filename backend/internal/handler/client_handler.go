package handler

import (
	"net/http"
	"strconv"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ClientHandler 取引先ハンドラーのインターフェース
type ClientHandler interface {
	GetClients(c *gin.Context)        // 取引先一覧取得
	GetClient(c *gin.Context)         // 取引先詳細取得
	CreateClient(c *gin.Context)      // 取引先作成
	UpdateClient(c *gin.Context)      // 取引先更新
	DeleteClient(c *gin.Context)      // 取引先削除
	GetClientProjects(c *gin.Context) // 取引先の案件一覧取得
}

// clientHandler 取引先ハンドラーの実装
type clientHandler struct {
	BaseHandler
	clientService service.ClientService
	util          *HandlerUtil
}

// NewClientHandler 取引先ハンドラーのインスタンスを生成
func NewClientHandler(
	clientService service.ClientService,
	logger *zap.Logger,
) ClientHandler {
	return &clientHandler{
		BaseHandler:   BaseHandler{Logger: logger},
		clientService: clientService,
		util:          NewHandlerUtil(logger),
	}
}

// GetClients 取引先一覧取得
func (h *clientHandler) GetClients(c *gin.Context) {
	ctx := c.Request.Context()

	// クエリパラメータ取得
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	search := c.Query("search")

	// サービス呼び出し
	clients, total, err := h.clientService.GetClients(ctx, page, limit, search)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "取引先一覧の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"clients": clients,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

// GetClient 取引先詳細取得
func (h *clientHandler) GetClient(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	clientID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	client, err := h.clientService.GetClientByID(ctx, clientID)
	if err != nil {
		if err.Error() == "取引先が見つかりません" {
			RespondNotFound(c, "取引先")
			return
		}
		HandleError(c, http.StatusInternalServerError, "取引先詳細の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"client": client,
	})
}

// CreateClient 取引先作成
func (h *clientHandler) CreateClient(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストボディを取得
	var req dto.CreateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, map[string]string{
			"request": "リクエストが不正です",
		})
		return
	}

	// サービス呼び出し
	client, err := h.clientService.CreateClient(ctx, &req)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "取引先の作成に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusCreated, "取引先を作成しました", gin.H{
		"client": client,
	})
}

// UpdateClient 取引先更新
func (h *clientHandler) UpdateClient(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	clientID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// リクエストボディを取得
	var req dto.UpdateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, map[string]string{
			"request": "リクエストが不正です",
		})
		return
	}

	// サービス呼び出し
	client, err := h.clientService.UpdateClient(ctx, clientID, &req)
	if err != nil {
		if err.Error() == "取引先が見つかりません" {
			RespondNotFound(c, "取引先")
			return
		}
		HandleError(c, http.StatusInternalServerError, "取引先の更新に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "取引先を更新しました", gin.H{
		"client": client,
	})
}

// DeleteClient 取引先削除
func (h *clientHandler) DeleteClient(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	clientID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	err = h.clientService.DeleteClient(ctx, clientID)
	if err != nil {
		if err.Error() == "アクティブな案件が存在するため削除できません" {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		HandleError(c, http.StatusInternalServerError, "取引先の削除に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "取引先を削除しました", nil)
}

// GetClientProjects 取引先の案件一覧取得
func (h *clientHandler) GetClientProjects(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	clientID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	projects, err := h.clientService.GetClientProjects(ctx, clientID)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "案件一覧の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"projects": projects,
		"total":    len(projects),
	})
}
