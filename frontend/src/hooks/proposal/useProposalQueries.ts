/**
 * 提案情報確認機能のReact Queryフック
 * TanStack Query v5を使用した提案・質問関連のデータ取得・更新管理
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  useInfiniteQuery,
  type QueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useProposalErrorHandler } from './useProposalErrorHandler';
import * as proposalApi from '../../api/proposal';
import { CACHE_STRATEGIES } from '../../constants/cache';
import type {
  ProposalItemDTO,
  ProposalDetailResponse,
  ProposalQuestionDTO,
  PendingQuestionDTO,
  ProposalSummaryResponse,
  GetProposalsRequest,
  GetQuestionsRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  UpdateProposalStatusRequest,
  RespondQuestionRequest,
  GetPendingQuestionsRequest,
  AssignQuestionRequest,
  ProposalFilterOptions,
  ProposalStatus,
} from '../../types/proposal';

// ==========================================
// クエリキー定数
// ==========================================

export const PROPOSAL_QUERY_KEYS = {
  all: ['proposals'] as const,
  lists: () => [...PROPOSAL_QUERY_KEYS.all, 'list'] as const,
  list: (params: GetProposalsRequest) => [...PROPOSAL_QUERY_KEYS.lists(), params] as const,
  details: () => [...PROPOSAL_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PROPOSAL_QUERY_KEYS.details(), id] as const,
  questions: (proposalId: string) => [...PROPOSAL_QUERY_KEYS.detail(proposalId), 'questions'] as const,
  questionsList: (proposalId: string, params?: GetQuestionsRequest) => 
    [...PROPOSAL_QUERY_KEYS.questions(proposalId), params] as const,
  stats: () => [...PROPOSAL_QUERY_KEYS.all, 'stats'] as const,
  dashboard: () => [...PROPOSAL_QUERY_KEYS.all, 'dashboard'] as const,
  pending: () => [...PROPOSAL_QUERY_KEYS.all, 'pending'] as const,
  pendingQuestions: (params?: GetPendingQuestionsRequest) => 
    [...PROPOSAL_QUERY_KEYS.pending(), 'questions', params] as const,
} as const;

// ==========================================
// 基本設定
// ==========================================

const DEFAULT_STALE_TIME = CACHE_STRATEGIES.PROPOSALS_LIST.staleTime;
const DEFAULT_GC_TIME = CACHE_STRATEGIES.PROPOSALS_LIST.gcTime;
const DETAIL_STALE_TIME = CACHE_STRATEGIES.PROPOSAL_DETAIL.staleTime;
const DETAIL_GC_TIME = CACHE_STRATEGIES.PROPOSAL_DETAIL.gcTime;
const STATS_STALE_TIME = CACHE_STRATEGIES.PROPOSAL_STATS.staleTime;
const STATS_GC_TIME = CACHE_STRATEGIES.PROPOSAL_STATS.gcTime;
const DEFAULT_PAGE_SIZE = 20;

// ==========================================
// 提案一覧関連フック
// ==========================================

export interface UseProposalsParams {
  initialFilters?: Partial<ProposalFilterOptions>;
  initialPage?: number;
  initialPageSize?: number;
  autoFetch?: boolean;
  staleTime?: number;
}

export interface UseProposalsReturn {
  // データ
  proposals: ProposalItemDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  
  // 状態
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  
  // フィルター・ページネーション
  filters: ProposalFilterOptions;
  setFilters: (filters: Partial<ProposalFilterOptions>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  clearFilters: () => void;
  
  // アクション
  refetch: () => void;
  invalidateCache: () => void;
  prefetchNextPage: () => void;
}

/**
 * 提案一覧を取得・管理するフック
 */
