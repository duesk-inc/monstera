// 経理機能のAPIクライアント

import {
  AccountingDashboard,
  ProjectGroup,
  CreateProjectGroupRequest,
  UpdateProjectGroupRequest,
  BillingPreview,
  BillingPreviewForm,
  ProcessBillingRequest,
  BillingProcessResult,
  ScheduleBillingRequest,
  FreeConfig,
  FreeAuthUrlResponse,
  FreePartner,
  FreeInvoice,
  FreeSyncRequest,
  FreeSyncLog,
  ScheduledJob,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  BatchJob,
  CreateBatchJobRequest,
  ExportRequest,
  ExportResult,
  ListResponse,
  ApiResponse,
  UUID,
  MonthString,
  MonthlyTrendData,
  ClientBillingRanking,
  Client,
  Project,
  InvoiceStatus,
  BulkActionResult,
  FreeSyncResult,
} from "../types/accounting";
import { 
  Invoice, 
  InvoiceSummary,
} from "../types/admin/invoice";
import { API_ENDPOINTS } from "../constants/accounting";
import apiClient from "../lib/axios";

// ========== ダッシュボード API ==========

/**
 * 経理ダッシュボードデータを取得
 */
export const getAccountingDashboard =
  async (): Promise<AccountingDashboard> => {
    const response = await apiClient.get<ApiResponse<AccountingDashboard>>(
      API_ENDPOINTS.DASHBOARD,
    );
    return response.data.data;
  };

/**
 * 月次トレンドデータを取得
 */
export const getMonthlyTrend = async (
  months?: number,
): Promise<MonthlyTrendData[]> => {
  const params = months ? { months } : {};
  const response = await apiClient.get<ApiResponse<MonthlyTrendData[]>>(
    API_ENDPOINTS.MONTHLY_TREND,
    { params },
  );
  return response.data.data;
};

/**
 * クライアント請求ランキングを取得
 */
export const getClientBillingRanking = async (
  month?: MonthString,
  limit?: number,
): Promise<ClientBillingRanking[]> => {
  const params: Record<string, any> = {};
  if (month) params.month = month;
  if (limit) params.limit = limit;

  const response = await apiClient.get<ApiResponse<ClientBillingRanking[]>>(
    API_ENDPOINTS.CLIENT_RANKING,
    { params },
  );
  return response.data.data;
};

// ========== 基本データ取得 API ==========

/**
 * 取引先一覧を取得
 */
export const getClients = async (): Promise<Client[]> => {
  const response = await apiClient.get<ApiResponse<Client[]>>(
    "/accounting/clients",
  );
  return response.data.data;
};

/**
 * プロジェクト一覧を取得
 */
export const getProjects = async (): Promise<Project[]> => {
  const response = await apiClient.get<ApiResponse<Project[]>>(
    "/accounting/projects",
  );
  return response.data.data;
};

// ========== プロジェクトグループ API ==========

/**
 * プロジェクトグループ一覧を取得
 */
export const getProjectGroups = async (params?: {
  page?: number;
  limit?: number;
  clientId?: UUID;
  search?: string;
}): Promise<ListResponse<ProjectGroup>> => {
  const response = await apiClient.get<ListResponse<ProjectGroup>>(
    API_ENDPOINTS.PROJECT_GROUPS,
    { params },
  );
  return response.data;
};

/**
 * プロジェクトグループ詳細を取得
 */
export const getProjectGroup = async (id: UUID): Promise<ProjectGroup> => {
  const response = await apiClient.get<ApiResponse<ProjectGroup>>(
    API_ENDPOINTS.PROJECT_GROUP_DETAIL(id),
  );
  return response.data.data;
};

/**
 * プロジェクトグループを作成
 */
export const createProjectGroup = async (
  data: CreateProjectGroupRequest,
): Promise<ProjectGroup> => {
  const response = await apiClient.post<ApiResponse<ProjectGroup>>(
    API_ENDPOINTS.PROJECT_GROUPS,
    data,
  );
  return response.data.data;
};

/**
 * プロジェクトグループを更新
 */
export const updateProjectGroup = async (
  id: UUID,
  data: UpdateProjectGroupRequest,
): Promise<ProjectGroup> => {
  const response = await apiClient.put<ApiResponse<ProjectGroup>>(
    API_ENDPOINTS.PROJECT_GROUP_DETAIL(id),
    data,
  );
  return response.data.data;
};

/**
 * プロジェクトグループを削除
 */
export const deleteProjectGroup = async (id: UUID): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.PROJECT_GROUP_DETAIL(id));
};

/**
 * プロジェクトグループにプロジェクトを追加
 */
