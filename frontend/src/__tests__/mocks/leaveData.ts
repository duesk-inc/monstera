/**
 * 休暇申請機能テスト用のモックデータ
 */

import {
  LeaveType,
  UserLeaveBalance,
  LeaveRequestResponse,
  LeaveRequestDetailResponse,
  Holiday,
  AttendanceFormData,
  LeaveRequestRequest,
} from '../../types/leave';
import { LEAVE_TYPE_CODES, LEAVE_REQUEST_STATUS } from '../../constants/leave';

// =====================
// モック用の固定UUID
// =====================
export const MOCK_IDS = {
  USERS: {
    TEST_USER: 'user-test-0001-0001-000000000001',
    ADMIN_USER: 'user-admin-001-001-000000000001',
  },
  LEAVE_TYPES: {
    PAID: 'leave-type-paid-001-000000000001',
    SUMMER: 'leave-type-summer-01-000000000001',
    CONDOLENCE: 'leave-type-condo-01-000000000001',
    SPECIAL: 'leave-type-special-000000000001',
    SUBSTITUTE: 'leave-type-subst-01-000000000001',
    MENSTRUAL: 'leave-type-menst-01-000000000001',
  },
  LEAVE_REQUESTS: {
    PENDING_001: 'leave-req-pending-01-000000000001',
    APPROVED_001: 'leave-req-approved-1-000000000001',
    REJECTED_001: 'leave-req-rejected-1-000000000001',
  },
  LEAVE_BALANCES: {
    PAID_BALANCE: 'balance-paid-test-01-000000000001',
    SUMMER_BALANCE: 'balance-summer-test-000000000001',
  },
} as const;

// =====================
// 休暇種別モックデータ
// =====================
export const createMockLeaveType = (
  overrides: Partial<LeaveType> = {}
): LeaveType => ({
  id: MOCK_IDS.LEAVE_TYPES.PAID,
  code: LEAVE_TYPE_CODES.PAID,
  name: '有給休暇',
  description: '年次有給休暇',
  defaultDays: 20,
  isHourlyAvailable: true,
  reasonRequired: false,
  genderSpecific: '',
  displayOrder: 1,
  isActive: true,
  ...overrides,
});

export const mockLeaveTypes: LeaveType[] = [
  createMockLeaveType({
    id: MOCK_IDS.LEAVE_TYPES.PAID,
    code: LEAVE_TYPE_CODES.PAID,
    name: '有給休暇',
    description: '年次有給休暇',
    defaultDays: 20,
    isHourlyAvailable: true,
    reasonRequired: false,
    genderSpecific: '',
    displayOrder: 1,
  }),
  createMockLeaveType({
    id: MOCK_IDS.LEAVE_TYPES.SUMMER,
    code: LEAVE_TYPE_CODES.SUMMER,
    name: '夏季休暇',
    description: '夏季特別休暇',
    defaultDays: 3,
    isHourlyAvailable: false,
    reasonRequired: false,
    genderSpecific: '',
    displayOrder: 2,
  }),
  createMockLeaveType({
    id: MOCK_IDS.LEAVE_TYPES.CONDOLENCE,
    code: LEAVE_TYPE_CODES.CONDOLENCE,
    name: '慶弔休暇',
    description: '慶弔に関する特別休暇',
    defaultDays: 5,
    isHourlyAvailable: false,
    reasonRequired: true,
    genderSpecific: '',
    displayOrder: 3,
  }),
  createMockLeaveType({
    id: MOCK_IDS.LEAVE_TYPES.SPECIAL,
    code: LEAVE_TYPE_CODES.SPECIAL,
    name: '特別休暇',
    description: '特別な事情による休暇',
    defaultDays: 3,
    isHourlyAvailable: true,
    reasonRequired: true,
    genderSpecific: '',
    displayOrder: 4,
  }),
  createMockLeaveType({
    id: MOCK_IDS.LEAVE_TYPES.SUBSTITUTE,
    code: LEAVE_TYPE_CODES.SUBSTITUTE,
    name: '振替特別休暇',
    description: '休日出勤の振替休暇',
    defaultDays: 0,
    isHourlyAvailable: false,
    reasonRequired: false,
    genderSpecific: '',
    displayOrder: 5,
  }),
  createMockLeaveType({
    id: MOCK_IDS.LEAVE_TYPES.MENSTRUAL,
    code: LEAVE_TYPE_CODES.MENSTRUAL,
    name: '生理休暇',
    description: '生理による体調不良時の休暇',
    defaultDays: 12,
    isHourlyAvailable: true,
    reasonRequired: false,
    genderSpecific: 'female',
    displayOrder: 6,
  }),
];

