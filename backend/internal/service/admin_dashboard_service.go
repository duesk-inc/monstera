package service

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AdminDashboardService 管理者ダッシュボードサービスのインターフェース
type AdminDashboardService interface {
	GetDashboardData(ctx context.Context, userID string) (*dto.AdminDashboardDTO, error)
}

// adminDashboardService 管理者ダッシュボードサービスの実装
type adminDashboardService struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewAdminDashboardService 管理者ダッシュボードサービスのインスタンスを生成
func NewAdminDashboardService(db *gorm.DB, logger *zap.Logger) AdminDashboardService {
	return &adminDashboardService{
		db:     db,
		logger: logger,
	}
}

// GetDashboardData ダッシュボードデータを取得
func (s *adminDashboardService) GetDashboardData(ctx context.Context, userID string) (*dto.AdminDashboardDTO, error) {
	dashboard := &dto.AdminDashboardDTO{
		PendingApprovals: dto.PendingApprovalsDTO{},
		Statistics:       dto.DashboardStatisticsDTO{},
		Alerts:           []dto.DashboardAlertDTO{},
		RecentActivities: []dto.DashboardActivityDTO{},
	}

	// 承認待ち件数を取得
	if err := s.getPendingApprovals(ctx, &dashboard.PendingApprovals); err != nil {
		return nil, err
	}

	// 統計情報を取得
	if err := s.getStatistics(ctx, &dashboard.Statistics); err != nil {
		return nil, err
	}

	// アラートを取得
	if err := s.getAlerts(ctx, &dashboard.Alerts); err != nil {
		return nil, err
	}

	// 最近のアクティビティを取得
	if err := s.getRecentActivities(ctx, &dashboard.RecentActivities); err != nil {
		return nil, err
	}

	return dashboard, nil
}

// getPendingApprovals 承認待ち件数を取得
func (s *adminDashboardService) getPendingApprovals(ctx context.Context, approvals *dto.PendingApprovalsDTO) error {
	// 承認待ち週報の件数
	var weeklyReportCount int64
	if err := s.db.WithContext(ctx).Model(&model.WeeklyReport{}).
		Where("status = ? AND deleted_at IS NULL", model.WeeklyReportStatusSubmitted).
		Count(&weeklyReportCount).Error; err != nil {
		s.logger.Error("Failed to count pending weekly reports", zap.Error(err))
		return err
	}
	approvals.WeeklyReports = int(weeklyReportCount)

	// 承認待ち勤怠の件数（現在は勤怠承認機能未実装）
	// TODO: 勤怠承認機能を実装後に有効化
	approvals.AttendanceRequests = 0

	// 承認待ち経費の件数
	var expenseCount int64
	if err := s.db.WithContext(ctx).Model(&model.Expense{}).
		Where("status = ? AND deleted_at IS NULL", model.ExpenseStatusSubmitted).
		Count(&expenseCount).Error; err != nil {
		s.logger.Error("Failed to count pending expenses", zap.Error(err))
		return err
	}
	approvals.ExpenseRequests = int(expenseCount)

	return nil
}

// getStatistics 統計情報を取得
func (s *adminDashboardService) getStatistics(ctx context.Context, stats *dto.DashboardStatisticsDTO) error {
	// アクティブなエンジニア数
	var activeEngineers int64
	if err := s.db.WithContext(ctx).Model(&model.User{}).
		Where("active = ? AND role IN (?) AND deleted_at IS NULL", true, []int{int(model.RoleEngineer)}).
		Count(&activeEngineers).Error; err != nil {
		s.logger.Error("Failed to count active engineers", zap.Error(err))
		return err
	}
	stats.ActiveEngineers = int(activeEngineers)

	// 稼働率の計算（簡易版）
	// TODO: 実際の稼働率計算ロジックを実装
	stats.UtilizationRate = 87.5

	// 月間売上（簡易版）
	// TODO: 実際の売上計算ロジックを実装
	stats.MonthlyRevenue = 25500000

	// アクティブなプロジェクト数
	var projectCount int64
	if err := s.db.WithContext(ctx).Model(&model.Project{}).
		Where("status = ? AND deleted_at IS NULL", model.ProjectStatusActive).
		Count(&projectCount).Error; err != nil {
		// プロジェクトテーブルがまだ存在しない場合はデフォルト値を使用
		s.logger.Warn("Failed to count active projects", zap.Error(err))
		projectCount = 0
	}
	stats.ActiveProjects = int(projectCount)

	return nil
}

