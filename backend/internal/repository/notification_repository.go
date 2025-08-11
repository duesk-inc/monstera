package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/utils"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// NotificationRepository は通知関連のデータアクセスを担当するインターフェース
type NotificationRepository interface {
	// 基本CRUD操作
	GetNotificationByID(ctx context.Context, id string) (model.Notification, error)
	CreateNotification(ctx context.Context, notification model.Notification) (model.Notification, error)
	UpdateNotification(ctx context.Context, notification *model.Notification) error
	DeleteNotification(ctx context.Context, id string) error
	SoftDeleteNotification(ctx context.Context, id string) error

	// 通知一覧取得
	GetNotificationsByRecipient(ctx context.Context, recipientID string, params *NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error)
	GetUnreadNotificationsByRecipient(ctx context.Context, recipientID string) ([]*model.Notification, error)
	GetRecentNotificationsByRecipient(ctx context.Context, recipientID string, limit int) ([]*model.Notification, error)

	// 通知操作
	MarkNotificationAsRead(ctx context.Context, id string) error
	MarkNotificationsAsReadByRecipient(ctx context.Context, recipientID string, ids []string) error
	MarkAllNotificationsAsReadByRecipient(ctx context.Context, recipientID string) error
	HideNotification(ctx context.Context, id string) error

	// 集計・統計
	GetUnreadNotificationCountByRecipient(ctx context.Context, recipientID string) (int64, error)
	GetNotificationCountByTypeAndRecipient(ctx context.Context, notificationType model.NotificationType, recipientID string) (int64, error)

	// バルク操作
	CreateNotificationsBulk(ctx context.Context, notifications []*model.Notification) error
	DeleteExpiredNotifications(ctx context.Context) (int64, error)

	// 管理者向け機能
	GetAllNotifications(ctx context.Context, params *NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error)
	GetNotificationsByType(ctx context.Context, notificationType model.NotificationType, params *NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error)
	GetNotificationStats(ctx context.Context, startDate, endDate time.Time) (*NotificationStats, error)

	// 既存インターフェース（互換性維持）
	CountByTypeAndDateRange(ctx context.Context, userID string, notificationType model.NotificationType, startDate, endDate time.Time) (int64, error)
	GetUserNotifications(ctx context.Context, userID string, limit, offset int) ([]model.UserNotification, int64, error)
	GetUserNotificationByID(ctx context.Context, id string) (model.UserNotification, error)
	CreateUserNotification(ctx context.Context, userNotification model.UserNotification) (model.UserNotification, error)
	CreateUserNotificationBulk(ctx context.Context, userNotifications []model.UserNotification) error
	MarkAsRead(ctx context.Context, userID string, notificationIDs []string) error
	GetUnreadCount(ctx context.Context, userID string) (int64, error)

	// 通知設定関連
	GetUserNotificationSettings(ctx context.Context, userID string) ([]model.NotificationSetting, error)
	GetUserNotificationSettingByType(ctx context.Context, userID string, notificationType model.NotificationType) (model.NotificationSetting, error)
	UpsertUserNotificationSetting(ctx context.Context, setting model.NotificationSetting) (model.NotificationSetting, error)
}

// NotificationQueryParams 通知クエリパラメータ
type NotificationQueryParams struct {
	Page          int                         `json:"page"`
	Limit         int                         `json:"limit"`
	Status        *model.NotificationStatus   `json:"status,omitempty"`
	Type          *model.NotificationType     `json:"type,omitempty"`
	Priority      *model.NotificationPriority `json:"priority,omitempty"`
	StartDate     *time.Time                  `json:"start_date,omitempty"`
	EndDate       *time.Time                  `json:"end_date,omitempty"`
	SearchKeyword string                      `json:"search_keyword,omitempty"`
	SortBy        string                      `json:"sort_by,omitempty"`
	SortDirection string                      `json:"sort_direction,omitempty"`
}

