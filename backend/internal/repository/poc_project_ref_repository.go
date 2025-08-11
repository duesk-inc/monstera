package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// PocProjectRefRepository monstera-pocスキーマのプロジェクト情報参照用リポジトリのインターフェース
type PocProjectRefRepository interface {
	// 基本取得操作
	GetByID(ctx context.Context, id string) (*model.PocProjectRef, error)
	GetByIDs(ctx context.Context, ids []string) ([]*model.PocProjectRef, error)
	GetAll(ctx context.Context, filter PocProjectRefFilter) ([]*model.PocProjectRef, int64, error)

	// 検索・フィルタリング
	SearchByName(ctx context.Context, name string, limit int) ([]*model.PocProjectRef, error)
	GetBySkillID(ctx context.Context, skillID string) ([]*model.PocProjectRef, error)
	GetByPriceRange(ctx context.Context, minPrice, maxPrice int) ([]*model.PocProjectRef, error)
	GetByWorkLocation(ctx context.Context, location string) ([]*model.PocProjectRef, error)

	// 統計・分析
	CountAllProjects(ctx context.Context) (int64, error)
	GetProjectCountBySkill(ctx context.Context) ([]*SkillProjectCount, error)
	GetProjectCountByLocation(ctx context.Context) ([]*LocationProjectCount, error)
	GetProjectCountByPriceRange(ctx context.Context) ([]*PriceRangeProjectCount, error)

	// 新規・最近作成プロジェクト
	GetRecentProjects(ctx context.Context, days int, limit int) ([]*model.PocProjectRef, error)
	GetProjectsCreatedAfter(ctx context.Context, date time.Time) ([]*model.PocProjectRef, error)

	// アクティブプロジェクト（削除されていないもの）
	GetActiveProjects(ctx context.Context, filter PocProjectRefFilter) ([]*model.PocProjectRef, int64, error)
	GetActiveProjectsBySkills(ctx context.Context, skillIDs []string) ([]*model.PocProjectRef, error)

	// スキル関連
	GetProjectWithSkills(ctx context.Context, id string) (*model.PocProjectRef, error)
	GetPopularSkills(ctx context.Context, limit int) ([]*SkillPopularityStats, error)
}

// PocProjectRefFilter プロジェクト検索フィルター
type PocProjectRefFilter struct {
	SkillIDs       []string   `json:"skill_ids"`
	MinPrice       *int       `json:"min_price"`
	MaxPrice       *int       `json:"max_price"`
	WorkLocation   *string    `json:"work_location"`
	RemoteWorkType *string    `json:"remote_work_type"`
	StartDateFrom  *time.Time `json:"start_date_from"`
	StartDateTo    *time.Time `json:"start_date_to"`
	CreatedAfter   *time.Time `json:"created_after"`
	CreatedBefore  *time.Time `json:"created_before"`
	SearchKeyword  *string    `json:"search_keyword"`
	Page           int        `json:"page"`
	Limit          int        `json:"limit"`
	SortBy         *string    `json:"sort_by"`    // "created_at", "start_date", "project_name"
	SortOrder      *string    `json:"sort_order"` // "asc", "desc"
}

// SkillProjectCount スキル別プロジェクト数
type SkillProjectCount struct {
	SkillID      string `json:"skill_id"`
	SkillName    string `json:"skill_name"`
	ProjectCount int    `json:"project_count"`
}

// LocationProjectCount 勤務地別プロジェクト数
type LocationProjectCount struct {
	WorkLocation string `json:"work_location"`
	ProjectCount int    `json:"project_count"`
}

// PriceRangeProjectCount 価格帯別プロジェクト数
type PriceRangeProjectCount struct {
	PriceRange   string `json:"price_range"` // "50-60万円", "60-70万円" など
	ProjectCount int    `json:"project_count"`
}

// SkillPopularityStats スキル人気度統計
type SkillPopularityStats struct {
	SkillID      string  `json:"skill_id"`
	SkillName    string  `json:"skill_name"`
	ProjectCount int     `json:"project_count"`
	RecentCount  int     `json:"recent_count"` // 直近30日のプロジェクト数
	GrowthRate   float64 `json:"growth_rate"`  // 成長率（％）
}

