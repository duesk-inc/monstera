package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// InvoiceHandler 請求書ハンドラーのインターフェース
type InvoiceHandler interface {
	GetInvoices(c *gin.Context)         // 請求書一覧取得
	GetInvoice(c *gin.Context)          // 請求書詳細取得
	CreateInvoice(c *gin.Context)       // 請求書作成
	UpdateInvoice(c *gin.Context)       // 請求書更新
	UpdateInvoiceStatus(c *gin.Context) // 請求書ステータス更新
	DeleteInvoice(c *gin.Context)       // 請求書削除
	GetInvoiceSummary(c *gin.Context)   // 請求書サマリ取得
	ExportInvoicePDF(c *gin.Context)    // 請求書PDF出力
}

// invoiceHandler 請求書ハンドラーの実装
type invoiceHandler struct {
	BaseHandler
	invoiceService service.InvoiceService
	util           *HandlerUtil
}

// NewInvoiceHandler 請求書ハンドラーのインスタンスを生成
func NewInvoiceHandler(
	invoiceService service.InvoiceService,
	logger *zap.Logger,
) InvoiceHandler {
	return &invoiceHandler{
		BaseHandler:    BaseHandler{Logger: logger},
		invoiceService: invoiceService,
		util:           NewHandlerUtil(logger),
	}
}

// GetInvoices 請求書一覧取得
func (h *invoiceHandler) GetInvoices(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストパラメータを取得
	req := &dto.InvoiceSearchRequest{}

	// ページネーション
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	req.Page = page
	req.Limit = limit

	// 検索条件
	if clientIDStr := c.Query("client_id"); clientIDStr != "" {
		clientID, err := uuid.Parse(clientIDStr)
		if err == nil {
			req.ClientID = &clientID
		}
	}

	req.Status = c.Query("status")

	if dateFromStr := c.Query("date_from"); dateFromStr != "" {
		if dateFrom, err := time.Parse("2006-01-02", dateFromStr); err == nil {
			req.DateFrom = &dateFrom
		}
	}

	if dateToStr := c.Query("date_to"); dateToStr != "" {
		if dateTo, err := time.Parse("2006-01-02", dateToStr); err == nil {
			req.DateTo = &dateTo
		}
	}

	// サービス呼び出し
	invoices, total, err := h.invoiceService.GetInvoices(ctx, req)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "請求書一覧の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"invoices": invoices,
		"total":    total,
		"page":     req.Page,
		"limit":    req.Limit,
	})
}

// GetInvoice 請求書詳細取得
func (h *invoiceHandler) GetInvoice(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	invoiceID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	invoice, err := h.invoiceService.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		if err.Error() == "請求書が見つかりません" {
			RespondNotFound(c, "請求書")
			return
		}
		HandleError(c, http.StatusInternalServerError, "請求書詳細の取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"invoice": invoice,
	})
}

// CreateInvoice 請求書作成
func (h *invoiceHandler) CreateInvoice(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストボディを取得
	var req dto.CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, map[string]string{
			"request": "リクエストが不正です",
		})
		return
	}

	// サービス呼び出し
	invoice, err := h.invoiceService.CreateInvoice(ctx, &req)
	if err != nil {
		if err.Error() == "取引先が見つかりません" {
			RespondNotFound(c, "取引先")
			return
		}
		if err.Error() == "請求書番号が既に使用されています" {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		HandleError(c, http.StatusInternalServerError, "請求書の作成に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusCreated, "請求書を作成しました", gin.H{
		"invoice": invoice,
	})
}