// NotificationStats 通知統計情報
type NotificationStats struct {
	TotalNotifications  int64                            `json:"total_notifications"`
	UnreadNotifications int64                            `json:"unread_notifications"`
	ReadNotifications   int64                            `json:"read_notifications"`
	NotificationsByType map[model.NotificationType]int64 `json:"notifications_by_type"`
	NotificationsByDate map[string]int64                 `json:"notifications_by_date"`
	AvgReadTime         *float64                         `json:"avg_read_time,omitempty"` // 平均既読時間（分）
}

// notificationRepository は NotificationRepository の実装
type notificationRepository struct {
	repository.BaseRepository
	logger  *zap.Logger
	dbUtils *utils.DatabaseUtils
}

// NewNotificationRepository は通知リポジトリのインスタンスを生成します
func NewNotificationRepository(db *gorm.DB, logger *zap.Logger) NotificationRepository {
	return &notificationRepository{
		BaseRepository: repository.NewBaseRepository(db, logger),
		logger:         logger,
		dbUtils:        utils.NewDatabaseUtils(db),
	}
}

// GetNotificationByID は指定IDの通知を取得します
func (r *notificationRepository) GetNotificationByID(ctx context.Context, id string) (model.Notification, error) {
	var notification model.Notification
	result := r.WithContext(ctx).First(&notification, "id = ?", id)
	if result.Error != nil {
		return notification, fmt.Errorf("通知の取得に失敗しました: %w", result.Error)
	}
	return notification, nil
}

// CreateNotification は新しい通知を作成します
func (r *notificationRepository) CreateNotification(ctx context.Context, notification model.Notification) (model.Notification, error) {
	if notification.ID == "" {
		notification.ID = uuid.New().String()
	}

	result := r.WithContext(ctx).Create(&notification)
	if result.Error != nil {
		return notification, fmt.Errorf("通知の作成に失敗しました: %w", result.Error)
	}

	return notification, nil
}

// GetUserNotifications はユーザーの通知一覧を取得します
func (r *notificationRepository) GetUserNotifications(ctx context.Context, userID string, limit, offset int) ([]model.UserNotification, int64, error) {
	var userNotifications []model.UserNotification
	var total int64

	// 通知を取得
	query := r.WithContext(ctx).
		Preload("Notification").
		Where("user_id = ?", userID).
		Where("deleted_at IS NULL").
		Order("created_at DESC")

	// 総件数を取得
	r.WithContext(ctx).
		Model(&model.UserNotification{}).
		Where("user_id = ?", userID).
		Where("deleted_at IS NULL").
		Count(&total)

	// ページネーションを適用
	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	result := query.Find(&userNotifications)
	if result.Error != nil {
		return nil, 0, fmt.Errorf("ユーザー通知の取得に失敗しました: %w", result.Error)
	}

	return userNotifications, total, nil
}

// GetUserNotificationByID は指定IDのユーザー通知を取得します
func (r *notificationRepository) GetUserNotificationByID(ctx context.Context, id string) (model.UserNotification, error) {
	var userNotification model.UserNotification
	result := r.WithContext(ctx).
		Preload("Notification").
		First(&userNotification, "id = ?", id)

	if result.Error != nil {
		return userNotification, fmt.Errorf("ユーザー通知の取得に失敗しました: %w", result.Error)
	}

	return userNotification, nil
}

// CreateUserNotification は新しいユーザー通知を作成します
func (r *notificationRepository) CreateUserNotification(ctx context.Context, userNotification model.UserNotification) (model.UserNotification, error) {
	if userNotification.ID == "" {
		userNotification.ID = uuid.New().String()
	}

	result := r.WithContext(ctx).Create(&userNotification)
	if result.Error != nil {
		return userNotification, fmt.Errorf("ユーザー通知の作成に失敗しました: %w", result.Error)
	}

	return userNotification, nil
}

// CreateUserNotificationBulk は複数のユーザー通知を一括で作成します
func (r *notificationRepository) CreateUserNotificationBulk(ctx context.Context, userNotifications []model.UserNotification) error {
	// IDを生成
	for i := range userNotifications {
		if userNotifications[i].ID == "" {
			userNotifications[i].ID = uuid.New().String()
		}
	}

	result := r.WithContext(ctx).Create(&userNotifications)
	if result.Error != nil {
		return fmt.Errorf("ユーザー通知の一括作成に失敗しました: %w", result.Error)
	}

	return nil
}

