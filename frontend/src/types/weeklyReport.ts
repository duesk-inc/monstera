
// 週報データの型定義
export interface DailyRecord {
  date: string;
  startTime: string;  // 文字列型の時間
  endTime: string;    // 文字列型の時間
  breakTime: number;
  clientStartTime?: string;  // 客先勤怠の開始時間
  clientEndTime?: string;    // 客先勤怠の終了時間
  clientBreakTime?: number;  // 客先勤怠の休憩時間
  clientWorkHours?: number;  // 客先勤怠の稼働時間
  hasClientWork?: boolean;   // 客先勤怠入力フラグ
  remarks: string;
  isHolidayWork: boolean; // 休日出勤フラグを追加
}

// APIから返される週報データの型定義
export interface LocalAPIWeeklyReport {
  id?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  start_date?: string; // スネークケース対応
  end_date?: string; // スネークケース対応
  status?: string;  // ENUM型文字列に統一
  statusString?: string; // 後方互換性のため（廃止予定）
  status_string?: string; // 後方互換性のため（廃止予定）
  weeklyRemarks?: string;
  weekly_remarks?: string; // スネークケース対応
  workplaceName?: string;
  workplace_name?: string; // スネークケース対応
  workplaceHours?: string;
  workplace_hours?: string; // スネークケース対応
  workplaceChangeRequested?: boolean;
  workplace_change_requested?: boolean; // スネークケース対応
  totalWorkHours?: number;
  total_work_hours?: number; // スネークケース対応
  clientTotalWorkHours?: number; // 客先勤怠の合計時間
  client_total_work_hours?: number; // スネークケース対応
  dailyRecords?: DailyRecord[];
  daily_records?: DailyRecord[]; // スネークケース対応
  submittedAt?: string;
  submitted_at?: string; // スネークケース対応
  createdAt?: string;
  updatedAt?: string;
}

// API通信用の週報型定義 (文字列ベースの日付)
export interface ApiWeeklyReport {
  id?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;  // ENUM型文字列に統一
  statusString?: string; // 後方互換性のため（廃止予定）
  weeklyRemarks?: string;
  totalWorkHours?: number;
  clientTotalWorkHours?: number;
  dailyRecords?: DailyRecord[];
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 週報一覧取得のレスポンス型
export interface ListWeeklyReportsResponse {
  reports: ApiWeeklyReport[];
  total: number;
  page: number;
  limit: number;
}

// バックエンドAPI用の型定義
export interface ApiResponseBase {
  id?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  start_date?: string;
  end_date?: string;
  status?: string;  // ENUM型文字列に統一
  weeklyRemarks?: string;
  weekly_remarks?: string;
  totalWorkHours?: number;
  total_work_hours?: number;
  clientTotalWorkHours?: number;
  client_total_work_hours?: number;
  workplaceChangeRequested?: boolean;
  workplace_change_requested?: boolean;
  dailyRecords?: DailyRecord[];
  daily_records?: DailyRecord[];
  submittedAt?: string;
  submitted_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 週報データの型定義
export interface WeeklyReport {
  id?: string;
  startDate: Date;
  endDate: Date;
  dailyRecords: DailyRecord[];
  weeklyRemarks: string;
  status?: string;  // ENUM型文字列に統一
  submittedAt?: string;
  totalWorkHours?: number;
  clientTotalWorkHours?: number;
  workplaceChangeRequested?: boolean; // 現場情報変更申請フラグを追加
}

export interface BulkSettings {
  startTime: string;
  endTime: string;
  breakTime: number;
  remarks: string;
}

// デフォルト勤務時間の設定インターフェース
export interface DefaultWorkTimeSettings {
  weekdayStart: string;
  weekdayEnd: string;
  weekdayBreak: number;
  customDaySettings: {
    monday: { enabled: boolean; startTime: string; endTime: string; breakTime: number; };
    tuesday: { enabled: boolean; startTime: string; endTime: string; breakTime: number; };
    wednesday: { enabled: boolean; startTime: string; endTime: string; breakTime: number; };
    thursday: { enabled: boolean; startTime: string; endTime: string; breakTime: number; };
    friday: { enabled: boolean; startTime: string; endTime: string; breakTime: number; };
    saturday: { enabled: boolean; startTime: string; endTime: string; breakTime: number; };
    sunday: { enabled: boolean; startTime: string; endTime: string; breakTime: number; };
  };
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

export interface ErrorState {
  weeklyRemarks?: string;
  dailyRecords?: string;
}

// 型安全なイベントハンドラ
export type DailyRecordChangeHandler = (index: number, field: keyof DailyRecord, value: string | number | boolean) => void;
export type TimeChangeHandler = (index: number, field: 'startTime' | 'endTime', time: Date | null) => void;
export type BreakTimeChangeHandler = (index: number, value: string) => void;
export type HolidayWorkToggleHandler = (index: number) => void;
export type ClientDailyRecordChangeHandler = (
  index: number, 
  field: 'clientStartTime' | 'clientEndTime' | 'hasClientWork', 
  value: string | boolean
) => void;
export type ClientBreakTimeChangeHandler = (index: number, value: string) => void;
export type TextChangeHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

// 検証結果の型
export interface ValidationResult {
  isValid: boolean;
  errors: ErrorState;
}

// 同一勤務時間チェック結果の型
export interface SameWorkTimeCheckResult {
  hasSameTime: boolean;
  message: string;
}

// 週選択用の週情報
export interface WeekInfo {
  startDate: Date;
  endDate: Date;
} 