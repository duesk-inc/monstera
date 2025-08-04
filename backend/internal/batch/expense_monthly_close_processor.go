package batch

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/service"
	"go.uber.org/zap"
)

// ExpenseMonthlyCloseProcessor 経費月次締め処理バッチ
type ExpenseMonthlyCloseProcessor struct {
	monthlyCloseService service.ExpenseMonthlyCloseService
	logger              *zap.Logger
}

// NewExpenseMonthlyCloseProcessor 月次締め処理バッチのインスタンスを生成
func NewExpenseMonthlyCloseProcessor(
	monthlyCloseService service.ExpenseMonthlyCloseService,
	logger *zap.Logger,
) *ExpenseMonthlyCloseProcessor {
	return &ExpenseMonthlyCloseProcessor{
		monthlyCloseService: monthlyCloseService,
		logger:              logger,
	}
}

// ProcessMonthlyClose 月次締め処理を実行
func (p *ExpenseMonthlyCloseProcessor) ProcessMonthlyClose(ctx context.Context) error {
	p.logger.Info("Starting monthly expense close processing")
	startTime := time.Now()

	// 現在の年月を取得（前月分を締める）
	now := time.Now()
	targetDate := now.AddDate(0, -1, 0)
	year := targetDate.Year()
	month := int(targetDate.Month())

	p.logger.Info("Processing monthly close",
		zap.Int("year", year),
		zap.Int("month", month),
	)

	// 月次締め処理を実行
	err := p.monthlyCloseService.ProcessMonthlyClose(ctx, year, month)
	if err != nil {
		p.logger.Error("Failed to process monthly close",
			zap.Error(err),
			zap.Int("year", year),
			zap.Int("month", month),
		)
		return err
	}

	duration := time.Since(startTime)
	p.logger.Info("Completed monthly expense close processing",
		zap.Duration("duration", duration),
		zap.Int("year", year),
		zap.Int("month", month),
	)

	return nil
}

// ProcessCurrentMonthClose 指定月の締め処理を実行（手動実行用）
func (p *ExpenseMonthlyCloseProcessor) ProcessCurrentMonthClose(ctx context.Context, year int, month int) error {
	p.logger.Info("Starting manual monthly expense close processing",
		zap.Int("year", year),
		zap.Int("month", month),
	)
	startTime := time.Now()

	// 月次締め処理を実行
	err := p.monthlyCloseService.ProcessMonthlyClose(ctx, year, month)
	if err != nil {
		p.logger.Error("Failed to process monthly close",
			zap.Error(err),
			zap.Int("year", year),
			zap.Int("month", month),
		)
		return err
	}

	duration := time.Since(startTime)
	p.logger.Info("Completed manual monthly expense close processing",
		zap.Duration("duration", duration),
		zap.Int("year", year),
		zap.Int("month", month),
	)

	return nil
}
