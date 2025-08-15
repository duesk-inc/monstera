// エラーメッセージ定数定義

// 一般的なエラーメッセージ
export const GENERAL_ERROR_MESSAGES = {
  REQUIRED: "この項目は必須です。",
  INVALID_FORMAT: "入力形式が正しくありません。",
  SERVER_ERROR: "サーバーエラーが発生しました。",
  NETWORK_ERROR: "ネットワークエラーが発生しました。",
  TIMEOUT: "処理がタイムアウトしました。",
  UNAUTHORIZED: "認証が必要です。",
  FORBIDDEN: "この操作を実行する権限がありません。",
  NOT_FOUND: "データが見つかりません。",
  CONFLICT: "データの競合が発生しました。",
  VALIDATION_ERROR: "入力内容に問題があります。",
  UNKNOWN_ERROR: "予期しないエラーが発生しました。",
} as const;

// 認証関連のエラーメッセージ
export const AUTH_ERROR_MESSAGES = {
  LOGIN_FAILED: "ログインに失敗しました。",
  INVALID_CREDENTIALS: "メールアドレスまたはパスワードが正しくありません。",
  EXPIRED_TOKEN: "セッションが期限切れです。再度ログインしてください。",
  INVALID_TOKEN: "無効なトークンです。",
  LOGOUT_FAILED: "ログアウトに失敗しました。",
  PASSWORD_MISMATCH: "パスワードが一致しません。",
  WEAK_PASSWORD: "パスワードが弱すぎます。",
  PASSWORD_REQUIRED: "パスワードを入力してください。",
  EMAIL_REQUIRED: "メールアドレスを入力してください。",
  INVALID_EMAIL: "有効なメールアドレスを入力してください。",
} as const;

// バリデーション関連のエラーメッセージ
export const VALIDATION_ERROR_MESSAGES = {
  MIN_LENGTH: (min: number) => `最低${min}文字以上で入力してください。`,
  MAX_LENGTH: (max: number) => `${max}文字以下で入力してください。`,
  MIN_VALUE: (min: number) => `${min}以上の値を入力してください。`,
  MAX_VALUE: (max: number) => `${max}以下の値を入力してください。`,
  INVALID_DATE: "有効な日付を入力してください。",
  FUTURE_DATE: "未来の日付は入力できません。",
  PAST_DATE: "過去の日付は入力できません。",
  INVALID_PHONE: "有効な電話番号を入力してください。",
  INVALID_URL: "有効なURLを入力してください。",
  INVALID_NUMBER: "有効な数値を入力してください。",
  INVALID_INTEGER: "整数を入力してください。",
  INVALID_PATTERN: "入力形式が正しくありません。",
} as const;

// ファイル関連のエラーメッセージ
export const FILE_ERROR_MESSAGES = {
  FILE_TOO_LARGE: "ファイルサイズが大きすぎます。",
  INVALID_FILE_TYPE: "サポートされていないファイル形式です。",
  UPLOAD_FAILED: "ファイルのアップロードに失敗しました。",
  DOWNLOAD_FAILED: "ファイルのダウンロードに失敗しました。",
  FILE_NOT_FOUND: "ファイルが見つかりません。",
  MULTIPLE_FILES_NOT_ALLOWED: "複数のファイルは選択できません。",
  NO_FILE_SELECTED: "ファイルが選択されていません。",
} as const;

// エンジニア関連のエラーメッセージ
export const ENGINEER_ERROR_MESSAGES = {
  PROFILE_UPDATE_FAILED: "プロフィールの更新に失敗しました。",
  SKILL_UPDATE_FAILED: "スキル情報の更新に失敗しました。",
  WORK_HISTORY_UPDATE_FAILED: "職歴情報の更新に失敗しました。",
  CERTIFICATION_UPDATE_FAILED: "資格情報の更新に失敗しました。",
  ENGINEER_NOT_FOUND: "エンジニアが見つかりません。",
  INVALID_SKILL_LEVEL: "無効なスキルレベルです。",
  INVALID_EXPERIENCE_YEARS: "無効な経験年数です。",
  DUPLICATE_SKILL: "同じスキルが既に登録されています。",
  DUPLICATE_CERTIFICATION: "同じ資格が既に登録されています。",
} as const;

