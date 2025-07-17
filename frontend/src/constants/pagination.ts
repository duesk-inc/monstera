// ページネーション関連の定数定義

// デフォルトのページネーション設定
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// ページサイズの選択肢
export const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10件" },
  { value: 20, label: "20件" },
  { value: 50, label: "50件" },
  { value: 100, label: "100件" },
] as const;

// ページネーション表示の設定
export const PAGINATION_DISPLAY = {
  SHOW_TOTAL: true,
  SHOW_SIZE_CHANGER: true,
  SHOW_QUICK_JUMPER: true,
  SHOW_PREV_NEXT: true,
  SHOW_FIRST_LAST: true,
  MAX_PAGE_BUTTONS: 5,
  SHOW_LESS_ITEMS: false,
} as const;

// ページネーションのラベル
export const PAGINATION_LABELS = {
  PREVIOUS: "前へ",
  NEXT: "次へ",
  FIRST: "最初へ",
  LAST: "最後へ",
  JUMP_TO: "ページ",
  PAGE: "ページ",
  ITEMS_PER_PAGE: "件/ページ",
  TOTAL_ITEMS: (total: number) => `全${total}件`,
  CURRENT_RANGE: (start: number, end: number, total: number) => 
    `${start}-${end}件 / 全${total}件`,
  NO_DATA: "データがありません",
  LOADING: "読み込み中...",
  ERROR: "データの取得に失敗しました",
} as const;

// 並び替えの設定
export const SORT_CONFIG = {
  DEFAULT_FIELD: "created_at",
  DEFAULT_ORDER: "desc" as const,
  ORDERS: {
    ASC: "asc" as const,
    DESC: "desc" as const,
  },
} as const;

// 並び替えのラベル
export const SORT_LABELS = {
  ASC: "昇順",
  DESC: "降順",
  SORT_BY: "並び替え",
  ORDER: "順序",
} as const;

// フィルタの設定
export const FILTER_CONFIG = {
  DEBOUNCE_DELAY: 300,
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_LENGTH: 100,
  CLEAR_FILTERS_ON_SEARCH: false,
} as const;

// 検索の設定
export const SEARCH_CONFIG = {
  PLACEHOLDER: "検索...",
  DEBOUNCE_DELAY: 300,
  MIN_LENGTH: 2,
  MAX_LENGTH: 100,
  CLEAR_BUTTON: true,
  SEARCH_BUTTON: true,
} as const;

// 検索のラベル
export const SEARCH_LABELS = {
  PLACEHOLDER: "検索キーワードを入力",
  SEARCH: "検索",
  CLEAR: "クリア",
  RESULTS: (count: number) => `${count}件の結果`,
  NO_RESULTS: "検索結果がありません",
  SEARCHING: "検索中...",
} as const;

// テーブルの設定
export const TABLE_CONFIG = {
  STICKY_HEADER: true,
  ZEBRA_STRIPES: true,
  HOVER_HIGHLIGHT: true,
  BORDER: true,
  COMPACT_MODE: false,
  RESPONSIVE: true,
  VIRTUAL_SCROLLING: false,
  SELECTION_TYPE: "checkbox" as const,
} as const;

// テーブルのラベル
export const TABLE_LABELS = {
  SELECT_ALL: "全て選択",
  DESELECT_ALL: "全て解除",
  SELECTED_ITEMS: (count: number) => `${count}件選択中`,
  ACTIONS: "操作",
  LOADING: "読み込み中...",
  EMPTY: "データがありません",
  ERROR: "データの取得に失敗しました",
} as const;

// 一括操作の設定
export const BULK_ACTIONS = {
  MAX_SELECTION: 1000,
  CONFIRM_THRESHOLD: 10,
  SHOW_PROGRESS: true,
  ACTIONS: {
    DELETE: "delete",
    EXPORT: "export",
    APPROVE: "approve",
    REJECT: "reject",
    ARCHIVE: "archive",
    RESTORE: "restore",
  },
} as const;

// 一括操作のラベル
export const BULK_ACTION_LABELS = {
  DELETE: "削除",
  EXPORT: "エクスポート",
  APPROVE: "承認",
  REJECT: "却下",
  ARCHIVE: "アーカイブ",
  RESTORE: "復元",
  CONFIRM: "実行",
  CANCEL: "キャンセル",
  PROCESSING: "処理中...",
  SUCCESS: "完了しました",
  ERROR: "エラーが発生しました",
} as const;

