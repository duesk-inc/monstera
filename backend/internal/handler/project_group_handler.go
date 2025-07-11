package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
)

// ProjectGroupHandler プロジェクトグループハンドラー
type ProjectGroupHandler struct {
	projectGroupService service.ProjectGroupServiceInterface
	logger              *zap.Logger
}

// NewProjectGroupHandler プロジェクトグループハンドラーのコンストラクタ
func NewProjectGroupHandler(
	projectGroupService service.ProjectGroupServiceInterface,
	logger *zap.Logger,
) *ProjectGroupHandler {
	return &ProjectGroupHandler{
		projectGroupService: projectGroupService,
		logger:              logger,
	}
}

// CreateProjectGroup プロジェクトグループを作成
// @Summary プロジェクトグループ作成
// @Description プロジェクトグループを新規作成します
// @Tags ProjectGroup
// @Accept json
// @Produce json
// @Param request body dto.CreateProjectGroupRequest true "プロジェクトグループ作成リクエスト"
// @Success 201 {object} dto.ProjectGroupDTO "作成されたプロジェクトグループ"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/project-groups [post]
func (h *ProjectGroupHandler) CreateProjectGroup(c *gin.Context) {
	var req dto.CreateProjectGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request body", zap.Error(err))
		utils.RespondError(c, http.StatusBadRequest, "リクエストの形式が正しくありません")
		return
	}

	// バリデーション
	if req.GroupName == "" {
		utils.RespondError(c, http.StatusBadRequest, "グループ名は必須です")
		return
	}

	if len(req.ProjectIDs) == 0 {
		utils.RespondError(c, http.StatusBadRequest, "プロジェクトを少なくとも1つ選択してください")
		return
	}

	// ユーザーIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "認証が必要です")
		return
	}

	createdBy, ok := userID.(uuid.UUID)
	if !ok {
		utils.RespondError(c, http.StatusInternalServerError, "ユーザーID取得エラー")
		return
	}

	// プロジェクトグループを作成
	group, err := h.projectGroupService.CreateProjectGroup(c.Request.Context(), &req, createdBy)
	if err != nil {
		h.logger.Error("Failed to create project group", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "プロジェクトグループの作成に失敗しました")
		return
	}

	c.JSON(http.StatusCreated, group)
}

// GetProjectGroup プロジェクトグループを取得
// @Summary プロジェクトグループ取得
// @Description 指定されたIDのプロジェクトグループを取得します
// @Tags ProjectGroup
// @Accept json
// @Produce json
// @Param id path string true "プロジェクトグループID"
// @Success 200 {object} dto.ProjectGroupDTO "プロジェクトグループ情報"
// @Failure 404 {object} utils.ErrorResponse "プロジェクトグループが見つかりません"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/project-groups/{id} [get]
func (h *ProjectGroupHandler) GetProjectGroup(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "無効なプロジェクトグループIDです")
		return
	}

	group, err := h.projectGroupService.GetProjectGroup(c.Request.Context(), groupID)
	if err != nil {
		h.logger.Error("Failed to get project group", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "プロジェクトグループの取得に失敗しました")
		return
	}

	c.JSON(http.StatusOK, group)
}

// UpdateProjectGroup プロジェクトグループを更新
// @Summary プロジェクトグループ更新
// @Description プロジェクトグループ情報を更新します
// @Tags ProjectGroup
// @Accept json
// @Produce json
// @Param id path string true "プロジェクトグループID"
// @Param request body dto.UpdateProjectGroupRequest true "プロジェクトグループ更新リクエスト"
// @Success 200 {object} dto.ProjectGroupDTO "更新されたプロジェクトグループ"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Failure 404 {object} utils.ErrorResponse "プロジェクトグループが見つかりません"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/project-groups/{id} [put]
func (h *ProjectGroupHandler) UpdateProjectGroup(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "無効なプロジェクトグループIDです")
		return
	}

	var req dto.UpdateProjectGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request body", zap.Error(err))
		utils.RespondError(c, http.StatusBadRequest, "リクエストの形式が正しくありません")
		return
	}

	// プロジェクトグループを更新
	group, err := h.projectGroupService.UpdateProjectGroup(c.Request.Context(), groupID, &req)
	if err != nil {
		h.logger.Error("Failed to update project group", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "プロジェクトグループの更新に失敗しました")
		return
	}

	c.JSON(http.StatusOK, group)
}

