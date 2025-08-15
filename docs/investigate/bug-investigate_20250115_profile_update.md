# プロフィール更新エラー調査報告書

## 調査日時
2025年1月15日

## 問題の概要
プロフィール画面で更新ボタンを押下すると404エラーが発生し、「プロフィール更新が見つかりません」という不適切なトーストメッセージが表示される。

### ログエビデンス
```
monstera-backend | 2025-08-15T15:57:33.768+0900 WARN middleware/logger.go:53 HTTP Request 
{"request_id": "0a4a84fc-409a-4673-ad79-71ff86e8f85f", "method": "POST", "path": "/api/v1/profile/update", "status": 404}
```

## 根本原因

### 1. APIエンドポイントの不一致
**フロントエンド側:**
- ファイル: `frontend/src/constants/api.ts` (line 15)
- 定義: `UPDATE: '/api/v1/profile/update'`
- 使用: `frontend/src/lib/api/profile.ts` (line 180)
- メソッド: POST `/api/v1/profile/update`

**バックエンド側:**
- ファイル: `backend/cmd/server/main.go` (line 629)
- ルーティング: `profile.POST("", profileHandler.SaveProfile)`
- 実際のエンドポイント: POST `/api/v1/profile`

### 2. 404エラーメッセージの生成メカニズム
1. `frontend/src/lib/api/profile.ts`のupdateProfile関数でエラー発生
2. `handleApiError(error, 'プロフィール更新', ...)` が呼ばれる (line 191)
3. `frontend/src/lib/api/error.ts`のhandleApiError関数で404エラー処理 (line 128-129)
4. メッセージ生成: `${resourceName}が見つかりません` → 「プロフィール更新が見つかりません」

### 3. PROFILE_API定数の不完全性
現在の定義（`frontend/src/constants/api.ts`）:
```javascript
export const PROFILE_API = {
  BASE: `/api/${API_VERSION}/profile`,
  UPDATE: `/api/${API_VERSION}/profile/update`,  // 誤ったパス
  AVATAR: `/api/${API_VERSION}/profile/avatar`,
} as const;
```

不足している定数:
- GET: プロフィール取得用
- WITH_HISTORY: 職務経歴付きプロフィール取得用
- TEMP_SAVE: 一時保存用

## 影響範囲
- プロフィール更新機能が完全に動作しない
- ユーザーがプロフィール情報を保存できない
- エラーメッセージが不適切で、ユーザーに混乱を与える

## 修正案

### 修正1: PROFILE_API定数の修正
```javascript
export const PROFILE_API = {
  BASE: `/api/${API_VERSION}/profile`,
  GET: `/api/${API_VERSION}/profile`,
  UPDATE: `/api/${API_VERSION}/profile`,  // /updateを削除
  WITH_HISTORY: `/api/${API_VERSION}/profile/with-work-history`,
  TEMP_SAVE: `/api/${API_VERSION}/profile/temp-save`,
  AVATAR: `/api/${API_VERSION}/profile/avatar`,
} as const;
```

### 修正2: エラーメッセージの改善（オプション）
`frontend/src/lib/api/error.ts`のline 129を以下のように修正:
```javascript
case 404:
  // より適切なメッセージに変更
  if (resourceName.includes('更新')) {
    return new Error(`${resourceName}のエンドポイントが見つかりません。システム管理者にお問い合わせください。`);
  }
  return new Error(`${resourceName}が見つかりません`);
```

## テスト項目
1. プロフィール画面でデータを入力
2. 更新ボタンをクリック
3. 正常に保存されることを確認
4. 成功メッセージが表示されることを確認
5. 一時保存機能も正常に動作することを確認

## 緊急度
**高** - プロフィール更新機能が完全に使用不可能

## 推奨対応
1. PROFILE_API定数の即時修正
2. 全エンドポイントの動作確認
3. エラーメッセージの改善（ユーザビリティ向上のため）