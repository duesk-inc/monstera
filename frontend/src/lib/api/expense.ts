// 経費関連のAPI処理ライブラリ

import { createPresetApiClient } from '@/lib/api';
import { handleApiError } from '@/lib/api/error';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import { EXPENSE_API_ENDPOINTS } from '@/constants/expense';
import type {
  ExpenseCategory,
  ExpenseListResponse,
  ExpenseListBackendResponse,
  ExpenseData,
  UploadFileRequest,
  UploadFileResponse,
  CompleteUploadRequest,
  CompleteUploadResponse,
  DeleteUploadRequest,
  ExpenseListParams,
} from '@/types/expense';
import { mapBackendExpenseListToExpenseList, mapBackendExpenseToExpenseData } from '@/utils/expenseMappers';
import { DebugLogger } from '@/lib/debug/logger';
import { extractDataFromResponse } from '@/utils/apiResponseUtils';

// ExpenseListResponseはtypes/expenseから使用

// 経費一覧を取得
export async function getExpenses(params: ExpenseListParams = {}): Promise<ExpenseListResponse> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenses' },
      'Getting expenses list',
      { params }
    );

    const client = createPresetApiClient('auth');
    const snakeParamsRaw = convertCamelToSnake(params) as Record<string, any>;
    // 特殊キー名の補正: amountMin/amountMax はサーバ側が min_amount/max_amount
    const snakeParams: Record<string, any> = { ...snakeParamsRaw };
    if (snakeParams.amount_min !== undefined) {
      snakeParams.min_amount = snakeParams.amount_min;
      delete snakeParams.amount_min;
    }
    if (snakeParams.amount_max !== undefined) {
      snakeParams.max_amount = snakeParams.amount_max;
      delete snakeParams.amount_max;
    }
    const response = await client.get(EXPENSE_API_ENDPOINTS.EXPENSES, { params: snakeParams });
    
    // 共通ユーティリティを使用してデータを抽出
    const responseData = extractDataFromResponse<ExpenseListBackendResponse>(
      response,
      'GetExpenses'
    );
    
    // nullチェック追加
    if (!responseData) {
      DebugLogger.warn(
        { category: 'API', operation: 'GetExpenses' },
        'Empty response data, returning default'
      );
      return {
        items: [],
        total: 0,
        page: 1,
        limit: params.limit || 20,
        totalPages: 0
      };
    }
    
    const result = mapBackendExpenseListToExpenseList(responseData);
    
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenses' },
      'Expenses retrieved successfully',
      { count: result.items.length }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'GetExpenses' }, 'Failed to get expenses', error);
    throw handleApiError(error, '経費一覧取得');
  }
}

// 経費一覧を取得（型定義をtypes/expenseから使用するバージョン）
export async function getExpenseList(
  params: ExpenseListParams = {},
  signal?: AbortSignal
): Promise<ExpenseListResponse> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseList' },
      'Getting expense list',
      { params }
    );

    const client = createPresetApiClient('auth');
    const snakeParamsRaw = convertCamelToSnake(params) as Record<string, any>;
    const snakeParams: Record<string, any> = { ...snakeParamsRaw };
    if (snakeParams.amount_min !== undefined) {
      snakeParams.min_amount = snakeParams.amount_min;
      delete snakeParams.amount_min;
    }
    if (snakeParams.amount_max !== undefined) {
      snakeParams.max_amount = snakeParams.amount_max;
      delete snakeParams.amount_max;
    }
    const response = await client.get(EXPENSE_API_ENDPOINTS.EXPENSES, { params: snakeParams, signal });
    
    // 共通ユーティリティを使用してデータを抽出
    const responseData = extractDataFromResponse<ExpenseListBackendResponse>(
      response, 
      'GetExpenseList'
    );
    
    // nullチェック追加
    if (!responseData) {
      DebugLogger.warn(
        { category: 'API', operation: 'GetExpenseList' },
        'Empty response data, returning default'
      );
      return {
        items: [],
        total: 0,
        page: 1,
        limit: params.limit || 20,
        totalPages: 0
      };
    }
    
    const result = mapBackendExpenseListToExpenseList(responseData);
    
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseList' },
      'Expense list retrieved successfully',
      { count: result.items.length }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'GetExpenseList' }, 'Failed to get expense list', error);
    throw handleApiError(error, '経費一覧取得');
  }
}

