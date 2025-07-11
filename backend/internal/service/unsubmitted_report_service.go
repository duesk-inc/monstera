package service

import (
	"context"

	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// UnsubmittedReportService 未提出週報サービスのインターフェース
type UnsubmittedReportService interface {
	// 未提出週報のチェック
	CheckUnsubmittedReports(ctx context.Context) error

	// 長期未提出者のエスカレーション処理
	ProcessEscalations(ctx context.Context) error
}

// unsubmittedReportService 未提出週報サービスの実装
type unsubmittedReportService struct {
	db                   *gorm.DB
	weeklyReportRepo     repository.WeeklyReportRefactoredRepository
	userRepo             repository.UserRepository
	departmentRepo       repository.DepartmentRepository
	notificationRepo     repository.NotificationRepository
	reminderSettingsRepo repository.ReminderSettingsRepository
	logger               *zap.Logger
}

// NewUnsubmittedReportService 未提出週報サービスのインスタンスを生成
func NewUnsubmittedReportService(
	db *gorm.DB,
	weeklyReportRepo repository.WeeklyReportRefactoredRepository,
	userRepo repository.UserRepository,
	departmentRepo repository.DepartmentRepository,
	notificationRepo repository.NotificationRepository,
	reminderSettingsRepo repository.ReminderSettingsRepository,
	logger *zap.Logger,
) UnsubmittedReportService {
	return &unsubmittedReportService{
		db:                   db,
		weeklyReportRepo:     weeklyReportRepo,
		userRepo:             userRepo,
		departmentRepo:       departmentRepo,
		notificationRepo:     notificationRepo,
		reminderSettingsRepo: reminderSettingsRepo,
		logger:               logger,
	}
}

// CheckUnsubmittedReports 未提出週報をチェック（暫定実装）
func (s *unsubmittedReportService) CheckUnsubmittedReports(ctx context.Context) error {
	// TODO: 実際の実装
	return nil
}

// ProcessEscalations 長期未提出者のエスカレーション処理
func (s *unsubmittedReportService) ProcessEscalations(ctx context.Context) error {
	// TODO: 実際のエスカレーション処理を実装
	// 暫定実装として、ログを出力するのみ
	s.logger.Info("Processing escalations for long-term unsubmitted reports")

	// 例：
	// 1. 3週間以上未提出のユーザーを検索
	// 2. 管理者への通知を送信
	// 3. エスカレーション履歴を記録

	return nil
}
