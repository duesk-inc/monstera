package dto

import (
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
)

// AdminWeeklyReportDTO 管理者用週報DTO
type AdminWeeklyReportDTO struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	UserName       string     `json:"user_name"`
	UserEmail      string     `json:"user_email"`
	StartDate      time.Time  `json:"start_date"`
	EndDate        time.Time  `json:"end_date"`
	Status         int        `json:"status"`
	StatusString   string     `json:"status_string"` // Phase 1: 文字列ステータス
	Mood           int        `json:"mood"`
	MoodString     string     `json:"mood_string"` // Phase 1: 文字列ムード
	TotalWorkHours float64    `json:"total_work_hours"`
	ManagerComment *string    `json:"manager_comment"`
	CommentedAt    *time.Time `json:"commented_at"`
	SubmittedAt    *time.Time `json:"submitted_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

// AdminWeeklyReportDetailDTO 管理者用週報詳細DTO
type AdminWeeklyReportDetailDTO struct {
	AdminWeeklyReportDTO
	DailyRecords []DailyRecordDTO `json:"daily_records"`
	WorkHours    []WorkHourDTO    `json:"work_hours"`
}

// DailyRecordDTO 日次レコードDTO
type DailyRecordDTO struct {
	ID               uuid.UUID `json:"id"`
	RecordDate       time.Time `json:"record_date"`
	IsHoliday        bool      `json:"is_holiday"`
	IsHolidayWork    bool      `json:"is_holiday_work"`
	CompanyWorkHours float64   `json:"company_work_hours"`
	ClientWorkHours  float64   `json:"client_work_hours"`
	TotalWorkHours   float64   `json:"total_work_hours"`
	Remarks          string    `json:"remarks"`
	CreatedAt        time.Time `json:"created_at"`
}

// WorkHourDTO 勤務時間DTO
type WorkHourDTO struct {
	ID        uuid.UUID  `json:"id"`
	Date      time.Time  `json:"date"`
	StartTime *time.Time `json:"start_time"`
	EndTime   *time.Time `json:"end_time"`
	BreakTime float64    `json:"break_time"`
}

// MonthlyAttendanceDTO 月次勤怠DTO
type MonthlyAttendanceDTO struct {
	UserID           uuid.UUID                `json:"user_id"`
	UserName         string                   `json:"user_name"`
	Month            string                   `json:"month"`
	TotalWorkDays    int                      `json:"total_work_days"`
	TotalWorkHours   float64                  `json:"total_work_hours"`
	TotalClientHours float64                  `json:"total_client_hours"`
	WeeklyReports    []WeeklyReportSummaryDTO `json:"weekly_reports"`
}

// WeeklyReportSummaryDTO 週報サマリーDTO
type WeeklyReportSummaryDTO struct {
	WeekStart      time.Time `json:"week_start"`
	WeekEnd        time.Time `json:"week_end"`
	Status         int       `json:"status"`
	StatusString   string    `json:"status_string"` // Phase 1: 文字列ステータス
	TotalWorkHours float64   `json:"total_work_hours"`
	ClientHours    float64   `json:"client_hours"`
}

// FollowUpUserDTO フォローアップ対象ユーザーDTO
type FollowUpUserDTO struct {
	UserID                 uuid.UUID  `json:"user_id"`
	UserName               string     `json:"user_name"`
	UserEmail              string     `json:"user_email"`
	FollowUpReason         *string    `json:"follow_up_reason"`
	LastFollowUpDate       *time.Time `json:"last_follow_up_date"`
	LastReportDate         *time.Time `json:"last_report_date"`
	LastReportStatus       *int       `json:"last_report_status"`
	LastReportStatusString *string    `json:"last_report_status_string"` // Phase 1: 文字列ステータス
	DaysSinceLastReport    *int       `json:"days_since_last_report"`
}

// AdminDashboardDTO 管理者ダッシュボードDTO
type AdminDashboardDTO struct {
	PendingApprovals PendingApprovalsDTO    `json:"pending_approvals"`
	Statistics       DashboardStatisticsDTO `json:"statistics"`
	Alerts           []DashboardAlertDTO    `json:"alerts"`
	RecentActivities []DashboardActivityDTO `json:"recent_activities"`
}

// PendingApprovalsDTO 承認待ち件数DTO
type PendingApprovalsDTO struct {
	WeeklyReports      int `json:"weekly_reports"`
	AttendanceRequests int `json:"attendance_requests"`
	ExpenseRequests    int `json:"expense_requests"`
}

// DashboardStatisticsDTO ダッシュボード統計DTO
type DashboardStatisticsDTO struct {
	ActiveEngineers int     `json:"active_engineers"`
	UtilizationRate float64 `json:"utilization_rate"`
	MonthlyRevenue  float64 `json:"monthly_revenue"`
	ActiveProjects  int     `json:"active_projects"`
}

// DashboardAlertDTO ダッシュボードアラートDTO
type DashboardAlertDTO struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Title    string `json:"title"`
	Message  string `json:"message"`
	Severity string `json:"severity"`
}

// DashboardActivityDTO ダッシュボードアクティビティDTO
type DashboardActivityDTO struct {
	ID       string `json:"id"`
	UserName string `json:"user_name"`
	Action   string `json:"action"`
	Time     string `json:"time"`
	Type     string `json:"type"`
}

// ConvertAdminWeeklyReportDTO 管理者用週報DTOの変換（Phase 1用）
func ConvertAdminWeeklyReportDTO(report *model.WeeklyReport, userName, userEmail string) AdminWeeklyReportDTO {
	dto := AdminWeeklyReportDTO{
		ID:             report.ID,
		UserID:         report.UserID,
		UserName:       userName,
		UserEmail:      userEmail,
		StartDate:      report.StartDate,
		EndDate:        report.EndDate,
		Status:         0, // レガシー互換性のため（廃止予定）
		StatusString:   report.Status.String(),
		Mood:           int(report.Mood),
		MoodString:     ConvertMoodToString(report.Mood),
		TotalWorkHours: report.TotalWorkHours,
		ManagerComment: report.ManagerComment,
		CommentedAt:    report.CommentedAt,
		SubmittedAt:    report.SubmittedAt,
		CreatedAt:      report.CreatedAt,
	}
	return dto
}

// WeeklyReportSummaryDTO 週報サマリー統計DTO
type WeeklyReportSummaryStatsDTO struct {
	PeriodStart     time.Time                    `json:"period_start"`
	PeriodEnd       time.Time                    `json:"period_end"`
	TotalUsers      int                          `json:"total_users"`
	SubmissionStats SubmissionStatsDTO           `json:"submission_stats"`
	WorkHourStats   WorkHourStatsDTO             `json:"work_hour_stats"`
	DepartmentStats []DepartmentStatsDTO         `json:"department_stats"`
	UserSummaries   []UserWeeklyReportSummaryDTO `json:"user_summaries"`
	MoodStats       MoodStatsDTO                 `json:"mood_stats"`
	TrendAnalysis   WeeklyReportTrendAnalysisDTO `json:"trend_analysis"`
}

// SubmissionStatsDTO 提出状況統計DTO
type SubmissionStatsDTO struct {
	SubmittedCount int     `json:"submitted_count"`
	DraftCount     int     `json:"draft_count"`
	OverdueCount   int     `json:"overdue_count"`
	SubmissionRate float64 `json:"submission_rate"` // 提出率
	OnTimeRate     float64 `json:"on_time_rate"`    // 期限内提出率
}

// WorkHourStatsDTO 勤務時間統計DTO
type WorkHourStatsDTO struct {
	TotalWorkHours   float64 `json:"total_work_hours"`
	AverageWorkHours float64 `json:"average_work_hours"`
	MedianWorkHours  float64 `json:"median_work_hours"`
	MaxWorkHours     float64 `json:"max_work_hours"`
	MinWorkHours     float64 `json:"min_work_hours"`
	OvertimeUsers    int     `json:"overtime_users"`   // 残業時間が多いユーザー数
	UtilizationRate  float64 `json:"utilization_rate"` // 稼働率
}

// DepartmentStatsDTO 部署別統計DTO
type DepartmentStatsDTO struct {
	DepartmentID     uuid.UUID `json:"department_id"`
	DepartmentName   string    `json:"department_name"`
	UserCount        int       `json:"user_count"`
	SubmissionRate   float64   `json:"submission_rate"`
	AverageWorkHours float64   `json:"average_work_hours"`
	AverageMood      float64   `json:"average_mood"`
}

// UserWeeklyReportSummaryDTO ユーザー別週報サマリーDTO
type UserWeeklyReportSummaryDTO struct {
	UserID           uuid.UUID  `json:"user_id"`
	UserName         string     `json:"user_name"`
	UserEmail        string     `json:"user_email"`
	DepartmentName   string     `json:"department_name"`
	ReportCount      int        `json:"report_count"`
	SubmissionRate   float64    `json:"submission_rate"`
	TotalWorkHours   float64    `json:"total_work_hours"`
	AverageWorkHours float64    `json:"average_work_hours"`
	AverageMood      float64    `json:"average_mood"`
	LastSubmission   *time.Time `json:"last_submission"`
	DaysOverdue      int        `json:"days_overdue"` // 提出遅延日数
}

// MoodStatsDTO ムード統計DTO
type MoodStatsDTO struct {
	AverageMood      float64          `json:"average_mood"`
	MoodDistribution map[string]int   `json:"mood_distribution"` // "excellent": 5, "good": 8, ...
	LowMoodUsers     []LowMoodUserDTO `json:"low_mood_users"`    // ムードが低いユーザー
}

// LowMoodUserDTO ムードが低いユーザーDTO
type LowMoodUserDTO struct {
	UserID           uuid.UUID `json:"user_id"`
	UserName         string    `json:"user_name"`
	Mood             string    `json:"mood"`
	MoodValue        int       `json:"mood_value"`
	ConsecutiveWeeks int       `json:"consecutive_weeks"` // 連続してムードが低い週数
}

// WeeklyReportTrendAnalysisDTO トレンド分析DTO
type WeeklyReportTrendAnalysisDTO struct {
	SubmissionTrend  TrendDataDTO        `json:"submission_trend"`  // 提出率のトレンド
	WorkHourTrend    TrendDataDTO        `json:"work_hour_trend"`   // 勤務時間のトレンド
	MoodTrend        TrendDataDTO        `json:"mood_trend"`        // ムードのトレンド
	WeeklyComparison WeeklyComparisonDTO `json:"weekly_comparison"` // 前週比較
}

// TrendDataDTO トレンドデータDTO
type TrendDataDTO struct {
	Current    float64 `json:"current"`     // 今期の値
	Previous   float64 `json:"previous"`    // 前期の値
	Change     float64 `json:"change"`      // 変化量
	ChangeRate float64 `json:"change_rate"` // 変化率（%）
	Trend      string  `json:"trend"`       // "up", "down", "stable"
}

// WeeklyComparisonDTO 週次比較DTO
type WeeklyComparisonDTO struct {
	CurrentWeek  WeeklyStatsDTO `json:"current_week"`
	PreviousWeek WeeklyStatsDTO `json:"previous_week"`
	Changes      WeeklyStatsDTO `json:"changes"` // 変化量
}

// WeeklyStatsDTO 週次統計DTO
type WeeklyStatsDTO struct {
	WeekStart        time.Time `json:"week_start"`
	WeekEnd          time.Time `json:"week_end"`
	SubmissionCount  int       `json:"submission_count"`
	AverageWorkHours float64   `json:"average_work_hours"`
	AverageMood      float64   `json:"average_mood"`
}

// MonthlySummaryDTO 月次サマリーDTO
type MonthlySummaryDTO struct {
	Year            int                  `json:"year"`
	Month           int                  `json:"month"`
	TotalUsers      int                  `json:"total_users"`
	WeeklySummaries []WeeklySummaryDTO   `json:"weekly_summaries"`
	MonthlyStats    MonthlyStatsDTO      `json:"monthly_stats"`
	DepartmentStats []DepartmentStatsDTO `json:"department_stats"`
	TopPerformers   []UserPerformanceDTO `json:"top_performers"`
	AlertSummary    AlertSummaryDTO      `json:"alert_summary"`
	ComparisonData  MonthlyComparisonDTO `json:"comparison_data"`
}

// WeeklySummaryDTO 週次サマリーDTO（月次内の各週）
type WeeklySummaryDTO struct {
	WeekNumber       int       `json:"week_number"`
	StartDate        time.Time `json:"start_date"`
	EndDate          time.Time `json:"end_date"`
	SubmissionRate   float64   `json:"submission_rate"`
	AverageWorkHours float64   `json:"average_work_hours"`
	AverageMood      float64   `json:"average_mood"`
	SubmittedCount   int       `json:"submitted_count"`
	TotalCount       int       `json:"total_count"`
}

// MonthlyStatsDTO 月次統計DTO
type MonthlyStatsDTO struct {
	TotalReports          int            `json:"total_reports"`
	SubmittedReports      int            `json:"submitted_reports"`
	OverallSubmissionRate float64        `json:"overall_submission_rate"`
	TotalWorkHours        float64        `json:"total_work_hours"`
	AverageWorkHours      float64        `json:"average_work_hours"`
	OvertimeReports       int            `json:"overtime_reports"`
	AverageMood           float64        `json:"average_mood"`
	MoodDistribution      map[string]int `json:"mood_distribution"`
}

// UserPerformanceDTO ユーザーパフォーマンスDTO
type UserPerformanceDTO struct {
	UserID           uuid.UUID `json:"user_id"`
	UserName         string    `json:"user_name"`
	DepartmentName   string    `json:"department_name"`
	SubmissionRate   float64   `json:"submission_rate"`
	AverageWorkHours float64   `json:"average_work_hours"`
	TotalWorkHours   float64   `json:"total_work_hours"`
	AverageMood      float64   `json:"average_mood"`
	ReportCount      int       `json:"report_count"`
	OnTimeRate       float64   `json:"on_time_rate"`
}

// AlertSummaryDTO アラートサマリーDTO
type AlertSummaryDTO struct {
	TotalAlerts       int64            `json:"total_alerts"`
	UnhandledAlerts   int64            `json:"unhandled_alerts"`
	HandlingAlerts    int64            `json:"handling_alerts"`
	ResolvedAlerts    int64            `json:"resolved_alerts"`
	PendingAlerts     int64            `json:"pending_alerts"`
	HighSeverity      int64            `json:"high_severity"`
	MediumSeverity    int64            `json:"medium_severity"`
	LowSeverity       int64            `json:"low_severity"`
	SeverityBreakdown map[string]int64 `json:"severity_breakdown"`
	TypeBreakdown     map[string]int64 `json:"type_breakdown"`
	RecentAlerts      []interface{}    `json:"recent_alerts"`
	AlertsByType      map[string]int64 `json:"alerts_by_type"`
}

// MonthlyComparisonDTO 月次比較DTO
type MonthlyComparisonDTO struct {
	PreviousMonth MonthlyComparisonDataDTO   `json:"previous_month"`
	CurrentMonth  MonthlyComparisonDataDTO   `json:"current_month"`
	Changes       MonthlyComparisonChangeDTO `json:"changes"`
}

// MonthlyComparisonDataDTO 月次比較データDTO
type MonthlyComparisonDataDTO struct {
	Year             int     `json:"year"`
	Month            int     `json:"month"`
	SubmissionRate   float64 `json:"submission_rate"`
	AverageWorkHours float64 `json:"average_work_hours"`
	AverageMood      float64 `json:"average_mood"`
	TotalReports     int     `json:"total_reports"`
}

// MonthlyComparisonChangeDTO 月次比較変化DTO
type MonthlyComparisonChangeDTO struct {
	SubmissionRateChange float64 `json:"submission_rate_change"`
	WorkHoursChange      float64 `json:"work_hours_change"`
	MoodChange           float64 `json:"mood_change"`
	ReportsChange        int     `json:"reports_change"`
	SubmissionRateTrend  string  `json:"submission_rate_trend"` // "up", "down", "stable"
	WorkHoursTrend       string  `json:"work_hours_trend"`
	MoodTrend            string  `json:"mood_trend"`
}

// WeeklyReportListParams 週報一覧取得パラメータ
type WeeklyReportListParams struct {
	Status       string `json:"status" form:"status"`
	Search       string `json:"search" form:"search"`
	DepartmentID string `json:"department_id" form:"department_id"`
	StartDate    string `json:"start_date" form:"start_date"`
	EndDate      string `json:"end_date" form:"end_date"`
	Page         int    `json:"page" form:"page"`
	Limit        int    `json:"limit" form:"limit"`
}

// WeeklyReportListResponse 週報一覧レスポンス
type WeeklyReportListResponse struct {
	Items []AdminWeeklyReportDTO `json:"items"`
	Total int64                  `json:"total"`
	Page  int                    `json:"page"`
	Limit int                    `json:"limit"`
}

// UnsubmittedReportParams 未提出レポート取得パラメータ
type UnsubmittedReportParams struct {
	DepartmentID   string `json:"department_id" form:"department_id"`
	MinDaysOverdue int    `json:"min_days_overdue" form:"min_days_overdue"`
}

// UnsubmittedReportResponse 未提出レポートレスポンス
type UnsubmittedReportResponse struct {
	Items []FollowUpUserDTO `json:"items"`
	Total int64             `json:"total"`
}

// ConvertMoodToString MoodStatus（INT）を文字列に変換
func ConvertMoodToString(mood model.MoodStatus) string {
	switch mood {
	case model.MoodStatusTerrible:
		return "terrible"
	case model.MoodStatusBad:
		return "bad"
	case model.MoodStatusNeutral:
		return "neutral"
	case model.MoodStatusGood:
		return "good"
	case model.MoodStatusExcellent:
		return "excellent"
	default:
		return "neutral"
	}
}
