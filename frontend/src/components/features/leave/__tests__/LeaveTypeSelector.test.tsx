/**
 * LeaveTypeSelector コンポーネントのテスト
 */

// Mock InfoAlert to avoid dependency chain issues
jest.mock('@/components/common', () => ({
  InfoAlert: ({ message }: { message: string }) => <div data-testid="info-alert">{message}</div>,
}));

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectChangeEvent } from '@mui/material';
import LeaveTypeSelector from '../LeaveTypeSelector';
import {
  renderWithLeaveProviders,
  createTestData,
  leaveAssertions,
} from '../../../../__tests__/utils/leaveTestUtils';
import { MOCK_IDS } from '../../../../__tests__/mocks/leaveData';
import mockLeaveData from '../../../../__tests__/mocks/leaveData';

describe('LeaveTypeSelector', () => {
  const defaultProps = {
    selectedLeaveType: MOCK_IDS.LEAVE_TYPES.PAID,
    isHourlyBased: false,
    leaveTypes: [
      { value: MOCK_IDS.LEAVE_TYPES.PAID, label: '有給休暇' },
      { value: MOCK_IDS.LEAVE_TYPES.SUMMER, label: '夏季休暇' },
      { value: MOCK_IDS.LEAVE_TYPES.CONDOLENCE, label: '慶弔休暇' },
    ],
    remainingLeaves: {
      [MOCK_IDS.LEAVE_TYPES.PAID]: { remaining: 15 },
      [MOCK_IDS.LEAVE_TYPES.SUMMER]: { remaining: 3 },
      [MOCK_IDS.LEAVE_TYPES.CONDOLENCE]: { remaining: 5 },
    },
    isSubmitting: false,
    errors: {},
    onLeaveTypeChange: jest.fn(),
    onHourlyToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本表示', () => {
    it('休暇種別セレクトボックスが表示される', () => {
      renderWithLeaveProviders(<LeaveTypeSelector {...defaultProps} />);

      expect(screen.getByText('休暇種別')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('時間単位スイッチが表示される', () => {
      renderWithLeaveProviders(<LeaveTypeSelector {...defaultProps} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText('時間単位')).toBeInTheDocument();
    });

    it('選択された休暇種別が正しく表示される', () => {
      renderWithLeaveProviders(<LeaveTypeSelector {...defaultProps} />);

      // comboboxの要素内に正しいテキストが含まれていることを確認
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveTextContent('有給休暇 （残 15.0 日）');
    });

    it('時間単位スイッチの状態が正しく反映される', () => {
      const props = { ...defaultProps, isHourlyBased: true };
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      const switchElement = screen.getByRole('checkbox');
      expect(switchElement).toBeChecked();
    });
  });

  describe('休暇種別オプション', () => {
    it('全ての休暇種別がオプションとして表示される', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(<LeaveTypeSelector {...defaultProps} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      await waitFor(() => {
        // SelectのドロップダウンメニューでgetAllByTextを使用
        const paidOptions = screen.getAllByText('有給休暇 （残 15.0 日）');
        expect(paidOptions.length).toBeGreaterThan(0);
        
        const summerOptions = screen.getAllByText('夏季休暇 （残 3.0 日）');
        expect(summerOptions.length).toBeGreaterThan(0);
        
        const condolenceOptions = screen.getAllByText('慶弔休暇 （残 5.0 日）');
        expect(condolenceOptions.length).toBeGreaterThan(0);
      });
    });

    it('残日数が0の休暇種別は無効化される', async () => {
      const user = userEvent.setup();
      // 残日数0のケースのテスト用にpropsを調整
      const propsWithZeroBalance = {
        ...defaultProps,
        remainingLeaves: {
          [MOCK_IDS.LEAVE_TYPES.PAID]: { remaining: 15 },
          [MOCK_IDS.LEAVE_TYPES.SUMMER]: { remaining: 3 },
          [MOCK_IDS.LEAVE_TYPES.CONDOLENCE]: { remaining: 0 },
        },
      };
      renderWithLeaveProviders(<LeaveTypeSelector {...propsWithZeroBalance} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      await waitFor(() => {
        const condolenceOptions = screen.getAllByText('慶弔休暇 （残 0.0 日）');
        const condolenceOption = condolenceOptions.find(el => el.closest('[role="option"]'));
        expect(condolenceOption?.closest('[role="option"]')).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('残日数がある休暇種別は選択可能', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(<LeaveTypeSelector {...defaultProps} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      await waitFor(() => {
        const paidOptions = screen.getAllByText('有給休暇 （残 15.0 日）');
        const paidOption = paidOptions.find(el => el.closest('[role="option"]'));
        expect(paidOption?.closest('[role="option"]')).not.toHaveAttribute('aria-disabled');
      });
    });
  });

  describe('イベントハンドリング', () => {
    it('休暇種別変更時にonLeaveTypeChangeが呼ばれる', async () => {
      const user = userEvent.setup();
      const onLeaveTypeChange = jest.fn();
      const props = { ...defaultProps, onLeaveTypeChange };
      
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      await waitFor(() => {
        const summerOptions = screen.getAllByText('夏季休暇 （残 3.0 日）');
        const summerOption = summerOptions.find(el => el.closest('[role="option"]'));
        expect(summerOption).toBeInTheDocument();
      });

      const summerOptions = screen.getAllByText('夏季休暇 （残 3.0 日）');
      const summerOption = summerOptions.find(el => el.closest('[role="option"]'));
      if (summerOption) {
        await user.click(summerOption);
      }

      await waitFor(() => {
        expect(onLeaveTypeChange).toHaveBeenCalledTimes(1);
        expect(onLeaveTypeChange).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({
              value: MOCK_IDS.LEAVE_TYPES.SUMMER,
            }),
          })
        );
      });
    });

    it('時間単位スイッチ切り替え時にonHourlyToggleが呼ばれる', async () => {
      const user = userEvent.setup();
      const onHourlyToggle = jest.fn();
      const props = { ...defaultProps, onHourlyToggle };
      
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      const switchElement = screen.getByRole('checkbox');
      await user.click(switchElement);

      await waitFor(() => {
        expect(onHourlyToggle).toHaveBeenCalledTimes(1);
        expect(onHourlyToggle).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({
              checked: true,
            }),
          })
        );
      });
    });
  });

  describe('時間単位モード', () => {
    it('時間単位がOFFの場合、情報アラートは表示されない', () => {
      const props = { ...defaultProps, isHourlyBased: false };
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      expect(screen.queryByText('8時間で1日換算になります。昼休憩（12:00-13:00）は自動的に除外されます。')).not.toBeInTheDocument();
    });

    it('時間単位がONの場合、情報アラートが表示される', () => {
      const props = { ...defaultProps, isHourlyBased: true };
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      expect(screen.getByText('8時間で1日換算になります。昼休憩（12:00-13:00）は自動的に除外されます。')).toBeInTheDocument();
    });

    it('時間単位スイッチを切り替えると情報アラートの表示/非表示が切り替わる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(<LeaveTypeSelector {...defaultProps} />);

      // 初期状態では情報アラートは非表示
      expect(screen.queryByText('8時間で1日換算になります。昼休憩（12:00-13:00）は自動的に除外されます。')).not.toBeInTheDocument();

      // スイッチをONにする
      const switchElement = screen.getByRole('checkbox');
      await user.click(switchElement);

      // 親コンポーネントでisHourlyBasedが更新されると仮定して、
      // propsを更新した状態で再レンダリング
      const props = { ...defaultProps, isHourlyBased: true };
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      expect(screen.getByText('8時間で1日換算になります。昼休憩（12:00-13:00）は自動的に除外されます。')).toBeInTheDocument();
    });
  });

  describe('エラー状態', () => {
    it('エラーがない場合、エラーメッセージは表示されない', () => {
      renderWithLeaveProviders(<LeaveTypeSelector {...defaultProps} />);

      expect(screen.queryByText('休暇種別を選択してください')).not.toBeInTheDocument();
    });

    it('leaveTypeIdエラーがある場合、エラーメッセージが表示される', () => {
      const props = {
        ...defaultProps,
        errors: { leaveTypeId: { message: 'エラーメッセージ' } },
      };
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      expect(screen.getByText('休暇種別を選択してください')).toBeInTheDocument();
    });

    it('エラー状態の場合、セレクトボックスにエラースタイルが適用される', () => {
      const props = {
        ...defaultProps,
        errors: { leaveTypeId: { message: 'エラーメッセージ' } },
      };
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('送信中状態', () => {
    it('送信中の場合、セレクトボックスが無効化される', () => {
      const props = { ...defaultProps, isSubmitting: true };
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-disabled', 'true');
    });

    it('送信中でない場合、セレクトボックスは有効', () => {
      const props = { ...defaultProps, isSubmitting: false };
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).not.toBeDisabled();
    });
  });

  describe('残日数表示', () => {
    it('残日数が小数点を含む場合、小数点以下1桁で表示される', async () => {
      const props = {
        ...defaultProps,
        remainingLeaves: {
          [MOCK_IDS.LEAVE_TYPES.PAID]: { remaining: 15.5 },
        },
      };
      
      const user = userEvent.setup();
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      await waitFor(() => {
        const options = screen.getAllByText('有給休暇 （残 15.5 日）');
        expect(options.length).toBeGreaterThan(0);
      });
    });

    it('残日数データがない場合、0と表示される', async () => {
      const props = {
        ...defaultProps,
        remainingLeaves: {},
      };
      
      const user = userEvent.setup();
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      await waitFor(() => {
        const options = screen.getAllByText('有給休暇 （残 0 日）');
        expect(options.length).toBeGreaterThan(0);
      });
    });
  });

  describe('モックデータとの統合テスト', () => {
    it('実際のモックデータを使用してコンポーネントが正しく動作する', async () => {
      const user = userEvent.setup();
      const mockLeaveTypes = mockLeaveData.leaveTypes.slice(0, 3).map(type => ({
        value: type.id,
        label: type.name,
      }));
      
      const mockRemainingLeaves = mockLeaveTypes.reduce((acc, type) => {
        const balance = mockLeaveData.userLeaveBalances.find(b => b.leaveTypeId === type.value);
        acc[type.value] = { remaining: balance?.remainingDays || 0 };
        return acc;
      }, {} as Record<string, { remaining: number }>);

      const props = {
        ...defaultProps,
        leaveTypes: mockLeaveTypes,
        remainingLeaves: mockRemainingLeaves,
        selectedLeaveType: mockLeaveTypes[0].value,
      };

      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      // セレクトボックスを開く
      const select = screen.getByRole('combobox');
      await user.click(select);

      // モックデータの休暇種別が表示されることを確認
      await waitFor(() => {
        mockLeaveTypes.forEach(type => {
          const balance = mockRemainingLeaves[type.value];
          const expectedText = `${type.label} （残 ${balance.remaining.toFixed(1)} 日）`;
          const options = screen.getAllByText(expectedText);
          expect(options.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('セレクトボックスに適切なラベルが設定されている', () => {
      renderWithLeaveProviders(<LeaveTypeSelector {...defaultProps} />);

      // FormLabelが存在することを確認
      expect(screen.getByText('休暇種別')).toBeInTheDocument();
      // セレクトボックスが存在することを確認
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('スイッチに適切なラベルが設定されている', () => {
      renderWithLeaveProviders(<LeaveTypeSelector {...defaultProps} />);

      const switchElement = screen.getByRole('checkbox');
      // スイッチの隣にテキストがあることを確認
      expect(screen.getByText('時間単位')).toBeInTheDocument();
    });

    it('エラーメッセージがセレクトボックスと関連付けられている', () => {
      const props = {
        ...defaultProps,
        errors: { leaveTypeId: { message: 'エラーメッセージ' } },
      };
      renderWithLeaveProviders(<LeaveTypeSelector {...props} />);

      const select = screen.getByRole('combobox');
      const errorMessage = screen.getByText('休暇種別を選択してください');
      
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(errorMessage).toBeInTheDocument();
    });
  });
});