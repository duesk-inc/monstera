// useWeeklyReportカスタムフックのテスト

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWeeklyReport } from '@/hooks/weeklyReport/useWeeklyReport';

// すべての依存フックをモック
jest.mock('@/hooks/weeklyReport/useWeeklyReportState', () => ({
  useWeeklyReportState: jest.fn(),
}));

jest.mock('@/hooks/weeklyReport/useWeeklyReportCalc', () => ({
  useWeeklyReportCalc: jest.fn(),
}));

jest.mock('@/hooks/weeklyReport/useWeeklyReportValidation', () => ({
  useWeeklyReportValidation: jest.fn(),
}));

jest.mock('@/hooks/weeklyReport/useWeeklyReportDefault', () => ({
  useWeeklyReportDefault: jest.fn(),
}));

jest.mock('@/hooks/weeklyReport/useWeeklyReportData', () => ({
  useWeeklyReportData: jest.fn(),
}));

jest.mock('@/hooks/weeklyReport/useWeeklyReportNavigation', () => ({
  useWeeklyReportNavigation: jest.fn(),
}));

jest.mock('@/hooks/common/useAbortableEffect', () => ({
  useAbortableEffect: jest.fn(),
}));

jest.mock('@/components/common', () => ({
  useToast: jest.fn(),
}));

import { useWeeklyReportState } from '@/hooks/weeklyReport/useWeeklyReportState';
import { useWeeklyReportCalc } from '@/hooks/weeklyReport/useWeeklyReportCalc';
import { useWeeklyReportValidation } from '@/hooks/weeklyReport/useWeeklyReportValidation';
import { useWeeklyReportDefault } from '@/hooks/weeklyReport/useWeeklyReportDefault';
import { useWeeklyReportData } from '@/hooks/weeklyReport/useWeeklyReportData';
import { useWeeklyReportNavigation } from '@/hooks/weeklyReport/useWeeklyReportNavigation';
import { useToast } from '@/components/common';
import { createMockWeeklyReport } from '../utils/mockDataGenerators';

