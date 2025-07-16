import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ContractExtensionTable } from './ContractExtensionTable';
import type { ContractExtension } from '@/types/sales';

// 型定義を一時的に拡張（実際の型と合わせるため）
interface ExtendedContractExtension extends ContractExtension {
  currentClientName: string;
  currentRate: number;
  currentRateType: string;
  extensionStartDate: string;
  extensionEndDate: string;
  extensionType: 'new' | 'renewal' | 'rate_change';
  proposedRate?: number;
  proposedRateType?: string;
  deadlineDate?: string;
  assignedTo?: string;
}

// モック定数
const EXTENSION_STATUS = {
  pending: '未確認',
  in_progress: '進行中',
  approved: '承認済み',
  rejected: '却下',
  expired: '期限切れ'
} as const;

const EXTENSION_STATUS_COLORS = {
  pending: '#FF9800',
  in_progress: '#2196F3',
  approved: '#4CAF50',
  rejected: '#F44336',
  expired: '#757575'
} as const;

const EXTENSION_TYPE = {
  new: '新規',
  renewal: '更新',
  rate_change: '単価変更'
} as const;

// モックデータ
const mockExtensions: ExtendedContractExtension[] = [
  {
    id: '1',
    engineerId: 'eng1',
    engineerName: '田中太郎',
    currentClientName: '株式会社ABC',
    currentContractEnd: '2024-03-31',
    currentRate: 700000,
    currentRateType: '月額',
    extensionCheckDate: '2024-01-01',
    extensionStartDate: '2024-04-01',
    extensionEndDate: '2024-09-30',
    extensionType: 'renewal',
    proposedRate: 750000,
    proposedRateType: '月額',
    status: 'pending',
    deadlineDate: '2024-02-15',
    assignedTo: '営業太郎',
    notes: '継続希望',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user1'
  },
  {
    id: '2',
    engineerId: 'eng2',
    engineerName: '佐藤花子',
    currentClientName: '株式会社XYZ',
    currentContractEnd: '2024-02-29',
    currentRate: 650000,
    currentRateType: '月額',
    extensionCheckDate: '2024-01-05',
    extensionStartDate: '2024-03-01',
    extensionEndDate: '2024-08-31',
    extensionType: 'new',
    proposedRate: 650000,
    proposedRateType: '月額',
    status: 'in_progress',
    deadlineDate: '2024-01-25', // 期限が近い
    assignedTo: '営業花子',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    createdBy: 'user2'
  },
  {
    id: '3',
    engineerId: 'eng3',
    engineerName: '鈴木一郎',
    currentClientName: '株式会社DEF',
    currentContractEnd: '2024-01-31',
    currentRate: 800000,
    currentRateType: '月額',
    extensionCheckDate: '2024-01-10',
    extensionStartDate: '2024-02-01',
    extensionEndDate: '2024-07-31',
    extensionType: 'rate_change',
    status: 'approved',
    deadlineDate: '2024-01-15', // 期限切れ（過去）
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    createdBy: 'user3'
  },
  {
    id: '4',
    engineerId: 'eng4',
    engineerName: '山田次郎',
    currentClientName: '株式会社GHI',
    currentContractEnd: '2024-04-30',
    currentRate: 600000,
    currentRateType: '月額',
    extensionCheckDate: '2024-01-15',
    extensionStartDate: '2024-05-01',
    extensionEndDate: '2024-10-31',
    extensionType: 'renewal',
    proposedRate: 550000, // 減額
    proposedRateType: '月額',
    status: 'rejected',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    createdBy: 'user4'
  }
];

// モック関数
jest.mock('@/constants/sales', () => ({
  CONTRACT_EXTENSION_STATUS: EXTENSION_STATUS,
  CONTRACT_EXTENSION_STATUS_COLORS: EXTENSION_STATUS_COLORS,
  EXTENSION_STATUS,
  EXTENSION_STATUS_COLORS,
  EXTENSION_TYPE
}));

