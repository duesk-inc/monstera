package handler

import (
	"net/http"
	"strconv"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AdminEngineerHandler 管理者用エンジニア管理ハンドラーのインターフェース
type AdminEngineerHandler interface {
	GetEngineers(c *gin.Context)          // エンジニア一覧取得
	GetEngineerDetail(c *gin.Context)     // エンジニア詳細取得
	CreateEngineer(c *gin.Context)        // エンジニア作成
	UpdateEngineer(c *gin.Context)        // エンジニア更新
	DeleteEngineer(c *gin.Context)        // エンジニア削除
	UpdateEngineerStatus(c *gin.Context)  // エンジニアステータス更新
	ExportEngineersCSV(c *gin.Context)    // CSVエクスポート
	ImportEngineersCSV(c *gin.Context)    // CSVインポート
	GetEngineerStatistics(c *gin.Context) // 統計情報取得
}

// adminEngineerHandler 管理者用エンジニア管理ハンドラーの実装
type adminEngineerHandler struct {
	BaseHandler
	engineerService service.EngineerService
	util            *HandlerUtil
}

// NewAdminEngineerHandler 管理者用エンジニア管理ハンドラーのインスタンスを生成
func NewAdminEngineerHandler(
	engineerService service.EngineerService,
	logger *zap.Logger,
) AdminEngineerHandler {
	return &adminEngineerHandler{
		BaseHandler:     BaseHandler{Logger: logger},
		engineerService: engineerService,
		util:            NewHandlerUtil(logger),
	}
}

// ヘルパー関数：ポインタ文字列を文字列に変換
func ptrToStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// GetEngineers エンジニア一覧取得
func (h *adminEngineerHandler) GetEngineers(c *gin.Context) {
	ctx := c.Request.Context()

	// パラメータの取得
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// フィルタパラメータの取得
	filters := repository.EngineerFilters{
		Page:       page,
		Limit:      limit,
		Search:     c.Query("keyword"),
		Department: c.Query("department"),
		Position:   c.Query("position"),
		Status:     c.Query("engineerStatus"),
		Sort:       c.Query("orderBy"),
		Order:      c.Query("order"),
	}

	// スキルIDの取得（複数可）
	if skillIDs := c.QueryArray("skillIds[]"); len(skillIDs) > 0 {
		filters.Skills = skillIDs
	}

	// サービス呼び出し
	engineers, total, err := h.engineerService.GetEngineers(ctx, filters)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "エンジニア一覧の取得に失敗しました", h.Logger, err)
		return
	}

	// DTOに変換
	engineerDTOs := make([]dto.EngineerSummaryDTO, len(engineers))
	for i, engineer := range engineers {
		engineerDTOs[i] = dto.UserToEngineerSummaryDTO(engineer)
	}

	// ページ数の計算
	pages := int(total) / limit
	if int(total)%limit > 0 {
		pages++
	}

	// レスポンス作成
	response := dto.GetEngineersResponseDTO{
		Engineers: engineerDTOs,
		Total:     total,
		Page:      page,
		Limit:     limit,
		Pages:     pages,
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"engineers": response.Engineers,
		"total":     response.Total,
		"page":      response.Page,
		"limit":     response.Limit,
		"pages":     response.Pages,
	})
}

// GetEngineerDetail エンジニア詳細取得
func (h *adminEngineerHandler) GetEngineerDetail(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからエンジニアIDを取得
	engineerID, ok := h.util.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	// エンジニア基本情報の取得
	engineer, err := h.engineerService.GetEngineerByID(ctx, engineerID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			RespondNotFound(c, "エンジニア")
			return
		}
		HandleError(c, http.StatusInternalServerError, "エンジニア情報の取得に失敗しました", h.Logger, err)
		return
	}

	// ステータス履歴の取得
	statusHistory, err := h.engineerService.GetStatusHistory(ctx, engineerID)
	if err != nil {
		h.Logger.Error("Failed to get status history", zap.Error(err))
		statusHistory = []*model.EngineerStatusHistory{}
	}

	// スキル情報の取得
	skills, err := h.engineerService.GetEngineerSkills(ctx, engineerID)
	if err != nil {
		h.Logger.Error("Failed to get skills", zap.Error(err))
		skills = []*model.EngineerSkill{}
	}

	// プロジェクト履歴の取得
	projectHistory, err := h.engineerService.GetProjectHistory(ctx, engineerID)
	if err != nil {
		h.Logger.Error("Failed to get project history", zap.Error(err))
		projectHistory = []*model.EngineerProjectHistory{}
	}

	// DTOに変換
	engineerDTO := dto.UserToEngineerDTO(engineer)

	statusHistoryDTOs := make([]dto.EngineerStatusHistoryDTO, len(statusHistory))
	for i, history := range statusHistory {
		statusHistoryDTOs[i] = dto.StatusHistoryToDTO(history)
	}

	skillDTOs := make([]dto.EngineerSkillDTO, len(skills))
	for i, skill := range skills {
		skillDTOs[i] = dto.SkillToDTO(skill)
	}

	projectHistoryDTOs := make([]dto.EngineerProjectHistoryDTO, len(projectHistory))
	for i, history := range projectHistory {
		projectHistoryDTOs[i] = dto.ProjectHistoryToDTO(history)
	}

	// レスポンス作成
	response := dto.EngineerDetailDTO{
		User:           engineerDTO,
		StatusHistory:  statusHistoryDTOs,
		Skills:         skillDTOs,
		ProjectHistory: projectHistoryDTOs,
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"user":           response.User,
		"statusHistory":  response.StatusHistory,
		"skills":         response.Skills,
		"projectHistory": response.ProjectHistory,
	})
}

