package service

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseMonthlyCloseService 経費月次締めサービスのインターフェース
type ExpenseMonthlyCloseService interface {
	ProcessMonthlyClose(ctx context.Context, year int, month int) error
	GetMonthlyCloseStatus(ctx context.Context, year int, month int) (*model.MonthlyCloseStatus, error)
	CreateMonthlyCloseSummary(ctx context.Context, year int, month int) (*model.MonthlyCloseSummary, error)
}

// expenseMonthlyCloseService 経費月次締めサービスの実装
type expenseMonthlyCloseService struct {
	db              *gorm.DB
	expenseRepo     repository.ExpenseRepository
	userRepo        repository.UserRepository
	notificationService NotificationService
	logger          *zap.Logger
}

// NewExpenseMonthlyCloseService 経費月次締めサービスのインスタンスを生成
func NewExpenseMonthlyCloseService(
	db *gorm.DB,
	expenseRepo repository.ExpenseRepository,
	userRepo repository.UserRepository,
	notificationService NotificationService,
	logger *zap.Logger,
) ExpenseMonthlyCloseService {
	return &expenseMonthlyCloseService{
		db:                  db,
		expenseRepo:         expenseRepo,
		userRepo:            userRepo,
		notificationService: notificationService,
		logger:              logger,
	}
}

// ProcessMonthlyClose 月次締め処理を実行
func (s *expenseMonthlyCloseService) ProcessMonthlyClose(ctx context.Context, year int, month int) error {
	// トランザクション開始
	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return fmt.Errorf("トランザクションの開始に失敗しました: %w", tx.Error)
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	// 処理対象期間の設定
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second)

	s.logger.Info("月次締め処理を開始",
		zap.Int("year", year),
		zap.Int("month", month),
		zap.Time("start_date", startDate),
		zap.Time("end_date", endDate),
	)

	// 1. 未提出の経費申請を確認
	var pendingExpenses []model.Expense
	if err := tx.Where("status = ? AND created_at >= ? AND created_at <= ?", 
			model.ExpenseStatusDraft, startDate, endDate).
		Find(&pendingExpenses).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("未提出経費の取得に失敗しました: %w", err)
	}

	// 未提出がある場合は警告を出力
	if len(pendingExpenses) > 0 {
		s.logger.Warn("未提出の経費申請があります",
			zap.Int("count", len(pendingExpenses)),
		)
		
		// 未提出者に通知
		for _, expense := range pendingExpenses {
			notification := &model.Notification{
				ID:               uuid.New(),
				RecipientID:      &expense.UserID,
				NotificationType: model.NotificationTypeExpense,
				Title:            fmt.Sprintf("%d年%d月の経費申請が未提出です", year, month),
				Message:          "月次締め処理のため、速やかに提出してください。",
				Priority:         model.NotificationPriorityHigh,
				Status:           model.NotificationStatusUnread,
				CreatedAt:        time.Now(),
			}
			
			if err := s.notificationService.CreateNotification(ctx, notification); err != nil {
				s.logger.Error("通知の作成に失敗しました", 
					zap.Error(err),
					zap.String("user_id", expense.UserID.String()),
				)
			}
		}
	}

	// 2. 承認済み経費の集計
	var approvedExpenses []model.Expense
	if err := tx.Where("status = ? AND approved_at >= ? AND approved_at <= ?", 
			model.ExpenseStatusApproved, startDate, endDate).
		Find(&approvedExpenses).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("承認済み経費の取得に失敗しました: %w", err)
	}

	// 3. 月次締め状態を記録
	closeStatus := &model.MonthlyCloseStatus{
		ID:                    uuid.New(),
		Year:                  year,
		Month:                 month,
		Status:                model.MonthlyCloseStatusClosed,
		ClosedAt:              timePtr(time.Now()),
		ClosedBy:              nil, // システム処理のためnull
		TotalExpenseCount:     len(approvedExpenses),
		TotalExpenseAmount:    calculateTotalAmount(approvedExpenses),
		PendingExpenseCount:   len(pendingExpenses),
		CreatedAt:             time.Now(),
		UpdatedAt:             time.Now(),
	}

	if err := tx.Create(closeStatus).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("月次締め状態の保存に失敗しました: %w", err)
	}

	// 4. 承認済み経費を確定状態に更新
	if err := tx.Model(&model.Expense{}).
		Where("status = ? AND approved_at >= ? AND approved_at <= ?", 
			model.ExpenseStatusApproved, startDate, endDate).
		Update("status", model.ExpenseStatusClosed).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("経費ステータスの更新に失敗しました: %w", err)
	}

	// 5. 月次締めサマリーを作成
	summary, err := s.createMonthlySummaryInTx(tx, year, month, approvedExpenses)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("月次サマリーの作成に失敗しました: %w", err)
	}

	// トランザクションコミット
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("トランザクションのコミットに失敗しました: %w", err)
	}

	s.logger.Info("月次締め処理が完了しました",
		zap.Int("year", year),
		zap.Int("month", month),
		zap.Int("approved_count", closeStatus.TotalExpenseCount),
		zap.Float64("total_amount", closeStatus.TotalExpenseAmount),
		zap.String("summary_id", summary.ID.String()),
	)

	// 6. 管理者に完了通知
	adminNotification := &model.Notification{
		ID:               uuid.New(),
		RecipientID:      nil, // 全管理者向け
		NotificationType: model.NotificationTypeSystem,
		Title:            fmt.Sprintf("%d年%d月の月次締め処理が完了しました", year, month),
		Message:          fmt.Sprintf("承認済み: %d件, 合計金額: ¥%.0f", closeStatus.TotalExpenseCount, closeStatus.TotalExpenseAmount),
		Priority:         model.NotificationPriorityNormal,
		Status:           model.NotificationStatusUnread,
		CreatedAt:        time.Now(),
	}
	
	if err := s.notificationService.CreateNotification(ctx, adminNotification); err != nil {
		s.logger.Error("管理者通知の作成に失敗しました", zap.Error(err))
		// 通知失敗は処理を中断しない
	}

	return nil
}

