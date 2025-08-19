# バグ調査レポート: 領収書アップロードエラー

## 発生日時
2025-01-19 20:06

## エラー概要
領収書アップロード時に「アップロードURL生成の取得に失敗しました: 不明なエラー」が発生

## エラー詳細
### フロントエンドエラー
- **エラーメッセージ**: `Error: アップロードURL生成の取得に失敗しました: 不明なエラー`
- **発生箇所**: `src/lib/api/expense.ts:631` (generateUploadURL関数)

### バックエンドエラー
- **HTTPステータス**: 401 (Unauthorized)
- **エラーメッセージ**: `ユーザーIDがコンテキストに存在しません`
- **発生箇所**: `handler/expense_handler.go:496`
- **エンドポイント**: `POST /api/v1/expenses/upload-url`

## 根本原因
**APIクライアント新形式移行時の設定ミス**が原因です。

### 詳細分析

1. **APIクライアント移行時の不整合**
   expense.ts内の各関数で使用されているプリセット：
   ```typescript
   // ✅ 正しい実装
   completeUpload: createPresetApiClient('auth');     // 638行目
   deleteUploadedFile: createPresetApiClient('auth'); // 650行目
   
   // ❌ 誤った実装
   generateUploadURL: createPresetApiClient('upload'); // 626行目
   ```

2. **移行パターンの違い**
   - **他の関数**: JSONリクエストなので`auth`プリセットを正しく使用
   - **generateUploadURL**: 誤って`upload`プリセットを使用（移行時のミス）

3. **uploadプリセットの問題**
   ```typescript
   // factory/index.ts:427-438
   case 'upload':
     return {
       headers: {
         'Content-Type': 'multipart/form-data',  // ← JSONには不適切
       },
       ...
     }
   ```

4. **エラー発生のメカニズム**
   - `generateUploadURL`はJSONボディを送信（`convertCamelToSnake(data)`）
   - `upload`プリセットが`Content-Type: multipart/form-data`を設定
   - バックエンドはJSONを期待しているが、multipart/form-dataヘッダーを受信
   - リクエストボディが正しくパースされない
   - 認証ミドルウェアがユーザー情報を取得できない
   - 401 Unauthorizedエラーが発生

## データフロー分析
```
1. フロントエンド generateUploadURL関数
   └─ createPresetApiClient('upload') で誤ったプリセット使用
   └─ Content-Type: multipart/form-data でJSONを送信

2. バックエンド /api/v1/expenses/upload-url
   └─ JSONを期待しているが、multipart/form-dataヘッダーを受信
   └─ リクエストの解析に失敗
   └─ ユーザーIDがコンテキストに設定されない
   └─ 401 Unauthorized エラー
```

## 影響範囲
1. **直接影響**
   - 領収書アップロード機能が完全に使用不可
   - generateUploadURL関数（624-633行）

2. **利用箇所**
   - ReceiptUploader コンポーネント
   - 経費申請画面での領収書添付機能

## 修正方法
### generateUploadURL関数の修正
```typescript
// 修正前（626行目）
const client = createPresetApiClient('upload');

// 修正後
const client = createPresetApiClient('auth');  // JSONリクエストなのでauthプリセット使用
```

### 注意点
- `uploadFileToS3`関数は引き続き`upload`プリセットを使用する必要がある（実際のファイルアップロードのため）
- URL生成APIとファイルアップロードAPIで異なるプリセットを使用することが重要

## 検証済み項目
- [x] エラーの直接的な原因: 誤ったAPIプリセットの使用
- [x] エラーが発生する条件: generateUploadURL関数の実行時（必ず発生）
- [x] 影響を受ける機能: 領収書アップロード全般
- [x] データ整合性への影響: なし（アップロード前にエラーになるため）
- [x] セキュリティへの影響: なし
- [x] 回避策: なし（コード修正が必要）

## 再発防止策
1. **APIプリセットの使い分けを明確化**
   - JSONリクエスト: `auth`プリセット
   - ファイルアップロード: `upload`プリセット

2. **ドキュメント化**
   - プリセットの使い分けガイドラインを作成
   - 各プリセットの用途を明確に記載

3. **テスト追加**
   - URL生成APIのテスト
   - 異なるプリセットでの動作確認テスト

## APIクライアント移行状況の確認
expense.ts内のその他の主要関数は新形式に正しく移行済み：
- `getExpenses`: `createPresetApiClient('auth')` ✅
- `createExpense`: `createPresetApiClient('auth')` ✅  
- `updateExpense`: `createPresetApiClient('auth')` ✅
- `uploadReceipts`: `createPresetApiClient('upload')` ✅（実際のファイルアップロード用）

## 類似の問題の可能性
他のAPI関数でも同様にプリセットの選択ミスがある可能性があるため、確認が必要：
- ファイル関連のAPI全般（URL生成とアップロードの使い分け）
- マルチパートフォームを扱うAPI
- 新形式移行済みの他のAPIファイル