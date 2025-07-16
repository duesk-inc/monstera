// LeaveTypesと関連する型定義

// 休暇タイプ情報の型
export interface LeaveTypeInfo {
  id: string;
  value: string;
  label: string;
  code?: string;
  genderSpecific?: string;
}

// AttendanceFormDataの型
export interface AttendanceFormData {
  leaveTypeId: string;
  selectedDates: Date[];
  isHourlyBased: boolean;
  startTime: string;
  endTime: string;
  reason: string;
}

// 休暇残高の型
export interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  name: string;
  total: number;
  used: number;
  remaining: number;
  expireDate: string | '';
}

// 休暇申請の型
export interface LeaveRequest {
  id: string;
  requestDate: string;
  leaveTypeName: string;
  status: string;
  processedAt?: string;
  isHourlyBased?: boolean;
  details?: LeaveRequestDetail[];
}

// 休暇申請詳細の型
export interface LeaveRequestDetail {
  leaveDate: string;
  isHourlyBased?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  dayValue?: number;
}

// 状態チップの情報型 - LeaveRequestRowで個別に定義するように変更
// export interface StatusChipInfo {
//   label: string;
//   color: 'success' | 'warning' | 'error' | 'default';
// }

// API関連の型定義 (app/api/leave/route.tsから移動)

// 休暇種別の型定義
export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string;
  defaultDays: number;
  isHourlyAvailable: boolean;
  reasonRequired: boolean;
  genderSpecific: string;
  displayOrder: number;
  isActive: boolean;
}

// ユーザーの休暇残日数の型定義
export interface UserLeaveBalance {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  fiscalYear: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  expireDate: string;
}

// 休暇申請のリクエスト型定義
export interface LeaveRequestRequest {
  leaveTypeId: string;
  isHourlyBased: boolean;
  reason: string;
  totalDays: number;
  requestDetails: LeaveRequestDetail[];
}

// 休暇申請詳細の応答型定義
export interface LeaveRequestDetailResponse {
  id: string;
  leaveDate: string;
  startTime?: string;
  endTime?: string;
  dayValue: number;
}

// 休暇申請の応答型定義
export interface LeaveRequestResponse {
  id: string;
  userId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  requestDate: string;
  isHourlyBased: boolean;
  reason: string;
  totalDays: number;
  status: string;
  approverId?: string;
  processedAt?: string;
  details: LeaveRequestDetailResponse[];
}

// 休日情報の型定義
export interface Holiday {
  date: string;
  name: string;
  type: string;
}

// バックエンドAPIとの通信に使用するスネークケース型定義
export interface LeaveRequestSnakeCase {
  leave_type_id: string;
  is_hourly_based: boolean;
  reason: string;
  total_days: number;
  request_details: Array<{
    leave_date: string;
    start_time?: string;
    end_time?: string;
    day_value: number;
  }>;
}
