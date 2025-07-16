/**
 * 休暇申請機能専用のテストユーティリティ関数
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CssBaseline from '@mui/material/CssBaseline';
import { ja } from 'date-fns/locale';
import { theme } from '@/__mocks__/theme';
import mockLeaveData, { MOCK_IDS } from '../mocks/leaveData';
import {
  LeaveType,
  UserLeaveBalance,
  LeaveRequestResponse,
  AttendanceFormData,
  Holiday,
} from '../../types/leave';

// =====================
// テスト用プロバイダー
// =====================

interface LeaveTestProvidersProps {
  children: React.ReactNode;
}

const LeaveTestProviders = ({ children }: LeaveTestProvidersProps) => {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // テスト中のエラーログを抑制
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
          <CssBaseline />
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// =====================
// カスタムレンダー関数
// =====================

export const renderWithLeaveProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: LeaveTestProviders, ...options });

// =====================
// フォーム操作ユーティリティ
// =====================

export const leaveFormHelpers = {
  /**
   * 休暇種別を選択する
   */
  async selectLeaveType(leaveTypeId: string) {
    const user = userEvent.setup();
    const select = screen.getByTestId('leave-type-select');
    await user.click(select);
    
    const option = screen.getByTestId(`leave-type-option-${leaveTypeId}`);
    await user.click(option);
  },

  /**
   * 日付を選択する
   */
  async selectDate(dateInput: HTMLElement, date: Date) {
    const user = userEvent.setup();
    await user.click(dateInput);
    
    // DatePickerのモック実装に応じて調整が必要
    fireEvent.change(dateInput, { 
      target: { value: date.toISOString().split('T')[0] } 
    });
  },

  /**
   * 複数日付を選択する
   */
  async selectMultipleDates(dates: Date[]) {
    const user = userEvent.setup();
    
    for (const date of dates) {
      const dateButton = screen.getByText(date.getDate().toString());
      await user.click(dateButton);
    }
  },

  /**
   * 時間単位休暇のチェックボックスを操作する
   */
  async toggleHourlyBased(enabled: boolean = true) {
    const user = userEvent.setup();
    const checkbox = screen.getByTestId('hourly-based-checkbox');
    
    if (enabled) {
      await user.check(checkbox);
    } else {
      await user.uncheck(checkbox);
    }
  },

  /**
   * 開始時間を設定する
   */
  async setStartTime(time: string) {
    const user = userEvent.setup();
    const input = screen.getByTestId('start-time-input');
    await user.clear(input);
    await user.type(input, time);
  },

  /**
   * 終了時間を設定する
   */
  async setEndTime(time: string) {
    const user = userEvent.setup();
    const input = screen.getByTestId('end-time-input');
    await user.clear(input);
    await user.type(input, time);
  },

  /**
   * 理由を入力する
   */
  async enterReason(reason: string) {
    const user = userEvent.setup();
    const textarea = screen.getByTestId('reason-textarea');
    await user.clear(textarea);
    await user.type(textarea, reason);
  },

  /**
   * フォームを送信する
   */
  async submitForm() {
    const user = userEvent.setup();
    const submitButton = screen.getByTestId('submit-button');
    await user.click(submitButton);
  },

  /**
   * フォームをリセットする
   */
  async resetForm() {
    const user = userEvent.setup();
    const resetButton = screen.getByTestId('reset-button');
    await user.click(resetButton);
  },
};

// =====================
// APIモック関数
// =====================

export const createMockApiResponse = {
  /**
   * 休暇種別一覧取得のモックレスポンス
   */
  leaveTypes: (leaveTypes?: LeaveType[]) => ({
    data: leaveTypes || mockLeaveData.leaveTypes,
  }),

  /**
   * ユーザー休暇残日数取得のモックレスポンス
   */
  userLeaveBalances: (balances?: UserLeaveBalance[]) => ({
    data: balances || mockLeaveData.userLeaveBalances,
  }),

  /**
   * 休暇申請一覧取得のモックレスポンス
   */
  leaveRequests: (requests?: LeaveRequestResponse[]) => ({
    items: requests || mockLeaveData.leaveRequests,
    total: (requests || mockLeaveData.leaveRequests).length,
  }),

  /**
   * 休日情報取得のモックレスポンス
   */
  holidays: (holidays?: Holiday[]) => ({
    data: holidays || mockLeaveData.holidays,
  }),

  /**
   * 休暇申請作成成功のモックレスポンス
   */
  createLeaveRequestSuccess: (requestId?: string) => ({
    data: {
      id: requestId || MOCK_IDS.LEAVE_REQUESTS.PENDING_001,
      message: '休暇申請が正常に提出されました',
    },
  }),

  /**
   * 休暇申請作成失敗のモックレスポンス
   */
  createLeaveRequestError: (errorMessage?: string) => ({
    error: errorMessage || '休暇申請の提出に失敗しました',
  }),
};