// =====================
// ユーザー休暇残日数モックデータ
// =====================
export const createMockUserLeaveBalance = (
  overrides: Partial<UserLeaveBalance> = {}
): UserLeaveBalance => ({
  id: MOCK_IDS.LEAVE_BALANCES.PAID_BALANCE,
  leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
  leaveTypeName: '有給休暇',
  fiscalYear: 2024,
  totalDays: 20,
  usedDays: 5,
  remainingDays: 15,
  expireDate: '2025-03-31',
  ...overrides,
});

export const mockUserLeaveBalances: UserLeaveBalance[] = [
  createMockUserLeaveBalance({
    id: MOCK_IDS.LEAVE_BALANCES.PAID_BALANCE,
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
    leaveTypeName: '有給休暇',
    totalDays: 20,
    usedDays: 5,
    remainingDays: 15,
    expireDate: '2025-03-31',
  }),
  createMockUserLeaveBalance({
    id: MOCK_IDS.LEAVE_BALANCES.SUMMER_BALANCE,
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.SUMMER,
    leaveTypeName: '夏季休暇',
    totalDays: 3,
    usedDays: 0,
    remainingDays: 3,
    expireDate: '2024-12-31',
  }),
  createMockUserLeaveBalance({
    id: 'balance-condolence-test-000000000001',
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.CONDOLENCE,
    leaveTypeName: '慶弔休暇',
    totalDays: 5,
    usedDays: 0,
    remainingDays: 5,
    expireDate: '',
  }),
  createMockUserLeaveBalance({
    id: 'balance-special-test-000000000001',
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.SPECIAL,
    leaveTypeName: '特別休暇',
    totalDays: 3,
    usedDays: 1,
    remainingDays: 2,
    expireDate: '',
  }),
  createMockUserLeaveBalance({
    id: 'balance-menstrual-test-000000000001',
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.MENSTRUAL,
    leaveTypeName: '生理休暇',
    totalDays: 12,
    usedDays: 2,
    remainingDays: 10,
    expireDate: '2025-03-31',
  }),
];

// =====================
// 休暇申請詳細モックデータ
// =====================
export const createMockLeaveRequestDetail = (
  overrides: Partial<LeaveRequestDetailResponse> = {}
): LeaveRequestDetailResponse => ({
  id: 'detail-001-000000000001',
  leaveDate: '2024-12-25',
  startTime: undefined,
  endTime: undefined,
  dayValue: 1.0,
  ...overrides,
});

// =====================
// 休暇申請モックデータ
// =====================
export const createMockLeaveRequest = (
  overrides: Partial<LeaveRequestResponse> = {}
): LeaveRequestResponse => ({
  id: MOCK_IDS.LEAVE_REQUESTS.PENDING_001,
  userId: MOCK_IDS.USERS.TEST_USER,
  leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
  leaveTypeName: '有給休暇',
  requestDate: '2024-12-20',
  isHourlyBased: false,
  reason: '',
  totalDays: 1.0,
  status: LEAVE_REQUEST_STATUS.PENDING,
  approverId: undefined,
  processedAt: undefined,
  details: [
    createMockLeaveRequestDetail({
      id: 'detail-001-000000000001',
      leaveDate: '2024-12-25',
      dayValue: 1.0,
    }),
  ],
  ...overrides,
});