// MarkAsRead は指定された通知を既読に更新します
func (r *notificationRepository) MarkAsRead(ctx context.Context, userID string, notificationIDs []string) error {
	now := time.Now()

	result := r.WithContext(ctx).
		Model(&model.UserNotification{}).
		Where("user_id = ? AND notification_id IN ? AND is_read = ?", userID, notificationIDs, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		return fmt.Errorf("通知の既読化に失敗しました: %w", result.Error)
	}

	return nil
}

// GetUnreadCount はユーザーの未読通知数を取得します
func (r *notificationRepository) GetUnreadCount(ctx context.Context, userID string) (int64, error) {
	var count int64
	result := r.WithContext(ctx).
		Model(&model.UserNotification{}).
		Where("user_id = ? AND is_read = ? AND deleted_at IS NULL", userID, false).
		Count(&count)

	if result.Error != nil {
		return 0, fmt.Errorf("未読通知数の取得に失敗しました: %w", result.Error)
	}

	return count, nil
}

// GetUserNotificationSettings はユーザーの通知設定一覧を取得します
func (r *notificationRepository) GetUserNotificationSettings(ctx context.Context, userID string) ([]model.NotificationSetting, error) {
	var settings []model.NotificationSetting
	result := r.WithContext(ctx).
		Where("user_id = ?", userID).
		Find(&settings)

	if result.Error != nil {
		return nil, fmt.Errorf("通知設定の取得に失敗しました: %w", result.Error)
	}

	return settings, nil
}

// GetUserNotificationSettingByType は指定タイプのユーザー通知設定を取得します
func (r *notificationRepository) GetUserNotificationSettingByType(ctx context.Context, userID string, notificationType model.NotificationType) (model.NotificationSetting, error) {
	var setting model.NotificationSetting
	result := r.WithContext(ctx).
		Where("user_id = ? AND notification_type = ?", userID, notificationType).
		First(&setting)

	if result.Error != nil {
		return setting, fmt.Errorf("通知設定の取得に失敗しました: %w", result.Error)
	}

	return setting, nil
}

// UpsertUserNotificationSetting はユーザーの通知設定を作成/更新します
func (r *notificationRepository) UpsertUserNotificationSetting(ctx context.Context, setting model.NotificationSetting) (model.NotificationSetting, error) {
	if setting.ID == "" {
		setting.ID = uuid.New().String()
	}

	// 既存の設定を確認
	var existingSetting model.NotificationSetting
	result := r.WithContext(ctx).
		Where("user_id = ? AND notification_type = ?", setting.UserID, setting.NotificationType).
		First(&existingSetting)

	if result.Error == nil {
		// 既存設定がある場合は更新
		setting.ID = existingSetting.ID
		setting.CreatedAt = existingSetting.CreatedAt

		result = r.WithContext(ctx).
			Where("id = ?", existingSetting.ID).
			Updates(map[string]interface{}{
				"is_enabled":    setting.IsEnabled,
				"email_enabled": setting.EmailEnabled,
				"updated_at":    time.Now(),
			})

		if result.Error != nil {
			return setting, fmt.Errorf("通知設定の更新に失敗しました: %w", result.Error)
		}

		return setting, nil
	}

	// 新規作成の場合
	result = r.WithContext(ctx).Create(&setting)
	if result.Error != nil {
		return setting, fmt.Errorf("通知設定の作成に失敗しました: %w", result.Error)
	}

	return setting, nil
}

// 新しいメソッドの実装

// UpdateNotification 通知を更新
func (r *notificationRepository) UpdateNotification(ctx context.Context, notification *model.Notification) error {
	return r.WithContext(ctx).Save(notification).Error
}

// DeleteNotification 通知を物理削除
func (r *notificationRepository) DeleteNotification(ctx context.Context, id string) error {
	return r.WithContext(ctx).
		Unscoped().
		Delete(&model.Notification{}, "id = ?", id).Error
}

