/**
 * エラーコードに対応するユーザー向けメッセージの定義
 * バックエンドの /backend/internal/message/error_codes.go で定義されたエラーコードに対応
 */

/**
 * 基本的なエラーメッセージマッピング
 * エラーコード -> ユーザーフレンドリーなメッセージ
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // 認証・認可関連 (AUTH_XXX)
  'AUTH_001': '認証が必要です。ログインしてください。',
  'AUTH_002': 'メールアドレスまたはパスワードが正しくありません。',
  'AUTH_003': 'セッションの有効期限が切れました。再度ログインしてください。',
  'AUTH_004': '認証トークンが無効です。再度ログインしてください。',
  'AUTH_005': 'この機能へのアクセス権限がありません。',
  'AUTH_006': 'アカウントが無効化されています。管理者にお問い合わせください。',
  'AUTH_007': 'この操作を実行するための権限が不足しています。',
  'AUTH_008': 'セッションの有効期限が切れました。再度ログインしてください。',
  'AUTH_009': '他の場所で同じアカウントがログインしています。',
  'AUTH_010': '認証トークンの形式が無効です。',
  'AUTH_011': 'ログインに失敗しました。',
  'AUTH_012': 'サーバーとの通信中にエラーが発生しました。',
  'AUTH_013': 'トークンの更新に失敗しました。',
  'AUTH_014': 'リフレッシュトークンの処理に失敗しました。',
  'AUTH_015': '不正な形式のトークンを受信しました。',
  'AUTH_016': 'ログアウト処理中にエラーが発生しました。',

  // バリデーション関連 (VAL_XXX)
  'VAL_001': '入力内容に問題があります。確認して再度お試しください。',
  'VAL_002': '入力形式が正しくありません。',
  'VAL_003': '必須項目が入力されていません。',
  'VAL_004': '文字数が制限を超えています。',
  'VAL_005': '入力値が許可された範囲外です。',
  'VAL_006': '有効なメールアドレスを入力してください。',
  'VAL_007': '日付の形式が正しくありません。',
  'VAL_008': '時刻の形式が正しくありません。',
  'VAL_009': '無効なIDが指定されました。',
  'VAL_010': 'パスワードの形式が要件を満たしていません。',
  'VAL_011': '電話番号の形式が正しくありません。',
  'VAL_012': '郵便番号の形式が正しくありません。',
  'VAL_013': 'URLの形式が正しくありません。',
  'VAL_014': 'サポートされていないファイル形式です。',
  'VAL_015': 'ファイルサイズが上限を超えています。',

  // リソース関連 (RES_XXX)
  'RES_001': '指定されたデータが見つかりません。',
  'RES_002': '既に同じデータが存在しています。',
  'RES_003': 'データが競合しています。最新の情報を確認してください。',
  'RES_004': '他のデータで使用されているため、削除できません。',
  'RES_005': 'データが他のユーザーによって編集中です。',
  'RES_006': 'データの有効期限が切れています。',
  'RES_007': '割り当て上限を超えています。',
  'RES_008': 'サービスが一時的に利用できません。',

  // ビジネスロジック関連 (BIZ_XXX)
  'BIZ_001': 'この操作は実行できません。',
  'BIZ_002': '現在の状況では、この操作は許可されていません。',
  'BIZ_003': 'データの状態が無効です。',
  'BIZ_004': '操作の前提条件を満たしていません。',
  'BIZ_005': 'ビジネスルールに違反しています。',
  'BIZ_006': 'ワークフローでエラーが発生しました。',
  'BIZ_007': 'この操作には承認が必要です。',
  'BIZ_008': '期限を過ぎているため、操作できません。',

  // 休暇申請関連（BIZ_LEAVE_XXX）
  'BIZ_LEAVE_001': '休暇残日数が不足しています。',
  'BIZ_LEAVE_002': '指定期間に既に休暇申請があります。',
  'BIZ_LEAVE_003': '休暇申請の作成に失敗しました。',
  'BIZ_LEAVE_004': '休暇申請の更新に失敗しました。',
  'BIZ_LEAVE_005': '休暇申請の削除に失敗しました。',
  'BIZ_LEAVE_006': '休暇申請が見つかりません。',
  'BIZ_LEAVE_007': '無効な休暇期間です。',
  'BIZ_LEAVE_008': '過去の日付は指定できません。',
  'BIZ_LEAVE_009': '指定された日付が遠すぎます。',
  'BIZ_LEAVE_010': '土日は休暇申請できません。',
  'BIZ_LEAVE_011': '祝日は休暇申請できません。',
  'BIZ_LEAVE_012': '期間が重複する休暇申請があります。',
  'BIZ_LEAVE_013': '休暇種別が見つかりません。',
  'BIZ_LEAVE_014': 'この休暇種別は現在利用できません。',
  'BIZ_LEAVE_015': 'この休暇種別では理由の入力が必須です。',
  'BIZ_LEAVE_016': '承認済みの申請は編集できません。',
  'BIZ_LEAVE_017': '承認済みの申請は削除できません。',

  // システムエラー (SYS_XXX)
  'SYS_001': 'システムエラーが発生しました。しばらく時間をおいて再度お試しください。',
  'SYS_002': 'データベースエラーが発生しました。管理者にお問い合わせください。',
  'SYS_003': 'ネットワークエラーが発生しました。接続を確認してください。',
  'SYS_004': '処理がタイムアウトしました。再度お試しください。',
  'SYS_005': 'サービスが一時的に利用できません。しばらく時間をおいて再度お試しください。',
  'SYS_006': '外部サービスでエラーが発生しました。',
  'SYS_007': 'システム設定エラーが発生しました。管理者にお問い合わせください。',
  'SYS_008': 'システムの初期化に失敗しました。',
  'SYS_009': 'データベース処理でエラーが発生しました。',
  'SYS_010': '同時実行エラーが発生しました。再度お試しください。',

  // データ関連 (DAT_XXX)
  'DAT_001': 'データが破損しています。管理者にお問い合わせください。',
  'DAT_002': 'データに不整合があります。管理者にお問い合わせください。',
  'DAT_003': 'データ移行でエラーが発生しました。',
  'DAT_004': 'データ同期でエラーが発生しました。',
  'DAT_005': 'データの整合性に問題があります。管理者にお問い合わせください。',

  // 週報関連（BIZ_REPORT_XXX）
  'BIZ_REPORT_001': '週報が見つかりません。',
  'BIZ_REPORT_002': '指定週の週報は既に存在します。',
  'BIZ_REPORT_003': '週報の作成に失敗しました。',
  'BIZ_REPORT_004': '週報の更新に失敗しました。',
  'BIZ_REPORT_005': '週報の削除に失敗しました。',
  'BIZ_REPORT_006': '週報の読み込みに失敗しました。',
  'BIZ_REPORT_007': '週報データの取得に失敗しました。',
  'BIZ_REPORT_008': '保存に失敗しました。',
  'BIZ_REPORT_009': '提出に失敗しました。',
  'BIZ_REPORT_010': '無効な週が指定されています。',
  'BIZ_REPORT_011': '未来の日付は指定できません。',
  'BIZ_REPORT_012': '過去の週報は編集できません。',
  'BIZ_REPORT_013': '提出期限を過ぎています。',
  'BIZ_REPORT_014': '提出済みの週報は編集できません。',
  'BIZ_REPORT_015': '承認済みの週報は編集できません。',
  'BIZ_REPORT_016': '既に提出されています。',
  'BIZ_REPORT_017': '勤務時間が無効です。',
  'BIZ_REPORT_018': '終了時刻は開始時刻より後にしてください。',
  'BIZ_REPORT_019': '休憩時間が勤務時間を超えています。',
  'BIZ_REPORT_020': '作業内容の入力は必須です。',
  
  // プロフィール関連（BIZ_PROFILE_XXX）
  'BIZ_PROFILE_001': 'プロフィールが見つかりません。',
  'BIZ_PROFILE_002': 'プロフィールは既に存在します。',
  'BIZ_PROFILE_003': 'プロフィールの作成に失敗しました。',
  'BIZ_PROFILE_004': 'プロフィールの更新に失敗しました。',
  'BIZ_PROFILE_005': 'プロフィールの削除に失敗しました。',
  'BIZ_PROFILE_006': 'プロフィールの読み込みに失敗しました。',
  'BIZ_PROFILE_007': 'プロフィールの保存に失敗しました。',
  'BIZ_PROFILE_008': 'プロフィール情報の取得に失敗しました。',
  'BIZ_PROFILE_009': '必須項目が入力されていません。',
  'BIZ_PROFILE_010': '生年月日が無効です。',
  'BIZ_PROFILE_011': '性別の選択が無効です。',
  'BIZ_PROFILE_012': '電話番号の形式が正しくありません。',
  'BIZ_PROFILE_013': '住所の形式が正しくありません。',
  'BIZ_PROFILE_014': '郵便番号の形式が正しくありません。',
  'BIZ_PROFILE_015': '名前（姓）は必須項目です。',
  'BIZ_PROFILE_016': '名前（名）は必須項目です。',
  'BIZ_PROFILE_017': '名前（姓・カナ）は必須項目です。',
  'BIZ_PROFILE_018': '名前（名・カナ）は必須項目です。',
  'BIZ_PROFILE_019': '名前が長すぎます。',
  'BIZ_PROFILE_020': 'カナは全角カタカナで入力してください。',
  'BIZ_PROFILE_021': 'スキルが見つかりません。',
  'BIZ_PROFILE_022': 'このスキルは既に登録されています。',
  'BIZ_PROFILE_023': 'スキルレベルが無効です。',
  'BIZ_PROFILE_024': '経験年数が無効です。',
  'BIZ_PROFILE_025': '登録できるスキルの上限に達しました。',
  'BIZ_PROFILE_026': '資格が見つかりません。',
  'BIZ_PROFILE_027': 'この資格は既に登録されています。',
  'BIZ_PROFILE_028': '取得日が無効です。',
  'BIZ_PROFILE_029': '有効期限が無効です。',
  'BIZ_PROFILE_030': '有効期限は取得日より後の日付にしてください。',
  'BIZ_PROFILE_031': '写真のアップロードに失敗しました。',
  'BIZ_PROFILE_032': '写真のサイズが上限を超えています。',
  'BIZ_PROFILE_033': '写真の形式が無効です（JPG、PNG、GIFのみ対応）。',
  'BIZ_PROFILE_034': '写真が見つかりません。',
  'BIZ_PROFILE_035': '他のユーザーのプロフィールは編集できません。',
  'BIZ_PROFILE_036': 'このプロフィールは非公開です。',
  'BIZ_PROFILE_037': 'プロフィールが未完成です。',
  'BIZ_PROFILE_038': 'プロフィールは編集中のため、一時的にロックされています。',
  'BIZ_PROFILE_039': '技術カテゴリ情報の取得に失敗しました。',
  'BIZ_PROFILE_040': '資格一覧の取得に失敗しました。',
};

/**
 * 成功メッセージテンプレート
 * 動的に値を埋め込む成功メッセージのテンプレート
 */
