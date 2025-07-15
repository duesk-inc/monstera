/**
 * ルーティング関連の定数
 */

// 基本ルート
export const ROUTES = {
  // 認証
  LOGIN: '/login',
  LOGOUT: '/logout',
  
  // ダッシュボード
  DASHBOARD: '/dashboard',
  ADMIN_DASHBOARD: '/admin/dashboard',
  
  // エンジニア向け
  ENGINEER: {
    PROFILE: '/profile',
    WEEKLY_REPORTS: '/weekly-reports',
    WEEKLY_REPORT_NEW: '/weekly-reports/new',
    WEEKLY_REPORT_EDIT: (id: string) => `/weekly-reports/${id}/edit`,
    ATTENDANCE: '/attendance',
    LEAVE: '/leave',
    LEAVE_NEW: '/leave/new',
    EXPENSES: '/expenses',
    EXPENSE_NEW: '/expenses/new',
    PROJECTS: '/projects',
    PROJECT_DETAIL: (id: string) => `/projects/${id}`,
    WORK_HISTORY: '/work-history',
    WORK_HISTORY_NEW: '/work-history/new',
    WORK_HISTORY_EDIT: (id: string) => `/work-history/${id}/edit`,
  },
  
  // 管理者向け
  ADMIN: {
    BASE: '/admin',
    ENGINEERS: '/admin/engineers',
    ENGINEER_DETAIL: (id: string) => `/admin/engineers/${id}`,
    WEEKLY_REPORTS: '/admin/engineers/weekly-reports',
    ATTENDANCE: '/admin/engineers/attendance',
    EXPENSES: '/admin/engineers/expenses',
    FOLLOW_UP: '/admin/engineers/follow-up',
    CLIENTS: '/admin/clients',
    CLIENT_DETAIL: (id: string) => `/admin/clients/${id}`,
    SALES: '/admin/sales',
    INVOICES: '/admin/invoices',
    ACTIVITIES: '/admin/activities',
  },
} as const;

// パブリックパス（認証不要）
export const PUBLIC_PATHS = [
  ROUTES.LOGIN,
  '/health',
  '/favicon.ico',
  '/_next',
  '/api/health',
] as const;

// 認証後のリダイレクト先
export const AUTH_REDIRECT = {
  AFTER_LOGIN: ROUTES.DASHBOARD,
  AFTER_LOGOUT: ROUTES.LOGIN,
  UNAUTHORIZED: ROUTES.LOGIN,
} as const;