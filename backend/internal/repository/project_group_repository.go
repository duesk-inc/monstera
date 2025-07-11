package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
)

// ProjectGroupRepositoryInterface プロジェクトグループリポジトリインターフェース
type ProjectGroupRepositoryInterface interface {
	// プロジェクトグループCRUD
	Create(ctx context.Context, group *model.ProjectGroup) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.ProjectGroup, error)
	GetByIDWithDetails(ctx context.Context, id uuid.UUID) (*model.ProjectGroup, error)
	Update(ctx context.Context, group *model.ProjectGroup) error
	Delete(ctx context.Context, id uuid.UUID) error

	// プロジェクトグループ検索
	List(ctx context.Context, clientID *uuid.UUID, limit, offset int) ([]*model.ProjectGroup, error)
	ListWithStats(ctx context.Context, clientID *uuid.UUID, limit, offset int) ([]*model.ProjectGroupWithProjects, error)
	Count(ctx context.Context, clientID *uuid.UUID) (int64, error)
	Search(ctx context.Context, query string, clientID *uuid.UUID, limit, offset int) ([]*model.ProjectGroup, error)

	// プロジェクトマッピング管理
	AddProjects(ctx context.Context, groupID uuid.UUID, projectIDs []uuid.UUID) error
	RemoveProjects(ctx context.Context, groupID uuid.UUID, projectIDs []uuid.UUID) error
	GetProjectsByGroupID(ctx context.Context, groupID uuid.UUID) ([]*model.Project, error)
	GetGroupsByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.ProjectGroup, error)

	// 統計情報
	GetStats(ctx context.Context, clientID *uuid.UUID) (*model.ProjectGroupStats, error)
	GetGroupRevenue(ctx context.Context, groupID uuid.UUID, startDate, endDate string) (float64, error)

	// バリデーション
	ExistsByID(ctx context.Context, id uuid.UUID) (bool, error)
	ExistsByName(ctx context.Context, name string, clientID uuid.UUID, excludeID *uuid.UUID) (bool, error)
	CanAddProjects(ctx context.Context, groupID uuid.UUID, projectIDs []uuid.UUID) error
}

// projectGroupRepository プロジェクトグループリポジトリ実装
type projectGroupRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewProjectGroupRepository プロジェクトグループリポジトリのコンストラクタ
func NewProjectGroupRepository(db *gorm.DB, logger *zap.Logger) ProjectGroupRepositoryInterface {
	return &projectGroupRepository{
		db:     db,
		logger: logger,
	}
}

// Create プロジェクトグループを作成
func (r *projectGroupRepository) Create(ctx context.Context, group *model.ProjectGroup) error {
	if err := r.db.WithContext(ctx).Create(group).Error; err != nil {
		r.logger.Error("Failed to create project group", zap.Error(err))
		return fmt.Errorf("プロジェクトグループの作成に失敗しました: %w", err)
	}
	return nil
}

// GetByID IDでプロジェクトグループを取得
func (r *projectGroupRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ProjectGroup, error) {
	var group model.ProjectGroup
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&group).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get project group by ID", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("プロジェクトグループの取得に失敗しました: %w", err)
	}

	return &group, nil
}

// GetByIDWithDetails 詳細情報付きでプロジェクトグループを取得
func (r *projectGroupRepository) GetByIDWithDetails(ctx context.Context, id uuid.UUID) (*model.ProjectGroup, error) {
	var group model.ProjectGroup
	err := r.db.WithContext(ctx).
		Preload("Client").
		Preload("Creator").
		Preload("Projects", "deleted_at IS NULL").
		Preload("Projects.Assignments", "deleted_at IS NULL").
		Preload("Invoices", "deleted_at IS NULL").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&group).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get project group with details", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("プロジェクトグループの詳細取得に失敗しました: %w", err)
	}

	return &group, nil
}