// 週報関連のエラーメッセージ
export const WEEKLY_REPORT_ERROR_MESSAGES = {
  SUBMIT_FAILED: "週報の提出に失敗しました。",
  SAVE_FAILED: "週報の保存に失敗しました。",
  LOAD_FAILED: "週報の読み込みに失敗しました。",
  INVALID_WORK_HOURS: "無効な勤務時間です。",
  INVALID_DATE_RANGE: "無効な日付範囲です。",
  OVERLAPPING_DATES: "日付が重複しています。",
  MISSING_REQUIRED_FIELDS: "必須項目が入力されていません。",
  WORK_HOURS_EXCEEDED: "勤務時間が上限を超えています。",
  INVALID_MOOD: "無効な気分設定です。",
  REPORT_ALREADY_SUBMITTED: "既に提出済みの週報です。",
} as const;

// 経費関連のエラーメッセージ
export const EXPENSE_ERROR_MESSAGES = {
  SUBMIT_FAILED: "経費申請の提出に失敗しました。",
  APPROVAL_FAILED: "経費申請の承認に失敗しました。",
  REJECTION_FAILED: "経費申請の却下に失敗しました。",
  INVALID_AMOUNT: "無効な金額です。",
  AMOUNT_EXCEEDED: "金額が上限を超えています。",
  INVALID_CATEGORY: "無効なカテゴリです。",
  INVALID_RECEIPT: "無効な領収書です。",
  RECEIPT_REQUIRED: "領収書が必要です。",
  DUPLICATE_EXPENSE: "同じ経費が既に申請されています。",
  EXPENSE_NOT_FOUND: "経費申請が見つかりません。",
} as const;

// 休暇関連のエラーメッセージ
export const LEAVE_ERROR_MESSAGES = {
  REQUEST_FAILED: "休暇申請に失敗しました。",
  APPROVAL_FAILED: "休暇申請の承認に失敗しました。",
  REJECTION_FAILED: "休暇申請の却下に失敗しました。",
  INVALID_LEAVE_TYPE: "無効な休暇種類です。",
  INVALID_DATE_RANGE: "無効な日付範囲です。",
  INSUFFICIENT_BALANCE: "残日数が不足しています。",
  OVERLAPPING_REQUESTS: "重複する休暇申請があります。",
  PAST_DATE_NOT_ALLOWED: "過去の日付は申請できません。",
  WEEKEND_NOT_ALLOWED: "週末は申請できません。",
  HOLIDAY_NOT_ALLOWED: "祝日は申請できません。",
} as const;

// 通知関連のエラーメッセージ
export const NOTIFICATION_ERROR_MESSAGES = {
  SEND_FAILED: "通知の送信に失敗しました。",
  LOAD_FAILED: "通知の読み込みに失敗しました。",
  MARK_READ_FAILED: "既読マークの更新に失敗しました。",
  DELETE_FAILED: "通知の削除に失敗しました。",
  INVALID_NOTIFICATION_TYPE: "無効な通知タイプです。",
  NOTIFICATION_NOT_FOUND: "通知が見つかりません。",
} as const;

// プロジェクト関連のエラーメッセージ
export const PROJECT_ERROR_MESSAGES = {
  CREATE_FAILED: "プロジェクトの作成に失敗しました。",
  UPDATE_FAILED: "プロジェクトの更新に失敗しました。",
  DELETE_FAILED: "プロジェクトの削除に失敗しました。",
  LOAD_FAILED: "プロジェクトの読み込みに失敗しました。",
  INVALID_PROJECT_STATUS: "無効なプロジェクトステータスです。",
  PROJECT_NOT_FOUND: "プロジェクトが見つかりません。",
  DUPLICATE_PROJECT_NAME: "同じプロジェクト名が既に存在します。",
} as const;

// 検索関連のエラーメッセージ
export const SEARCH_ERROR_MESSAGES = {
  SEARCH_FAILED: "検索に失敗しました。",
  INVALID_SEARCH_QUERY: "無効な検索クエリです。",
  SEARCH_QUERY_TOO_SHORT: "検索クエリが短すぎます。",
  SEARCH_QUERY_TOO_LONG: "検索クエリが長すぎます。",
  NO_RESULTS_FOUND: "検索結果が見つかりません。",
  SEARCH_TIMEOUT: "検索がタイムアウトしました。",
} as const;

// エクスポート関連のエラーメッセージ
export const EXPORT_ERROR_MESSAGES = {
  EXPORT_FAILED: "エクスポートに失敗しました。",
  INVALID_FORMAT: "無効なエクスポート形式です。",
  NO_DATA_TO_EXPORT: "エクスポートするデータがありません。",
  EXPORT_TIMEOUT: "エクスポートがタイムアウトしました。",
  FILE_GENERATION_FAILED: "ファイル生成に失敗しました。",
} as const;

