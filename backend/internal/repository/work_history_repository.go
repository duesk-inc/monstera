package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WorkHistoryRepository 職務経歴リポジトリのインターフェース
type WorkHistoryRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, workHistory *model.WorkHistory) error
	Update(ctx context.Context, workHistory *model.WorkHistory) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*model.WorkHistory, error)
	GetByUserID(ctx context.Context, userID string) ([]*model.WorkHistory, error)

	// 拡張機能
	GetWithTechnologies(ctx context.Context, id string) (*model.WorkHistory, error)
	GetByUserIDWithTechnologies(ctx context.Context, userID string) ([]*model.WorkHistory, error)
	GetUserSummary(ctx context.Context, userID string) (*dto.WorkHistorySummaryResponse, error)
	GetUserTechnologySkills(ctx context.Context, userID string) ([]dto.TechnologySkillExperienceResponse, error)

	// 検索・フィルタ機能
	Search(ctx context.Context, req dto.WorkHistoryQueryRequest) ([]*model.WorkHistory, int64, error)
	GetByTechnologyName(ctx context.Context, technologyName string) ([]*model.WorkHistory, error)
	GetByIndustry(ctx context.Context, industry string) ([]*model.WorkHistory, error)
	GetByDateRange(ctx context.Context, userID string, startDate, endDate time.Time) ([]*model.WorkHistory, error)

	// 統計機能
	CalculateITExperience(ctx context.Context, userID string) (int32, error)
	CalculateTechnologySkills(ctx context.Context, userID string) (map[string]int32, error)
	GetProjectCount(ctx context.Context, userID string) (int32, error)
	GetActiveProjectCount(ctx context.Context, userID string) (int32, error)

	// 一括操作
	BulkCreate(ctx context.Context, workHistories []*model.WorkHistory) error
	BulkUpdate(ctx context.Context, workHistories []*model.WorkHistory) error
	BulkDelete(ctx context.Context, ids []string) error

	// トランザクション操作
	CreateWithTechnologies(ctx context.Context, workHistory *model.WorkHistory, technologies []model.WorkHistoryTechnology) error
	UpdateWithTechnologies(ctx context.Context, workHistory *model.WorkHistory, technologies []model.WorkHistoryTechnology) error
}

// workHistoryRepository 職務経歴リポジトリの実装
type workHistoryRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewWorkHistoryRepository 職務経歴リポジトリのコンストラクタ
func NewWorkHistoryRepository(db *gorm.DB, logger *zap.Logger) WorkHistoryRepository {
	return &workHistoryRepository{
		db:     db,
		logger: logger,
	}
}

// Create 職務経歴を作成
func (r *workHistoryRepository) Create(ctx context.Context, workHistory *model.WorkHistory) error {
	if err := r.db.WithContext(ctx).Create(workHistory).Error; err != nil {
		r.logger.Error("Failed to create work history", zap.Error(err))
		return fmt.Errorf("職務経歴の作成に失敗しました: %w", err)
	}
	return nil
}

// Update 職務経歴を更新
func (r *workHistoryRepository) Update(ctx context.Context, workHistory *model.WorkHistory) error {
	if err := r.db.WithContext(ctx).Save(workHistory).Error; err != nil {
		r.logger.Error("Failed to update work history", zap.Error(err))
		return fmt.Errorf("職務経歴の更新に失敗しました: %w", err)
	}
	return nil
}

// Delete 職務経歴を削除（論理削除）
func (r *workHistoryRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.WorkHistory{}, id).Error; err != nil {
		r.logger.Error("Failed to delete work history", zap.Error(err))
		return fmt.Errorf("職務経歴の削除に失敗しました: %w", err)
	}
	return nil
}

// GetByID IDで職務経歴を取得
func (r *workHistoryRepository) GetByID(ctx context.Context, id string) (*model.WorkHistory, error) {
	var workHistory model.WorkHistory
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&workHistory).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get work history by ID", zap.Error(err))
		return nil, fmt.Errorf("職務経歴の取得に失敗しました: %w", err)
	}
	return &workHistory, nil
}

