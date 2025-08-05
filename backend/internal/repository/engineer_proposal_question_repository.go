package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// EngineerProposalQuestionRepository エンジニア提案質問リポジトリのインターフェース
type EngineerProposalQuestionRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, question *model.EngineerProposalQuestion) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.EngineerProposalQuestion, error)
	Update(ctx context.Context, question *model.EngineerProposalQuestion) error
	Delete(ctx context.Context, id uuid.UUID) error

	// 質問管理
	GetByProposalID(ctx context.Context, proposalID uuid.UUID, filter QuestionFilter) ([]*model.EngineerProposalQuestion, int64, error)
	GetByProposalIDSimple(ctx context.Context, proposalID uuid.UUID) ([]*model.EngineerProposalQuestion, error)
	GetPendingQuestions(ctx context.Context, filter PendingQuestionFilter) ([]*model.EngineerProposalQuestion, int64, error)
	GetQuestionsByUserID(ctx context.Context, userID string, filter QuestionFilter) ([]*model.EngineerProposalQuestion, int64, error)

	// 回答管理
	UpdateResponse(ctx context.Context, id uuid.UUID, responseText string, salesUserID uuid.UUID) error
	MarkAsResponded(ctx context.Context, id uuid.UUID, respondedAt time.Time) error
	GetUnansweredQuestions(ctx context.Context, proposalID uuid.UUID) ([]*model.EngineerProposalQuestion, error)
	GetQuestionsBySalesUser(ctx context.Context, salesUserID uuid.UUID, filter QuestionFilter) ([]*model.EngineerProposalQuestion, int64, error)

	// 統計・分析クエリ
	CountQuestionsByProposal(ctx context.Context, proposalID uuid.UUID) (int64, error)
	CountPendingQuestionsByProposal(ctx context.Context, proposalID uuid.UUID) (int64, error)
	GetQuestionResponseStats(ctx context.Context, userID string) (*QuestionResponseStats, error)
	GetQuestionTrendStats(ctx context.Context, userID string, months int) ([]*QuestionTrendData, error)
	GetSalesResponseStats(ctx context.Context, salesUserID uuid.UUID, startDate, endDate time.Time) (*SalesQuestionStats, error)

	// 営業担当者向けクエリ
	GetPendingQuestionsBySalesTeam(ctx context.Context, limit int) ([]*model.EngineerProposalQuestion, error)
	GetOverdueQuestions(ctx context.Context, overdueDays int) ([]*model.EngineerProposalQuestion, error)
	GetQuestionsByPriority(ctx context.Context, priority string, limit int) ([]*model.EngineerProposalQuestion, error)

	// 高度な分析クエリ
	GetQuestionActivityByDate(ctx context.Context, userID string, startDate, endDate time.Time) ([]*QuestionDailyActivity, error)
	GetPopularQuestionPatterns(ctx context.Context, limit int) ([]*QuestionPattern, error)
	GetResponseTimeDistribution(ctx context.Context, salesUserID uuid.UUID) (*ResponseTimeDistribution, error)

	// バルク操作
	BulkAssignSalesUser(ctx context.Context, questionIDs []uuid.UUID, salesUserID uuid.UUID) error
	BulkMarkAsUrgent(ctx context.Context, questionIDs []uuid.UUID) error
	BulkDelete(ctx context.Context, questionIDs []uuid.UUID) error
}

// QuestionFilter 質問フィルター
type QuestionFilter struct {
	IsAnswered  *bool      `json:"is_answered"`
	SalesUserID *uuid.UUID `json:"sales_user_id"`
	Page        int        `json:"page"`
	Limit       int        `json:"limit"`
	SortBy      *string    `json:"sort_by"`    // "created_at", "responded_at"
	SortOrder   *string    `json:"sort_order"` // "asc", "desc"
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
}

// PendingQuestionFilter 未回答質問フィルター
type PendingQuestionFilter struct {
	SalesUserID *uuid.UUID `json:"sales_user_id"`
	Priority    *string    `json:"priority"`     // "high", "medium", "low"
	DaysWaiting *int       `json:"days_waiting"` // 待機日数
	Page        int        `json:"page"`
	Limit       int        `json:"limit"`
	SortBy      *string    `json:"sort_by"`    // "created_at", "days_waiting"
	SortOrder   *string    `json:"sort_order"` // "asc", "desc"
}

