# APIプリセット誤用パターン - アップロードURL生成

## 問題発生日
2025-01-19

## 問題の概要
generateUploadURL関数で誤って`upload`プリセットを使用し、401エラーが発生

## 詳細
### 誤った実装
```typescript
// expense.ts:626
export async function generateUploadURL(data: UploadFileRequest) {
  const client = createPresetApiClient('upload'); // ❌ 誤り
  // JSONリクエストなのにmultipart/form-dataヘッダーが設定される
}
```

### 正しい実装
```typescript
export async function generateUploadURL(data: UploadFileRequest) {
  const client = createPresetApiClient('auth'); // ✅ 正しい
  // JSONリクエストには適切なContent-Typeが設定される
}
```

## 原因
APIクライアント新形式移行時に、関数名から「アップロード」と判断して`upload`プリセットを選択したと思われる。しかし、この関数はアップロードURLを生成するためのJSONリクエストであり、実際のファイルアップロードではない。

## 教訓
### プリセットの使い分け
- **`auth`プリセット**: JSONリクエスト全般
- **`upload`プリセット**: 実際のファイルアップロード（multipart/form-data）

### 関数の役割による判断
- URL生成、メタデータ送信 → `auth`プリセット
- ファイルのバイナリデータ送信 → `upload`プリセット

## 影響
- 401 Unauthorizedエラー
- 「ユーザーIDがコンテキストに存在しません」エラー
- 領収書アップロード機能の完全停止

## 防止策
1. プリセット選択ガイドラインの明文化
2. APIエンドポイントとプリセットのマッピング表作成
3. 移行時のレビュープロセス強化