export const addProjectToGroup = async (
  groupId: UUID,
  projectId: UUID,
): Promise<void> => {
  await apiClient.post(
    `${API_ENDPOINTS.PROJECT_GROUP_DETAIL(groupId)}/projects`,
    { projectId },
  );
};

/**
 * プロジェクトグループからプロジェクトを削除
 */
export const removeProjectFromGroup = async (
  groupId: UUID,
  projectId: UUID,
): Promise<void> => {
  await apiClient.delete(
    `${API_ENDPOINTS.PROJECT_GROUP_DETAIL(groupId)}/projects/${projectId}`,
  );
};

// ========== 請求処理 API ==========

/**
 * 請求プレビューを取得
 */
export const getBillingPreview = async (
  data: BillingPreviewForm,
): Promise<BillingPreview> => {
  const response = await apiClient.post<ApiResponse<BillingPreview>>(
    API_ENDPOINTS.BILLING_PREVIEW,
    data,
  );
  return response.data.data;
};

/**
 * 複数の請求プレビューを取得
 */
export const getBillingPreviews = async (params?: {
  month: MonthString;
  clientIds?: UUID[];
}): Promise<BillingPreview[]> => {
  const response = await apiClient.get<ApiResponse<BillingPreview[]>>(
    API_ENDPOINTS.BILLING_PREVIEWS,
    { params },
  );
  return response.data.data;
};

/**
 * 請求処理を実行
 */
export const processBilling = async (
  data: ProcessBillingRequest,
): Promise<BillingProcessResult> => {
  const response = await apiClient.post<ApiResponse<BillingProcessResult>>(
    API_ENDPOINTS.BILLING_PROCESS,
    data,
  );
  return response.data.data;
};

/**
 * 請求処理をスケジュール
 */
export const scheduleBilling = async (
  data: ScheduleBillingRequest,
): Promise<ScheduledJob> => {
  const response = await apiClient.post<ApiResponse<ScheduledJob>>(
    API_ENDPOINTS.BILLING_SCHEDULE,
    data,
  );
  return response.data.data;
};

/**
 * 請求履歴を取得
 */
export const getBillingHistory = async (params?: {
  page?: number;
  limit?: number;
  clientId?: UUID;
  month?: MonthString;
  status?: string;
}): Promise<ListResponse<BillingProcessResult>> => {
  const response = await apiClient.get<ListResponse<BillingProcessResult>>(
    API_ENDPOINTS.BILLING_HISTORY,
    { params },
  );
  return response.data;
};

// ========== freee連携 API ==========

/**
 * freee認証URLを取得
 */
export const getFreeeAuthUrl = async (): Promise<FreeAuthUrlResponse> => {
  const response = await apiClient.get<ApiResponse<FreeAuthUrlResponse>>(
    API_ENDPOINTS.FREEE_AUTH_URL,
  );
  return response.data.data;
};

/**
 * freee認証コールバック処理
 */
export const handleFreeeCallback = async (
  code: string,
  state: string,
): Promise<FreeConfig> => {
  const response = await apiClient.post<ApiResponse<FreeConfig>>(
    API_ENDPOINTS.FREEE_CALLBACK,
    { code, state },
  );
  return response.data.data;
};

/**
 * freee接続を解除
 */
export const disconnectFreee = async (): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.FREEE_DISCONNECT);
};

/**
 * freee同期を実行
 */
export const syncFreeeData = async (
  data: FreeSyncRequest,
): Promise<FreeSyncLog> => {
  const response = await apiClient.post<ApiResponse<FreeSyncLog>>(
    API_ENDPOINTS.FREEE_SYNC,
    data,
  );
  return response.data.data;
};

/**
 * freee取引先一覧を取得
 */
export const getFreeePartners = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ListResponse<FreePartner>> => {
  const response = await apiClient.get<ListResponse<FreePartner>>(
    API_ENDPOINTS.FREEE_PARTNERS,
    { params },
  );
  return response.data;
};

/**
 * freee請求書一覧を取得
 */
