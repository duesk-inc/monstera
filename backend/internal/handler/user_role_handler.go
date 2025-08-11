package handler

import (
	"net/http"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// UserRoleHandler ユーザーロール管理のハンドラー
type UserRoleHandler struct {
	userRepo    repository.UserRepository
	logger      *zap.Logger
	handlerUtil *HandlerUtil
}

// NewUserRoleHandler UserRoleHandlerのインスタンスを生成
func NewUserRoleHandler(userRepo repository.UserRepository, logger *zap.Logger) *UserRoleHandler {
	return &UserRoleHandler{
		userRepo:    userRepo,
		logger:      logger,
		handlerUtil: NewHandlerUtil(logger),
	}
}

// AddRoleRequest ロール追加リクエスト
type AddRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// SetRolesRequest ロール一括設定リクエスト
type SetRolesRequest struct {
	Roles []string `json:"roles" binding:"required"`
}

// AddRole ユーザーにロールを追加
func (h *UserRoleHandler) AddRole(c *gin.Context) {
	// ユーザーIDを取得
	userID, err := ParseUUID(c, "user_id", h.logger)
	if err != nil {
		return
	}

	var req AddRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		HandleError(c, http.StatusBadRequest, message.MsgInvalidRequest, h.logger, err)
		return
	}

	// ロールをパース
	role, err := model.ParseRole(req.Role)
	if err != nil {
		RespondError(c, http.StatusBadRequest, "無効なロールです")
		return
	}

	// ロールを追加
	if err := h.userRepo.AddRole(userID, role); err != nil {
		HandleError(c, http.StatusInternalServerError, "ロールの追加に失敗しました", h.logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "ロールを追加しました", nil)
}

// RemoveRole ユーザーからロールを削除
func (h *UserRoleHandler) RemoveRole(c *gin.Context) {
	// ユーザーIDを取得
	userID, err := ParseUUID(c, "user_id", h.logger)
	if err != nil {
		return
	}

	// ロールを取得
	roleStr := c.Param("role")
	role, err := model.ParseRole(roleStr)
	if err != nil {
		RespondError(c, http.StatusBadRequest, "無効なロールです")
		return
	}

	// ロールを削除
	if err := h.userRepo.RemoveRole(userID, role); err != nil {
		HandleError(c, http.StatusInternalServerError, "ロールの削除に失敗しました", h.logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "ロールを削除しました", nil)
}

// SetRoles ユーザーのロールを一括設定
func (h *UserRoleHandler) SetRoles(c *gin.Context) {
	// ユーザーIDを取得
	userID, err := ParseUUID(c, "user_id", h.logger)
	if err != nil {
		return
	}

	var req SetRolesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		HandleError(c, http.StatusBadRequest, message.MsgInvalidRequest, h.logger, err)
		return
	}

	// ロールをパース
	roles := make([]model.Role, 0, len(req.Roles))
	for _, roleStr := range req.Roles {
		role, err := model.ParseRole(roleStr)
		if err != nil {
			RespondError(c, http.StatusBadRequest, "無効なロールが含まれています: "+roleStr)
			return
		}
		roles = append(roles, role)
	}

	// ロールを一括設定
	if err := h.userRepo.SetRoles(userID, roles); err != nil {
		HandleError(c, http.StatusInternalServerError, "ロールの設定に失敗しました", h.logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "ロールを設定しました", nil)
}

// GetRoles ユーザーのロール一覧を取得
func (h *UserRoleHandler) GetRoles(c *gin.Context) {
	// ユーザーIDを取得
	userID, err := ParseUUID(c, "user_id", h.logger)
	if err != nil {
		return
	}

	// ロール一覧を取得
	roles, err := h.userRepo.GetRoles(userID)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "ロールの取得に失敗しました", h.logger, err)
		return
	}

	// 文字列配列に変換
	roleStrings := make([]string, len(roles))
	for i, role := range roles {
		roleStrings[i] = role
	}

	c.JSON(http.StatusOK, gin.H{
		"roles": roleStrings,
	})
}

// UpdateDefaultRole ユーザーのデフォルトロールを更新
func (h *UserRoleHandler) UpdateDefaultRole(c *gin.Context) {
	// 認証されたユーザーIDを取得
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		RespondError(c, http.StatusUnauthorized, message.MsgUnauthorized)
		return
	}

	userID, ok := userIDInterface.(string)
	if !ok {
		h.logger.Error("Invalid user ID type", zap.Any("user_id", userIDInterface))
		RespondError(c, http.StatusInternalServerError, "ユーザーIDの取得に失敗しました")
		return
	}

	// リクエストボディをバインド
	var req dto.UpdateDefaultRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		HandleError(c, http.StatusBadRequest, message.MsgInvalidRequest, h.logger, err)
		return
	}

	// デフォルトロールが指定されている場合、有効なロールかチェック
	var defaultRole *model.Role
	if req.DefaultRole != nil {
		roleValue := model.Role(*req.DefaultRole)
		if !roleValue.Valid() {
			RespondError(c, http.StatusBadRequest, "無効なロールが指定されました")
			return
		}

		// ユーザーが持っているロールか確認
		userRoles, err := h.userRepo.GetRoles(userID)
		if err != nil {
			HandleError(c, http.StatusInternalServerError, "ロールの確認に失敗しました", h.logger, err)
			return
		}

		hasRole := false
		for _, role := range userRoles {
			if role == roleValue {
				hasRole = true
				break
			}
		}

		if !hasRole {
			RespondError(c, http.StatusBadRequest, "指定されたロールを持っていません")
			return
		}

		defaultRole = &roleValue
	}

	// デフォルトロールを更新
	if err := h.userRepo.UpdateDefaultRole(userID, defaultRole); err != nil {
		HandleError(c, http.StatusInternalServerError, "デフォルトロールの更新に失敗しました", h.logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "デフォルトロールを更新しました", nil)
}
