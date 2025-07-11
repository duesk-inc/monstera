package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// EmailCampaignRepository メールキャンペーンリポジトリのインターフェース
type EmailCampaignRepository interface {
	Create(ctx context.Context, campaign *model.EmailCampaign) error
	GetByID(ctx context.Context, id string) (*model.EmailCampaign, error)
	GetList(ctx context.Context, filter EmailCampaignFilter) ([]model.EmailCampaign, int64, error)
	Update(ctx context.Context, campaign *model.EmailCampaign) error
	UpdateStatus(ctx context.Context, id string, status model.CampaignStatus, updatedBy string) error
	Delete(ctx context.Context, id string, deletedBy string) error
	GetScheduledCampaigns(ctx context.Context) ([]model.EmailCampaign, error)
	GetActiveCampaigns(ctx context.Context) ([]model.EmailCampaign, error)
	GetCampaignsByTemplate(ctx context.Context, templateID string) ([]model.EmailCampaign, error)
	UpdateSentCount(ctx context.Context, id string, increment int) error
	UpdateOpenCount(ctx context.Context, id string, increment int) error
	UpdateClickCount(ctx context.Context, id string, increment int) error
	GetCampaignStats(ctx context.Context, id string) (*CampaignStats, error)
	AddSentHistory(ctx context.Context, history *model.EmailSentHistory) error
	GetSentHistory(ctx context.Context, campaignID string) ([]model.EmailSentHistory, error)
	UpdateDeliveryStatus(ctx context.Context, historyID string, status model.DeliveryStatus) error
}

// EmailCampaignFilter メールキャンペーンフィルター
type EmailCampaignFilter struct {
	TemplateID    string
	Status        []model.CampaignStatus
	ScheduledFrom *time.Time
	ScheduledTo   *time.Time
	CreatedBy     string
	Page          int
	Limit         int
}

// CampaignStats キャンペーン統計
type CampaignStats struct {
	TotalRecipients int
	SentCount       int
	OpenCount       int
	ClickCount      int
	DeliveryRate    float64
	OpenRate        float64
	ClickRate       float64
}

// emailCampaignRepository メールキャンペーンリポジトリの実装
type emailCampaignRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewEmailCampaignRepository メールキャンペーンリポジトリのインスタンスを生成
func NewEmailCampaignRepository(baseRepo BaseRepository) EmailCampaignRepository {
	return &emailCampaignRepository{
		db:     baseRepo.GetDB(),
		logger: baseRepo.GetLogger(),
	}
}

// Create メールキャンペーンを作成
func (r *emailCampaignRepository) Create(ctx context.Context, campaign *model.EmailCampaign) error {
	if err := r.db.WithContext(ctx).Create(campaign).Error; err != nil {
		r.logger.Error("Failed to create email campaign", zap.Error(err))
		return err
	}
	return nil
}

// GetByID メールキャンペーンをIDで取得
func (r *emailCampaignRepository) GetByID(ctx context.Context, id string) (*model.EmailCampaign, error) {
	var campaign model.EmailCampaign
	if err := r.db.WithContext(ctx).
		Preload("Template").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&campaign).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		r.logger.Error("Failed to get email campaign by ID", zap.Error(err), zap.String("id", id))
		return nil, err
	}
	return &campaign, nil
}

// GetList メールキャンペーン一覧を取得
func (r *emailCampaignRepository) GetList(ctx context.Context, filter EmailCampaignFilter) ([]model.EmailCampaign, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.EmailCampaign{}).
		Preload("Template").
		Where("deleted_at IS NULL")

	// フィルター条件
	if filter.TemplateID != "" {
		query = query.Where("template_id = ?", filter.TemplateID)
	}
	if len(filter.Status) > 0 {
		query = query.Where("status IN ?", filter.Status)
	}
	if filter.ScheduledFrom != nil {
		query = query.Where("scheduled_at >= ?", *filter.ScheduledFrom)
	}
	if filter.ScheduledTo != nil {
		query = query.Where("scheduled_at <= ?", *filter.ScheduledTo)
	}
	if filter.CreatedBy != "" {
		query = query.Where("created_by = ?", filter.CreatedBy)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count email campaigns", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション
	if filter.Page > 0 && filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	// データを取得
	var campaigns []model.EmailCampaign
	if err := query.Order("scheduled_at DESC").Find(&campaigns).Error; err != nil {
		r.logger.Error("Failed to get email campaigns", zap.Error(err))
		return nil, 0, err
	}

	return campaigns, total, nil
}

// Update メールキャンペーンを更新
func (r *emailCampaignRepository) Update(ctx context.Context, campaign *model.EmailCampaign) error {
	if err := r.db.WithContext(ctx).Save(campaign).Error; err != nil {
		r.logger.Error("Failed to update email campaign", zap.Error(err))
		return err
	}
	return nil
}

