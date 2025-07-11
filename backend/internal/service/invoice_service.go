package service

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// InvoiceService 請求書サービスのインターフェース
type InvoiceService interface {
	GetInvoices(ctx context.Context, req *dto.InvoiceSearchRequest) ([]dto.InvoiceDTO, int64, error)
	GetInvoiceByID(ctx context.Context, invoiceID uuid.UUID) (*dto.InvoiceDetailDTO, error)
	CreateInvoice(ctx context.Context, req *dto.CreateInvoiceRequest) (*dto.InvoiceDetailDTO, error)
	UpdateInvoice(ctx context.Context, invoiceID uuid.UUID, req *dto.UpdateInvoiceRequest) (*dto.InvoiceDTO, error)
	UpdateInvoiceStatus(ctx context.Context, invoiceID uuid.UUID, req *dto.UpdateInvoiceStatusRequest) (*dto.InvoiceDTO, error)
	DeleteInvoice(ctx context.Context, invoiceID uuid.UUID) error
	GetInvoiceSummary(ctx context.Context, clientID *uuid.UUID, dateFrom, dateTo *time.Time) (*dto.InvoiceSummaryDTO, error)
	ExportInvoicePDF(ctx context.Context, invoiceID uuid.UUID) ([]byte, error)
}

// invoiceService 請求書サービスの実装
type invoiceService struct {
	db          *gorm.DB
	invoiceRepo repository.InvoiceRepository
	clientRepo  repository.ClientRepository
	projectRepo repository.ProjectRepository
	userRepo    repository.UserRepository
	logger      *zap.Logger
}

// NewInvoiceService 請求書サービスのインスタンスを生成
func NewInvoiceService(
	db *gorm.DB,
	invoiceRepo repository.InvoiceRepository,
	clientRepo repository.ClientRepository,
	projectRepo repository.ProjectRepository,
	userRepo repository.UserRepository,
	logger *zap.Logger,
) InvoiceService {
	return &invoiceService{
		db:          db,
		invoiceRepo: invoiceRepo,
		clientRepo:  clientRepo,
		projectRepo: projectRepo,
		userRepo:    userRepo,
		logger:      logger,
	}
}

// GetInvoices 請求書一覧を取得
func (s *invoiceService) GetInvoices(ctx context.Context, req *dto.InvoiceSearchRequest) ([]dto.InvoiceDTO, int64, error) {
	// デフォルト値設定
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 || req.Limit > 100 {
		req.Limit = 20
	}

	offset := (req.Page - 1) * req.Limit

	// クエリ構築
	query := s.db.WithContext(ctx).Model(&model.Invoice{}).
		Preload("Client").
		Where("invoices.deleted_at IS NULL")

	// 検索条件
	if req.ClientID != nil {
		query = query.Where("client_id = ?", *req.ClientID)
	}

	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	if req.DateFrom != nil {
		query = query.Where("invoice_date >= ?", *req.DateFrom)
	}

	if req.DateTo != nil {
		query = query.Where("invoice_date <= ?", *req.DateTo)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		s.logger.Error("Failed to count invoices", zap.Error(err))
		return nil, 0, err
	}

	// データを取得
	var invoices []model.Invoice
	if err := query.
		Order("invoice_date DESC").
		Limit(req.Limit).
		Offset(offset).
		Find(&invoices).Error; err != nil {
		s.logger.Error("Failed to get invoices", zap.Error(err))
		return nil, 0, err
	}

	// DTOに変換
	dtos := make([]dto.InvoiceDTO, len(invoices))
	for i, invoice := range invoices {
		dtos[i] = s.modelToDTO(&invoice)
	}

	return dtos, total, nil
}

// GetInvoiceByID 請求書詳細を取得
func (s *invoiceService) GetInvoiceByID(ctx context.Context, invoiceID uuid.UUID) (*dto.InvoiceDetailDTO, error) {
	var invoice model.Invoice
	if err := s.db.WithContext(ctx).
		Preload("Client").
		Preload("Details", func(db *gorm.DB) *gorm.DB {
			return db.Order("order_index")
		}).
		Preload("Details.Project").
		Preload("Details.User").
		Where("id = ? AND deleted_at IS NULL", invoiceID).
		First(&invoice).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("請求書が見つかりません")
		}
		s.logger.Error("Failed to get invoice", zap.Error(err))
		return nil, err
	}

	// DTOに変換
	dto := &dto.InvoiceDetailDTO{
		InvoiceDTO: s.modelToDTO(&invoice),
		Details:    make([]dto.InvoiceItemDTO, len(invoice.Details)),
	}

	for i, detail := range invoice.Details {
		dto.Details[i] = s.detailToDTO(&detail)
	}

	return dto, nil
}

