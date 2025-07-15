import { getAuthClient } from '@/lib/api';
import { EXPENSE_API } from '@/constants/api';
import { handleApiError, AbortError } from './error';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import { DebugLogger } from '@/lib/debug/logger';

// 型定義のインポート
import type {
  ExpenseFormData,
  ExpenseData,
  ExpenseListParams,
  ExpenseListResponse,
  ExpenseCategory,
  UploadFileRequest,
  UploadFileResponse,
  UploadCompleteRequest,
  UploadDeleteRequest
} from '@/types/expense';

/**
 * 経費申請を作成
 * @param data 経費申請リクエストデータ
 * @returns 作成された経費申請
 */
export const createExpense = async (data: ExpenseFormData): Promise<ExpenseData> => {
  const client = getAuthClient();
  try {
    const snakeData = convertCamelToSnake(data);
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: '作成'
    }, {
      url: EXPENSE_API.CREATE,
      method: 'POST',
      requestData: data,
      convertedRequestData: snakeData
    });
    
    const response = await client.post(EXPENSE_API.CREATE, snakeData);
    
    const result = convertSnakeToCamel<ExpenseData>(response.data);
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: '作成'
    }, {
      status: response.status,
      responseData: result
    });
    
    return result;
  } catch (error) {
    const handledError = handleApiError(error, '経費申請の作成');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: '作成'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * 経費申請一覧を取得
 * @param params 検索パラメータ
 * @param signal AbortSignal
 * @returns 経費申請一覧
 */
export const getExpenseList = async (
  params?: ExpenseListParams,
  signal?: AbortSignal
): Promise<ExpenseListResponse> => {
  const client = getAuthClient();
  try {
    const options = {
      signal,
      timeout: 20000,
      params: params ? convertCamelToSnake(params) : undefined
    };
    
    const response = await client.get(EXPENSE_API.LIST, options);
    
    return convertSnakeToCamel<ExpenseListResponse>(response.data);
  } catch (error) {
    const handledError = handleApiError(error, '経費申請一覧');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: '一覧取得'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * 経費申請詳細を取得
 * @param id 経費申請ID
 * @param signal AbortSignal
 * @returns 経費申請詳細
 */
export const getExpense = async (id: string, signal?: AbortSignal): Promise<ExpenseData> => {
  const client = getAuthClient();
  try {
    const url = EXPENSE_API.GET.replace(':id', id);
    const options = {
      signal,
      timeout: 20000
    };
    
    const response = await client.get(url, options);
    
    return convertSnakeToCamel<ExpenseData>(response.data);
  } catch (error) {
    const handledError = handleApiError(error, '経費申請詳細');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: '詳細取得'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * 経費申請を更新
 * @param id 経費申請ID
 * @param data 更新データ
 * @returns 更新された経費申請
 */
export const updateExpense = async (id: string, data: ExpenseFormData): Promise<ExpenseData> => {
  const client = getAuthClient();
  try {
    const url = EXPENSE_API.UPDATE.replace(':id', id);
    const snakeData = convertCamelToSnake(data);
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: '更新'
    }, {
      url,
      method: 'PUT',
      requestData: data,
      convertedRequestData: snakeData
    });
    
    const response = await client.put(url, snakeData);
    
    const result = convertSnakeToCamel<ExpenseData>(response.data);
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: '更新'
    }, {
      status: response.status,
      responseData: result
    });
    
    return result;
  } catch (error) {
    const handledError = handleApiError(error, '経費申請の更新');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: '更新'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * 経費申請を削除
 * @param id 経費申請ID
 */
export const deleteExpense = async (id: string): Promise<void> => {
  const client = getAuthClient();
  try {
    const url = EXPENSE_API.DELETE.replace(':id', id);
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: '削除'
    }, {
      url,
      method: 'DELETE'
    });
    
    const response = await client.delete(url);
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: '削除'
    }, {
      status: response.status
    });
  } catch (error) {
    const handledError = handleApiError(error, '経費申請の削除');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: '削除'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * 経費申請を提出
 * @param id 経費申請ID
 * @returns 提出された経費申請
 */
export const submitExpense = async (id: string): Promise<ExpenseData> => {
  const client = getAuthClient();
  try {
    const url = EXPENSE_API.SUBMIT.replace(':id', id);
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: '提出'
    }, {
      url,
      method: 'POST'
    });
    
    const response = await client.post(url);
    
    const result = convertSnakeToCamel<ExpenseData>(response.data);
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: '提出'
    }, {
      status: response.status,
      responseData: result
    });
    
    return result;
  } catch (error) {
    const handledError = handleApiError(error, '経費申請の提出');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: '提出'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * 経費申請を取消
 * @param id 経費申請ID
 * @returns 取消された経費申請
 */
export const cancelExpense = async (id: string): Promise<ExpenseData> => {
  const client = getAuthClient();
  try {
    const url = EXPENSE_API.CANCEL.replace(':id', id);
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: '取消'
    }, {
      url,
      method: 'POST'
    });
    
    const response = await client.post(url);
    
    const result = convertSnakeToCamel<ExpenseData>(response.data);
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: '取消'
    }, {
      status: response.status,
      responseData: result
    });
    
    return result;
  } catch (error) {
    const handledError = handleApiError(error, '経費申請の取消');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: '取消'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * ファイルアップロード用のPresigned URLを生成
 * @param data アップロードファイル情報
 * @returns アップロードURL情報
 */
export const generateUploadURL = async (data: UploadFileRequest): Promise<UploadFileResponse> => {
  const client = getAuthClient();
  try {
    const snakeData = convertCamelToSnake(data);
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: 'アップロードURL生成'
    }, {
      url: EXPENSE_API.GENERATE_UPLOAD_URL,
      method: 'POST',
      requestData: data,
      convertedRequestData: snakeData
    });
    
    const response = await client.post(EXPENSE_API.GENERATE_UPLOAD_URL, snakeData);
    
    const result = convertSnakeToCamel<UploadFileResponse>(response.data);
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: 'アップロードURL生成'
    }, {
      status: response.status,
      responseData: result
    });
    
    return result;
  } catch (error) {
    const handledError = handleApiError(error, 'アップロードURLの生成');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: 'アップロードURL生成'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * ファイルアップロード完了を通知
 * @param data アップロード完了情報
 */
export const completeUpload = async (data: UploadCompleteRequest): Promise<void> => {
  const client = getAuthClient();
  try {
    const snakeData = convertCamelToSnake(data);
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: 'アップロード完了'
    }, {
      url: EXPENSE_API.COMPLETE_UPLOAD,
      method: 'POST',
      requestData: data,
      convertedRequestData: snakeData
    });
    
    const response = await client.post(EXPENSE_API.COMPLETE_UPLOAD, snakeData);
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: 'アップロード完了'
    }, {
      status: response.status
    });
  } catch (error) {
    const handledError = handleApiError(error, 'アップロードの完了通知');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: 'アップロード完了'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * アップロードされたファイルを削除
 * @param data 削除対象ファイル情報
 */
export const deleteUploadedFile = async (data: UploadDeleteRequest): Promise<void> => {
  const client = getAuthClient();
  try {
    const snakeData = convertCamelToSnake(data);
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: 'アップロードファイル削除'
    }, {
      url: EXPENSE_API.DELETE_UPLOAD,
      method: 'DELETE',
      requestData: data,
      convertedRequestData: snakeData
    });
    
    const response = await client.delete(EXPENSE_API.DELETE_UPLOAD, { data: snakeData });
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: 'アップロードファイル削除'
    }, {
      status: response.status
    });
  } catch (error) {
    const handledError = handleApiError(error, 'アップロードファイルの削除');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: 'アップロードファイル削除'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * 年次集計を取得（会計年度対応）
 * @param year 年度（カレンダー年または会計年度）
 * @param isFiscalYear 会計年度フラグ
 * @param signal AbortSignal
 * @returns 年次集計情報
 */
export const getYearlySummary = async (
  year: number,
  isFiscalYear: boolean = false,
  signal?: AbortSignal
): Promise<YearlySummary> => {
  const client = getAuthClient();
  try {
    const params = isFiscalYear ? { fiscal_year: year } : { year: year };
    const options = {
      signal,
      timeout: 20000,
      params: convertCamelToSnake(params)
    };
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: '年次集計取得'
    }, {
      url: EXPENSE_API.SUMMARY,
      method: 'GET',
      params: params
    });
    
    const response = await client.get(EXPENSE_API.SUMMARY, options);
    
    const result = convertSnakeToCamel<YearlySummary>(response.data);
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: '年次集計取得'
    }, {
      status: response.status,
      responseData: result
    });
    
    return result;
  } catch (error) {
    const handledError = handleApiError(error, '年次集計');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: '年次集計取得'
    }, {
      error
    });
    throw handledError;
  }
};

