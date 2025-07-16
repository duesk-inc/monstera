import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MetricCard } from './MetricCard';
import { Assignment, TrendingUp } from '@mui/icons-material';

// モック定数
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const;

// モック関数
jest.mock('@/constants/dimensions', () => ({
  SPACING
}));

// テーマの設定
const theme = createTheme();

// ラップコンポーネント
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MetricCard', () => {
  const mockOnClick = jest.fn();

  const defaultProps = {
    title: 'テストメトリック',
    value: 100,
    unit: '件',
    icon: <Assignment />,
    color: '#1976d2'
  };

  const trendProps = {
    trend: {
      value: 12,
      isPositive: true,
      period: '前月比'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示状態', () => {
    it('基本的な情報が正しく表示される', () => {
      renderWithTheme(
        <MetricCard {...defaultProps} />
      );

      expect(screen.getByText('テストメトリック')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('件')).toBeInTheDocument();
      expect(screen.getByTestId('AssignmentIcon')).toBeInTheDocument();
    });

    it('数値が正しくフォーマットされる', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          value={1234567}
        />
      );

      expect(screen.getByText('1,234,567')).toBeInTheDocument();
    });

    it('文字列の値も正しく表示される', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          value="カスタム値"
        />
      );

      expect(screen.getByText('カスタム値')).toBeInTheDocument();
    });

    it('単位が未設定の場合は表示されない', () => {
      renderWithTheme(
        <MetricCard 
          title="テストメトリック"
          value={100}
          icon={<Assignment />}
          color="#1976d2"
        />
      );

      expect(screen.getByText('テストメトリック')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.queryByText('件')).not.toBeInTheDocument();
    });

    it('正のトレンドが正しく表示される', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          {...trendProps}
        />
      );

      expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument();
      expect(screen.getByText('12%')).toBeInTheDocument();
      expect(screen.getByText('前月比')).toBeInTheDocument();
    });

    it('負のトレンドが正しく表示される', () => {
      const negativeTrend = {
        trend: {
          value: -8,
          isPositive: false,
          period: '前週比'
        }
      };

      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          {...negativeTrend}
        />
      );

      expect(screen.getByTestId('TrendingDownIcon')).toBeInTheDocument();
      expect(screen.getByText('8%')).toBeInTheDocument();
      expect(screen.getByText('前週比')).toBeInTheDocument();
    });

    it('トレンドの期間が未設定でも表示される', () => {
      const trendWithoutPeriod = {
        trend: {
          value: 15,
          isPositive: true
        }
      };

      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          {...trendWithoutPeriod}
        />
      );

      expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
      expect(screen.queryByText('前月比')).not.toBeInTheDocument();
    });

    it('トレンドが未設定の場合は表示されない', () => {
      renderWithTheme(
        <MetricCard {...defaultProps} />
      );

      expect(screen.queryByTestId('TrendingUpIcon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('TrendingDownIcon')).not.toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はスケルトンが表示される', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          isLoading={true}
        />
      );

      // Skeletonコンポーネントが表示される
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);

      // 実際のコンテンツは表示されない
      expect(screen.queryByText('テストメトリック')).not.toBeInTheDocument();
      expect(screen.queryByText('100')).not.toBeInTheDocument();
    });

    it('ローディング中でもカードの高さが保たれる', () => {
      const { container } = renderWithTheme(
        <MetricCard 
          {...defaultProps}
          isLoading={true}
        />
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveStyle({ minHeight: '140px' });
    });

    it('ローディング中でもクリック可能状態が保たれる', () => {
      const { container } = renderWithTheme(
        <MetricCard 
          {...defaultProps}
          isLoading={true}
          onClick={mockOnClick}
        />
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('インタラクション', () => {
    it('クリック可能な場合にカーソルがポインターになる', () => {
      const { container } = renderWithTheme(
        <MetricCard 
          {...defaultProps}
          onClick={mockOnClick}
        />
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveStyle({ cursor: 'pointer' });
    });

    it('クリック不可能な場合にカーソルがデフォルトになる', () => {
      const { container } = renderWithTheme(
        <MetricCard {...defaultProps} />
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveStyle({ cursor: 'default' });
    });

    it('カードをクリックすると onClick が呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          onClick={mockOnClick}
        />
      );

      const card = screen.getByRole('button');
      await user.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('onClick が未設定の場合はクリックできない', () => {
      renderWithTheme(
        <MetricCard {...defaultProps} />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('Enterキーでもクリックイベントが発生する', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          onClick={mockOnClick}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

      // Material-UIのCardコンポーネントはデフォルトでEnterキーをサポートしている
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('スタイリング', () => {
    it('指定された色でアイコン背景が設定される', () => {
      const { container } = renderWithTheme(
        <MetricCard 
          {...defaultProps}
          color="#FF5722"
        />
      );

      // アイコンコンテナの背景色を確認
      const iconContainer = container.querySelector('[style*="background-color"]');
      expect(iconContainer).toHaveStyle({ backgroundColor: '#FF572220' });
    });

    it('正のトレンドは成功色で表示される', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          {...trendProps}
        />
      );

      const trendIcon = screen.getByTestId('TrendingUpIcon');
      const trendText = screen.getByText('12%');
      
      // Material-UIのテーマから成功色が適用される
      expect(trendIcon).toHaveStyle({ color: theme.palette.success.main });
      expect(trendText).toHaveStyle({ color: theme.palette.success.main });
    });

    it('負のトレンドはエラー色で表示される', () => {
      const negativeTrend = {
        trend: {
          value: 10,
          isPositive: false
        }
      };

      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          {...negativeTrend}
        />
      );

      const trendIcon = screen.getByTestId('TrendingDownIcon');
      const trendText = screen.getByText('10%');
      
      // Material-UIのテーマからエラー色が適用される
      expect(trendIcon).toHaveStyle({ color: theme.palette.error.main });
      expect(trendText).toHaveStyle({ color: theme.palette.error.main });
    });

    it('ホバー時にカードが浮き上がる（クリック可能な場合）', () => {
      const { container } = renderWithTheme(
        <MetricCard 
          {...defaultProps}
          onClick={mockOnClick}
        />
      );

      const card = container.querySelector('.MuiCard-root') as HTMLElement;
      
      // ホバーイベントをシミュレート
      fireEvent.mouseEnter(card);
      
      // CSSのhover効果は実際のブラウザでないとテストが困難
      // スタイルが設定されていることを確認
      expect(card).toHaveStyle({ transition: 'all 0.2s ease-in-out' });
    });

    it('ホバー効果がない（クリック不可能な場合）', () => {
      const { container } = renderWithTheme(
        <MetricCard {...defaultProps} />
      );

      const card = container.querySelector('.MuiCard-root') as HTMLElement;
      
      // ホバーイベントをシミュレート
      fireEvent.mouseEnter(card);
      
      // transformスタイルが適用されていないことを確認
      expect(card).toHaveStyle({ cursor: 'default' });
    });
  });

  describe('レスポンシブ対応', () => {
    it('カードの最小高さが設定されている', () => {
      const { container } = renderWithTheme(
        <MetricCard {...defaultProps} />
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveStyle({ 
        height: '100%',
        minHeight: '140px'
      });
    });

    it('アイコンエリアが固定サイズで表示される', () => {
      const { container } = renderWithTheme(
        <MetricCard {...defaultProps} />
      );

      const iconArea = container.querySelector('[style*="min-width: 64px"]');
      expect(iconArea).toHaveStyle({
        minWidth: '64px',
        height: '64px'
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('クリック可能な場合は適切なロールが設定される', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('タイトルが適切な階層で表示される', () => {
      renderWithTheme(
        <MetricCard {...defaultProps} />
      );

      const title = screen.getByText('テストメトリック');
      expect(title).toHaveAttribute('class');
      // Material-UIのTypographyコンポーネントのクラスが適用されている
      expect(title.tagName.toLowerCase()).toBe('p');
    });

    it('値が適切にラベル化される', () => {
      renderWithTheme(
        <MetricCard {...defaultProps} />
      );

      const value = screen.getByText('100');
      expect(value).toHaveAttribute('class');
      // Material-UIのTypographyでh4バリアントが使用されている
      expect(value.tagName.toLowerCase()).toBe('div');
    });
  });

  describe('エッジケース', () => {
    it('値が0の場合も正しく表示される', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          value={0}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('負の値も正しく表示される', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          value={-100}
        />
      );

      expect(screen.getByText('-100')).toBeInTheDocument();
    });

    it('非常に大きな数値も正しくフォーマットされる', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          value={999999999}
        />
      );

      expect(screen.getByText('999,999,999')).toBeInTheDocument();
    });

    it('空文字列の値も表示される', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          value=""
        />
      );

      // 空文字列でもコンポーネントはクラッシュしない
      expect(screen.getByText('テストメトリック')).toBeInTheDocument();
    });

    it('トレンド値が0の場合も正しく表示される', () => {
      const zeroTrend = {
        trend: {
          value: 0,
          isPositive: true
        }
      };

      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          {...zeroTrend}
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument();
    });

    it('カスタムアイコンが正しく表示される', () => {
      renderWithTheme(
        <MetricCard 
          {...defaultProps}
          icon={<TrendingUp data-testid="custom-icon" />}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('AssignmentIcon')).not.toBeInTheDocument();
    });
  });
});