export const getFreeeInvoices = async (params?: {
  page?: number;
  limit?: number;
  partnerId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ListResponse<FreeInvoice>> => {
  const response = await apiClient.get<ListResponse<FreeInvoice>>(
    API_ENDPOINTS.FREEE_INVOICES,
    { params },
  );
  return response.data;
};

/**
 * freee設定を取得
 */
export const getFreeeConfig = async (): Promise<FreeConfig | null> => {
  try {
    const response = await apiClient.get<ApiResponse<FreeConfig>>(
      "/accounting/freee/config",
    );
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// ========== スケジュール API ==========

/**
 * スケジュール一覧を取得
 */
export const getSchedules = async (params?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}): Promise<ListResponse<ScheduledJob>> => {
  const response = await apiClient.get<ListResponse<ScheduledJob>>(
    API_ENDPOINTS.SCHEDULES,
    { params },
  );
  return response.data;
};

/**
 * スケジュール詳細を取得
 */
export const getSchedule = async (id: UUID): Promise<ScheduledJob> => {
  const response = await apiClient.get<ApiResponse<ScheduledJob>>(
    API_ENDPOINTS.SCHEDULE_DETAIL(id),
  );
  return response.data.data;
};

/**
 * スケジュールを作成
 */
export const createSchedule = async (
  data: CreateScheduleRequest,
): Promise<ScheduledJob> => {
  const response = await apiClient.post<ApiResponse<ScheduledJob>>(
    API_ENDPOINTS.SCHEDULES,
    data,
  );
  return response.data.data;
};

/**
 * スケジュールを更新
 */
export const updateSchedule = async (
  id: UUID,
  data: UpdateScheduleRequest,
): Promise<ScheduledJob> => {
  const response = await apiClient.put<ApiResponse<ScheduledJob>>(
    API_ENDPOINTS.SCHEDULE_DETAIL(id),
    data,
  );
  return response.data.data;
};

/**
 * スケジュールを削除
 */
export const deleteSchedule = async (id: UUID): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.SCHEDULE_DETAIL(id));
};

/**
 * スケジュールを手動実行
 */
export const executeSchedule = async (id: UUID): Promise<BatchJob> => {
  const response = await apiClient.post<ApiResponse<BatchJob>>(
    API_ENDPOINTS.SCHEDULE_EXECUTE(id),
  );
  return response.data.data;
};

// ========== バッチジョブ API ==========

/**
 * バッチジョブ一覧を取得
 */
export const getBatchJobs = async (params?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}): Promise<ListResponse<BatchJob>> => {
  const response = await apiClient.get<ListResponse<BatchJob>>(
    API_ENDPOINTS.BATCH_JOBS,
    { params },
  );
  return response.data;
};

/**
 * バッチジョブ詳細を取得
 */
export const getBatchJob = async (id: UUID): Promise<BatchJob> => {
  const response = await apiClient.get<ApiResponse<BatchJob>>(
    API_ENDPOINTS.BATCH_JOB_DETAIL(id),
  );
  return response.data.data;
};

/**
 * バッチジョブを作成
 */
export const createBatchJob = async (
  data: CreateBatchJobRequest,
): Promise<BatchJob> => {
  const response = await apiClient.post<ApiResponse<BatchJob>>(
    API_ENDPOINTS.BATCH_JOBS,
    data,
  );
  return response.data.data;
};

/**
 * バッチジョブをキャンセル
 */
export const cancelBatchJob = async (id: UUID): Promise<void> => {
  await apiClient.post(API_ENDPOINTS.BATCH_JOB_CANCEL(id));
};

// ========== エクスポート API ==========

/**
 * 請求データをエクスポート
 */
export const exportBillingData = async (
  data: ExportRequest,
): Promise<ExportResult> => {
  const response = await apiClient.post<ApiResponse<ExportResult>>(
    API_ENDPOINTS.EXPORT_BILLING,
    data,
  );
  return response.data.data;
};

/**
 * プロジェクトグループデータをエクスポート
 */
export const exportProjectGroupData = async (
  data: ExportRequest,
): Promise<ExportResult> => {
  const response = await apiClient.post<ApiResponse<ExportResult>>(
    API_ENDPOINTS.EXPORT_PROJECT_GROUPS,
    data,
  );
  return response.data.data;
};

/**
 * freeeデータをエクスポート
 */
export const exportFreeeData = async (
  data: ExportRequest,
): Promise<ExportResult> => {
  const response = await apiClient.post<ApiResponse<ExportResult>>(
    API_ENDPOINTS.EXPORT_FREEE_DATA,
    data,
  );
  return response.data.data;
};

// ========== ユーティリティ関数 ==========

/**
 * ファイルをダウンロード
 */
export const downloadFile = async (
  url: string,
  filename: string,
): Promise<void> => {
  const response = await apiClient.get(url, {
    responseType: "blob",
  });

  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

/**
 * APIエラーハンドリング用ヘルパー
 */
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return "予期しないエラーが発生しました";
};

/**
 * リクエストのキャンセルトークンを作成
 */
export const createCancelToken = () => {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
};

// ========== リアルタイム更新 ==========

/**
 * バッチジョブの進行状況をポーリング
 */