export const mockLeaveRequests: LeaveRequestResponse[] = [
  // 申請中の有給休暇
  createMockLeaveRequest({
    id: MOCK_IDS.LEAVE_REQUESTS.PENDING_001,
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
    leaveTypeName: '有給休暇',
    requestDate: '2024-12-20',
    status: LEAVE_REQUEST_STATUS.PENDING,
    totalDays: 1.0,
    details: [
      createMockLeaveRequestDetail({
        id: 'detail-pending-001-000000000001',
        leaveDate: '2024-12-25',
        dayValue: 1.0,
      }),
    ],
  }),
  // 承認済みの夏季休暇
  createMockLeaveRequest({
    id: MOCK_IDS.LEAVE_REQUESTS.APPROVED_001,
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.SUMMER,
    leaveTypeName: '夏季休暇',
    requestDate: '2024-08-01',
    status: LEAVE_REQUEST_STATUS.APPROVED,
    approverId: MOCK_IDS.USERS.ADMIN_USER,
    processedAt: '2024-08-02T10:00:00Z',
    totalDays: 2.0,
    details: [
      createMockLeaveRequestDetail({
        id: 'detail-approved-001-000000000001',
        leaveDate: '2024-08-15',
        dayValue: 1.0,
      }),
      createMockLeaveRequestDetail({
        id: 'detail-approved-002-000000000001',
        leaveDate: '2024-08-16',
        dayValue: 1.0,
      }),
    ],
  }),
  // 却下された特別休暇
  createMockLeaveRequest({
    id: MOCK_IDS.LEAVE_REQUESTS.REJECTED_001,
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.SPECIAL,
    leaveTypeName: '特別休暇',
    requestDate: '2024-11-10',
    status: LEAVE_REQUEST_STATUS.REJECTED,
    reason: '個人的な用事のため',
    approverId: MOCK_IDS.USERS.ADMIN_USER,
    processedAt: '2024-11-11T14:30:00Z',
    totalDays: 1.0,
    details: [
      createMockLeaveRequestDetail({
        id: 'detail-rejected-001-000000000001',
        leaveDate: '2024-11-20',
        dayValue: 1.0,
      }),
    ],
  }),
  // 時間単位の有給休暇（承認済み）
  createMockLeaveRequest({
    id: 'leave-req-hourly-approved-000000000001',
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
    leaveTypeName: '有給休暇',
    requestDate: '2024-10-01',
    isHourlyBased: true,
    status: LEAVE_REQUEST_STATUS.APPROVED,
    approverId: MOCK_IDS.USERS.ADMIN_USER,
    processedAt: '2024-10-02T09:15:00Z',
    totalDays: 0.5,
    details: [
      createMockLeaveRequestDetail({
        id: 'detail-hourly-001-000000000001',
        leaveDate: '2024-10-15',
        startTime: '13:00',
        endTime: '17:00',
        dayValue: 0.5,
      }),
    ],
  }),
];

// =====================
// 休日情報モックデータ
// =====================
export const createMockHoliday = (
  overrides: Partial<Holiday> = {}
): Holiday => ({
  date: '2024-01-01',
  name: '元日',
  type: 'national',
  ...overrides,
});

export const mockHolidays: Holiday[] = [
  createMockHoliday({
    date: '2024-01-01',
    name: '元日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-01-08',
    name: '成人の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-02-11',
    name: '建国記念の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-02-23',
    name: '天皇誕生日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-03-20',
    name: '春分の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-04-29',
    name: '昭和の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-05-03',
    name: '憲法記念日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-05-04',
    name: 'みどりの日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-05-05',
    name: 'こどもの日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-07-15',
    name: '海の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-08-11',
    name: '山の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-09-16',
    name: '敬老の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-09-22',
    name: '秋分の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-10-14',
    name: 'スポーツの日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-11-03',
    name: '文化の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-11-23',
    name: '勤労感謝の日',
    type: 'national',
  }),
  createMockHoliday({
    date: '2024-12-29',
    name: '年末休暇',
    type: 'company',
  }),
  createMockHoliday({
    date: '2024-12-30',
    name: '年末休暇',
    type: 'company',
  }),
  createMockHoliday({
    date: '2024-12-31',
    name: '大晦日',
    type: 'company',
  }),
];

// =====================
// フォームデータ用モックデータ
// =====================
export const createMockAttendanceFormData = (
  overrides: Partial<AttendanceFormData> = {}
): AttendanceFormData => ({
  leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
  selectedDates: [new Date('2024-12-25')],
  isHourlyBased: false,
  startTime: '09:00',
  endTime: '18:00',
  reason: '',
  ...overrides,
});