// SoftDeleteNotification 通知を論理削除
func (r *notificationRepository) SoftDeleteNotification(ctx context.Context, id string) error {
	return r.WithContext(ctx).
		Delete(&model.Notification{}, "id = ?", id).Error
}

// GetNotificationsByRecipient 受信者の通知一覧を取得
func (r *notificationRepository) GetNotificationsByRecipient(ctx context.Context, recipientID string, params *NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error) {
	var notifications []*model.Notification
	var total int64

	query := r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("recipient_id = ? AND deleted_at IS NULL", recipientID)

	// フィルタ条件を適用
	query = r.applyFilters(query, params)

	// 総件数を取得
	if err := query.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	// ソート条件を適用
	query = r.applySorting(query, params)

	// ページネーション
	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	err := query.
		Preload("Recipient").
		Offset(offset).
		Limit(limit).
		Find(&notifications).Error

	if err != nil {
		return nil, nil, err
	}

	// ページネーション結果を作成
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	pagination := &utils.PaginationResult{
		CurrentPage: page,
		Limit:       limit,
		TotalCount:  total,
		TotalPages:  totalPages,
		HasNext:     page < totalPages,
		HasPrev:     page > 1,
	}

	return notifications, pagination, nil
}

// GetUnreadNotificationsByRecipient 受信者の未読通知を取得
func (r *notificationRepository) GetUnreadNotificationsByRecipient(ctx context.Context, recipientID string) ([]*model.Notification, error) {
	var notifications []*model.Notification

	err := r.WithContext(ctx).
		Where("recipient_id = ? AND status = ? AND deleted_at IS NULL", recipientID, model.NotificationStatusUnread).
		Where("expires_at IS NULL OR expires_at > ?", time.Now()).
		Order("priority DESC, created_at DESC").
		Preload("Recipient").
		Find(&notifications).Error

	return notifications, err
}

// GetRecentNotificationsByRecipient 受信者の最近の通知を取得
func (r *notificationRepository) GetRecentNotificationsByRecipient(ctx context.Context, recipientID string, limit int) ([]*model.Notification, error) {
	var notifications []*model.Notification

	if limit <= 0 {
		limit = 10
	}

	err := r.WithContext(ctx).
		Where("recipient_id = ? AND status != ? AND deleted_at IS NULL", recipientID, model.NotificationStatusHidden).
		Where("expires_at IS NULL OR expires_at > ?", time.Now()).
		Order("created_at DESC").
		Limit(limit).
		Preload("Recipient").
		Find(&notifications).Error

	return notifications, err
}

// MarkNotificationAsRead 通知を既読にする
func (r *notificationRepository) MarkNotificationAsRead(ctx context.Context, id string) error {
	now := time.Now()

	return r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":  model.NotificationStatusRead,
			"read_at": now,
		}).Error
}

// MarkNotificationsAsReadByRecipient 特定の受信者の指定された通知を既読にする
func (r *notificationRepository) MarkNotificationsAsReadByRecipient(ctx context.Context, recipientID string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	now := time.Now()

	return r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("recipient_id = ? AND id IN ?", recipientID, ids).
		Updates(map[string]interface{}{
			"status":  model.NotificationStatusRead,
			"read_at": now,
		}).Error
}

// MarkAllNotificationsAsReadByRecipient 受信者の全ての未読通知を既読にする
func (r *notificationRepository) MarkAllNotificationsAsReadByRecipient(ctx context.Context, recipientID string) error {
	now := time.Now()

	return r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("recipient_id = ? AND status = ?", recipientID, model.NotificationStatusUnread).
		Updates(map[string]interface{}{
			"status":  model.NotificationStatusRead,
			"read_at": now,
		}).Error
}

// HideNotification 通知を非表示にする
func (r *notificationRepository) HideNotification(ctx context.Context, id string) error {
	return r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("id = ?", id).
		Update("status", model.NotificationStatusHidden).Error
}

// GetUnreadNotificationCountByRecipient 受信者の未読通知数を取得
func (r *notificationRepository) GetUnreadNotificationCountByRecipient(ctx context.Context, recipientID string) (int64, error) {
	var count int64

	err := r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("recipient_id = ? AND status = ? AND deleted_at IS NULL", recipientID, model.NotificationStatusUnread).
		Where("expires_at IS NULL OR expires_at > ?", time.Now()).
		Count(&count).Error

	return count, err
}

