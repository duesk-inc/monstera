// 週報サマリー統計の型定義（バックエンドAPIと対応）

export interface SubmissionStats {
  submittedCount: number;
  draftCount: number;
  overdueCount: number;
  submissionRate: number;
  onTimeRate: number;
}

export interface WorkHourStats {
  totalWorkHours: number;
  averageWorkHours: number;
  medianWorkHours: number;
  maxWorkHours: number;
  minWorkHours: number;
  overtimeUsers: number;
  utilizationRate: number;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  userCount: number;
  submissionRate: number;
  averageWorkHours: number;
  averageMood: number;
}

export interface UserWeeklyReportSummary {
  userId: string;
  userName: string;
  userEmail: string;
  departmentName: string;
  reportCount: number;
  submissionRate: number;
  totalWorkHours: number;
  averageWorkHours: number;
  averageMood: number;
  lastSubmission?: string;
  daysOverdue: number;
}

export interface LowMoodUser {
  userId: string;
  userName: string;
  mood: string;
  moodValue: number;
  consecutiveWeeks: number;
}

export interface MoodStats {
  averageMood: number;
  moodDistribution: Record<string, number>;
  lowMoodUsers: LowMoodUser[];
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changeRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  submissionCount: number;
  averageWorkHours: number;
  averageMood: number;
}

export interface WeeklyComparison {
  currentWeek: WeeklyStats;
  previousWeek: WeeklyStats;
  changes?: WeeklyStats;
}

export interface WeeklyReportTrendAnalysis {
  submissionTrend: TrendData;
  workHourTrend: TrendData;
  moodTrend: TrendData;
  weeklyComparison: WeeklyComparison;
}

export interface WeeklyReportSummaryStats {
  periodStart: string;
  periodEnd: string;
  totalUsers: number;
  submissionStats: SubmissionStats;
  workHourStats: WorkHourStats;
  departmentStats: DepartmentStats[];
  userSummaries: UserWeeklyReportSummary[];
  moodStats: MoodStats;
  trendAnalysis: WeeklyReportTrendAnalysis;
}

// API レスポンス用の型
export interface WeeklyReportSummaryResponse {
  summary: WeeklyReportSummaryStats;
}

// ダッシュボード表示用の期間設定
export interface PeriodFilter {
  startDate: string;
  endDate: string;
  departmentId?: string;
}

// チャート用のデータ型
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

// ダッシュボードカード用の統計サマリー
export interface StatsSummaryCard {
  title: string;
  value: number | string;
  unit?: string;
  trend?: TrendData;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}