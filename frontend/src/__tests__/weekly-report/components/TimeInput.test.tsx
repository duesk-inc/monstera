// 時刻入力コンポーネントのテスト

import React from 'react';
import { screen } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanyTimeInput } from '@/components/features/weeklyReport/CompanyTimeInput';
import { ClientTimeInput } from '@/components/features/weeklyReport/ClientTimeInput';
import { customRender, createMockDailyRecord } from '../utils';

// TimePicker モックの設定
jest.mock('@mui/x-date-pickers/TimePicker', () => ({
  TimePicker: ({ 
    label, 
    value, 
    onChange, 
    disabled,
    ...props 
  }: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const timeValue = e.target.value;
      if (onChange && timeValue) {
        // 時刻文字列を Date オブジェクトに変換
        const [hours, minutes] = timeValue.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        onChange(date);
      }
    };

    return (
      <input
        type="time"
        aria-label={label}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        data-testid={`time-picker-${label}`}
        {...props}
      />
    );
  },
}));

describe('CompanyTimeInput', () => {
  const defaultProps = {
    record: createMockDailyRecord(new Date('2024-01-02')),
    disabled: false,
    onTimeChange: jest.fn(),
    onBreakTimeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    test('会社勤務の入力フィールドが表示される', () => {
      customRender(<CompanyTimeInput {...defaultProps} />);
      
      expect(screen.getByLabelText('開始時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('終了時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('休憩時間（分）')).toBeInTheDocument();
    });

    test('初期値が正しく設定される', () => {
      const recordWithTime = {
        ...defaultProps.record,
        companyStartTime: '09:00',
        companyEndTime: '18:00',
        companyBreakMinutes: 60,
      };
      
      customRender(
        <CompanyTimeInput 
          {...defaultProps} 
          record={recordWithTime}
        />
      );
      
      expect(screen.getByLabelText('開始時刻')).toHaveValue('09:00');
      expect(screen.getByLabelText('終了時刻')).toHaveValue('18:00');
      expect(screen.getByLabelText('休憩時間（分）')).toHaveValue('60');
    });

    test('フィールドがグリッドレイアウトで配置される', () => {
      const { container } = customRender(<CompanyTimeInput {...defaultProps} />);
      
      const grid = container.querySelector('.MuiGrid-container');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('入力操作', () => {
    test('開始時刻の変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<CompanyTimeInput {...defaultProps} />);
      
      const startTimeInput = screen.getByLabelText('開始時刻');
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '10:30');
      
      await waitFor(() => {
        expect(defaultProps.onTimeChange).toHaveBeenCalledWith(
          'companyStartTime',
          expect.any(Date)
        );
      });
    });

    test('終了時刻の変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<CompanyTimeInput {...defaultProps} />);
      
      const endTimeInput = screen.getByLabelText('終了時刻');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '19:00');
      
      await waitFor(() => {
        expect(defaultProps.onTimeChange).toHaveBeenCalledWith(
          'companyEndTime',
          expect.any(Date)
        );
      });
    });

    test('休憩時間の変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<CompanyTimeInput {...defaultProps} />);
      
      const breakTimeInput = screen.getByLabelText('休憩時間（分）');
      await user.clear(breakTimeInput);
      await user.type(breakTimeInput, '90');
      
      await waitFor(() => {
        expect(defaultProps.onBreakTimeChange).toHaveBeenCalledWith('90');
      });
    });

    test('空の値でもハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      const recordWithTime = {
        ...defaultProps.record,
        companyBreakMinutes: 60,
      };
      
      customRender(
        <CompanyTimeInput 
          {...defaultProps} 
          record={recordWithTime}
        />
      );
      
      const breakTimeInput = screen.getByLabelText('休憩時間（分）');
      await user.clear(breakTimeInput);
      
      await waitFor(() => {
        expect(defaultProps.onBreakTimeChange).toHaveBeenCalledWith('');
      });
    });
  });

  describe('無効化状態', () => {
    test('disabled=trueの場合、全フィールドが無効化される', () => {
      customRender(
        <CompanyTimeInput 
          {...defaultProps} 
          disabled={true}
        />
      );
      
      expect(screen.getByLabelText('開始時刻')).toBeDisabled();
      expect(screen.getByLabelText('終了時刻')).toBeDisabled();
      expect(screen.getByLabelText('休憩時間（分）')).toBeDisabled();
    });

    test('無効化状態でも値は表示される', () => {
      const recordWithTime = {
        ...defaultProps.record,
        companyStartTime: '09:00',
        companyEndTime: '18:00',
        companyBreakMinutes: 60,
      };
      
      customRender(
        <CompanyTimeInput 
          {...defaultProps} 
          record={recordWithTime}
          disabled={true}
        />
      );
      
      expect(screen.getByLabelText('開始時刻')).toHaveValue('09:00');
      expect(screen.getByLabelText('終了時刻')).toHaveValue('18:00');
      expect(screen.getByLabelText('休憩時間（分）')).toHaveValue('60');
    });
  });

  describe('バリデーション', () => {
    test('休憩時間に数値以外が入力された場合の処理', async () => {
      const user = userEvent.setup();
      customRender(<CompanyTimeInput {...defaultProps} />);
      
      const breakTimeInput = screen.getByLabelText('休憩時間（分）');
      await user.type(breakTimeInput, 'abc');
      
      // 数値以外は入力できない（HTML5のnumber inputの動作）
      expect(breakTimeInput).toHaveValue(null);
    });

    test('負の休憩時間が入力できる', async () => {
      const user = userEvent.setup();
      customRender(<CompanyTimeInput {...defaultProps} />);
      
      const breakTimeInput = screen.getByLabelText('休憩時間（分）');
      await user.type(breakTimeInput, '-30');
      
      await waitFor(() => {
        expect(defaultProps.onBreakTimeChange).toHaveBeenCalledWith('-30');
      });
    });
  });
});

