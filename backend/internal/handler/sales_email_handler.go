package handler

import (
	"net/http"
	"strconv"

	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SalesEmailHandler 営業メール管理ハンドラーのインターフェース
type SalesEmailHandler interface {
	// メールテンプレート管理
	CreateEmailTemplate(c *gin.Context)
	GetEmailTemplate(c *gin.Context)
	GetEmailTemplateList(c *gin.Context)
	UpdateEmailTemplate(c *gin.Context)
	DeleteEmailTemplate(c *gin.Context)

	// メールキャンペーン管理
	CreateEmailCampaign(c *gin.Context)
	GetEmailCampaign(c *gin.Context)
	GetEmailCampaignList(c *gin.Context)
	UpdateEmailCampaign(c *gin.Context)
	DeleteEmailCampaign(c *gin.Context)

	// メール送信
	SendCampaign(c *gin.Context)
	SendProposalEmail(c *gin.Context)
	SendInterviewConfirmation(c *gin.Context)
	SendContractExtensionRequest(c *gin.Context)

	// 統計・履歴
	GetCampaignStats(c *gin.Context)
	GetSentHistory(c *gin.Context)
}

// salesEmailHandler 営業メール管理ハンドラーの実装
type salesEmailHandler struct {
	salesEmailService service.SalesEmailService
	salesTeamService  service.SalesTeamService
	logger            *zap.Logger
}

// NewSalesEmailHandler 営業メールハンドラーのインスタンスを生成
func NewSalesEmailHandler(
	salesEmailService service.SalesEmailService,
	salesTeamService service.SalesTeamService,
	logger *zap.Logger,
) SalesEmailHandler {
	return &salesEmailHandler{
		salesEmailService: salesEmailService,
		salesTeamService:  salesTeamService,
		logger:            logger,
	}
}

// CreateEmailTemplate メールテンプレート作成
func (h *salesEmailHandler) CreateEmailTemplate(c *gin.Context) {
	var req service.CreateEmailTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	// ユーザーIDを設定
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	req.CreatedBy = userID.(string)

	template, err := h.salesEmailService.CreateEmailTemplate(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("Failed to create email template", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールテンプレートの作成に失敗しました"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": template})
}

// GetEmailTemplate メールテンプレート取得
func (h *salesEmailHandler) GetEmailTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDが必要です"})
		return
	}

	template, err := h.salesEmailService.GetEmailTemplate(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get email template", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "メールテンプレートが見つかりません"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": template})
}

// GetEmailTemplateList メールテンプレート一覧取得
func (h *salesEmailHandler) GetEmailTemplateList(c *gin.Context) {
	var filter service.EmailTemplateFilter

	// クエリパラメータから検索条件を取得
	filter.Category = c.Query("category")

	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			filter.Page = p
		} else {
			filter.Page = 1
		}
	} else {
		filter.Page = 1
	}

	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			filter.Limit = l
		} else {
			filter.Limit = 20
		}
	} else {
		filter.Limit = 20
	}

	response, err := h.salesEmailService.GetEmailTemplateList(c.Request.Context(), filter)
	if err != nil {
		h.logger.Error("Failed to get email template list", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールテンプレート一覧の取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// UpdateEmailTemplate メールテンプレート更新
func (h *salesEmailHandler) UpdateEmailTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDが必要です"})
		return
	}

	var req service.UpdateEmailTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	// ユーザーIDを設定
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	req.UpdatedBy = userID.(string)

	template, err := h.salesEmailService.UpdateEmailTemplate(c.Request.Context(), id, &req)
	if err != nil {
		h.logger.Error("Failed to update email template", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールテンプレートの更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": template})
}

// DeleteEmailTemplate メールテンプレート削除
func (h *salesEmailHandler) DeleteEmailTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDが必要です"})
		return
	}

	// ユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	err := h.salesEmailService.DeleteEmailTemplate(c.Request.Context(), id, userID.(string))
	if err != nil {
		h.logger.Error("Failed to delete email template", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールテンプレートの削除に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "メールテンプレートを削除しました"})
}

