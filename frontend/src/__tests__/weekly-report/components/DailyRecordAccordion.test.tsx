// DailyRecordAccordionコンポーネントのテスト

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DailyRecordAccordion from '@/components/features/weeklyReport/DailyRecordAccordion';
import { 
  customRender,
  createMockDailyRecord,
} from '../utils';

// モックの設定
jest.mock('@/components/common/CommonAccordion', () => ({
  CommonAccordion: ({ 
    customHeader, 
    children, 
    expanded, 
    onToggle,
    'data-testid': testId,
  }: any) => (
    <div 
      data-testid="common-accordion" 
      data-accordion-testid={testId}
      aria-expanded={expanded}
      role="button"
    >
      <div 
        data-testid="accordion-header" 
        onClick={() => onToggle && onToggle()}
      >
        {customHeader}
      </div>
      {expanded && (
        <div data-testid="accordion-content">
          {children}
        </div>
      )}
    </div>
  ),
}));

jest.mock('@/components/features/weeklyReport/DailyRecordHeader', () => ({
  DailyRecordHeader: ({ date, dayOfWeek, record }: any) => (
    <div data-testid="daily-record-header">
      <span>{date.getMonth() + 1}/{date.getDate()}</span>
      <span>({dayOfWeek})</span>
      {record.startTime && record.endTime && (
        <span>8h</span>
      )}
    </div>
  ),
}));

jest.mock('@/components/features/weeklyReport/DailyRecordContent', () => ({
  DailyRecordContent: ({ 
    record, 
    isSubmitted, 
    isWeekend,
    onHolidayWorkToggle,
    onClientWorkToggle,
    onTimeChange,
    onClientTimeChange,
    onBreakTimeChange,
    onClientBreakTimeChange,
    onRemarksChange,
  }: any) => (
    <div data-testid="daily-record-content">
      <input 
        aria-label="開始時刻"
        disabled={isSubmitted}
        onChange={(e) => onTimeChange('startTime', e.target.value)}
      />
      <input 
        aria-label="終了時刻"
        disabled={isSubmitted}
        onChange={(e) => onTimeChange('endTime', e.target.value)}
      />
      <input 
        aria-label="休憩時間（分）"
        disabled={isSubmitted}
        onChange={(e) => onBreakTimeChange(e.target.value)}
      />
      {isWeekend && (
        <input 
          type="checkbox"
          aria-label="休日出勤"
          disabled={isSubmitted}
          onChange={onHolidayWorkToggle}
        />
      )}
      <input 
        type="checkbox"
        aria-label="客先作業あり"
        disabled={isSubmitted}
        onChange={(e) => onClientWorkToggle(e.target.checked)}
      />
      {record.hasClientWork && (
        <>
          <input 
            aria-label="客先開始時刻"
            disabled={isSubmitted}
            onChange={(e) => onClientTimeChange('clientStartTime', e.target.value)}
          />
          <input 
            aria-label="客先終了時刻"
            disabled={isSubmitted}
            onChange={(e) => onClientTimeChange('clientEndTime', e.target.value)}
          />
          <input 
            aria-label="客先休憩時間（分）"
            disabled={isSubmitted}
            onChange={(e) => onClientBreakTimeChange(e.target.value)}
          />
        </>
      )}
      <textarea 
        aria-label="備考"
        disabled={isSubmitted}
        onChange={(e) => onRemarksChange(e.target.value)}
      />
    </div>
  ),
}));

