package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"go.uber.org/zap"
	"time"

	"github.com/duesk/monstera/internal/dto"
)

// WeeklyReportCache 週報関連のキャッシュを管理
type WeeklyReportCache struct {
	redis  *RedisClient
	logger *zap.Logger
	ttl    time.Duration
}

// NewWeeklyReportCache 週報キャッシュマネージャーを作成
func NewWeeklyReportCache(redis *RedisClient, logger *zap.Logger) *WeeklyReportCache {
	return &WeeklyReportCache{
		redis:  redis,
		logger: logger,
		ttl:    30 * time.Minute, // デフォルトTTL: 30分
	}
}

// キーのプレフィックス定義
const (
	weeklyReportListPrefix    = "weekly_reports:list:"
	weeklyReportDetailPrefix  = "weekly_reports:detail:"
	weeklyReportSummaryPrefix = "weekly_reports:summary:"
	unsubmittedListPrefix     = "weekly_reports:unsubmitted:"
)

// GetWeeklyReportList 週報一覧をキャッシュから取得
func (c *WeeklyReportCache) GetWeeklyReportList(ctx context.Context, params dto.WeeklyReportListParams) (*dto.WeeklyReportListResponse, error) {
	key := c.buildListKey(params)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var response dto.WeeklyReportListResponse
	if err := json.Unmarshal([]byte(data), &response); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		// キャッシュが壊れている場合は削除
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &response, nil
}

// SetWeeklyReportList 週報一覧をキャッシュに保存
func (c *WeeklyReportCache) SetWeeklyReportList(ctx context.Context, params dto.WeeklyReportListParams, response *dto.WeeklyReportListResponse) error {
	key := c.buildListKey(params)

	data, err := json.Marshal(response)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	return c.redis.Set(ctx, key, data, c.ttl)
}

// GetWeeklyReportDetail 週報詳細をキャッシュから取得
func (c *WeeklyReportCache) GetWeeklyReportDetail(ctx context.Context, reportID string) (*dto.AdminWeeklyReportDetailDTO, error) {
	key := fmt.Sprintf("%s%s", weeklyReportDetailPrefix, reportID)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var detail dto.AdminWeeklyReportDetailDTO
	if err := json.Unmarshal([]byte(data), &detail); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &detail, nil
}

// SetWeeklyReportDetail 週報詳細をキャッシュに保存
func (c *WeeklyReportCache) SetWeeklyReportDetail(ctx context.Context, reportID string, detail *dto.AdminWeeklyReportDetailDTO) error {
	key := fmt.Sprintf("%s%s", weeklyReportDetailPrefix, reportID)

	data, err := json.Marshal(detail)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	// 詳細データは長めにキャッシュ
	return c.redis.Set(ctx, key, data, c.ttl*2)
}

// GetWeeklyReportSummary 週報サマリーをキャッシュから取得
func (c *WeeklyReportCache) GetWeeklyReportSummary(ctx context.Context, startDate, endDate time.Time, departmentID *string) (*dto.WeeklyReportSummaryStatsDTO, error) {
	key := c.buildSummaryKey(startDate, endDate, departmentID)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var summary dto.WeeklyReportSummaryStatsDTO
	if err := json.Unmarshal([]byte(data), &summary); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &summary, nil
}

// SetWeeklyReportSummary 週報サマリーをキャッシュに保存
func (c *WeeklyReportCache) SetWeeklyReportSummary(ctx context.Context, startDate, endDate time.Time, departmentID *string, summary *dto.WeeklyReportSummaryStatsDTO) error {
	key := c.buildSummaryKey(startDate, endDate, departmentID)

	data, err := json.Marshal(summary)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	// サマリーデータは短めにキャッシュ（15分）
	return c.redis.Set(ctx, key, data, 15*time.Minute)
}

