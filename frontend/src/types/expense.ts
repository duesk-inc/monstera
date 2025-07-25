// 経費関連の型定義

// 基本的な経費データ型
export interface ExpenseData {
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

// 経費一覧リクエストパラメータ
export interface ExpenseListParams {
  page?: number;
  limit?: number;
  status?: string;
  categoryId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  year?: number;
  fiscalYear?: number;
  month?: number;
}

// 経費一覧レスポンス
export interface ExpenseListResponse {
  items: ExpenseData[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// フィルター設定
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
  year?: number;
  fiscalYear?: number;
  month?: number;
}

// ソート設定
export interface ExpenseSort {
  field: SortableFieldType;
  direction: SortDirectionType;
}

// ページネーション設定
export interface ExpensePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ステータスタイプ
export type ExpenseStatusType = 
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled';

// ソート方向
export type SortDirectionType = 'asc' | 'desc';

// ソート可能フィールド
export type SortableFieldType = 
  | 'date'
  | 'amount'
  | 'status'
  | 'created_at'
  | 'updated_at';

// 経費カテゴリ型
export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  requiresDetails?: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 経費申請フォーム用データ型
export interface ExpenseFormData {
  categoryId: string;
  categoryCode?: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  receiptS3Key?: string;
  expenseDate: string;
}