// pocProjectRefRepository monstera-pocスキーマ参照用リポジトリ実装
type pocProjectRefRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewPocProjectRefRepository 新しいPocProjectRefRepositoryインスタンスを作成
func NewPocProjectRefRepository(db *gorm.DB, logger *zap.Logger) PocProjectRefRepository {
	return &pocProjectRefRepository{
		db:     db,
		logger: logger,
	}
}

// GetByID IDによるプロジェクト取得
func (r *pocProjectRefRepository) GetByID(ctx context.Context, id string) (*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.GetByID called", zap.String("id", id))

	var project model.PocProjectRef
	err := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Where("deleted_at IS NULL").
		First(&project, "id = ?", id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Project not found", zap.String("id", id))
			return nil, nil
		}
		r.logger.Error("Failed to get project by ID", zap.Error(err), zap.String("id", id))
		return nil, err
	}

	r.logger.Info("Project retrieved successfully", zap.String("id", id), zap.String("name", project.ProjectName))
	return &project, nil
}

// GetByIDs 複数IDによるプロジェクト取得
func (r *pocProjectRefRepository) GetByIDs(ctx context.Context, ids []string) ([]*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.GetByIDs called", zap.Int("count", len(ids)))

	if len(ids) == 0 {
		return []*model.PocProjectRef{}, nil
	}

	var projects []*model.PocProjectRef
	err := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Where("deleted_at IS NULL").
		Where("id IN ?", ids).
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to get projects by IDs", zap.Error(err), zap.Int("count", len(ids)))
		return nil, err
	}

	r.logger.Info("Projects retrieved successfully", zap.Int("found", len(projects)))
	return projects, nil
}

// GetAll 全プロジェクト取得（フィルタリング付き）
func (r *pocProjectRefRepository) GetAll(ctx context.Context, filter PocProjectRefFilter) ([]*model.PocProjectRef, int64, error) {
	r.logger.Info("PocProjectRefRepository.GetAll called")

	query := r.db.WithContext(ctx).Model(&model.PocProjectRef{}).Where("deleted_at IS NULL")
	query = r.applyFilter(query, filter)

	// 総数取得
	var total int64
	countQuery := query
	if err := countQuery.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count projects", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	offset := (filter.Page - 1) * filter.Limit

	// ソート
	sortBy := "created_at"
	if filter.SortBy != nil {
		sortBy = *filter.SortBy
	}
	sortOrder := "desc"
	if filter.SortOrder != nil {
		sortOrder = *filter.SortOrder
	}

	var projects []*model.PocProjectRef
	err := query.
		Preload("RequiredSkills.Skill").
		Offset(offset).
		Limit(filter.Limit).
		Order(sortBy + " " + sortOrder).
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to get projects", zap.Error(err))
		return nil, 0, err
	}

	r.logger.Info("Projects retrieved successfully", zap.Int64("total", total), zap.Int("returned", len(projects)))
	return projects, total, nil
}

// SearchByName プロジェクト名による検索
func (r *pocProjectRefRepository) SearchByName(ctx context.Context, name string, limit int) ([]*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.SearchByName called", zap.String("name", name))

	if limit <= 0 {
		limit = 10
	}

	var projects []*model.PocProjectRef
	err := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Where("deleted_at IS NULL").
		Where("project_name LIKE ?", "%"+name+"%").
		Limit(limit).
		Order("created_at DESC").
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to search projects by name", zap.Error(err), zap.String("name", name))
		return nil, err
	}

	r.logger.Info("Projects search completed", zap.String("name", name), zap.Int("found", len(projects)))
	return projects, nil
}

// GetBySkillID スキルIDによるプロジェクト検索
func (r *pocProjectRefRepository) GetBySkillID(ctx context.Context, skillID string) ([]*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.GetBySkillID called", zap.String("skill_id", skillID))

	var projects []*model.PocProjectRef
	err := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Joins("JOIN monstera_poc.project_required_skills prs ON prs.project_id = monstera_poc.projects.id").
		Where("monstera_poc.projects.deleted_at IS NULL").
		Where("prs.skill_id = ?", skillID).
		Order("monstera_poc.projects.created_at DESC").
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to get projects by skill ID", zap.Error(err), zap.String("skill_id", skillID))
		return nil, err
	}

	r.logger.Info("Projects by skill retrieved", zap.String("skill_id", skillID), zap.Int("found", len(projects)))
	return projects, nil
}

