package service

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// UpdateAdvancedNotificationRequest 高度な通知更新リクエスト（仮定義）
type UpdateAdvancedNotificationRequest struct {
	Title   string `json:"title"`
	Message string `json:"message"`
}

// WeeklyReportReminderRequest 週報リマインダーリクエスト（仮定義）
type WeeklyReportReminderRequest struct {
	UserIDs     []string   `json:"user_ids"`
	RecipientID *uuid.UUID `json:"recipient_id"`
	StartDate   time.Time  `json:"start_date"`
	EndDate     time.Time  `json:"end_date"`
}

// BulkReminderCompleteRequest 一括リマインダー完了リクエスト（仮定義）
type BulkReminderCompleteRequest struct {
	SuccessCount int `json:"success_count"`
	FailureCount int `json:"failure_count"`
}

// NotificationService 通知サービスのインターフェース
type NotificationService interface {
	// 基本メソッド
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error)
	CleanupOldNotifications(ctx context.Context, cutoffDate time.Time) error

	// 通知作成メソッド
	CreateNotification(ctx context.Context, notification *model.Notification) error
	CreateBulkNotifications(ctx context.Context, notifications []*model.Notification) error

	// 提案関連通知メソッド
	NotifyProposalStatusChange(ctx context.Context, proposalID, projectID, userID uuid.UUID, projectName, previousStatus, newStatus string) error
	NotifyNewQuestion(ctx context.Context, questionID, proposalID, projectID uuid.UUID, projectName, questionText string, engineerID uuid.UUID, engineerName string) error
	NotifyQuestionAnswered(ctx context.Context, questionID, proposalID, engineerID uuid.UUID, questionText, responseText string, salesUserName string) error

	// 経費申請関連通知メソッド
	NotifyExpenseSubmitted(ctx context.Context, expense *model.Expense, approverIDs []uuid.UUID) error
	NotifyExpenseApproved(ctx context.Context, expense *model.Expense, approverName string, isFullyApproved bool) error
	NotifyExpenseRejected(ctx context.Context, expense *model.Expense, rejectorName string, reason string) error
	NotifyExpenseLimitExceeded(ctx context.Context, userID uuid.UUID, expense *model.Expense, limitType string, exceededAmount int) error
	NotifyExpenseLimitWarning(ctx context.Context, userID uuid.UUID, limitType string, usageRate float64) error
	NotifyExpenseApprovalReminder(ctx context.Context, approverID uuid.UUID, pendingExpenses []model.Expense) error

	// ハンドラー用メソッド
	GetUserNotifications(ctx context.Context, userID uuid.UUID, limit, offset int) (interface{}, error)
	GetNotificationsByRecipient(ctx context.Context, userID uuid.UUID) (interface{}, error)
	GetUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (int, error)
	MarkAsRead(ctx context.Context, userID, notificationID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
	GetUserNotificationSettings(ctx context.Context, userID uuid.UUID) (interface{}, error)
	UpdateNotificationSetting(ctx context.Context, userID uuid.UUID, request interface{}) error
	GetAllNotifications(ctx context.Context, params interface{}) (interface{}, interface{}, error)
	GetAdvancedNotificationByID(ctx context.Context, id uuid.UUID) (interface{}, error)
	UpdateAdvancedNotification(ctx context.Context, id uuid.UUID, request interface{}) error
	DeleteAdvancedNotification(ctx context.Context, id uuid.UUID) error
	HideNotification(ctx context.Context, userID, notificationID uuid.UUID) error
	GetNotificationStats(ctx context.Context) (interface{}, error)
	CreateWeeklyReportReminderNotification(ctx context.Context, request interface{}) error
	CreateBulkReminderCompleteNotification(ctx context.Context, request interface{}) error
}

// notificationService 通知サービスの実装
type notificationService struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewNotificationService 通知サービスのインスタンスを生成
func NewNotificationService(db *gorm.DB, logger *zap.Logger) NotificationService {
	return &notificationService{
		db:     db,
		logger: logger,
	}
}

// GetUnreadCount 未読通知数を取得（暫定実装）
func (s *notificationService) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	// TODO: 実際の実装
	return 0, nil
}