export const useProposals = ({
  initialFilters = {},
  initialPage = 1,
  initialPageSize = DEFAULT_PAGE_SIZE,
  autoFetch = true,
  staleTime = DEFAULT_STALE_TIME,
}: UseProposalsParams = {}): UseProposalsReturn => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const queryClient = useQueryClient();

  // フィルター・ページネーション状態
  const [filters, setFiltersState] = useState<ProposalFilterOptions>(initialFilters);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // クエリパラメータ構築
  const queryParams = useMemo((): GetProposalsRequest => ({
    status: filters.status,
    page,
    limit: pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  }), [filters, page, pageSize]);

  // 提案一覧クエリ
  const {
    data: queryData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: PROPOSAL_QUERY_KEYS.list(queryParams),
    queryFn: ({ signal }) => proposalApi.getProposals(queryParams),
    enabled: autoFetch,
    staleTime,
    gcTime: DEFAULT_GC_TIME,
    retry: (failureCount, error) => {
      if (error && 'response' in error) {
        const status = (error as any).response?.status;
        return status >= 500 && failureCount < 3;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // データの分解
  const proposals = useMemo(() => queryData?.items || [], [queryData]);
  const total = useMemo(() => queryData?.total || 0, [queryData]);
  const currentPage = useMemo(() => queryData?.page || page, [queryData, page]);
  const currentLimit = useMemo(() => queryData?.limit || pageSize, [queryData, pageSize]);
  const totalPages = useMemo(() => Math.ceil(total / currentLimit), [total, currentLimit]);

  // フィルター更新
  const setFilters = useCallback((newFilters: Partial<ProposalFilterOptions>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPageState(1); // フィルター変更時はページをリセット
  }, []);

  // ページ更新
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  // ページサイズ更新
  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageState(1); // ページサイズ変更時はページをリセット
  }, []);

  // フィルタークリア
  const clearFilters = useCallback(() => {
    setFiltersState({});
    setPageState(1);
  }, []);

  // キャッシュ無効化
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.lists() });
  }, [queryClient]);

  // 次ページの事前読み込み
  const prefetchNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const nextPageParams = { ...queryParams, page: currentPage + 1 };
      queryClient.prefetchQuery({
        queryKey: PROPOSAL_QUERY_KEYS.list(nextPageParams),
        queryFn: ({ signal }) => proposalApi.getProposals(nextPageParams),
        staleTime,
      });
    }
  }, [queryClient, queryParams, currentPage, totalPages, staleTime]);

  // エラーハンドリング
  if (isError && error) {
    handleSubmissionError(error, '提案一覧の取得');
  }

  return {
    // データ
    proposals,
    total,
    page: currentPage,
    limit: currentLimit,
    totalPages,
    
    // 状態
    isLoading,
    isFetching,
    isError,
    error,
    
    // フィルター・ページネーション
    filters,
    setFilters,
    setPage,
    setPageSize,
    clearFilters,
    
    // アクション
    refetch,
    invalidateCache,
    prefetchNextPage,
  };
};

// ==========================================
// 提案詳細関連フック
// ==========================================

export interface UseProposalDetailOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * 提案詳細を取得するフック
 */
export const useProposalDetail = (
  proposalId: string,
  options: UseProposalDetailOptions = {}
) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  
  const {
    enabled = true,
    staleTime = DETAIL_STALE_TIME,
  } = options;

  const query = useQuery({
    queryKey: PROPOSAL_QUERY_KEYS.detail(proposalId),
    queryFn: ({ signal }) => proposalApi.getProposalDetail(proposalId),
    enabled: enabled && !!proposalId,
    staleTime,
    gcTime: DETAIL_GC_TIME,
    retry: (failureCount, error) => {
      if (error && 'response' in error) {
        const status = (error as any).response?.status;
        // 404の場合はリトライしない
        if (status === 404) return false;
        return status >= 500 && failureCount < 3;
      }
      return failureCount < 3;
    },
  });

  // エラーハンドリング
  if (query.isError && query.error) {
    handleSubmissionError(query.error, '提案詳細の取得');
  }

  return query;
};

// ==========================================
// 提案ステータス更新フック
// ==========================================

export interface UseUpdateProposalStatusOptions {
  onSuccess?: (data: any, variables: { id: string; status: 'proceed' | 'declined' }) => void;
  onError?: (error: Error, variables: { id: string; status: 'proceed' | 'declined' }) => void;
}

/**
 * 提案ステータスを更新するフック
 */
export const useUpdateProposalStatus = (options: UseUpdateProposalStatusOptions = {}) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'proceed' | 'declined' }) =>
      proposalApi.updateProposalStatus(id, { status }),
    onSuccess: (data, variables) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.stats() });
      
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      handleSubmissionError(error, '提案ステータスの更新');
      options.onError?.(error as Error, variables);
    },
  });
};

// ==========================================
// 質問関連フック
// ==========================================

export interface UseQuestionsParams {
  proposalId: string;
  initialParams?: GetQuestionsRequest;
  enabled?: boolean;
}

/**
 * 提案の質問一覧を取得するフック
 */