// QuestionResponseStats 質問回答統計
type QuestionResponseStats struct {
	TotalQuestions      int     `json:"total_questions"`
	AnsweredQuestions   int     `json:"answered_questions"`
	PendingQuestions    int     `json:"pending_questions"`
	AnswerRate          float64 `json:"answer_rate"`             // 回答率（％）
	AvgResponseTime     float64 `json:"avg_response_time_hours"` // 平均回答時間（時間）
	FastestResponseTime float64 `json:"fastest_response_time_hours"`
	SlowestResponseTime float64 `json:"slowest_response_time_hours"`
}

// QuestionTrendData 質問トレンドデータ
type QuestionTrendData struct {
	Month           string  `json:"month"` // "2024-01"
	QuestionCount   int     `json:"question_count"`
	AnsweredCount   int     `json:"answered_count"`
	PendingCount    int     `json:"pending_count"`
	AnswerRate      float64 `json:"answer_rate"`
	AvgResponseTime float64 `json:"avg_response_time_hours"`
}

// SalesQuestionStats 営業担当者質問統計
type SalesQuestionStats struct {
	SalesUserID        uuid.UUID `json:"sales_user_id"`
	TotalResponses     int       `json:"total_responses"`
	AvgResponseTime    float64   `json:"avg_response_time_hours"`
	PendingQuestions   int       `json:"pending_questions"`
	CompletionRate     float64   `json:"completion_rate"`
	ResponsesThisWeek  int       `json:"responses_this_week"`
	ResponsesThisMonth int       `json:"responses_this_month"`
}

// QuestionDailyActivity 質問日別活動
type QuestionDailyActivity struct {
	Date            time.Time `json:"date"`
	QuestionCount   int       `json:"question_count"`
	ResponseCount   int       `json:"response_count"`
	PendingCount    int       `json:"pending_count"`
	AvgResponseTime float64   `json:"avg_response_time_hours"`
}

// QuestionPattern 質問パターン
type QuestionPattern struct {
	Pattern         string  `json:"pattern"`
	Count           int     `json:"count"`
	AvgResponseTime float64 `json:"avg_response_time_hours"`
	Category        string  `json:"category"`
}

// ResponseTimeDistribution 回答時間分布
type ResponseTimeDistribution struct {
	Under1Hour     int `json:"under_1_hour"`
	Under6Hours    int `json:"under_6_hours"`
	Under24Hours   int `json:"under_24_hours"`
	Under7Days     int `json:"under_7_days"`
	Over7Days      int `json:"over_7_days"`
	TotalResponses int `json:"total_responses"`
}

// engineerProposalQuestionRepository エンジニア提案質問リポジトリの実装
type engineerProposalQuestionRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewEngineerProposalQuestionRepository エンジニア提案質問リポジトリのインスタンスを生成
func NewEngineerProposalQuestionRepository(db *gorm.DB, logger *zap.Logger) EngineerProposalQuestionRepository {
	return &engineerProposalQuestionRepository{
		db:     db,
		logger: logger,
	}
}

// Create エンジニア提案質問を作成
func (r *engineerProposalQuestionRepository) Create(ctx context.Context, question *model.EngineerProposalQuestion) error {
	if err := r.db.WithContext(ctx).Create(question).Error; err != nil {
		r.logger.Error("Failed to create engineer proposal question",
			zap.Error(err),
			zap.String("proposal_id", question.ProposalID.String()),
			zap.String("question_text_length", string(rune(len(question.QuestionText)))))
		return err
	}

	r.logger.Info("Engineer proposal question created successfully",
		zap.String("question_id", question.ID.String()),
		zap.String("proposal_id", question.ProposalID.String()))

	return nil
}

// GetByID IDでエンジニア提案質問を取得
func (r *engineerProposalQuestionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.EngineerProposalQuestion, error) {
	var question model.EngineerProposalQuestion

	if err := r.db.WithContext(ctx).
		Preload("Proposal").
		Preload("SalesUser").
		Where("id = ?", id).
		First(&question).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			r.logger.Warn("Engineer proposal question not found", zap.String("id", id.String()))
			return nil, err
		}
		r.logger.Error("Failed to get engineer proposal question by ID",
			zap.Error(err),
			zap.String("id", id.String()))
		return nil, err
	}

	return &question, nil
}