// UpdateStatus ステータスを更新
func (r *emailCampaignRepository) UpdateStatus(ctx context.Context, id string, status model.CampaignStatus, updatedBy string) error {
	result := r.db.WithContext(ctx).Model(&model.EmailCampaign{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"status":     status,
			"updated_by": updatedBy,
			"updated_at": time.Now(),
		})
	if result.Error != nil {
		r.logger.Error("Failed to update campaign status", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// Delete メールキャンペーンを削除（論理削除）
func (r *emailCampaignRepository) Delete(ctx context.Context, id string, deletedBy string) error {
	result := r.db.WithContext(ctx).Model(&model.EmailCampaign{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"deleted_at": time.Now(),
			"updated_by": deletedBy,
		})
	if result.Error != nil {
		r.logger.Error("Failed to delete email campaign", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// GetScheduledCampaigns スケジュール済みキャンペーンを取得
func (r *emailCampaignRepository) GetScheduledCampaigns(ctx context.Context) ([]model.EmailCampaign, error) {
	var campaigns []model.EmailCampaign
	if err := r.db.WithContext(ctx).
		Preload("Template").
		Where("status = ? AND scheduled_at <= ? AND deleted_at IS NULL",
			model.CampaignStatusScheduled, time.Now()).
		Find(&campaigns).Error; err != nil {
		r.logger.Error("Failed to get scheduled campaigns", zap.Error(err))
		return nil, err
	}
	return campaigns, nil
}

// GetActiveCampaigns アクティブなキャンペーンを取得
func (r *emailCampaignRepository) GetActiveCampaigns(ctx context.Context) ([]model.EmailCampaign, error) {
	var campaigns []model.EmailCampaign
	if err := r.db.WithContext(ctx).
		Preload("Template").
		Where("status IN (?, ?) AND deleted_at IS NULL",
			model.CampaignStatusScheduled, model.CampaignStatusSending).
		Find(&campaigns).Error; err != nil {
		r.logger.Error("Failed to get active campaigns", zap.Error(err))
		return nil, err
	}
	return campaigns, nil
}

// GetCampaignsByTemplate テンプレートIDでキャンペーンを取得
func (r *emailCampaignRepository) GetCampaignsByTemplate(ctx context.Context, templateID string) ([]model.EmailCampaign, error) {
	var campaigns []model.EmailCampaign
	if err := r.db.WithContext(ctx).
		Where("template_id = ? AND deleted_at IS NULL", templateID).
		Find(&campaigns).Error; err != nil {
		r.logger.Error("Failed to get campaigns by template", zap.Error(err))
		return nil, err
	}
	return campaigns, nil
}

// UpdateSentCount 送信数を更新
func (r *emailCampaignRepository) UpdateSentCount(ctx context.Context, id string, increment int) error {
	return r.db.WithContext(ctx).Model(&model.EmailCampaign{}).
		Where("id = ?", id).
		UpdateColumn("sent_count", gorm.Expr("sent_count + ?", increment)).Error
}

// UpdateOpenCount 開封数を更新
func (r *emailCampaignRepository) UpdateOpenCount(ctx context.Context, id string, increment int) error {
	return r.db.WithContext(ctx).Model(&model.EmailCampaign{}).
		Where("id = ?", id).
		UpdateColumn("open_count", gorm.Expr("open_count + ?", increment)).Error
}

// UpdateClickCount クリック数を更新
func (r *emailCampaignRepository) UpdateClickCount(ctx context.Context, id string, increment int) error {
	return r.db.WithContext(ctx).Model(&model.EmailCampaign{}).
		Where("id = ?", id).
		UpdateColumn("click_count", gorm.Expr("click_count + ?", increment)).Error
}

// GetCampaignStats キャンペーン統計を取得
func (r *emailCampaignRepository) GetCampaignStats(ctx context.Context, id string) (*CampaignStats, error) {
	var campaign model.EmailCampaign
	if err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&campaign).Error; err != nil {
		return nil, err
	}

	stats := &CampaignStats{
		TotalRecipients: campaign.TotalRecipients,
		SentCount:       campaign.SentCount,
		OpenCount:       campaign.OpenCount,
		ClickCount:      campaign.ClickCount,
	}

	// レート計算
	if stats.TotalRecipients > 0 {
		stats.DeliveryRate = float64(stats.SentCount) / float64(stats.TotalRecipients) * 100
		if stats.SentCount > 0 {
			stats.OpenRate = float64(stats.OpenCount) / float64(stats.SentCount) * 100
			stats.ClickRate = float64(stats.ClickCount) / float64(stats.SentCount) * 100
		}
	}

	return stats, nil
}

// AddSentHistory 送信履歴を追加
func (r *emailCampaignRepository) AddSentHistory(ctx context.Context, history *model.EmailSentHistory) error {
	if err := r.db.WithContext(ctx).Create(history).Error; err != nil {
		r.logger.Error("Failed to add sent history", zap.Error(err))
		return err
	}
	return nil
}

// GetSentHistory 送信履歴を取得
func (r *emailCampaignRepository) GetSentHistory(ctx context.Context, campaignID string) ([]model.EmailSentHistory, error) {
	var histories []model.EmailSentHistory
	if err := r.db.WithContext(ctx).
		Where("campaign_id = ?", campaignID).
		Order("sent_at DESC").
		Find(&histories).Error; err != nil {
		r.logger.Error("Failed to get sent history", zap.Error(err))
		return nil, err
	}
	return histories, nil
}

// UpdateDeliveryStatus 配信ステータスを更新
func (r *emailCampaignRepository) UpdateDeliveryStatus(ctx context.Context, historyID string, status model.DeliveryStatus) error {
	result := r.db.WithContext(ctx).Model(&model.EmailSentHistory{}).
		Where("id = ?", historyID).
		Updates(map[string]interface{}{
			"delivery_status": status,
			"updated_at":      time.Now(),
		})
	if result.Error != nil {
		r.logger.Error("Failed to update delivery status", zap.Error(result.Error))
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