const mockUseWeeklyReportState = useWeeklyReportState as jest.MockedFunction<typeof useWeeklyReportState>;
const mockUseWeeklyReportCalc = useWeeklyReportCalc as jest.MockedFunction<typeof useWeeklyReportCalc>;
const mockUseWeeklyReportValidation = useWeeklyReportValidation as jest.MockedFunction<typeof useWeeklyReportValidation>;
const mockUseWeeklyReportDefault = useWeeklyReportDefault as jest.MockedFunction<typeof useWeeklyReportDefault>;
const mockUseWeeklyReportData = useWeeklyReportData as jest.MockedFunction<typeof useWeeklyReportData>;
const mockUseWeeklyReportNavigation = useWeeklyReportNavigation as jest.MockedFunction<typeof useWeeklyReportNavigation>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('useWeeklyReport', () => {
  // モック関数の準備
  const mockSetReport = jest.fn();
  const mockSetErrors = jest.fn();
  const mockSetLoading = jest.fn();
  const mockIsSubmitted = jest.fn();
  const mockIsDraft = jest.fn();
  const mockCalculateTotalHours = jest.fn();
  const mockGetTotalHours = jest.fn();
  const mockGetClientTotalHours = jest.fn();
  const mockValidateForm = jest.fn();
  const mockCheckSameWorkTimes = jest.fn();
  const mockGenerateDailyRecordsFromDateRange = jest.fn();
  const mockApplyDefaultSettingsToReport = jest.fn();
  const mockForceApplyDefaultSettingsToReport = jest.fn();
  const mockIsReportNew = jest.fn();
  const mockLoadWeeklyReport = jest.fn();
  const mockLoadWeeklyReportByDateRange = jest.fn();
  const mockSaveWeeklyReportDraft = jest.fn();
  const mockSubmitWeeklyReport = jest.fn();
  const mockHandleSelectCurrentWeek = jest.fn();
  const mockHandleSelectPreviousWeek = jest.fn();
  const mockHandleSelectNextWeek = jest.fn();
  const mockHandleWeekSelect = jest.fn();
  const mockShowWarning = jest.fn();

  const mockReport = createMockWeeklyReport(new Date('2024-01-01'));

  beforeEach(() => {
    jest.clearAllMocks();

    // モックの初期設定
    mockUseWeeklyReportState.mockReturnValue({
      report: mockReport,
      setReport: mockSetReport,
      errors: {},
      setErrors: mockSetErrors,
      loading: false,
      setLoading: mockSetLoading,
      isSubmitted: mockIsSubmitted,
      isDraft: mockIsDraft,
    });

    mockUseWeeklyReportCalc.mockReturnValue({
      calculateTotalHours: mockCalculateTotalHours,
      getTotalHours: mockGetTotalHours,
      getClientTotalHours: mockGetClientTotalHours,
    });

    mockUseWeeklyReportValidation.mockReturnValue({
      validateForm: mockValidateForm,
      checkSameWorkTimes: mockCheckSameWorkTimes,
    });

    mockUseWeeklyReportDefault.mockReturnValue({
      generateDailyRecordsFromDateRange: mockGenerateDailyRecordsFromDateRange,
      applyDefaultSettingsToReport: mockApplyDefaultSettingsToReport,
      forceApplyDefaultSettingsToReport: mockForceApplyDefaultSettingsToReport,
      isReportNew: mockIsReportNew,
    });

    mockUseWeeklyReportData.mockReturnValue({
      loadWeeklyReport: mockLoadWeeklyReport,
      loadWeeklyReportByDateRange: mockLoadWeeklyReportByDateRange,
      saveWeeklyReportDraft: mockSaveWeeklyReportDraft,
      submitWeeklyReport: mockSubmitWeeklyReport,
    });

    mockUseWeeklyReportNavigation.mockReturnValue({
      handleSelectCurrentWeek: mockHandleSelectCurrentWeek,
      handleSelectPreviousWeek: mockHandleSelectPreviousWeek,
      handleSelectNextWeek: mockHandleSelectNextWeek,
      handleWeekSelect: mockHandleWeekSelect,
    });

    mockUseToast.mockReturnValue({
      showWarning: mockShowWarning,
      showSuccess: jest.fn(),
      showError: jest.fn(),
      showInfo: jest.fn(),
    });

    // デフォルトの戻り値設定
    mockGetTotalHours.mockReturnValue(40);
    mockGetClientTotalHours.mockReturnValue(35);
    mockIsSubmitted.mockReturnValue(false);
    mockIsDraft.mockReturnValue(false);
    mockValidateForm.mockReturnValue(true);
    mockCheckSameWorkTimes.mockReturnValue({ hasSameTime: false, message: '' });
    mockCalculateTotalHours.mockReturnValue({ companyTotal: 40, clientTotal: 35 });
  });

  describe('基本機能', () => {
    test('正しく初期化される', () => {
      const { result } = renderHook(() => useWeeklyReport());

      expect(result.current.report).toEqual(mockReport);
      expect(result.current.loading).toBe(false);
      expect(result.current.errors).toEqual({});
      expect(result.current.totalHours).toBe(40);
      expect(result.current.clientTotalHours).toBe(35);
    });

    test('依存フックが正しく呼ばれる', () => {
      renderHook(() => useWeeklyReport());

      expect(mockUseWeeklyReportState).toHaveBeenCalled();
      expect(mockUseWeeklyReportCalc).toHaveBeenCalled();
      expect(mockUseWeeklyReportValidation).toHaveBeenCalled();
      expect(mockUseWeeklyReportDefault).toHaveBeenCalled();
      expect(mockUseWeeklyReportData).toHaveBeenCalled();
      expect(mockUseWeeklyReportNavigation).toHaveBeenCalled();
      expect(mockUseToast).toHaveBeenCalled();
    });

    test('デフォルト設定が渡された場合、適切に処理される', () => {
      const defaultSettings = {
        startTime: '09:00',
        endTime: '18:00',
        breakTime: 60,
      };

      const { result } = renderHook(() => useWeeklyReport(defaultSettings));

      // デフォルト設定が渡されたフックが正しく初期化されることを確認
      expect(result.current.report).toEqual(mockReport);
      expect(typeof result.current.applyDefaultSettingsToCurrentReport).toBe('function');
      expect(typeof result.current.forceApplyDefaultSettingsToCurrentReport).toBe('function');
    });
  });

  describe('データ読み込み', () => {
    test('loadWeeklyReportが正しく動作する', async () => {
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await result.current.loadWeeklyReport();
      });

      expect(mockLoadWeeklyReport).toHaveBeenCalledWith(
        mockSetReport,
        mockSetLoading,
        mockSetErrors,
        expect.any(Function),
        undefined,
        expect.any(Function)
      );
    });

    test('AbortSignalとともにloadWeeklyReportが呼ばれる', async () => {
      const { result } = renderHook(() => useWeeklyReport());
      const abortController = new AbortController();

      await act(async () => {
        await result.current.loadWeeklyReport(abortController.signal);
      });

      expect(mockLoadWeeklyReport).toHaveBeenCalledWith(
        mockSetReport,
        mockSetLoading,
        mockSetErrors,
        expect.any(Function),
        abortController.signal,
        expect.any(Function)
      );
    });
  });

  describe('週選択ナビゲーション', () => {
    test('今週選択が正しく動作する', async () => {
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await result.current.handleSelectCurrentWeek();
      });

      expect(mockHandleSelectCurrentWeek).toHaveBeenCalledWith(
        mockSetReport,
        mockSetLoading,
        expect.any(Function)
      );
    });

    test('前週選択が正しく動作する', async () => {
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await result.current.handleSelectPreviousWeek();
      });

      expect(mockHandleSelectPreviousWeek).toHaveBeenCalledWith(
        mockReport.startDate,
        mockSetReport,
        mockSetLoading,
        expect.any(Function)
      );
    });

    test('次週選択が正しく動作する', async () => {
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await result.current.handleSelectNextWeek();
      });

      expect(mockHandleSelectNextWeek).toHaveBeenCalledWith(
        mockReport.startDate,
        mockSetReport,
        mockSetLoading,
        expect.any(Function)
      );
    });

    test('週選択が正しく動作する', async () => {
      const { result } = renderHook(() => useWeeklyReport());
      const startStr = '2024-01-01';
      const endStr = '2024-01-07';

      await act(async () => {
        await result.current.handleWeekSelect(startStr, endStr);
      });

      expect(mockHandleWeekSelect).toHaveBeenCalledWith(
        startStr,
        endStr,
        mockSetReport,
        mockSetLoading,
        expect.any(Function)
      );
    });
  });

  describe('フォーム保存・提出', () => {
    test('下書き保存が成功する', async () => {
      mockValidateForm.mockReturnValue(true);
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await result.current.handleSaveDraft();
      });

      expect(mockValidateForm).toHaveBeenCalledWith(mockReport, mockSetErrors);
      expect(mockSaveWeeklyReportDraft).toHaveBeenCalledWith(
        mockReport,
        mockSetReport,
        mockSetLoading
      );
    });

    test('バリデーションエラーがある場合、下書き保存されない', async () => {
      mockValidateForm.mockReturnValue(false);
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await result.current.handleSaveDraft();
      });

      expect(mockValidateForm).toHaveBeenCalledWith(mockReport, mockSetErrors);
      expect(mockSaveWeeklyReportDraft).not.toHaveBeenCalled();
    });

    test('提出が成功する', async () => {
      mockValidateForm.mockReturnValue(true);
      mockCheckSameWorkTimes.mockReturnValue({ hasSameTime: false, message: '' });
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockValidateForm).toHaveBeenCalledWith(mockReport, mockSetErrors);
      expect(mockCheckSameWorkTimes).toHaveBeenCalledWith(mockReport);
      expect(mockSubmitWeeklyReport).toHaveBeenCalledWith(
        mockReport,
        mockSetReport,
        mockSetLoading
      );
    });

    test('バリデーションエラーがある場合、提出されない', async () => {
      mockValidateForm.mockReturnValue(false);
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockValidateForm).toHaveBeenCalledWith(mockReport, mockSetErrors);
      expect(mockSubmitWeeklyReport).not.toHaveBeenCalled();
    });

    test('勤怠時間が同じ場合、警告が表示され提出されない', async () => {
      mockValidateForm.mockReturnValue(true);
      mockCheckSameWorkTimes.mockReturnValue({ 
        hasSameTime: true, 
        message: '自社勤怠と客先勤怠の時間が同じです' 
      });
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockValidateForm).toHaveBeenCalledWith(mockReport, mockSetErrors);
      expect(mockCheckSameWorkTimes).toHaveBeenCalledWith(mockReport);
      expect(mockShowWarning).toHaveBeenCalledWith('自社勤怠と客先勤怠の時間が同じです');
      expect(mockSubmitWeeklyReport).not.toHaveBeenCalled();
    });
  });

  describe('計算・バリデーション機能', () => {
    test('フォームバリデーションが正しく動作する', () => {
      const { result } = renderHook(() => useWeeklyReport());
      mockValidateForm.mockReturnValue(true);

      const isValid = result.current.validateForm();

      expect(mockValidateForm).toHaveBeenCalledWith(mockReport, mockSetErrors);
      expect(isValid).toBe(true);
    });

    test('勤怠時間チェックが正しく動作する', () => {
      const { result } = renderHook(() => useWeeklyReport());
      const expectedResult = { hasSameTime: false, message: '' };
      mockCheckSameWorkTimes.mockReturnValue(expectedResult);

      const checkResult = result.current.checkSameWorkTimes();

      expect(mockCheckSameWorkTimes).toHaveBeenCalledWith(mockReport);
      expect(checkResult).toEqual(expectedResult);
    });

    test('合計時間計算が正しく動作する', () => {
      const { result } = renderHook(() => useWeeklyReport());
      const expectedResult = { companyTotal: 40, clientTotal: 35 };
      mockCalculateTotalHours.mockReturnValue(expectedResult);

      const totalHours = result.current.calculateTotalHours();

      expect(mockCalculateTotalHours).toHaveBeenCalledWith(mockReport);
      expect(totalHours).toEqual(expectedResult);
    });
  });

  describe('デフォルト設定適用', () => {
    test('デフォルト設定の適用が正しく動作する（未提出レポート）', () => {
      mockIsSubmitted.mockReturnValue(false);
      mockIsDraft.mockReturnValue(false);
      const defaultSettings = {
        startTime: '09:00',
        endTime: '18:00',
        breakTime: 60,
      };
      const updatedReport = { ...mockReport, weeklyRemarks: 'updated' };
      mockApplyDefaultSettingsToReport.mockReturnValue(updatedReport);

      const { result } = renderHook(() => useWeeklyReport());

      act(() => {
        result.current.applyDefaultSettingsToCurrentReport(defaultSettings);
      });

      expect(mockApplyDefaultSettingsToReport).toHaveBeenCalledWith(
        mockReport,
        defaultSettings,
        mockIsSubmitted,
        mockIsDraft
      );
      expect(mockSetReport).toHaveBeenCalledWith(updatedReport);
    });

    test('デフォルト設定が提出済みレポートに適用されない', () => {
      mockIsSubmitted.mockReturnValue(true);
      mockIsDraft.mockReturnValue(false);
      const defaultSettings = {
        startTime: '09:00',
        endTime: '18:00',
        breakTime: 60,
      };

      const { result } = renderHook(() => useWeeklyReport());

      act(() => {
        result.current.applyDefaultSettingsToCurrentReport(defaultSettings);
      });

      expect(mockApplyDefaultSettingsToReport).not.toHaveBeenCalled();
      expect(mockSetReport).not.toHaveBeenCalled();
    });

    test('デフォルト設定の強制適用が正しく動作する', () => {
      mockIsSubmitted.mockReturnValue(false);
      mockIsDraft.mockReturnValue(false);
      const defaultSettings = {
        startTime: '09:00',
        endTime: '18:00',
        breakTime: 60,
      };
      const updatedReport = { ...mockReport, weeklyRemarks: 'force updated' };
      mockForceApplyDefaultSettingsToReport.mockReturnValue(updatedReport);

      const { result } = renderHook(() => useWeeklyReport());

      act(() => {
        result.current.forceApplyDefaultSettingsToCurrentReport(defaultSettings);
      });

      expect(mockForceApplyDefaultSettingsToReport).toHaveBeenCalledWith(
        mockReport,
        defaultSettings,
        mockIsSubmitted,
        mockIsDraft
      );
      expect(mockSetReport).toHaveBeenCalledWith(updatedReport);
    });
  });

  describe('状態管理', () => {
    test('reportの更新が正しく反映される', () => {
      const { result, rerender } = renderHook(() => useWeeklyReport());
      
      const updatedReport = { ...mockReport, weeklyRemarks: '更新されたコメント' };
      mockUseWeeklyReportState.mockReturnValue({
        report: updatedReport,
        setReport: mockSetReport,
        errors: {},
        setErrors: mockSetErrors,
        loading: false,
        setLoading: mockSetLoading,
        isSubmitted: mockIsSubmitted,
        isDraft: mockIsDraft,
      });

      rerender();

      expect(result.current.report).toEqual(updatedReport);
    });

    test('loadingの更新が正しく反映される', () => {
      const { result, rerender } = renderHook(() => useWeeklyReport());
      
      mockUseWeeklyReportState.mockReturnValue({
        report: mockReport,
        setReport: mockSetReport,
        errors: {},
        setErrors: mockSetErrors,
        loading: true, // ローディング状態に変更
        setLoading: mockSetLoading,
        isSubmitted: mockIsSubmitted,
        isDraft: mockIsDraft,
      });

      rerender();

      expect(result.current.loading).toBe(true);
    });

    test('errorsの更新が正しく反映される', () => {
      const { result, rerender } = renderHook(() => useWeeklyReport());
      
      const errors = { weeklyRemarks: 'エラーメッセージ' };
      mockUseWeeklyReportState.mockReturnValue({
        report: mockReport,
        setReport: mockSetReport,
        errors,
        setErrors: mockSetErrors,
        loading: false,
        setLoading: mockSetLoading,
        isSubmitted: mockIsSubmitted,
        isDraft: mockIsDraft,
      });

      rerender();

      expect(result.current.errors).toEqual(errors);
    });
  });

  describe('エッジケース', () => {
    test('空のデフォルト設定でも正しく動作する', () => {
      const { result } = renderHook(() => useWeeklyReport(undefined));

      expect(result.current.report).toEqual(mockReport);
      expect(result.current.loadWeeklyReport).toBeDefined();
    });

    test('非同期処理でのエラーハンドリング', async () => {
      mockLoadWeeklyReport.mockRejectedValue(new Error('API Error'));
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        try {
          await result.current.loadWeeklyReport();
        } catch (error) {
          // エラーが適切に処理されることを確認
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(mockLoadWeeklyReport).toHaveBeenCalled();
    });

    test('複数回の連続呼び出しが正しく処理される', async () => {
      const { result } = renderHook(() => useWeeklyReport());

      await act(async () => {
        await Promise.all([
          result.current.handleSelectCurrentWeek(),
          result.current.handleSelectPreviousWeek(),
          result.current.handleSelectNextWeek(),
        ]);
      });

      expect(mockHandleSelectCurrentWeek).toHaveBeenCalled();
      expect(mockHandleSelectPreviousWeek).toHaveBeenCalled();
      expect(mockHandleSelectNextWeek).toHaveBeenCalled();
    });
  });

  describe('互換性関数', () => {
    test('isSubmittedとisDraftが公開される', () => {
      const { result } = renderHook(() => useWeeklyReport());

      expect(result.current.isSubmitted).toBe(mockIsSubmitted);
      expect(result.current.isDraft).toBe(mockIsDraft);
    });

    test('setReportが公開される', () => {
      const { result } = renderHook(() => useWeeklyReport());

      expect(result.current.setReport).toBe(mockSetReport);
    });
  });
});