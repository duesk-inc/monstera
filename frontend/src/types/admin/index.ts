// 管理者機能の型定義をまとめてexport
export * from './client';
// dashboard からは重複するシンボルを除外して明示再エクスポート
export type {
  PendingApprovals,
  DashboardStatistics,
  DashboardAlert,
  DashboardActivity,
  FollowUpNeeded,
  EngineerStatus,
  RecentUpdate,
  AdminDashboardData,
} from './dashboard';
// FollowUpUser は weeklyReport にも存在するため、ここでは followUp の再エクスポートは行わない
export * from './invoice';
export * from './sales';
export * from './weeklyReport';
export * from './alert';