export const pollBatchJobProgress = async (
  jobId: UUID,
  onProgress: (job: BatchJob) => void,
  intervalMs: number = 2000,
): Promise<BatchJob> => {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const job = await getBatchJob(jobId);
        onProgress(job);

        if (
          job.status === "completed" ||
          job.status === "failed" ||
          job.status === "cancelled"
        ) {
          resolve(job);
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
};

/**
 * freee同期の進行状況をポーリング
 */
export const pollFreeSyncProgress = async (
  onProgress: (log: FreeSyncLog) => void,
  intervalMs: number = 3000,
): Promise<void> => {
  // 最新の同期ログを取得する実装
  // 実際の実装では適切なエンドポイントを呼び出す
  const checkProgress = async () => {
    try {
      const response = await apiClient.get<ApiResponse<FreeSyncLog>>(
        "/accounting/freee/sync/latest",
      );
      const log = response.data.data;
      onProgress(log);

      if (log.status === "completed" || log.status === "failed") {
        return;
      }

      setTimeout(checkProgress, intervalMs);
    } catch (error) {
      console.error("Failed to check sync progress:", error);
    }
  };

  checkProgress();
};

// ========== キャッシュ管理 ==========

/**
 * ダッシュボードデータをキャッシュから取得またはAPIから取得
 */
export const getCachedDashboard = async (
  forceRefresh: boolean = false,
): Promise<AccountingDashboard> => {
  const cacheKey = "accounting_dashboard";
  const cacheDuration = 5 * 60 * 1000; // 5分

  if (!forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheDuration) {
        return data;
      }
    }
  }

  const data = await getAccountingDashboard();
  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    }),
  );

  return data;
};

/**
 * キャッシュをクリア
 */
export const clearAccountingCache = (): void => {
  const keys = [
    "accounting_dashboard",
    "accounting_project_groups",
    "accounting_freee_config",
  ];

  keys.forEach((key) => {
    localStorage.removeItem(key);
  });
};

// ========== バッチ操作 ==========

/**
 * 複数のプロジェクトグループを一括削除
 */
export const deleteMultipleProjectGroups = async (
  ids: UUID[],
): Promise<void> => {
  await Promise.all(ids.map((id) => deleteProjectGroup(id)));
};

/**
 * 複数クライアントの請求処理を一括実行
 */
export const processBillingBatch = async (
  requests: ProcessBillingRequest[],
): Promise<BillingProcessResult[]> => {
  const results = await Promise.allSettled(
    requests.map((request) => processBilling(request)),
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      throw new Error(
        `請求処理に失敗しました (クライアント ${index + 1}): ${result.reason}`,
      );
    }
  });
};

// ========== デバッグ・テスト用 ==========

/**
 * API接続テスト
 */
export const testApiConnection = async (): Promise<boolean> => {
  try {
    await apiClient.get("/accounting/health");
    return true;
  } catch {
    return false;
  }
};

/**
 * APIレスポンス時間を測定
 */
export const measureApiResponseTime = async (
  apiCall: () => Promise<any>,
): Promise<{ result: any; duration: number }> => {
  const start = performance.now();
  const result = await apiCall();
  const duration = performance.now() - start;

  return { result, duration };
};

// ========== 型ガード ==========

/**
 * APIエラーレスポンスかどうかを判定
 */
export const isApiError = (
  error: any,
): error is { response: { data: { error: string } } } => {
  return error?.response?.data?.error !== undefined;
};

/**
 * ネットワークエラーかどうかを判定
 */
export const isNetworkError = (error: any): boolean => {
  return error.code === "NETWORK_ERROR" || error.message === "Network Error";
};

/**
 * タイムアウトエラーかどうかを判定
 */
export const isTimeoutError = (error: any): boolean => {
  return error.code === "ECONNABORTED" || error.message?.includes("timeout");
};

// ========== 請求書関連 API ==========

/**
 * 請求書履歴を取得（ページネーション対応）
 */
export const getInvoiceHistory = async (params?: {
  page?: number;
  limit?: number;
  clientId?: UUID;
  month?: MonthString;
  status?: string;
}): Promise<Invoice[]> => {
  const response = await apiClient.get<ApiResponse<Invoice[]>>(
    "/accounting/invoices",
    { params }
  );
  return response.data.data;
};

/**
 * 請求書サマリーを取得
 */
export const getInvoiceSummary = async (): Promise<InvoiceSummary> => {
  const response = await apiClient.get<ApiResponse<InvoiceSummary>>(
    "/accounting/invoices/summary"
  );
  return response.data.data;
};

/**
 * 請求書ステータスを更新
 */
