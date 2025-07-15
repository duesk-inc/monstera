/**
 * UI文言の定数定義
 * 画面に表示される各種テキストを一元管理
 */

/**
 * ダイアログ関連のメッセージ
 */
export const DIALOG_MESSAGES = {
  // 保存ダイアログ
  SAVE_DRAFT: {
    TITLE: '下書きとして保存',
    MESSAGE: '入力内容を下書きとして保存しますか？保存後も引き続き編集可能です。',
    CONFIRM: '保存する',
    CANCEL: 'キャンセル',
  },
  
  // 提出ダイアログ
  SUBMIT: {
    WEEKLY_REPORT: {
      TITLE: '週報を提出',
      MESSAGE: '週報を提出しますか？提出後は編集ができなくなります。',
      CONFIRM: '提出する',
      CANCEL: 'キャンセル',
    },
    LEAVE_REQUEST: {
      TITLE: '以下の内容で申請します',
      CONFIRM: '申請する',
      CANCEL: 'キャンセル',
    },
  },
  
  // 確認ダイアログ
  CONFIRM: {
    DELETE: {
      TITLE: '削除確認',
      MESSAGE: '本当に削除してもよろしいですか？この操作は取り消せません。',
      CONFIRM: '削除する',
      CANCEL: 'キャンセル',
    },
  },
};

/**
 * ボタンテキスト
 */
export const BUTTON_TEXT = {
  // 基本アクション
  SAVE: '保存',
  SAVE_DRAFT: '下書き保存',
  SUBMIT: '提出する',
  SEND: '送信',
  CANCEL: 'キャンセル',
  CLOSE: '閉じる',
  BACK: '戻る',
  NEXT: '次へ',
  
  // 認証
  LOGIN: 'ログイン',
  LOGOUT: 'ログアウト',
  
  // CRUD操作
  CREATE: '新規作成',
  EDIT: '編集',
  UPDATE: '更新',
  DELETE: '削除',
  
  // その他
  SEARCH: '検索',
  FILTER: '絞り込み',
  RESET: 'リセット',
  DOWNLOAD: 'ダウンロード',
  UPLOAD: 'アップロード',
  APPLY: '適用',
  SELECT: '選択',
  CLEAR: 'クリア',
  CONFIRM: '確認',
};

/**
 * フォームラベル
 */
export const FORM_LABELS = {
  // ログイン
  EMAIL: 'メールアドレス',
  PASSWORD: 'パスワード',
  
  // 個人情報
  NAME: '名前',
  NAME_KANA: '名前（カナ）',
  FIRST_NAME: '名',
  LAST_NAME: '姓',
  FIRST_NAME_KANA: '名（カナ）',
  LAST_NAME_KANA: '姓（カナ）',
  BIRTH_DATE: '生年月日',
  GENDER: '性別',
  PHONE: '電話番号',
  POSTAL_CODE: '郵便番号',
  ADDRESS: '住所',
  
  // 日時
  DATE: '日付',
  START_DATE: '開始日',
  END_DATE: '終了日',
  START_TIME: '開始時刻',
  END_TIME: '終了時刻',
  BREAK_TIME: '休憩時間',
  
  // その他
  REASON: '理由',
  REMARKS: '備考',
  DESCRIPTION: '説明',
  NOTES: 'メモ',
};

/**
 * プレースホルダー
 */
export const PLACEHOLDERS = {
  // 入力欄
  EMAIL: 'example@duesk.co.jp',
  PASSWORD: 'パスワードを入力',
  SEARCH: '検索キーワードを入力',
  
  // テキストエリア
  REASON: '申請理由を入力してください',
  REMARKS: '備考があれば入力してください',
  DAILY_WORK: '本日の業務内容を入力してください',
  
  // 選択
  SELECT: '選択してください',
  SELECT_DATE: '日付を選択',
  SELECT_TIME: '時刻を選択',
};

/**
 * 空状態メッセージ
 */
export const EMPTY_STATES = {
  // データなし
  NO_DATA: 'データがありません',
  NO_RESULTS: '検索結果がありません',
  NO_ITEMS: '項目がありません',
  
  // 特定画面用
  NO_NOTIFICATIONS: '通知はありません',
  NO_LEAVE_REQUESTS: '休暇申請履歴はありません',
  NO_WEEKLY_REPORTS: '週報データがありません',
  NO_PROJECTS: 'プロジェクトがありません',
  NO_EXPENSES: '経費申請がありません',
  
  // アクション促進
  CREATE_FIRST: '最初の項目を作成しましょう',
  NO_SELECTION: '項目が選択されていません',
};

