// 管理者ダッシュボード関連の型定義

export interface PendingApprovals {
  weekly_reports: number;
  attendance_requests: number;
  leave_requests: number;
  expense_reports: number;
}

export interface DashboardStatistics {
  active_engineers: number;
  utilization_rate: number;
  monthly_revenue: number;
  active_projects: number;
}

export interface DashboardAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface DashboardActivity {
  id: string;
  user_name: string;
  action: string;
  time: string;
  type: string;
}

export interface FollowUpNeeded {
  engineers: number;
  critical: number;
}

export interface EngineerStatus {
  total: number;
  active: number;
  on_leave: number;
  inactive: number;
}

export interface WeeklyReportSummary {
  total_engineers: number;
  submitted: number;
  pending: number;
  not_submitted: number;
}

export interface RecentUpdate {
  id: string;
  type: string;
  title: string;
  time: string;
  user_name?: string;
}

export interface AdminDashboardData {
  pending_approvals: PendingApprovals;
  statistics?: DashboardStatistics;
  alerts?: DashboardAlert[];
  recent_activities?: DashboardActivity[];
  follow_up_needed: FollowUpNeeded;
  recent_updates: RecentUpdate[];
  engineer_status: EngineerStatus;
  weekly_report_summary: WeeklyReportSummary;
}