// インポート関連のエラーメッセージ
export const IMPORT_ERROR_MESSAGES = {
  IMPORT_FAILED: "インポートに失敗しました。",
  INVALID_FILE_FORMAT: "無効なファイル形式です。",
  INVALID_DATA_FORMAT: "無効なデータ形式です。",
  DUPLICATE_DATA: "重複するデータがあります。",
  MISSING_REQUIRED_COLUMNS: "必須列が不足しています。",
  INVALID_COLUMN_VALUES: "無効な列値があります。",
  IMPORT_TIMEOUT: "インポートがタイムアウトしました。",
} as const;

// 管理者関連のエラーメッセージ
export const ADMIN_ERROR_MESSAGES = {
  PERMISSION_DENIED: "管理者権限が必要です。",
  USER_MANAGEMENT_FAILED: "ユーザー管理に失敗しました。",
  ROLE_ASSIGNMENT_FAILED: "ロール割り当てに失敗しました。",
  SETTINGS_UPDATE_FAILED: "設定の更新に失敗しました。",
  BACKUP_FAILED: "バックアップに失敗しました。",
  RESTORE_FAILED: "復元に失敗しました。",
} as const;

// API関連のエラーメッセージ
export const API_ERROR_MESSAGES = {
  REQUEST_FAILED: "APIリクエストに失敗しました。",
  INVALID_REQUEST: "無効なリクエストです。",
  RATE_LIMIT_EXCEEDED: "リクエスト制限を超えました。",
  SERVICE_UNAVAILABLE: "サービスが利用できません。",
  MAINTENANCE_MODE: "メンテナンス中です。",
  INVALID_API_KEY: "無効なAPIキーです。",
  API_VERSION_NOT_SUPPORTED: "サポートされていないAPIバージョンです。",
} as const;

// エラーカテゴリ設定
export const ERROR_CATEGORY_CONFIG = {
  AUTH: {
    level: "warning",
    showToast: true,
    autoClose: 5000,
  },
  VALIDATION: {
    level: "error",
    showToast: false,
    autoClose: 0,
  },
  NETWORK: {
    level: "error",
    showToast: true,
    autoClose: 8000,
  },
  SERVER: {
    level: "error",
    showToast: true,
    autoClose: 10000,
  },
  PERMISSION: {
    level: "warning",
    showToast: true,
    autoClose: 6000,
  },
} as const;

// エラーメッセージテンプレート
export const ERROR_MESSAGE_TEMPLATES = {
  FIELD_REQUIRED: (fieldName: string) => `${fieldName}は必須です。`,
  FIELD_TOO_SHORT: (fieldName: string, min: number) => `${fieldName}は${min}文字以上で入力してください。`,
  FIELD_TOO_LONG: (fieldName: string, max: number) => `${fieldName}は${max}文字以下で入力してください。`,
  FIELD_INVALID_FORMAT: (fieldName: string) => `${fieldName}の形式が正しくありません。`,
  VALUE_OUT_OF_RANGE: (min: number, max: number) => `値は${min}から${max}の範囲で入力してください。`,
  OPERATION_FAILED: (operation: string) => `${operation}に失敗しました。`,
  RESOURCE_NOT_FOUND: (resource: string) => `${resource}が見つかりません。`,
  PERMISSION_DENIED_FOR: (action: string) => `${action}の権限がありません。`,
} as const;

// 統合エラーメッセージ（後方互換性）
export const ERROR_MESSAGES = {
  ...GENERAL_ERROR_MESSAGES,
  ...AUTH_ERROR_MESSAGES,
  ...FILE_ERROR_MESSAGES,
  ...ENGINEER_ERROR_MESSAGES,
  ...WEEKLY_REPORT_ERROR_MESSAGES,
  ...EXPENSE_ERROR_MESSAGES,
  ...LEAVE_ERROR_MESSAGES,
  ...NOTIFICATION_ERROR_MESSAGES,
  ...PROJECT_ERROR_MESSAGES,
  ...SEARCH_ERROR_MESSAGES,
  ...EXPORT_ERROR_MESSAGES,
  ...IMPORT_ERROR_MESSAGES,
  ...ADMIN_ERROR_MESSAGES,
  ...API_ERROR_MESSAGES,
} as const;

// 成功メッセージテンプレート
export const SUCCESS_MESSAGE_TEMPLATES = {
  OPERATION_COMPLETED: (operation: string) => `${operation}が完了しました。`,
  RESOURCE_CREATED: (resource: string) => `${resource}を作成しました。`,
  RESOURCE_UPDATED: (resource: string) => `${resource}を更新しました。`,
  RESOURCE_DELETED: (resource: string) => `${resource}を削除しました。`,
  DATA_SAVED: "データを保存しました。",
  SETTINGS_UPDATED: "設定を更新しました。",
  EMAIL_SENT: "メールを送信しました。",
  FILE_UPLOADED: "ファイルをアップロードしました。",
  EXPORT_COMPLETED: "エクスポートが完了しました。",
  IMPORT_COMPLETED: "インポートが完了しました。",
  TEMP_DATA_LOADED: (params: { formattedDate: string }) => 
    `${params.formattedDate}に一時保存されたデータを読み込みました。`,
} as const;