// Update エンジニア提案質問を更新
func (r *engineerProposalQuestionRepository) Update(ctx context.Context, question *model.EngineerProposalQuestion) error {
	if err := r.db.WithContext(ctx).Save(question).Error; err != nil {
		r.logger.Error("Failed to update engineer proposal question",
			zap.Error(err),
			zap.String("question_id", question.ID.String()))
		return err
	}

	r.logger.Info("Engineer proposal question updated successfully",
		zap.String("question_id", question.ID.String()))

	return nil
}

// Delete エンジニア提案質問を削除（論理削除）
func (r *engineerProposalQuestionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&model.EngineerProposalQuestion{}, id)

	if result.Error != nil {
		r.logger.Error("Failed to delete engineer proposal question",
			zap.Error(result.Error),
			zap.String("id", id.String()))
		return result.Error
	}

	if result.RowsAffected == 0 {
		r.logger.Warn("Engineer proposal question not found for deletion", zap.String("id", id.String()))
		return gorm.ErrRecordNotFound
	}

	r.logger.Info("Engineer proposal question deleted successfully", zap.String("id", id.String()))
	return nil
}

// GetByProposalID 提案IDで質問一覧を取得（フィルター付き）
func (r *engineerProposalQuestionRepository) GetByProposalID(ctx context.Context, proposalID uuid.UUID, filter QuestionFilter) ([]*model.EngineerProposalQuestion, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Preload("SalesUser").
		Where("proposal_id = ?", proposalID)

	// フィルター条件を適用
	if filter.IsAnswered != nil {
		query = query.Where("is_responded = ?", *filter.IsAnswered)
	}

	if filter.SalesUserID != nil {
		query = query.Where("sales_user_id = ?", *filter.SalesUserID)
	}

	if filter.StartDate != nil {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}

	if filter.EndDate != nil {
		query = query.Where("created_at <= ?", *filter.EndDate)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count engineer proposal questions",
			zap.Error(err),
			zap.String("proposal_id", proposalID.String()))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// ソート順序を設定
	orderBy := "created_at ASC"
	if filter.SortBy != nil && filter.SortOrder != nil {
		switch *filter.SortBy {
		case "created_at", "responded_at":
			orderBy = *filter.SortBy + " " + *filter.SortOrder
		}
	}

	// データを取得
	var questions []*model.EngineerProposalQuestion
	if err := query.Order(orderBy).Find(&questions).Error; err != nil {
		r.logger.Error("Failed to get engineer proposal questions by proposal ID",
			zap.Error(err),
			zap.String("proposal_id", proposalID.String()))
		return nil, 0, err
	}

	return questions, total, nil
}

// GetByProposalIDSimple 提案IDで質問一覧を取得（シンプル版）
func (r *engineerProposalQuestionRepository) GetByProposalIDSimple(ctx context.Context, proposalID uuid.UUID) ([]*model.EngineerProposalQuestion, error) {
	var questions []*model.EngineerProposalQuestion

	if err := r.db.WithContext(ctx).
		Preload("SalesUser").
		Where("proposal_id = ?", proposalID).
		Order("created_at ASC").
		Find(&questions).Error; err != nil {
		r.logger.Error("Failed to get engineer proposal questions by proposal ID (simple)",
			zap.Error(err),
			zap.String("proposal_id", proposalID.String()))
		return nil, err
	}

	return questions, nil
}

