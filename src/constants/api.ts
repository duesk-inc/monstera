// APIエンドポイントの定数定義

// API基本URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// APIバージョン定義
export const API_VERSION = {
  V1: '/api/v1',
  // 将来的に新しいバージョンが追加される場合はここに追加
  // V2: '/api/v2',
};

// 認証関連のエンドポイント
export const AUTH_API = {
  // ログイン
  LOGIN: `${API_VERSION.V1}/auth/login`,
  // ログアウト
  LOGOUT: `${API_VERSION.V1}/auth/logout`,
  // トークンリフレッシュ
  REFRESH_TOKEN: `${API_VERSION.V1}/auth/refresh`,
};

// プロフィール関連のエンドポイント
export const PROFILE_API = {
  // プロフィール情報取得
  GET: `${API_VERSION.V1}/profile`,
  // プロフィール情報更新
  UPDATE: `${API_VERSION.V1}/profile`,
  // 職歴を含むプロフィール情報取得
  WITH_HISTORY: `${API_VERSION.V1}/profile/with-history`,
  // プロフィール一時保存
  TEMP_SAVE: `${API_VERSION.V1}/profile/temp-save`,
  // プロフィール履歴取得
  HISTORY: `${API_VERSION.V1}/profile/history`,
  // 最新のプロフィール履歴取得
  LATEST_HISTORY: `${API_VERSION.V1}/profile/history/latest`,
  // 技術カテゴリ取得
  TECHNOLOGY_CATEGORIES: `${API_VERSION.V1}/profile/technology-categories`,
  // よく使う資格一覧取得
  COMMON_CERTIFICATIONS: `${API_VERSION.V1}/profile/common-certifications`,
};

// スキルシート関連のエンドポイント
export const SKILL_SHEET_API = {
  // スキルシート情報取得
  GET: `${API_VERSION.V1}/skill-sheet`,
  // スキルシート情報更新
  UPDATE: `${API_VERSION.V1}/skill-sheet`,
  // スキルシート一時保存
  TEMP_SAVE: `${API_VERSION.V1}/skill-sheet/temp-save`,
};


// 通知関連のエンドポイント
export const NOTIFICATION_API = {
  // 通知一覧取得
  LIST: `${API_VERSION.V1}/notifications`,
  // 未読通知数取得
  UNREAD_COUNT: `${API_VERSION.V1}/notifications/unread-count`,
  // 通知既読マーク
  MARK_AS_READ: `${API_VERSION.V1}/notifications/read`,
  // 全通知既読マーク
  MARK_ALL_AS_READ: `${API_VERSION.V1}/notifications/read-all`,
  // 通知設定取得
  SETTINGS: `${API_VERSION.V1}/notifications/settings`,
  // 通知設定更新
  UPDATE_SETTINGS: `${API_VERSION.V1}/notifications/settings`,
  // Slack設定取得
  SLACK_SETTINGS: `${API_VERSION.V1}/notifications/slack-settings`,
  // Slack接続テスト
  SLACK_TEST: `${API_VERSION.V1}/notifications/slack-test`,
};

// ダッシュボード関連のエンドポイント
export const DASHBOARD_API = {
  // ダッシュボード概要データ
  SUMMARY: `${API_VERSION.V1}/dashboard/summary`,
  // 最新の通知取得
  RECENT_NOTIFICATIONS: `${API_VERSION.V1}/dashboard/notifications`,
};

// 週報関連のエンドポイント
export const WEEKLY_REPORT_API = {
  // 週報一覧取得
  LIST: `${API_VERSION.V1}/weekly-reports`,
  // 週報取得
  GET: `${API_VERSION.V1}/weekly-reports/:id`,
  // 週報作成
  CREATE: `${API_VERSION.V1}/weekly-reports`,
  // 週報更新
  UPDATE: `${API_VERSION.V1}/weekly-reports/:id`,
  // 週報提出
  SUBMIT: `${API_VERSION.V1}/weekly-reports/:id/submit`,
  // デフォルト勤務時間設定
  TEMPLATE: `${API_VERSION.V1}/weekly-reports/default-settings`,
};

// 休暇関連のエンドポイント
export const LEAVE_API = {
  // 休暇種別一覧
  TYPES: `${API_VERSION.V1}/leave/types`,
  // 休暇残日数
  BALANCES: `${API_VERSION.V1}/leave/balances`,
  // 休暇申請一覧
  REQUESTS: `${API_VERSION.V1}/leave/requests`,
  // 休暇申請作成
  CREATE: `${API_VERSION.V1}/leave/requests`,
  // 休日情報
  HOLIDAYS: `${API_VERSION.V1}/attendances/holidays`,
};

// 勤怠関連のエンドポイント
export const ATTENDANCE_API = {
  // 休日情報のエンドポイントは残す
  HOLIDAYS: `${API_VERSION.V1}/attendances/holidays`,
};

// 経費申請関連のエンドポイント
export const EXPENSE_API = {
  // 基本CRUD操作
  CREATE: `${API_VERSION.V1}/expenses`,
  LIST: `${API_VERSION.V1}/expenses`,
  GET: `${API_VERSION.V1}/expenses/:id`,
  UPDATE: `${API_VERSION.V1}/expenses/:id`,
  DELETE: `${API_VERSION.V1}/expenses/:id`,
  // 申請提出・取消
  SUBMIT: `${API_VERSION.V1}/expenses/:id/submit`,
  CANCEL: `${API_VERSION.V1}/expenses/:id/cancel`,
  // ファイルアップロード関連
  GENERATE_UPLOAD_URL: `${API_VERSION.V1}/expenses/upload-url`,
  COMPLETE_UPLOAD: `${API_VERSION.V1}/expenses/upload-complete`,
  DELETE_UPLOAD: `${API_VERSION.V1}/expenses/upload`,
  // カテゴリ関連
  CATEGORIES: `${API_VERSION.V1}/expenses/categories`,
  // 集計関連
  SUMMARY: `${API_VERSION.V1}/expenses/summary`,
}; 
	