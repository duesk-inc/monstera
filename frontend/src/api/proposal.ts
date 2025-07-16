/**
 * 提案情報確認機能のAPIクライアント
 * バックエンドの提案関連APIエンドポイントとの通信を担当
 */

import apiClient from '../lib/axios';
import {
  ProposalListResponse,
  ProposalDetailResponse,
  GetProposalsRequest,
  UpdateProposalStatusRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  GetQuestionsRequest,
  QuestionsListResponse,
  ProposalQuestionDTO,
  RespondQuestionRequest,
  GetPendingQuestionsRequest,
  PendingQuestionsListResponse,
  AssignQuestionRequest,
  ProposalSummaryResponse,
  SuccessResponse,
  ErrorResponse,
} from '../types/proposal';

// ==========================================
// APIエンドポイント定数
// ==========================================

const PROPOSAL_ENDPOINTS = {
  // 提案関連
  PROPOSALS: '/api/v1/proposals',
  PROPOSAL_DETAIL: (id: string) => `/api/v1/proposals/${id}`,
  PROPOSAL_STATUS: (id: string) => `/api/v1/proposals/${id}/status`,
  PROPOSAL_STATS: '/api/v1/proposals/stats',
  PROPOSAL_DASHBOARD: '/api/v1/proposals/dashboard',

  // 質問関連
  PROPOSAL_QUESTIONS: (proposalId: string) => `/api/v1/proposals/${proposalId}/questions`,
  QUESTION_DETAIL: (id: string) => `/api/v1/questions/${id}`,
  QUESTION_RESPONSE: (id: string) => `/api/v1/sales/questions/${id}/response`,
  QUESTION_ASSIGN: (id: string) => `/api/v1/sales/questions/${id}/assign`,

  // 営業担当者向け
  PENDING_QUESTIONS: '/api/v1/sales/questions/pending',
} as const;

// ==========================================
// 提案情報管理API
// ==========================================

/**
 * 提案一覧を取得
 */
export const getProposals = async (params?: GetProposalsRequest): Promise<ProposalListResponse> => {
  const response = await apiClient.get<ProposalListResponse>(
    PROPOSAL_ENDPOINTS.PROPOSALS,
    { params }
  );
  return response.data;
};

/**
 * 提案詳細を取得
 */
export const getProposalDetail = async (id: string): Promise<ProposalDetailResponse> => {
  const response = await apiClient.get<ProposalDetailResponse>(
    PROPOSAL_ENDPOINTS.PROPOSAL_DETAIL(id)
  );
  return response.data;
};

/**
 * 提案ステータスを更新
 */
export const updateProposalStatus = async (
  id: string,
  data: UpdateProposalStatusRequest
): Promise<SuccessResponse> => {
  const response = await apiClient.put<SuccessResponse>(
    PROPOSAL_ENDPOINTS.PROPOSAL_STATUS(id),
    data
  );
  return response.data;
};

/**
 * 提案統計を取得
 */
export const getProposalStats = async (): Promise<ProposalSummaryResponse> => {
  const response = await apiClient.get<ProposalSummaryResponse>(
    PROPOSAL_ENDPOINTS.PROPOSAL_STATS
  );
  return response.data;
};

/**
 * 提案ダッシュボードデータを取得
 */
export const getProposalDashboard = async (): Promise<ProposalSummaryResponse> => {
  const response = await apiClient.get<ProposalSummaryResponse>(
    PROPOSAL_ENDPOINTS.PROPOSAL_DASHBOARD
  );
  return response.data;
};

// ==========================================
// 質問機能API
// ==========================================

/**
 * 質問を作成
 */
export const createQuestion = async (
  proposalId: string,
  data: CreateQuestionRequest
): Promise<ProposalQuestionDTO> => {
  const response = await apiClient.post<ProposalQuestionDTO>(
    PROPOSAL_ENDPOINTS.PROPOSAL_QUESTIONS(proposalId),
    data
  );
  return response.data;
};

/**
 * 質問一覧を取得
 */
export const getQuestions = async (
  proposalId: string,
  params?: GetQuestionsRequest
): Promise<QuestionsListResponse> => {
  const response = await apiClient.get<QuestionsListResponse>(
    PROPOSAL_ENDPOINTS.PROPOSAL_QUESTIONS(proposalId),
    { params }
  );
  return response.data;
};

/**
 * 質問を更新
 */
export const updateQuestion = async (
  id: string,
  data: UpdateQuestionRequest
): Promise<SuccessResponse> => {
  const response = await apiClient.put<SuccessResponse>(
    PROPOSAL_ENDPOINTS.QUESTION_DETAIL(id),
    data
  );
  return response.data;
};

/**
 * 質問を削除
 */