// GetMonthlyCloseStatus 月次締め状態を取得
func (s *expenseMonthlyCloseService) GetMonthlyCloseStatus(ctx context.Context, year int, month int) (*model.MonthlyCloseStatus, error) {
	var status model.MonthlyCloseStatus
	
	err := s.db.WithContext(ctx).
		Where("year = ? AND month = ?", year, month).
		First(&status).Error
	
	if err == gorm.ErrRecordNotFound {
		// レコードがない場合は未締め状態として返す
		return &model.MonthlyCloseStatus{
			Year:   year,
			Month:  month,
			Status: model.MonthlyCloseStatusOpen,
		}, nil
	}
	
	if err != nil {
		return nil, fmt.Errorf("月次締め状態の取得に失敗しました: %w", err)
	}
	
	return &status, nil
}

// CreateMonthlyCloseSummary 月次締めサマリーを作成
func (s *expenseMonthlyCloseService) CreateMonthlyCloseSummary(ctx context.Context, year int, month int) (*model.MonthlyCloseSummary, error) {
	// 処理対象期間の設定
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second)

	// 承認済み経費を取得
	var expenses []model.Expense
	if err := s.db.WithContext(ctx).
		Where("status = ? AND approved_at >= ? AND approved_at <= ?", 
			model.ExpenseStatusApproved, startDate, endDate).
		Find(&expenses).Error; err != nil {
		return nil, fmt.Errorf("承認済み経費の取得に失敗しました: %w", err)
	}

	return s.createMonthlySummaryInTx(s.db.WithContext(ctx), year, month, expenses)
}

// createMonthlySummaryInTx トランザクション内で月次サマリーを作成
func (s *expenseMonthlyCloseService) createMonthlySummaryInTx(tx *gorm.DB, year int, month int, expenses []model.Expense) (*model.MonthlyCloseSummary, error) {
	summary := &model.MonthlyCloseSummary{
		ID:        uuid.New(),
		Year:      year,
		Month:     month,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// ユーザー別集計
	userSummaries := make(map[uuid.UUID]*model.UserExpenseSummary)
	categoryTotals := make(map[uint]float64)
	
	for _, expense := range expenses {
		// ユーザー別集計
		if _, exists := userSummaries[expense.UserID]; !exists {
			user, _ := s.userRepo.FindByID(expense.UserID)
			userName := "Unknown"
			if user != nil {
				userName = fmt.Sprintf("%s %s", user.LastName, user.FirstName)
			}
			
			userSummaries[expense.UserID] = &model.UserExpenseSummary{
				ID:              uuid.New(),
				MonthlySummaryID: summary.ID,
				UserID:          expense.UserID,
				UserName:        userName,
				ExpenseCount:    0,
				TotalAmount:     0,
			}
		}
		
		userSummary := userSummaries[expense.UserID]
		userSummary.ExpenseCount++
		
		// 金額を集計
		userSummary.TotalAmount += float64(expense.Amount)
		// カテゴリーはstring型のため、一時的にハッシュ値を使用
		categoryKey := uint(1) // 暫定的に固定値を使用（後でカテゴリマスタとの紐付けが必要）
		if expense.Category != "" {
			// カテゴリー名をキーとして使用する場合は別のマップ構造が必要
			categoryKey = uint(len(expense.Category))
		}
		categoryTotals[categoryKey] += float64(expense.Amount)
	}

	// ユーザー別サマリーを配列に変換
	summary.UserSummaries = make([]model.UserExpenseSummary, 0, len(userSummaries))
	for _, userSummary := range userSummaries {
		summary.UserSummaries = append(summary.UserSummaries, *userSummary)
		summary.TotalExpenseCount += userSummary.ExpenseCount
		summary.TotalExpenseAmount += userSummary.TotalAmount
	}

	// カテゴリー別サマリーを作成
	summary.CategorySummaries = make([]model.CategoryExpenseSummary, 0, len(categoryTotals))
	for categoryID, amount := range categoryTotals {
		summary.CategorySummaries = append(summary.CategorySummaries, model.CategoryExpenseSummary{
			ID:               uuid.New(),
			MonthlySummaryID: summary.ID,
			CategoryID:       categoryID,
			CategoryName:     fmt.Sprintf("Category_%d", categoryID), // TODO: カテゴリー名を取得
			ExpenseCount:     0, // TODO: カテゴリー別件数を計算
			TotalAmount:      amount,
		})
	}

	// サマリーを保存
	if err := tx.Create(summary).Error; err != nil {
		return nil, fmt.Errorf("月次サマリーの保存に失敗しました: %w", err)
	}

	return summary, nil
}

// calculateTotalAmount 経費の合計金額を計算
func calculateTotalAmount(expenses []model.Expense) float64 {
	total := 0.0
	for _, expense := range expenses {
		total += float64(expense.Amount)
	}
	return total
}

// timePtr 時刻のポインタを返す
func timePtr(t time.Time) *time.Time {
	return &t
}