// GetByUserID ユーザーIDで職務経歴一覧を取得
func (r *workHistoryRepository) GetByUserID(ctx context.Context, userID string) ([]*model.WorkHistory, error) {
	var workHistories []*model.WorkHistory
	if err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("start_date DESC").
		Find(&workHistories).Error; err != nil {
		r.logger.Error("Failed to get work histories by user ID", zap.Error(err))
		return nil, fmt.Errorf("職務経歴一覧の取得に失敗しました: %w", err)
	}
	return workHistories, nil
}

// GetWithTechnologies 技術情報を含めて職務経歴を取得
func (r *workHistoryRepository) GetWithTechnologies(ctx context.Context, id string) (*model.WorkHistory, error) {
	var workHistory model.WorkHistory
	if err := r.db.WithContext(ctx).
		Preload("TechnologyItems").
		Preload("TechnologyItems.Category").
		Where("id = ?", id).
		First(&workHistory).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get work history with technologies", zap.Error(err))
		return nil, fmt.Errorf("技術情報を含む職務経歴の取得に失敗しました: %w", err)
	}
	return &workHistory, nil
}

// GetByUserIDWithTechnologies 技術情報を含めてユーザーの職務経歴一覧を取得
func (r *workHistoryRepository) GetByUserIDWithTechnologies(ctx context.Context, userID string) ([]*model.WorkHistory, error) {
	var workHistories []*model.WorkHistory
	if err := r.db.WithContext(ctx).
		Preload("TechnologyItems").
		Preload("TechnologyItems.Category").
		Where("user_id = ?", userID).
		Order("start_date DESC").
		Find(&workHistories).Error; err != nil {
		r.logger.Error("Failed to get work histories with technologies", zap.Error(err))
		return nil, fmt.Errorf("技術情報を含む職務経歴一覧の取得に失敗しました: %w", err)
	}
	return workHistories, nil
}

// GetUserSummary ユーザーの職務経歴サマリーを取得（ビューから）
func (r *workHistoryRepository) GetUserSummary(ctx context.Context, userID string) (*dto.WorkHistorySummaryResponse, error) {
	// user_it_experienceビューからデータを取得
	var itExperience struct {
		UserID                  string     `gorm:"column:user_id"`
		TotalITExperienceMonths int32      `gorm:"column:total_it_experience_months"`
		ITExperienceYears       int32      `gorm:"column:it_experience_years"`
		ITExperienceMonths      int32      `gorm:"column:it_experience_months"`
		ITExperienceText        string     `gorm:"column:it_experience_text"`
		ITExperienceLevel       string     `gorm:"column:it_experience_level"`
		TotalProjectCount       int32      `gorm:"column:total_project_count"`
		ActiveProjectCount      int32      `gorm:"column:active_project_count"`
		FirstProjectDate        *time.Time `gorm:"column:first_project_date"`
		LastProjectDate         *time.Time `gorm:"column:last_project_date"`
		LatestProjectName       *string    `gorm:"column:latest_project_name"`
		LatestRole              *string    `gorm:"column:latest_role"`
	}

	if err := r.db.WithContext(ctx).
		Table("user_it_experience").
		Where("user_id = ?", userID).
		First(&itExperience).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// ビューにデータがない場合は空のサマリーを返す
			return &dto.WorkHistorySummaryResponse{
				UserID:                  userID,
				TotalITExperienceMonths: 0,
				ITExperienceYears:       0,
				ITExperienceMonths:      0,
				ITExperienceText:        "0年",
				ITExperienceLevel:       "初級",
				TotalProjectCount:       0,
				ActiveProjectCount:      0,
				TotalTechnologyCount:    0,
				RecentTechnologyCount:   0,
				TopTechnologies:         []string{},
				CalculatedAt:            time.Now(),
			}, nil
		}
		r.logger.Error("Failed to get user IT experience", zap.Error(err))
		return nil, fmt.Errorf("ユーザーIT経験情報の取得に失敗しました: %w", err)
	}

	// user_skill_summaryビューから技術統計を取得
	var skillSummary struct {
		TotalTechnologyCount  int32  `gorm:"column:total_technology_count"`
		RecentTechnologyCount int32  `gorm:"column:recent_technology_count"`
		TopTechnologies       string `gorm:"column:top_technologies"` // カンマ区切り
	}

	if err := r.db.WithContext(ctx).
		Table("user_skill_summary").
		Where("user_id = ?", userID).
		First(&skillSummary).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			r.logger.Error("Failed to get user skill summary", zap.Error(err))
		}
		// エラーでも技術統計は空として継続
		skillSummary.TotalTechnologyCount = 0
		skillSummary.RecentTechnologyCount = 0
		skillSummary.TopTechnologies = ""
	}

	// ユーザー情報を取得
	var user model.User
	if err := r.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		r.logger.Error("Failed to get user info", zap.Error(err))
	}

	// TopTechnologiesを配列に変換
	var topTechnologies []string
	if skillSummary.TopTechnologies != "" {
		topTechnologies = model.SplitCSV(skillSummary.TopTechnologies)
	}

	return &dto.WorkHistorySummaryResponse{
		UserID:                  itExperience.UserID,
		UserName:                user.Name,
		UserEmail:               user.Email,
		TotalITExperienceMonths: itExperience.TotalITExperienceMonths,
		ITExperienceYears:       itExperience.ITExperienceYears,
		ITExperienceMonths:      itExperience.ITExperienceMonths,
		ITExperienceText:        itExperience.ITExperienceText,
		ITExperienceLevel:       itExperience.ITExperienceLevel,
		TotalProjectCount:       itExperience.TotalProjectCount,
		ActiveProjectCount:      itExperience.ActiveProjectCount,
		FirstProjectDate:        itExperience.FirstProjectDate,
		LastProjectDate:         itExperience.LastProjectDate,
		LatestProjectName:       itExperience.LatestProjectName,
		LatestRole:              itExperience.LatestRole,
		TotalTechnologyCount:    skillSummary.TotalTechnologyCount,
		RecentTechnologyCount:   skillSummary.RecentTechnologyCount,
		TopTechnologies:         topTechnologies,
		CalculatedAt:            time.Now(),
	}, nil
}