export const deleteQuestion = async (id: string): Promise<SuccessResponse> => {
  const response = await apiClient.delete<SuccessResponse>(
    PROPOSAL_ENDPOINTS.QUESTION_DETAIL(id)
  );
  return response.data;
};

// ==========================================
// 営業担当者向けAPI
// ==========================================

/**
 * 質問に回答（営業担当者用）
 */
export const respondToQuestion = async (
  id: string,
  data: RespondQuestionRequest
): Promise<SuccessResponse> => {
  const response = await apiClient.put<SuccessResponse>(
    PROPOSAL_ENDPOINTS.QUESTION_RESPONSE(id),
    data
  );
  return response.data;
};

/**
 * 未回答質問一覧を取得（営業担当者用）
 */
export const getPendingQuestions = async (
  params?: GetPendingQuestionsRequest
): Promise<PendingQuestionsListResponse> => {
  const response = await apiClient.get<PendingQuestionsListResponse>(
    PROPOSAL_ENDPOINTS.PENDING_QUESTIONS,
    { params }
  );
  return response.data;
};

/**
 * 質問を営業担当者に割り当て（管理者用）
 */
export const assignQuestion = async (
  id: string,
  data: AssignQuestionRequest
): Promise<SuccessResponse> => {
  const response = await apiClient.put<SuccessResponse>(
    PROPOSAL_ENDPOINTS.QUESTION_ASSIGN(id),
    data
  );
  return response.data;
};

// ==========================================
// エラーハンドリング用ユーティリティ
// ==========================================

/**
 * APIエラーを処理して日本語メッセージを返す
 */
export const handleProposalApiError = (error: any): string => {
  // レスポンスエラーの場合
  if (error.response?.data) {
    const errorData = error.response.data as ErrorResponse;
    if (errorData.error) {
      return errorData.error;
    }
  }

  // HTTPステータスコード別のメッセージ
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'リクエストが正しくありません';
      case 401:
        return 'ログインが必要です';
      case 403:
        return 'この操作を行う権限がありません';
      case 404:
        return '指定された提案が見つかりません';
      case 409:
        return 'データが競合しています。画面を更新してから再度お試しください';
      case 422:
        return 'データの形式が正しくありません';
      case 429:
        return '一時的にアクセスが制限されています。しばらく待ってから再度お試しください';
      case 500:
        return 'サーバーエラーが発生しました';
      case 502:
      case 503:
      case 504:
        return 'サービスが一時的に利用できません';
      default:
        return '予期しないエラーが発生しました';
    }
  }

  // ネットワークエラーなど
  if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    return 'ネットワークエラーが発生しました。接続を確認してください';
  }

  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'リクエストがタイムアウトしました。再度お試しください';
  }

  return error.message || '予期しないエラーが発生しました';
};

/**
 * APIエラーの種類を判定
 */
export const isProposalApiError = (error: any): error is { response: { data: ErrorResponse } } => {
  return error?.response?.data?.error !== undefined;
};

/**
 * ネットワークエラーかどうかを判定
 */
export const isNetworkError = (error: any): boolean => {
  return error.code === 'NETWORK_ERROR' || error.message === 'Network Error';
};

/**
 * タイムアウトエラーかどうかを判定
 */
export const isTimeoutError = (error: any): boolean => {
  return error.code === 'ECONNABORTED' || error.message?.includes('timeout');
};

/**
 * 権限エラーかどうかを判定
 */
export const isPermissionError = (error: any): boolean => {
  return error?.response?.status === 403;
};

/**
 * 見つからないエラーかどうかを判定
 */
export const isNotFoundError = (error: any): boolean => {
  return error?.response?.status === 404;
};

/**
 * 競合エラーかどうかを判定
 */
export const isConflictError = (error: any): boolean => {
  return error?.response?.status === 409;
};

// ==========================================
// リトライ機能付きAPI呼び出し
// ==========================================

/**
 * リトライ機能付きでAPI呼び出しを実行
 */
export const callWithRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;

      // リトライしない条件
      if (
        isPermissionError(error) ||
        isNotFoundError(error) ||
        error?.response?.status === 400 ||
        error?.response?.status === 422
      ) {
        throw error;
      }

      // レート制限エラーの場合は指数バックオフでリトライ
      if (error?.response?.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // ネットワークエラーやサーバーエラーの場合もリトライ
      if (
        isNetworkError(error) ||
        isTimeoutError(error) ||
        (error?.response?.status >= 500 && error?.response?.status < 600)
      ) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // その他のエラーは即座に再スロー
      throw error;
    }
  }

  throw lastError;
};

// ==========================================
// キャンセル機能
// ==========================================