// CreateInvoice 請求書を作成
func (s *invoiceService) CreateInvoice(ctx context.Context, req *dto.CreateInvoiceRequest) (*dto.InvoiceDetailDTO, error) {
	// 取引先の存在確認
	exists, err := s.clientRepo.Exists(ctx, req.ClientID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("取引先が見つかりません")
	}

	// 請求書番号の重複確認
	existing, err := s.invoiceRepo.FindByInvoiceNumber(ctx, req.InvoiceNumber)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("請求書番号が既に使用されています")
	}

	// モデルに変換
	invoice := &model.Invoice{
		ClientID:      req.ClientID,
		InvoiceNumber: req.InvoiceNumber,
		InvoiceDate:   req.InvoiceDate,
		DueDate:       req.DueDate,
		Status:        model.InvoiceStatusDraft,
		Notes:         req.Notes,
	}

	// 明細の作成と金額計算
	details := make([]*model.InvoiceDetail, len(req.Details))
	subtotal := 0.0

	for i, item := range req.Details {
		amount := item.Quantity * item.UnitPrice
		subtotal += amount

		details[i] = &model.InvoiceDetail{
			ProjectID:   item.ProjectID,
			UserID:      item.UserID,
			Description: item.Description,
			Quantity:    item.Quantity,
			UnitPrice:   item.UnitPrice,
			Amount:      amount,
		}
	}

	// 税額計算（10%）
	tax := subtotal * 0.10
	totalAmount := subtotal + tax

	invoice.Subtotal = subtotal
	invoice.TaxAmount = tax
	invoice.TotalAmount = totalAmount

	// トランザクションで作成
	if err := s.invoiceRepo.CreateWithDetails(ctx, invoice, details); err != nil {
		s.logger.Error("Failed to create invoice", zap.Error(err))
		return nil, err
	}

	// 作成した請求書を取得して返す
	return s.GetInvoiceByID(ctx, invoice.ID)
}

// UpdateInvoice 請求書を更新
func (s *invoiceService) UpdateInvoice(ctx context.Context, invoiceID uuid.UUID, req *dto.UpdateInvoiceRequest) (*dto.InvoiceDTO, error) {
	// トランザクション開始
	tx := s.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 既存の請求書を取得
	var invoice model.Invoice
	if err := tx.Where("id = ? AND deleted_at IS NULL", invoiceID).First(&invoice).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("請求書が見つかりません")
		}
		return nil, err
	}

	// ドラフト状態のみ更新可能
	if invoice.Status != model.InvoiceStatusDraft {
		tx.Rollback()
		return nil, fmt.Errorf("ドラフト状態の請求書のみ更新できます")
	}

	// 更新
	updates := map[string]interface{}{}
	if req.InvoiceDate != nil {
		updates["invoice_date"] = *req.InvoiceDate
	}
	if req.DueDate != nil {
		updates["due_date"] = *req.DueDate
	}
	if req.Notes != nil {
		updates["notes"] = *req.Notes
	}

	if err := tx.Model(&invoice).Updates(updates).Error; err != nil {
		tx.Rollback()
		s.logger.Error("Failed to update invoice", zap.Error(err))
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// 更新後のデータを取得
	updated, err := s.invoiceRepo.FindByID(ctx, invoiceID)
	if err != nil {
		return nil, err
	}

	// クライアント情報を取得
	if err := s.db.WithContext(ctx).Preload("Client").First(updated, invoiceID).Error; err != nil {
		return nil, err
	}

	dto := s.modelToDTO(updated)
	return &dto, nil
}

// UpdateInvoiceStatus 請求書ステータスを更新
func (s *invoiceService) UpdateInvoiceStatus(ctx context.Context, invoiceID uuid.UUID, req *dto.UpdateInvoiceStatusRequest) (*dto.InvoiceDTO, error) {
	// トランザクション開始
	tx := s.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 既存の請求書を取得
	var invoice model.Invoice
	if err := tx.Where("id = ? AND deleted_at IS NULL", invoiceID).First(&invoice).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("請求書が見つかりません")
		}
		return nil, err
	}

	// ステータス遷移の検証
	newStatus := model.InvoiceStatus(req.Status)
	if !s.isValidStatusTransition(invoice.Status, newStatus) {
		tx.Rollback()
		return nil, fmt.Errorf("無効なステータス遷移です")
	}

	// 更新
	updates := map[string]interface{}{
		"status": newStatus,
	}

	// 支払済みの場合は支払日を設定
	if newStatus == model.InvoiceStatusPaid {
		if req.PaymentDate != nil {
			updates["payment_date"] = *req.PaymentDate
		} else {
			updates["payment_date"] = time.Now()
		}
	}

	if err := tx.Model(&invoice).Updates(updates).Error; err != nil {
		tx.Rollback()
		s.logger.Error("Failed to update invoice status", zap.Error(err))
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// 更新後のデータを取得
	updated, err := s.invoiceRepo.FindByID(ctx, invoiceID)
	if err != nil {
		return nil, err
	}

	// クライアント情報を取得
	if err := s.db.WithContext(ctx).Preload("Client").First(updated, invoiceID).Error; err != nil {
		return nil, err
	}

	dto := s.modelToDTO(updated)
	return &dto, nil
}

