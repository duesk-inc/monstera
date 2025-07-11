package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ProposalQueryOptimizer 提案クエリ最適化
type ProposalQueryOptimizer struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewProposalQueryOptimizer 新しいProposalQueryOptimizerを作成
func NewProposalQueryOptimizer(db *gorm.DB, logger *zap.Logger) *ProposalQueryOptimizer {
	return &ProposalQueryOptimizer{
		db:     db,
		logger: logger,
	}
}

// OptimizedProposalQuery 最適化されたクエリビルダー
type OptimizedProposalQuery struct {
	query  *gorm.DB
	logger *zap.Logger
}

// GetOptimizedProposalQuery 最適化されたクエリを取得
func (o *ProposalQueryOptimizer) GetOptimizedProposalQuery(ctx context.Context) *OptimizedProposalQuery {
	// 基本クエリにコンテキストを設定
	query := o.db.WithContext(ctx).Model(&model.EngineerProposal{})

	// 削除されていないレコードのみ
	query = query.Where("deleted_at IS NULL")

	return &OptimizedProposalQuery{
		query:  query,
		logger: o.logger,
	}
}

// ForUser ユーザーフィルターを適用
func (q *OptimizedProposalQuery) ForUser(userID uuid.UUID) *OptimizedProposalQuery {
	q.query = q.query.Where("user_id = ?", userID)
	return q
}

// WithStatus ステータスフィルターを適用
func (q *OptimizedProposalQuery) WithStatus(status string) *OptimizedProposalQuery {
	if status != "" {
		q.query = q.query.Where("status = ?", status)
	}
	return q
}

// WithDateRange 日付範囲フィルターを適用
func (q *OptimizedProposalQuery) WithDateRange(startDate, endDate *time.Time) *OptimizedProposalQuery {
	if startDate != nil {
		q.query = q.query.Where("created_at >= ?", *startDate)
	}
	if endDate != nil {
		q.query = q.query.Where("created_at <= ?", *endDate)
	}
	return q
}

// WithPagination ページネーションを適用（最適化版）
func (q *OptimizedProposalQuery) WithPagination(page, limit int) *OptimizedProposalQuery {
	if page > 0 && limit > 0 {
		// カーソルベースのページネーションが可能な場合は考慮
		offset := (page - 1) * limit
		q.query = q.query.Offset(offset).Limit(limit)
	}
	return q
}

// WithSort ソートを適用
func (q *OptimizedProposalQuery) WithSort(sortBy, sortOrder string) *OptimizedProposalQuery {
	orderBy := "created_at DESC" // デフォルト

	if sortBy != "" && sortOrder != "" {
		switch sortBy {
		case "created_at", "responded_at", "updated_at":
			orderBy = sortBy + " " + sortOrder
		}
	}

	q.query = q.query.Order(orderBy)
	return q
}

// Count 件数を取得（最適化版）
func (q *OptimizedProposalQuery) Count() (int64, error) {
	var count int64

	// COUNT(*)の最適化
	if err := q.query.Count(&count).Error; err != nil {
		q.logger.Error("Failed to count proposals", zap.Error(err))
		return 0, err
	}

	return count, nil
}

// Find レコードを取得（最適化版）
func (q *OptimizedProposalQuery) Find(proposals *[]*model.EngineerProposal) error {
	// 必要なフィールドのみ選択
	selectFields := []string{
		"id", "user_id", "project_id", "status",
		"created_at", "updated_at", "responded_at",
	}

	if err := q.query.Select(selectFields).Find(proposals).Error; err != nil {
		q.logger.Error("Failed to find proposals", zap.Error(err))
		return err
	}

	return nil
}

// FindWithPreload 関連データ付きでレコードを取得
func (q *OptimizedProposalQuery) FindWithPreload(proposals *[]*model.EngineerProposal, preloads ...string) error {
	// プリロードを適用
	for _, preload := range preloads {
		q.query = q.query.Preload(preload)
	}

	if err := q.query.Find(proposals).Error; err != nil {
		q.logger.Error("Failed to find proposals with preload", zap.Error(err))
		return err
	}

	return nil
}

// BatchProposalLoader バッチローダー（N+1問題対策）
type BatchProposalLoader struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewBatchProposalLoader 新しいBatchProposalLoaderを作成
func NewBatchProposalLoader(db *gorm.DB, logger *zap.Logger) *BatchProposalLoader {
	return &BatchProposalLoader{
		db:     db,
		logger: logger,
	}
}