// Update プロジェクトグループを更新
func (r *projectGroupRepository) Update(ctx context.Context, group *model.ProjectGroup) error {
	result := r.db.WithContext(ctx).
		Model(group).
		Where("id = ? AND deleted_at IS NULL", group.ID).
		Updates(group)

	if result.Error != nil {
		r.logger.Error("Failed to update project group", zap.Error(result.Error), zap.String("id", group.ID.String()))
		return fmt.Errorf("プロジェクトグループの更新に失敗しました: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("プロジェクトグループが見つかりません")
	}

	return nil
}

// Delete プロジェクトグループを論理削除
func (r *projectGroupRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&model.ProjectGroup{})

	if result.Error != nil {
		r.logger.Error("Failed to delete project group", zap.Error(result.Error), zap.String("id", id.String()))
		return fmt.Errorf("プロジェクトグループの削除に失敗しました: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("プロジェクトグループが見つかりません")
	}

	return nil
}

// List プロジェクトグループ一覧を取得
func (r *projectGroupRepository) List(ctx context.Context, clientID *uuid.UUID, limit, offset int) ([]*model.ProjectGroup, error) {
	var groups []*model.ProjectGroup
	query := r.db.WithContext(ctx).
		Preload("Client").
		Where("deleted_at IS NULL")

	if clientID != nil {
		query = query.Where("client_id = ?", *clientID)
	}

	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&groups).Error

	if err != nil {
		r.logger.Error("Failed to list project groups", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループ一覧の取得に失敗しました: %w", err)
	}

	return groups, nil
}

// ListWithStats 統計情報付きでプロジェクトグループ一覧を取得
func (r *projectGroupRepository) ListWithStats(ctx context.Context, clientID *uuid.UUID, limit, offset int) ([]*model.ProjectGroupWithProjects, error) {
	var groups []*model.ProjectGroup
	query := r.db.WithContext(ctx).
		Preload("Client").
		Preload("Projects", "deleted_at IS NULL").
		Preload("Invoices", "deleted_at IS NULL").
		Where("deleted_at IS NULL")

	if clientID != nil {
		query = query.Where("client_id = ?", *clientID)
	}

	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&groups).Error

	if err != nil {
		r.logger.Error("Failed to list project groups with stats", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループ統計の取得に失敗しました: %w", err)
	}

	// 統計情報を計算
	var result []*model.ProjectGroupWithProjects
	for _, group := range groups {
		stats := &model.ProjectGroupWithProjects{
			ProjectGroup: *group,
			ProjectCount: len(group.Projects),
		}

		// プロジェクト情報を計算
		for _, project := range group.Projects {
			stats.TotalRevenue += project.MonthlyRate
		}

		// 最新の請求日を取得
		for _, invoice := range group.Invoices {
			if stats.LastInvoiceDate == nil || invoice.InvoiceDate.After(*stats.LastInvoiceDate) {
				stats.LastInvoiceDate = &invoice.InvoiceDate
			}
		}

		result = append(result, stats)
	}

	return result, nil
}

// Count プロジェクトグループ数を取得
func (r *projectGroupRepository) Count(ctx context.Context, clientID *uuid.UUID) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).
		Model(&model.ProjectGroup{}).
		Where("deleted_at IS NULL")

	if clientID != nil {
		query = query.Where("client_id = ?", *clientID)
	}

	err := query.Count(&count).Error
	if err != nil {
		r.logger.Error("Failed to count project groups", zap.Error(err))
		return 0, fmt.Errorf("プロジェクトグループ数の取得に失敗しました: %w", err)
	}

	return count, nil
}

// Search プロジェクトグループを検索
func (r *projectGroupRepository) Search(ctx context.Context, query string, clientID *uuid.UUID, limit, offset int) ([]*model.ProjectGroup, error) {
	var groups []*model.ProjectGroup
	db := r.db.WithContext(ctx).
		Preload("Client").
		Where("deleted_at IS NULL")

	if clientID != nil {
		db = db.Where("client_id = ?", *clientID)
	}

	if query != "" {
		searchQuery := "%" + query + "%"
		db = db.Where("group_name LIKE ? OR description LIKE ?", searchQuery, searchQuery)
	}

	err := db.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&groups).Error

	if err != nil {
		r.logger.Error("Failed to search project groups", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループの検索に失敗しました: %w", err)
	}

	return groups, nil
}