// GetPendingQuestions 未回答質問一覧を取得（営業担当者用）
func (r *engineerProposalQuestionRepository) GetPendingQuestions(ctx context.Context, filter PendingQuestionFilter) ([]*model.EngineerProposalQuestion, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Preload("Proposal").
		Preload("SalesUser").
		Where("is_responded = ?", false)

	// フィルター条件を適用
	if filter.SalesUserID != nil {
		query = query.Where("sales_user_id = ?", *filter.SalesUserID)
	}

	if filter.DaysWaiting != nil {
		waitingDate := time.Now().AddDate(0, 0, -*filter.DaysWaiting)
		query = query.Where("created_at <= ?", waitingDate)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count pending engineer proposal questions", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// ソート順序を設定（デフォルトは古い順）
	orderBy := "created_at ASC"
	if filter.SortBy != nil && filter.SortOrder != nil {
		switch *filter.SortBy {
		case "created_at":
			orderBy = "created_at " + *filter.SortOrder
		case "days_waiting":
			orderBy = "created_at " + map[string]string{"asc": "DESC", "desc": "ASC"}[*filter.SortOrder]
		}
	}

	// データを取得
	var questions []*model.EngineerProposalQuestion
	if err := query.Order(orderBy).Find(&questions).Error; err != nil {
		r.logger.Error("Failed to get pending engineer proposal questions", zap.Error(err))
		return nil, 0, err
	}

	return questions, total, nil
}

// GetQuestionsByUserID ユーザーIDで質問一覧を取得（エンジニア投稿質問）
func (r *engineerProposalQuestionRepository) GetQuestionsByUserID(ctx context.Context, userID string, filter QuestionFilter) ([]*model.EngineerProposalQuestion, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Preload("Proposal").
		Preload("SalesUser").
		Joins("JOIN proposals ON proposal_questions.proposal_id = proposals.id").
		Where("proposals.user_id = ? AND proposals.deleted_at IS NULL", userID)

	// フィルター条件を適用
	if filter.IsAnswered != nil {
		query = query.Where("proposal_questions.is_responded = ?", *filter.IsAnswered)
	}

	if filter.StartDate != nil {
		query = query.Where("proposal_questions.created_at >= ?", *filter.StartDate)
	}

	if filter.EndDate != nil {
		query = query.Where("proposal_questions.created_at <= ?", *filter.EndDate)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count engineer proposal questions by user ID",
			zap.Error(err),
			zap.String("user_id", userID))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// ソート順序を設定
	orderBy := "proposal_questions.created_at DESC"
	if filter.SortBy != nil && filter.SortOrder != nil {
		switch *filter.SortBy {
		case "created_at":
			orderBy = "proposal_questions.created_at " + *filter.SortOrder
		case "responded_at":
			orderBy = "proposal_questions.responded_at " + *filter.SortOrder
		}
	}

	// データを取得
	var questions []*model.EngineerProposalQuestion
	if err := query.Order(orderBy).Find(&questions).Error; err != nil {
		r.logger.Error("Failed to get engineer proposal questions by user ID",
			zap.Error(err),
			zap.String("user_id", userID))
		return nil, 0, err
	}

	return questions, total, nil
}

// UpdateResponse 回答を更新
func (r *engineerProposalQuestionRepository) UpdateResponse(ctx context.Context, id uuid.UUID, responseText string, salesUserID uuid.UUID) error {
	now := time.Now()

	result := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Where("id = ? AND is_responded = ?", id, false).
		Updates(map[string]interface{}{
			"response_text": responseText,
			"sales_user_id": salesUserID,
			"is_responded":  true,
			"responded_at":  now,
			"updated_at":    now,
		})

	if result.Error != nil {
		r.logger.Error("Failed to update question response",
			zap.Error(result.Error),
			zap.String("id", id.String()),
			zap.String("sales_user_id", salesUserID.String()))
		return result.Error
	}

	if result.RowsAffected == 0 {
		r.logger.Warn("Question not found or already responded",
			zap.String("id", id.String()))
		return gorm.ErrRecordNotFound
	}

	r.logger.Info("Question response updated successfully",
		zap.String("id", id.String()),
		zap.String("sales_user_id", salesUserID.String()))

	return nil
}

// MarkAsResponded 回答済みとしてマーク
func (r *engineerProposalQuestionRepository) MarkAsResponded(ctx context.Context, id uuid.UUID, respondedAt time.Time) error {
	result := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_responded": true,
			"responded_at": respondedAt,
			"updated_at":   time.Now(),
		})

	if result.Error != nil {
		r.logger.Error("Failed to mark question as responded",
			zap.Error(result.Error),
			zap.String("id", id.String()))
		return result.Error
	}

	if result.RowsAffected == 0 {
		r.logger.Warn("Question not found for mark as responded",
			zap.String("id", id.String()))
		return gorm.ErrRecordNotFound
	}

	return nil
}

