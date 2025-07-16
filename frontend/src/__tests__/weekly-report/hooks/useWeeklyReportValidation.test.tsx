// useWeeklyReportValidationフックのテスト

import { renderHook, act } from '@testing-library/react';
import { useWeeklyReportValidation } from '@/hooks/weeklyReport/useWeeklyReportValidation';
import { WEEKLY_REPORT_VALIDATION_MESSAGES } from '@/constants/validationMessages';
import { createMockDailyRecord } from '../utils/mockDataGenerators';
import { WeeklyReport } from '@/types/weeklyReport';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { WEEKLY_REPORT_MOOD } from '@/constants/weeklyMood';

// useWeeklyReportCalcフックをモック
jest.mock('@/hooks/weeklyReport/useWeeklyReportCalc', () => ({
  useWeeklyReportCalc: jest.fn(),
}));

import { useWeeklyReportCalc } from '@/hooks/weeklyReport/useWeeklyReportCalc';

const mockUseWeeklyReportCalc = useWeeklyReportCalc as jest.MockedFunction<typeof useWeeklyReportCalc>;

// テスト用のWeeklyReportモック生成関数
const createTestWeeklyReport = (overrides: Partial<WeeklyReport> = {}): WeeklyReport => {
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-07');
  
  const dailyRecords = [];
  for (let i = 0; i < 7; i++) {
    const recordDate = new Date(startDate);
    recordDate.setDate(recordDate.getDate() + i);
    dailyRecords.push(createMockDailyRecord(recordDate));
  }
  
  return {
    id: 'test-id',
    startDate,
    endDate,
    status: WEEKLY_REPORT_STATUS.DRAFT,
    mood: WEEKLY_REPORT_MOOD.NEUTRAL,
    weeklyRemarks: '',
    dailyRecords,
    totalWorkHours: 40,
    clientTotalWorkHours: 35,
    workplaceChangeRequested: false,
    ...overrides
  };
};