// AddProjects プロジェクトをグループに追加
func (r *projectGroupRepository) AddProjects(ctx context.Context, groupID uuid.UUID, projectIDs []uuid.UUID) error {
	// トランザクション内で処理
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// グループの存在確認
		var group model.ProjectGroup
		if err := tx.Where("id = ? AND deleted_at IS NULL", groupID).First(&group).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("プロジェクトグループが見つかりません")
			}
			return fmt.Errorf("プロジェクトグループの確認に失敗しました: %w", err)
		}

		// プロジェクトの追加
		for _, projectID := range projectIDs {
			// 既存のマッピングを確認
			var count int64
			err := tx.Model(&model.ProjectGroupMapping{}).
				Where("project_group_id = ? AND project_id = ?", groupID, projectID).
				Count(&count).Error
			if err != nil {
				return fmt.Errorf("マッピングの確認に失敗しました: %w", err)
			}

			// 既に存在する場合はスキップ
			if count > 0 {
				continue
			}

			// 新規マッピングを作成
			mapping := &model.ProjectGroupMapping{
				ProjectGroupID: groupID,
				ProjectID:      projectID,
			}
			if err := tx.Create(mapping).Error; err != nil {
				return fmt.Errorf("プロジェクトの追加に失敗しました: %w", err)
			}
		}

		return nil
	})
}

// RemoveProjects プロジェクトをグループから削除
func (r *projectGroupRepository) RemoveProjects(ctx context.Context, groupID uuid.UUID, projectIDs []uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("project_group_id = ? AND project_id IN ?", groupID, projectIDs).
		Delete(&model.ProjectGroupMapping{})

	if result.Error != nil {
		r.logger.Error("Failed to remove projects from group", zap.Error(result.Error))
		return fmt.Errorf("プロジェクトの削除に失敗しました: %w", result.Error)
	}

	return nil
}

// GetProjectsByGroupID グループIDでプロジェクトを取得
func (r *projectGroupRepository) GetProjectsByGroupID(ctx context.Context, groupID uuid.UUID) ([]*model.Project, error) {
	var projects []*model.Project
	err := r.db.WithContext(ctx).
		Joins("JOIN project_group_mappings ON projects.id = project_group_mappings.project_id").
		Where("project_group_mappings.project_group_id = ? AND projects.deleted_at IS NULL", groupID).
		Preload("Client").
		Find(&projects).Error

	if err != nil {
		r.logger.Error("Failed to get projects by group ID", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトの取得に失敗しました: %w", err)
	}

	return projects, nil
}

// GetGroupsByProjectID プロジェクトIDでグループを取得
func (r *projectGroupRepository) GetGroupsByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.ProjectGroup, error) {
	var groups []*model.ProjectGroup
	err := r.db.WithContext(ctx).
		Joins("JOIN project_group_mappings ON project_groups.id = project_group_mappings.project_group_id").
		Where("project_group_mappings.project_id = ? AND project_groups.deleted_at IS NULL", projectID).
		Preload("Client").
		Find(&groups).Error

	if err != nil {
		r.logger.Error("Failed to get groups by project ID", zap.Error(err))
		return nil, fmt.Errorf("グループの取得に失敗しました: %w", err)
	}

	return groups, nil
}

// GetStats 統計情報を取得
func (r *projectGroupRepository) GetStats(ctx context.Context, clientID *uuid.UUID) (*model.ProjectGroupStats, error) {
	stats := &model.ProjectGroupStats{}

	// 基本クエリ
	baseQuery := r.db.WithContext(ctx).
		Model(&model.ProjectGroup{}).
		Where("deleted_at IS NULL")

	if clientID != nil {
		baseQuery = baseQuery.Where("client_id = ?", *clientID)
	}

	// 総グループ数
	var totalCount int64
	if err := baseQuery.Count(&totalCount).Error; err != nil {
		return nil, fmt.Errorf("グループ数の取得に失敗しました: %w", err)
	}
	stats.TotalGroups = int(totalCount)

	// アクティブグループ数（プロジェクトが存在するグループ）
	var activeCount int64
	err := r.db.WithContext(ctx).
		Model(&model.ProjectGroup{}).
		Joins("JOIN project_group_mappings ON project_groups.id = project_group_mappings.project_group_id").
		Where("project_groups.deleted_at IS NULL").
		Distinct("project_groups.id").
		Count(&activeCount).Error
	if err != nil {
		return nil, fmt.Errorf("アクティブグループ数の取得に失敗しました: %w", err)
	}
	stats.ActiveGroups = int(activeCount)

	// プロジェクト数と収益
	type projectStats struct {
		Count   int64
		Revenue float64
	}
	var pStats projectStats

	projectQuery := r.db.WithContext(ctx).
		Model(&model.Project{}).
		Select("COUNT(DISTINCT projects.id) as count, COALESCE(SUM(projects.monthly_rate), 0) as revenue").
		Joins("JOIN project_group_mappings ON projects.id = project_group_mappings.project_id").
		Joins("JOIN project_groups ON project_group_mappings.project_group_id = project_groups.id").
		Where("projects.deleted_at IS NULL AND project_groups.deleted_at IS NULL")

	if clientID != nil {
		projectQuery = projectQuery.Where("project_groups.client_id = ?", *clientID)
	}

	err = projectQuery.Scan(&pStats).Error
	if err != nil {
		return nil, fmt.Errorf("プロジェクト統計の取得に失敗しました: %w", err)
	}

	stats.TotalProjects = int(pStats.Count)
	stats.TotalRevenue = pStats.Revenue

	// 平均収益
	if stats.ActiveGroups > 0 {
		stats.AverageRevenue = stats.TotalRevenue / float64(stats.ActiveGroups)
	}

	return stats, nil
}