export const useQuestions = ({
  proposalId,
  initialParams = {},
  enabled = true,
}: UseQuestionsParams) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  
  const [params, setParams] = useState<GetQuestionsRequest>(initialParams);

  const query = useQuery({
    queryKey: PROPOSAL_QUERY_KEYS.questionsList(proposalId, params),
    queryFn: ({ signal }) => proposalApi.getQuestions(proposalId, params),
    enabled: enabled && !!proposalId,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });

  const updateParams = useCallback((newParams: Partial<GetQuestionsRequest>) => {
    setParams(prev => ({ ...prev, ...newParams }));
  }, []);

  // エラーハンドリング
  if (query.isError && query.error) {
    handleSubmissionError(query.error, '質問一覧の取得');
  }

  return {
    ...query,
    params,
    updateParams,
    questions: query.data?.items || [],
    total: query.data?.total || 0,
  };
};

// ==========================================
// 質問作成フック
// ==========================================

export interface UseCreateQuestionOptions {
  onSuccess?: (data: ProposalQuestionDTO, variables: { proposalId: string; questionText: string }) => void;
  onError?: (error: Error, variables: { proposalId: string; questionText: string }) => void;
}

/**
 * 質問を作成するフック
 */
export const useCreateQuestion = (options: UseCreateQuestionOptions = {}) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proposalId, questionText }: { proposalId: string; questionText: string }) =>
      proposalApi.createQuestion(proposalId, { questionText }),
    onSuccess: (data, variables) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ 
        queryKey: PROPOSAL_QUERY_KEYS.questions(variables.proposalId) 
      });
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.pending() });
      
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      handleSubmissionError(error, '質問の投稿');
      options.onError?.(error as Error, variables);
    },
  });
};

// ==========================================
// 質問更新フック
// ==========================================

export interface UseUpdateQuestionOptions {
  onSuccess?: (data: any, variables: { id: string; questionText: string }) => void;
  onError?: (error: Error, variables: { id: string; questionText: string }) => void;
}

/**
 * 質問を更新するフック
 */
export const useUpdateQuestion = (options: UseUpdateQuestionOptions = {}) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, questionText }: { id: string; questionText: string }) =>
      proposalApi.updateQuestion(id, { questionText }),
    onSuccess: (data, variables) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.all });
      
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      handleSubmissionError(error, '質問の更新');
      options.onError?.(error as Error, variables);
    },
  });
};

// ==========================================
// 質問削除フック
// ==========================================

export interface UseDeleteQuestionOptions {
  onSuccess?: (data: any, variables: { id: string }) => void;
  onError?: (error: Error, variables: { id: string }) => void;
}

/**
 * 質問を削除するフック
 */
export const useDeleteQuestion = (options: UseDeleteQuestionOptions = {}) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => proposalApi.deleteQuestion(id),
    onSuccess: (data, variables) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.all });
      
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      handleSubmissionError(error, '質問の削除');
      options.onError?.(error as Error, variables);
    },
  });
};

// ==========================================
// 営業担当者向けフック
// ==========================================

/**
 * 未回答質問一覧を取得するフック（営業担当者用）
 */
export const usePendingQuestions = (
  params: GetPendingQuestionsRequest = {},
  options: { enabled?: boolean } = {}
) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: PROPOSAL_QUERY_KEYS.pendingQuestions(params),
    queryFn: ({ signal }) => proposalApi.getPendingQuestions(params),
    enabled,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });

  // エラーハンドリング
  if (query.isError && query.error) {
    handleSubmissionError(query.error, '未回答質問一覧の取得');
  }

  return {
    ...query,
    questions: query.data?.items || [],
    total: query.data?.total || 0,
  };
};

/**
 * 質問に回答するフック（営業担当者用）
 */
export const useRespondToQuestion = () => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, responseText }: { id: string; responseText: string }) =>
      proposalApi.respondToQuestion(id, { responseText }),
    onSuccess: () => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.pending() });
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.all });
    },
    onError: (error) => {
      handleSubmissionError(error, '質問への回答');
    },
  });
};

/**
 * 質問を営業担当者に割り当てるフック（管理者用）
 */
export const useAssignQuestion = () => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, salesUserID }: { id: string; salesUserID: string }) =>
      proposalApi.assignQuestion(id, { salesUserID }),
    onSuccess: () => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.pending() });
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.all });
    },
    onError: (error) => {
      handleSubmissionError(error, '質問の割り当て');
    },
  });
};

