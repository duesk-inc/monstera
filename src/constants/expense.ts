// 経費申請ステータスの定数定義
// データベースのENUM値と完全に一致させる
export const EXPENSE_STATUS = {
  DRAFT: 'draft',         // 下書き
  SUBMITTED: 'submitted', // 提出済み
  APPROVED: 'approved',   // 承認済み
  REJECTED: 'rejected',   // 却下
  PAID: 'paid',          // 支払済み
} as const;

// 表示用ステータスラベル
export const EXPENSE_STATUS_LABEL = {
  [EXPENSE_STATUS.DRAFT]: '下書き',
  [EXPENSE_STATUS.SUBMITTED]: '提出済み',
  [EXPENSE_STATUS.APPROVED]: '承認済み',
  [EXPENSE_STATUS.REJECTED]: '却下',
  [EXPENSE_STATUS.PAID]: '支払済み',
} as const;

// ステータス型の定義
export type ExpenseStatusType = typeof EXPENSE_STATUS[keyof typeof EXPENSE_STATUS];

// ステータスカラーマッピング（Material-UI Chipカラー）
export const EXPENSE_STATUS_COLOR = {
  [EXPENSE_STATUS.DRAFT]: 'default' as const,
  [EXPENSE_STATUS.SUBMITTED]: 'warning' as const,
  [EXPENSE_STATUS.APPROVED]: 'success' as const,
  [EXPENSE_STATUS.REJECTED]: 'error' as const,
  [EXPENSE_STATUS.PAID]: 'info' as const,
} as const;

// ファイルアップロード関連の定数
export const UPLOAD_CONSTANTS = {
  // 許可されるファイル形式
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
  ],
  // ファイルサイズ制限（5MB）
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  // ファイル拡張子制限
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf'],
  // Pre-signed URLの有効期限（15分）
  PRESIGNED_URL_EXPIRES_MINUTES: 15,
} as const;

// ファイルアップロードステータス
export const UPLOAD_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type UploadStatusType = typeof UPLOAD_STATUS[keyof typeof UPLOAD_STATUS];

