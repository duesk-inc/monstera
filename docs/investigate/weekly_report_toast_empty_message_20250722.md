# 週報画面トーストメッセージ空文字問題の調査報告

## 調査日時
2025-01-22

## 問題の概要
週報画面で操作を行った際に表示されるトーストメッセージが空文字になっている。

## 調査結果

### 1. 根本原因
`SUCCESS_MESSAGES` 定数に必要なメッセージが定義されていないため、`undefined` が `showSuccess()` に渡されている。

### 2. 不足しているメッセージ定義

#### 週報画面（page.tsx）で使用されているが未定義
- `BULK_WORK_TIME_SET` - 一括設定適用時
- `DEFAULT_SETTINGS_SAVED` - デフォルト設定保存時

#### useWeeklyReportDataフックで使用されているが未定義
- `WEEKLY_REPORT_LOADED` - 週報読み込み時
- `WEEKLY_REPORT_CREATED` - 週報作成時
- `WEEKLY_REPORT_SAVED` - 週報保存時

### 3. 問題の発生フロー
1. `showSuccess(SUCCESS_MESSAGES.BULK_WORK_TIME_SET)` が呼び出される
2. `SUCCESS_MESSAGES.BULK_WORK_TIME_SET` は定義されていないため `undefined`
3. `showSuccess(undefined)` となる
4. ToastProviderは受け取った値をそのまま表示するため、空文字のトーストが表示される

### 4. 影響範囲
以下の操作でトーストが空文字で表示される：
- 一括設定を適用した時
- デフォルト設定を保存した時
- 週報を読み込んだ時
- 新規週報を作成した時
- 週報を下書き保存した時

### 5. 定義されているメッセージ
以下は正常に動作する（定義済み）：
- `WEEKLY_REPORT_SUBMITTED: "週報を提出しました。"`

## 修正方針

### 1. errorMessages.ts に不足しているメッセージを追加
```typescript
export const SUCCESS_MESSAGES = {
  ...SUCCESS_MESSAGE_TEMPLATES,
  // 既存の定義...
  
  // 週報関連の追加メッセージ
  BULK_WORK_TIME_SET: "一括設定を適用しました。",
  DEFAULT_SETTINGS_SAVED: "デフォルト設定を保存しました。",
  WEEKLY_REPORT_LOADED: "週報を読み込みました。",
  WEEKLY_REPORT_CREATED: "新規週報を作成しました。",
  WEEKLY_REPORT_SAVED: "週報を下書き保存しました。",
  // 既存: WEEKLY_REPORT_SUBMITTED: "週報を提出しました。",
} as const;
```

### 2. ToastProviderで空文字チェックを追加（オプション）
メッセージが空やundefinedの場合はトーストを表示しないようにする：
```typescript
const showSuccess = useCallback((message: string, options?: Partial<ToastOptions>) => {
  if (!message) {
    console.warn('Toast message is empty or undefined');
    return;
  }
  showToast({ type: 'success', message, ...options });
}, [showToast]);
```

## 推奨事項
1. 即座に不足しているメッセージ定義を追加する
2. 開発時のチェック機能として、ToastProviderに空文字チェックを実装する
3. TypeScriptの型チェックを強化して、定義されていない定数の使用を防ぐ