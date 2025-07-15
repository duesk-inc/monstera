// キャッシュ設定定数

// キャッシュ時間の定義（ミリ秒）
export const CACHE_TIMES = {
  // 超短期キャッシュ（1分）- リアルタイム性が重要なデータ
  REALTIME: 1 * 60 * 1000,
  
  // 短期キャッシュ（5分）- 頻繁に更新される可能性があるデータ
  SHORT: 5 * 60 * 1000,
  
  // 中期キャッシュ（15分）- ある程度安定したデータ
  MEDIUM: 15 * 60 * 1000,
  
  // 長期キャッシュ（1時間）- 比較的安定したデータ
  LONG: 60 * 60 * 1000,
  
  // 超長期キャッシュ（24時間）- ほとんど変更されないマスターデータ
  VERY_LONG: 24 * 60 * 60 * 1000,
} as const;

// ガベージコレクション時間（キャッシュが削除されるまでの時間）
export const GC_TIMES = {
  // staleTimeの2倍を基本とする
  REALTIME: CACHE_TIMES.REALTIME * 2,
  SHORT: CACHE_TIMES.SHORT * 2,
  MEDIUM: CACHE_TIMES.MEDIUM * 2,
  LONG: CACHE_TIMES.LONG * 2,
  VERY_LONG: CACHE_TIMES.VERY_LONG * 2,
} as const;

// データ種別ごとのキャッシュ戦略
export const CACHE_STRATEGIES = {
  // 通知データ（30秒でリアルタイム更新）
  NOTIFICATIONS: {
    staleTime: CACHE_TIMES.REALTIME,
    gcTime: GC_TIMES.REALTIME,
  },
  
  // アラート設定（5分キャッシュ）
  ALERT_SETTINGS: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
  },
  
  // 週報データ（5分キャッシュ、作業中のデータのため）
  WEEKLY_REPORTS: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
  },
  
  // 月次サマリー（15分キャッシュ、集計データのため）
  MONTHLY_SUMMARY: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  },
  
  // ユーザー情報（15分キャッシュ）
  USER_PROFILE: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  },
  
  // 部署・役職情報（1時間キャッシュ、マスターデータのため）
  MASTER_DATA: {
    staleTime: CACHE_TIMES.LONG,
    gcTime: GC_TIMES.LONG,
  },
  
  // 祝日・設定データ（24時間キャッシュ、ほとんど変更されない）
  STATIC_DATA: {
    staleTime: CACHE_TIMES.VERY_LONG,
    gcTime: GC_TIMES.VERY_LONG,
  },
  
  // エクスポートジョブ（進行中は1分、完了後は15分）
  EXPORT_JOBS: {
    staleTime: CACHE_TIMES.REALTIME, // 進行中は短く
    gcTime: GC_TIMES.MEDIUM, // 完了後は長めに保持
  },
  
  // アーカイブ統計（15分キャッシュ）
  ARCHIVE_STATS: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  },
  
  // 提案一覧（5分キャッシュ、頻繁に更新される可能性）
  PROPOSALS_LIST: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
  },
  
  // 提案詳細（15分キャッシュ、ある程度安定）
  PROPOSAL_DETAIL: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  },
  
  // 提案統計（15分キャッシュ、集計データのため）
  PROPOSAL_STATS: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  },
  
  // 質問一覧（5分キャッシュ、リアルタイム性重視）
  PROPOSAL_QUESTIONS: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
  },
} as const;

// クエリキーのプレフィックス
export const QUERY_KEYS = {
  NOTIFICATIONS: ['notifications'] as const,
  ALERT_SETTINGS: ['alert-settings'] as const,
  WEEKLY_REPORTS: ['weekly-reports'] as const,
  MONTHLY_SUMMARY: ['monthly-summary'] as const,
  USER_PROFILE: ['user-profile'] as const,
  DEPARTMENTS: ['departments'] as const,
  ROLES: ['roles'] as const,
  HOLIDAYS: ['holidays'] as const,
  EXPORT_JOBS: ['export-jobs'] as const,
  ARCHIVE_STATS: ['archive-stats'] as const,
  PROPOSALS: ['proposals'] as const,
  PROPOSAL_QUESTIONS: ['proposal-questions'] as const,
  PROPOSAL_STATS: ['proposal-stats'] as const,
} as const;

// 特定の条件でキャッシュを無効化するタグ
export const CACHE_TAGS = {
  USER_DATA: 'user-data',
  WEEKLY_REPORT_DATA: 'weekly-report-data',
  ALERT_DATA: 'alert-data',
  MASTER_DATA: 'master-data',
} as const;