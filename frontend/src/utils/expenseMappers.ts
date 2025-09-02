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
  try {
    // バリデーション
    if (!backendExpense || typeof backendExpense !== 'object') {
      console.error('Invalid backendExpense:', backendExpense);
      throw new Error('Invalid backend expense data');
    }

    // 必須フィールドのチェック
    if (!backendExpense.id || !backendExpense.user_id) {
      console.error('Missing required fields:', { id: backendExpense.id, user_id: backendExpense.user_id });
      throw new Error('Missing required fields in expense data');
    }

    return {
      id: backendExpense.id,
      userId: backendExpense.user_id,
      title: backendExpense.title, // titleフィールドを追加
      category: backendExpense.category || '', // カテゴリコードをそのまま使用
      amount: backendExpense.amount || 0,
      currency: 'JPY', // デフォルト値
      date: backendExpense.expense_date || new Date().toISOString(),
      description: backendExpense.description || '',
      paymentMethod: 'card', // デフォルト値
      taxRate: 10, // デフォルト値
      taxAmount: Math.floor((backendExpense.amount || 0) * 0.1), // 10%税率で計算
      totalAmount: backendExpense.amount || 0,
      status: STATUS_NAME_MAP[backendExpense.status] || backendExpense.status || 'draft',
      receiptUrls: backendExpense.receipt_url ? [backendExpense.receipt_url] : [],
      isBusinessTrip: false, // デフォルト値
      submittedAt: undefined, // TODO: バックエンドから取得できるようになったら修正
      approvedAt: backendExpense.approved_at,
      rejectedAt: undefined, // TODO: バックエンドから取得できるようになったら修正
      paidAt: backendExpense.paid_at,
      approver: backendExpense.approver ? backendExpense.approver.name : undefined,
      rejectionReason: undefined, // TODO: バックエンドから取得できるようになったら修正
      createdAt: backendExpense.created_at || new Date().toISOString(),
      updatedAt: backendExpense.updated_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in mapBackendExpenseToExpenseData:', error);
    console.error('Input data:', backendExpense);
    throw error;
  }
}

/**
 * バックエンドの経費一覧レスポンスをフロントエンドの形式に変換
 */
export function mapBackendExpenseListToExpenseList(
  backendResponse: ExpenseListBackendResponse | undefined | null
): ExpenseListResponse {
  // 防御的プログラミング：nullチェックとデフォルト値
  if (!backendResponse) {
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
    return {
      items: [],
      total: backendResponse.total || 0,
      page: backendResponse.page || 1,
      limit: backendResponse.limit || 20,
      totalPages: backendResponse.total_pages || 0,
    };
  }

  try {
    const mappedItems = backendResponse.items.map((item) => mapBackendExpenseToExpenseData(item));
    
    const result = {
      items: mappedItems,
      total: backendResponse.total || 0,
      page: backendResponse.page || 1,
      limit: backendResponse.limit || 20,
      totalPages: backendResponse.total_pages || 0,
    };
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