describe('ClientTimeInput', () => {
  const defaultProps = {
    record: {
      ...createMockDailyRecord(new Date('2024-01-02')),
      hasClientWork: true,
    },
    disabled: false,
    onTimeChange: jest.fn(),
    onBreakTimeChange: jest.fn(),
    onClientNameChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    test('客先勤務の入力フィールドが表示される', () => {
      customRender(<ClientTimeInput {...defaultProps} />);
      
      expect(screen.getByLabelText('客先名')).toBeInTheDocument();
      expect(screen.getByLabelText('客先開始時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('客先終了時刻')).toBeInTheDocument();
      expect(screen.getByLabelText('客先休憩時間（分）')).toBeInTheDocument();
    });

    test('初期値が正しく設定される', () => {
      const recordWithClientWork = {
        ...defaultProps.record,
        clientName: 'ABC株式会社',
        clientStartTime: '14:00',
        clientEndTime: '18:00',
        clientBreakMinutes: 30,
      };
      
      customRender(
        <ClientTimeInput 
          {...defaultProps} 
          record={recordWithClientWork}
        />
      );
      
      expect(screen.getByLabelText('客先名')).toHaveValue('ABC株式会社');
      expect(screen.getByLabelText('客先開始時刻')).toHaveValue('14:00');
      expect(screen.getByLabelText('客先終了時刻')).toHaveValue('18:00');
      expect(screen.getByLabelText('客先休憩時間（分）')).toHaveValue('30');
    });
  });

  describe('入力操作', () => {
    test('客先名の変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<ClientTimeInput {...defaultProps} />);
      
      const clientNameInput = screen.getByLabelText('客先名');
      await user.type(clientNameInput, 'テスト会社');
      
      await waitFor(() => {
        expect(defaultProps.onClientNameChange).toHaveBeenCalled();
      });
    });

    test('客先開始時刻の変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<ClientTimeInput {...defaultProps} />);
      
      const startTimeInput = screen.getByLabelText('客先開始時刻');
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '13:00');
      
      await waitFor(() => {
        expect(defaultProps.onTimeChange).toHaveBeenCalledWith(
          'clientStartTime',
          expect.any(Date)
        );
      });
    });

    test('客先終了時刻の変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<ClientTimeInput {...defaultProps} />);
      
      const endTimeInput = screen.getByLabelText('客先終了時刻');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '17:30');
      
      await waitFor(() => {
        expect(defaultProps.onTimeChange).toHaveBeenCalledWith(
          'clientEndTime',
          expect.any(Date)
        );
      });
    });

    test('客先休憩時間の変更でハンドラーが呼ばれる', async () => {
      const user = userEvent.setup();
      customRender(<ClientTimeInput {...defaultProps} />);
      
      const breakTimeInput = screen.getByLabelText('客先休憩時間（分）');
      await user.clear(breakTimeInput);
      await user.type(breakTimeInput, '45');
      
      await waitFor(() => {
        expect(defaultProps.onBreakTimeChange).toHaveBeenCalledWith('45');
      });
    });
  });

  describe('条件付き表示', () => {
    test('客先作業がない場合は表示されない', () => {
      const recordWithoutClientWork = {
        ...defaultProps.record,
        hasClientWork: false,
      };
      
      const { container } = customRender(
        <ClientTimeInput 
          {...defaultProps} 
          record={recordWithoutClientWork}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    test('客先作業ありの場合のみ表示される', () => {
      customRender(<ClientTimeInput {...defaultProps} />);
      
      expect(screen.getByLabelText('客先名')).toBeInTheDocument();
    });
  });

  describe('無効化状態', () => {
    test('disabled=trueの場合、全フィールドが無効化される', () => {
      customRender(
        <ClientTimeInput 
          {...defaultProps} 
          disabled={true}
        />
      );
      
      expect(screen.getByLabelText('客先名')).toBeDisabled();
      expect(screen.getByLabelText('客先開始時刻')).toBeDisabled();
      expect(screen.getByLabelText('客先終了時刻')).toBeDisabled();
      expect(screen.getByLabelText('客先休憩時間（分）')).toBeDisabled();
    });
  });

  describe('レイアウト', () => {
    test('セクションタイトルが表示される', () => {
      customRender(<ClientTimeInput {...defaultProps} />);
      
      expect(screen.getByText('客先作業')).toBeInTheDocument();
    });

    test('グリッドレイアウトで配置される', () => {
      const { container } = customRender(<ClientTimeInput {...defaultProps} />);
      
      const grids = container.querySelectorAll('.MuiGrid-container');
      expect(grids.length).toBeGreaterThan(0);
    });
  });
});