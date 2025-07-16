// バリデーションメッセージ定数定義

// 基本的なバリデーションメッセージ
export const BASIC_VALIDATION_MESSAGES = {
  REQUIRED: "この項目は必須です。",
  INVALID_FORMAT: "入力形式が正しくありません。",
  TOO_SHORT: "文字数が短すぎます。",
  TOO_LONG: "文字数が長すぎます。",
  INVALID_VALUE: "無効な値です。",
  OUT_OF_RANGE: "範囲外の値です。",
  INVALID_CHARACTER: "無効な文字が含まれています。",
  WHITESPACE_NOT_ALLOWED: "スペースは使用できません。",
  SPECIAL_CHARACTERS_NOT_ALLOWED: "特殊文字は使用できません。",
} as const;

// 文字列バリデーションメッセージ
export const STRING_VALIDATION_MESSAGES = {
  MIN_LENGTH: (min: number) => `${min}文字以上で入力してください。`,
  MAX_LENGTH: (max: number) => `${max}文字以下で入力してください。`,
  EXACT_LENGTH: (length: number) => `${length}文字で入力してください。`,
  PATTERN_MISMATCH: "入力形式が正しくありません。",
  CONTAINS_INVALID_CHARS: "無効な文字が含まれています。",
  MUST_CONTAIN_UPPERCASE: "大文字を含める必要があります。",
  MUST_CONTAIN_LOWERCASE: "小文字を含める必要があります。",
  MUST_CONTAIN_NUMBER: "数字を含める必要があります。",
  MUST_CONTAIN_SPECIAL_CHAR: "特殊文字を含める必要があります。",
} as const;

// 数値バリデーションメッセージ
export const NUMBER_VALIDATION_MESSAGES = {
  NOT_A_NUMBER: "数値を入力してください。",
  NOT_AN_INTEGER: "整数を入力してください。",
  NEGATIVE_NOT_ALLOWED: "負の値は入力できません。",
  ZERO_NOT_ALLOWED: "0は入力できません。",
  MIN_VALUE: (min: number) => `${min}以上の値を入力してください。`,
  MAX_VALUE: (max: number) => `${max}以下の値を入力してください。`,
  DECIMAL_PLACES: (places: number) => `小数点以下は${places}桁まで入力してください。`,
  MUST_BE_POSITIVE: "正の値を入力してください。",
  MUST_BE_WHOLE_NUMBER: "整数を入力してください。",
} as const;

// 日付バリデーションメッセージ
export const DATE_VALIDATION_MESSAGES = {
  INVALID_DATE: "有効な日付を入力してください。",
  FUTURE_DATE_NOT_ALLOWED: "未来の日付は入力できません。",
  PAST_DATE_NOT_ALLOWED: "過去の日付は入力できません。",
  WEEKEND_NOT_ALLOWED: "週末は選択できません。",
  HOLIDAY_NOT_ALLOWED: "祝日は選択できません。",
  DATE_RANGE_INVALID: "開始日は終了日より前に設定してください。",
  DATE_TOO_EARLY: (date: string) => `${date}以降の日付を入力してください。`,
  DATE_TOO_LATE: (date: string) => `${date}以前の日付を入力してください。`,
  SAME_DATE_NOT_ALLOWED: "同じ日付は入力できません。",
  OVERLAPPING_DATES: "日付が重複しています。",
} as const;

// 時間バリデーションメッセージ
export const TIME_VALIDATION_MESSAGES = {
  INVALID_TIME: "有効な時間を入力してください。",
  TIME_RANGE_INVALID: "開始時間は終了時間より前に設定してください。",
  WORK_HOURS_EXCEEDED: "勤務時間が上限を超えています。",
  BREAK_TIME_INVALID: "休憩時間が無効です。",
  OVERTIME_LIMIT_EXCEEDED: "残業時間が上限を超えています。",
  MINIMUM_WORK_HOURS: (min: number) => `最低${min}時間の勤務が必要です。`,
  MAXIMUM_WORK_HOURS: (max: number) => `勤務時間は${max}時間以下にしてください。`,
} as const;

// メールアドレスバリデーションメッセージ
export const EMAIL_VALIDATION_MESSAGES = {
  INVALID_EMAIL: "有効なメールアドレスを入力してください。",
  EMAIL_ALREADY_EXISTS: "このメールアドレスは既に登録されています。",
  DOMAIN_NOT_ALLOWED: "このドメインは使用できません。",
  DISPOSABLE_EMAIL_NOT_ALLOWED: "使い捨てメールアドレスは使用できません。",
  EMAIL_TOO_LONG: "メールアドレスが長すぎます。",
} as const;