// GetGroupRevenue グループの収益を取得
func (r *projectGroupRepository) GetGroupRevenue(ctx context.Context, groupID uuid.UUID, startDate, endDate string) (float64, error) {
	var revenue float64

	query := r.db.WithContext(ctx).
		Model(&model.Invoice{}).
		Select("COALESCE(SUM(total_amount), 0)").
		Where("project_group_id = ? AND deleted_at IS NULL", groupID)

	if startDate != "" && endDate != "" {
		query = query.Where("billing_month BETWEEN ? AND ?", startDate, endDate)
	}

	err := query.Scan(&revenue).Error
	if err != nil {
		r.logger.Error("Failed to get group revenue", zap.Error(err))
		return 0, fmt.Errorf("グループ収益の取得に失敗しました: %w", err)
	}

	return revenue, nil
}

// ExistsByID IDでプロジェクトグループの存在を確認
func (r *projectGroupRepository) ExistsByID(ctx context.Context, id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ProjectGroup{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to check project group existence", zap.Error(err))
		return false, fmt.Errorf("プロジェクトグループの確認に失敗しました: %w", err)
	}

	return count > 0, nil
}

// ExistsByName 名前でプロジェクトグループの存在を確認
func (r *projectGroupRepository) ExistsByName(ctx context.Context, name string, clientID uuid.UUID, excludeID *uuid.UUID) (bool, error) {
	var count int64
	query := r.db.WithContext(ctx).
		Model(&model.ProjectGroup{}).
		Where("group_name = ? AND client_id = ? AND deleted_at IS NULL", name, clientID)

	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}

	err := query.Count(&count).Error
	if err != nil {
		r.logger.Error("Failed to check project group name existence", zap.Error(err))
		return false, fmt.Errorf("プロジェクトグループ名の確認に失敗しました: %w", err)
	}

	return count > 0, nil
}

// CanAddProjects プロジェクトを追加可能か確認
func (r *projectGroupRepository) CanAddProjects(ctx context.Context, groupID uuid.UUID, projectIDs []uuid.UUID) error {
	// グループの存在確認
	var group model.ProjectGroup
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", groupID).
		First(&group).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("プロジェクトグループが見つかりません")
		}
		return fmt.Errorf("プロジェクトグループの確認に失敗しました: %w", err)
	}

	// プロジェクトが同じクライアントに属しているか確認
	var count int64
	err = r.db.WithContext(ctx).
		Model(&model.Project{}).
		Where("id IN ? AND client_id = ? AND deleted_at IS NULL", projectIDs, group.ClientID).
		Count(&count).Error

	if err != nil {
		return fmt.Errorf("プロジェクトの確認に失敗しました: %w", err)
	}

	if int(count) != len(projectIDs) {
		return fmt.Errorf("一部のプロジェクトが同じクライアントに属していません")
	}

	// 既に他のグループに属していないか確認
	var existingCount int64
	err = r.db.WithContext(ctx).
		Model(&model.ProjectGroupMapping{}).
		Joins("JOIN project_groups ON project_group_mappings.project_group_id = project_groups.id").
		Where("project_group_mappings.project_id IN ? AND project_groups.deleted_at IS NULL", projectIDs).
		Count(&existingCount).Error

	if err != nil {
		return fmt.Errorf("既存マッピングの確認に失敗しました: %w", err)
	}

	if existingCount > 0 {
		return fmt.Errorf("一部のプロジェクトは既に他のグループに属しています")
	}

	return nil
}