// GetByPriceRange 価格帯によるプロジェクト検索
func (r *pocProjectRefRepository) GetByPriceRange(ctx context.Context, minPrice, maxPrice int) ([]*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.GetByPriceRange called", zap.Int("min", minPrice), zap.Int("max", maxPrice))

	query := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Where("deleted_at IS NULL")

	if minPrice > 0 {
		query = query.Where("min_price >= ? OR max_price >= ?", minPrice, minPrice)
	}
	if maxPrice > 0 {
		query = query.Where("min_price <= ? OR max_price <= ?", maxPrice, maxPrice)
	}

	var projects []*model.PocProjectRef
	err := query.Order("created_at DESC").Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to get projects by price range", zap.Error(err))
		return nil, err
	}

	r.logger.Info("Projects by price range retrieved", zap.Int("found", len(projects)))
	return projects, nil
}

// GetByWorkLocation 勤務地によるプロジェクト検索
func (r *pocProjectRefRepository) GetByWorkLocation(ctx context.Context, location string) ([]*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.GetByWorkLocation called", zap.String("location", location))

	var projects []*model.PocProjectRef
	err := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Where("deleted_at IS NULL").
		Where("work_location LIKE ?", "%"+location+"%").
		Order("created_at DESC").
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to get projects by work location", zap.Error(err), zap.String("location", location))
		return nil, err
	}

	r.logger.Info("Projects by work location retrieved", zap.String("location", location), zap.Int("found", len(projects)))
	return projects, nil
}

// CountAllProjects 全プロジェクト数を取得
func (r *pocProjectRefRepository) CountAllProjects(ctx context.Context) (int64, error) {
	r.logger.Info("PocProjectRefRepository.CountAllProjects called")

	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.PocProjectRef{}).
		Where("deleted_at IS NULL").
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to count all projects", zap.Error(err))
		return 0, err
	}

	r.logger.Info("All projects counted", zap.Int64("count", count))
	return count, nil
}

// GetProjectCountBySkill スキル別プロジェクト数を取得
func (r *pocProjectRefRepository) GetProjectCountBySkill(ctx context.Context) ([]*SkillProjectCount, error) {
	r.logger.Info("PocProjectRefRepository.GetProjectCountBySkill called")

	var results []*SkillProjectCount
	err := r.db.WithContext(ctx).
		Table("monstera_poc.project_required_skills prs").
		Select("prs.skill_id, s.name as skill_name, COUNT(DISTINCT p.id) as project_count").
		Joins("JOIN monstera_poc.projects p ON p.id = prs.project_id").
		Joins("JOIN monstera_poc.skills s ON s.id = prs.skill_id").
		Where("p.deleted_at IS NULL AND s.deleted_at IS NULL").
		Group("prs.skill_id, s.name").
		Order("project_count DESC").
		Scan(&results).Error

	if err != nil {
		r.logger.Error("Failed to get project count by skill", zap.Error(err))
		return nil, err
	}

	r.logger.Info("Project count by skill retrieved", zap.Int("count", len(results)))
	return results, nil
}

// GetProjectCountByLocation 勤務地別プロジェクト数を取得
func (r *pocProjectRefRepository) GetProjectCountByLocation(ctx context.Context) ([]*LocationProjectCount, error) {
	r.logger.Info("PocProjectRefRepository.GetProjectCountByLocation called")

	var results []*LocationProjectCount
	err := r.db.WithContext(ctx).
		Model(&model.PocProjectRef{}).
		Select("work_location, COUNT(*) as project_count").
		Where("deleted_at IS NULL AND work_location IS NOT NULL AND work_location != ''").
		Group("work_location").
		Order("project_count DESC").
		Scan(&results).Error

	if err != nil {
		r.logger.Error("Failed to get project count by location", zap.Error(err))
		return nil, err
	}

	r.logger.Info("Project count by location retrieved", zap.Int("count", len(results)))
	return results, nil
}

