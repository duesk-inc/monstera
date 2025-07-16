// 週報機能テスト用のヘルパー関数とユーティリティ

import React from 'react';
import { render, RenderOptions, RenderResult, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import axios from 'axios';
import { theme } from '@/theme';
import { ToastProvider } from '@/components/common/Toast/ToastProvider';
import { 
  WeeklyReport, 
  DailyRecord, 
  BulkSettings 
} from '@/types/weeklyReport';
import { 
  MockDataScenario, 
  TestValidationResult, 
  TestDateRange,
  TestWorkHourCalculation,
  MockApiResponse,
  TestRenderResult,
  TEST_CONSTANTS
} from '../types';
import { 
  createMockWeeklyReport, 
  createMockApiWeeklyReport,
  createMockDailyRecord,
  getWeekStart,
  getWeekEnd 
} from './mockDataGenerators';

// モック化されたaxiosインスタンス
const mockedAxios = axios as jest.Mocked<typeof axios>;

// テスト用のQueryClient設定
export const createTestQueryClient = () => {
  return new QueryClient({
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
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
};

// カスタムレンダラー
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

export const customRender = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
): TestRenderResult => {
  const queryClient = options?.queryClient || createTestQueryClient();
  const user = userEvent.setup();

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  const renderResult = render(ui, { 
    wrapper: AllTheProviders, 
    ...options 
  }) as RenderResult;

  // APIモック管理用のヘルパー
  const mockApi = {
    expectGet: (url: string) => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(url),
        expect.any(Object)
      );
    },
    expectPost: (url: string, data?: any) => {
      if (data) {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining(url),
          expect.objectContaining(data),
          expect.any(Object)
        );
      } else {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining(url),
          expect.any(Object),
          expect.any(Object)
        );
      }
    },
    expectPut: (url: string, data?: any) => {
      if (data) {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.stringContaining(url),
          expect.objectContaining(data),
          expect.any(Object)
        );
      } else {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.stringContaining(url),
          expect.any(Object),
          expect.any(Object)
        );
      }
    },
    reset: () => {
      jest.clearAllMocks();
    },
  };

  return {
    ...renderResult,
    user,
    queryClient,
    mockApi,
  };
};

// 日付関連のユーティリティ
export const getTestWeekRange = (baseDate?: Date): TestDateRange => {
  const date = baseDate || TEST_CONSTANTS.TEST_BASE_DATE;
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  const now = new Date();
  
  return {
    start,
    end,
    label: `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`,
    isCurrentWeek: start <= now && now <= end,
    isPastWeek: end < now,
    isFutureWeek: start > now,
  };
};

export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
  if (!timeStr || !timeStr.includes(':')) {
    return { hours: 0, minutes: 0 };
  }
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
};

