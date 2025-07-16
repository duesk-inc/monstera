import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ProposalDataTable } from './ProposalDataTable';
import type { Proposal, ProposalStatus } from '@/types/sales';
import { PROPOSAL_STATUS } from '@/constants/sales';

// モックデータ
const mockProposals: Proposal[] = [
  {
    id: '1',
    engineerId: 'eng1',
    engineerName: '田中太郎',
    clientId: 'cli1',
    clientName: '株式会社ABC',
    projectName: 'システム開発プロジェクト',
    proposalAmount: 700000,
    amountType: 'monthly',
    status: 'draft',
    proposalDate: '2024-01-15',
    responseDeadline: '2024-02-15',
    interviewDate: null,
    notes: 'テスト提案1',
    currentStage: 'proposal',
    lastContactDate: '2024-01-15',
    nextActionDate: '2024-01-20',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z'
  },
  {
    id: '2',
    engineerId: 'eng2',
    engineerName: '山田花子',
    clientId: 'cli2',
    clientName: '株式会社XYZ',
    projectName: 'Webアプリ開発',
    proposalAmount: 850000,
    amountType: 'monthly',
    status: 'pending',
    proposalDate: '2024-01-10',
    responseDeadline: '2024-01-25',
    interviewDate: '2024-01-20',
    notes: 'テスト提案2',
    currentStage: 'negotiation',
    lastContactDate: '2024-01-12',
    nextActionDate: '2024-01-18',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-12T14:00:00Z'
  },
  {
    id: '3',
    engineerId: 'eng3',
    engineerName: '佐藤次郎',
    clientId: 'cli3',
    clientName: '株式会社DEF',
    projectName: null,
    proposalAmount: 600000,
    amountType: 'monthly',
    status: 'in_interview',
    proposalDate: '2024-01-05',
    responseDeadline: '2024-01-20',
    interviewDate: '2024-01-18',
    notes: 'テスト提案3',
    currentStage: 'interview',
    lastContactDate: '2024-01-16',
    nextActionDate: '2024-01-18',
    createdAt: '2024-01-05T11:00:00Z',
    updatedAt: '2024-01-16T15:00:00Z'
  }
];

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

