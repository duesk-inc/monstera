package admin

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
)

// EngineerRepository エンジニア管理リポジトリインターフェース
type EngineerRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, user *model.User) error
	Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	FindAll(ctx context.Context, params EngineerListParams) ([]*model.User, int64, error)
	ExistsByEmail(ctx context.Context, email string) (bool, error)
	ExistsByEmployeeNumber(ctx context.Context, employeeNumber string) (bool, error)
	
	// ステータス履歴
	CreateStatusHistory(ctx context.Context, history *model.EngineerStatusHistory) error
	FindStatusHistoryByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]*model.EngineerStatusHistory, error)
	
	// スキル管理
	CreateSkill(ctx context.Context, skill *model.EngineerSkill) error
	UpdateSkill(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	DeleteSkill(ctx context.Context, id uuid.UUID) error
	FindSkillsByUserID(ctx context.Context, userID uuid.UUID) ([]*model.EngineerSkill, error)
	FindAllSkillCategories(ctx context.Context) ([]*model.EngineerSkillCategory, error)
	
	// プロジェクト履歴
	CreateProjectHistory(ctx context.Context, history *model.EngineerProjectHistory) error
	UpdateProjectHistory(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	FindProjectHistoryByUserID(ctx context.Context, userID uuid.UUID) ([]*model.EngineerProjectHistory, error)
	UpdateCurrentProjectStatus(ctx context.Context, userID uuid.UUID, projectID uuid.UUID) error
	
	// 社員番号採番
	GenerateEmployeeNumber(ctx context.Context) (string, error)
	
	// バッチ処理用
	FindEngineersWithEndedProjects(ctx context.Context) ([]*model.User, error)
}

// EngineerListParams エンジニア一覧取得パラメータ
type EngineerListParams struct {
	Page             int
	Limit            int
	Search           string
	Department       string
	Position         string
	Status           string
	Skills           []string
	SkillSearchType  string // "and" or "or"
	Sort             string
	Order            string
}

type engineerRepository struct {
	db *gorm.DB
}

// NewEngineerRepository リポジトリコンストラクタ
func NewEngineerRepository(db *gorm.DB) EngineerRepository {
	return &engineerRepository{db: db}
}

// Create エンジニア新規登録
func (r *engineerRepository) Create(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// Update エンジニア情報更新
func (r *engineerRepository) Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", id).Updates(updates).Error
}

// Delete エンジニア削除（論理削除）
func (r *engineerRepository) Delete(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", id).Update("deleted_at", now).Error
}

// FindByID ID指定でエンジニア取得
func (r *engineerRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindAll エンジニア一覧取得
func (r *engineerRepository) FindAll(ctx context.Context, params EngineerListParams) ([]*model.User, int64, error) {
	var users []*model.User
	var count int64

	query := r.db.WithContext(ctx).Model(&model.User{}).Where("deleted_at IS NULL")

	// 検索条件
	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where(
			"CONCAT(COALESCE(sei, ''), COALESCE(mei, '')) LIKE ? OR CONCAT(COALESCE(sei_kana, ''), COALESCE(mei_kana, '')) LIKE ? OR email LIKE ? OR employee_number LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	if params.Department != "" {
		query = query.Where("department = ?", params.Department)
	}

	if params.Position != "" {
		query = query.Where("position = ?", params.Position)
	}

	if params.Status != "" {
		query = query.Where("engineer_status = ?", params.Status)
	}

	// スキル検索
	if len(params.Skills) > 0 {
		subQuery := r.db.Table("engineer_skills").
			Select("user_id").
			Where("skill_name IN ?", params.Skills).
			Group("user_id")

		if params.SkillSearchType == "and" {
			subQuery = subQuery.Having("COUNT(DISTINCT skill_name) = ?", len(params.Skills))
		}

		query = query.Where("id IN (?)", subQuery)
	}

	// カウント取得
	if err := query.Count(&count).Error; err != nil {
		return nil, 0, err
	}

	// ソート
	orderBy := "updated_at DESC" // デフォルト
	if params.Sort != "" {
		switch params.Sort {
		case "name":
			orderBy = "sei, mei"
		case "hire_date":
			orderBy = "hire_date"
		case "status":
			orderBy = "engineer_status"
		case "updated_at":
			orderBy = "updated_at"
		}

		if params.Order == "asc" {
			orderBy += " ASC"
		} else {
			orderBy += " DESC"
		}
	}
	query = query.Order(orderBy)

	// ページング
	if params.Limit > 0 {
		offset := (params.Page - 1) * params.Limit
		query = query.Limit(params.Limit).Offset(offset)
	}

	if err := query.Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, count, nil
}

// ExistsByEmail メールアドレスの存在チェック
func (r *engineerRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.User{}).
		Where("email = ? AND deleted_at IS NULL", email).
		Count(&count).Error
	return count > 0, err
}

// ExistsByEmployeeNumber 社員番号の存在チェック
func (r *engineerRepository) ExistsByEmployeeNumber(ctx context.Context, employeeNumber string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.User{}).
		Where("employee_number = ? AND deleted_at IS NULL", employeeNumber).
		Count(&count).Error
	return count > 0, err
}

