/**
 * ページネーション関連の定数
 */

export const PAGINATION = {
  // デフォルト設定
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  
  // ページサイズオプション
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
  
  // 機能別のデフォルトページサイズ
  DEFAULT_SIZES: {
    WEEKLY_REPORTS: 10,
    ENGINEERS: 20,
    CLIENTS: 20,
    INVOICES: 20,
    EXPENSES: 20,
    SALES_ACTIVITIES: 20,
    ATTENDANCE: 30,
    ALERT_HISTORY: 20,
  },
  
  // 最大値
  MAX_PAGE_SIZE: 100,
  MAX_EXPORT_SIZE: 1000,
} as const;