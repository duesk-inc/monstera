package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SalesActivityRepository 営業活動リポジトリのインターフェース
type SalesActivityRepository interface {
	CrudRepository[model.SalesActivity]
	FindByClientID(ctx context.Context, clientID uuid.UUID) ([]*model.SalesActivity, error)
	FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.SalesActivity, error)
	FindByUserID(ctx context.Context, userID string) ([]*model.SalesActivity, error)
	FindUpcoming(ctx context.Context, userID *string, days int) ([]*model.SalesActivity, error)
	FindOverdue(ctx context.Context, userID *string) ([]*model.SalesActivity, error)
	GetActivitySummary(ctx context.Context, userID *string, dateFrom, dateTo *time.Time) (*ActivitySummary, error)
}

// ActivitySummary 活動サマリ
type ActivitySummary struct {
	TotalActivities     int
	CompletedActivities int
	PlannedActivities   int
	OverdueActivities   int
	ActivityByType      map[string]int
	ActivityByUser      map[string]int
}

// salesActivityRepository 営業活動リポジトリの実装
type salesActivityRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewSalesActivityRepository 営業活動リポジトリのインスタンスを生成
func NewSalesActivityRepository(base BaseRepository) SalesActivityRepository {
	return &salesActivityRepository{
		db:     base.GetDB(),
		logger: base.GetLogger(),
	}
}

// FindByClientID 取引先IDで検索
func (r *salesActivityRepository) FindByClientID(ctx context.Context, clientID uuid.UUID) ([]*model.SalesActivity, error) {
	var activities []*model.SalesActivity
	err := r.db.WithContext(ctx).
		Where("client_id = ? AND deleted_at IS NULL", clientID).
		Order("activity_date DESC").
		Find(&activities).Error

	if err != nil {
		r.logger.Error("Failed to find activities by client ID",
			zap.String("client_id", clientID.String()),
			zap.Error(err))
		return nil, err
	}

	return activities, nil
}

// FindByProjectID 案件IDで検索
func (r *salesActivityRepository) FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.SalesActivity, error) {
	var activities []*model.SalesActivity
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Order("activity_date DESC").
		Find(&activities).Error

	if err != nil {
		r.logger.Error("Failed to find activities by project ID",
			zap.String("project_id", projectID.String()),
			zap.Error(err))
		return nil, err
	}

	return activities, nil
}

// FindByUserID ユーザーIDで検索
func (r *salesActivityRepository) FindByUserID(ctx context.Context, userID string) ([]*model.SalesActivity, error) {
	var activities []*model.SalesActivity
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("activity_date DESC").
		Find(&activities).Error

	if err != nil {
		r.logger.Error("Failed to find activities by user ID",
			zap.String("user_id", userID),
			zap.Error(err))
		return nil, err
	}

	return activities, nil
}

// FindUpcoming 今後の予定を検索
func (r *salesActivityRepository) FindUpcoming(ctx context.Context, userID *string, days int) ([]*model.SalesActivity, error) {
	var activities []*model.SalesActivity
	now := time.Now()
	endDate := now.AddDate(0, 0, days)

	query := r.db.WithContext(ctx).
		Where("activity_date >= ? AND activity_date <= ? AND status = ? AND deleted_at IS NULL",
			now, endDate, model.SalesActivityStatusPlanning)

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	err := query.Order("activity_date ASC").Find(&activities).Error

	if err != nil {
		r.logger.Error("Failed to find upcoming activities", zap.Error(err))
		return nil, err
	}

	return activities, nil
}

// FindOverdue 期限超過の活動を検索
func (r *salesActivityRepository) FindOverdue(ctx context.Context, userID *string) ([]*model.SalesActivity, error) {
	var activities []*model.SalesActivity
	now := time.Now()

	query := r.db.WithContext(ctx).
		Where("activity_date < ? AND status = ? AND deleted_at IS NULL",
			now, model.SalesActivityStatusPlanning)

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	err := query.Order("activity_date ASC").Find(&activities).Error

	if err != nil {
		r.logger.Error("Failed to find overdue activities", zap.Error(err))
		return nil, err
	}

	return activities, nil
}

