package batch

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/service"
	"go.uber.org/zap"
)

// ExpenseDeadlineProcessor 経費申請期限処理バッチ
type ExpenseDeadlineProcessor struct {
	expenseService service.ExpenseService
	logger         *zap.Logger
}

// NewExpenseDeadlineProcessor 期限処理バッチのインスタンスを生成
func NewExpenseDeadlineProcessor(
	expenseService service.ExpenseService,
	logger *zap.Logger,
) *ExpenseDeadlineProcessor {
	return &ExpenseDeadlineProcessor{
		expenseService: expenseService,
		logger:         logger,
	}
}

// ProcessExpiredExpenses 期限切れ経費を処理
func (p *ExpenseDeadlineProcessor) ProcessExpiredExpenses(ctx context.Context) error {
	p.logger.Info("Starting expired expense processing")
	startTime := time.Now()

	err := p.expenseService.ProcessExpiredExpenses(ctx)
	if err != nil {
		p.logger.Error("Failed to process expired expenses", zap.Error(err))
		return err
	}

	duration := time.Since(startTime)
	p.logger.Info("Completed expired expense processing",
		zap.Duration("duration", duration))

	return nil
}

// ProcessReminders リマインダーを処理
func (p *ExpenseDeadlineProcessor) ProcessReminders(ctx context.Context) error {
	p.logger.Info("Starting expense reminder processing")
	startTime := time.Now()

	err := p.expenseService.ProcessExpenseReminders(ctx)
	if err != nil {
		p.logger.Error("Failed to process expense reminders", zap.Error(err))
		return err
	}

	duration := time.Since(startTime)
	p.logger.Info("Completed expense reminder processing",
		zap.Duration("duration", duration))

	return nil
}

// Run バッチを実行（定期実行用）
func (p *ExpenseDeadlineProcessor) Run(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// 初回実行
	p.processAll(ctx)

	for {
		select {
		case <-ctx.Done():
			p.logger.Info("Stopping expense deadline processor")
			return
		case <-ticker.C:
			p.processAll(ctx)
		}
	}
}

// processAll 全ての処理を実行
func (p *ExpenseDeadlineProcessor) processAll(ctx context.Context) {
	// 期限切れ処理
	if err := p.ProcessExpiredExpenses(ctx); err != nil {
		p.logger.Error("Error in expired expense processing", zap.Error(err))
	}

	// リマインダー処理
	if err := p.ProcessReminders(ctx); err != nil {
		p.logger.Error("Error in reminder processing", zap.Error(err))
	}
}