// =====================
// アサーション関数
// =====================

export const leaveAssertions = {
  /**
   * 休暇申請フォームが正しく表示されていることを確認
   */
  async expectLeaveFormToBeDisplayed() {
    expect(screen.getByTestId('leave-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  },

  /**
   * 時間単位休暇の入力フィールドが表示されていることを確認
   */
  async expectHourlyFieldsToBeVisible() {
    await waitFor(() => {
      expect(screen.getByTestId('start-time-input')).toBeVisible();
      expect(screen.getByTestId('end-time-input')).toBeVisible();
    });
  },

  /**
   * 理由入力フィールドが表示されていることを確認
   */
  async expectReasonFieldToBeVisible() {
    await waitFor(() => {
      expect(screen.getByTestId('reason-textarea')).toBeVisible();
    });
  },

  /**
   * 成功メッセージが表示されていることを確認
   */
  async expectSuccessMessage(message?: string) {
    const defaultMessage = '休暇申請が正常に提出されました';
    await waitFor(() => {
      expect(screen.getByText(message || defaultMessage)).toBeInTheDocument();
    });
  },

  /**
   * エラーメッセージが表示されていることを確認
   */
  async expectErrorMessage(message?: string) {
    const defaultMessage = '休暇申請の提出に失敗しました';
    await waitFor(() => {
      expect(screen.getByText(message || defaultMessage)).toBeInTheDocument();
    });
  },

  /**
   * バリデーションエラーが表示されていることを確認
   */
  async expectValidationError(fieldName: string, errorMessage: string) {
    await waitFor(() => {
      const errorElement = screen.getByTestId(`${fieldName}-error`);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(errorMessage);
    });
  },

  /**
   * 休暇申請一覧が正しく表示されていることを確認
   */
  async expectLeaveRequestsToBeDisplayed(expectedCount?: number) {
    await waitFor(() => {
      const requests = screen.getAllByTestId(/leave-request-row-/);
      if (expectedCount !== undefined) {
        expect(requests).toHaveLength(expectedCount);
      } else {
        expect(requests.length).toBeGreaterThan(0);
      }
    });
  },

  /**
   * 特定のステータスの申請が表示されていることを確認
   */
  async expectRequestWithStatus(status: string) {
    await waitFor(() => {
      const statusElement = screen.getByTestId(`status-${status}`);
      expect(statusElement).toBeInTheDocument();
    });
  },
};

// =====================
// テストデータ生成関数
// =====================

export const createTestData = {
  /**
   * テスト用のフォームデータを生成
   */
  attendanceFormData: (overrides?: Partial<AttendanceFormData>): AttendanceFormData => ({
    leaveTypeId: MOCK_IDS.LEAVE_TYPES.PAID,
    selectedDates: [new Date('2024-12-25')],
    isHourlyBased: false,
    startTime: '09:00',
    endTime: '18:00',
    reason: '',
    ...overrides,
  }),

  /**
   * 複数日の申請データを生成
   */
  multiDayRequest: (startDate: Date, days: number): AttendanceFormData => {
    const dates = Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date;
    });

    return createTestData.attendanceFormData({
      selectedDates: dates,
    });
  },

  /**
   * 時間単位申請データを生成
   */
  hourlyRequest: (startTime: string, endTime: string): AttendanceFormData => 
    createTestData.attendanceFormData({
      isHourlyBased: true,
      startTime,
      endTime,
      selectedDates: [new Date('2024-12-25')],
    }),

  /**
   * 理由必須の申請データを生成
   */
  reasonRequiredRequest: (leaveTypeId: string, reason: string): AttendanceFormData =>
    createTestData.attendanceFormData({
      leaveTypeId,
      reason,
    }),
};

// =====================
// 日付ユーティリティ
// =====================

export const dateTestUtils = {
  /**
   * 今日の日付を取得
   */
  today: () => new Date(),

  /**
   * 明日の日付を取得
   */
  tomorrow: () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  },

  /**
   * 来週の日付を取得
   */
  nextWeek: () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  },

  /**
   * 過去の日付を取得
   */
  pastDate: (daysAgo: number = 1) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  },

  /**
   * 日付配列を生成
   */
  createDateRange: (startDate: Date, days: number): Date[] => {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date;
    });
  },

  /**
   * 週末を除外した平日のみの日付配列を生成
   */
  createWeekdayRange: (startDate: Date, days: number): Date[] => {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    let addedDays = 0;

    while (addedDays < days) {
      const dayOfWeek = currentDate.getDay();
      // 0 = 日曜日, 6 = 土曜日を除外
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(new Date(currentDate));
        addedDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  },

  /**
   * 日付を YYYY-MM-DD 形式の文字列に変換
   */
  formatDate: (date: Date): string => {
    return date.toISOString().split('T')[0];
  },
};

