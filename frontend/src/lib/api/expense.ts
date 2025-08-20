// 経費関連のAPI処理ライブラリ

import { createPresetApiClient } from '@/lib/api';
import { handleApiError } from '@/lib/api/error';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import { EXPENSE_API_ENDPOINTS } from '@/constants/expense';
import type { ExpenseCategory, ExpenseListResponse, ExpenseListBackendResponse } from '@/types/expense';
import { mapBackendExpenseListToExpenseList } from '@/utils/expenseMappers';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';

// 経費データの型定義
export interface Expense {
  id: string;
  userId: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  paymentMethod: string;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  receiptUrls: string[];
  projectId?: string;
  clientId?: string;
  isBusinessTrip: boolean;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  paidAt?: string;
  approver?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// 経費作成・更新用のデータ型
export interface ExpenseCreateData {
  category: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  paymentMethod: string;
  taxRate: number;
  projectId?: string;
  clientId?: string;
  isBusinessTrip?: boolean;
}

// 経費更新用のデータ型
export interface ExpenseUpdateData extends Partial<ExpenseCreateData> {
  id: string;
}

// 経費の検索・フィルタリング用のパラメータ
export interface ExpenseSearchParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ExpenseListResponseはtypes/expenseから使用

// 経費統計の型定義
export interface ExpenseStats {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
  categoryBreakdown: {
    category: string;
    amount: number;
    count: number;
  }[];
  monthlyTrend: {
    month: string;
    amount: number;
    count: number;
  }[];
  statusBreakdown: {
    status: string;
    count: number;
  }[];
}

// 領収書アップロード用のデータ型
export interface ReceiptUploadData {
  expenseId: string;
  files: File[];
}

// 領収書アップロードのレスポンス型
export interface ReceiptUploadResponse {
  receiptUrls: string[];
  message: string;
}

// ファイルアップロード関連の型定義
export interface UploadFileRequest {
  file_name: string;
  file_size: number;
  content_type: string;
}

export interface UploadFileResponse {
  uploadUrl: string;
  s3Key: string;
  expiresAt: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadUrl?: string;
  s3Key?: string;
}

export interface CompleteUploadRequest {
  s3_key: string;
  file_name: string;
  file_size: number;
  content_type: string;
}

export interface CompleteUploadResponse {
  receiptUrl: string;
  s3Key: string;
  uploadedAt: string;
}

export interface DeleteUploadRequest {
  s3_key: string;
}

// API エラーの型定義
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: any;
}

// 経費一覧を取得
export async function getExpenses(params: ExpenseSearchParams = {}): Promise<ExpenseListResponse> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenses' },
      'Getting expenses list',
      { params }
    );

    const client = createPresetApiClient('auth');
    const response = await client.get(EXPENSE_API_ENDPOINTS.EXPENSES, { params });
    
    // デバッグログ追加
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenses' },
      'Raw response received',
      { 
        hasData: !!response.data,
        hasDataData: !!response.data?.data,
        dataStructure: response.data ? Object.keys(response.data) : []
      }
    );
    
    // レスポンス構造の確認と修正
    const responseData = response.data?.data || response.data;
    
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
  params: ExpenseSearchParams = {},
  signal?: AbortSignal
): Promise<ExpenseListResponse> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseList' },
      'Getting expense list',
      { params }
    );

    const client = createPresetApiClient('auth');
    const response = await client.get(EXPENSE_API_ENDPOINTS.EXPENSES, { params, signal });
    
    // デバッグログ追加
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseList' },
      'Raw response received',
      { 
        hasData: !!response.data,
        hasDataData: !!response.data?.data,
        dataStructure: response.data ? Object.keys(response.data) : []
      }
    );
    
    // レスポンス構造の確認と修正
    const responseData = response.data?.data || response.data;
    
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
export async function getExpense(id: string): Promise<Expense> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GetExpense' },
      'Getting expense detail',
      { id }
    );

    const client = createPresetApiClient('auth');
    const response = await client.get(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}`);
    
    const result = convertSnakeToCamel<Expense>(response.data.data || response.data);
    
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
export async function createExpense(data: ExpenseCreateData): Promise<Expense> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'CreateExpense' },
      'Creating expense',
      { category: data.category, amount: data.amount }
    );

    const client = createPresetApiClient('auth');
    const requestData = convertCamelToSnake(data);
    const response = await client.post(EXPENSE_API_ENDPOINTS.EXPENSES, requestData);
    
    const result = convertSnakeToCamel<Expense>(response.data.data || response.data);
    
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
export async function updateExpense(data: ExpenseUpdateData): Promise<Expense> {
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
    
    const result = convertSnakeToCamel<Expense>(response.data.data || response.data);
    
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
export async function submitExpense(id: string): Promise<Expense> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'SubmitExpense' },
      'Submitting expense',
      { id }
    );

    const client = createPresetApiClient('auth');
    const response = await client.post(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}/submit`);
    
    const result = convertSnakeToCamel<Expense>(response.data.data || response.data);
    
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

