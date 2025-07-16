import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import axios from 'axios';
import {
  useProposals,
  useProposalDetail,
  useUpdateProposalStatus,
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from '../useProposalQueries';
import {
  mockProposalList,
  mockProposalDetail,
  mockQuestions,
  mockProposalListResponse,
  mockQuestionsListResponse,
  mockErrorResponse,
} from '@/test-utils/proposalData';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ToastProvider のモック
jest.mock('@/components/common/Toast/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => children,
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
  }),
}));

// テスト用のQueryClientを作成
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// テスト用のラッパーコンポーネント
const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProposalQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useProposals', () => {
    it('提案一覧を正常に取得できる', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockProposalListResponse });

      const { result } = renderHook(() => useProposals({ autoFetch: true }), {
        wrapper: createWrapper(),
      });

      // 初期状態の確認
      expect(result.current.isLoading).toBe(true);
      expect(result.current.proposals).toEqual([]);

      // データ取得完了を待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.proposals).toEqual(mockProposalList);
        expect(result.current.total).toBe(3);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/v1/proposals',
        expect.objectContaining({
          params: { page: 1, limit: 20 },
        })
      );
    });

    it('フィルターを適用して提案一覧を取得できる', async () => {
      mockedAxios.get.mockResolvedValueOnce({ 
        data: { 
          items: [mockProposalList[1]], // proceed ステータスのみ
          total: 1 
        } 
      });

      const { result } = renderHook(
        () => useProposals({ 
          initialFilters: { status: 'proceed' },
          autoFetch: true 
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/v1/proposals',
        expect.objectContaining({
          params: { page: 1, limit: 20, status: 'proceed' },
        })
      );
    });

    it('エラーハンドリングが正しく動作する', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useProposals({ autoFetch: true }), {
        wrapper: createWrapper(),
      });

      // クエリが実行されたことを確認
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          '/api/v1/proposals',
          expect.objectContaining({
            params: { page: 1, limit: 20 },
          })
        );
      });

      // エラー時の状態を確認（初期値が返される）
      expect(result.current.proposals).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  describe('useProposalDetail', () => {
    it('提案詳細を正常に取得できる', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockProposalDetail });

      const { result } = renderHook(() => useProposalDetail('prop-001'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual(mockProposalDetail);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/proposals/prop-001');
    });

    it('無効なIDの場合はクエリを実行しない', () => {
      const { result } = renderHook(() => useProposalDetail(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateProposalStatus', () => {
    it('提案ステータスを正常に更新できる', async () => {
      const mockResponse = { message: 'ステータスを更新しました' };
      mockedAxios.put.mockResolvedValueOnce({ data: mockResponse });

      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(
        () => useUpdateProposalStatus({ onSuccess, onError }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({ id: 'prop-001', status: 'proceed' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(onSuccess).toHaveBeenCalled();
      });

      expect(mockedAxios.put).toHaveBeenCalledWith(
        '/api/v1/proposals/prop-001/status',
        { status: 'proceed' }
      );
      expect(onError).not.toHaveBeenCalled();
    });

    it('ステータス更新エラーを適切にハンドリングする', async () => {
      mockedAxios.put.mockRejectedValueOnce({
        response: { data: mockErrorResponse },
      });

      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(
        () => useUpdateProposalStatus({ onSuccess, onError }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({ id: 'prop-001', status: 'declined' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(onError).toHaveBeenCalled();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('useQuestions', () => {
    it('質問一覧を正常に取得できる', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockQuestionsListResponse });

      const { result } = renderHook(
        () => useQuestions({ proposalId: 'prop-001', enabled: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.questions).toEqual(mockQuestions);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/v1/proposals/prop-001/questions',
        expect.any(Object)
      );
    });

    it('proposalIdがない場合はクエリを実行しない', () => {
      const { result } = renderHook(
        () => useQuestions({ proposalId: '', enabled: true }),
        { wrapper: createWrapper() }
      );

      expect(result.current.questions).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateQuestion', () => {
    it('質問を正常に投稿できる', async () => {
      const mockResponse = { 
        id: 'q-003',
        questionText: '新しい質問',
        isResponded: false,
      };
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const onSuccess = jest.fn();

      const { result } = renderHook(
        () => useCreateQuestion({ onSuccess }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({ 
        proposalId: 'prop-001',
        questionText: '新しい質問',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(onSuccess).toHaveBeenCalled();
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/proposals/prop-001/questions',
        { questionText: '新しい質問' }
      );
    });
  });

  describe('useUpdateQuestion', () => {
    it('質問を正常に更新できる', async () => {
      const mockResponse = { message: '質問を更新しました' };
      mockedAxios.put.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(
        () => useUpdateQuestion({}),
        { wrapper: createWrapper() }
      );

      result.current.mutate({ 
        id: 'q-001',
        questionText: '更新された質問',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedAxios.put).toHaveBeenCalledWith(
        '/api/v1/questions/q-001',
        { questionText: '更新された質問' }
      );
    });
  });

  describe('useDeleteQuestion', () => {
    it('質問を正常に削除できる', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });

      const onSuccess = jest.fn();

      const { result } = renderHook(
        () => useDeleteQuestion({ onSuccess }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({ id: 'q-001' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(onSuccess).toHaveBeenCalled();
      });

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/v1/questions/q-001');
    });

    it('削除エラーを適切にハンドリングする', async () => {
      mockedAxios.delete.mockRejectedValueOnce({
        response: { 
          data: { error: '24時間以上経過した質問は削除できません' } 
        },
      });

      const onError = jest.fn();

      const { result } = renderHook(
        () => useDeleteQuestion({ onError }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({ id: 'q-001' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(onError).toHaveBeenCalled();
      });
    });
  });
});