// 経費詳細を取得
export async function getExpense(id: string, signal?: AbortSignal): Promise<ExpenseData> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GetExpense' },
      'Getting expense detail',
      { id }
    );

    const client = createPresetApiClient('auth');
    const response = await client.get(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}`, { signal });
    
    const responseData = extractDataFromResponse(response, 'GetExpense');
    if (!responseData) {
      throw new Error('Empty response data');
    }
    
    const result = mapBackendExpenseToExpenseData(responseData as any);
    
    DebugLogger.info(
      { category: 'API', operation: 'GetExpense' },
      'Expense detail retrieved successfully',
      { id: result.id }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'GetExpense' }, 'Failed to get expense detail', error);
    throw handleApiError(error, '経費詳細取得');
  }
}

// 経費を作成
export async function createExpense(data: Record<string, any>): Promise<ExpenseData> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'CreateExpense' },
      'Creating expense',
      { category: data.category, amount: data.amount }
    );

    const client = createPresetApiClient('auth');
    const requestData = convertCamelToSnake(data);
    const response = await client.post(EXPENSE_API_ENDPOINTS.EXPENSES, requestData);
    
    const responseData = extractDataFromResponse(response, 'CreateExpense');
    if (!responseData) {
      throw new Error('Empty response data');
    }
    const result = mapBackendExpenseToExpenseData(responseData as any);
    
    DebugLogger.info(
      { category: 'API', operation: 'CreateExpense' },
      'Expense created successfully',
      { id: result.id }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'CreateExpense' }, 'Failed to create expense', error);
    throw handleApiError(error, '経費申請', { enableCodeMapping: true });
  }
}

// 経費を更新
export async function updateExpense(data: Record<string, any>): Promise<ExpenseData> {
  try {
    const { id, ...updateData } = data;
    
    DebugLogger.info(
      { category: 'API', operation: 'UpdateExpense' },
      'Updating expense',
      { id }
    );

    const client = createPresetApiClient('auth');
    const requestData = convertCamelToSnake(updateData);
    const response = await client.put(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}`, requestData);
    const responseData = extractDataFromResponse(response, 'UpdateExpense');
    const result = mapBackendExpenseToExpenseData((responseData || response.data.data || response.data) as any);
    
    DebugLogger.info(
      { category: 'API', operation: 'UpdateExpense' },
      'Expense updated successfully',
      { id: result.id }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'UpdateExpense' }, 'Failed to update expense', error);
    throw handleApiError(error, '経費更新', { enableCodeMapping: true });
  }
}

// 経費を削除
export async function deleteExpense(id: string): Promise<void> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'DeleteExpense' },
      'Deleting expense',
      { id }
    );

    const client = createPresetApiClient('auth');
    await client.delete(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}`);
    
    DebugLogger.info(
      { category: 'API', operation: 'DeleteExpense' },
      'Expense deleted successfully',
      { id }
    );
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'DeleteExpense' }, 'Failed to delete expense', error);
    throw handleApiError(error, '経費削除');
  }
}

// 経費を申請
export async function submitExpense(id: string): Promise<ExpenseData> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'SubmitExpense' },
      'Submitting expense',
      { id }
    );

    const client = createPresetApiClient('auth');
    const response = await client.post(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}/submit`);
    const responseData = extractDataFromResponse(response, 'SubmitExpense');
    const result = mapBackendExpenseToExpenseData((responseData || response.data.data || response.data) as any);
    
    DebugLogger.info(
      { category: 'API', operation: 'SubmitExpense' },
      'Expense submitted successfully',
      { id: result.id }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'SubmitExpense' }, 'Failed to submit expense', error);
    throw handleApiError(error, '経費申請');
  }
}

// 承認/却下は管理者APIに集約（frontend/src/lib/api/adminExpense.ts を使用）

// 経費カテゴリAPIレスポンスの型定義
interface ExpenseCategoryApiResponse {
  data: Array<{
    id: string;
    code: string;
    name: string;
    requires_details: boolean;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
  }>;
}

// アップロードURL生成APIレスポンスの型定義
interface GenerateUploadURLApiResponse {
  data: {
    upload_url: string;
    s3_key: string;
    expires_at: string;
  };
}

// アップロード完了APIレスポンスの型定義
interface CompleteUploadApiResponse {
  data: {
    receipt_url: string;
    s3_key: string;
    uploaded_at: string;
  };
}