export const SUCCESS_MESSAGE_TEMPLATES: Record<string, (params: Record<string, any>) => string> = {
  // プロフィール関連
  'TEMP_DATA_LOADED': (params) => 
    `${params.formattedDate}に一時保存されたデータを読み込みました。作業を続けるには更新ボタンを押してください。`,
};

/**
 * パラメータ付きメッセージテンプレート
 * 動的に値を埋め込むメッセージのテンプレート
 */
export const ERROR_MESSAGE_TEMPLATES: Record<string, (params: Record<string, any>) => string> = {
  // 休暇関連
  'LEAVE_INSUFFICIENT_BALANCE': (params) => 
    `休暇残日数が不足しています（必要: ${params.required}日、残高: ${params.available}日）`,
  'LEAVE_REQUEST_DUPLICATE': (params) => 
    `指定期間（${params.dates}）に既に休暇申請があります`,
  'LEAVE_DUPLICATE_DATES': (params) =>
    `重複した日付が含まれています: ${params.dates}`,
  'LEAVE_DATES_ALREADY_REQUESTED': (params) =>
    `以下の日付は既に休暇申請されています: ${params.dates}`,
  
  // ファイルサイズ関連
  'VAL_015': (params) => 
    `ファイルサイズが上限を超えています（上限: ${params.maxSize}MB）`,
  
  // 文字数制限関連
  'VAL_004': (params) => 
    `文字数が制限を超えています（上限: ${params.maxLength}文字）`,
};

