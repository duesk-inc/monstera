// 経費申請関連の型定義

import { ExpenseStatusType } from '@/constants/expense';

// 基本的な経費申請データの型
export interface ExpenseData {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  status: ExpenseStatusType;
  receiptUrl?: string;
  receiptS3Key?: string;
  expenseDate: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 経費申請作成・更新リクエストの型
export interface ExpenseFormData {
  categoryId: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  receiptS3Key?: string;
  expenseDate: string;
}

// 経費申請一覧検索パラメータの型
export interface ExpenseListParams {
  page?: number;
  limit?: number;
  status?: ExpenseStatusType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  year?: number;          // カレンダー年（1-12月）
  fiscalYear?: number;    // 会計年度（4-3月）
  month?: number;         // 月（1-12）
}

// 経費申請一覧レスポンスの型
export interface ExpenseListResponse {
  items: ExpenseData[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 経費カテゴリの型
export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
  requiresReceipt: boolean;
  monthlyLimit?: number;
  yearlyLimit?: number;
}

// ファイルアップロード関連の型
export interface UploadFileRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface UploadFileResponse {
  uploadUrl: string;
  s3Key: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  expiresAt: string;
}

export interface UploadCompleteRequest {
  s3Key: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface UploadDeleteRequest {
  s3Key: string;
}

// ファイルアップロードの状態管理用
export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  s3Key?: string;
  uploadUrl?: string;
  error?: string;
}

// フォーム状態管理用の型
export interface ExpenseFormState {
  data: ExpenseFormData;
  isSubmitting: boolean;
  isDirty: boolean;
  errors: Record<string, string>;
  upload?: UploadProgress;
}

// バリデーションエラーの型
export interface ValidationError {
  field: string;
  message: string;
}

// 経費申請詳細表示用の拡張型
export interface ExpenseDetail extends ExpenseData {
  categoryName: string;
  approverName?: string;
  rejectionReason?: string;
  history: ExpenseHistoryItem[];
}

// 経費申請履歴アイテムの型
export interface ExpenseHistoryItem {
  id: string;
  action: 'created' | 'updated' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
  actionBy: string;
  actionByName: string;
  actionAt: string;
  comment?: string;
}

// 経費申請集計データの型
export interface ExpenseSummary {
  totalAmount: number;
  monthlyAmount: number;
  yearlyAmount: number;
  categoryBreakdown: ExpenseCategoryBreakdown[];
  statusBreakdown: ExpenseStatusBreakdown[];
}

// 年次集計の型（会計年度対応）
export interface YearlySummary {
  userId: string;
  year: number;
  isFiscalYear: boolean;  // true=会計年度、false=カレンダー年度
  totalAmount: number;
  totalCount: number;
  monthlyBreakdown: MonthlyBreakdown[];
}

// 月次内訳の型
export interface MonthlyBreakdown {
  month: number;
  amount: number;
  count: number;
}

// カテゴリ別集計の型
export interface ExpenseCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  count: number;
  percentage: number;
}

// ステータス別集計の型
export interface ExpenseStatusBreakdown {
  status: ExpenseStatusType;
  count: number;
  percentage: number;
}

// 経費申請上限情報の型
export interface ExpenseLimit {
  categoryId: string;
  categoryName: string;
  monthlyLimit?: number;
  yearlyLimit?: number;
  monthlyUsed: number;
  yearlyUsed: number;
  monthlyRemaining?: number;
  yearlyRemaining?: number;
  isOverLimit: boolean;
}

// 一括操作用の型
export interface BulkActionRequest {
  expenseIds: string[];
  action: 'submit' | 'cancel' | 'delete';
  comment?: string;
}

// 一括操作レスポンスの型
export interface BulkActionResponse {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}

// 管理者用の承認・却下アクション型
export interface ApprovalActionRequest {
  expenseId: string;
  action: 'approve' | 'reject';
  comment?: string;
}

// API通信用のsnake_case型（バックエンドとの互換性のため）
export interface ExpenseSnakeCase {
  category_id: string;
  amount: number;
  description: string;
  receipt_url?: string;
  receipt_s3_key?: string;
  expense_date: string;
}

export interface ExpenseListParamsSnakeCase {
  page?: number;
  limit?: number;
  status?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  year?: number;
  fiscal_year?: number;
  month?: number;
}

export interface UploadFileRequestSnakeCase {
  file_name: string;
  file_size: number;
  content_type: string;
}

export interface UploadFileResponseSnakeCase {
  upload_url: string;
  s3_key: string;
  max_size_bytes: number;
  allowed_mime_types: string[];
  expires_at: string;
}

export interface UploadCompleteRequestSnakeCase {
  s3_key: string;
  file_name: string;
  file_size: number;
  content_type: string;
}

export interface UploadDeleteRequestSnakeCase {
  s3_key: string;
}

// フォームバリデーション用の型
export interface ExpenseFormValidation {
  categoryId: {
    required: boolean;
    message?: string;
  };
  amount: {
    required: boolean;
    min: number;
    max: number;
    message?: string;
  };
  description: {
    required: boolean;
    maxLength: number;
    message?: string;
  };
  expenseDate: {
    required: boolean;
    maxDate?: Date;
    minDate?: Date;
    message?: string;
  };
  receiptRequired?: boolean;
}

// テーブル表示用のカラム定義型
export interface ExpenseTableColumn {
  key: keyof ExpenseData | 'actions';
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: ExpenseData) => React.ReactNode;
}

// フィルター機能用の型
export interface ExpenseFilters {
  status: ExpenseStatusType[];
  categories: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
  amountRange: {
    min?: number;
    max?: number;
  };
  year?: number;          // カレンダー年
  fiscalYear?: number;    // 会計年度
  month?: number;         // 月
}

// ソート機能用の型
export interface ExpenseSort {
  field: keyof ExpenseData;
  direction: 'asc' | 'desc';
}

// ページネーション用の型
export interface ExpensePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// エクスポート機能用の型
export interface ExpenseExportRequest {
  format: 'csv' | 'excel' | 'pdf';
  filters?: ExpenseFilters;
  columns?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExpenseExportResponse {
  downloadUrl: string;
  fileName: string;
  expiresAt: string;
}