// CleanupOldNotifications 古い通知を削除
func (s *notificationService) CleanupOldNotifications(ctx context.Context, cutoffDate time.Time) error {
	// TODO: 実際の実装
	// 暫定実装として、ログを出力するのみ
	s.logger.Info("Cleaning up old notifications",
		zap.Time("cutoff_date", cutoffDate),
	)

	// 例：
	// 1. cutoffDateより古い既読通知を削除
	// 2. 削除した件数を記録
	// 3. エラーハンドリング

	return nil
}

// CreateNotification 通知を作成
func (s *notificationService) CreateNotification(ctx context.Context, notification *model.Notification) error {
	if err := s.db.WithContext(ctx).Create(notification).Error; err != nil {
		s.logger.Error("Failed to create notification",
			zap.Error(err),
			zap.String("notification_type", string(notification.NotificationType)),
		)
		return err
	}
	return nil
}

// CreateBulkNotifications 複数の通知を一括作成
func (s *notificationService) CreateBulkNotifications(ctx context.Context, notifications []*model.Notification) error {
	if len(notifications) == 0 {
		return nil
	}

	if err := s.db.WithContext(ctx).CreateInBatches(notifications, 100).Error; err != nil {
		s.logger.Error("Failed to create bulk notifications",
			zap.Error(err),
			zap.Int("count", len(notifications)),
		)
		return err
	}
	return nil
}

// NotifyProposalStatusChange 提案ステータス変更通知
func (s *notificationService) NotifyProposalStatusChange(ctx context.Context, proposalID, projectID, userID uuid.UUID, projectName, previousStatus, newStatus string) error {
	title := "提案情報のステータスが更新されました"
	message := fmt.Sprintf("案件「%s」の提案ステータスが「%s」から「%s」に変更されました。", projectName, previousStatus, newStatus)

	notification := &model.Notification{
		RecipientID:      &userID,
		Title:            title,
		Message:          message,
		NotificationType: model.NotificationTypeProject,
		Priority:         model.NotificationPriorityNormal,
		Status:           model.NotificationStatusUnread,
		ReferenceID:      &proposalID,
		ReferenceType:    stringPtr("proposal"),
		Metadata: &model.NotificationMetadata{
			AdditionalData: map[string]interface{}{
				"proposal_id":     proposalID.String(),
				"project_id":      projectID.String(),
				"project_name":    projectName,
				"previous_status": previousStatus,
				"new_status":      newStatus,
			},
		},
	}

	return s.CreateNotification(ctx, notification)
}

// NotifyNewQuestion 新規質問通知（営業担当者向け）
func (s *notificationService) NotifyNewQuestion(ctx context.Context, questionID, proposalID, projectID uuid.UUID, projectName, questionText string, engineerID uuid.UUID, engineerName string) error {
	title := "新しい質問が投稿されました"
	message := fmt.Sprintf("%sさんから案件「%s」について質問がありました。", engineerName, projectName)

	// 営業担当者を特定する必要があるため、ここでは通知のみ作成
	// 実際の営業担当者への通知は、ProposalService側で行う
	notification := &model.Notification{
		Title:            title,
		Message:          message,
		NotificationType: model.NotificationTypeProject,
		Priority:         model.NotificationPriorityHigh,
		Status:           model.NotificationStatusUnread,
		ReferenceID:      &questionID,
		ReferenceType:    stringPtr("question"),
		Metadata: &model.NotificationMetadata{
			AdditionalData: map[string]interface{}{
				"question_id":   questionID.String(),
				"proposal_id":   proposalID.String(),
				"project_id":    projectID.String(),
				"project_name":  projectName,
				"question_text": questionText,
				"engineer_id":   engineerID.String(),
				"engineer_name": engineerName,
			},
		},
	}

	return s.CreateNotification(ctx, notification)
}

// NotifyQuestionAnswered 質問回答通知（エンジニア向け）
func (s *notificationService) NotifyQuestionAnswered(ctx context.Context, questionID, proposalID, engineerID uuid.UUID, questionText, responseText string, salesUserName string) error {
	title := "質問に回答がありました"
	message := fmt.Sprintf("営業担当の%sさんから質問への回答がありました。", salesUserName)

	notification := &model.Notification{
		RecipientID:      &engineerID,
		Title:            title,
		Message:          message,
		NotificationType: model.NotificationTypeProject,
		Priority:         model.NotificationPriorityNormal,
		Status:           model.NotificationStatusUnread,
		ReferenceID:      &questionID,
		ReferenceType:    stringPtr("question_response"),
		Metadata: &model.NotificationMetadata{
			AdditionalData: map[string]interface{}{
				"question_id":     questionID.String(),
				"proposal_id":     proposalID.String(),
				"question_text":   questionText,
				"response_text":   responseText,
				"sales_user_name": salesUserName,
			},
		},
	}

	return s.CreateNotification(ctx, notification)
}

