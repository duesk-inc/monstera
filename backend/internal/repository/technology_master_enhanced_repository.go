package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/pkg/normalizer"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// TechnologyMasterEnhancedRepository 拡張技術マスタリポジトリのインターフェース
type TechnologyMasterEnhancedRepository interface {
	// 基本操作
	Create(ctx context.Context, tech *model.TechnologyMaster) error
	Update(ctx context.Context, tech *model.TechnologyMaster) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.TechnologyMaster, error)
	GetByName(ctx context.Context, category model.TechCategory, name string) (*model.TechnologyMaster, error)
	GetAll(ctx context.Context) ([]*model.TechnologyMaster, error)
	GetByCategory(ctx context.Context, category model.TechCategory) ([]*model.TechnologyMaster, error)

	// 候補検索機能（拡張）
	SearchSuggestions(ctx context.Context, req dto.TechnologySuggestionRequest) ([]*model.TechnologyMaster, error)
	SearchByPrefix(ctx context.Context, category model.TechCategory, prefix string, limit int) ([]*model.TechnologyMaster, error)
	SearchByKeyword(ctx context.Context, keyword string, categoryFilter *model.TechCategory, limit int) ([]*model.TechnologyMaster, error)
	GetPopularTechnologies(ctx context.Context, category *model.TechCategory, limit int) ([]*model.TechnologyMaster, error)
	GetRecentlyUsedTechnologies(ctx context.Context, userID uuid.UUID, limit int) ([]*model.TechnologyMaster, error)

	// 使用回数更新機能（拡張）
	IncrementUsageCount(ctx context.Context, id uuid.UUID) error
	BatchIncrementUsageCount(ctx context.Context, ids []uuid.UUID) error
	UpdateUsageCountByName(ctx context.Context, category model.TechCategory, name string) error
	GetUsageStatistics(ctx context.Context, category *model.TechCategory) ([]TechnologyUsageStats, error)

	// 正規化・自動登録機能
	FindOrCreateByName(ctx context.Context, category model.TechCategory, name string) (*model.TechnologyMaster, error)
	NormalizeAndFindTechnology(ctx context.Context, name string) (*model.TechnologyMaster, error)
	BulkCreateMissingTechnologies(ctx context.Context, technologies []TechnologyCreateRequest) ([]*model.TechnologyMaster, error)

	// 管理機能
	GetDuplicateTechnologies(ctx context.Context) ([]TechnologyDuplicateGroup, error)
	MergeTechnologies(ctx context.Context, sourceID, targetID uuid.UUID) error
	UpdateSortOrder(ctx context.Context, updates []TechnologySortOrderUpdate) error
}

// TechnologyUsageStats 技術使用統計
type TechnologyUsageStats struct {
	TechnologyID     uuid.UUID `json:"technology_id"`
	TechnologyName   string    `json:"technology_name"`
	CategoryName     string    `json:"category_name"`
	UsageCount       int32     `json:"usage_count"`
	UserCount        int32     `json:"user_count"`         // 使用ユーザー数
	ProjectCount     int32     `json:"project_count"`      // 使用プロジェクト数
	RecentUsageCount int32     `json:"recent_usage_count"` // 最近の使用回数（1年以内）
}

// TechnologyCreateRequest 技術作成リクエスト
type TechnologyCreateRequest struct {
	Category    model.TechCategory `json:"category"`
	Name        string             `json:"name"`
	DisplayName *string            `json:"display_name"`
	Aliases     []string           `json:"aliases"`
	SortOrder   int32              `json:"sort_order"`
}

// TechnologyDuplicateGroup 重複技術グループ
type TechnologyDuplicateGroup struct {
	NormalizedName string                    `json:"normalized_name"`
	Technologies   []*model.TechnologyMaster `json:"technologies"`
}

// TechnologySortOrderUpdate ソート順更新
type TechnologySortOrderUpdate struct {
	ID        uuid.UUID `json:"id"`
	SortOrder int32     `json:"sort_order"`
}

// technologyMasterEnhancedRepository 拡張技術マスタリポジトリの実装
type technologyMasterEnhancedRepository struct {
	db         *gorm.DB
	logger     *zap.Logger
	normalizer *normalizer.TechnologyNormalizer
}

// NewTechnologyMasterEnhancedRepository 拡張技術マスタリポジトリのコンストラクタ
func NewTechnologyMasterEnhancedRepository(db *gorm.DB, logger *zap.Logger) TechnologyMasterEnhancedRepository {
	return &technologyMasterEnhancedRepository{
		db:         db,
		logger:     logger,
		normalizer: normalizer.NewTechnologyNormalizer(),
	}
}

