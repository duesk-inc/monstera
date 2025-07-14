package handler

import (
	"net/http"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ExpensePDFHandler 経費申請PDFハンドラーのインターフェース
type ExpensePDFHandler interface {
	GenerateExpensePDF(c *gin.Context)
	GenerateExpenseListPDF(c *gin.Context)
}

// expensePDFHandler 経費申請PDFハンドラーの実装
type expensePDFHandler struct {
	service service.ExpensePDFService
	logger  *zap.Logger
}

// NewExpensePDFHandler 経費申請PDFハンドラーのインスタンスを生成
func NewExpensePDFHandler(
	service service.ExpensePDFService,
	logger *zap.Logger,
) ExpensePDFHandler {
	return &expensePDFHandler{
		service: service,
		logger:  logger,
	}
}

// GenerateExpensePDF 単一の経費申請PDFを生成
// @Summary 経費申請PDFを生成
// @Description 指定された経費申請のPDFを生成してダウンロード
// @Tags expenses
// @Accept json
// @Produce application/pdf
// @Param id path string true "経費申請ID"
// @Success 200 {file} binary
// @Failure 400 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/expenses/{id}/pdf [get]
func (h *expensePDFHandler) GenerateExpensePDF(c *gin.Context) {
	// パスパラメータから経費申請IDを取得
	expenseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.logger.Error("Invalid expense ID", zap.Error(err))
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Error: "無効な経費申請IDです",
			Code:  "INVALID_EXPENSE_ID",
		})
		return
	}

	// PDFを生成
	pdfData, err := h.service.GenerateExpensePDF(c.Request.Context(), expenseID)
	if err != nil {
		h.logger.Error("Failed to generate expense PDF", zap.Error(err), zap.String("expense_id", expenseID.String()))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Error: "PDF生成に失敗しました",
			Code:  "PDF_GENERATION_FAILED",
		})
		return
	}

	// PDFファイルとしてレスポンスを返す
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=expense_"+expenseID.String()+".pdf")
	c.Data(http.StatusOK, "application/pdf", pdfData)
}

// GenerateExpenseListPDF 経費申請一覧のPDFを生成
// @Summary 経費申請一覧PDFを生成
// @Description フィルター条件に基づいて経費申請一覧のPDFを生成
// @Tags expenses
// @Accept json
// @Produce application/pdf
// @Param status query string false "ステータス" Enums(draft,submitted,approved,rejected)
// @Param user_id query string false "ユーザーID"
// @Param start_date query string false "開始日（YYYY-MM-DD）"
// @Param end_date query string false "終了日（YYYY-MM-DD）"
// @Param page query int false "ページ番号" default(1)
// @Param per_page query int false "ページあたりの件数" default(50)
// @Success 200 {file} binary
// @Failure 400 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/expenses/pdf [get]
func (h *expensePDFHandler) GenerateExpenseListPDF(c *gin.Context) {
	// フィルター条件をバインド
	var filter dto.ExpenseFilterRequest
	if err := c.ShouldBindQuery(&filter); err != nil {
		h.logger.Error("Invalid filter parameters", zap.Error(err))
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Error: "無効なフィルター条件です",
			Code:  "INVALID_FILTER",
		})
		return
	}

	// デフォルト値を設定
	filter.SetDefaults()
	// PDF生成の場合は最大件数を制限
	if filter.Limit > 500 {
		filter.Limit = 500
	}

	// PDFを生成
	pdfData, err := h.service.GenerateExpenseListPDF(c.Request.Context(), &filter)
	if err != nil {
		h.logger.Error("Failed to generate expense list PDF", zap.Error(err))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Error: "PDF生成に失敗しました",
			Code:  "PDF_GENERATION_FAILED",
		})
		return
	}

	// PDFファイルとしてレスポンスを返す
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=expense_list.pdf")
	c.Data(http.StatusOK, "application/pdf", pdfData)
}