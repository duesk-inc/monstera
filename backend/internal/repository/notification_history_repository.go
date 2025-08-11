package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// NotificationHistoryRepository 通知履歴リポジトリのインターフェース
type NotificationHistoryRepository interface {
	// 基本的なCRUD操作
	Create(ctx context.Context, notification *model.NotificationHistory) error
	CreateBatch(ctx context.Context, notifications []model.NotificationHistory) error
	GetByID(ctx context.Context, id string) (*model.NotificationHistory, error)
	Update(ctx context.Context, notification *model.NotificationHistory) error
	Delete(ctx context.Context, id string) error

	// 検索・取得系
	GetUnreadByUser(ctx context.Context, userID string) ([]*model.NotificationHistory, error)
	GetByUser(ctx context.Context, userID string, limit, offset int) ([]*model.NotificationHistory, int64, error)
	GetByUserAndType(ctx context.Context, userID string, notificationType model.NotificationType) ([]*model.NotificationHistory, error)
	GetByRelatedEntity(ctx context.Context, entityType, entityID string) ([]*model.NotificationHistory, error)

	// 既読管理
	MarkAsRead(ctx context.Context, notificationID string) error
	MarkMultipleAsRead(ctx context.Context, notificationIDs []string) error
	MarkAllAsReadByUser(ctx context.Context, userID string) error

	// 統計・集計
	GetUnreadCount(ctx context.Context, userID string) (int64, error)
	GetCountByType(ctx context.Context, userID string, notificationType model.NotificationType) (int64, error)

	// 削除・クリーンアップ
	DeleteOldNotifications(ctx context.Context, beforeDate time.Time) (int64, error)
	DeleteReadNotifications(ctx context.Context, userID string, beforeDate time.Time) (int64, error)
}

// notificationHistoryRepository 通知履歴リポジトリの実装
type notificationHistoryRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewNotificationHistoryRepository 通知履歴リポジトリのインスタンスを生成
func NewNotificationHistoryRepository(db *gorm.DB, logger *zap.Logger) NotificationHistoryRepository {
	return &notificationHistoryRepository{
		db:     db,
		logger: logger,
	}
}

// Create 通知履歴を作成
func (r *notificationHistoryRepository) Create(ctx context.Context, notification *model.NotificationHistory) error {
	if notification.ID == "" {
		notification.ID = uuid.New().String()
	}

	if err := r.db.WithContext(ctx).Create(notification).Error; err != nil {
		recipientID := ""
		if notification.RecipientID != nil {
			recipientID = *notification.RecipientID
		}
		r.logger.Error("Failed to create notification history",
			zap.String("recipient_id", recipientID),
			zap.String("type", string(notification.Type)),
			zap.Error(err))
		return err
	}

	return nil
}

// CreateBatch 複数の通知履歴を一括作成
func (r *notificationHistoryRepository) CreateBatch(ctx context.Context, notifications []model.NotificationHistory) error {
	if len(notifications) == 0 {
		return nil
	}

	// IDが未設定の場合は生成
	for i := range notifications {
		if notifications[i].ID == "" {
			notifications[i].ID = uuid.New().String()
		}
	}

	// バッチサイズを100に制限して挿入
	batchSize := 100
	for i := 0; i < len(notifications); i += batchSize {
		end := i + batchSize
		if end > len(notifications) {
			end = len(notifications)
		}

		if err := r.db.WithContext(ctx).CreateInBatches(notifications[i:end], batchSize).Error; err != nil {
			r.logger.Error("Failed to create notification history batch",
				zap.Int("batch_start", i),
				zap.Int("batch_end", end),
				zap.Error(err))
			return err
		}
	}

	r.logger.Info("Successfully created notification history batch",
		zap.Int("total_count", len(notifications)))

	return nil
}

// GetByID IDで通知履歴を取得
func (r *notificationHistoryRepository) GetByID(ctx context.Context, id string) (*model.NotificationHistory, error) {
	var notification model.NotificationHistory

	err := r.db.WithContext(ctx).
		Preload("Recipient").
		Preload("Sender").
		First(&notification, "id = ?", id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		r.logger.Error("Failed to get notification history by ID",
			zap.String("id", id),
			zap.Error(err))
		return nil, err
	}

	return &notification, nil
}

