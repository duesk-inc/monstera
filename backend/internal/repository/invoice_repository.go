package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// InvoiceRepository 請求書リポジトリのインターフェース
type InvoiceRepository interface {
	CrudRepository[model.Invoice]
	FindByInvoiceNumber(ctx context.Context, invoiceNumber string) (*model.Invoice, error)
	FindByClientID(ctx context.Context, clientID string) ([]*model.Invoice, error)
	FindByStatus(ctx context.Context, status model.InvoiceStatus) ([]*model.Invoice, error)
	FindOverdue(ctx context.Context) ([]*model.Invoice, error)
	GetSummary(ctx context.Context, clientID *string, dateFrom, dateTo *time.Time) (*InvoiceSummary, error)
	CreateWithDetails(ctx context.Context, invoice *model.Invoice, details []*model.InvoiceDetail) error

	// 経理機能拡張
	FindByBillingMonth(ctx context.Context, billingMonth string, clientID *string) ([]*model.Invoice, error)
	FindByProjectGroupID(ctx context.Context, projectGroupID string) ([]*model.Invoice, error)
	FindByFreeSyncStatus(ctx context.Context, status model.FreeSyncStatus) ([]*model.Invoice, error)
	FindNeedingSync(ctx context.Context, limit int) ([]*model.Invoice, error)
	UpdateFreeSyncStatus(ctx context.Context, id string, status model.FreeSyncStatus, freeeInvoiceID *int) error
	GetMonthlyRevenue(ctx context.Context, year, month int, clientID *string) (float64, error)
	GetBillingStats(ctx context.Context, startDate, endDate time.Time) (*BillingStats, error)
	CreateBatch(ctx context.Context, invoices []*model.Invoice) error
}

// InvoiceSummary 請求書サマリ
type InvoiceSummary struct {
	TotalAmount   float64
	PaidAmount    float64
	UnpaidAmount  float64
	OverdueAmount float64
	DraftCount    int
	SentCount     int
	PaidCount     int
	OverdueCount  int
}

// BillingStats 請求統計
type BillingStats struct {
	TotalInvoices      int
	TotalClients       int
	TotalAmount        float64
	AverageAmount      float64
	GroupedInvoices    int
	IndividualInvoices int
	FreeSyncedCount    int
	FreePendingCount   int
}

// invoiceRepository 請求書リポジトリの実装
type invoiceRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewInvoiceRepository 請求書リポジトリのインスタンスを生成
func NewInvoiceRepository(base BaseRepository) InvoiceRepository {
	return &invoiceRepository{
		db:     base.GetDB(),
		logger: base.GetLogger(),
	}
}

// FindByInvoiceNumber 請求書番号で検索
func (r *invoiceRepository) FindByInvoiceNumber(ctx context.Context, invoiceNumber string) (*model.Invoice, error) {
	var invoice model.Invoice
	err := r.db.WithContext(ctx).
		Where("invoice_number = ? AND deleted_at IS NULL", invoiceNumber).
		First(&invoice).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to find invoice by number",
			zap.String("invoice_number", invoiceNumber),
			zap.Error(err))
		return nil, err
	}

	return &invoice, nil
}

// FindByClientID 取引先IDで検索
func (r *invoiceRepository) FindByClientID(ctx context.Context, clientID string) ([]*model.Invoice, error) {
	var invoices []*model.Invoice
	err := r.db.WithContext(ctx).
		Where("client_id = ? AND deleted_at IS NULL", clientID).
		Order("invoice_date DESC").
		Find(&invoices).Error

	if err != nil {
		r.logger.Error("Failed to find invoices by client ID",
			zap.String("client_id", clientID),
			zap.Error(err))
		return nil, err
	}

	return invoices, nil
}

// FindByStatus ステータスで検索
func (r *invoiceRepository) FindByStatus(ctx context.Context, status model.InvoiceStatus) ([]*model.Invoice, error) {
	var invoices []*model.Invoice
	err := r.db.WithContext(ctx).
		Where("status = ? AND deleted_at IS NULL", status).
		Order("invoice_date DESC").
		Find(&invoices).Error

	if err != nil {
		r.logger.Error("Failed to find invoices by status",
			zap.String("status", string(status)),
			zap.Error(err))
		return nil, err
	}

	return invoices, nil
}

