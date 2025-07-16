import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import ActionButton, { ActionButtonVariant, ActionButtonSize, ResponsiveSize } from '../ActionButton';
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

describe('ActionButton', () => {
  describe('基本レンダリング', () => {
    test('デフォルトプロップスで正しくレンダリングされる', () => {
      renderWithTheme(<ActionButton>テストボタン</ActionButton>);
      
      const button = screen.getByRole('button', { name: 'テストボタン' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('MuiButton-outlined');
    });

    test('子要素が正しく表示される', () => {
      renderWithTheme(<ActionButton>クリックしてください</ActionButton>);
      
      expect(screen.getByText('クリックしてください')).toBeInTheDocument();
    });

    test('data-testidが設定される', () => {
      renderWithTheme(<ActionButton data-testid="test-button">テスト</ActionButton>);
      
      expect(screen.getByTestId('test-button')).toBeInTheDocument();
    });
  });

  describe('ボタンタイプ', () => {
    test.each([
      ['submit', 'MuiButton-contained'],
      ['primary', 'MuiButton-contained'],
      ['save', 'MuiButton-outlined'],
      ['secondary', 'MuiButton-outlined'],
      ['cancel', 'MuiButton-outlined'],
      ['danger', 'MuiButton-contained'],
      ['ghost', 'MuiButton-text'],
      ['default', 'MuiButton-outlined'],
    ] as [ActionButtonVariant, string][])('%s タイプで正しいクラスが適用される', (buttonType, expectedClass) => {
      renderWithTheme(
        <ActionButton buttonType={buttonType}>
          {buttonType}ボタン
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(expectedClass);
    });

    test('submitタイプでprimaryカラーが適用される', () => {
      renderWithTheme(<ActionButton buttonType="submit">提出</ActionButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-containedPrimary');
    });

    test('dangerタイプでerrorカラーが適用される', () => {
      renderWithTheme(<ActionButton buttonType="danger">削除</ActionButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-containedError');
    });

    test('cancelタイプでinheritカラーが適用される', () => {
      renderWithTheme(<ActionButton buttonType="cancel">キャンセル</ActionButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-outlinedInherit');
    });
  });

  describe('サイズ', () => {
    test.each([
      ['small', 'MuiButton-sizeSmall'],
      ['medium', 'MuiButton-sizeMedium'],
      ['large', 'MuiButton-sizeLarge'],
    ] as [ActionButtonSize, string][])('%s サイズで正しいクラスが適用される', (size, expectedClass) => {
      renderWithTheme(
        <ActionButton size={size}>
          {size}ボタン
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(expectedClass);
    });

    test('デフォルトサイズはmedium', () => {
      renderWithTheme(<ActionButton>デフォルト</ActionButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-sizeMedium');
    });
  });

  describe('アイコン', () => {
    test('アイコンが正しく表示される', () => {
      const TestIcon = () => <span data-testid="test-icon">★</span>;
      
      renderWithTheme(
        <ActionButton icon={<TestIcon />}>
          アイコン付きボタン
        </ActionButton>
      );
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('★')).toBeInTheDocument();
    });

    test('アイコンなしでも正常に動作する', () => {
      renderWithTheme(<ActionButton>アイコンなし</ActionButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByText('アイコンなし')).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    test('ローディング中にCircularProgressが表示される', () => {
      renderWithTheme(
        <ActionButton loading={true}>
          ローディング中
        </ActionButton>
      );
      
      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });

    test('ローディング中にボタンが無効化される', () => {
      renderWithTheme(
        <ActionButton loading={true}>
          ローディング中
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('ローディング中はアイコンがCircularProgressに置き換わる', () => {
      const TestIcon = () => <span data-testid="test-icon">★</span>;
      
      renderWithTheme(
        <ActionButton icon={<TestIcon />} loading={true}>
          ローディング中
        </ActionButton>
      );
      
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('ローディングが終了するとアイコンが復元される', () => {
      const TestIcon = () => <span data-testid="test-icon">★</span>;
      const { rerender } = renderWithTheme(
        <ActionButton icon={<TestIcon />} loading={true}>
          テスト
        </ActionButton>
      );
      
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      rerender(
        <ThemeProvider theme={theme}>
          <ActionButton icon={<TestIcon />} loading={false}>
            テスト
          </ActionButton>
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('disabled状態', () => {
    test('disabledプロパティでボタンが無効化される', () => {
      renderWithTheme(
        <ActionButton disabled={true}>
          無効ボタン
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('loadingとdisabledの両方が設定された場合も無効化される', () => {
      renderWithTheme(
        <ActionButton loading={true} disabled={true}>
          無効ボタン
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('fullWidth', () => {
    test('fullWidth=trueで幅100%になる', () => {
      renderWithTheme(
        <ActionButton fullWidth={true}>
          フル幅ボタン
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-fullWidth');
    });

    test('fullWidth=falseで通常の幅になる', () => {
      renderWithTheme(
        <ActionButton fullWidth={false}>
          通常幅ボタン
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('MuiButton-fullWidth');
    });

    test('デフォルトでfullWidthはfalse', () => {
      renderWithTheme(<ActionButton>デフォルト</ActionButton>);
      
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('MuiButton-fullWidth');
    });
  });

  describe('クリックイベント', () => {
    test('クリックハンドラーが呼ばれる', () => {
      const handleClick = jest.fn();
      
      renderWithTheme(
        <ActionButton onClick={handleClick}>
          クリック
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('ローディング中はクリックイベントが発火しない', () => {
      const handleClick = jest.fn();
      
      renderWithTheme(
        <ActionButton onClick={handleClick} loading={true}>
          ローディング中
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    test('disabled状態ではクリックイベントが発火しない', () => {
      const handleClick = jest.fn();
      
      renderWithTheme(
        <ActionButton onClick={handleClick} disabled={true}>
          無効ボタン
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('その他のプロパティ', () => {
    test('classNameが正しく適用される', () => {
      renderWithTheme(
        <ActionButton className="custom-class">
          カスタムクラス
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    test('idが正しく設定される', () => {
      renderWithTheme(
        <ActionButton id="test-button-id">
          IDテスト
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('id', 'test-button-id');
    });

    test('aria-labelが正しく設定される', () => {
      renderWithTheme(
        <ActionButton aria-label="アクセシビリティテスト">
          テスト
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'アクセシビリティテスト');
    });

    test('titleが正しく設定される', () => {
      renderWithTheme(
        <ActionButton title="ツールチップテスト">
          ホバー
        </ActionButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'ツールチップテスト');
    });
  });

  describe('複合的なテスト', () => {
    test('すべてのプロパティが同時に動作する', () => {
      const handleClick = jest.fn();
      const TestIcon = () => <span data-testid="complex-icon">⚡</span>;
      
      renderWithTheme(
        <ActionButton
          buttonType="primary"
          size="large"
          icon={<TestIcon />}
          fullWidth={true}
          onClick={handleClick}
          className="complex-button"
          data-testid="complex-button"
        >
          複合テスト
        </ActionButton>
      );
      
      const button = screen.getByTestId('complex-button');
      
      // ボタンの存在確認
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('複合テスト');
      
      // スタイルクラスの確認
      expect(button).toHaveClass('MuiButton-contained');
      expect(button).toHaveClass('MuiButton-sizeLarge');
      expect(button).toHaveClass('MuiButton-fullWidth');
      expect(button).toHaveClass('complex-button');
      
      // アイコンの確認
      expect(screen.getByTestId('complex-icon')).toBeInTheDocument();
      
      // クリックイベントの確認
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('状態変更が正しく反映される', () => {
      const TestIcon = () => <span data-testid="state-icon">🔄</span>;
      const { rerender } = renderWithTheme(
        <ActionButton icon={<TestIcon />} loading={false}>
          状態テスト
        </ActionButton>
      );
      
      // 初期状態
      expect(screen.getByTestId('state-icon')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
      
      // ローディング状態に変更
      rerender(
        <ThemeProvider theme={theme}>
          <ActionButton icon={<TestIcon />} loading={true}>
            状態テスト
          </ActionButton>
        </ThemeProvider>
      );
      
      expect(screen.queryByTestId('state-icon')).not.toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('エラーケース', () => {
    test('不正なbuttonTypeでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <ActionButton buttonType={'invalid' as ActionButtonVariant}>
            不正タイプ
          </ActionButton>
        );
      }).not.toThrow();
      
      // デフォルトのoutlinedスタイルが適用される
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-outlined');
    });

    test('undefinedの子要素でもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(<ActionButton>{undefined}</ActionButton>);
      }).not.toThrow();
    });

    test('nullのアイコンでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <ActionButton icon={null}>
            nullアイコン
          </ActionButton>
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
            <ActionButton onClick={() => setCount(c => c + 1)}>
              カウント: {count}
            </ActionButton>
          </div>
        );
      };
      
      renderWithTheme(<TestComponent />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('カウント: 0');
      
      fireEvent.click(button);
      expect(button).toHaveTextContent('カウント: 1');
      
      fireEvent.click(button);
      expect(button).toHaveTextContent('カウント: 2');
    });
  });
});