// Update 通知履歴を更新
func (r *notificationHistoryRepository) Update(ctx context.Context, notification *model.NotificationHistory) error {
	if err := r.db.WithContext(ctx).Save(notification).Error; err != nil {
		r.logger.Error("Failed to update notification history",
			zap.String("id", notification.ID),
			zap.Error(err))
		return err
	}

	return nil
}

// Delete 通知履歴を削除
func (r *notificationHistoryRepository) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Delete(&model.NotificationHistory{}, "id = ?", id)

	if result.Error != nil {
		r.logger.Error("Failed to delete notification history",
			zap.String("id", id),
			zap.Error(result.Error))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// GetUnreadByUser ユーザーの未読通知を取得
func (r *notificationHistoryRepository) GetUnreadByUser(ctx context.Context, userID string) ([]*model.NotificationHistory, error) {
	var notifications []*model.NotificationHistory

	err := r.db.WithContext(ctx).
		Where("recipient_id = ? AND is_read = ?", userID, false).
		Order("created_at DESC").
		Preload("Sender").
		Find(&notifications).Error

	if err != nil {
		r.logger.Error("Failed to get unread notifications",
			zap.String("user_id", userID),
			zap.Error(err))
		return nil, err
	}

	return notifications, nil
}

// GetByUser ユーザーの通知履歴を取得（ページネーション付き）
func (r *notificationHistoryRepository) GetByUser(ctx context.Context, userID string, limit, offset int) ([]*model.NotificationHistory, int64, error) {
	var notifications []*model.NotificationHistory
	var total int64

	// 総件数を取得
	if err := r.db.WithContext(ctx).
		Model(&model.NotificationHistory{}).
		Where("recipient_id = ?", userID).
		Count(&total).Error; err != nil {
		r.logger.Error("Failed to count notifications",
			zap.String("user_id", userID),
			zap.Error(err))
		return nil, 0, err
	}

	// データを取得
	err := r.db.WithContext(ctx).
		Where("recipient_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Preload("Sender").
		Find(&notifications).Error

	if err != nil {
		r.logger.Error("Failed to get notifications by user",
			zap.String("user_id", userID),
			zap.Error(err))
		return nil, 0, err
	}

	return notifications, total, nil
}

// GetByUserAndType ユーザーと通知タイプで通知履歴を取得
func (r *notificationHistoryRepository) GetByUserAndType(ctx context.Context, userID string, notificationType model.NotificationType) ([]*model.NotificationHistory, error) {
	var notifications []*model.NotificationHistory

	err := r.db.WithContext(ctx).
		Where("recipient_id = ? AND notification_type = ?", userID, notificationType).
		Order("created_at DESC").
		Preload("Sender").
		Find(&notifications).Error

	if err != nil {
		r.logger.Error("Failed to get notifications by user and type",
			zap.String("user_id", userID),
			zap.String("type", string(notificationType)),
			zap.Error(err))
		return nil, err
	}

	return notifications, nil
}

// GetByRelatedEntity 関連エンティティで通知履歴を取得
func (r *notificationHistoryRepository) GetByRelatedEntity(ctx context.Context, entityType, entityID string) ([]*model.NotificationHistory, error) {
	var notifications []*model.NotificationHistory

	err := r.db.WithContext(ctx).
		Where("related_entity_type = ? AND related_entity_id = ?", entityType, entityID).
		Order("created_at DESC").
		Preload("Recipient").
		Preload("Sender").
		Find(&notifications).Error

	if err != nil {
		r.logger.Error("Failed to get notifications by related entity",
			zap.String("entity_type", entityType),
			zap.String("entity_id", entityID),
			zap.Error(err))
		return nil, err
	}

	return notifications, nil
}

// MarkAsRead 通知を既読にする
func (r *notificationHistoryRepository) MarkAsRead(ctx context.Context, notificationID string) error {
	now := time.Now()

	result := r.db.WithContext(ctx).
		Model(&model.NotificationHistory{}).
		Where("id = ? AND is_read = ?", notificationID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		r.logger.Error("Failed to mark notification as read",
			zap.String("notification_id", notificationID),
			zap.Error(result.Error))
		return result.Error
	}

	if result.RowsAffected == 0 {
		// 既に既読か、通知が存在しない
		return nil
	}

	return nil
}

// MarkMultipleAsRead 複数の通知を既読にする
func (r *notificationHistoryRepository) MarkMultipleAsRead(ctx context.Context, notificationIDs []string) error {
	if len(notificationIDs) == 0 {
		return nil
	}

	now := time.Now()

	result := r.db.WithContext(ctx).
		Model(&model.NotificationHistory{}).
		Where("id IN ? AND is_read = ?", notificationIDs, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		r.logger.Error("Failed to mark multiple notifications as read",
			zap.Int("count", len(notificationIDs)),
			zap.Error(result.Error))
		return result.Error
	}

	r.logger.Info("Marked notifications as read",
		zap.Int64("affected_rows", result.RowsAffected))

	return nil
}

// MarkAllAsReadByUser ユーザーの全通知を既読にする
func (r *notificationHistoryRepository) MarkAllAsReadByUser(ctx context.Context, userID string) error {
	now := time.Now()

	result := r.db.WithContext(ctx).
		Model(&model.NotificationHistory{}).
		Where("recipient_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		r.logger.Error("Failed to mark all notifications as read",
			zap.String("user_id", userID),
			zap.Error(result.Error))
		return result.Error
	}

	r.logger.Info("Marked all user notifications as read",
		zap.String("user_id", userID),
		zap.Int64("affected_rows", result.RowsAffected))

	return nil
}

// GetUnreadCount ユーザーの未読通知数を取得
func (r *notificationHistoryRepository) GetUnreadCount(ctx context.Context, userID string) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&model.NotificationHistory{}).
		Where("recipient_id = ? AND is_read = ?", userID, false).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to get unread count",
			zap.String("user_id", userID),
			zap.Error(err))
		return 0, err
	}

	return count, nil
}