/**
 * 経費カテゴリ一覧を取得
 * @param signal AbortSignal
 * @returns 経費カテゴリ一覧
 */
export const getExpenseCategories = async (signal?: AbortSignal): Promise<ExpenseCategory[]> => {
  const client = getAuthClient();
  try {
    const options = {
      signal,
      timeout: 20000
    };
    
    DebugLogger.apiRequest({
      category: '経費申請',
      operation: 'カテゴリ一覧取得'
    }, {
      url: EXPENSE_API.CATEGORIES,
      method: 'GET'
    });
    
    const response = await client.get(EXPENSE_API.CATEGORIES, options);
    
    const result = convertSnakeToCamel<ExpenseCategory[]>(response.data);
    
    DebugLogger.apiSuccess({
      category: '経費申請',
      operation: 'カテゴリ一覧取得'
    }, {
      status: response.status,
      responseData: result
    });
    
    return result;
  } catch (error) {
    const handledError = handleApiError(error, '経費カテゴリ一覧');
    
    if (handledError instanceof AbortError) {
      throw handledError;
    }
    
    DebugLogger.apiError({
      category: '経費申請',
      operation: 'カテゴリ一覧取得'
    }, {
      error
    });
    throw handledError;
  }
};

// 型定義を再エクスポート
export type {
  ExpenseFormData,
  ExpenseData,
  ExpenseListParams,
  ExpenseListResponse,
  ExpenseCategory,
  UploadFileRequest,
  UploadFileResponse,
  UploadCompleteRequest,
  UploadDeleteRequest,
  YearlySummary,
  MonthlyBreakdown
};