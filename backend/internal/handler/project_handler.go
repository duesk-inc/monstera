package handler

import (
    "net/http"

    "github.com/duesk/monstera/internal/common/validate"
    "github.com/duesk/monstera/internal/dto"
    "github.com/duesk/monstera/internal/message"
    "github.com/duesk/monstera/internal/service"
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// ProjectHandler Engineer向け案件ハンドラ
type ProjectHandler interface {
    List(c *gin.Context)
    Get(c *gin.Context)
    Create(c *gin.Context)
    Update(c *gin.Context)
}

type projectHandler struct {
    BaseHandler
    svc  service.ProjectService
    util *HandlerUtil
}

func NewProjectHandler(svc service.ProjectService, logger *zap.Logger) ProjectHandler {
    return &projectHandler{BaseHandler: BaseHandler{Logger: logger}, svc: svc, util: NewHandlerUtil(logger)}
}

// List GET /api/v1/projects
func (h *projectHandler) List(c *gin.Context) {
    var q dto.ProjectListQuery
    if err := c.ShouldBindQuery(&q); err != nil {
        h.util.RespondValidationError(c, h.util.CreateValidationErrorMap(err))
        return
    }
    // デフォルト適用
    q.Page, q.Limit = validate.NormalizePageLimit(q.Page, q.Limit)
    if q.SortBy == "" { q.SortBy = "created_at" }
    if q.SortOrder == "" { q.SortOrder = "desc" }

    resp, err := h.svc.List(c.Request.Context(), q)
    if err != nil {
        HandleError(c, http.StatusInternalServerError, message.MsgInternalServerError, h.Logger, err)
        return
    }
    RespondSuccess(c, http.StatusOK, "", gin.H{
        "items":       resp.Items,
        "total":       resp.Total,
        "page":        resp.Page,
        "limit":       resp.Limit,
        "total_pages": resp.TotalPages,
    })
}

// Get GET /api/v1/projects/:id
func (h *projectHandler) Get(c *gin.Context) {
    id, err := ParseUUID(c, "id", h.Logger)
    if err != nil { return }

    p, err := h.svc.Get(c.Request.Context(), id)
    if err != nil {
        HandleError(c, http.StatusInternalServerError, message.MsgInternalServerError, h.Logger, err)
        return
    }
    if p == nil {
        RespondNotFound(c, "案件")
        return
    }
    RespondSuccess(c, http.StatusOK, "", gin.H{"project": p})
}

// Create POST /api/v1/projects
func (h *projectHandler) Create(c *gin.Context) {
    var req dto.ProjectCreate
    if err := c.ShouldBindJSON(&req); err != nil {
        respondContractError(c, http.StatusBadRequest, "validation_error", message.MsgValidationError, h.util.CreateValidationErrorMap(err))
        return
    }
    p, err := h.svc.Create(c.Request.Context(), &req)
    if err != nil {
        respondContractError(c, http.StatusBadRequest, "validation_error", message.MsgValidationError, map[string]string{"request": err.Error()})
        return
    }
    RespondSuccess(c, http.StatusCreated, "", gin.H{"project": p})
}

// Update PUT /api/v1/projects/:id
func (h *projectHandler) Update(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        RespondBadRequest(c, message.MsgInvalidIDFormat)
        return
    }
    var req dto.ProjectUpdate
    if err := c.ShouldBindJSON(&req); err != nil {
        respondContractError(c, http.StatusBadRequest, "validation_error", message.MsgValidationError, h.util.CreateValidationErrorMap(err))
        return
    }
    p, err := h.svc.Update(c.Request.Context(), id, &req)
    if err != nil {
        respondContractError(c, http.StatusBadRequest, "validation_error", message.MsgValidationError, map[string]string{"request": err.Error()})
        return
    }
    if p == nil {
        RespondNotFound(c, "案件")
        return
    }
    RespondSuccess(c, http.StatusOK, "", gin.H{"project": p})
}

// respondContractError 新規/更新エンドポイントの共通エラーエンベロープ
func respondContractError(c *gin.Context, status int, code string, message string, errors map[string]string) {
    payload := gin.H{
        "code":    code,
        "message": message,
    }
    if errors != nil && len(errors) > 0 {
        payload["errors"] = errors
    }
    c.JSON(status, payload)
}
