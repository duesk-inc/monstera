// 経費関連のAPI処理ライブラリ

import { EXPENSE_API_ENDPOINTS } from '@/constants/expense';
import type { ExpenseCategory, ExpenseListResponse, ExpenseListBackendResponse } from '@/types/expense';
import { mapBackendExpenseListToExpenseList } from '@/utils/expenseMappers';

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

// 経費一覧のレスポンス型
export interface ExpenseListResponse {
  expenses: Expense[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

// 基本的なAPI設定
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// APIリクエストのヘルパー関数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Cookie認証を使用
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// 経費一覧を取得
export async function getExpenses(params: ExpenseSearchParams = {}): Promise<ExpenseListResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const endpoint = `${EXPENSE_API_ENDPOINTS.EXPENSES}?${searchParams.toString()}`;
  const backendResponse = await apiRequest<{ data: ExpenseListBackendResponse }>(endpoint);
  
  // バックエンドレスポンスをフロントエンドの形式に変換
  return mapBackendExpenseListToExpenseList(backendResponse.data);
}

// 経費一覧を取得（型定義をtypes/expenseから使用するバージョン）
export async function getExpenseList(
  params: ExpenseSearchParams = {},
  signal?: AbortSignal
): Promise<ExpenseListResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const endpoint = `${EXPENSE_API_ENDPOINTS.EXPENSES}?${searchParams.toString()}`;
  const backendResponse = await apiRequest<{ data: ExpenseListBackendResponse }>(endpoint, { signal });
  
  // バックエンドレスポンスをフロントエンドの形式に変換
  return mapBackendExpenseListToExpenseList(backendResponse.data);
}

// 経費詳細を取得
export async function getExpense(id: string): Promise<Expense> {
  return apiRequest<Expense>(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}`);
}

// 経費を作成
export async function createExpense(data: ExpenseCreateData): Promise<Expense> {
  const response = await apiRequest<{ data: Expense }>(EXPENSE_API_ENDPOINTS.EXPENSES, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

// 経費を更新
export async function updateExpense(data: ExpenseUpdateData): Promise<Expense> {
  const { id, ...updateData } = data;
  const response = await apiRequest<{ data: Expense }>(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
  return response.data;
}

// 経費を削除
export async function deleteExpense(id: string): Promise<void> {
  return apiRequest<void>(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}`, {
    method: 'DELETE',
  });
}

// 経費を申請
export async function submitExpense(id: string): Promise<Expense> {
  return apiRequest<Expense>(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}/submit`, {
    method: 'POST',
  });
}

// 経費を承認
export async function approveExpense(id: string): Promise<Expense> {
  return apiRequest<Expense>(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}/approve`, {
    method: 'POST',
  });
}

// 経費を却下
export async function rejectExpense(id: string, reason: string): Promise<Expense> {
  return apiRequest<Expense>(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// 経費の統計を取得
export async function getExpenseStats(params: Partial<ExpenseSearchParams> = {}): Promise<ExpenseStats> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const endpoint = `${EXPENSE_API_ENDPOINTS.EXPENSES}/stats?${searchParams.toString()}`;
  return apiRequest<ExpenseStats>(endpoint);
}

// 領収書をアップロード
export async function uploadReceipts(data: ReceiptUploadData): Promise<ReceiptUploadResponse> {
  const formData = new FormData();
  formData.append('expenseId', data.expenseId);
  
  data.files.forEach((file, index) => {
    formData.append(`files[${index}]`, file);
  });

  const response = await fetch(`${API_BASE_URL}${EXPENSE_API_ENDPOINTS.RECEIPTS}`, {
    method: 'POST',
    body: formData,
    credentials: 'include', // Cookie認証を使用
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP Error: ${response.status}`);
  }

  return await response.json();
}

// 領収書を削除
export async function deleteReceipt(expenseId: string, receiptUrl: string): Promise<void> {
  return apiRequest<void>(`${EXPENSE_API_ENDPOINTS.RECEIPTS}/${expenseId}`, {
    method: 'DELETE',
    body: JSON.stringify({ receiptUrl }),
  });
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
  const response = await apiRequest<ExpenseCategoryApiResponse>(
    EXPENSE_API_ENDPOINTS.CATEGORIES, 
    { signal }
  );
  
  // APIレスポンスをフロントエンドの型にマッピング
  return response.data.map(category => ({
    id: category.id,
    code: category.code,
    name: category.name,
    requiresDetails: category.requires_details,
    displayOrder: category.display_order,
    isActive: category.is_active,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  }));
}

// 経費レポートを生成
export async function generateExpenseReport(params: ExpenseSearchParams & { format: 'pdf' | 'excel' | 'csv' }): Promise<Blob> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const endpoint = `${EXPENSE_API_ENDPOINTS.REPORTS}?${searchParams.toString()}`;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include', // Cookie認証を使用
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return await response.blob();
}

// 経費テンプレートを取得
export async function getExpenseTemplates(): Promise<Expense[]> {
  return apiRequest<Expense[]>(EXPENSE_API_ENDPOINTS.TEMPLATES);
}

// 経費テンプレートを作成
export async function createExpenseTemplate(data: ExpenseCreateData & { name: string }): Promise<Expense> {
  return apiRequest<Expense>(EXPENSE_API_ENDPOINTS.TEMPLATES, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 経費テンプレートを削除
export async function deleteExpenseTemplate(id: string): Promise<void> {
  return apiRequest<void>(`${EXPENSE_API_ENDPOINTS.TEMPLATES}/${id}`, {
    method: 'DELETE',
  });
}

// Pre-signed URLを生成
export async function generateUploadURL(data: UploadFileRequest): Promise<UploadFileResponse> {
  const response = await apiRequest<GenerateUploadURLApiResponse>(
    `${EXPENSE_API_ENDPOINTS.EXPENSES}/upload-url`, 
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
  
  // snake_caseからcamelCaseへの変換
  return {
    uploadUrl: response.data.upload_url,
    s3Key: response.data.s3_key,
    expiresAt: response.data.expires_at,
  };
}

// アップロード完了を通知
export async function completeUpload(data: CompleteUploadRequest): Promise<CompleteUploadResponse> {
  const response = await apiRequest<CompleteUploadApiResponse>(
    `${EXPENSE_API_ENDPOINTS.EXPENSES}/upload-complete`, 
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
  
  // snake_caseからcamelCaseへの変換
  return {
    receiptUrl: response.data.receipt_url,
    s3Key: response.data.s3_key,
    uploadedAt: response.data.uploaded_at,
  };
}

// アップロード済みファイルを削除
export async function deleteUploadedFile(data: DeleteUploadRequest): Promise<void> {
  return apiRequest<void>(`${EXPENSE_API_ENDPOINTS.EXPENSES}/upload`, {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
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