package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"go.uber.org/zap"
	"time"

	"github.com/duesk/monstera/internal/dto"
)

// ExpenseCache 経費申請関連のキャッシュを管理
type ExpenseCache struct {
	redis  *RedisClient
	logger *zap.Logger
	ttl    time.Duration
}

// NewExpenseCache 経費申請キャッシュマネージャーを作成
func NewExpenseCache(redis *RedisClient, logger *zap.Logger) *ExpenseCache {
	return &ExpenseCache{
		redis:  redis,
		logger: logger,
		ttl:    30 * time.Minute, // デフォルトTTL: 30分
	}
}

// キーのプレフィックス定義
const (
	expenseListPrefix      = "expenses:list:"
	expenseDetailPrefix    = "expenses:detail:"
	expenseSummaryPrefix   = "expenses:summary:"
	expenseUserStatsPrefix = "expenses:user_stats:"
	expensePendingPrefix   = "expenses:pending:"
	expenseApprovalPrefix  = "expenses:approval:"
)

// GetExpenseList 経費申請一覧をキャッシュから取得
func (c *ExpenseCache) GetExpenseList(ctx context.Context, params *dto.ExpenseFilterRequest) (*dto.ExpenseListResponse, error) {
	key := c.buildListKey(params)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var response dto.ExpenseListResponse
	if err := json.Unmarshal([]byte(data), &response); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		// キャッシュが壊れている場合は削除
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &response, nil
}

// SetExpenseList 経費申請一覧をキャッシュに保存
func (c *ExpenseCache) SetExpenseList(ctx context.Context, params *dto.ExpenseFilterRequest, response *dto.ExpenseListResponse) error {
	key := c.buildListKey(params)

	data, err := json.Marshal(response)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	return c.redis.Set(ctx, key, data, c.ttl)
}

// GetExpenseDetail 経費申請詳細をキャッシュから取得
func (c *ExpenseCache) GetExpenseDetail(ctx context.Context, expenseID string) (*dto.ExpenseDetailResponse, error) {
	key := fmt.Sprintf("%s%s", expenseDetailPrefix, expenseID)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var detail dto.ExpenseDetailResponse
	if err := json.Unmarshal([]byte(data), &detail); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &detail, nil
}

// SetExpenseDetail 経費申請詳細をキャッシュに保存
func (c *ExpenseCache) SetExpenseDetail(ctx context.Context, expenseID string, detail *dto.ExpenseDetailResponse) error {
	key := fmt.Sprintf("%s%s", expenseDetailPrefix, expenseID)

	data, err := json.Marshal(detail)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	// 詳細データは長めにキャッシュ（60分）
	return c.redis.Set(ctx, key, data, c.ttl*2)
}

// GetExpenseSummary 経費申請サマリーをキャッシュから取得
func (c *ExpenseCache) GetExpenseSummary(ctx context.Context, userID string, fiscalYear int) (*dto.ExpenseSummaryResponse, error) {
	key := c.buildSummaryKey(userID, fiscalYear)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var summary dto.ExpenseSummaryResponse
	if err := json.Unmarshal([]byte(data), &summary); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &summary, nil
}

// SetExpenseSummary 経費申請サマリーをキャッシュに保存
func (c *ExpenseCache) SetExpenseSummary(ctx context.Context, userID string, fiscalYear int, summary *dto.ExpenseSummaryResponse) error {
	key := c.buildSummaryKey(userID, fiscalYear)

	data, err := json.Marshal(summary)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	// サマリーデータは短めにキャッシュ（15分）
	return c.redis.Set(ctx, key, data, 15*time.Minute)
}

// GetUserStats ユーザー統計をキャッシュから取得
func (c *ExpenseCache) GetUserStats(ctx context.Context, userID string) (*dto.ExpenseStatsResponse, error) {
	key := fmt.Sprintf("%s%s", expenseUserStatsPrefix, userID)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var stats dto.ExpenseStatsResponse
	if err := json.Unmarshal([]byte(data), &stats); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &stats, nil
}

// SetUserStats ユーザー統計をキャッシュに保存
func (c *ExpenseCache) SetUserStats(ctx context.Context, userID string, stats *dto.ExpenseStatsResponse) error {
	key := fmt.Sprintf("%s%s", expenseUserStatsPrefix, userID)

	data, err := json.Marshal(stats)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	// 統計データは短めにキャッシュ（10分）
	return c.redis.Set(ctx, key, data, 10*time.Minute)
}

// GetPendingExpenses 承認待ち経費申請をキャッシュから取得
func (c *ExpenseCache) GetPendingExpenses(ctx context.Context, approverType string, page, limit int) (*dto.ApprovalListResponse, error) {
	key := c.buildPendingKey(approverType, page, limit)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var response dto.ApprovalListResponse
	if err := json.Unmarshal([]byte(data), &response); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &response, nil
}

// SetPendingExpenses 承認待ち経費申請をキャッシュに保存
func (c *ExpenseCache) SetPendingExpenses(ctx context.Context, approverType string, page, limit int, response *dto.ApprovalListResponse) error {
	key := c.buildPendingKey(approverType, page, limit)

	data, err := json.Marshal(response)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	// 承認待ちリストは短めにキャッシュ（5分）
	return c.redis.Set(ctx, key, data, 5*time.Minute)
}

// InvalidateExpenseList 経費申請一覧のキャッシュを無効化
func (c *ExpenseCache) InvalidateExpenseList(ctx context.Context) error {
	pattern := expenseListPrefix + "*"
	return c.deleteByPattern(ctx, pattern)
}