// 経費を承認
export async function approveExpense(id: string): Promise<Expense> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'ApproveExpense' },
      'Approving expense',
      { id }
    );

    const client = createPresetApiClient('auth');
    const response = await client.post(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}/approve`);
    
    const result = convertSnakeToCamel<Expense>(response.data.data || response.data);
    
    DebugLogger.info(
      { category: 'API', operation: 'ApproveExpense' },
      'Expense approved successfully',
      { id: result.id }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'ApproveExpense' }, 'Failed to approve expense', error);
    throw handleApiError(error, '経費承認');
  }
}

// 経費を却下
export async function rejectExpense(id: string, reason: string): Promise<Expense> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'RejectExpense' },
      'Rejecting expense',
      { id, reason }
    );

    const client = createPresetApiClient('auth');
    const response = await client.post(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}/reject`, { reason });
    
    const result = convertSnakeToCamel<Expense>(response.data.data || response.data);
    
    DebugLogger.info(
      { category: 'API', operation: 'RejectExpense' },
      'Expense rejected successfully',
      { id: result.id }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'RejectExpense' }, 'Failed to reject expense', error);
    throw handleApiError(error, '経費却下');
  }
}

// 経費の統計を取得
export async function getExpenseStats(params: Partial<ExpenseSearchParams> = {}): Promise<ExpenseStats> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseStats' },
      'Getting expense statistics',
      { params }
    );

    const client = createPresetApiClient('auth');
    const response = await client.get(`${EXPENSE_API_ENDPOINTS.EXPENSES}/stats`, { params });
    
    const result = convertSnakeToCamel<ExpenseStats>(response.data.data || response.data);
    
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseStats' },
      'Expense statistics retrieved successfully',
      { totalAmount: result.totalAmount }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'GetExpenseStats' }, 'Failed to get expense statistics', error);
    throw handleApiError(error, '経費統計取得');
  }
}

// 領収書をアップロード
export async function uploadReceipts(data: ReceiptUploadData): Promise<ReceiptUploadResponse> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'UploadReceipts' },
      'Uploading receipts',
      { expenseId: data.expenseId, fileCount: data.files.length }
    );

    const formData = new FormData();
    formData.append('expenseId', data.expenseId);
    
    data.files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    const client = createPresetApiClient('upload'); // uploadプリセット使用（タイムアウト120秒）
    const response = await client.post(EXPENSE_API_ENDPOINTS.RECEIPTS, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    const result = convertSnakeToCamel<ReceiptUploadResponse>(response.data);
    
    DebugLogger.info(
      { category: 'API', operation: 'UploadReceipts' },
      'Receipts uploaded successfully',
      { receiptUrls: result.receiptUrls }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'UploadReceipts' }, 'Failed to upload receipts', error);
    throw handleApiError(error, '領収書アップロード');
  }
}

// 領収書を削除
export async function deleteReceipt(expenseId: string, receiptUrl: string): Promise<void> {
  try {
    DebugLogger.info(
      { category: 'API', operation: 'DeleteReceipt' },
      'Deleting receipt',
      { expenseId, receiptUrl }
    );

    const client = createPresetApiClient('auth');
    await client.delete(`${EXPENSE_API_ENDPOINTS.RECEIPTS}/${expenseId}`, {
      data: { receiptUrl }
    });
    
    DebugLogger.info(
      { category: 'API', operation: 'DeleteReceipt' },
      'Receipt deleted successfully',
      { expenseId }
    );
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'DeleteReceipt' }, 'Failed to delete receipt', error);
    throw handleApiError(error, '領収書削除');
  }
}

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
    
    const convertedData = convertSnakeToCamel<ExpenseCategoryApiResponse>(response.data);
    
    // APIレスポンスをフロントエンドの型にマッピング
    const result = convertedData.data.map(category => ({
      id: category.id,
      code: category.code,
      name: category.name,
      requiresDetails: category.requiresDetails,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
    
    DebugLogger.info(
      { category: 'API', operation: 'GetExpenseCategories' },
      'Expense categories retrieved successfully',
      { count: result.length }
    );
    
    return result;
  } catch (error) {
    DebugLogger.error({ category: 'EXPENSE_API', operation: 'GetExpenseCategories' }, 'Failed to get expense categories', error);
    throw handleApiError(error, '経費カテゴリ取得');
  }
}

// 経費レポートを生成
export async function generateExpenseReport(params: ExpenseSearchParams & { format: 'pdf' | 'excel' | 'csv' }): Promise<Blob> {
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

// 経費テンプレートを取得
export async function getExpenseTemplates(): Promise<Expense[]> {
  try {
    const client = createPresetApiClient('auth');
    const response = await client.get(EXPENSE_API_ENDPOINTS.TEMPLATES);
    return convertSnakeToCamel<Expense[]>(response.data.data || response.data);
  } catch (error) {
    throw handleApiError(error, 'テンプレート取得');
  }
}

// 経費テンプレートを作成
export async function createExpenseTemplate(data: ExpenseCreateData & { name: string }): Promise<Expense> {
  try {
    const client = createPresetApiClient('auth');
    const requestData = convertCamelToSnake(data);
    const response = await client.post(EXPENSE_API_ENDPOINTS.TEMPLATES, requestData);
    return convertSnakeToCamel<Expense>(response.data.data || response.data);
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