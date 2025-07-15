// エンジニア管理関連の定数定義

import { EngineerStatus, SkillLevel, EngineerSortField, SortOrder, EngineerValidationRules } from '@/types/engineer';

// エンジニアステータス定数
export const ENGINEER_STATUS = EngineerStatus;

// エンジニアステータスラベル
export const ENGINEER_STATUS_LABELS: Record<EngineerStatus, string> = {
  [EngineerStatus.ACTIVE]: '稼働中',
  [EngineerStatus.STANDBY]: '待機中',
  [EngineerStatus.RESIGNED]: '退職',
  [EngineerStatus.LONG_LEAVE]: '長期休暇中'
};

// エンジニアステータス色
export const ENGINEER_STATUS_COLORS: Record<EngineerStatus, string> = {
  [EngineerStatus.ACTIVE]: 'success',
  [EngineerStatus.STANDBY]: 'warning',
  [EngineerStatus.RESIGNED]: 'error',
  [EngineerStatus.LONG_LEAVE]: 'info'
};

// スキルレベルラベル
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  [SkillLevel.BEGINNER]: '初心者',
  [SkillLevel.BASIC]: '基礎',
  [SkillLevel.INTERMEDIATE]: '中級',
  [SkillLevel.ADVANCED]: '上級',
  [SkillLevel.EXPERT]: '専門家'
};

// スキルレベル色
export const SKILL_LEVEL_COLORS: Record<SkillLevel, string> = {
  [SkillLevel.BEGINNER]: '#f44336',     // 赤
  [SkillLevel.BASIC]: '#ff9800',        // オレンジ
  [SkillLevel.INTERMEDIATE]: '#2196f3', // 青
  [SkillLevel.ADVANCED]: '#4caf50',     // 緑
  [SkillLevel.EXPERT]: '#9c27b0'        // 紫
};

// ソート項目ラベル
export const SORT_FIELD_LABELS: Record<EngineerSortField, string> = {
  [EngineerSortField.CREATED_AT]: '作成日時',
  [EngineerSortField.UPDATED_AT]: '更新日時',
  [EngineerSortField.EMPLOYEE_NUMBER]: '社員番号',
  [EngineerSortField.NAME]: '名前'
};

// ソート順ラベル
export const SORT_ORDER_LABELS: Record<SortOrder, string> = {
  [SortOrder.ASC]: '昇順',
  [SortOrder.DESC]: '降順'
};

// バリデーションルール
export const ENGINEER_VALIDATION_RULES: EngineerValidationRules = {
  email: {
    required: true,
    pattern: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
  },
  password: {
    required: true,
    minLength: 8
  },
  firstName: {
    required: true,
    maxLength: 255
  },
  lastName: {
    required: true,
    maxLength: 255
  },
  sei: {
    required: true,
    maxLength: 50
  },
  mei: {
    required: true,
    maxLength: 50
  },
  phoneNumber: {
    pattern: /^[\d\-\(\)\s\+]{10,20}$/
  },
  employeeNumber: {
    pattern: /^\d{6}$/
  }
};

// バリデーションエラーメッセージ
export const VALIDATION_MESSAGES = {
  required: '必須項目です',
  email: {
    invalid: 'メールアドレスの形式が正しくありません',
    duplicate: 'このメールアドレスは既に使用されています'
  },
  password: {
    minLength: 'パスワードは8文字以上で入力してください',
    required: 'パスワードは必須です'
  },
  firstName: {
    required: '名前（名）は必須です',
    maxLength: '名前（名）は255文字以内で入力してください'
  },
  lastName: {
    required: '名前（姓）は必須です',
    maxLength: '名前（姓）は255文字以内で入力してください'
  },
  sei: {
    required: '姓は必須です',
    maxLength: '姓は50文字以内で入力してください'
  },
  mei: {
    required: '名は必須です',
    maxLength: '名は50文字以内で入力してください'
  },
  phoneNumber: {
    invalid: '電話番号の形式が正しくありません'
  },
  employeeNumber: {
    invalid: '社員番号は6桁の数字で入力してください'
  },
  hireDate: {
    invalid: '入社日の形式が正しくありません（YYYY-MM-DD）'
  },
  uuid: {
    invalid: 'IDの形式が正しくありません'
  }
};