/**
 * ローディングメッセージ
 */
export const LOADING_MESSAGES = {
  // 基本
  LOADING: '読み込み中...',
  PROCESSING: '処理中...',
  SAVING: '保存中...',
  SUBMITTING: '送信中...',
  DELETING: '削除中...',
  
  // 特定処理
  FETCHING_DATA: 'データを取得しています...',
  UPLOADING_FILE: 'ファイルをアップロードしています...',
  DOWNLOADING_FILE: 'ファイルをダウンロードしています...',
  GENERATING_REPORT: 'レポートを生成しています...',
  
  // 認証
  LOGGING_IN: 'ログイン中...',
  LOGGING_OUT: 'ログアウト中...',
  VERIFYING: '認証情報を確認しています...',
};

/**
 * ページタイトル
 */
export const PAGE_TITLES = {
  // メイン画面
  DASHBOARD: 'ダッシュボード',
  WEEKLY_REPORT: '週報',
  LEAVE_REQUEST: '休暇申請',
  EXPENSE: '経費精算',
  PROFILE: 'プロフィール',
  SKILL_SHEET: 'スキルシート',
  PROJECT: 'プロジェクト',
  NOTIFICATIONS: '通知',
  
  // サブ画面
  SETTINGS: '設定',
  NOTIFICATION_SETTINGS: '通知設定',
  PROJECT_DETAIL: 'プロジェクト詳細',
  
  // 認証
  LOGIN: 'ログイン',
  LOGOUT: 'ログアウト',
};

/**
 * ページ説明文
 */
export const PAGE_DESCRIPTIONS = {
  WEEKLY_REPORT: '週次の業務報告を入力・提出してください',
  LEAVE_REQUEST: '休暇申請フォームから申請内容を入力してください。休暇は時間単位でも取得可能です。',
  EXPENSE: '経費の申請と履歴を管理できます',
  PROFILE: 'プロフィール情報を編集できます',
  SKILL_SHEET: 'スキルと経歴を管理できます',
  NOTIFICATIONS: 'システムからの通知を確認できます',
};

/**
 * タブラベル
 */
export const TAB_LABELS = {
  // 休暇申請
  LEAVE: {
    APPLICATION: '休暇申請',
    HISTORY: '申請履歴',
  },
  
  // プロフィール
  PROFILE: {
    BASIC_INFO: '基本情報',
    CERTIFICATIONS: '資格・認定',
    APPEAL_POINTS: '自己PR',
  },
  
  // 共通
  OVERVIEW: '概要',
  DETAILS: '詳細',
  SETTINGS: '設定',
  HISTORY: '履歴',
};

/**
 * ステータスラベル
 */
export const STATUS_LABELS = {
  // 申請状態
  NOT_SUBMITTED: '未提出',
  DRAFT: '下書き',
  SUBMITTED: '提出済み',
  APPROVED: '承認済み',
  REJECTED: '却下',
  CANCELLED: 'キャンセル',
  
  // 処理状態
  PENDING: '処理中',
  PROCESSING: '処理中',
  COMPLETED: '完了',
  FAILED: '失敗',
  
  // アクティブ状態
  ACTIVE: '有効',
  INACTIVE: '無効',
  SUSPENDED: '一時停止',
};

/**
 * その他のUI文言
 */
export const UI_TEXT = {
  // パスワード関連
  SHOW_PASSWORD: 'パスワードを表示',
  HIDE_PASSWORD: 'パスワードを隠す',
  FORGOT_PASSWORD: 'パスワードを忘れた場合は',
  
  // ヘルプテキスト
  REQUIRED_FIELD: '必須項目',
  OPTIONAL_FIELD: '任意',
  
  // 開発環境
  DEVELOPMENT_MODE: 'ログイン機能は現在開発中です。任意のメールアドレスとパスワードでログインできます。',
  
  // リダイレクト
  REDIRECT_MESSAGE: (path: string) => `ログイン後、${path}にリダイレクトします。`,
};