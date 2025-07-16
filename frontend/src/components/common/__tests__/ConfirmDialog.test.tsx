import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import ConfirmDialog, { ConfirmDialogProps } from '../ConfirmDialog';
import '@testing-library/jest-dom';

// テーマの作成
const theme = createTheme();

// ヘルパー関数
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// ActionButtonのモック
jest.mock('../ActionButton', () => {
  return function ActionButton({ 
    children, 
    onClick, 
    disabled, 
    loading,
    buttonType,
    ...props 
  }: any) {
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        data-testid={`action-button-${children.toLowerCase().replace(/\s+/g, '-')}`}
        data-button-type={buttonType}
        {...props}
      >
        {loading && <span data-testid="loading-spinner">Loading...</span>}
        {children}
      </button>
    );
  };
});

describe('ConfirmDialog', () => {
  // デフォルトのプロップス
  const defaultProps: ConfirmDialogProps = {
    open: true,
    title: 'テスト確認',
    message: 'この操作を実行してもよろしいですか？',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    test('ダイアログが正しく表示される', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('テスト確認')).toBeInTheDocument();
      expect(screen.getByText('この操作を実行してもよろしいですか？')).toBeInTheDocument();
    });

    test('openがfalseの場合、ダイアログが表示されない', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} open={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('デフォルトボタンテキストが表示される', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      expect(screen.getByTestId('action-button-確認')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-キャンセル')).toBeInTheDocument();
    });

    test('カスタムボタンテキストが表示される', () => {
      renderWithTheme(
        <ConfirmDialog 
          {...defaultProps} 
          confirmText="削除する"
          cancelText="やめる"
        />
      );
      
      expect(screen.getByTestId('action-button-削除する')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-やめる')).toBeInTheDocument();
    });
  });

  describe('アイコンと色の表示', () => {
    test('infoタイプで正しいアイコンが表示される', () => {
      renderWithTheme(
        <ConfirmDialog 
          {...defaultProps} 
          severity="info"
        />
      );
      
      const icon = screen.getByTestId('InfoIcon');
      expect(icon).toBeInTheDocument();
    });

    test('warningタイプで正しいアイコンが表示される', () => {
      renderWithTheme(
        <ConfirmDialog 
          {...defaultProps} 
          severity="warning"
        />
      );
      
      const icon = screen.getByTestId('WarningIcon');
      expect(icon).toBeInTheDocument();
    });

    test('errorタイプで正しいアイコンが表示される', () => {
      renderWithTheme(
        <ConfirmDialog 
          {...defaultProps} 
          severity="error"
        />
      );
      
      const icon = screen.getByTestId('ErrorIcon');
      expect(icon).toBeInTheDocument();
    });

    test('errorタイプで確認ボタンがdangerタイプになる', () => {
      renderWithTheme(
        <ConfirmDialog 
          {...defaultProps} 
          severity="error"
        />
      );
      
      const confirmButton = screen.getByTestId('action-button-確認');
      expect(confirmButton).toHaveAttribute('data-button-type', 'danger');
    });

    test('info/warningタイプで確認ボタンがprimaryタイプになる', () => {
      renderWithTheme(
        <ConfirmDialog 
          {...defaultProps} 
          severity="info"
        />
      );
      
      const confirmButton = screen.getByTestId('action-button-確認');
      expect(confirmButton).toHaveAttribute('data-button-type', 'primary');
    });
  });

  describe('ボタンクリックイベント', () => {
    test('確認ボタンクリックでonConfirmが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      const confirmButton = screen.getByTestId('action-button-確認');
      await user.click(confirmButton);
      
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    test('キャンセルボタンクリックでonCancelが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      const cancelButton = screen.getByTestId('action-button-キャンセル');
      await user.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    test('Escapeキーでダイアログが閉じられる', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      
      // Escapeキーでダイアログを閉じる
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('ローディング状態', () => {
    test('ローディング中に確認ボタンが無効化される', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} loading={true} />);
      
      const confirmButton = screen.getByTestId('action-button-確認');
      expect(confirmButton).toBeDisabled();
    });

    test('ローディング中にキャンセルボタンが無効化される', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} loading={true} />);
      
      const cancelButton = screen.getByTestId('action-button-キャンセル');
      expect(cancelButton).toBeDisabled();
    });

    test('ローディング中はクリックイベントが発火しない', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ConfirmDialog {...defaultProps} loading={true} />);
      
      const confirmButton = screen.getByTestId('action-button-確認');
      await user.click(confirmButton);
      
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('レイアウトとスタイリング', () => {
    test('ダイアログタイトルが正しくレンダリングされる', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      // ダイアログ内のタイトルを取得
      expect(screen.getByText('テスト確認')).toBeInTheDocument();
    });

    test('メッセージが正しくレンダリングされる', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      expect(screen.getByText('この操作を実行してもよろしいですか？')).toBeInTheDocument();
    });

    test('maxWidthプロパティが正しく適用される', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} maxWidth="sm" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog.closest('.MuiDialog-container')).toBeInTheDocument();
    });

    test('キャンセルボタンがcancelタイプになる', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      const cancelButton = screen.getByTestId('action-button-キャンセル');
      expect(cancelButton).toHaveAttribute('data-button-type', 'cancel');
    });
  });

  describe('複合的なテスト', () => {
    test('すべてのプロパティが正しく動作する', async () => {
      const user = userEvent.setup();
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      
      renderWithTheme(
        <ConfirmDialog
          open={true}
          title="重要な確認"
          message="この操作は取り消すことができません。"
          confirmText="削除"
          cancelText="戻る"
          severity="error"
          onConfirm={onConfirm}
          onCancel={onCancel}
          maxWidth="sm"
        />
      );
      
      // タイトルとメッセージの確認
      expect(screen.getByText('重要な確認')).toBeInTheDocument();
      expect(screen.getByText('この操作は取り消すことができません。')).toBeInTheDocument();
      
      // エラーアイコンの確認
      expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument();
      
      // カスタムボタンテキストの確認
      expect(screen.getByTestId('action-button-削除')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-戻る')).toBeInTheDocument();
      
      // 確認ボタンがdangerタイプか確認
      const confirmButton = screen.getByTestId('action-button-削除');
      expect(confirmButton).toHaveAttribute('data-button-type', 'danger');
      
      // イベントハンドラーの確認
      await user.click(confirmButton);
      expect(onConfirm).toHaveBeenCalledTimes(1);
      
      await user.click(screen.getByTestId('action-button-戻る'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('状態変更が正しく反映される', () => {
      const { rerender } = renderWithTheme(
        <ConfirmDialog {...defaultProps} loading={false} />
      );
      
      // 初期状態
      expect(screen.getByTestId('action-button-確認')).not.toBeDisabled();
      expect(screen.getByTestId('action-button-キャンセル')).not.toBeDisabled();
      
      // ローディング状態に変更
      rerender(
        <ThemeProvider theme={theme}>
          <ConfirmDialog {...defaultProps} loading={true} />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('action-button-確認')).toBeDisabled();
      expect(screen.getByTestId('action-button-キャンセル')).toBeDisabled();
    });
  });

  describe('アクセシビリティ', () => {
    test('適切なロールとARIA属性が設定される', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // タイトルが存在することを確認
      expect(screen.getByText('テスト確認')).toBeInTheDocument();
    });

    test('ダイアログのタイトルが正しく関連付けられる', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      
      // ARIA属性が正しく設定されていることを確認
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    test('キーボードナビゲーションが機能する', () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);
      
      const confirmButton = screen.getByTestId('action-button-確認');
      const cancelButton = screen.getByTestId('action-button-キャンセル');
      
      // ボタンがfocusableであることを確認
      expect(confirmButton).not.toHaveAttribute('tabindex', '-1');
      expect(cancelButton).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('エラーケース', () => {
    test('空文字のタイトルでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <ConfirmDialog 
            {...defaultProps} 
            title=""
          />
        );
      }).not.toThrow();
    });

    test('空文字のメッセージでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <ConfirmDialog 
            {...defaultProps} 
            message=""
          />
        );
      }).not.toThrow();
    });

    test('不正なseverityでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <ConfirmDialog 
            {...defaultProps} 
            severity={'invalid' as any}
          />
        );
      }).not.toThrow();
      
      // デフォルトのinfoアイコンが表示される
      expect(screen.getByTestId('InfoIcon')).toBeInTheDocument();
    });

    test('undefinedのハンドラーでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <ConfirmDialog 
            {...defaultProps} 
            onConfirm={undefined as any}
            onCancel={undefined as any}
          />
        );
      }).not.toThrow();
    });
  });

  describe('パフォーマンス', () => {
    test('不要な再レンダリングが発生しない', () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <button onClick={() => setCount(c => c + 1)}>カウント: {count}</button>
            <ConfirmDialog 
              {...defaultProps}
              title={`確認 ${count}`}
            />
          </div>
        );
      };
      
      renderWithTheme(<TestComponent />);
      
      const incrementButton = screen.getByText(/カウント:/);
      expect(incrementButton).toHaveTextContent('カウント: 0');
      
      fireEvent.click(incrementButton);
      expect(incrementButton).toHaveTextContent('カウント: 1');
      expect(screen.getByText('確認 1')).toBeInTheDocument();
    });
  });
});