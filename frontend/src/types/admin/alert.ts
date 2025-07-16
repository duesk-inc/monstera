// アラート設定関連の型定義

export interface AlertSettings {
  id: string;
  name: string;
  weeklyHoursLimit: number;
  weeklyHoursChangeLimit: number;
  consecutiveHolidayWorkLimit: number;
  monthlyOvertimeLimit: number;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
  };
  updater?: {
    id: string;
    name: string;
  };
}

export interface CreateAlertSettingsRequest {
  name: string;
  weeklyHoursLimit: number;
  weeklyHoursChangeLimit: number;
  consecutiveHolidayWorkLimit: number;
  monthlyOvertimeLimit: number;
  isActive: boolean;
}

export interface UpdateAlertSettingsRequest {
  name: string;
  weeklyHoursLimit: number;
  weeklyHoursChangeLimit: number;
  consecutiveHolidayWorkLimit: number;
  monthlyOvertimeLimit: number;
  isActive: boolean;
}

export interface AlertHistory {
  id: string;
  alertSettingId: string;
  userId: string;
  weeklyReportId?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  detectedValue: Record<string, any>;
  thresholdValue: Record<string, any>;
  status: AlertStatus;
  handledBy?: string;
  handledAt?: string;
  resolutionComment?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
  weeklyReport?: {
    id: string;
    startDate: string;
    endDate: string;
  };
  handler?: {
    id: string;
    name: string;
  };
}

export enum AlertType {
  OVERWORK = 'overwork',
  SUDDEN_CHANGE = 'sudden_change',
  HOLIDAY_WORK = 'holiday_work',
  MONTHLY_OVERTIME = 'monthly_overtime',
  LATE_NIGHT_WORK = 'late_night_work',
  IRREGULAR_WORK_HOURS = 'irregular_work_hours',
  CONSECUTIVE_LONG_WORK = 'consecutive_long_work',
  UNSUBMITTED = 'unsubmitted',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum AlertStatus {
  UNHANDLED = 'unhandled',
  HANDLING = 'handling',
  RESOLVED = 'resolved',
}

export interface AlertFilters {
  status?: string;
  severity?: string;
  alertType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AlertSummary {
  totalAlerts: number;
  unhandledAlerts: number;
  handlingAlerts: number;
  resolvedAlerts: number;
  severityBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  recentAlerts: AlertHistory[];
}

export interface UpdateAlertStatusRequest {
  status: AlertStatus;
  comment?: string;
}

// API レスポンス型
export interface AlertSettingsListResponse {
  settings: AlertSettings[];
  total: number;
  page: number;
  limit: number;
}

export interface AlertHistoryListResponse {
  histories: AlertHistory[];
  total: number;
  page: number;
  limit: number;
}