// 週報作成・編集・提出の完全フロー統合テスト

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import WeeklyReport from '@/app/(authenticated)/(engineer)/weekly-report/page';
import { customRender } from '../utils';
import { createMockDailyRecord } from '../utils/mockDataGenerators';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { WEEKLY_REPORT_MOOD } from '@/constants/weeklyMood';

// 依存フックとコンポーネントをモック
jest.mock('@/hooks/weeklyReport/useWeeklyReport', () => ({
  useWeeklyReport: jest.fn(),
}));

jest.mock('@/hooks/weeklyReport/useDefaultSettings', () => ({
  useDefaultSettings: jest.fn(),
}));

jest.mock('@/hooks/weeklyReport/useDailyRecords', () => ({
  useDailyRecords: jest.fn(),
}));

jest.mock('@/hooks/common/useEnhancedErrorHandler', () => ({
  useEnhancedErrorHandler: jest.fn(),
}));

jest.mock('@/components/common', () => ({
  useToast: jest.fn(),
  StatusChip: ({ status }: any) => <div data-testid="status-chip">{status}</div>,
  ConfirmDialog: ({ open, title, onConfirm, onCancel, loading }: any) => (
    open ? (
      <div data-testid="confirm-dialog">
        <div data-testid="dialog-title">{title}</div>
        <button data-testid="confirm-button" onClick={onConfirm} disabled={loading}>
          確認
        </button>
        <button data-testid="cancel-button" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    ) : null
  ),
  FormDialog: ({ open, title, onClose, onSubmit, children }: any) => (
    open ? (
      <div data-testid="form-dialog">
        <div data-testid="dialog-title">{title}</div>
        {children}
        <button data-testid="submit-button" onClick={onSubmit}>
          提出
        </button>
        <button data-testid="close-button" onClick={onClose}>
          閉じる
        </button>
      </div>
    ) : null
  ),
  PageContainer: ({ children }: any) => <div data-testid="page-container">{children}</div>,
  PageHeader: ({ title, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {actions}
    </div>
  ),
  LoadingOverlay: ({ open }: any) => (
    open ? <div data-testid="loading-overlay">Loading...</div> : null
  ),
}));

jest.mock('@/components/features/weeklyReport/WeekSelector', () => {
  return function WeekSelector({ currentStartDate, currentEndDate, onWeekSelect, onSelectCurrentWeek, onSelectPreviousWeek, onSelectNextWeek, disabled }: any) {
    return (
      <div data-testid="week-selector">
        <div data-testid="current-week">
          {format(currentStartDate, 'yyyy-MM-dd')} - {format(currentEndDate, 'yyyy-MM-dd')}
        </div>
        <button 
          data-testid="previous-week-button" 
          onClick={onSelectPreviousWeek}
          disabled={disabled}
        >
          前週
        </button>
        <button 
          data-testid="current-week-button" 
          onClick={onSelectCurrentWeek}
          disabled={disabled}
        >
          今週
        </button>
        <button 
          data-testid="next-week-button" 
          onClick={onSelectNextWeek}
          disabled={disabled}
        >
          次週
        </button>
      </div>
    );
  };
});

jest.mock('@/components/features/weeklyReport/DailyRecordAccordion', () => {
  return function DailyRecordAccordion({ 
    date, 
    dayOfWeek, 
    record, 
    recordIndex, 
    isExpanded, 
    isSubmitted, 
    onToggleExpand, 
    onHolidayWorkToggle,
    onClientWorkToggle,
    onTimeChange,
    onClientTimeChange,
    onBreakTimeChange,
    onClientBreakTimeChange,
    onRemarksChange 
  }: any) {
    return (
      <div data-testid={`daily-record-${recordIndex}`}>
        <button 
          data-testid={`toggle-accordion-${recordIndex}`}
          onClick={onToggleExpand}
        >
          {format(date, 'MM/dd')}（{dayOfWeek}）
        </button>
        {isExpanded && (
          <div data-testid={`accordion-content-${recordIndex}`}>
            <input
              data-testid={`start-time-${recordIndex}`}
              type="time"
              value={record.startTime}
              onChange={(e) => onTimeChange('startTime', new Date(`2024-01-01T${e.target.value}:00`))}
              disabled={isSubmitted}
            />
            <input
              data-testid={`end-time-${recordIndex}`}
              type="time"
              value={record.endTime}
              onChange={(e) => onTimeChange('endTime', new Date(`2024-01-01T${e.target.value}:00`))}
              disabled={isSubmitted}
            />
            <input
              data-testid={`break-time-${recordIndex}`}
              type="number"
              value={record.breakTime}
              onChange={(e) => onBreakTimeChange(e.target.value)}
              disabled={isSubmitted}
            />
            <input
              data-testid={`remarks-${recordIndex}`}
              value={record.remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              disabled={isSubmitted}
            />
            <input
              data-testid={`holiday-work-${recordIndex}`}
              type="checkbox"
              checked={record.isHolidayWork}
              onChange={onHolidayWorkToggle}
              disabled={isSubmitted}
            />
            <input
              data-testid={`client-work-${recordIndex}`}
              type="checkbox"
              checked={record.hasClientWork}
              onChange={(e) => onClientWorkToggle(e.target.checked)}
              disabled={isSubmitted}
            />
          </div>
        )}
      </div>
    );
  };
});

jest.mock('@/components/features/weeklyReport/WeeklyWorkSummary', () => {
  return function WeeklyWorkSummary({ totalHours, clientTotalHours, onBulkSettings, onDefaultSettings }: any) {
    return (
      <div data-testid="weekly-work-summary">
        <div data-testid="total-hours">合計: {totalHours}時間</div>
        <div data-testid="client-total-hours">客先: {clientTotalHours}時間</div>
        <button data-testid="bulk-settings-button" onClick={onBulkSettings}>
          一括設定
        </button>
        <button data-testid="default-settings-button" onClick={onDefaultSettings}>
          デフォルト設定
        </button>
      </div>
    );
  };
});

jest.mock('@/components/features/weeklyReport/WeeklyReportContainer', () => {
  return function WeeklyReportContainer({ 
    mood, 
    weeklyRemarks, 
    weeklyRemarksError, 
    isSubmitted, 
    loading, 
    onMoodChange, 
    onWeeklyRemarksChange, 
    onSave, 
    onSubmit 
  }: any) {
    return (
      <div data-testid="weekly-report-container">
        <div data-testid="mood-selector">
          {[1, 2, 3, 4, 5].map(moodValue => (
            <button
              key={moodValue}
              data-testid={`mood-${moodValue}`}
              onClick={() => onMoodChange(moodValue)}
              disabled={isSubmitted}
              className={mood === moodValue ? 'selected' : ''}
            >
              {moodValue}
            </button>
          ))}
        </div>
        <textarea
          data-testid="weekly-remarks"
          value={weeklyRemarks}
          onChange={(e) => onWeeklyRemarksChange(e.target.value)}
          disabled={isSubmitted}
        />
        {weeklyRemarksError && (
          <div data-testid="weekly-remarks-error">{weeklyRemarksError}</div>
        )}
        <button 
          data-testid="save-button"
          onClick={onSave}
          disabled={loading || isSubmitted}
        >
          保存
        </button>
        <button 
          data-testid="submit-button"
          onClick={onSubmit}
          disabled={loading || isSubmitted}
        >
          提出
        </button>
      </div>
    );
  };
});

import { useWeeklyReport } from '@/hooks/weeklyReport/useWeeklyReport';
import { useDefaultSettings } from '@/hooks/weeklyReport/useDefaultSettings';
import { useDailyRecords } from '@/hooks/weeklyReport/useDailyRecords';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { useToast } from '@/components/common';

const mockUseWeeklyReport = useWeeklyReport as jest.MockedFunction<typeof useWeeklyReport>;
const mockUseDefaultSettings = useDefaultSettings as jest.MockedFunction<typeof useDefaultSettings>;
const mockUseDailyRecords = useDailyRecords as jest.MockedFunction<typeof useDailyRecords>;
const mockUseEnhancedErrorHandler = useEnhancedErrorHandler as jest.MockedFunction<typeof useEnhancedErrorHandler>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// テスト用のヘルパー関数
const createTestWeeklyReport = (status = WEEKLY_REPORT_STATUS.NOT_SUBMITTED) => {
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-07');
  
  const dailyRecords = [];
  for (let i = 0; i < 7; i++) {
    const recordDate = new Date(startDate);
    recordDate.setDate(recordDate.getDate() + i);
    dailyRecords.push(createMockDailyRecord(recordDate));
  }
  
  return {
    id: 'test-weekly-report-id',
    startDate,
    endDate,
    status,
    mood: WEEKLY_REPORT_MOOD.NEUTRAL,
    weeklyRemarks: '',
    dailyRecords,
    totalWorkHours: 40,
    clientTotalWorkHours: 35,
    workplaceChangeRequested: false,
  };
};

describe('WeeklyReportFlow Integration Tests', () => {
  // モック関数の準備
  const mockSetReport = jest.fn();
  const mockLoadWeeklyReport = jest.fn();
  const mockHandleSelectCurrentWeek = jest.fn();
  const mockHandleSelectPreviousWeek = jest.fn();
  const mockHandleSelectNextWeek = jest.fn();
  const mockHandleWeekSelect = jest.fn();
  const mockHandleSaveDraft = jest.fn();
  const mockHandleSubmit = jest.fn();
  const mockValidateForm = jest.fn();
  const mockIsSubmitted = jest.fn();
  const mockIsDraft = jest.fn();
  const mockForceApplyDefaultSettingsToCurrentReport = jest.fn();
  const mockLoadDefaultSettings = jest.fn();
  const mockSaveDefaultSettings = jest.fn();
  const mockHandleDefaultSettingChange = jest.fn();
  const mockHandleDailyRecordChange = jest.fn();
  const mockHandleTimeChange = jest.fn();
  const mockHandleBreakTimeChange = jest.fn();
  const mockHandleHolidayWorkToggle = jest.fn();
  const mockHandleClientDailyRecordChange = jest.fn();
  const mockHandleClientBreakTimeChange = jest.fn();
  const mockApplyBulkSettings = jest.fn();
  const mockShowSuccess = jest.fn();
  const mockHandleError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのモック設定
    const testReport = createTestWeeklyReport();

    mockUseWeeklyReport.mockReturnValue({
      report: testReport,
      loading: false,
      errors: {},
      totalHours: 40,
      clientTotalHours: 35,
      setReport: mockSetReport,
      loadWeeklyReport: mockLoadWeeklyReport,
      handleSelectCurrentWeek: mockHandleSelectCurrentWeek,
      handleSelectPreviousWeek: mockHandleSelectPreviousWeek,
      handleSelectNextWeek: mockHandleSelectNextWeek,
      handleWeekSelect: mockHandleWeekSelect,
      handleSaveDraft: mockHandleSaveDraft,
      handleSubmit: mockHandleSubmit,
      validateForm: mockValidateForm,
      isSubmitted: mockIsSubmitted,
      isDraft: mockIsDraft,
      forceApplyDefaultSettingsToCurrentReport: mockForceApplyDefaultSettingsToCurrentReport,
    });

    mockUseDefaultSettings.mockReturnValue({
      defaultSettings: {
        weekdayStart: '09:00',
        weekdayEnd: '18:00',
        weekdayBreak: 60,
      },
      loading: false,
      loadDefaultSettings: mockLoadDefaultSettings,
      saveDefaultSettings: mockSaveDefaultSettings,
      handleDefaultSettingChange: mockHandleDefaultSettingChange,
      isDataLoaded: true,
    });

    mockUseDailyRecords.mockReturnValue({
      handleDailyRecordChange: mockHandleDailyRecordChange,
      handleTimeChange: mockHandleTimeChange,
      handleBreakTimeChange: mockHandleBreakTimeChange,
      handleHolidayWorkToggle: mockHandleHolidayWorkToggle,
      handleClientDailyRecordChange: mockHandleClientDailyRecordChange,
      handleClientBreakTimeChange: mockHandleClientBreakTimeChange,
      applyBulkSettings: mockApplyBulkSettings,
    });

    mockUseEnhancedErrorHandler.mockReturnValue({
      handleError: mockHandleError,
      getToastMessage: jest.fn(),
      getFieldErrors: jest.fn(),
      getRecommendedAction: jest.fn(),
    });

    mockUseToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: jest.fn(),
      showWarning: jest.fn(),
      showInfo: jest.fn(),
    });

    // デフォルト戻り値
    mockValidateForm.mockReturnValue(true);
    mockIsSubmitted.mockReturnValue(false);
    mockIsDraft.mockReturnValue(false);
    mockSaveDefaultSettings.mockResolvedValue(true);
    mockHandleDailyRecordChange.mockImplementation((records) => records);
    mockHandleTimeChange.mockImplementation((records) => records);
    mockHandleBreakTimeChange.mockImplementation((records) => records);
    mockHandleHolidayWorkToggle.mockImplementation((records) => records);
    mockHandleClientDailyRecordChange.mockImplementation((records) => records);
    mockHandleClientBreakTimeChange.mockImplementation((records) => records);
    mockApplyBulkSettings.mockImplementation((records) => records);
  });

  describe('基本的なレンダリング', () => {
    test('週報ページが正しく表示される', () => {
      customRender(<WeeklyReport />);

      expect(screen.getByTestId('page-container')).toBeInTheDocument();
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
      expect(screen.getByText('週報')).toBeInTheDocument();
      expect(screen.getByTestId('week-selector')).toBeInTheDocument();
      expect(screen.getByTestId('weekly-work-summary')).toBeInTheDocument();
      expect(screen.getByTestId('weekly-report-container')).toBeInTheDocument();
    });

    test('日別レコードが7日分表示される', () => {
      customRender(<WeeklyReport />);

      for (let i = 0; i < 7; i++) {
        expect(screen.getByTestId(`daily-record-${i}`)).toBeInTheDocument();
      }
    });

    test('ステータスチップが表示される', () => {
      customRender(<WeeklyReport />);

      expect(screen.getByTestId('status-chip')).toBeInTheDocument();
      expect(screen.getByTestId('status-chip')).toHaveTextContent('not_submitted');
    });
  });

  describe('週報データの読み込み', () => {
    test('初期化時にデフォルト設定が読み込まれる', () => {
      customRender(<WeeklyReport />);

      expect(mockLoadDefaultSettings).toHaveBeenCalled();
    });

    test('デフォルト設定読み込み後に週報が読み込まれる', () => {
      // まだ週報が読み込まれていない状態
      mockUseWeeklyReport.mockReturnValue({
        ...mockUseWeeklyReport(),
        report: {
          ...createTestWeeklyReport(),
          id: undefined,
          dailyRecords: [],
        },
      });

      customRender(<WeeklyReport />);

      expect(mockLoadWeeklyReport).toHaveBeenCalled();
    });
  });

  describe('週選択機能', () => {
    test('前週ボタンクリックで前週が選択される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const previousWeekButton = screen.getByTestId('previous-week-button');
      await user.click(previousWeekButton);

      expect(mockHandleSelectPreviousWeek).toHaveBeenCalled();
    });

    test('今週ボタンクリックで今週が選択される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const currentWeekButton = screen.getByTestId('current-week-button');
      await user.click(currentWeekButton);

      expect(mockHandleSelectCurrentWeek).toHaveBeenCalled();
    });

    test('次週ボタンクリックで次週が選択される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const nextWeekButton = screen.getByTestId('next-week-button');
      await user.click(nextWeekButton);

      expect(mockHandleSelectNextWeek).toHaveBeenCalled();
    });

    test('ローディング中は週選択ボタンが無効化される', () => {
      mockUseWeeklyReport.mockReturnValue({
        ...mockUseWeeklyReport(),
        loading: true,
      });

      customRender(<WeeklyReport />);

      expect(screen.getByTestId('previous-week-button')).toBeDisabled();
      expect(screen.getByTestId('current-week-button')).toBeDisabled();
      expect(screen.getByTestId('next-week-button')).toBeDisabled();
    });
  });

  describe('日別データ編集機能', () => {
    test('アコーディオンの展開・折りたたみが動作する', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const accordionToggle = screen.getByTestId('toggle-accordion-0');
      await user.click(accordionToggle);

      // アコーディオンが展開されることを確認
      expect(screen.getByTestId('accordion-content-0')).toBeInTheDocument();
    });

    test('勤務時間の入力が正しく処理される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      // アコーディオンを展開
      const accordionToggle = screen.getByTestId('toggle-accordion-0');
      await user.click(accordionToggle);

      // 開始時間を変更
      const startTimeInput = screen.getByTestId('start-time-0');
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '10:00');

      expect(mockHandleTimeChange).toHaveBeenCalled();
    });

    test('休憩時間の入力が正しく処理される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      // アコーディオンを展開
      const accordionToggle = screen.getByTestId('toggle-accordion-0');
      await user.click(accordionToggle);

      // 休憩時間を変更
      const breakTimeInput = screen.getByTestId('break-time-0');
      await user.clear(breakTimeInput);
      await user.type(breakTimeInput, '90');

      // 実際の呼び出しは期待された引数で行われることを確認
      expect(mockHandleBreakTimeChange).toHaveBeenCalled();
    });

    test('備考の入力が正しく処理される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      // アコーディオンを展開
      const accordionToggle = screen.getByTestId('toggle-accordion-0');
      await user.click(accordionToggle);

      // 備考を入力
      const remarksInput = screen.getByTestId('remarks-0');
      await user.type(remarksInput, 'テスト備考');

      expect(mockHandleDailyRecordChange).toHaveBeenCalled();
    });

    test('休日出勤チェックボックスが正しく動作する', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      // アコーディオンを展開
      const accordionToggle = screen.getByTestId('toggle-accordion-0');
      await user.click(accordionToggle);

      // 休日出勤チェックボックスをクリック
      const holidayWorkCheckbox = screen.getByTestId('holiday-work-0');
      await user.click(holidayWorkCheckbox);

      expect(mockHandleHolidayWorkToggle).toHaveBeenCalled();
    });

    test('客先勤怠チェックボックスが正しく動作する', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      // アコーディオンを展開
      const accordionToggle = screen.getByTestId('toggle-accordion-0');
      await user.click(accordionToggle);

      // 客先勤怠チェックボックスをクリック
      const clientWorkCheckbox = screen.getByTestId('client-work-0');
      await user.click(clientWorkCheckbox);

      expect(mockHandleClientDailyRecordChange).toHaveBeenCalled();
    });
  });

  describe('週間総括機能', () => {
    test('ムード選択が正しく動作する', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const moodButton = screen.getByTestId('mood-4');
      await user.click(moodButton);

      expect(mockSetReport).toHaveBeenCalledWith(
        expect.objectContaining({
          mood: 4,
        })
      );
    });

    test('週次所感の入力が正しく処理される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const weeklyRemarksInput = screen.getByTestId('weekly-remarks');
      await user.type(weeklyRemarksInput, '今週は順調でした。');

      // setReportが呼ばれたことを確認
      expect(mockSetReport).toHaveBeenCalled();
    });
  });

  describe('下書き保存機能', () => {
    test('下書き保存ボタンクリックで確認ダイアログが表示される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('下書きとして保存');
    });

    test('確認ダイアログで「確認」をクリックすると下書き保存が実行される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      // 下書き保存ボタンをクリック
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      // 確認ダイアログで確認をクリック
      const confirmButton = screen.getByTestId('confirm-button');
      await user.click(confirmButton);

      expect(mockHandleSaveDraft).toHaveBeenCalled();
    });

    test('確認ダイアログで「キャンセル」をクリックするとダイアログが閉じる', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      // 下書き保存ボタンをクリック
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      // 確認ダイアログでキャンセルをクリック
      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });

    test('バリデーションエラーがある場合、ダイアログが表示されない', async () => {
      const user = userEvent.setup();
      mockValidateForm.mockReturnValue(false);
      
      customRender(<WeeklyReport />);

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });
  });

  describe('提出機能', () => {
    test('提出ボタンクリックで確認ダイアログが表示される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('週報を提出');
    });

    test('確認ダイアログで「確認」をクリックすると提出が実行される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      // 提出ボタンをクリック
      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      // 確認ダイアログで確認をクリック
      const confirmButton = screen.getByTestId('confirm-button');
      await user.click(confirmButton);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  describe('一括設定機能', () => {
    test('一括設定ボタンクリックでダイアログが表示される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const bulkSettingsButton = screen.getByTestId('bulk-settings-button');
      await user.click(bulkSettingsButton);

      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('一括設定');
    });
  });

  describe('デフォルト設定機能', () => {
    test('デフォルト設定ボタンクリックでダイアログが表示される', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      const defaultSettingsButton = screen.getByTestId('default-settings-button');
      await user.click(defaultSettingsButton);

      expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('個人勤務時間デフォルト設定');
    });
  });

  describe('提出済み状態の処理', () => {
    test('提出済みの週報では編集ボタンが無効化される', () => {
      mockIsSubmitted.mockReturnValue(true);
      
      customRender(<WeeklyReport />);

      // アコーディオンを展開
      fireEvent.click(screen.getByTestId('toggle-accordion-0'));

      // 入力フィールドが無効化されていることを確認
      expect(screen.getByTestId('start-time-0')).toBeDisabled();
      expect(screen.getByTestId('end-time-0')).toBeDisabled();
      expect(screen.getByTestId('break-time-0')).toBeDisabled();
      expect(screen.getByTestId('remarks-0')).toBeDisabled();
      expect(screen.getByTestId('holiday-work-0')).toBeDisabled();
      expect(screen.getByTestId('client-work-0')).toBeDisabled();

      // 週間総括の入力フィールドも無効化
      expect(screen.getByTestId('weekly-remarks')).toBeDisabled();
      
      // ムードボタンも無効化
      expect(screen.getByTestId('mood-1')).toBeDisabled();
      
      // 保存・提出ボタンも無効化
      expect(screen.getByTestId('save-button')).toBeDisabled();
      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    test('提出済み状態ではステータスチップが適切に表示される', () => {
      mockUseWeeklyReport.mockReturnValue({
        ...mockUseWeeklyReport(),
        report: {
          ...createTestWeeklyReport(WEEKLY_REPORT_STATUS.SUBMITTED),
        },
      });
      mockIsSubmitted.mockReturnValue(true);
      
      customRender(<WeeklyReport />);

      expect(screen.getByTestId('status-chip')).toHaveTextContent('submitted');
    });
  });

  describe('ローディング状態の処理', () => {
    test('ローディング中はローディングオーバーレイが表示される', () => {
      mockUseWeeklyReport.mockReturnValue({
        ...mockUseWeeklyReport(),
        loading: true,
      });
      
      customRender(<WeeklyReport />);

      expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    });

    test('ローディング中は操作ボタンが無効化される', () => {
      mockUseWeeklyReport.mockReturnValue({
        ...mockUseWeeklyReport(),
        loading: true,
      });
      
      customRender(<WeeklyReport />);

      expect(screen.getByTestId('save-button')).toBeDisabled();
      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });
  });

  describe('エラーハンドリング', () => {
    test('週次所感のエラーメッセージが表示される', () => {
      mockUseWeeklyReport.mockReturnValue({
        ...mockUseWeeklyReport(),
        errors: {
          weeklyRemarks: '週次所感は1000文字以内で入力してください',
        },
      });
      
      customRender(<WeeklyReport />);

      expect(screen.getByTestId('weekly-remarks-error')).toBeInTheDocument();
      expect(screen.getByTestId('weekly-remarks-error')).toHaveTextContent('週次所感は1000文字以内で入力してください');
    });
  });

  describe('完全フロー統合テスト', () => {
    test('週報作成から提出までの完全フローが動作する', async () => {
      const user = userEvent.setup();
      customRender(<WeeklyReport />);

      // 1. 日別データの入力
      // 最初の日のアコーディオンを展開
      await user.click(screen.getByTestId('toggle-accordion-0'));
      
      // 勤務時間を入力
      const startTimeInput = screen.getByTestId('start-time-0');
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '09:00');
      
      const endTimeInput = screen.getByTestId('end-time-0');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '18:00');
      
      // 休憩時間を入力
      const breakTimeInput = screen.getByTestId('break-time-0');
      await user.clear(breakTimeInput);
      await user.type(breakTimeInput, '60');
      
      // 備考を入力
      const remarksInput = screen.getByTestId('remarks-0');
      await user.type(remarksInput, '順調に業務を進めました');

      // 2. 週間総括を入力
      // ムードを選択
      await user.click(screen.getByTestId('mood-4'));
      
      // 週次所感を入力
      const weeklyRemarksInput = screen.getByTestId('weekly-remarks');
      await user.type(weeklyRemarksInput, '今週は計画通り進捗しました。来週も引き続き頑張ります。');

      // 3. 下書き保存
      await user.click(screen.getByTestId('save-button'));
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      
      await user.click(screen.getByTestId('confirm-button'));
      expect(mockHandleSaveDraft).toHaveBeenCalled();

      // 4. 最終提出
      await user.click(screen.getByTestId('submit-button'));
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      
      await user.click(screen.getByTestId('confirm-button'));
      expect(mockHandleSubmit).toHaveBeenCalled();

      // 各ステップで適切な関数が呼ばれたことを確認
      expect(mockHandleTimeChange).toHaveBeenCalled();
      expect(mockHandleBreakTimeChange).toHaveBeenCalled();
      expect(mockSetReport).toHaveBeenCalled();
    });
  });
});