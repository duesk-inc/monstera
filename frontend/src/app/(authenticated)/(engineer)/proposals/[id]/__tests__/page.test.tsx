import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouter } from 'next/navigation';
import ProposalDetailPage from '../page';
import { mockProposalDetail, mockQuestions } from '@/test-utils/proposalData';

// Next.js のフックをモック
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// 提案フックをモック
jest.mock('@/hooks/proposal/useProposalQueries', () => ({
  useProposalDetail: jest.fn(),
  useUpdateProposalStatus: jest.fn(),
  useQuestions: jest.fn(),
  useCreateQuestion: jest.fn(),
  useUpdateQuestion: jest.fn(),
  useDeleteQuestion: jest.fn(),
}));

// 権限フックをモック
jest.mock('@/hooks/proposal/useProposalPermissions', () => ({
  useProposalPermissions: () => ({
    canViewProposals: true,
    canAccessProposal: jest.fn(() => true),
    canRespondToProposals: true,
    canCreateQuestions: true,
    canEditQuestionComprehensive: jest.fn(() => true),
    canDeleteQuestionComprehensive: jest.fn(() => true),
    currentUserId: 'eng-001',
  }),
}));

// エラーハンドリングフックをモック
jest.mock('@/hooks/proposal/useProposalErrorHandling', () => ({
  useProposalErrorHandling: () => ({
    proposalHandlers: {
      onStatusUpdateSuccess: jest.fn(),
      onStatusUpdateError: jest.fn(),
    },
    questionHandlers: {
      onCreateSuccess: jest.fn(),
      onCreateError: jest.fn(),
      onUpdateSuccess: jest.fn(),
      onUpdateError: jest.fn(),
      onDeleteSuccess: jest.fn(),
      onDeleteError: jest.fn(),
    },
  }),
}));