// GetNotificationCountByTypeAndRecipient タイプ別の通知数を取得
func (r *notificationRepository) GetNotificationCountByTypeAndRecipient(ctx context.Context, notificationType model.NotificationType, recipientID string) (int64, error) {
	var count int64

	err := r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("recipient_id = ? AND notification_type = ? AND deleted_at IS NULL", recipientID, notificationType).
		Count(&count).Error

	return count, err
}

// CreateNotificationsBulk 複数の通知を一括作成
func (r *notificationRepository) CreateNotificationsBulk(ctx context.Context, notifications []*model.Notification) error {
	if len(notifications) == 0 {
		return nil
	}

	// UUIDを生成
	for _, notification := range notifications {
		if notification.ID == "" {
			notification.ID = uuid.New().String()
		}
	}

	return r.WithContext(ctx).CreateInBatches(notifications, 100).Error
}

// DeleteExpiredNotifications 期限切れの通知を削除
func (r *notificationRepository) DeleteExpiredNotifications(ctx context.Context) (int64, error) {
	result := r.WithContext(ctx).
		Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).
		Delete(&model.Notification{})

	return result.RowsAffected, result.Error
}

// GetAllNotifications 全ての通知を取得（管理者向け）
func (r *notificationRepository) GetAllNotifications(ctx context.Context, params *NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error) {
	var notifications []*model.Notification
	var total int64

	query := r.WithContext(ctx).Model(&model.Notification{}).Where("deleted_at IS NULL")

	// フィルタ条件を適用
	query = r.applyFilters(query, params)

	// 総件数を取得
	if err := query.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	// ソート条件を適用
	query = r.applySorting(query, params)

	// ページネーション
	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	err := query.
		Preload("Recipient").
		Offset(offset).
		Limit(limit).
		Find(&notifications).Error

	if err != nil {
		return nil, nil, err
	}

	// ページネーション結果を作成
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	pagination := &utils.PaginationResult{
		CurrentPage: page,
		Limit:       limit,
		TotalCount:  total,
		TotalPages:  totalPages,
		HasNext:     page < totalPages,
		HasPrev:     page > 1,
	}

	return notifications, pagination, nil
}

// GetNotificationsByType タイプ別の通知を取得
func (r *notificationRepository) GetNotificationsByType(ctx context.Context, notificationType model.NotificationType, params *NotificationQueryParams) ([]*model.Notification, *utils.PaginationResult, error) {
	var notifications []*model.Notification
	var total int64

	query := r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("notification_type = ? AND deleted_at IS NULL", notificationType)

	// フィルタ条件を適用
	query = r.applyFilters(query, params)

	// 総件数を取得
	if err := query.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	// ソート条件を適用
	query = r.applySorting(query, params)

	// ページネーション
	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	err := query.
		Preload("Recipient").
		Offset(offset).
		Limit(limit).
		Find(&notifications).Error

	if err != nil {
		return nil, nil, err
	}

	// ページネーション結果を作成
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	pagination := &utils.PaginationResult{
		CurrentPage: page,
		Limit:       limit,
		TotalCount:  total,
		TotalPages:  totalPages,
		HasNext:     page < totalPages,
		HasPrev:     page > 1,
	}

	return notifications, pagination, nil
}

