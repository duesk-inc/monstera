/**
 * 休暇申請モックデータのテスト
 */

import mockLeaveData, {
  MOCK_IDS,
  mockLeaveTypes,
  mockUserLeaveBalances,
  mockLeaveRequests,
  mockHolidays,
  mockDataScenarios,
  mockErrorCases,
  createMockLeaveType,
  createMockUserLeaveBalance,
  createMockLeaveRequest,
  createMockAttendanceFormData,
} from './leaveData';
import { LEAVE_TYPE_CODES, LEAVE_REQUEST_STATUS } from '../../constants/leave';

describe('休暇申請モックデータ', () => {
  describe('基本モックデータ', () => {
    it('休暇種別のモックデータが正しく定義されている', () => {
      expect(mockLeaveTypes).toHaveLength(6);
      
      // 有給休暇の確認
      const paidLeave = mockLeaveTypes.find(type => type.code === LEAVE_TYPE_CODES.PAID);
      expect(paidLeave).toBeDefined();
      expect(paidLeave?.name).toBe('有給休暇');
      expect(paidLeave?.isHourlyAvailable).toBe(true);
      expect(paidLeave?.reasonRequired).toBe(false);
      
      // 慶弔休暇の確認（理由必須）
      const condolenceLeave = mockLeaveTypes.find(type => type.code === LEAVE_TYPE_CODES.CONDOLENCE);
      expect(condolenceLeave).toBeDefined();
      expect(condolenceLeave?.reasonRequired).toBe(true);
      
      // 生理休暇の確認（性別制限）
      const menstrualLeave = mockLeaveTypes.find(type => type.code === LEAVE_TYPE_CODES.MENSTRUAL);
      expect(menstrualLeave).toBeDefined();
      expect(menstrualLeave?.genderSpecific).toBe('female');
    });

    it('ユーザー休暇残日数のモックデータが正しく定義されている', () => {
      expect(mockUserLeaveBalances).toHaveLength(5);
      
      // 有給休暇残日数の確認
      const paidBalance = mockUserLeaveBalances.find(
        balance => balance.leaveTypeId === MOCK_IDS.LEAVE_TYPES.PAID
      );
      expect(paidBalance).toBeDefined();
      expect(paidBalance?.totalDays).toBe(20);
      expect(paidBalance?.usedDays).toBe(5);
      expect(paidBalance?.remainingDays).toBe(15);
      expect(paidBalance?.fiscalYear).toBe(2024);
    });

    it('休暇申請のモックデータが正しく定義されている', () => {
      expect(mockLeaveRequests).toHaveLength(4);
      
      // 申請中の申請確認
      const pendingRequest = mockLeaveRequests.find(
        request => request.status === LEAVE_REQUEST_STATUS.PENDING
      );
      expect(pendingRequest).toBeDefined();
      expect(pendingRequest?.details).toHaveLength(1);
      
      // 承認済みの申請確認
      const approvedRequest = mockLeaveRequests.find(
        request => request.status === LEAVE_REQUEST_STATUS.APPROVED && !request.isHourlyBased
      );
      expect(approvedRequest).toBeDefined();
      expect(approvedRequest?.approverId).toBeDefined();
      expect(approvedRequest?.processedAt).toBeDefined();
      
      // 時間単位の申請確認
      const hourlyRequest = mockLeaveRequests.find(
        request => request.isHourlyBased === true
      );
      expect(hourlyRequest).toBeDefined();
      expect(hourlyRequest?.details[0].startTime).toBeDefined();
      expect(hourlyRequest?.details[0].endTime).toBeDefined();
      expect(hourlyRequest?.totalDays).toBe(0.5);
    });

    it('休日情報のモックデータが正しく定義されている', () => {
      expect(mockHolidays.length).toBeGreaterThan(0);
      
      // 元日の確認
      const newYear = mockHolidays.find(holiday => holiday.date === '2024-01-01');
      expect(newYear).toBeDefined();
      expect(newYear?.name).toBe('元日');
      expect(newYear?.type).toBe('national');
      
      // 会社独自の休日確認
      const companyHoliday = mockHolidays.find(holiday => holiday.type === 'company');
      expect(companyHoliday).toBeDefined();
    });
  });

  describe('ファクトリー関数', () => {
    it('createMockLeaveType が正しく動作する', () => {
      const customLeaveType = createMockLeaveType({
        name: 'カスタム休暇',
        code: 'custom',
        reasonRequired: true,
      });
      
      expect(customLeaveType.name).toBe('カスタム休暇');
      expect(customLeaveType.code).toBe('custom');
      expect(customLeaveType.reasonRequired).toBe(true);
      // デフォルト値の確認
      expect(customLeaveType.isActive).toBe(true);
      expect(customLeaveType.defaultDays).toBe(20);
    });

    it('createMockUserLeaveBalance が正しく動作する', () => {
      const customBalance = createMockUserLeaveBalance({
        leaveTypeName: 'カスタム休暇',
        totalDays: 10,
        usedDays: 3,
        remainingDays: 7,
      });
      
      expect(customBalance.leaveTypeName).toBe('カスタム休暇');
      expect(customBalance.totalDays).toBe(10);
      expect(customBalance.usedDays).toBe(3);
      expect(customBalance.remainingDays).toBe(7);
      // デフォルト値の確認
      expect(customBalance.fiscalYear).toBe(2024);
    });

    it('createMockLeaveRequest が正しく動作する', () => {
      const customRequest = createMockLeaveRequest({
        status: LEAVE_REQUEST_STATUS.APPROVED,
        totalDays: 2.0,
        isHourlyBased: true,
      });
      
      expect(customRequest.status).toBe(LEAVE_REQUEST_STATUS.APPROVED);
      expect(customRequest.totalDays).toBe(2.0);
      expect(customRequest.isHourlyBased).toBe(true);
      // デフォルト値の確認
      expect(customRequest.userId).toBe(MOCK_IDS.USERS.TEST_USER);
    });

    it('createMockAttendanceFormData が正しく動作する', () => {
      const testDate = new Date('2024-12-25');
      const customFormData = createMockAttendanceFormData({
        selectedDates: [testDate],
        isHourlyBased: true,
        startTime: '10:00',
        endTime: '15:00',
        reason: 'テスト理由',
      });
      
      expect(customFormData.selectedDates).toEqual([testDate]);
      expect(customFormData.isHourlyBased).toBe(true);
      expect(customFormData.startTime).toBe('10:00');
      expect(customFormData.endTime).toBe('15:00');
      expect(customFormData.reason).toBe('テスト理由');
      // デフォルト値の確認
      expect(customFormData.leaveTypeId).toBe(MOCK_IDS.LEAVE_TYPES.PAID);
    });
  });

  describe('シナリオ別モックデータ', () => {
    it('通常の有給申請シナリオが正しく定義されている', () => {
      const { formData, leaveBalance } = mockDataScenarios.normalPaidLeave;
      
      expect(formData.leaveTypeId).toBe(MOCK_IDS.LEAVE_TYPES.PAID);
      expect(formData.isHourlyBased).toBe(false);
      expect(formData.selectedDates).toHaveLength(1);
      expect(leaveBalance.remainingDays).toBe(15);
    });

    it('時間単位の有給申請シナリオが正しく定義されている', () => {
      const { formData, leaveBalance } = mockDataScenarios.hourlyPaidLeave;
      
      expect(formData.isHourlyBased).toBe(true);
      expect(formData.startTime).toBe('13:00');
      expect(formData.endTime).toBe('17:00');
      expect(leaveBalance.leaveTypeId).toBe(MOCK_IDS.LEAVE_TYPES.PAID);
    });

    it('理由必須の慶弔休暇シナリオが正しく定義されている', () => {
      const { formData, leaveBalance } = mockDataScenarios.condolenceLeave;
      
      expect(formData.leaveTypeId).toBe(MOCK_IDS.LEAVE_TYPES.CONDOLENCE);
      expect(formData.reason).toBe('家族の結婚式のため');
      expect(formData.selectedDates).toHaveLength(2);
      expect(leaveBalance.leaveTypeName).toBe('慶弔休暇');
    });

    it('残日数不足シナリオが正しく定義されている', () => {
      const { formData, leaveBalance } = mockDataScenarios.insufficientBalance;
      
      expect(formData.selectedDates).toHaveLength(4); // 4日申請
      expect(leaveBalance.remainingDays).toBe(2); // 残り2日
      expect(leaveBalance.leaveTypeName).toBe('夏季休暇');
    });
  });

  describe('エラーケース用モックデータ', () => {
    it('残日数0のケースが正しく定義されている', () => {
      const { zeroBalance } = mockErrorCases;
      
      expect(zeroBalance.totalDays).toBe(20);
      expect(zeroBalance.usedDays).toBe(20);
      expect(zeroBalance.remainingDays).toBe(0);
    });

    it('期限切れの休暇ケースが正しく定義されている', () => {
      const { expiredLeave } = mockErrorCases;
      
      expect(expiredLeave.expireDate).toBe('2023-03-31');
      expect(new Date(expiredLeave.expireDate)).toBeInstanceOf(Date);
      expect(new Date(expiredLeave.expireDate) < new Date()).toBe(true);
    });

    it('無効な休暇種別ケースが正しく定義されている', () => {
      const { invalidLeaveType } = mockErrorCases;
      
      expect(invalidLeaveType.isActive).toBe(false);
    });
  });

  describe('統合テスト用のモックデータ', () => {
    it('デフォルトエクスポートが正しく構成されている', () => {
      expect(mockLeaveData.leaveTypes).toBe(mockLeaveTypes);
      expect(mockLeaveData.userLeaveBalances).toBe(mockUserLeaveBalances);
      expect(mockLeaveData.leaveRequests).toBe(mockLeaveRequests);
      expect(mockLeaveData.holidays).toBe(mockHolidays);
      expect(mockLeaveData.scenarios).toBe(mockDataScenarios);
      expect(mockLeaveData.errorCases).toBe(mockErrorCases);
      expect(mockLeaveData.ids).toBe(MOCK_IDS);
      
      // ファクトリー関数の確認
      expect(typeof mockLeaveData.createLeaveType).toBe('function');
      expect(typeof mockLeaveData.createUserLeaveBalance).toBe('function');
      expect(typeof mockLeaveData.createLeaveRequest).toBe('function');
    });

    it('固定UUIDが一意であることを確認', () => {
      const allIds = Object.values(MOCK_IDS.USERS)
        .concat(Object.values(MOCK_IDS.LEAVE_TYPES))
        .concat(Object.values(MOCK_IDS.LEAVE_REQUESTS))
        .concat(Object.values(MOCK_IDS.LEAVE_BALANCES));
      
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });
});