// 経費カテゴリ一覧を取得
export async function getExpenseCategories(signal?: AbortSignal): Promise<ExpenseCategory[]> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseCategories' },
      'Getting expense categories'
    );

    const client = createPresetApiClient('auth');
    const response = await client.get(EXPENSE_API_ENDPOINTS.CATEGORIES, { signal });
    
    // 共通ユーティリティでデータ抽出
    const responseData = extractDataFromResponse(response, 'GetExpenseCategories');
    if (!responseData) {
      return [];
    }
    
    let categories: Array<{
      id: string;
      code: string;
      name: string;
      requires_details?: boolean;
      requiresDetails?: boolean;
      is_active?: boolean;
      isActive?: boolean;
      display_order?: number;
      displayOrder?: number;
      created_at?: string;
      createdAt?: string;
      updated_at?: string;
      updatedAt?: string;
    }>;
    
    // デバッグログでresponseDataの構造を確認
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseCategories' },
      'Response data structure',
      { 
        isArray: Array.isArray(responseData),
        hasDataProperty: responseData && typeof responseData === 'object' && 'data' in responseData,
        dataType: typeof responseData,
        responseData
      }
    );

    // responseDataが配列の場合（extractDataFromResponseが配列を返した場合）
    if (Array.isArray(responseData)) {
      categories = responseData;
    } 
    // responseDataがオブジェクトでdataプロパティを持つ場合（後方互換性）
    else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      // dataプロパティが配列の場合は直接使用
      if (Array.isArray((responseData as any).data)) {
        categories = (responseData as any).data;
      } else {
        // オブジェクト全体を変換してからdataを取り出す
        const convertedData = convertSnakeToCamel<ExpenseCategoryApiResponse>(responseData);
        categories = convertedData.data;
      }
    }
    // 予期しない構造の場合
    else {
      DebugLogger.warn(
        { category: 'API', operation: 'GetExpenseCategories' },
        'Unexpected response structure',
        { responseData }
      );
      return [];
    }
    
    // categoriesが未定義またはnullの場合は空配列を返す
    if (!categories) {
      DebugLogger.warn(
        { category: 'API', operation: 'GetExpenseCategories' },
        'Categories is null or undefined after extraction'
      );
      return [];
    }

    // 配列でない場合も空配列を返す
    if (!Array.isArray(categories)) {
      DebugLogger.warn(
        { category: 'API', operation: 'GetExpenseCategories' },
        'Categories is not an array',
        { categoriesType: typeof categories, categories }
      );
      return [];
    }

    // snake_caseからcamelCaseに変換してマッピング
    const convertedCategories = convertSnakeToCamel<typeof categories>(categories);
    
    // 変換後のチェック
    if (!Array.isArray(convertedCategories)) {
      DebugLogger.error(
        { category: 'API', operation: 'GetExpenseCategories' },
        'Converted categories is not an array',
        { convertedCategoriesType: typeof convertedCategories, convertedCategories }
      );
      return [];
    }
    
    // APIレスポンスをフロントエンドの型にマッピング
    const result = convertedCategories.map(category => ({
      id: category.id,
      code: category.code,
      name: category.name,
      requiresDetails: category.requiresDetails || category.requires_details,
      displayOrder: category.displayOrder || category.display_order,
      isActive: category.isActive || category.is_active,
      createdAt: category.createdAt || category.created_at,
      updatedAt: category.updatedAt || category.updated_at,
    }));
    
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseCategories' },
      'Expense categories retrieved successfully',
      { count: result.length }
    );
    
    return result;
  } catch (error) {
    // エラーの詳細をログに出力
    if (error instanceof Error) {
      DebugLogger.error(
        { category: 'EXPENSE_API', operation: 'GetExpenseCategories' }, 
        `Failed to get expense categories: ${error.message}`, 
        { 
          error,
          errorName: error.name,
          errorStack: error.stack,
          errorMessage: error.message
        }
      );
    } else {
      DebugLogger.error(
        { category: 'EXPENSE_API', operation: 'GetExpenseCategories' }, 
        'Failed to get expense categories (non-Error object)', 
        error
      );
    }
    throw handleApiError(error, '経費カテゴリ取得');
  }
}

// 経費レポートを生成
// 初期スコープ: CSV のみ対応（PDF/Excelは除外）
export async function generateExpenseReport(params: ExpenseListParams & { format: 'csv' }): Promise<Blob> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GenerateExpenseReport' },
      'Generating expense report',
      { format: params.format }
    );

    const client = createPresetApiClient('auth');
    const response = await client.get(EXPENSE_API_ENDPOINTS.REPORTS, {
      params,
      responseType: 'blob'
    });
    
    DebugLogger.info(
      { category: 'API', operation: 'GenerateExpenseReport' },
      'Expense report generated successfully',
      { format: params.format }
    );
    
    return response.data;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'GenerateExpenseReport' }, 'Failed to generate expense report', error);
    throw handleApiError(error, 'レポート生成');
  }
}

