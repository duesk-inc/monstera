import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SalesDashboard } from './SalesDashboard';
import type { SalesDashboardData } from '@/types/sales';

// モック定数
const SALES_UI = {
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3'
  }
} as const;

// モックデータ
const mockDashboardData: SalesDashboardData = {
  totalProposals: 50,
  activeProposals: 15,
  upcomingInterviews: 10,
  pendingExtensions: 5,
  todayDeadlines: 3,
  weeklyTrends: {
    proposals: 20,
    interviews: 12,
    acceptances: 5
  },
  statusDistribution: {
    '提案中': 15,
    '面談中': 10,
    '採用': 20,
    '不採用': 5
  },
  recentActivities: [
    {
      id: '1',
      type: 'proposal',
      description: '田中エンジニアの新規提案を作成しました',
      timestamp: '2024-01-20T10:30:00Z'
    },
    {
      id: '2',
      type: 'interview',
      description: 'ABC株式会社との面談を予定しました',
      timestamp: '2024-01-20T09:15:00Z'
    },
    {
      id: '3',
      type: 'extension',
      description: '佐藤エンジニアの契約延長確認を完了しました',
      timestamp: '2024-01-19T16:45:00Z'
    },
    {
      id: '4',
      type: 'unknown',
      description: '不明なタイプのアクティビティ',
      timestamp: '2024-01-19T14:20:00Z'
    }
  ]
};

const mockEmptyData: SalesDashboardData = {
  totalProposals: 0,
  activeProposals: 0,
  upcomingInterviews: 0,
  pendingExtensions: 0,
  todayDeadlines: 0,
  weeklyTrends: {
    proposals: 0,
    interviews: 0,
    acceptances: 0
  },
  statusDistribution: {},
  recentActivities: []
};

// モック関数
jest.mock('@/constants/sales', () => ({
  SALES_UI
}));

jest.mock('@/constants/dimensions', () => ({
  SPACING: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  }
}));

// コンポーネントのモック
jest.mock('../layout/SalesLayout', () => ({
  SalesLayout: ({ title, actions, children }: any) => (
    <div data-testid="sales-layout">
      <div data-testid="layout-header">
        <h1>{title}</h1>
        {actions && <div data-testid="layout-actions">{actions}</div>}
      </div>
      <div data-testid="layout-content">{children}</div>
    </div>
  )
}));

