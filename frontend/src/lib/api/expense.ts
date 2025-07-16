// 経費関連のAPI処理ライブラリ

import { EXPENSE_API_ENDPOINTS } from '@/constants/expense';

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
    ...options,
  };

  // 認証トークンがある場合は追加
  const token = localStorage.getItem('accessToken');
  if (token) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      Authorization: `Bearer ${token}`,
    };
  }

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
  return apiRequest<ExpenseListResponse>(endpoint);
}

// 経費詳細を取得
export async function getExpense(id: string): Promise<Expense> {
  return apiRequest<Expense>(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}`);
}

// 経費を作成
export async function createExpense(data: ExpenseCreateData): Promise<Expense> {
  return apiRequest<Expense>(EXPENSE_API_ENDPOINTS.EXPENSES, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 経費を更新
export async function updateExpense(data: ExpenseUpdateData): Promise<Expense> {
  const { id, ...updateData } = data;
  return apiRequest<Expense>(`${EXPENSE_API_ENDPOINTS.EXPENSES}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
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
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
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

// 経費カテゴリ一覧を取得
export async function getExpenseCategories(): Promise<string[]> {
  return apiRequest<string[]>(EXPENSE_API_ENDPOINTS.CATEGORIES);
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
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
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