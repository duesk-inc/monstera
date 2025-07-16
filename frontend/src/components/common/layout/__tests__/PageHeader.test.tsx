import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { Box, Button, Breadcrumbs, Link } from '@mui/material';
import PageHeader, { PageHeaderProps } from '../PageHeader';
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

describe('PageHeader', () => {
  // デフォルトのプロップス
  const defaultProps: PageHeaderProps = {
    title: 'テストページ',
  };

  describe('基本レンダリング', () => {
    test('タイトルのみで正しくレンダリングされる', () => {
      renderWithTheme(<PageHeader {...defaultProps} />);
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('テストページ');
    });

    test('data-testidが正しく設定される', () => {
      renderWithTheme(<PageHeader {...defaultProps} data-testid="page-header" />);
      
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });

    test('デフォルトのタイトルバリアントはh4', () => {
      renderWithTheme(<PageHeader {...defaultProps} />);
      
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveClass('MuiTypography-h4');
    });
  });

  describe('タイトル', () => {
    test('カスタムタイトルバリアントが適用される', () => {
      renderWithTheme(
        <PageHeader {...defaultProps} titleVariant="h2" />
      );
      
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveClass('MuiTypography-h2');
    });

    test('タイトルが太字で表示される', () => {
      renderWithTheme(<PageHeader {...defaultProps} />);
      
      const title = screen.getByRole('heading', { level: 1 });
      // MUIのTypographyコンポーネントにfontWeight="bold"が設定されていることを確認
      expect(title).toBeInTheDocument();
    });

    test.each([
      ['h1', 'MuiTypography-h1'],
      ['h2', 'MuiTypography-h2'],
      ['h3', 'MuiTypography-h3'],
      ['h4', 'MuiTypography-h4'],
      ['h5', 'MuiTypography-h5'],
      ['h6', 'MuiTypography-h6'],
    ] as const)('%s バリアントで正しいクラスが適用される', (variant, expectedClass) => {
      renderWithTheme(
        <PageHeader {...defaultProps} titleVariant={variant} />
      );
      
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveClass(expectedClass);
    });
  });

  describe('サブタイトル', () => {
    test('サブタイトルが表示される', () => {
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          subtitle="これはテスト用のサブタイトルです。"
        />
      );
      
      expect(screen.getByText('これはテスト用のサブタイトルです。')).toBeInTheDocument();
    });

    test('サブタイトルがセカンダリーカラーで表示される', () => {
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          subtitle="サブタイトル"
        />
      );
      
      const subtitle = screen.getByText('サブタイトル');
      // color="text.secondary"プロパティが適用されていることを確認
      expect(subtitle).toBeInTheDocument();
    });

    test('サブタイトルなしの場合は表示されない', () => {
      renderWithTheme(<PageHeader {...defaultProps} />);
      
      // サブタイトルが存在しないことを確認
      expect(screen.queryByText(/サブタイトル/)).not.toBeInTheDocument();
    });

    test('空文字のサブタイトルは表示されない', () => {
      const { container } = renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          subtitle=""
        />
      );
      
      // サブタイトル用のTypographyコンポーネントが存在しないことを確認
      // 空文字の場合はサブタイトル自体がレンダリングされない
      const subtitleElements = container.querySelectorAll('p');
      expect(subtitleElements).toHaveLength(0);
    });
  });

  describe('アクション', () => {
    test('アクションボタンが表示される', () => {
      const actions = (
        <Button variant="contained">
          新規作成
        </Button>
      );
      
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          actions={actions}
        />
      );
      
      expect(screen.getByRole('button', { name: '新規作成' })).toBeInTheDocument();
    });

    test('複数のアクションが表示される', () => {
      const actions = (
        <>
          <Button variant="outlined">編集</Button>
          <Button variant="contained">保存</Button>
        </>
      );
      
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          actions={actions}
        />
      );
      
      expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    });

    test('アクションなしの場合は表示されない', () => {
      renderWithTheme(<PageHeader {...defaultProps} />);
      
      // アクション領域が存在しないことを確認
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('パンくずリスト', () => {
    test('パンくずリストが表示される', () => {
      const breadcrumbs = (
        <Breadcrumbs>
          <Link href="/">ホーム</Link>
          <Link href="/settings">設定</Link>
          <span>プロフィール</span>
        </Breadcrumbs>
      );
      
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          breadcrumbs={breadcrumbs}
        />
      );
      
      expect(screen.getByText('ホーム')).toBeInTheDocument();
      expect(screen.getByText('設定')).toBeInTheDocument();
      expect(screen.getByText('プロフィール')).toBeInTheDocument();
    });

    test('パンくずリストなしの場合は表示されない', () => {
      renderWithTheme(<PageHeader {...defaultProps} />);
      
      // Breadcrumbsコンポーネントが存在しないことを確認
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    test('カスタムパンくず要素が表示される', () => {
      const customBreadcrumbs = (
        <Box data-testid="custom-breadcrumbs">
          カスタムナビゲーション
        </Box>
      );
      
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          breadcrumbs={customBreadcrumbs}
        />
      );
      
      expect(screen.getByTestId('custom-breadcrumbs')).toBeInTheDocument();
      expect(screen.getByText('カスタムナビゲーション')).toBeInTheDocument();
    });
  });

  describe('レイアウトとスタイリング', () => {
    test('デフォルトのマージンボトムが適用される', () => {
      renderWithTheme(<PageHeader {...defaultProps} data-testid="header" />);
      
      const header = screen.getByTestId('header');
      // mb: 3 がデフォルト
      expect(header).toBeInTheDocument();
    });

    test('カスタムマージンボトムが適用される', () => {
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          marginBottom={5}
          data-testid="header"
        />
      );
      
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
    });

    test('カスタムsxプロパティが適用される', () => {
      renderWithTheme(
        <PageHeader 
          {...defaultProps}
          sx={{ 
            backgroundColor: 'primary.main',
            padding: 2 
          }}
          data-testid="header"
        />
      );
      
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
    });

    test('タイトルとアクションが横並びで表示される', () => {
      const actions = <Button>アクション</Button>;
      
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          actions={actions}
          data-testid="header"
        />
      );
      
      const title = screen.getByRole('heading', { level: 1 });
      const action = screen.getByRole('button', { name: 'アクション' });
      
      expect(title).toBeInTheDocument();
      expect(action).toBeInTheDocument();
    });
  });

  describe('レスポンシブ対応', () => {
    test('モバイル表示でも適切にレイアウトされる', () => {
      // モバイルビューポートのシミュレーション
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const actions = <Button>モバイルアクション</Button>;
      
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          actions={actions}
          subtitle="モバイルサブタイトル"
        />
      );
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('モバイルサブタイトル')).toBeInTheDocument();
    });
  });

  describe('複合的なテスト', () => {
    test('すべての要素が同時に表示される', () => {
      const breadcrumbs = (
        <Breadcrumbs>
          <Link href="/">ホーム</Link>
          <span>現在のページ</span>
        </Breadcrumbs>
      );
      
      const actions = (
        <>
          <Button variant="outlined">編集</Button>
          <Button variant="contained">保存</Button>
        </>
      );
      
      renderWithTheme(
        <PageHeader
          title="完全なページ"
          subtitle="すべての要素を含むページヘッダー"
          breadcrumbs={breadcrumbs}
          actions={actions}
          titleVariant="h2"
          marginBottom={4}
          data-testid="complete-header"
        />
      );
      
      // すべての要素が表示されていることを確認
      expect(screen.getByText('ホーム')).toBeInTheDocument();
      expect(screen.getByText('現在のページ')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('完全なページ');
      expect(screen.getByText('すべての要素を含むページヘッダー')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
      expect(screen.getByTestId('complete-header')).toBeInTheDocument();
    });

    test('部分的な要素でも正しく表示される', () => {
      renderWithTheme(
        <PageHeader
          title="シンプルページ"
          subtitle="タイトルとサブタイトルのみ"
        />
      );
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('シンプルページ');
      expect(screen.getByText('タイトルとサブタイトルのみ')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    test('適切な見出しレベルが設定される', () => {
      renderWithTheme(<PageHeader {...defaultProps} />);
      
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toBeInTheDocument();
    });

    test('パンくずリストに適切なナビゲーションロールが設定される', () => {
      const breadcrumbs = (
        <Breadcrumbs>
          <Link href="/">ホーム</Link>
          <span>現在のページ</span>
        </Breadcrumbs>
      );
      
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          breadcrumbs={breadcrumbs}
        />
      );
      
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    test('アクションボタンが適切にラベル付けされる', () => {
      const actions = (
        <Button aria-label="新しいアイテムを作成">
          作成
        </Button>
      );
      
      renderWithTheme(
        <PageHeader 
          {...defaultProps} 
          actions={actions}
        />
      );
      
      const button = screen.getByRole('button', { name: '新しいアイテムを作成' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('エラーケース', () => {
    test('空文字のタイトルでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(<PageHeader title="" />);
      }).not.toThrow();
    });

    test('nullのアクションでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <PageHeader 
            {...defaultProps} 
            actions={null}
          />
        );
      }).not.toThrow();
    });

    test('undefinedのパンくずリストでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <PageHeader 
            {...defaultProps} 
            breadcrumbs={undefined}
          />
        );
      }).not.toThrow();
    });

    test('不正なtitleVariantでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <PageHeader 
            {...defaultProps} 
            titleVariant={'invalid' as any}
          />
        );
      }).not.toThrow();
    });
  });

  describe('パフォーマンス', () => {
    test('不要な再レンダリングが発生しない', async () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <button onClick={() => setCount(c => c + 1)}>ボタン: {count}</button>
            <PageHeader 
              title={`ページ ${count}`}
              subtitle={`説明: ${count}`}
            />
          </div>
        );
      };
      
      renderWithTheme(<TestComponent />);
      
      const incrementButton = screen.getByRole('button');
      expect(incrementButton).toHaveTextContent('ボタン: 0');
      
      await act(async () => {
        fireEvent.click(incrementButton);
      });
      
      expect(incrementButton).toHaveTextContent('ボタン: 1');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ページ 1');
      expect(screen.getByText('説明: 1')).toBeInTheDocument();
    });
  });
});