// パスワードバリデーションメッセージ
export const PASSWORD_VALIDATION_MESSAGES = {
  PASSWORD_TOO_SHORT: (min: number) => `パスワードは${min}文字以上で入力してください。`,
  PASSWORD_TOO_LONG: (max: number) => `パスワードは${max}文字以下で入力してください。`,
  PASSWORD_WEAK: "パスワードが弱すぎます。",
  PASSWORD_MISMATCH: "パスワードが一致しません。",
  PASSWORD_SAME_AS_CURRENT: "現在のパスワードと同じです。",
  PASSWORD_RECENTLY_USED: "最近使用されたパスワードです。",
  PASSWORD_CONTAINS_PERSONAL_INFO: "個人情報を含むパスワードは使用できません。",
  PASSWORD_SEQUENTIAL_CHARS: "連続する文字は使用できません。",
  PASSWORD_REPEATED_CHARS: "繰り返し文字は使用できません。",
} as const;

// 電話番号バリデーションメッセージ
export const PHONE_VALIDATION_MESSAGES = {
  INVALID_PHONE: "有効な電話番号を入力してください。",
  PHONE_TOO_SHORT: "電話番号が短すぎます。",
  PHONE_TOO_LONG: "電話番号が長すぎます。",
  INVALID_COUNTRY_CODE: "無効な国コードです。",
  PHONE_ALREADY_EXISTS: "この電話番号は既に登録されています。",
} as const;

// URLバリデーションメッセージ
export const URL_VALIDATION_MESSAGES = {
  INVALID_URL: "有効なURLを入力してください。",
  PROTOCOL_REQUIRED: "プロトコル（http://またはhttps://）を含めてください。",
  DOMAIN_REQUIRED: "ドメイン名が必要です。",
  MALICIOUS_URL: "安全でないURLです。",
  URL_TOO_LONG: "URLが長すぎます。",
} as const;

// ファイルバリデーションメッセージ
export const FILE_VALIDATION_MESSAGES = {
  FILE_REQUIRED: "ファイルを選択してください。",
  FILE_TOO_LARGE: (maxSize: string) => `ファイルサイズは${maxSize}以下にしてください。`,
  FILE_TOO_SMALL: (minSize: string) => `ファイルサイズは${minSize}以上にしてください。`,
  INVALID_FILE_TYPE: (allowedTypes: string) => `${allowedTypes}形式のファイルのみ使用できます。`,
  FILE_NAME_TOO_LONG: "ファイル名が長すぎます。",
  FILE_NAME_INVALID: "無効なファイル名です。",
  MULTIPLE_FILES_NOT_ALLOWED: "複数のファイルは選択できません。",
  FILE_CORRUPTED: "ファイルが破損しています。",
  VIRUS_DETECTED: "ウイルスが検出されました。",
} as const;

// 選択肢バリデーションメッセージ
export const SELECTION_VALIDATION_MESSAGES = {
  REQUIRED_SELECTION: "選択してください。",
  INVALID_SELECTION: "無効な選択です。",
  MULTIPLE_SELECTION_NOT_ALLOWED: "複数選択はできません。",
  MIN_SELECTIONS: (min: number) => `最低${min}個選択してください。`,
  MAX_SELECTIONS: (max: number) => `最大${max}個まで選択できます。`,
  OPTION_NOT_AVAILABLE: "この選択肢は利用できません。",
} as const;