// GetProjectCountByPriceRange 価格帯別プロジェクト数を取得
func (r *pocProjectRefRepository) GetProjectCountByPriceRange(ctx context.Context) ([]*PriceRangeProjectCount, error) {
	r.logger.Info("PocProjectRefRepository.GetProjectCountByPriceRange called")

	var results []*PriceRangeProjectCount
	err := r.db.WithContext(ctx).
		Model(&model.PocProjectRef{}).
		Select(`
			CASE 
				WHEN min_price < 500000 THEN '50万円未満'
				WHEN min_price < 600000 THEN '50-60万円'
				WHEN min_price < 700000 THEN '60-70万円'
				WHEN min_price < 800000 THEN '70-80万円'
				WHEN min_price < 900000 THEN '80-90万円'
				WHEN min_price < 1000000 THEN '90-100万円'
				ELSE '100万円以上'
			END as price_range,
			COUNT(*) as project_count
		`).
		Where("deleted_at IS NULL AND min_price IS NOT NULL").
		Group("price_range").
		Order("MIN(min_price)").
		Scan(&results).Error

	if err != nil {
		r.logger.Error("Failed to get project count by price range", zap.Error(err))
		return nil, err
	}

	r.logger.Info("Project count by price range retrieved", zap.Int("count", len(results)))
	return results, nil
}

// GetRecentProjects 最近作成されたプロジェクトを取得
func (r *pocProjectRefRepository) GetRecentProjects(ctx context.Context, days int, limit int) ([]*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.GetRecentProjects called", zap.Int("days", days), zap.Int("limit", limit))

	if days <= 0 {
		days = 7
	}
	if limit <= 0 {
		limit = 10
	}

	dateThreshold := time.Now().AddDate(0, 0, -days)

	var projects []*model.PocProjectRef
	err := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Where("deleted_at IS NULL").
		Where("created_at >= ?", dateThreshold).
		Limit(limit).
		Order("created_at DESC").
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to get recent projects", zap.Error(err))
		return nil, err
	}

	r.logger.Info("Recent projects retrieved", zap.Int("days", days), zap.Int("found", len(projects)))
	return projects, nil
}

// GetProjectsCreatedAfter 指定日時以降に作成されたプロジェクトを取得
func (r *pocProjectRefRepository) GetProjectsCreatedAfter(ctx context.Context, date time.Time) ([]*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.GetProjectsCreatedAfter called", zap.Time("date", date))

	var projects []*model.PocProjectRef
	err := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Where("deleted_at IS NULL").
		Where("created_at >= ?", date).
		Order("created_at DESC").
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to get projects created after date", zap.Error(err))
		return nil, err
	}

	r.logger.Info("Projects created after date retrieved", zap.Time("date", date), zap.Int("found", len(projects)))
	return projects, nil
}

// GetActiveProjects アクティブなプロジェクトを取得（削除されていないもの）
func (r *pocProjectRefRepository) GetActiveProjects(ctx context.Context, filter PocProjectRefFilter) ([]*model.PocProjectRef, int64, error) {
	r.logger.Info("PocProjectRefRepository.GetActiveProjects called")

	// GetAllと同じ実装（既にdeleted_at IS NULLでフィルタリングしている）
	return r.GetAll(ctx, filter)
}

// GetActiveProjectsBySkills スキルリストに基づくアクティブプロジェクト取得
func (r *pocProjectRefRepository) GetActiveProjectsBySkills(ctx context.Context, skillIDs []string) ([]*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.GetActiveProjectsBySkills called", zap.Int("skill_count", len(skillIDs)))

	if len(skillIDs) == 0 {
		return []*model.PocProjectRef{}, nil
	}

	var projects []*model.PocProjectRef
	err := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Joins("JOIN monstera_poc.project_required_skills prs ON prs.project_id = monstera_poc.projects.id").
		Where("monstera_poc.projects.deleted_at IS NULL").
		Where("prs.skill_id IN ?", skillIDs).
		Group("monstera_poc.projects.id").
		Order("monstera_poc.projects.created_at DESC").
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to get active projects by skills", zap.Error(err))
		return nil, err
	}

	r.logger.Info("Active projects by skills retrieved", zap.Int("found", len(projects)))
	return projects, nil
}

