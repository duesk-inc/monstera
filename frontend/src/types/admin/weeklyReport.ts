// 管理者週報関連の型定義

export interface AdminWeeklyReport {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  start_date: string;
  end_date: string;
  status: WeeklyReportStatus;  // ENUM型文字列に統一
  status_string?: string;  // 後方互換性のため（廃止予定）
  total_work_hours: number;
  manager_comment?: string;
  commented_at?: string;
  submitted_at?: string;
  created_at: string;
}

export interface DailyRecord {
  id: string;
  record_date: string;
  is_holiday: boolean;
  is_holiday_work: boolean;
  company_work_hours: number;
  client_work_hours: number;
  total_work_hours: number;
  remarks: string;
  created_at: string;
}

export interface WorkHour {
  id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  break_time: number;
}

export interface AdminWeeklyReportDetail extends AdminWeeklyReport {
  daily_records: DailyRecord[];
  work_hours: WorkHour[];
}

export interface WeeklyReportSummary {
  week_start: string;
  week_end: string;
  status: WeeklyReportStatus;  // ENUM型文字列に統一
  status_string?: string;  // 後方互換性のため（廃止予定）
  total_work_hours: number;
  client_hours: number;
}

export interface MonthlyAttendance {
  user_id: string;
  user_name: string;
  month: string;
  total_work_days: number;
  total_work_hours: number;
  total_client_hours: number;
  weekly_reports: WeeklyReportSummary[];
}

export interface FollowUpUser {
  user_id: string;
  user_name: string;
  user_email: string;
  follow_up_reason?: string;
  last_follow_up_date?: string;
  last_report_date?: string;
  last_report_status?: WeeklyReportStatus;  // ENUM型文字列に統一
  last_report_status_string?: string;  // 後方互換性のため（廃止予定）
  days_since_last_report?: number;
}

// API レスポンス型
export interface AdminWeeklyReportListResponse {
  reports: AdminWeeklyReport[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminWeeklyReportDetailResponse {
  report: AdminWeeklyReportDetail;
}

export interface AdminMonthlyAttendanceResponse {
  attendance: MonthlyAttendance[];
}

export interface AdminFollowUpRequiredUsersResponse {
  users: FollowUpUser[];
}

// API リクエスト型
export interface AdminWeeklyReportCommentRequest {
  comment: string;
}

export interface AdminWeeklyReportExportRequest {
  year: number;
  month: number;
  format: 'csv'; // Excelは初期スコープ外
  user_ids?: string[];
}

// 月次サマリー関連の型定義

export interface WeeklySummaryDTO {
  week_number: number;
  start_date: string;
  end_date: string;
  submission_rate: number;
  average_work_hours: number;
  submitted_count: number;
  total_count: number;
}

export interface MonthlyStatsDTO {
  total_reports: number;
  submitted_reports: number;
  overall_submission_rate: number;
  total_work_hours: number;
  average_work_hours: number;
  overtime_reports: number;
}

export interface DepartmentStatsDTO {
  department_id: string;
  department_name: string;
  user_count: number;
  submission_rate: number;
  average_work_hours: number;
}

export interface UserPerformanceDTO {
  user_id: string;
  user_name: string;
  department_name: string;
  submission_rate: number;
  average_work_hours: number;
  total_work_hours: number;
  report_count: number;
  on_time_rate: number;
}

export interface AlertSummaryDTO {
  total_alerts: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  resolved_alerts: number;
  pending_alerts: number;
  alerts_by_type: Record<string, number>;
}

export interface MonthlyComparisonDataDTO {
  year: number;
  month: number;
  submission_rate: number;
  average_work_hours: number;
  total_reports: number;
}

export interface MonthlyComparisonChangeDTO {
  submission_rate_change: number;
  work_hours_change: number;
  reports_change: number;
  submission_rate_trend: 'up' | 'down' | 'stable';
  work_hours_trend: 'up' | 'down' | 'stable';
}

export interface MonthlyComparisonDTO {
  previous_month: MonthlyComparisonDataDTO;
  current_month: MonthlyComparisonDataDTO;
  changes: MonthlyComparisonChangeDTO;
}

export interface MonthlySummaryDTO {
  year: number;
  month: number;
  total_users: number;
  weekly_summaries: WeeklySummaryDTO[];
  monthly_stats: MonthlyStatsDTO;
  department_stats: DepartmentStatsDTO[];
  top_performers: UserPerformanceDTO[];
  alert_summary: AlertSummaryDTO;
  comparison_data: MonthlyComparisonDTO;
}
import type { WeeklyReportStatus } from '@/types/common/status';
