/**
 * LeaveTimeSelector コンポーネントのテスト
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import LeaveTimeSelector from '../LeaveTimeSelector';
import { renderWithLeaveProviders } from '../../../../__tests__/utils/leaveTestUtils';
import { AttendanceFormData } from '../../../../types/leave';

// 定数をモック
jest.mock('@/constants/defaultWorkTime', () => ({
  DEFAULT_WORK_TIME: {
    START_TIME: '09:00',
    END_TIME: '18:00',
    BREAK: 1.0,
  }
}));

jest.mock('@/constants/ui', () => ({
  TIME_PICKER: {
    STEP_MINUTES: 5,
    STEP_SECONDS: 300,
  }
}));

// テスト用のラッパーコンポーネント
const TestWrapper = ({ 
  isHourlyBased, 
  defaultStartTime = '09:00',
  defaultEndTime = '18:00'
}: { 
  isHourlyBased: boolean;
  defaultStartTime?: string;
  defaultEndTime?: string;
}) => {
  const { register, formState: { errors } } = useForm<AttendanceFormData>({
    defaultValues: {
      leaveTypeId: '',
      selectedDates: [],
      isHourlyBased: false,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      reason: '',
    },
  });

  return (
    <LeaveTimeSelector
      isHourlyBased={isHourlyBased}
      register={register}
      errors={errors}
    />
  );
};

describe('LeaveTimeSelector', () => {
  describe('表示制御', () => {
    it('時間単位でない場合、フィールドが表示されない', () => {
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={false} />
      );

      expect(screen.queryByText('開始時間')).not.toBeInTheDocument();
      expect(screen.queryByText('終了時間')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('09:00')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('18:00')).not.toBeInTheDocument();
    });

    it('時間単位の場合、両方のフィールドが表示される', () => {
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );

      expect(screen.getByText('開始時間')).toBeInTheDocument();
      expect(screen.getByText('終了時間')).toBeInTheDocument();
    });
  });

  describe('フィールドの基本表示', () => {
    beforeEach(() => {
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );
    });

    it('開始時間のラベルとフィールドが表示される', () => {
      expect(screen.getByText('開始時間')).toBeInTheDocument();
      const startTimeInputs = screen.getAllByDisplayValue('09:00');
      expect(startTimeInputs.length).toBeGreaterThan(0);
    });

    it('終了時間のラベルとフィールドが表示される', () => {
      expect(screen.getByText('終了時間')).toBeInTheDocument();
      const endTimeInputs = screen.getAllByDisplayValue('18:00');
      expect(endTimeInputs.length).toBeGreaterThan(0);
    });

    it('time型の入力フィールドが設定されている', () => {
      const timeInputs = screen.getAllByDisplayValue(/^[0-9]{2}:[0-9]{2}$/);
      timeInputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'time');
      });
    });

    it('ステップ属性が正しく設定されている', () => {
      const timeInputs = screen.getAllByDisplayValue(/^[0-9]{2}:[0-9]{2}$/);
      timeInputs.forEach(input => {
        expect(input).toHaveAttribute('step', '300'); // 300秒 = 5分
      });
    });
  });

  describe('時間入力フィールドの識別', () => {
    beforeEach(() => {
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );
    });

    it('開始時間フィールドを正しく識別できる', () => {
      // name属性で識別
      const startTimeInput = screen.getByDisplayValue('09:00');
      expect(startTimeInput).toHaveAttribute('name', 'startTime');
    });

    it('終了時間フィールドを正しく識別できる', () => {
      // name属性で識別
      const endTimeInput = screen.getByDisplayValue('18:00');
      expect(endTimeInput).toHaveAttribute('name', 'endTime');
    });
  });

  describe('ユーザーインタラクション', () => {
    it('開始時間を変更できる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );

      const startTimeInput = screen.getByDisplayValue('09:00');
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '10:30');

      expect(startTimeInput).toHaveValue('10:30');
    });

    it('終了時間を変更できる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );

      const endTimeInput = screen.getByDisplayValue('18:00');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '17:00');

      expect(endTimeInput).toHaveValue('17:00');
    });

    it('複数回の時間変更ができる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );

      const startTimeInput = screen.getByDisplayValue('09:00');
      
      // 1回目の変更
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '10:00');
      expect(startTimeInput).toHaveValue('10:00');

      // 2回目の変更
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '11:30');
      expect(startTimeInput).toHaveValue('11:30');
    });
  });

  describe('フォーカス動作', () => {
    beforeEach(() => {
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );
    });

    it('開始時間フィールドにフォーカスできる', async () => {
      const user = userEvent.setup();
      const startTimeInput = screen.getByDisplayValue('09:00');
      
      await user.click(startTimeInput);
      expect(startTimeInput).toHaveFocus();
    });

    it('終了時間フィールドにフォーカスできる', async () => {
      const user = userEvent.setup();
      const endTimeInput = screen.getByDisplayValue('18:00');
      
      await user.click(endTimeInput);
      expect(endTimeInput).toHaveFocus();
    });

    it('タブキーでフィールド間を移動できる', async () => {
      const user = userEvent.setup();
      const startTimeInput = screen.getByDisplayValue('09:00');
      const endTimeInput = screen.getByDisplayValue('18:00');

      // 開始時間フィールドにフォーカス
      await user.click(startTimeInput);
      expect(startTimeInput).toHaveFocus();

      // タブキーで次のフィールドに移動
      await user.tab();
      expect(endTimeInput).toHaveFocus();
    });
  });

  describe('フォーム統合', () => {
    it('react-hook-formと正しく統合されている', async () => {
      const user = userEvent.setup();
      
      // より完全なフォームコンポーネントを作成
      const FormTestWrapper = () => {
        const { register, formState: { errors }, watch } = useForm<AttendanceFormData>({
          defaultValues: {
            leaveTypeId: '',
            selectedDates: [],
            isHourlyBased: false,
            startTime: '09:00',
            endTime: '18:00',
            reason: '',
          },
        });

        const startTimeValue = watch('startTime');
        const endTimeValue = watch('endTime');

        return (
          <div>
            <LeaveTimeSelector
              isHourlyBased={true}
              register={register}
              errors={errors}
            />
            <div data-testid="start-time-value">{startTimeValue}</div>
            <div data-testid="end-time-value">{endTimeValue}</div>
          </div>
        );
      };

      renderWithLeaveProviders(<FormTestWrapper />);

      const startTimeInput = screen.getByDisplayValue('09:00');
      const endTimeInput = screen.getByDisplayValue('18:00');
      const startTimeValue = screen.getByTestId('start-time-value');
      const endTimeValue = screen.getByTestId('end-time-value');

      // 開始時間を変更
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '10:30');

      // 終了時間を変更
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '16:30');

      await waitFor(() => {
        expect(startTimeValue).toHaveTextContent('10:30');
        expect(endTimeValue).toHaveTextContent('16:30');
      });
    });
  });

  describe('エラー状態表示', () => {
    it('開始時間のエラー状態が表示される', () => {
      // エラー状態をシミュレートするテストラッパー
      const ErrorTestWrapper = () => {
        const { register } = useForm<AttendanceFormData>({
          defaultValues: {
            leaveTypeId: '',
            selectedDates: [],
            isHourlyBased: false,
            startTime: '09:00',
            endTime: '18:00',
            reason: '',
          },
        });
        
        const errors = {
          startTime: {
            type: 'required',
            message: '開始時間を入力してください'
          }
        };

        return (
          <LeaveTimeSelector
            isHourlyBased={true}
            register={register}
            errors={errors}
          />
        );
      };

      renderWithLeaveProviders(<ErrorTestWrapper />);

      // エラー状態の確認（MUIのerror属性）
      const startTimeInput = screen.getByDisplayValue('09:00');
      expect(startTimeInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('終了時間のエラー状態が表示される', () => {
      const ErrorTestWrapper = () => {
        const { register } = useForm<AttendanceFormData>({
          defaultValues: {
            leaveTypeId: '',
            selectedDates: [],
            isHourlyBased: false,
            startTime: '09:00',
            endTime: '18:00',
            reason: '',
          },
        });
        
        const errors = {
          endTime: {
            type: 'required',
            message: '終了時間を入力してください'
          }
        };

        return (
          <LeaveTimeSelector
            isHourlyBased={true}
            register={register}
            errors={errors}
          />
        );
      };

      renderWithLeaveProviders(<ErrorTestWrapper />);

      const endTimeInput = screen.getByDisplayValue('18:00');
      expect(endTimeInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('エラーがない場合、通常状態で表示される', () => {
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );

      const timeInputs = screen.getAllByDisplayValue(/^[0-9]{2}:[0-9]{2}$/);
      timeInputs.forEach(input => {
        expect(input).toHaveAttribute('aria-invalid', 'false');
      });
    });
  });

  describe('レスポンシブデザイン', () => {
    it('Stackコンテナが適切に設定されている', () => {
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );

      // Stackコンポーネントが存在することを確認
      const container = screen.getByText('開始時間').closest('[class*="MuiStack-root"]');
      expect(container).toBeInTheDocument();
    });
  });

  describe('デフォルト値', () => {
    it('カスタムデフォルト値が正しく設定される', () => {
      renderWithLeaveProviders(
        <TestWrapper 
          isHourlyBased={true} 
          defaultStartTime="08:30"
          defaultEndTime="17:30"
        />
      );

      expect(screen.getByDisplayValue('08:30')).toBeInTheDocument();
      expect(screen.getByDisplayValue('17:30')).toBeInTheDocument();
    });

    it('空のデフォルト値でも正常に動作する', () => {
      renderWithLeaveProviders(
        <TestWrapper 
          isHourlyBased={true} 
          defaultStartTime=""
          defaultEndTime=""
        />
      );

      // 空の値でもフィールドが表示される
      expect(screen.getByText('開始時間')).toBeInTheDocument();
      expect(screen.getByText('終了時間')).toBeInTheDocument();
    });
  });

  describe('境界値テスト', () => {
    it('24時間形式の時間が正しく処理される', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );

      const startTimeInput = screen.getByDisplayValue('09:00');
      
      // 0時台の入力
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '00:30');
      expect(startTimeInput).toHaveValue('00:30');

      // 23時台の入力
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '23:45');
      expect(startTimeInput).toHaveValue('23:45');
    });

    it('分単位の細かい時間設定ができる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );

      const endTimeInput = screen.getByDisplayValue('18:00');
      
      // 分単位での設定
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '17:15');
      expect(endTimeInput).toHaveValue('17:15');

      await user.clear(endTimeInput);
      await user.type(endTimeInput, '17:45');
      expect(endTimeInput).toHaveValue('17:45');
    });
  });

  describe('プロパティ変更への対応', () => {
    it('isHourlyBased が false から true に変更された場合', () => {
      const { rerender } = renderWithLeaveProviders(
        <TestWrapper isHourlyBased={false} />
      );

      // 初期状態では表示されない
      expect(screen.queryByText('開始時間')).not.toBeInTheDocument();
      expect(screen.queryByText('終了時間')).not.toBeInTheDocument();

      // プロパティを変更
      rerender(<TestWrapper isHourlyBased={true} />);

      // フィールドが表示される
      expect(screen.getByText('開始時間')).toBeInTheDocument();
      expect(screen.getByText('終了時間')).toBeInTheDocument();
    });

    it('isHourlyBased が true から false に変更された場合', () => {
      const { rerender } = renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );

      // 初期状態では表示される
      expect(screen.getByText('開始時間')).toBeInTheDocument();
      expect(screen.getByText('終了時間')).toBeInTheDocument();

      // プロパティを変更
      rerender(<TestWrapper isHourlyBased={false} />);

      // フィールドが非表示になる
      expect(screen.queryByText('開始時間')).not.toBeInTheDocument();
      expect(screen.queryByText('終了時間')).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    beforeEach(() => {
      renderWithLeaveProviders(
        <TestWrapper isHourlyBased={true} />
      );
    });

    it('適切なラベルが設定されている', () => {
      expect(screen.getByText('開始時間')).toBeInTheDocument();
      expect(screen.getByText('終了時間')).toBeInTheDocument();
    });

    it('time型のinput要素が使用されている', () => {
      const timeInputs = screen.getAllByDisplayValue(/^[0-9]{2}:[0-9]{2}$/);
      timeInputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'time');
      });
    });

    it('FormControlで適切に構造化されている', () => {
      const startTimeLabel = screen.getByText('開始時間');
      const endTimeLabel = screen.getByText('終了時間');

      // FormControlの構造を確認
      expect(startTimeLabel.closest('[class*="MuiFormControl-root"]')).toBeInTheDocument();
      expect(endTimeLabel.closest('[class*="MuiFormControl-root"]')).toBeInTheDocument();
    });
  });
});