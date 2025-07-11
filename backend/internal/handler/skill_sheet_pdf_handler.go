package handler

import (
	"fmt"
	"net/http"

	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// SkillSheetPDFHandler スキルシートPDFハンドラーのインターフェース
type SkillSheetPDFHandler interface {
	GenerateSkillSheetPDF(c *gin.Context)     // ログインユーザーのスキルシートPDF生成
	GenerateUserSkillSheetPDF(c *gin.Context) // 指定ユーザーのスキルシートPDF生成（管理者用）
}

// skillSheetPDFHandler スキルシートPDFハンドラーの実装
type skillSheetPDFHandler struct {
	BaseHandler
	skillSheetPDFService service.SkillSheetPDFServiceV2
}

// NewSkillSheetPDFHandler スキルシートPDFハンドラーのインスタンスを生成
func NewSkillSheetPDFHandler(
	skillSheetPDFService service.SkillSheetPDFServiceV2,
	logger *zap.Logger,
) SkillSheetPDFHandler {
	return &skillSheetPDFHandler{
		BaseHandler:          BaseHandler{Logger: logger},
		skillSheetPDFService: skillSheetPDFService,
	}
}

// GenerateSkillSheetPDF ログインユーザーのスキルシートPDF生成
func (h *skillSheetPDFHandler) GenerateSkillSheetPDF(c *gin.Context) {
	ctx := c.Request.Context()

	// ユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		RespondUnauthorized(c)
		return
	}

	userID, ok := userIDStr.(uuid.UUID)
	if !ok {
		RespondUnauthorized(c)
		return
	}

	// PDFを生成
	pdfData, err := h.skillSheetPDFService.GenerateSkillSheetPDF(ctx, userID)
	if err != nil {
		if err.Error() == "ユーザーが見つかりません" ||
			err.Error() == "プロフィールが見つかりません" ||
			err.Error() == "スキルシートが見つかりません" {
			RespondNotFound(c, "スキルシート情報")
			return
		}
		HandleError(c, http.StatusInternalServerError, "スキルシートPDFの生成に失敗しました", h.Logger, err)
		return
	}

	// ファイル名を生成
	fileName := fmt.Sprintf("skillsheet_%s.pdf", userID.String())

	// PDFレスポンス
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	c.Header("Content-Length", fmt.Sprintf("%d", len(pdfData)))
	c.Data(http.StatusOK, "application/pdf", pdfData)
}

// GenerateUserSkillSheetPDF 指定ユーザーのスキルシートPDF生成（管理者用）
func (h *skillSheetPDFHandler) GenerateUserSkillSheetPDF(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからユーザーIDを取得
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		RespondValidationError(c, map[string]string{
			"id": "無効なユーザーIDです",
		})
		return
	}

	// PDFを生成
	pdfData, err := h.skillSheetPDFService.GenerateSkillSheetPDF(ctx, userID)
	if err != nil {
		if err.Error() == "ユーザーが見つかりません" ||
			err.Error() == "プロフィールが見つかりません" ||
			err.Error() == "スキルシートが見つかりません" {
			RespondNotFound(c, "スキルシート情報")
			return
		}
		HandleError(c, http.StatusInternalServerError, "スキルシートPDFの生成に失敗しました", h.Logger, err)
		return
	}

	// ファイル名を生成
	fileName := fmt.Sprintf("skillsheet_%s.pdf", userIDStr)

	// PDFレスポンス
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	c.Header("Content-Length", fmt.Sprintf("%d", len(pdfData)))
	c.Data(http.StatusOK, "application/pdf", pdfData)
}