// GetActivitySummary 活動サマリを取得
func (r *salesActivityRepository) GetActivitySummary(ctx context.Context, userID *string, dateFrom, dateTo *time.Time) (*ActivitySummary, error) {
	summary := &ActivitySummary{
		ActivityByType: make(map[string]int),
		ActivityByUser: make(map[string]int),
	}

	query := r.db.WithContext(ctx).Model(&model.SalesActivity{}).
		Where("deleted_at IS NULL")

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if dateFrom != nil {
		query = query.Where("activity_date >= ?", *dateFrom)
	}

	if dateTo != nil {
		query = query.Where("activity_date <= ?", *dateTo)
	}

	// 総件数
	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		r.logger.Error("Failed to count total activities", zap.Error(err))
		return nil, err
	}
	summary.TotalActivities = int(totalCount)

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
		switch model.SalesActivityStatus(sc.Status) {
		case model.SalesActivityStatusWon:
			summary.CompletedActivities = sc.Count
		case model.SalesActivityStatusPlanning:
			summary.PlannedActivities = sc.Count
		}
	}

	// 期限超過件数
	var overdueCount int64
	if err := query.
		Where("next_action_date < ? AND status = ?", time.Now(), model.SalesActivityStatusPlanning).
		Count(&overdueCount).Error; err != nil {
		r.logger.Error("Failed to count overdue activities", zap.Error(err))
		return nil, err
	}
	summary.OverdueActivities = int(overdueCount)

	// 活動タイプ別件数
	type typeCount struct {
		ActivityType string
		Count        int
	}
	var typeCounts []typeCount
	if err := query.
		Select("activity_type, COUNT(*) as count").
		Group("activity_type").
		Scan(&typeCounts).Error; err != nil {
		r.logger.Error("Failed to get activity type counts", zap.Error(err))
		return nil, err
	}

	for _, tc := range typeCounts {
		summary.ActivityByType[tc.ActivityType] = tc.Count
	}

	// ユーザー別件数
	type userCount struct {
		UserID string
		Count  int
	}
	var userCounts []userCount
	if err := query.
		Select("user_id, COUNT(*) as count").
		Group("user_id").
		Scan(&userCounts).Error; err != nil {
		r.logger.Error("Failed to get user counts", zap.Error(err))
		return nil, err
	}

	for _, uc := range userCounts {
		summary.ActivityByUser[uc.UserID] = uc.Count
	}

	return summary, nil
}

// Create 営業活動を作成（CrudRepositoryインターフェース実装）
func (r *salesActivityRepository) Create(ctx context.Context, entity *model.SalesActivity) error {
	return r.db.WithContext(ctx).Create(entity).Error
}

// Update 営業活動を更新（CrudRepositoryインターフェース実装）
func (r *salesActivityRepository) Update(ctx context.Context, entity *model.SalesActivity) error {
	return r.db.WithContext(ctx).Save(entity).Error
}

// Delete 営業活動を削除（CrudRepositoryインターフェース実装）
func (r *salesActivityRepository) Delete(ctx context.Context, entity *model.SalesActivity) error {
	return r.db.WithContext(ctx).Delete(entity).Error
}

// FindByID IDで営業活動を検索（CrudRepositoryインターフェース実装）
func (r *salesActivityRepository) FindByID(ctx context.Context, id interface{}) (*model.SalesActivity, error) {
	var entity model.SalesActivity
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&entity).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

// FindAll すべての営業活動を検索（CrudRepositoryインターフェース実装）
func (r *salesActivityRepository) FindAll(ctx context.Context, opts ...repository.QueryOptions) ([]*model.SalesActivity, error) {
	var entities []*model.SalesActivity
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

// Count 営業活動数をカウント（CrudRepositoryインターフェース実装）
func (r *salesActivityRepository) Count(ctx context.Context, opts ...repository.QueryOptions) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&model.SalesActivity{})

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

// Exists 営業活動の存在確認（CrudRepositoryインターフェース実装）
func (r *salesActivityRepository) Exists(ctx context.Context, id interface{}) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.SalesActivity{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

// Transaction トランザクション処理（CrudRepositoryインターフェース実装）
func (r *salesActivityRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}
