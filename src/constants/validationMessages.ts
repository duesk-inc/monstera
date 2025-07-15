/**
 * バリデーションメッセージの定数定義
 * フォームバリデーションで使用するメッセージを一元管理
 */

/**
 * 共通バリデーションメッセージ
 */
export const VALIDATION_MESSAGES = {
  // 必須項目
  REQUIRED: '必須項目です',
  REQUIRED_FIELD: (fieldName: string) => `${fieldName}は必須項目です`,
  
  // 文字数制限
  MAX_LENGTH: (max: number) => `${max}文字以内で入力してください`,
  MIN_LENGTH: (min: number) => `${min}文字以上で入力してください`,
  LENGTH_RANGE: (min: number, max: number) => `${min}文字以上${max}文字以内で入力してください`,
  
  // 形式チェック
  EMAIL_FORMAT: 'メールアドレスの形式で入力してください',
  PHONE_FORMAT: '電話番号の形式が正しくありません',
  POSTAL_CODE_FORMAT: '郵便番号の形式が正しくありません',
  URL_FORMAT: 'URLの形式が正しくありません',
  KANA_FORMAT: 'カナは全角カタカナで入力してください',
  
  // 日付・時刻
  DATE_FORMAT: '日付の形式が正しくありません',
  TIME_FORMAT: '時刻の形式が正しくありません',
  FUTURE_DATE_NOT_ALLOWED: '未来の日付は指定できません',
  PAST_DATE_NOT_ALLOWED: '過去の日付は指定できません',
  DATE_RANGE_INVALID: '開始日は終了日より前の日付を指定してください',
  
  // 数値
  NUMBER_FORMAT: '数値で入力してください',
  MIN_VALUE: (min: number) => `${min}以上の値を入力してください`,
  MAX_VALUE: (max: number) => `${max}以下の値を入力してください`,
  VALUE_RANGE: (min: number, max: number) => `${min}以上${max}以下の値を入力してください`,
  
  // ファイル
  FILE_SIZE_EXCEEDED: (maxSize: number) => `ファイルサイズは${maxSize}MB以下にしてください`,
  FILE_TYPE_INVALID: 'サポートされていないファイル形式です',
  
  // パスワード
  PASSWORD_MIN_LENGTH: 'パスワードは8文字以上で入力してください',
  PASSWORD_REQUIRES_UPPERCASE: 'パスワードには大文字を含める必要があります',
  PASSWORD_REQUIRES_LOWERCASE: 'パスワードには小文字を含める必要があります',
  PASSWORD_REQUIRES_NUMBER: 'パスワードには数字を含める必要があります',
  PASSWORD_REQUIRES_SPECIAL: 'パスワードには特殊文字を含める必要があります',
  PASSWORD_MISMATCH: 'パスワードが一致しません',
} as const;

/**
 * 休暇申請画面固有のバリデーションメッセージ
 */
export const LEAVE_VALIDATION_MESSAGES = {
  REASON_REQUIRED: '選択した休暇タイプでは申請理由の入力が必要です',
  DATE_REQUIRED: '休暇取得日を選択してください',
  DUPLICATE_DATES: (dates: string) => `重複した日付が含まれています: ${dates}`,
  VALID_PERIOD_REQUIRED: '有効な期間を選択してください',
  INSUFFICIENT_BALANCE: (remainingDays: number) => `残り日数（${remainingDays}日）を超えています`,
  GENERAL_ERROR: 'エラーが発生しました。しばらくしてからもう一度お試しください。',
  WEEKEND_NOT_ALLOWED: '土日は休暇申請できません',
  HOLIDAY_NOT_ALLOWED: '祝日は休暇申請できません',
  PAST_DATE_NOT_ALLOWED: '過去の日付は指定できません',
  DATE_TOO_FAR: '指定された日付が遠すぎます',
} as const;

/**
 * 週報画面固有のバリデーションメッセージ
 */
export const WEEKLY_REPORT_VALIDATION_MESSAGES = {
  WEEKLY_REMARKS_MAX_LENGTH: '週総括は1000文字以内で入力してください',
  WORK_TIME_REQUIRED: '少なくとも1日分の稼働時間を入力してください',
  SAME_WORK_TIME_WARNING: '自社勤怠と客先勤怠の時間が同じです。自社の勤務時間と客先の勤務時間が同じ場合は、自社勤怠のみご入力ください。',
  WORK_CONTENT_REQUIRED: '作業内容の入力は必須です',
  END_TIME_BEFORE_START: '終了時刻は開始時刻より後にしてください',
  BREAK_TIME_EXCEEDED: '休憩時間が勤務時間を超えています',
  INVALID_WORK_HOURS: '勤務時間が無効です',
} as const;

/**
 * プロフィール画面固有のバリデーションメッセージ
 */
export const PROFILE_VALIDATION_MESSAGES = {
  NAME_REQUIRED: '名前は必須項目です',
  KANA_REQUIRED: 'カナは必須項目です',
  BIRTH_DATE_INVALID: '生年月日が無効です',
  GENDER_INVALID: '性別の選択が無効です',
  SKILL_DUPLICATE: 'このスキルは既に登録されています',
  SKILL_LEVEL_INVALID: 'スキルレベルが無効です',
  EXPERIENCE_INVALID: '経験年数が無効です',
  CERTIFICATION_DUPLICATE: 'この資格は既に登録されています',
  ACQUIRED_DATE_INVALID: '取得日が無効です',
  EXPIRY_DATE_INVALID: '有効期限が無効です',
  EXPIRY_BEFORE_ACQUIRED: '有効期限は取得日より後の日付にしてください',
} as const;

/**
 * バリデーションメッセージを取得する汎用関数
 */
export const getValidationMessage = (key: string, params?: any): string => {
  const allMessages = {
    ...VALIDATION_MESSAGES,
    ...LEAVE_VALIDATION_MESSAGES,
    ...WEEKLY_REPORT_VALIDATION_MESSAGES,
    ...PROFILE_VALIDATION_MESSAGES,
  };
  
  const message = allMessages[key as keyof typeof allMessages];
  
  if (typeof message === 'function') {
    return message(params);
  }
  
  return message || 'エラーが発生しました';
};