// GetUserTechnologySkills ユーザーの技術スキル一覧を取得（ビューから）
func (r *workHistoryRepository) GetUserTechnologySkills(ctx context.Context, userID string) ([]dto.TechnologySkillExperienceResponse, error) {
	var skills []struct {
		TechnologyName        string    `gorm:"column:technology_name"`
		TechnologyDisplayName *string   `gorm:"column:technology_display_name"`
		CategoryName          string    `gorm:"column:category_name"`
		CategoryDisplayName   string    `gorm:"column:category_display_name"`
		TotalExperienceMonths int32     `gorm:"column:total_experience_months"`
		ExperienceYears       int32     `gorm:"column:experience_years"`
		ExperienceMonths      int32     `gorm:"column:experience_months"`
		ExperienceText        string    `gorm:"column:experience_text"`
		ProjectCount          int32     `gorm:"column:project_count"`
		FirstUsedDate         time.Time `gorm:"column:first_used_date"`
		LastUsedDate          time.Time `gorm:"column:last_used_date"`
		IsRecentlyUsed        bool      `gorm:"column:is_recently_used"`
		SkillLevel            string    `gorm:"column:skill_level"`
	}

	if err := r.db.WithContext(ctx).
		Table("user_skill_summary").
		Where("user_id = ?", userID).
		Order("total_experience_months DESC, technology_name ASC").
		Find(&skills).Error; err != nil {
		r.logger.Error("Failed to get user technology skills", zap.Error(err))
		return nil, fmt.Errorf("ユーザー技術スキルの取得に失敗しました: %w", err)
	}

	result := make([]dto.TechnologySkillExperienceResponse, len(skills))
	for i, skill := range skills {
		result[i] = dto.TechnologySkillExperienceResponse{
			TechnologyName:        skill.TechnologyName,
			TechnologyDisplayName: skill.TechnologyDisplayName,
			CategoryName:          skill.CategoryName,
			CategoryDisplayName:   skill.CategoryDisplayName,
			TotalExperienceMonths: skill.TotalExperienceMonths,
			ExperienceYears:       skill.ExperienceYears,
			ExperienceMonths:      skill.ExperienceMonths,
			ExperienceText:        skill.ExperienceText,
			ProjectCount:          skill.ProjectCount,
			FirstUsedDate:         skill.FirstUsedDate,
			LastUsedDate:          skill.LastUsedDate,
			IsRecentlyUsed:        skill.IsRecentlyUsed,
			SkillLevel:            skill.SkillLevel,
		}
	}

	return result, nil
}