// DeleteProjectGroup プロジェクトグループを削除
// @Summary プロジェクトグループ削除
// @Description プロジェクトグループを削除します
// @Tags ProjectGroup
// @Accept json
// @Produce json
// @Param id path string true "プロジェクトグループID"
// @Success 204 "削除成功"
// @Failure 404 {object} utils.ErrorResponse "プロジェクトグループが見つかりません"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/project-groups/{id} [delete]
func (h *ProjectGroupHandler) DeleteProjectGroup(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "無効なプロジェクトグループIDです")
		return
	}

	err = h.projectGroupService.DeleteProjectGroup(c.Request.Context(), groupID)
	if err != nil {
		h.logger.Error("Failed to delete project group", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "プロジェクトグループの削除に失敗しました")
		return
	}

	c.Status(http.StatusNoContent)
}

// ListProjectGroups プロジェクトグループ一覧を取得
// @Summary プロジェクトグループ一覧取得
// @Description プロジェクトグループの一覧を取得します
// @Tags ProjectGroup
// @Accept json
// @Produce json
// @Param client_id query string false "クライアントID"
// @Param is_active query boolean false "アクティブフラグ"
// @Param page query int false "ページ番号" default(1)
// @Param limit query int false "取得件数" default(20)
// @Success 200 {object} dto.ProjectGroupListResponse "プロジェクトグループ一覧"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/project-groups [get]
func (h *ProjectGroupHandler) ListProjectGroups(c *gin.Context) {
	req := &dto.ProjectGroupFilterRequest{}

	// クライアントIDフィルター
	if clientIDStr := c.Query("client_id"); clientIDStr != "" {
		clientID, err := uuid.Parse(clientIDStr)
		if err != nil {
			utils.RespondError(c, http.StatusBadRequest, "無効なクライアントIDです")
			return
		}
		req.ClientID = &clientID
	}

	// ステータスフィルター
	if statusStr := c.Query("status"); statusStr != "" {
		req.Status = &statusStr
	}

	// 検索
	if search := c.Query("search"); search != "" {
		req.Search = &search
	}

	// ページネーション
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	req.Page = page

	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}
	req.Limit = limit

	// プロジェクトグループ一覧を取得
	response, err := h.projectGroupService.ListProjectGroups(c.Request.Context(), req)
	if err != nil {
		h.logger.Error("Failed to list project groups", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "プロジェクトグループ一覧の取得に失敗しました")
		return
	}

	c.JSON(http.StatusOK, response)
}

// AddProjectsToGroup グループにプロジェクトを追加
// @Summary プロジェクト追加
// @Description グループにプロジェクトを追加します
// @Tags ProjectGroup
// @Accept json
// @Produce json
// @Param id path string true "プロジェクトグループID"
// @Param request body dto.AddProjectsRequest true "プロジェクト追加リクエスト"
// @Success 200 {object} dto.ProjectGroupDTO "更新されたプロジェクトグループ"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Failure 404 {object} utils.ErrorResponse "プロジェクトグループが見つかりません"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/project-groups/{id}/projects [post]
func (h *ProjectGroupHandler) AddProjectsToGroup(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "無効なプロジェクトグループIDです")
		return
	}

	var req dto.AddProjectsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request body", zap.Error(err))
		utils.RespondError(c, http.StatusBadRequest, "リクエストの形式が正しくありません")
		return
	}

	if len(req.ProjectIDs) == 0 {
		utils.RespondError(c, http.StatusBadRequest, "プロジェクトを少なくとも1つ選択してください")
		return
	}

	// プロジェクトを追加
	err = h.projectGroupService.AddProjectsToGroup(c.Request.Context(), groupID, req.ProjectIDs)
	if err != nil {
		h.logger.Error("Failed to add projects to group", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "プロジェクトの追加")
		return
	}

	// 更新後のグループを取得
	group, err := h.projectGroupService.GetProjectGroup(c.Request.Context(), groupID)
	if err != nil {
		h.logger.Error("Failed to get updated group", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "更新後のグループ取得")
		return
	}

	c.JSON(http.StatusOK, group)
}