// バリデーション関連のユーティリティ
export const validateWeeklyReport = (report: WeeklyReport): TestValidationResult => {
  const errors: Record<string, string[]> = {};
  const warnings: Record<string, string[]> = {};
  
  // 週報全体のバリデーション
  if (!report.id) {
    errors.id = ['IDが設定されていません'];
  }
  
  if (!report.startDate || !report.endDate) {
    errors.dateRange = ['期間が正しく設定されていません'];
  }
  
  if (report.mood < 1 || report.mood > 5) {
    errors.mood = ['気分は1〜5の範囲で入力してください'];
  }
  
  // 日次レコードのバリデーション
  report.dailyRecords.forEach((record, index) => {
    const dayErrors = validateDailyRecord(record);
    if (!dayErrors.isValid) {
      Object.entries(dayErrors.errors).forEach(([field, messages]) => {
        errors[`dailyRecords.${index}.${field}`] = messages;
      });
    }
  });
  
  // 警告の生成
  const hasWorkData = report.dailyRecords.some(
    record => record.companyStartTime || record.clientStartTime
  );
  if (!hasWorkData && report.status === 'draft') {
    warnings.general = ['勤務時間が入力されていません'];
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

export const validateDailyRecord = (record: DailyRecord): TestValidationResult => {
  const errors: Record<string, string[]> = {};
  const warnings: Record<string, string[]> = {};
  
  // 会社勤務の検証
  if (record.companyStartTime && !record.companyEndTime) {
    errors.companyEndTime = ['終了時刻を入力してください'];
  }
  if (!record.companyStartTime && record.companyEndTime) {
    errors.companyStartTime = ['開始時刻を入力してください'];
  }
  
  // 時刻の論理チェック
  if (record.companyStartTime && record.companyEndTime) {
    const start = parseTimeString(record.companyStartTime);
    const end = parseTimeString(record.companyEndTime);
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;
    
    if (startMinutes >= endMinutes) {
      errors.companyTime = ['終了時刻は開始時刻より後に設定してください'];
    }
    
    // 休憩時間のチェック
    const workMinutes = endMinutes - startMinutes;
    if (record.companyBreakMinutes > workMinutes) {
      errors.companyBreakMinutes = ['休憩時間が勤務時間を超えています'];
    }
  }
  
  // 客先勤務の検証（同様のロジック）
  if (record.clientStartTime && !record.clientEndTime) {
    errors.clientEndTime = ['客先終了時刻を入力してください'];
  }
  if (!record.clientStartTime && record.clientEndTime) {
    errors.clientStartTime = ['客先開始時刻を入力してください'];
  }
  
  // 客先名のチェック
  if ((record.clientStartTime || record.clientEndTime) && !record.clientName) {
    warnings.clientName = ['客先名を入力することを推奨します'];
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

// 稼働時間計算ユーティリティ
export const calculateWorkHours = (report: WeeklyReport): TestWorkHourCalculation => {
  let companyRegularHours = 0;
  let companyOvertimeHours = 0;
  let clientRegularHours = 0;
  const clientOvertimeHours = 0;
  let totalBreakHours = 0;
  
  report.dailyRecords.forEach(record => {
    // 会社勤務時間
    if (record.companyStartTime && record.companyEndTime) {
      const start = parseTimeString(record.companyStartTime);
      const end = parseTimeString(record.companyEndTime);
      const workMinutes = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
      const actualWorkMinutes = workMinutes - record.companyBreakMinutes;
      const workHours = actualWorkMinutes / 60;
      
      // 8時間を超える分は残業
      if (workHours > 8) {
        companyRegularHours += 8;
        companyOvertimeHours += workHours - 8;
      } else {
        companyRegularHours += workHours;
      }
      
      totalBreakHours += record.companyBreakMinutes / 60;
    }
    
    // 客先勤務時間
    if (record.clientStartTime && record.clientEndTime) {
      const start = parseTimeString(record.clientStartTime);
      const end = parseTimeString(record.clientEndTime);
      const workMinutes = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
      const actualWorkMinutes = workMinutes - record.clientBreakMinutes;
      const workHours = actualWorkMinutes / 60;
      
      // 客先は全て通常勤務として計算
      clientRegularHours += workHours;
      totalBreakHours += record.clientBreakMinutes / 60;
    }
  });
  
  const totalHours = companyRegularHours + companyOvertimeHours + clientRegularHours + clientOvertimeHours;
  
  return {
    companyRegularHours,
    companyOvertimeHours,
    clientRegularHours,
    clientOvertimeHours,
    totalHours,
    breakHours: totalBreakHours,
    weeklyTotal: totalHours,
  };
};

// APIモック設定ユーティリティ
export const setupApiMocks = (scenario: MockDataScenario) => {
  const mockReport = createMockApiWeeklyReport(scenario);
  
  // デフォルトのモック設定
  mockedAxios.get.mockImplementation((url) => {
    if (url.includes('/weekly-reports') && url.includes('start_date=')) {
      // 日付範囲での取得
      return Promise.resolve({ 
        data: { data: scenario === 'empty' ? null : mockReport } 
      });
    }
    
    if (url.includes('/weekly-reports/')) {
      // ID指定での取得
      return Promise.resolve({ 
        data: { data: mockReport } 
      });
    }
    
    if (url.includes('/weekly-reports')) {
      // リスト取得
      return Promise.resolve({ 
        data: { 
          data: {
            items: [mockReport],
            total: 1,
            page: 1,
            limit: 10,
          }
        } 
      });
    }
    
    return Promise.reject(new Error('Not found'));
  });
  
  mockedAxios.post.mockImplementation((url, data) => {
    if (url.includes('/weekly-reports')) {
      // 作成
      return Promise.resolve({ 
        data: { data: { ...mockReport, ...data } } 
      });
    }
    
    if (url.includes('/submit')) {
      // 提出
      return Promise.resolve({ 
        data: { 
          data: { 
            ...mockReport, 
            status: 'submitted',
            submittedAt: new Date().toISOString(),
          } 
        } 
      });
    }
    
    return Promise.reject(new Error('Not found'));
  });
  
  mockedAxios.put.mockImplementation((url, data) => {
    if (url.includes('/weekly-reports/')) {
      // 更新
      return Promise.resolve({ 
        data: { data: { ...mockReport, ...data } } 
      });
    }
    
    return Promise.reject(new Error('Not found'));
  });
};

export const resetApiMocks = () => {
  jest.clearAllMocks();
};

// イベントシミュレーションユーティリティ
export const simulateTimeInput = async (
  element: HTMLElement,
  time: string
) => {
  const input = element as HTMLInputElement;
  await userEvent.clear(input);
  await userEvent.type(input, time);
  input.blur();
};

export const simulateFormSubmit = async (form: HTMLFormElement) => {
  const submitEvent = new Event('submit', { 
    bubbles: true, 
    cancelable: true 
  });
  form.dispatchEvent(submitEvent);
  await waitFor(() => {
    expect(form.checkValidity()).toBe(true);
  });
};

export const simulateBulkTimeEntry = async (
  container: HTMLElement,
  settings: BulkSettings
) => {
  // 一括入力の有効化
  const checkbox = container.querySelector('input[type="checkbox"][name="bulkEnabled"]');
  if (checkbox) {
    await userEvent.click(checkbox);
  }
  
  // 時刻の入力
  if (settings.companyStartTime) {
    const startInput = container.querySelector('input[name="bulkCompanyStartTime"]');
    if (startInput) {
      await simulateTimeInput(startInput as HTMLElement, settings.companyStartTime);
    }
  }
  
  if (settings.companyEndTime) {
    const endInput = container.querySelector('input[name="bulkCompanyEndTime"]');
    if (endInput) {
      await simulateTimeInput(endInput as HTMLElement, settings.companyEndTime);
    }
  }
  
  // 適用ボタンのクリック
  const applyButton = container.querySelector('button[data-testid="bulk-apply-button"]');
  if (applyButton) {
    await userEvent.click(applyButton);
  }
};

// テスト用のカスタムマッチャー実装
export const setupCustomMatchers = () => {
  expect.extend({
    toBeValidWeeklyReport(received: WeeklyReport) {
      const validation = validateWeeklyReport(received);
      const pass = validation.isValid;
      
      return {
        pass,
        message: () => {
          if (pass) {
            return `expected weekly report not to be valid`;
          }
          
          const errorMessages = Object.entries(validation.errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('\n');
            
          return `expected weekly report to be valid, but found errors:\n${errorMessages}`;
        },
      };
    },
    
    toHaveWorkHours(received: WeeklyReport, expected: Partial<TestWorkHourCalculation>) {
      const actual = calculateWorkHours(received);
      const pass = Object.entries(expected).every(
        ([key, value]) => Math.abs(actual[key as keyof TestWorkHourCalculation] - value) < 0.01
      );
      
      return {
        pass,
        message: () => {
          if (pass) {
            return `expected work hours not to match`;
          }
          
          const diffs = Object.entries(expected)
            .map(([key, value]) => {
              const actualValue = actual[key as keyof TestWorkHourCalculation];
              return `${key}: expected ${value}, got ${actualValue}`;
            })
            .join('\n');
            
          return `expected work hours to match:\n${diffs}`;
        },
      };
    },
    
    toHaveStatus(received: WeeklyReport, status: string) {
      const pass = received.status === status;
      
      return {
        pass,
        message: () => 
          pass 
            ? `expected status not to be ${status}`
            : `expected status to be ${status}, but got ${received.status}`,
      };
    },
    
    toBeWithinDateRange(received: Date, start: Date, end: Date) {
      const pass = received >= start && received <= end;
      
      return {
        pass,
        message: () => 
          pass
            ? `expected date not to be within range`
            : `expected date ${received.toISOString()} to be within ${start.toISOString()} and ${end.toISOString()}`,
      };
    },
    
    toHaveValidationError(received: TestValidationResult, field: string, message?: string) {
      const hasError = field in received.errors;
      const messageMatches = !message || received.errors[field]?.includes(message);
      const pass = hasError && messageMatches;
      
      return {
        pass,
        message: () => {
          if (pass) {
            return `expected not to have validation error for ${field}`;
          }
          
          if (!hasError) {
            return `expected to have validation error for ${field}`;
          }
          
          return `expected to have validation error "${message}" for ${field}, but got: ${received.errors[field]?.join(', ')}`;
        },
      };
    },
  });
};

// モックレスポンス生成ヘルパー
export const createMockApiResponse = function <T>(
  data: T,
  options: Partial<MockApiResponse<T>> = {}
): MockApiResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    ...options,
  };
};

// デフォルトエクスポート
export default {
  customRender,
  createTestQueryClient,
  getTestWeekRange,
  formatDateForInput,
  parseTimeString,
  validateWeeklyReport,
  validateDailyRecord,
  calculateWorkHours,
  setupApiMocks,
  resetApiMocks,
  simulateTimeInput,
  simulateFormSubmit,
  simulateBulkTimeEntry,
  setupCustomMatchers,
  createMockApiResponse,
};