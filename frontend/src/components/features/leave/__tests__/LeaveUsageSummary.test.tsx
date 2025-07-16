/**
 * LeaveUsageSummary コンポーネントのテスト
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeaveUsageSummary from '../LeaveUsageSummary';
import { renderWithLeaveProviders } from '../../../../__tests__/utils/leaveTestUtils';

// ActionButtonをモック
jest.mock('@/components/common/ActionButton', () => {
  return function MockActionButton({ 
    loading, 
    disabled, 
    onClick, 
    children, 
    icon,
    type,
    ...props 
  }: any) {
    return (
      <button
        disabled={loading || disabled}
        onClick={onClick}
        type={type}
        {...props}
      >
        {icon && <span data-testid="SendIcon" />}
        {children}
      </button>
    );
  };
});

// テスト用のラッパーコンポーネント
const TestWrapper = ({ 
  calculatedDays = 1.0,
  isSubmitting = false,
  isSubmitDisabled = false,
  mockOnSubmit = jest.fn(),
}: { 
  calculatedDays?: number;
  isSubmitting?: boolean;
  isSubmitDisabled?: boolean;
  mockOnSubmit?: jest.Mock;
}) => {
  return (
    <LeaveUsageSummary
      calculatedDays={calculatedDays}
      isSubmitting={isSubmitting}
      isSubmitDisabled={isSubmitDisabled}
      onSubmit={mockOnSubmit}
    />
  );
};

describe('LeaveUsageSummary', () => {
  describe('基本表示', () => {
    it('コンポーネントが正常にレンダリングされる', () => {
      renderWithLeaveProviders(<TestWrapper />);

      expect(screen.getByText('利用日数')).toBeInTheDocument();
      expect(screen.getByText('1.0 日')).toBeInTheDocument();
      expect(screen.getByText('申請する')).toBeInTheDocument();
    });

    it('休暇アイコンが表示される', () => {
      renderWithLeaveProviders(<TestWrapper />);

      // HolidayIconが表示されていることを確認
      expect(screen.getByTestId('EventBusyIcon')).toBeInTheDocument();
    });

    it('申請ボタンが表示される', () => {
      renderWithLeaveProviders(<TestWrapper />);

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('送信アイコンが申請ボタンに表示される', () => {
      renderWithLeaveProviders(<TestWrapper />);

      // SendIconが表示されていることを確認
      expect(screen.getByTestId('SendIcon')).toBeInTheDocument();
    });
  });

  describe('利用日数の表示', () => {
    it('小数点以下1桁で日数が表示される', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={2.5} />);

      expect(screen.getByText('2.5 日')).toBeInTheDocument();
    });

    it('整数の場合も小数点以下1桁で表示される', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={3} />);

      expect(screen.getByText('3.0 日')).toBeInTheDocument();
    });

    it('0日の場合も正しく表示される', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={0} />);

      expect(screen.getByText('0.0 日')).toBeInTheDocument();
    });

    it('0.5日（半日）の場合も正しく表示される', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={0.5} />);

      expect(screen.getByText('0.5 日')).toBeInTheDocument();
    });

    it('複数日の場合も正しく表示される', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={15.5} />);

      expect(screen.getByText('15.5 日')).toBeInTheDocument();
    });
  });

  describe('申請ボタンの機能', () => {
    it('申請ボタンをクリックすると onSubmit が呼ばれる', async () => {
      const mockOnSubmit = jest.fn();
      const user = userEvent.setup();
      
      renderWithLeaveProviders(
        <TestWrapper mockOnSubmit={mockOnSubmit} />
      );

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      await user.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('申請ボタンが無効化されている場合はクリックできない', () => {
      const mockOnSubmit = jest.fn();
      
      renderWithLeaveProviders(
        <TestWrapper 
          isSubmitDisabled={true}
          mockOnSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).toBeDisabled();
    });

    it('送信中の場合はローディング状態になる', () => {
      renderWithLeaveProviders(
        <TestWrapper isSubmitting={true} />
      );

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).toBeDisabled();
    });

    it('送信中でも申請ボタンのテキストは変わらない', () => {
      renderWithLeaveProviders(
        <TestWrapper isSubmitting={true} />
      );

      expect(screen.getByText('申請する')).toBeInTheDocument();
    });
  });

  describe('状態の組み合わせ', () => {
    it('送信中かつ無効化の場合', () => {
      renderWithLeaveProviders(
        <TestWrapper 
          isSubmitting={true}
          isSubmitDisabled={true}
        />
      );

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).toBeDisabled();
    });

    it('通常状態（送信中でなく、無効化もされていない）', () => {
      renderWithLeaveProviders(
        <TestWrapper 
          isSubmitting={false}
          isSubmitDisabled={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('UI要素のスタイル', () => {
    it('利用日数のラベルが正しく表示される', () => {
      renderWithLeaveProviders(<TestWrapper />);

      const label = screen.getByText('利用日数');
      expect(label).toBeInTheDocument();
    });

    it('日数が大きなテキストで表示される', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={5.5} />);

      const dayText = screen.getByText('5.5 日');
      expect(dayText).toBeInTheDocument();
      // MUIのTypography h4 variantが適用されていることを確認
      expect(dayText.closest('[class*="MuiTypography-h4"]')).toBeInTheDocument();
    });

    it('アイコンコンテナが正しく表示される', () => {
      renderWithLeaveProviders(<TestWrapper />);

      const icon = screen.getByTestId('EventBusyIcon');
      const iconContainer = icon.closest('div');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('プロパティのバリデーション', () => {
    it('負の日数でも正しく表示される', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={-1.5} />);

      expect(screen.getByText('-1.5 日')).toBeInTheDocument();
    });

    it('非常に大きな日数でも正しく表示される', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={999.9} />);

      expect(screen.getByText('999.9 日')).toBeInTheDocument();
    });

    it('小数点以下が長い日数でも1桁に丸められる', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={1.234567} />);

      expect(screen.getByText('1.2 日')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('申請ボタンがsubmitタイプである', () => {
      renderWithLeaveProviders(<TestWrapper />);

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('利用日数のテキストが読み上げ可能', () => {
      renderWithLeaveProviders(<TestWrapper calculatedDays={2.5} />);

      expect(screen.getByText('利用日数')).toBeInTheDocument();
      expect(screen.getByText('2.5 日')).toBeInTheDocument();
    });

    it('無効化されたボタンは適切な状態を持つ', () => {
      renderWithLeaveProviders(
        <TestWrapper isSubmitDisabled={true} />
      );

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).toHaveAttribute('disabled');
    });
  });

  describe('イベント処理', () => {
    it('複数回クリックしても適切に動作する', async () => {
      const mockOnSubmit = jest.fn();
      const user = userEvent.setup();
      
      renderWithLeaveProviders(
        <TestWrapper mockOnSubmit={mockOnSubmit} />
      );

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalledTimes(3);
    });

    it('キーボードでもボタンを操作できる', async () => {
      const mockOnSubmit = jest.fn();
      const user = userEvent.setup();
      
      renderWithLeaveProviders(
        <TestWrapper mockOnSubmit={mockOnSubmit} />
      );

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      
      submitButton.focus();
      await user.keyboard('{Enter}');
      
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('スペースキーでもボタンを操作できる', async () => {
      const mockOnSubmit = jest.fn();
      const user = userEvent.setup();
      
      renderWithLeaveProviders(
        <TestWrapper mockOnSubmit={mockOnSubmit} />
      );

      const submitButton = screen.getByRole('button', { name: /申請する/i });
      
      submitButton.focus();
      await user.keyboard('{ }');
      
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('コンポーネントの更新', () => {
    it('calculatedDaysの変更が反映される', () => {
      const { rerender } = renderWithLeaveProviders(
        <TestWrapper calculatedDays={1.0} />
      );

      expect(screen.getByText('1.0 日')).toBeInTheDocument();

      rerender(<TestWrapper calculatedDays={3.5} />);

      expect(screen.getByText('3.5 日')).toBeInTheDocument();
      expect(screen.queryByText('1.0 日')).not.toBeInTheDocument();
    });

    it('isSubmittingの変更が反映される', () => {
      const { rerender } = renderWithLeaveProviders(
        <TestWrapper isSubmitting={false} />
      );

      let submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).not.toBeDisabled();

      rerender(<TestWrapper isSubmitting={true} />);

      submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).toBeDisabled();
    });

    it('isSubmitDisabledの変更が反映される', () => {
      const { rerender } = renderWithLeaveProviders(
        <TestWrapper isSubmitDisabled={false} />
      );

      let submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).not.toBeDisabled();

      rerender(<TestWrapper isSubmitDisabled={true} />);

      submitButton = screen.getByRole('button', { name: /申請する/i });
      expect(submitButton).toBeDisabled();
    });
  });
});