// =====================
// バリデーションテストヘルパー
// =====================

export const validationTestHelpers = {
  /**
   * 残日数不足のテストケースを実行
   */
  async testInsufficientBalance() {
    const { formData, leaveBalance } = mockLeaveData.scenarios.insufficientBalance;
    
    // フォームに入力
    await leaveFormHelpers.selectLeaveType(formData.leaveTypeId);
    for (const date of formData.selectedDates) {
      // 日付選択の実装に応じて調整
      await leaveFormHelpers.selectDate(screen.getByTestId('date-picker'), date);
    }
    
    await leaveFormHelpers.submitForm();
    
    // エラーメッセージの確認
    await leaveAssertions.expectValidationError(
      'selectedDates',
      `申請日数が残日数を超えています。残り${leaveBalance.remainingDays}日です。`
    );
  },

  /**
   * 理由必須フィールドのテストケースを実行
   */
  async testReasonRequiredValidation(leaveTypeId: string) {
    await leaveFormHelpers.selectLeaveType(leaveTypeId);
    await leaveFormHelpers.submitForm();
    
    await leaveAssertions.expectValidationError(
      'reason',
      'この休暇種別では理由の入力が必須です'
    );
  },

  /**
   * 時間単位休暇のバリデーションテスト
   */
  async testHourlyValidation() {
    await leaveFormHelpers.toggleHourlyBased(true);
    await leaveFormHelpers.setStartTime('10:00');
    await leaveFormHelpers.setEndTime('09:00'); // 終了時間が開始時間より早い
    await leaveFormHelpers.submitForm();
    
    await leaveAssertions.expectValidationError(
      'endTime',
      '終了時間は開始時間より後に設定してください'
    );
  },
};

// =====================
// モック関数設定ヘルパー
// =====================

// Note: These utilities assume axios is already mocked in your test setup
// e.g., jest.mock('axios') or vi.mock('axios')
export const setupMocks = {
  /**
   * API成功時のモックを設定
   */
  apiSuccess: async () => {
    // Jest環境でのaxiosモックの設定
    const { default: mockAxios } = await import('axios');
    (mockAxios.get as jest.Mock).mockResolvedValue(createMockApiResponse.leaveTypes());
    (mockAxios.post as jest.Mock).mockResolvedValue(createMockApiResponse.createLeaveRequestSuccess());
  },

  /**
   * API失敗時のモックを設定
   */
  apiError: async (errorMessage?: string) => {
    const { default: mockAxios } = await import('axios');
    (mockAxios.get as jest.Mock).mockRejectedValue(new Error(errorMessage || 'API Error'));
    (mockAxios.post as jest.Mock).mockRejectedValue(new Error(errorMessage || 'API Error'));
  },

  /**
   * 特定のレスポンスを返すモックを設定
   */
  customApiResponse: async (endpoint: string, response: any) => {
    const { default: mockAxios } = await import('axios');
    if (endpoint.includes('GET')) {
      (mockAxios.get as jest.Mock).mockResolvedValue(response);
    } else if (endpoint.includes('POST')) {
      (mockAxios.post as jest.Mock).mockResolvedValue(response);
    }
  },
};

// =====================
// 統合テスト用ヘルパー
// =====================

export const integrationTestHelpers = {
  /**
   * 完全な休暇申請フローをテスト
   */
  async completeLeaveRequestFlow(formData: AttendanceFormData) {
    // フォーム入力
    await leaveFormHelpers.selectLeaveType(formData.leaveTypeId);
    
    for (const date of formData.selectedDates) {
      await leaveFormHelpers.selectDate(screen.getByTestId('date-picker'), date);
    }
    
    if (formData.isHourlyBased) {
      await leaveFormHelpers.toggleHourlyBased(true);
      await leaveFormHelpers.setStartTime(formData.startTime);
      await leaveFormHelpers.setEndTime(formData.endTime);
    }
    
    if (formData.reason) {
      await leaveFormHelpers.enterReason(formData.reason);
    }
    
    // 送信
    await leaveFormHelpers.submitForm();
    
    // 成功確認
    await leaveAssertions.expectSuccessMessage();
  },

  /**
   * エラーケースのフローをテスト
   */
  async errorFlowTest(formData: AttendanceFormData, expectedError: string) {
    await this.completeLeaveRequestFlow(formData);
    await leaveAssertions.expectErrorMessage(expectedError);
  },
};

// Re-export common testing utilities
export * from '@testing-library/react';
export { userEvent };
export { renderWithLeaveProviders as render };