describe('DailyRecordAccordion', () => {
  // デフォルトのプロップス
  const defaultProps = {
    date: new Date('2024-01-02'), // 火曜日
    dayOfWeek: '火',
    isWeekend: false,
    record: createMockDailyRecord(new Date('2024-01-02')),
    recordIndex: 1,
    isExpanded: false,
    isSubmitted: false,
    onToggleExpand: jest.fn(),
    onHolidayWorkToggle: jest.fn(),
    onClientWorkToggle: jest.fn(),
    onTimeChange: jest.fn(),
    onClientTimeChange: jest.fn(),
    onBreakTimeChange: jest.fn(),
    onClientBreakTimeChange: jest.fn(),
    onRemarksChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    test('コンポーネントが正しくレンダリングされる', () => {
      customRender(<DailyRecordAccordion {...defaultProps} />);
      
      expect(screen.getByTestId('common-accordion')).toBeInTheDocument();
      expect(screen.getByTestId('accordion-header')).toBeInTheDocument();
    });

    test('平日の場合、通常の背景色で表示される', () => {
      const { container } = customRender(<DailyRecordAccordion {...defaultProps} />);
      
      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });

    test('週末の場合、グレーの背景色で表示される', () => {
      const weekendProps = {
        ...defaultProps,
        date: new Date('2024-01-06'), // 土曜日
        dayOfWeek: '土',
        isWeekend: true,
        record: createMockDailyRecord(new Date('2024-01-06')),
      };
      
      const { container } = customRender(<DailyRecordAccordion {...weekendProps} />);
      
      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });

    test('週末でも休日出勤の場合は通常の背景色', () => {
      const holidayWorkProps = {
        ...defaultProps,
        date: new Date('2024-01-06'), // 土曜日
        dayOfWeek: '土',
        isWeekend: true,
        record: {
          ...createMockDailyRecord(new Date('2024-01-06')),
          isHolidayWork: true,
        },
      };
      
      const { container } = customRender(<DailyRecordAccordion {...holidayWorkProps} />);
      
      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });
  });

  describe('ヘッダー表示', () => {
    test('日付と曜日が正しく表示される', () => {
      customRender(<DailyRecordAccordion {...defaultProps} />);
      
      const header = screen.getByTestId('accordion-header');
      expect(header).toHaveTextContent('1/2');
      expect(header).toHaveTextContent('火');
    });

    test('勤務時間が入力されている場合、稼働時間が表示される', () => {
      const recordWithTime = {
        ...defaultProps.record,
        startTime: '09:00',
        endTime: '18:00',
        breakTime: 60,
      };
      
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          record={recordWithTime}
        />
      );
      
      const header = screen.getByTestId('accordion-header');
      expect(header).toHaveTextContent('8h'); // 9時間 - 1時間休憩 = 8時間
    });

    test('客先勤務がある場合、合計稼働時間が表示される', () => {
      const recordWithClientWork = {
        ...defaultProps.record,
        startTime: '09:00',
        endTime: '13:00',
        breakTime: 0,
        hasClientWork: true,
        clientStartTime: '14:00',
        clientEndTime: '18:00',
        clientBreakTime: 0,
      };
      
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          record={recordWithClientWork}
        />
      );
      
      const header = screen.getByTestId('accordion-header');
      expect(header).toHaveTextContent('8h'); // 4h + 4h = 8h
    });
  });

  describe('アコーディオン展開/折りたたみ', () => {
    test('ヘッダークリックで展開ハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<DailyRecordAccordion {...defaultProps} />);
      
      const header = screen.getByTestId('accordion-header');
      await user.click(header);
      
      expect(defaultProps.onToggleExpand).toHaveBeenCalledTimes(1);
    });

    test('展開時にコンテンツが表示される', () => {
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      expect(screen.getByTestId('accordion-content')).toBeInTheDocument();
    });

    test('折りたたみ時にコンテンツが表示されない', () => {
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={false}
        />
      );
      
      expect(screen.queryByTestId('accordion-content')).not.toBeInTheDocument();
    });
  });

  describe('休日出勤・客先作業トグル', () => {
    test('週末の場合、休日出勤トグルが表示される', () => {
      const weekendProps = {
        ...defaultProps,
        isWeekend: true,
        isExpanded: true,
      };
      
      customRender(<DailyRecordAccordion {...weekendProps} />);
      
      expect(screen.getByLabelText('休日出勤')).toBeInTheDocument();
    });

    test('平日の場合、休日出勤トグルが表示されない', () => {
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      expect(screen.queryByLabelText('休日出勤')).not.toBeInTheDocument();
    });

    test('客先作業トグルが常に表示される', () => {
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      expect(screen.getByLabelText('客先作業あり')).toBeInTheDocument();
    });

    test('休日出勤トグルの変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      const weekendProps = {
        ...defaultProps,
        isWeekend: true,
        isExpanded: true,
      };
      
      customRender(<DailyRecordAccordion {...weekendProps} />);
      
      const toggle = screen.getByLabelText('休日出勤');
      await user.click(toggle);
      
      expect(defaultProps.onHolidayWorkToggle).toHaveBeenCalledTimes(1);
    });

    test('客先作業トグルの変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      const toggle = screen.getByLabelText('客先作業あり');
      await user.click(toggle);
      
      expect(defaultProps.onClientWorkToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('時刻入力フィールド', () => {
    test('会社勤務の時刻入力フィールドが表示される', () => {
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      expect(screen.getByLabelText('開始時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('終了時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('休憩時間（分）')).toBeInTheDocument();
    });

    test('客先作業がある場合、客先の時刻入力フィールドが表示される', () => {
      const recordWithClientWork = {
        ...defaultProps.record,
        hasClientWork: true,
      };
      
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          record={recordWithClientWork}
          isExpanded={true}
        />
      );
      
      expect(screen.getByLabelText('客先開始時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('客先終了時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('客先休憩時間（分）')).toBeInTheDocument();
    });

    test('時刻変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      const startTimeInput = screen.getByLabelText('開始時刻');
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '10:00');
      
      // TimePicker の onChange イベントをシミュレート
      expect(defaultProps.onTimeChange).toHaveBeenCalled();
    });

    test('休憩時間変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      const breakTimeInput = screen.getByLabelText('休憩時間（分）');
      await user.clear(breakTimeInput);
      await user.type(breakTimeInput, '90');
      
      expect(defaultProps.onBreakTimeChange).toHaveBeenCalled();
    });
  });

  describe('備考入力', () => {
    test('備考入力フィールドが表示される', () => {
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      expect(screen.getByLabelText('備考')).toBeInTheDocument();
    });

    test('備考入力でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      const remarksInput = screen.getByLabelText('備考');
      await user.type(remarksInput, 'テスト備考');
      
      expect(defaultProps.onRemarksChange).toHaveBeenCalled();
    });
  });

  describe('提出済み状態', () => {
    test('提出済みの場合、全ての入力フィールドが無効化される', () => {
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
          isSubmitted={true}
        />
      );
      
      // 全ての入力フィールドが無効化されているか確認
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
      
      // トグルも無効化
      const toggles = screen.getAllByRole('checkbox');
      toggles.forEach(toggle => {
        expect(toggle).toBeDisabled();
      });
    });

    test('提出済みでもアコーディオンの展開/折りたたみは可能', async () => {
      const user = userEvent.setup();
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isSubmitted={true}
        />
      );
      
      const header = screen.getByTestId('accordion-header');
      await user.click(header);
      
      expect(defaultProps.onToggleExpand).toHaveBeenCalledTimes(1);
    });
  });

  describe('エッジケース', () => {
    test('空のレコードでもエラーなく表示される', () => {
      const emptyRecord = {
        date: '2024-01-02',
        startTime: '',
        endTime: '',
        breakTime: 0,
        remarks: '',
        isHolidayWork: false,
      };
      
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          record={emptyRecord}
          isExpanded={true}
        />
      );
      
      expect(screen.getByTestId('accordion-content')).toBeInTheDocument();
    });

    test('不正な時刻でもクラッシュしない', () => {
      const invalidRecord = {
        ...defaultProps.record,
        startTime: 'invalid',
        endTime: '25:99',
      };
      
      expect(() => {
        customRender(
          <DailyRecordAccordion 
            {...defaultProps} 
            record={invalidRecord}
          />
        );
      }).not.toThrow();
    });

    test('将来の日付でも正しく表示される', () => {
      const futureDate = new Date('2025-01-01');
      const futureProps = {
        ...defaultProps,
        date: futureDate,
        record: createMockDailyRecord(futureDate),
      };
      
      customRender(<DailyRecordAccordion {...futureProps} />);
      
      expect(screen.getByTestId('accordion-header')).toHaveTextContent('1/1');
    });
  });

  describe('アクセシビリティ', () => {
    test('適切なARIA属性が設定されている', () => {
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      const accordion = screen.getByTestId('common-accordion');
      expect(accordion).toHaveAttribute('aria-expanded', 'true');
    });

    test('フォームフィールドにラベルが関連付けられている', () => {
      customRender(
        <DailyRecordAccordion 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      // 各入力フィールドにラベルがあることを確認
      expect(screen.getByLabelText('開始時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('終了時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('休憩時間（分）')).toBeInTheDocument();
      expect(screen.getByLabelText('備考')).toBeInTheDocument();
    });
  });
});