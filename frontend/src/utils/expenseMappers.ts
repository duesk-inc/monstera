import { ExpenseBackendResponse, ExpenseData, ExpenseListBackendResponse, ExpenseListResponse } from '@/types/expense';

/**
 * ステータスコードから日本語名へのマッピング
 */
const STATUS_NAME_MAP: Record<string, string> = {
  draft: '下書き',
  submitted: '申請中',
  approved: '承認済み',
  rejected: '却下',
  paid: '支払済み',
  cancelled: 'キャンセル',
  expired: '期限切れ',
  closed: 'クローズド'
};

/**
 * バックエンドの経費レスポンスをフロントエンドの形式に変換
 */
export function mapBackendExpenseToExpenseData(backendExpense: ExpenseBackendResponse): ExpenseData {
  return {
    id: backendExpense.id,
    userId: backendExpense.user_id,
    category: backendExpense.category, // カテゴリコードをそのまま使用
    amount: backendExpense.amount,
    currency: 'JPY', // デフォルト値
    date: backendExpense.expense_date,
    description: backendExpense.description,
    paymentMethod: 'card', // デフォルト値
    taxRate: 10, // デフォルト値
    taxAmount: Math.floor(backendExpense.amount * 0.1), // 10%税率で計算
    totalAmount: backendExpense.amount,
    status: STATUS_NAME_MAP[backendExpense.status] || backendExpense.status,
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