// GetUnansweredQuestions 未回答質問を取得
func (r *engineerProposalQuestionRepository) GetUnansweredQuestions(ctx context.Context, proposalID uuid.UUID) ([]*model.EngineerProposalQuestion, error) {
	var questions []*model.EngineerProposalQuestion

	if err := r.db.WithContext(ctx).
		Preload("SalesUser").
		Where("proposal_id = ? AND is_responded = ?", proposalID, false).
		Order("created_at ASC").
		Find(&questions).Error; err != nil {
		r.logger.Error("Failed to get unanswered questions",
			zap.Error(err),
			zap.String("proposal_id", proposalID.String()))
		return nil, err
	}

	return questions, nil
}

// GetQuestionsBySalesUser 営業担当者別の質問を取得
func (r *engineerProposalQuestionRepository) GetQuestionsBySalesUser(ctx context.Context, salesUserID uuid.UUID, filter QuestionFilter) ([]*model.EngineerProposalQuestion, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Preload("Proposal").
		Where("sales_user_id = ?", salesUserID)

	// フィルター条件を適用
	if filter.IsAnswered != nil {
		query = query.Where("is_responded = ?", *filter.IsAnswered)
	}

	if filter.StartDate != nil {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}

	if filter.EndDate != nil {
		query = query.Where("created_at <= ?", *filter.EndDate)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count questions by sales user",
			zap.Error(err),
			zap.String("sales_user_id", salesUserID.String()))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// ソート順序を設定
	orderBy := "created_at DESC"
	if filter.SortBy != nil && filter.SortOrder != nil {
		switch *filter.SortBy {
		case "created_at", "responded_at":
			orderBy = *filter.SortBy + " " + *filter.SortOrder
		}
	}

	// データを取得
	var questions []*model.EngineerProposalQuestion
	if err := query.Order(orderBy).Find(&questions).Error; err != nil {
		r.logger.Error("Failed to get questions by sales user",
			zap.Error(err),
			zap.String("sales_user_id", salesUserID.String()))
		return nil, 0, err
	}

	return questions, total, nil
}

// CountQuestionsByProposal 提案別の質問数をカウント
func (r *engineerProposalQuestionRepository) CountQuestionsByProposal(ctx context.Context, proposalID uuid.UUID) (int64, error) {
	var count int64

	if err := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Where("proposal_id = ?", proposalID).
		Count(&count).Error; err != nil {
		r.logger.Error("Failed to count questions by proposal",
			zap.Error(err),
			zap.String("proposal_id", proposalID.String()))
		return 0, err
	}

	return count, nil
}

// CountPendingQuestionsByProposal 提案別の未回答質問数をカウント
func (r *engineerProposalQuestionRepository) CountPendingQuestionsByProposal(ctx context.Context, proposalID uuid.UUID) (int64, error) {
	var count int64

	if err := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Where("proposal_id = ? AND is_responded = ?", proposalID, false).
		Count(&count).Error; err != nil {
		r.logger.Error("Failed to count pending questions by proposal",
			zap.Error(err),
			zap.String("proposal_id", proposalID.String()))
		return 0, err
	}

	return count, nil
}

// GetQuestionResponseStats 質問回答統計を取得
func (r *engineerProposalQuestionRepository) GetQuestionResponseStats(ctx context.Context, userID string) (*QuestionResponseStats, error) {
	var stats QuestionResponseStats

	query := `
		SELECT 
			COUNT(*) as total_questions,
			SUM(CASE WHEN is_responded = true THEN 1 ELSE 0 END) as answered_questions,
			SUM(CASE WHEN is_responded = false THEN 1 ELSE 0 END) as pending_questions,
			ROUND(SUM(CASE WHEN is_responded = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as answer_rate,
			ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) 
			ELSE NULL END), 2) as avg_response_time,
			ROUND(MIN(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) 
			ELSE NULL END), 2) as fastest_response_time,
			ROUND(MAX(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) 
			ELSE NULL END), 2) as slowest_response_time
		FROM proposal_questions pq
		JOIN proposals p ON pq.proposal_id = p.id
		WHERE p.user_id = ? AND p.deleted_at IS NULL AND pq.deleted_at IS NULL
	`

	if err := r.db.WithContext(ctx).Raw(query, userID).Scan(&stats).Error; err != nil {
		r.logger.Error("Failed to get question response stats",
			zap.Error(err),
			zap.String("user_id", userID))
		return nil, err
	}

	return &stats, nil
}

