// DailyRecordHeaderコンポーネントのテスト

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyRecordHeader } from '@/components/features/weeklyReport/DailyRecordHeader';
import { createMockDailyRecord } from '../utils';

describe('DailyRecordHeader', () => {
  const defaultProps = {
    date: new Date('2024-01-02'),
    dayOfWeek: '火',
    isWeekend: false,
    record: createMockDailyRecord(new Date('2024-01-02')),
  };

  describe('基本表示', () => {
    test('日付と曜日が正しく表示される', () => {
      render(<DailyRecordHeader {...defaultProps} />);
      
      expect(screen.getByText('1/2')).toBeInTheDocument();
      expect(screen.getByText('(火)')).toBeInTheDocument();
    });

    test('平日は通常の文字色で表示される', () => {
      render(<DailyRecordHeader {...defaultProps} />);
      
      const dayOfWeek = screen.getByText('(火)');
      expect(dayOfWeek).toHaveStyle({ color: expect.not.stringContaining('error') });
    });

    test('週末は赤文字で表示される', () => {
      const weekendProps = {
        ...defaultProps,
        date: new Date('2024-01-06'),
        dayOfWeek: '土',
        isWeekend: true,
      };
      
      render(<DailyRecordHeader {...weekendProps} />);
      
      const dayOfWeek = screen.getByText('(土)');
      expect(dayOfWeek).toHaveClass('MuiTypography-colorError');
    });
  });

  describe('ステータスチップ表示', () => {
    test('休日出勤の場合、休日出勤チップが表示される', () => {
      const holidayWorkRecord = {
        ...defaultProps.record,
        isHolidayWork: true,
      };
      
      render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={holidayWorkRecord}
          isWeekend={true}
        />
      );
      
      expect(screen.getByText('休日出勤')).toBeInTheDocument();
    });

    test('客先作業がある場合、客先作業チップが表示される', () => {
      const clientWorkRecord = {
        ...defaultProps.record,
        hasClientWork: true,
        clientName: 'ABC株式会社',
      };
      
      render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={clientWorkRecord}
        />
      );
      
      const clientChip = screen.getByText('客先: ABC株式会社');
      expect(clientChip).toBeInTheDocument();
    });

    test('客先名がない場合、「客先作業」と表示される', () => {
      const clientWorkRecord = {
        ...defaultProps.record,
        hasClientWork: true,
        clientName: '',
      };
      
      render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={clientWorkRecord}
        />
      );
      
      expect(screen.getByText('客先作業')).toBeInTheDocument();
    });
  });

  describe('稼働時間表示', () => {
    test('勤務時間が入力されている場合、稼働時間が表示される', () => {
      const recordWithTime = {
        ...defaultProps.record,
        startTime: '09:00',
        endTime: '18:00',
        breakTime: 60,
      };
      
      render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={recordWithTime}
        />
      );
      
      expect(screen.getByText('8h')).toBeInTheDocument();
    });

    test('会社と客先の合計時間が表示される', () => {
      const recordWithBothWork = {
        ...defaultProps.record,
        startTime: '09:00',
        endTime: '13:00',
        breakTime: 0,
        hasClientWork: true,
        clientStartTime: '14:00',
        clientEndTime: '18:00',
        clientBreakTime: 0,
      };
      
      render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={recordWithBothWork}
        />
      );
      
      // 4h + 4h = 8h
      expect(screen.getByText('8h')).toBeInTheDocument();
    });

    test('勤務時間が入力されていない場合、稼働時間が表示されない', () => {
      const emptyRecord = {
        ...defaultProps.record,
        startTime: '',
        endTime: '',
      };
      
      render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={emptyRecord}
        />
      );
      
      expect(screen.queryByText(/\d+h/)).not.toBeInTheDocument();
    });

    test('小数点の稼働時間が正しく表示される', () => {
      const recordWithDecimalTime = {
        ...defaultProps.record,
        startTime: '09:00',
        endTime: '17:30',
        breakTime: 60, // 8.5h - 1h = 7.5h
      };
      
      render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={recordWithDecimalTime}
        />
      );
      
      expect(screen.getByText('7.5h')).toBeInTheDocument();
    });
  });

  describe('レイアウト', () => {
    test('コンポーネントがFlexboxレイアウトで配置されている', () => {
      const { container } = render(<DailyRecordHeader {...defaultProps} />);
      
      const header = container.firstChild;
      expect(header).toHaveStyle({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      });
    });

    test('左側に日付、右側にチップと稼働時間が配置される', () => {
      const recordWithDetails = {
        ...defaultProps.record,
        startTime: '09:00',
        endTime: '18:00',
        breakTime: 60,
        hasClientWork: true,
        clientName: 'テスト会社',
      };
      
      const { container } = render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={recordWithDetails}
        />
      );
      
      const leftSection = container.querySelector('div:first-child');
      const rightSection = container.querySelector('div:last-child');
      
      expect(leftSection).toHaveTextContent('1/2');
      expect(rightSection).toHaveTextContent('客先: テスト会社');
      expect(rightSection).toHaveTextContent('8h');
    });
  });

  describe('エッジケース', () => {
    test('不正な時刻でもクラッシュしない', () => {
      const invalidRecord = {
        ...defaultProps.record,
        startTime: 'invalid',
        endTime: '25:99',
      };
      
      expect(() => {
        render(
          <DailyRecordHeader 
            {...defaultProps} 
            record={invalidRecord}
          />
        );
      }).not.toThrow();
    });

    test('終了時刻が開始時刻より前でも表示される', () => {
      const reversedTimeRecord = {
        ...defaultProps.record,
        startTime: '18:00',
        endTime: '09:00',
        breakTime: 0,
      };
      
      render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={reversedTimeRecord}
        />
      );
      
      // 負の時間やエラーではなく、0または適切な値が表示される
      expect(screen.getByText(/\d+(\.\d+)?h|^$/)).toBeInTheDocument();
    });

    test('休憩時間が勤務時間より長い場合でも表示される', () => {
      const longBreakRecord = {
        ...defaultProps.record,
        startTime: '09:00',
        endTime: '10:00', // 1時間勤務
        breakTime: 120, // 2時間休憩
      };
      
      render(
        <DailyRecordHeader 
          {...defaultProps} 
          record={longBreakRecord}
        />
      );
      
      // エラーにならずに表示される（0または適切な値）
      expect(() => screen.getByText(/h/)).not.toThrow();
    });
  });
});