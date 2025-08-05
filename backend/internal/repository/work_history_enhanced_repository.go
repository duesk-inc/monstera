package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkHistoryEnhancedRepository 拡張職務経歴リポジトリインターフェース
type WorkHistoryEnhancedRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, workHistory *model.WorkHistory) error
	Update(ctx context.Context, workHistory *model.WorkHistory) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*model.WorkHistory, error)
	FindByUserID(ctx context.Context, userID string) ([]model.WorkHistory, error)

	// 拡張操作
	FindWithTechnologies(ctx context.Context, id uuid.UUID) (*model.WorkHistory, []model.WorkHistoryTechnology, error)
	FindAllWithTechnologies(ctx context.Context, userID string) ([]model.WorkHistory, map[uuid.UUID][]model.WorkHistoryTechnology, error)
	Search(ctx context.Context, criteria WorkHistorySearchCriteria) ([]model.WorkHistory, int64, error)

	// 統計・集計
	GetUserSummary(ctx context.Context, userID string) (*UserWorkHistorySummary, error)
	GetTechnologySkills(ctx context.Context, userID string) ([]TechnologySkillSummary, error)
	CalculateITExperience(ctx context.Context, userID string) (*ITExperienceCalculation, error)

	// 一時保存
	SaveTemporary(ctx context.Context, userID string, data interface{}) error
	GetTemporary(ctx context.Context, userID string) (interface{}, error)

	// バルク操作
	BulkCreate(ctx context.Context, workHistories []model.WorkHistory) error
	BulkUpdate(ctx context.Context, workHistories []model.WorkHistory) error
}

// WorkHistorySearchCriteria 検索条件
type WorkHistorySearchCriteria struct {
	UserID         *uuid.UUID
	ProjectName    *string
	TechnologyName *string
	StartDateFrom  *time.Time
	StartDateTo    *time.Time
	EndDateFrom    *time.Time
	EndDateTo      *time.Time
	Page           int
	Limit          int
	SortBy         string
	SortOrder      string
}

// UserWorkHistorySummary ユーザー職務経歴サマリー
type UserWorkHistorySummary struct {
	UserID               uuid.UUID
	TotalProjectCount    int
	TotalDurationMonths  int
	DistinctTechnologies int
	ITExperienceMonths   int
	LastProjectEndDate   *time.Time
}

// TechnologySkillSummary 技術スキルサマリー
type TechnologySkillSummary struct {
	TechnologyID     string // uuidをstringとして扱う
	TechnologyName   string
	CategoryName     string
	ExperienceMonths int
	ProjectCount     int
	LastUsedDate     *time.Time
}

// ITExperienceCalculation IT経験計算結果
type ITExperienceCalculation struct {
	TotalMonths      int
	ExcludingOverlap int
	FirstProjectDate *time.Time
	LastProjectDate  *time.Time
	CalculatedAt     time.Time
}

// workHistoryEnhancedRepository 拡張職務経歴リポジトリ実装
type workHistoryEnhancedRepository struct {
	repository.BaseRepository
}

// NewWorkHistoryEnhancedRepository 拡張職務経歴リポジトリを作成
func NewWorkHistoryEnhancedRepository(base repository.BaseRepository) WorkHistoryEnhancedRepository {
	return &workHistoryEnhancedRepository{
		BaseRepository: base,
	}
}

// Create 職務経歴を作成
func (r *workHistoryEnhancedRepository) Create(ctx context.Context, workHistory *model.WorkHistory) error {
	return r.GetDB().WithContext(ctx).Create(workHistory).Error
}

// Update 職務経歴を更新
func (r *workHistoryEnhancedRepository) Update(ctx context.Context, workHistory *model.WorkHistory) error {
	return r.GetDB().WithContext(ctx).Save(workHistory).Error
}

// Delete 職務経歴を削除
func (r *workHistoryEnhancedRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.GetDB().WithContext(ctx).Delete(&model.WorkHistory{}, "id = ?", id).Error
}