// GetQuestionTrendStats 質問トレンド統計を取得
func (r *engineerProposalQuestionRepository) GetQuestionTrendStats(ctx context.Context, userID string, months int) ([]*QuestionTrendData, error) {
	var trends []*QuestionTrendData

	startDate := time.Now().AddDate(0, -months, 0)

	query := `
		SELECT 
			DATE_FORMAT(pq.created_at, '%Y-%m') as month,
			COUNT(*) as question_count,
			SUM(CASE WHEN pq.is_responded = true THEN 1 ELSE 0 END) as answered_count,
			SUM(CASE WHEN pq.is_responded = false THEN 1 ELSE 0 END) as pending_count,
			ROUND(SUM(CASE WHEN pq.is_responded = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as answer_rate,
			ROUND(AVG(CASE WHEN pq.responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, pq.created_at, pq.responded_at) 
			ELSE NULL END), 2) as avg_response_time
		FROM proposal_questions pq
		JOIN proposals p ON pq.proposal_id = p.id
		WHERE p.user_id = ? AND pq.created_at >= ? AND p.deleted_at IS NULL AND pq.deleted_at IS NULL
		GROUP BY DATE_FORMAT(pq.created_at, '%Y-%m')
		ORDER BY month ASC
	`

	if err := r.db.WithContext(ctx).Raw(query, userID, startDate).Scan(&trends).Error; err != nil {
		r.logger.Error("Failed to get question trend stats",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.Int("months", months))
		return nil, err
	}

	return trends, nil
}

// GetSalesResponseStats 営業担当者回答統計を取得
func (r *engineerProposalQuestionRepository) GetSalesResponseStats(ctx context.Context, salesUserID uuid.UUID, startDate, endDate time.Time) (*SalesQuestionStats, error) {
	var stats SalesQuestionStats
	stats.SalesUserID = salesUserID

	now := time.Now()
	weekStart := now.AddDate(0, 0, -int(now.Weekday()))
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	query := `
		SELECT 
			COUNT(CASE WHEN is_responded = true THEN 1 END) as total_responses,
			ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) 
			ELSE NULL END), 2) as avg_response_time,
			COUNT(CASE WHEN is_responded = false THEN 1 END) as pending_questions,
			ROUND(COUNT(CASE WHEN is_responded = true THEN 1 END) * 100.0 / COUNT(*), 2) as completion_rate,
			COUNT(CASE WHEN is_responded = true AND responded_at >= ? THEN 1 END) as responses_this_week,
			COUNT(CASE WHEN is_responded = true AND responded_at >= ? THEN 1 END) as responses_this_month
		FROM proposal_questions
		WHERE sales_user_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL
	`

	if err := r.db.WithContext(ctx).Raw(query, weekStart, monthStart, salesUserID, startDate, endDate).Scan(&stats).Error; err != nil {
		r.logger.Error("Failed to get sales response stats",
			zap.Error(err),
			zap.String("sales_user_id", salesUserID.String()))
		return nil, err
	}

	return &stats, nil
}

// GetPendingQuestionsBySalesTeam 営業チーム向け未回答質問を取得
func (r *engineerProposalQuestionRepository) GetPendingQuestionsBySalesTeam(ctx context.Context, limit int) ([]*model.EngineerProposalQuestion, error) {
	var questions []*model.EngineerProposalQuestion

	query := r.db.WithContext(ctx).
		Preload("Proposal").
		Preload("SalesUser").
		Where("is_responded = ?", false).
		Order("created_at ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&questions).Error; err != nil {
		r.logger.Error("Failed to get pending questions by sales team",
			zap.Error(err),
			zap.Int("limit", limit))
		return nil, err
	}

	return questions, nil
}

// GetOverdueQuestions 期限切れ質問を取得
func (r *engineerProposalQuestionRepository) GetOverdueQuestions(ctx context.Context, overdueDays int) ([]*model.EngineerProposalQuestion, error) {
	var questions []*model.EngineerProposalQuestion

	overdueDate := time.Now().AddDate(0, 0, -overdueDays)

	if err := r.db.WithContext(ctx).
		Preload("Proposal").
		Preload("SalesUser").
		Where("is_responded = ? AND created_at <= ?", false, overdueDate).
		Order("created_at ASC").
		Find(&questions).Error; err != nil {
		r.logger.Error("Failed to get overdue questions",
			zap.Error(err),
			zap.Int("overdue_days", overdueDays))
		return nil, err
	}

	return questions, nil
}