// DeleteInvoice 請求書を削除
func (s *invoiceService) DeleteInvoice(ctx context.Context, invoiceID uuid.UUID) error {
	// 既存の請求書を取得
	invoice, err := s.invoiceRepo.FindByID(ctx, invoiceID)
	if err != nil {
		return err
	}
	if invoice == nil {
		return fmt.Errorf("請求書が見つかりません")
	}

	// ドラフト状態のみ削除可能
	if invoice.Status != model.InvoiceStatusDraft {
		return fmt.Errorf("ドラフト状態の請求書のみ削除できます")
	}

	// 論理削除
	if err := s.invoiceRepo.Delete(ctx, invoice); err != nil {
		s.logger.Error("Failed to delete invoice", zap.Error(err))
		return err
	}

	return nil
}

// GetInvoiceSummary 請求書サマリを取得
func (s *invoiceService) GetInvoiceSummary(ctx context.Context, clientID *uuid.UUID, dateFrom, dateTo *time.Time) (*dto.InvoiceSummaryDTO, error) {
	summary, err := s.invoiceRepo.GetSummary(ctx, clientID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}

	return &dto.InvoiceSummaryDTO{
		TotalAmount:   summary.TotalAmount,
		PaidAmount:    summary.PaidAmount,
		UnpaidAmount:  summary.UnpaidAmount,
		OverdueAmount: summary.OverdueAmount,
		DraftCount:    summary.DraftCount,
		SentCount:     summary.SentCount,
		PaidCount:     summary.PaidCount,
		OverdueCount:  summary.OverdueCount,
	}, nil
}

// ExportInvoicePDF 請求書をPDF形式でエクスポート
func (s *invoiceService) ExportInvoicePDF(ctx context.Context, invoiceID uuid.UUID) ([]byte, error) {
	// TODO: PDF生成の実装
	// 現在は仮実装
	return nil, fmt.Errorf("PDF export not implemented yet")
}

// modelToDTO モデルをDTOに変換
func (s *invoiceService) modelToDTO(invoice *model.Invoice) dto.InvoiceDTO {
	dto := dto.InvoiceDTO{
		ID:            invoice.ID,
		ClientID:      invoice.ClientID,
		InvoiceNumber: invoice.InvoiceNumber,
		InvoiceDate:   invoice.InvoiceDate,
		DueDate:       invoice.DueDate,
		Status:        string(invoice.Status),
		Subtotal:      invoice.Subtotal,
		Tax:           invoice.TaxAmount,
		TotalAmount:   invoice.TotalAmount,
		Notes:         invoice.Notes,
		PaymentDate:   invoice.PaidDate,
		CreatedAt:     invoice.CreatedAt,
		UpdatedAt:     invoice.UpdatedAt,
	}

	// ClientがPreloadされている場合、会社名を設定
	if invoice.Client.ID != uuid.Nil {
		dto.ClientName = invoice.Client.CompanyName
	}

	return dto
}

// detailToDTO 明細をDTOに変換
func (s *invoiceService) detailToDTO(detail *model.InvoiceDetail) dto.InvoiceItemDTO {
	dto := dto.InvoiceItemDTO{
		ID:          detail.ID,
		InvoiceID:   detail.InvoiceID,
		ProjectID:   detail.ProjectID,
		UserID:      detail.UserID,
		Description: detail.Description,
		Quantity:    detail.Quantity,
		UnitPrice:   detail.UnitPrice,
		Amount:      detail.Amount,
		OrderIndex:  detail.OrderIndex,
	}

	if detail.Project != nil {
		dto.ProjectName = detail.Project.ProjectName
	}

	if detail.User != nil {
		dto.UserName = fmt.Sprintf("%s %s", detail.User.LastName, detail.User.FirstName)
	}

	return dto
}

// isValidStatusTransition ステータス遷移が有効か検証
func (s *invoiceService) isValidStatusTransition(current, new model.InvoiceStatus) bool {
	transitions := map[model.InvoiceStatus][]model.InvoiceStatus{
		model.InvoiceStatusDraft:     {model.InvoiceStatusSent, model.InvoiceStatusCancelled},
		model.InvoiceStatusSent:      {model.InvoiceStatusPaid, model.InvoiceStatusOverdue, model.InvoiceStatusCancelled},
		model.InvoiceStatusPaid:      {}, // 支払済みからの遷移なし
		model.InvoiceStatusOverdue:   {model.InvoiceStatusPaid, model.InvoiceStatusCancelled},
		model.InvoiceStatusCancelled: {}, // キャンセル済みからの遷移なし
	}

	allowedStatuses, ok := transitions[current]
	if !ok {
		return false
	}

	for _, status := range allowedStatuses {
		if status == new {
			return true
		}
	}

	return false
}