/**
 * 成功メッセージの定義
 */
export const SUCCESS_MESSAGES = {
  // 共通操作
  SAVE: 'データを保存しました。',
  UPDATE: 'データを更新しました。',
  DELETE: '削除しました。',
  CREATE: '作成しました。',
  SUBMIT: '送信しました。',
  
  // 認証関連
  LOGIN_SUCCESS: 'ログインしました。',
  LOGOUT_SUCCESS: 'ログアウトしました。',
  
  // 休暇関連
  LEAVE_REQUEST_CREATED: '休暇申請が送信されました。',
  LEAVE_REQUEST_UPDATED: '休暇申請を更新しました。',
  LEAVE_REQUEST_CANCELLED: '休暇申請をキャンセルしました。',
  
  // プロフィール関連
  PROFILE_UPDATED: 'プロフィールを更新しました。',
  PROFILE_PHOTO_UPDATED: 'プロフィール写真を更新しました。',
  
  // 週報関連
  WEEKLY_REPORT_SAVED: '下書きとして保存しました。',
  WEEKLY_REPORT_SUBMITTED: '週報を提出しました。',
  WEEKLY_REPORT_LOADED: '週報データを読み込みました。',
  WEEKLY_REPORT_CREATED: '選択した週の新規週報を作成します。',
  DEFAULT_SETTINGS_SAVED: 'デフォルト勤務時間設定を保存しました。',
  
  // 通知関連
  NOTIFICATION_READ: '通知を既読にしました。',
  NOTIFICATION_SETTINGS_UPDATED: '通知設定を更新しました。',
  
  // スキルシート関連
  SKILL_SHEET_SAVED: 'スキルシート情報を保存しました。',
  SKILL_SHEET_TEMP_SAVED: 'スキルシート情報を一時保存しました。',
  
  // プロフィール関連（追加）
  PROFILE_TEMP_SAVED: 'プロフィールが一時保存されました。',
  
  // 提案関連
  PROPOSAL_CREATED: '提案を作成しました。',
  PROPOSAL_UPDATED: '提案を更新しました。',
  PROPOSAL_STATUS_UPDATED: '提案のステータスを更新しました。',
  PROPOSAL_DELETED: '提案を削除しました。',
  
  // 質問関連
  QUESTION_CREATED: '質問を投稿しました。',
  QUESTION_UPDATED: '質問を更新しました。',
  QUESTION_DELETED: '質問を削除しました。',
  QUESTION_RESPONDED: '質問に回答しました。',
  
  // 営業関連
  SALES_ASSIGNMENT_UPDATED: '営業担当者を割り当てました。',
  NOTIFICATION_SENT: '通知を送信しました。',
  
  // その他
  BULK_WORK_TIME_SET: '平日の勤務時間を一括設定しました。',
} as const;