// FindByID IDで職務経歴を取得
func (r *workHistoryEnhancedRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.WorkHistory, error) {
	var workHistory model.WorkHistory
	err := r.GetDB().WithContext(ctx).First(&workHistory, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &workHistory, nil
}

// FindByUserID ユーザーIDで職務経歴一覧を取得
func (r *workHistoryEnhancedRepository) FindByUserID(ctx context.Context, userID string) ([]model.WorkHistory, error) {
	var workHistories []model.WorkHistory
	err := r.GetDB().WithContext(ctx).
		Where("user_id = ?", userID).
		Order("start_date DESC").
		Find(&workHistories).Error
	return workHistories, err
}

// FindWithTechnologies 技術情報付きで職務経歴を取得
func (r *workHistoryEnhancedRepository) FindWithTechnologies(ctx context.Context, id uuid.UUID) (*model.WorkHistory, []model.WorkHistoryTechnology, error) {
	var workHistory model.WorkHistory
	if err := r.GetDB().WithContext(ctx).First(&workHistory, "id = ?", id).Error; err != nil {
		return nil, nil, err
	}

	var technologies []model.WorkHistoryTechnology
	err := r.GetDB().WithContext(ctx).
		Preload("TechnologyMaster").
		Where("work_history_id = ?", id).
		Find(&technologies).Error

	return &workHistory, technologies, err
}

// FindAllWithTechnologies 全職務経歴を技術情報付きで取得
func (r *workHistoryEnhancedRepository) FindAllWithTechnologies(ctx context.Context, userID string) ([]model.WorkHistory, map[uuid.UUID][]model.WorkHistoryTechnology, error) {
	var workHistories []model.WorkHistory
	if err := r.GetDB().WithContext(ctx).
		Where("user_id = ?", userID).
		Order("start_date DESC").
		Find(&workHistories).Error; err != nil {
		return nil, nil, err
	}

	// 職務経歴IDのリストを作成
	var workHistoryIDs []uuid.UUID
	for _, wh := range workHistories {
		workHistoryIDs = append(workHistoryIDs, wh.ID)
	}

	// 技術情報を一括取得
	var technologies []model.WorkHistoryTechnology
	if err := r.GetDB().WithContext(ctx).
		Preload("TechnologyMaster").
		Where("work_history_id IN ?", workHistoryIDs).
		Find(&technologies).Error; err != nil {
		return nil, nil, err
	}

	// 職務経歴IDごとにグループ化
	techMap := make(map[uuid.UUID][]model.WorkHistoryTechnology)
	for _, tech := range technologies {
		// WorkHistoryIDはstring型なのでUUIDに変換
		whID, err := uuid.Parse(tech.WorkHistoryID)
		if err != nil {
			continue
		}
		techMap[whID] = append(techMap[whID], tech)
	}

	return workHistories, techMap, nil
}

// Search 条件に基づいて職務経歴を検索
func (r *workHistoryEnhancedRepository) Search(ctx context.Context, criteria WorkHistorySearchCriteria) ([]model.WorkHistory, int64, error) {
	query := r.GetDB().WithContext(ctx).Model(&model.WorkHistory{})

	// フィルタ条件の適用
	if criteria.UserID != nil {
		query = query.Where("user_id = ?", *criteria.UserID)
	}
	if criteria.ProjectName != nil {
		query = query.Where("project_name LIKE ?", "%"+*criteria.ProjectName+"%")
	}
	if criteria.StartDateFrom != nil {
		query = query.Where("start_date >= ?", *criteria.StartDateFrom)
	}
	if criteria.StartDateTo != nil {
		query = query.Where("start_date <= ?", *criteria.StartDateTo)
	}
	if criteria.EndDateFrom != nil {
		query = query.Where("end_date >= ?", *criteria.EndDateFrom)
	}
	if criteria.EndDateTo != nil {
		query = query.Where("end_date <= ?", *criteria.EndDateTo)
	}

	// 技術名での検索
	if criteria.TechnologyName != nil {
		subQuery := r.GetDB().Table("work_history_technologies").
			Select("work_history_id").
			Joins("JOIN technology_master ON work_history_technologies.technology_id = technology_master.id").
			Where("technology_master.name LIKE ?", "%"+*criteria.TechnologyName+"%")
		query = query.Where("id IN (?)", subQuery)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// ソート設定
	if criteria.SortBy != "" {
		order := criteria.SortBy
		if criteria.SortOrder != "" {
			order += " " + criteria.SortOrder
		}
		query = query.Order(order)
	} else {
		query = query.Order("start_date DESC")
	}

	// ページネーション
	if criteria.Limit > 0 {
		query = query.Limit(criteria.Limit)
		if criteria.Page > 0 {
			offset := (criteria.Page - 1) * criteria.Limit
			query = query.Offset(offset)
		}
	}

	// 結果を取得
	var workHistories []model.WorkHistory
	err := query.Find(&workHistories).Error

	return workHistories, total, err
}

// GetUserSummary ユーザーの職務経歴サマリーを取得
func (r *workHistoryEnhancedRepository) GetUserSummary(ctx context.Context, userID string) (*UserWorkHistorySummary, error) {
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	
	var summary UserWorkHistorySummary
	summary.UserID = parsedUserID

	// プロジェクト数を取得
	var projectCount int64
	if err := r.GetDB().WithContext(ctx).
		Model(&model.WorkHistory{}).
		Where("user_id = ?", userID).
		Count(&projectCount).Error; err != nil {
		return nil, err
	}
	summary.TotalProjectCount = int(projectCount)

	// 合計期間を計算（duration_monthsカラムがある場合）
	var totalDuration int64
	if err := r.GetDB().WithContext(ctx).
		Model(&model.WorkHistory{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(duration_months), 0)").
		Scan(&totalDuration).Error; err != nil {
		// duration_monthsカラムがない場合は手動計算
		var workHistories []model.WorkHistory
		if err := r.GetDB().WithContext(ctx).
			Where("user_id = ?", userID).
			Find(&workHistories).Error; err != nil {
			return nil, err
		}

		totalDuration = 0
		for _, wh := range workHistories {
			if wh.EndDate != nil {
				months := int64(wh.EndDate.Year()-wh.StartDate.Year()) * 12
				months += int64(wh.EndDate.Month() - wh.StartDate.Month())
				totalDuration += months
			}
		}
	}
	summary.TotalDurationMonths = int(totalDuration)

	// 使用技術数を取得
	var techCount int64
	subQuery := r.GetDB().Table("work_history_technologies").
		Select("DISTINCT technology_id").
		Joins("JOIN work_histories ON work_history_technologies.work_history_id = work_histories.id").
		Where("work_histories.user_id = ?", userID)
	if err := r.GetDB().WithContext(ctx).
		Table("(?) as t", subQuery).
		Count(&techCount).Error; err != nil {
		return nil, err
	}
	summary.DistinctTechnologies = int(techCount)

	// 最終プロジェクト終了日を取得
	var lastEndDate *time.Time
	err = r.GetDB().WithContext(ctx).
		Model(&model.WorkHistory{}).
		Where("user_id = ? AND end_date IS NOT NULL", userID).
		Select("MAX(end_date)").
		Scan(&lastEndDate).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}
	summary.LastProjectEndDate = lastEndDate

	// IT経験年数の計算はCalculateITExperienceメソッドを使用
	itExp, err := r.CalculateITExperience(ctx, userID)
	if err == nil {
		summary.ITExperienceMonths = itExp.ExcludingOverlap
	}

	return &summary, nil
}

// GetTechnologySkills ユーザーの技術スキル一覧を取得
func (r *workHistoryEnhancedRepository) GetTechnologySkills(ctx context.Context, userID string) ([]TechnologySkillSummary, error) {
	var skills []TechnologySkillSummary

	// user_skill_summaryビューがある場合
	err := r.GetDB().WithContext(ctx).
		Table("user_skill_summary").
		Where("user_id = ?", userID).
		Scan(&skills).Error

	if err != nil {
		// ビューがない場合は手動で集計
		query := `
			SELECT 
				tm.id as technology_id,
				tm.name as technology_name,
				tm.category as category_name,
				COUNT(DISTINCT wht.work_history_id) as project_count,
				MAX(wh.end_date) as last_used_date
			FROM technology_master tm
			JOIN work_history_technologies wht ON tm.id = wht.technology_id
			JOIN work_histories wh ON wht.work_history_id = wh.id
			WHERE wh.user_id = ?
			GROUP BY tm.id, tm.name, tm.category
			ORDER BY project_count DESC, last_used_date DESC
		`
		err = r.GetDB().WithContext(ctx).Raw(query, userID).Scan(&skills).Error
		if err != nil {
			return nil, err
		}

		// 経験月数を計算
		for i := range skills {
			var months int
			subQuery := `
				SELECT COALESCE(SUM(
					CASE 
						WHEN end_date IS NULL THEN 0
						ELSE TIMESTAMPDIFF(MONTH, start_date, end_date)
					END
				), 0)
				FROM work_histories wh
				JOIN work_history_technologies wht ON wh.id = wht.work_history_id
				WHERE wh.user_id = ? AND wht.technology_id = ?
			`
			// TechnologyIDはstring型なので直接使用
			r.GetDB().WithContext(ctx).Raw(subQuery, userID, skills[i].TechnologyID).Scan(&months)
			skills[i].ExperienceMonths = months
		}
	}

	return skills, nil
}

// CalculateITExperience IT経験年数を計算
func (r *workHistoryEnhancedRepository) CalculateITExperience(ctx context.Context, userID string) (*ITExperienceCalculation, error) {
	// user_it_experienceビューがある場合
	var result ITExperienceCalculation
	err := r.GetDB().WithContext(ctx).
		Table("user_it_experience").
		Where("user_id = ?", userID).
		Select("total_it_experience_months as total_months, first_project_date, last_project_date").
		Scan(&result).Error

	if err == nil {
		result.ExcludingOverlap = result.TotalMonths
		result.CalculatedAt = time.Now()
		return &result, nil
	}

	// ビューがない場合は手動計算
	var workHistories []model.WorkHistory
	if err := r.GetDB().WithContext(ctx).
		Where("user_id = ?", userID).
		Order("start_date ASC").
		Find(&workHistories).Error; err != nil {
		return nil, err
	}

	if len(workHistories) == 0 {
		return &ITExperienceCalculation{
			TotalMonths:      0,
			ExcludingOverlap: 0,
			CalculatedAt:     time.Now(),
		}, nil
	}

	// 期間の重複を除いて計算
	var periods []struct {
		Start time.Time
		End   time.Time
	}

	for _, wh := range workHistories {
		// StartDateはtime.Time型（ポインタではない）
		end := time.Now()
		if wh.EndDate != nil {
			end = *wh.EndDate
		}

		periods = append(periods, struct {
			Start time.Time
			End   time.Time
		}{
			Start: wh.StartDate,
			End:   end,
		})
	}

	// 期間をマージして重複を除く
	totalMonths := 0
	if len(periods) > 0 {
		// 実装の簡略化のため、単純に各期間の月数を合計
		// TODO: 重複期間の除外ロジックを実装
		for _, p := range periods {
			months := int(p.End.Year()-p.Start.Year())*12 + int(p.End.Month()-p.Start.Month())
			totalMonths += months
		}

		result.FirstProjectDate = &periods[0].Start
		result.LastProjectDate = &periods[len(periods)-1].End
	}

	result.TotalMonths = totalMonths
	result.ExcludingOverlap = totalMonths // TODO: 重複除外後の値を設定
	result.CalculatedAt = time.Now()

	return &result, nil
}

// SaveTemporary 一時保存
func (r *workHistoryEnhancedRepository) SaveTemporary(ctx context.Context, userID string, data interface{}) error {
	// 一時保存の実装（例：JSONとしてDBに保存）
	// TODO: 実際の実装
	return nil
}

// GetTemporary 一時保存データを取得
func (r *workHistoryEnhancedRepository) GetTemporary(ctx context.Context, userID string) (interface{}, error) {
	// TODO: 実際の実装
	return nil, nil
}

// BulkCreate 複数の職務経歴を一括作成
func (r *workHistoryEnhancedRepository) BulkCreate(ctx context.Context, workHistories []model.WorkHistory) error {
	if len(workHistories) == 0 {
		return nil
	}
	return r.GetDB().WithContext(ctx).CreateInBatches(workHistories, 100).Error
}

// BulkUpdate 複数の職務経歴を一括更新
func (r *workHistoryEnhancedRepository) BulkUpdate(ctx context.Context, workHistories []model.WorkHistory) error {
	if len(workHistories) == 0 {
		return nil
	}

	tx := r.GetDB().WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, wh := range workHistories {
		if err := tx.Save(&wh).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}