jest.mock('@/utils/formatUtils', () => ({
  formatCurrency: (amount: number) => `¥${amount.toLocaleString()}`,
  formatDate: (date: string) => new Date(date).toLocaleDateString('ja-JP')
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

describe('ContractExtensionTable', () => {
  const mockOnRowClick = jest.fn();
  const mockOnStatusChange = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnSendReminder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // 現在日時を固定（2024-01-20）
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-20'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('表示状態', () => {
    it('データが正しく表示される', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={mockExtensions as ContractExtension[]}
          onRowClick={mockOnRowClick}
        />
      );

      // ヘッダーの確認
      expect(screen.getByText('エンジニア')).toBeInTheDocument();
      expect(screen.getByText('現在単価')).toBeInTheDocument();
      expect(screen.getByText('延長期間')).toBeInTheDocument();
      expect(screen.getByText('延長単価')).toBeInTheDocument();
      expect(screen.getByText('ステータス')).toBeInTheDocument();
      expect(screen.getByText('期限')).toBeInTheDocument();
      expect(screen.getByText('担当者')).toBeInTheDocument();

      // データの確認
      expect(screen.getByText('田中太郎')).toBeInTheDocument();
      expect(screen.getByText('株式会社ABC')).toBeInTheDocument();
      expect(screen.getByText('¥700,000')).toBeInTheDocument();
      expect(screen.getByText('¥750,000')).toBeInTheDocument();
      expect(screen.getByText('営業太郎')).toBeInTheDocument();
    });

    it('ローディング状態が正しく表示される', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[]}
          isLoading={true}
        />
      );

      const loadingTexts = screen.getAllByText('読み込み中...');
      expect(loadingTexts.length).toBeGreaterThan(0);
    });

    it('データが空の場合のメッセージが表示される', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[]}
          isLoading={false}
        />
      );

      expect(screen.getByText('契約延長データがありません')).toBeInTheDocument();
      expect(screen.getByText('新しい延長確認を作成してください')).toBeInTheDocument();
    });

    it('単価の増減が正しく表示される', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[0], mockExtensions[3]] as ContractExtension[]}
        />
      );

      // 増額（田中太郎: 700,000 → 750,000）
      expect(screen.getByText('+¥50,000')).toBeInTheDocument();
      
      // 減額（山田次郎: 600,000 → 550,000）
      expect(screen.getByText('-¥50,000')).toBeInTheDocument();
    });

    it('提案単価が未設定の場合は「未設定」と表示される', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[2]] as ContractExtension[]}
        />
      );

      expect(screen.getByText('未設定')).toBeInTheDocument();
    });
  });

  describe('緊急度表示', () => {
    it('期限切れの案件は赤色で表示される', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[2]] as ContractExtension[]}
        />
      );

      // 期限切れの行は背景色が変わる
      const row = screen.getByText('鈴木一郎').closest('tr');
      expect(row).toHaveStyle({
        backgroundColor: theme.palette.error.light + '20'
      });

      // 警告アイコンが表示される
      const warningIcon = within(row!).getByTestId('WarningIcon');
      expect(warningIcon).toBeInTheDocument();
    });

    it('緊急案件は橙色で表示される', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[1]] as ContractExtension[]}
        />
      );

      // 緊急案件の行は背景色が変わる
      const row = screen.getByText('佐藤花子').closest('tr');
      expect(row).toHaveStyle({
        backgroundColor: theme.palette.warning.light + '20'
      });
    });

    it('通常の案件は背景色が変わらない', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[0]] as ContractExtension[]}
        />
      );

      const row = screen.getByText('田中太郎').closest('tr');
      expect(row).toHaveStyle({
        backgroundColor: 'inherit'
      });
    });
  });

  describe('インタラクション', () => {
    it('行クリックで onRowClick が呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ContractExtensionTable
          data={mockExtensions as ContractExtension[]}
          onRowClick={mockOnRowClick}
        />
      );

      const firstRow = screen.getByText('田中太郎').closest('tr');
      await user.click(firstRow!);

      expect(mockOnRowClick).toHaveBeenCalledWith(mockExtensions[0]);
    });

    it('ステータス変更ボタンが正しく表示・動作する', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[0]] as ContractExtension[]} // pending status
          onStatusChange={mockOnStatusChange}
        />
      );

      // pending から in_progress への変更ボタンがあることを確認
      const inProgressButton = screen.getByRole('button', { name: EXTENSION_STATUS.in_progress });
      expect(inProgressButton).toBeInTheDocument();

      await user.click(inProgressButton);
      expect(mockOnStatusChange).toHaveBeenCalledWith(mockExtensions[0], 'in_progress');
    });

    it('メニューが正しく開閉する', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ContractExtensionTable
          data={mockExtensions as ContractExtension[]}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // メニューボタンをクリック
      const menuButtons = screen.getAllByRole('button', { name: '' });
      const firstMenuButton = menuButtons.find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      
      await user.click(firstMenuButton!);

      // メニューアイテムが表示される
      expect(screen.getByText('詳細表示')).toBeInTheDocument();
      expect(screen.getByText('編集')).toBeInTheDocument();
      expect(screen.getByText('承認')).toBeInTheDocument();
      expect(screen.getByText('却下')).toBeInTheDocument();
      expect(screen.getByText('リマインダー送信')).toBeInTheDocument();
    });

    it('編集メニューをクリックすると onEdit が呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[0]] as ContractExtension[]}
          onEdit={mockOnEdit}
        />
      );

      // メニューを開く
      const menuButton = screen.getAllByRole('button').find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      await user.click(menuButton!);

      // 編集をクリック
      const editMenuItem = screen.getByText('編集');
      await user.click(editMenuItem);

      expect(mockOnEdit).toHaveBeenCalledWith(mockExtensions[0]);
    });

    it('承認メニューをクリックすると onApprove が呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[1]] as ContractExtension[]} // in_progress status
          onApprove={mockOnApprove}
        />
      );

      // メニューを開く
      const menuButton = screen.getAllByRole('button').find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      await user.click(menuButton!);

      // 承認をクリック
      const approveMenuItem = screen.getByText('承認');
      await user.click(approveMenuItem);

      expect(mockOnApprove).toHaveBeenCalledWith(mockExtensions[1]);
    });

    it('リマインダー送信メニューをクリックすると onSendReminder が呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[0]] as ContractExtension[]}
          onSendReminder={mockOnSendReminder}
        />
      );

      // メニューを開く
      const menuButton = screen.getAllByRole('button').find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      await user.click(menuButton!);

      // リマインダー送信をクリック
      const reminderMenuItem = screen.getByText('リマインダー送信');
      await user.click(reminderMenuItem);

      expect(mockOnSendReminder).toHaveBeenCalledWith(mockExtensions[0]);
    });
  });

  describe('ステータスに応じた機能制限', () => {
    it('pending ステータスでは in_progress への変更のみ可能', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[0]] as ContractExtension[]} // pending
          onStatusChange={mockOnStatusChange}
        />
      );

      // in_progress ボタンのみ存在
      expect(screen.getByRole('button', { name: EXTENSION_STATUS.in_progress })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: EXTENSION_STATUS.approved })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: EXTENSION_STATUS.rejected })).not.toBeInTheDocument();
    });

    it('in_progress ステータスでは approved と rejected への変更が可能', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[1]] as ContractExtension[]} // in_progress
          onStatusChange={mockOnStatusChange}
        />
      );

      expect(screen.getByRole('button', { name: EXTENSION_STATUS.approved })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: EXTENSION_STATUS.rejected })).toBeInTheDocument();
    });

    it('approved ステータスではクイックアクションが表示されない', () => {
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[2]] as ContractExtension[]} // approved
          onStatusChange={mockOnStatusChange}
        />
      );

      expect(screen.queryByRole('button', { name: EXTENSION_STATUS.in_progress })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: EXTENSION_STATUS.approved })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: EXTENSION_STATUS.rejected })).not.toBeInTheDocument();
    });

    it('承認済みステータスでは編集・承認・却下メニューが表示されない', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[2]] as ContractExtension[]} // approved
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // メニューを開く
      const menuButton = screen.getAllByRole('button').find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      await user.click(menuButton!);

      // 編集・承認・却下メニューが表示されない
      expect(screen.queryByText('編集')).not.toBeInTheDocument();
      expect(screen.queryByText('承認')).not.toBeInTheDocument();
      expect(screen.queryByText('却下')).not.toBeInTheDocument();
      
      // 詳細表示とリマインダー送信は表示される
      expect(screen.getByText('詳細表示')).toBeInTheDocument();
      expect(screen.getByText('リマインダー送信')).toBeInTheDocument();
    });
  });

  describe('条件付き表示', () => {
    it('担当者が未割当の場合は「未割当」と表示される', () => {
      const extensionWithoutAssignee = {
        ...mockExtensions[0],
        assignedTo: undefined
      };

      renderWithTheme(
        <ContractExtensionTable
          data={[extensionWithoutAssignee] as ContractExtension[]}
        />
      );

      expect(screen.getByText('未割当')).toBeInTheDocument();
    });

    it('期限が未設定の場合は「未設定」と表示される', () => {
      const extensionWithoutDeadline = {
        ...mockExtensions[0],
        deadlineDate: undefined
      };

      renderWithTheme(
        <ContractExtensionTable
          data={[extensionWithoutDeadline] as ContractExtension[]}
        />
      );

      expect(screen.getAllByText('未設定')).toHaveLength(1);
    });
  });

  describe('イベント伝播', () => {
    it('ステータス変更ボタンクリック時に行クリックイベントが発生しない', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[0]] as ContractExtension[]}
          onRowClick={mockOnRowClick}
          onStatusChange={mockOnStatusChange}
        />
      );

      const statusButton = screen.getByRole('button', { name: EXTENSION_STATUS.in_progress });
      await user.click(statusButton);

      expect(mockOnStatusChange).toHaveBeenCalled();
      expect(mockOnRowClick).not.toHaveBeenCalled();
    });

    it('メニューボタンクリック時に行クリックイベントが発生しない', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ContractExtensionTable
          data={[mockExtensions[0]] as ContractExtension[]}
          onRowClick={mockOnRowClick}
        />
      );

      const menuButton = screen.getAllByRole('button').find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      await user.click(menuButton!);

      expect(mockOnRowClick).not.toHaveBeenCalled();
    });
  });
});