/**
 * リクエストキャンセル用のコントローラーを作成
 */
export const createCancelToken = () => {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
};

/**
 * キャンセル可能な提案一覧取得
 */
export const getCancelableProposals = (
  params?: GetProposalsRequest,
  signal?: AbortSignal
): Promise<ProposalListResponse> => {
  return apiClient.get<ProposalListResponse>(
    PROPOSAL_ENDPOINTS.PROPOSALS,
    { params, signal }
  ).then(response => response.data);
};

/**
 * キャンセル可能な提案詳細取得
 */
export const getCancelableProposalDetail = (
  id: string,
  signal?: AbortSignal
): Promise<ProposalDetailResponse> => {
  return apiClient.get<ProposalDetailResponse>(
    PROPOSAL_ENDPOINTS.PROPOSAL_DETAIL(id),
    { signal }
  ).then(response => response.data);
};

// ==========================================
// バッチ操作
// ==========================================

/**
 * 複数の提案ステータスを一括更新
 */
export const updateMultipleProposalStatuses = async (
  updates: Array<{ id: string; status: 'proceed' | 'declined' }>
): Promise<SuccessResponse[]> => {
  const results = await Promise.allSettled(
    updates.map(({ id, status }) => updateProposalStatus(id, { status }))
  );

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result, index) => ({ index, error: result.reason }));

  if (errors.length > 0) {
    console.warn('一部の提案ステータス更新に失敗しました:', errors);
  }

  return results
    .filter((result): result is PromiseFulfilledResult<SuccessResponse> => result.status === 'fulfilled')
    .map(result => result.value);
};

/**
 * 複数の質問を一括削除
 */
export const deleteMultipleQuestions = async (ids: string[]): Promise<SuccessResponse[]> => {
  const results = await Promise.allSettled(
    ids.map(id => deleteQuestion(id))
  );

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result, index) => ({ index, error: result.reason }));

  if (errors.length > 0) {
    console.warn('一部の質問削除に失敗しました:', errors);
  }

  return results
    .filter((result): result is PromiseFulfilledResult<SuccessResponse> => result.status === 'fulfilled')
    .map(result => result.value);
};

// ==========================================
// デバッグ・開発用ユーティリティ
// ==========================================

/**
 * 提案API接続テスト
 */
export const testProposalApiConnection = async (): Promise<boolean> => {
  try {
    await apiClient.get('/api/v1/proposals/health');
    return true;
  } catch {
    return false;
  }
};

/**
 * APIレスポンス時間を測定
 */
export const measureProposalApiResponseTime = async <T>(
  apiCall: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await apiCall();
  const duration = performance.now() - start;

  return { result, duration };
};

// ==========================================
// 型ガード関数
// ==========================================

/**
 * 提案一覧レスポンスかどうかを判定
 */
export const isProposalListResponse = (data: any): data is ProposalListResponse => {
  return (
    data &&
    Array.isArray(data.items) &&
    typeof data.total === 'number' &&
    typeof data.page === 'number' &&
    typeof data.limit === 'number'
  );
};

/**
 * 提案詳細レスポンスかどうかを判定
 */
export const isProposalDetailResponse = (data: any): data is ProposalDetailResponse => {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.projectId === 'string' &&
    typeof data.status === 'string' &&
    data.project &&
    Array.isArray(data.questions)
  );
};

/**
 * 質問DTOかどうかを判定
 */
export const isProposalQuestionDTO = (data: any): data is ProposalQuestionDTO => {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.questionText === 'string' &&
    typeof data.isResponded === 'boolean'
  );
};

// ==========================================
// エクスポート用のAPIオブジェクト
// ==========================================

/**
 * 提案APIの全機能をまとめたオブジェクト
 */
export const proposalApi = {
  // 提案管理
  getProposals,
  getProposalDetail,
  updateProposalStatus,
  getProposalStats,
  getProposalDashboard,

  // 質問機能
  createQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,

  // 営業担当者向け
  respondToQuestion,
  getPendingQuestions,
  assignQuestion,

  // バッチ操作
  updateMultipleProposalStatuses,
  deleteMultipleQuestions,

  // キャンセル可能
  getCancelableProposals,
  getCancelableProposalDetail,

  // リトライ機能
  callWithRetry,

  // エラーハンドリング
  handleProposalApiError,
  isProposalApiError,
  isNetworkError,
  isTimeoutError,
  isPermissionError,
  isNotFoundError,
  isConflictError,

  // デバッグ
  testProposalApiConnection,
  measureProposalApiResponseTime,

  // 型ガード
  isProposalListResponse,
  isProposalDetailResponse,
  isProposalQuestionDTO,

  // ユーティリティ
  createCancelToken,
} as const;

export default proposalApi;