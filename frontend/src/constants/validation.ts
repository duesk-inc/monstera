// 経費申請のバリデーションルール

export const EXPENSE_VALIDATION = {
  // 説明文のバリデーション
  DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 1000,
  },
  // 金額のバリデーション
  AMOUNT: {
    MIN: 1,
    MAX: 10000000,
  },
  // タイトルのバリデーション
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
} as const;

// バリデーションエラーメッセージ
export const EXPENSE_VALIDATION_MESSAGES = {
  DESCRIPTION: {
    REQUIRED: '使用理由を入力してください',
    MIN_LENGTH: `使用理由は${EXPENSE_VALIDATION.DESCRIPTION.MIN_LENGTH}文字以上で入力してください`,
    MAX_LENGTH: `使用理由は${EXPENSE_VALIDATION.DESCRIPTION.MAX_LENGTH}文字以内で入力してください`,
  },
  AMOUNT: {
    REQUIRED: '金額を入力してください',
    MIN: '金額は1円以上で入力してください',
    MAX: `金額は${EXPENSE_VALIDATION.AMOUNT.MAX.toLocaleString()}円以内で入力してください`,
    INVALID: '正しい金額を入力してください',
  },
  EXPENSE_DATE: {
    REQUIRED: '使用日を選択してください',
    INVALID: '正しい日付を選択してください',
  },
  CATEGORY: {
    REQUIRED: 'カテゴリを選択してください',
  },
  RECEIPT: {
    REQUIRED: '領収書を添付してください',
    INVALID_TYPE: '対応している画像形式（JPG、PNG、PDF）でアップロードしてください',
    SIZE_EXCEEDED: 'ファイルサイズは10MB以内にしてください',
  },
} as const;