/**
 * APIエンドポイントの定数
 */

// APIバージョン
export const API_VERSION = '/api/v1' as const;

// 認証関連
export const AUTH_ENDPOINTS = {
  LOGIN: `${API_VERSION}/auth/login`,
  LOGOUT: `${API_VERSION}/auth/logout`,
  REFRESH: `${API_VERSION}/auth/refresh`,
  ME: `${API_VERSION}/auth/me`,
} as const;

// ユーザー関連
export const USER_ENDPOINTS = {
  PROFILE: `${API_VERSION}/profile`,
  PROFILE_AVATAR: `${API_VERSION}/profile/avatar`,
  SETTINGS: `${API_VERSION}/profile/settings`,
  PASSWORD: `${API_VERSION}/profile/password`,
  DEFAULT_WORK_TIME: `${API_VERSION}/profile/default-work-time`,
} as const;

// 週報関連
export const WEEKLY_REPORT_ENDPOINTS = {
  BASE: `${API_VERSION}/weekly-reports`,
  BY_ID: (id: string) => `${API_VERSION}/weekly-reports/${id}`,
  SUBMIT: (id: string) => `${API_VERSION}/weekly-reports/${id}/submit`,
  APPROVE: (id: string) => `${API_VERSION}/weekly-reports/${id}/approve`,
  REJECT: (id: string) => `${API_VERSION}/weekly-reports/${id}/reject`,
  COMMENTS: (id: string) => `${API_VERSION}/weekly-reports/${id}/comments`,
  BY_DATE_RANGE: `${API_VERSION}/weekly-reports/by-date-range`,
} as const;

// 勤怠関連
export const ATTENDANCE_ENDPOINTS = {
  BASE: `${API_VERSION}/attendance`,
  BY_ID: (id: string) => `${API_VERSION}/attendance/${id}`,
  REQUEST: `${API_VERSION}/attendance/requests`,
  APPROVE: (id: string) => `${API_VERSION}/attendance/requests/${id}/approve`,
  REJECT: (id: string) => `${API_VERSION}/attendance/requests/${id}/reject`,
} as const;

// 休暇関連
export const LEAVE_ENDPOINTS = {
  BASE: `${API_VERSION}/leave`,
  REQUESTS: `${API_VERSION}/leave/requests`,
  BY_ID: (id: string) => `${API_VERSION}/leave/requests/${id}`,
  BALANCE: `${API_VERSION}/leave/balance`,
  TYPES: `${API_VERSION}/leave/types`,
} as const;

// 経費関連
export const EXPENSE_ENDPOINTS = {
  BASE: `${API_VERSION}/expenses`,
  BY_ID: (id: string) => `${API_VERSION}/expenses/${id}`,
  SUBMIT: (id: string) => `${API_VERSION}/expenses/${id}/submit`,
  APPROVE: (id: string) => `${API_VERSION}/expenses/${id}/approve`,
  REJECT: (id: string) => `${API_VERSION}/expenses/${id}/reject`,
  CATEGORIES: `${API_VERSION}/expenses/categories`,
} as const;

// プロジェクト関連
export const PROJECT_ENDPOINTS = {
  BASE: `${API_VERSION}/projects`,
  BY_ID: (id: string) => `${API_VERSION}/projects/${id}`,
  ASSIGNMENTS: `${API_VERSION}/projects/assignments`,
  MY_PROJECTS: `${API_VERSION}/projects/my-projects`,
} as const;

// 管理者API
export const ADMIN_BASE = `${API_VERSION}/admin`;

export const ADMIN_ENDPOINTS = {
  // ダッシュボード
  DASHBOARD: `${ADMIN_BASE}/dashboard`,
  
  // エンジニア管理
  ENGINEERS: `${ADMIN_BASE}/engineers`,
  ENGINEER_BY_ID: (id: string) => `${ADMIN_BASE}/engineers/${id}`,
  ENGINEER_WEEKLY_REPORTS: `${ADMIN_BASE}/engineers/weekly-reports`,
  ENGINEER_ATTENDANCE: `${ADMIN_BASE}/engineers/attendance`,
  ENGINEER_EXPENSES: `${ADMIN_BASE}/engineers/expenses`,
  FOLLOW_UP: `${ADMIN_BASE}/engineers/follow-up`,
  
  // 取引先管理
  CLIENTS: `${ADMIN_BASE}/clients`,
  CLIENT_BY_ID: (id: string) => `${ADMIN_BASE}/clients/${id}`,
  CLIENT_PROJECTS: (id: string) => `${ADMIN_BASE}/clients/${id}/projects`,
  
  // 営業管理
  SALES: `${ADMIN_BASE}/sales`,
  SALES_ACTIVITIES: `${ADMIN_BASE}/sales/activities`,
  SALES_PIPELINE: `${ADMIN_BASE}/sales/pipeline`,
  SALES_TARGETS: `${ADMIN_BASE}/sales/targets`,
  
  // 請求書管理
  INVOICES: `${ADMIN_BASE}/invoices`,
  INVOICE_BY_ID: (id: string) => `${ADMIN_BASE}/invoices/${id}`,
  INVOICE_GENERATE: `${ADMIN_BASE}/invoices/generate`,
  INVOICE_SEND: (id: string) => `${ADMIN_BASE}/invoices/${id}/send`,
} as const;

// 通知関連
export const NOTIFICATION_ENDPOINTS = {
  BASE: `${API_VERSION}/notifications`,
  MARK_READ: (id: string) => `${API_VERSION}/notifications/${id}/read`,
  MARK_ALL_READ: `${API_VERSION}/notifications/mark-all-read`,
} as const;

// マスターデータ
export const MASTER_ENDPOINTS = {
  TECHNOLOGIES: `${API_VERSION}/master/technologies`,
  TECHNOLOGY_CATEGORIES: `${API_VERSION}/master/technology-categories`,
  SKILLS: `${API_VERSION}/master/skills`,
  CERTIFICATIONS: `${API_VERSION}/master/certifications`,
} as const;