// CreateStatusHistory ステータス履歴作成
func (r *engineerRepository) CreateStatusHistory(ctx context.Context, history *model.EngineerStatusHistory) error {
	return r.db.WithContext(ctx).Create(history).Error
}

// FindStatusHistoryByUserID ユーザーIDでステータス履歴取得
func (r *engineerRepository) FindStatusHistoryByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]*model.EngineerStatusHistory, error) {
	var histories []*model.EngineerStatusHistory
	query := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("changed_at DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&histories).Error
	return histories, err
}

// CreateSkill スキル登録
func (r *engineerRepository) CreateSkill(ctx context.Context, skill *model.EngineerSkill) error {
	return r.db.WithContext(ctx).Create(skill).Error
}

// UpdateSkill スキル更新
func (r *engineerRepository) UpdateSkill(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(&model.EngineerSkill{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteSkill スキル削除
func (r *engineerRepository) DeleteSkill(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&model.EngineerSkill{}, "id = ?", id).Error
}

// FindSkillsByUserID ユーザーIDでスキル取得
func (r *engineerRepository) FindSkillsByUserID(ctx context.Context, userID uuid.UUID) ([]*model.EngineerSkill, error) {
	var skills []*model.EngineerSkill
	err := r.db.WithContext(ctx).
		Preload("SkillCategory").
		Where("user_id = ?", userID).
		Order("skill_category_id, skill_name").
		Find(&skills).Error
	return skills, err
}

// FindAllSkillCategories スキルカテゴリ一覧取得
func (r *engineerRepository) FindAllSkillCategories(ctx context.Context) ([]*model.EngineerSkillCategory, error) {
	var categories []*model.EngineerSkillCategory
	err := r.db.WithContext(ctx).
		Where("parent_id IS NULL").
		Order("sort_order, name").
		Find(&categories).Error
	return categories, err
}

// CreateProjectHistory プロジェクト履歴作成
func (r *engineerRepository) CreateProjectHistory(ctx context.Context, history *model.EngineerProjectHistory) error {
	return r.db.WithContext(ctx).Create(history).Error
}

// UpdateProjectHistory プロジェクト履歴更新
func (r *engineerRepository) UpdateProjectHistory(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(&model.EngineerProjectHistory{}).Where("id = ?", id).Updates(updates).Error
}

// FindProjectHistoryByUserID ユーザーIDでプロジェクト履歴取得
func (r *engineerRepository) FindProjectHistoryByUserID(ctx context.Context, userID uuid.UUID) ([]*model.EngineerProjectHistory, error) {
	var histories []*model.EngineerProjectHistory
	err := r.db.WithContext(ctx).
		Preload("Project").
		Preload("Project.Client").
		Where("user_id = ?", userID).
		Order("start_date DESC").
		Find(&histories).Error
	return histories, err
}

// UpdateCurrentProjectStatus 現在のプロジェクト参画状態を更新
func (r *engineerRepository) UpdateCurrentProjectStatus(ctx context.Context, userID uuid.UUID, projectID uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 既存の現在参画中フラグをすべてfalseに
		if err := tx.Model(&model.EngineerProjectHistory{}).
			Where("user_id = ? AND is_current = true", userID).
			Update("is_current", false).Error; err != nil {
			return err
		}
		
		// 指定されたプロジェクトを現在参画中に
		if projectID != uuid.Nil {
			if err := tx.Model(&model.EngineerProjectHistory{}).
				Where("user_id = ? AND project_id = ?", userID, projectID).
				Update("is_current", true).Error; err != nil {
				return err
			}
		}
		
		return nil
	})
}

// GenerateEmployeeNumber 社員番号自動採番
func (r *engineerRepository) GenerateEmployeeNumber(ctx context.Context) (string, error) {
	var maxNumber string
	err := r.db.WithContext(ctx).Model(&model.User{}).
		Where("employee_number IS NOT NULL AND employee_number REGEXP '^[0-9]{6}$'").
		Order("employee_number DESC").
		Limit(1).
		Pluck("employee_number", &maxNumber).Error
	
	if err != nil && err != gorm.ErrRecordNotFound {
		return "", err
	}
	
	// 次の番号を生成
	nextNumber := 1
	if maxNumber != "" {
		fmt.Sscanf(maxNumber, "%d", &nextNumber)
		nextNumber++
	}
	
	return fmt.Sprintf("%06d", nextNumber), nil
}

// FindEngineersWithEndedProjects 終了したプロジェクトのエンジニアを取得
func (r *engineerRepository) FindEngineersWithEndedProjects(ctx context.Context) ([]*model.User, error) {
	var users []*model.User
	
	// 現在参画中プロジェクトが終了したエンジニアを取得
	subQuery := r.db.Table("engineer_project_history").
		Select("user_id").
		Where("is_current = true AND end_date IS NOT NULL AND end_date <= ?", time.Now()).
		Group("user_id")
	
	err := r.db.WithContext(ctx).
		Where("id IN (?) AND engineer_status = ?", subQuery, model.EngineerStatusActive).
		Find(&users).Error
	
	return users, err
}