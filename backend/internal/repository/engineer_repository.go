package repository

import (
	"context"
	"fmt"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// EngineerRepository エンジニアリポジトリのインターフェース
type EngineerRepository interface {
	// エンジニア情報の基本CRUD
	FindEngineers(ctx context.Context, filters EngineerFilters) ([]*model.User, int64, error)
	FindEngineerByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	CreateEngineer(ctx context.Context, user *model.User) error
	UpdateEngineer(ctx context.Context, user *model.User) error
	DeleteEngineer(ctx context.Context, id uuid.UUID) error

	// ステータス履歴
	CreateStatusHistory(ctx context.Context, history *model.EngineerStatusHistory) error
	FindStatusHistory(ctx context.Context, userID uuid.UUID) ([]*model.EngineerStatusHistory, error)

	// スキル情報
	FindSkillsByUserID(ctx context.Context, userID uuid.UUID) ([]*model.EngineerSkill, error)
	FindAllSkillCategories(ctx context.Context) ([]*model.EngineerSkillCategory, error)

	// プロジェクト履歴
	FindProjectHistoryByUserID(ctx context.Context, userID uuid.UUID) ([]*model.EngineerProjectHistory, error)
	UpdateProjectHistoryCurrent(ctx context.Context, userID uuid.UUID, projectID uuid.UUID) error

	// ユーティリティ
	ExistsByEmail(ctx context.Context, email string) (bool, error)
	ExistsByEmployeeNumber(ctx context.Context, employeeNumber string) (bool, error)
	GenerateEmployeeNumber(ctx context.Context) (string, error)
}

// EngineerFilters エンジニア検索フィルタ
type EngineerFilters struct {
	Page            int
	Limit           int
	Search          string
	Department      string
	Position        string
	Status          string
	Skills          []string
	SkillSearchType string // "and" or "or"
	Sort            string
	Order           string
	IncludeDeleted  bool
}

// engineerRepository エンジニアリポジトリの実装
type engineerRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewEngineerRepository エンジニアリポジトリのインスタンスを生成
func NewEngineerRepository(db *gorm.DB, logger *zap.Logger) EngineerRepository {
	return &engineerRepository{
		db:     db,
		logger: logger,
	}
}

// FindEngineers エンジニア一覧を取得
func (r *engineerRepository) FindEngineers(ctx context.Context, filters EngineerFilters) ([]*model.User, int64, error) {
	var users []*model.User
	var total int64

	query := r.db.WithContext(ctx).Model(&model.User{})

	// 削除済みを含めるかどうか
	if !filters.IncludeDeleted {
		query = query.Where("deleted_at IS NULL")
	}

	// 検索条件
	if filters.Search != "" {
		searchPattern := "%" + filters.Search + "%"
		query = query.Where(
			"(sei LIKE ? OR mei LIKE ? OR sei_kana LIKE ? OR mei_kana LIKE ? OR "+
				"CONCAT(sei, ' ', mei) LIKE ? OR CONCAT(sei_kana, ' ', mei_kana) LIKE ?)",
			searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	// 部署フィルタ
	if filters.Department != "" {
		query = query.Where("department = ?", filters.Department)
	}

	// 役職フィルタ
	if filters.Position != "" {
		query = query.Where("position = ?", filters.Position)
	}

	// ステータスフィルタ
	if filters.Status != "" {
		query = query.Where("engineer_status = ?", filters.Status)
	}

	// スキルフィルタ
	if len(filters.Skills) > 0 {
		skillQuery := r.db.Table("engineer_skills").
			Select("DISTINCT user_id").
			Where("skill_name IN ?", filters.Skills)

		if filters.SkillSearchType == "and" {
			skillQuery = skillQuery.
				Group("user_id").
				Having("COUNT(DISTINCT skill_name) = ?", len(filters.Skills))
		}

		query = query.Where("id IN (?)", skillQuery)
	}

	// 件数取得
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// ソート
	orderBy := "updated_at DESC" // デフォルト
	if filters.Sort != "" {
		sortField := filters.Sort
		switch sortField {
		case "name":
			sortField = "sei, mei"
		case "hire_date":
			sortField = "hire_date"
		case "status":
			sortField = "engineer_status"
		case "updated_at":
			sortField = "updated_at"
		}

		order := "DESC"
		if filters.Order == "asc" {
			order = "ASC"
		}
		orderBy = fmt.Sprintf("%s %s", sortField, order)
	}
	query = query.Order(orderBy)

	// ページネーション
	if filters.Limit > 0 {
		offset := (filters.Page - 1) * filters.Limit
		query = query.Limit(filters.Limit).Offset(offset)
	}

	// Preload
	query = query.Preload("UserRoles").
		Preload("DepartmentRelation")

	// データ取得
	if err := query.Find(&users).Error; err != nil {
		return nil, 0, err
	}

	// 現在のプロジェクト情報を取得
	for _, user := range users {
		var projectHistory model.EngineerProjectHistory
		if err := r.db.WithContext(ctx).
			Where("user_id = ? AND is_current = ?", user.ID, true).
			Preload("Project").
			Preload("Project.Client").
			First(&projectHistory).Error; err == nil {
			// プロジェクト情報を設定（必要に応じて）
		}
	}

	return users, total, nil
}

// FindEngineerByID IDでエンジニアを取得
func (r *engineerRepository) FindEngineerByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var user model.User

	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		Preload("UserRoles").
		Preload("DepartmentRelation").
		First(&user).Error

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// CreateEngineer エンジニアを作成
func (r *engineerRepository) CreateEngineer(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// UpdateEngineer エンジニア情報を更新
func (r *engineerRepository) UpdateEngineer(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// DeleteEngineer エンジニアを論理削除
func (r *engineerRepository) DeleteEngineer(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&model.User{}, id).Error
}

// CreateStatusHistory ステータス履歴を作成
func (r *engineerRepository) CreateStatusHistory(ctx context.Context, history *model.EngineerStatusHistory) error {
	return r.db.WithContext(ctx).Create(history).Error
}

// FindStatusHistory ステータス履歴を取得
func (r *engineerRepository) FindStatusHistory(ctx context.Context, userID uuid.UUID) ([]*model.EngineerStatusHistory, error) {
	var histories []*model.EngineerStatusHistory

	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("changed_at DESC").
		Preload("ChangedByUser").
		Find(&histories).Error

	return histories, err
}

// FindSkillsByUserID ユーザーのスキル情報を取得
func (r *engineerRepository) FindSkillsByUserID(ctx context.Context, userID uuid.UUID) ([]*model.EngineerSkill, error) {
	var skills []*model.EngineerSkill

	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Preload("SkillCategory").
		Find(&skills).Error

	return skills, err
}

// FindAllSkillCategories 全スキルカテゴリを取得
func (r *engineerRepository) FindAllSkillCategories(ctx context.Context) ([]*model.EngineerSkillCategory, error) {
	var categories []*model.EngineerSkillCategory

	err := r.db.WithContext(ctx).
		Order("sort_order, name").
		Find(&categories).Error

	return categories, err
}

// FindProjectHistoryByUserID ユーザーのプロジェクト履歴を取得
func (r *engineerRepository) FindProjectHistoryByUserID(ctx context.Context, userID uuid.UUID) ([]*model.EngineerProjectHistory, error) {
	var histories []*model.EngineerProjectHistory

	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("start_date DESC").
		Preload("Project").
		Preload("Project.Client").
		Find(&histories).Error

	return histories, err
}

// UpdateProjectHistoryCurrent 現在のプロジェクトを更新
func (r *engineerRepository) UpdateProjectHistoryCurrent(ctx context.Context, userID uuid.UUID, projectID uuid.UUID) error {
	// トランザクション内で実行
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 既存の現在プロジェクトをクリア
		if err := tx.Model(&model.EngineerProjectHistory{}).
			Where("user_id = ? AND is_current = ?", userID, true).
			Update("is_current", false).Error; err != nil {
			return err
		}

		// 指定されたプロジェクトを現在に設定
		if projectID != uuid.Nil {
			return tx.Model(&model.EngineerProjectHistory{}).
				Where("user_id = ? AND project_id = ?", userID, projectID).
				Update("is_current", true).Error
		}

		return nil
	})
}

// ExistsByEmail メールアドレスの存在確認
func (r *engineerRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("email = ?", email).
		Count(&count).Error
	return count > 0, err
}

// ExistsByEmployeeNumber 社員番号の存在確認
func (r *engineerRepository) ExistsByEmployeeNumber(ctx context.Context, employeeNumber string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("employee_number = ?", employeeNumber).
		Count(&count).Error
	return count > 0, err
}

// GenerateEmployeeNumber 社員番号を生成
func (r *engineerRepository) GenerateEmployeeNumber(ctx context.Context) (string, error) {
	var maxNumber string

	// 最大の社員番号を取得
	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("employee_number IS NOT NULL AND employee_number != ''").
		Order("employee_number DESC").
		Limit(1).
		Pluck("employee_number", &maxNumber).Error

	if err != nil && err != gorm.ErrRecordNotFound {
		return "", err
	}

	// 新しい番号を生成
	var newNumber int
	if maxNumber != "" {
		fmt.Sscanf(maxNumber, "%d", &newNumber)
	}
	newNumber++

	// 6桁の0埋め番号を生成
	return fmt.Sprintf("%06d", newNumber), nil
}