// LoadProposalsWithDetails 提案と関連詳細を効率的にロード
func (l *BatchProposalLoader) LoadProposalsWithDetails(
	ctx context.Context,
	proposalIDs []uuid.UUID,
) (map[uuid.UUID]*ProposalWithDetails, error) {
	result := make(map[uuid.UUID]*ProposalWithDetails)

	// 提案を一括取得
	var proposals []*model.EngineerProposal
	if err := l.db.WithContext(ctx).
		Where("id IN ?", proposalIDs).
		Find(&proposals).Error; err != nil {
		l.logger.Error("Failed to batch load proposals", zap.Error(err))
		return nil, err
	}

	// プロジェクトIDを収集
	projectIDs := make([]uuid.UUID, 0, len(proposals))
	for _, p := range proposals {
		projectIDs = append(projectIDs, p.ProjectID)
		result[p.ID] = &ProposalWithDetails{
			Proposal: p,
		}
	}

	// プロジェクト情報を一括取得（クロススキーマクエリ）
	var projects []struct {
		ID          uuid.UUID
		ProjectName string
		ClientName  string
		MinPrice    int
		MaxPrice    int
	}

	if err := l.db.WithContext(ctx).
		Table("monstera_poc.projects").
		Select("id, project_name, client_name, min_price, max_price").
		Where("id IN ?", projectIDs).
		Scan(&projects).Error; err != nil {
		l.logger.Error("Failed to batch load projects", zap.Error(err))
		// エラーでも処理を継続
	} else {
		// プロジェクト情報をマッピング
		projectMap := make(map[uuid.UUID]struct {
			ProjectName string
			ClientName  string
			MinPrice    int
			MaxPrice    int
		})
		for _, p := range projects {
			projectMap[p.ID] = struct {
				ProjectName string
				ClientName  string
				MinPrice    int
				MaxPrice    int
			}{
				ProjectName: p.ProjectName,
				ClientName:  p.ClientName,
				MinPrice:    p.MinPrice,
				MaxPrice:    p.MaxPrice,
			}
		}

		// 結果に設定
		for _, p := range proposals {
			if project, ok := projectMap[p.ProjectID]; ok {
				result[p.ID].ProjectName = project.ProjectName
				result[p.ID].ClientName = project.ClientName
				result[p.ID].MinPrice = project.MinPrice
				result[p.ID].MaxPrice = project.MaxPrice
			}
		}
	}

	// 質問数を一括取得
	var questionCounts []struct {
		ProposalID   uuid.UUID
		TotalCount   int64
		PendingCount int64
	}

	if err := l.db.WithContext(ctx).
		Table("engineer_proposal_questions").
		Select("proposal_id, COUNT(*) as total_count, SUM(CASE WHEN is_responded = false THEN 1 ELSE 0 END) as pending_count").
		Where("proposal_id IN ? AND deleted_at IS NULL", proposalIDs).
		Group("proposal_id").
		Scan(&questionCounts).Error; err != nil {
		l.logger.Error("Failed to batch load question counts", zap.Error(err))
		// エラーでも処理を継続
	} else {
		// 質問数をマッピング
		for _, qc := range questionCounts {
			if detail, ok := result[qc.ProposalID]; ok {
				detail.TotalQuestions = int(qc.TotalCount)
				detail.PendingQuestions = int(qc.PendingCount)
			}
		}
	}

	return result, nil
}

// ProposalWithDetails 提案と関連詳細
type ProposalWithDetails struct {
	Proposal         *model.EngineerProposal
	ProjectName      string
	ClientName       string
	MinPrice         int
	MaxPrice         int
	TotalQuestions   int
	PendingQuestions int
}

// CachedProposalCounter キャッシュされた件数取得
type CachedProposalCounter struct {
	db       *gorm.DB
	logger   *zap.Logger
	cache    map[string]*cachedCount
	cacheTTL time.Duration
}

type cachedCount struct {
	count     int64
	timestamp time.Time
}

// NewCachedProposalCounter 新しいCachedProposalCounterを作成
func NewCachedProposalCounter(db *gorm.DB, logger *zap.Logger) *CachedProposalCounter {
	return &CachedProposalCounter{
		db:       db,
		logger:   logger,
		cache:    make(map[string]*cachedCount),
		cacheTTL: 5 * time.Minute, // 5分間キャッシュ
	}
}

// CountWithCache キャッシュを使用した件数取得
func (c *CachedProposalCounter) CountWithCache(ctx context.Context, userID uuid.UUID, status string) (int64, error) {
	cacheKey := userID.String() + ":" + status

	// キャッシュチェック
	if cached, ok := c.cache[cacheKey]; ok {
		if time.Since(cached.timestamp) < c.cacheTTL {
			return cached.count, nil
		}
	}

	// データベースから取得
	var count int64
	query := c.db.WithContext(ctx).
		Model(&model.EngineerProposal{}).
		Where("user_id = ? AND deleted_at IS NULL", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&count).Error; err != nil {
		c.logger.Error("Failed to count proposals",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.String("status", status))
		return 0, err
	}

	// キャッシュ更新
	c.cache[cacheKey] = &cachedCount{
		count:     count,
		timestamp: time.Now(),
	}

	return count, nil
}

// ClearCache キャッシュをクリア
func (c *CachedProposalCounter) ClearCache() {
	c.cache = make(map[string]*cachedCount)
}