// ==========================================
// 統計・分析関連フック
// ==========================================

/**
 * 提案統計を取得するフック
 */
export const useProposalStats = (options: { enabled?: boolean } = {}) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: PROPOSAL_QUERY_KEYS.stats(),
    queryFn: ({ signal }) => proposalApi.getProposalStats(),
    enabled,
    staleTime: STATS_STALE_TIME,
    gcTime: STATS_GC_TIME,
  });

  // エラーハンドリング
  if (query.isError && query.error) {
    handleSubmissionError(query.error, '提案統計の取得');
  }

  return query;
};

/**
 * 提案ダッシュボードデータを取得するフック
 */
export const useProposalDashboard = (options: { enabled?: boolean } = {}) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: PROPOSAL_QUERY_KEYS.dashboard(),
    queryFn: ({ signal }) => proposalApi.getProposalDashboard(),
    enabled,
    staleTime: STATS_STALE_TIME,
    gcTime: STATS_GC_TIME,
  });

  // エラーハンドリング
  if (query.isError && query.error) {
    handleSubmissionError(query.error, 'ダッシュボードデータの取得');
  }

  return query;
};

// ==========================================
// 高度な機能フック
// ==========================================

/**
 * 無限スクロール対応の提案一覧フック
 */
export const useInfiniteProposals = (
  baseParams: Omit<GetProposalsRequest, 'page'> = {},
  options: { enabled?: boolean } = {}
) => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const { enabled = true } = options;

  const query = useInfiniteQuery({
    queryKey: ['proposals', 'infinite', baseParams],
    queryFn: ({ pageParam = 1, signal }) =>
      proposalApi.getProposals({ ...baseParams, page: pageParam }),
    enabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const hasNextPage = lastPage.page < Math.ceil(lastPage.total / lastPage.limit);
      return hasNextPage ? lastPage.page + 1 : undefined;
    },
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });

  // エラーハンドリング
  if (query.isError && query.error) {
    handleSubmissionError(query.error, '提案一覧の取得');
  }

  // フラット化されたデータ
  const allProposals = useMemo(() => {
    return query.data?.pages.flatMap(page => page.items) || [];
  }, [query.data]);

  return {
    ...query,
    proposals: allProposals,
    totalCount: query.data?.pages[0]?.total || 0,
  };
};

// ==========================================
// バッチ操作フック
// ==========================================

/**
 * 複数の提案ステータスを一括更新するフック
 */
export const useBatchUpdateProposalStatus = () => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ id: string; status: 'proceed' | 'declined' }>) =>
      proposalApi.updateMultipleProposalStatuses(updates),
    onSuccess: () => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.stats() });
    },
    onError: (error) => {
      handleSubmissionError(error, '提案ステータスの一括更新');
    },
  });
};

/**
 * 複数の質問を一括削除するフック
 */
export const useBatchDeleteQuestions = () => {
  const { handleSubmissionError } = useProposalErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionIds: string[]) =>
      proposalApi.deleteMultipleQuestions(questionIds),
    onSuccess: () => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.all });
    },
    onError: (error) => {
      handleSubmissionError(error, '質問の一括削除');
    },
  });
};

// ==========================================
// ユーティリティフック
// ==========================================

/**
 * 提案関連のクエリを一括で無効化するフック
 */
export const useInvalidateProposalQueries = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PROPOSAL_QUERY_KEYS.all });
  }, [queryClient]);
};

/**
 * 提案関連のキャッシュを管理するフック
 */
export const useProposalCache = () => {
  const queryClient = useQueryClient();

  const preloadProposal = useCallback((proposalId: string) => {
    queryClient.prefetchQuery({
      queryKey: PROPOSAL_QUERY_KEYS.detail(proposalId),
      queryFn: ({ signal }) => proposalApi.getProposalDetail(proposalId),
      staleTime: DEFAULT_STALE_TIME,
    });
  }, [queryClient]);

  const removeProposalFromCache = useCallback((proposalId: string) => {
    queryClient.removeQueries({ queryKey: PROPOSAL_QUERY_KEYS.detail(proposalId) });
  }, [queryClient]);

  const clearAllProposalCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: PROPOSAL_QUERY_KEYS.all });
  }, [queryClient]);

  return {
    preloadProposal,
    removeProposalFromCache,
    clearAllProposalCache,
  };
};

// ==========================================
// 型のエクスポート（インライン定義済みのため重複削除）
// ==========================================