// エクスポートの設定
export const EXPORT_CONFIG = {
  FORMATS: {
    CSV: "csv",
    EXCEL: "xlsx",
    PDF: "pdf",
    JSON: "json",
  },
  MAX_RECORDS: 50000,
  INCLUDE_HEADERS: true,
  FILENAME_PREFIX: "export_",
  DATE_FORMAT: "YYYY-MM-DD",
} as const;

// エクスポートのラベル
export const EXPORT_LABELS = {
  CSV: "CSV",
  EXCEL: "Excel",
  PDF: "PDF",
  JSON: "JSON",
  DOWNLOAD: "ダウンロード",
  PREPARING: "準備中...",
  READY: "準備完了",
  ERROR: "エラーが発生しました",
} as const;

// 無限スクロールの設定
export const INFINITE_SCROLL_CONFIG = {
  THRESHOLD: 100, // ピクセル
  INITIAL_LOAD: 20,
  LOAD_MORE_COUNT: 20,
  MAX_PAGES: 100,
  PRELOAD_PAGES: 1,
  DEBOUNCE_DELAY: 100,
} as const;

// 無限スクロールのラベル
export const INFINITE_SCROLL_LABELS = {
  LOADING: "読み込み中...",
  LOAD_MORE: "もっと読み込む",
  NO_MORE: "これ以上データはありません",
  ERROR: "読み込みエラー",
  RETRY: "再試行",
} as const;

// 仮想スクロールの設定
export const VIRTUAL_SCROLL_CONFIG = {
  ITEM_HEIGHT: 50,
  CONTAINER_HEIGHT: 400,
  OVERSCAN: 5,
  BUFFER_SIZE: 10,
  SCROLL_DEBOUNCE: 16, // 60fps
} as const;

// レスポンシブの設定
export const RESPONSIVE_CONFIG = {
  BREAKPOINTS: {
    XS: 480,
    SM: 768,
    MD: 1024,
    LG: 1200,
    XL: 1600,
  },
  HIDE_COLUMNS: {
    XS: ["actions", "created_at"],
    SM: ["actions"],
    MD: [],
    LG: [],
    XL: [],
  },
  STACK_ON_MOBILE: true,
  HORIZONTAL_SCROLL: true,
} as const;

// ページネーション定数（エイリアス）
export const PAGINATION = {
  DEFAULT_PAGE: DEFAULT_PAGINATION.PAGE,
  DEFAULT_LIMIT: DEFAULT_PAGINATION.LIMIT,
  MAX_LIMIT: DEFAULT_PAGINATION.MAX_LIMIT,
  MIN_LIMIT: DEFAULT_PAGINATION.MIN_LIMIT,
  PAGE_SIZE_OPTIONS: PAGE_SIZE_OPTIONS.map(option => option.value),
  LABELS: PAGINATION_LABELS,
} as const;

// 型定義
export type PaginationConfig = typeof DEFAULT_PAGINATION;
export type SortOrder = typeof SORT_CONFIG.ORDERS[keyof typeof SORT_CONFIG.ORDERS];
export type BulkAction = typeof BULK_ACTIONS.ACTIONS[keyof typeof BULK_ACTIONS.ACTIONS];
export type ExportFormat = typeof EXPORT_CONFIG.FORMATS[keyof typeof EXPORT_CONFIG.FORMATS];
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];

// ページネーションの計算ユーティリティ
export const paginationUtils = {
  // 総ページ数の計算
  getTotalPages: (total: number, limit: number): number => {
    return Math.ceil(total / limit);
  },
  
  // 現在のページの範囲を計算
  getCurrentRange: (page: number, limit: number, total: number): [number, number] => {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return [start, end];
  },
  
  // 表示するページ番号の配列を取得
  getPageNumbers: (currentPage: number, totalPages: number, maxButtons: number = 5): number[] => {
    const delta = Math.floor(maxButtons / 2);
    const range = [];
    const rangeWithDots = [];
    
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    
    if (currentPage - delta > 2) {
      rangeWithDots.push(1, -1);
    } else {
      rangeWithDots.push(1);
    }
    
    rangeWithDots.push(...range);
    
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push(-1, totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }
    
    return rangeWithDots;
  },
  
  // ページが有効かどうかチェック
  isValidPage: (page: number, totalPages: number): boolean => {
    return page >= 1 && page <= totalPages;
  },
  
  // 次のページが存在するかチェック
  hasNextPage: (page: number, totalPages: number): boolean => {
    return page < totalPages;
  },
  
  // 前のページが存在するかチェック
  hasPreviousPage: (page: number): boolean => {
    return page > 1;
  },
};