// 統合成功メッセージ
export const SUCCESS_MESSAGES = {
  ...SUCCESS_MESSAGE_TEMPLATES,
  // 具体的な成功メッセージ
  LOGIN_SUCCESS: "ログインしました。",
  LOGOUT_SUCCESS: "ログアウトしました。",
  PROFILE_UPDATED: "プロフィールを更新しました。",
  PROFILE_TEMP_SAVED: "プロフィールを一時保存しました。",
  PASSWORD_CHANGED: "パスワードを変更しました。",
  // 週報関連
  WEEKLY_REPORT_SUBMITTED: "週報を提出しました。",
  WEEKLY_REPORT_SAVED: "週報を下書き保存しました。",
  WEEKLY_REPORT_LOADED: "週報を読み込みました。",
  WEEKLY_REPORT_CREATED: "新規週報を作成しました。",
  BULK_WORK_TIME_SET: "一括設定を適用しました。",
  DEFAULT_SETTINGS_SAVED: "デフォルト設定を保存しました。",
  // 申請関連
  EXPENSE_SUBMITTED: "経費申請を提出しました。",
  LEAVE_REQUESTED: "休暇申請を提出しました。",
  APPROVAL_COMPLETED: "承認しました。",
  REJECTION_COMPLETED: "却下しました。",
} as const;

// エラーカテゴリ判定関数
export const getErrorCategory = (errorCode: string): keyof typeof ERROR_CATEGORY_CONFIG => {
  if (errorCode.startsWith("AUTH")) return "AUTH";
  if (errorCode.startsWith("VAL")) return "VALIDATION";
  if (errorCode.startsWith("NET")) return "NETWORK";
  if (errorCode.startsWith("SYS")) return "SERVER";
  if (errorCode.startsWith("PERM")) return "PERMISSION";
  return "SERVER"; // デフォルト
};

// 型定義
export type GeneralErrorMessage = typeof GENERAL_ERROR_MESSAGES[keyof typeof GENERAL_ERROR_MESSAGES];
export type AuthErrorMessage = typeof AUTH_ERROR_MESSAGES[keyof typeof AUTH_ERROR_MESSAGES];
export type ValidationErrorMessage = typeof VALIDATION_ERROR_MESSAGES[keyof typeof VALIDATION_ERROR_MESSAGES];
export type FileErrorMessage = typeof FILE_ERROR_MESSAGES[keyof typeof FILE_ERROR_MESSAGES];
export type EngineerErrorMessage = typeof ENGINEER_ERROR_MESSAGES[keyof typeof ENGINEER_ERROR_MESSAGES];
export type WeeklyReportErrorMessage = typeof WEEKLY_REPORT_ERROR_MESSAGES[keyof typeof WEEKLY_REPORT_ERROR_MESSAGES];
export type ExpenseErrorMessage = typeof EXPENSE_ERROR_MESSAGES[keyof typeof EXPENSE_ERROR_MESSAGES];
export type LeaveErrorMessage = typeof LEAVE_ERROR_MESSAGES[keyof typeof LEAVE_ERROR_MESSAGES];
export type NotificationErrorMessage = typeof NOTIFICATION_ERROR_MESSAGES[keyof typeof NOTIFICATION_ERROR_MESSAGES];
export type ProjectErrorMessage = typeof PROJECT_ERROR_MESSAGES[keyof typeof PROJECT_ERROR_MESSAGES];
export type SearchErrorMessage = typeof SEARCH_ERROR_MESSAGES[keyof typeof SEARCH_ERROR_MESSAGES];
export type ExportErrorMessage = typeof EXPORT_ERROR_MESSAGES[keyof typeof EXPORT_ERROR_MESSAGES];
export type ImportErrorMessage = typeof IMPORT_ERROR_MESSAGES[keyof typeof IMPORT_ERROR_MESSAGES];
export type AdminErrorMessage = typeof ADMIN_ERROR_MESSAGES[keyof typeof ADMIN_ERROR_MESSAGES];
export type ApiErrorMessage = typeof API_ERROR_MESSAGES[keyof typeof API_ERROR_MESSAGES];
export type ErrorCategory = keyof typeof ERROR_CATEGORY_CONFIG;