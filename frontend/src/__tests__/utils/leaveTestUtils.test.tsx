/**
 * 休暇申請テストユーティリティ関数のテスト
 */

import React from 'react';
import { screen } from '@testing-library/react';
import {
  renderWithLeaveProviders,
  createMockApiResponse,
  leaveAssertions,
  createTestData,
  dateTestUtils,
  setupMocks,
} from './leaveTestUtils';
import mockLeaveData, { MOCK_IDS } from '../mocks/leaveData';

// シンプルなテスト用コンポーネント
const TestComponent = () => (
  <div>
    <div data-testid="leave-type-select">Leave Type Select</div>
    <div data-testid="date-picker">Date Picker</div>
    <div data-testid="submit-button">Submit</div>
    <div data-testid="hourly-based-checkbox">Hourly Based</div>
    <div data-testid="start-time-input">Start Time</div>
    <div data-testid="end-time-input">End Time</div>
    <div data-testid="reason-textarea">Reason</div>
    <div data-testid="reset-button">Reset</div>
  </div>
);

describe('休暇申請テストユーティリティ関数', () => {
  describe('renderWithLeaveProviders', () => {
    it('コンポーネントが正しくレンダリングされる', () => {
      renderWithLeaveProviders(<TestComponent />);
      
      expect(screen.getByTestId('leave-type-select')).toBeInTheDocument();
      expect(screen.getByTestId('date-picker')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });
  });

  describe('createMockApiResponse', () => {
    it('休暇種別一覧のモックレスポンスが正しく生成される', () => {
      const response = createMockApiResponse.leaveTypes();
      
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      const firstLeaveType = response.data[0];
      expect(firstLeaveType).toHaveProperty('id');
      expect(firstLeaveType).toHaveProperty('code');
      expect(firstLeaveType).toHaveProperty('name');
    });

    it('ユーザー休暇残日数のモックレスポンスが正しく生成される', () => {
      const response = createMockApiResponse.userLeaveBalances();
      
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      const firstBalance = response.data[0];
      expect(firstBalance).toHaveProperty('id');
      expect(firstBalance).toHaveProperty('leaveTypeId');
      expect(firstBalance).toHaveProperty('remainingDays');
    });

    it('休暇申請一覧のモックレスポンスが正しく生成される', () => {
      const response = createMockApiResponse.leaveRequests();
      
      expect(response.items).toBeDefined();
      expect(response.total).toBeDefined();
      expect(Array.isArray(response.items)).toBe(true);
      expect(response.total).toBe(response.items.length);
    });

    it('成功レスポンスが正しく生成される', () => {
      const response = createMockApiResponse.createLeaveRequestSuccess();
      
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(MOCK_IDS.LEAVE_REQUESTS.PENDING_001);
      expect(response.data.message).toBe('休暇申請が正常に提出されました');
    });

    it('エラーレスポンスが正しく生成される', () => {
      const response = createMockApiResponse.createLeaveRequestError();
      
      expect(response.error).toBe('休暇申請の提出に失敗しました');
    });

    it('カスタムエラーメッセージが設定される', () => {
      const customMessage = 'カスタムエラーメッセージ';
      const response = createMockApiResponse.createLeaveRequestError(customMessage);
      
      expect(response.error).toBe(customMessage);
    });
  });

  describe('leaveAssertions', () => {
    beforeEach(() => {
      renderWithLeaveProviders(<TestComponent />);
    });

    it('休暇申請フォームの表示確認が動作する', async () => {
      await expect(leaveAssertions.expectLeaveFormToBeDisplayed()).resolves.not.toThrow();
    });
  });

  describe('createTestData', () => {
    it('基本的なフォームデータが正しく生成される', () => {
      const formData = createTestData.attendanceFormData();
      
      expect(formData.leaveTypeId).toBe(MOCK_IDS.LEAVE_TYPES.PAID);
      expect(formData.selectedDates).toHaveLength(1);
      expect(formData.isHourlyBased).toBe(false);
      expect(formData.startTime).toBe('09:00');
      expect(formData.endTime).toBe('18:00');
      expect(formData.reason).toBe('');
    });

    it('オーバーライドが正しく適用される', () => {
      const overrides = {
        leaveTypeId: MOCK_IDS.LEAVE_TYPES.SUMMER,
        isHourlyBased: true,
        reason: 'テスト理由',
      };
      
      const formData = createTestData.attendanceFormData(overrides);
      
      expect(formData.leaveTypeId).toBe(MOCK_IDS.LEAVE_TYPES.SUMMER);
      expect(formData.isHourlyBased).toBe(true);
      expect(formData.reason).toBe('テスト理由');
    });

    it('複数日の申請データが正しく生成される', () => {
      const startDate = new Date('2024-12-25');
      const days = 3;
      
      const formData = createTestData.multiDayRequest(startDate, days);
      
      expect(formData.selectedDates).toHaveLength(days);
      expect(formData.selectedDates[0]).toEqual(startDate);
      
      // 連続した日付が設定されているか確認
      const expectedSecondDate = new Date('2024-12-26');
      expect(formData.selectedDates[1]).toEqual(expectedSecondDate);
    });

    it('時間単位申請データが正しく生成される', () => {
      const startTime = '10:00';
      const endTime = '15:00';
      
      const formData = createTestData.hourlyRequest(startTime, endTime);
      
      expect(formData.isHourlyBased).toBe(true);
      expect(formData.startTime).toBe(startTime);
      expect(formData.endTime).toBe(endTime);
    });

    it('理由必須の申請データが正しく生成される', () => {
      const leaveTypeId = MOCK_IDS.LEAVE_TYPES.CONDOLENCE;
      const reason = 'テスト理由';
      
      const formData = createTestData.reasonRequiredRequest(leaveTypeId, reason);
      
      expect(formData.leaveTypeId).toBe(leaveTypeId);
      expect(formData.reason).toBe(reason);
    });
  });

  describe('dateTestUtils', () => {
    it('今日の日付が正しく取得される', () => {
      const today = dateTestUtils.today();
      const actualToday = new Date();
      
      expect(today.toDateString()).toBe(actualToday.toDateString());
    });

    it('明日の日付が正しく取得される', () => {
      const tomorrow = dateTestUtils.tomorrow();
      const expectedTomorrow = new Date();
      expectedTomorrow.setDate(expectedTomorrow.getDate() + 1);
      
      expect(tomorrow.toDateString()).toBe(expectedTomorrow.toDateString());
    });

    it('来週の日付が正しく取得される', () => {
      const nextWeek = dateTestUtils.nextWeek();
      const expectedNextWeek = new Date();
      expectedNextWeek.setDate(expectedNextWeek.getDate() + 7);
      
      expect(nextWeek.toDateString()).toBe(expectedNextWeek.toDateString());
    });

    it('過去の日付が正しく取得される', () => {
      const pastDate = dateTestUtils.pastDate(3);
      const expectedPastDate = new Date();
      expectedPastDate.setDate(expectedPastDate.getDate() - 3);
      
      expect(pastDate.toDateString()).toBe(expectedPastDate.toDateString());
    });

    it('日付配列が正しく生成される', () => {
      const startDate = new Date('2024-12-25');
      const days = 5;
      
      const dateRange = dateTestUtils.createDateRange(startDate, days);
      
      expect(dateRange).toHaveLength(days);
      expect(dateRange[0]).toEqual(startDate);
      
      const expectedLastDate = new Date('2024-12-29');
      expect(dateRange[days - 1]).toEqual(expectedLastDate);
    });

    it('平日のみの日付配列が正しく生成される', () => {
      // 2024-12-23は月曜日から開始
      const startDate = new Date('2024-12-23');
      const days = 5;
      
      const weekdayRange = dateTestUtils.createWeekdayRange(startDate, days);
      
      expect(weekdayRange).toHaveLength(days);
      
      // 全て平日（月-金）であることを確認
      weekdayRange.forEach(date => {
        const dayOfWeek = date.getDay();
        expect(dayOfWeek).not.toBe(0); // 日曜日ではない
        expect(dayOfWeek).not.toBe(6); // 土曜日ではない
      });
    });

    it('日付が正しい形式で文字列に変換される', () => {
      const date = new Date('2024-12-25');
      const formatted = dateTestUtils.formatDate(date);
      
      expect(formatted).toBe('2024-12-25');
    });
  });

  describe('setupMocks', () => {
    // axiosモックのテストは実際のaxiosモックが必要
    it('API成功モックが設定される', () => {
      expect(() => setupMocks.apiSuccess()).not.toThrow();
    });

    it('APIエラーモックが設定される', () => {
      expect(() => setupMocks.apiError()).not.toThrow();
    });

    it('カスタムAPIレスポンスモックが設定される', () => {
      const response = { data: 'test' };
      expect(() => setupMocks.customApiResponse('GET', response)).not.toThrow();
    });
  });

  describe('モックデータとの統合', () => {
    it('モックデータのIDが正しく参照される', () => {
      const formData = createTestData.attendanceFormData({
        leaveTypeId: MOCK_IDS.LEAVE_TYPES.SUMMER,
      });
      
      expect(formData.leaveTypeId).toBe(MOCK_IDS.LEAVE_TYPES.SUMMER);
    });

    it('シナリオデータが正しく利用される', () => {
      const scenario = mockLeaveData.scenarios.normalPaidLeave;
      
      expect(scenario.formData).toBeDefined();
      expect(scenario.leaveBalance).toBeDefined();
      expect(scenario.formData.leaveTypeId).toBe(MOCK_IDS.LEAVE_TYPES.PAID);
    });

    it('エラーケースデータが正しく利用される', () => {
      const errorCase = mockLeaveData.errorCases.zeroBalance;
      
      expect(errorCase.remainingDays).toBe(0);
      expect(errorCase.totalDays).toBe(20);
      expect(errorCase.usedDays).toBe(20);
    });
  });

  describe('型安全性の確認', () => {
    it('TypeScriptの型が正しく定義されている', () => {
      // コンパイル時にチェックされるため、エラーなくコンパイルできれば成功
      const formData = createTestData.attendanceFormData();
      const response = createMockApiResponse.leaveTypes();
      
      // 型が正しく推論されることを確認
      expect(typeof formData.leaveTypeId).toBe('string');
      expect(Array.isArray(formData.selectedDates)).toBe(true);
      expect(typeof formData.isHourlyBased).toBe('boolean');
      expect(Array.isArray(response.data)).toBe(true);
    });
  });
});