jest.mock('./MetricCard', () => ({
  MetricCard: ({ title, value, unit, trend, isLoading, onClick }: any) => (
    <div 
      data-testid={`metric-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div data-testid="metric-title">{title}</div>
      <div data-testid="metric-value">{isLoading ? 'Loading...' : value}</div>
      {unit && <div data-testid="metric-unit">{unit}</div>}
      {trend && (
        <div data-testid="metric-trend">
          {trend.isPositive ? '+' : '-'}{trend.value}%
          {trend.period && ` ${trend.period}`}
        </div>
      )}
    </div>
  )
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

describe('SalesDashboard', () => {
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // コンソールログをモック化
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('表示状態', () => {
    it('営業ダッシュボードのタイトルが表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      expect(screen.getByText('営業ダッシュボード')).toBeInTheDocument();
    });

    it('メトリックカードが正しく表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      // 各メトリックカードの確認
      expect(screen.getByTestId('metric-card-総提案数')).toBeInTheDocument();
      expect(screen.getByTestId('metric-card-アクティブ提案')).toBeInTheDocument();
      expect(screen.getByTestId('metric-card-今後の面談')).toBeInTheDocument();
      expect(screen.getByTestId('metric-card-延長確認待ち')).toBeInTheDocument();

      // 値の確認
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('更新ボタンが表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} onRefresh={mockOnRefresh} />
      );

      expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
    });

    it('期限アラートが表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      expect(screen.getByText('本日期限の提案が 3 件あります。至急対応をお願いします。')).toBeInTheDocument();
    });

    it('期限がない場合はアラートが表示されない', () => {
      const dataWithoutDeadlines = {
        ...mockDashboardData,
        todayDeadlines: 0
      };

      renderWithTheme(
        <SalesDashboard data={dataWithoutDeadlines} />
      );

      expect(screen.queryByText(/本日期限の提案が/)).not.toBeInTheDocument();
    });

    it('ステータス分布が正しく表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      expect(screen.getByText('提案ステータス分布')).toBeInTheDocument();
      expect(screen.getByText('提案中')).toBeInTheDocument();
      expect(screen.getByText('15件')).toBeInTheDocument();
      expect(screen.getByText('面談中')).toBeInTheDocument();
      expect(screen.getByText('10件')).toBeInTheDocument();
      expect(screen.getByText('採用')).toBeInTheDocument();
      expect(screen.getByText('20件')).toBeInTheDocument();
      expect(screen.getByText('不採用')).toBeInTheDocument();
      expect(screen.getByText('5件')).toBeInTheDocument();
    });

    it('最近の活動が正しく表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      expect(screen.getByText('最近の活動')).toBeInTheDocument();
      expect(screen.getByText('田中エンジニアの新規提案を作成しました')).toBeInTheDocument();
      expect(screen.getByText('ABC株式会社との面談を予定しました')).toBeInTheDocument();
      expect(screen.getByText('佐藤エンジニアの契約延長確認を完了しました')).toBeInTheDocument();
      expect(screen.getByText('不明なタイプのアクティビティ')).toBeInTheDocument();
    });

    it('今週のトレンドが正しく表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      expect(screen.getByText('今週のトレンド')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument(); // 新規提案
      expect(screen.getByText('12')).toBeInTheDocument(); // 面談実施
      expect(screen.getByText('5')).toBeInTheDocument();  // 採用決定
      expect(screen.getByText('新規提案')).toBeInTheDocument();
      expect(screen.getByText('面談実施')).toBeInTheDocument();
      expect(screen.getByText('採用決定')).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はメトリックカードがローディング表示になる', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} isLoading={true} />
      );

      const metricValues = screen.getAllByText('Loading...');
      expect(metricValues.length).toBeGreaterThan(0);
    });

    it('ローディング中は更新ボタンが無効になる', () => {
      renderWithTheme(
        <SalesDashboard 
          data={mockDashboardData} 
          isLoading={true}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByRole('button', { name: '更新' })).toBeDisabled();
    });
  });

  describe('データが空の場合', () => {
    it('空のデータでも正しく表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockEmptyData} />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('提案ステータス分布')).toBeInTheDocument();
      expect(screen.getByText('最近の活動')).toBeInTheDocument();
      expect(screen.getByText('今週のトレンド')).toBeInTheDocument();
    });

    it('ステータス分布が空の場合も正しく表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockEmptyData} />
      );

      // ステータス分布のヘッダーは表示されるが、アイテムは表示されない
      expect(screen.getByText('提案ステータス分布')).toBeInTheDocument();
      expect(screen.queryByText('提案中')).not.toBeInTheDocument();
    });

    it('最近の活動が空の場合も正しく表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockEmptyData} />
      );

      // 最近の活動のヘッダーは表示されるが、活動は表示されない
      expect(screen.getByText('最近の活動')).toBeInTheDocument();
      expect(screen.queryByText('田中エンジニアの新規提案を作成しました')).not.toBeInTheDocument();
    });
  });

  describe('データが未設定の場合', () => {
    it('dataが未設定の場合はモックデータが使用される', () => {
      renderWithTheme(
        <SalesDashboard />
      );

      // モックデータの値が表示される
      expect(screen.getByText('45')).toBeInTheDocument(); // totalProposals
      expect(screen.getByText('12')).toBeInTheDocument(); // activeProposals
      expect(screen.getByText('8')).toBeInTheDocument();  // upcomingInterviews
      expect(screen.getByText('3')).toBeInTheDocument();  // pendingExtensions
    });
  });

  describe('インタラクション', () => {
    it('更新ボタンをクリックすると onRefresh が呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <SalesDashboard 
          data={mockDashboardData} 
          onRefresh={mockOnRefresh}
        />
      );

      const refreshButton = screen.getByRole('button', { name: '更新' });
      await user.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('メトリックカードをクリックすると詳細ページに遷移する', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      const totalProposalsCard = screen.getByTestId('metric-card-総提案数');
      await user.click(totalProposalsCard);

      expect(console.log).toHaveBeenCalledWith('Navigate to proposals details');
    });

    it('アクティブ提案カードをクリックすると適切な詳細ページに遷移する', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      const activeProposalsCard = screen.getByTestId('metric-card-アクティブ提案');
      await user.click(activeProposalsCard);

      expect(console.log).toHaveBeenCalledWith('Navigate to active-proposals details');
    });

    it('面談カードをクリックすると面談詳細ページに遷移する', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      const interviewsCard = screen.getByTestId('metric-card-今後の面談');
      await user.click(interviewsCard);

      expect(console.log).toHaveBeenCalledWith('Navigate to interviews details');
    });

    it('延長確認カードをクリックすると延長詳細ページに遷移する', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      const extensionsCard = screen.getByTestId('metric-card-延長確認待ち');
      await user.click(extensionsCard);

      expect(console.log).toHaveBeenCalledWith('Navigate to extensions details');
    });
  });

  describe('日時フォーマット', () => {
    it('アクティビティのタイムスタンプが正しくフォーマットされる', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      // 日本語形式でフォーマットされた日時が表示される
      // 2024-01-20T10:30:00Z -> 1/20 10:30 形式
      expect(screen.getByText('1/20 10:30')).toBeInTheDocument();
      expect(screen.getByText('1/20 9:15')).toBeInTheDocument();
      expect(screen.getByText('1/19 16:45')).toBeInTheDocument();
      expect(screen.getByText('1/19 14:20')).toBeInTheDocument();
    });
  });

  describe('アクティビティアイコン', () => {
    it('proposal タイプのアクティビティには Assignment アイコンが表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      // AssignmentIcon は proposal タイプで使用される
      const assignmentIcons = screen.getAllByTestId('AssignmentIcon');
      expect(assignmentIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('interview タイプのアクティビティには Event アイコンが表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      // EventIcon は interview タイプで使用される
      const eventIcons = screen.getAllByTestId('EventIcon');
      expect(eventIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('extension タイプのアクティビティには Schedule アイコンが表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      // ScheduleIcon は extension タイプで使用される
      const scheduleIcons = screen.getAllByTestId('ScheduleIcon');
      expect(scheduleIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('不明なタイプのアクティビティには Notifications アイコンが表示される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      // NotificationsIcon は不明なタイプで使用される
      const notificationIcons = screen.getAllByTestId('NotificationsIcon');
      expect(notificationIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル画面でも正しく表示される', () => {
      // ビューポートサイズを変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      renderWithTheme(
        <SalesDashboard data={mockDashboardData} />
      );

      // レイアウトが正しく表示される
      expect(screen.getByTestId('sales-layout')).toBeInTheDocument();
      expect(screen.getByTestId('layout-content')).toBeInTheDocument();
    });
  });

  describe('プロパティの受け渡し', () => {
    it('MetricCard に正しいプロパティが渡される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} isLoading={false} />
      );

      // 総提案数カードの確認
      const totalProposalsCard = screen.getByTestId('metric-card-総提案数');
      expect(totalProposalsCard).toBeInTheDocument();
      
      // トレンド情報の確認
      expect(screen.getByText('+12% 前月比')).toBeInTheDocument();
    });

    it('SalesLayout に正しいプロパティが渡される', () => {
      renderWithTheme(
        <SalesDashboard data={mockDashboardData} onRefresh={mockOnRefresh} />
      );

      expect(screen.getByTestId('sales-layout')).toBeInTheDocument();
      expect(screen.getByTestId('layout-header')).toBeInTheDocument();
      expect(screen.getByTestId('layout-actions')).toBeInTheDocument();
      expect(screen.getByTestId('layout-content')).toBeInTheDocument();
    });
  });
});