// GetProjectWithSkills スキル情報付きでプロジェクトを取得
func (r *pocProjectRefRepository) GetProjectWithSkills(ctx context.Context, id string) (*model.PocProjectRef, error) {
	r.logger.Info("PocProjectRefRepository.GetProjectWithSkills called", zap.String("id", id))

	var project model.PocProjectRef
	err := r.db.WithContext(ctx).
		Preload("RequiredSkills.Skill").
		Where("deleted_at IS NULL").
		First(&project, "id = ?", id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Project with skills not found", zap.String("id", id))
			return nil, nil
		}
		r.logger.Error("Failed to get project with skills", zap.Error(err), zap.String("id", id))
		return nil, err
	}

	r.logger.Info("Project with skills retrieved", zap.String("id", id), zap.Int("skills", len(project.RequiredSkills)))
	return &project, nil
}

// GetPopularSkills 人気スキルランキングを取得
func (r *pocProjectRefRepository) GetPopularSkills(ctx context.Context, limit int) ([]*SkillPopularityStats, error) {
	r.logger.Info("PocProjectRefRepository.GetPopularSkills called", zap.Int("limit", limit))

	if limit <= 0 {
		limit = 10
	}

	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)

	var results []*SkillPopularityStats
	err := r.db.WithContext(ctx).
		Table("monstera_poc.project_required_skills prs").
		Select(`
			prs.skill_id,
			s.name as skill_name,
			COUNT(DISTINCT p.id) as project_count,
			COUNT(DISTINCT CASE WHEN p.created_at >= ? THEN p.id END) as recent_count,
			CASE 
				WHEN COUNT(DISTINCT CASE WHEN p.created_at < ? THEN p.id END) > 0 
				THEN ((COUNT(DISTINCT CASE WHEN p.created_at >= ? THEN p.id END) * 100.0) / COUNT(DISTINCT CASE WHEN p.created_at < ? THEN p.id END)) - 100
				ELSE 0 
			END as growth_rate
		`, thirtyDaysAgo, thirtyDaysAgo, thirtyDaysAgo, thirtyDaysAgo).
		Joins("JOIN monstera_poc.projects p ON p.id = prs.project_id").
		Joins("JOIN monstera_poc.skills s ON s.id = prs.skill_id").
		Where("p.deleted_at IS NULL AND s.deleted_at IS NULL").
		Group("prs.skill_id, s.name").
		Order("project_count DESC").
		Limit(limit).
		Scan(&results).Error

	if err != nil {
		r.logger.Error("Failed to get popular skills", zap.Error(err))
		return nil, err
	}

	r.logger.Info("Popular skills retrieved", zap.Int("count", len(results)))
	return results, nil
}

// applyFilter フィルターを適用
func (r *pocProjectRefRepository) applyFilter(query *gorm.DB, filter PocProjectRefFilter) *gorm.DB {
	// スキルフィルター
	if len(filter.SkillIDs) > 0 {
		query = query.Joins("JOIN monstera_poc.project_required_skills prs ON prs.project_id = monstera_poc.projects.id").
			Where("prs.skill_id IN ?", filter.SkillIDs)
	}

	// 価格フィルター
	if filter.MinPrice != nil {
		query = query.Where("min_price >= ? OR max_price >= ?", *filter.MinPrice, *filter.MinPrice)
	}
	if filter.MaxPrice != nil {
		query = query.Where("min_price <= ? OR max_price <= ?", *filter.MaxPrice, *filter.MaxPrice)
	}

	// 勤務地フィルター
	if filter.WorkLocation != nil && *filter.WorkLocation != "" {
		query = query.Where("work_location LIKE ?", "%"+*filter.WorkLocation+"%")
	}

	// リモートワーク形態フィルター
	if filter.RemoteWorkType != nil && *filter.RemoteWorkType != "" {
		query = query.Where("remote_work_type = ?", *filter.RemoteWorkType)
	}

	// 開始日フィルター
	if filter.StartDateFrom != nil {
		query = query.Where("start_date >= ?", *filter.StartDateFrom)
	}
	if filter.StartDateTo != nil {
		query = query.Where("start_date <= ?", *filter.StartDateTo)
	}

	// 作成日フィルター
	if filter.CreatedAfter != nil {
		query = query.Where("created_at >= ?", *filter.CreatedAfter)
	}
	if filter.CreatedBefore != nil {
		query = query.Where("created_at <= ?", *filter.CreatedBefore)
	}

	// キーワード検索
	if filter.SearchKeyword != nil && *filter.SearchKeyword != "" {
		keyword := "%" + *filter.SearchKeyword + "%"
		query = query.Where("project_name LIKE ? OR description LIKE ?", keyword, keyword)
	}

	return query
}
