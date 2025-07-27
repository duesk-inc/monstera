import { ExpenseBackendResponse, ExpenseData, ExpenseListBackendResponse, ExpenseListResponse } from '@/types/expense';

/**
 * バックエンドの経費レスポンスをフロントエンドの形式に変換
 */
export function mapBackendExpenseToExpenseData(backendExpense: ExpenseBackendResponse): ExpenseData {
  return {
    id: backendExpense.id,
    userId: backendExpense.user_id,
    category: backendExpense.category,
    amount: backendExpense.amount,
    currency: 'JPY', // デフォルト値
    date: backendExpense.expense_date,
    description: backendExpense.description,
    paymentMethod: 'card', // デフォルト値
    taxRate: 10, // デフォルト値
    taxAmount: Math.floor(backendExpense.amount * 0.1), // 10%税率で計算
    totalAmount: backendExpense.amount,
    status: backendExpense.status,
    receiptUrls: backendExpense.receipt_url ? [backendExpense.receipt_url] : [],
    isBusinessTrip: false, // デフォルト値
    submittedAt: undefined, // TODO: バックエンドから取得できるようになったら修正
    approvedAt: backendExpense.approved_at,
    rejectedAt: undefined, // TODO: バックエンドから取得できるようになったら修正
    paidAt: backendExpense.paid_at,
    approver: backendExpense.approver?.name,
    rejectionReason: undefined, // TODO: バックエンドから取得できるようになったら修正
    createdAt: backendExpense.created_at,
    updatedAt: backendExpense.updated_at,
  };
}

/**
 * バックエンドの経費一覧レスポンスをフロントエンドの形式に変換
 */
export function mapBackendExpenseListToExpenseList(backendResponse: ExpenseListBackendResponse): ExpenseListResponse {
  return {
    items: backendResponse.items.map(mapBackendExpenseToExpenseData),
    total: backendResponse.total,
    page: backendResponse.page,
    limit: backendResponse.limit,
    totalPages: backendResponse.total_pages,
  };
}