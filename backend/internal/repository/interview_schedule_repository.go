package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// InterviewScheduleRepository 面談スケジュールリポジトリのインターフェース
type InterviewScheduleRepository interface {
	Create(ctx context.Context, interview *model.InterviewSchedule) error
	GetByID(ctx context.Context, id string) (*model.InterviewSchedule, error)
	GetList(ctx context.Context, filter InterviewScheduleFilter) ([]model.InterviewSchedule, int64, error)
	Update(ctx context.Context, interview *model.InterviewSchedule) error
	UpdateStatus(ctx context.Context, id string, status model.InterviewStatus, updatedBy string) error
	Delete(ctx context.Context, id string, deletedBy string) error
	GetByProposal(ctx context.Context, proposalID string) ([]model.InterviewSchedule, error)
	GetUpcomingInterviews(ctx context.Context, days int) ([]model.InterviewSchedule, error)
	GetTodayInterviews(ctx context.Context) ([]model.InterviewSchedule, error)
}

// InterviewScheduleFilter 面談スケジュールフィルター
type InterviewScheduleFilter struct {
	ProposalID    string
	Status        []model.InterviewStatus
	ScheduledFrom *time.Time
	ScheduledTo   *time.Time
	Page          int
	Limit         int
}

// interviewScheduleRepository 面談スケジュールリポジトリの実装
type interviewScheduleRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewInterviewScheduleRepository 面談スケジュールリポジトリのインスタンスを生成
func NewInterviewScheduleRepository(baseRepo BaseRepository) InterviewScheduleRepository {
	return &interviewScheduleRepository{
		db:     baseRepo.GetDB(),
		logger: baseRepo.GetLogger(),
	}
}

// Create 面談スケジュールを作成
func (r *interviewScheduleRepository) Create(ctx context.Context, interview *model.InterviewSchedule) error {
	if err := r.db.WithContext(ctx).Create(interview).Error; err != nil {
		r.logger.Error("Failed to create interview schedule", zap.Error(err))
		return err
	}
	return nil
}

// GetByID 面談スケジュールをIDで取得
func (r *interviewScheduleRepository) GetByID(ctx context.Context, id string) (*model.InterviewSchedule, error) {
	var interview model.InterviewSchedule
	if err := r.db.WithContext(ctx).
		Preload("Proposal.Engineer.User").
		Preload("Proposal.Client").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&interview).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get interview schedule by ID", zap.Error(err), zap.String("id", id))
		return nil, err
	}
	return &interview, nil
}

// GetList 面談スケジュール一覧を取得
func (r *interviewScheduleRepository) GetList(ctx context.Context, filter InterviewScheduleFilter) ([]model.InterviewSchedule, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.InterviewSchedule{}).
		Preload("Proposal.Engineer.User").
		Preload("Proposal.Client").
		Where("deleted_at IS NULL")

	// フィルター条件
	if filter.ProposalID != "" {
		query = query.Where("proposal_id = ?", filter.ProposalID)
	}
	if len(filter.Status) > 0 {
		query = query.Where("status IN ?", filter.Status)
	}
	if filter.ScheduledFrom != nil {
		query = query.Where("scheduled_date >= ?", *filter.ScheduledFrom)
	}
	if filter.ScheduledTo != nil {
		query = query.Where("scheduled_date <= ?", *filter.ScheduledTo)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count interview schedules", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// データを取得
	var interviews []model.InterviewSchedule
	if err := query.Order("scheduled_date ASC").Find(&interviews).Error; err != nil {
		r.logger.Error("Failed to get interview schedules", zap.Error(err))
		return nil, 0, err
	}

	return interviews, total, nil
}

// Update 面談スケジュールを更新
func (r *interviewScheduleRepository) Update(ctx context.Context, interview *model.InterviewSchedule) error {
	if err := r.db.WithContext(ctx).Save(interview).Error; err != nil {
		r.logger.Error("Failed to update interview schedule", zap.Error(err))
		return err
	}
	return nil
}

// UpdateStatus ステータスを更新
func (r *interviewScheduleRepository) UpdateStatus(ctx context.Context, id string, status model.InterviewStatus, updatedBy string) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_by": updatedBy,
		"updated_at": time.Now(),
	}

	// 完了時の処理
	if status == model.InterviewStatusCompleted {
		updates["completed_at"] = time.Now()
	}

	result := r.db.WithContext(ctx).Model(&model.InterviewSchedule{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates)

	if result.Error != nil {
		r.logger.Error("Failed to update interview status", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// Delete 面談スケジュールを削除（論理削除）
func (r *interviewScheduleRepository) Delete(ctx context.Context, id string, deletedBy string) error {
	result := r.db.WithContext(ctx).Model(&model.InterviewSchedule{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"deleted_at": time.Now(),
			"updated_by": deletedBy,
		})
	if result.Error != nil {
		r.logger.Error("Failed to delete interview schedule", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// GetByProposal 提案IDで面談スケジュールを取得
func (r *interviewScheduleRepository) GetByProposal(ctx context.Context, proposalID string) ([]model.InterviewSchedule, error) {
	var interviews []model.InterviewSchedule
	if err := r.db.WithContext(ctx).
		Where("proposal_id = ? AND deleted_at IS NULL", proposalID).
		Order("scheduled_date ASC").
		Find(&interviews).Error; err != nil {
		r.logger.Error("Failed to get interviews by proposal", zap.Error(err))
		return nil, err
	}
	return interviews, nil
}

// GetUpcomingInterviews 今後の面談を取得（指定日数以内）
func (r *interviewScheduleRepository) GetUpcomingInterviews(ctx context.Context, days int) ([]model.InterviewSchedule, error) {
	targetDate := time.Now().AddDate(0, 0, days)
	var interviews []model.InterviewSchedule
	if err := r.db.WithContext(ctx).
		Preload("Proposal.Engineer.User").
		Preload("Proposal.Client").
		Where("status = ? AND scheduled_date BETWEEN ? AND ? AND deleted_at IS NULL",
			model.InterviewStatusScheduled, time.Now(), targetDate).
		Order("scheduled_date ASC").
		Find(&interviews).Error; err != nil {
		r.logger.Error("Failed to get upcoming interviews", zap.Error(err))
		return nil, err
	}
	return interviews, nil
}

// GetTodayInterviews 今日の面談を取得
func (r *interviewScheduleRepository) GetTodayInterviews(ctx context.Context) ([]model.InterviewSchedule, error) {
	today := time.Now()
	startOfDay := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	var interviews []model.InterviewSchedule
	if err := r.db.WithContext(ctx).
		Preload("Proposal.Engineer.User").
		Preload("Proposal.Client").
		Where("status = ? AND scheduled_date >= ? AND scheduled_date < ? AND deleted_at IS NULL",
			model.InterviewStatusScheduled, startOfDay, endOfDay).
		Order("scheduled_date ASC").
		Find(&interviews).Error; err != nil {
		r.logger.Error("Failed to get today's interviews", zap.Error(err))
		return nil, err
	}
	return interviews, nil
}