// Create 技術マスタを作成
func (r *technologyMasterEnhancedRepository) Create(ctx context.Context, tech *model.TechnologyMaster) error {
	if err := r.db.WithContext(ctx).Create(tech).Error; err != nil {
		r.logger.Error("Failed to create technology master", zap.Error(err))
		return fmt.Errorf("技術マスタの作成に失敗しました: %w", err)
	}
	return nil
}

// Update 技術マスタを更新
func (r *technologyMasterEnhancedRepository) Update(ctx context.Context, tech *model.TechnologyMaster) error {
	if err := r.db.WithContext(ctx).Save(tech).Error; err != nil {
		r.logger.Error("Failed to update technology master", zap.Error(err))
		return fmt.Errorf("技術マスタの更新に失敗しました: %w", err)
	}
	return nil
}

// Delete 技術マスタを削除（論理削除）
func (r *technologyMasterEnhancedRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).Model(&model.TechnologyMaster{}).
		Where("id = ?", id).
		Update("is_active", false).Error; err != nil {
		r.logger.Error("Failed to delete technology master", zap.Error(err))
		return fmt.Errorf("技術マスタの削除に失敗しました: %w", err)
	}
	return nil
}

// GetByID IDで技術マスタを取得
func (r *technologyMasterEnhancedRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.TechnologyMaster, error) {
	var tech model.TechnologyMaster
	if err := r.db.WithContext(ctx).
		Where("id = ? AND is_active = ?", id, true).
		First(&tech).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get technology master by ID", zap.Error(err))
		return nil, fmt.Errorf("技術マスタの取得に失敗しました: %w", err)
	}
	return &tech, nil
}

// GetByName カテゴリと名前で技術マスタを取得
func (r *technologyMasterEnhancedRepository) GetByName(ctx context.Context, category model.TechCategory, name string) (*model.TechnologyMaster, error) {
	var tech model.TechnologyMaster
	if err := r.db.WithContext(ctx).
		Where("category = ? AND name = ? AND is_active = ?", category, name, true).
		First(&tech).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get technology master by name", zap.Error(err))
		return nil, fmt.Errorf("技術マスタの取得に失敗しました: %w", err)
	}
	return &tech, nil
}

// GetAll 全ての技術マスタを取得
func (r *technologyMasterEnhancedRepository) GetAll(ctx context.Context) ([]*model.TechnologyMaster, error) {
	var techs []*model.TechnologyMaster
	if err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("category ASC, sort_order ASC, name ASC").
		Find(&techs).Error; err != nil {
		r.logger.Error("Failed to get all technology masters", zap.Error(err))
		return nil, fmt.Errorf("技術マスタ一覧の取得に失敗しました: %w", err)
	}
	return techs, nil
}

// GetByCategory カテゴリで技術マスタを取得
func (r *technologyMasterEnhancedRepository) GetByCategory(ctx context.Context, category model.TechCategory) ([]*model.TechnologyMaster, error) {
	var techs []*model.TechnologyMaster
	if err := r.db.WithContext(ctx).
		Where("category = ? AND is_active = ?", category, true).
		Order("sort_order ASC, name ASC").
		Find(&techs).Error; err != nil {
		r.logger.Error("Failed to get technology masters by category", zap.Error(err))
		return nil, fmt.Errorf("技術マスタの取得に失敗しました: %w", err)
	}
	return techs, nil
}

// SearchSuggestions 候補検索（拡張版）
func (r *technologyMasterEnhancedRepository) SearchSuggestions(ctx context.Context, req dto.TechnologySuggestionRequest) ([]*model.TechnologyMaster, error) {
	query := r.db.WithContext(ctx).
		Where("is_active = ?", true)

	// カテゴリフィルタ
	if req.CategoryName != nil && *req.CategoryName != "" {
		query = query.Where("category = ?", *req.CategoryName)
	}

	// キーワード検索（前方一致 + 部分一致 + エイリアス検索）
	searchTerm := strings.ToLower(req.Query)
	query = query.Where(
		"(LOWER(name) LIKE ? OR LOWER(display_name) LIKE ? OR LOWER(aliases) LIKE ?)",
		searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%",
	)

	// ソート順（人気順を考慮）
	if req.IncludePopular {
		query = query.Order("usage_count DESC, sort_order ASC, name ASC")
	} else {
		query = query.Order("sort_order ASC, usage_count DESC, name ASC")
	}

	// 件数制限
	if req.Limit > 0 {
		query = query.Limit(int(req.Limit))
	}

	var techs []*model.TechnologyMaster
	if err := query.Find(&techs).Error; err != nil {
		r.logger.Error("Failed to search technology suggestions", zap.Error(err))
		return nil, fmt.Errorf("技術候補の検索に失敗しました: %w", err)
	}

	return techs, nil
}