describe('useWeeklyReportValidation', () => {
  const mockCalculateTotalHours = jest.fn();
  const mockSetErrors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // モックの設定
    mockUseWeeklyReportCalc.mockReturnValue({
      calculateTotalHours: mockCalculateTotalHours,
      getTotalHours: jest.fn(),
      getClientTotalHours: jest.fn(),
    });

    // デフォルトのcalculateTotalHours戻り値
    mockCalculateTotalHours.mockReturnValue({ companyTotal: 40, clientTotal: 35 });
  });

  describe('基本機能', () => {
    test('フックが正しく初期化される', () => {
      const { result } = renderHook(() => useWeeklyReportValidation());

      expect(result.current.validateForm).toBeDefined();
      expect(result.current.checkSameWorkTimes).toBeDefined();
      expect(typeof result.current.validateForm).toBe('function');
      expect(typeof result.current.checkSameWorkTimes).toBe('function');
    });

    test('依存フックが正しく呼ばれる', () => {
      renderHook(() => useWeeklyReportValidation());

      expect(mockUseWeeklyReportCalc).toHaveBeenCalled();
    });
  });

  describe('validateForm', () => {
    describe('正常ケース', () => {
      test('エラーがない場合、trueを返す', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();

        let isValid: boolean = false;
        act(() => {
          isValid = result.current.validateForm(report, mockSetErrors);
        });

        expect(isValid).toBe(true);
        expect(mockSetErrors).toHaveBeenCalledWith({});
      });

      test('週総括が1000文字以内の場合、エラーなし', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport({
          weeklyRemarks: 'あ'.repeat(1000)
        });

        let isValid: boolean = false;
        act(() => {
          isValid = result.current.validateForm(report, mockSetErrors);
        });

        expect(isValid).toBe(true);
        expect(mockSetErrors).toHaveBeenCalledWith({});
      });

      test('週総括が空の場合、エラーなし', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport({
          weeklyRemarks: ''
        });

        let isValid: boolean = false;
        act(() => {
          isValid = result.current.validateForm(report, mockSetErrors);
        });

        expect(isValid).toBe(true);
        expect(mockSetErrors).toHaveBeenCalledWith({});
      });
    });

    describe('バリデーションエラー', () => {
      test('週総括が1000文字を超える場合、エラーを設定', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport({
          weeklyRemarks: 'あ'.repeat(1001)
        });

        let isValid: boolean = false;
        act(() => {
          isValid = result.current.validateForm(report, mockSetErrors);
        });

        expect(isValid).toBe(false);
        expect(mockSetErrors).toHaveBeenCalledWith({
          weeklyRemarks: WEEKLY_REPORT_VALIDATION_MESSAGES.WEEKLY_REMARKS_MAX_LENGTH
        });
      });

      test('稼働時間の合計が0の場合、エラーを設定', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // 稼働時間0を返すように設定
        mockCalculateTotalHours.mockReturnValue({ companyTotal: 0, clientTotal: 0 });

        let isValid: boolean = false;
        act(() => {
          isValid = result.current.validateForm(report, mockSetErrors);
        });

        expect(isValid).toBe(false);
        expect(mockSetErrors).toHaveBeenCalledWith({
          dailyRecords: WEEKLY_REPORT_VALIDATION_MESSAGES.WORK_TIME_REQUIRED
        });
      });

      test('複数のエラーがある場合、すべてのエラーを設定', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport({
          weeklyRemarks: 'あ'.repeat(1001)
        });
        
        // 稼働時間0を返すように設定
        mockCalculateTotalHours.mockReturnValue({ companyTotal: 0, clientTotal: 0 });

        let isValid: boolean = false;
        act(() => {
          isValid = result.current.validateForm(report, mockSetErrors);
        });

        expect(isValid).toBe(false);
        expect(mockSetErrors).toHaveBeenCalledWith({
          weeklyRemarks: WEEKLY_REPORT_VALIDATION_MESSAGES.WEEKLY_REMARKS_MAX_LENGTH,
          dailyRecords: WEEKLY_REPORT_VALIDATION_MESSAGES.WORK_TIME_REQUIRED
        });
      });
    });

    describe('エッジケース', () => {
      test('weeklyRemarksがundefinedまたはnullの場合、エラーなし', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report1 = createTestWeeklyReport({ weeklyRemarks: undefined as any });
        const report2 = createTestWeeklyReport({ weeklyRemarks: null as any });

        let isValid1: boolean = false;
        let isValid2: boolean = false;
        
        act(() => {
          isValid1 = result.current.validateForm(report1, mockSetErrors);
        });
        
        act(() => {
          isValid2 = result.current.validateForm(report2, mockSetErrors);
        });

        expect(isValid1).toBe(true);
        expect(isValid2).toBe(true);
      });

      test('稼働時間がマイナスの場合でもエラーを設定', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // マイナスの稼働時間を返すように設定
        mockCalculateTotalHours.mockReturnValue({ companyTotal: -10, clientTotal: -5 });

        let isValid: boolean = false;
        act(() => {
          isValid = result.current.validateForm(report, mockSetErrors);
        });

        expect(isValid).toBe(false);
        expect(mockSetErrors).toHaveBeenCalledWith({
          dailyRecords: WEEKLY_REPORT_VALIDATION_MESSAGES.WORK_TIME_REQUIRED
        });
      });
    });
  });

  describe('checkSameWorkTimes', () => {
    describe('同じ時間のチェック', () => {
      test('自社勤怠と客先勤怠が異なる場合、エラーなし', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // 客先勤怠を設定（異なる時間）
        report.dailyRecords[0].hasClientWork = true;
        report.dailyRecords[0].startTime = '09:00';
        report.dailyRecords[0].endTime = '18:00';
        report.dailyRecords[0].breakTime = 60;
        report.dailyRecords[0].clientStartTime = '10:00';
        report.dailyRecords[0].clientEndTime = '17:00';
        report.dailyRecords[0].clientBreakTime = 30;

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(false);
        expect(result_check.message).toBe('');
      });

      test('自社勤怠と客先勤怠が同じ場合、警告を返す', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // 客先勤怠を設定（同じ時間）
        report.dailyRecords[0].hasClientWork = true;
        report.dailyRecords[0].startTime = '09:00';
        report.dailyRecords[0].endTime = '18:00';
        report.dailyRecords[0].breakTime = 60;
        report.dailyRecords[0].clientStartTime = '09:00';
        report.dailyRecords[0].clientEndTime = '18:00';
        report.dailyRecords[0].clientBreakTime = 60;

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(true);
        expect(result_check.message).toBe(WEEKLY_REPORT_VALIDATION_MESSAGES.SAME_WORK_TIME_WARNING);
      });

      test('一部だけ同じ場合はエラーなし', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // 開始時間のみ同じ
        report.dailyRecords[0].hasClientWork = true;
        report.dailyRecords[0].startTime = '09:00';
        report.dailyRecords[0].endTime = '18:00';
        report.dailyRecords[0].breakTime = 60;
        report.dailyRecords[0].clientStartTime = '09:00';
        report.dailyRecords[0].clientEndTime = '17:00';
        report.dailyRecords[0].clientBreakTime = 60;

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(false);
        expect(result_check.message).toBe('');
      });

      test('複数の日で同じ時間がある場合、最初の一致でtrueを返す', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // 複数日で客先勤怠を設定
        // 1日目：異なる
        report.dailyRecords[0].hasClientWork = true;
        report.dailyRecords[0].startTime = '09:00';
        report.dailyRecords[0].endTime = '18:00';
        report.dailyRecords[0].breakTime = 60;
        report.dailyRecords[0].clientStartTime = '10:00';
        report.dailyRecords[0].clientEndTime = '17:00';
        report.dailyRecords[0].clientBreakTime = 30;
        
        // 2日目：同じ
        report.dailyRecords[1].hasClientWork = true;
        report.dailyRecords[1].startTime = '09:00';
        report.dailyRecords[1].endTime = '18:00';
        report.dailyRecords[1].breakTime = 60;
        report.dailyRecords[1].clientStartTime = '09:00';
        report.dailyRecords[1].clientEndTime = '18:00';
        report.dailyRecords[1].clientBreakTime = 60;

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(true);
        expect(result_check.message).toBe(WEEKLY_REPORT_VALIDATION_MESSAGES.SAME_WORK_TIME_WARNING);
      });
    });

    describe('客先勤怠なしの場合', () => {
      test('hasClientWorkがfalseの場合、チェックをスキップ', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // 客先勤怠なし
        report.dailyRecords[0].hasClientWork = false;
        report.dailyRecords[0].startTime = '09:00';
        report.dailyRecords[0].endTime = '18:00';

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(false);
        expect(result_check.message).toBe('');
      });

      test('客先時刻が空の場合、チェックをスキップ', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // 客先時刻が未入力
        report.dailyRecords[0].hasClientWork = true;
        report.dailyRecords[0].startTime = '09:00';
        report.dailyRecords[0].endTime = '18:00';
        report.dailyRecords[0].clientStartTime = '';
        report.dailyRecords[0].clientEndTime = '';

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(false);
        expect(result_check.message).toBe('');
      });
    });

    describe('休憩時間の比較', () => {
      test('clientBreakTimeがundefinedの場合、0として比較', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // clientBreakTimeがundefined、breakTimeが0
        report.dailyRecords[0].hasClientWork = true;
        report.dailyRecords[0].startTime = '09:00';
        report.dailyRecords[0].endTime = '18:00';
        report.dailyRecords[0].breakTime = 0;
        report.dailyRecords[0].clientStartTime = '09:00';
        report.dailyRecords[0].clientEndTime = '18:00';
        delete (report.dailyRecords[0] as any).clientBreakTime;

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(true);
        expect(result_check.message).toBe(WEEKLY_REPORT_VALIDATION_MESSAGES.SAME_WORK_TIME_WARNING);
      });

      test('clientBreakTimeがnullの場合、0として比較', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // clientBreakTimeがnull、breakTimeが0
        report.dailyRecords[0].hasClientWork = true;
        report.dailyRecords[0].startTime = '09:00';
        report.dailyRecords[0].endTime = '18:00';
        report.dailyRecords[0].breakTime = 0;
        report.dailyRecords[0].clientStartTime = '09:00';
        report.dailyRecords[0].clientEndTime = '18:00';
        report.dailyRecords[0].clientBreakTime = null as any;

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(true);
        expect(result_check.message).toBe(WEEKLY_REPORT_VALIDATION_MESSAGES.SAME_WORK_TIME_WARNING);
      });
    });

    describe('エッジケース', () => {
      test('dailyRecordsが空の場合、エラーなし', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport({
          dailyRecords: []
        });

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(false);
        expect(result_check.message).toBe('');
      });

      test('すべての値が空文字の場合でも正しく比較', () => {
        const { result } = renderHook(() => useWeeklyReportValidation());
        const report = createTestWeeklyReport();
        
        // すべて空文字
        report.dailyRecords[0].hasClientWork = true;
        report.dailyRecords[0].startTime = '';
        report.dailyRecords[0].endTime = '';
        report.dailyRecords[0].breakTime = 0;
        report.dailyRecords[0].clientStartTime = '';
        report.dailyRecords[0].clientEndTime = '';
        report.dailyRecords[0].clientBreakTime = 0;

        let result_check: { hasSameTime: boolean; message: string };
        act(() => {
          result_check = result.current.checkSameWorkTimes(report);
        });

        expect(result_check.hasSameTime).toBe(false);
        expect(result_check.message).toBe('');
      });
    });
  });

  describe('関数の安定性', () => {
    test('同じパラメータで複数回呼び出しても同じ結果を返す', () => {
      const { result } = renderHook(() => useWeeklyReportValidation());
      const report = createTestWeeklyReport();

      let isValid1: boolean = false;
      let isValid2: boolean = false;
      
      act(() => {
        isValid1 = result.current.validateForm(report, mockSetErrors);
      });
      
      mockSetErrors.mockClear();
      
      act(() => {
        isValid2 = result.current.validateForm(report, mockSetErrors);
      });

      expect(isValid1).toBe(isValid2);
      expect(mockSetErrors).toHaveBeenCalledTimes(1);
    });

    test('フック再レンダリング後も関数参照が保持される', () => {
      const { result, rerender } = renderHook(() => useWeeklyReportValidation());
      
      const validateFormRef1 = result.current.validateForm;
      const checkSameWorkTimesRef1 = result.current.checkSameWorkTimes;
      
      rerender();
      
      const validateFormRef2 = result.current.validateForm;
      const checkSameWorkTimesRef2 = result.current.checkSameWorkTimes;
      
      // useCallbackによりメモ化されているため、同じ参照を保持
      expect(validateFormRef1).toBe(validateFormRef2);
      expect(checkSameWorkTimesRef1).toBe(checkSameWorkTimesRef2);
    });
  });
});