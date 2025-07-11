package service

import (
	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// EnhancedNotificationService 拡張通知サービスのインターフェース
type EnhancedNotificationService interface {
	// TODO: 必要なメソッドを定義
}

// enhancedNotificationService 拡張通知サービスの実装
type enhancedNotificationService struct {
	db                      *gorm.DB
	notificationRepo        repository.NotificationRepository
	alertRepo               repository.AlertRepository
	alertHistoryRepo        repository.AlertHistoryRepository
	alertSettingsRepo       repository.AlertSettingsRepository
	notificationHistoryRepo repository.NotificationHistoryRepository
	logger                  *zap.Logger
}

// NewEnhancedNotificationService 拡張通知サービスのインスタンスを生成
func NewEnhancedNotificationService(
	db *gorm.DB,
	notificationRepo repository.NotificationRepository,
	alertRepo repository.AlertRepository,
	alertHistoryRepo repository.AlertHistoryRepository,
	alertSettingsRepo repository.AlertSettingsRepository,
	notificationHistoryRepo repository.NotificationHistoryRepository,
	logger *zap.Logger,
) EnhancedNotificationService {
	return &enhancedNotificationService{
		db:                      db,
		notificationRepo:        notificationRepo,
		alertRepo:               alertRepo,
		alertHistoryRepo:        alertHistoryRepo,
		alertSettingsRepo:       alertSettingsRepo,
		notificationHistoryRepo: notificationHistoryRepo,
		logger:                  logger,
	}
}