/**
 * エラーメッセージカテゴリの判定
 */
export const getErrorCategory = (errorCode: string): string => {
  if (errorCode.length >= 3) {
    return errorCode.substring(0, 3);
  }
  return 'UNK';
};

/**
 * エラーカテゴリに基づくメッセージのトーン設定
 */
export const ERROR_CATEGORY_CONFIG = {
  'AUTH': {
    tone: 'security',
    showRetryButton: false,
    showContactSupport: false,
  },
  'VAL': {
    tone: 'validation',
    showRetryButton: false,
    showContactSupport: false,
  },
  'RES': {
    tone: 'not-found',
    showRetryButton: true,
    showContactSupport: false,
  },
  'BIZ': {
    tone: 'business-rule',
    showRetryButton: false,
    showContactSupport: true,
  },
  'SYS': {
    tone: 'system-error',
    showRetryButton: true,
    showContactSupport: true,
  },
  'DAT': {
    tone: 'data-error',
    showRetryButton: false,
    showContactSupport: true,
  },
  'P001': {
    tone: 'proposal-operation',
    showRetryButton: true,
    showContactSupport: false,
  },
  'P002': {
    tone: 'proposal-status',
    showRetryButton: false,
    showContactSupport: false,
  },
  'P003': {
    tone: 'question',
    showRetryButton: true,
    showContactSupport: false,
  },
  'P004': {
    tone: 'sales',
    showRetryButton: false,
    showContactSupport: true,
  },
  'P005': {
    tone: 'stats',
    showRetryButton: true,
    showContactSupport: false,
  },
  'P006': {
    tone: 'notification',
    showRetryButton: false,
    showContactSupport: false,
  },
  'P007': {
    tone: 'data-sync',
    showRetryButton: true,
    showContactSupport: true,
  },
  'P008': {
    tone: 'permission',
    showRetryButton: false,
    showContactSupport: false,
  },
  'P009': {
    tone: 'bulk-operation',
    showRetryButton: true,
    showContactSupport: false,
  },
} as const;