// Search 検索・フィルタ条件に基づいて職務経歴を検索
func (r *workHistoryRepository) Search(ctx context.Context, req dto.WorkHistoryQueryRequest) ([]*model.WorkHistory, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.WorkHistory{})

	// ユーザーフィルタ
	if req.UserID != nil {
		query = query.Where("user_id = ?", *req.UserID)
	}

	// プロジェクト名フィルタ
	if req.ProjectName != nil && *req.ProjectName != "" {
		query = query.Where("project_name LIKE ?", "%"+*req.ProjectName+"%")
	}

	// 業種フィルタ
	if req.Industry != nil && *req.Industry != "" {
		query = query.Where("industry = ?", *req.Industry)
	}

	// 役割フィルタ
	if req.Role != nil && *req.Role != "" {
		query = query.Where("role LIKE ?", "%"+*req.Role+"%")
	}

	// 会社名フィルタ
	if req.CompanyName != nil && *req.CompanyName != "" {
		// モデルの確認が必要：company_nameフィールドの存在を確認
		query = query.Where("company_name LIKE ?", "%"+*req.CompanyName+"%")
	}

	// 技術名フィルタ
	if req.TechnologyName != nil && *req.TechnologyName != "" {
		query = query.Joins("JOIN work_history_technologies wht ON work_histories.id = wht.work_history_id").
			Where("wht.technology_name = ?", *req.TechnologyName)
	}

	// 日付範囲フィルタ
	if req.StartDateFrom != nil && *req.StartDateFrom != "" {
		query = query.Where("start_date >= ?", *req.StartDateFrom)
	}
	if req.StartDateTo != nil && *req.StartDateTo != "" {
		query = query.Where("start_date <= ?", *req.StartDateTo)
	}
	if req.EndDateFrom != nil && *req.EndDateFrom != "" {
		query = query.Where("end_date >= ?", *req.EndDateFrom)
	}
	if req.EndDateTo != nil && *req.EndDateTo != "" {
		query = query.Where("end_date <= ?", *req.EndDateTo)
	}

	// 期間フィルタ
	if req.MinDurationMonths != nil {
		query = query.Where("duration_months >= ?", *req.MinDurationMonths)
	}
	if req.MaxDurationMonths != nil {
		query = query.Where("duration_months <= ?", *req.MaxDurationMonths)
	}

	// チーム規模フィルタ
	if req.MinTeamSize != nil {
		query = query.Where("team_size >= ?", *req.MinTeamSize)
	}
	if req.MaxTeamSize != nil {
		query = query.Where("team_size <= ?", *req.MaxTeamSize)
	}

	// 進行中プロジェクトフィルタ
	if req.IsActive != nil {
		if *req.IsActive {
			query = query.Where("end_date IS NULL")
		} else {
			query = query.Where("end_date IS NOT NULL")
		}
	}

	// キーワード検索
	if req.SearchKeyword != nil && *req.SearchKeyword != "" {
		keyword := "%" + *req.SearchKeyword + "%"
		searchFields := req.SearchFields
		if len(searchFields) == 0 {
			// デフォルトの検索フィールド
			searchFields = []string{"project_name", "project_overview", "responsibilities", "achievements"}
		}

		conditions := make([]string, len(searchFields))
		args := make([]interface{}, len(searchFields))
		for i, field := range searchFields {
			conditions[i] = field + " LIKE ?"
			args[i] = keyword
		}
		query = query.Where("("+strings.Join(conditions, " OR ")+")", args...)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count work histories", zap.Error(err))
		return nil, 0, fmt.Errorf("職務経歴の件数取得に失敗しました: %w", err)
	}

	// ソート
	orderBy := "start_date DESC" // デフォルト
	if req.SortBy != "" && req.SortOrder != "" {
		orderBy = req.SortBy + " " + req.SortOrder
	}
	query = query.Order(orderBy)

	// ページネーション
	if req.Page > 0 && req.Limit > 0 {
		offset := (req.Page - 1) * req.Limit
		query = query.Offset(int(offset)).Limit(int(req.Limit))
	}

	var workHistories []*model.WorkHistory
	if err := query.Find(&workHistories).Error; err != nil {
		r.logger.Error("Failed to search work histories", zap.Error(err))
		return nil, 0, fmt.Errorf("職務経歴の検索に失敗しました: %w", err)
	}

	return workHistories, total, nil
}