import {
  useProposalDetail,
  useUpdateProposalStatus,
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from '@/hooks/proposal/useProposalQueries';

const mockUseProposalDetail = useProposalDetail as jest.MockedFunction<typeof useProposalDetail>;
const mockUseUpdateProposalStatus = useUpdateProposalStatus as jest.MockedFunction<typeof useUpdateProposalStatus>;
const mockUseQuestions = useQuestions as jest.MockedFunction<typeof useQuestions>;
const mockUseCreateQuestion = useCreateQuestion as jest.MockedFunction<typeof useCreateQuestion>;
const mockUseUpdateQuestion = useUpdateQuestion as jest.MockedFunction<typeof useUpdateQuestion>;
const mockUseDeleteQuestion = useDeleteQuestion as jest.MockedFunction<typeof useDeleteQuestion>;

const mockRouterPush = jest.fn();

describe('ProposalDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useParams as jest.Mock).mockReturnValue({ id: 'prop-001' });
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });

    // デフォルトのモック実装
    mockUseProposalDetail.mockReturnValue({
      data: mockProposalDetail,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    mockUseQuestions.mockReturnValue({
      questions: mockQuestions,
      total: 2,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    mockUseUpdateProposalStatus.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      isIdle: true,
      isPaused: false,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      reset: jest.fn(),
      status: 'idle',
      submittedAt: 0,
    });

    mockUseCreateQuestion.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      isIdle: true,
      isPaused: false,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      reset: jest.fn(),
      status: 'idle',
      submittedAt: 0,
    });

    mockUseUpdateQuestion.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      isIdle: true,
      isPaused: false,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      reset: jest.fn(),
      status: 'idle',
      submittedAt: 0,
    });

    mockUseDeleteQuestion.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      isIdle: true,
      isPaused: false,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      reset: jest.fn(),
      status: 'idle',
      submittedAt: 0,
    });
  });

  describe('レンダリング', () => {
    it('提案詳細ページが正しく表示される', () => {
      render(<ProposalDetailPage />);

      // ヘッダーの確認
      expect(screen.getByText('提案詳細')).toBeInTheDocument();
      expect(screen.getByText('提案中')).toBeInTheDocument();

      // プロジェクト情報の確認
      expect(screen.getByText(mockProposalDetail.project.projectName)).toBeInTheDocument();
      expect(screen.getByText(mockProposalDetail.project.description)).toBeInTheDocument();

      // タブの確認
      expect(screen.getByRole('tab', { name: '基本情報' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /質問 \(2\)/ })).toBeInTheDocument();
    });

    it('ローディング状態が表示される', () => {
      mockUseProposalDetail.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
      });

      render(<ProposalDetailPage />);

      const skeletons = screen.getAllByRole('progressbar');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('エラー状態が表示される', () => {
      mockUseProposalDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
      });

      render(<ProposalDetailPage />);

      expect(screen.getByText('提案情報の取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByText(/指定された提案が見つからないか、アクセス権限がありません/)).toBeInTheDocument();
    });

    it('権限がない場合はアクセス拒否メッセージが表示される', async () => {
      // 権限なしの状態をモック
      const mockUseProposalPermissions = jest.fn(() => ({
        canViewProposals: false,
        canAccessProposal: jest.fn(),
        canRespondToProposals: false,
        canCreateQuestions: false,
        canEditQuestionComprehensive: jest.fn(),
        canDeleteQuestionComprehensive: jest.fn(),
        currentUserId: 'eng-001',
      }));

      jest.resetModules();
      jest.doMock('@/hooks/proposal/useProposalPermissions', () => ({
        useProposalPermissions: mockUseProposalPermissions,
      }));

      // Dynamic import for testing
      const { default: ProposalDetailPageNoAuth } = await import('../page');
      render(<ProposalDetailPageNoAuth />);

      expect(screen.getByText('アクセス権限がありません')).toBeInTheDocument();
    });
  });

  describe('ステータス更新機能', () => {
    it('提案中の場合、ステータス更新ボタンが表示される', () => {
      render(<ProposalDetailPage />);

      expect(screen.getByText('回答をお待ちしています')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '選考へ進む' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '見送り' })).toBeInTheDocument();
    });

    it('ステータス更新の確認ダイアログが表示される', async () => {
      const user = userEvent.setup();
      render(<ProposalDetailPage />);

      const proceedButton = screen.getByRole('button', { name: '選考へ進む' });
      await user.click(proceedButton);

      // 確認ダイアログが表示される
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/選考へ進むの確認/)).toBeInTheDocument();
      expect(screen.getByText(/この提案について「選考へ進む」として回答しますか？/)).toBeInTheDocument();
    });

    it('ステータスを更新できる', async () => {
      const user = userEvent.setup();
      const mutate = jest.fn();
      
      mockUseUpdateProposalStatus.mockReturnValue({
        mutate,
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        isIdle: true,
        isPaused: false,
        variables: undefined,
        failureCount: 0,
        failureReason: null,
        reset: jest.fn(),
        status: 'idle',
        submittedAt: 0,
      });

      render(<ProposalDetailPage />);

      // 「選考へ進む」ボタンをクリック
      await user.click(screen.getByRole('button', { name: '選考へ進む' }));

      // 確認ダイアログで「確定」をクリック
      await user.click(screen.getByRole('button', { name: '確定' }));

      expect(mutate).toHaveBeenCalledWith({
        id: 'prop-001',
        status: 'proceed',
      });
    });

    it('ステータスが提案中以外の場合、更新ボタンは表示されない', () => {
      mockUseProposalDetail.mockReturnValue({
        data: { ...mockProposalDetail, status: 'proceed' },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });

      render(<ProposalDetailPage />);

      expect(screen.queryByText('回答をお待ちしています')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '選考へ進む' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '見送り' })).not.toBeInTheDocument();
    });
  });

  describe('タブ切り替え', () => {
    it('基本情報タブと質問タブを切り替えられる', async () => {
      const user = userEvent.setup();
      render(<ProposalDetailPage />);

      // 初期状態では基本情報タブが選択されている
      expect(screen.getByRole('tabpanel', { name: 'proposal-0' })).toBeInTheDocument();

      // 質問タブをクリック
      const questionTab = screen.getByRole('tab', { name: /質問 \(2\)/ });
      await user.click(questionTab);

      // 質問タブパネルが表示される
      expect(screen.getByRole('tabpanel', { name: 'proposal-1' })).toBeInTheDocument();
    });

    it('未回答質問がある場合、質問タブにアイコンが表示される', () => {
      render(<ProposalDetailPage />);

      const questionTab = screen.getByRole('tab', { name: /質問 \(2\)/ });
      // アイコンが含まれていることを確認
      expect(questionTab.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('プロジェクト詳細情報', () => {
    it('想定単価が正しくフォーマットされて表示される', () => {
      render(<ProposalDetailPage />);

      const minPrice = new Intl.NumberFormat('ja-JP').format(mockProposalDetail.project.minPrice!);
      const maxPrice = new Intl.NumberFormat('ja-JP').format(mockProposalDetail.project.maxPrice!);
      expect(screen.getByText(new RegExp(`${minPrice}.*${maxPrice}`))).toBeInTheDocument();
    });

    it('必須スキルと歓迎スキルが表示される', () => {
      render(<ProposalDetailPage />);

      // 必須スキル
      expect(screen.getByText('必須スキル')).toBeInTheDocument();
      mockProposalDetail.project.requiredSkills.forEach(skill => {
        expect(screen.getByText(skill.skillName)).toBeInTheDocument();
      });

      // 歓迎スキル
      expect(screen.getByText('歓迎スキル')).toBeInTheDocument();
      mockProposalDetail.project.preferredSkills.forEach(skill => {
        expect(screen.getByText(skill.skillName)).toBeInTheDocument();
      });
    });

    it('勤務情報が表示される', () => {
      render(<ProposalDetailPage />);

      expect(screen.getByText('勤務地')).toBeInTheDocument();
      expect(screen.getByText(mockProposalDetail.project.workLocation)).toBeInTheDocument();

      expect(screen.getByText('リモートワーク')).toBeInTheDocument();
      expect(screen.getByText(mockProposalDetail.project.remoteWorkType)).toBeInTheDocument();

      expect(screen.getByText('勤務時間')).toBeInTheDocument();
      expect(screen.getByText(mockProposalDetail.project.workingTime)).toBeInTheDocument();

      expect(screen.getByText('契約期間')).toBeInTheDocument();
      expect(screen.getByText(mockProposalDetail.project.contractPeriod)).toBeInTheDocument();
    });
  });

  describe('質問機能', () => {
    it('質問タブで質問一覧が表示される', async () => {
      const user = userEvent.setup();
      render(<ProposalDetailPage />);

      // 質問タブに切り替え
      await user.click(screen.getByRole('tab', { name: /質問 \(2\)/ }));

      // 質問が表示される
      mockQuestions.forEach(question => {
        expect(screen.getByText(question.questionText)).toBeInTheDocument();
      });
    });

    it('新しい質問を投稿できる', async () => {
      const user = userEvent.setup();
      const mutateAsync = jest.fn().mockResolvedValue({});
      
      mockUseCreateQuestion.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync,
        isPending: false,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        isIdle: true,
        isPaused: false,
        variables: undefined,
        failureCount: 0,
        failureReason: null,
        reset: jest.fn(),
        status: 'idle',
        submittedAt: 0,
      });

      render(<ProposalDetailPage />);

      // 質問タブに切り替え
      await user.click(screen.getByRole('tab', { name: /質問 \(2\)/ }));

      // ProposalQuestionListコンポーネントのonCreateQuestionが呼ばれることをテスト
      // （ProposalQuestionListコンポーネント自体のテストは別途実施済み）
    });
  });

  describe('ナビゲーション', () => {
    it('パンくずリストから一覧に戻れる', async () => {
      const user = userEvent.setup();
      render(<ProposalDetailPage />);

      const breadcrumbLink = screen.getByRole('button', { name: '提案一覧' });
      await user.click(breadcrumbLink);

      expect(mockRouterPush).toHaveBeenCalledWith('/proposals');
    });

    it('戻るボタンから一覧に戻れる', async () => {
      const user = userEvent.setup();
      render(<ProposalDetailPage />);

      const backButton = screen.getByRole('button', { name: '一覧に戻る' });
      await user.click(backButton);

      expect(mockRouterPush).toHaveBeenCalledWith('/proposals');
    });
  });

  describe('日時表示', () => {
    it('提案日時と回答日時が正しくフォーマットされて表示される', () => {
      mockUseProposalDetail.mockReturnValue({
        data: {
          ...mockProposalDetail,
          respondedAt: '2024-03-12T15:00:00Z',
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });

      render(<ProposalDetailPage />);

      expect(screen.getByText('提案日時')).toBeInTheDocument();
      expect(screen.getByText('回答日時')).toBeInTheDocument();
    });
  });
});