// =====================
// API リクエスト用モックデータ
// =====================
export const createMockLeaveRequestRequest = (
  overrides: Partial<LeaveRequestRequest> = {}
): LeaveRequestRequest => ({
  leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
  isHourlyBased: false,
  reason: '',
  totalDays: 1.0,
  requestDetails: [
    {
      leaveDate: '2024-12-25',
      startTime: undefined,
      endTime: undefined,
      dayValue: 1.0,
    },
  ],
  ...overrides,
});

// =====================
// シナリオ別モックデータ
// =====================
export const mockDataScenarios = {
  // 通常の有給申請
  normalPaidLeave: {
    formData: createMockAttendanceFormData({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
      selectedDates: [new Date('2024-12-25')],
      isHourlyBased: false,
    }),
    leaveBalance: createMockUserLeaveBalance({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
      remainingDays: 15,
    }),
  },
  
  // 時間単位の有給申請
  hourlyPaidLeave: {
    formData: createMockAttendanceFormData({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
      selectedDates: [new Date('2024-12-25')],
      isHourlyBased: true,
      startTime: '13:00',
      endTime: '17:00',
    }),
    leaveBalance: createMockUserLeaveBalance({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
      remainingDays: 15,
    }),
  },
  
  // 理由必須の慶弔休暇
  condolenceLeave: {
    formData: createMockAttendanceFormData({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.CONDOLENCE,
      selectedDates: [new Date('2024-12-25'), new Date('2024-12-26')],
      isHourlyBased: false,
      reason: '家族の結婚式のため',
    }),
    leaveBalance: createMockUserLeaveBalance({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.CONDOLENCE,
      leaveTypeName: '慶弔休暇',
      remainingDays: 5,
    }),
  },
  
  // 残日数不足のケース
  insufficientBalance: {
    formData: createMockAttendanceFormData({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.SUMMER,
      selectedDates: [
        new Date('2024-08-15'),
        new Date('2024-08-16'),
        new Date('2024-08-17'),
        new Date('2024-08-18'),
      ],
    }),
    leaveBalance: createMockUserLeaveBalance({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.SUMMER,
      leaveTypeName: '夏季休暇',
      remainingDays: 2, // 4日申請だが残り2日しかない
    }),
  },
  
  // 性別制限がある生理休暇（女性向け）
  menstrualLeave: {
    formData: createMockAttendanceFormData({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.MENSTRUAL,
      selectedDates: [new Date('2024-12-25')],
      isHourlyBased: false,
    }),
    leaveBalance: createMockUserLeaveBalance({
      leaveTypeId: MOCK_IDS.LEAVE_TYPES.MENSTRUAL,
      leaveTypeName: '生理休暇',
      remainingDays: 10,
    }),
  },
};

// =====================
// エラーケース用モックデータ
// =====================
export const mockErrorCases = {
  // 残日数0のケース
  zeroBalance: createMockUserLeaveBalance({
    totalDays: 20,
    usedDays: 20,
    remainingDays: 0,
  }),
  
  // 期限切れの休暇
  expiredLeave: createMockUserLeaveBalance({
    expireDate: '2023-03-31', // 過去の日付
    remainingDays: 5,
  }),
  
  // 無効な休暇種別
  invalidLeaveType: createMockLeaveType({
    id: 'invalid-leave-type-id',
    isActive: false,
  }),
};

// =====================
// デフォルトエクスポート
// =====================
export const mockLeaveData = {
  leaveTypes: mockLeaveTypes,
  userLeaveBalances: mockUserLeaveBalances,
  leaveRequests: mockLeaveRequests,
  holidays: mockHolidays,
  scenarios: mockDataScenarios,
  errorCases: mockErrorCases,
  ids: MOCK_IDS,
  
  // ファクトリー関数
  createLeaveType: createMockLeaveType,
  createUserLeaveBalance: createMockUserLeaveBalance,
  createLeaveRequest: createMockLeaveRequest,
  createLeaveRequestDetail: createMockLeaveRequestDetail,
  createHoliday: createMockHoliday,
  createAttendanceFormData: createMockAttendanceFormData,
  createLeaveRequestRequest: createMockLeaveRequestRequest,
};

export default mockLeaveData;