// GetByTechnologyName 技術名で職務経歴を検索
func (r *workHistoryRepository) GetByTechnologyName(ctx context.Context, technologyName string) ([]*model.WorkHistory, error) {
	var workHistories []*model.WorkHistory
	if err := r.db.WithContext(ctx).
		Joins("JOIN work_history_technologies wht ON work_histories.id = wht.work_history_id").
		Where("wht.technology_name = ?", technologyName).
		Order("start_date DESC").
		Find(&workHistories).Error; err != nil {
		r.logger.Error("Failed to get work histories by technology", zap.Error(err))
		return nil, fmt.Errorf("技術名による職務経歴検索に失敗しました: %w", err)
	}
	return workHistories, nil
}

// GetByIndustry 業種で職務経歴を検索
func (r *workHistoryRepository) GetByIndustry(ctx context.Context, industry string) ([]*model.WorkHistory, error) {
	var workHistories []*model.WorkHistory
	if err := r.db.WithContext(ctx).
		Where("industry = ?", industry).
		Order("start_date DESC").
		Find(&workHistories).Error; err != nil {
		r.logger.Error("Failed to get work histories by industry", zap.Error(err))
		return nil, fmt.Errorf("業種による職務経歴検索に失敗しました: %w", err)
	}
	return workHistories, nil
}

// GetByDateRange 期間で職務経歴を検索
func (r *workHistoryRepository) GetByDateRange(ctx context.Context, userID string, startDate, endDate time.Time) ([]*model.WorkHistory, error) {
	var workHistories []*model.WorkHistory
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND start_date >= ? AND (end_date IS NULL OR end_date <= ?)", userID, startDate, endDate).
		Order("start_date DESC").
		Find(&workHistories).Error; err != nil {
		r.logger.Error("Failed to get work histories by date range", zap.Error(err))
		return nil, fmt.Errorf("期間による職務経歴検索に失敗しました: %w", err)
	}
	return workHistories, nil
}

// CalculateITExperience IT経験年数を計算（簡略版）
// TODO: 本格的な計算ロジックはサービス層で実装予定
func (r *workHistoryRepository) CalculateITExperience(ctx context.Context, userID string) (int32, error) {
	workHistories, err := r.GetByUserID(ctx, userID)
	if err != nil {
		return 0, err
	}

	if len(workHistories) == 0 {
		return 0, nil
	}

	// 簡略的な計算：最初から最後までの期间を月数で返す
	firstDate := workHistories[len(workHistories)-1].StartDate
	lastDate := time.Now()
	if workHistories[0].EndDate != nil {
		lastDate = *workHistories[0].EndDate
	}

	years := lastDate.Year() - firstDate.Year()
	months := int(lastDate.Month() - firstDate.Month())
	totalMonths := years*12 + months

	if totalMonths < 0 {
		totalMonths = 0
	}

	return int32(totalMonths), nil
}

// CalculateTechnologySkills 技術スキル経験年数を計算（簡略版）
// TODO: 本格的な計算ロジックはサービス層で実装予定
func (r *workHistoryRepository) CalculateTechnologySkills(ctx context.Context, userID string) (map[string]int32, error) {
	workHistories, err := r.GetByUserIDWithTechnologies(ctx, userID)
	if err != nil {
		return nil, err
	}

	techSkills := make(map[string]int32)
	for _, wh := range workHistories {
		for _, tech := range wh.TechnologyItems {
			// 簡略的な計算：プロジェクト数をカウント
			techSkills[tech.TechnologyName]++
		}
	}

	return techSkills, nil
}

