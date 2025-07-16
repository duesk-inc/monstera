// キャッシュ関連の定数定義

// キャッシュキーの定数
export const CACHE_KEYS = {
  // 認証関連
  AUTH: {
    USER: "auth.user",
    TOKEN: "auth.token",
    REFRESH_TOKEN: "auth.refreshToken",
    PERMISSIONS: "auth.permissions",
    ROLES: "auth.roles",
  },
  
  // ユーザー関連
  USER: {
    PROFILE: "user.profile",
    PREFERENCES: "user.preferences",
    SETTINGS: "user.settings",
    NOTIFICATIONS: "user.notifications",
  },
  
  // 週報関連
  WEEKLY_REPORT: {
    LIST: "weeklyReport.list",
    DETAIL: (id: string) => `weeklyReport.detail.${id}`,
    DRAFT: "weeklyReport.draft",
    TEMPLATES: "weeklyReport.templates",
    STATISTICS: "weeklyReport.statistics",
    MONTHLY_SUMMARY: "weeklyReport.monthlySummary",
  },
  
  // 経費関連
  EXPENSE: {
    LIST: "expense.list",
    DETAIL: (id: string) => `expense.detail.${id}`,
    CATEGORIES: "expense.categories",
    STATISTICS: "expense.statistics",
    RECEIPTS: (expenseId: string) => `expense.receipts.${expenseId}`,
  },
  
  // エンジニア関連
  ENGINEER: {
    LIST: "engineer.list",
    DETAIL: (id: string) => `engineer.detail.${id}`,
    SKILLS: "engineer.skills",
    PROJECTS: "engineer.projects",
    PERFORMANCE: "engineer.performance",
  },
  
  // プロジェクト関連
  PROJECT: {
    LIST: "project.list",
    DETAIL: (id: string) => `project.detail.${id}`,
    TIMELINE: "project.timeline",
    RESOURCES: "project.resources",
    STATISTICS: "project.statistics",
  },
  
  // 営業関連
  SALES: {
    PIPELINE: "sales.pipeline",
    OPPORTUNITIES: "sales.opportunities",
    PERFORMANCE: "sales.performance",
    FORECASTS: "sales.forecasts",
  },
  
  // 会計関連
  ACCOUNTING: {
    DASHBOARD: "accounting.dashboard",
    TRANSACTIONS: "accounting.transactions",
    REPORTS: "accounting.reports",
    BILLING: "accounting.billing",
  },
  
  // 管理者関連
  ADMIN: {
    DASHBOARD: "admin.dashboard",
    USERS: "admin.users",
    SYSTEM_SETTINGS: "admin.systemSettings",
    AUDIT_LOGS: "admin.auditLogs",
  },
  
  // 設定関連
  SETTINGS: {
    COMPANY: "settings.company",
    SYSTEM: "settings.system",
    INTEGRATIONS: "settings.integrations",
    NOTIFICATIONS: "settings.notifications",
  },
  
  // 共通データ
  COMMON: {
    COUNTRIES: "common.countries",
    CURRENCIES: "common.currencies",
    TIMEZONES: "common.timezones",
    LANGUAGES: "common.languages",
  },
} as const;

// キャッシュの有効期限（ミリ秒）
export const CACHE_EXPIRATION = {
  // 即座に期限切れ
  IMMEDIATE: 0,
  
  // 短期間（5分）
  SHORT: 5 * 60 * 1000,
  
  // 中期間（30分）
  MEDIUM: 30 * 60 * 1000,
  
  // 長期間（2時間）
  LONG: 2 * 60 * 60 * 1000,
  
  // 非常に長期間（1日）
  VERY_LONG: 24 * 60 * 60 * 1000,
  
  // 永続的（30日）
  PERSISTENT: 30 * 24 * 60 * 60 * 1000,
  
  // 特定の用途別
  AUTH_TOKEN: 60 * 60 * 1000, // 1時間
  USER_PROFILE: 30 * 60 * 1000, // 30分
  STATIC_DATA: 24 * 60 * 60 * 1000, // 1日
  REAL_TIME_DATA: 5 * 60 * 1000, // 5分
  REPORT_DATA: 10 * 60 * 1000, // 10分
} as const;

// キャッシュの設定
export const CACHE_CONFIG = {
  // デフォルトの有効期限
  DEFAULT_EXPIRATION: CACHE_EXPIRATION.MEDIUM,
  
  // 最大キャッシュサイズ（MB）
  MAX_SIZE: 100,
  
  // 最大エントリ数
  MAX_ENTRIES: 1000,
  
  // 自動クリーンアップの間隔（ミリ秒）
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10分
  
  // キャッシュの圧縮を有効にする
  COMPRESSION_ENABLED: true,
  
  // キャッシュの暗号化を有効にする
  ENCRYPTION_ENABLED: false,
  
  // ローカルストレージを使用する
  USE_LOCAL_STORAGE: true,
  
  // セッションストレージを使用する
  USE_SESSION_STORAGE: false,
  
  // メモリキャッシュを使用する
  USE_MEMORY_CACHE: true,
} as const;