// APIエンドポイント
export const ENGINEER_API_ENDPOINTS = {
  BASE: '/api/v1/admin/engineers',
  LIST: '/api/v1/admin/engineers',
  DETAIL: (id: string) => `/api/v1/admin/engineers/${id}`,
  CREATE: '/api/v1/admin/engineers',
  UPDATE: (id: string) => `/api/v1/admin/engineers/${id}`,
  DELETE: (id: string) => `/api/v1/admin/engineers/${id}`,
  STATUS_UPDATE: (id: string) => `/api/v1/admin/engineers/${id}/status`,
  IMPORT: '/api/v1/admin/engineers/import',
  EXPORT: '/api/v1/admin/engineers/export',
  TEMPLATE: '/api/v1/admin/engineers/template',
  STATISTICS: '/api/v1/admin/engineers/statistics'
};

// ページサイズオプション
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// デフォルトページサイズ
export const DEFAULT_PAGE_SIZE = 20;

// CSVファイル設定
export const CSV_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_EXTENSIONS: ['.csv'],
  ENCODING: 'UTF-8'
};

// ダイアログサイズ
export const DIALOG_SIZES = {
  SMALL: 'sm',
  MEDIUM: 'md',
  LARGE: 'lg',
  EXTRA_LARGE: 'xl'
} as const;

// アニメーション設定
export const ANIMATION_DURATION = {
  SHORT: 200,
  MEDIUM: 300,
  LONG: 500
} as const;

// デバウンス設定
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  AUTO_SAVE: 1000
} as const;

// 日付フォーマット
export const DATE_FORMATS = {
  DISPLAY: 'YYYY年MM月DD日',
  INPUT: 'YYYY-MM-DD',
  API: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss'
} as const;

// スキルレベル説明
export const SKILL_LEVEL_DESCRIPTIONS: Record<SkillLevel, string> = {
  [SkillLevel.BEGINNER]: '基本的な概念を理解している',
  [SkillLevel.BASIC]: '簡単なタスクを実行できる',
  [SkillLevel.INTERMEDIATE]: '一般的な問題を解決できる',
  [SkillLevel.ADVANCED]: '複雑な問題を解決できる',
  [SkillLevel.EXPERT]: '他者に指導ができる専門知識を持つ'
};

// エクスポート項目ラベル
export const EXPORT_OPTION_LABELS = {
  includeSkills: 'スキル情報を含める',
  includeProjects: 'プロジェクト履歴を含める',
  includeStatusHistory: 'ステータス履歴を含める'
} as const;

// テーブルカラム設定
export const TABLE_COLUMNS = {
  EMPLOYEE_NUMBER: { key: 'employeeNumber', label: '社員番号', width: 120, sortable: true },
  FULL_NAME: { key: 'fullName', label: '氏名', width: 200, sortable: true },
  EMAIL: { key: 'email', label: 'メールアドレス', width: 250, sortable: false },
  DEPARTMENT: { key: 'department', label: '部署', width: 150, sortable: false },
  POSITION: { key: 'position', label: '役職', width: 120, sortable: false },
  STATUS: { key: 'engineerStatus', label: 'ステータス', width: 120, sortable: false },
  HIRE_DATE: { key: 'hireDate', label: '入社日', width: 120, sortable: false },
  CREATED_AT: { key: 'createdAt', label: '登録日', width: 150, sortable: true },
  ACTIONS: { key: 'actions', label: '操作', width: 120, sortable: false }
} as const;