// getAlerts アラートを取得
func (s *adminDashboardService) getAlerts(ctx context.Context, alerts *[]dto.DashboardAlertDTO) error {
	// フォローアップが必要なユーザー
	var followUpUsers []model.User
	if err := s.db.WithContext(ctx).
		Where("follow_up_required = ? AND active = ? AND deleted_at IS NULL", true, true).
		Limit(5).
		Find(&followUpUsers).Error; err != nil {
		s.logger.Error("Failed to get follow up users", zap.Error(err))
		return err
	}

	for _, user := range followUpUsers {
		alert := dto.DashboardAlertDTO{
			ID:       user.ID,
			Type:     "follow_up",
			Title:    user.LastName + " " + user.FirstName + "さん",
			Message:  *user.FollowUpReason,
			Severity: "high",
		}
		*alerts = append(*alerts, alert)
	}

	// 契約終了が近いエンジニア
	// TODO: 実際の契約終了チェックロジックを実装
	thirtyDaysFromNow := time.Now().AddDate(0, 0, 30)
	var expiringAssignments []model.ProjectAssignment
	if err := s.db.WithContext(ctx).
		Preload("User").
		Where("end_date <= ? AND end_date >= ? AND deleted_at IS NULL", thirtyDaysFromNow, time.Now()).
		Limit(5).
		Find(&expiringAssignments).Error; err != nil {
		// テーブルがまだ存在しない場合はスキップ
		s.logger.Warn("Failed to get expiring assignments", zap.Error(err))
	} else {
		for _, assignment := range expiringAssignments {
			daysUntilEnd := int(assignment.EndDate.Sub(time.Now()).Hours() / 24)
			alert := dto.DashboardAlertDTO{
				ID:       assignment.ID,
				Type:     "contract_expiry",
				Title:    assignment.User.LastName + " " + assignment.User.FirstName + "さん",
				Message:  "契約終了まで" + fmt.Sprintf("%d", daysUntilEnd) + "日",
				Severity: "medium",
			}
			*alerts = append(*alerts, alert)
		}
	}

	return nil
}

// getRecentActivities 最近のアクティビティを取得
func (s *adminDashboardService) getRecentActivities(ctx context.Context, activities *[]dto.DashboardActivityDTO) error {
	// 最近提出された週報
	var recentReports []model.WeeklyReport
	if err := s.db.WithContext(ctx).
		Preload("User").
		Where("deleted_at IS NULL").
		Order("created_at DESC").
		Limit(5).
		Find(&recentReports).Error; err != nil {
		s.logger.Error("Failed to get recent weekly reports", zap.Error(err))
		return err
	}

	for _, report := range recentReports {
		activity := dto.DashboardActivityDTO{
			ID:       report.ID,
			UserName: report.User.LastName + " " + report.User.FirstName,
			Action:   "週報を提出しました",
			Time:     s.formatTimeAgo(report.CreatedAt),
			Type:     "weekly_report",
		}
		*activities = append(*activities, activity)
	}

	// 最近の経費申請
	var recentExpenses []model.Expense
	if err := s.db.WithContext(ctx).
		Preload("User").
		Where("deleted_at IS NULL").
		Order("created_at DESC").
		Limit(3).
		Find(&recentExpenses).Error; err != nil {
		s.logger.Warn("Failed to get recent expenses", zap.Error(err))
	} else {
		for _, expense := range recentExpenses {
			activity := dto.DashboardActivityDTO{
				ID:       expense.ID,
				UserName: expense.User.LastName + " " + expense.User.FirstName,
				Action:   "経費申請を提出しました",
				Time:     s.formatTimeAgo(expense.CreatedAt),
				Type:     "expense",
			}
			*activities = append(*activities, activity)
		}
	}

	return nil
}

// formatTimeAgo 時間を「○分前」形式にフォーマット
func (s *adminDashboardService) formatTimeAgo(t time.Time) string {
	duration := time.Since(t)

	if duration.Minutes() < 1 {
		return "たった今"
	} else if duration.Minutes() < 60 {
		return fmt.Sprintf("%d", int(duration.Minutes())) + "分前"
	} else if duration.Hours() < 24 {
		return fmt.Sprintf("%d", int(duration.Hours())) + "時間前"
	} else if duration.Hours() < 24*7 {
		return fmt.Sprintf("%d", int(duration.Hours()/24)) + "日前"
	} else {
		return t.Format("2006/01/02")
	}
}
