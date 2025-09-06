// API Base Configuration
// 新しい分離された環境変数を使用（後方互換性も維持）
const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080';
const LEGACY_URL = process.env.NEXT_PUBLIC_API_URL;

export const API_BASE_URL = LEGACY_URL ? LEGACY_URL.replace(/\/api\/v\d+$/, '') : API_HOST;
export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

// API Endpoints
export const NOTIFICATION_API = {
  BASE: `/notifications`,
  LIST: `/notifications`,
  UNREAD: `/notifications/unread`,
  UNREAD_COUNT: `/notifications/unread-count`,
  DETAIL: `/notifications/:id`,
  MARK_READ_SINGLE: `/notifications/:id/read`,
  MARK_READ_ALL: `/notifications/read-all`,
  HIDE: `/notifications/:id/hide`,
  SETTINGS: `/notifications/settings`,
  // Compatibility keys (alias to existing or feature endpoints)
  UPDATE_SETTINGS: `/notifications/settings`,
  SLACK_SETTINGS: `/notifications/slack-settings`,
  SLACK_TEST: `/notifications/slack-test`,
} as const;

export const PROFILE_API = {
  BASE: `/profile`,
  GET: `/profile`,
  UPDATE: `/profile`,
  WITH_HISTORY: `/profile/with-work-history`,
  TEMP_SAVE: `/profile/temp-save`,
  AVATAR: `/profile/avatar`,
  HISTORY: `/profile/history`,
  LATEST_HISTORY: `/profile/history`,
  TECHNOLOGY_CATEGORIES: `/profile/technology-categories`,
  COMMON_CERTIFICATIONS: `/profile/common-certifications`,
} as const;

export const WEEKLY_REPORT_API = {
  BASE: `/weekly-reports`,
  CREATE: `/weekly-reports`,
  UPDATE: `/weekly-reports/:id`,
  LIST: `/weekly-reports`,
  DETAIL: `/weekly-reports/:id`,
  SUBMIT: `/weekly-reports/:id/submit`,
  TEMPLATE: `/weekly-reports/default-settings`,
} as const;

export const SKILL_SHEET_API = {
  BASE: `/skill-sheet`,
  GET: `/skill-sheet`,
  CREATE: `/skill-sheet`,
  UPDATE: `/skill-sheet`,
  TEMP_SAVE: `/skill-sheet/temp-save`,
  LIST: `/skill-sheets`,
} as const;

export const ATTENDANCE_API = {
  BASE: `/attendance`,
  CLOCK_IN: `/attendance/clock-in`,
  CLOCK_OUT: `/attendance/clock-out`,
} as const;

export const LEAVE_API = {
  BASE: `/leave`,
  TYPES: `/leave/types`,
  BALANCES: `/leave/balances`,
  REQUESTS: `/leave/requests`,
  CREATE: `/leave/requests`,
  APPLY: `/leave/apply`,
  LIST: `/leave/list`,
  APPROVE: `/leave/approve`,
  REJECT: `/leave/reject`,
} as const;

// Type exports
export type NotificationAPI = typeof NOTIFICATION_API;
export type ProfileAPI = typeof PROFILE_API;
export type WeeklyReportAPI = typeof WEEKLY_REPORT_API;
export type SkillSheetAPI = typeof SKILL_SHEET_API;
export type AttendanceAPI = typeof ATTENDANCE_API;
export type LeaveAPI = typeof LEAVE_API;