// フォームフィールド設定
export const FORM_FIELDS = {
  BASIC_INFO: [
    'email', 'password', 'firstName', 'lastName', 
    'firstNameKana', 'lastNameKana', 'sei', 'mei', 'seiKana', 'meiKana'
  ],
  WORK_INFO: [
    'department', 'position', 'hireDate', 'departmentId', 'managerId'
  ],
  ADDITIONAL_INFO: [
    'education', 'phoneNumber'
  ]
} as const;

// ステータス変更理由のプリセット
export const STATUS_CHANGE_REASONS = {
  [EngineerStatus.ACTIVE]: [
    'プロジェクト配属',
    '待機解除',
    '復職'
  ],
  [EngineerStatus.STANDBY]: [
    'プロジェクト終了',
    '次期プロジェクト待ち',
    'スキルアップ期間'
  ],
  [EngineerStatus.RESIGNED]: [
    '自己都合退職',
    '会社都合退職',
    '転職'
  ],
  [EngineerStatus.LONG_LEAVE]: [
    '育児休暇',
    '介護休暇',
    '病気療養',
    '留学'
  ]
} as const;

// アクションボタン設定
export const ACTION_BUTTONS = {
  CREATE: { label: '新規登録', color: 'primary', icon: 'add' },
  EDIT: { label: '編集', color: 'secondary', icon: 'edit' },
  DELETE: { label: '削除', color: 'error', icon: 'delete' },
  VIEW: { label: '詳細', color: 'info', icon: 'visibility' },
  STATUS_CHANGE: { label: 'ステータス変更', color: 'warning', icon: 'swap_horiz' },
  EXPORT: { label: 'エクスポート', color: 'success', icon: 'download' },
  IMPORT: { label: 'インポート', color: 'info', icon: 'upload' }
} as const;

// 権限レベル
export const PERMISSION_LEVELS = {
  READ: 'read',
  write: 'write',
  admin: 'admin'
} as const;

// エラーコード
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  ENGINEER_NOT_FOUND: 'ENGINEER_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

// 成功メッセージ
export const SUCCESS_MESSAGES = {
  ENGINEER_CREATED: 'エンジニアを登録しました',
  ENGINEER_UPDATED: 'エンジニア情報を更新しました',
  ENGINEER_DELETED: 'エンジニアを削除しました',
  STATUS_UPDATED: 'ステータスを更新しました',
  SKILL_ADDED: 'スキルを追加しました',
  SKILL_UPDATED: 'スキル情報を更新しました',
  SKILL_DELETED: 'スキルを削除しました',
  PROJECT_ADDED: 'プロジェクト履歴を追加しました',
  PROJECT_UPDATED: 'プロジェクト履歴を更新しました',
  IMPORT_COMPLETED: 'CSVインポートが完了しました',
  EXPORT_COMPLETED: 'CSVエクスポートが完了しました'
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
  ENGINEER_NOT_FOUND: 'エンジニアが見つかりません',
  UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'この操作を行う権限がありません',
  INTERNAL_ERROR: 'システムエラーが発生しました',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  INVALID_FILE_TYPE: 'CSVファイルを選択してください',
  FILE_TOO_LARGE: 'ファイルサイズが上限を超えています',
  IMPORT_FAILED: 'CSVインポートに失敗しました',
  EXPORT_FAILED: 'CSVエクスポートに失敗しました'
} as const;

// ローディングテキスト
export const LOADING_MESSAGES = {
  LOADING_ENGINEERS: 'エンジニア一覧を読み込み中...',
  LOADING_ENGINEER: 'エンジニア詳細を読み込み中...',
  CREATING_ENGINEER: 'エンジニアを登録中...',
  UPDATING_ENGINEER: 'エンジニア情報を更新中...',
  DELETING_ENGINEER: 'エンジニアを削除中...',
  UPDATING_STATUS: 'ステータスを更新中...',
  IMPORTING_CSV: 'CSVファイルをインポート中...',
  EXPORTING_CSV: 'CSVファイルをエクスポート中...'
} as const;