// 年次/会計年度サマリーを取得（スタブ：月別内訳は空配列）
export async function getYearlySummary(
  year: number,
  isFiscalYear: boolean = false,
  signal?: AbortSignal
): Promise<import('@/types/expense').YearlySummary> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GetYearlySummary' },
      'Getting yearly/fiscal summary',
      { year, isFiscalYear }
    );

    const client = createPresetApiClient('auth');
    const params = isFiscalYear ? { fiscalYear: year } : { year };
    const snakeParams = convertCamelToSnake(params);
    const response = await client.get(`${EXPENSE_API_ENDPOINTS.EXPENSES}/summary`, { params: snakeParams, signal });

    // 期待レスポンス: { data: { yearly: { total_amount, ... } } }
    const data = extractDataFromResponse<any>(response, 'GetYearlySummary');
    const yearly = (data && (data.yearly || data.Yearly)) || {};
    const result = {
      year,
      isFiscalYear,
      totalAmount: yearly.total_amount ?? yearly.totalAmount ?? 0,
      totalCount: data?.yearly_total_count ?? data?.total_count ?? 0,
      monthlyBreakdown: [] as any[], // サーバ側未提供のため空で整合
    } as import('@/types/expense').YearlySummary;

    DebugLogger.info(
      { category: 'API', operation: 'GetYearlySummary' },
      'Yearly summary retrieved',
      { totalAmount: result.totalAmount }
    );

    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'GetYearlySummary' }, 'Failed to get yearly summary', error);
    throw handleApiError(error, '年次集計取得');
  }
}

// 経費テンプレートを取得
export async function getExpenseTemplates(): Promise<ExpenseData[]> {
  try {
    const client = createPresetApiClient('auth');
    const response = await client.get(EXPENSE_API_ENDPOINTS.TEMPLATES);
    const raw = convertSnakeToCamel<any[]>(response.data.data || response.data) || [];
    return Array.isArray(raw) ? raw.map((item) => mapBackendExpenseToExpenseData(item)) : [];
  } catch (error) {
    throw handleApiError(error, 'テンプレート取得');
  }
}

// 経費テンプレートを作成
export async function createExpenseTemplate(data: Record<string, any> & { name: string }): Promise<ExpenseData> {
  try {
    const client = createPresetApiClient('auth');
    const requestData = convertCamelToSnake(data);
    const response = await client.post(EXPENSE_API_ENDPOINTS.TEMPLATES, requestData);
    return mapBackendExpenseToExpenseData(convertSnakeToCamel(response.data.data || response.data));
  } catch (error) {
    throw handleApiError(error, 'テンプレート作成');
  }
}

// 経費テンプレートを削除
export async function deleteExpenseTemplate(id: string): Promise<void> {
  try {
    const client = createPresetApiClient('auth');
    await client.delete(`${EXPENSE_API_ENDPOINTS.TEMPLATES}/${id}`);
  } catch (error) {
    throw handleApiError(error, 'テンプレート削除');
  }
}

// Pre-signed URLを生成
export async function generateUploadURL(data: UploadFileRequest): Promise<UploadFileResponse> {
  try {
    const client = createPresetApiClient('auth'); // JSONリクエストなのでauthプリセット使用
    const requestData = convertCamelToSnake(data);
    const response = await client.post(`${EXPENSE_API_ENDPOINTS.EXPENSES}/upload-url`, requestData);
    return convertSnakeToCamel<UploadFileResponse>(response.data.data || response.data);
  } catch (error) {
    throw handleApiError(error, 'アップロードURL生成');
  }
}

// アップロード完了を通知
export async function completeUpload(data: CompleteUploadRequest): Promise<CompleteUploadResponse> {
  try {
    const client = createPresetApiClient('auth');
    const requestData = convertCamelToSnake(data);
    const response = await client.post(`${EXPENSE_API_ENDPOINTS.EXPENSES}/upload-complete`, requestData);
    return convertSnakeToCamel<CompleteUploadResponse>(response.data.data || response.data);
  } catch (error) {
    throw handleApiError(error, 'アップロード完了');
  }
}

// アップロード済みファイルを削除
export async function deleteUploadedFile(data: DeleteUploadRequest): Promise<void> {
  try {
    const client = createPresetApiClient('auth');
    const requestData = convertCamelToSnake(data);
    await client.delete(`${EXPENSE_API_ENDPOINTS.EXPENSES}/upload`, { data: requestData });
  } catch (error) {
    throw handleApiError(error, 'アップロードファイル削除');
  }
}

// ファイルを直接S3/MinIOにアップロード
export async function uploadFileToS3(
  file: File, 
  uploadUrl: string, 
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // アップロード進捗の監視
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 204) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });
    
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

// 領収書アップロードの完全なフロー
export async function uploadReceiptComplete(
  file: File,
  onProgress?: (progress: number) => void
): Promise<CompleteUploadResponse> {
  try {
    // 1. Pre-signed URLを生成
    const uploadUrlData = await generateUploadURL({
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
    });
    
    // 2. ファイルを直接S3/MinIOにアップロード
    await uploadFileToS3(file, uploadUrlData.uploadUrl, onProgress);
    
    // 3. アップロード完了を通知
    const completeResponse = await completeUpload({
      s3_key: uploadUrlData.s3Key,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
    });
    
    return completeResponse;
  } catch (error) {
    console.error('Receipt upload failed:', error);
    throw error;
  }
}
