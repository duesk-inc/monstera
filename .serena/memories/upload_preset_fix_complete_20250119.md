# 領収書アップロードエラー修正完了 (2025-01-19)

## 修正概要
generateUploadURL関数のAPIプリセット誤用を修正

## 修正内容
```typescript
// src/lib/api/expense.ts:626
// 修正前
const client = createPresetApiClient('upload');

// 修正後
const client = createPresetApiClient('auth');
```

## 結果
- ✅ 401エラー解消
- ✅ 領収書アップロード機能復旧
- ✅ ガイドライン作成による再発防止

## 学んだこと
### プリセット選択の原則
1. **Content-Typeで判断**
   - JSON → `auth`
   - FormData → `upload`

2. **関数名に惑わされない**
   - generateUploadURL → JSONリクエスト → `auth`
   - uploadFile → FormData → `upload`

3. **実際の処理内容を確認**
   - リクエストボディの形式
   - 送信するデータの種類

## 予防策
- APIプリセット使用ガイドライン（docs/api-preset-guidelines.md）
- 移行時のチェックリスト作成
- Content-Typeとプリセットの整合性確認