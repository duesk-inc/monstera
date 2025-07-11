package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ProposalRepository 提案リポジトリのインターフェース
type ProposalRepository interface {
	Create(ctx context.Context, proposal *model.Proposal) error
	GetByID(ctx context.Context, id string) (*model.Proposal, error)
	GetList(ctx context.Context, filter ProposalFilter) ([]model.Proposal, int64, error)
	Update(ctx context.Context, proposal *model.Proposal) error
	UpdateStatus(ctx context.Context, id string, status model.ProposalStatus, updatedBy string) error
	Delete(ctx context.Context, id string, deletedBy string) error
	GetByEngineer(ctx context.Context, engineerID string) ([]model.Proposal, error)
	GetByClient(ctx context.Context, clientID string) ([]model.Proposal, error)
	GetExpiredProposals(ctx context.Context) ([]model.Proposal, error)
	GetPendingProposals(ctx context.Context, days int) ([]model.Proposal, error)
}

// ProposalFilter 提案フィルター
type ProposalFilter struct {
	EngineerID       string
	ClientID         string
	Status           []model.ProposalStatus
	ProposalDateFrom *time.Time
	ProposalDateTo   *time.Time
	Page             int
	Limit            int
}

// proposalRepository 提案リポジトリの実装
type proposalRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewProposalRepository 提案リポジトリのインスタンスを生成
func NewProposalRepository(baseRepo BaseRepository) ProposalRepository {
	return &proposalRepository{
		db:     baseRepo.GetDB(),
		logger: baseRepo.GetLogger(),
	}
}

// Create 提案を作成
func (r *proposalRepository) Create(ctx context.Context, proposal *model.Proposal) error {
	if err := r.db.WithContext(ctx).Create(proposal).Error; err != nil {
		r.logger.Error("Failed to create proposal", zap.Error(err))
		return err
	}
	return nil
}

// GetByID 提案をIDで取得
func (r *proposalRepository) GetByID(ctx context.Context, id string) (*model.Proposal, error) {
	var proposal model.Proposal
	if err := r.db.WithContext(ctx).
		Preload("Engineer.User").
		Preload("Client").
		Preload("Project").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&proposal).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get proposal by ID", zap.Error(err), zap.String("id", id))
		return nil, err
	}
	return &proposal, nil
}

// GetList 提案一覧を取得
func (r *proposalRepository) GetList(ctx context.Context, filter ProposalFilter) ([]model.Proposal, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.Proposal{}).
		Preload("Engineer.User").
		Preload("Client").
		Preload("Project").
		Where("deleted_at IS NULL")

	// フィルター条件
	if filter.EngineerID != "" {
		query = query.Where("engineer_id = ?", filter.EngineerID)
	}
	if filter.ClientID != "" {
		query = query.Where("client_id = ?", filter.ClientID)
	}
	if len(filter.Status) > 0 {
		query = query.Where("status IN ?", filter.Status)
	}
	if filter.ProposalDateFrom != nil {
		query = query.Where("proposal_date >= ?", *filter.ProposalDateFrom)
	}
	if filter.ProposalDateTo != nil {
		query = query.Where("proposal_date <= ?", *filter.ProposalDateTo)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count proposals", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// データを取得
	var proposals []model.Proposal
	if err := query.Order("proposal_date DESC").Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get proposals", zap.Error(err))
		return nil, 0, err
	}

	return proposals, total, nil
}

// Update 提案を更新
func (r *proposalRepository) Update(ctx context.Context, proposal *model.Proposal) error {
	if err := r.db.WithContext(ctx).Save(proposal).Error; err != nil {
		r.logger.Error("Failed to update proposal", zap.Error(err))
		return err
	}
	return nil
}

// UpdateStatus ステータスを更新
func (r *proposalRepository) UpdateStatus(ctx context.Context, id string, status model.ProposalStatus, updatedBy string) error {
	result := r.db.WithContext(ctx).Model(&model.Proposal{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"status":     status,
			"updated_by": updatedBy,
			"updated_at": time.Now(),
		})
	if result.Error != nil {
		r.logger.Error("Failed to update proposal status", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// Delete 提案を削除（論理削除）
func (r *proposalRepository) Delete(ctx context.Context, id string, deletedBy string) error {
	result := r.db.WithContext(ctx).Model(&model.Proposal{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"deleted_at": time.Now(),
			"updated_by": deletedBy,
		})
	if result.Error != nil {
		r.logger.Error("Failed to delete proposal", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// GetByEngineer エンジニアIDで提案を取得
func (r *proposalRepository) GetByEngineer(ctx context.Context, engineerID string) ([]model.Proposal, error) {
	var proposals []model.Proposal
	if err := r.db.WithContext(ctx).
		Preload("Client").
		Preload("Project").
		Where("engineer_id = ? AND deleted_at IS NULL", engineerID).
		Order("proposal_date DESC").
		Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get proposals by engineer", zap.Error(err))
		return nil, err
	}
	return proposals, nil
}

// GetByClient クライアントIDで提案を取得
func (r *proposalRepository) GetByClient(ctx context.Context, clientID string) ([]model.Proposal, error) {
	var proposals []model.Proposal
	if err := r.db.WithContext(ctx).
		Preload("Engineer.User").
		Preload("Project").
		Where("client_id = ? AND deleted_at IS NULL", clientID).
		Order("proposal_date DESC").
		Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get proposals by client", zap.Error(err))
		return nil, err
	}
	return proposals, nil
}

// GetExpiredProposals 期限切れの提案を取得
func (r *proposalRepository) GetExpiredProposals(ctx context.Context) ([]model.Proposal, error) {
	var proposals []model.Proposal
	if err := r.db.WithContext(ctx).
		Preload("Engineer.User").
		Preload("Client").
		Where("status = ? AND response_deadline < ? AND deleted_at IS NULL",
			model.ProposalStatusSubmitted, time.Now()).
		Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get expired proposals", zap.Error(err))
		return nil, err
	}
	return proposals, nil
}

// GetPendingProposals 保留中の提案を取得（指定日数以内に期限が来るもの）
func (r *proposalRepository) GetPendingProposals(ctx context.Context, days int) ([]model.Proposal, error) {
	targetDate := time.Now().AddDate(0, 0, days)
	var proposals []model.Proposal
	if err := r.db.WithContext(ctx).
		Preload("Engineer.User").
		Preload("Client").
		Where("status = ? AND response_deadline BETWEEN ? AND ? AND deleted_at IS NULL",
			model.ProposalStatusSubmitted, time.Now(), targetDate).
		Find(&proposals).Error; err != nil {
		r.logger.Error("Failed to get pending proposals", zap.Error(err))
		return nil, err
	}
	return proposals, nil
}
