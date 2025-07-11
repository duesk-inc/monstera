package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
)

// InvoiceBatchProcessor 請求書バッチプロセッサー
type InvoiceBatchProcessor struct {
	billingService BillingServiceInterface
	logger         *zap.Logger
	targetMonth    string
	createdBy      uuid.UUID
}

// NewInvoiceBatchProcessor 請求書バッチプロセッサーのコンストラクタ
func NewInvoiceBatchProcessor(
	billingService BillingServiceInterface,
	logger *zap.Logger,
	targetMonth string,
	createdBy uuid.UUID,
) BatchProcessor {
	return &InvoiceBatchProcessor{
		billingService: billingService,
		logger:         logger,
		targetMonth:    targetMonth,
		createdBy:      createdBy,
	}
}

// Process 請求書を処理
func (p *InvoiceBatchProcessor) Process(ctx context.Context, item interface{}) error {
	client, ok := item.(*model.Client)
	if !ok {
		return fmt.Errorf("無効なアイテムタイプ: Clientが期待されています")
	}

	p.logger.Debug("Processing invoice for client",
		zap.String("client_id", client.ID.String()),
		zap.String("client_name", client.Name))

	// 請求書を作成 (TODO: ProcessClientメソッドを実装)
	// _, err := p.billingService.ProcessClient(ctx, client.ID, p.targetMonth, p.createdBy)
	// if err != nil {
	//	return fmt.Errorf("クライアント %s の請求処理に失敗しました: %w", client.Name, err)
	// }

	return nil
}

// Validate アイテムを検証
func (p *InvoiceBatchProcessor) Validate(item interface{}) error {
	client, ok := item.(*model.Client)
	if !ok {
		return fmt.Errorf("無効なアイテムタイプ")
	}

	if client.ID == uuid.Nil {
		return fmt.Errorf("クライアントIDが無効です")
	}

	if !client.IsActive {
		return fmt.Errorf("非アクティブなクライアントです")
	}

	return nil
}

// OnError エラー処理
func (p *InvoiceBatchProcessor) OnError(ctx context.Context, item interface{}, err error) error {
	client, ok := item.(*model.Client)
	if ok {
		p.logger.Error("Failed to process invoice",
			zap.String("client_id", client.ID.String()),
			zap.String("client_name", client.Name),
			zap.Error(err))
	}
	return nil
}

// OnSuccess 成功処理
func (p *InvoiceBatchProcessor) OnSuccess(ctx context.Context, item interface{}) error {
	client, ok := item.(*model.Client)
	if ok {
		p.logger.Info("Successfully processed invoice",
			zap.String("client_id", client.ID.String()),
			zap.String("client_name", client.Name))
	}
	return nil
}

// FreeePartnerSyncProcessor freee取引先同期プロセッサー
type FreeePartnerSyncProcessor struct {
	freeeService FreeeServiceInterface
	clientRepo   ClientRepositoryInterface
	logger       *zap.Logger
	userID       uuid.UUID
}

// NewFreeePartnerSyncProcessor freee取引先同期プロセッサーのコンストラクタ
func NewFreeePartnerSyncProcessor(
	freeeService FreeeServiceInterface,
	clientRepo ClientRepositoryInterface,
	logger *zap.Logger,
	userID uuid.UUID,
) BatchProcessor {
	return &FreeePartnerSyncProcessor{
		freeeService: freeeService,
		clientRepo:   clientRepo,
		logger:       logger,
		userID:       userID,
	}
}

// Process 取引先を同期
func (p *FreeePartnerSyncProcessor) Process(ctx context.Context, item interface{}) error {
	client, ok := item.(*model.Client)
	if !ok {
		return fmt.Errorf("無効なアイテムタイプ: Clientが期待されています")
	}

	// freeeで取引先を検索または作成
	partner, err := p.freeeService.SyncPartner(ctx, p.userID, client.ID)
	if err != nil {
		return fmt.Errorf("取引先の同期に失敗しました: %w", err)
	}

	// freee取引先IDを保存
	if partner != nil && partner.ID > 0 {
		partnerIDStr := fmt.Sprintf("%d", partner.ID)
		client.FreeePartnerID = &partnerIDStr
		if err := p.clientRepo.Update(ctx, client); err != nil {
			return fmt.Errorf("クライアントの更新に失敗しました: %w", err)
		}
	}

	return nil
}

