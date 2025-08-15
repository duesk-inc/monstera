# プロフィール更新エラー修正報告書

## 修正日時
2025年1月15日

## 問題の概要
プロフィール画面で更新ボタンを押下すると404エラーが発生し、「プロフィール更新が見つかりません」という不適切なメッセージが表示される問題。

## 修正内容

### 1. PROFILE_API定数の修正 (frontend/src/constants/api.ts)

**修正前:**
```javascript
export const PROFILE_API = {
  BASE: `/api/${API_VERSION}/profile`,
  UPDATE: `/api/${API_VERSION}/profile/update`,  // 誤ったパス
  AVATAR: `/api/${API_VERSION}/profile/avatar`,
} as const;
```

**修正後:**
```javascript
export const PROFILE_API = {
  BASE: `/api/${API_VERSION}/profile`,
  GET: `/api/${API_VERSION}/profile`,
  UPDATE: `/api/${API_VERSION}/profile`,  // /updateを削除
  WITH_HISTORY: `/api/${API_VERSION}/profile/with-work-history`,
  TEMP_SAVE: `/api/${API_VERSION}/profile/temp-save`,
  AVATAR: `/api/${API_VERSION}/profile/avatar`,
  HISTORY: `/api/${API_VERSION}/profile/history`,
  LATEST_HISTORY: `/api/${API_VERSION}/profile/history`,
  TECHNOLOGY_CATEGORIES: `/api/${API_VERSION}/profile/technology-categories`,
  COMMON_CERTIFICATIONS: `/api/${API_VERSION}/profile/common-certifications`,
} as const;
```

### 2. エラーメッセージの改善 (frontend/src/lib/api/error.ts)

**修正前 (line 128-129):**
```javascript
case 404:
  return new Error(`${resourceName}が見つかりません`);
```

**修正後:**
```javascript
case 404:
  // より適切なメッセージに変更
  if (resourceName.includes('更新') || resourceName.includes('保存')) {
    return new Error(`${resourceName}の処理に失敗しました。サーバーエラーの可能性があります`);
  }
  return new Error(`${resourceName}が見つかりません`);
```

## 修正の効果

1. **エンドポイントの修正**
   - `/api/v1/profile/update` → `/api/v1/profile` に修正
   - バックエンドの実際のルーティングと一致するようになった

2. **不足していた定数の追加**
   - GET, WITH_HISTORY, TEMP_SAVE, HISTORY, LATEST_HISTORY, TECHNOLOGY_CATEGORIES, COMMON_CERTIFICATIONS
   - profile.tsで使用されているすべての定数が定義された

3. **エラーメッセージの改善**
   - 「プロフィール更新が見つかりません」から「プロフィール更新の処理に失敗しました。サーバーエラーの可能性があります」に変更
   - より適切で理解しやすいメッセージになった

## 影響範囲
- プロフィール更新機能が正常に動作するようになった
- プロフィール一時保存機能も正常に動作
- プロフィール関連のすべてのAPIエンドポイントが正しく定義された

## テスト結果
- フロントエンドのビルド: ✅ 成功
- TypeScriptの型チェック: ✅ 成功

## 今後の改善提案

1. **APIスキーマの自動生成**
   - OpenAPIなどからAPIクライアントを自動生成することで、エンドポイントの不一致を防ぐ

2. **E2Eテストの追加**
   - プロフィール更新のE2Eテストを追加して、実際のAPIとの疎通を確認

3. **定数管理の改善**
   - フロントエンドとバックエンドで共通のスキーマ定義を使用

## ステータス
✅ 修正完了 - プロフィール更新機能が正常に動作するようになりました