// GetProjectCount プロジェクト数を取得
func (r *workHistoryRepository) GetProjectCount(ctx context.Context, userID string) (int32, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&model.WorkHistory{}).
		Where("user_id = ?", userID).
		Count(&count).Error; err != nil {
		r.logger.Error("Failed to get project count", zap.Error(err))
		return 0, fmt.Errorf("プロジェクト数の取得に失敗しました: %w", err)
	}
	return int32(count), nil
}

// GetActiveProjectCount 進行中プロジェクト数を取得
func (r *workHistoryRepository) GetActiveProjectCount(ctx context.Context, userID string) (int32, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&model.WorkHistory{}).
		Where("user_id = ? AND end_date IS NULL", userID).
		Count(&count).Error; err != nil {
		r.logger.Error("Failed to get active project count", zap.Error(err))
		return 0, fmt.Errorf("進行中プロジェクト数の取得に失敗しました: %w", err)
	}
	return int32(count), nil
}

// BulkCreate 職務経歴を一括作成
func (r *workHistoryRepository) BulkCreate(ctx context.Context, workHistories []*model.WorkHistory) error {
	if len(workHistories) == 0 {
		return nil
	}

	if err := r.db.WithContext(ctx).Create(&workHistories).Error; err != nil {
		r.logger.Error("Failed to bulk create work histories", zap.Error(err))
		return fmt.Errorf("職務経歴の一括作成に失敗しました: %w", err)
	}
	return nil
}

// BulkUpdate 職務経歴を一括更新
func (r *workHistoryRepository) BulkUpdate(ctx context.Context, workHistories []*model.WorkHistory) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, wh := range workHistories {
			if err := tx.Save(wh).Error; err != nil {
				return fmt.Errorf("職務経歴の一括更新に失敗しました: %w", err)
			}
		}
		return nil
	})
}

// BulkDelete 職務経歴を一括削除
func (r *workHistoryRepository) BulkDelete(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	if err := r.db.WithContext(ctx).Delete(&model.WorkHistory{}, ids).Error; err != nil {
		r.logger.Error("Failed to bulk delete work histories", zap.Error(err))
		return fmt.Errorf("職務経歴の一括削除に失敗しました: %w", err)
	}
	return nil
}

// CreateWithTechnologies 職務経歴と技術情報を同時に作成（トランザクション）
func (r *workHistoryRepository) CreateWithTechnologies(ctx context.Context, workHistory *model.WorkHistory, technologies []model.WorkHistoryTechnology) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 職務経歴を作成
		if err := tx.Create(workHistory).Error; err != nil {
			return fmt.Errorf("職務経歴の作成に失敗しました: %w", err)
		}

		// 技術情報を作成
		if len(technologies) > 0 {
			// WorkHistoryIDを設定
			for i := range technologies {
				technologies[i].WorkHistoryID = workHistory.ID
			}

			if err := tx.Create(&technologies).Error; err != nil {
				return fmt.Errorf("技術情報の作成に失敗しました: %w", err)
			}
		}

		return nil
	})
}

// UpdateWithTechnologies 職務経歴と技術情報を同時に更新（トランザクション）
func (r *workHistoryRepository) UpdateWithTechnologies(ctx context.Context, workHistory *model.WorkHistory, technologies []model.WorkHistoryTechnology) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 職務経歴を更新
		if err := tx.Save(workHistory).Error; err != nil {
			return fmt.Errorf("職務経歴の更新に失敗しました: %w", err)
		}

		// 既存の技術情報を削除
		if err := tx.Where("work_history_id = ?", workHistory.ID).Delete(&model.WorkHistoryTechnology{}).Error; err != nil {
			return fmt.Errorf("既存技術情報の削除に失敗しました: %w", err)
		}

		// 新しい技術情報を作成
		if len(technologies) > 0 {
			// WorkHistoryIDを設定
			for i := range technologies {
				technologies[i].WorkHistoryID = workHistory.ID
			}

			if err := tx.Create(&technologies).Error; err != nil {
				return fmt.Errorf("技術情報の作成に失敗しました: %w", err)
			}
		}

		return nil
	})
}
