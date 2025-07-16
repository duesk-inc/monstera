// Re-export query client for backwards compatibility
export { queryClient } from './query-client';

// クエリキーの定義（型安全性のため）
export const queryKeys = {
  // Admin Dashboard
  adminDashboard: ['admin', 'dashboard'] as const,
  
  // Admin Weekly Reports
  adminWeeklyReports: (params?: any) => ['admin', 'weeklyReports', params] as const,
  adminWeeklyReportDetail: (reportId: string) => ['admin', 'weeklyReports', reportId] as const,
  
  // Admin Follow-up
  adminFollowUpUsers: (params?: any) => ['admin', 'followUpUsers', params] as const,
  
  // Admin Clients
  adminClients: (params?: any) => ['admin', 'clients', params] as const,
  adminClientDetail: (clientId: string) => ['admin', 'clients', clientId] as const,
  
  // Admin Invoices
  adminInvoices: (params?: any) => ['admin', 'invoices', params] as const,
  adminInvoiceDetail: (invoiceId: string) => ['admin', 'invoices', invoiceId] as const,
  adminInvoiceSummary: (params?: any) => ['admin', 'invoices', 'summary', params] as const,
  
  // Admin Sales
  adminSalesPipeline: ['admin', 'sales', 'pipeline'] as const,
  adminExtensionTargets: ['admin', 'sales', 'extensionTargets'] as const,
  adminSalesActivities: (params?: any) => ['admin', 'sales', 'activities', params] as const,
  adminSalesSummary: (params?: any) => ['admin', 'sales', 'summary', params] as const,
  adminSalesTargets: ['admin', 'sales', 'targets'] as const,
  
  // Admin Engineers
  adminEngineers: (params?: any) => ['admin', 'engineers', params] as const,
  adminEngineerDetail: (engineerId: string) => ['admin', 'engineers', engineerId] as const,
  adminEngineerStatistics: ['admin', 'engineers', 'statistics'] as const,
  
  // Engineer
  engineerProfile: ['engineer', 'profile'] as const,
  engineerSkillSheet: ['engineer', 'skillSheet'] as const,
  engineerWeeklyReports: (params?: any) => ['engineer', 'weeklyReports', params] as const,
  engineerSchedule: (params?: any) => ['engineer', 'schedule', params] as const,
  
  // Common
  notifications: ['notifications'] as const,
  notificationUnreadCount: ['notifications', 'unreadCount'] as const,
};