// CreateEngineer エンジニア作成
func (h *adminEngineerHandler) CreateEngineer(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストボディのパース
	var req dto.CreateEngineerRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		errors := h.util.ExtractValidationErrors(err)
		RespondValidationError(c, errors)
		return
	}

	// サービス用の入力データに変換
	input := service.CreateEngineerInput{
		Email:          req.Email,
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		FirstNameKana:  ptrToStr(req.FirstNameKana),
		LastNameKana:   ptrToStr(req.LastNameKana),
		Sei:            req.Sei,
		Mei:            req.Mei,
		SeiKana:        ptrToStr(req.SeiKana),
		MeiKana:        ptrToStr(req.MeiKana),
		PhoneNumber:    ptrToStr(req.PhoneNumber),
		Department:     ptrToStr(req.Department),
		Position:       ptrToStr(req.Position),
		HireDate:       req.HireDate,
		Education:      ptrToStr(req.Education),
		EngineerStatus: "active", // デフォルトはアクティブ
		CreatedBy:      userID,
	}

	// サービス呼び出し
	engineer, err := h.engineerService.CreateEngineer(ctx, input)
	if err != nil {
		// エラーメッセージを確認してメールアドレス重複の場合は400エラー
		if err.Error() == "このメールアドレスは既に使用されています" {
			RespondBadRequest(c, "指定されたメールアドレスは既に使用されています")
			return
		}
		HandleError(c, http.StatusInternalServerError, "エンジニアの作成に失敗しました", h.Logger, err)
		return
	}

	// DTOに変換
	engineerDTO := dto.UserToEngineerDTO(engineer)

	RespondSuccess(c, http.StatusCreated, "エンジニアを作成しました", gin.H{
		"engineer": engineerDTO,
	})
}

// UpdateEngineer エンジニア更新
func (h *adminEngineerHandler) UpdateEngineer(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータからエンジニアIDを取得
	engineerID, ok := h.util.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	// リクエストボディのパース
	var req dto.UpdateEngineerRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		errors := h.util.ExtractValidationErrors(err)
		RespondValidationError(c, errors)
		return
	}

	// サービス用の入力データに変換
	input := service.UpdateEngineerInput{
		FirstName:     ptrToStr(req.FirstName),
		LastName:      ptrToStr(req.LastName),
		FirstNameKana: ptrToStr(req.FirstNameKana),
		LastNameKana:  ptrToStr(req.LastNameKana),
		Sei:           ptrToStr(req.Sei),
		Mei:           ptrToStr(req.Mei),
		SeiKana:       ptrToStr(req.SeiKana),
		MeiKana:       ptrToStr(req.MeiKana),
		PhoneNumber:   ptrToStr(req.PhoneNumber),
		Department:    ptrToStr(req.Department),
		Position:      ptrToStr(req.Position),
		HireDate:      req.HireDate,
		Education:     ptrToStr(req.Education),
		UpdatedBy:     userID,
	}

	// サービス呼び出し
	engineer, err := h.engineerService.UpdateEngineer(ctx, engineerID, input)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			RespondNotFound(c, "エンジニア")
			return
		}
		HandleError(c, http.StatusInternalServerError, "エンジニア情報の更新に失敗しました", h.Logger, err)
		return
	}

	// DTOに変換
	engineerDTO := dto.UserToEngineerDTO(engineer)

	RespondSuccess(c, http.StatusOK, "エンジニア情報を更新しました", gin.H{
		"engineer": engineerDTO,
	})
}

// DeleteEngineer エンジニア削除
func (h *adminEngineerHandler) DeleteEngineer(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからエンジニアIDを取得
	engineerID, ok := h.util.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	// サービス呼び出し
	err := h.engineerService.DeleteEngineer(ctx, engineerID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			RespondNotFound(c, "エンジニア")
			return
		}
		HandleError(c, http.StatusInternalServerError, "エンジニアの削除に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "エンジニアを削除しました", nil)
}

// UpdateEngineerStatus エンジニアステータス更新
func (h *adminEngineerHandler) UpdateEngineerStatus(c *gin.Context) {
	ctx := c.Request.Context()

	// 認証済みユーザーIDを取得
	userID, ok := h.util.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータからエンジニアIDを取得
	engineerID, ok := h.util.ParseUUIDParam(c, "id")
	if !ok {
		return
	}

	// リクエストボディのパース
	var req dto.UpdateEngineerStatusRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		errors := h.util.ExtractValidationErrors(err)
		RespondValidationError(c, errors)
		return
	}

	// サービス呼び出し
	err := h.engineerService.UpdateEngineerStatus(ctx, engineerID, req.Status, req.Reason, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			RespondNotFound(c, "エンジニア")
			return
		}
		HandleError(c, http.StatusInternalServerError, "ステータスの更新に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "ステータスを更新しました", nil)
}

// ExportEngineersCSV CSVエクスポート
func (h *adminEngineerHandler) ExportEngineersCSV(c *gin.Context) {
	// TODO: 実装が必要な場合は後で追加
	RespondError(c, http.StatusNotImplemented, "この機能は現在実装中です")
}

// ImportEngineersCSV CSVインポート
func (h *adminEngineerHandler) ImportEngineersCSV(c *gin.Context) {
	// TODO: 実装が必要な場合は後で追加
	RespondError(c, http.StatusNotImplemented, "この機能は現在実装中です")
}

// GetEngineerStatistics 統計情報取得
func (h *adminEngineerHandler) GetEngineerStatistics(c *gin.Context) {
	// TODO: 実装が必要な場合は後で追加
	RespondError(c, http.StatusNotImplemented, "この機能は現在実装中です")
}
