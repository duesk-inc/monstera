/**
 * エラーコード定数
 * バックエンドと同期を取るため、エラーコードは完全一致させる
 */

export const ERROR_CODES = {
  // 週報関連
  WEEKLY_REPORT: {
    START_DATE_REQUIRED: 'W001V001',
    END_DATE_REQUIRED: 'W001V002',
    ALREADY_SUBMITTED: 'W001B001',
  },
  
  // 認証関連
  AUTH: {
    EMAIL_REQUIRED: 'A001V001',
    INVALID_CREDENTIALS: 'A001A001',
  },
  
  // 経費申請関連
  EXPENSE: {
    // 基本操作 (E001)
    TITLE_REQUIRED: 'E001V001',
    AMOUNT_INVALID: 'E001V002',
    DATE_REQUIRED: 'E001V003',
    DESCRIPTION_INVALID: 'E001V004',
    RECEIPT_REQUIRED: 'E001V005',
    ALREADY_SUBMITTED: 'E001B001',
    ALREADY_APPROVED: 'E001B002',
    EXPIRED: 'E001B003',
    NOT_FOUND: 'E001N001',
    SAVE_FAILED: 'E001S001',
    
    // 承認フロー (E002)
    APPROVAL_COMMENT_TOO_LONG: 'E002V001',
    REJECTION_REASON_REQUIRED: 'E002V002',
    APPROVAL_ALREADY_APPROVED: 'E002B001',
    APPROVAL_ALREADY_REJECTED: 'E002B002',
    NO_APPROVAL_AUTHORITY: 'E002B003',
    APPROVAL_PERMISSION_DENIED: 'E002P001',
    APPROVAL_TARGET_NOT_FOUND: 'E002N001',
    APPROVAL_PROCESS_FAILED: 'E002S001',
    
    // 上限管理 (E003)
    LIMIT_AMOUNT_INVALID: 'E003V001',
    LIMIT_EFFECTIVE_DATE_REQUIRED: 'E003V002',
    LIMIT_SCOPE_TARGET_REQUIRED: 'E003V003',
    MONTHLY_LIMIT_EXCEEDED: 'E003B001',
    YEARLY_LIMIT_EXCEEDED: 'E003B002',
    LIMIT_ALREADY_EXISTS: 'E003B003',
    LIMIT_CHANGE_PERMISSION_DENIED: 'E003P001',
    LIMIT_NOT_FOUND: 'E003N001',
    LIMIT_SAVE_FAILED: 'E003S001',
    
    // カテゴリ管理 (E004)
    CATEGORY_CODE_INVALID: 'E004V001',
    CATEGORY_NAME_REQUIRED: 'E004V002',
    DEFAULT_CATEGORY_DELETE: 'E004B001',
    CATEGORY_CODE_DUPLICATE: 'E004B002',
    CATEGORY_IN_USE: 'E004B003',
    CATEGORY_PERMISSION_DENIED: 'E004P001',
    CATEGORY_NOT_FOUND: 'E004N001',
    CATEGORY_SAVE_FAILED: 'E004S001',
    
    // 集計・レポート (E005)
    SUMMARY_YEAR_INVALID: 'E005V001',
    SUMMARY_MONTH_INVALID: 'E005V002',
    FISCAL_YEAR_INVALID: 'E005V003',
    SUMMARY_DATA_NOT_FOUND: 'E005B001',
    SUMMARY_PERMISSION_DENIED: 'E005P001',
    SUMMARY_PROCESS_FAILED: 'E005S001',
  },
} as const;

// エラーレスポンス型
export interface ApiErrorResponse {
  error_code: string;
  message: string;
  details?: string;
}

// エラーコードに基づく特別な処理
export const handleApiErrorByCode = (errorCode: string, router: any) => {
  switch (errorCode) {
    case ERROR_CODES.AUTH.INVALID_CREDENTIALS:
      // ログイン画面にリダイレクト
      router.push('/login');
      break;
      
    case ERROR_CODES.WEEKLY_REPORT.ALREADY_SUBMITTED:
    case ERROR_CODES.EXPENSE.ALREADY_SUBMITTED:
    case ERROR_CODES.EXPENSE.ALREADY_APPROVED:
      // 画面をリロードして最新状態を取得
      window.location.reload();
      break;
      
    case ERROR_CODES.EXPENSE.MONTHLY_LIMIT_EXCEEDED:
    case ERROR_CODES.EXPENSE.YEARLY_LIMIT_EXCEEDED:
      // 上限超過の場合は特別な通知を表示
      // (通常のエラートーストとは別に処理される想定)
      break;
      
    default:
      // 特別な処理なし
      break;
  }
};

// エラータイプの判定ヘルパー
export const isValidationError = (errorCode: string): boolean => {
  return errorCode.endsWith('V001') || errorCode.endsWith('V002') || 
         errorCode.endsWith('V003') || errorCode.endsWith('V004') || 
         errorCode.endsWith('V005');
};

export const isBusinessError = (errorCode: string): boolean => {
  return errorCode.endsWith('B001') || errorCode.endsWith('B002') || 
         errorCode.endsWith('B003');
};

export const isPermissionError = (errorCode: string): boolean => {
  return errorCode.endsWith('P001');
};

export const isNotFoundError = (errorCode: string): boolean => {
  return errorCode.endsWith('N001');
};

export const isSystemError = (errorCode: string): boolean => {
  return errorCode.endsWith('S001');
};