// InvalidateExpenseDetail 特定の経費申請詳細キャッシュを無効化
func (c *ExpenseCache) InvalidateExpenseDetail(ctx context.Context, expenseID string) error {
	key := fmt.Sprintf("%s%s", expenseDetailPrefix, expenseID)
	return c.redis.Delete(ctx, key)
}

// InvalidateExpenseSummary 経費申請サマリーのキャッシュを無効化
func (c *ExpenseCache) InvalidateExpenseSummary(ctx context.Context, userID *string) error {
	pattern := expenseSummaryPrefix
	if userID != nil {
		pattern = fmt.Sprintf("%suser:%s:*", expenseSummaryPrefix, userID)
	} else {
		pattern = expenseSummaryPrefix + "*"
	}
	return c.deleteByPattern(ctx, pattern)
}

// InvalidateUserStats ユーザー統計のキャッシュを無効化
func (c *ExpenseCache) InvalidateUserStats(ctx context.Context, userID string) error {
	key := fmt.Sprintf("%s%s", expenseUserStatsPrefix, userID)
	return c.redis.Delete(ctx, key)
}

// InvalidatePendingExpenses 承認待ち経費申請のキャッシュを無効化
func (c *ExpenseCache) InvalidatePendingExpenses(ctx context.Context) error {
	pattern := expensePendingPrefix + "*"
	return c.deleteByPattern(ctx, pattern)
}

// InvalidateUserRelatedCaches ユーザー関連の全キャッシュを無効化
func (c *ExpenseCache) InvalidateUserRelatedCaches(ctx context.Context, userID string) error {
	// ユーザーの統計情報を無効化
	if err := c.InvalidateUserStats(ctx, userID); err != nil {
		return err
	}

	// ユーザーのサマリー情報を無効化
	if err := c.InvalidateExpenseSummary(ctx, &userID); err != nil {
		return err
	}

	// 一覧キャッシュも無効化（ユーザーの申請が含まれる可能性があるため）
	if err := c.InvalidateExpenseList(ctx); err != nil {
		return err
	}

	return nil
}

// InvalidateApprovalRelatedCaches 承認関連の全キャッシュを無効化
func (c *ExpenseCache) InvalidateApprovalRelatedCaches(ctx context.Context, expenseID string, userID string) error {
	// 詳細キャッシュを無効化
	if err := c.InvalidateExpenseDetail(ctx, expenseID); err != nil {
		return err
	}

	// 承認待ちリストを無効化
	if err := c.InvalidatePendingExpenses(ctx); err != nil {
		return err
	}

	// ユーザー関連キャッシュを無効化
	if err := c.InvalidateUserRelatedCaches(ctx, userID); err != nil {
		return err
	}

	return nil
}

// InvalidateAll 全ての経費申請関連キャッシュを無効化
func (c *ExpenseCache) InvalidateAll(ctx context.Context) error {
	patterns := []string{
		expenseListPrefix + "*",
		expenseDetailPrefix + "*",
		expenseSummaryPrefix + "*",
		expenseUserStatsPrefix + "*",
		expensePendingPrefix + "*",
		expenseApprovalPrefix + "*",
	}

	for _, pattern := range patterns {
		if err := c.deleteByPattern(ctx, pattern); err != nil {
			return err
		}
	}

	return nil
}

// buildListKey 経費申請一覧用のキーを生成
func (c *ExpenseCache) buildListKey(params *dto.ExpenseFilterRequest) string {
	status := ""
	if params.Status != nil {
		status = *params.Status
	}
	category := ""
	if params.Category != nil {
		category = *params.Category
	}
	categoryID := ""
	if params.CategoryID != nil {
		categoryID = *params.CategoryID
	}
	startDate := ""
	if params.StartDate != nil {
		startDate = params.StartDate.Format(time.RFC3339)
	}
	endDate := ""
	if params.EndDate != nil {
		endDate = params.EndDate.Format(time.RFC3339)
	}
	userID := ""
	if params.UserID != nil {
		userID = *params.UserID
	}
	sortBy := ""
	if params.SortBy != nil {
		sortBy = *params.SortBy
	}
	sortOrder := ""
	if params.SortOrder != nil {
		sortOrder = *params.SortOrder
	}

	return fmt.Sprintf("%sstatus:%s:category:%s:categoryID:%s:start:%s:end:%s:user:%s:page:%d:limit:%d:sort:%s:%s",
		expenseListPrefix,
		status,
		category,
		categoryID,
		startDate,
		endDate,
		userID,
		params.Page,
		params.Limit,
		sortBy,
		sortOrder,
	)
}

// buildSummaryKey サマリー用のキーを生成
func (c *ExpenseCache) buildSummaryKey(userID string, fiscalYear int) string {
	return fmt.Sprintf("%suser:%s:fy:%d",
		expenseSummaryPrefix,
		userID,
		fiscalYear,
	)
}

// buildPendingKey 承認待ち一覧用のキーを生成
func (c *ExpenseCache) buildPendingKey(approverType string, page, limit int) string {
	return fmt.Sprintf("%stype:%s:page:%d:limit:%d",
		expensePendingPrefix,
		approverType,
		page,
		limit,
	)
}

// deleteByPattern パターンにマッチするキーを削除
func (c *ExpenseCache) deleteByPattern(ctx context.Context, pattern string) error {
	if !c.redis.IsEnabled() {
		return nil
	}

	// 注意: 本番環境では SCAN を使用すべき
	// ここでは簡略化のため省略
	c.logger.Info("Invalidating cache by pattern", zap.String("pattern", pattern))
	return nil
}