// stringPtr 文字列のポインタを返すヘルパー関数
func stringPtr(s string) *string {
	return &s
}

// NotifyExpenseSubmitted 経費申請提出通知
func (s *notificationService) NotifyExpenseSubmitted(ctx context.Context, expense *model.Expense, approverIDs []uuid.UUID) error {
	title := "新しい経費申請が提出されました"
	message := fmt.Sprintf("%sさんから経費申請「%s」（%d円）が提出されました。承認をお願いします。",
		expense.User.Name, expense.Title, expense.Amount)

	notifications := make([]*model.Notification, 0, len(approverIDs))
	for _, approverID := range approverIDs {
		notification := &model.Notification{
			RecipientID:      &approverID,
			Title:            title,
			Message:          message,
			NotificationType: model.NotificationTypeExpense,
			Priority:         model.NotificationPriorityHigh,
			Status:           model.NotificationStatusUnread,
			ReferenceID:      &expense.ID,
			ReferenceType:    stringPtr("expense_submission"),
			Metadata: &model.NotificationMetadata{
				AdditionalData: map[string]interface{}{
					"expense_id":     expense.ID.String(),
					"expense_title":  expense.Title,
					"expense_amount": expense.Amount,
					"submitter_name": expense.User.Name,
					"expense_date":   expense.ExpenseDate,
				},
			},
		}
		notifications = append(notifications, notification)
	}

	return s.CreateBulkNotifications(ctx, notifications)
}

// NotifyExpenseApproved 経費申請承認通知
func (s *notificationService) NotifyExpenseApproved(ctx context.Context, expense *model.Expense, approverName string, isFullyApproved bool) error {
	var title, message string

	if isFullyApproved {
		title = "経費申請が承認されました"
		message = fmt.Sprintf("あなたの経費申請「%s」が全ての承認を得て完了しました。", expense.Title)
	} else {
		title = "経費申請が承認されました（次の承認待ち）"
		message = fmt.Sprintf("あなたの経費申請「%s」が%sさんに承認されました。次の承認者の確認を待っています。",
			expense.Title, approverName)
	}

	notification := &model.Notification{
		RecipientID:      &expense.UserID,
		Title:            title,
		Message:          message,
		NotificationType: model.NotificationTypeExpense,
		Priority:         model.NotificationPriorityNormal,
		Status:           model.NotificationStatusUnread,
		ReferenceID:      &expense.ID,
		ReferenceType:    stringPtr("expense_approval"),
		Metadata: &model.NotificationMetadata{
			AdditionalData: map[string]interface{}{
				"expense_id":        expense.ID.String(),
				"expense_title":     expense.Title,
				"expense_amount":    expense.Amount,
				"approver_name":     approverName,
				"is_fully_approved": isFullyApproved,
			},
		},
	}

	return s.CreateNotification(ctx, notification)
}

// NotifyExpenseRejected 経費申請却下通知
func (s *notificationService) NotifyExpenseRejected(ctx context.Context, expense *model.Expense, rejectorName string, reason string) error {
	title := "経費申請が却下されました"
	message := fmt.Sprintf("あなたの経費申請「%s」が%sさんによって却下されました。理由: %s",
		expense.Title, rejectorName, reason)

	notification := &model.Notification{
		RecipientID:      &expense.UserID,
		Title:            title,
		Message:          message,
		NotificationType: model.NotificationTypeExpense,
		Priority:         model.NotificationPriorityHigh,
		Status:           model.NotificationStatusUnread,
		ReferenceID:      &expense.ID,
		ReferenceType:    stringPtr("expense_rejection"),
		Metadata: &model.NotificationMetadata{
			AdditionalData: map[string]interface{}{
				"expense_id":     expense.ID.String(),
				"expense_title":  expense.Title,
				"expense_amount": expense.Amount,
				"rejector_name":  rejectorName,
				"reason":         reason,
			},
		},
	}

	return s.CreateNotification(ctx, notification)
}