// GetQuestionsByPriority 優先度別の質問を取得（現在は作成日順をベースとした擬似優先度）
func (r *engineerProposalQuestionRepository) GetQuestionsByPriority(ctx context.Context, priority string, limit int) ([]*model.EngineerProposalQuestion, error) {
	var questions []*model.EngineerProposalQuestion

	query := r.db.WithContext(ctx).
		Preload("Proposal").
		Preload("SalesUser").
		Where("is_responded = ?", false)

	// 優先度に基づいてソート順を調整
	switch priority {
	case "high":
		// 作成から24時間以内
		urgentDate := time.Now().Add(-24 * time.Hour)
		query = query.Where("created_at <= ?", urgentDate).Order("created_at ASC")
	case "medium":
		// 作成から24時間-72時間
		mediumStart := time.Now().Add(-72 * time.Hour)
		mediumEnd := time.Now().Add(-24 * time.Hour)
		query = query.Where("created_at BETWEEN ? AND ?", mediumStart, mediumEnd).Order("created_at ASC")
	case "low":
		// 作成から72時間以内
		recentDate := time.Now().Add(-72 * time.Hour)
		query = query.Where("created_at >= ?", recentDate).Order("created_at DESC")
	default:
		query = query.Order("created_at ASC")
	}

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&questions).Error; err != nil {
		r.logger.Error("Failed to get questions by priority",
			zap.Error(err),
			zap.String("priority", priority),
			zap.Int("limit", limit))
		return nil, err
	}

	return questions, nil
}

// GetQuestionActivityByDate 日別質問活動を取得
func (r *engineerProposalQuestionRepository) GetQuestionActivityByDate(ctx context.Context, userID string, startDate, endDate time.Time) ([]*QuestionDailyActivity, error) {
	var activities []*QuestionDailyActivity

	query := `
		SELECT 
			DATE(pq.created_at) as date,
			COUNT(*) as question_count,
			SUM(CASE WHEN pq.is_responded = true THEN 1 ELSE 0 END) as response_count,
			SUM(CASE WHEN pq.is_responded = false THEN 1 ELSE 0 END) as pending_count,
			ROUND(AVG(CASE WHEN pq.responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, pq.created_at, pq.responded_at) 
			ELSE NULL END), 2) as avg_response_time
		FROM proposal_questions pq
		JOIN proposals p ON pq.proposal_id = p.id
		WHERE p.user_id = ? AND DATE(pq.created_at) BETWEEN ? AND ? 
			AND p.deleted_at IS NULL AND pq.deleted_at IS NULL
		GROUP BY DATE(pq.created_at)
		ORDER BY date ASC
	`

	if err := r.db.WithContext(ctx).Raw(query, userID, startDate, endDate).Scan(&activities).Error; err != nil {
		r.logger.Error("Failed to get question activity by date",
			zap.Error(err),
			zap.String("user_id", userID),
			zap.Time("start_date", startDate),
			zap.Time("end_date", endDate))
		return nil, err
	}

	return activities, nil
}

// GetPopularQuestionPatterns 人気の質問パターンを取得
func (r *engineerProposalQuestionRepository) GetPopularQuestionPatterns(ctx context.Context, limit int) ([]*QuestionPattern, error) {
	var patterns []*QuestionPattern

	// 単純化したパターン分析（質問文の最初の20文字をパターンとして使用）
	query := `
		SELECT 
			LEFT(question_text, 20) as pattern,
			COUNT(*) as count,
			ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN 
				TIMESTAMPDIFF(HOUR, created_at, responded_at) 
			ELSE NULL END), 2) as avg_response_time,
			'general' as category
		FROM proposal_questions
		WHERE deleted_at IS NULL
		GROUP BY LEFT(question_text, 20)
		HAVING count >= 2
		ORDER BY count DESC
		LIMIT ?
	`

	if err := r.db.WithContext(ctx).Raw(query, limit).Scan(&patterns).Error; err != nil {
		r.logger.Error("Failed to get popular question patterns",
			zap.Error(err),
			zap.Int("limit", limit))
		return nil, err
	}

	return patterns, nil
}

