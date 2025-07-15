/**
 * 全ての定数を統合エクスポート
 */

// 既存の定数ファイル
export * from './api';
export * from './auth';
export * from './defaultWorkTime';
export * from './delays';
export * from './endpoints';
export * from './network';
export * from './pagination';
export * from './routes';
export * from './storage';
export * from './ui';
export * from './weeklyMood';
export * from './weeklyReport';

// 新規追加の定数ファイル
export * from './dimensions';
export * from './typography';
export * from './business-rules';

// ステータス管理の定数ファイル
export * from './attendance';
export * from './expense';
export * from './leave';

// 統合定数オブジェクト（必要に応じて使用）
import * as api from './api';
import * as attendance from './attendance';
import * as auth from './auth';
import * as defaultWorkTime from './defaultWorkTime';
import * as delays from './delays';
import * as dimensions from './dimensions';
import * as endpoints from './endpoints';
import * as expense from './expense';
import * as leave from './leave';
import * as network from './network';
import * as pagination from './pagination';
import * as routes from './routes';
import * as storage from './storage';
import * as typography from './typography';
import * as ui from './ui';
import * as weeklyMood from './weeklyMood';
import * as weeklyReport from './weeklyReport';
import * as businessRules from './business-rules';

export const APP_CONSTANTS = {
  api,
  attendance,
  auth,
  defaultWorkTime,
  delays,
  dimensions,
  endpoints,
  expense,
  leave,
  network,
  pagination,
  routes,
  storage,
  typography,
  ui,
  weeklyMood,
  weeklyReport,
  businessRules,
} as const;