// NotifyExpenseLimitExceeded 経費申請上限超過通知
func (s *notificationService) NotifyExpenseLimitExceeded(ctx context.Context, userID uuid.UUID, expense *model.Expense, limitType string, exceededAmount int) error {
	title := fmt.Sprintf("%s経費申請上限を超過しました", getLimitTypeDisplay(limitType))
	message := fmt.Sprintf("経費申請「%s」により、%s上限を%d円超過しました。これ以上の申請はできません。",
		expense.Title, getLimitTypeDisplay(limitType), exceededAmount)

	notification := &model.Notification{
		RecipientID:      &userID,
		Title:            title,
		Message:          message,
		NotificationType: model.NotificationTypeExpense,
		Priority:         model.NotificationPriorityUrgent,
		Status:           model.NotificationStatusUnread,
		ReferenceID:      &expense.ID,
		ReferenceType:    stringPtr("expense_limit_exceeded"),
		Metadata: &model.NotificationMetadata{
			AdditionalData: map[string]interface{}{
				"expense_id":      expense.ID.String(),
				"expense_title":   expense.Title,
				"expense_amount":  expense.Amount,
				"limit_type":      limitType,
				"exceeded_amount": exceededAmount,
			},
		},
	}

	return s.CreateNotification(ctx, notification)
}

// NotifyExpenseLimitWarning 経費申請上限警告通知
func (s *notificationService) NotifyExpenseLimitWarning(ctx context.Context, userID uuid.UUID, limitType string, usageRate float64) error {
	title := fmt.Sprintf("%s経費申請上限に近づいています", getLimitTypeDisplay(limitType))
	message := fmt.Sprintf("%s経費申請上限の%.0f%%を使用しています。計画的な申請をお願いします。",
		getLimitTypeDisplay(limitType), usageRate)

	notification := &model.Notification{
		RecipientID:      &userID,
		Title:            title,
		Message:          message,
		NotificationType: model.NotificationTypeExpense,
		Priority:         model.NotificationPriorityNormal,
		Status:           model.NotificationStatusUnread,
		ReferenceID:      nil,
		ReferenceType:    stringPtr("expense_limit_warning"),
		Metadata: &model.NotificationMetadata{
			AdditionalData: map[string]interface{}{
				"limit_type": limitType,
				"usage_rate": usageRate,
			},
		},
	}

	return s.CreateNotification(ctx, notification)
}

// NotifyExpenseApprovalReminder 経費申請承認催促通知
func (s *notificationService) NotifyExpenseApprovalReminder(ctx context.Context, approverID uuid.UUID, pendingExpenses []model.Expense) error {
	title := fmt.Sprintf("%d件の経費申請が承認待ちです", len(pendingExpenses))
	message := "承認待ちの経費申請があります。確認をお願いします。"

	expenseList := make([]map[string]interface{}, 0, len(pendingExpenses))
	for _, expense := range pendingExpenses {
		expenseList = append(expenseList, map[string]interface{}{
			"expense_id":     expense.ID.String(),
			"expense_title":  expense.Title,
			"expense_amount": expense.Amount,
			"submitter_name": expense.User.Name,
			"submitted_at":   expense.UpdatedAt,
		})
	}

	notification := &model.Notification{
		RecipientID:      &approverID,
		Title:            title,
		Message:          message,
		NotificationType: model.NotificationTypeExpense,
		Priority:         model.NotificationPriorityNormal,
		Status:           model.NotificationStatusUnread,
		ReferenceID:      nil,
		ReferenceType:    stringPtr("expense_approval_reminder"),
		Metadata: &model.NotificationMetadata{
			AdditionalData: map[string]interface{}{
				"pending_count":    len(pendingExpenses),
				"pending_expenses": expenseList,
			},
		},
	}

	return s.CreateNotification(ctx, notification)
}

// getLimitTypeDisplay 上限タイプの表示名を取得
func getLimitTypeDisplay(limitType string) string {
	switch limitType {
	case "monthly":
		return "月次"
	case "yearly":
		return "年次"
	default:
		return limitType
	}
}

// GetUserNotifications ユーザー通知一覧を取得
func (s *notificationService) GetUserNotifications(ctx context.Context, userID uuid.UUID, limit, offset int) (interface{}, error) {
	// TODO: 実装が必要
	s.logger.Info("Getting user notifications",
		zap.String("user_id", userID.String()),
		zap.Int("limit", limit),
		zap.Int("offset", offset))

	return map[string]interface{}{
		"notifications": []interface{}{},
		"total":         0,
	}, nil
}