// Validate アイテムを検証
func (p *FreeePartnerSyncProcessor) Validate(item interface{}) error {
	client, ok := item.(*model.Client)
	if !ok {
		return fmt.Errorf("無効なアイテムタイプ")
	}

	if client.ID == uuid.Nil {
		return fmt.Errorf("クライアントIDが無効です")
	}

	return nil
}

// OnError エラー処理
func (p *FreeePartnerSyncProcessor) OnError(ctx context.Context, item interface{}, err error) error {
	client, ok := item.(*model.Client)
	if ok {
		p.logger.Error("Failed to sync partner",
			zap.String("client_id", client.ID.String()),
			zap.String("client_name", client.Name),
			zap.Error(err))
	}
	return nil
}

// OnSuccess 成功処理
func (p *FreeePartnerSyncProcessor) OnSuccess(ctx context.Context, item interface{}) error {
	client, ok := item.(*model.Client)
	if ok {
		p.logger.Info("Successfully synced partner",
			zap.String("client_id", client.ID.String()),
			zap.String("client_name", client.Name))
	}
	return nil
}

// InvoiceFreeeUploadProcessor 請求書freeeアップロードプロセッサー
type InvoiceFreeeUploadProcessor struct {
	freeeService FreeeServiceInterface
	invoiceRepo  InvoiceRepositoryInterface
	logger       *zap.Logger
	userID       uuid.UUID
}

// NewInvoiceFreeeUploadProcessor 請求書freeeアップロードプロセッサーのコンストラクタ
func NewInvoiceFreeeUploadProcessor(
	freeeService FreeeServiceInterface,
	invoiceRepo InvoiceRepositoryInterface,
	logger *zap.Logger,
	userID uuid.UUID,
) BatchProcessor {
	return &InvoiceFreeeUploadProcessor{
		freeeService: freeeService,
		invoiceRepo:  invoiceRepo,
		logger:       logger,
		userID:       userID,
	}
}

// Process 請求書をfreeeにアップロード
func (p *InvoiceFreeeUploadProcessor) Process(ctx context.Context, item interface{}) error {
	invoice, ok := item.(*model.Invoice)
	if !ok {
		return fmt.Errorf("無効なアイテムタイプ: Invoiceが期待されています")
	}

	// freee請求書を作成
	freeeInvoice, err := p.freeeService.SyncInvoice(ctx, p.userID, invoice.ID)
	if err != nil {
		return fmt.Errorf("請求書の同期に失敗しました: %w", err)
	}

	// freee請求書IDを保存
	if freeeInvoice != nil && freeeInvoice.ID > 0 {
		invoice.FreeeInvoiceID = &freeeInvoice.ID
		invoice.FreeSyncStatus = model.FreeSyncStatusSynced
		if err := p.invoiceRepo.Update(ctx, invoice); err != nil {
			return fmt.Errorf("請求書の更新に失敗しました: %w", err)
		}
	}

	return nil
}

// Validate アイテムを検証
func (p *InvoiceFreeeUploadProcessor) Validate(item interface{}) error {
	invoice, ok := item.(*model.Invoice)
	if !ok {
		return fmt.Errorf("無効なアイテムタイプ")
	}

	if invoice.ID == uuid.Nil {
		return fmt.Errorf("請求書IDが無効です")
	}

	// 既に同期済みの場合はスキップ
	if invoice.FreeSyncStatus == model.FreeSyncStatusSynced {
		return fmt.Errorf("既に同期済みです")
	}

	return nil
}

// OnError エラー処理
func (p *InvoiceFreeeUploadProcessor) OnError(ctx context.Context, item interface{}, err error) error {
	invoice, ok := item.(*model.Invoice)
	if ok {
		// 同期失敗ステータスを設定
		invoice.FreeSyncStatus = model.FreeSyncStatusFailed
		p.invoiceRepo.Update(ctx, invoice)

		p.logger.Error("Failed to upload invoice to freee",
			zap.String("invoice_id", invoice.ID.String()),
			zap.String("invoice_number", invoice.InvoiceNumber),
			zap.Error(err))
	}
	return nil
}