// FindOverdue 期限超過の請求書を検索
func (r *invoiceRepository) FindOverdue(ctx context.Context) ([]*model.Invoice, error) {
	var invoices []*model.Invoice
	now := time.Now()

	err := r.db.WithContext(ctx).
		Where("status IN (?) AND due_date < ? AND deleted_at IS NULL",
			[]model.InvoiceStatus{model.InvoiceStatusSent, model.InvoiceStatusOverdue},
			now).
		Order("due_date ASC").
		Find(&invoices).Error

	if err != nil {
		r.logger.Error("Failed to find overdue invoices", zap.Error(err))
		return nil, err
	}

	return invoices, nil
}

// GetSummary 請求書サマリを取得
func (r *invoiceRepository) GetSummary(ctx context.Context, clientID *string, dateFrom, dateTo *time.Time) (*InvoiceSummary, error) {
	summary := &InvoiceSummary{}

	query := r.db.WithContext(ctx).Model(&model.Invoice{}).
		Where("deleted_at IS NULL")

	if clientID != nil {
		query = query.Where("client_id = ?", *clientID)
	}

	if dateFrom != nil {
		query = query.Where("invoice_date >= ?", *dateFrom)
	}

	if dateTo != nil {
		query = query.Where("invoice_date <= ?", *dateTo)
	}

	// 合計金額
	var totalResult struct {
		Total float64
		Count int
	}
	if err := query.
		Select("COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count").
		Scan(&totalResult).Error; err != nil {
		r.logger.Error("Failed to get total amount", zap.Error(err))
		return nil, err
	}
	summary.TotalAmount = totalResult.Total

	// 支払済み金額
	var paidResult struct {
		Total float64
		Count int
	}
	if err := query.
		Where("status = ?", model.InvoiceStatusPaid).
		Select("COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count").
		Scan(&paidResult).Error; err != nil {
		r.logger.Error("Failed to get paid amount", zap.Error(err))
		return nil, err
	}
	summary.PaidAmount = paidResult.Total
	summary.PaidCount = paidResult.Count

	// 未払い金額
	summary.UnpaidAmount = summary.TotalAmount - summary.PaidAmount

	// 期限超過金額
	var overdueResult struct {
		Total float64
		Count int
	}
	if err := query.
		Where("status IN (?) AND due_date < ?",
			[]model.InvoiceStatus{model.InvoiceStatusSent, model.InvoiceStatusOverdue},
			time.Now()).
		Select("COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count").
		Scan(&overdueResult).Error; err != nil {
		r.logger.Error("Failed to get overdue amount", zap.Error(err))
		return nil, err
	}
	summary.OverdueAmount = overdueResult.Total
	summary.OverdueCount = overdueResult.Count

	// ステータス別件数
	type statusCount struct {
		Status string
		Count  int
	}
	var statusCounts []statusCount
	if err := query.
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusCounts).Error; err != nil {
		r.logger.Error("Failed to get status counts", zap.Error(err))
		return nil, err
	}

	for _, sc := range statusCounts {
		switch model.InvoiceStatus(sc.Status) {
		case model.InvoiceStatusDraft:
			summary.DraftCount = sc.Count
		case model.InvoiceStatusSent:
			summary.SentCount = sc.Count
		}
	}

	return summary, nil
}