// 経費申請の履歴アクション
export const EXPENSE_ACTION = {
  CREATED: 'created',
  UPDATED: 'updated',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type ExpenseActionType = typeof EXPENSE_ACTION[keyof typeof EXPENSE_ACTION];

// 履歴アクションの表示ラベル
export const EXPENSE_ACTION_LABEL = {
  [EXPENSE_ACTION.CREATED]: '作成',
  [EXPENSE_ACTION.UPDATED]: '更新',
  [EXPENSE_ACTION.SUBMITTED]: '提出',
  [EXPENSE_ACTION.APPROVED]: '承認',
  [EXPENSE_ACTION.REJECTED]: '却下',
  [EXPENSE_ACTION.CANCELLED]: '取消',
} as const;

// 一括操作の種類
export const BULK_ACTION = {
  SUBMIT: 'submit',
  CANCEL: 'cancel',
  DELETE: 'delete',
} as const;

export type BulkActionType = typeof BULK_ACTION[keyof typeof BULK_ACTION];

// 一括操作の表示ラベル
export const BULK_ACTION_LABEL = {
  [BULK_ACTION.SUBMIT]: '一括提出',
  [BULK_ACTION.CANCEL]: '一括取消',
  [BULK_ACTION.DELETE]: '一括削除',
} as const;

// エクスポート形式
export const EXPORT_FORMAT = {
  CSV: 'csv',
  EXCEL: 'excel',
  PDF: 'pdf',
} as const;

export type ExportFormatType = typeof EXPORT_FORMAT[keyof typeof EXPORT_FORMAT];

// エクスポート形式の表示ラベル
export const EXPORT_FORMAT_LABEL = {
  [EXPORT_FORMAT.CSV]: 'CSV',
  [EXPORT_FORMAT.EXCEL]: 'Excel',
  [EXPORT_FORMAT.PDF]: 'PDF',
} as const;

// ページネーション関連の定数
export const PAGINATION_CONSTANTS = {
  // デフォルトのページサイズ
  DEFAULT_PAGE_SIZE: 20,
  // ページサイズオプション
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  // 最大表示可能件数
  MAX_DISPLAY_COUNT: 10000,
} as const;

// バリデーション関連の定数
export const VALIDATION_CONSTANTS = {
  // 説明文の最大文字数
  DESCRIPTION_MAX_LENGTH: 500,
  // 最小金額
  MIN_AMOUNT: 1,
  // 最大金額（100万円）
  MAX_AMOUNT: 1000000,
  // 領収書の必須金額（5000円以上）
  RECEIPT_REQUIRED_AMOUNT: 5000,
} as const;

// ソート方向
export const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortDirectionType = typeof SORT_DIRECTION[keyof typeof SORT_DIRECTION];

// ソート可能なフィールド
export const SORTABLE_FIELDS = {
  EXPENSE_DATE: 'expenseDate',
  AMOUNT: 'amount',
  STATUS: 'status',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  CATEGORY_NAME: 'categoryName',
} as const;

export type SortableFieldType = typeof SORTABLE_FIELDS[keyof typeof SORTABLE_FIELDS];

// フィルター関連の定数
export const FILTER_CONSTANTS = {
  // 日付範囲のデフォルト（過去3ヶ月）
  DEFAULT_DATE_RANGE_MONTHS: 3,
  // 金額範囲のステップ
  AMOUNT_RANGE_STEP: 1000,
  // カテゴリフィルターの最大表示数
  MAX_CATEGORY_FILTER_COUNT: 50,
} as const;

// テーブル表示関連の定数
export const TABLE_CONSTANTS = {
  // デフォルトカラム幅
  DEFAULT_COLUMN_WIDTH: 120,
  // アクションカラム幅
  ACTION_COLUMN_WIDTH: 180,
  // 最小カラム幅
  MIN_COLUMN_WIDTH: 80,
  // 最大カラム幅
  MAX_COLUMN_WIDTH: 300,
} as const;

// 通知メッセージ
export const EXPENSE_MESSAGES = {
  CREATE_SUCCESS: '経費申請を作成しました',
  UPDATE_SUCCESS: '経費申請を更新しました',
  DELETE_SUCCESS: '経費申請を削除しました',
  SUBMIT_SUCCESS: '経費申請を提出しました',
  CANCEL_SUCCESS: '経費申請を取り消しました',
  UPLOAD_SUCCESS: 'ファイルをアップロードしました',
  UPLOAD_ERROR: 'ファイルのアップロードに失敗しました',
  BULK_SUCCESS: '一括操作が完了しました',
  BULK_PARTIAL: '一部の操作に失敗しました',
  EXPORT_SUCCESS: 'エクスポートが完了しました',
  VALIDATION_ERROR: '入力内容にエラーがあります',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  UNAUTHORIZED_ERROR: '権限がありません',
  NOT_FOUND_ERROR: '経費申請が見つかりません',
  SERVER_ERROR: 'サーバーエラーが発生しました',
} as const;

// API関連の定数
export const API_CONSTANTS = {
  // リクエストタイムアウト（秒）
  REQUEST_TIMEOUT: 30,
  // リトライ回数
  MAX_RETRY_COUNT: 3,
  // リトライ間隔（ミリ秒）
  RETRY_DELAY: 1000,
} as const;

// UI関連の定数
export const UI_CONSTANTS = {
  // ローディング表示の最小時間（ミリ秒）
  MIN_LOADING_TIME: 500,
  // Toastの表示時間（ミリ秒）
  TOAST_DURATION: 3000,
  // プログレスバーの更新間隔（ミリ秒）
  PROGRESS_UPDATE_INTERVAL: 100,
  // デバウンス時間（ミリ秒）
  DEBOUNCE_DELAY: 300,
} as const;