describe('ProposalDataTable', () => {
  const mockOnRowClick = jest.fn();
  const mockOnStatusChange = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnSendEmail = jest.fn();
  const mockOnScheduleInterview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示状態', () => {
    it('データが正しく表示される', () => {
      renderWithTheme(
        <ProposalDataTable
          data={mockProposals}
          onRowClick={mockOnRowClick}
        />
      );

      // ヘッダーの確認
      expect(screen.getByText('エンジニア')).toBeInTheDocument();
      expect(screen.getByText('クライアント')).toBeInTheDocument();
      expect(screen.getByText('提案金額')).toBeInTheDocument();
      expect(screen.getByText('ステータス')).toBeInTheDocument();
      expect(screen.getByText('提案日')).toBeInTheDocument();
      expect(screen.getByText('回答期限')).toBeInTheDocument();
      expect(screen.getByText('面談日')).toBeInTheDocument();

      // データの確認
      mockProposals.forEach((proposal) => {
        expect(screen.getByText(proposal.engineerName)).toBeInTheDocument();
        expect(screen.getByText(proposal.clientName)).toBeInTheDocument();
        if (proposal.projectName) {
          expect(screen.getByText(proposal.projectName)).toBeInTheDocument();
        }
      });
    });

    it('ローディング状態が正しく表示される', () => {
      renderWithTheme(
        <ProposalDataTable
          data={[]}
          isLoading={true}
        />
      );

      const loadingTexts = screen.getAllByText('読み込み中...');
      expect(loadingTexts.length).toBeGreaterThan(0);
    });

    it('データが空の場合のメッセージが表示される', () => {
      renderWithTheme(
        <ProposalDataTable
          data={[]}
          isLoading={false}
        />
      );

      expect(screen.getByText('提案データがありません')).toBeInTheDocument();
      expect(screen.getByText('新しい提案を作成してください')).toBeInTheDocument();
    });

    it('金額が正しくフォーマットされて表示される', () => {
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[0]]}
        />
      );

      expect(screen.getByText('¥700,000')).toBeInTheDocument();
      expect(screen.getByText('月額')).toBeInTheDocument();
    });

    it('期限切れの回答期限が赤色で表示される', () => {
      const expiredProposal = {
        ...mockProposals[0],
        responseDeadline: '2020-01-01'
      };

      renderWithTheme(
        <ProposalDataTable
          data={[expiredProposal]}
        />
      );

      const deadlineCell = screen.getByText('2020/01/01');
      expect(deadlineCell).toHaveStyle({ color: theme.palette.error.main });
    });
  });

  describe('インタラクション', () => {
    it('行クリックで onRowClick が呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ProposalDataTable
          data={mockProposals}
          onRowClick={mockOnRowClick}
        />
      );

      const firstRow = screen.getByText(mockProposals[0].engineerName).closest('tr');
      await user.click(firstRow!);

      expect(mockOnRowClick).toHaveBeenCalledWith(mockProposals[0]);
    });

    it('ステータス変更ボタンが正しく表示・動作する', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[0]]} // draft status
          onStatusChange={mockOnStatusChange}
        />
      );

      // draft から pending への変更ボタンがあることを確認
      const pendingButton = screen.getByRole('button', { name: PROPOSAL_STATUS.pending });
      expect(pendingButton).toBeInTheDocument();

      await user.click(pendingButton);
      expect(mockOnStatusChange).toHaveBeenCalledWith(mockProposals[0], 'pending');
    });

    it('メニューが正しく開閉する', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ProposalDataTable
          data={mockProposals}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // メニューボタンをクリック
      const menuButtons = screen.getAllByRole('button', { name: '' }); // MoreVert icon button
      const firstMenuButton = menuButtons.find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      
      await user.click(firstMenuButton!);

      // メニューアイテムが表示される
      expect(screen.getByText('詳細表示')).toBeInTheDocument();
      expect(screen.getByText('編集')).toBeInTheDocument();
      expect(screen.getByText('メール送信')).toBeInTheDocument();
      expect(screen.getByText('削除')).toBeInTheDocument();
    });

    it('編集メニューをクリックすると onEdit が呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[0]]}
          onEdit={mockOnEdit}
        />
      );

      // メニューを開く
      const menuButton = screen.getByRole('button').parentElement?.querySelector('button[aria-label=""]');
      await user.click(menuButton!);

      // 編集をクリック
      const editMenuItem = screen.getByText('編集');
      await user.click(editMenuItem);

      expect(mockOnEdit).toHaveBeenCalledWith(mockProposals[0]);
    });

    it('削除メニューがドラフトステータスでのみ表示される', async () => {
      const user = userEvent.setup();
      
      // pending status の提案でテスト
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[1]]} // pending status
          onDelete={mockOnDelete}
        />
      );

      // メニューを開く
      const menuButton = screen.getAllByRole('button').find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      await user.click(menuButton!);

      // 削除メニューが表示されないことを確認
      expect(screen.queryByText('削除')).not.toBeInTheDocument();
    });
  });

  describe('ステータスに応じた機能制限', () => {
    it('draft ステータスでは pending への変更のみ可能', () => {
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[0]]} // draft
          onStatusChange={mockOnStatusChange}
        />
      );

      // pending ボタンのみ存在
      expect(screen.getByRole('button', { name: PROPOSAL_STATUS.pending })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: PROPOSAL_STATUS.in_interview })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: PROPOSAL_STATUS.rejected })).not.toBeInTheDocument();
    });

    it('pending ステータスでは複数の変更オプションが表示される', () => {
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[1]]} // pending
          onStatusChange={mockOnStatusChange}
        />
      );

      expect(screen.getByRole('button', { name: PROPOSAL_STATUS.in_interview })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: PROPOSAL_STATUS.rejected })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: PROPOSAL_STATUS.cancelled })).toBeInTheDocument();
    });

    it('in_interview ステータスでは accepted と rejected への変更が可能', () => {
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[2]]} // in_interview
          onStatusChange={mockOnStatusChange}
        />
      );

      expect(screen.getByRole('button', { name: PROPOSAL_STATUS.accepted })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: PROPOSAL_STATUS.rejected })).toBeInTheDocument();
    });
  });

  describe('条件付き表示', () => {
    it('プロジェクト名がない場合は表示されない', () => {
      const proposalWithoutProject = {
        ...mockProposals[0],
        projectName: null
      };

      renderWithTheme(
        <ProposalDataTable
          data={[proposalWithoutProject]}
        />
      );

      expect(screen.getByText(proposalWithoutProject.clientName)).toBeInTheDocument();
      expect(screen.queryByText('システム開発プロジェクト')).not.toBeInTheDocument();
    });

    it('面談日が設定されていない場合は「未設定」と表示される', () => {
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[0]]} // interviewDate: null
        />
      );

      const unsetTexts = screen.getAllByText('未設定');
      expect(unsetTexts.length).toBeGreaterThan(0);
    });

    it('面談予定メニューは pending と in_interview ステータスでのみ表示される', async () => {
      const user = userEvent.setup();
      
      // draft status でテスト
      const { rerender } = renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[0]]} // draft
          onScheduleInterview={mockOnScheduleInterview}
        />
      );

      // メニューを開く
      let menuButton = screen.getAllByRole('button').find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      await user.click(menuButton!);

      // 面談予定メニューが表示されないことを確認
      expect(screen.queryByText('面談予定')).not.toBeInTheDocument();

      // メニューを閉じる
      await user.click(document.body);

      // pending status でテスト
      rerender(
        <ThemeProvider theme={theme}>
          <ProposalDataTable
            data={[mockProposals[1]]} // pending
            onScheduleInterview={mockOnScheduleInterview}
          />
        </ThemeProvider>
      );

      // 新しいメニューボタンを取得
      menuButton = screen.getAllByRole('button').find(button => 
        button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      await user.click(menuButton!);

      // 面談予定メニューが表示されることを確認
      expect(screen.getByText('面談予定')).toBeInTheDocument();
    });
  });

  describe('イベント伝播', () => {
    it('ステータス変更ボタンクリック時に行クリックイベントが発生しない', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[0]]}
          onRowClick={mockOnRowClick}
          onStatusChange={mockOnStatusChange}
        />
      );

      const statusButton = screen.getByRole('button', { name: PROPOSAL_STATUS.pending });
      await user.click(statusButton);

      expect(mockOnStatusChange).toHaveBeenCalled();
      expect(mockOnRowClick).not.toHaveBeenCalled();
    });

    it('メニューボタンクリック時に行クリックイベントが発生しない', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <ProposalDataTable
          data={[mockProposals[0]]}
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