// CreateWithDetails 請求書と明細を同時に作成
func (r *invoiceRepository) CreateWithDetails(ctx context.Context, invoice *model.Invoice, details []*model.InvoiceDetail) error {
	return r.Transaction(ctx, func(tx *gorm.DB) error {
		// 請求書を作成
		if err := tx.Create(invoice).Error; err != nil {
			return err
		}

		// 明細を作成
		if len(details) > 0 {
			for i, detail := range details {
				detail.InvoiceID = invoice.ID
				detail.OrderIndex = i + 1
			}
			if err := tx.Create(&details).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// Create 請求書を作成（CrudRepositoryインターフェース実装）
func (r *invoiceRepository) Create(ctx context.Context, entity *model.Invoice) error {
	return r.db.WithContext(ctx).Create(entity).Error
}

// Update 請求書を更新（CrudRepositoryインターフェース実装）
func (r *invoiceRepository) Update(ctx context.Context, entity *model.Invoice) error {
	return r.db.WithContext(ctx).Save(entity).Error
}

// Delete 請求書を削除（CrudRepositoryインターフェース実装）
func (r *invoiceRepository) Delete(ctx context.Context, entity *model.Invoice) error {
	return r.db.WithContext(ctx).Delete(entity).Error
}

// FindByID IDで請求書を検索（CrudRepositoryインターフェース実装）
func (r *invoiceRepository) FindByID(ctx context.Context, id interface{}) (*model.Invoice, error) {
	var entity model.Invoice
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

// FindAll すべての請求書を検索（CrudRepositoryインターフェース実装）
func (r *invoiceRepository) FindAll(ctx context.Context, opts ...repository.QueryOptions) ([]*model.Invoice, error) {
	var entities []*model.Invoice
	query := r.db.WithContext(ctx)

	// オプションがある場合は適用
	if len(opts) > 0 {
		query = repository.ApplyOptions(query, opts[0])
	}

	if err := query.Find(&entities).Error; err != nil {
		return nil, err
	}
	return entities, nil
}

// Count 請求書数をカウント（CrudRepositoryインターフェース実装）
func (r *invoiceRepository) Count(ctx context.Context, opts ...repository.QueryOptions) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&model.Invoice{})

	// オプションがある場合は適用（ただしページネーションは除く）
	if len(opts) > 0 {
		opt := opts[0]
		if opt.Search != "" && len(opt.SearchKeys) > 0 {
			query = repository.ApplySearch(query, opt.Search, opt.SearchKeys)
		}
	}

	err := query.Count(&count).Error
	return count, err
}

// Exists 請求書の存在確認（CrudRepositoryインターフェース実装）
func (r *invoiceRepository) Exists(ctx context.Context, id interface{}) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Invoice{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

// Transaction トランザクション処理（CrudRepositoryインターフェース実装）
func (r *invoiceRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

// FindByBillingMonth 請求月で検索
func (r *invoiceRepository) FindByBillingMonth(ctx context.Context, billingMonth string, clientID *string) ([]*model.Invoice, error) {
	var invoices []*model.Invoice
	query := r.db.WithContext(ctx).
		Where("billing_month = ? AND deleted_at IS NULL", billingMonth)

	if clientID != nil {
		query = query.Where("client_id = ?", *clientID)
	}

	err := query.
		Preload("Client").
		Preload("Details").
		Order("invoice_date DESC").
		Find(&invoices).Error

	if err != nil {
		r.logger.Error("Failed to find invoices by billing month",
			zap.String("billing_month", billingMonth),
			zap.Error(err))
		return nil, err
	}

	return invoices, nil
}

// FindByProjectGroupID プロジェクトグループIDで検索
func (r *invoiceRepository) FindByProjectGroupID(ctx context.Context, projectGroupID string) ([]*model.Invoice, error) {
	var invoices []*model.Invoice
	err := r.db.WithContext(ctx).
		Where("project_group_id = ? AND deleted_at IS NULL", projectGroupID).
		Preload("Client").
		Preload("ProjectGroup").
		Order("invoice_date DESC").
		Find(&invoices).Error

	if err != nil {
		r.logger.Error("Failed to find invoices by project group ID",
			zap.String("project_group_id", projectGroupID),
			zap.Error(err))
		return nil, err
	}

	return invoices, nil
}

// FindByFreeSyncStatus freee同期ステータスで検索
func (r *invoiceRepository) FindByFreeSyncStatus(ctx context.Context, status model.FreeSyncStatus) ([]*model.Invoice, error) {
	var invoices []*model.Invoice
	err := r.db.WithContext(ctx).
		Where("freee_sync_status = ? AND deleted_at IS NULL", status).
		Preload("Client").
		Order("created_at DESC").
		Find(&invoices).Error

	if err != nil {
		r.logger.Error("Failed to find invoices by freee sync status",
			zap.String("status", string(status)),
			zap.Error(err))
		return nil, err
	}

	return invoices, nil
}

// FindNeedingSync 同期が必要な請求書を検索
func (r *invoiceRepository) FindNeedingSync(ctx context.Context, limit int) ([]*model.Invoice, error) {
	var invoices []*model.Invoice
	err := r.db.WithContext(ctx).
		Where("freee_sync_status IN (?) AND status != ? AND deleted_at IS NULL",
			[]model.FreeSyncStatus{model.FreeSyncStatusNotSynced, model.FreeSyncStatusFailed},
			model.InvoiceStatusDraft).
		Preload("Client").
		Preload("Details").
		Order("created_at ASC").
		Limit(limit).
		Find(&invoices).Error

	if err != nil {
		r.logger.Error("Failed to find invoices needing sync", zap.Error(err))
		return nil, err
	}

	return invoices, nil
}

// UpdateFreeSyncStatus freee同期ステータスを更新
func (r *invoiceRepository) UpdateFreeSyncStatus(ctx context.Context, id string, status model.FreeSyncStatus, freeeInvoiceID *int) error {
	updates := map[string]interface{}{
		"freee_sync_status": status,
		"freee_synced_at":   time.Now(),
	}

	if freeeInvoiceID != nil {
		updates["freee_invoice_id"] = *freeeInvoiceID
	}

	result := r.db.WithContext(ctx).
		Model(&model.Invoice{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update freee sync status",
			zap.String("id", id),
			zap.Error(result.Error))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// GetMonthlyRevenue 月次収益を取得
func (r *invoiceRepository) GetMonthlyRevenue(ctx context.Context, year, month int, clientID *string) (float64, error) {
	billingMonth := fmt.Sprintf("%04d-%02d", year, month)

	query := r.db.WithContext(ctx).
		Model(&model.Invoice{}).
		Where("billing_month = ? AND status != ? AND deleted_at IS NULL",
			billingMonth, model.InvoiceStatusCancelled)

	if clientID != nil {
		query = query.Where("client_id = ?", *clientID)
	}

	var total float64
	err := query.
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&total).Error

	if err != nil {
		r.logger.Error("Failed to get monthly revenue",
			zap.Int("year", year),
			zap.Int("month", month),
			zap.Error(err))
		return 0, err
	}

	return total, nil
}

// GetBillingStats 請求統計を取得
func (r *invoiceRepository) GetBillingStats(ctx context.Context, startDate, endDate time.Time) (*BillingStats, error) {
	stats := &BillingStats{}

	baseQuery := r.db.WithContext(ctx).
		Model(&model.Invoice{}).
		Where("invoice_date BETWEEN ? AND ? AND deleted_at IS NULL", startDate, endDate)

	// 基本統計
	var basicStats struct {
		Count       int
		TotalAmount float64
		ClientCount int
	}
	err := baseQuery.
		Select("COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount, COUNT(DISTINCT client_id) as client_count").
		Scan(&basicStats).Error

	if err != nil {
		r.logger.Error("Failed to get basic billing stats", zap.Error(err))
		return nil, err
	}

	stats.TotalInvoices = basicStats.Count
	stats.TotalAmount = basicStats.TotalAmount
	stats.TotalClients = basicStats.ClientCount

	if stats.TotalInvoices > 0 {
		stats.AverageAmount = stats.TotalAmount / float64(stats.TotalInvoices)
	}

	// グループ別統計
	var groupStats struct {
		GroupedCount int
	}
	err = baseQuery.
		Where("project_group_id IS NOT NULL").
		Select("COUNT(*) as grouped_count").
		Scan(&groupStats).Error

	if err != nil {
		r.logger.Error("Failed to get grouped invoice count", zap.Error(err))
		return nil, err
	}

	stats.GroupedInvoices = groupStats.GroupedCount
	stats.IndividualInvoices = stats.TotalInvoices - stats.GroupedInvoices

	// freee同期統計
	var syncStats []struct {
		Status string
		Count  int
	}
	err = baseQuery.
		Select("freee_sync_status as status, COUNT(*) as count").
		Group("freee_sync_status").
		Scan(&syncStats).Error

	if err != nil {
		r.logger.Error("Failed to get sync stats", zap.Error(err))
		return nil, err
	}

	for _, s := range syncStats {
		switch model.FreeSyncStatus(s.Status) {
		case model.FreeSyncStatusSynced:
			stats.FreeSyncedCount = s.Count
		case model.FreeSyncStatusPending:
			stats.FreePendingCount = s.Count
		}
	}

	return stats, nil
}

// CreateBatch 請求書を一括作成
func (r *invoiceRepository) CreateBatch(ctx context.Context, invoices []*model.Invoice) error {
	if len(invoices) == 0 {
		return nil
	}

	// バッチサイズを50に制限
	batchSize := 50

	return r.Transaction(ctx, func(tx *gorm.DB) error {
		for i := 0; i < len(invoices); i += batchSize {
			end := i + batchSize
			if end > len(invoices) {
				end = len(invoices)
			}

			if err := tx.Create(invoices[i:end]).Error; err != nil {
				r.logger.Error("Failed to create invoice batch",
					zap.Int("batch_start", i),
					zap.Int("batch_end", end),
					zap.Error(err))
				return err
			}
		}
		return nil
	})
}
