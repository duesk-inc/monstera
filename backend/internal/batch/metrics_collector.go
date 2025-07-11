package batch

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/metrics"
	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
)

// MetricsCollector メトリクス収集バッチ
type MetricsCollector struct {
	expenseRepo  repository.ExpenseRepository
	approvalRepo repository.ExpenseApprovalRepository
	userRepo     repository.UserRepository
	logger       *zap.Logger
	ticker       *time.Ticker
	done         chan bool
}

// NewMetricsCollector メトリクス収集バッチのインスタンスを生成
func NewMetricsCollector(
	expenseRepo repository.ExpenseRepository,
	approvalRepo repository.ExpenseApprovalRepository,
	userRepo repository.UserRepository,
	logger *zap.Logger,
) *MetricsCollector {
	return &MetricsCollector{
		expenseRepo:  expenseRepo,
		approvalRepo: approvalRepo,
		userRepo:     userRepo,
		logger:       logger,
		done:         make(chan bool),
	}
}

// Start メトリクス収集を開始
func (m *MetricsCollector) Start(interval time.Duration) {
	m.ticker = time.NewTicker(interval)

	go func() {
		// 初回実行
		m.collect()

		for {
			select {
			case <-m.ticker.C:
				m.collect()
			case <-m.done:
				return
			}
		}
	}()

	m.logger.Info("Metrics collector started",
		zap.Duration("interval", interval))
}

// Stop メトリクス収集を停止
func (m *MetricsCollector) Stop() {
	if m.ticker != nil {
		m.ticker.Stop()
	}
	close(m.done)
	m.logger.Info("Metrics collector stopped")
}

// collect メトリクスを収集
func (m *MetricsCollector) collect() {
	ctx := context.Background()

	// アクティブユーザー数を収集
	activeUsers, err := m.userRepo.CountActiveUsers(ctx, 30) // 30日以内にログインしたユーザー
	if err != nil {
		m.logger.Error("Failed to count active users", zap.Error(err))
		metrics.RecordError("metrics_collection", "user", "medium")
	} else {
		metrics.ActiveUsersGauge.Set(float64(activeUsers))
	}

	// 承認待ち件数を収集（レベル1とレベル2）
	for level := 1; level <= 2; level++ {
		count, err := m.approvalRepo.CountPendingByLevel(ctx, level)
		if err != nil {
			m.logger.Error("Failed to count pending approvals", zap.Error(err), zap.Int("level", level))
			metrics.RecordError("metrics_collection", "approval", "medium")
		} else {
			metrics.PendingApprovalsGauge.WithLabelValues(fmt.Sprintf("%d", level)).Set(float64(count))
		}
	}

	// 期限切れ間近の経費申請を確認
	expiringSoon, err := m.expenseRepo.CountExpiringSoon(ctx, 1)
	if err != nil {
		m.logger.Error("Failed to count expiring expenses", zap.Error(err))
		metrics.RecordError("metrics_collection", "expense", "low")
	}

	m.logger.Debug("Metrics collected successfully",
		zap.Int64("active_users", activeUsers),
		zap.Int64("expiring_soon", expiringSoon))
}