export const updateInvoiceStatus = async (
  id: UUID,
  status: InvoiceStatus
): Promise<Invoice> => {
  const response = await apiClient.patch<ApiResponse<Invoice>>(
    `/api/v1/accounting/invoices/${id}/status`,
    { status }
  );
  return response.data.data;
};

/**
 * 請求書のバルク操作
 */
export const bulkInvoiceAction = async (
  action: string,
  invoiceIds: UUID[]
): Promise<BulkActionResult> => {
  const response = await apiClient.post<ApiResponse<BulkActionResult>>(
    "/accounting/invoices/bulk",
    { action, invoiceIds }
  );
  return response.data.data;
};

// PDF出力（v0除外）

/**
 * 請求書をfreeeに送信
 */
export const sendInvoiceToFreee = async (
  id: UUID
): Promise<FreeSyncResult> => {
  const response = await apiClient.post<ApiResponse<FreeSyncResult>>(
    `/api/v1/accounting/invoices/${id}/freee-sync`
  );
  return response.data.data;
};

// ========== レート制限対応 ==========

/**
 * レート制限を考慮したAPI呼び出し
 */
export const callWithRateLimit = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;

      if (error.response?.status === 429) {
        // レート制限エラーの場合、指数バックオフでリトライ
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // レート制限以外のエラーは即座に再スロー
      throw error;
    }
  }

  throw lastError;
};

// ========== API呼び出し統計 ==========

/**
 * API呼び出し統計を記録
 */
interface ApiStats {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
}

const apiStats: ApiStats[] = [];

/**
 * API統計を取得
 */
export const getApiStats = (): ApiStats[] => {
  return [...apiStats];
};

/**
 * API統計をクリア
 */
export const clearApiStats = (): void => {
  apiStats.length = 0;
};

/**
 * API統計を記録するインターセプター（使用例）
 */
export const setupApiStatsInterceptor = (): void => {
  apiClient.interceptors.request.use((config: any) => {
    config.metadata = { startTime: performance.now() };
    return config;
  });

  apiClient.interceptors.response.use(
    (response: any) => {
      const duration = performance.now() - response.config.metadata.startTime;
      apiStats.push({
        endpoint: response.config.url || "",
        method: response.config.method?.toUpperCase() || "",
        duration,
        status: response.status,
        timestamp: Date.now(),
      });
      return response;
    },
    (error: any) => {
      if (error.config?.metadata?.startTime) {
        const duration = performance.now() - error.config.metadata.startTime;
        apiStats.push({
          endpoint: error.config.url || "",
          method: error.config.method?.toUpperCase() || "",
          duration,
          status: error.response?.status || 0,
          timestamp: Date.now(),
        });
      }
      return Promise.reject(error);
    },
  );
};

// ========== Default Export ==========

/**
 * 経理API群をまとめたオブジェクト
 */
export const accountingApi = {
  // ダッシュボード
  getAccountingDashboard,
  getMonthlyTrend,
  getClientBillingRanking,
  getCachedDashboard,
  
  // 基本データ
  getClients,
  getProjects,
  
  // プロジェクトグループ
  getProjectGroups,
  getProjectGroup,
  createProjectGroup,
  updateProjectGroup,
  deleteProjectGroup,
  addProjectToGroup,
  removeProjectFromGroup,
  deleteMultipleProjectGroups,
  
  // 請求処理
  getBillingPreview,
  getBillingPreviews,
  processBilling,
  processBillingBatch,
  scheduleBilling,
  getBillingHistory,
  
  // 請求書
  getInvoiceHistory,
  getInvoiceSummary,
  updateInvoiceStatus,
  bulkInvoiceAction,
  exportInvoicePDF,
  sendInvoiceToFreee,
  
  // freee連携
  getFreeeAuthUrl,
  handleFreeeCallback,
  disconnectFreee,
  syncFreeeData,
  getFreeePartners,
  getFreeeInvoices,
  getFreeeConfig,
  pollFreeSyncProgress,
  
  // スケジュール
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  executeSchedule,
  
  // バッチジョブ
  getBatchJobs,
  getBatchJob,
  createBatchJob,
  cancelBatchJob,
  pollBatchJobProgress,
  
  // エクスポート
  exportBillingData,
  exportProjectGroupData,
  exportFreeeData,
  downloadFile,
  
  // ユーティリティ
  handleApiError,
  createCancelToken,
  testApiConnection,
  measureApiResponseTime,
  clearAccountingCache,
  callWithRateLimit,
  setupApiStatsInterceptor,
  getApiStats,
  clearApiStats,
  
  // 型ガード
  isApiError,
  isNetworkError,
  isTimeoutError,
} as const;

// デフォルトエクスポート
export default accountingApi;