// React Query の設定
export const REACT_QUERY_CONFIG = {
  // デフォルトの staleTime（データが古くなるまでの時間）
  DEFAULT_STALE_TIME: CACHE_EXPIRATION.MEDIUM,
  
  // デフォルトの cacheTime（キャッシュが削除されるまでの時間）
  DEFAULT_CACHE_TIME: CACHE_EXPIRATION.LONG,
  
  // リトライ回数
  DEFAULT_RETRY: 3,
  
  // リトライの遅延（ミリ秒）
  DEFAULT_RETRY_DELAY: 1000,
  
  // 特定のクエリタイプの設定
  QUERY_SETTINGS: {
    USER_DATA: {
      staleTime: CACHE_EXPIRATION.MEDIUM,
      cacheTime: CACHE_EXPIRATION.LONG,
      retry: 2,
    },
    REAL_TIME_DATA: {
      staleTime: CACHE_EXPIRATION.SHORT,
      cacheTime: CACHE_EXPIRATION.MEDIUM,
      retry: 1,
    },
    STATIC_DATA: {
      staleTime: CACHE_EXPIRATION.VERY_LONG,
      cacheTime: CACHE_EXPIRATION.PERSISTENT,
      retry: 3,
    },
    REPORT_DATA: {
      staleTime: CACHE_EXPIRATION.MEDIUM,
      cacheTime: CACHE_EXPIRATION.LONG,
      retry: 2,
    },
  },
} as const;

// キャッシュの無効化戦略
export const CACHE_INVALIDATION = {
  // 即座に無効化
  IMMEDIATE: "immediate",
  
  // 遅延無効化
  DELAYED: "delayed",
  
  // 条件付き無効化
  CONDITIONAL: "conditional",
  
  // 時間ベースの無効化
  TIME_BASED: "time_based",
  
  // 手動無効化
  MANUAL: "manual",
} as const;

// キャッシュの無効化トリガー
export const CACHE_INVALIDATION_TRIGGERS = {
  // データの作成
  CREATE: "create",
  
  // データの更新
  UPDATE: "update",
  
  // データの削除
  DELETE: "delete",
  
  // ユーザーのログイン
  LOGIN: "login",
  
  // ユーザーのログアウト
  LOGOUT: "logout",
  
  // 権限の変更
  PERMISSION_CHANGE: "permission_change",
  
  // 設定の変更
  SETTINGS_CHANGE: "settings_change",
  
  // 手動のリフレッシュ
  MANUAL_REFRESH: "manual_refresh",
} as const;

// キャッシュのタグ（関連するキャッシュをグループ化）
export const CACHE_TAGS = {
  USER: "user",
  WEEKLY_REPORT: "weekly_report",
  EXPENSE: "expense",
  ENGINEER: "engineer",
  PROJECT: "project",
  SALES: "sales",
  ACCOUNTING: "accounting",
  ADMIN: "admin",
  SETTINGS: "settings",
  COMMON: "common",
} as const;

// キャッシュの優先度
export const CACHE_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

// キャッシュの種類
export const CACHE_TYPE = {
  MEMORY: "memory",
  LOCAL_STORAGE: "localStorage",
  SESSION_STORAGE: "sessionStorage",
  INDEXED_DB: "indexedDB",
  REDIS: "redis",
} as const;

// キャッシュの戦略
export const CACHE_STRATEGY = {
  // キャッシュファースト
  CACHE_FIRST: "cache_first",
  
  // ネットワークファースト
  NETWORK_FIRST: "network_first",
  
  // キャッシュのみ
  CACHE_ONLY: "cache_only",
  
  // ネットワークのみ
  NETWORK_ONLY: "network_only",
  
  // 古いものを再検証
  STALE_WHILE_REVALIDATE: "stale_while_revalidate",
} as const;

// キャッシュの監視設定
export const CACHE_MONITORING = {
  // メトリクス収集を有効にする
  METRICS_ENABLED: true,
  
  // ヒット率の計算を有効にする
  HIT_RATE_CALCULATION: true,
  
  // パフォーマンス監視を有効にする
  PERFORMANCE_MONITORING: true,
  
  // エラー追跡を有効にする
  ERROR_TRACKING: true,
  
  // ログレベル
  LOG_LEVEL: "info",
} as const;

// 型定義
export type CacheKey = string;
export type CacheValue = any;
export type CacheExpiration = number;
export type CacheTag = typeof CACHE_TAGS[keyof typeof CACHE_TAGS];
export type CachePriority = typeof CACHE_PRIORITY[keyof typeof CACHE_PRIORITY];
export type CacheType = typeof CACHE_TYPE[keyof typeof CACHE_TYPE];
export type CacheStrategy = typeof CACHE_STRATEGY[keyof typeof CACHE_STRATEGY];
export type CacheInvalidationTrigger = typeof CACHE_INVALIDATION_TRIGGERS[keyof typeof CACHE_INVALIDATION_TRIGGERS];

// キャッシュのユーティリティ
export const cacheUtils = {
  // キャッシュキーの生成
  generateKey: (namespace: string, identifier: string, params?: Record<string, any>): string => {
    const baseKey = `${namespace}.${identifier}`;
    if (!params) return baseKey;
    
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `${baseKey}?${paramString}`;
  },
  
  // キャッシュの有効期限チェック
  isExpired: (timestamp: number, expiration: number): boolean => {
    return Date.now() - timestamp > expiration;
  },
  
  // キャッシュサイズの計算
  calculateSize: (data: any): number => {
    return JSON.stringify(data).length;
  },
  
  // キャッシュの圧縮
  compress: (data: any): string => {
    // TODO: 実際の圧縮ロジックを実装
    return JSON.stringify(data);
  },
  
  // キャッシュの展開
  decompress: (compressedData: string): any => {
    // TODO: 実際の展開ロジックを実装
    return JSON.parse(compressedData);
  },
  
  // キャッシュの暗号化
  encrypt: (data: any): string => {
    // TODO: 実際の暗号化ロジックを実装
    return JSON.stringify(data);
  },
  
  // キャッシュの復号化
  decrypt: (encryptedData: string): any => {
    // TODO: 実際の復号化ロジックを実装
    return JSON.parse(encryptedData);
  },
};