// SearchByPrefix 前方一致検索
func (r *technologyMasterEnhancedRepository) SearchByPrefix(ctx context.Context, category model.TechCategory, prefix string, limit int) ([]*model.TechnologyMaster, error) {
	var techs []*model.TechnologyMaster

	query := r.db.WithContext(ctx).
		Where("category = ? AND is_active = ?", category, true).
		Where("(name LIKE ? OR display_name LIKE ? OR aliases LIKE ?)",
			prefix+"%", prefix+"%", "%"+prefix+"%").
		Order("usage_count DESC, sort_order ASC, name ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&techs).Error; err != nil {
		r.logger.Error("Failed to search technology master", zap.Error(err))
		return nil, fmt.Errorf("技術マスタの検索に失敗しました: %w", err)
	}

	return techs, nil
}

// SearchByKeyword キーワード検索
func (r *technologyMasterEnhancedRepository) SearchByKeyword(ctx context.Context, keyword string, categoryFilter *model.TechCategory, limit int) ([]*model.TechnologyMaster, error) {
	query := r.db.WithContext(ctx).
		Where("is_active = ?", true)

	if categoryFilter != nil {
		query = query.Where("category = ?", *categoryFilter)
	}

	searchTerm := "%" + strings.ToLower(keyword) + "%"
	query = query.Where(
		"(LOWER(name) LIKE ? OR LOWER(display_name) LIKE ? OR LOWER(aliases) LIKE ?)",
		searchTerm, searchTerm, searchTerm,
	).Order("usage_count DESC, sort_order ASC, name ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	var techs []*model.TechnologyMaster
	if err := query.Find(&techs).Error; err != nil {
		r.logger.Error("Failed to search technology by keyword", zap.Error(err))
		return nil, fmt.Errorf("技術キーワード検索に失敗しました: %w", err)
	}

	return techs, nil
}

// GetPopularTechnologies 人気技術を取得
func (r *technologyMasterEnhancedRepository) GetPopularTechnologies(ctx context.Context, category *model.TechCategory, limit int) ([]*model.TechnologyMaster, error) {
	query := r.db.WithContext(ctx).
		Where("is_active = ? AND usage_count > ?", true, 0)

	if category != nil {
		query = query.Where("category = ?", *category)
	}

	query = query.Order("usage_count DESC, sort_order ASC, name ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	var techs []*model.TechnologyMaster
	if err := query.Find(&techs).Error; err != nil {
		r.logger.Error("Failed to get popular technologies", zap.Error(err))
		return nil, fmt.Errorf("人気技術の取得に失敗しました: %w", err)
	}

	return techs, nil
}

// GetRecentlyUsedTechnologies ユーザーが最近使用した技術を取得
func (r *technologyMasterEnhancedRepository) GetRecentlyUsedTechnologies(ctx context.Context, userID uuid.UUID, limit int) ([]*model.TechnologyMaster, error) {
	// 最近のプロジェクトから使用技術を取得
	subQuery := r.db.WithContext(ctx).
		Select("DISTINCT wht.technology_name").
		Table("work_histories wh").
		Joins("INNER JOIN work_history_technologies wht ON wh.id = wht.work_history_id").
		Where("wh.user_id = ? AND wh.deleted_at IS NULL", userID).
		Where("wh.start_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 YEAR)"). // 2年以内
		Order("wh.start_date DESC").
		Limit(50) // サブクエリの制限

	var techs []*model.TechnologyMaster
	query := r.db.WithContext(ctx).
		Where("is_active = ? AND name IN (?)", true, subQuery).
		Order("usage_count DESC, sort_order ASC, name ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&techs).Error; err != nil {
		r.logger.Error("Failed to get recently used technologies", zap.Error(err))
		return nil, fmt.Errorf("最近使用した技術の取得に失敗しました: %w", err)
	}

	return techs, nil
}

// IncrementUsageCount 使用回数をインクリメント
func (r *technologyMasterEnhancedRepository) IncrementUsageCount(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).Model(&model.TechnologyMaster{}).
		Where("id = ?", id).
		Update("usage_count", gorm.Expr("usage_count + ?", 1)).Error; err != nil {
		r.logger.Error("Failed to increment usage count", zap.Error(err))
		return fmt.Errorf("使用回数の更新に失敗しました: %w", err)
	}
	return nil
}

// BatchIncrementUsageCount 複数の技術の使用回数を一括インクリメント
func (r *technologyMasterEnhancedRepository) BatchIncrementUsageCount(ctx context.Context, ids []uuid.UUID) error {
	if len(ids) == 0 {
		return nil
	}

	if err := r.db.WithContext(ctx).Model(&model.TechnologyMaster{}).
		Where("id IN ?", ids).
		Update("usage_count", gorm.Expr("usage_count + ?", 1)).Error; err != nil {
		r.logger.Error("Failed to batch increment usage count", zap.Error(err))
		return fmt.Errorf("使用回数の一括更新に失敗しました: %w", err)
	}
	return nil
}

// UpdateUsageCountByName 名前で技術を特定して使用回数を更新
func (r *technologyMasterEnhancedRepository) UpdateUsageCountByName(ctx context.Context, category model.TechCategory, name string) error {
	if err := r.db.WithContext(ctx).Model(&model.TechnologyMaster{}).
		Where("category = ? AND name = ?", category, name).
		Update("usage_count", gorm.Expr("usage_count + ?", 1)).Error; err != nil {
		r.logger.Error("Failed to update usage count by name", zap.Error(err))
		return fmt.Errorf("技術名による使用回数の更新に失敗しました: %w", err)
	}
	return nil
}

// GetUsageStatistics 使用統計を取得
func (r *technologyMasterEnhancedRepository) GetUsageStatistics(ctx context.Context, category *model.TechCategory) ([]TechnologyUsageStats, error) {
	query := `
		SELECT 
			tm.id as technology_id,
			tm.name as technology_name,
			tm.category as category_name,
			tm.usage_count,
			COUNT(DISTINCT wh.user_id) as user_count,
			COUNT(DISTINCT wh.id) as project_count,
			COUNT(CASE WHEN wh.start_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR) THEN 1 END) as recent_usage_count
		FROM technology_master tm
		LEFT JOIN work_history_technologies wht ON tm.name = wht.technology_name
		LEFT JOIN work_histories wh ON wht.work_history_id = wh.id AND wh.deleted_at IS NULL
		WHERE tm.is_active = true
	`

	args := []interface{}{}
	if category != nil {
		query += " AND tm.category = ?"
		args = append(args, *category)
	}

	query += `
		GROUP BY tm.id, tm.name, tm.category, tm.usage_count
		ORDER BY tm.usage_count DESC, tm.sort_order ASC, tm.name ASC
	`

	var stats []TechnologyUsageStats
	if err := r.db.WithContext(ctx).Raw(query, args...).Scan(&stats).Error; err != nil {
		r.logger.Error("Failed to get usage statistics", zap.Error(err))
		return nil, fmt.Errorf("使用統計の取得に失敗しました: %w", err)
	}

	return stats, nil
}

// FindOrCreateByName 名前で技術を検索し、存在しない場合は作成
func (r *technologyMasterEnhancedRepository) FindOrCreateByName(ctx context.Context, category model.TechCategory, name string) (*model.TechnologyMaster, error) {
	// まず既存の技術を検索（小文字で）
	lowerName := strings.ToLower(name)
	existing, err := r.GetByName(ctx, category, lowerName)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}

	// 正規化を試す
	normalized := r.normalizer.Normalize(name)
	lowerNormalized := strings.ToLower(normalized)
	if lowerNormalized != lowerName {
		existing, err = r.GetByName(ctx, category, lowerNormalized)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return existing, nil
		}
	}

	// 存在しない場合は新規作成
	newTech := &model.TechnologyMaster{
		ID:          uuid.New(),
		Category:    category,
		Name:        lowerNormalized, // 小文字で保存
		DisplayName: name,
		IsActive:    true,
		SortOrder:   999, // デフォルトは最後
	}

	if err := r.Create(ctx, newTech); err != nil {
		return nil, err
	}

	return newTech, nil
}