// CreateEmailCampaign メールキャンペーン作成
func (h *salesEmailHandler) CreateEmailCampaign(c *gin.Context) {
	var req service.CreateEmailCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	// ユーザーIDを設定
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	req.CreatedBy = userID.(string)

	campaign, err := h.salesEmailService.CreateEmailCampaign(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("Failed to create email campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールキャンペーンの作成に失敗しました"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": campaign})
}

// GetEmailCampaign メールキャンペーン取得
func (h *salesEmailHandler) GetEmailCampaign(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDが必要です"})
		return
	}

	campaign, err := h.salesEmailService.GetEmailCampaign(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get email campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "メールキャンペーンが見つかりません"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": campaign})
}

// GetEmailCampaignList メールキャンペーン一覧取得
func (h *salesEmailHandler) GetEmailCampaignList(c *gin.Context) {
	var filter service.EmailCampaignFilter

	// クエリパラメータから検索条件を取得
	filter.TemplateID = c.Query("template_id")
	filter.CreatedBy = c.Query("created_by")

	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			filter.Page = p
		} else {
			filter.Page = 1
		}
	} else {
		filter.Page = 1
	}

	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			filter.Limit = l
		} else {
			filter.Limit = 20
		}
	} else {
		filter.Limit = 20
	}

	response, err := h.salesEmailService.GetEmailCampaignList(c.Request.Context(), filter)
	if err != nil {
		h.logger.Error("Failed to get email campaign list", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールキャンペーン一覧の取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// UpdateEmailCampaign メールキャンペーン更新
func (h *salesEmailHandler) UpdateEmailCampaign(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDが必要です"})
		return
	}

	var req service.UpdateEmailCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	// ユーザーIDを設定
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	req.UpdatedBy = userID.(string)

	campaign, err := h.salesEmailService.UpdateEmailCampaign(c.Request.Context(), id, &req)
	if err != nil {
		h.logger.Error("Failed to update email campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールキャンペーンの更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": campaign})
}

// DeleteEmailCampaign メールキャンペーン削除
func (h *salesEmailHandler) DeleteEmailCampaign(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDが必要です"})
		return
	}

	// ユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	err := h.salesEmailService.DeleteEmailCampaign(c.Request.Context(), id, userID.(string))
	if err != nil {
		h.logger.Error("Failed to delete email campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールキャンペーンの削除に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "メールキャンペーンを削除しました"})
}

// SendCampaign メールキャンペーン送信
func (h *salesEmailHandler) SendCampaign(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDが必要です"})
		return
	}

	err := h.salesEmailService.SendCampaign(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to send campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "キャンペーンの送信に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "キャンペーンの送信を開始しました"})
}

// SendProposalEmail 提案メール送信
func (h *salesEmailHandler) SendProposalEmail(c *gin.Context) {
	var req struct {
		ProposalID string                 `json:"proposal_id" binding:"required"`
		TemplateID string                 `json:"template_id" binding:"required"`
		CustomData map[string]interface{} `json:"custom_data"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	err := h.salesEmailService.SendProposalEmail(c.Request.Context(), req.ProposalID, req.TemplateID, req.CustomData)
	if err != nil {
		h.logger.Error("Failed to send proposal email", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "提案メールの送信に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "提案メールを送信しました"})
}

// SendInterviewConfirmation 面談確認メール送信
func (h *salesEmailHandler) SendInterviewConfirmation(c *gin.Context) {
	var req struct {
		InterviewID string `json:"interview_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	err := h.salesEmailService.SendInterviewConfirmation(c.Request.Context(), req.InterviewID)
	if err != nil {
		h.logger.Error("Failed to send interview confirmation", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "面談確認メールの送信に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "面談確認メールを送信しました"})
}

// SendContractExtensionRequest 契約延長依頼メール送信
func (h *salesEmailHandler) SendContractExtensionRequest(c *gin.Context) {
	var req struct {
		ExtensionID string `json:"extension_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	err := h.salesEmailService.SendContractExtensionRequest(c.Request.Context(), req.ExtensionID)
	if err != nil {
		h.logger.Error("Failed to send contract extension request", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "契約延長依頼メールの送信に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "契約延長依頼メールを送信しました"})
}

// GetCampaignStats キャンペーン統計取得
func (h *salesEmailHandler) GetCampaignStats(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDが必要です"})
		return
	}

	stats, err := h.salesEmailService.GetCampaignStats(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get campaign stats", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "キャンペーン統計の取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// GetSentHistory 送信履歴取得
func (h *salesEmailHandler) GetSentHistory(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDが必要です"})
		return
	}

	history, err := h.salesEmailService.GetSentHistory(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get sent history", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "送信履歴の取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": history})
}