// GetResponseTimeDistribution 回答時間分布を取得
func (r *engineerProposalQuestionRepository) GetResponseTimeDistribution(ctx context.Context, salesUserID uuid.UUID) (*ResponseTimeDistribution, error) {
	var distribution ResponseTimeDistribution

	query := `
		SELECT 
			COUNT(CASE WHEN TIMESTAMPDIFF(HOUR, created_at, responded_at) < 1 THEN 1 END) as under_1_hour,
			COUNT(CASE WHEN TIMESTAMPDIFF(HOUR, created_at, responded_at) BETWEEN 1 AND 5 THEN 1 END) as under_6_hours,
			COUNT(CASE WHEN TIMESTAMPDIFF(HOUR, created_at, responded_at) BETWEEN 6 AND 23 THEN 1 END) as under_24_hours,
			COUNT(CASE WHEN TIMESTAMPDIFF(HOUR, created_at, responded_at) BETWEEN 24 AND 167 THEN 1 END) as under_7_days,
			COUNT(CASE WHEN TIMESTAMPDIFF(HOUR, created_at, responded_at) >= 168 THEN 1 END) as over_7_days,
			COUNT(*) as total_responses
		FROM proposal_questions
		WHERE sales_user_id = ? AND is_responded = true AND responded_at IS NOT NULL AND deleted_at IS NULL
	`

	if err := r.db.WithContext(ctx).Raw(query, salesUserID).Scan(&distribution).Error; err != nil {
		r.logger.Error("Failed to get response time distribution",
			zap.Error(err),
			zap.String("sales_user_id", salesUserID.String()))
		return nil, err
	}

	return &distribution, nil
}

// BulkAssignSalesUser 一括で営業担当者を割り当て
func (r *engineerProposalQuestionRepository) BulkAssignSalesUser(ctx context.Context, questionIDs []uuid.UUID, salesUserID uuid.UUID) error {
	if len(questionIDs) == 0 {
		return nil
	}

	result := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Where("id IN ? AND is_responded = ?", questionIDs, false).
		Updates(map[string]interface{}{
			"sales_user_id": salesUserID,
			"updated_at":    time.Now(),
		})

	if result.Error != nil {
		r.logger.Error("Failed to bulk assign sales user",
			zap.Error(result.Error),
			zap.Int("question_count", len(questionIDs)),
			zap.String("sales_user_id", salesUserID.String()))
		return result.Error
	}

	r.logger.Info("Bulk assign sales user completed",
		zap.Int64("updated_count", result.RowsAffected),
		zap.String("sales_user_id", salesUserID.String()))

	return nil
}

// BulkMarkAsUrgent 一括で緊急マークを設定（現在は更新日時の更新のみ）
func (r *engineerProposalQuestionRepository) BulkMarkAsUrgent(ctx context.Context, questionIDs []uuid.UUID) error {
	if len(questionIDs) == 0 {
		return nil
	}

	// 現在のスキーマには緊急フラグがないため、更新日時のみを更新
	result := r.db.WithContext(ctx).
		Model(&model.EngineerProposalQuestion{}).
		Where("id IN ?", questionIDs).
		Update("updated_at", time.Now())

	if result.Error != nil {
		r.logger.Error("Failed to bulk mark as urgent",
			zap.Error(result.Error),
			zap.Int("question_count", len(questionIDs)))
		return result.Error
	}

	r.logger.Info("Bulk mark as urgent completed",
		zap.Int64("updated_count", result.RowsAffected))

	return nil
}

// BulkDelete 一括削除
func (r *engineerProposalQuestionRepository) BulkDelete(ctx context.Context, questionIDs []uuid.UUID) error {
	if len(questionIDs) == 0 {
		return nil
	}

	result := r.db.WithContext(ctx).Delete(&model.EngineerProposalQuestion{}, questionIDs)

	if result.Error != nil {
		r.logger.Error("Failed to bulk delete questions",
			zap.Error(result.Error),
			zap.Int("question_count", len(questionIDs)))
		return result.Error
	}

	r.logger.Info("Bulk delete questions completed",
		zap.Int64("deleted_count", result.RowsAffected))

	return nil
}