// OnSuccess 成功処理
func (p *InvoiceFreeeUploadProcessor) OnSuccess(ctx context.Context, item interface{}) error {
	invoice, ok := item.(*model.Invoice)
	if ok {
		p.logger.Info("Successfully uploaded invoice to freee",
			zap.String("invoice_id", invoice.ID.String()),
			zap.String("invoice_number", invoice.InvoiceNumber))
	}
	return nil
}

// DataCleanupProcessor データクリーンアッププロセッサー
type DataCleanupProcessor struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewDataCleanupProcessor データクリーンアッププロセッサーのコンストラクタ
func NewDataCleanupProcessor(db *gorm.DB, logger *zap.Logger) BatchProcessor {
	return &DataCleanupProcessor{
		db:     db,
		logger: logger,
	}
}

// Process データをクリーンアップ
func (p *DataCleanupProcessor) Process(ctx context.Context, item interface{}) error {
	cleanupTask, ok := item.(*CleanupTask)
	if !ok {
		return fmt.Errorf("無効なアイテムタイプ: CleanupTaskが期待されています")
	}

	switch cleanupTask.Type {
	case "old_logs":
		return p.cleanupOldLogs(ctx, cleanupTask)
	case "expired_sessions":
		return p.cleanupExpiredSessions(ctx, cleanupTask)
	case "orphaned_files":
		return p.cleanupOrphanedFiles(ctx, cleanupTask)
	default:
		return fmt.Errorf("不明なクリーンアップタイプ: %s", cleanupTask.Type)
	}
}

// Validate アイテムを検証
func (p *DataCleanupProcessor) Validate(item interface{}) error {
	cleanupTask, ok := item.(*CleanupTask)
	if !ok {
		return fmt.Errorf("無効なアイテムタイプ")
	}

	if cleanupTask.Type == "" {
		return fmt.Errorf("クリーンアップタイプが指定されていません")
	}

	return nil
}

// OnError エラー処理
func (p *DataCleanupProcessor) OnError(ctx context.Context, item interface{}, err error) error {
	cleanupTask, ok := item.(*CleanupTask)
	if ok {
		p.logger.Error("Failed to cleanup",
			zap.String("type", cleanupTask.Type),
			zap.Error(err))
	}
	return nil
}

// OnSuccess 成功処理
func (p *DataCleanupProcessor) OnSuccess(ctx context.Context, item interface{}) error {
	cleanupTask, ok := item.(*CleanupTask)
	if ok {
		p.logger.Info("Successfully cleaned up",
			zap.String("type", cleanupTask.Type),
			zap.Int("affected_rows", cleanupTask.AffectedRows))
	}
	return nil
}

// cleanupOldLogs 古いログをクリーンアップ（内部メソッド）
func (p *DataCleanupProcessor) cleanupOldLogs(ctx context.Context, task *CleanupTask) error {
	cutoffDate := task.CutoffDate
	if cutoffDate.IsZero() {
		cutoffDate = time.Now().AddDate(0, -3, 0) // デフォルトは3ヶ月前
	}

	result := p.db.WithContext(ctx).
		Where("created_at < ?", cutoffDate).
		Delete(&model.FreeSyncLog{})

	if result.Error != nil {
		return result.Error
	}

	task.AffectedRows = int(result.RowsAffected)
	return nil
}

// cleanupExpiredSessions 期限切れセッションをクリーンアップ（内部メソッド）
func (p *DataCleanupProcessor) cleanupExpiredSessions(ctx context.Context, task *CleanupTask) error {
	// TODO: セッション管理の実装に応じて調整
	return nil
}

// cleanupOrphanedFiles 孤立ファイルをクリーンアップ（内部メソッド）
func (p *DataCleanupProcessor) cleanupOrphanedFiles(ctx context.Context, task *CleanupTask) error {
	// TODO: ファイル管理の実装に応じて調整
	return nil
}

// CleanupTask クリーンアップタスク
type CleanupTask struct {
	Type         string
	CutoffDate   time.Time
	AffectedRows int
	Metadata     map[string]interface{}
}

// エイリアスの定義
type ClientRepositoryInterface = repository.ClientRepository
type InvoiceRepositoryInterface = repository.InvoiceRepository