// GetNotificationStats 通知統計を取得
func (r *notificationRepository) GetNotificationStats(ctx context.Context, startDate, endDate time.Time) (*NotificationStats, error) {
	stats := &NotificationStats{
		NotificationsByType: make(map[model.NotificationType]int64),
		NotificationsByDate: make(map[string]int64),
	}

	// 期間内の総通知数を取得
	err := r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("created_at BETWEEN ? AND ? AND deleted_at IS NULL", startDate, endDate).
		Count(&stats.TotalNotifications).Error
	if err != nil {
		return nil, err
	}

	// 未読通知数を取得
	err = r.WithContext(ctx).
		Model(&model.Notification{}).
		Where("created_at BETWEEN ? AND ? AND status = ? AND deleted_at IS NULL", startDate, endDate, model.NotificationStatusUnread).
		Count(&stats.UnreadNotifications).Error
	if err != nil {
		return nil, err
	}

	// 既読通知数を計算
	stats.ReadNotifications = stats.TotalNotifications - stats.UnreadNotifications

	// タイプ別通知数を取得
	var typeStats []struct {
		Type  model.NotificationType `gorm:"column:notification_type"`
		Count int64                  `gorm:"column:count"`
	}

	err = r.WithContext(ctx).
		Model(&model.Notification{}).
		Select("notification_type, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ? AND deleted_at IS NULL", startDate, endDate).
		Group("notification_type").
		Find(&typeStats).Error
	if err != nil {
		return nil, err
	}

	for _, stat := range typeStats {
		stats.NotificationsByType[stat.Type] = stat.Count
	}

	// 日別通知数を取得
	var dateStats []struct {
		Date  string `gorm:"column:date"`
		Count int64  `gorm:"column:count"`
	}

	err = r.WithContext(ctx).
		Model(&model.Notification{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ? AND deleted_at IS NULL", startDate, endDate).
		Group("DATE(created_at)").
		Find(&dateStats).Error
	if err != nil {
		return nil, err
	}

	for _, stat := range dateStats {
		stats.NotificationsByDate[stat.Date] = stat.Count
	}

	// 平均既読時間を計算
	var avgReadTime sql.NullFloat64
	err = r.WithContext(ctx).
		Model(&model.Notification{}).
		Select("AVG(TIMESTAMPDIFF(MINUTE, created_at, read_at)) as avg_read_time").
		Where("created_at BETWEEN ? AND ? AND read_at IS NOT NULL AND deleted_at IS NULL", startDate, endDate).
		Scan(&avgReadTime).Error
	if err != nil {
		return nil, err
	}

	if avgReadTime.Valid {
		stats.AvgReadTime = &avgReadTime.Float64
	}

	return stats, nil
}

// applyFilters フィルタ条件を適用
func (r *notificationRepository) applyFilters(query *gorm.DB, params *NotificationQueryParams) *gorm.DB {
	if params == nil {
		return query
	}

	if params.Status != nil {
		query = query.Where("status = ?", *params.Status)
	}

	if params.Type != nil {
		query = query.Where("notification_type = ?", *params.Type)
	}

	if params.Priority != nil {
		query = query.Where("priority = ?", *params.Priority)
	}

	if params.StartDate != nil {
		query = query.Where("created_at >= ?", *params.StartDate)
	}

	if params.EndDate != nil {
		query = query.Where("created_at <= ?", *params.EndDate)
	}

	if params.SearchKeyword != "" {
		searchPattern := fmt.Sprintf("%%%s%%", params.SearchKeyword)
		query = query.Where("title LIKE ? OR message LIKE ?", searchPattern, searchPattern)
	}

	return query
}

// applySorting ソート条件を適用
func (r *notificationRepository) applySorting(query *gorm.DB, params *NotificationQueryParams) *gorm.DB {
	if params == nil {
		return query.Order("created_at DESC")
	}

	sortBy := params.SortBy
	if sortBy == "" {
		sortBy = "created_at"
	}

	sortDirection := params.SortDirection
	if sortDirection != "asc" && sortDirection != "desc" {
		sortDirection = "desc"
	}

	orderClause := fmt.Sprintf("%s %s", sortBy, sortDirection)
	return query.Order(orderClause)
}

// CountByTypeAndDateRange は指定されたユーザー、通知タイプ、日付範囲の通知数を取得します
func (r *notificationRepository) CountByTypeAndDateRange(ctx context.Context, userID string, notificationType model.NotificationType, startDate, endDate time.Time) (int64, error) {
	var count int64

	err := r.WithContext(ctx).
		Model(&model.NotificationHistory{}).
		Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ?", userID, notificationType, startDate, endDate).
		Count(&count).Error

	if err != nil {
		return 0, fmt.Errorf("通知数のカウントに失敗しました: %w", err)
	}

	return count, nil
}
