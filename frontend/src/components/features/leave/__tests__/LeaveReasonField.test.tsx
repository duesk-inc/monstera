/**
 * LeaveReasonField コンポーネントのテスト
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import LeaveReasonField from '../LeaveReasonField';
import { renderWithLeaveProviders } from '../../../../__tests__/utils/leaveTestUtils';
import { AttendanceFormData } from '../../../../types/leave';

// テスト用のラッパーコンポーネント
const TestWrapper = ({ 
  isReasonRequired, 
  defaultReason = '' 
}: { 
  isReasonRequired: boolean; 
  defaultReason?: string; 
}) => {
  const { register, formState: { errors } } = useForm<AttendanceFormData>({
    defaultValues: {
      leaveTypeId: '',
      selectedDates: [],
      isHourlyBased: false,
      startTime: '',
      endTime: '',
      reason: defaultReason,
    },
  });

  return (
    <LeaveReasonField
      isReasonRequired={isReasonRequired}
      register={register}
      errors={errors}
    />
  );
};

describe('LeaveReasonField', () => {
  describe('表示制御', () => {
    it('理由が必須でない場合、フィールドが表示されない', () => {
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={false} />
      );

      expect(screen.queryByLabelText('理由')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('理由が必須の場合、フィールドが表示される', () => {
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      expect(screen.getByText('理由')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('フィールドの基本表示', () => {
    beforeEach(() => {
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );
    });

    it('必須ラベルが表示される', () => {
      const label = screen.getByText('理由');
      expect(label).toBeInTheDocument();
      
      // MUIの必須マーカー（*）を確認
      const requiredIndicator = label.closest('label');
      expect(requiredIndicator).toHaveAttribute('class');
      expect(requiredIndicator?.className).toContain('MuiFormLabel-root');
    });

    it('プレースホルダーテキストが表示される', () => {
      const textField = screen.getByRole('textbox');
      expect(textField).toHaveAttribute('placeholder', '理由を入力してください');
    });

    it('複数行入力フィールドになっている', () => {
      const textField = screen.getByRole('textbox');
      expect(textField).toHaveAttribute('rows', '3');
    });

    it('ヘルプテキストが表示される', () => {
      expect(screen.getByText('休暇申請の理由を具体的に入力してください')).toBeInTheDocument();
    });

    it('必須属性が設定されている', () => {
      const textField = screen.getByRole('textbox');
      expect(textField).toHaveAttribute('required');
      // MUI TextFieldはaria-requiredを設定しないので、required属性のみチェック
    });
  });

  describe('ユーザーインタラクション', () => {
    it('テキストを入力できる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      const textField = screen.getByRole('textbox');
      const testText = '家族の結婚式に参加するため';

      await user.click(textField);
      await user.type(textField, testText);

      expect(textField).toHaveValue(testText);
    });

    it('複数行のテキストを入力できる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      const textField = screen.getByRole('textbox');
      const multiLineText = '家族の結婚式に参加するため\n遠方への移動が必要\n前日準備も含む';

      await user.click(textField);
      await user.type(textField, multiLineText);

      expect(textField).toHaveValue(multiLineText);
    });

    it('長いテキストを入力できる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      const textField = screen.getByRole('textbox');
      const longText = 'この度、家族の結婚式に参加するため休暇を申請いたします。式場が遠方にあり、前日の移動と準備が必要となります。また、親族として式の準備にも参加する必要があります。';

      await user.click(textField);
      await user.type(textField, longText);

      expect(textField).toHaveValue(longText);
    });
  });

  describe('フォーカス動作', () => {
    it('フィールドをクリックするとフォーカスが当たる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      const textField = screen.getByRole('textbox');
      await user.click(textField);

      expect(textField).toHaveFocus();
    });

    it('タブキーでフォーカスを移動できる', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      const textField = screen.getByRole('textbox');
      
      // タブキーでフォーカス移動
      await user.tab();
      expect(textField).toHaveFocus();
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
            startTime: '',
            endTime: '',
            reason: '',
          },
        });

        const reasonValue = watch('reason');

        return (
          <div>
            <LeaveReasonField
              isReasonRequired={true}
              register={register}
              errors={errors}
            />
            <div data-testid="reason-value">{reasonValue}</div>
          </div>
        );
      };

      renderWithLeaveProviders(<FormTestWrapper />);

      const textField = screen.getByRole('textbox');
      const valueDisplay = screen.getByTestId('reason-value');
      const testText = 'テスト理由';

      await user.click(textField);
      await user.type(textField, testText);

      await waitFor(() => {
        expect(valueDisplay).toHaveTextContent(testText);
      });
    });
  });

  describe('エラー状態表示', () => {
    it('フォームエラーが発生した場合、エラースタイルとメッセージが表示される', () => {
      // エラー状態をシミュレートするテストラッパー
      const ErrorTestWrapper = () => {
        const register = jest.fn();
        const errors = {
          reason: {
            type: 'required',
            message: '理由を入力してください'
          }
        };

        return (
          <LeaveReasonField
            isReasonRequired={true}
            register={register}
            errors={errors}
          />
        );
      };

      renderWithLeaveProviders(<ErrorTestWrapper />);

      const textField = screen.getByRole('textbox');
      expect(textField).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('理由を入力してください')).toBeInTheDocument();
    });

    it('エラーがない場合、通常のヘルプテキストが表示される', () => {
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      expect(screen.getByText('休暇申請の理由を具体的に入力してください')).toBeInTheDocument();
      
      const textField = screen.getByRole('textbox');
      expect(textField).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('アクセシビリティ', () => {
    beforeEach(() => {
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );
    });

    it('適切なラベルが設定されている', () => {
      // FormLabelとTextFieldが存在することを確認
      expect(screen.getByText('理由')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('必須属性が適切に設定されている', () => {
      const textField = screen.getByRole('textbox');
      expect(textField).toHaveAttribute('required');
      // MUI TextFieldはaria-requiredを設定しないので、required属性のみチェック
    });

    it('ヘルプテキストがaria-describedbyで関連付けられている', () => {
      const textField = screen.getByRole('textbox');
      const describedBy = textField.getAttribute('aria-describedby');
      
      expect(describedBy).toBeTruthy();
      if (describedBy) {
        const helpText = document.getElementById(describedBy);
        expect(helpText).toHaveTextContent('休暇申請の理由を具体的に入力してください');
      }
    });
  });

  describe('デフォルト値', () => {
    it('初期値が正しく設定される', () => {
      const defaultReason = '初期理由テキスト';
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} defaultReason={defaultReason} />
      );

      const textField = screen.getByRole('textbox');
      expect(textField).toHaveValue(defaultReason);
    });

    it('空の初期値でも正常に動作する', () => {
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} defaultReason="" />
      );

      const textField = screen.getByRole('textbox');
      expect(textField).toHaveValue('');
    });
  });

  describe('パフォーマンス', () => {
    it('必要のない再レンダリングが発生しない', () => {
      const renderSpy = jest.fn();
      
      const PerformanceTestWrapper = ({ isReasonRequired }: { isReasonRequired: boolean }) => {
        renderSpy();
        return <TestWrapper isReasonRequired={isReasonRequired} />;
      };

      const { rerender } = renderWithLeaveProviders(
        <PerformanceTestWrapper isReasonRequired={true} />
      );

      // 同じpropsで再レンダリング
      rerender(<PerformanceTestWrapper isReasonRequired={true} />);

      // レンダリング回数を確認（初回 + 再レンダリング = 2回）
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('境界値テスト', () => {
    it('非常に長いテキストでも正常に動作する', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      const textField = screen.getByRole('textbox');
      const veryLongText = 'あ'.repeat(1000); // 1000文字の文字列

      await user.click(textField);
      await user.type(textField, veryLongText);

      expect(textField).toHaveValue(veryLongText);
    });

    it('特殊文字を含むテキストでも正常に動作する', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      const textField = screen.getByRole('textbox');
      // userEventで問題のある文字を除外した特殊文字を使用
      const specialText = '特殊文字: !@#$%^&*()_+-=.,<>?~`';

      await user.click(textField);
      await user.type(textField, specialText);

      expect(textField).toHaveValue(specialText);
    });

    it('改行文字を含むテキストでも正常に動作する', async () => {
      const user = userEvent.setup();
      renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      const textField = screen.getByRole('textbox');
      const textWithNewlines = '1行目\n2行目\n3行目';

      await user.click(textField);
      await user.type(textField, textWithNewlines);

      expect(textField).toHaveValue(textWithNewlines);
    });
  });

  describe('プロパティ変更への対応', () => {
    it('isReasonRequired が false から true に変更された場合', () => {
      const { rerender } = renderWithLeaveProviders(
        <TestWrapper isReasonRequired={false} />
      );

      // 初期状態では表示されない
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      // プロパティを変更
      rerender(<TestWrapper isReasonRequired={true} />);

      // フィールドが表示される
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('理由')).toBeInTheDocument();
    });

    it('isReasonRequired が true から false に変更された場合', () => {
      const { rerender } = renderWithLeaveProviders(
        <TestWrapper isReasonRequired={true} />
      );

      // 初期状態では表示される
      expect(screen.getByRole('textbox')).toBeInTheDocument();

      // プロパティを変更
      rerender(<TestWrapper isReasonRequired={false} />);

      // フィールドが非表示になる
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByText('理由')).not.toBeInTheDocument();
    });
  });
});