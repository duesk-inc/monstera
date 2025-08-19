# APIプリセット使用ガイドライン

## プリセット選択基準

### 基本原則
プリセットは**リクエストのContent-Type**で選択する：
- JSONリクエスト → `auth`プリセット
- ファイルアップロード（multipart/form-data） → `upload`プリセット
- 公開API（認証不要） → `public`プリセット

### プリセット詳細

#### `auth`プリセット
- **用途**: 認証付きJSONリクエスト全般
- **Content-Type**: `application/json`
- **使用例**:
  - CRUD操作（作成、読取、更新、削除）
  - メタデータの送信
  - **URLの生成**（Pre-signed URL等）
  - ステータス変更

#### `upload`プリセット
- **用途**: 実際のファイルアップロード
- **Content-Type**: `multipart/form-data`
- **使用例**:
  - 画像、PDFなどのファイル送信
  - FormDataを使用するリクエスト
  - バイナリデータの送信

#### `public`プリセット
- **用途**: 認証不要のパブリックAPI
- **Content-Type**: `application/json`
- **使用例**:
  - ログイン前のヘルスチェック
  - 公開情報の取得

## よくある間違いと正しい使い方

### ❌ 間違い: 関数名で判断
```typescript
// 間違い: "upload"という名前だからuploadプリセットを使用
export async function generateUploadURL(data) {
  const client = createPresetApiClient('upload'); // ❌
  // JSONを送信するのにmultipart/form-dataヘッダーが設定される
}
```

### ✅ 正しい: リクエスト内容で判断
```typescript
// 正しい: JSONリクエストなのでauthプリセット
export async function generateUploadURL(data) {
  const client = createPresetApiClient('auth'); // ✅
  // JSONリクエストに適切なヘッダーが設定される
}

// 正しい: 実際のファイルアップロードなのでuploadプリセット
export async function uploadFile(file) {
  const client = createPresetApiClient('upload'); // ✅
  const formData = new FormData();
  formData.append('file', file);
  // FormDataに適切なヘッダーが設定される
}
```

## チェックリスト

プリセット選択時の確認事項：

1. **リクエストボディの形式は？**
   - [ ] JSON → `auth`
   - [ ] FormData → `upload`
   - [ ] なし → `auth` or `public`

2. **認証は必要？**
   - [ ] 必要 → `auth` or `upload`
   - [ ] 不要 → `public`

3. **何を送信する？**
   - [ ] データ（文字列、数値、オブジェクト） → `auth`
   - [ ] ファイル（画像、PDF等） → `upload`

## 移行時の注意

APIクライアント新形式への移行時：
1. 既存の処理内容を確認
2. 上記チェックリストに従ってプリセット選択
3. 動作確認（特に401エラーに注意）

## 関連ドキュメント
- [APIクライアント移行ガイド](../CLAUDE.md)
- [プリセット定義](../src/lib/api/factory/index.ts)