// NormalizeAndFindTechnology 技術名を正規化して検索
func (r *technologyMasterEnhancedRepository) NormalizeAndFindTechnology(ctx context.Context, name string) (*model.TechnologyMaster, error) {
	// 正規化
	normalized := r.normalizer.Normalize(name)

	// 全カテゴリで検索
	categories := []model.TechCategory{
		model.TechCategoryProgrammingLanguages,
		model.TechCategoryServersDatabases,
		model.TechCategoryTools,
	}

	for _, category := range categories {
		tech, err := r.GetByName(ctx, category, normalized)
		if err != nil {
			return nil, err
		}
		if tech != nil {
			return tech, nil
		}
	}

	return nil, nil
}

// BulkCreateMissingTechnologies 存在しない技術を一括作成
func (r *technologyMasterEnhancedRepository) BulkCreateMissingTechnologies(ctx context.Context, technologies []TechnologyCreateRequest) ([]*model.TechnologyMaster, error) {
	var result []*model.TechnologyMaster

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, req := range technologies {
			// 既存チェック
			existing, err := r.GetByName(ctx, req.Category, req.Name)
			if err != nil {
				return err
			}
			if existing != nil {
				result = append(result, existing)
				continue
			}

			// 新規作成
			newTech := &model.TechnologyMaster{
				ID:        uuid.New(),
				Category:  req.Category,
				Name:      req.Name,
				IsActive:  true,
				SortOrder: int(req.SortOrder),
			}

			if req.DisplayName != nil {
				newTech.DisplayName = *req.DisplayName
			}

			if len(req.Aliases) > 0 {
				aliases := strings.Join(req.Aliases, ",")
				newTech.Aliases = aliases
			}

			if err := tx.Create(newTech).Error; err != nil {
				return fmt.Errorf("技術作成に失敗しました: %w", err)
			}

			result = append(result, newTech)
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("技術の一括作成に失敗しました: %w", err)
	}

	return result, nil
}