// カスタムフィールドバリデーションメッセージ
export const CUSTOM_VALIDATION_MESSAGES = {
  // エンジニア関連
  SKILL_LEVEL_REQUIRED: "スキルレベルを選択してください。",
  EXPERIENCE_YEARS_REQUIRED: "経験年数を入力してください。",
  CERTIFICATION_NAME_REQUIRED: "資格名を入力してください。",
  WORK_HISTORY_REQUIRED: "職歴を入力してください。",
  TECHNOLOGY_REQUIRED: "技術を選択してください。",
  PROJECT_NAME_REQUIRED: "プロジェクト名を入力してください。",
  INVALID_SKILL_LEVEL: "無効なスキルレベルです。",
  DUPLICATE_SKILL: "同じスキルが既に登録されています。",
  DUPLICATE_TECHNOLOGY: "同じ技術が既に登録されています。",
  INVALID_EXPERIENCE_YEARS: "経験年数は0以上99以下で入力してください。",

  // 週報関連
  WORK_HOURS_REQUIRED: "勤務時間を入力してください。",
  MOOD_REQUIRED: "気分を選択してください。",
  DAILY_RECORD_REQUIRED: "日次記録を入力してください。",
  WORK_CONTENT_REQUIRED: "作業内容を入力してください。",
  INVALID_WORK_HOURS: "勤務時間は0以上24以下で入力してください。",
  INVALID_MOOD: "無効な気分設定です。",
  WORK_HOURS_TOTAL_MISMATCH: "勤務時間の合計が一致しません。",

  // 経費関連
  EXPENSE_AMOUNT_REQUIRED: "金額を入力してください。",
  EXPENSE_CATEGORY_REQUIRED: "カテゴリを選択してください。",
  EXPENSE_DATE_REQUIRED: "日付を選択してください。",
  RECEIPT_REQUIRED: "領収書をアップロードしてください。",
  INVALID_EXPENSE_AMOUNT: "無効な金額です。",
  EXPENSE_AMOUNT_EXCEEDED: "金額が上限を超えています。",
  INVALID_EXPENSE_CATEGORY: "無効なカテゴリです。",
  FUTURE_EXPENSE_DATE: "未来の日付は入力できません。",

  // 休暇関連
  LEAVE_TYPE_REQUIRED: "休暇種類を選択してください。",
  LEAVE_REASON_REQUIRED: "理由を入力してください。",
  LEAVE_START_DATE_REQUIRED: "開始日を選択してください。",
  LEAVE_END_DATE_REQUIRED: "終了日を選択してください。",
  INVALID_LEAVE_TYPE: "無効な休暇種類です。",
  INSUFFICIENT_LEAVE_BALANCE: "休暇残日数が不足しています。",
  OVERLAPPING_LEAVE_REQUEST: "重複する休暇申請があります。",
  LEAVE_REASON_TOO_LONG: "理由は500文字以下で入力してください。",
} as const;

// 複合バリデーションメッセージ
export const COMPOSITE_VALIDATION_MESSAGES = {
  EITHER_REQUIRED: (field1: string, field2: string) => `${field1}または${field2}のいずれかを入力してください。`,
  BOTH_REQUIRED: (field1: string, field2: string) => `${field1}と${field2}の両方を入力してください。`,
  CONDITIONAL_REQUIRED: (field: string, condition: string) => `${condition}の場合、${field}は必須です。`,
  MUTUALLY_EXCLUSIVE: (field1: string, field2: string) => `${field1}と${field2}は同時に入力できません。`,
  DEPENDENCY_REQUIRED: (field: string, dependency: string) => `${dependency}を選択してから${field}を入力してください。`,
} as const;

// 型定義
export type BasicValidationMessage = typeof BASIC_VALIDATION_MESSAGES[keyof typeof BASIC_VALIDATION_MESSAGES];
export type StringValidationMessage = typeof STRING_VALIDATION_MESSAGES[keyof typeof STRING_VALIDATION_MESSAGES];
export type NumberValidationMessage = typeof NUMBER_VALIDATION_MESSAGES[keyof typeof NUMBER_VALIDATION_MESSAGES];
export type DateValidationMessage = typeof DATE_VALIDATION_MESSAGES[keyof typeof DATE_VALIDATION_MESSAGES];
export type TimeValidationMessage = typeof TIME_VALIDATION_MESSAGES[keyof typeof TIME_VALIDATION_MESSAGES];
export type EmailValidationMessage = typeof EMAIL_VALIDATION_MESSAGES[keyof typeof EMAIL_VALIDATION_MESSAGES];
export type PasswordValidationMessage = typeof PASSWORD_VALIDATION_MESSAGES[keyof typeof PASSWORD_VALIDATION_MESSAGES];
export type PhoneValidationMessage = typeof PHONE_VALIDATION_MESSAGES[keyof typeof PHONE_VALIDATION_MESSAGES];
export type UrlValidationMessage = typeof URL_VALIDATION_MESSAGES[keyof typeof URL_VALIDATION_MESSAGES];
export type FileValidationMessage = typeof FILE_VALIDATION_MESSAGES[keyof typeof FILE_VALIDATION_MESSAGES];
export type SelectionValidationMessage = typeof SELECTION_VALIDATION_MESSAGES[keyof typeof SELECTION_VALIDATION_MESSAGES];
export type CustomValidationMessage = typeof CUSTOM_VALIDATION_MESSAGES[keyof typeof CUSTOM_VALIDATION_MESSAGES];
export type CompositeValidationMessage = typeof COMPOSITE_VALIDATION_MESSAGES[keyof typeof COMPOSITE_VALIDATION_MESSAGES];