// GetCountByType ユーザーの通知タイプ別件数を取得
func (r *notificationHistoryRepository) GetCountByType(ctx context.Context, userID string, notificationType model.NotificationType) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&model.NotificationHistory{}).
		Where("recipient_id = ? AND notification_type = ?", userID, notificationType).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to get count by type",
			zap.String("user_id", userID),
			zap.String("type", string(notificationType)),
			zap.Error(err))
		return 0, err
	}

	return count, nil
}

// DeleteOldNotifications 古い通知を削除
func (r *notificationHistoryRepository) DeleteOldNotifications(ctx context.Context, beforeDate time.Time) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("created_at < ?", beforeDate).
		Delete(&model.NotificationHistory{})

	if result.Error != nil {
		r.logger.Error("Failed to delete old notifications",
			zap.Time("before_date", beforeDate),
			zap.Error(result.Error))
		return 0, result.Error
	}

	r.logger.Info("Deleted old notifications",
		zap.Time("before_date", beforeDate),
		zap.Int64("deleted_count", result.RowsAffected))

	return result.RowsAffected, nil
}

// DeleteReadNotifications ユーザーの既読通知を削除
func (r *notificationHistoryRepository) DeleteReadNotifications(ctx context.Context, userID string, beforeDate time.Time) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("recipient_id = ? AND is_read = ? AND read_at < ?", userID, true, beforeDate).
		Delete(&model.NotificationHistory{})

	if result.Error != nil {
		r.logger.Error("Failed to delete read notifications",
			zap.String("user_id", userID),
			zap.Time("before_date", beforeDate),
			zap.Error(result.Error))
		return 0, result.Error
	}

	r.logger.Info("Deleted read notifications",
		zap.String("user_id", userID),
		zap.Time("before_date", beforeDate),
		zap.Int64("deleted_count", result.RowsAffected))

	return result.RowsAffected, nil
}
