// API Base Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
export const API_VERSION = 'v1';

// API Endpoints
export const NOTIFICATION_API = {
  BASE: `/api/${API_VERSION}/notifications`,
  USER_NOTIFICATIONS: `/api/${API_VERSION}/notifications/user`,
  MARK_READ: `/api/${API_VERSION}/notifications/mark-read`,
  SETTINGS: `/api/${API_VERSION}/notifications/settings`,
} as const;

export const PROFILE_API = {
  BASE: `/api/${API_VERSION}/profile`,
  GET: `/api/${API_VERSION}/profile`,
  UPDATE: `/api/${API_VERSION}/profile`,
  WITH_HISTORY: `/api/${API_VERSION}/profile/with-work-history`,
  TEMP_SAVE: `/api/${API_VERSION}/profile/temp-save`,
  AVATAR: `/api/${API_VERSION}/profile/avatar`,
  HISTORY: `/api/${API_VERSION}/profile/history`,
  LATEST_HISTORY: `/api/${API_VERSION}/profile/history`,
  TECHNOLOGY_CATEGORIES: `/api/${API_VERSION}/profile/technology-categories`,
  COMMON_CERTIFICATIONS: `/api/${API_VERSION}/profile/common-certifications`,
} as const;

export const WEEKLY_REPORT_API = {
  BASE: `/api/${API_VERSION}/weekly-reports`,
  CREATE: `/api/${API_VERSION}/weekly-reports`,
  UPDATE: `/api/${API_VERSION}/weekly-reports/:id`,
  LIST: `/api/${API_VERSION}/weekly-reports`,
  DETAIL: `/api/${API_VERSION}/weekly-reports/:id`,
  SUBMIT: `/api/${API_VERSION}/weekly-reports/:id/submit`,
  TEMPLATE: `/api/${API_VERSION}/weekly-reports/default-settings`,
} as const;

export const SKILL_SHEET_API = {
  BASE: `/api/${API_VERSION}/skill-sheets`,
  CREATE: `/api/${API_VERSION}/skill-sheets`,
  UPDATE: `/api/${API_VERSION}/skill-sheets`,
  LIST: `/api/${API_VERSION}/skill-sheets`,
} as const;

export const ATTENDANCE_API = {
  BASE: `/api/${API_VERSION}/attendance`,
  CLOCK_IN: `/api/${API_VERSION}/attendance/clock-in`,
  CLOCK_OUT: `/api/${API_VERSION}/attendance/clock-out`,
} as const;

export const LEAVE_API = {
  BASE: `/api/${API_VERSION}/leave`,
  TYPES: `/api/${API_VERSION}/leave/types`,
  BALANCES: `/api/${API_VERSION}/leave/balances`,
  REQUESTS: `/api/${API_VERSION}/leave/requests`,
  CREATE: `/api/${API_VERSION}/leave/requests`,
  APPLY: `/api/${API_VERSION}/leave/apply`,
  LIST: `/api/${API_VERSION}/leave/list`,
  APPROVE: `/api/${API_VERSION}/leave/approve`,
  REJECT: `/api/${API_VERSION}/leave/reject`,
} as const;

// Type exports
export type NotificationAPI = typeof NOTIFICATION_API;
export type ProfileAPI = typeof PROFILE_API;
export type WeeklyReportAPI = typeof WEEKLY_REPORT_API;
export type SkillSheetAPI = typeof SKILL_SHEET_API;
export type AttendanceAPI = typeof ATTENDANCE_API;
export type LeaveAPI = typeof LEAVE_API;