// RemoveProjectsFromGroup グループからプロジェクトを削除
// @Summary プロジェクト削除
// @Description グループからプロジェクトを削除します
// @Tags ProjectGroup
// @Accept json
// @Produce json
// @Param id path string true "プロジェクトグループID"
// @Param request body dto.RemoveProjectsRequest true "プロジェクト削除リクエスト"
// @Success 200 {object} dto.ProjectGroupDTO "更新されたプロジェクトグループ"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Failure 404 {object} utils.ErrorResponse "プロジェクトグループが見つかりません"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/project-groups/{id}/projects [delete]
func (h *ProjectGroupHandler) RemoveProjectsFromGroup(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "無効なプロジェクトグループIDです")
		return
	}

	var req dto.RemoveProjectsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request body", zap.Error(err))
		utils.RespondError(c, http.StatusBadRequest, "リクエストの形式が正しくありません")
		return
	}

	if len(req.ProjectIDs) == 0 {
		utils.RespondError(c, http.StatusBadRequest, "プロジェクトを少なくとも1つ選択してください")
		return
	}

	// プロジェクトを削除
	err = h.projectGroupService.RemoveProjectsFromGroup(c.Request.Context(), groupID, req.ProjectIDs)
	if err != nil {
		h.logger.Error("Failed to remove projects from group", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "プロジェクトの削除")
		return
	}

	// 更新後のグループを取得
	group, err := h.projectGroupService.GetProjectGroup(c.Request.Context(), groupID)
	if err != nil {
		h.logger.Error("Failed to get updated group", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "更新後のグループ取得")
		return
	}

	c.JSON(http.StatusOK, group)
}

// GetGroupStatistics グループの統計情報を取得
// @Summary グループ統計情報取得
// @Description プロジェクトグループの統計情報を取得します
// @Tags ProjectGroup
// @Accept json
// @Produce json
// @Param id path string true "プロジェクトグループID"
// @Success 200 {object} dto.ProjectGroupStatistics "統計情報"
// @Failure 404 {object} utils.ErrorResponse "プロジェクトグループが見つかりません"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/project-groups/{id}/statistics [get]
func (h *ProjectGroupHandler) GetGroupStatistics(c *gin.Context) {
	// TODO: GetGroupStatisticsメソッドをサービスインターフェースに追加する必要があります
	utils.RespondError(c, http.StatusNotImplemented, "統計情報の取得機能は実装中です")
}

// ValidateProjectGroup プロジェクトグループの検証
// @Summary プロジェクトグループ検証
// @Description プロジェクトグループの設定を検証します
// @Tags ProjectGroup
// @Accept json
// @Produce json
// @Param request body dto.ValidateProjectGroupRequest true "検証リクエスト"
// @Success 200 {object} dto.ValidationResult "検証結果"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Router /api/v1/project-groups/validate [post]
func (h *ProjectGroupHandler) ValidateProjectGroup(c *gin.Context) {
	var req dto.ValidateProjectGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request body", zap.Error(err))
		utils.RespondError(c, http.StatusBadRequest, "リクエストの形式が正しくありません")
		return
	}

	// 検証実行
	result := dto.ValidationResult{
		IsValid: true,
		Errors:  []string{},
	}

	// グループ名の検証
	if req.Name == "" {
		result.IsValid = false
		result.Errors = append(result.Errors, "グループ名は必須です")
	}

	// プロジェクトの検証
	if len(req.ProjectIDs) == 0 {
		result.IsValid = false
		result.Errors = append(result.Errors, "プロジェクトを少なくとも1つ選択してください")
	}

	// 重複チェック
	projectMap := make(map[uuid.UUID]bool)
	for _, projectID := range req.ProjectIDs {
		if projectMap[projectID] {
			result.IsValid = false
			result.Errors = append(result.Errors, "重複したプロジェクトが含まれています")
			break
		}
		projectMap[projectID] = true
	}

	// 請求タイプの検証
	validBillingTypes := []string{"fixed", "variable_upper_lower", "variable_middle"}
	isValidBillingType := false
	for _, validType := range validBillingTypes {
		if req.BillingType == validType {
			isValidBillingType = true
			break
		}
	}
	if !isValidBillingType {
		result.IsValid = false
		result.Errors = append(result.Errors, "無効な請求タイプです")
	}

	c.JSON(http.StatusOK, result)
}
