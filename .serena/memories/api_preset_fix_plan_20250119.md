# APIプリセット修正計画 (2025-01-19)

## 修正概要
領収書アップロードエラーの修正計画

## 修正内容
### 対象ファイル
`frontend/src/lib/api/expense.ts:626`

### 変更内容
```typescript
// 修正前
const client = createPresetApiClient('upload');

// 修正後
const client = createPresetApiClient('auth');
```

## 修正の理由
- generateUploadURLはJSONリクエストを送信
- uploadプリセットはmultipart/form-data用
- JSONリクエストにはauthプリセットが適切

## 実装時間
- Phase 1: 10分（緊急修正）
- Phase 2: 15分（検証）
- Phase 3: 20分（予防措置）
- 合計: 約65分

## 成功基準
1. 領収書アップロードが正常動作
2. 401エラーが解消
3. TypeScriptビルド成功

## 教訓
関数名に惑わされず、実際の処理内容でプリセットを選択する