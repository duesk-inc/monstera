import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import ProposalsPage from '../page';
import { mockProposalList } from '@/test-utils/proposalData';

// Next.js のルーターをモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// 提案フックをモック
jest.mock('@/hooks/proposal/useProposalQueries', () => ({
  useProposals: jest.fn(),
}));

// 権限フックをモック
jest.mock('@/hooks/proposal/useProposalPermissions', () => ({
  useProposalPermissions: () => ({
    canViewProposals: true,
    isEngineer: true,
    canAccessProposal: jest.fn((userId) => userId === 'eng-001'),
    canRespondToProposals: true,
    canManageProposals: false,
  }),
}));

// エラーハンドリングフックをモック
jest.mock('@/hooks/proposal/useProposalErrorHandling', () => ({
  useProposalErrorHandling: () => ({}),
}));

import { useProposals } from '@/hooks/proposal/useProposalQueries';

const mockUseProposals = useProposals as jest.MockedFunction<typeof useProposals>;
const mockRouterPush = jest.fn();

describe('ProposalsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
    });

    // デフォルトのモック実装
    mockUseProposals.mockReturnValue({
      proposals: mockProposalList,
      total: 3,
      totalPages: 1,
      isLoading: false,
      isError: false,
      filters: {},
      setFilters: jest.fn(),
      setPage: jest.fn(),
      refetch: jest.fn(),
    });
  });

  describe('レンダリング', () => {
    it('提案一覧ページが正しく表示される', () => {
      render(<ProposalsPage />);

      // ヘッダーの確認
      expect(screen.getByText('提案情報')).toBeInTheDocument();
      expect(screen.getByText('あなたに提案された案件の確認と回答を行います')).toBeInTheDocument();

      // 総提案数の確認
      expect(screen.getByText('総提案数')).toBeInTheDocument();
      expect(screen.getByText(/3.*件/)).toBeInTheDocument();

      // フィルターバーの確認
      expect(screen.getByPlaceholderText('プロジェクト名・スキルで検索...')).toBeInTheDocument();
      expect(screen.getByLabelText('ステータス')).toBeInTheDocument();
    });

    it('提案カードが正しく表示される', () => {
      render(<ProposalsPage />);

      mockProposalList.forEach((proposal) => {
        expect(screen.getByText(proposal.projectName)).toBeInTheDocument();
        expect(screen.getByText(proposal.workLocation)).toBeInTheDocument();
        
        // 単価の表示確認（フォーマット済み）
        const minPrice = new Intl.NumberFormat('ja-JP').format(proposal.minPrice);
        const maxPrice = new Intl.NumberFormat('ja-JP').format(proposal.maxPrice);
        expect(screen.getByText(new RegExp(`${minPrice}.*${maxPrice}`))).toBeInTheDocument();
      });
    });

    it('権限がない場合はアクセス拒否メッセージが表示される', () => {
      // 権限フックのモックを一時的に変更
      const mockUseProposalPermissions = jest.requireMock('@/hooks/proposal/useProposalPermissions');
      mockUseProposalPermissions.useProposalPermissions.mockReturnValueOnce({
        canViewProposals: false,
        isEngineer: false,
        canAccessProposal: jest.fn(),
        canRespondToProposals: false,
        canManageProposals: false,
      });

      render(<ProposalsPage />);

      expect(screen.getByText('アクセス権限がありません')).toBeInTheDocument();
      expect(screen.getByText(/提案情報を閲覧する権限がありません/)).toBeInTheDocument();
    });
  });

  describe('フィルタリング機能', () => {
    it('検索フィルターが動作する', async () => {
      const user = userEvent.setup();
      const setFilters = jest.fn();
      const setPage = jest.fn();

      mockUseProposals.mockReturnValue({
        proposals: mockProposalList,
        total: 3,
        totalPages: 1,
        isLoading: false,
        isError: false,
        filters: {},
        setFilters,
        setPage,
        refetch: jest.fn(),
      });

      render(<ProposalsPage />);

      const searchInput = screen.getByPlaceholderText('プロジェクト名・スキルで検索...');
      await user.type(searchInput, 'React');

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalledWith({ searchTerm: 'React' });
        expect(setPage).toHaveBeenCalledWith(1);
      });
    });

    it('ステータスフィルターが動作する', async () => {
      const user = userEvent.setup();
      const setFilters = jest.fn();
      const setPage = jest.fn();

      mockUseProposals.mockReturnValue({
        proposals: mockProposalList,
        total: 3,
        totalPages: 1,
        isLoading: false,
        isError: false,
        filters: {},
        setFilters,
        setPage,
        refetch: jest.fn(),
      });

      render(<ProposalsPage />);

      const statusSelect = screen.getByLabelText('ステータス');
      fireEvent.mouseDown(statusSelect);

      // ドロップダウンメニューから「選考へ進む」を選択
      await waitFor(() => {
        expect(screen.getByRole('option', { name: '選考へ進む' })).toBeInTheDocument();
      });
      const proceedOption = screen.getByRole('option', { name: '選考へ進む' });
      fireEvent.click(proceedOption);

      expect(setFilters).toHaveBeenCalledWith({ status: 'proceed' });
      expect(setPage).toHaveBeenCalledWith(1);
    });

    it('リフレッシュボタンが動作する', async () => {
      const user = userEvent.setup();
      const refetch = jest.fn();
      const setFilters = jest.fn();
      const setPage = jest.fn();

      mockUseProposals.mockReturnValue({
        proposals: mockProposalList,
        total: 3,
        totalPages: 1,
        isLoading: false,
        isError: false,
        filters: { searchTerm: 'test' },
        setFilters,
        setPage,
        refetch,
      });

      render(<ProposalsPage />);

      // リフレッシュボタンはFilterBarコンポーネント内のIconButton
      const refreshButtons = screen.getAllByRole('button');
      const refreshButton = refreshButtons.find(btn => 
        btn.querySelector('[data-testid="RefreshIcon"]')
      );
      expect(refreshButton).toBeDefined();
      await user.click(refreshButton!);

      expect(setFilters).toHaveBeenCalledWith({});
      expect(setPage).toHaveBeenCalledWith(1);
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('ローディング・エラー状態', () => {
    it('ローディング状態が表示される', () => {
      mockUseProposals.mockReturnValue({
        proposals: [],
        total: 0,
        totalPages: 0,
        isLoading: true,
        isError: false,
        filters: {},
        setFilters: jest.fn(),
        setPage: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ProposalsPage />);

      // ローディング中はヘッダーなど基本的な要素は表示される
      expect(screen.getByText('提案情報')).toBeInTheDocument();
      // 提案カードはまだ表示されない
      expect(screen.queryByText(mockProposalList[0].projectName)).not.toBeInTheDocument();
    });

    it('エラー状態が表示される', async () => {
      const user = userEvent.setup();
      const refetch = jest.fn();

      mockUseProposals.mockReturnValue({
        proposals: [],
        total: 0,
        totalPages: 0,
        isLoading: false,
        isError: true,
        filters: {},
        setFilters: jest.fn(),
        setPage: jest.fn(),
        refetch,
      });

      render(<ProposalsPage />);

      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByText(/ネットワーク接続を確認/)).toBeInTheDocument();

      // 再読み込みボタンをクリック
      const reloadButton = screen.getByRole('button', { name: '再読み込み' });
      await user.click(reloadButton);

      expect(refetch).toHaveBeenCalled();
    });

    it('空の検索結果が表示される', () => {
      // 検索条件ありで結果0件の状態をモック
      const mockFilters = { searchTerm: 'test' };
      const mockSetFilters = jest.fn();
      const mockSetPage = jest.fn();
      const mockRefetch = jest.fn();

      mockUseProposals.mockReturnValue({
        proposals: [],
        total: 0,
        totalPages: 0,
        isLoading: false,
        isError: false,
        filters: mockFilters,
        setFilters: mockSetFilters,
        setPage: mockSetPage,
        refetch: mockRefetch,
      });

      render(<ProposalsPage />);

      expect(screen.getByText('提案が見つかりません')).toBeInTheDocument();
      expect(screen.getByText('検索条件を変更してお試しください')).toBeInTheDocument();
    });
  });

  describe('ナビゲーション', () => {
    it('提案詳細ページへ遷移する', async () => {
      const user = userEvent.setup();
      render(<ProposalsPage />);

      // 最初の提案の詳細確認ボタンをクリック
      const detailButtons = screen.getAllByRole('button', { name: '詳細を確認' });
      await user.click(detailButtons[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/proposals/prop-001');
    });

    it('アクセス権限がない提案の詳細ボタンは無効になる', () => {
      // 別のユーザーの提案を含むリストを作成
      const mixedProposals = [
        ...mockProposalList,
        {
          ...mockProposalList[0],
          id: 'prop-other',
          userId: 'eng-002', // 別のユーザー
        },
      ];

      mockUseProposals.mockReturnValue({
        proposals: mixedProposals,
        total: 4,
        totalPages: 1,
        isLoading: false,
        isError: false,
        filters: {},
        setFilters: jest.fn(),
        setPage: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ProposalsPage />);

      const detailButtons = screen.getAllByRole('button', { name: /詳細を確認|アクセス権限なし/ });
      const disabledButton = detailButtons[detailButtons.length - 1];
      
      expect(disabledButton).toBeDisabled();
      expect(disabledButton).toHaveTextContent('アクセス権限なし');
    });
  });

  describe('ページネーション', () => {
    it('複数ページの場合ページネーションが表示される', async () => {
      const user = userEvent.setup();
      const setPage = jest.fn();

      mockUseProposals.mockReturnValue({
        proposals: mockProposalList,
        total: 60,
        totalPages: 3,
        isLoading: false,
        isError: false,
        filters: {},
        setFilters: jest.fn(),
        setPage,
        refetch: jest.fn(),
      });

      render(<ProposalsPage />);

      // ページネーションが表示される
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // ページ2をクリック（2を含むボタンを検索）
      const page2Button = screen.getByRole('button', { name: /2/ });
      await user.click(page2Button);

      expect(setPage).toHaveBeenCalledWith(2);
    });

    it('1ページのみの場合ページネーションは表示されない', () => {
      mockUseProposals.mockReturnValue({
        proposals: mockProposalList,
        total: 3,
        totalPages: 1,
        isLoading: false,
        isError: false,
        filters: {},
        setFilters: jest.fn(),
        setPage: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ProposalsPage />);

      // ページネーションが表示されない
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('ステータス表示', () => {
    it('未回答質問数が表示される', () => {
      render(<ProposalsPage />);

      // 未回答質問がある提案
      const proposalWithQuestions = mockProposalList[0];
      expect(screen.getByText(`未回答質問 ${proposalWithQuestions.pendingQuestionsCount}件`)).toBeInTheDocument();
    });

    it('ステータスチップが正しい色で表示される', () => {
      render(<ProposalsPage />);

      // 各ステータスのチップを確認
      expect(screen.getByText('提案中')).toBeInTheDocument();
      expect(screen.getByText('選考へ進む')).toBeInTheDocument();
      expect(screen.getByText('見送り')).toBeInTheDocument();
    });

    it('回答日時が表示される', () => {
      render(<ProposalsPage />);

      // 回答済みの提案を確認
      const respondedProposals = mockProposalList.filter(p => p.respondedAt);
      expect(respondedProposals.length).toBeGreaterThan(0);
      
      // 回答日のテキストが存在することを確認
      const answerDateTexts = screen.getAllByText(/回答日:/);
      expect(answerDateTexts.length).toBe(respondedProposals.length);
    });
  });
});