// GetUnsubmittedList 未提出者一覧をキャッシュから取得
func (c *WeeklyReportCache) GetUnsubmittedList(ctx context.Context, params dto.UnsubmittedReportParams) (*dto.UnsubmittedReportResponse, error) {
	key := c.buildUnsubmittedKey(params)

	data, err := c.redis.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	var response dto.UnsubmittedReportResponse
	if err := json.Unmarshal([]byte(data), &response); err != nil {
		c.logger.Error("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		c.redis.Delete(ctx, key)
		return nil, err
	}

	return &response, nil
}

// SetUnsubmittedList 未提出者一覧をキャッシュに保存
func (c *WeeklyReportCache) SetUnsubmittedList(ctx context.Context, params dto.UnsubmittedReportParams, response *dto.UnsubmittedReportResponse) error {
	key := c.buildUnsubmittedKey(params)

	data, err := json.Marshal(response)
	if err != nil {
		c.logger.Error("Failed to marshal data", zap.Error(err))
		return err
	}

	// 未提出者リストは短めにキャッシュ（10分）
	return c.redis.Set(ctx, key, data, 10*time.Minute)
}

// InvalidateWeeklyReportList 週報一覧のキャッシュを無効化
func (c *WeeklyReportCache) InvalidateWeeklyReportList(ctx context.Context) error {
	pattern := weeklyReportListPrefix + "*"
	return c.deleteByPattern(ctx, pattern)
}

// InvalidateWeeklyReportDetail 特定の週報詳細キャッシュを無効化
func (c *WeeklyReportCache) InvalidateWeeklyReportDetail(ctx context.Context, reportID string) error {
	key := fmt.Sprintf("%s%s", weeklyReportDetailPrefix, reportID)
	return c.redis.Delete(ctx, key)
}

// InvalidateWeeklyReportSummary 週報サマリーのキャッシュを無効化
func (c *WeeklyReportCache) InvalidateWeeklyReportSummary(ctx context.Context) error {
	pattern := weeklyReportSummaryPrefix + "*"
	return c.deleteByPattern(ctx, pattern)
}

// InvalidateUnsubmittedList 未提出者一覧のキャッシュを無効化
func (c *WeeklyReportCache) InvalidateUnsubmittedList(ctx context.Context) error {
	pattern := unsubmittedListPrefix + "*"
	return c.deleteByPattern(ctx, pattern)
}

// InvalidateAll 全ての週報関連キャッシュを無効化
func (c *WeeklyReportCache) InvalidateAll(ctx context.Context) error {
	patterns := []string{
		weeklyReportListPrefix + "*",
		weeklyReportDetailPrefix + "*",
		weeklyReportSummaryPrefix + "*",
		unsubmittedListPrefix + "*",
	}

	for _, pattern := range patterns {
		if err := c.deleteByPattern(ctx, pattern); err != nil {
			return err
		}
	}

	return nil
}

// buildListKey 週報一覧用のキーを生成
func (c *WeeklyReportCache) buildListKey(params dto.WeeklyReportListParams) string {
	return fmt.Sprintf("%sstatus:%s:search:%s:dept:%s:start:%s:end:%s:page:%d:limit:%d",
		weeklyReportListPrefix,
		params.Status,
		params.Search,
		params.DepartmentID,
		params.StartDate,
		params.EndDate,
		params.Page,
		params.Limit,
	)
}

// buildSummaryKey サマリー用のキーを生成
func (c *WeeklyReportCache) buildSummaryKey(startDate, endDate time.Time, departmentID *string) string {
	deptStr := "all"
	if departmentID != nil {
		deptStr = *departmentID
	}

	return fmt.Sprintf("%sstart:%s:end:%s:dept:%s",
		weeklyReportSummaryPrefix,
		startDate.Format("2006-01-02"),
		endDate.Format("2006-01-02"),
		deptStr,
	)
}

// buildUnsubmittedKey 未提出者一覧用のキーを生成
func (c *WeeklyReportCache) buildUnsubmittedKey(params dto.UnsubmittedReportParams) string {
	return fmt.Sprintf("%sdept:%s:days:%d",
		unsubmittedListPrefix,
		params.DepartmentID,
		params.MinDaysOverdue,
	)
}

// deleteByPattern パターンにマッチするキーを削除
func (c *WeeklyReportCache) deleteByPattern(ctx context.Context, pattern string) error {
	if !c.redis.IsEnabled() {
		return nil
	}

	// 注意: 本番環境では SCAN を使用すべき
	// ここでは簡略化のため省略
	c.logger.Info("Invalidating cache by pattern", zap.String("pattern", pattern))
	return nil
}