// UpdateInvoice 請求書更新
func (h *invoiceHandler) UpdateInvoice(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	invoiceID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// リクエストボディを取得
	var req dto.UpdateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, map[string]string{
			"request": "リクエストが不正です",
		})
		return
	}

	// サービス呼び出し
	invoice, err := h.invoiceService.UpdateInvoice(ctx, invoiceID, &req)
	if err != nil {
		if err.Error() == "請求書が見つかりません" {
			RespondNotFound(c, "請求書")
			return
		}
		if err.Error() == "ドラフト状態の請求書のみ更新できます" {
			RespondError(c, http.StatusBadRequest, err.Error())
			return
		}
		HandleError(c, http.StatusInternalServerError, "請求書の更新に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "請求書を更新しました", gin.H{
		"invoice": invoice,
	})
}

// UpdateInvoiceStatus 請求書ステータス更新
func (h *invoiceHandler) UpdateInvoiceStatus(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	invoiceID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// リクエストボディを取得
	var req dto.UpdateInvoiceStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondValidationError(c, map[string]string{
			"request": "リクエストが不正です",
		})
		return
	}

	// サービス呼び出し
	invoice, err := h.invoiceService.UpdateInvoiceStatus(ctx, invoiceID, &req)
	if err != nil {
		if err.Error() == "請求書が見つかりません" {
			RespondNotFound(c, "請求書")
			return
		}
		if err.Error() == "無効なステータス遷移です" {
			RespondError(c, http.StatusBadRequest, err.Error())
			return
		}
		HandleError(c, http.StatusInternalServerError, "請求書ステータスの更新に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "請求書ステータスを更新しました", gin.H{
		"invoice": invoice,
	})
}

// DeleteInvoice 請求書削除
func (h *invoiceHandler) DeleteInvoice(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	invoiceID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	err = h.invoiceService.DeleteInvoice(ctx, invoiceID)
	if err != nil {
		if err.Error() == "請求書が見つかりません" {
			RespondNotFound(c, "請求書")
			return
		}
		if err.Error() == "ドラフト状態の請求書のみ削除できます" {
			RespondError(c, http.StatusBadRequest, err.Error())
			return
		}
		HandleError(c, http.StatusInternalServerError, "請求書の削除に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "請求書を削除しました", nil)
}

// GetInvoiceSummary 請求書サマリ取得
func (h *invoiceHandler) GetInvoiceSummary(c *gin.Context) {
	ctx := c.Request.Context()

	// リクエストパラメータを取得
	var clientID *string
	if clientIDStr := c.Query("client_id"); clientIDStr != "" {
		id, err := uuid.Parse(clientIDStr)
		if err == nil {
			clientID = &id
		}
	}

	var dateFrom, dateTo *time.Time
	if dateFromStr := c.Query("date_from"); dateFromStr != "" {
		if from, err := time.Parse("2006-01-02", dateFromStr); err == nil {
			dateFrom = &from
		}
	}

	if dateToStr := c.Query("date_to"); dateToStr != "" {
		if to, err := time.Parse("2006-01-02", dateToStr); err == nil {
			dateTo = &to
		}
	}

	// サービス呼び出し
	summary, err := h.invoiceService.GetInvoiceSummary(ctx, clientID, dateFrom, dateTo)
	if err != nil {
		HandleError(c, http.StatusInternalServerError, "請求書サマリの取得に失敗しました", h.Logger, err)
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"summary": summary,
	})
}

// ExportInvoicePDF 請求書PDF出力
func (h *invoiceHandler) ExportInvoicePDF(c *gin.Context) {
	ctx := c.Request.Context()

	// パスパラメータからIDを取得
	invoiceID, err := ParseUUID(c, "id", h.Logger)
	if err != nil {
		return
	}

	// サービス呼び出し
	pdfData, err := h.invoiceService.ExportInvoicePDF(ctx, invoiceID)
	if err != nil {
		if err.Error() == "請求書が見つかりません" {
			RespondNotFound(c, "請求書")
			return
		}
		HandleError(c, http.StatusInternalServerError, "請求書PDFの生成に失敗しました", h.Logger, err)
		return
	}

	// PDFレスポンス
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=invoice.pdf")
	c.Data(http.StatusOK, "application/pdf", pdfData)
}