// GetNotificationsByRecipient 受信者別通知一覧を取得
func (s *notificationService) GetNotificationsByRecipient(ctx context.Context, userID uuid.UUID) (interface{}, error) {
	// TODO: 実装が必要
	s.logger.Info("Getting notifications by recipient", zap.String("user_id", userID.String()))
	return []interface{}{}, nil
}

// GetUnreadNotificationCount 未読通知数を取得（既存メソッドと統合）
func (s *notificationService) GetUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (int, error) {
	return s.GetUnreadCount(ctx, userID)
}

// MarkAsRead 通知を既読にする
func (s *notificationService) MarkAsRead(ctx context.Context, userID, notificationID uuid.UUID) error {
	// TODO: 実装が必要
	s.logger.Info("Marking notification as read",
		zap.String("user_id", userID.String()),
		zap.String("notification_id", notificationID.String()))
	return nil
}

// MarkAllAsRead 全通知を既読にする
func (s *notificationService) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	// TODO: 実装が必要
	s.logger.Info("Marking all notifications as read", zap.String("user_id", userID.String()))
	return nil
}

// GetUserNotificationSettings ユーザー通知設定を取得
func (s *notificationService) GetUserNotificationSettings(ctx context.Context, userID uuid.UUID) (interface{}, error) {
	// TODO: 実装が必要
	s.logger.Info("Getting user notification settings", zap.String("user_id", userID.String()))
	return map[string]interface{}{
		"email_enabled": true,
		"slack_enabled": false,
	}, nil
}

// UpdateNotificationSetting 通知設定を更新
func (s *notificationService) UpdateNotificationSetting(ctx context.Context, userID uuid.UUID, request interface{}) error {
	// TODO: 実装が必要
	s.logger.Info("Updating notification setting",
		zap.String("user_id", userID.String()),
		zap.Any("request", request))
	return nil
}

// GetAllNotifications 全通知を取得（管理者向け）
func (s *notificationService) GetAllNotifications(ctx context.Context, params interface{}) (interface{}, interface{}, error) {
	// TODO: 実装が必要
	s.logger.Info("Getting all notifications", zap.Any("params", params))
	return []interface{}{}, map[string]interface{}{"total": 0, "page": 1}, nil
}

// GetAdvancedNotificationByID 高度な通知詳細を取得
func (s *notificationService) GetAdvancedNotificationByID(ctx context.Context, id uuid.UUID) (interface{}, error) {
	s.logger.Info("Getting advanced notification by ID", zap.String("id", id.String()))
	return map[string]interface{}{"id": id.String()}, nil
}

// UpdateAdvancedNotification 高度な通知を更新
func (s *notificationService) UpdateAdvancedNotification(ctx context.Context, id uuid.UUID, request interface{}) error {
	s.logger.Info("Updating advanced notification", zap.String("id", id.String()))
	return nil
}

// DeleteAdvancedNotification 高度な通知を削除
func (s *notificationService) DeleteAdvancedNotification(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("Deleting advanced notification", zap.String("id", id.String()))
	return nil
}

// HideNotification 通知を非表示にする
func (s *notificationService) HideNotification(ctx context.Context, userID, notificationID uuid.UUID) error {
	s.logger.Info("Hiding notification",
		zap.String("user_id", userID.String()),
		zap.String("notification_id", notificationID.String()))
	return nil
}

// GetNotificationStats 通知統計を取得
func (s *notificationService) GetNotificationStats(ctx context.Context) (interface{}, error) {
	s.logger.Info("Getting notification stats")
	return map[string]interface{}{
		"total":  0,
		"unread": 0,
		"read":   0,
	}, nil
}

// CreateWeeklyReportReminderNotification 週報リマインダー通知を作成
func (s *notificationService) CreateWeeklyReportReminderNotification(ctx context.Context, request interface{}) error {
	s.logger.Info("Creating weekly report reminder notification")
	return nil
}

// CreateBulkReminderCompleteNotification 一括リマインダー完了通知を作成
func (s *notificationService) CreateBulkReminderCompleteNotification(ctx context.Context, request interface{}) error {
	s.logger.Info("Creating bulk reminder complete notification")
	return nil
}