// GetDuplicateTechnologies 重複技術を検出
func (r *technologyMasterEnhancedRepository) GetDuplicateTechnologies(ctx context.Context) ([]TechnologyDuplicateGroup, error) {
	// 正規化した名前でグループ化して重複を検出
	var groups []TechnologyDuplicateGroup

	rows, err := r.db.WithContext(ctx).
		Raw(`
			SELECT 
				LOWER(TRIM(name)) as normalized_name,
				GROUP_CONCAT(id) as technology_ids
			FROM technology_master 
			WHERE is_active = true 
			GROUP BY LOWER(TRIM(name)), category 
			HAVING COUNT(*) > 1
		`).Rows()

	if err != nil {
		r.logger.Error("Failed to get duplicate technologies", zap.Error(err))
		return nil, fmt.Errorf("重複技術の検出に失敗しました: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var normalizedName, techIDsStr string
		if err := rows.Scan(&normalizedName, &techIDsStr); err != nil {
			continue
		}

		idStrs := strings.Split(techIDsStr, ",")
		var techs []*model.TechnologyMaster

		for _, idStr := range idStrs {
			if id, err := uuid.Parse(strings.TrimSpace(idStr)); err == nil {
				if tech, err := r.GetByID(ctx, id); err == nil && tech != nil {
					techs = append(techs, tech)
				}
			}
		}

		if len(techs) > 1 {
			groups = append(groups, TechnologyDuplicateGroup{
				NormalizedName: normalizedName,
				Technologies:   techs,
			})
		}
	}

	return groups, nil
}

// MergeTechnologies 技術をマージ（sourceをtargetに統合）
func (r *technologyMasterEnhancedRepository) MergeTechnologies(ctx context.Context, sourceID, targetID uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// source技術の情報を取得
		source, err := r.GetByID(ctx, sourceID)
		if err != nil || source == nil {
			return fmt.Errorf("マージ元技術が見つかりません")
		}

		target, err := r.GetByID(ctx, targetID)
		if err != nil || target == nil {
			return fmt.Errorf("マージ先技術が見つかりません")
		}

		// work_history_technologiesの参照を更新
		if err := tx.Model(&model.WorkHistoryTechnology{}).
			Where("technology_name = ?", source.Name).
			Update("technology_name", target.Name).Error; err != nil {
			return fmt.Errorf("職務経歴技術の更新に失敗しました: %w", err)
		}

		// target技術の使用回数を統合
		if err := tx.Model(target).
			Update("usage_count", gorm.Expr("usage_count + ?", source.UsageCount)).Error; err != nil {
			return fmt.Errorf("使用回数の統合に失敗しました: %w", err)
		}

		// source技術を無効化
		if err := tx.Model(source).Update("is_active", false).Error; err != nil {
			return fmt.Errorf("マージ元技術の無効化に失敗しました: %w", err)
		}

		return nil
	})
}

// UpdateSortOrder ソート順を一括更新
func (r *technologyMasterEnhancedRepository) UpdateSortOrder(ctx context.Context, updates []TechnologySortOrderUpdate) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, update := range updates {
			if err := tx.Model(&model.TechnologyMaster{}).
				Where("id = ?", update.ID).
				Update("sort_order", update.SortOrder).Error; err != nil {
				return fmt.Errorf("ソート順の更新に失敗しました: %w", err)
			}
		}
		return nil
	})
}
