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
export function mapBackendExpenseListToExpenseList(
  backendResponse: ExpenseListBackendResponse | undefined | null
): ExpenseListResponse {
  console.log('[mapBackendExpenseListToExpenseList] Input:', backendResponse);
  
  // 防御的プログラミング：nullチェックとデフォルト値
  if (!backendResponse) {
    console.warn('mapBackendExpenseListToExpenseList: Received null/undefined response');
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  }

  // itemsプロパティの存在確認
  if (!backendResponse.items || !Array.isArray(backendResponse.items)) {
    console.warn('mapBackendExpenseListToExpenseList: Invalid items property', backendResponse);
    return {
      items: [],
      total: backendResponse.total || 0,
      page: backendResponse.page || 1,
      limit: backendResponse.limit || 20,
      totalPages: backendResponse.total_pages || 0,
    };
  }

  try {
    console.log('[mapBackendExpenseListToExpenseList] Mapping items, count:', backendResponse.items.length);
    const mappedItems = backendResponse.items.map((item, index) => {
      console.log(`[mapBackendExpenseListToExpenseList] Mapping item ${index}:`, item);
      const mapped = mapBackendExpenseToExpenseData(item);
      console.log(`[mapBackendExpenseListToExpenseList] Mapped item ${index}:`, mapped);
      return mapped;
    });
    
    const result = {
      items: mappedItems,
      total: backendResponse.total || 0,
      page: backendResponse.page || 1,
      limit: backendResponse.limit || 20,
      totalPages: backendResponse.total_pages || 0,
    };
    
    console.log('[mapBackendExpenseListToExpenseList] Final result:', result);
    return result;
  } catch (error) {
    console.error('Error mapping expense list:', error);
    console.error('Error stack:', (error as Error).stack);
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  }
}